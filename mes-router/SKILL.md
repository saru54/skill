---
name: mes-router
description: MES全景多项目统一路由器。覆盖D:\mes\mes-major下所有子系统（管理端、PDA端、服务端程序、LCC、上位机、POP采集、设备接口等），自动识别任务所属项目并分发至对应Skill。用于所有MES开发工作。
---

# MES 全景多项目统一开发路由器 (mes-router)

本技能是 `D:\mes\mes-major` 全套 MES 体系的**顶层总路由器**。负责准确识别任务所属的子系统、工程目录及前后端对应关系，并分发到对应的专业技能或开发规范。

---

## 1. D:\mes\mes-major 核心系统架构与 Skill 映射表

```
D:\mes\mes-major 架构体系
│
├── 📱 【PDA 移动体系】(前后端配对)
│   ├── 03-PDA\LonSon.Mobile.PrinxChengShan.App          → 前端 (H5 / MUI / Vue2)  👉 🟢 mes-pda-dev
│   └── 04-服务器端程序\LonSon.Mobile.PrinxChengShan.App.Web → 后端 (ASHX / BLL / DAL) 👉 ⚪ [待建: mes-pda-server-dev]
│
├── 🖥️ 【MES 管理端】(独立 PC WinForms C/S 体系)
│   └── 05-MES管理端 (BUS / VIEW / PUBLIC / PLMES)       → 独立桌面端 C# 系统       👉 🟢 mes-admin-* (三大技能)
│
├── 🏭 【现场工控与采集体系】(独立子系统)
│   ├── 01-硫化上位机                                    → 硫化机台上位机监控       👉 ⚪ [待建: mes-curing-dev]
│   ├── 02-LCC客户端 / 15-LCC                             → 产线机台现场控制 (LCC)   👉 ⚪ [待建: mes-lcc-dev]
│   ├── 11-POP                                          → 现场数据采集 / 曲线采集  👉 ⚪ [待建: mes-pop-dev]
│   ├── 10-设备接口                                      → PLC / RFID / 测厚仪接口  👉 ⚪ [待建: mes-device-interface]
│   ├── 61-例查系统                                      → 全钢 / 半钢例查检验      👉 ⚪ [待建: mes-inspection-dev]
│   └── 99-TG现场终端                                    → TG 现场机台专用终端      👉 ⚪ [待建: mes-tg-terminal]
│
└── 🌐 【公共服务与接口】
    ├── 04-服务器端程序 (WebAPI / Restful / 同步服务等)     → 后台 Windows 服务 / API  👉 ⚪ [待建: mes-server-dev]
    └── 外围系统接口整理 (SAP / WMS / PLM / APS 等)        → 外部系统集成接口         👉 ⚪ [待建: mes-external-api]
```

---

## 2. 系统详细职责与前后端对应关系

| 子系统目录 | 项目定位 | 前后端对应关系 / 架构说明 | 对应 Skill 状态 |
| :--- | :--- | :--- | :--- |
| **`03-PDA`** | **PDA 移动端前端** | **前端应用**：H5 / MUI / Vue 2，通过 HTTP/Ajax 请求 `04-服务端` 的 ASHX 接口 | 🟢 **`mes-pda-dev`** |
| **`04-服务器端程序`**<br>*(LonSon.Mobile...App.Web)* | **PDA 移动端后端** | **PDA 专属后端服务**：包含 ASHX 处理程序、BLL 业务逻辑层、DAL 数据访问层、Model 层 | ⚪ *[待建: mes-pda-server-dev]* |
| **`05-MES管理端`** | **独立 PC 管理端** | **独立 C/S 桌面系统**：WinForms + DevExpress + BUS 业务层 + VIEW 界面层，直接处理管理业务 | 🟢 **`mes-admin-page-dev`**<br>🟢 **`mes-admin-grid-config`**<br>🟢 **`mes-admin-public-dialog`** |
| **`04-服务器端程序`**<br>*(其他后台服务)* | **后台通用服务** | 包含 `MES-RestfulAPI`、`WebAPI`、定时结算、邮件推送、动均扫描服务等 Windows/Web 服务 | ⚪ *[待建: mes-server-dev]* |
| **`01-硫化上位机`** | **现场工控上位机** | 独立 C# 上位机程序，负责硫化机台监控与曲线交互 | ⚪ *[待建: mes-curing-dev]* |
| **`02/15-LCC`** | **产线机台控制端** | Line Control Client，现场机台操作与控制客户端 | ⚪ *[待建: mes-lcc-dev]* |
| **`11-POP`** | **现场数据采集** | 胎面重量采集、硫化曲线采集、配方下发/上传 | ⚪ *[待建: mes-pop-dev]* |
| **`10-设备接口`** | **设备通信接口** | PLC 通信、RFID 读写、测厚仪、出标机协议、输送线接口 | ⚪ *[待建: mes-device-interface]* |
| **`61-例查系统`** | **质检例查** | 全钢/半钢例查系统 | ⚪ *[待建: mes-inspection-dev]* |
| **`99-TG现场终端`** | **现场终端** | TG 机台现场操作终端 | ⚪ *[待建: mes-tg-terminal]* |
| **`外围系统接口整理`**| **企业系统接口** | SAP、WMS、PLM、APS、CRM、SRM、LIMS 等外部接口 | ⚪ *[待建: mes-external-api]* |

---

## 3. 路由分发决策规则

### 📱 1. PDA 移动端开发任务
* **PDA 前端任务 (`03-PDA`)**：
  * **路径**：`D:\mes\mes-major\03-PDA\LonSon.Mobile.PrinxChengShan.App`
  * **关键词**：`PDA`、`手持机`、`MUI`、`vue@2.js`、`扫码`、`CheckBarcodeLengthClick`、`.html`
  * **分发目标** 👉 **`mes-pda-dev`**
* **PDA 后端服务任务 (`04-服务器端程序\LonSon.Mobile...App.Web`)**：
  * **路径**：`D:\mes\mes-major\04-服务器端程序\LonSon.Mobile.PrinxChengShan.App.Web`
  * **关键词**：PDA 的 `.ashx` 接口、`Mobile.PrinxChengShan.Bll`、`Mobile.PrinxChengShan.Dal`
  * **处理策略** 👉 定位到 PDA Web 后端项目进行 C# 接口与数据层开发

---

### 🖥️ 2. MES 管理端开发任务 (`05-MES管理端`)
* **独立系统**：WinForms C/S 桌面客户端，与 PDA 前端无直接前后端耦合。
* **路径**：`D:\mes\mes-major\05-MES管理端`
* **关键词**：`BUS`、`VIEW`、`WinForms`、`DevExpress`、`CKA/STC/STD` 模块、`LSDataGrid`、`IDIALOG`
* **分发目标**：
  * 页面与业务开发 👉 **`mes-admin-page-dev`**
  * 表格列配置与 EditSerializable 👉 **`mes-admin-grid-config`**
  * 公共对话框 Key 路由 👉 **`mes-admin-public-dialog`**

---

### 🏭 3. 其他工控与独立子系统任务
* **硫化上位机 (`01-硫化上位机`)**：工控监控与曲线
* **机台控制端 (`02/15-LCC`)**：LCC 现场机台客户端
* **数据采集 (`11-POP`)**：POP 采集与配方服务
* **硬件接口 (`10-设备接口`)**：PLC / RFID / 测厚仪通信
* **通用后台服务 (`04-服务器端程序`)**：RestfulAPI、WebAPI、定时调度服务

---

## 4. 智能决策树

```
收到开发请求
    │
    ├─ ① 涉及 PDA 移动端：
    │   ├─ 前端 H5 页面 / 扫码 / MUI / vue@2.js (`03-PDA`)
    │   │   └─ 👉 调度 【mes-pda-dev】
    │   │
    │   └─ 后端接口 / ASHX / BLL / DAL (`04-服务器端程序\LonSon.Mobile...App.Web`)
    │       └─ 👉 定位到 PDA 服务端工程开发接口
    │
    ├─ ② 涉及 MES 管理端 (`05-MES管理端` 独立 WinForms 系统)：
    │   ├─ 涉及 LSDataGrid / EditSerializable / .resx 列配置 ?
    │   │   └─ 👉 调度 【mes-admin-grid-config】
    │   │
    │   ├─ 涉及 IDIALOG / ShowDialog Key / GetIDIALOG ?
    │   │   └─ 👉 调度 【mes-admin-public-dialog】
    │   │
    │   └─ 常规管理端 BUS/VIEW 业务开发
    │       └─ 👉 调度 【mes-admin-page-dev】
    │
    ├─ ③ 涉及现场工控与采集 (`01-上位机` / `02-LCC` / `11-POP` / `10-设备接口`)：
    │   └─ 👉 定位到具体工控子工程目录开发
    │
    └─ ④ 涉及后台公共服务 (`04-服务器端程序` 的 WebAPI / 服务调度)：
        └─ 👉 定位到通用服务端工程开发
```
