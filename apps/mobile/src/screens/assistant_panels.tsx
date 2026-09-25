/** Assistant 静态能力面板（Ask/Brief/Find/Plan/Explain 中的四个），
 *  语义忠实移植 apps/web/app/agent 对应面板：信息整理而非诊断；
 *  AI 未接入时如实标注 NOT_AVAILABLE，不编造推断。 */
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { COLORS, RADIUS, SPACE, TYPE } from "../tokens";
import type { AiStatus } from "../api";
import { Badge, Card, GhostButton, MutedText, SectionTitle } from "./ui";

function PanelShell({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <Card>
      <SectionTitle>{title}</SectionTitle>
      <MutedText>{sub}</MutedText>
      {children}
    </Card>
  );
}

export function BriefPanel({ onOpenHealth }: { onOpenHealth?: () => void }) {
  return (
    <PanelShell title="摘要" sub="健康事件的就诊摘要（信息整理，不是兽医诊断）。">
      {onOpenHealth ? <GhostButton label="查看就诊摘要" onPress={onOpenHealth} /> : null}
    </PanelShell>
  );
}

export function FindPanel() {
  return (
    <PanelShell title="找" sub="全局查找事件与内容。">
      <MutedText>跨域语义搜索在移动端暂以时间线筛选代替。</MutedText>
    </PanelShell>
  );
}

export function PlanPanel() {
  return (
    <PanelShell title="计划" sub="今日任务与训练计划入口。">
      <MutedText>今日任务在“今日”页，训练计划在“训练”页。</MutedText>
    </PanelShell>
  );
}

export function ExplainPanel({ aiStatus }: { aiStatus: AiStatus | null }) {
  const aiReady = aiStatus?.status === "REAL_PROVIDER_READY";
  const sections: Array<{ title: string; body: string }> = [
    {
      title: "事实（Fact）",
      body: "所有记录围绕同一宠物 ID 形成时间线，来源与时间可见于时间线。选择“值得关注”的条目即可查看依据。",
    },
    {
      title: "与它自己相比（Personal Baseline）",
      body: "对照它近期的个人基线（Personal Baseline）与基线差（delta），不是医疗诊断，也不与其他宠物比较。",
    },
    {
      title: "推断与不确定（Inference & Uncertainty）",
      body: aiReady
        ? "AI 推断将标注不确定度与证据来源。（当前 provider 状态：已接入）"
        : "推断：AI 服务暂未接入（NOT_AVAILABLE）——仅展示来自确定性规则（如 Red Flag Rule Engine）的结论，不编造推断。",
    },
    {
      title: "下一步（Next step）",
      body: "查看该现象的原始记录（时间线），或在生命视图中查看状态 Overlay，或快速记录一次新的观察。",
    },
  ];
  return (
    <Card>
      <SectionTitle>解释</SectionTitle>
      <MutedText>PLI 如何工作：所有记录围绕同一宠物 ID 形成时间线，AI 回答必须引用真实记录；医疗风险由独立规则引擎判断，不由 AI 决定。</MutedText>
      {sections.map((s) => (
        <View key={s.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{s.title}</Text>
          <Text style={styles.sectionBody}>{s.body}</Text>
        </View>
      ))}
      <View style={styles.badgeRow}>
        <Badge text={`AI provider: ${aiReady ? "已接入" : "服务暂未开放"}`} color={COLORS.inkSecondary} bg={COLORS.bgSurfaceMuted} />
        <Badge text="Red Flag Rule Engine: 独立运行" color={COLORS.primary700} bg={COLORS.primary100} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: SPACE.s3 },
  sectionTitle: { fontSize: TYPE.base, fontWeight: TYPE.weightSemibold, color: COLORS.inkPrimary },
  sectionBody: { fontSize: TYPE.sm, color: COLORS.inkSecondary, marginTop: 2, lineHeight: 20 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.s2, marginTop: SPACE.s3 },
});
