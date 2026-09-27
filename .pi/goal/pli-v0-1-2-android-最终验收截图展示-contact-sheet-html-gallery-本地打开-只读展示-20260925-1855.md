# GOAL — PLI v0.1.2 Android 最终验收截图展示包（只读展示）

## Goal（本轮要达到的结果）

只使用 `artifacts/emulator/v0.1.2/` 根目录下**本轮 Stage R.1-E 最终验收使用的 16 张最终 after PNG**（`01_login.png` … `16_error-offline.png`，即 `MOBILE_VISUAL_ACCEPTANCE_PASS` 的 16 屏真实截图），生成一个本地展示包并打开，让用户直接看到当前 PLI Android 端长什么样：

1. **Contact Sheet**：`artifacts/emulator/v0.1.2/preview/PLI_v0.1.2_Android_16screens_contact_sheet.png`（4 列 × 4 行单张）
2. **拆分大图两张**（格子更大更清晰）：`artifacts/emulator/v0.1.2/preview/PLI_v0.1.2_Android_01-08.png`、`PLI_v0.1.2_Android_09-16.png`
3. **本地浏览页**：`artifacts/emulator/v0.1.2/preview/index.html`（16 张按页面顺序排列、点击缩略图查看原始分辨率、显示页面名与文件名、纯本地无网络依赖、双击即可浏览）
4. **打开**：用 Windows 系统默认查看器打开 contact sheet 与 index.html（相对路径失败则先 Resolve-Path 取绝对路径再打开）；用内嵌浏览器面板（BrowserPreview）打开 index.html 作为"直接展示"
5. 完成后**只汇报 4 项**（最终截图数量 / Contact Sheet 路径 / HTML Gallery 路径 / 哪些已直接展示）然后 STOP

页面名映射：01 Login · 02 Today · 03 Quick Log · 04 Timeline · 05 Pet/PetHub · 06 3D Life View · 07 Health · 08 Behavior · 09 Training · 10 Welfare · 11 Social · 12 Assistant · 13 Companion · 14 Me · 15 Pet Switch · 16 Offline/Error。

## Acceptance criteria（完成后全部客观可验证）

1. **数量核验**：`artifacts/emulator/v0.1.2/` 根目录恰好 16 张最终 PNG（01–16）；目录内另有 `after/`（3 张，最终 APK 复检 01/04/14）与 `before/`（16 张旧基线）。汇报中"最终截图数量"= 16（根目录验收图）。
2. **源图未动**：生成前后对 16 张源 PNG 分别记录 SHA256，前后完全一致；`before/`、`after/`、zip、APK、SHA256SUMS 及根目录 16 张均不被修改/删除/重命名。
3. **contact sheet 三件套存在**：`preview/` 下存在 `PLI_v0.1.2_Android_16screens_contact_sheet.png`、`PLI_v0.1.2_Android_01-08.png`、`PLI_v0.1.2_Android_09-16.png`，且均为有效 PNG。
4. **结构正确（脚本断言）**：4×4 单张为 4 列 × 4 行；三张 sheet 中每个单元格的宽高比与源图（1080:2340）一致（±0.5% 容差，即无拉伸/裁切/变形）；每张图下方有页面名称文字；背景为简单纯色；拆分两张的单元格分辨率大于 4×4 单张。
5. **index.html 正确（静态断言）**：依次引用 16 张 PNG；点击缩略图可打开原始分辨率（lightbox 逻辑存在）；每项显示页面名 + 文件名；文件内正则 `https?://` 命中数为 0（无外部依赖）；`file://` 双击可用。逐张"直接展示"以 BrowserPreview 内嵌面板打开 gallery 实现（聊天消息本身无法内嵌 PNG，已按用户确认改用此方式）。
6. **Windows 打开成功**：`Start-Process` 打开 contact sheet PNG 与 index.html 均成功（无报错）；BrowserPreview 面板显示 gallery。
7. **工作区洁净**：`git status --porcelain` 显示本轮只新增 `artifacts/emulator/v0.1.2/preview/` 下的文件，任何其他路径无改动。
8. **最终汇报格式**：只汇报 ① 最终截图数量（16 + 说明）② contact sheet 路径 ③ HTML Gallery 路径 ④ 已直接展示的方式/页面，然后 STOP，无长篇文字报告。

## Boundaries（不可逾越）

- **禁止**：重建/重签 APK、重跑 CI、启动/重跑 Emulator、修改任何 UI/代码/配置、更新 visual baseline、删除或移动任何已有 artifact（根目录 16 张、`before/`、`after/`、zip、APK、SHA256SUMS）。
- **禁止**使用 `before/` 中任何旧图冒充最终状态；contact sheet 与 gallery 只用根目录 16 张最终验收图。
- **禁止**裁切、拉伸变形、叠加滤镜/水印/美化修饰源截图；仅允许等比缩放放入格子，文字只加在图片区域之外的下方标签处。
- **禁止**调用图像生成模型重绘截图；只用代码原生合成（Python/Pillow 或 PowerShell System.Drawing）。
- 仅允许在 `artifacts/emulator/v0.1.2/preview/` 目录下新增文件；scratch 临时脚本放会话临时目录。
- Agent 没有图片查看能力，无法对截图内容做视觉判别；只做结构性验证（数量、哈希、宽高比、引用完整性、无外部链接、打开成功）。