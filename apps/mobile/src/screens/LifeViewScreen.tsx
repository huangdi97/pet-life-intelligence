/** LifeViewScreen — Mobile 3D Life View（Stage H.2，Compact 职责）。
 *  3D 形象服务诚实状态 + 版本列表 + 当前状态（真实事实引用）。
 *  无真实 provider 时如实显示「3D 生成服务暂未开放」，不伪装成功；
 *  用户侧文案不用「数字孪生」。 */
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, humanizeError } from "../api";
import { usePets } from "../context";
import { COLORS, SPACE, TYPE } from "../tokens";
import { Card, CardTitle, GhostButton, MutedText, ScreenTitle } from "./ui";

interface VisualModel {
  model_id: string;
  version: number;
  status: string;
  failure_reason: string | null;
  owner_verified: boolean | null;
  provenance_kind: string;
}

interface OverlayMetric {
  key: string;
  label: string;
  current: string | number;
  baseline_range: string | null;
  delta: number | null;
}

interface StateOverlay {
  provider_real: boolean;
  model_status: string | null;
  metrics: OverlayMetric[];
  note: string;
}

function StateBox({ text }: { text: string }) {
  return (
    <View style={{ borderWidth: 1, borderColor: COLORS.bgSurfaceStrong, borderRadius: 8, padding: SPACE.s4, marginVertical: SPACE.s1 }}>
      <Text style={{ fontSize: TYPE.sm, color: COLORS.inkSecondary }}>{text}</Text>
    </View>
  );
}

export function LifeViewScreen() {
  const { pets, petId } = usePets();
  const [providerReal, setProviderReal] = useState<boolean | null>(null);
  const [models, setModels] = useState<VisualModel[]>([]);
  const [overlay, setOverlay] = useState<StateOverlay | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const pet = pets?.find((p) => p.id === petId) ?? pets?.[0];

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const st = await api.get<{ real: boolean }>("/visual/status");
        if (!alive) return;
        setProviderReal(st.real);
        if (pet?.id) {
          const [ml, ov] = await Promise.all([
            api.get<{ models: VisualModel[] }>(`/pets/${pet.id}/visual-models`),
            api.get<StateOverlay>(`/pets/${pet.id}/state-overlay`).catch(() => null),
          ]);
          if (!alive) return;
          setModels(ml.models);
          setOverlay(ov);
        }
      } catch (e) {
        if (alive) setError(humanizeError(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [pet?.id]);

  return (
    <SafeAreaView style={styles.page} edges={["top"]}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
        <ScreenTitle title="生命视图" sub={pet ? `${pet.name} · 3D 形象与当前状态` : "3D 形象与当前状态"} />

        <Card>
          <CardTitle>3D 形象服务</CardTitle>
          {loading ? (
            <StateBox text="加载中……" />
          ) : error ? (
            <StateBox text={error} />
          ) : providerReal === false ? (
            <>
              <StateBox text="3D 生成服务暂未开放" />
              <MutedText>
                未接入真实 3D 生成服务；不会伪装生成成功。3D 形象只描述外观，不包含任何健康信息。
              </MutedText>
            </>
          ) : (
            <MutedText>3D 生成服务已就绪。</MutedText>
          )}
        </Card>

        <Card>
          <CardTitle>3D 形象版本</CardTitle>
          {models.length === 0 ? (
            <MutedText>还没有 3D 形象版本。</MutedText>
          ) : (
            models.map((m) => (
              <View key={m.model_id} style={styles.row}>
                <Text style={{ fontSize: TYPE.md, fontWeight: "600" }}>v{m.version}</Text>
                <Text style={{ fontSize: TYPE.sm, color: COLORS.inkSecondary }}>
                  {m.status} · {m.provenance_kind}
                  {m.owner_verified === true ? " · 已确认像它" : m.owner_verified === false ? " · 待重新生成" : ""}
                </Text>
                {m.failure_reason ? <MutedText>失败原因：{m.failure_reason}</MutedText> : null}
              </View>
            ))
          )}
        </Card>

        <Card>
          <CardTitle>当前状态</CardTitle>
          {!overlay || overlay.metrics.length === 0 ? (
            <MutedText>今天还没有记录。</MutedText>
          ) : (
            overlay.metrics.map((m) => (
              <View key={m.key + m.label} style={styles.row}>
                <Text style={{ fontSize: TYPE.sm }}>
                  {m.label}：{String(m.current)}
                  {m.baseline_range ? ` · 基线 ${m.baseline_range}` : ""}
                  {m.delta != null ? ` · 变化 ${m.delta > 0 ? "+" : ""}${m.delta}` : ""}
                </Text>
              </View>
            ))
          )}
          {overlay?.note ? <MutedText>{overlay.note}</MutedText> : null}
        </Card>

        <Card>
          <CardTitle>真实照片</CardTitle>
          <MutedText>
            3D 不可用或失败时，始终以真实照片与记录为基础（照片上传见健康证据与 Quick Log）。
          </MutedText>
          <GhostButton label="回到今日" onPress={() => {}} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.bgCanvas },
  flex: { flex: 1 },
  content: { padding: SPACE.s4, paddingBottom: SPACE.s8 },
  row: { marginVertical: SPACE.s1 },
});
