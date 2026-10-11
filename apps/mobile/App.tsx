/** App entry — providers + navigation.
 *
 * DEMO ENV (EXPO_PUBLIC_PLI_DEMO_ENV=1): demo builds auto-login into the
 * demo household and accept deep links:
 *   pli-demo://login?email=...  switch demo scenario account
 *   pli-demo://nav?screen=...   navigate to a screen (presentation runs)
 * Production builds never compile this path (flag off).
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Linking, Pressable, Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PetsProvider, usePets } from "./src/context";
import { AppNavigation } from "./src/navigation";
import { ApiConfigErrorScreen } from "./src/screens/ApiConfigErrorScreen";
import { getApiConfigIssue, type ApiConfigIssue } from "./src/apiConfig";
import { devLogin } from "./src/api";
import { DEMO_ENV } from "./src/tokens";
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

let demoNavGeneration = 0;

function applyDemoNav(screen: string | null): void {
  if (!screen) return;
  // Navigation can be unready immediately after mount, so retry briefly.
  // IMPORTANT: every new deep link invalidates all retries scheduled by the
  // previous link. Without this generation guard, a late Timeline retry can
  // switch the app back after a subsequent Pet deep link and produce a
  // screenshot/3D-manifest pair from two different tabs.
  const generation = ++demoNavGeneration;
  for (let i = 0; i < 10; i++) {
    setTimeout(() => {
      if (generation !== demoNavGeneration) return;
      navigateToDemoScreen(screen);
    }, i * 500);
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
  const authenticated = useRef(false);

  useEffect(() => {
    let alive = true;
    async function boot() {
      try {
        const url = await Linking.getInitialURL();
        if (!alive) return;
        const email = demoEmailFromUrl(url) ?? DEMO_DEFAULT_EMAIL;
        // Always exchange the dev email for the current backend user id.
        // Stale SecureStore ids from an earlier demo backend are not valid.
        await devLogin(email);
        if (!alive) return;
        authenticated.current = true;
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
            authenticated.current = false;
            // Cross-account demo navigation must never expose prior owner
            // content while a new session is being established.
            setReady(false);
            reset();
            await devLogin(email);
            if (!alive) return;
            authenticated.current = true;
            reload();
          } else if (!authenticated.current) {
            // An early navigation link must not unblock owner screens while
            // the initial authenticated bootstrap is still in flight.
            return;
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
