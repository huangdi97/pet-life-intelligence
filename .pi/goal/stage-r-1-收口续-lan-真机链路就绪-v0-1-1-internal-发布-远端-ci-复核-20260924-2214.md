# GOAL — Stage R.1 Continuation（LAN 真机链路就绪 + v0.1.1 Internal 发布）

## Goal

把已处于 `STAGE_R1_COMPLETE` 状态的 PLI 仓库（`E:\AI\Pet Life Intelligence`，branch `main`）做最后一轮真实收口，使产品进入「手机可装、LAN 可用、发布可见」的确定性状态，并完成经用户确认的发布动作：

1. **LAN 真机链路完全备好**：电脑 API 已在 `0.0.0.0:8800` 监听、本机 WLAN IP `192.168.0.100` 与已烘进 v0.1.1 internal-LAN APK 的 API 地址一致、LAN 自检可达、防火墙/checklist 文档齐备；真机测试由用户稍后自行执行，本轮不代替用户测试。
2. **推送收尾**：把本地领先 `origin/main` 的 1 个提交（`5206736`，`.tl-time` 掩码文档记录）推送到 GitHub，并记录远端 CI（`gh run`）结果。
3. **v0.1.1 GitHub Release**：本地+远端 Gate 全绿后在推送后的 HEAD 打 `v0.1.1` tag 并创建 GitHub Release，标注 **Internal / Pre-Pilot**，附 APK、SHA256、截图与 Release Notes；不等真机。
4. **报告诚实收口**：更新 `reports/STAGE_R1_FINAL_REPORT.md` 反映本轮推送/CI/发布结果；`ANDROID_REAL_DEVICE_QA` 保持 `NOT_YET_OBSERVED`，公网部署保持 `EXTERNAL_BLOCKED`，`REAL_PARTICIPANTS=0`、`REAL_PETS=0`、`PRODUCT_VALIDATION=NOT_YET_OBSERVED`。
5. **逐屏视觉收口**（Today/Timeline/Pet/3D Life View/Assistant）不属本轮：等用户真机看完后提供截图，再开下一轮。

## Acceptance criteria（全部客观可查）

- [ ] **A1 推送**：`git push origin main` 成功且无 force；`git rev-parse HEAD` 与 `git rev-parse origin/main` 相等（= `5206736`）。
- [ ] **A2 远端 CI**：推送后存在针对该 HEAD 的 GitHub Actions 运行；`gh run view` 结果被真实记录（成功则记录成功；任何失败按根因修复且不降低 Gate，不允许删测试/弱化断言/加 ignore）。
- [ ] **A3 v0.1.1 Release**：`gh release view v0.1.1` 可查；tag `v0.1.1` 指向推送后的 HEAD；Release Notes 明确标注 **Internal / Pre-Pilot**；assets 包含 `Pet-Life-Intelligence-v0.1.1-internal-lan.apk` 与 SHA256 文件（如有 web standalone tgz 一并附加）。
- [ ] **A4 v0.1.0 不可变**：记录变更前后 `git rev-parse v0.1.0^{}` 的 peeled commit，两者必须一致（未 move/delete/force）。
- [ ] **A5 LAN 链路就绪证据**：`Get-NetTCPConnection -LocalPort 8800 -State Listen` 显示 `0.0.0.0:8800` 监听；`Invoke-WebRequest http://192.168.0.100:8800/api/v1/health` 返回 HTTP 200；Windows 防火墙入站 TCP 8800 放行的可执行命令已写入文档（不执行越权系统修改，仅文档化）。
- [ ] **A6 极短真机 checklist**：`reports/ANDROID_REAL_DEVICE_QA.md` 含 ≤15 分钟的 J1–J8 人工 checklist（安装→登录→核心流程→双宠切换→网络→返回→键盘→安全区）；报告状态为 `ANDROID_BUILD_READY` + `ANDROID_REAL_DEVICE_QA = NOT_YET_OBSERVED`，不含任何真机 PASS 声明。
- [ ] **A7 产物无 localhost 硬编码**：APK bundle 含 `http://192.168.0.100:8800` 且不含 `localhost:8800`；Web production 产物 grep `localhost:8800|127.0.0.1:8800` = 0 命中（已验，最终产物再复核）。
- [ ] **A8 报告收口**：`reports/STAGE_R1_FINAL_REPORT.md` 更新为包含本轮 push/CI/release 真实证据的终态；不出现 `WEB_LIVE` / `API_PUBLIC_LIVE` / 真机 PASS 等无证据声明。
- [ ] **A9 版本信息**：APK 的 `versionName=0.1.1`、`versionCode=2`、package `com.pli.mobile`（aapt/产物记录为准）；Release 内附 SHA256 与 APK 实际文件一致。

## Boundaries

- 禁止：Stage I、v1.3、Future 42、PLI-229+、新业务域、重写架构、重新设计五入口 IA、把 3D 包装成医学数字孪生。
- 禁止伪造：不假装有真人/真机通过/真实 3D Provider；真机 QA 未由用户实测前一律 `NOT_YET_OBSERVED`；公网未部署一律 `EXTERNAL_BLOCKED`。
- 禁止篡改历史：`v0.1.0` tag 及既有 Release 历史不动；不做 force push / 破坏性 reset / 无关 rebase。
- 禁止降质过关：不得删除测试、弱化断言、批量 ignore 或关闭检查来让 CI 变绿。
- LAN HTTP 仅限 DEV/INTERNAL；不打 Play 生产签名包；未经授权不购买服务器/域名/付费服务。
- 不擅自推进视觉逐屏收口（等用户截图）；不启动任何超出本契约的新阶段。
