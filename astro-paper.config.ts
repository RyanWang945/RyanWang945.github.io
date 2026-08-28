import { defineAstroPaperConfig } from "./src/types/config";

export default defineAstroPaperConfig({
  site: {
    url: "https://ryanwang945.github.io/",
    title: "Ryan's Notes",
    description:
      "Ryan Wang 的个人技术博客，记录开发实践、技术探索和问题解决过程。",
    author: "Ryan Wang",
    profile: "https://github.com/RyanWang945",
    ogImage: "default-og.png",
    lang: "zh-CN",
    timezone: "Asia/Shanghai",
    dir: "ltr",
  },
  posts: {
    perPage: 8,
    perIndex: 6,
    scheduledPostMargin: 15 * 60 * 1000,
  },
  features: {
    lightAndDarkMode: true,
    dynamicOgImage: false,
    showArchives: true,
    showBackButton: true,
    editPost: {
      enabled: true,
      url: "https://github.com/RyanWang945/RyanWang945.github.io/edit/main/",
    },
    search: "pagefind",
  },
  socials: [
    {
      name: "github",
      url: "https://github.com/RyanWang945",
      linkTitle: "在 GitHub 上查看 Ryan Wang",
    },
  ],
  shareLinks: [],
});
