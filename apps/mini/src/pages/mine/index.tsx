import { View, Text, Button } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { getPlatform } from "../../platform/index";

const MENU: Array<{ label: string; url: string }> = [
  { label: "任务", url: "/pages/tasks/index" },
  { label: "照护协作", url: "/pages/care/index" },
  { label: "健康", url: "/pages/health/index" },
  { label: "用药", url: "/pages/medication/index" },
  { label: "行为", url: "/pages/behavior/index" },
  { label: "训练", url: "/pages/training/index" },
  { label: "通知", url: "/pages/notifications/index" },
];

export default function Mine() {
  const platform = getPlatform();

  async function handleLogin() {
    const ok = platform.auth.available;
    if (!ok) {
      Taro.showModal({
        title: "登录暂未开放",
        content: "当前为开发模式；正式上线需小程序主体与 AppID。",
        showCancel: false,
      });
      return;
    }
    try {
      await platform.auth.login();
      Taro.showToast({ title: "已登录", icon: "success" });
    } catch {
      Taro.showModal({
        title: "登录失败",
        content: "小程序登录依赖平台账号（EXTERNAL_BLOCKED）。",
        showCancel: false,
      });
    }
  }

  return (
    <View className="page">
      <View className="h1">我的</View>
      <View className="sub">账号、隐私与设置</View>

      <View className="card">
        <View className="row" style={{ justifyContent: "space-between" }}>
          <Text>{platform.auth.isLoggedIn() ? "已登录" : "未登录（开发模式）"}</Text>
          <Button className="btn btn-primary" size="mini" onClick={handleLogin}>
            登录
          </Button>
        </View>
        <View className="muted" style={{ marginTop: 12 }}>
          账号系统上线依赖真实认证服务；当前 dev-auth 仅限开发环境。
        </View>
      </View>

      <View className="card">
        {MENU.map((m) => (
          <View
            key={m.url}
            style={{ padding: "20px 0", borderBottom: "1px solid #e8e2d9" }}
            onClick={() => Taro.navigateTo({ url: m.url })}
          >
            <Text>{m.label} ›</Text>
          </View>
        ))}
        <View style={{ padding: "20px 0" }} onClick={() => Taro.navigateTo({ url: "/pages/notifications/index" })}>
          <Text>通知设置</Text>
        </View>
      </View>

      <View className="muted" style={{ textAlign: "center", marginTop: 20 }}>
        宠物生活智能 v1.0.0
      </View>
    </View>
  );
}