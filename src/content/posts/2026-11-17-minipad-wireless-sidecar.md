---
title: "MiniPad 让 iPad 成为 Mac mini 的无线主屏"
pubDatetime: 2026-11-17T15:18:00+08:00
featured: false
draft: false
tags:
  - macos
  - ipad
  - swift
  - codex
description: "用常驻虚拟显示器配合原生随航，让 iPad 成为 Mac mini 的无线主屏，再通过 Codex 远程一句话启动。"
---

## 背景

我想让 iPad 充当 Mac mini 的日常屏幕，少依赖一台外接显示器。

苹果自带的随航（Sidecar）已经能把 Mac 桌面显示到 iPad 上。但在我的测试里，关闭外接显示器后，随航也立刻断开。系统日志提示：随航的虚拟显示器成了最后一个在线显示器。

于是，我和 Codex 一起做了 MiniPad，尝试补上这个缺口。

## 方案

MiniPad 用 Swift 调用系统随航，启动时完成三个步骤：

1. 创建并持续保留一块 1920×1080 的虚拟显示器，让系统还有另一个在线显示目标。
2. 请求无线连接 iPad，并把 iPad 设为主屏。
3. 再次查询连接和显示器状态，确认就绪后继续在后台运行。

虚拟屏用来维持显示环境，实际操作的桌面放在 iPad 上。

编译完成后，在项目目录执行：

```sh
/usr/bin/python3 scripts/session.py start --transport wifi
```

也可以双击项目里的“启动 iPad 屏幕.command”。启动后关闭终端窗口，会话仍会继续；重复启动时，脚本会保留已有的健康会话。

## 结果

在我的 Mac mini M4 和 iPad Pro 上，已经能在实体显示器离线的情况下，通过 iPad 查看 Mac 桌面并使用键盘输入。同期查询确认，在线的显示目标只有 iPad 和 MiniPad 创建的虚拟屏，iPad 是主屏。

更方便的是，现在我通过 Codex 远程连接这台 Mac，在聊天里说一句“启动”，它就会执行脚本并检查结果。日常使用已经不需要我手动去 Mac 上操作。偶尔仍会遇到连接失败，需要检查状态后重试。

下面是刀塔、星露谷物语和正常桌面的实拍：

![iPad 通过无线随航显示刀塔游戏画面](/images/posts/minipad-wireless-sidecar/01-dota.jpg)

_刀塔游戏画面。_

![iPad 通过无线随航显示星露谷物语游戏画面](/images/posts/minipad-wireless-sidecar/02-stardew-valley.jpg)

_星露谷物语游戏画面。_

![iPad 通过无线随航显示正常的 macOS 桌面](/images/posts/minipad-wireless-sidecar/03-macos-desktop.jpg)

_正常的 macOS 桌面。_

## 总结

这个小项目把“连接随航、维持显示环境、切换主屏”收进了一条命令，再由 Codex 提供一个方便的启动入口。对我来说，iPad 当 Mac mini 屏幕这件事，终于从一次实验变成了可以重复使用的流程。

接下来想做两件事：

1. 从触摸板换成鼠标，真实打几把刀塔，看看完整对局里的延迟和操作体验。
2. 接入 iPad 声音输出，让声音由 iPad 播放，替代目前的 Mac mini 扬声器输出。

目前仍需要 Mac 已登录并保持唤醒，iPad 可以被发现。冷启动解锁不在当前方案的能力范围内，自动重连尚未实现，长期保持与睡眠恢复还需要验证；声音也仍由 Mac 播放。底层用了私有接口，后续 macOS 更新还需要重新验证兼容性。
