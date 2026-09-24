# Stage R — Repository, UI & Release Productization Closure

## 1. Goal

在现有 Stage V.2 完成态（HEAD `e8fff51`、main 干净、pytest 427 / ruff 0 / 五端 typecheck 0 / vitest 22/22 / Playwright 29/29）之上，完成五件交付：

1. **GitHub 正式化**：在 `huangdi97` 账号下新建公开仓库 `pet-life-intelligence`，push main + 全部已有 tags，push 后 CI（`.github/workflows/ci.yml`）运行并最终 passing；仓库元数据就绪。
2. **Web 成品**：`apps/web` 生产构建通过并以生产模式冒烟验证（首页 200 / PWA manifest + service worker 可达），Web 产物作为 Release 资产打包。
3. **Android 成品**：不签名、在 GitHub Actions 上构建 —— 新增 Android 构建 workflow，对 `apps/mobile` 执行 `expo prebuild --platform android` + Gradle 构建，产出可安装 APK（debug 签名或未签名 release）作为 workflow artifact 与 v0.1.0 Release 资产；正式签名/Play 上架保持 EXTERNAL_BLOCKED 并如实登记。
4. **UI/UX 实装验收**：以仓库现有 v3.1-R1 母版 + `docs/ui/PLI_DESIGN_SYSTEM_V3.md` + IA/导航冻结文档为基准，复跑全量质量 gate（pytest / ruff / 五端 typecheck / 五端 build / vitest / Playwright / 视觉回归），发布逐域 UI/UX 实装验收报告，P0/P1 问题修复并复验通过。
5. **v0.1.0 发布**：README/CHANGELOG 对齐到真实当前数字并新增 v0.1.0 条目；git tag `v0.1.0`（本地 + origin）；`gh release create v0.1.0` 附带 Web 产物 + Android APK + 发布说明；发布 STAGE_R 报告；最终 git status 干净。

## 2. Acceptance criteria（全部客观可查）

### A. GitHub 正式化
- A1. `gh repo view huangdi97/pet-life-intelligence` 成功返回公开仓库（名称若被占用则以命令实际创建的仓库为准并记录）。
- A2. `git remote -v` 显示 origin 指向该仓库；`git ls-remote origin refs/heads/main` 与本地 main HEAD（最终 release commit）一致，无 divergence。
- A3. `git ls-remote --tags origin` 包含 v1.0.0 / v1.1.0 / v1.1.1 / v1.2.0 及新增 v0.1.0，全部可 fetch。
- A4. `gh run list --repo huangdi97/pet-life-intelligence` 显示 push 后触发的工作流运行最终为 success（失败项已修复重跑至绿）。
- A5. 提交前复查 `git ls-files` 不含真实 secret/keystore/`带值的 .env`（.gitignore 规则生效，唯一例外是 *.example 模板）；复查命令与结果记入报告。

### B. Web 成品
- B1. `pnpm --dir apps/web build` 以 exit 0 完成（构建日志记录）。
- B2. 以生产模式启动 Web 后 HTTP 冒烟：`GET /` 返回 200；manifest（如 `/manifest.webmanifest`）与 service worker 静态文件按产物实际路径可达（状态码 200，记入报告）。
- B3. Playwright 全部 spec 以 exit 0 通过（29/29 或如实登记受限子集与原因）；视觉基线对比无未登记意外 diff。
- B4. Web 产物（`.next` 或自包含产物 + PWA 文件）被打包为 v0.1.0 Release 资产之一。

### C. Android 成品（CI 构建、不签名）
- C1. 仓库新增 Android 构建 workflow（如 `.github/workflows/android.yml`），内容可审查（install → expo prebuild android → gradle assemble，debug 或未签名 release APK）。
- C2. `gh run list` 中 Android workflow 运行成功；workflow artifact 中可见 APK 文件（`*.apk`）。
- C3. v0.1.0 Release 资产中含该 APK（`gh release view v0.1.0` 的 assets 列表可见，且文件可下载/存在）。
- C4. 报告中从 CI 日志/产物登记 APK 的 package name / versionCode / versionName；签名状态如实标注 UNSIGNED 与 PLAY_STORE_SIGNING=EXTERNAL_BLOCKED。

### D. UI/UX 实装验收
- D1. 全量 gate 复跑（本地，Docker 可用）全部通过：`pytest`（≥427 passed, exit 0）、`ruff check services packages tests`（0）、五端 typecheck（0）、五端 build（OK）、`vitest`（22/22）、Playwright 全部 spec（29/29）。
- D2. 交付 `reports/STAGE_R_UIUX_ACCEPTANCE.md`：以 v3.1-R1 母版 + DESIGN_SYSTEM_V3 + IA/导航冻结为基准，覆盖 Owner 六大域（Today/Timeline/Pet/Assistant/Me）及 Admin/Pro/Mini/Mobile 对齐情况的逐项验收结论 + 问题清单（P0/P1/P2）+ 处置；P0/P1 均修复且复验通过后报告定稿。
- D3. 报告中真实数字与证据命令一一对应；不可验证项使用 NOT_YET_OBSERVED / EXTERNAL_BLOCKED 严格标注。

### E. v0.1.0 发布
- E1. `git tag v0.1.0` 指向最终 release commit，且 `git ls-remote --tags origin` 可见。
- E2. `CHANGELOG.md` 新增 v0.1.0 条目（Stage R 变更）；`README.md` 当前状态块与关键数字（tests/typecheck/Playwright）对齐真实复跑结果。
- E3. `gh release view v0.1.0` 成功，含发布说明 + ≥2 类资产（Web 产物、Android APK）。
- E4. 交付 `reports/STAGE_R_RELEASE_REPORT.md`：状态块、A–D 证据摘要、Known limitations、External blockers（真机 QA / Play 上架 / 生产部署 / 3D provider / SMTP / AI provider 等按实况）。
- E5. 最终 `git status --short` 为空（干净），无新 untracked 遗漏入 commit 前处理。

### F. 守恒与诚实
- F1. 全程不进入 Stage I / v1.3 / Future 42 / 新领域功能开发；本次只做发布/产品化/验收/修复性改动。
- F2. 不删测试、不弱化断言、不新增 ignore 换 CI 绿色（既有豁免保持不变）。
- F3. 既有 tags v1.0.0–v1.2.0 不被删除/覆盖；无 force push；不 rebase 公开历史。
- F4. 任何外部平台不可用（GitHub API/Actions 环境等）时，如实降级为可验证的本地证据 + EXTERNAL_BLOCKED 声明，不编造通过。
- F5. 新增源代码文件仍符合仓库门槛：生产文件 ≤300 行、React 组件 ≤200 行、无裸 TODO；注释遵循仓库规范。

## 3. Boundaries（不可逾越）

- **不开发新领域功能**：FEATURE_FREEZE / PRODUCT_DESIGN_FREEZE 保持 ON；仅允许 bug fix、质量/文档对齐、发布工程。
- **不伪造真实证据**：Play 商店上架、真机 QA、真实用户/宠物数据、3D 身份保真、SMTP、AI provider 若无实据严格写 NOT_YET_OBSERVED / EXTERNAL_BLOCKED。
- **不提交任何 secret**：keystore、密码、token、真实环境值一律不入库；`.env*`（含本地值）保持 untracked。
- **不降级安全边界**：确定性医疗红旗、用药安全、权限隔离、synthetic 数据排除等 Release-blocking 回归不得发生（对应测试全绿为证）。
- **Android 不伪装签名发布**：CI 产物仅 debug 签名或未签名 APK，报告中如实标注；正式上架需外部账号，属 EXTERNAL_BLOCKED。
- **不做大规模无关重构**：坚持 Minimum Safe Refactor；行为改动与重构分离。
- **远程变更需授权**：若创建仓库/push/Release 因权限被 GitHub 拒绝，停止并报告，不绕过账号体系（如不硬编码 token）。

## 4. 交付物清单

- `reports/STAGE_R_RELEASE_REPORT.md`、`reports/STAGE_R_UIUX_ACCEPTANCE.md`
- CHANGELOG.md（v0.1.0）、README.md（对齐）、WORK_STATUS.md（终态）
- 公开仓库 huangdi97/pet-life-intelligence（含 origin、tags、CI 绿、Release v0.1.0 + 资产）
- Android workflow + APK 产物；Web 产物资产
- git tag v0.1.0（本地 + origin）

## 5. 执行方式

批准后我自主推进：先跑本地全量 gate 建立验收基线并修复问题 → GitHub 正式化 + CI 绿 → Android workflow + APK → UI/UX 验收报告 → v0.1.0 发布（tag/CHANGELOG/README/Release/报告）→ 终态核查（git status 干净、A–F 逐条留证）。命令无法完成的环境缺口（如 Android workflow 依赖 GitHub runner 行为）以 CJ、CI 输出为准，失败项修复后再验证，不虚报。