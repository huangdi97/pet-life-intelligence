/**
 * PetProfileScreen — create/edit the owner pet identity record.
 *
 * Species is selected only during creation because the canonical API keeps it
 * immutable afterwards; edits never silently move historical events to a
 * different species identity.
 */
import React, { useEffect, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { api, humanizeError, type Pet } from "../api";
import { usePets } from "../context";
import { COLORS, RADIUS, SPACE, TYPE } from "../tokens";
import type { StackParamList } from "../navigation";
import { PetAvatar } from "../components/media/PetAvatar";

type Props = NativeStackScreenProps<StackParamList, "PetProfile">;

interface DietProfileResponse {
  pet_id: string;
  profile: {
    current_food: string;
    allergies: string[];
    feeding_rules: string;
    vet_advised: boolean;
    source_type: string;
  } | null;
}

interface IdentifierRow {
  identifier_id: string;
  identifier_type: "CHIP" | "PASSPORT" | "TATTOO";
  value: string;
  verified: boolean;
  source_type: string;
}

const IDENTIFIER_TYPES = [
  { value: "CHIP" as const, label: "芯片号" },
  { value: "PASSPORT" as const, label: "护照" },
  { value: "TATTOO" as const, label: "纹身" },
];

const LIFECYCLE = [
  { value: "ACTIVE" as const, label: "正常生活中" },
  { value: "LOST" as const, label: "走失" },
  { value: "TRANSFERRED" as const, label: "已转交" },
  { value: "DECEASED" as const, label: "已离世" },
];

interface FormState {
  name: string;
  species: "dog" | "cat" | "other";
  breed: string;
  sex: "FEMALE" | "MALE" | "UNKNOWN";
  birth_date: string;
  neutered: "" | "yes" | "no";
  weight_note: string;
}

const EMPTY: FormState = {
  name: "",
  species: "dog",
  breed: "",
  sex: "UNKNOWN",
  birth_date: "",
  neutered: "",
  weight_note: "",
};

const SPECIES = [
  { value: "dog" as const, label: "狗" },
  { value: "cat" as const, label: "猫" },
  { value: "other" as const, label: "其他" },
];
const SEX = [
  { value: "FEMALE" as const, label: "雌性" },
  { value: "MALE" as const, label: "雄性" },
  { value: "UNKNOWN" as const, label: "未知" },
];
const NEUTERED = [
  { value: "" as const, label: "未知" },
  { value: "yes" as const, label: "是" },
  { value: "no" as const, label: "否" },
];

export function PetProfileScreen({ route, navigation }: Props) {
  const { pets, petId, choose, reload } = usePets();
  const mode = route.params?.mode ?? "edit";
  const current = pets?.find((pet) => pet.id === petId) ?? pets?.[0] ?? null;
  const [form, setForm] = useState<FormState>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [identifiers, setIdentifiers] = useState<IdentifierRow[]>([]);
  const [identifierType, setIdentifierType] = useState<IdentifierRow["identifier_type"]>("CHIP");
  const [identifierValue, setIdentifierValue] = useState("");
  const [identifierBusy, setIdentifierBusy] = useState(false);
  const [lifecycleStatus, setLifecycleStatus] = useState<"ACTIVE" | "LOST" | "TRANSFERRED" | "DECEASED">("ACTIVE");
  const [lifecycleNote, setLifecycleNote] = useState("");
  const [lifecycleBusy, setLifecycleBusy] = useState(false);
  const [diet, setDiet] = useState({
    current_food: "",
    allergies: "",
    feeding_rules: "",
    vet_advised: false,
  });
  const [dietState, setDietState] = useState<"loading" | "ready" | "error">("loading");
  const [dietBusy, setDietBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);

  useEffect(() => {
    if (mode === "create" || !current) {
      setForm(EMPTY);
      return;
    }
    setForm({
      name: current.name ?? "",
      species: current.species === "cat" ? "cat" : current.species === "other" ? "other" : "dog",
      breed: current.breed ?? "",
      sex: current.sex === "FEMALE" ? "FEMALE" : current.sex === "MALE" ? "MALE" : "UNKNOWN",
      birth_date: current.birth_date ?? "",
      neutered: current.neutered == null ? "" : current.neutered ? "yes" : "no",
      weight_note: current.weight_note ?? "",
    });
  }, [mode, current?.id]);

  useEffect(() => {
    if (mode === "create" || !current?.id) {
      setIdentifiers([]);
      return;
    }
    setLifecycleStatus(
      current.lifecycle_status === "LOST" ||
      current.lifecycle_status === "TRANSFERRED" ||
      current.lifecycle_status === "DECEASED"
        ? current.lifecycle_status
        : "ACTIVE",
    );
    let alive = true;
    api.get<IdentifierRow[]>(`/pets/${current.id}/identifiers`)
      .then((rows) => {
        if (alive) setIdentifiers(rows);
      })
      .catch(() => {
        if (alive) setIdentifiers([]);
      });
    setDietState("loading");
    api.get<DietProfileResponse>(`/pets/${current.id}/diet-profile`)
      .then((row) => {
        if (!alive) return;
        setDiet({
          current_food: row.profile?.current_food ?? "",
          allergies: row.profile?.allergies?.join("、") ?? "",
          feeding_rules: row.profile?.feeding_rules ?? "",
          vet_advised: row.profile?.vet_advised === true,
        });
        setDietState("ready");
      })
      .catch(() => {
        if (alive) setDietState("error");
      });
    return () => {
      alive = false;
    };
  }, [mode, current?.id, current?.lifecycle_status]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((old) => ({ ...old, [key]: value }));
  }

  async function submit() {
    if (busy) return;
    if (!form.name.trim()) {
      setError("请先填写宠物名字。");
      return;
    }
    if (mode === "edit" && !current?.id) {
      setError("还没有可编辑的宠物。");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const common = {
        name: form.name.trim(),
        breed: form.breed.trim(),
        sex: form.sex,
        birth_date: form.birth_date.trim() || null,
        neutered: form.neutered === "" ? null : form.neutered === "yes",
        weight_note: form.weight_note.trim(),
      };
      if (mode === "create") {
        const created = await api.post<Pet>("/pets", {
          ...common,
          species: form.species,
          timezone: "Asia/Shanghai",
        });
        await choose(created.id);
      } else {
        await api.patch<Pet>(`/pets/${current!.id}`, common);
      }
      reload();
      navigation.goBack();
    } catch (e: unknown) {
      setError(humanizeError(e));
    } finally {
      setBusy(false);
    }
  }

  async function chooseAvatar() {
    if (!current?.id || avatarBusy) return;
    setAvatarBusy(true);
    setError(null);
    try {
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.82,
      });
      if (picked.canceled || !picked.assets?.[0]) return;
      const asset = picked.assets[0];
      const uploaded = await api.upload<{ artifact_id: string }>(
        `/pets/${current.id}/artifacts`,
        {
          uri: asset.uri,
          name: asset.fileName || `avatar-${Date.now()}.jpg`,
          type: asset.mimeType || "image/jpeg",
        },
      );
      await api.put(`/pets/${current.id}/avatar`, { artifact_id: uploaded.artifact_id });
      await reload();
    } catch (e: unknown) {
      setError(humanizeError(e));
    } finally {
      setAvatarBusy(false);
    }
  }

  async function addIdentifier() {
    if (!current?.id || !identifierValue.trim() || identifierBusy) return;
    setIdentifierBusy(true);
    setError(null);
    try {
      await api.post(`/pets/${current.id}/identifiers`, {
        identifier_type: identifierType,
        value: identifierValue.trim(),
        source_type: "OWNER_REPORTED",
        verify: false,
      });
      setIdentifiers(await api.get<IdentifierRow[]>(`/pets/${current.id}/identifiers`));
      setIdentifierValue("");
    } catch (e: unknown) {
      setError(humanizeError(e));
    } finally {
      setIdentifierBusy(false);
    }
  }

  async function saveDietProfile() {
    if (!current?.id || dietBusy) return;
    setDietBusy(true);
    setError(null);
    try {
      await api.put(`/pets/${current.id}/diet-profile`, {
        current_food: diet.current_food.trim(),
        allergies: diet.allergies.split(/[、,，]/).map((item) => item.trim()).filter(Boolean),
        feeding_rules: diet.feeding_rules.trim(),
        vet_advised: diet.vet_advised,
        source_type: "OWNER_REPORTED",
      });
      setDietState("ready");
    } catch (e: unknown) {
      setError(humanizeError(e));
      setDietState("error");
    } finally {
      setDietBusy(false);
    }
  }

  async function saveLifecycle() {
    if (!current?.id || lifecycleBusy || lifecycleStatus === current.lifecycle_status) return;
    setLifecycleBusy(true);
    setError(null);
    try {
      await api.post(`/pets/${current.id}/status`, {
        status: lifecycleStatus,
        note: lifecycleNote.trim(),
      });
      setLifecycleNote("");
      reload();
    } catch (e: unknown) {
      setError(humanizeError(e));
      setLifecycleStatus(
        current.lifecycle_status === "LOST" ||
        current.lifecycle_status === "TRANSFERRED" ||
        current.lifecycle_status === "DECEASED"
          ? current.lifecycle_status
          : "ACTIVE",
      );
    } finally {
      setLifecycleBusy(false);
    }
  }

  const speciesLabel = SPECIES.find((item) => item.value === form.species)?.label ?? "其他";

  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{mode === "create" ? "创建宠物档案" : "编辑宠物档案"}</Text>
        <Text style={styles.sub}>
          {mode === "create"
            ? "先建立它的基本身份，以后的生活、健康与照护记录都会围绕同一只宠物累积。"
            : "只修改已确认的身份资料；原有记录仍属于同一只宠物。"}
        </Text>

        <Field label="名字 *">
          <TextInput
            testID="pli.pet.profile.name"
            style={styles.input}
            value={form.name}
            onChangeText={(value) => set("name", value)}
            placeholder="宠物名字"
            placeholderTextColor={COLORS.textTertiary}
          />
        </Field>

        <Field label="物种">
          {mode === "create" ? (
            <ChoiceRow
              options={SPECIES}
              value={form.species}
              onChange={(value) => set("species", value)}
            />
          ) : (
            <View style={styles.readonly}><Text style={styles.readonlyText}>{speciesLabel} · 创建后不在这里修改</Text></View>
          )}
        </Field>

        <Field label="品种">
          <TextInput style={styles.input} value={form.breed} onChangeText={(value) => set("breed", value)} placeholder="如 柯基" placeholderTextColor={COLORS.textTertiary} />
        </Field>

        <Field label="性别">
          <ChoiceRow options={SEX} value={form.sex} onChange={(value) => set("sex", value)} />
        </Field>

        <Field label="生日">
          <TextInput
            style={styles.input}
            value={form.birth_date}
            onChangeText={(value) => set("birth_date", value)}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={COLORS.textTertiary}
            autoCapitalize="none"
          />
        </Field>

        <Field label="已绝育">
          <ChoiceRow options={NEUTERED} value={form.neutered} onChange={(value) => set("neutered", value)} />
        </Field>

        <Field label="体重备注">
          <TextInput style={styles.input} value={form.weight_note} onChangeText={(value) => set("weight_note", value)} placeholder="如 12kg" placeholderTextColor={COLORS.textTertiary} />
        </Field>

        {mode === "edit" && current ? (
          <>
            <View style={styles.section} testID="pli.pet.profile.avatar">
              <Text style={styles.sectionTitle}>头像与视觉档案</Text>
              <Text style={styles.sectionHint}>头像来自你明确选择并上传的图片；它与 3D 形象分开保存，不会被系统自动替换。</Text>
              <View style={styles.avatarRow}>
                <PetAvatar pet={current} size={88} />
                <View style={styles.avatarAction}>
                  <Text style={styles.sectionHint}>
                    {current.avatar_artifact_id ? "当前头像已保存在这只宠物的受保护媒体中。" : "还没有设置真实头像。"}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="选择宠物头像"
                    accessibilityState={{ disabled: avatarBusy }}
                    disabled={avatarBusy}
                    onPress={() => void chooseAvatar()}
                    style={[styles.secondaryOutlined, avatarBusy && styles.disabled]}
                  >
                    <Text style={styles.secondaryOutlinedText}>{avatarBusy ? "上传中…" : current.avatar_artifact_id ? "更换头像" : "选择头像"}</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>身份标识</Text>
              <Text style={styles.sectionHint}>主人录入不会自动变成“已验证”；验证状态只展示真实来源。</Text>
              {identifiers.length ? identifiers.map((row) => (
                <View style={styles.identityRow} key={row.identifier_id}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.identityTitle}>{IDENTIFIER_TYPES.find((item) => item.value === row.identifier_type)?.label ?? "身份标识"}</Text>
                    <Text style={styles.identityValue}>{row.value}</Text>
                  </View>
                  <Text style={styles.identityStatus}>{row.verified ? "已验证" : "未验证"}</Text>
                </View>
              )) : <Text style={styles.sectionHint}>还没有记录身份标识。</Text>}
              <ChoiceRow options={IDENTIFIER_TYPES} value={identifierType} onChange={setIdentifierType} />
              <TextInput
                style={styles.input}
                value={identifierValue}
                onChangeText={setIdentifierValue}
                placeholder="按原件或芯片读取结果填写"
                placeholderTextColor={COLORS.textTertiary}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: identifierBusy || !identifierValue.trim() }}
                disabled={identifierBusy || !identifierValue.trim()}
                onPress={() => void addIdentifier()}
                style={[styles.secondaryOutlined, (identifierBusy || !identifierValue.trim()) && styles.disabled]}
              >
                <Text style={styles.secondaryOutlinedText}>{identifierBusy ? "记录中…" : "记录标识"}</Text>
              </Pressable>
            </View>

            <View style={styles.section} testID="pli.pet.profile.diet">
              <Text style={styles.sectionTitle}>饮食档案</Text>
              <Text style={styles.sectionHint}>记录实际主食、已知过敏和家庭喂养规则；不会把主人填写的内容显示成专业确认。</Text>
              {dietState === "loading" ? <Text style={styles.sectionHint}>正在读取饮食档案……</Text> : null}
              {dietState === "error" ? <Text style={styles.sectionHint}>饮食档案暂时没有加载成功；不会用默认饮食替代真实记录。</Text> : null}
              <TextInput
                style={styles.input}
                value={diet.current_food}
                onChangeText={(value) => setDiet({ ...diet, current_food: value })}
                placeholder="当前主食，例如：鸡肉配方犬粮"
                placeholderTextColor={COLORS.textTertiary}
              />
              <TextInput
                style={styles.input}
                value={diet.allergies}
                onChangeText={(value) => setDiet({ ...diet, allergies: value })}
                placeholder="已知过敏/不耐受；多项用逗号分隔"
                placeholderTextColor={COLORS.textTertiary}
              />
              <TextInput
                style={[styles.input, styles.multilineInput]}
                value={diet.feeding_rules}
                onChangeText={(value) => setDiet({ ...diet, feeding_rules: value })}
                multiline
                placeholder="喂养规则；只记录当前真实执行方式"
                placeholderTextColor={COLORS.textTertiary}
              />
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: diet.vet_advised }}
                onPress={() => setDiet({ ...diet, vet_advised: !diet.vet_advised })}
                style={[styles.choice, diet.vet_advised && styles.choiceSelected, { alignSelf: "flex-start" }]}
              >
                <Text style={[styles.choiceText, diet.vet_advised && styles.choiceTextSelected]}>主人记录：按兽医建议执行</Text>
              </Pressable>
              <Text style={styles.sectionHint}>此标记是主人记录，不等于平台已经获得兽医专业确认。</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="保存饮食档案"
                accessibilityState={{ disabled: dietBusy || dietState === "loading" }}
                disabled={dietBusy || dietState === "loading"}
                onPress={() => void saveDietProfile()}
                style={[styles.secondaryOutlined, (dietBusy || dietState === "loading") && styles.disabled]}
              >
                <Text style={styles.secondaryOutlinedText}>{dietBusy ? "保存中…" : "保存饮食档案"}</Text>
              </Pressable>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>生命状态</Text>
              <Text style={styles.sectionHint}>状态变化会进入时间线并保留审计。“已离世”是终态，请只在确认事实后记录。</Text>
              <ChoiceRow
                options={LIFECYCLE}
                value={lifecycleStatus}
                onChange={setLifecycleStatus}
              />
              <TextInput
                style={styles.input}
                value={lifecycleNote}
                onChangeText={setLifecycleNote}
                editable={current.lifecycle_status !== "DECEASED"}
                placeholder="备注（可选，只写确认过的事实）"
                placeholderTextColor={COLORS.textTertiary}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: lifecycleBusy || lifecycleStatus === current.lifecycle_status || current.lifecycle_status === "DECEASED" }}
                disabled={lifecycleBusy || lifecycleStatus === current.lifecycle_status || current.lifecycle_status === "DECEASED"}
                onPress={() => void saveLifecycle()}
                style={[styles.secondaryOutlined, (lifecycleBusy || lifecycleStatus === current.lifecycle_status || current.lifecycle_status === "DECEASED") && styles.disabled]}
              >
                <Text style={styles.secondaryOutlinedText}>{current.lifecycle_status === "DECEASED" ? "已记录为离世" : lifecycleBusy ? "保存中…" : "保存生命状态"}</Text>
              </Pressable>
            </View>
          </>
        ) : null}

        {error ? <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text> : null}

        <Pressable
          testID="pli.pet.profile.submit"
          accessibilityRole="button"
          accessibilityLabel={mode === "create" ? "创建宠物档案" : "保存宠物档案"}
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={() => void submit()}
          style={[styles.primary, busy && styles.disabled]}
        >
          <Text style={styles.primaryText}>{busy ? "保存中…" : mode === "create" ? "创建档案" : "保存档案"}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} disabled={busy} style={styles.secondary}>
          <Text style={styles.secondaryText}>取消</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function ChoiceRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.choices}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value || "unknown"}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[styles.choice, selected && styles.choiceSelected]}
          >
            <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.canvas },
  content: { paddingHorizontal: SPACE.s4, paddingTop: SPACE.s4, paddingBottom: SPACE.s8 },
  title: { fontSize: TYPE.pageTitle, fontWeight: "700", color: COLORS.textPrimary },
  sub: { marginTop: SPACE.s1, marginBottom: SPACE.s3, fontSize: TYPE.sm, color: COLORS.textTertiary, lineHeight: 20 },
  field: { marginTop: SPACE.s3, gap: SPACE.s1 },
  label: { fontSize: TYPE.sm, color: COLORS.textSecondary, fontWeight: "600" },
  input: { minHeight: 48, borderWidth: 1, borderColor: COLORS.dividerStrong, borderRadius: RADIUS.md, backgroundColor: COLORS.surface, paddingHorizontal: SPACE.s3, fontSize: TYPE.body, color: COLORS.textPrimary },
  multilineInput: { minHeight: 88, paddingTop: SPACE.s3, textAlignVertical: "top" },
  readonly: { minHeight: 48, justifyContent: "center", paddingHorizontal: SPACE.s3, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceRaised },
  readonlyText: { fontSize: TYPE.body, color: COLORS.textSecondary },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.s2 },
  choice: { minHeight: 44, minWidth: 70, justifyContent: "center", alignItems: "center", paddingHorizontal: SPACE.s3, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.dividerSubtle, backgroundColor: COLORS.surface },
  choiceSelected: { backgroundColor: COLORS.brandSoftGreen, borderColor: COLORS.brandPrimary },
  choiceText: { fontSize: TYPE.sm, color: COLORS.textSecondary },
  choiceTextSelected: { color: COLORS.brandPrimaryDeep, fontWeight: "600" },
  section: { marginTop: SPACE.s5, gap: SPACE.s2, paddingTop: SPACE.s4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.dividerSubtle },
  sectionTitle: { fontSize: TYPE.section, fontWeight: "700", color: COLORS.textPrimary },
  sectionHint: { fontSize: TYPE.sm, lineHeight: 20, color: COLORS.textTertiary },
  avatarRow: { flexDirection: "row", alignItems: "center", gap: SPACE.s3 },
  avatarAction: { flex: 1, gap: SPACE.s2 },
  identityRow: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: SPACE.s2, paddingHorizontal: SPACE.s3, paddingVertical: SPACE.s2, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceRaised },
  identityTitle: { fontSize: TYPE.sm, fontWeight: "600", color: COLORS.textPrimary },
  identityValue: { marginTop: 2, fontSize: TYPE.sm, color: COLORS.textSecondary },
  identityStatus: { fontSize: TYPE.caption, color: COLORS.textTertiary },
  secondaryOutlined: { minHeight: 46, justifyContent: "center", alignItems: "center", borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.dividerStrong, backgroundColor: COLORS.surface },
  secondaryOutlinedText: { fontSize: TYPE.button, color: COLORS.textSecondary, fontWeight: "600" },
  error: { marginTop: SPACE.s3, fontSize: TYPE.sm, color: COLORS.danger },
  primary: { minHeight: 50, marginTop: SPACE.s5, justifyContent: "center", alignItems: "center", borderRadius: RADIUS.pill, backgroundColor: COLORS.brandPrimary },
  primaryText: { fontSize: TYPE.button, color: COLORS.textInverse, fontWeight: "600" },
  secondary: { minHeight: 48, marginTop: SPACE.s2, justifyContent: "center", alignItems: "center", borderRadius: RADIUS.pill },
  secondaryText: { fontSize: TYPE.button, color: COLORS.textSecondary, fontWeight: "600" },
  disabled: { opacity: 0.5 },
});
