# 移动端发布检查清单（App Store / Google Play）

> 状态：BUILD_READY_SIGNING_BLOCKED（无开发者账号/证书）。

## 构建

- [ ] `pnpm --dir apps/mobile exec expo export --platform android` 绿。
- [ ] `pnpm --dir apps/mobile exec expo export --platform ios` 绿。
- [ ] `pnpm --dir apps/mobile exec expo-doctor` 全过。
- [ ] EAS Build 签名包（正式发布用）。

## 商店信息

- App 名称：宠物生活智能
- 副标题：宠物全生命周期记录与健康照护
- 关键词：宠物,健康,记录,照护,兽医
- 隐私描述（相机/相册/通知）见 MOBILE_RELEASE.md。
- Support / Privacy URL（生产域名）。
- 测试账号：owner@pli.demo（staging）。

## 权限

- iOS：NSCameraUsageDescription / NSPhotoLibraryUsageDescription / NSUserNotificationsUsageDescription（app.json infoPlist 已配）。
- Android：CAMERA / READ_EXTERNAL_STORAGE / WRITE_EXTERNAL_STORAGE（app.json android.permissions 已配）。

## 审阅说明要点

- 医疗边界：AI 不诊断，红旗下独立规则引擎。
- 登录为 dev/沙箱说明（生产账号系统 EXTERNAL_BLOCKED）。
- 数据可导出/删除。

## 物料

- 截图 6 张（首页/时间线/健康/Vet Brief/用药/我的）。
- App icon（apps/web/public/icons/icon-512.png 可用，需按商店尺寸）。
- 隐私政策链接。

## 签名

- iOS：Apple Developer 账号 + 证书 + provisioning（EXTERNAL_BLOCKED）。
- Android：Play Console + keystore 签名（EXTERNAL_BLOCKED）。