/**
 * MES PDA 脚手架生成器 (scaffold_pda_feature.js)
 * 运行方式: node scaffold_pda_feature.js --module <模块名> --page <页面名> --title <中文标题> [--ashx <接口名>] [--root <项目根目录>]
 * 示例: node scaffold_pda_feature.js --module AllSteelHalf --page MoveDemo --title 移库测试
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
function getArg(key, defaultValue = '') {
    const index = args.indexOf('--' + key);
    if (index !== -1 && index + 1 < args.length) {
        return args[index + 1];
    }
    return defaultValue;
}

// 动态向上探测 MES 根目录（寻找包含 03-PDA 或 04-服务器端程序 的目录）
function findMesRoot(startDir) {
    let current = path.resolve(startDir || process.cwd());
    while (true) {
        const pdaExists = fs.existsSync(path.join(current, '03-PDA'));
        const serverExists = fs.existsSync(path.join(current, '04-服务器端程序'));
        const adminExists = fs.existsSync(path.join(current, '05-MES管理端'));

        if (pdaExists || serverExists || adminExists) {
            return current;
        }

        const parent = path.dirname(current);
        if (parent === current) {
            break; // 到达盘符根目录
        }
        current = parent;
    }
    return null;
}

const moduleName = getArg('module');
const pageName = getArg('page');
const title = getArg('title');
const ashxName = getArg('ashx') || pageName;
const customRoot = getArg('root') || process.env.MES_ROOT;

if (!moduleName || !pageName || !title) {
    console.log('❌ 参数缺失！用法:');
    console.log('node scaffold_pda_feature.js --module <模块名> --page <页面名> --title <中文标题> [--ashx <接口名>] [--root <根目录>]');
    process.exit(1);
}

// 自动解析根目录
const detectedRoot = customRoot || findMesRoot(process.cwd()) || findMesRoot(__dirname) || 'd:\\mes\\mes-major';
const MES_ROOT = path.resolve(detectedRoot);

const PDA_FE_DIR = path.join(MES_ROOT, '03-PDA', 'LonSon.Mobile.PrinxChengShan.App');
const PDA_BE_DIR = path.join(MES_ROOT, '04-服务器端程序', 'LonSon.Mobile.PrinxChengShan.App.Web');

console.log(`🧭 当前检测到 MES 根目录: ${MES_ROOT}`);

const jsName = `${pageName}.js`;

const HTML_CONTENT = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1,maximum-scale=1,user-scalable=no" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black" />
    
    <link rel="stylesheet" href="../css/mui.min.css" />
    <link rel="stylesheet" type="text/css" href="../css/mui.picker.min.css" />
    <link rel="stylesheet" href="../css/comStyle.css" />
    
    <!-- 引入 Vue 2 -->
    <script src="../JavaScript/vue@2.js"></script>
</head>
<body>
    <div id="app">
        <!-- 顶部导航栏 -->
        <header class="mui-bar mui-bar-nav">
            <a class="mui-action-back mui-icon mui-icon-left-nav mui-pull-left"></a>
            <h1 class="mui-title"><label id="lblTitle">${title}</label></h1>
        </header>

        <!-- 主内容区 -->
        <div class="mui-content">
            <div class="mui-content-padded">
                <form class="mui-input-group">
                    <!-- 扫码输入行 -->
                    <div class="mui-input-row">
                        <button type="button" id="btnSel" @click="handleQuery" class="mui-btn mui-btn-primary" style="width: 40px; height:35px;">
                            <span class="mui-icon mui-icon-search"></span>
                        </button>
                        <input type="text" 
                               ref="barcodeInput" 
                               v-model.trim="barcode" 
                               @keyup="handleBarcodeKeyup" 
                               placeholder="扫描条码... " 
                               class="mui-input" />
                    </div>

                    <!-- 物料信息展示 -->
                    <div class="mui-input-row">
                        <label>物料信息:</label>
                        <input type="text" v-model="materialInfo" readonly class="mui-input" style="font-weight:bold;">
                    </div>

                    <!-- 数量输入行 -->
                    <div class="mui-input-row">
                        <label>数量:</label>
                        <input type="number" v-model.number="quantity" class="mui-input" placeholder="请输入数量">
                    </div>
                </form>

                <!-- 操作按钮区 -->
                <br/>
                <div style="text-align: center;">
                    <button type="button" class="mui-btn mui-btn-danger mui-action-back"><label>返回</label></button>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                    <button type="button" @click="handleSubmit" class="mui-btn mui-btn-primary"><label>确定</label></button>
                </div>
            </div>

            <!-- 底部固定用户信息栏 -->
            <br/><br/><br/>
            <nav class="mui-bar mui-bar-tab">
                <a class="mui-tab-item">
                    <label>用户:</label><span>{{ userName }}</span>
                </a>
                <a class="mui-tab-item">
                    <span>{{ facName }}</span>
                </a>
            </nav>
        </div>
    </div>

    <!-- 底部脚本 -->
    <script src="../js/mui.min.js"></script>
    <script src="../js/utilComm.js"></script>
    <script src="../js/${jsName}"></script>
</body>
</html>
`;

const JS_CONTENT = `var storage = window.localStorage || {};

new Vue({
    el: '#app',
    data: {
        userName: storage["NAME"] || '',
        facName: storage["FACNM"] ? ("FTY." + storage["FACNM"]) : '',
        barcode: '',
        materialInfo: '',
        quantity: 1,
        loading: false
    },
    methods: {
        /*
         * 条码输入框键盘弹起事件（兼容 PDA 硬件回车符：keyCode = 13 或 0）
         */
        handleBarcodeKeyup: function(event) {
            if (event.keyCode === 13 || event.keyCode === 0) {
                this.handleScan();
            }
        },

        /*
         * 条码扫描与校验逻辑
         */
        handleScan: function() {
            var code = (this.barcode || '').trim();
            if (!code) {
                if (this.$refs.barcodeInput) this.$refs.barcodeInput.focus();
                return;
            }

            // 1. 条码格式规则校验（utilComm.js 中的通用方法）
            if (typeof CheckBarcodeLengthClick === 'function' && !CheckBarcodeLengthClick(code)) {
                mui.toast("条码长度格式不正确!", { duration: 'long', type: 'div' });
                this.barcode = '';
                if (this.$refs.barcodeInput) this.$refs.barcodeInput.focus();
                return;
            }

            // 2. 发起接口查询
            this.queryData(code);
        },

        // 数据查询请求
        queryData: function(code) {
            var _this = this;
            mui.ajax(requestPath + '/ashx/${ashxName}.ashx', {
                data: {
                    action: "sel",
                    BARCODE: code,
                    FAC: storage["FAC"],
                    ENAM: storage["NAME"],
                    LOGINNAM: storage["LOGINNAME"],
                    Token: storage["Token"],
                    lang: storage["Language"]
                },
                dataType: 'json',
                type: 'post',
                timeout: 10000,
                success: function(data) {
                    if (data.ErrCode === "0") {
                        if (data.TL && data.TL.length > 0) {
                            _this.materialInfo = data.TL[0].ITDSC || data.TL[0].SPEC || '';
                        } else {
                            _this.materialInfo = data.Error || "获取成功";
                        }
                        mui.toast("查询成功", { duration: 'short', type: 'div' });
                    } else {
                        mui.alert(data.Error || "查询失败", "系统提示");
                    }
                    _this.barcode = '';
                    if (_this.$refs.barcodeInput) _this.$refs.barcodeInput.focus();
                },
                error: function() {
                    mui.toast("网络请求超时", { duration: 'short', type: 'div' });
                    _this.barcode = '';
                    if (_this.$refs.barcodeInput) _this.$refs.barcodeInput.focus();
                }
            });
        },

        // 查询按钮点击
        handleQuery: function() {
            if (this.barcode) {
                this.handleScan();
            } else {
                mui.toast("请输入或扫描条码", { duration: 'short', type: 'div' });
                if (this.$refs.barcodeInput) this.$refs.barcodeInput.focus();
            }
        },

        // 提交按钮
        handleSubmit: function() {
            var _this = this;
            if (!_this.materialInfo) {
                mui.alert("请先扫描并获取物料信息！");
                return;
            }

            mui.ajax(requestPath + '/ashx/${ashxName}.ashx', {
                data: {
                    action: "save",
                    BARCODE: _this.barcode || '',
                    QTY: _this.quantity,
                    FAC: storage["FAC"],
                    ENAM: storage["NAME"],
                    LOGINNAM: storage["LOGINNAME"],
                    Token: storage["Token"],
                    lang: storage["Language"]
                },
                dataType: 'json',
                type: 'post',
                timeout: 10000,
                success: function(data) {
                    if (data.ErrCode === "0") {
                        mui.toast(data.Error || "操作成功", { duration: 'short', type: 'div' });
                        _this.materialInfo = '';
                        _this.quantity = 1;
                    } else {
                        mui.alert(data.Error || "提交失败", "系统提示");
                    }
                    _this.barcode = '';
                    if (_this.$refs.barcodeInput) _this.$refs.barcodeInput.focus();
                },
                error: function() {
                    mui.toast("提交超时，请重试", { duration: 'short', type: 'div' });
                    if (_this.$refs.barcodeInput) _this.$refs.barcodeInput.focus();
                }
            });
        }
    },
    mounted: function() {
        var _this = this;
        mui.init();

        // 1. 页面初始化自动聚焦到扫码输入框
        this.$nextTick(function() {
            if (_this.$refs.barcodeInput) {
                _this.$refs.barcodeInput.focus();
            }
        });

        // 2. 全局按键拦截：当 PDA 物理扫码触发回车时，确保焦点自动切回扫码框
        document.onkeydown = function(event) {
            var e = event || window.event;
            if (e && (e.keyCode === 0 || e.keyCode === 13)) {
                if (_this.$refs.barcodeInput && document.activeElement !== _this.$refs.barcodeInput) {
                    _this.$refs.barcodeInput.focus();
                }
            }
        };
    }
});
`;

const ASHX_CONTENT = `<%@ WebHandler Language="C#" Class="${ashxName}" %>

using System;
using System.Web;
using System.Web.SessionState;
using Mobile.PrinxChengShan.Bll;

public class ${ashxName} : IHttpHandler, IReadOnlySessionState 
{
    public void ProcessRequest (HttpContext context) 
    {
        context.Response.ContentType = "text/plain";
        context.Response.Write(new ${ashxName}Bll().ProcessRequest(context));
    }
 
    public bool IsReusable 
    {
        get { return false; }
    }
}
`;

const BLL_CONTENT = `using System;
using System.Data;
using System.Web;
using DataOperate.Net;
using Mobile.PrinxChengShan.Dal;
using Mobile.PrinxChengShan.Model;
using Mobile.PrinxChengShan.Util;

namespace Mobile.PrinxChengShan.Bll
{
    public class ${ashxName}Bll
    {
        private XmlHelper xml = null;
        private ${ashxName}Dal dal = null;

        public ${ashxName}Bll()
        {
            dal = new ${ashxName}Dal();
            xml = new XmlHelper();
        }

        public string ProcessRequest(HttpContext context)
        {
            string _lang = "CHN";
            try
            {
                string lang = context.Request["lang"] as string;
                if (!string.IsNullOrEmpty(lang)) _lang = lang;
            }
            catch { _lang = "CHN"; }
            xml.FilePath = context.Server.MapPath(string.Format("~/Language/{0}.xml", _lang));

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
                        new Messaging<string>("404", xml.ReadLandXml("404") ?? "未找到对应接口")
                    );
                    break;
            }
            return returnData;
        }

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
                return JsonHelper<Messaging<string>>.EntityToJson(new Messaging<string>("500", ex.Message.Trim().Replace("\\r\\n", "")));
            }
        }

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
                    return JsonHelper<Messaging<string>>.EntityToJson(new Messaging<string>("0", "操作成功"));
                }
                else
                {
                    return JsonHelper<Messaging<string>>.EntityToJson(new Messaging<string>("1", "操作失败，请重试"));
                }
            }
            catch (Exception ex)
            {
                SystemErrorPlug.ErrorRecord(ex.ToString());
                return JsonHelper<Messaging<string>>.EntityToJson(new Messaging<string>("500", ex.Message.Trim().Replace("\\r\\n", "")));
            }
        }
    }
}
`;

const DAL_CONTENT = `using System;
using System.Data;
using System.Text;
using DataOperate.Net;
using Mobile.PrinxChengShan.Model;

namespace Mobile.PrinxChengShan.Dal
{
    public class ${ashxName}Dal
    {
        private MsSqlHelper db = null;

        public ${ashxName}Dal()
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
            
            sb.AppendLine(string.Format(@"
UPDATE WIP0002/*PDASQL*/ 
SET STA = '1', ENAM = '{0}', LOGINNAM = '{1}', UPDTIM = GETDATE() 
WHERE BARCODE = '{2}' AND FAC = '{3}';", 
            userName.Replace("'", "''"), 
            loginName.Replace("'", "''"), 
            barcode.Replace("'", "''"), 
            fac.Replace("'", "''")));

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
`;

// 1. 确保目录存在并写入前端文件
const moduleDir = path.join(PDA_FE_DIR, moduleName);
if (!fs.existsSync(moduleDir)) {
    fs.mkdirSync(moduleDir, { recursive: true });
}
const htmlPath = path.join(moduleDir, `${pageName}.html`);
const jsDir = path.join(PDA_FE_DIR, 'js');
if (!fs.existsSync(jsDir)) {
    fs.mkdirSync(jsDir, { recursive: true });
}
const jsPath = path.join(jsDir, jsName);

fs.writeFileSync(htmlPath, HTML_CONTENT, 'utf-8');
console.log(`[OK] 前端 HTML 写入成功: ${htmlPath}`);

fs.writeFileSync(jsPath, JS_CONTENT, 'utf-8');
console.log(`[OK] 前端 JS 写入成功: ${jsPath}`);

// 2. 写入后端文件
const ashxDir = path.join(PDA_BE_DIR, 'Web', 'Ashx');
const bllDir = path.join(PDA_BE_DIR, 'Mobile.PrinxChengShan.Bll');
const dalDir = path.join(PDA_BE_DIR, 'Mobile.PrinxChengShan.Dal');

if (!fs.existsSync(ashxDir)) fs.mkdirSync(ashxDir, { recursive: true });
if (!fs.existsSync(bllDir)) fs.mkdirSync(bllDir, { recursive: true });
if (!fs.existsSync(dalDir)) fs.mkdirSync(dalDir, { recursive: true });

const ashxPath = path.join(ashxDir, `${ashxName}.ashx`);
const bllPath = path.join(bllDir, `${ashxName}Bll.cs`);
const dalPath = path.join(dalDir, `${ashxName}Dal.cs`);

fs.writeFileSync(ashxPath, ASHX_CONTENT, 'utf-8');
console.log(`[OK] 后端 ASHX 写入成功: ${ashxPath}`);

fs.writeFileSync(bllPath, BLL_CONTENT, 'utf-8');
console.log(`[OK] 后端 BLL 写入成功: ${bllPath}`);

fs.writeFileSync(dalPath, DAL_CONTENT, 'utf-8');
console.log(`[OK] 后端 DAL 写入成功: ${dalPath}`);

console.log('\n🎉 PDA 全栈脚手架生成完毕！');
