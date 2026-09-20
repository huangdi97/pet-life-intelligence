/** Shared formatting helpers (mirror of apps/mini utils / apps/web hooks). */

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

export function sexLabel(sex: string): string {
  if (sex === "FEMALE") return "雌性";
  if (sex === "MALE") return "雄性";
  return "未知";
}

/** 风险分级只显示后端 triage 值（不本地推断）。 */
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

/** 设备状态如实显示（后端 PetDevice.status；设备集成为原型）。 */
export function deviceStatusLabel(status: string): string {
  if (status === "LINKED") return "已连接";
  if (status === "EXPIRED" || status === "REVOKED") return "已断开";
  return "状态未知";
}
