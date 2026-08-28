---
title: "欢迎来到我的技术博客"
pubDatetime: 2026-08-28T10:30:00+08:00
featured: true
draft: false
tags:
  - 随笔
  - Astro
description: "这是 Ryan 的个人技术博客，记录开发实践、技术探索和解决问题的过程。"
---

你好，欢迎来到我的技术博客。

这里主要记录我在软件开发、云原生和 AI 工具实践中的学习笔记。所有文章都直接使用 Markdown 编写，并通过 GitHub 自动发布。

## 写作与发布

新文章保存在 `src/content/posts/` 目录。发布前可以在本地预览：

```bash
pnpm dev
```

确认内容后，将文章的 `draft` 设置为 `false`，提交并推送到 `main` 分支，GitHub Actions 就会自动完成构建和发布。

```bash
git add src/content/posts
git commit -m "post: add a new article"
git push
```

保持记录，持续输出。
