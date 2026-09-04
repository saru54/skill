---
name: mes-admin-grid-config
description: MES管理端(WinForms) LSDataGrid和EditSerializable元数据配置。处理表格列绑定、显示布局、字段对齐、.resx资源生成与校验。在新建或修改包含LSDataGrid的管理端页面时使用。
---

# MES 管理端 (WinForms) LSDataGrid 配置

用于配置MES管理端 BUS/VIEW WinForms页面中的`LSDataGrid`布局，其配置序列化在VIEW的`.resx`文件中。

**重要**：每个新建或复制的包含`LSDataGrid`的页面都必须使用此技能，即使没有报告Grid缺陷。

## 绑定契约

窗体设计器必须加载资源并分配给Grid：

```csharp
System.ComponentModel.ComponentResourceManager resources =
    new System.ComponentModel.ComponentResourceManager(typeof(MyForm));
this.GrdMain.EditSerializable = resources.GetString("GrdMain.EditSerializable");
```

对应的`.resx`必须包含名为`GrdMain.EditSerializable`的资源。不要在BUS的`Form_Load`中赋值`string.Empty`，这会覆盖设计器元数据。

`Cells.DataColumn`是绑定字段，必须与BUS查询列或别名完全匹配。`Columns`控制表头、宽度、可见性、冻结状态和对齐方式。

## EditSerializable内容结构

该值是`<Editor>`标签下的转义XML，其`Cells`条目包含实际的数据绑定：

```xml
<DataColumn><![CDATA[ITNBR]]></DataColumn>
<DataType><![CDATA[Text]]></DataType>
```

- **Cells** - 数据绑定（必须与BUS返回的列名匹配）
  - `DataColumn`: 绑定字段名
  - `DataType`: 数据类型（Text, Number, Date等）
  - `TextAlign`: **对齐方式（统一显式设置为 `Center` 居中）**
  
- **Columns** - 视觉布局（索引、宽度、可见性、冻结、对齐、表头文本）
  - `Text`: 表头列名
  - `TextAlign`: **表头对齐方式（统一显式设置为 `Center` 居中）**
  - `SummlyAlign`: **合计对齐方式（统一显式设置为 `Center` 居中）**

`Cells.DataColumn`必须匹配BUS的`DataTable`返回的列，包括SQL别名。

## 列对齐与属性设置规范（★核心规范）

1. **默认居中原则**：
   - MES 管理端表格的所有列默认一律为 **居中对齐（`Center`）**。

2. **双向显式设置规范（必须严格遵守）**：
   - **【列名】（`Columns.Column`）**：必须显式设置 `<TextAlign><![CDATA[Center]]></TextAlign>` 与 `<SummlyAlign><![CDATA[Center]]></SummlyAlign>`；
   - **【属性/单元格】（`Cells.Cell`）**：必须显式设置 `<TextAlign><![CDATA[Center]]></TextAlign>`；
   - **原因**：WinForms `LSDataGrid` 控件在反序列化 `Cells` 集合时，如果 `TextAlign` 节点为空或缺失可能导致类型转换异常或被默认左对齐覆盖；因此在生成 `.resx` 时，**表头（Column）和单元格（Cell）必须统一显式填充 `Center`**。

## 配置来源优先级

按此顺序选择配置来源：

1. **BUS的SQL投影和别名**（最高优先级）
2. **数据库表结构和字段描述/数据字典**
3. **使用相同表且兼容查询的成熟页面**
4. **旧页面资源仅作视觉默认值参考**，绝不用于过时绑定

如果使用`SELECT *`，必须明确检查表结构，只保留与页面相关的字段。不要自动暴露每个新增的数据库字段。

当相关页面没有`EditSerializable`时，不要将其作为元数据来源。例如，查询页面可以复用SQL行为但不提供Grid布局元数据；应定位该表的实际配置页面。

## 基于数据库的配置

使用表元数据决定Grid绑定和展示：

- **字段名或SQL别名** → `DataColumn`
- **字段描述** → 表头`Text`
- **SQL/数据库类型** → `DataType`、对齐、日期格式或数值精度
- **长度** → 初始宽度
- **代码/状态字段** → 显示格式或查找行为
- **审计字段** → 通常作为只读字段可见（如果有用）
- **键和技术字段** → 仅在页面工作流需要时隐藏或冻结

SQL别名优先于物理字段名。字段描述可以提供表头，但不能替代`DataColumn`名称。

## 修复工作流程

1. 读取BUS的`GetData`/查询方法，列出实际返回的列
2. 检查候选`.resx`，解码或读取`GrdMain.EditSerializable`
3. 比较每个`Cells.DataColumn`与查询结果，删除过时字段
4. 保留或重建相应的`Columns`条目，确保索引、宽度、表头和可见性与单元格顺序对齐
5. 确保设计器使用`resources.GetString("GrdMain.EditSerializable")`
6. 验证`.resx`为有效XML，搜索重复的资源名称或重复的设计器赋值
7. 报告确切更改的文件。尊重用户的构建边界；除非明确要求，否则不要运行构建或部署操作

## 有用的检查命令

```powershell
# 验证XML格式
[xml](Get-Content -Raw '<page>.resx') | Out-Null

# 搜索EditSerializable和DataColumn
rg -n 'EditSerializable|DataColumn' '<page>.Designer.cs' '<page>.resx'
```

## 完整配置示例

### .resx文件中的EditSerializable资源

```xml
<data name="GrdMain.EditSerializable" xml:space="preserve">
  <value>&lt;Editor&gt;
  &lt;Cells&gt;
    &lt;Item&gt;
      &lt;DataColumn&gt;&lt;![CDATA[ID]]&gt;&lt;/DataColumn&gt;
      &lt;DataType&gt;&lt;![CDATA[Text]]&gt;&lt;/DataType&gt;
    &lt;/Item&gt;
    &lt;Item&gt;
      &lt;DataColumn&gt;&lt;![CDATA[CODE]]&gt;&lt;/DataColumn&gt;
      &lt;DataType&gt;&lt;![CDATA[Text]]&gt;&lt;/DataType&gt;
    &lt;/Item&gt;
    &lt;Item&gt;
      &lt;DataColumn&gt;&lt;![CDATA[NAME]]&gt;&lt;/DataColumn&gt;
      &lt;DataType&gt;&lt;![CDATA[Text]]&gt;&lt;/DataType&gt;
    &lt;/Item&gt;
    &lt;Item&gt;
      &lt;DataColumn&gt;&lt;![CDATA[CREATEDATE]]&gt;&lt;/DataColumn&gt;
      &lt;DataType&gt;&lt;![CDATA[Date]]&gt;&lt;/DataType&gt;
    &lt;/Item&gt;
  &lt;/Cells&gt;
  &lt;Columns&gt;
    &lt;Item&gt;
      &lt;Text&gt;&lt;![CDATA[ID]]&gt;&lt;/Text&gt;
      &lt;Width&gt;80&lt;/Width&gt;
      &lt;Visible&gt;True&lt;/Visible&gt;
      &lt;Frozen&gt;False&lt;/Frozen&gt;
    &lt;/Item&gt;
    &lt;Item&gt;
      &lt;Text&gt;&lt;![CDATA[编码]]&gt;&lt;/Text&gt;
      &lt;Width&gt;150&lt;/Width&gt;
      &lt;Visible&gt;True&lt;/Visible&gt;
    &lt;/Item&gt;
    &lt;Item&gt;
      &lt;Text&gt;&lt;![CDATA[名称]]&gt;&lt;/Text&gt;
      &lt;Width&gt;200&lt;/Width&gt;
      &lt;Visible&gt;True&lt;/Visible&gt;
    &lt;/Item&gt;
    &lt;Item&gt;
      &lt;Text&gt;&lt;![CDATA[创建日期]]&gt;&lt;/Text&gt;
      &lt;Width&gt;120&lt;/Width&gt;
      &lt;Visible&gt;True&lt;/Visible&gt;
    &lt;/Item&gt;
  &lt;/Columns&gt;
&lt;/Editor&gt;</value>
</data>
```

### Designer.cs中加载资源

```csharp
private void InitializeComponent()
{
    System.ComponentModel.ComponentResourceManager resources = 
        new System.ComponentModel.ComponentResourceManager(typeof(CKA0003W));
    
    this.GrdMain = new UserControls.LSDataGrid();
    
    // 关键：加载EditSerializable
    this.GrdMain.EditSerializable = resources.GetString("GrdMain.EditSerializable");
    
    this.GrdMain.Name = "GrdMain";
    this.GrdMain.Location = new System.Drawing.Point(12, 60);
    this.GrdMain.Size = new System.Drawing.Size(800, 400);
}
```

## 常见问题

### 1. Grid居中对齐失效或被覆盖
**原因**: 在`Cells`（单元格属性）中设置了`TextAlign`（如Left/Right），导致覆盖了`Columns`（列名）的居中设置。
**解决**: `Cells.Cell.TextAlign`必须留空（`<![CDATA[]]>`），对齐方式只在`Columns.Column.TextAlign`中统一设置为`Center`。

### 2. Grid列不显示或显示错误
**原因**: `Cells.DataColumn`与SQL返回列名不匹配
**解决**: 
- 检查BUS的SQL查询返回列
- 确保DataColumn与列名完全一致（包括别名）

### 3. Designer中未加载EditSerializable
**原因**: Designer.cs中缺少资源加载代码
**解决**: 添加 `this.GrdMain.EditSerializable = resources.GetString("GrdMain.EditSerializable");`

### 4. .resx文件中缺少资源
**原因**: 资源名称不是`GrdMain.EditSerializable`或资源不存在
**解决**: 在Visual Studio资源编辑器中添加字符串资源

### 5. XML格式错误
**原因**: EditSerializable内容不是有效的转义XML
**解决**: 使用PowerShell验证XML格式

### 6. 列顺序混乱
**原因**: `Columns`的索引与`Cells`顺序不对应
**解决**: 确保Columns条目与Cells条目按相同顺序排列

## 表格值动态转换与格式化（★核心：GrdMain_OnFormat 与 OnQuerySet）

`EditSerializable` 仅解决**列名与视觉布局绑定**。当数据库返回的是数字代码、状态标记或外键编码时，必须在 BUS 中通过事件进行动态转换与翻译。

### 1. GrdMain_OnFormat 事件契约与机制

- **触发时机**：单元格绘制渲染、`GrdMain.Excel()` 导出、`GrdMain.Print()` 打印预览时统一自动触发。
- **命名规范**：`{GridName}_OnFormat(object sender, UserControls.LSFormatEventArgs e)`
- **核心属性**：
  - `e.ColName`：当前单元格绑定的数据列名（对应 `Cells.DataColumn`）。
  - `e.Text`：当前单元格文本（输入为数据库原始值，修改后即为最终界面显示值）。
  - `e.Row`：当前数据行（`DataRow`），可用于跨字段复合判断。

### 2. 三大常用映射模式

#### 模式 A：数据字典动态翻译（EDA0004 字典表）
结合公共服务 `ICMNCODE`（或 `GetCmncode`）动态查询数据字典 `EDA0004`：

```csharp
GetCmncode CmnCode { get { return this.GetService(typeof(ICMNCODE)) as GetCmncode; } }

// 推荐：在类变量或Form_Load中提前缓存字典表，避免在OnFormat循环中重复查库！
DataTable dtRuleCode;

public override void Form_Load(object sender, EventArgs e)
{
    dtRuleCode = CmnCode.GetCboCode("CKA_RULE"); // 获取 EDA0004 中 DIV='CKA_RULE' 的项
    base.Form_Load(sender, e);
}

public void GrdMain_OnFormat(object sender, UserControls.LSFormatEventArgs e)
{
    if (e.ColName == "RULE2" || e.ColName == "RULE3")
    {
        if (dtRuleCode != null)
        {
            foreach (DataRow item in dtRuleCode.Rows)
            {
                if (e.Text == item["DCOD"].ToString())
                {
                    e.Text = item["DNAM"].ToString();
                    break;
                }
            }
        }
    }
}
```

#### 模式 B：硬编码枚举/状态映射
适用于固定的系统状态码（如 1-自动 / 2-手动）：

```csharp
public void GrdMain_OnFormat(object sender, UserControls.LSFormatEventArgs e)
{
    if (e.ColName == "PRINTSETA")
    {
        switch (e.Text)
        {
            case "1": e.Text = "自动"; break;
            case "2": e.Text = "手动"; break;
            default:  e.Text = ""; break;
        }
    }
}
```

#### 模式 C：机台主数据自动翻译（继承 NewBusniessClassBase）
针对包含机台编号 `MCHID`、`AUMCH` 的页面，可直接继承 `NewBusniessClassBase`，基类已自动内置了 `EDA0001` 表将机台编码翻译为机台中文简称。

### 3. 表头筛选下拉框同步映射（GrdMain_OnQuerySet）

当表格启用了列头筛选漏斗时，如果只做了 `OnFormat`，用户点击筛选仍会看到原始编码。必须实现 `OnQuerySet` 事件同步映射：

```csharp
public void GrdMain_OnQuerySet(object sender, UserControls.LSQuerySetEventArgs e)
{
    if (e.ColName == "RULE2" || e.ColName == "RULE3")
    {
        DataTable dt = CmnCode.GetCboCode("CKA_RULE");
        foreach (DataRow item in dt.Rows)
        {
            // Key: 实际过滤值(代码), Value: 下拉显示文本(中文名称)
            e.DrowDownList.Add(item["DCOD"].ToString(), item["DNAM"].ToString());
        }
    }
}
```

### 4. ★ 性能军规（必须遵守）
> [!CAUTION]
> **严禁在 `OnFormat` 中调用数据库查询！**
> `OnFormat` 会对表格的每一行每一列执行（例如 1000 行 20 列，会触发数万次）。若在 `OnFormat` 内写 `Config.DataBase.GetTable(...)`，将导致界面严重卡死。
> **正确做法**：一律在 `Form_Load` 或初始化时读取字典表到内存变量（如 `DataTable` 或 `Dictionary<string, string>`），在 `OnFormat` 中仅执行内存查找。

## 检查清单

配置LSDataGrid时的检查项：

- [ ] BUS的SQL查询已确认返回列
- [ ] `.resx`包含`GrdMain.EditSerializable`资源
- [ ] `Cells.DataColumn`与SQL列名完全匹配
- [ ] `Columns.Column.TextAlign` 与 `SummlyAlign` 统一显式设置为 `Center`（默认全部居中）
- [ ] `Cells.Cell.TextAlign` 统一显式设置为 `Center`（与Column双向保持一致，防止反序列化异常或被覆盖）
- [ ] `Columns`条目与`Cells`顺序一致
- [ ] Designer.cs加载了EditSerializable资源
- [ ] XML格式有效（无转义错误）
- [ ] 列宽度、可见性、表头文本合理
- [ ] 数据类型匹配（Text、Number、Date等）
- [ ] 状态/代码列已在 BUS 中实现 `GrdMain_OnFormat` 动态翻译（且字典数据已提前内存缓存，无 OnFormat 内查库）
- [ ] 具备筛选需求的字典列已实现 `GrdMain_OnQuerySet`，确保下拉筛选展示中文名称

## 与其他技能的协作

- **调用方**: `mes-admin-page-dev` - 在新建或修改包含LSDataGrid的管理端页面时自动调用此技能
- **后续**: 配置完成后返回`mes-admin-page-dev`继续页面开发流程
