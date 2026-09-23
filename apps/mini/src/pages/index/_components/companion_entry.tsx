import { Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";

/** 陪伴入口卡（feature-flagged 原型） */
export function CompanionEntryCard() {
  return (
    <View className="entry-card" onClick={() => Taro.navigateTo({ url: "/pages/companion/index" })}>
      <View>
        <View className="entry-title">看看它 · 陪伴</View>
        <View className="entry-desc">陪伴为前端原型 · 硬件集成未激活</View>
      </View>
      <Text className="entry-arrow">›</Text>
    </View>
  );
}
