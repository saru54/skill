#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MES PDA 脚手架生成器 (scaffold_pda_feature.py)
一键生成符合 mes-pda-dev (前端) 与 mes-pda-server-dev (后端) 规范的完整业务代码骨架。
支持根据当前工作目录自动探测 MES 项目根目录。
"""

import os
import sys
import argparse

def find_mes_root(start_dir=None):
    current = os.path.abspath(start_dir or os.getcwd())
    while True:
        pda_exists = os.path.exists(os.path.join(current, "03-PDA"))
        server_exists = os.path.exists(os.path.join(current, "04-服务器端程序"))
        admin_exists = os.path.exists(os.path.join(current, "05-MES管理端"))
        if pda_exists or server_exists or admin_exists:
            return current
        parent = os.path.dirname(current)
        if parent == current:
            break
    return None

HTML_TEMPLATE = """<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>{title}</title>
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
            <h1 class="mui-title"><label id="lblTitle">{title}</label></h1>
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
                    <label>用户:</label><span>{{{{ userName }}}}</span>
                </a>
                <a class="mui-tab-item">
                    <span>{{{{ facName }}}}</span>
                </a>
            </nav>
        </div>
    </div>

    <!-- 底部脚本 -->
    <script src="../js/mui.min.js"></script>
    <script src="../js/utilComm.js"></script>
    <script src="../js/{js_name}"></script>
</body>
</html>
"""

JS_TEMPLATE = """var storage = window.localStorage || {{}};

new Vue({{
    el: '#app',
    data: {{
        userName: storage["NAME"] || '',
        facName: storage["FACNM"] ? ("FTY." + storage["FACNM"]) : '',
        barcode: '',
        materialInfo: '',
        quantity: 1,
        loading: false
    }},
    methods: {{
        /*
         * 条码输入框键盘弹起事件（兼容 PDA 硬件回车符：keyCode = 13 或 0）
         */
        handleBarcodeKeyup: function(event) {{
            if (event.keyCode === 13 || event.keyCode === 0) {{
                this.handleScan();
            }}
        }},

        /*
         * 条码扫描与校验逻辑
         */
        handleScan: function() {{
            var code = (this.barcode || '').trim();
            if (!code) {{
                if (this.$refs.barcodeInput) this.$refs.barcodeInput.focus();
                return;
            }}

            // 1. 条码格式规则校验（utilComm.js 中的通用方法）
            if (typeof CheckBarcodeLengthClick === 'function' && !CheckBarcodeLengthClick(code)) {{
                mui.toast("条码长度格式不正确!", {{ duration: 'long', type: 'div' }});
                this.barcode = '';
                if (this.$refs.barcodeInput) this.$refs.barcodeInput.focus();
                return;
            }}

            // 2. 发起接口查询
            this.queryData(code);
        }},

        // 数据查询请求
        queryData: function(code) {{
            var _this = this;
            mui.ajax(requestPath + '/ashx/{ashx_name}.ashx', {{
                data: {{
                    action: "sel",
                    BARCODE: code,
                    FAC: storage["FAC"],
                    ENAM: storage["NAME"],
                    LOGINNAM: storage["LOGINNAME"],
                    Token: storage["Token"],
                    lang: storage["Language"]
                }},
                dataType: 'json',
                type: 'post',
                timeout: 10000,
                success: function(data) {{
                    if (data.ErrCode === "0") {{
                        if (data.TL && data.TL.length > 0) {{
                            _this.materialInfo = data.TL[0].ITDSC || data.TL[0].SPEC || '';
                        }} else {{
                            _this.materialInfo = data.Error || "获取成功";
                        }}
                        mui.toast("查询成功", {{ duration: 'short', type: 'div' }});
                    }} else {{
                        mui.alert(data.Error || "查询失败", "系统提示");
                    }}
                    _this.barcode = '';
                    if (_this.$refs.barcodeInput) _this.$refs.barcodeInput.focus();
                }},
                error: function() {{
                    mui.toast("网络请求超时", {{ duration: 'short', type: 'div' }});
                    _this.barcode = '';
                    if (_this.$refs.barcodeInput) _this.$refs.barcodeInput.focus();
                }}
            }});
        }},

        // 查询按钮点击
        handleQuery: function() {{
            if (this.barcode) {{
                this.handleScan();
            }} else {{
                mui.toast("请输入或扫描条码", {{ duration: 'short', type: 'div' }});
                if (this.$refs.barcodeInput) this.$refs.barcodeInput.focus();
            }}
        }},

        // 提交按钮
        handleSubmit: function() {{
            var _this = this;
            if (!_this.materialInfo) {{
                mui.alert("请先扫描并获取物料信息！");
                return;
            }}

            mui.ajax(requestPath + '/ashx/{ashx_name}.ashx', {{
                data: {{
                    action: "save",
                    BARCODE: _this.barcode || '',
                    QTY: _this.quantity,
                    FAC: storage["FAC"],
                    ENAM: storage["NAME"],
                    LOGINNAM: storage["LOGINNAME"],
                    Token: storage["Token"],
                    lang: storage["Language"]
                }},
                dataType: 'json',
                type: 'post',
                timeout: 10000,
                success: function(data) {{
                    if (data.ErrCode === "0") {{
                        mui.toast(data.Error || "操作成功", {{ duration: 'short', type: 'div' }});
                        _this.materialInfo = '';
                        _this.quantity = 1;
                    }} else {{
                        mui.alert(data.Error || "提交失败", "系统提示");
                    }}
                    _this.barcode = '';
                    if (_this.$refs.barcodeInput) _this.$refs.barcodeInput.focus();
                }},
                error: function() {{
                    mui.toast("提交超时，请重试", {{ duration: 'short', type: 'div' }});
                    if (_this.$refs.barcodeInput) _this.$refs.barcodeInput.focus();
                }}
            }});
        }}
    }},
    mounted: function() {{
        var _this = this;
        mui.init();

        // 1. 页面初始化自动聚焦到扫码输入框
        this.$nextTick(function() {{
            if (_this.$refs.barcodeInput) {{
                _this.$refs.barcodeInput.focus();
            }}
        }});

        // 2. 全局按键拦截：当 PDA 物理扫码触发回车时，确保焦点自动切回扫码框
        document.onkeydown = function(event) {{
            var e = event || window.event;
            if (e && (e.keyCode === 0 || e.keyCode === 13)) {{
                if (_this.$refs.barcodeInput && document.activeElement !== _this.$refs.barcodeInput) {{
                    _this.$refs.barcodeInput.focus();
                }}
            }}
        }};
    }}
}});
"""

ASHX_TEMPLATE = """<%@ WebHandler Language="C#" Class="{ashx_name}" %>

using System;
using System.Web;
using System.Web.SessionState;
using Mobile.PrinxChengShan.Bll;

public class {ashx_name} : IHttpHandler, IReadOnlySessionState 
{{
    public void ProcessRequest (HttpContext context) 
    {{
        context.Response.ContentType = "text/plain";
        context.Response.Write(new {ashx_name}Bll().ProcessRequest(context));
    }}
 
    public bool IsReusable 
    {{
        get {{ return false; }}
    }}
}}
"""

BLL_TEMPLATE = """using System;
using System.Data;
using System.Web;
using DataOperate.Net;
using Mobile.PrinxChengShan.Dal;
using Mobile.PrinxChengShan.Model;
using Mobile.PrinxChengShan.Util;

namespace Mobile.PrinxChengShan.Bll
{{
    public class {ashx_name}Bll
    {{
        private XmlHelper xml = null;
        private {ashx_name}Dal dal = null;

        public {ashx_name}Bll()
        {{
            dal = new {ashx_name}Dal();
            xml = new XmlHelper();
        }}

        public string ProcessRequest(HttpContext context)
        {{
            string _lang = "CHN";
            try
            {{
                string lang = context.Request["lang"] as string;
                if (!string.IsNullOrEmpty(lang)) _lang = lang;
            }}
            catch {{ _lang = "CHN"; }}
            xml.FilePath = context.Server.MapPath(string.Format("~/Language/{{0}}.xml", _lang));

            string action = string.Empty;
            try {{ action = context.Request["action"].ToString(); }}
            catch {{ action = string.Empty; }}

            string returnData = string.Empty;
            switch (action.ToLower())
            {{
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
            }}
            return returnData;
        }}

        private string GetDataList(HttpContext context)
        {{
            try
            {{
                string barcode = (context.Request["BARCODE"] ?? "").Trim();
                string fac = (context.Request["FAC"] ?? "").Trim();

                if (string.IsNullOrEmpty(barcode))
                {{
                    return JsonHelper<Messaging<string>>.EntityToJson(new Messaging<string>("1", "条码不能为空"));
                }}

                DataTable dt = dal.GetBarcodeInfo(barcode, fac);
                if (dt != null && dt.Rows.Count > 0)
                {{
                    return JsonHelper<Messaging<string>>.EntityToJson(new Messaging<string>("0", "查询成功", dt));
                }}
                else
                {{
                    return JsonHelper<Messaging<string>>.EntityToJson(new Messaging<string>("1", "未查询到对应条码信息"));
                }}
            }}
            catch (Exception ex)
            {{
                SystemErrorPlug.ErrorRecord(ex.ToString());
                return JsonHelper<Messaging<string>>.EntityToJson(new Messaging<string>("500", ex.Message.Trim().Replace("\\r\\n", "")));
            }}
        }}

        private string SaveData(HttpContext context)
        {{
            try
            {{
                string barcode = (context.Request["BARCODE"] ?? "").Trim();
                string fac = (context.Request["FAC"] ?? "").Trim();
                string loginName = (context.Request["LOGINNAM"] ?? "").Trim();
                string userName = (context.Request["ENAM"] ?? "").Trim();

                bool result = dal.SubmitRecord(barcode, fac, loginName, userName);
                if (result)
                {{
                    return JsonHelper<Messaging<string>>.EntityToJson(new Messaging<string>("0", "操作成功"));
                }}
                else
                {{
                    return JsonHelper<Messaging<string>>.EntityToJson(new Messaging<string>("1", "操作失败，请重试"));
                }}
            }}
            catch (Exception ex)
            {{
                SystemErrorPlug.ErrorRecord(ex.ToString());
                return JsonHelper<Messaging<string>>.EntityToJson(new Messaging<string>("500", ex.Message.Trim().Replace("\\r\\n", "")));
            }}
        }}
    }}
}}
"""

DAL_TEMPLATE = """using System;
using System.Data;
using System.Text;
using DataOperate.Net;
using Mobile.PrinxChengShan.Model;

namespace Mobile.PrinxChengShan.Dal
{{
    public class {ashx_name}Dal
    {{
        private MsSqlHelper db = null;

        public {ashx_name}Dal()
        {{
            db = new MsSqlHelper();
        }}

        public DataTable GetBarcodeInfo(string barcode, string fac)
        {{
            string sql = string.Format(@"
SELECT TOP 1 BARCODE, SPEC, ITNBR, ITDSC, FAC, WDATE, WSHT, WBAN 
FROM WIP0002 (NOLOCK)/*PDASQL*/ 
WHERE BARCODE = '{{0}}' AND FAC = '{{1}}'", 
            barcode.Replace("'", "''"), 
            fac.Replace("'", "''"));

            return db.ExecuteDataTable(sql);
        }}

        public bool SubmitRecord(string barcode, string fac, string loginName, string userName)
        {{
            StringBuilder sb = new StringBuilder();
            
            sb.AppendLine(string.Format(@"
UPDATE WIP0002/*PDASQL*/ 
SET STA = '1', ENAM = '{{0}}', LOGINNAM = '{{1}}', UPDTIM = GETDATE() 
WHERE BARCODE = '{{2}}' AND FAC = '{{3}}';", 
            userName.Replace("'", "''"), 
            loginName.Replace("'", "''"), 
            barcode.Replace("'", "''"), 
            fac.Replace("'", "''")));

            sb.AppendLine(string.Format(@"
INSERT INTO WIP0002_LOG/*PDASQL*/(FAC, BARCODE, OPERATION, OPTIM, OPNAM, OPLOGINNAM) 
VALUES('{{0}}', '{{1}}', 'PDA_SCAN', GETDATE(), '{{2}}', '{{3}}');", 
            fac.Replace("'", "''"), 
            barcode.Replace("'", "''"), 
            userName.Replace("'", "''"), 
            loginName.Replace("'", "''")));

            try
            {{
                return db.ExecuteNonQuery(sb.ToString()) > 0;
            }}
            catch (Exception ex)
            {{
                ComUtilDal.SqlRecord("PDA提交异常: " + ex.Message + "; SQL: " + sb.ToString());
                throw;
            }}
        }}
    }}
}}
"""

def main():
    parser = argparse.ArgumentParser(description="生成 MES PDA 前后端全栈代码脚手架")
    parser.add_argument("--module", required=True, help="前端业务子目录名 (如 AllSteelHalf, Molding, VulProdu)")
    parser.add_argument("--page", required=True, help="页面文件名前缀 (如 MOutbound)")
    parser.add_argument("--title", required=True, help="页面中文标题 (如 全钢半部件出库)")
    parser.add_argument("--ashx", required=False, help="ASHX/BLL/DAL 类名前缀 (若未提供则默认与 page 相同)")
    parser.add_argument("--root", required=False, help="MES 项目根目录 (若未提供则自动探测)")

    args = parser.parse_args()
    module = args.module
    page = args.page
    title = args.title
    ashx_name = args.ashx or page
    js_name = f"{page}.js"

    # 动态定位根目录
    detected_root = args.root or os.environ.get("MES_ROOT") or find_mes_root() or r"d:\mes\mes-major"
    MES_ROOT = os.path.abspath(detected_root)
    print(f"🧭 当前检测到 MES 根目录: {MES_ROOT}")

    PDA_FE_DIR = os.path.join(MES_ROOT, "03-PDA", "LonSon.Mobile.PrinxChengShan.App")
    PDA_BE_DIR = os.path.join(MES_ROOT, "04-服务器端程序", "LonSon.Mobile.PrinxChengShan.App.Web")

    # 1. 前端目录与文件路径
    module_dir = os.path.join(PDA_FE_DIR, module)
    os.makedirs(module_dir, exist_ok=True)
    html_path = os.path.join(module_dir, f"{page}.html")
    
    js_dir = os.path.join(PDA_FE_DIR, "js")
    os.makedirs(js_dir, exist_ok=True)
    js_path = os.path.join(js_dir, js_name)

    # 2. 后端文件路径
    ashx_dir = os.path.join(PDA_BE_DIR, "Web", "Ashx")
    bll_dir = os.path.join(PDA_BE_DIR, "Mobile.PrinxChengShan.Bll")
    dal_dir = os.path.join(PDA_BE_DIR, "Mobile.PrinxChengShan.Dal")
    os.makedirs(ashx_dir, exist_ok=True)
    os.makedirs(bll_dir, exist_ok=True)
    os.makedirs(dal_dir, exist_ok=True)

    ashx_path = os.path.join(ashx_dir, f"{ashx_name}.ashx")
    bll_path = os.path.join(bll_dir, f"{ashx_name}Bll.cs")
    dal_path = os.path.join(dal_dir, f"{ashx_name}Dal.cs")

    # 写入前端 HTML
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(HTML_TEMPLATE.format(title=title, js_name=js_name))
    print(f"[OK] 前端 HTML 生成成功: {html_path}")

    # 写入前端 JS
    with open(js_path, "w", encoding="utf-8") as f:
        f.write(JS_TEMPLATE.format(ashx_name=ashx_name))
    print(f"[OK] 前端 JS 生成成功: {js_path}")

    # 写入后端 ASHX
    with open(ashx_path, "w", encoding="utf-8") as f:
        f.write(ASHX_TEMPLATE.format(ashx_name=ashx_name))
    print(f"[OK] 后端 ASHX 生成成功: {ashx_path}")

    # 写入后端 BLL
    with open(bll_path, "w", encoding="utf-8") as f:
        f.write(BLL_TEMPLATE.format(ashx_name=ashx_name))
    print(f"[OK] 后端 BLL 生成成功: {bll_path}")

    # 写入后端 DAL
    with open(dal_path, "w", encoding="utf-8") as f:
        f.write(DAL_TEMPLATE.format(ashx_name=ashx_name))
    print(f"[OK] 后端 DAL 生成成功: {dal_path}")

    print("\n🎉 PDA 模块全栈脚手架生成完毕！")

if __name__ == "__main__":
    main()
