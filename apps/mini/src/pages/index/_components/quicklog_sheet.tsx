/**
 * QuickLogSheet — 为豆豆记录 (Stage R.2 §41-43).
 * 单层 bottom sheet；一级高频动作 2 taps 完成，二级为轻表单或进入对应页面。
 * 数据流不变：只写后端已注册的 daily.* / diary.created 事件。
 */
import { Button, Icon, Input, Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import type { Pet } from "../../../services/api";
import { PetContextHeader } from "../../../components/pet_visual";
import { QUICK_LEVEL1, QUICK_LEVEL2, QUICK_NAV, QUICK_TYPES, quickTypeOf, type QuickType } from "../_lib";

export function QuickLogSheet(props: {
  pet: Pet | undefined;
  type: QuickType | null;
  form: Record<string, string>;
  busy: boolean;
  onClose: () => void;
  onPickType: (t: QuickType) => void;
  onFormChange: (key: string, value: string) => void;
  onBack: () => void;
  onSave: () => void;
}) {
  const { pet, type, form, busy, onClose, onPickType, onFormChange, onBack, onSave } = props;
  return (
    <View className="sheet-mask" onClick={onClose}>
      <View className="sheet" onClick={(e) => e.stopPropagation()}>
        <Text className="sheet-close" onClick={onClose}>
          <Icon type="clear" size={18} color="#8A8074" />
        </Text>
        <PetContextHeader pet={pet ?? null} title={pet ? `为${pet.name}记录` : "快速记录"} sub="喂食 · 饮水 · 散步 · 玩耍等日常事件" />

        {!type && (
          <View>
            <View className="quick-section-label">常用</View>
            <View className="quick-grid">
              {QUICK_LEVEL1.map((t) => {
                const qt = quickTypeOf(t);
                return qt ? (
                  <View key={t} className="quick-item quick-item-primary" onClick={() => onPickType(qt)}>
                    {qt.label}
                  </View>
                ) : null;
              })}
            </View>
            <View className="quick-section-label">更多</View>
            <View className="quick-grid">
              {QUICK_LEVEL2.map((t) => {
                const qt = quickTypeOf(t);
                return qt ? (
                  <View key={t} className="quick-item" onClick={() => onPickType(qt)}>
                    {qt.label}
                  </View>
                ) : null;
              })}
              {QUICK_NAV.map((n) => (
                <View
                  key={n.url}
                  className="quick-item quick-item-nav"
                  onClick={() => {
                    onClose();
                    Taro.navigateTo({ url: n.url });
                  }}
                >
                  {n.label} ›
                </View>
              ))}
            </View>
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
