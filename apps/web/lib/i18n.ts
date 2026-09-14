"use client";

/** 极简 i18n 基础：zh-CN 优先，键值集中管理，避免 UI 文案散落硬编码。
 *  v1.0 不引入多语言运行时，仅为未来 en-US 预留结构。 */

const zhCN = {
  brand: "宠物生活智能",
  nav: {
    today: "今日",
    timeline: "时间线",
    pet: "宠物",
    agent: "助手",
    more: "我的",
    login: "登录",
    logout: "退出",
  },
  common: {
    loading: "加载中……",
    retry: "重试",
    save: "保存",
    cancel: "取消",
    confirm: "确认",
    delete: "删除",
    edit: "编辑",
    back: "返回",
    submit: "提交",
    optional: "（可选）",
    notFound: "页面不存在",
    empty: "暂无内容",
    error: "出错了",
    offline: "离线",
    permissionDenied: "没有查看此内容的权限。如需访问，请联系宠物主人授权。",
    externalBlocked: "该服务暂未开放",
    create: "新建",
    manage: "管理",
    viewAll: "查看全部",
  },
  state: {
    noPet: "还没有宠物，先创建一只吧。",
    createPet: "创建宠物档案",
    emptyTimeline: "还没有记录。",
    emptyTasks: "没有待办任务。",
    emptyToday: "今天还没有记录。",
    emptyNotifications: "暂时没有新通知。",
  },
  pet: {
    name: "名字",
    species: "种类",
    breed: "品种",
    sex: "性别",
    birthDate: "出生日期",
    ageUnknown: "年龄未知",
    neutered: "是否绝育",
    weight: "体重",
    household: "家庭",
    save: "保存宠物",
    switch: "切换当前宠物",
    noPets: "（无）",
    profile: "宠物档案",
  },
  quicklog: {
    title: "快速记录",
    feed: "喂食",
    drink: "饮水",
    elimination: "排泄",
    walk: "散步",
    play: "玩耍",
    weight: "体重",
    medication: "用药",
    behavior: "行为",
    healthNote: "健康异常",
    note: "备注",
    saved: "已记录：{label}",
    fail: "失败：{msg}",
  },
  timeline: {
    title: "生命时间线",
    filter: "筛选",
    all: "全部",
    search: "搜索",
  },
  health: {
    title: "健康",
    reportAbnormal: "发现异常",
    triage: "风险分级",
    vetBrief: "就诊摘要",
    outcome: "结局",
    medication: "用药",
  },
  risk: {
    NORMAL: "正常",
    NOTICE: "注意",
    MONITOR: "观察",
    VET_SOON: "建议就医",
    URGENT: "紧急",
    EMERGENCY: "危及生命",
    untriaged: "未分级",
  },
  notFound: {
    title: "页面不存在",
    desc: "您访问的页面不存在或已被移除。",
    home: "回到今日",
  },
  errorBoundary: {
    title: "页面出了点问题",
    desc: "请重试；如果问题持续，请联系支持。",
    reload: "刷新重试",
  },
} as const;

export type I18nDict = typeof zhCN;

const dicts: Record<string, I18nDict> = { "zh-CN": zhCN };
export const DEFAULT_LOCALE = "zh-CN";

export function getLocale(): string {
  if (typeof navigator === "undefined") return DEFAULT_LOCALE;
  const nav = navigator.language;
  return dicts[nav] ? nav : DEFAULT_LOCALE;
}

export function t(key: string, vars?: Record<string, string>): string {
  const dict = dicts[getLocale()] ?? zhCN;
  const parts = key.split(".");
  let val: unknown = dict;
  for (const p of parts) {
    if (val && typeof val === "object" && p in val) val = (val as Record<string, unknown>)[p];
    else return key;
  }
  if (typeof val !== "string") return key;
  let out = val;
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.replace(`{${k}}`, v);
  return out;
}