export default defineAppConfig({
  pages: [
    "pages/index/index",
    "pages/timeline/index",
    "pages/health/index",
    "pages/agent/index",
    "pages/mine/index",
    // 二级页保留（从对应 tab 页内入口进入；IA §5）
    "pages/pets/index",
    "pages/pets/life-view/index",
    "pages/tasks/index",
    "pages/care/index",
    "pages/medication/index",
    "pages/behavior/index",
    "pages/training/index",
    "pages/notifications/index",
    "pages/companion/index",
  ],
  window: {
    backgroundTextStyle: "light",
    navigationBarBackgroundColor: "#4E6349",
    navigationBarTitleText: "宠物生活",
    navigationBarTextStyle: "white",
    backgroundColor: "#F6F1E9",
  },
  tabBar: {
    color: "#8A8074",
    selectedColor: "#4E6349",
    backgroundColor: "#FFFFFF",
    borderStyle: "white",
    list: [
      { pagePath: "pages/index/index", text: "今天" },
      { pagePath: "pages/timeline/index", text: "时间线" },
      { pagePath: "pages/pets/index", text: "宠物" },
      { pagePath: "pages/agent/index", text: "助手" },
      { pagePath: "pages/mine/index", text: "我的" },
    ],
  },
});