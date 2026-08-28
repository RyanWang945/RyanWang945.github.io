import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import slugify from "slugify";

const [title, requestedSlug] = process.argv.slice(2);

if (!title) {
  process.stderr.write('用法：pnpm new "文章标题" [english-slug]\n');
  process.exit(1);
}

const parts = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
}).formatToParts(new Date());

const value = type => parts.find(part => part.type === type)?.value ?? "00";
const date = `${value("year")}-${value("month")}-${value("day")}`;
const time = `${value("hour")}:${value("minute")}:${value("second")}`;
const generatedSlug = slugify(requestedSlug ?? title, {
  lower: true,
  strict: true,
  trim: true,
});
const fallbackSlug = `post-${value("hour")}${value("minute")}${value("second")}`;
const slug = generatedSlug || fallbackSlug;
const postsDir = path.resolve("src/content/posts");
const filePath = path.join(postsDir, `${date}-${slug}.md`);

const content = `---
title: ${JSON.stringify(title)}
pubDatetime: ${date}T${time}+08:00
featured: false
draft: true
tags:
  - 笔记
description: "请在这里补充文章摘要。"
---

从这里开始写正文。
`;

await mkdir(postsDir, { recursive: true });

try {
  await writeFile(filePath, content, { encoding: "utf8", flag: "wx" });
  process.stdout.write(`已创建：${path.relative(process.cwd(), filePath)}\n`);
  process.stdout.write("完成后将 draft 改为 false 即可发布。\n");
} catch (error) {
  if (error?.code === "EEXIST") {
    process.stderr.write(
      `文件已经存在：${path.relative(process.cwd(), filePath)}\n`
    );
    process.exit(1);
  }
  throw error;
}
