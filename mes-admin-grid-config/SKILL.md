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
  
- **Columns** - 视觉布局（索引、宽度、可见性、冻结、对齐、表头文本）

`Cells.DataColumn`必须匹配BUS的`DataTable`返回的列，包括SQL别名。

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

### 1. Grid列不显示或显示错误
**原因**: `Cells.DataColumn`与SQL返回列名不匹配
**解决**: 
- 检查BUS的SQL查询返回列
- 确保DataColumn与列名完全一致（包括别名）

### 2. Designer中未加载EditSerializable
**原因**: Designer.cs中缺少资源加载代码
**解决**: 添加 `this.GrdMain.EditSerializable = resources.GetString("GrdMain.EditSerializable");`

### 3. .resx文件中缺少资源
**原因**: 资源名称不是`GrdMain.EditSerializable`或资源不存在
**解决**: 在Visual Studio资源编辑器中添加字符串资源

### 4. XML格式错误
**原因**: EditSerializable内容不是有效的转义XML
**解决**: 使用PowerShell验证XML格式

### 5. 列顺序混乱
**原因**: `Columns`的索引与`Cells`顺序不对应
**解决**: 确保Columns条目与Cells条目按相同顺序排列

## 检查清单

配置LSDataGrid时的检查项：

- [ ] BUS的SQL查询已确认返回列
- [ ] `.resx`包含`GrdMain.EditSerializable`资源
- [ ] `Cells.DataColumn`与SQL列名完全匹配
- [ ] `Columns`条目与`Cells`顺序一致
- [ ] Designer.cs加载了EditSerializable资源
- [ ] XML格式有效（无转义错误）
- [ ] 列宽度、可见性、表头文本合理
- [ ] 数据类型匹配（Text、Number、Date等）

## 与其他技能的协作

- **调用方**: `mes-admin-page-dev` - 在新建或修改包含LSDataGrid的管理端页面时自动调用此技能
- **后续**: 配置完成后返回`mes-admin-page-dev`继续页面开发流程
