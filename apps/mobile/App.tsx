/** App entry — Stage H: providers + navigation (tabs + modal stack).
 *  Screen implementations live in src/screens; this file stays small. */
import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PetsProvider } from "./src/context";
import { AppNavigation } from "./src/navigation";

export default function App() {
  return (
    <SafeAreaProvider>
      <PetsProvider>
        <AppNavigation />
      </PetsProvider>
    </SafeAreaProvider>
  );
}
