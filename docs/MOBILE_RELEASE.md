# MOBILE_RELEASE — App Store / Google Play 发布包

## 构建

```powershell
pnpm --dir apps/mobile install
pnpm --dir apps/mobile exec expo export --platform android   # Hermes bundle
pnpm --dir apps/mobile exec expo export --platform ios
```

正式发布用 EAS Build（`eas build --platform all`）生成签名包。

## App Store 信息（填写用）

- App 名称：宠物生活智能
- 副标题：宠物全生命周期记录与健康照护
- 描述：记录宠物生活、家庭协作、健康事件闭环、就诊摘要、用药与行为训练。
- 关键词：宠物、健康、记录、照护、兽医
- 隐私权限描述：
  - 相机：用于记录宠物照片作为健康与生活证据
  - 相册：用于从相册选择宠物照片/视频
  - 通知：用于接收用药、任务与健康提醒
- Support URL / Privacy URL：生产域名（EXTERNAL_BLOCKED）
- 测试账号：owner@pli.demo（staging）
- 审阅说明：说明登录为开发/沙箱模式；医疗安全边界（不诊断）。

## Google Play

- Data safety 表单：位置(无)/相机(是)/相册(是)/通知(是)；数据加密传输、可删除。
- 权限：CAMERA、READ_EXTERNAL_STORAGE。
- 测试账号同 App Store。

## 签名状态

- 无 Apple Developer / Google Play 账号 → **BUILD_READY_SIGNING_BLOCKED**。
- iOS 无签名证书 → **BUILD_READY_SIGNING_BLOCKED**。
- HarmonyOS → 见 HARMONYOS_PORTING_PLAN.md（PORT_READY）。

## 截图清单

1. 首页（今日 + 快速记录）
2. 时间线
3. 健康（红旗/分级）
4. 就诊摘要（Vet Brief）
5. 用药
6. 宠物档案 / 我的