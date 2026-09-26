/**
 * Navigation — canonical Owner IA (Stage R.2 §16-17):
 * RootStack → OwnerTabs (Today / Timeline / Pet / Assistant / Me).
 * Monitoring and Companion are contextual capabilities (stack screens with
 * entries from Today/Pet), never first-level tabs.
 */
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { COLORS } from "./tokens";
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

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.brandPrimaryDeep,
        tabBarInactiveTintColor: COLORS.textTertiary,
        tabBarStyle: { backgroundColor: COLORS.surface, borderTopColor: COLORS.dividerSubtle },
        tabBarIcon: ({ color, size, focused }) => {
          const [on, off] = TAB_ICONS[route.name as keyof TabParamList];
          return <Ionicons name={(focused ? on : off) as keyof typeof Ionicons.glyphMap} color={color} size={size} />;
        },
      })}
    >
      <Tab.Screen name="Today" component={TodayScreen} options={{ tabBarLabel: "今天" }} />
      <Tab.Screen name="Timeline" component={TimelineScreen} options={{ tabBarLabel: "时间线" }} />
      <Tab.Screen name="Pet" component={PetScreen} options={{ tabBarLabel: "宠物" }} />
      <Tab.Screen name="Assistant" component={AssistantScreen} options={{ tabBarLabel: "助手" }} />
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
