/** App entry — providers + navigation.
 *
 * DEMO ENV (EXPO_PUBLIC_PLI_DEMO_ENV=1): demo builds auto-login into the
 * demo household and accept deep links:
 *   pli-demo://login?email=...  switch demo scenario account
 *   pli-demo://nav?screen=...   navigate to a screen (presentation runs)
 * Production builds never compile this path (flag off).
 */
import React, { useCallback, useEffect, useState } from "react";
import { Linking, Pressable, Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PetsProvider, usePets } from "./src/context";
import { AppNavigation } from "./src/navigation";
import { ApiConfigErrorScreen } from "./src/screens/ApiConfigErrorScreen";
import { getApiConfigIssue, type ApiConfigIssue } from "./src/apiConfig";
import { devLogin } from "./src/api";
import { DEMO_ENV } from "./src/tokens";
import { getDevUserId } from "./src/storage/session";
import { navigateToDemoScreen } from "./src/demoNav";

const DEMO_DEFAULT_EMAIL = "owner@pli.demo";

function demoEmailFromUrl(url: string | null): string | null {
  if (!url || !url.startsWith("pli-demo://")) return null;
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get("email");
  } catch {
    return null;
  }
}

function demoNavFromUrl(url: string | null): string | null {
  if (!url || !url.startsWith("pli-demo://")) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "nav") return null;
    return parsed.searchParams.get("screen");
  } catch {
    return null;
  }
}

function demoPetFromUrl(url: string | null): string | null {
  if (!url || !url.startsWith("pli-demo://")) return null;
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get("pet");
  } catch {
    return null;
  }
}

function applyDemoNav(screen: string | null): void {
  if (!screen) return;
  // navigation may not be ready right after mount; retry briefly
  for (let i = 0; i < 10; i++) {
    setTimeout(() => navigateToDemoScreen(screen), i * 500);
  }
}

/** A demo session is a prerequisite of mounting owner screens, not a
 * best-effort side effect next to them. Otherwise Today/usePetTwin can issue a
 * 401 before devLogin persists X-Dev-User-Id and never retry visual-models.
 * This gate is DEMO-ONLY. Production navigation mounts normally.
 */
function DemoSession() {
  const { reload, choose, reset } = usePets();
  const [ready, setReady] = useState(false);
  const [failure, setFailure] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    async function boot() {
      try {
        const url = await Linking.getInitialURL();
        if (!alive) return;
        const email = demoEmailFromUrl(url) ?? DEMO_DEFAULT_EMAIL;
        if (!(await getDevUserId()) || email !== DEMO_DEFAULT_EMAIL) {
          await devLogin(email);
        }
        if (!alive) return;
        // The PetsProvider's first fetch was deliberately deferred; this is
        // its authenticated starting signal, not a race against login.
        reload();
        const pet = demoPetFromUrl(url);
        if (pet) await choose(pet);
        if (!alive) return;
        setReady(true);
        applyDemoNav(demoNavFromUrl(url));
      } catch {
        if (alive) setFailure(true);
      }
    }
    void boot();
    const sub = Linking.addEventListener("url", ({ url }) => {
      void (async () => {
        try {
          const email = demoEmailFromUrl(url);
          if (email) {
            // Cross-account demo navigation must never expose prior owner
            // content while a new session is being established.
            setReady(false);
            reset();
            await devLogin(email);
            if (!alive) return;
            reload();
          }
          const pet = demoPetFromUrl(url);
          if (pet) await choose(pet);
          if (!alive) return;
          setReady(true);
          applyDemoNav(demoNavFromUrl(url));
        } catch {
          if (alive) setFailure(true);
        }
      })();
    });
    return () => {
      alive = false;
      sub.remove();
    };
  }, [attempt, choose, reload, reset]);

  if (failure && !ready) {
    return (
      <SafeAreaProvider>
        <Pressable accessibilityRole="button" accessibilityLabel="重试演示登录" onPress={() => { setFailure(false); setAttempt((n) => n + 1); }}>
          <Text>演示数据暂时没有连接成功 · 点击重试</Text>
        </Pressable>
      </SafeAreaProvider>
    );
  }
  // No owner API hook or 3D Twin request can run before the demo session.
  return ready ? <AppNavigation /> : null;
}

export default function App() {
  const [configIssue, setConfigIssue] = useState<ApiConfigIssue | null>(() => getApiConfigIssue());
  const retry = useCallback(() => setConfigIssue(getApiConfigIssue()), []);

  if (configIssue !== null) {
    // SAFETY: never enter the product flows without a validated API target.
    return (
      <SafeAreaProvider>
        <ApiConfigErrorScreen issue={configIssue} onRetry={retry} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <PetsProvider deferInitialLoad={DEMO_ENV}>
        {DEMO_ENV ? <DemoSession /> : <AppNavigation />}
      </PetsProvider>
    </SafeAreaProvider>
  );
}
