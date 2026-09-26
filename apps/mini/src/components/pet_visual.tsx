/**
 * pet_visual.tsx — shared Pet identity presentation for the mini (Stage R.2).
 * Priority: real/demo photo (uri) > graceful species visual > never a letter
 * circle. The mini data layer has no artifact URL resolver yet, so the
 * species visual is the honest graceful fallback (ACCEPTED_LIMITATION).
 */
import { Image, Text, View } from "@tarojs/components";
import type { Pet } from "../services/api";

export interface SpeciesVisual {
  glyph: string;
  toneClass: string;
}

/** 物种 → 温柔的物种符号（犬 / 猫 / 爪），非字母头像、非 emoji。 */
export function speciesVisualFor(species: string): SpeciesVisual {
  if (species === "cat") return { glyph: "猫", toneClass: "tile-cat" };
  if (species === "dog") return { glyph: "犬", toneClass: "tile-dog" };
  return { glyph: "爪", toneClass: "tile-paw" };
}

/** 物种符号 tile：warm two-tone surface，作为照片缺失时的优雅降级。 */
export function PetSpeciesTile(props: {
  species: string;
  size: number;
  round?: number;
  className?: string;
}) {
  const { species, size, round = 999, className = "" } = props;
  const v = speciesVisualFor(species);
  return (
    <View
      className={`species-tile ${v.toneClass} ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: round,
        fontSize: Math.round(size * 0.46),
      }}
    >
      <Text>{v.glyph}</Text>
    </View>
  );
}

/** PetHero — Today / Pet 的第一视觉焦点：全宽暖色 hero + 物种视觉 + 确定性文案。 */
export function PetHero(props: {
  pet: Pet | null;
  headline?: string;
  identity?: string;
  timeContext?: string;
  demo?: boolean;
  mediaUri?: string | null;
  onPress?: () => void;
}) {
  const { pet, headline = "今天怎么样？", identity, timeContext, demo = false, mediaUri = null, onPress } = props;
  const idLine =
    identity ?? (pet ? `${pet.breed || "宠物"} · ${pet.name}` : "宠物生活智能");
  const glyphSize = 300;
  return (
    <View className="pet-hero" onClick={onPress}>
      {mediaUri ? (
        <Image
          src={mediaUri}
          mode="aspectFill"
          style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }}
        />
      ) : (
        <View className="pet-hero-glyph">
          <PetSpeciesTile species={pet?.species ?? "dog"} size={glyphSize} round={72} />
        </View>
      )}
      <View className="pet-hero-scrim" />
      {demo ? <View className="pet-hero-demo">示例数据</View> : null}
      <View className="pet-hero-info">
        <View className="pet-hero-name">{pet?.name ?? "宠物"}</View>
        <View className="pet-hero-headline">{headline}</View>
        <View className="pet-hero-meta">
          <Text className="pet-hero-identity">{idLine}</Text>
          {timeContext ? <View className="pet-hero-timechip">{timeContext}</View> : null}
        </View>
      </View>
    </View>
  );
}

/** PetContextHeader — “为豆豆记录”式宠物上下文条（写入口 / 二级页）。 */
export function PetContextHeader(props: { pet: Pet | null; title: string; sub?: string }) {
  const { pet, title, sub } = props;
  return (
    <View className="pet-context">
      {pet ? (
        <View className="pet-context-avatar">
          <PetSpeciesTile species={pet.species} size={96} round={999} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <View className="pet-context-title">{title}</View>
        {sub ? <View className="pet-context-sub">{sub}</View> : null}
      </View>
    </View>
  );
}
