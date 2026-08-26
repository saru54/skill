---
name: mes-pda-dev
description: MES移动端PDA页面开发规范。基于MUI + Vue 2 (vue@2.js)技术栈，涵盖页面脚手架、PDA扫码事件兼容、表单双向绑定、样式布局避坑及接口契约。用于LonSon.Mobile.PrinxChengShan.App及相关MES PDA模块的新建与重构。
---

# MES 移动端 PDA 页面开发规范 (mes-pda-dev)

本技能定义了 MES 移动端（PDA/手持机）应用的技术规范、标准脚手架、硬件扫码适配流程及避坑指南。

---

## 1. 技术栈与架构原则

* **核心框架**：MUI (Mobile UI) + Vue 2 (`JavaScript/vue@2.js`)
* **开发模式**：
  * 新建或重构页面**一律采用 Vue 2 响应式数据绑定**（`v-model`、`{{ }}`、`computed`）。
  * 杜绝使用 jQuery 字符串拼接 DOM（如 `$('#dList').append("<tr>...</tr>")`）或频繁获取 DOM。
* **文件组织规范**：
  * 页面 HTML：位于业务模块目录（如 `P-Test/p-test.html`、`AllSteelHalf/xxx.html`）。
  * 业务 JS：位于 `js/` 目录（如 `js/p-test.js`）或直接内嵌在 HTML 底部。
  * 依赖资源：`../css/mui.min.css`、`../css/comStyle.css`、`../JavaScript/vue@2.js`、`../js/mui.min.js`、`../js/utilComm.js`。

---

## 2. 标准页面脚手架 (Boilerplate)

### 2.1 HTML 模板骨架

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>功能标题</title>
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
            <h1 class="mui-title"><label id="lblTitle">功能标题</label></h1>
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

                    <!-- 普通文本显示行 -->
                    <div class="mui-input-row">
                        <label>物料信息:</label>
                        <input type="text" v-model="materialInfo" readonly class="mui-input" style="font-weight:bold;">
                    </div>

                    <!-- 数字输入行 -->
                    <div class="mui-input-row">
                        <label>数量:</label>
                        <input type="number" v-model.number="quantity" class="mui-input" placeholder="请输入数量">
                    </div>		

                    <!-- 滑块 Range 行 (Flex 弹性布局规范) -->
                    <div class="mui-input-row mui-input-range" style="display: flex; align-items: center; padding-right: 20px;">
                        <label style="float: none; width: 38%; padding: 10px 15px; white-space: nowrap;">
                            百分比: <span>{{ percentage }}</span>%
                        </label>
                        <input type="range" 
                               v-model.number="percentage" 
                               min="0" 
                               max="100" 
                               style="float: none; flex: 1; width: auto; margin: 0; padding: 0;" />
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
    <script src="../js/业务脚本.js"></script>
</body>
</html>
```

### 2.2 JavaScript / Vue 模板骨架

```javascript
var storage = window.localStorage || {};

new Vue({
    el: '#app',
    data: {
        userName: storage["NAME"] || '',
        facName: storage["FACNM"] ? ("FTY." + storage["FACNM"]) : '',
        barcode: '',
        materialInfo: '',
        quantity: null,
        percentage: 30,
        loading: false
    },
    computed: {
        // 计算属性示例：联动自动计算
        differenceRate: function() {
            return this.percentage;
        }
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
            mui.ajax(requestPath + '/ashx/业务接口.ashx', {
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
                        _this.materialInfo = data.ITDSC || '';
                        mui.toast("查询成功", { duration: 'short', type: 'div' });
                    } else {
                        mui.alert(data.Error || "查询失败", "系统提示");
                    }
                    // 清空扫码框并保持焦点（方便连续扫码作业）
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
            if (!this.materialInfo) {
                mui.alert("请先扫描并获取物料信息！");
                return;
            }
            // 提交业务接口...
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
```

---

## 3. PDA 硬件扫码五大核心规范

在开发任何包含扫码功能的 PDA 页面时，**必须满足以下 5 条规范**：

1. **自动去空格修饰符**：
   * 输入框必须使用 `v-model.trim="barcode"`，防止 PDA 扫描头尾随 `\r\n` 或空格导致长度校验失败。
2. **双结束码兼容**：
   * 必须同时监听 `keyCode === 13 || keyCode === 0`，兼容不同厂商 PDA 的扫描结束信号。
3. **全局焦点保护（Focus Lock）**：
   * 在 `mounted` 中注册 `document.onkeydown`，若捕获到 `13` 或 `0` 且焦点不在输入框，自动触发 `this.$refs.barcodeInput.focus()`。
4. **条码合法性过滤**：
   * 必须调用 `CheckBarcodeLengthClick(code)` 过滤非法长度，防止误扫工位码或残损条码。
5. **连续扫码支持**：
   * 每次扫码响应（无论成功或失败）后，必须清空 `this.barcode = ''` 并重新执行 `focus()`。

---

## 4. UI 布局与 MUI 避坑指南

### 4.1 滑块 Range 布局掉行问题（必须使用 Flex 修复）
* **原因**：MUI 默认样式中 `label` 宽 40%，`input[type=range]` 宽 65%，相加达 105%，浮动必定导致折行到下一行。
* **标准写法**：
  ```html
  <div class="mui-input-row mui-input-range" style="display: flex; align-items: center; padding-right: 20px;">
      <label style="float: none; width: 38%; padding: 10px 15px; white-space: nowrap;">
          百分比: <span>{{ percentage }}</span>%
      </label>
      <input type="range" v-model.number="percentage" min="0" max="100" style="float: none; flex: 1; width: auto; margin: 0; padding: 0;" />
  </div>
  ```

### 4.2 数字输入框修饰符
* 数字框统一使用 `v-model.number="xxx"`，避免将数字保存为 string 类型导致计算错误。

### 4.3 安全判空（防御性编程）
* 调用任何 DOM 方法前（如 `.focus()`），必须使用 `if (this.$refs.xxx)` 进行判空，防止在未挂载或销毁时抛错。

---

## 5. Storage 与接口请求契约

### 5.1 LocalStorage 标准字段
页面底部及接口公共入参一律从 `window.localStorage` 获取：
* `storage["NAME"]`：用户姓名（如 `张三`）
* `storage["LOGINNAME"]`：工号/登录账号（如 `012345`）
* `storage["FAC"]`：当前工厂代码（如 `11` 或 `12`）
* `storage["FACNM"]`：工厂名称（如 `PCR`、`TBR`）
* `storage["Token"]`：接口身份鉴权 Token
* `storage["Language"]`：多语言设置

### 5.2 通用 Toast 提示规范
```javascript
mui.toast("提示信息", { duration: 'short', type: 'div' });
```
