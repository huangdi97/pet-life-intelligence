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
    navigationBarBackgroundColor: "#61795C",
    navigationBarTitleText: "宠物生活",
    navigationBarTextStyle: "white",
    backgroundColor: "#FAF8F5",
  },
  tabBar: {
    color: "#7C7369",
    selectedColor: "#3D4F3A",
    backgroundColor: "#FFFFFF",
    borderStyle: "white",
    list: [
      { pagePath: "pages/index/index", text: "今日" },
      { pagePath: "pages/timeline/index", text: "时间线" },
      { pagePath: "pages/health/index", text: "健康" },
      { pagePath: "pages/agent/index", text: "助手" },
      { pagePath: "pages/mine/index", text: "我的" },
    ],
  },
});