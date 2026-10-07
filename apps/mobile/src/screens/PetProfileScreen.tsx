/**
 * PetProfileScreen — create/edit the owner pet identity record.
 *
 * Species is selected only during creation because the canonical API keeps it
 * immutable afterwards; edits never silently move historical events to a
 * different species identity.
 */
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { api, humanizeError, type Pet } from "../api";
import { usePets } from "../context";
import { COLORS, RADIUS, SPACE, TYPE } from "../tokens";
import type { StackParamList } from "../navigation";

type Props = NativeStackScreenProps<StackParamList, "PetProfile">;

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
  readonly: { minHeight: 48, justifyContent: "center", paddingHorizontal: SPACE.s3, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceRaised },
  readonlyText: { fontSize: TYPE.body, color: COLORS.textSecondary },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.s2 },
  choice: { minHeight: 44, minWidth: 70, justifyContent: "center", alignItems: "center", paddingHorizontal: SPACE.s3, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.dividerSubtle, backgroundColor: COLORS.surface },
  choiceSelected: { backgroundColor: COLORS.brandSoftGreen, borderColor: COLORS.brandPrimary },
  choiceText: { fontSize: TYPE.sm, color: COLORS.textSecondary },
  choiceTextSelected: { color: COLORS.brandPrimaryDeep, fontWeight: "600" },
  error: { marginTop: SPACE.s3, fontSize: TYPE.sm, color: COLORS.danger },
  primary: { minHeight: 50, marginTop: SPACE.s5, justifyContent: "center", alignItems: "center", borderRadius: RADIUS.pill, backgroundColor: COLORS.brandPrimary },
  primaryText: { fontSize: TYPE.button, color: COLORS.textInverse, fontWeight: "600" },
  secondary: { minHeight: 48, marginTop: SPACE.s2, justifyContent: "center", alignItems: "center", borderRadius: RADIUS.pill },
  secondaryText: { fontSize: TYPE.button, color: COLORS.textSecondary, fontWeight: "600" },
  disabled: { opacity: 0.5 },
});
