const sidebarConfig = {
  "/docs/fe/": [
    {
      title: "技术实践",
      children: [
        "/docs/fe/engineering-practice/performance-optimization/",
        "/docs/fe/engineering-practice/web-fe-security/",
        "/docs/fe/engineering-practice/apps-monorepo/",
      ],
    },
    {
      title: "业务沉淀",
      children: [
        "/docs/fe/accumulate-business/mf-types-resolve/",
        "/docs/fe/accumulate-business/simple-router/",
      ],
    },
    {
      title: "专项知识",
      children: [
        "/docs/fe/knowledge-project/link-tag-use/",
        "/docs/fe/knowledge-project/what-is-monorepo/",
      ],
    },
  ],
  "/docs/pm/": [],
  "/docs/others/": [],
};

module.exports = {
  sidebarConfig,
};
