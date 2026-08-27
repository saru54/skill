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

### 🔌 不同工具的接入方式

各工具的技能目录名称可能不同，但接入原则一致：将本项目的技能文件夹（保留其中的 `SKILL.md` 和 `scripts/`）复制到工具的 Skills 目录，或使用目录链接指向本项目。推荐把整个仓库作为技能根目录，避免破坏各技能之间的相对路径。

| 工具 / Agent | 技能目录 | 接入说明 |
| :--- | :--- | :--- |
| **Google Gemini** | `~/.gemini/skills/` | 在 `~/.gemini/config/skills.json` 的 `entries` 中添加本仓库路径（见上方示例）。 |
| **Claude Code** | `~/.claude/skills/` | 将本仓库中的各技能文件夹复制或链接到该目录；项目级技能也可放在项目根目录 `.claude/skills/`。 |
| **OpenAI Codex** | `~/.codex/skills/` | 将本仓库中的各技能文件夹复制或链接到该目录；项目级技能可放在项目根目录 `.codex/skills/`。 |
| **Cursor** | `.cursor/skills/` | 在项目根目录创建该目录，并将需要的技能文件夹导入；也可以配置为全局技能目录（以当前版本设置为准）。 |
| **Windsurf** | `.windsurf/skills/` | 在项目根目录创建该目录，并将需要的技能文件夹导入；也可以配置为全局技能目录（以当前版本设置为准）。 |
| **Aider / 其他 Agent** | 自定义 `skills/` 或提示词目录 | 不支持原生 Skills 时，将对应 `SKILL.md` 内容作为系统提示词或项目约定加载，并保留 `scripts/` 供终端调用。 |

#### Windows 导入示例

在 PowerShell 中，可以把整个技能库复制到目标工具的技能目录：

```powershell
$source = "D:\skill\skill-workflow"
Copy-Item $source "$HOME\.claude\skills\mes-skill-workflow" -Recurse -Force
```

也可以只导入需要的技能，例如：

```powershell
Copy-Item "$source\mes-router" "$HOME\.claude\skills\mes-router" -Recurse -Force
Copy-Item "$source\mes-pda-dev" "$HOME\.claude\skills\mes-pda-dev" -Recurse -Force
```

导入后，主 Agent 应先加载 `mes-router/SKILL.md`，再按任务路由加载 `mes-pda-dev`、`mes-admin-page-dev` 等对应技能。

* **使用方式**：主 Agent 会在接收到 MES 相关任务时自动阅读 `mes-router` 并动态激活对应的子技能。

## 📄 规范版本与维护

* **适用 MES 系统架构**：.NET 4.0 / WinForms / Web ASHX / MUI / Vue 2 / Oracle / SQL Server
* **维护原则**：每次增加新工序、新硬件交互或新子系统时，优先在 `mes-router` 中注册路由，并在对应的子技能中沉淀踩坑案例与脚手架。
