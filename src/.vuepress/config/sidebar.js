const sidebarConfig = {
  "/docs/pm/": [],
  "/docs/fe/": [
    {
      title: "技术实践",
      children: ["/docs/fe/engineering-practice/performance-optimization/"],
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
      children: ["/docs/fe/knowledge-project/link-tag-use/"],
    },
  ],
  "/docs/others/": [],
};

module.exports = {
  sidebarConfig,
};
