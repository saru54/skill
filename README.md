# 🏭 MES 工业制造系统开发专用 Skills & 自动化工作流集合

本项目为 MES（制造执行系统）全景开发整理的 **AI Agent Skills（领域专家技能库）与自动化工具链**。  
采用模块化、渐进式分层加载（Progressive Disclosure）与前后端契约隔离设计，支持 **Google Gemini / Antigravity、OpenAI Codex / ChatGPT、Claude Code、Cursor / Windsurf、Aider** 等主流 AI 编程助手与 Agent 编排框架。

---

## 📦 Skills 技能矩阵概览

| 技能名称 | 目录位置 | 适用场景 / 核心职责 |
| :--- | :--- | :--- |
| **`mes-router`** | [`mes-router/`](./mes-router/) | **MES 全景路由器与总编排器**：定义物理子系统目录矩阵、复合任务流水线配方（Recipes）、Subagent 角色分工与 L1~L3 渐进式加载协议。 |
| **`mes-pda-dev`** | [`mes-pda-dev/`](./mes-pda-dev/) | **移动端 PDA 前端开发**：MUI + Vue 2 (`vue@2.js`) 响应式架构、5 大硬件扫码规范（`keyCode 0/13`、Focus Lock、`v-model.trim`）、原生组件与样式规范。 |
| **`mes-pda-server-dev`** | [`mes-pda-server-dev/`](./mes-pda-server-dev/) | **移动端 PDA 服务端开发**：.NET 4.0 + ASHX + BLL + DAL 分层、`Messaging<T>` 通信契约、SQL Server / Oracle 异构数据库隔离与 `/*PDASQL*/` 规范。 |
| **`mes-admin-page-dev`** | [`mes-admin-page-dev/`](./mes-admin-page-dev/) | **管理端页面开发**：WinForms 架构下的 BUS/VIEW 职责分离、主窗体与子对话框开发、权限控制与数据事务。 |
| **`mes-admin-grid-config`** | [`mes-admin-grid-config/`](./mes-admin-grid-config/) | **管理端表格元数据配置**：`LSDataGrid` 和 `EditSerializable` 属性序列化、表格列绑定、字段对齐及 `.resx` 资源生成与校验。 |
| **`mes-admin-public-dialog`** | [`mes-admin-public-dialog/`](./mes-admin-public-dialog/) | **公共对话框系统**：`IDIALOG` 的 Key 路由分析、View/Bus 映射、构造函数契约与自动化提取工具脚本。 |

---

## 🛠️ 配套自动化工具链 (Scripts)

在各技能目录的 `scripts/` 下提供了开箱即用的 Node.js 脚本工具，可在终端直接执行：

* **PDA 全栈脚手架生成器**（`mes-pda-dev/scripts/scaffold_pda_feature.js`）：
  ```bash
  # 一键生成 前端 HTML/JS 与 后端 ASHX/BLL/DAL 5个标准骨架文件
  node mes-pda-dev/scripts/scaffold_pda_feature.js --module AllSteelHalf --page MoveDemo --title 移库测试 --ashx MoveDemo
  ```
* **PDA 代码合规性质量扫描器**（`mes-pda-dev/scripts/lint_pda_feature.js`）：
  ```bash
  # 扫描 HTML/JS/CS 代码是否符合 PDA 硬件与 SQL 规范
  node mes-pda-dev/scripts/lint_pda_feature.js "03-PDA/LonSon.Mobile.PrinxChengShan.App/AllSteelHalf/MoveDemo.html"
  ```
* **公共对话框路由提取器**（`mes-admin-public-dialog/scripts/extract_idialog_routes.py`）：
  ```bash
  # 自动提取管理端所有 GetIDIALOG 注册键值与构造函数契约
  python mes-admin-public-dialog/scripts/extract_idialog_routes.py
  ```

---

## 🚀 多工具 / 多平台接入与使用指南

本技能库采用标准 Markdown（带 YAML Frontmatter 元数据）编写，能够无缝兼容各类 AI 编程助手与 Agent 工具：

### 1. 🌟 Google Gemini / Antigravity / AGY
在 `~/.gemini/config/skills.json` 中配置本目录即可实现自动发现与按需加载：
```json
{
  "entries": [
    {
      "path": "~/.gemini/config/skills"
    }
  ]
}
```
* **使用方式**：主 Agent 会在接收到 MES 相关任务时自动阅读 `mes-router` 并动态激活对应的子技能。

---

### 2. 🧠 OpenAI Codex / ChatGPT / GPT-4o / GPTs
* **方法 A：作为 Custom GPTs / Agent Knowledge**
  * 在 ChatGPT 创建自定义 GPTs 时，将相关技能的 `SKILL.md` 打包上传至 **Knowledge**。
  * 在 **Instructions** 中添加引导指令：
    > “你是一个 MES 系统全栈开发专家。在编写 PDA 代码时必须遵循 `mes-pda-dev` 与 `mes-pda-server-dev` 中的规范；在编写管理端代码时必须遵循 `mes-admin-*` 规范。”
* **方法 B：作为 Codex / OpenAI API System Prompt**
  * 将 `mes-router/SKILL.md` 和目标子技能的 Markdown 文本直接拼接到 Prompt 的 `system` 消息中作为上下文提示词。

---

### 3. 🟣 Claude / Anthropic Claude Code
* **方法 A：Claude Code CLI / Desktop**
  * 在项目根目录的 `CLAUDE.md` 或 `.claude/` 中建立软链接或直接引入本技能库：
    ```markdown
    # MES 开发规范引用
    详细开发规约请查阅：
    - PDA 端开发规约: ~/.gemini/config/skills/mes-pda-dev/SKILL.md
    - 服务端接口规约: ~/.gemini/config/skills/mes-pda-server-dev/SKILL.md
    ```
* **方法 B：Claude Projects**
  * 将本仓库所有 `SKILL.md` 添加到 Claude Project 的 **Project Knowledge** 中，Claude 在回复与编写代码时会自动对齐架构与命名规范。

---

### 4. ⚡ Cursor / Windsurf / GitHub Copilot
* **方法 A：配置 `.cursorrules` (Cursor)**
  在代码仓库根目录创建 `.cursorrules`，引入技能索引：
  ```markdown
  # MES 开发规则
  - 遇到 PDA 页面开发：必须采用 MUI + Vue 2，扫码输入框必须绑定 v-model.trim 并监听 keyCode === 0 || 13。
  - 遇到后端 ASHX 开发：必须采用 Messaging<T> 返回结构，SQL 必须包含 /*PDASQL*/。
  - 详细规则请查阅 skills/mes-pda-dev/SKILL.md 及 skills/mes-pda-server-dev/SKILL.md。
  ```
* **方法 B：Cursor `@` 符号直接引用**
  在 Cursor Chat 对话框中直接输入 `@mes-pda-dev/SKILL.md`，让 AI 精确基于技能规范生成代码。

---

### 5. 🤖 Aider / Continue.dev / CLI 编程助手
* **Aider**：通过 `/read-only` 指令加载规范文件：
  ```bash
  aider --read mes-pda-dev/SKILL.md --read mes-pda-server-dev/SKILL.md
  ```
* **Continue.dev**：在 `.continue/config.json` 中将 `skills/` 添加到 `docs` 或 Context Providers 中，在聊天中通过 `@docs` 检索调用。

---

## 📄 规范版本与维护

* **适用 MES 系统架构**：.NET 4.0 / WinForms / Web ASHX / MUI / Vue 2 / Oracle / SQL Server
* **维护原则**：每次增加新工序、新硬件交互或新子系统时，优先在 `mes-router` 中注册路由，并在对应的子技能中沉淀踩坑案例与脚手架。
