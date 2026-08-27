/**
 * MES PDA 代码质量与合规检查器 (lint_pda_feature.js)
 * 运行方式: node lint_pda_feature.js <文件路径或目录路径>
 */

const fs = require('fs');
const path = require('path');

function lintFrontendHtml(filePath) {
    const issues = [];
    const content = fs.readFileSync(filePath, 'utf-8');

    if (!content.includes('vue@2.js') && !content.includes('vue.js') && !content.includes('vue.min.js')) {
        issues.push('[WARN] 页面未检测到 Vue 2 引用，请优先采用 Vue2 响应式架构');
    }

    const styleMatches = content.match(/<style[^>]*>([\s\S]*?)<\/style>/g);
    if (styleMatches) {
        const totalStyleLen = styleMatches.reduce((acc, s) => acc + s.length, 0);
        if (totalStyleLen > 400) {
            issues.push('[WARN] 页面包含大量自定义 <style>，请优先复用 mui.min.css 与 comStyle.css 标准公共类');
        }
    }

    if (content.includes('type="range"') || content.includes('mui-input-range')) {
        if (!content.includes('display: flex') && !content.includes('display:flex')) {
            issues.push('[ERROR] 检测到 range 滑块，但未采用 Flex 布局 (style="display: flex;")，存在掉行隐患');
        }
    }

    if (content.includes('type="number"')) {
        if (!content.includes('v-model.number') && content.includes('v-model')) {
            issues.push('[WARN] 数字输入框未采用 "v-model.number" 修饰符，可能导致数据被绑定为 string');
        }
    }

    if (content.includes('placeholder="扫描') || content.includes('placeholder="扫码') || content.includes('ref="barcodeInput"')) {
        if (!content.includes('v-model.trim') && content.includes('v-model')) {
            issues.push('[ERROR] 扫码输入框未采用 "v-model.trim" 修饰符，PDA 扫描容易附带尾随换行或空格');
        }
    }

    return issues;
}

function lintFrontendJs(filePath) {
    const issues = [];
    const content = fs.readFileSync(filePath, 'utf-8');

    if (content.includes('keyCode')) {
        const has13 = content.includes('13');
        const has0 = content.includes('0') || content.includes('keyCode == 0') || content.includes('keyCode === 0');
        if (has13 && !has0) {
            issues.push('[ERROR] 扫码事件仅监听了 keyCode 13，未监听 keyCode === 0，可能在部分手持机上无法触发扫描响应');
        }
    }

    if (content.toLowerCase().includes('barcode') || content.toLowerCase().includes('scan')) {
        if (!content.includes('document.onkeydown') && !content.includes("addEventListener('keydown'")) {
            issues.push('[WARN] 涉及扫码的页面未检测到全局 document.onkeydown 焦点锁定保护机制');
        }
    }

    if (content.toLowerCase().includes('barcode') && !content.includes('CheckBarcodeLengthClick') && !content.includes('CheckLotIdLengthClick')) {
        issues.push('[INFO] 未调用 CheckBarcodeLengthClick 进行条码长度格式过滤');
    }

    if (content.includes('.append("<tr') || content.includes(".append('<tr")) {
        issues.push('[WARN] 检测到 jQuery DOM 拼接表格行，新建/重构页面一律使用 Vue 2 v-for 列表渲染');
    }

    if (content.includes('mui.ajax')) {
        if (!content.includes('storage["FAC"]') && !content.includes("storage['FAC']") && !content.includes('storage.FAC')) {
            issues.push('[WARN] Ajax 请求中可能漏传 storage["FAC"] 工厂隔离参数');
        }
    }

    return issues;
}

function lintBackendCs(filePath) {
    const issues = [];
    const content = fs.readFileSync(filePath, 'utf-8');

    if (filePath.includes('Dal.cs') || filePath.includes('DAL')) {
        if (content.toUpperCase().includes('SELECT ') || content.toUpperCase().includes('INSERT INTO ') || content.toUpperCase().includes('UPDATE ')) {
            if (!content.includes('/*PDASQL*/')) {
                issues.push('[ERROR] DAL SQL 语句未包含 mandatory 注释标记 "/*PDASQL*/"');
            }
        }
    }

    if (filePath.includes('Bll.cs') || filePath.includes('BLL')) {
        if (content.includes('catch')) {
            if (!content.includes('SystemErrorPlug.ErrorRecord') && !content.includes('ComUtilDal.SqlRecord')) {
                issues.push('[ERROR] BLL catch 块中未调用 SystemErrorPlug.ErrorRecord 记录系统异常日志');
            }
        }
    }

    if (content.includes('ex.Message') && content.includes('JsonHelper')) {
        if (!content.includes('Replace("\\r\\n", "")') && !content.includes('Replace("\r\n", "")')) {
            issues.push('[WARN] 异常消息 ex.Message 返回时未清洗 "\\r\\n" 换行符，可能破坏 JSON 格式');
        }
    }

    return issues;
}

function scanPath(targetPath) {
    let filesToCheck = [];

    function traverse(currentPath) {
        const stats = fs.statSync(currentPath);
        if (stats.isFile()) {
            if (['.html', '.js', '.cs', '.ashx'].some(ext => currentPath.endsWith(ext))) {
                filesToCheck.push(currentPath);
            }
        } else if (stats.isDirectory()) {
            const children = fs.readdirSync(currentPath);
            children.forEach(child => traverse(path.join(currentPath, child)));
        }
    }

    traverse(targetPath);

    let totalIssues = 0;
    console.log(`🔍 开始扫描 ${filesToCheck.length} 个文件...\n`);

    filesToCheck.forEach(file => {
        let issues = [];
        if (file.endsWith('.html')) {
            issues = lintFrontendHtml(file);
        } else if (file.endsWith('.js') && !file.endsWith('.min.js') && !file.includes('jquery-3.3.1') && !file.includes('vue@2')) {
            issues = lintFrontendJs(file);
        } else if (file.endsWith('.cs')) {
            issues = lintBackendCs(file);
        }

        if (issues.length > 0) {
            totalIssues += issues.length;
            console.log(`📄 文件: ${file}`);
            issues.forEach(iss => console.log(`   ${iss}`));
            console.log('-'.repeat(60));
        }
    });

    if (totalIssues === 0) {
        console.log('✅ 扫描完成：未发现任何违规项，代码完全符合 PDA 规范！');
    } else {
        console.log(`\n⚠️ 扫描完成：共发现 ${totalIssues} 处潜在质量/合规问题，请根据上述提示处理。`);
    }
}

const target = process.argv[2];
if (!target) {
    console.log('用法: node lint_pda_feature.js <文件或目录路径>');
    process.exit(1);
}

scanPath(target);
