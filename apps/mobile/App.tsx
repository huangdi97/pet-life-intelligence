/** App entry — providers + navigation.
 *
 * DEMO ENV (EXPO_PUBLIC_PLI_DEMO_ENV=1): demo builds auto-login into the
 * demo household and accept deep links:
 *   pli-demo://login?email=...  switch demo scenario account
 *   pli-demo://nav?screen=...   navigate to a screen (presentation runs)
 * Production builds never compile this path (flag off).
 */
import React, { useCallback, useEffect, useState } from "react";
import { Linking } from "react-native";
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

function applyDemoNav(screen: string | null): void {
  if (!screen) return;
  // navigation may not be ready right after mount; retry briefly
  for (let i = 0; i < 10; i++) {
    setTimeout(() => navigateToDemoScreen(screen), i * 500);
  }
}

/** Demo-only bootstrap: ensure a dev session (deep link or default account). */
function DemoSession() {
  const { reload } = usePets();
  useEffect(() => {
    if (!DEMO_ENV) return;
    let alive = true;
    async function boot() {
      const url = await Linking.getInitialURL();
      if (!alive) return;
      const email = demoEmailFromUrl(url) ?? DEMO_DEFAULT_EMAIL;
      if ((await getDevUserId()) && email === DEMO_DEFAULT_EMAIL) {
        reload();
      } else {
        await devLogin(email);
        reload();
      }
      applyDemoNav(demoNavFromUrl(url));
    }
    void boot();
    const sub = Linking.addEventListener("url", ({ url }) => {
      const email = demoEmailFromUrl(url);
      if (email) {
        void devLogin(email).then(reload);
      }
      applyDemoNav(demoNavFromUrl(url));
    });
    return () => {
      alive = false;
      sub.remove();
    };
  }, [reload]);
  return null;
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
      <PetsProvider>
        {DEMO_ENV ? <DemoSession /> : null}
        <AppNavigation />
      </PetsProvider>
    </SafeAreaProvider>
  );
}
