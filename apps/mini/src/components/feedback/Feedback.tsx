/**
 * EmptyState — meaningful empty experience (Stage R.2 §61):
 * meaning + next action, never a bare "还没有记录".
 */
import type { ReactNode } from "react";
import { Text, View } from "@tarojs/components";

export function EmptyState(props: {
  icon?: ReactNode;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { icon, title, body, actionLabel, onAction } = props;
  return (
    <View className="empty-state">
      {icon ? <View className="empty-state-icon">{icon}</View> : null}
      <View className="empty-state-title">{title}</View>
      {body ? <View className="empty-state-body">{body}</View> : null}
      {actionLabel ? (
        <View className="primary-action" style={{ margin: "24px 0 0" }} onClick={onAction}>
          {actionLabel}
        </View>
      ) : null}
    </View>
  );
}

/** InlineError — 暂时连接不上；本地操作不丢失；[重试]（R.2 §59）。 */
export function InlineError(props: { message?: string; onRetry?: () => void }) {
  const { message = "暂时连接不上", onRetry } = props;
  return (
    <View className="inline-error">
      <Text>{message} · 你的本地操作不会丢失</Text>
      {onRetry ? (
        <Text className="inline-error-action" onClick={onRetry}>
          重试
        </Text>
      ) : null}
    </View>
  );
}
