/** Stage H navigation: bottom tabs (今日/时间线/在家/陪伴/我的) + a root
 *  native stack for QuickLog (modal presentation), Notifications, Health,
 *  LifeView, PetHub and the five ported domain screens (Behavior / Training /
 *  Welfare / Social / Assistant). Tab bar styling comes from tokens.ts — no
 *  hardcoded colors. */
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { COLORS } from "./tokens";
import { TodayScreen } from "./screens/TodayScreen";
import { TimelineScreen } from "./screens/TimelineScreen";
import { MonitoringScreen } from "./screens/MonitoringScreen";
import { CompanionScreen } from "./screens/CompanionScreen";
import { MeScreen } from "./screens/MeScreen";
import { QuickLogScreen } from "./screens/QuickLogScreen";
import { NotificationsScreen } from "./screens/NotificationsScreen";
import { HealthScreen } from "./screens/HealthScreen";
import { LifeViewScreen } from "./screens/LifeViewScreen";
import { PetHubScreen } from "./screens/PetHubScreen";
import { BehaviorScreen } from "./screens/BehaviorScreen";
import { TrainingScreen } from "./screens/TrainingScreen";
import { WelfareScreen } from "./screens/WelfareScreen";
import { SocialScreen } from "./screens/SocialScreen";
import { AssistantScreen } from "./screens/AssistantScreen";

export type TabParamList = {
  Today: undefined;
  Timeline: undefined;
  Monitoring: undefined;
  Companion: undefined;
  Me: undefined;
};

export type StackParamList = {
  Tabs: undefined;
  QuickLog: undefined;
  Notifications: undefined;
  Health: undefined;
  LifeView: undefined;
  PetHub: undefined;
  Behavior: undefined;
  Training: undefined;
  Welfare: undefined;
  Social: undefined;
  Assistant: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<StackParamList>();

const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Today: "home",
  Timeline: "list",
  Monitoring: "videocam",
  Companion: "heart",
  Me: "person",
};

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary700,
        tabBarInactiveTintColor: COLORS.inkMuted,
        tabBarStyle: { backgroundColor: COLORS.bgSurface, borderTopColor: COLORS.lineDefault },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={TAB_ICONS[route.name] ?? "ellipse"} color={color} size={size} />
        ),
      })}
    >
      <Tab.Screen name="Today" component={TodayScreen} options={{ tabBarLabel: "今日" }} />
      <Tab.Screen name="Timeline" component={TimelineScreen} options={{ tabBarLabel: "时间线" }} />
      <Tab.Screen name="Monitoring" component={MonitoringScreen} options={{ tabBarLabel: "在家" }} />
      <Tab.Screen name="Companion" component={CompanionScreen} options={{ tabBarLabel: "陪伴" }} />
      <Tab.Screen name="Me" component={MeScreen} options={{ tabBarLabel: "我的" }} />
    </Tab.Navigator>
  );
}

export function AppNavigation() {
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Tabs" component={Tabs} />
        <Stack.Screen
          name="QuickLog"
          component={QuickLogScreen}
          options={{ presentation: "modal", headerShown: false }}
        />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="Health" component={HealthScreen} />
        <Stack.Screen name="LifeView" component={LifeViewScreen} />
        <Stack.Screen name="PetHub" component={PetHubScreen} />
        <Stack.Screen name="Behavior" component={BehaviorScreen} />
        <Stack.Screen name="Training" component={TrainingScreen} />
        <Stack.Screen name="Welfare" component={WelfareScreen} />
        <Stack.Screen name="Social" component={SocialScreen} />
        <Stack.Screen name="Assistant" component={AssistantScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
