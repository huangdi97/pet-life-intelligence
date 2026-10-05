import { useState } from "react";
import { View, Text, Button, Textarea } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { getPlatform } from "../../platform/index";
import { api } from "../../services/api";

/**
 * 我的（MIN-005）— R5.5 owner utility surface.
 *
 * Me is deliberately quieter than pet-life pages: account/session, household,
 * pets, notifications, privacy/data and device utilities live here without
 * becoming a second feature dashboard. Platform/auth implementation details
 * never appear in owner copy.
 */
const HOUSEHOLD_ENTRIES: Array<{ label: string; detail: string; url: string }> = [
  { label: "宠物档案", detail: "查看与切换家庭里的宠物", url: "/pages/pets/index" },
  { label: "照护协作", detail: "管理照护交接、范围与有效期", url: "/pages/care/index" },
];

const UTILITY_ENTRIES: Array<{ label: string; detail: string; url: string }> = [
  { label: "通知", detail: "查看需要处理的提醒", url: "/pages/notifications/index" },
  { label: "在家与设备", detail: "查看真实连接与最近同步状态", url: "/pages/monitoring/index" },
];

const FEEDBACK_CATEGORIES = [
  { key: "bug", label: "出错" },
  { key: "confusing", label: "看不懂" },
  { key: "missing", label: "缺少内容" },
  { key: "feature_request", label: "功能建议" },
  { key: "privacy", label: "隐私担忧" },
  { key: "other", label: "其他" },
] as const;

function EntryList({ items }: { items: Array<{ label: string; detail: string; url: string }> }) {
  return (
    <View>
      {items.map((item) => (
        <View
          className="life-row"
          key={item.url}
          onClick={() => Taro.navigateTo({ url: item.url })}
        >
          <View className="life-row-body">
            <View className="life-row-head">
              <Text className="life-row-type">{item.label}</Text>
              <Text className="life-row-time">›</Text>
            </View>
            <View className="life-row-detail">{item.detail}</View>
          </View>
        </View>
      ))}
    </View>
  );
}

export default function Mine() {
  const platform = getPlatform();
  const [accountOpen, setAccountOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackCategory, setFeedbackCategory] = useState<(typeof FEEDBACK_CATEGORIES)[number]["key"]>("confusing");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackBusy, setFeedbackBusy] = useState(false);

  async function handleLogin() {
    if (!platform.auth.available) {
      Taro.showModal({
        title: "登录暂未开放",
        content: "当前客户端还不能完成平台账号登录。你仍可以浏览当前可用的演示内容。",
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
        content: "暂时无法完成平台账号登录，请稍后再试。",
        showCancel: false,
      });
    }
  }

  const loggedIn = platform.auth.isLoggedIn();

  async function sendFeedback() {
    const message = feedbackMessage.trim();
    if (!message || feedbackBusy || !loggedIn) return;
    setFeedbackBusy(true);
    try {
      await api.post("/pilot/feedback", {
        category: feedbackCategory,
        message,
        page_url: "mini://mine",
        client: "mini",
        extra: { surface: "me" },
      });
      setFeedbackMessage("");
      setFeedbackOpen(false);
      Taro.showToast({ title: "反馈已提交", icon: "success" });
    } catch {
      Taro.showToast({ title: "暂时无法提交，请稍后重试", icon: "none" });
    } finally {
      setFeedbackBusy(false);
    }
  }

  return (
    <View className="page">
      <View className="h1">我的</View>
      <View className="sub">家庭、通知、设备与数据设置</View>

      <View className="soft-hero">
        <View className="section-title">账号</View>
        <View className="metric-row">
          <View className="metric-cell">
            <View className="metric-value">{loggedIn ? "已登录" : "未登录"}</View>
            <View className="metric-label">当前会话</View>
          </View>
        </View>
        {!loggedIn ? (
          <Button className="btn btn-primary" size="mini" onClick={handleLogin}>
            登录
          </Button>
        ) : null}
        {!platform.auth.available ? (
          <View className="life-empty-note">
            平台账号登录尚未在当前客户端开放；这不会影响已经可用的浏览与演示内容。
          </View>
        ) : null}
      </View>

      <View className="open-section">
        <View className="section-title">家庭</View>
        <EntryList items={HOUSEHOLD_ENTRIES} />
      </View>

      <View className="open-section">
        <View className="section-title">通知与设备</View>
        <EntryList items={UTILITY_ENTRIES} />
      </View>

      <View className="open-section">
        <View className="section-title">隐私与数据</View>
        <View className="life-row">
          <View className="life-row-body">
            <View className="life-row-head">
              <Text className="life-row-type">隐私</Text>
            </View>
            <View className="life-row-detail">只展示完成当前任务所需的信息；共享与照护权限由你确认。</View>
          </View>
        </View>
        <View className="life-row">
          <View className="life-row-body">
            <View className="life-row-head">
              <Text className="life-row-type">数据</Text>
            </View>
            <View className="life-row-detail">记录会保留来源与时间；支持的导出、分享和撤销能力会明确说明范围。</View>
          </View>
        </View>
      </View>

      <View className="open-section" data-testid="pli.mini.me.feedback">
        <View
          className="section-title"
          onClick={() => setFeedbackOpen((value) => !value)}
        >
          试点反馈
          <Text className="section-caption">{feedbackOpen ? "收起" : "反馈问题或建议"}</Text>
        </View>
        <View className="life-empty-note">请不要填写病历全文或联系方式。反馈会进入真实试点反馈队列。</View>
        {feedbackOpen ? (
          <View className="soft-panel">
            <View className="chips">
              {FEEDBACK_CATEGORIES.map((category) => (
                <View
                  key={category.key}
                  className={`chip${feedbackCategory === category.key ? " chip-active" : ""}`}
                  onClick={() => setFeedbackCategory(category.key)}
                >
                  {category.label}
                </View>
              ))}
            </View>
            <Textarea
              className="input"
              value={feedbackMessage}
              maxlength={4000}
              onInput={(event) => setFeedbackMessage(event.detail.value)}
              placeholder="描述你遇到的问题或建议"
              autoHeight
            />
            <Button
              className="btn btn-primary"
              disabled={feedbackBusy || !feedbackMessage.trim() || !loggedIn}
              onClick={sendFeedback}
            >
              {feedbackBusy ? "提交中…" : loggedIn ? "提交反馈" : "登录后可提交"}
            </Button>
          </View>
        ) : null}
      </View>

      <View className="open-section">
        <View
          className="section-title"
          onClick={() => setAccountOpen((value) => !value)}
        >
          应用
          <Text className="section-caption">{accountOpen ? "收起" : "查看"}</Text>
        </View>
        {accountOpen ? (
          <View className="soft-panel">
            <View className="life-row">
              <View className="life-row-body">
                <View className="life-row-head">
                  <Text className="life-row-type">Pet Life Intelligence</Text>
                </View>
                <View className="life-row-detail">当前为预览构建；未开放的能力会在页面中明确说明，不会伪装成已连接或已完成。</View>
              </View>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}
