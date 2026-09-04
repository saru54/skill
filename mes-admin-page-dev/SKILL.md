---
name: mes-admin-page-dev
description: MES管理端(PC/WinForms)页面开发。涵盖BUS/VIEW结构、主页面和子对话框创建、控件配置、业务逻辑与数据交互。用于CKA、STC、STD等管理端模块。
---

# MES 管理端 (WinForms) BUS/VIEW 页面开发

使用此技能创建或修改MES管理端（WinForms C#系统）的BUS/VIEW页面。

## 自动协作

**重要**：当检测到以下情况时，会自动调用 `mes-admin-grid-config` 技能处理LSDataGrid配置：
- 新建包含LSDataGrid的页面
- 修改页面的Grid配置
- Grid列绑定问题
- EditSerializable相关错误

无需手动调用 `mes-admin-grid-config`，本技能会在适当时机自动协作。

## 页面结构

### 典型页面组成
一个完整的功能页面通常包含：
- **主页面（如CKA0003B/CKA0003W）** - 带LSDataGrid的查询页面
- **子对话框（如CKA0003B1/CKA0003W1）** - 新增/编辑明细的弹窗

### 文件命名规则
- **BUS文件**: `{模块}{序号}B.cs`（主）、`{模块}{序号}B1.cs`（子1）、`{模块}{序号}B2.cs`（子2）
- **VIEW文件**: `{模块}{序号}W.cs`（主）、`{模块}{序号}W1.cs`（子1）、`{模块}{序号}W2.cs`（子2）
- **VIEW设计器**: `{模块}{序号}W.Designer.cs`、`{模块}{序号}W.resx`

示例：
```
BUS/CK_BUS/CKA_BUS/CKA0003B.cs    # 主业务逻辑
BUS/CK_BUS/CKA_BUS/CKA0003B1.cs   # 子对话框业务逻辑
VIEW/CK_VIEW/CKA_VIEW/CKA0003W.cs          # 主窗体
VIEW/CK_VIEW/CKA_VIEW/CKA0003W.Designer.cs # 主窗体设计器
VIEW/CK_VIEW/CKA_VIEW/CKA0003W.resx        # 主窗体资源（含EditSerializable）
VIEW/CK_VIEW/CKA_VIEW/CKA0003W1.cs         # 子对话框窗体
VIEW/CK_VIEW/CKA_VIEW/CKA0003W1.Designer.cs
VIEW/CK_VIEW/CKA_VIEW/CKA0003W1.resx
```

## BUS文件结构（后端业务逻辑）

### 主页面BUS类（XXX000XB.cs）

```csharp
using Core.Interface;
using System.Data;
using UserControls;
using MESService;

namespace CKA_BUS
{
    public class CKA0003B : BusniessClassBase
    {
        public CKA0003B(IConfig Config) : base(Config) { }
        
        // 1. 控件与服务实例化
        LSDataGrid GrdMain { get { return GetControlByName("GrdMain") as LSDataGrid; } }
        TextBox txtStartDate { get { return GetControlByName("txtStartDate") as TextBox; } }
        ComboBox cmbStatus { get { return GetControlByName("cmbStatus") as ComboBox; } }
        GetCmncode CmnCode { get { return this.GetService(typeof(ICMNCODE)) as GetCmncode; } }
        DataTable dtStatusCode; // 缓存字典表，避免在 OnFormat 中高频查库
        
        // 2. 重载Form_Load - 初始化控件和数据
        public override void Form_Load(object sender, EventArgs e)
        {
            base.Form_Load(sender, e);
            
            // 提前加载并缓存字典数据 (EDA0004)
            dtStatusCode = CmnCode.GetCboCode("SYS_STATUS");
            
            // 初始化下拉框等 (★标准规范：向第0行注入“全部”，其值固化为 %%)
            DataRow rowAll = dtStatusCode.NewRow();
            rowAll["DCOD"] = "%%";
            rowAll["DNAM"] = "全部";
            dtStatusCode.Rows.InsertAt(rowAll, 0);

            cmbStatus.DataSource = dtStatusCode;
            cmbStatus.DisplayMember = "DNAM";
            cmbStatus.ValueMember = "DCOD";
            cmbStatus.SelectedIndex = 0;
            
            // 加载初始数据
            GetData();
        }
        
        // 3. 获取数据源 - 查询数据并绑定到Grid
        public override void GetData()
        {
            // 选“全部”时 SelectedValue 为 "%%"，自动通配全部数据
            string sql = @"SELECT ID, CODE, NAME, STATUS, CREATEDATE 
                          FROM TABLE_NAME 
                          WHERE STATUS LIKE @STATUS";
            
            DataTable dt = Config.DataBase.GetTable(sql, 
                new { STATUS = cmbStatus.SelectedValue != null ? cmbStatus.SelectedValue.ToString() : "%%" });
            
            GrdMain.DataSource = dt;
        }
        
        // 4. 控件事件处理
        public override void BtnQuery_Click(object sender, EventArgs e)
        {
            GetData();
        }
        
        // 5. 表格动态值转换与字典翻译 (单元格渲染、Excel导出、打印统一触发)
        public void GrdMain_OnFormat(object sender, UserControls.LSFormatEventArgs e)
        {
            if (e.ColName == "STATUS" && dtStatusCode != null)
            {
                foreach (DataRow item in dtStatusCode.Rows)
                {
                    if (e.Text == item["DCOD"].ToString())
                    {
                        e.Text = item["DNAM"].ToString();
                        break;
                    }
                }
            }
        }

        // 6. 表头筛选下拉项映射 (让用户在筛选漏斗下拉中看到中文名而非原始编码)
        public void GrdMain_OnQuerySet(object sender, UserControls.LSQuerySetEventArgs e)
        {
            if (e.ColName == "STATUS" && dtStatusCode != null)
            {
                foreach (DataRow item in dtStatusCode.Rows)
                {
                    e.DrowDownList.Add(item["DCOD"].ToString(), item["DNAM"].ToString());
                }
            }
        }
        
        // 7. Grid数据变更事件 - 新增/编辑/删除
        public override void GrdMain_OnDataChange(object sender, UserControls.ChangeTypeEventArgs e)
        {
            if (e.ChangeType == UserControls.ChangeType.New || 
                e.ChangeType == UserControls.ChangeType.Edit)
            {
                // 打开子对话框编辑
                Config.FormService.ShowDialog(
                    "编辑",
                    "CKA_VIEW|CKA0003W1",
                    "CKA_BUS|CKA0003B1",
                    new object[] { e.Row }
                );
                
                if (Config.Result == "OK")
                {
                    // 保存到数据库
                    if (e.ChangeType == UserControls.ChangeType.New)
                    {
                        Config.DataBase.InsertRow("TABLE_NAME", e.Row);
                    }
                    else
                    {
                        Config.DataBase.UpdateRow("TABLE_NAME", e.Row);
                    }
                    GetData(); // 刷新数据
                }
            }
            else if (e.ChangeType == UserControls.ChangeType.Delete)
            {
                Config.DataBase.DeleteRow("TABLE_NAME", e.Row);
            }
        }
    }
}
```

### 子对话框BUS类（XXX000XB1.cs）

```csharp
namespace CKA_BUS
{
    public class CKA0003B1 : BusniessDialogClassBase
    {
        public CKA0003B1(IConfig Config) : base(Config) { }
        
        // 控件实例化
        TextBox txtCode { get { return GetControlByName("txtCode") as TextBox; } }
        TextBox txtName { get { return GetControlByName("txtName") as TextBox; } }
        ComboBox cmbStatus { get { return GetControlByName("cmbStatus") as ComboBox; } }
        
        DataRow row;
        
        public override void Form_Load(object sender, EventArgs e)
        {
            // 获取父页面传递的DataRow
            row = GetPropertieByName("Row") as DataRow;
            
            if (row["ID"].ToString() == "") // 新增模式
            {
                // 设置默认值
                row["CREATEDATE"] = DateTime.Now;
                row["CREATEUSER"] = Config.UserID;
            }
            else // 编辑模式
            {
                // 加载数据到控件
                txtCode.Text = row["CODE"].ToString();
                txtName.Text = row["NAME"].ToString();
                cmbStatus.Text = row["STATUS"].ToString();
            }
        }
        
        public override void BtnOK_Click(object sender, EventArgs e)
        {
            // 数据验证
            if (string.IsNullOrEmpty(txtCode.Text))
            {
                MessageBox.Show("请输入编码");
                return;
            }
            
            // 将控件值写入DataRow
            row["CODE"] = txtCode.Text;
            row["NAME"] = txtName.Text;
            row["STATUS"] = cmbStatus.Text;
            row["UPDATEDATE"] = DateTime.Now;
            row["UPDATEUSER"] = Config.UserID;
            
            // 调用基类方法，设置Config.Result = "OK"
            base.BtnOK_Click(sender, e);
        }
    }
}
```

## VIEW文件结构（前端WinForms界面）

### 主页面VIEW类（XXX000XW.cs）

```csharp
using Core.Interface;
using UserControls;

namespace CKA_VIEW
{
    public partial class CKA0003W : FrmBase
    {
        public static CKA0003W Instance(IConfig Config)
        {
            CKA0003W frm = new CKA0003W();
            frm.Config = Config;
            return frm;
        }
        
        public CKA0003W()
        {
            InitializeComponent();
        }
    }
}
```

### 子对话框VIEW类（XXX000XW1.cs）

```csharp
using System.Data;
using UserControls;

namespace CKA_VIEW
{
    public partial class CKA0003W1 : FrmDialog
    {
        DataRow row;
        
        public DataRow Row
        {
            get { return row; }
            set { row = value; }
        }
        
        public CKA0003W1(DataRow row)
        {
            InitializeComponent();
            this.row = row;
        }
    }
}
```

### VIEW设计器文件（XXX000XW.Designer.cs）

包含控件布局和属性配置：

```csharp
namespace CKA_VIEW
{
    partial class CKA0003W
    {
        private void InitializeComponent()
        {
            System.ComponentModel.ComponentResourceManager resources = 
                new System.ComponentModel.ComponentResourceManager(typeof(CKA0003W));
                
            this.GrdMain = new UserControls.LSDataGrid();
            this.txtStartDate = new System.Windows.Forms.TextBox();
            this.cmbStatus = new System.Windows.Forms.ComboBox();
            
            // GrdMain配置
            this.GrdMain.Name = "GrdMain";
            this.GrdMain.Location = new System.Drawing.Point(12, 60);
            this.GrdMain.Size = new System.Drawing.Size(800, 400);
            
            // 关键：加载LSDataGrid的EditSerializable配置
            this.GrdMain.EditSerializable = resources.GetString("GrdMain.EditSerializable");
            
            // 其他控件配置...
        }
    }
}
```

## LSDataGrid EditSerializable配置

在 `.resx` 文件中配置Grid列绑定，必须包含资源 `GrdMain.EditSerializable`。

### 配置内容结构

EditSerializable是XML格式，包含：

1. **Cells** - 数据绑定配置（对应SQL查询的列）
   - `DataColumn`: 绑定字段名（必须与BUS查询返回的列名完全一致）
   - `DataType`: 数据类型（Text, Number, Date等）

2. **Columns** - 显示列配置（对应Grid显示的列）
   - `Text`: 列标题
   - `Width`: 列宽度
   - `Visible`: 是否可见
   - `Frozen`: 是否冻结
   - `Alignment`: 对齐方式

### 配置示例

```xml
<Editor>
  <Cells>
    <Item>
      <DataColumn><![CDATA[ID]]></DataColumn>
      <DataType><![CDATA[Text]]></DataType>
    </Item>
    <Item>
      <DataColumn><![CDATA[CODE]]></DataColumn>
      <DataType><![CDATA[Text]]></DataType>
    </Item>
    <Item>
      <DataColumn><![CDATA[NAME]]></DataColumn>
      <DataType><![CDATA[Text]]></DataType>
    </Item>
  </Cells>
  <Columns>
    <Item>
      <Text><![CDATA[ID]]></Text>
      <Width>100</Width>
      <Visible>True</Visible>
    </Item>
    <Item>
      <Text><![CDATA[编码]]></Text>
      <Width>150</Width>
      <Visible>True</Visible>
    </Item>
    <Item>
      <Text><![CDATA[名称]]></Text>
      <Width>200</Width>
      <Visible>True</Visible>
    </Item>
  </Columns>
</Editor>
```

### 配置来源优先级

1. BUS查询SQL的列名和别名（最高优先级）
2. 数据库表结构和字段说明
3. 类似页面的配置参考
4. 旧页面的配置（仅作视觉参考）

**注意**: `Cells.DataColumn` 必须与SQL查询返回的列名完全匹配，包括别名。

## 新建页面流程

### 步骤1：确定页面信息
- 模块前缀（如CKA、STC、STD）
- 页面编号（如0003）
- 功能描述
- 是否需要子对话框

### 步骤2：创建BUS文件
1. 创建主BUS类（继承`BusniessClassBase`）
2. 创建子BUS类（继承`BusniessDialogClassBase`）
3. 实现必要方法：
   - 控件实例化
   - `Form_Load`
   - `GetData`
   - 事件处理方法

### 步骤3：创建VIEW文件
1. 使用Visual Studio设计器创建WinForm
2. 添加控件（LSDataGrid、TextBox、ComboBox等）
3. 设置控件Name属性（必须与BUS中GetControlByName一致）
4. 配置LSDataGrid的EditSerializable（在.resx中）

### 步骤4：配置LSDataGrid
1. 读取BUS的SQL查询，确定返回列
2. 在.resx中配置`GrdMain.EditSerializable`
3. 确保Cells.DataColumn与SQL列名匹配
4. 在Designer.cs中添加：
   ```csharp
   this.GrdMain.EditSerializable = resources.GetString("GrdMain.EditSerializable");
   ```

### 步骤5：配置项目引用
1. 将BUS文件添加到对应的BUS项目
2. 将VIEW文件添加到对应的VIEW项目
3. 确保项目引用了必要的程序集：
   - Core.Interface
   - UserControls
   - MESService

### 步骤6：测试验证
1. 编译项目（检查语法错误）
2. 运行主程序，打开新页面
3. 测试查询功能
4. 测试新增/编辑/删除功能

## VIEW-BUS绑定机制

### 绑定契约
- **类名配对**: `CKA0003W` ↔ `CKA0003B`
- **控件名称**: VIEW中的控件Name必须与BUS中GetControlByName的字符串一致
- **事件方法**: 按钮事件通过命名约定绑定（如`BtnQuery_Click`）

### 调用子对话框
```csharp
Config.FormService.ShowDialog(
    "标题",
    "VIEW命名空间|VIEW类名",
    "BUS命名空间|BUS类名",
    new object[] { 参数1, 参数2, ... }
);

// 检查返回结果
if (Config.Result == "OK")
{
    // 用户点击了确定
}
```

### 数据传递
- 父页面 → 子对话框：通过构造函数参数（通常是DataRow）
- 子对话框 → 父页面：
  - 通过修改传入的DataRow引用
  - 通过Config.Result返回状态

## 对话框开发详解

### 对话框类型

MES系统中有两种常见的对话框用途：

#### 1. 数据编辑对话框
用于新增/编辑数据，需要用户确认或取消操作。

**特点**：
- 继承 `BusniessDialogClassBase`
- 需要实现 `BtnOK_Click` 和 `BtnCancel_Click`
- 通过DataRow传递和修改数据
- 需要数据验证

**示例**：
```csharp
// BUS文件
public class CKA0003B1 : BusniessDialogClassBase
{
    TextBox txtCode { get { return GetControlByName("txtCode") as TextBox; } }
    TextBox txtName { get { return GetControlByName("txtName") as TextBox; } }
    DataRow row;

    public override void Form_Load(object sender, EventArgs e)
    {
        row = GetPropertieByName("Row") as DataRow;
        
        if (row["ID"].ToString() != "") // 编辑模式
        {
            txtCode.Text = row["CODE"].ToString();
            txtName.Text = row["NAME"].ToString();
        }
    }

    public override void BtnOK_Click(object sender, EventArgs e)
    {
        // 数据验证
        if (string.IsNullOrEmpty(txtCode.Text))
        {
            MessageService.ShowError("请输入编码");
            return;
        }

        // 将数据写回DataRow
        row["CODE"] = txtCode.Text;
        row["NAME"] = txtName.Text;
        row["UPDATEDATE"] = DateTime.Now;
        row["UPDATEUSER"] = Config.UserID;

        // 调用基类方法设置Result = "OK"
        base.BtnOK_Click(sender, e);
    }
}

// VIEW文件
public partial class CKA0003W1 : FrmDialog
{
    DataRow row;
    
    public DataRow Row
    {
        get { return row; }
        set { row = value; }
    }
    
    public CKA0003W1(DataRow row)
    {
        InitializeComponent();
        this.row = row;
    }
}
```

**调用方式**：
```csharp
Config.FormService.ShowDialog(
    "编辑",
    "CKA_VIEW|CKA0003W1",
    "CKA_BUS|CKA0003B1",
    new object[] { dataRow }
);

if (Config.Result == "OK")
{
    // 用户点击了确定，数据已写入dataRow
    Config.DataBase.UpdateRow("TABLE_NAME", dataRow);
}
```

#### 2. 信息展示对话框
用于展示信息、统计结果等，只读显示，无需确认/取消按钮。

**特点**：
- 继承 `BusniessDialogClassBase`
- **不需要**手动添加确定/取消按钮（系统窗口自带关闭按钮）
- 只需要在 `Form_Load` 中加载和显示数据
- 不需要实现 `BtnOK_Click` 方法

**示例**：
```csharp
// BUS文件
public class CKA0038B1 : BusniessDialogClassBase
{
    TextBox txtStatistics { get { return GetControlByName("txtStatistics") as TextBox; } }
    string statisticsData;

    public override void Form_Load(object sender, EventArgs e)
    {
        // 获取父页面传递的数据
        statisticsData = GetPropertieByName("StatisticsData") as string;
        
        if (!string.IsNullOrEmpty(statisticsData))
        {
            txtStatistics.Text = statisticsData;
        }
        
        base.Form_Load(sender, e);
    }
    
    // 不需要BtnOK_Click方法
}

// VIEW文件
public partial class CKA0038W1 : FrmDialog
{
    string statisticsData;

    public string StatisticsData
    {
        get { return statisticsData; }
        set { statisticsData = value; }
    }

    public CKA0038W1(string data)
    {
        InitializeComponent();
        this.statisticsData = data;
    }
}

// Designer.cs中不需要添加按钮控件
// 只需要设置对话框属性：
// - FormBorderStyle = FixedDialog
// - MaximizeBox = false
// - MinimizeBox = false
// - StartPosition = CenterParent
```

**调用方式**：
```csharp
string statistics = "统计信息\r\n总数：100\r\n有效：80";

Config.FormService.ShowDialog(
    "统计信息",
    "CKA_VIEW|CKA0038W1",
    "CKA_BUS|CKA0038B1",
    new object[] { statistics }
);

// 不需要检查Config.Result，用户关闭窗口即可
```

### 对话框开发流程

#### 步骤1：确定对话框类型
- **数据编辑对话框**：需要用户输入并保存数据
- **信息展示对话框**：只读展示信息

#### 步骤2：创建VIEW文件
```csharp
// XXX000XW1.cs
public partial class CKA0003W1 : FrmDialog
{
    // 定义传递数据的属性
    DataRow row;  // 或 string data; 等
    
    public DataRow Row
    {
        get { return row; }
        set { row = value; }
    }
    
    // 构造函数接收参数
    public CKA0003W1(DataRow row)
    {
        InitializeComponent();
        this.row = row;
    }
}
```

#### 步骤3：设计对话框界面（Designer.cs）
```csharp
// 数据编辑对话框 - 需要按钮
this.Controls.Add(this.txtCode);
this.Controls.Add(this.txtName);
this.Controls.Add(this.BtnOK);     // 需要添加
this.Controls.Add(this.BtnCancel); // 需要添加

// 信息展示对话框 - 不需要按钮
this.Controls.Add(this.txtStatistics); // 只添加显示控件

// 对话框通用属性 - 重要！
this.FormBorderStyle = FormBorderStyle.None;  // 必须设置为None！
this.MaximizeBox = false;
this.MinimizeBox = false;
this.StartPosition = FormStartPosition.CenterParent;
```

**重要提示**：
- **`FormBorderStyle` 必须设置为 `None`**
- 如果设置为 `FixedDialog` 会导致顶部出现多余的标题栏区域
- `FrmDialog` 基类会提供自己的标题栏样式，不需要系统标题栏

#### 步骤4：创建BUS文件
```csharp
public class CKA0003B1 : BusniessDialogClassBase
{
    // 1. 控件实例化
    TextBox txtCode { get { return GetControlByName("txtCode") as TextBox; } }
    
    // 2. 接收父页面传递的数据
    DataRow row;
    
    // 3. 在Form_Load中初始化
    public override void Form_Load(object sender, EventArgs e)
    {
        row = GetPropertieByName("Row") as DataRow;
        // 加载数据到控件...
        base.Form_Load(sender, e);
    }
    
    // 4. 数据编辑对话框需要实现BtnOK_Click
    public override void BtnOK_Click(object sender, EventArgs e)
    {
        // 验证和保存数据
        row["FIELD"] = txtCode.Text;
        base.BtnOK_Click(sender, e); // 必须调用
    }
    
    // 5. 信息展示对话框不需要BtnOK_Click
}
```

#### 步骤5：父页面调用对话框
```csharp
// 调用对话框
Config.FormService.ShowDialog(
    "对话框标题",
    "命名空间|VIEW类名",
    "命名空间|BUS类名",
    new object[] { 参数1, 参数2, ... }
);

// 数据编辑对话框需要检查返回值
if (Config.Result == "OK")
{
    // 处理返回的数据
}

// 信息展示对话框不需要检查返回值
```

### 对话框参数传递规则

#### VIEW层属性定义
```csharp
// 定义公共属性，属性名与BUS中GetPropertieByName的参数一致
public DataRow Row { get; set; }
public string StatisticsData { get; set; }
```

#### BUS层获取参数
```csharp
// 使用GetPropertieByName获取，参数名与VIEW属性名一致
DataRow row = GetPropertieByName("Row") as DataRow;
string data = GetPropertieByName("StatisticsData") as string;
```

#### 父页面传递参数
```csharp
// 按VIEW构造函数参数顺序传递
new object[] { dataRow, otherParam }
```

### 对话框开发注意事项

1. **信息展示对话框不需要按钮**
   - 系统窗口自带关闭按钮（X）
   - 不要手动添加"确定"或"取消"按钮
   - 用户点击X关闭即可

2. **数据编辑对话框必须调用base.BtnOK_Click**
   ```csharp
   public override void BtnOK_Click(object sender, EventArgs e)
   {
       // 验证和保存...
       base.BtnOK_Click(sender, e); // 必须调用！设置Result = "OK"
   }
   ```

3. **对话框继承关系**
   - VIEW继承 `FrmDialog`
   - BUS继承 `BusniessDialogClassBase`

4. **对话框大小建议**
   - 编辑对话框：400x300 到 600x400
   - 信息展示对话框：根据内容适当调整

5. **对话框启动位置**
   - 始终设置 `StartPosition = CenterParent` 居中显示

6. **换行符使用**
   - 在Windows环境中使用 `\r\n` 作为换行符
   - 多行TextBox显示时确保正确换行

## IConfig常用API

### 数据库操作
```csharp
// 查询
DataTable dt = Config.DataBase.GetTable(sql, parameters);
DataTable dt = Config.DataBaseList["GYBASE"].GetTable(sql);

// 增删改
Config.DataBase.InsertRow("TABLE_NAME", dataRow);
Config.DataBase.UpdateRow("TABLE_NAME", dataRow);
Config.DataBase.DeleteRow("TABLE_NAME", dataRow);
Config.DataBase.ExecuteNonQuery(sql, parameters);

// SQL模板
string sql = Config.SqlExec.GetSqlText("QUERY_KEY");
```

### 窗体服务
```csharp
Config.FormService.Show(title, viewName, busName, params);
Config.FormService.ShowDialog(title, viewName, busName, params);
Config.Result // 获取对话框返回值
```

### 用户信息
```csharp
Config.UserID      // 当前用户ID
Config.UserName    // 当前用户名
Config.DataList    // 共享数据字典
```

## 标准功能按钮实现

MES系统中常用的标准功能按钮实现方法，这些是项目通用的实现模式。

### 1. 导出Excel
```csharp
/// <summary>
/// 导出到EXCEL
/// </summary>
public override void BtnExcel_Click(object sender, EventArgs e)
{
    GrdMain.Excel(this.ViewForm.Text);
}
```
- 使用 `GrdMain.Excel()` 方法
- 传入窗体标题 `this.ViewForm.Text` 作为导出文件名
- Grid控件自动处理导出逻辑和文件保存位置选择

### 2. 打印
```csharp
/// <summary>
/// 打印
/// </summary>
public override void BtnPrint_Click(object sender, EventArgs e)
{
    GrdMain.Print(this.ViewForm.Text);
}
```
- 使用 `GrdMain.Print()` 方法
- 传入窗体标题作为打印标题
- Grid控件自动处理打印预览和打印

### 3. 查询
```csharp
/// <summary>
/// 查询
/// </summary>
public override void BtnQuery_Click(object sender, EventArgs e)
{
    GetData();
}
```

### 4. 刷新
```csharp
/// <summary>
/// 刷新
/// </summary>
public void BtnRefresh_Click(object sender, EventArgs e)
{
    // 清空查询条件（可选）
    txtCode.Text = "";
    txtName.Text = "";
    
    // 重新加载数据
    GetData();
    
    MessageService.ShowMessage("刷新成功！");
}
```

### 5. 新增
```csharp
/// <summary>
/// 新增
/// </summary>
public override void BtnNew_Click(object sender, EventArgs e)
{
    GrdMain.NewRow();
    GetData();
}
```

### 6. 修改/编辑
```csharp
/// <summary>
/// 修改
/// </summary>
public override void BtnEdit_Click(object sender, EventArgs e)
{
    if (GrdMain.CurrentRow == null)
    {
        MessageService.ShowError("请选择一行数据!");
        return;
    }
    GrdMain.EditRow();
    GetData();
}
```

### 7. 删除
```csharp
/// <summary>
/// 删除
/// </summary>
public override void BtnDelete_Click(object sender, EventArgs e)
{
    if (GrdMain.CurrentRow == null)
    {
        MessageService.ShowError("请选择一行数据!");
        return;
    }
    else if (MessageService.ShowAsk("是否要删除这条数据？") == DialogResult.OK)
    {
        GrdMain.DeleteRow();
    }
    GetData();
}
```

### 8. 统计（只读功能）
```csharp
/// <summary>
/// 统计
/// </summary>
public void BtnStatistics_Click(object sender, EventArgs e)
{
    if (dt == null || dt.Rows.Count == 0)
    {
        MessageService.ShowError("没有数据可统计！");
        return;
    }

    int totalCount = dt.Rows.Count;
    int validCount = 0;

    foreach (DataRow row in dt.Rows)
    {
        if (!string.IsNullOrEmpty(row["STATUS"].ToString()))
        {
            validCount++;
        }
    }

    string statistics = string.Format(
        "统计信息：\n\n" +
        "总记录数：{0}\n" +
        "有效数量：{1}\n" +
        "无效数量：{2}",
        totalCount,
        validCount,
        totalCount - validCount
    );

    MessageService.ShowMessage(statistics);
}
```

### 按钮命名约定

BUS类中的按钮事件方法必须遵循以下命名规则，才能与VIEW中的按钮自动绑定：

| VIEW按钮Name | BUS事件方法 | 说明 |
|-------------|------------|------|
| BtnQuery | BtnQuery_Click | 查询按钮 |
| BtnExcel | BtnExcel_Click | 导出Excel按钮 |
| BtnPrint | BtnPrint_Click | 打印按钮 |
| BtnNew | BtnNew_Click | 新增按钮 |
| BtnEdit | BtnEdit_Click | 编辑按钮 |
| BtnDelete | BtnDelete_Click | 删除按钮 |
| BtnRefresh | BtnRefresh_Click | 刷新按钮 |
| BtnSave | BtnSave_Click | 保存按钮 |
| BtnCancel | BtnCancel_Click | 取消按钮 |
| BtnOK | BtnOK_Click | 确定按钮（对话框） |

**重要提示**：
- VIEW中按钮的 `Name` 属性必须与BUS中的方法名前缀一致
- 例如：VIEW中 `Name="BtnQuery"` → BUS中 `BtnQuery_Click()`
- 方法签名必须是 `public void/override void MethodName(object sender, EventArgs e)`

## 数据字典映射与下拉框数据源规范

MES管理端中绝大部分业务数据在数据库中存储为精简代码（如 `1/2/3`、`Y/N/B`、`A/B/C`），在前端展示及下拉筛选时必须遵循系统标准字典映射体系。

### 1. 核心常用数据字典对照表（EDA0004）

系统通用代码表为 `EDA0004`（`DIV` 为分类标识，`DCOD` 为业务代码，`DNAM` 为中文名称）：

| 业务含义 | 常见物理字段 | EDA0004 `DIV` 分类 | 核心代码与中文映射对照 |
| :--- | :--- | :--- | :--- |
| **生产类型** | `ASTATE` / `PLAN_STATE` | **`PLAN_STATE`** | `1` $\rightarrow$ **量产**、`2` $\rightarrow$ **试产**、`3` $\rightarrow$ **首件**、`4` $\rightarrow$ **返修**、`5` $\rightarrow$ **补录** |
| **上传方式** | `NORMALSTA` / `AUTOUPLOAD` | **`NORMALSTA`** | `B` $\rightarrow$ **扫描枪上传**、`Y` $\rightarrow$ **自动上传**、`N` $\rightarrow$ **MES上传**、`P` $\rightarrow$ **PDA上传**、`L` $\rightarrow$ **LCC手动上传** |
| **生产班次** | `AUSHT` / `WSHT` | **`SHT`** | `1` $\rightarrow$ **早班**、`2` $\rightarrow$ **中班**、`3` $\rightarrow$ **夜班** |
| **生产班组** | `AUBAN` / `WBAN` | *(现场字母规范)* | **原生展示字母 `A`、`B`、`C`、`D`**（部分车间展示为甲/乙/丙/丁） |
| **物料状态** | `STYN` / `STATUS` | **`QC_HRESULT`** | `A`/`1` $\rightarrow$ **正常/合格**、`B`/`2` $\rightarrow$ **冻结**、`C`/`3` $\rightarrow$ **报废** |
| **物料分类** | `DIV` / `ITTYPECOD` | `EDD0003` (主数据) | `WHERE ITGRPCOD='HALF' AND IS_USE='1'` $\rightarrow$ `ITTYPENAM` |

---

### 2. 字段字典映射实现方式（首选 SQL 关联）

**最佳实践**：优先在 SQL 查询层通过 `LEFT JOIN EDA0004` 完成字典转换，确保**界面呈现、列头排序、以及导出 Excel** 三者结果 100% 保持为业务中文。

```sql
SELECT 
    A.LOTID,
    -- 班次映射
    CASE 
        WHEN D_SHT.DNAM IS NOT NULL THEN D_SHT.DNAM
        WHEN A.AUSHT = '1' THEN '早班' 
        WHEN A.AUSHT = '2' THEN '中班' 
        WHEN A.AUSHT = '3' THEN '夜班' 
        ELSE ISNULL(A.AUSHT, '') 
    END AS WSHT,
    -- 班组直接显示字母
    ISNULL(A.AUBAN, '') AS WBAN,
    -- 生产类型映射
    CASE 
        WHEN D_STATE.DNAM IS NOT NULL THEN D_STATE.DNAM
        WHEN A.ASTATE = '1' THEN '量产'
        ELSE ISNULL(A.ASTATE, '量产') 
    END AS PROD_TYPE,
    -- 上传方式映射
    CASE 
        WHEN D_NORM.DNAM IS NOT NULL THEN D_NORM.DNAM
        WHEN A.NORMALSTA = 'B' THEN '扫描枪上传'
        WHEN A.NORMALSTA = 'Y' THEN '自动上传'
        ELSE ISNULL(A.NORMALSTA, '自动上传') 
    END AS UPLOAD_MODE
FROM LTC0001 A WITH(NOLOCK)
LEFT JOIN EDA0004 D_SHT WITH(NOLOCK) ON A.AUSHT = D_SHT.DCOD AND D_SHT.DIV = 'SHT'
LEFT JOIN EDA0004 D_STATE WITH(NOLOCK) ON A.ASTATE = D_STATE.DCOD AND D_STATE.DIV = 'PLAN_STATE'
LEFT JOIN EDA0004 D_NORM WITH(NOLOCK) ON A.NORMALSTA = D_NORM.DCOD AND D_NORM.DIV = 'NORMALSTA'
```

---

### 3. 下拉筛选框标准构建规范（★严格固化【全部】对应 `%%`）

所有搜索栏与筛选下拉框（ComboBox）初始化时必须严格遵循以下规范：
1. **严禁硬编码纯字符串简单追加**（如 `Items.Add("全部")`）；
2. **统一采用 DataTable 构建 `DisplayMember` 与 `ValueMember` 键值对**；
3. **首行必须插入【全部】，其 Value 必须统一固化为 `"%%"`（双百分号），并设置 `SelectedIndex = 0` 作为默认值**；
4. **与 SQL 查询通配完美衔接**：在 SQL 查询中使用 `WHERE COL LIKE '{cmb.SelectedValue}'`，当用户选择【全部】时，生成的 SQL 自动为 `WHERE COL LIKE '%%'`，可直接匹配所有非 NULL 记录，无需编写繁琐的 `if-else` 条件拼接判断。

根据数据库配置表的情况，分为以下两种标准开发模式：

#### 场景一：标准场景 —— 数据库配置表/字典表已有数据（查询返回 + 动态注入【全部】）
* **适用场景**：数据在 `EDA0004`、业务主数据表（如机台表 `EDA0001`、库区表 `STA0111`、部门表）中已有完整维护。
* **开发模式**：查询返回已有的业务明细 `DataTable`，在**第 0 行**动态插入虚拟的“全部”行（值固化为 `%%`）：

```csharp
// 1. 从数据字典表或业务表查出实际业务明细内容
DataTable dtSHT = CmnCode.GetCboCode("SHT"); // 例如查出早班、中班、夜班等实际数据

// 2. 向首行动态插入虚拟的“全部”行 (★必须使用 InsertAt 插入第 0 行，值固化为 %%)
DataRow rowAll = dtSHT.NewRow();
rowAll["DCOD"] = "%%";   // 代号设为通配符 %%
rowAll["DNAM"] = "全部"; // 界面显示中文“全部”
dtSHT.Rows.InsertAt(rowAll, 0);

// 3. 绑定到 ComboBox 控件
cboCUSHT.DataSource = dtSHT;
cboCUSHT.DisplayMember = "DNAM"; // 界面显示字段
cboCUSHT.ValueMember = "DCOD";   // 后台真实值字段
cboCUSHT.SelectedValue = "%%";   // 默认选中全部
```

#### 场景二：特殊场景 —— 映射表/配置表中缺失数据（手动全量补充构建 DataTable）
* **适用场景**：
  * ① 字典表 `EDA0004` 中未录入该业务项或缺乏固定后台配置表支撑；
  * ② 现场特定定制的业务选项（如班组字母 `A/B/C/D`、特定质检开关、固定状态标记 `1/0`）；
  * ③ 需要自定义展示白名单或特殊排序的选项。
* **开发模式**：代码中手动 `new DataTable()`，**首行必须首先写入【全部】（值为 `%%`），随后手动逐行补充业务所必需的全部数据行**：

```csharp
private void FillShiftAndGroup()
{
    // 手动全量构建 DataTable（配置表无对应字典或特殊自定义时使用）
    DataTable dtCustom = new DataTable();
    dtCustom.Columns.Add("Name", typeof(string));
    dtCustom.Columns.Add("Value", typeof(string));

    // 1. 首行必须首先插入【全部】，值严格固化为 %%
    dtCustom.Rows.Add("全部", "%%");

    // 2. 手动补充缺失的全部实际业务数据行
    dtCustom.Rows.Add("启用", "1");
    dtCustom.Rows.Add("停用", "0");
    dtCustom.Rows.Add("待检", "2");

    // 3. 绑定 ComboBox
    CmbStatus.DataSource = dtCustom;
    CmbStatus.DisplayMember = "Name";
    CmbStatus.ValueMember = "Value";
    CmbStatus.SelectedIndex = 0; // 默认选中“全部”
}
```

#### SQL 查询条件过滤逻辑（双模式兼容）：
```csharp
// 模式 A：直接利用 LIKE '{0}' 通配 (最精炼推荐模式)
// 当选“全部”时直接生成 WHERE A.AUSHT LIKE '%%'，选具体项时匹配具体项
string sql = "SELECT * FROM TABLE WHERE AUSHT LIKE '{0}'";
string runSql = string.Format(sql, CmbWSHT.SelectedValue);

// 模式 B：动态判断排除“全部”
if (CmbWSHT != null && CmbWSHT.SelectedValue != null && CmbWSHT.SelectedValue.ToString() != "%%")
{
    sbWhere.AppendFormat(" AND (A.AUSHT = '{0}' OR A.AUSHT = '{1}')", CmbWSHT.SelectedValue, CmbWSHT.Text);
}
```

### 4. 表格事件层动态转换规范（★核心：GrdMain_OnFormat 与 OnQuerySet）

当页面使用存储过程、`SELECT *` 或复用底层 SQL 查询，导致 SQL 结果集中包含原始业务代码（如 `1/2/3`、`0/1`、外键编码）时，**必须在 BUS 类中通过 `GrdMain_OnFormat` 事件进行动态值转换与字典翻译**。

#### 1. GrdMain_OnFormat 契约与用法
- **自动联动**：单元格渲染、`GrdMain.Excel()` 导出、`GrdMain.Print()` 打印时统一自动触发。
- **命名规范**：`{GridName}_OnFormat(object sender, UserControls.LSFormatEventArgs e)`

```csharp
// 1. 服务引用与内存缓存变量
GetCmncode CmnCode { get { return this.GetService(typeof(ICMNCODE)) as GetCmncode; } }
DataTable dtRuleCode;

// 2. 在 Form_Load 提前拉取字典数据
public override void Form_Load(object sender, EventArgs e)
{
    base.Form_Load(sender, e);
    // 提前缓存字典表，严禁在 OnFormat 中查库！
    dtRuleCode = CmnCode.GetCboCode("CKA_RULE");
    GetData();
}

// 3. 事件动态翻译
public void GrdMain_OnFormat(object sender, UserControls.LSFormatEventArgs e)
{
    // A. 字典映射（EDA0004）
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
    // B. 固定状态映射（switch-case）
    else if (e.ColName == "PRINTSETA")
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

#### 2. 表头筛选下拉项同步映射（GrdMain_OnQuerySet）
如果表格支持列头漏斗筛选，必须同时实现 `OnQuerySet` 事件，让用户在下拉框中看到中文名称：

```csharp
public void GrdMain_OnQuerySet(object sender, UserControls.LSQuerySetEventArgs e)
{
    if (e.ColName == "RULE2" && dtRuleCode != null)
    {
        foreach (DataRow item in dtRuleCode.Rows)
        {
            // Key: 实际过滤值(代码), Value: 下拉显示文本(中文名称)
            e.DrowDownList.Add(item["DCOD"].ToString(), item["DNAM"].ToString());
        }
    }
}
```

#### 3. ★ 性能军规
> [!CAUTION]
> **严禁在 `OnFormat` 中调用 `Config.DataBase.GetTable(...)` 或任何数据库查询！**
> `OnFormat` 会针对可见区域及翻页的每个单元格高频触发（可能达数万次）。在 `OnFormat` 内执行 SQL 会导致界面严重卡死。必须在 `Form_Load` 时将字典表预先加载到内存变量中。

## 常见问题和注意事项

### 1. 控件获取失败
**问题**: `GetControlByName("GrdMain")` 返回null
**原因**: VIEW中控件的Name属性与BUS中字符串不一致
**解决**: 检查VIEW设计器中控件的Name属性

### 2. EditSerializable未生效
**问题**: LSDataGrid列显示不正确
**原因**: 
- .resx中缺少`GrdMain.EditSerializable`资源
- Designer.cs中未加载资源
- DataColumn与SQL列名不匹配

**解决**:
```csharp
// 必须在Designer.cs中添加
this.GrdMain.EditSerializable = resources.GetString("GrdMain.EditSerializable");
```

### 3. 数据绑定问题
**问题**: Grid无数据或列绑定错误
**原因**: Cells.DataColumn与SQL返回列名不匹配
**解决**: 
- 检查BUS的SQL查询
- 确保EditSerializable中的DataColumn完全匹配（包括别名）

### 4. 子对话框数据不回传
**问题**: 编辑后主页面数据未更新
**原因**: 
- 子BUS未正确修改传入的DataRow
- 子BUS未调用`base.BtnOK_Click`设置Result

**解决**:
```csharp
public override void BtnOK_Click(object sender, EventArgs e)
{
    row["FIELD"] = txtValue.Text; // 修改DataRow
    base.BtnOK_Click(sender, e);  // 必须调用，设置Result = "OK"
}
```

### 5. Grid事件处理错误
**问题**: 新增/编辑时出现重复行或数据丢失
**原因**: 对Grid数据操作理解错误

**正确做法**:
- `e.Row` 是当前操作的行（Grid已创建并附加到DataTable）
- 不要在`ChangeType.New`时再次Add该行
- 传递DataRow到子对话框，通过引用修改

### 6. 命名空间错误
**问题**: 编译时找不到类型
**解决**: 
- 检查using语句
- 确保项目引用了必要的程序集
- 检查类的命名空间声明

### 7. 资源文件编码问题
**问题**: .resx文件中文显示乱码
**解决**: 
- 确保文件以UTF-8或GBK编码保存
- 使用Visual Studio的资源编辑器

## 检查清单

新建页面完成前的检查：

- [ ] BUS文件已创建并添加到项目
- [ ] VIEW文件已创建并添加到项目
- [ ] 控件Name属性与BUS中GetControlByName一致
- [ ] LSDataGrid的EditSerializable已配置
- [ ] EditSerializable的DataColumn与SQL列名完全匹配
- [ ] Designer.cs中加载了EditSerializable资源
- [ ] 子对话框构造函数接受正确的参数
- [ ] 子对话框BUS调用了base.BtnOK_Click
- [ ] 项目引用正确
- [ ] 编译无错误

## 参考示例

查看现有页面作为参考：
- 简单查询页面: `STC0001B/W`
- 带子对话框的页面: `CKA0003B/W/B1/W1`
- 复杂Grid配置: 查看对应的.resx文件
