---
title: "Agent Sandbox 项目学习"
pubDatetime: 2026-09-05T13:55:32+08:00
featured: false
draft: false
tags:
  - kubernetes
  - agent
  - sandbox
description: "梳理 Agent Sandbox 的核心 CRD、控制器调谐、预热池接管、暂停恢复，以及 Kubernetes 最终一致性下的并发与故障恢复。"
---

# Agent Sandbox 项目学习

项目地址：[kubernetes-sigs/agent-sandbox](https://github.com/kubernetes-sigs/agent-sandbox)

## 1. 引言

在我的概念中，Agent party is over。后面整体 Agent 会变得非常同质化，比如都像 Codex，能完成的任务也差不多，区别更多在于背后的模型能力，而模型能力也在趋于同质化。Now it's time for application，如何用 Agent 解决更多的问题，做出更能帮助客户的产品。

因此，如何**可靠、高效**地使用 Agent 完成具体任务变得越发重要，这也是我看 Agent Sandbox 这个项目的初心。

## 2. Agent Sandbox 简介

Kubernetes API 提供的 Pod、StatefulSet 等抽象各有特点，但是用来承载 Agent workload 时，总有一些不太方便的地方。Agent 通常需要：

- 隔离、持久化、可通过网络访问的云端环境。
- 安全执行不可信代码或 LLM 生成的代码。
- 为训练和评测循环提供高吞吐的 Sandbox，并通过 WarmPool 快速领取实例。
- 为 Notebook、开发环境等场景提供持久化的单容器会话。
- 托管具有稳定身份的单实例应用。

这些任务当然可以用 StatefulSet + Service + PVC 拼出来，但比较笨重，也缺少针对 Sandbox 的生命周期管理。

这个项目首先要明确一个边界：Agent Sandbox 是一个**编排器**，真正的底层隔离仍然交给 gVisor、Kata Containers 等 Runtime。它负责的是管理配置了对应 `RuntimeClass` 的 Pod。

README 中提到的深度休眠、自动恢复、内存共享等更多是目标或探索方向。当前的暂停与恢复主要是删除、重建 Pod 并保留 PVC，并不会保存进程内存。

## 3. 核心 CRD 抽象

整个项目可以先看成下面四个 CRD：

```text
SandboxTemplate
       ↑ 引用
SandboxWarmPool ──预创建──> Sandbox
       ↑                       ↑
SandboxClaim ──领取并接管───────┘
```

### 3.1 Sandbox

一个 Sandbox 是对 Pod、可选 PVC 和可选 Headless Service 的编排抽象：

- `podTemplate`：运行什么容器、资源限制、RuntimeClass 等。
- `volumeClaimTemplates`：需要哪些持久化存储。
- `service`：是否创建 Headless Service。
- `operatingMode`：`Running` 或 `Suspended`。
- `lifecycle`：关闭时间与到期处理策略。

`Sandbox.spec` 表达用户的期望，`Sandbox.status` 表达控制器实际观察到的状态，包括 Conditions、Pod IP、所在节点、Service 名称和 FQDN。

Sandbox 才是 Agent workload 的稳定逻辑身份，Pod 是可以重建的。Pod 重建后 UID、IP、节点和内存都可能变化，真正能留下来的是 Sandbox、PVC，以及可选的 Service DNS。

Conditions 不是一个单值 `phase`，而是几组可以同时成立的事实：

- `Ready`：Sandbox 是否可以使用。
- `PodScheduled`：Pod 是否完成调度，为什么没有调度成功。
- `Suspended`：暂停是否真正完成。
- `Finished`：Pod 是否进入 `Succeeded` 或 `Failed`。

例如任务成功退出后，可以同时是：

```text
Ready=False
Finished=True, reason=PodSucceeded
```

这不矛盾：它已经不能继续提供服务，但确实执行完了。不过 `Finished` 只表示底层 Pod 结束，不等于一个长期运行 Agent 中的某个业务任务完成。

### 3.2 SandboxTemplate

`SandboxTemplate` 描述一类 Sandbox 的配置，包括镜像、命令、资源、RuntimeClass、安全上下文、PVC、Service 和 NetworkPolicy 等。

单独创建 Template 不会创建 Sandbox。WarmPool 直接引用 Template，Claim 则通过 WarmPool 间接使用它。Template 还定义 Claim 是否允许注入环境变量、覆盖 PVC，以及 NetworkPolicy 由控制器还是外部系统管理。

### 3.3 SandboxWarmPool

预热池是解决 Pod 启动延迟最直接的办法：

```yaml
kind: SandboxWarmPool
spec:
  replicas: 10
  sandboxTemplateRef:
    name: python-agent-template
```

这个 CRD 创建后，Controller 会持续维持 10 个仍由 Pool 拥有、尚未被领取的 Sandbox。它们不一定都已经 Ready，`status.readyReplicas` 才表示真正准备好的数量。

一个 Sandbox 被 Claim 领取后就会脱离 Pool，Pool 再创建新的 Sandbox 补充库存。WarmPool 还支持 Kubernetes `scale` 子资源，因此可以由 HPA 调整 `replicas`。

### 3.4 SandboxClaim

Claim 是生产环境中最接近用户的一层：

```yaml
kind: SandboxClaim
spec:
  warmPoolRef:
    name: python-agent-pool
```

它表达的是：

> 请从这个池里给我分配一个 Sandbox。

Claim 支持 `additionalPodMetadata`、`env`、`volumeClaimTemplates`，以及 `shutdownTime`、`ttlSecondsAfterFinished`、`shutdownPolicy` 等生命周期配置。

如果 Claim 指定了 `env` 或自定义 `volumeClaimTemplates`，就会绕过预热实例并冷启动，因为运行中的 Pod 无法安全地原地修改这些配置。

### 3.5 总结后的使用方式
对于无需预热池的场景，只需要直接创建 sandbox。
对于需要预热池的场景，首先创建好 SandboxTemplate，然后创建 SandboxWarmPool，其中引用了具体的 SandboxTemplate（相当于配置和实例解耦），同时定义了预热池中有多少副本。最后，用户需要 sandbox 时，创建 SandboxClaim 从匹配的预热池中获取已经创建好的 sandbox。

## 4. 具体实现

项目主体其实很直接。对于 Sandbox Controller，Reconcile 的主线就是：

```text
检查删除和过期
→ 调谐 PVC
→ 调谐 Pod
→ 调谐 Service
→ 计算 Conditions
→ 更新 status
```

扩展 Controller 也都很明确：

```text
SandboxTemplateReconciler → 收敛共享 NetworkPolicy
SandboxWarmPoolReconciler → 维持 Sandbox 库存
SandboxClaimReconciler    → 分配或冷启动 Sandbox，并转移所有权
SandboxReconciler         → 创建 PVC、Pod、Service
```

真正有意思的是，当资源已经存在、操作做到一半、缓存还没更新，或者 Controller 突然重启时，它怎样保证最后仍然正确。

### 4.1 已有资源怎么处理

Controller 不会发现同名资源就直接使用，而是先看 OwnerReference：

- 资源不存在：创建，并把 Sandbox 设置为 Controller Owner。
- 由当前 Sandbox UID 拥有：继续检查和收敛。
- 没有 Owner：只有带有接管授权或 tracking label 时才接管。
- 由其他对象拥有：拒绝使用，也绝不删除。

这里判断的是 UID，不只是名字，因为同名 Sandbox 删除再创建后已经是另一个对象。

Pod 还需要满足一个重要不变量：一个 Sandbox 最多只能有一个 Pod。如果发现多个由同一 Sandbox UID 控制的 Pod，Controller 不会随便挑一个，而是让 `Ready=False`、`reason=MultiplePods`，同时停止修改 Service。

### 4.2 预热池中的 Sandbox 如何被 Claim 接管

WarmPool Controller 先创建完整的 Sandbox CR，核心 Sandbox Controller 再为它创建 Pod、PVC 和 Service：

```text
WarmPool → Sandbox → Pod/PVC/Service
```

Claim 到来后，会从候选队列中优先选择已经 Ready 的 Sandbox，然后：

```text
1. 在 Claim annotation 中记录选中的 Sandbox 名称
2. 将 Sandbox 的 Owner 从 WarmPool 转给 Claim
3. 去掉 Pool 成员标签，传播 Claim metadata
4. Claim status 镜像 Sandbox 的名称、IP、FQDN 和 Conditions
```

接管不是复制或重建，已有 Pod 不需要重启。所有权链只是从：

```text
WarmPool → Sandbox → Pod
```

变成：

```text
Claim → Sandbox → Pod
```

Pool 观察到成员离开后，再补一个新的 Sandbox。

### 4.3 Sandbox 的暂停与恢复

暂停时设置 `operatingMode: Suspended`，Controller 会删除这个 Sandbox 拥有的 Pod；恢复时设置 `operatingMode: Running`，Controller 会重新创建 Pod 并挂载原来的 PVC。

所以暂停是**有损的**：进程和内存信息都会丢失，只有已经写入 PVC 的数据能够恢复。这也意味着 Agent 应该尽量把关键状态落盘。

这里我一开始有一个疑问：checkpoint 写入持久化存储由项目实现了吗？答案是没有。Agent Sandbox 只负责保留和重新挂载 PVC，具体如何 checkpoint，需要 Agent 或 Runtime 自己实现。

### 4.4 Sandbox 的过期

Sandbox 到达 `shutdownTime` 后，不会直接在同一轮里无声消失，而是分两轮处理：

```text
第一轮：写入 Ready=False、reason=SandboxExpired，然后 Requeue
第二轮：删除自己拥有的 Pod 和 Service，再执行 shutdownPolicy
```

这样外部观察者有机会先看到 Expired 状态。

- `Retain`：保留 Sandbox 和 PVC，删除 Pod、Service。
- `Delete`：删除 Sandbox，后续由 Kubernetes GC 清理它拥有的资源。

Claim 还支持 `ttlSecondsAfterFinished`，很适合表达“任务结束后再保留一段时间，然后回收”。

### 4.5 并发、缓存与故障恢复

#### 幂等与 API 原子性

即使两个操作都认为 Pod 不存在，Kubernetes 的名称唯一性也只允许一个同名 Create 成功，另一个会得到 `AlreadyExists`。但 Controller 仍要重新读取并验证 Owner，因为这个同名资源也可能属于别人。

这只是单个对象的原子性，整个 Reconcile 不是事务。PVC 创建成功、Pod 创建成功、Service 创建失败完全可能发生，下一轮 Reconcile 必须识别已经完成的部分，只补做剩余动作。

#### ResourceVersion 与可恢复的接管

WarmPool 接管要修改两个对象：

```text
A. Claim annotation 记录 sandbox-X
B. sandbox-X 的 Owner 改为 Claim
```

写入依赖 `resourceVersion`。如果 Controller 基于旧版本修改对象，API Server 会返回 `409 Conflict`。在接管这种关键路径中，Controller 会绕过可能滞后的 informer cache，直接读取 API Server 中的新对象，再重新判断和提交。

先写 A、再写 B 也很关键。如果 Controller 在两步之间崩溃，下一次 Reconcile 可以看到 Claim 已经选择了 sandbox-X，然后继续完成同一个 Sandbox 的接管，而不是又去领取 sandbox-Y。

这不是数据库意义上的 Two-Phase Commit，更像是一个“先持久化意图，再完成动作”的可恢复协议。

#### WarmPool Expectations

问题来了：WarmPool 使用 `GenerateName` 创建 Sandbox，名称唯一性不能阻止它超量创建。

假设目标是 10，informer cache 只看到 8。WarmPool 创建两个 Sandbox 后，API Server 中已经是 10，但本地 cache 可能还停留在 8。如果此时又 Reconcile，就可能再创建两个。

Expectations 的做法是在 WarmPool Controller 的进程内存中先记账：

```text
pendingCreations=2
```

然后再发送两个 Create。只要这个计数还没有归零，后续 WarmPool Reconcile 就不会继续补库存。

当 informer 真正收到两个 Sandbox CR 的 Add 通知时，每收到一个就执行一次 `pendingCreations--`，同时把所属 WarmPool 的 namespace/name 放进 WarmPool Controller 的工作队列。Worker 稍后重新 Reconcile 这个 Pool，此时 cache 已经能看到新 Sandbox。

这里容易混淆的是，同一个 Sandbox Add 会被两个 Controller 分别处理：

```text
Sandbox Add
├── Sandbox Controller：Reconcile Sandbox，创建 Pod/PVC/Service
└── WarmPool Controller：销掉 expectation，重新统计 Pool
```

Expectation 等待的是“informer 已经观察到 Sandbox CR”，不是等待 Pod 创建或 Sandbox Ready。它主要解决 API Server 与本地 cache 之间的 read-after-write gap，即使只有一个 Reconcile worker 也可能需要它。

删除也使用相同思路，只不过创建前还不知道 `GenerateName` 会生成什么名字，所以记录数量；删除时对象已经确定，因此按 UID 记录。

## 5. 总结

Agent Sandbox 的主体并不复杂：几组 CRD，加上不断创建和调谐资源的 Controller。真正值得学习的是它在 Kubernetes 最终一致性的前提下，怎样处理所有权、部分失败、缓存延迟和崩溃恢复。

从 Agent 产品的角度看，Sandbox 解决的是“任务在哪里安全、稳定地运行”；它本身并不完整描述“Agent 任务做到了哪一步”。这两层抽象最好还是分开。
