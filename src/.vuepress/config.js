const path = require("path");
const { navConfig } = require("./config/nav");
const { sidebarConfig } = require("./config/sidebar");

module.exports = {
  title: "Buu的网络日志",
  description: "一个热爱生活的年轻人",
  dest: path.resolve(__dirname, "../../", "docs"),
  themeConfig: {
    sidebarDepth: 0,
    nav: navConfig,
    sidebar: sidebarConfig,
  },
};
