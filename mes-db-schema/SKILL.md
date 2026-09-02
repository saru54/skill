---
name: mes-db-schema
description: MES系统全量数据库表结构与字典速查库。收录全部1376张表的DDL、字段类型、主键、中文注释与业务字典。在需要查询表结构、定位字段含义、分析关联外键或编写SQL时使用。
---

# MES 数据库全量表结构、存储过程与业务规则速查 (mes-db-schema)

本技能收录 MES 系统 (`PLMES`) 全部 **1376** 张数据库表的完整 DDL、字段类型、中文描述（`MS_Description`）、**100+ 个存储过程**、**70+ 个系统视图/APS接口** 以及从数据字典提炼的 **500+ 项字段枚举映射与业务规则**。

---

## 1. 🔍 快速检索工具 (CLI)

在需要查阅任何表结构、搜索字段、定位存储过程或业务规则时，运行内置脚本：

```bash
# 1. 查阅指定表结构及内嵌业务枚举规则（自动展示字段枚举映射）
node mes-db-schema/scripts/query_schema.js LTC0001
node mes-db-schema/scripts/query_schema.js ALA0001

# 2. 查询存储过程用途与说明
node mes-db-schema/scripts/query_schema.js --sp BARCODE
node mes-db-schema/scripts/query_schema.js --sp CURE

# 3. 查询系统视图与 APS 接口
node mes-db-schema/scripts/query_schema.js --view GT_Inventory
node mes-db-schema/scripts/query_schema.js --view HALFPLAN

# 4. 检索字段枚举映射与计算规则（如 报警、打标、跨天、早班、启用）
node mes-db-schema/scripts/query_schema.js --rule "打标"
node mes-db-schema/scripts/query_schema.js --rule "报警"

# 5. 全局搜索包含某个字段的所有表（如寻找 TLOTID 在哪些表出现）
node mes-db-schema/scripts/query_schema.js --find-column TLOTID

# 6. 按业务关键词搜索相关表（如搜索“投入”、“硫化”、“盘点”）
node mes-db-schema/scripts/query_schema.js --search "投入"

# 7. 按前缀列出表（如列出所有 LTC、STE、WIP、QMA 表）
node mes-db-schema/scripts/query_schema.js --list LTC
```

---

## 2. 🏛️ 核心业务表前缀与业务域速查表

| 前缀 / 域 | 业务领域 | 代表性核心表 | 主要业务职责 |
| :--- | :--- | :--- | :--- |
| **`LTA*`** | **胎胚 / 压出** | `LTA0001` (胎胚明细)<br>`LTA0011` (压出记录) | 胎胚成型产出、压出线记录 |
| **`LTB*`** | **成型生产** | `LTB0004` (成型投入明细)<br>`LTB0007` (成型主批次) | 成型主机投入、成型工单、成型看板 |
| **`LTC*`** | **半成品追踪** | `LTC0001` (半成品生产明细)<br>`LTC0004` (半成品投入记录) | 胎面、帘布、带束层、钢丝圈生产与投入 |
| **`LTD*`** | **胶料 / 混炼** | `LTD0001` (胶料批次)<br>`LTD0004` (胶料投入记录) | 密炼、母胶、终炼胶投料与检验 |
| **`STE*` / `STC*` | **硫化车间** | `STE0001` (硫化生产记录)<br>`STC0001` (硫化参数/报警) | 硫化机台、锅位、硫化温度压力曲线、胶囊 |
| **`STA*` / `STB*` | **仓储与物流** | `STA0001` (库位信息)<br>`STB0009` (移库/出入库履历) | 库房、线边库、仓位、转运载具、工装 |
| **`WIP*`** | **在制品 / 库存** | `WIP0001` (半成品实时库存)<br>`WIP0003` (工装具在架) | 实时线边库存、工装具状态、批次冻结 |
| **`QMA*` ~ `QMD*` | **质量与质检** | `QMA0014` (物料工序配置)<br>`QMD0005`/`QMD0006` (门尼质检) | 质检项目、复检标准、门尼黏度、废品判级 |
| **`EDA*` / `EDD*` | **基础工程数据** | `EDD0001` (物料主数据)<br>`EDD0003` (物料区分)<br>`EDD0061` (BOM结构) | 物料编码、版本、规格参数、配方 BOM |
| **`LSFW*`** | **系统架构与权限** | `LSFW_EMPLOYEE` (员工/工号)<br>`LSFW_FACTORY` (工厂代码) | 用户、权限、工厂隔离（`FAC`）、组织架构 |

---

## 3. 📐 核心内嵌业务规则与枚举定义

数据字典中沉淀的专项业务计算与取值规则包括：

1. **报警公式与阈值规则 (`ALA0001~ALA0004`)**：
   - 触发类型：`1=差值触发`、`2=阈值触发`；
   - 内部参数计算：`1=工艺值`、`2=常量`；
   - 外层公式配置：`0=无计算`、`1=绝对值计算`；
   - 比较运算符：`>`、`<`、`>=`、`<=`、`OUT=区间外`、`IN=区间内`；
   - 启用状态：`1=启用`、`0=禁用`；通知渠道：`1=钉钉`。
2. **成品检查打标策略 (`CKA0001`)**：
   - 打标方式：`1=实心`、`2=空心`、`3/4/5/6=不打标`；
   - 复检控制：`ISNGCHECK` (B/C/D等级不合格是否再次检测)。
3. **排班与班次时间 (`EDB0001~EDB0005`)**：
   - 二班制：早班 (`WTIM1`)、夜班 (`WTIM2`)；
   - 三班制：早班 (`WTIMA`)、中班 (`WTIMB`)、夜班 (`WTIMC`)；
   - 跨天控制：中班跨天、夜班跨天。
4. **工艺动态分表规范 (`GY*`)**：
   - 硫化/成型软控动态采集表格式：`GY + 机台号 + 年份（两位） + 季度（1~4）`；
   - 成型工艺表：`CXGYMAIN_ + 年份` / `CXGYITEM_ + 年份`。

---

## 4. 📂 原始资源文件

* **表结构 DDL 转储**：`resources/dbo.sql`（包含 1376 张表的完整建表语句与注释）
* **表结构 JSON 索引**：`resources/tables_index.json`（18.9 万行结构化定义）
* **存储过程汇总**：`resources/stored_procedures.json`（100 个存储过程说明与授权）
* **视图汇总**：`resources/views.json`（73 个视图与 MES-APS 接口说明）
* **字段枚举与业务规则库**：`resources/field_enum_rules.json`（232 张表的 517 条字段枚举规则）
* **表清单概览**：`resources/tables_summary.md`

