# ANDROID REAL DEVICE QA — Stage R.1 (J1–J8)

> Stage: R.1 · 日期：2026-09-24
> 状态：`ANDROID_BUILD_READY` · `ANDROID_REAL_DEVICE_QA = NOT_YET_OBSERVED`
>
> 诚实声明：本报告不含任何真机 PASS。本轮完成的是**安装即用**的构建准备
> （v0.1.1 internal-LAN APK 已实建、已解包验证 env 注入/cleartext/签名），
> 真机验收等待用户手机实测后回填。

## 1. 构建准备状态（已有真实证据）

| 项 | 证据 |
|---|---|
| APK 实建 | `artifacts/release/v0.1.1/Pet-Life-Intelligence-v0.1.1-internal-lan.apk`（88,151,802 B） |
| package / version | `com.pli.mobile` · versionName `0.1.1` · versionCode `2`（aapt badging 实测） |
| API environment | `EXPO_PUBLIC_PLI_API_URL=http://192.168.0.100:8800` 已注入 bundle（含 192.168.0.100，无 localhost:8800） |
| cleartext | release AndroidManifest `usesCleartextTraffic=true`（仅 http:// 构建，插件按 URL 条件放行） |
| 签名 | `CN=Android Debug`（DEBUG_SIGNED_INSTALLABLE_APK / NOT_PLAY_STORE_SIGNED，apksigner 实测） |
| App 名称 | `宠物生活智能`（aapt application-label 实测） |

安装前置：手机与电脑同一 Wi-Fi；电脑 API 已绑 `0.0.0.0:8800`；
Windows 防火墙放行 TCP 8800（命令见 `docs/LOCAL_DEVELOPMENT.md`）。

## 2. 人工 QA checklist（预计 ≤15 分钟）

### J1 安装
- [ ] 将 APK 传到手机（USB / 网盘 / 微信传输均可），允许「安装未知来源应用」
- [ ] 安装成功，图标显示「宠物生活智能」（非 Expo 默认）
- [ ] 冷启动不闪退，进入登录/或环境配置屏

### J2 登录
- [ ] 开发模式登录 owner@pli.demo 成功
- [ ] 杀掉 App 重开，登录态保持（token 持久化）
- [ ] 退出登录 → 重新登录成功

### J3 核心流程（依序点击）
- [ ] Today（今日概览，显示当前宠 + 当前状态）
- [ ] Quick Log（快速记录：喂食/饮水任一条，返回提示「已记录」）
- [ ] Timeline（时间线出现刚才的事件，带 OWNER_REPORTED 来源）
- [ ] Pet（宠物档案页正常）
- [ ] Health（健康页正常）
- [ ] Assistant（助手页正常）
- [ ] Me（我的页正常）
- [ ] 回到 Today，无报错

### J4 双宠切换
- [ ] 顶部切换 豆豆(dog) ⇄ 咪咪(cat)
- [ ] 切换后 Today/Timeline 数据显示对应宠物（不串宠）

### J5 网络
- [ ] WiFi 开启时各页面正常
- [ ] 关闭 WiFi → 页面显示合理错误/离线态（不白屏、不无限 loading）
- [ ] 重开 WiFi → 刷新恢复

### J6 Android 返回键
- [ ] 系统返回：嵌套页面逐级返回正常
- [ ] 弹窗/Modal 关闭正常
- [ ] 底部 Tab 切换正常

### J7 键盘
- [ ] 登录/Quick Log/Assistant 输入时键盘不遮挡主按钮

### J8 安全区
- [ ] 状态栏、导航栏、刘海、底部手势区无遮挡

## 3. 回填指引

完成后把 checklist 结果贴回本文件，并更新状态：

```text
ANDROID_REAL_DEVICE_QA = PASS（全部 J1–J8 通过）→ 升级为
ANDROID_REAL_DEVICE_ACCEPTANCE_PASS
```

未测之前保持：

```text
ANDROID_BUILD_READY = TRUE
ANDROID_REAL_DEVICE_QA = NOT_YET_OBSERVED
```
