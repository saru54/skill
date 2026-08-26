# MES 开发专用 Skills 集合

本项目为 MES 系统全景开发整理的 Agent Custom Skills（技能库），支持 Antigravity 及相关 AI 编程助理。

---

## 📦 Skills 概览

| 技能名称 | 目录 | 适用场景 / 说明 |
| :--- | :--- | :--- |
| **mes-router** | [\mes-router/\](./mes-router/) | **MES全景路由器**：根据用户任务自动识别所属子系统（管理端、PDA、服务端、LCC、上位机、POP采集等）并分发对应规则与上下文。 |
| **mes-admin-page-dev** | [\mes-admin-page-dev/\](./mes-admin-page-dev/) | **管理端页面开发**：WinForms 架构下的 BUS/VIEW 拆分、主页面/子对话框构建、控件配置与数据交互规范。 |
| **mes-pda-dev** | [\mes-pda-dev/\](./mes-pda-dev/) | **移动端 PDA 开发**：基于 MUI + Vue 2 (vue@2.js) 的 PDA 页面脚手架、扫码事件兼容、表单双向绑定与避坑指南。 |
| **mes-admin-grid-config** | [\mes-admin-grid-config/\](./mes-admin-grid-config/) | **管理端表格元数据**：LSDataGrid 和 EditSerializable 元数据配置、表格列绑定、字段对齐及 .resx 资源生成校验。 |
| **mes-admin-public-dialog** | [\mes-admin-public-dialog/\](./mes-admin-public-dialog/) | **公共对话框系统**：IDIALOG 的 Key 路由分析、View/Bus 映射、构造函数契约与自动化提取工具脚本。 |

---

## 🚀 使用与配置方式

在 ~/.gemini/config/skills.json 中配置引用路径：

`json
{
  entries: [
    {
      path: ~/.gemini/config/skills
    }
  ]
}
`
