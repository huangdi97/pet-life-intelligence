import { Picker, Text, View } from "@tarojs/components";
import type { Pet } from "../../../services/api";
import { speciesLabel } from "../../../utils/format";

export function TodayHeader(props: {
  pets: Pet[] | null;
  petId: string | null;
  current: Pet | undefined;
  todayDate: string | null;
  flash: string | null;
  onPickPet: (id: string) => void;
  onOpenSheet: () => void;
}) {
  const { pets, petId, current, todayDate, flash, onPickPet, onOpenSheet } = props;
  return (
    <>
      <View className="h1">{current ? `${current.name} 今天怎么样？` : "今日"}</View>
      <View className="sub">
        {current ? `${speciesLabel(current.species)}${current.breed ? ` · ${current.breed}` : ""} · ${todayDate ?? ""}` : "宠物生活智能"}
      </View>

      {pets && pets.length > 1 && (
        <Picker
          mode="selector"
          range={pets.map((p) => p.name)}
          value={pets.findIndex((p) => p.id === petId) < 0 ? 0 : pets.findIndex((p) => p.id === petId)}
          onChange={(e) => {
            const idx = Number(e.detail.value);
            const p = pets[idx];
            if (p) onPickPet(p.id);
          }}
        >
          <View className="btn">切换宠物：{current?.name}</View>
        </Picker>
      )}

      {flash && <View className="card" style={{ background: "#e8f1f2", color: "#3e7c83" }}>{flash}</View>}

      {current && (
        <View className="entry-card" onClick={onOpenSheet}>
          <View>
            <View className="entry-title">＋ 快速记录</View>
            <View className="entry-desc">喂食 · 饮水 · 排泄 · 散步 · 玩耍 · 体重 · 睡眠</View>
          </View>
          <Text className="entry-arrow">›</Text>
        </View>
      )}
    </>
  );
}
