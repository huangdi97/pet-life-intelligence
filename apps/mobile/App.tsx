/** App entry — Stage H: providers + navigation (tabs + modal stack).
 *  Stage R.1: a build without an injected API URL renders the config-error
 *  screen instead of the app, so a misconfigured package can never burn the
 *  user in an endless loading state. */
import React, { useCallback, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PetsProvider } from "./src/context";
import { AppNavigation } from "./src/navigation";
import { ApiConfigErrorScreen } from "./src/screens/ApiConfigErrorScreen";
import { getApiConfigIssue, type ApiConfigIssue } from "./src/apiConfig";

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
        <AppNavigation />
      </PetsProvider>
    </SafeAreaProvider>
  );
}
