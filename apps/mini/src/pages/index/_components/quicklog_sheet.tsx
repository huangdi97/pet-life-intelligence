import { Button, Input, Text, View } from "@tarojs/components";
import { QUICK_TYPES, type QuickType } from "../_lib";

/** Quick Log Sheet：单层 bottom sheet；tap 类型 → 最少输入 → 保存 */
export function QuickLogSheet(props: {
  type: QuickType | null;
  form: Record<string, string>;
  busy: boolean;
  onClose: () => void;
  onPickType: (t: QuickType) => void;
  onFormChange: (key: string, value: string) => void;
  onBack: () => void;
  onSave: () => void;
}) {
  const { type, form, busy, onClose, onPickType, onFormChange, onBack, onSave } = props;
  return (
    <View className="sheet-mask" onClick={onClose}>
      <View className="sheet" onClick={(e) => e.stopPropagation()}>
        <Text className="sheet-close" onClick={onClose}>×</Text>
        <View className="sheet-title">快速记录</View>
        {!type && (
          <View className="sheet-types">
            {QUICK_TYPES.map((t) => (
              <Button key={t.type} className="btn" onClick={() => onPickType(t)}>
                {t.label}
              </Button>
            ))}
          </View>
        )}
        {type && (
          <View>
            <View className="muted" style={{ marginBottom: 12 }}>{type.label} · 记录会带来源与记录人进入事件图</View>
            {type.fields.map((f) => (
              <View className="field" key={f.key}>
                <Text>{f.label}</Text>
                <Input
                  className="input"
                  value={form[f.key] ?? ""}
                  onInput={(e) => onFormChange(f.key, e.detail.value)}
                  type={f.numeric ? "digit" : "text"}
                />
              </View>
            ))}
            <View className="row" style={{ justifyContent: "space-between" }}>
              <Button className="btn" onClick={onBack}>返回</Button>
              <Button className="btn btn-primary" onClick={onSave} disabled={busy}>
                {busy ? "保存中…" : "保存"}
              </Button>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
