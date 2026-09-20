/** CompanionScreen — 陪伴 (MIN-013 mobile port): feature-flagged prototype.
 *  Switch: env PLIDEBUG_COMPANION=1 shows the four-layer prototype UI; by
 *  default only the PROTOTYPE gate is shown. All controls render PROTOTYPE
 *  tags and never fake success — local session state only, no backend writes. */
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, type DeviceRow, type LifeEvent } from "../api";
import { usePets } from "../context";
import { speciesLabel } from "../format";
import { COLORS, SPACE, TYPE } from "../tokens";
import {
  Badge,
  Card,
  deviceStateColors,
  deviceStateLabel,
  EmptyText,
  EventItem,
  GhostButton,
  MutedText,
  ProtoTag,
  ScreenTitle,
  SectionTitle,
} from "./ui";

const COMPANION_FLAG = process.env.PLIDEBUG_COMPANION === "1";

const PROTOTYPE_GATE_TEXT = "陪伴为前端原型，硬件集成未激活";

const LAYERS: Array<{ key: string; zh: string; en: string; desc: string; controls: string[] }> = [
  {
    key: "observe",
    zh: "观察",
    en: "Observe",
    desc: "汇总设备观察到的最近活动与状态变化，只展示真实事件来源。",
    controls: [],
  },
  {
    key: "presence",
    zh: "在场",
    en: "Presence",
    desc: "家庭成员与宠物的在场时段，来自真实交接与授权记录。",
    controls: ["讲话", "短语音"],
  },
  {
    key: "enrichment",
    zh: "丰富化",
    en: "Enrichment",
    desc: "丰富化活动建议与执行记录；建议不等于诊断或训练处方。",
    controls: ["零食", "玩耍"],
  },
  {
    key: "learned",
    zh: "习得互动",
    en: "Learned Interaction",
    desc: "从历史互动中总结的偏好与基线（provenance 可追踪）。",
    controls: ["互动按钮"],
  },
];

export function CompanionScreen() {
  const { pets, petId } = usePets();
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [events, setEvents] = useState<LifeEvent[]>([]);
  // 原型提示：tap 只设置本地提示文案与本地计数，绝不伪造设备执行成功。
  const [notices, setNotices] = useState<Record<string, string>>({});
  const [sessionTaps, setSessionTaps] = useState(0);

  useEffect(() => {
    if (!petId) return;
    let alive = true;
    api
      .get<DeviceRow[]>(`/pets/${petId}/devices`)
      .then((rows) => {
        if (alive) setDevices(rows);
      })
      .catch(() => {
        if (alive) setDevices([]);
      });
    api
      .get<{ events: LifeEvent[]; count: number }>(`/pets/${petId}/events?limit=8`)
      .then((r) => {
        if (!alive) return;
        setEvents(r.events.filter((e) => e.event_type !== "today.viewed").slice(0, 5));
      })
      .catch(() => {
        if (alive) setEvents([]);
      });
    return () => {
      alive = false;
    };
  }, [petId]);

  const current = pets?.find((p) => p.id === petId) ?? pets?.[0];

  function tapControl(layerKey: string, control: string) {
    setNotices((prev) => ({
      ...prev,
      [layerKey]: `PROTOTYPE · ${control}：该控件为原型演示，未连接硬件，未执行任何设备操作。`,
    }));
    setSessionTaps((n) => n + 1);
  }

  return (
    <SafeAreaView style={styles.page} edges={["top"]}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
        <ScreenTitle
          title="陪伴"
          sub={current ? `${current.name} · ${speciesLabel(current.species)} · 四层陪伴原型` : "四层陪伴原型"}
        />

        {!COMPANION_FLAG && (
          <Card>
            <View style={styles.gateRow}>
              <ProtoTag />
              <Text style={styles.gateTitle}>{PROTOTYPE_GATE_TEXT}</Text>
            </View>
            <MutedText>
              陪伴能力为 feature-flagged 前端原型；需要 PLIDEBUG_COMPANION=1 且真实硬件集成后才会开放。
              四层结构：观察 Observe / 在场 Presence / 丰富化 Enrichment / 习得互动 Learned Interaction。
            </MutedText>
          </Card>
        )}

        {COMPANION_FLAG && (
          <>
            <Card>
              <View style={styles.gateRow}>
                <ProtoTag />
                <Text style={styles.gateNote}>前端原型 · 硬件集成未激活 · 不伪造设备执行</Text>
              </View>
            </Card>

            {LAYERS.map((l) => (
              <Card key={l.key}>
                <View style={styles.layerHead}>
                  <Text style={styles.layerZh}>{l.zh}</Text>
                  <Text style={styles.layerEn}>{l.en}</Text>
                  <View style={styles.layerTag}>
                    <ProtoTag />
                  </View>
                </View>
                <Text style={styles.layerDesc}>{l.desc}</Text>
                {l.key === "observe" && (
                  <>
                    {events.length === 0 ? (
                      <EmptyText>还没有记录。</EmptyText>
                    ) : (
                      events.map((e) => <EventItem key={e.event_id} event={e} />)
                    )}
                    {devices.length === 0 ? (
                      <View style={styles.gateRow}>
                        <ProtoTag />
                        <Text style={styles.gateNote}>设备接入暂未开放</Text>
                      </View>
                    ) : (
                      devices.map((d) => {
                        const colors = deviceStateColors(d.status);
                        return (
                          <View key={d.device_id} style={styles.deviceRow}>
                            <Text style={styles.deviceName}>{d.display_name || d.provider}</Text>
                            <Badge text={deviceStateLabel(d.status)} color={colors.color} bg={colors.bg} />
                          </View>
                        );
                      })
                    )}
                  </>
                )}
                {l.controls.length > 0 && (
                  <View style={styles.controlsRow}>
                    {l.controls.map((c) => (
                      <GhostButton key={c} small label={c} onPress={() => tapControl(l.key, c)} />
                    ))}
                  </View>
                )}
                {notices[l.key] ? <Text style={styles.protoNotice}>{notices[l.key]}</Text> : null}
              </Card>
            ))}

            <Card>
              <Text style={styles.sessionText}>
                本次会话已互动 {sessionTaps} 次（本地原型计数，未同步）
              </Text>
            </Card>

            <MutedText>陪伴输出不用于医疗判断；行为与训练建议以真实事件与规则为准。</MutedText>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.bgCanvas },
  flex: { flex: 1 },
  content: { padding: SPACE.s4, paddingBottom: SPACE.s8 },
  gateRow: { flexDirection: "row", alignItems: "center", gap: SPACE.s2 },
  gateTitle: { fontSize: TYPE.base, fontWeight: TYPE.weightSemibold, color: COLORS.inkPrimary, flexShrink: 1 },
  gateNote: { fontSize: TYPE.sm, color: COLORS.inkSecondary, flexShrink: 1 },
  layerHead: { flexDirection: "row", alignItems: "center", gap: SPACE.s2 },
  layerZh: { fontSize: TYPE.md, fontWeight: TYPE.weightSemibold, color: COLORS.inkPrimary },
  layerEn: { fontSize: TYPE.xs, color: COLORS.inkMuted },
  layerTag: { marginLeft: "auto" },
  layerDesc: { fontSize: TYPE.sm, color: COLORS.inkSecondary, marginTop: SPACE.s2 },
  deviceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: SPACE.s2,
  },
  deviceName: { fontSize: TYPE.sm, color: COLORS.inkPrimary },
  controlsRow: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.s2, marginTop: SPACE.s3 },
  protoNotice: { fontSize: TYPE.xs, color: COLORS.accent600, marginTop: SPACE.s2 },
  sessionText: { fontSize: TYPE.sm, color: COLORS.inkSecondary },
});
