# MINI_PROGRAM_RELEASE — 微信小程序发布准备

## 构建

```powershell
pnpm --dir apps/mini build:weapp   # 输出 apps/mini/dist
```

微信开发者工具导入 `apps/mini/dist`（project.config.json 已含 miniprogramRoot=dist/）。

## 环境配置

- API 域名：`TARO_APP_API_URL`（构建时注入）。
- 开发/体验版用测试后端；正式版指向生产 API。

## 必须配置的微信平台项

| 项 | 说明 | 状态 |
|---|---|---|
| AppID / AppSecret | 小程序主体注册 | EXTERNAL_BLOCKED |
| 服务器域名（request/uploadFile） | 生产 API 域名备案 + 白名单 | EXTERNAL_BLOCKED |
| downloadFile 合法域名 | 媒体访问域名 | EXTERNAL_BLOCKED |
| 订阅消息模板 ID | 通知推送 | 未申请 |
| 隐私协议 | 需在 mp 后台配置并弹窗 | 模板就绪 LEGAL_REVIEW_PENDING |
| 类目/资质 | 涉及宠物健康需选对类目 | 待审核 |

## 权限声明（app.json / 后台）

- 相机：记录宠物照片/视频证据（expo/wechat 权限由 Taro `permission` 声明）。
- 相册：选择证据媒体。
- 位置：当前未使用（如有需声明）。

## 提审清单

1. [ ] 真机构建通过（Taro build:weapp 无错）。
2. [ ] 主要页面可走通：登录→宠物→今日→Quick Log→时间线→健康→用药→分享。
3. [ ] 弱网/断网/权限拒绝处理（platform 层 + State 文案）。
4. [ ] 截图清单：首页、时间线、健康、Vet Brief 分享、我的/隐私。
5. [ ] 测试账号说明（体验版成员）。
6. [ ] 隐私弹窗 + 用户协议 + AI 使用说明链接。

## 多平台

- `build:alipay`（支付宝小程序）与 `build:tt`（抖音小程序）构建均绿；实际提审需各自主体账号。
- 兼容性报告：Taro 平台抽象已隔离 wx.*；新增平台只需替换 platform/ 适配器。

## 状态

- 构建：**READY**
- 提审发布：**EXTERNAL_BLOCKED**（缺主体/AppID/备案）