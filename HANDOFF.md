# 猎头AI指令工程工作台 — 交接文档

## 一、项目概览

**定位**：猎头工作流提效工具，帮助猎头从岗位 JD 生成搜索指令、评估候选人简历。

**用户**：猎头公司 PM + 团队，5-10 人的小团队使用。

**线上地址**：https://chenyuhuan555.github.io/recruiter-tools/

---

## 二、文件清单

```
D:\New project\
├── index.html               # 首页跳转 → prompt-library.html
├── prompt-library.html      # ⭐ 主应用（单文件，约 2200 行）
├── prompt-template.md       # Claude 提示词模板（参考用，网页已内置）
├── README.md                # 使用指南
├── HANDOFF.md               # 本文档
└── .gitignore               # 忽略 .claude/ 和临时文件
```

**核心文件只有一个**：`prompt-library.html`，包含 HTML + CSS + JS，无构建工具，双击即可在浏览器打开。

---

## 三、技术架构

```
prompt-library.html（纯前端单页应用）
├── CSS 框架：Pico CSS v2（CDN）
├── PDF 解析：PDF.js v3（CDN）
├── 数据存储
│   ├── 主存储：浏览器 localStorage（key: promptLib_prompts）
│   └── 云同步：GitHub API（可选，读写仓库中的 prompts.json）
├── AI 能力
│   └── DeepSeek API（api.deepseek.com/v1/chat/completions）
│       模型：deepseek-chat
└── 部署：GitHub Pages（chenyuhuan555/recruiter-tools）
```

---

## 四、核心功能模块

### 1. 搜索指令生成（主模式）
- 输入：岗位名称 + JD
- 系统提示词变量：`GEN_SYSTEM_PROMPT`（约第 1675 行）
- 输出：4 个猎头 Brief 风格变体（A/B/C/D） + 1 个评估标准
- 格式：`---A---` / `---B---` / `---C---` / `---D---` / `---CRITERIA---`
- 解析函数：`parseGenResponse()`（约第 2073 行）

### 2. 候选人简历评估（评估模式）
- 模式切换：`switchGenModeUI()`（约第 1771 行）
- 步骤 1：贴 JD → `generateCriteria()` 自动生成评估标准
- 步骤 2：粘贴简历文本 或 拖拽 PDF → 调用 DeepSeek 评估
- PDF 解析：`parsePdf()`（约第 1662 行）
- 拖拽处理：`processPdfFile()`（约第 1512 行）

### 3. 指令库管理
- 数据模型：每条指令包含 id, jobTitle, title, variant, sourceModel, promptText, notes, createdAt, createdBy, updatedAt, updatedBy
- 本地存储：`loadLocalPrompts()` / `saveLocalPrompts()`
- GitHub 同步：`pullFromGitHub()` / `pushToGitHub()`
- 卡片渲染：`renderAll()`（第 1070 行附近），按 jobTitle 分组

### 4. 迭代修改
- 函数：`refineAll()`（约第 1994 行）
- 保留对话历史 `genHistory[]`，在上下文中修改

---

## 五、GitHub 部署信息

| 项目 | 值 |
|------|-----|
| 仓库 | github.com/chenyuhuan555/recruiter-tools |
| 分支 | main |
| Pages 状态 | ✅ 已开启（Source: main, / root） |
| 线上地址 | https://chenyuhuan555.github.io/recruiter-tools/ |

**推送命令**：
```bash
cd "D:\New project"
git add -A
git commit -m "描述改动"
git push
```

---

## 六、关键代码位置

| 功能 | 大致行号 |
|------|----------|
| CSS 自定义样式 | 8-500 |
| HTML 结构（设置/工具栏/卡片/弹窗） | 500-850 |
| 生成弹窗 HTML | 690-820 |
| 编辑弹窗 HTML | 650-740 |
| 配置管理 | 1280-1400 |
| 本地存储 | 850-880 |
| GitHub API | 880-930 |
| 渲染 + 分组 | 1070-1140 |
| 生成核心 | 1675-1920 |
| 解析响应 | 2073-2103 |
| 评估模式 | 1900-2020 |
| 事件监听 | 1380-1530 |

---

## 七、已知优化方向

### 高优先级
- [ ] 指令库中评估报告的展示优化（目前截断显示，完整报告在 `_fullReport` 字段）
- [ ] 批量导出岗位下所有指令为 PDF/文本
- [ ] 指令使用次数统计

### 中优先级
- [ ] 评估模式支持同时评估多份简历
- [ ] 指令历史版本对比（利用 GitHub 的 commit 历史）
- [ ] 暗色模式切换
- [ ] 移动端适配优化

### 低优先级
- [ ] 倍罗 API 直连（有 API 权限后）
- [ ] 浏览器插件自动填搜索框
- [ ] 多语言支持

---

## 八、用户反馈要点

1. 👍 喜欢 Claude 生成的「猎头 Brief」格式（结构化、自然语言），不喜欢纯关键词布尔表达式
2. 👍 想要「一条线索到底」：JD → 搜索指令 + 评估标准 → 找简历 → 评估
3. 👍 拖拽 PDF 上传很重要
4. 👎 标签功能不需要（已删除）
5. 👎 复制按钮要放在卡片顶部（已修复）
6. 团队成员希望零配置上手（已预填仓库信息）
