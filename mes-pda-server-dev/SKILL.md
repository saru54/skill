---
name: mes-pda-server-dev
description: MES移动端PDA服务端/后端接口开发规范。基于.NET 4.0 + ASHX + BLL + DAL + SQL Server/Oracle技术栈，涵盖多工厂隔离、异质数据库访问、Messaging契约与异常日志记录。
---

# MES 移动端 PDA 服务端开发规范 (mes-pda-server-dev)

> [!IMPORTANT]
> **全栈协作入口**：本技能负责 PDA 移动端的服务端开发（`04-服务器端程序\LonSon.Mobile.PrinxChengShan.App.Web`）。若任务同时涉及**前端 H5/Vue 页面开发**，请协同调用 **`mes-pda-dev`** 技能，或参考 **`mes-router`** 中的【配方 B：PDA 端到端全栈开发】。

---

## 1. 技术栈与解决方案架构

* **开发框架**：.NET Framework 4.0 / C# / ASP.NET Web Handler (`.ashx`)
* **工程路径**：`<MES_ROOT>\04-服务器端程序\LonSon.Mobile.PrinxChengShan.App.Web`
* **解决方案组成**：
  * **`Web\Ashx\`**：HTTP 接口统一入口（负责接收请求并转发给 BLL）。
  * **`Mobile.PrinxChengShan.Bll\`**：业务逻辑层（负责参数解析、Action 路由、多语言读取、权限与异常捕获）。
  * **`Mobile.PrinxChengShan.Dal\`**：数据访问层（负责 SQL 拼接、存储过程调用、异构数据库连接与事务回滚）。
  * **`Mobile.PrinxChengShan.Model\`**：数据契约与实体层（包含核心通信包装类 `Messaging<T>` 及各业务实体）。
  * **`Mobile.PrinxChengShan.Util\`**：基础工具库（`OracleHelper`、`XmlHelper`、`ProcedureHelper`）。
  * **`DataOperate.Net\`**：数据库操作底层库（`MsSqlHelper`、`JsonHelper`、`ConfigIni`）。

---

## 2. 核心通信契约与返回结构 (Messaging Protocol)

PDA 前后端统一采用 `Mobile.PrinxChengShan.Model.Messaging<T>` 作为序列化数据包：

```csharp
[Serializable]
public class Messaging<T>
{
    public string ErrCode { get; set; } // "0" 表示成功，非 "0" (如 "500", "400", "1") 表示失败
    public string Error { get; set; }   // 提示信息或错误消息文本
    public T Info { get; set; }         // 泛型附加信息
    public DataTable TL { get; set; }   // 主要返回的数据集 (前端一般通过 data.TL 遍历)
    public DataTable TB { get; set; }   // 备用数据集 (次要列表或汇总信息)
}
```

* **成功返回**：`JsonHelper<Messaging<string>>.EntityToJson(new Messaging<string>("0", "操作成功", dataTable))`
* **失败返回**：`JsonHelper<Messaging<string>>.EntityToJson(new Messaging<string>("1", "条码不存在或已被使用！"))`
* **异常返回**：
  ```csharp
  catch (Exception ex)
  {
      SystemErrorPlug.ErrorRecord(ex.ToString());
      return JsonHelper<Messaging<string>>.EntityToJson(new Messaging<string>("500", ex.Message.Trim().Replace("\r\n", "")));
  }
  ```

---

## 3. 异构数据库与多工厂访问规范

系统涉及多个数据库源与工厂环境，在 DAL 层必须根据业务归属选择正确的 Helper：

| 业务场景 / 目标库 | 对应 Helper / 连接串 | 典型应用 |
| :--- | :--- | :--- |
| **MES 主业务库 (PLMES)** | `new MsSqlHelper()` (`DatabaseConnectivity`) | 胎胚、硫化、成型、质检、车间线边库等核心业务 |
| **WMS 立库系统 (orclcdb)** | `new OracleHelper()` (`OracleConnection`) | 原材料立库、成品立库、出入库指令交互 |
| **外围设备/接口库** | `MsSqlHelper` (`DatabaseInter` / `PLMESINTERFACE`) | X光机台接口、动平衡接口、立库交互表 `IF_WMS_GT_02` |
| **系统日志库 (LONSONLOG)** | `MsSqlHelper` (`DatabaseLog`) | PDA 扫码日志、操作履历记录 |
| **泰国工厂专属库** | `MsSqlHelper` (`THAI_DATA`) | 泰国工厂专属业务数据 |

### 3.1 强制性 SQL 编码规范
1. **SQL 注释标记**：所有在代码中编写的 SQL 必须带上 `/*PDASQL*/` 标识，便于日志分析与 DBA 监控（例：`SELECT * FROM WIP0002/*PDASQL*/ WHERE ...`）。
2. **多工厂条件隔离**：涉及业务表的增删改查必须带入 `FAC` 参数（如 `WHERE FAC = '{0}'`），严禁跨工厂串数据。
3. **单引号防注入**：拼接入参时必须对用户输入执行过滤或参数化，防止 SQL 语法被截断抛错。
4. **事务完整性**：对于涉及“移库 + 状态变更 + 插入日志”的多步写操作，必须拼装为批处理 SQL 字符串调用 `db.ExecuteNonQuery(sqlString)` 或使用标准事务。

---

## 4. 标准代码脚手架 (Boilerplate)

### 4.1 ASHX 接口入口 (`Web/Ashx/Xxx.ashx`)
```csharp
<%@ WebHandler Language="C#" Class="Xxx" %>

using System;
using System.Web;
using System.Web.SessionState;
using Mobile.PrinxChengShan.Bll;

public class Xxx : IHttpHandler, IReadOnlySessionState 
{
    public void ProcessRequest (HttpContext context) 
    {
        // 跨域头支持已在 Web.config 全局配置
        context.Response.ContentType = "text/plain";
        context.Response.Write(new XxxBll().ProcessRequest(context));
    }
 
    public bool IsReusable 
    {
        get { return false; }
    }
}
```

### 4.2 BLL 业务逻辑层 (`Mobile.PrinxChengShan.Bll/XxxBll.cs`)
```csharp
using System;
using System.Data;
using System.Web;
using DataOperate.Net;
using Mobile.PrinxChengShan.Dal;
using Mobile.PrinxChengShan.Model;
using Mobile.PrinxChengShan.Util;

namespace Mobile.PrinxChengShan.Bll
{
    public class XxxBll
    {
        private XmlHelper xml = null;
        private XxxDal dal = null;

        public XxxBll()
        {
            dal = new XxxDal();
            xml = new XmlHelper();
        }

        public string ProcessRequest(HttpContext context)
        {
            // 1. 多语言支持解析
            string _lang = "CHN";
            try
            {
                string lang = context.Request["lang"] as string;
                if (!string.IsNullOrEmpty(lang)) _lang = lang;
            }
            catch { _lang = "CHN"; }
            xml.FilePath = context.Server.MapPath(string.Format("~/Language/{0}.xml", _lang));

            // 2. 提取 Action 动作
            string action = string.Empty;
            try { action = context.Request["action"].ToString(); }
            catch { action = string.Empty; }

            string returnData = string.Empty;
            switch (action.ToLower())
            {
                case "sel":
                case "list":
                    returnData = GetDataList(context);
                    break;
                case "save":
                case "up":
                    returnData = SaveData(context);
                    break;
                default:
                    returnData = JsonHelper<Messaging<string>>.EntityToJson(
                        new Messaging<string>("404", xml.ReadLandXml("404") ?? "未找到对应的接口方法")
                    );
                    break;
            }
            return returnData;
        }

        // 查询方法示例
        private string GetDataList(HttpContext context)
        {
            try
            {
                string barcode = (context.Request["BARCODE"] ?? "").Trim();
                string fac = (context.Request["FAC"] ?? "").Trim();

                if (string.IsNullOrEmpty(barcode))
                {
                    return JsonHelper<Messaging<string>>.EntityToJson(new Messaging<string>("1", "条码不能为空"));
                }

                DataTable dt = dal.GetBarcodeInfo(barcode, fac);
                if (dt != null && dt.Rows.Count > 0)
                {
                    return JsonHelper<Messaging<string>>.EntityToJson(new Messaging<string>("0", "查询成功", dt));
                }
                else
                {
                    return JsonHelper<Messaging<string>>.EntityToJson(new Messaging<string>("1", "未查询到对应条码信息"));
                }
            }
            catch (Exception ex)
            {
                SystemErrorPlug.ErrorRecord(ex.ToString());
                return JsonHelper<Messaging<string>>.EntityToJson(new Messaging<string>("500", ex.Message.Trim().Replace("\r\n", "")));
            }
        }

        // 提交方法示例
        private string SaveData(HttpContext context)
        {
            try
            {
                string barcode = (context.Request["BARCODE"] ?? "").Trim();
                string fac = (context.Request["FAC"] ?? "").Trim();
                string loginName = (context.Request["LOGINNAM"] ?? "").Trim();
                string userName = (context.Request["ENAM"] ?? "").Trim();

                bool result = dal.SubmitRecord(barcode, fac, loginName, userName);
                if (result)
                {
                    return JsonHelper<Messaging<string>>.EntityToJson(new Messaging<string>("0", "提交成功"));
                }
                else
                {
                    return JsonHelper<Messaging<string>>.EntityToJson(new Messaging<string>("1", "提交失败，请重试"));
                }
            }
            catch (Exception ex)
            {
                SystemErrorPlug.ErrorRecord(ex.ToString());
                return JsonHelper<Messaging<string>>.EntityToJson(new Messaging<string>("500", ex.Message.Trim().Replace("\r\n", "")));
            }
        }
    }
}
```

### 4.3 DAL 数据访问层 (`Mobile.PrinxChengShan.Dal/XxxDal.cs`)
```csharp
using System;
using System.Data;
using System.Text;
using DataOperate.Net;
using Mobile.PrinxChengShan.Model;

namespace Mobile.PrinxChengShan.Dal
{
    public class XxxDal
    {
        private MsSqlHelper db = null;

        public XxxDal()
        {
            db = new MsSqlHelper();
        }

        public DataTable GetBarcodeInfo(string barcode, string fac)
        {
            string sql = string.Format(@"
SELECT TOP 1 BARCODE, SPEC, ITNBR, ITDSC, FAC, WDATE, WSHT, WBAN 
FROM WIP0002 (NOLOCK)/*PDASQL*/ 
WHERE BARCODE = '{0}' AND FAC = '{1}'", 
            barcode.Replace("'", "''"), 
            fac.Replace("'", "''"));

            return db.ExecuteDataTable(sql);
        }

        public bool SubmitRecord(string barcode, string fac, string loginName, string userName)
        {
            StringBuilder sb = new StringBuilder();
            
            // 1. 状态更新
            sb.AppendLine(string.Format(@"
UPDATE WIP0002/*PDASQL*/ 
SET STA = '1', ENAM = '{0}', LOGINNAM = '{1}', UPDTIM = GETDATE() 
WHERE BARCODE = '{2}' AND FAC = '{3}';", 
            userName.Replace("'", "''"), 
            loginName.Replace("'", "''"), 
            barcode.Replace("'", "''"), 
            fac.Replace("'", "''")));

            // 2. 插入履历日志
            sb.AppendLine(string.Format(@"
INSERT INTO WIP0002_LOG/*PDASQL*/(FAC, BARCODE, OPERATION, OPTIM, OPNAM, OPLOGINNAM) 
VALUES('{0}', '{1}', 'PDA_SCAN', GETDATE(), '{2}', '{3}');", 
            fac.Replace("'", "''"), 
            barcode.Replace("'", "''"), 
            userName.Replace("'", "''"), 
            loginName.Replace("'", "''")));

            try
            {
                return db.ExecuteNonQuery(sb.ToString()) > 0;
            }
            catch (Exception ex)
            {
                ComUtilDal.SqlRecord("PDA提交异常: " + ex.Message + "; SQL: " + sb.ToString());
                throw;
            }
        }
    }
}
```

---

## 5. 开发避坑与安全质量清单 (Checklist)

- [ ] **Action 大小写容错**：`switch (action.ToLower())` 确保前端调用时无论大写/小写均能路由命中。
- [ ] **换行符过滤**：异常返回的 `ex.Message` 必须执行 `.Replace("\r\n", "")`，避免破坏 JSON 序列化结构。
- [ ] **日志记录**：异常时必须调用 `SystemErrorPlug.ErrorRecord(ex.ToString())` 记录到本地/数据库日志中。
- [ ] **SQL 注入防护**：使用 `.Replace("'", "''")` 或参数化查询清洗字符串参数。
- [ ] **多工厂隔离验证**：查询与写入是否包含 `FAC = '{0}'` 条件。
- [ ] **连接与资源释放**：使用 `OracleHelper` 时必须在 `using` 或 `finally` 中保证 `Dispose()` 释放 Oracle 连接池。
