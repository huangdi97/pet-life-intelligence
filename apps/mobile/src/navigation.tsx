/**
 * Navigation — canonical Owner IA (Stage R.2 §16-17):
 * RootStack → OwnerTabs (Today / Timeline / Pet / Assistant / Me).
 * Monitoring and Companion are contextual capabilities (stack screens with
 * entries from Today/Pet), never first-level tabs.
 */
import React from "react";
import { View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { navigationRef } from "./demoNav";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { COLORS } from "./tokens";
import { usePets } from "./context";
import { PetAvatar } from "./components/media/PetAvatar";
import { resolvePetMediaUri } from "./components/media/demoPetVisual";
import { TodayScreen } from "./screens/TodayScreen";
import { TimelineScreen } from "./screens/TimelineScreen";
import { PetScreen } from "./screens/PetScreen";
import { AssistantScreen } from "./screens/AssistantScreen";
import { MeScreen } from "./screens/MeScreen";
import { QuickLogScreen } from "./screens/QuickLogScreen";
import { NotificationsScreen } from "./screens/NotificationsScreen";
import { HealthScreen } from "./screens/HealthScreen";
import { LifeViewScreen } from "./screens/LifeViewScreen";
import { BehaviorScreen } from "./screens/BehaviorScreen";
import { TrainingScreen } from "./screens/TrainingScreen";
import { WelfareScreen } from "./screens/WelfareScreen";
import { SocialScreen } from "./screens/SocialScreen";
import { MonitoringScreen } from "./screens/MonitoringScreen";
import { CompanionScreen } from "./screens/CompanionScreen";
import { PetTwinCaptureScreen } from "./screens/PetTwinCaptureScreen";
import { PetTwinReviewScreen } from "./screens/PetTwinReviewScreen";
import { PetTwinVersionScreen } from "./screens/PetTwinVersionScreen";
import { MedicationScreen } from "./screens/MedicationScreen";
import { CareScreen } from "./screens/CareScreen";

export type TabParamList = {
  Today: undefined;
  Timeline: undefined;
  Pet: undefined;
  Assistant: undefined;
  Me: undefined;
};

export type StackParamList = {
  Tabs: undefined;
  QuickLog: undefined;
  Notifications: undefined;
  Health: undefined;
  LifeView: undefined;
  Behavior: undefined;
  Training: undefined;
  Welfare: undefined;
  Social: undefined;
  Monitoring: undefined;
  Companion: undefined;
  Medication: undefined;
  Care: undefined;
  TwinCapture: undefined;
  TwinReview: { version: number } | undefined;
  TwinVersion: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<StackParamList>();

const TAB_ICONS: Record<keyof TabParamList, [string, string]> = {
  Today: ["home", "home-outline"],
  Timeline: ["time", "time-outline"],
  Pet: ["paw", "paw-outline"],
  Assistant: ["chatbubble-ellipses", "chatbubble-ellipses-outline"],
  Me: ["person", "person-outline"],
};

const TAB_TEST_IDS: Record<keyof TabParamList, string> = {
  Today: "pli.nav.today",
  Timeline: "pli.nav.timeline",
  Pet: "pli.nav.pet",
  Assistant: "pli.nav.assistant",
  Me: "pli.nav.me",
};

function Tabs() {
  const { pets, petId } = usePets();
  const current = pets?.find((p) => p.id === petId) ?? pets?.[0] ?? null;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.brandPrimaryDeep,
        tabBarInactiveTintColor: COLORS.textTertiary,
        tabBarStyle: {
          height: 68,
          paddingTop: 7,
          paddingBottom: 8,
          backgroundColor: COLORS.surfaceOverlay,
          borderTopWidth: 0,
          shadowColor: COLORS.textPrimary,
          shadowOpacity: 0.07,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: -3 },
          elevation: 10,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "500" },
        tabBarItemStyle: { borderRadius: 16, marginHorizontal: 2 },
        tabBarTestID: TAB_TEST_IDS[route.name as keyof TabParamList],
        tabBarIcon: ({ color, size, focused }) => {
          // Pet tab shows the current pet's avatar (rounded); fallback paw icon.
          if (route.name === "Pet" && current) {
            return (
              <View
                style={{
                  width: size + 4,
                  height: size + 4,
                  borderRadius: (size + 4) / 2,
                  overflow: "hidden",
                  borderWidth: focused ? 2 : 0,
                  borderColor: COLORS.brandPrimary,
                }}
              >
                <PetAvatar pet={current} uri={resolvePetMediaUri(current)} size={size + 4} />
              </View>
            );
          }
          const [on, off] = TAB_ICONS[route.name as keyof TabParamList];
          return <Ionicons name={(focused ? on : off) as keyof typeof Ionicons.glyphMap} color={color} size={size} />;
        },
      })}
    >
      <Tab.Screen name="Today" component={TodayScreen} options={{ tabBarLabel: "今天" }} />
      <Tab.Screen name="Timeline" component={TimelineScreen} options={{ tabBarLabel: "时间线" }} />
      <Tab.Screen name="Pet" component={PetScreen} options={{ tabBarLabel: current?.name ?? "宠物" }} />
      <Tab.Screen name="Assistant" component={AssistantScreen} options={{ tabBarLabel: "助手" }} />
      <Tab.Screen name="Me" component={MeScreen} options={{ tabBarLabel: "我的" }} />
    </Tab.Navigator>
  );
}

export function AppNavigation() {
  return (
    <NavigationContainer ref={navigationRef}>
      <StatusBar style="dark" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Tabs" component={Tabs} />
        <Stack.Screen name="QuickLog" component={QuickLogScreen} options={{ presentation: "modal", headerShown: false }} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="Health" component={HealthScreen} />
        <Stack.Screen name="LifeView" component={LifeViewScreen} />
        <Stack.Screen name="Behavior" component={BehaviorScreen} />
        <Stack.Screen name="Training" component={TrainingScreen} />
        <Stack.Screen name="Welfare" component={WelfareScreen} />
        <Stack.Screen name="Social" component={SocialScreen} />
        <Stack.Screen name="Monitoring" component={MonitoringScreen} />
        <Stack.Screen name="Companion" component={CompanionScreen} />
        <Stack.Screen name="Medication" component={MedicationScreen} />
        <Stack.Screen name="Care" component={CareScreen} />
        <Stack.Screen name="TwinCapture" component={PetTwinCaptureScreen} />
        <Stack.Screen name="TwinReview" component={PetTwinReviewScreen} />
        <Stack.Screen name="TwinVersion" component={PetTwinVersionScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
