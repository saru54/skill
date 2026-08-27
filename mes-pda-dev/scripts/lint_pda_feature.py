#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MES PDA 代码质量与合规检查器 (lint_pda_feature.py)
用于扫描前端 HTML/JS 与后端 ASHX/BLL/DAL 是否符合 MES PDA 开发规范与硬件交互标准。
"""

import os
import re
import sys
import argparse

def lint_frontend_html(file_path):
    issues = []
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()

    # 1. 检查是否引入了 Vue2
    if "vue@2.js" not in content and "vue.js" not in content and "vue.min.js" not in content:
        issues.append("[WARN] 页面未检测到 Vue 2 引用，请优先采用 Vue2 响应式架构")

    # 2. 检查是否包含了自定义 <style> 标签过度修饰
    custom_styles = re.findall(r"<style[^>]*>(.*?)</style>", content, re.DOTALL)
    if custom_styles:
        total_style_len = sum(len(s.strip()) for s in custom_styles)
        if total_style_len > 300:
            issues.append("[WARN] 页面包含大量自定义 <style>，请优先复用 mui.min.css 与 comStyle.css 标准类")

    # 3. 检查 range 滑块是否采用 Flex 布局防掉行
    if 'type="range"' in content or "mui-input-range" in content:
        if "display: flex" not in content and "display:flex" not in content:
            issues.append("[ERROR] 检测到 range 滑块，但未采用 Flex 布局 (style=\"display: flex;\")，存在掉行隐患")

    # 4. 检查数字输入框是否使用了 v-model.number
    if 'type="number"' in content:
        if 'v-model.number' not in content and 'v-model' in content:
            issues.append("[WARN] 数字输入框未采用 'v-model.number' 修饰符，可能导致数据被绑定为 string")

    # 5. 检查扫码框是否带有 v-model.trim
    if 'placeholder="扫描' in content or 'placeholder="扫码' in content or 'ref="barcodeInput"' in content:
        if 'v-model.trim' not in content and 'v-model' in content:
            issues.append("[ERROR] 扫码输入框未采用 'v-model.trim' 修饰符，PDA 扫描容易附带尾随换行或空格")

    return issues

def lint_frontend_js(file_path):
    issues = []
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()

    # 1. 检查扫码 keyCode 是否同时监听了 13 与 0
    if "keyCode" in content:
        has_13 = "13" in content
        has_0 = "0" in content or "keyCode == 0" in content or "keyCode === 0" in content
        if has_13 and not has_0:
            issues.append("[ERROR] 扫码事件仅监听了 keyCode 13，未监听 keyCode === 0，可能在部分手持机上无法触发扫描响应")

    # 2. 检查是否有全局按键焦点拉回拦截
    if "barcode" in content.lower() or "scan" in content.lower():
        if "document.onkeydown" not in content and "addEventListener('keydown'" not in content:
            issues.append("[WARN] 涉及扫码的页面未检测到全局 document.onkeydown 焦点锁定保护机制")

    # 3. 检查条码格式校验
    if "barcode" in content.lower() and "CheckBarcodeLengthClick" not in content and "CheckLotIdLengthClick" not in content:
        issues.append("[INFO] 未调用 CheckBarcodeLengthClick 进行条码长度格式过滤")

    # 4. 检查是否在 Vue 中使用了落后的 jQuery 字符串拼接 DOM
    if ".append(\"<tr" in content or ".append('<tr" in content:
        issues.append("[WARN] 检测到 jQuery DOM 拼接表格行，新建/重构页面一律使用 Vue 2 v-for 列表渲染")

    # 5. 检查 Storage 核心字段传递
    if "mui.ajax" in content:
        if 'storage["FAC"]' not in content and "storage['FAC']" not in content and 'storage.FAC' not in content:
            issues.append("[WARN] Ajax 请求中可能漏传 storage[\"FAC\"] 工厂隔离参数")

    return issues

def lint_backend_cs(file_path):
    issues = []
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()

    # 1. 检查 DAL 中的 SQL 是否有 /*PDASQL*/ 注释
    if "Dal.cs" in file_path or "DAL" in file_path:
        # 查找 SQL 关键词
        if "SELECT " in content.upper() or "INSERT INTO " in content.upper() or "UPDATE " in content.upper():
            if "/*PDASQL*/" not in content:
                issues.append("[ERROR] DAL SQL 语句未包含 mandatory 注释标记 '/*PDASQL*/'")

    # 2. 检查 BLL 是否有异常捕获并记录日志
    if "Bll.cs" in file_path or "BLL" in file_path:
        if "catch" in content:
            if "SystemErrorPlug.ErrorRecord" not in content and "ComUtilDal.SqlRecord" not in content:
                issues.append("[ERROR] BLL catch 块中未调用 SystemErrorPlug.ErrorRecord 记录系统异常日志")

    # 3. 检查异常返回中是否清洗了换行符
    if "ex.Message" in content and "JsonHelper" in content:
        if 'Replace("\\r\\n", "")' not in content and "Replace(\"\\r\\n\", \"\")" not in content:
            issues.append("[WARN] 异常消息 ex.Message 返回时未清洗 '\\r\\n' 换行符，可能破坏 JSON 格式")

    return issues

def main():
    parser = argparse.ArgumentParser(description="MES PDA 代码质量与规范检查工具")
    parser.add_argument("path", help="待检查的文件路径或目录路径")

    args = parser.parse_args()
    target_path = args.path

    if not os.path.exists(target_path):
        print(f"[ERROR] 目标路径不存在: {target_path}")
        sys.exit(1)

    files_to_check = []
    if os.path.isfile(target_path):
        files_to_check.append(target_path)
    else:
        for root, _, files in os.walk(target_path):
            for file in files:
                if file.endswith((".html", ".js", ".cs", ".ashx")):
                    files_to_check.append(os.path.join(root, file))

    total_issues = 0
    print(f"🔍 开始扫描 {len(files_to_check)} 个文件...\n")

    for file_path in files_to_check:
        file_issues = []
        if file_path.endswith(".html"):
            file_issues = lint_frontend_html(file_path)
        elif file_path.endswith(".js") and not file_path.endswith((".min.js", "jquery-3.3.1.min.js", "vue@2.js")):
            file_issues = lint_frontend_js(file_path)
        elif file_path.endswith(".cs"):
            file_issues = lint_backend_cs(file_path)

        if file_issues:
            total_issues += len(file_issues)
            print(f"📄 文件: {file_path}")
            for issue in file_issues:
                print(f"   {issue}")
            print("-" * 60)

    if total_issues == 0:
        print("✅ 扫描完成：未发现任何违规项，代码完全符合 PDA 规范！")
    else:
        print(f"\n⚠️ 扫描完成：共发现 {total_issues} 处潜在质量/合规问题，请根据上述提示处理。")

if __name__ == "__main__":
    main()
