import { useState } from "react";
import { View, Text, Button } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { getPlatform } from "../../platform/index";

/** 我的（MIN-005）：家庭 / 通知 / 设置入口 + 账号（IA §2 Me 分区）。 */
const FAMILY_ENTRIES: Array<{ label: string; url: string }> = [
  { label: "宠物档案", url: "/pages/pets/index" },
  { label: "照护协作", url: "/pages/care/index" },
];

const NOTIFICATION_ENTRIES: Array<{ label: string; url: string }> = [
  { label: "通知", url: "/pages/notifications/index" },
];

const MORE_ENTRIES: Array<{ label: string; url: string }> = [
  { label: "任务", url: "/pages/tasks/index" },
  { label: "健康", url: "/pages/health/index" },
  { label: "用药", url: "/pages/medication/index" },
  { label: "行为", url: "/pages/behavior/index" },
  { label: "训练", url: "/pages/training/index" },
];

function EntryList({ items }: { items: Array<{ label: string; url: string }> }) {
  return (
    <View>
      {items.map((m) => (
        <View className="menu-item" key={m.url} onClick={() => Taro.navigateTo({ url: m.url })}>
          <Text className="menu-label">{m.label}</Text>
          <Text className="menu-arrow">›</Text>
        </View>
      ))}
    </View>
  );
}

export default function Mine() {
  const platform = getPlatform();
  const [settingsOpen, setSettingsOpen] = useState(false);

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
      <View className="sub">账号、家庭与设置</View>

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
        <Text>家庭</Text>
        <View style={{ marginTop: 8 }}>
          <EntryList items={FAMILY_ENTRIES} />
        </View>
      </View>

      <View className="card">
        <Text>通知</Text>
        <View style={{ marginTop: 8 }}>
          <EntryList items={NOTIFICATION_ENTRIES} />
          <View
            className="menu-item"
            onClick={() => Taro.navigateTo({ url: "/pages/notifications/index" })}
          >
            <Text className="menu-label">通知设置</Text>
            <Text className="menu-arrow">›</Text>
          </View>
        </View>
      </View>

      <View className="card">
        <Text>更多</Text>
        <View style={{ marginTop: 8 }}>
          <EntryList items={MORE_ENTRIES} />
        </View>
      </View>

      <View className="card">
        <View className="row" style={{ justifyContent: "space-between" }} onClick={() => setSettingsOpen((v) => !v)}>
          <Text>设置</Text>
          <Text className="muted">{settingsOpen ? "收起" : "展开"}</Text>
        </View>
        {settingsOpen && (
          <View className="muted" style={{ marginTop: 12 }}>
            当前版本暂无更多设置项。应用版本 v1.0.0；数据与隐私说明随正式版提供。
          </View>
        )}
      </View>

      <View className="muted" style={{ textAlign: "center", marginTop: 20 }}>
        宠物生活智能 v1.0.0
      </View>
    </View>
  );
}
