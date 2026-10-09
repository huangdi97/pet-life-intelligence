/**
 * demoNav — demo-environment navigation via the pli-demo://nav deep link.
 * DEMO ENV only (EXPO_PUBLIC_PLI_DEMO_ENV=1): lets the presentation run drive
 * the app deterministically. Production builds never parse these URLs.
 */
import { createNavigationContainerRef, type NavigatorScreenParams } from "@react-navigation/native";
import type { StackParamList, TabParamList } from "./navigation";

type RootParamList = {
  Tabs: NavigatorScreenParams<TabParamList>;
} & StackParamList;

export const navigationRef = createNavigationContainerRef<RootParamList>();

export type DemoScreen =
  | "today"
  | "timeline"
  | "pet"
  | "assistant"
  | "me"
  | "quicklog"
  | "notifications"
  | "search"
  | "health"
  | "lifeview"
  | "behavior"
  | "training"
  | "welfare"
  | "social"
  | "monitoring"
  | "companion"
  | "medication"
  | "care"
  | "twincapture"
  | "twinreview"
  | "twinversion";

const TAB_SCREENS: Record<string, keyof TabParamList> = {
  today: "Today",
  timeline: "Timeline",
  pet: "Pet",
  assistant: "Assistant",
  me: "Me",
};

const STACK_SCREENS: Record<string, keyof StackParamList> = {
  quicklog: "QuickLog",
  notifications: "Notifications",
  search: "Search",
  health: "Health",
  lifeview: "LifeView",
  behavior: "Behavior",
  training: "Training",
  welfare: "Welfare",
  social: "Social",
  monitoring: "Monitoring",
  companion: "Companion",
  medication: "Medication",
  care: "Care",
  twincapture: "TwinCapture",
  twinreview: "TwinReview",
  twinversion: "TwinVersion",
};

export function navigateToDemoScreen(screen: string): void {
  if (!navigationRef.isReady()) return;
  // TYPE ESCAPE (bounded, WHY): react-navigation's navigate overloads cannot
  // express a dynamic screen name union; this demo-only utility intentionally
  // narrows the ref to a loose signature. Production code never calls it.
  const nav = navigationRef as unknown as { navigate: (name: string, params?: unknown) => void };
  const tab = TAB_SCREENS[screen];
  if (tab) {
    nav.navigate("Tabs", { screen: tab });
    return;
  }
  const stack = STACK_SCREENS[screen];
  if (stack) {
    // Demo evidence navigation must land deterministically on the requested
    // stack surface. Repeated dynamic navigate() calls can be coalesced by
    // React Navigation while an existing tab route remains focused, which
    // produced a Pet screenshot for a LifeView request in CI. Reset only the
    // DEMO navigation tree so the requested owner surface is unambiguous;
    // production navigation never calls this helper.
    const deterministic = navigationRef as unknown as {
      resetRoot: (state: {
        index: number;
        routes: Array<{ name: string; params?: unknown }>;
      }) => void;
    };
    deterministic.resetRoot({
      index: 1,
      routes: [{ name: "Tabs" }, { name: stack }],
    });
  }
}
