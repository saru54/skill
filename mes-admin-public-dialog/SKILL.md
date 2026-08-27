---
name: mes-admin-public-dialog
description: MES管理端(WinForms) 公共对话框系统（IDIALOG）的Key路由分析与文档化。包括GetIDIALOG注册表、View/Bus映射、构造函数契约。仅用于公共对话框系统，不用于普通页面间对话框。
---

# MES 管理端 (WinForms) 公共对话框路由文档

用于文档化MES管理端的**公共对话框系统**，其入口点为：

```csharp
IDIALOG.ShowDialog(string Key, params object[] Params)
```

## 重要区分

### 公共对话框系统（使用本技能）
- 通过 `IDIALOG.ShowDialog("KEY", params)` 调用
- Key在 `GetIDIALOG.cs` 中注册（如 `ShowBASICCODE1`、`ShowMATERIAL` 等）
- 动态路由到对应的View/Bus
- 用于系统级别的通用对话框（基础代码、物料选择、仓库选择等）

### 普通页面间对话框（不使用本技能）
- 通过 `Config.FormService.ShowDialog(title, "VIEW|Class", "BUS|Class", params)` 调用
- 直接指定View和Bus类名
- 用于页面内部的业务对话框
- 属于 `mes-admin-page-dev` 的范畴

**触发条件**：仅当任务明确要求调查、分析或文档化**公共对话框系统**（IDIALOG Key路由、GetIDIALOG注册表）时使用本技能。

## 分析步骤

### 1. 定位核心文件

- `PUBLIC/MESService/GetIDIALOG.cs` - Key路由注册表
- `PUBLIC/MESService/接口/IDIALOG.cs` - 接口定义

**注意**：不要假设项目使用UTF-8编码，遗留中文源文件可能是GBK/CP936编码。正确解码以保留中文注释和标题。

### 2. 提取Key注册表

将`GetIDIALOG`中每个`Show<Key>(params object[] Params)`实现视为已注册的Key目录。提取：
- 对话框标题
- `View` 程序集/类字符串
- `Bus` 程序集/类字符串

### 3. 解析构造函数契约

解析View类源代码，使用其公共构造函数定义`Params`契约。不要仅从变量名推断参数语义，当对应的Bus源码提供更精确含义时应以Bus为准。

### 4. 搜索调用点

搜索所有非生成的`.cs`文件中的`IDIALOG.ShowDialog`调用点。

**区分两种调用**：
- **Key路由**: `IDIALOG.ShowDialog("BASICCODE1", ...)`
- **直接调用**: `Config.FormService.ShowDialog(title, view, bus, params)` - 这是单独的目录，不是Key路由

### 5. 验证行为

对于选定或常用的Key，检查其Bus源码以确定实际的过滤行为和结果传递。仅报告已验证的事实。

## 脚本辅助

运行脚本创建Key目录和构造函数契约：

```bash
python scripts/extract_idialog_routes.py <project-root> --out <output.csv>
```

该脚本是加速器；对于有歧义的映射和构造函数重载，需要手动检查。

## 输出文档

当用户请求文档时，使用`docx`技能创建中文DOCX参考文档，应包含：

### 文档内容结构

1. **路由机制说明**
   - IDIALOG.ShowDialog的工作原理
   - Key到View/Bus的映射机制
   - Params参数传递模型

2. **用户提到的Key详细说明**
   - Key的业务含义
   - 参数过滤行为（从Bus代码验证）
   - 使用示例

3. **实际调用点表格**
   - 观察到的Key调用
   - 代表性源码位置
   - 参数表达式

4. **完整Key注册表附录**
   - Key名称
   - 业务/标题含义
   - View类
   - Bus类
   - 构造函数签名
   - 参数说明

5. **证据来源**
   - 接口文件
   - 路由映射文件
   - 选定的View源码
   - 选定的Bus源码

### 标注要求

明确标注：
- 未知的标题文本
- 缺失的View源码
- 未验证的参数语义
- 已注释掉的Key（除非用户要求历史/废弃路由，否则排除在活动目录外）

## 解释规则

### Key解析
`Key`是反射后缀：
```csharp
ShowDialog("BASICCODE1", ...) → 解析为 ShowBASICCODE1() 方法
```

### Params传递
`Params`作为构造函数参数数组转发给目标View。参数数量和类型必须匹配某个公共View构造函数。

### 空参数列表
空Params列表不意味着目标Bus没有行为。它仅意味着View实例化时不带构造函数参数。

### 返回值
仅当Bus实现中存在`Config.Result`赋值时，才将其视为选定行返回通道。

### 编码值
不要将编码值（如`ZJ`、`CX`、`ML`）翻译为业务名称，除非项目中的权威枚举、字典或查询结果定义了它们。

## 示例分析

### Key注册示例

```csharp
// GetIDIALOG.cs
public void ShowBASICCODE1(params object[] Params)
{
    string title = "基础代码查询";
    string view = "COMMON_VIEW|BasicCodeW1";
    string bus = "COMMON_BUS|BasicCodeB1";
    
    Config.FormService.ShowDialog(title, view, bus, Params);
}
```

### 调用点示例

```csharp
// CKA0003B.cs
private void BtnSelectCode_Click(object sender, EventArgs e)
{
    IDIALOG.ShowDialog("BASICCODE1", "TYPE_A");
    
    if (Config.Result == "OK")
    {
        DataRow selectedRow = Config.Result as DataRow;
        txtCode.Text = selectedRow["CODE"].ToString();
    }
}
```

### View构造函数示例

```csharp
// BasicCodeW1.cs
public partial class BasicCodeW1 : FrmDialog
{
    private string codeType;
    
    // 构造函数契约：接受一个string参数作为代码类型
    public BasicCodeW1(string codeType)
    {
        InitializeComponent();
        this.codeType = codeType;
    }
}
```

## 输出格式

### Key注册表（CSV/表格）

| Key | 标题 | View | Bus | 构造函数 | 参数说明 |
|-----|------|------|-----|----------|----------|
| BASICCODE1 | 基础代码查询 | COMMON_VIEW\|BasicCodeW1 | COMMON_BUS\|BasicCodeB1 | (string codeType) | 代码类型过滤 |
| MATERIAL | 物料选择 | MAT_VIEW\|MaterialW | MAT_BUS\|MaterialB | () | 无参数 |
| WAREHOUSE | 仓库选择 | WH_VIEW\|WarehouseW1 | WH_BUS\|WarehouseB1 | (string plant, bool includeVirtual) | 工厂代码，是否包含虚拟仓 |

### 调用点表格

| 位置 | Key | 参数 | 用途 |
|------|-----|------|------|
| CKA0003B.cs:125 | BASICCODE1 | "TYPE_A" | 选择类型A的基础代码 |
| STD0010B.cs:88 | MATERIAL | 无 | 选择物料 |
| STB0005B1.cs:203 | WAREHOUSE | Config.PlantCode, false | 选择实体仓库 |

## 常见问题

### 1. Key找不到对应方法
**原因**: Key名称与Show方法不匹配
**解决**: 检查GetIDIALOG中是否有`Show{Key}`方法

### 2. View类找不到
**原因**: View程序集/类字符串错误或文件不存在
**解决**: 搜索项目中的View类，验证命名空间和类名

### 3. 参数数量不匹配
**原因**: 调用点传递的参数与View构造函数不匹配
**解决**: 检查View的所有公共构造函数重载

### 4. 中文乱码
**原因**: 文件编码为GBK/CP936而非UTF-8
**解决**: 使用正确的编码读取文件

### 5. Config.Result类型不明确
**原因**: Bus返回值类型多样
**解决**: 检查Bus的BtnOK_Click实现，查看Config.Result赋值

## 检查清单

文档化IDIALOG路由时的检查项：

- [ ] 已定位GetIDIALOG.cs和IDIALOG.cs
- [ ] 已提取所有Show{Key}方法
- [ ] 已解析View构造函数签名
- [ ] 已搜索实际调用点
- [ ] 已验证常用Key的Bus行为
- [ ] 文档包含完整Key注册表
- [ ] 文档包含调用点示例
- [ ] 标注了未知或未验证的信息
- [ ] 排除了已注释的废弃Key

## 与其他技能的协作

- **区别于**: `mes-page-dev` - 直接的`Config.FormService.ShowDialog`调用属于页面开发，不是IDIALOG Key路由
- **调用时机**: 仅当任务明确要求调查、文档化、分类IDIALOG Key路由时使用
