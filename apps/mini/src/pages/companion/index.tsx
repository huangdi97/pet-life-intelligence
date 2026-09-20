import { useState } from "react";
import { View, Text, Button } from "@tarojs/components";
import { usePets } from "../../utils/usePets";
import { speciesLabel } from "../../utils/format";

/** Companion（MIN-013）：feature-flagged 前端原型。
 *  开关：PLIDEBUG_COMPANION=1 时展示四层原型 UI；默认关闭时只显示 PROTOTYPE 门。
 *  所有控件只渲染 PROTOTYPE 标签，绝不伪造设备执行结果（无真实硬件集成）。 */
const COMPANION_FLAG = process.env.PLIDEBUG_COMPANION === "1";

const PROTOTYPE_GATE_TEXT = "陪伴为前端原型 · 硬件集成未激活";

const LAYERS: Array<{ key: string; zh: string; en: string; desc: string; controls: string[] }> = [
  {
    key: "observe",
    zh: "观察",
    en: "Observe",
    desc: "汇总设备观察到的活动与状态变化，只展示真实事件来源。",
    controls: ["查看观察汇总", "记录一条观察"],
  },
  {
    key: "presence",
    zh: "在场",
    en: "Presence",
    desc: "家庭成员与宠物的在场时段（谁在、何时），来自真实交接与授权记录。",
    controls: ["查看在场时段"],
  },
  {
    key: "enrichment",
    zh: "丰富化",
    en: "Enrichment",
    desc: "丰富化活动建议与执行记录；建议不等于诊断或训练处方。",
    controls: ["查看活动建议", "开始一次活动"],
  },
  {
    key: "learned",
    zh: "习得互动",
    en: "Learned Interaction",
    desc: "从历史互动中总结的偏好与基线（provenance 可追踪）。",
    controls: ["查看偏好与基线"],
  },
];

export default function Companion() {
  const { pets, petId } = usePets();
  const current = pets?.find((p) => p.id === petId) ?? pets?.[0];
  // 原型提示：tap 只设置本地提示文案，绝不伪造设备执行成功。
  const [protoNotice, setProtoNotice] = useState<string | null>(null);
  const [activeLayer, setLayer] = useState<string | null>(null);

  function tapControl(layerKey: string, control: string) {
    setLayer(layerKey);
    setProtoNotice(`PROTOTYPE · ${control}：该控件为原型演示，未连接硬件，未执行任何设备操作。`);
  }

  return (
    <View className="page">
      <View className="h1">陪伴</View>
      <View className="sub">
        {current ? `${current.name} · ${speciesLabel(current.species)} · 四层陪伴原型` : "四层陪伴原型"}
      </View>

      {!COMPANION_FLAG && (
        <View className="state">
          <Text>{PROTOTYPE_GATE_TEXT}</Text>
          <View className="muted" style={{ marginTop: 12 }}>
            陪伴能力为 feature-flagged 前端原型；需要 PLIDEBUG_COMPANION=1 且真实硬件集成后才会开放。
            四层结构：观察 Observe / 在场 Presence / 丰富化 Enrichment / 习得互动 Learned Interaction。
          </View>
        </View>
      )}

      {COMPANION_FLAG && (
        <View>
          <View className="card" style={{ background: "#fbf6ee" }}>
            <View className="row">
              <Text className="proto-tag">PROTOTYPE</Text>
              <Text className="muted">前端原型 · 硬件集成未激活 · 不伪造设备执行</Text>
            </View>
          </View>

          {LAYERS.map((l) => (
            <View className="layer-card" key={l.key}>
              <View className="row">
                <Text className="layer-name">{l.zh}</Text>
                <Text className="layer-en">{l.en}</Text>
                <Text className="proto-tag" style={{ marginLeft: "auto" }}>PROTOTYPE</Text>
              </View>
              <View className="layer-desc">{l.desc}</View>
              <View className="row">
                {l.controls.map((c) => (
                  <Button key={c} className="btn" size="mini" onClick={() => tapControl(l.key, c)}>
                    {c}
                  </Button>
                ))}
              </View>
              {activeLayer === l.key && protoNotice && (
                <View className="muted" style={{ marginTop: 8, color: "#9c5f22" }}>{protoNotice}</View>
              )}
            </View>
          ))}

          <View className="muted" style={{ textAlign: "center", marginTop: 20 }}>
            陪伴输出不用于医疗判断；行为与训练建议以真实事件与规则为准。
          </View>
        </View>
      )}
    </View>
  );
}
