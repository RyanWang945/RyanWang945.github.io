# Ryan's Notes

Ryan Wang 的个人技术博客，基于 [Astro](https://astro.build/) 和 [AstroPaper](https://github.com/satnaing/astro-paper) 构建，部署在 GitHub Pages。

线上地址：<https://ryanwang945.github.io/>

## 本地运行

环境要求：Node.js 24、pnpm 11。

```bash
pnpm install
pnpm dev
```

本地地址默认为 <http://localhost:4321/>。

## 创建文章

```bash
pnpm new "文章标题" english-slug
```

文章会生成在 `src/content/posts/`，默认是草稿。中文标题建议同时提供简短的英文 slug。

也可以直接创建 Markdown 文件：

```md
---
title: "文章标题"
pubDatetime: 2026-08-28T10:30:00+08:00
featured: false
draft: true
tags:
  - Kubernetes
description: "用于首页、搜索结果和 SEO 的文章摘要。"
---

从这里开始写正文。
```

发布时将 `draft` 改为 `false`。

## 发布流程

```bash
pnpm format
pnpm lint
pnpm build

git add .
git commit -m "post: add article"
git push
```

推送到 `main` 后，GitHub Actions 会自动构建并发布到 GitHub Pages。

## 常用目录

- `src/content/posts/`：博客文章
- `src/content/pages/about.md`：关于页面
- `astro-paper.config.ts`：站点信息和功能配置
- `public/`：站点图标和静态资源
- `.github/workflows/`：检查与发布流程

## 致谢

本站基于 MIT 许可的 [AstroPaper](https://github.com/satnaing/astro-paper) 定制。
