export function fmtTime(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("zh-CN", { hour12: false });
  } catch {
    return iso;
  }
}

export function fmtDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("zh-CN");
  } catch {
    return iso;
  }
}

export function speciesLabel(species: string): string {
  if (species === "dog") return "狗";
  if (species === "cat") return "猫";
  return species;
}

/** Common catalogue/demo breed names -> owner-facing zh-CN.
 * Unknown values are preserved exactly as entered by the owner. */
export function breedLabel(breed: string | null | undefined): string {
  const value = (breed ?? "").trim();
  if (!value) return "";
  const key = value.toLowerCase();
  if (key === "corgi" || key === "welsh corgi" || key === "pembroke welsh corgi") return "柯基";
  if (key === "dlh" || key === "domestic long hair" || key === "domestic longhair") return "长毛家猫";
  return value;
}

export function sexLabel(sex: string): string {
  if (sex === "FEMALE") return "雌性";
  if (sex === "MALE") return "雄性";
  return "未知";
}

export function riskLabel(level: string | null): string {
  const map: Record<string, string> = {
    NORMAL: "正常",
    NOTICE: "注意",
    MONITOR: "观察",
    VET_SOON: "建议就医",
    URGENT: "紧急",
    EMERGENCY: "危及生命",
  };
  return level ? (map[level] ?? level) : "未分级";
}