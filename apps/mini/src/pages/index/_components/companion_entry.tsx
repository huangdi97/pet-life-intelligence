import { Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";

/** 陪伴入口（R.2 §55）：用户语言，不暴露原型/硬件状态。 */
export function CompanionEntryCard() {
  return (
    <View className="entry-card" onClick={() => Taro.navigateTo({ url: "/pages/companion/index" })}>
      <View>
        <View className="entry-title">陪伴模式</View>
        <View className="entry-desc">连接支持的设备后，可以在不打扰它的前提下观察和互动</View>
      </View>
      <Text className="entry-arrow">›</Text>
    </View>
  );
}
