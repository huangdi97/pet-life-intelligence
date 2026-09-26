/**
 * AttentionPanel — the One Attention layer (Stage R.2 §24).
 * calm: 一切如常 (success tone) | focus: 值得关注 (amber) | danger:
 * 仅用于后端 URGENT/EMERGENCY 分级 (red). A screen renders at most one.
 */
import { Icon, Text, View } from "@tarojs/components";

export type AttentionKind = "calm" | "focus" | "danger";

export function AttentionPanel(props: {
  kind: AttentionKind;
  title?: string;
  body: string;
  footer?: string;
  onPress?: () => void;
}) {
  const { kind, title, body, footer, onPress } = props;
  const iconType = kind === "danger" ? "warn" : kind === "focus" ? "info" : "success";
  const iconColor = kind === "danger" ? "#B42318" : kind === "focus" ? "#A97B2C" : "#4E7A5A";
  const panelClass = kind === "danger" ? "attention-danger" : kind === "focus" ? "attention-focus" : "attention-calm";
  const titleClass = kind === "danger" ? "attention-title-danger" : kind === "focus" ? "attention-title-focus" : "attention-title-calm";
  const defaultTitle = kind === "danger" ? "需要关注" : kind === "focus" ? "值得关注" : "一切如常";
  return (
    <View className={`attention-panel ${panelClass}`} onClick={onPress}>
      <View className="attention-icon">
        <Icon type={iconType} size={22} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text className={`attention-title ${titleClass}`}>{title ?? defaultTitle}</Text>
        <View className="attention-body">{body}</View>
        {footer ? <View className="attention-footer">{footer}</View> : null}
      </View>
    </View>
  );
}
