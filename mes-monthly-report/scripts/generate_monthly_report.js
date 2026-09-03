#!/usr/bin/env node
/**
 * Generic Monthly Report Generator CLI
 * Completely dynamic & content-agnostic:
 * - Parses raw JSON from Daily Report System ("我的日报") or custom structured JSON
 * - ZERO hardcoded keywords, person names, or fixed slide topic assumptions
 * - Slides 4 & 5 are flexible content containers that dynamically adapt to actual projects,
 *   work types, or continuous multi-page pagination.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function parseArgs(args) {
    const params = {};
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg.startsWith('--')) {
            const key = arg.slice(2);
            const next = args[i + 1];
            if (next && !next.startsWith('--')) {
                params[key] = next;
                i++;
            } else {
                params[key] = true;
            }
        }
    }
    return params;
}

const params = parseArgs(process.argv.slice(2));

if (params.help || params.h) {
    console.log(`
=============================================================================
月报 PPT 动态解析与自动生成工具 (通用内容自适应版)
=============================================================================
💡 数据源说明:
  本工具所需的工作记录 JSON 数据来源于公司【日报系统 -> 我的日报】。
  获取方法: 登录日报系统 -> 进入「我的日报」-> 筛选月份/日期 -> 复制接口响应 JSON 或导出文件。
-----------------------------------------------------------------------------
用法: node generate_monthly_report.js [参数]

核心参数:
  --input <path>          工作记录 JSON 文件路径 (来源于【日报系统->我的日报】)
  --template <path>       企业月报 PPT 模板路径 (默认: Monthly_Report_202608_cyjiang.pptx)
  --output <path>         输出 PPTX 保存路径 (默认: 用户桌面)
  --name <string>         汇报人姓名 (默认: 自动从 JSON 解析)
  --group <string>        所属班组/部门 (默认: 自动从 JSON 解析)

时间范围筛选参数:
  --month <string>        按月份过滤 (如 "08", "09", "202608")
  --start-date <YYYYMMDD> 起始日期 (包含)，如 "20260801"
  --end-date <YYYYMMDD>   截止日期 (包含)，如 "20260831"
  --range <string>        快捷区间，如 "20260826-20260902"

自定义标题与计划覆盖 (可选):
  --title-slide4 <string> Slide 4 自定义标题 (默认: 由数据自动推导主题)
  --title-slide5 <string> Slide 5 自定义标题 (默认: 由数据自动推导主题)
  --plan-title <string>   Slide 9 计划卡片标题 (默认: 由项目名称自动推导)
  --plans <string>        自定义下月计划 (以分号分隔)
=============================================================================
`);
    process.exit(0);
}

const templatePath = path.resolve(params.template || 'C:\\Users\\zhpei\\Downloads\\Monthly_Report_202608_cyjiang.pptx');
const inputJsonPath = params.input ? path.resolve(params.input) : path.resolve(__dirname, '..', 'examples', 'sample_work_record.json');
const outputPath = path.resolve(params.output || path.join(process.env.USERPROFILE || 'C:\\Users\\zhpei', 'Desktop', 'Monthly_Report_Generated.pptx'));

if (!fs.existsSync(templatePath)) {
    console.error('❌ 错误: 未找到 PPT 模板文件: ' + templatePath);
    process.exit(1);
}

if (!fs.existsSync(inputJsonPath)) {
    console.error('❌ 错误: 未找到输入 JSON 文件: ' + inputJsonPath);
    process.exit(1);
}

// =============================================================================
// 1. 读取并纯动态解析 JSON 数据
// =============================================================================
console.log('1. 读取并解析【我的日报】数据: ' + inputJsonPath);
let rawData = null;
try {
    rawData = JSON.parse(fs.readFileSync(inputJsonPath, 'utf8'));
} catch (e) {
    console.error('❌ 解析 JSON 文件失败: ' + e.message);
    process.exit(1);
}

let reporterName = params.name || null;
let reporterGroup = params.group || null;
let targetMonth = params.month ? String(params.month).padStart(2, '0') : null;
if (targetMonth && targetMonth.length === 6) targetMonth = targetMonth.slice(4, 6);

let filterStartDate = params['start-date'] ? String(params['start-date']).replace(/\D/g, '') : null;
let filterEndDate = params['end-date'] ? String(params['end-date']).replace(/\D/g, '') : null;
if (params.range && params.range.includes('-')) {
    const parts = params.range.split('-');
    filterStartDate = parts[0].replace(/\D/g, '');
    filterEndDate = parts[1].replace(/\D/g, '');
}

// 通用明细页集合：每一页包含 { title: string, items: Array<{ text: string, status: string }> }
let detailPages = [];
let rateTasks = [];
let planItems = [];
let summaryText = '';
let planCardTitle = params['plan-title'] || null;

// 判断是否直接传入了自定义结构化幻灯片 (Case B: 显式多页配置)
if (rawData.slides && Array.isArray(rawData.slides)) {
    console.log('ℹ️ 检测到显式 slides 数组配置，直接应用传入的各页内容。');
    reporterName = reporterName || rawData.name || '开发工程师';
    reporterGroup = reporterGroup || rawData.group || '智能制造组';
    targetMonth = targetMonth || rawData.month || '08';
    detailPages = rawData.slides;
    rateTasks = rawData.rateTasks || [];
    planItems = rawData.planItems || [];
    summaryText = rawData.summary || '';
    if (rawData.planTitle) planCardTitle = rawData.planTitle;
} else if (rawData.slide4Items || rawData.slide5Items) {
    console.log('ℹ️ 检测到预设 slide4Items / slide5Items，直接应用传入条目。');
    reporterName = reporterName || rawData.name || '开发工程师';
    reporterGroup = reporterGroup || rawData.group || '智能制造组';
    targetMonth = targetMonth || rawData.month || '08';
    detailPages = [
        { title: params['title-slide4'] || rawData.slide4Title || '月度总结丨主要工作', items: rawData.slide4Items || [] },
        { title: params['title-slide5'] || rawData.slide5Title || '月度总结丨其他工作', items: rawData.slide5Items || [] }
    ];
    rateTasks = rawData.rateTasks || [];
    planItems = rawData.planItems || [];
    summaryText = rawData.summary || '';
    if (rawData.planTitle) planCardTitle = rawData.planTitle;
} else {
    // 纯动态解析【我的日报】系统原始记录 (Case A)
    let rows = rawData.rows || [];
    if (rows.length === 0) {
        console.error('❌ 输入 JSON 中的 rows 数组为空！');
        process.exit(1);
    }

    if (!reporterName) reporterName = rows[0].name || '开发工程师';
    if (!reporterGroup) reporterGroup = rows[0].group || '智能制造组';

    const allDates = rows.map(r => String(r.date).replace(/\D/g, '')).filter(Boolean).sort();
    const minDateInRaw = allDates.length > 0 ? allDates[0] : '未知';
    const maxDateInRaw = allDates.length > 0 ? allDates[allDates.length - 1] : '未知';

    // 自动判定月份
    if (!targetMonth && !filterStartDate && !filterEndDate) {
        if (maxDateInRaw !== '未知' && maxDateInRaw.length >= 6) {
            targetMonth = maxDateInRaw.slice(4, 6);
        } else {
            targetMonth = '08';
        }
    }

    // 时间过滤
    let filteredRows = [];
    let filterDesc = '';
    if (filterStartDate || filterEndDate) {
        const s = filterStartDate || '00000000';
        const e = filterEndDate || '99999999';
        filteredRows = rows.filter(r => {
            const d = String(r.date).replace(/\D/g, '');
            return d >= s && d <= e;
        });
        filterDesc = `${filterStartDate || '起始'} ~ ${filterEndDate || '截止'}`;
    } else if (targetMonth) {
        filteredRows = rows.filter(r => {
            const d = String(r.date).replace(/\D/g, '');
            return d.length >= 6 && d.slice(4, 6) === targetMonth;
        });
        const year = maxDateInRaw !== '未知' ? maxDateInRaw.slice(0, 4) : '2026';
        filterDesc = `${year}年${targetMonth}月度`;
    }

    console.log('=============================================================================');
    console.log('📅 工作记录时间范围统计');
    console.log('-----------------------------------------------------------------------------');
    console.log(`• 原始全量数据区间 : ${minDateInRaw} 至 ${maxDateInRaw} (共 ${rows.length} 天记录)`);
    console.log(`• 本次锁定统计范围 : ${filterDesc}`);
    console.log(`• 纳入统计有效天数 : ${filteredRows.length} 天 (过滤掉 ${rows.length - filteredRows.length} 天跨期记录)`);
    console.log(`• 汇报人 / 部门   : ${reporterName} / ${reporterGroup}`);
    console.log(`• 数据源业务系统   : 公司【日报系统 -> 我的日报】`);
    console.log('=============================================================================');

    if (filteredRows.length === 0) {
        console.warn('⚠️ 警告: 指定时间范围内未匹配到记录，将使用全量数据。');
        filteredRows = rows;
    }

    // 提取并清洗所有原始任务项
    const extractedTasks = [];
    const detectedProjects = new Set();
    const typeSet = new Set();

    for (const r of filteredRows) {
        if (!r.list || !Array.isArray(r.list)) continue;
        for (const item of r.list) {
            let desc = item.content || '';
            let projectName = '';
            if (item.nonCore) {
                try {
                    const nc = typeof item.nonCore === 'string' ? JSON.parse(item.nonCore) : item.nonCore;
                    if (nc['任务描述']) desc = nc['任务描述'];
                    else if (nc['学习目标']) desc = nc['学习目标'];
                    if (nc['项目名称']) {
                        projectName = String(nc['项目名称']).trim();
                        if (projectName) detectedProjects.add(projectName);
                    }
                } catch (e) {}
            }

            desc = desc.replace(/https?:\/\/\S+/gi, '').replace(/[\r\n]+/g, '，').trim();
            desc = desc.replace(/^[，,。、\s]+|[，,。、\s]+$/g, '').trim();
            if (!desc) continue;

            const progressNum = parseInt(item.progress || '100', 10);
            const status = progressNum >= 100 ? '完成' : '进行中';
            const spentHours = parseFloat(item.time || '1');
            const wType = String(item.type || '开发').trim();
            typeSet.add(wType);

            extractedTasks.push({
                text: desc,
                status,
                type: wType,
                projectName,
                spentHours,
                date: r.date
            });
        }
    }

    // 去除重复任务项
    const uniqueMap = new Map();
    for (const t of extractedTasks) {
        if (!uniqueMap.has(t.text)) {
            uniqueMap.set(t.text, t);
        } else {
            const exist = uniqueMap.get(t.text);
            if (t.spentHours > exist.spentHours) uniqueMap.set(t.text, t);
        }
    }
    const cleanTasks = Array.from(uniqueMap.values());
    const projectList = Array.from(detectedProjects);

    // =========================================================================
    // 通用自适应明细页分流逻辑 (零硬编码，多策略灵活适配):
    // 策略 1: 若 JSON 存在两个及以上不同【项目名称】，则各页分别承载独立项目
    // 策略 2: 若工作类型多样 (开发/测试 vs 日常/学习)，则按类型自然分流至前后页
    // 策略 3: 若全为单一项目或单一类型，则按工时与顺序进行自然多页分页 (分页防溢出)
    // =========================================================================
    if (projectList.length >= 2) {
        // 策略 1: 按项目分组
        const p1Name = projectList[0];
        const p2Name = projectList[1];
        const p1Tasks = cleanTasks.filter(t => t.projectName === p1Name).sort((a, b) => b.spentHours - a.spentHours);
        const p2Tasks = cleanTasks.filter(t => t.projectName === p2Name).sort((a, b) => b.spentHours - a.spentHours);
        
        detailPages.push({
            title: params['title-slide4'] || `月度总结丨${p1Name}`,
            items: p1Tasks.slice(0, 7).map(x => ({ text: x.text, status: x.status }))
        });
        detailPages.push({
            title: params['title-slide5'] || `月度总结丨${p2Name}`,
            items: p2Tasks.slice(0, 9).map(x => ({ text: x.text, status: x.status }))
        });
    } else {
        // 区分开发/实现类任务与支持/日常/学习类任务
        const primaryTasks = cleanTasks.filter(t => t.type === '开发' || t.type === '测试').sort((a, b) => b.spentHours - a.spentHours);
        const secondaryTasks = cleanTasks.filter(t => t.type !== '开发' && t.type !== '测试').sort((a, b) => b.spentHours - a.spentHours);

        if (primaryTasks.length > 0 && secondaryTasks.length > 0) {
            // 策略 2: 研发工程实现 vs 日常与技术学习
            const pName = projectList[0];
            const p1Title = params['title-slide4'] || (pName ? `月度总结丨${pName}` : '月度总结丨核心开发与测试');
            const p2Title = params['title-slide5'] || '月度总结丨日常工作与技术学习';

            detailPages.push({
                title: p1Title,
                items: primaryTasks.slice(0, 7).map(x => ({ text: x.text, status: x.status }))
            });
            detailPages.push({
                title: p2Title,
                items: secondaryTasks.slice(0, 9).map(x => ({ text: x.text, status: x.status }))
            });
        } else {
            // 策略 3: 单一类型海量任务，执行自然分页 (Page 1: 7项, Page 2: 9项)
            cleanTasks.sort((a, b) => b.spentHours - a.spentHours);
            const pName = projectList[0];
            const baseTitle = pName ? `月度总结丨${pName}` : '月度总结丨工作明细';
            
            detailPages.push({
                title: params['title-slide4'] || `${baseTitle} (一)`,
                items: cleanTasks.slice(0, 7).map(x => ({ text: x.text, status: x.status }))
            });
            detailPages.push({
                title: params['title-slide5'] || `${baseTitle} (二)`,
                items: cleanTasks.slice(7, 16).map(x => ({ text: x.text, status: x.status }))
            });
        }
    }

    // 动态生成 Slide 3 总结 (提取各页核心亮点)
    const summaryHighlights = [];
    detailPages.forEach(page => {
        if (page.items && page.items.length > 0) {
            summaryHighlights.push(page.items[0].text);
            if (page.items.length > 1 && summaryHighlights.length < 3) {
                summaryHighlights.push(page.items[1].text);
            }
        }
    });
    summaryText = '已完成：' + summaryHighlights.slice(0, 3).join('、') + '。未完成：无';

    // 动态生成 Slide 7 达成率 (从已完成项中提取前 4~5 项代表性成果)
    const allCompleted = [];
    detailPages.forEach(p => {
        (p.items || []).filter(x => x.status === '完成').forEach(x => allCompleted.push(x));
    });
    rateTasks = allCompleted.slice(0, 5).map(c => ({
        task: c.text.endsWith('。') ? c.text : c.text + '。',
        status: '状态：完成。'
    }));

    // 动态生成 Slide 9 计划
    if (params.plans) {
        planItems = params.plans.split(';').map(p => p.trim()).filter(Boolean);
    } else {
        const ongoingList = cleanTasks.filter(x => x.status === '进行中');
        planItems = [];
        if (ongoingList.length > 0) {
            planItems.push(`推进【${ongoingList[0].text}】后续研发与落地交付。`);
        }
        if (projectList.length > 0) {
            planItems.push(`持续进行【${projectList[0]}】系统功能迭代、现场运维与业务需求响应。`);
        } else {
            planItems.push('持续跟进重点业务系统功能迭代开发与现场运维保障。');
        }
        planItems.push('深入各业务环节与数据交互流程，推进系统协同与接口联调。');
        planItems.push('总结沉淀技术规范与自动化工具链，持续提升交付效能。');
    }

    if (!planCardTitle) {
        planCardTitle = projectList.length > 0 ? `${projectList.join('与')}项目` : '业务系统与开发规划';
    }
}

// 确保至少有 2 个明细页对应 Slide 4 与 Slide 5
const page1 = detailPages[0] || { title: '月度总结丨工作明细 (一)', items: [] };
const page2 = detailPages[1] || { title: '月度总结丨工作明细 (二)', items: [] };

console.log(`\n📊 动态页面生成结果:`);
console.log(`• Slide 4 [${page1.title}] 共 ${page1.items.length} 项`);
page1.items.forEach((item, idx) => console.log(`   ${idx+1}. [${item.status}] ${item.text}`));
console.log(`• Slide 5 [${page2.title}] 共 ${page2.items.length} 项`);
page2.items.forEach((item, idx) => console.log(`   ${idx+1}. [${item.status}] ${item.text}`));
console.log(`• Slide 7 [达成率核心项] 共 ${rateTasks.length} 项`);

// =============================================================================
// 2. 解包 PPTX 模板与 XML 无损注入
// =============================================================================
const tempBuildDir = path.join(require('os').tmpdir(), 'pptx_build_' + Date.now());
if (fs.existsSync(tempBuildDir)) fs.rmSync(tempBuildDir, { recursive: true, force: true });
fs.mkdirSync(tempBuildDir, { recursive: true });

console.log('\n2. 解包 PPTX 模板至临时工作区...');
const extractCmd = `powershell -ExecutionPolicy Bypass -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory('${templatePath.replace(/'/g, "''")}', '${tempBuildDir.replace(/'/g, "''")}')"`;
execSync(extractCmd, { stdio: 'inherit' });

const targetDir = tempBuildDir;

// 更新 Slide 1 (封面)
console.log('3. 更新 Slide 1 (封面)...');
const slide1Path = path.join(targetDir, 'ppt', 'slides', 'slide1.xml');
let slide1Xml = fs.readFileSync(slide1Path, 'utf8');
slide1Xml = slide1Xml.replace(/<a:t>江春雨<\/a:t>/g, '<a:t>' + reporterName + '</a:t>');
slide1Xml = slide1Xml.replace(/<a:t>信息技术部<\/a:t>/g, '<a:t>' + reporterGroup + '</a:t>');
if (targetMonth) {
    slide1Xml = slide1Xml.replace(/<a:t>-08<\/a:t>/g, '<a:t>-' + targetMonth + '<\/a:t>');
}
fs.writeFileSync(slide1Path, slide1Xml, 'utf8');

function createWorkItemParagraph(text, status, fontSize, lineSpacingPct) {
    const statusColor = 'FF0000'; // 企业标准状态红
    const sz = fontSize || 1150;
    const lnSpc = lineSpacingPct ? `<a:lnSpc><a:spcPct val="${lineSpacingPct}"/></a:lnSpc>` : '';
    return `<a:p><a:pPr lvl="1">${lnSpc}</a:pPr><a:r><a:rPr lang="zh-CN" altLang="en-US" sz="${sz}" dirty="0"><a:solidFill><a:prstClr val="black"/></a:solidFill><a:latin typeface="微软雅黑"/><a:ea typeface="微软雅黑"/><a:cs typeface="Arial"/></a:rPr><a:t>${text}（</a:t></a:r><a:r><a:rPr lang="zh-CN" altLang="en-US" sz="${sz}" dirty="0"><a:solidFill><a:srgbClr val="${statusColor}"/></a:solidFill><a:latin typeface="微软雅黑"/><a:ea typeface="微软雅黑"/><a:cs typeface="Arial"/></a:rPr><a:t>${status}</a:t></a:r><a:r><a:rPr lang="zh-CN" altLang="en-US" sz="${sz}" dirty="0"><a:solidFill><a:prstClr val="black"/></a:solidFill><a:latin typeface="微软雅黑"/><a:ea typeface="微软雅黑"/><a:cs typeface="Arial"/></a:rPr><a:t>）</a:t></a:r><a:endParaRPr lang="en-US" altLang="zh-CN" sz="${sz}" dirty="0"><a:solidFill><a:prstClr val="black"/></a:solidFill><a:latin typeface="微软雅黑"/><a:ea typeface="微软雅黑"/><a:cs typeface="Arial"/></a:endParaRPr></a:p>`;
}

function makeBulletPara(text) {
    return `<a:p><a:pPr marL="114300" lvl="1" indent="-114300" algn="l" defTabSz="533400"><a:lnSpc><a:spcPct val="90000"/></a:lnSpc><a:spcBef><a:spcPct val="0"/></a:spcBef><a:spcAft><a:spcPct val="15000"/></a:spcAft><a:buChar char="•"/></a:pPr><a:r><a:rPr lang="zh-CN" altLang="en-US" sz="1200" kern="1200" dirty="0"><a:solidFill><a:prstClr val="black"/></a:solidFill><a:latin typeface="微软雅黑"/><a:ea typeface="微软雅黑"/><a:cs typeface="Arial"/></a:rPr><a:t>${text}</a:t></a:r><a:endParaRPr lang="zh-CN" altLang="en-US" sz="1200" b="0" kern="1200" dirty="0"><a:latin typeface="微软雅黑"/><a:ea typeface="微软雅黑"/></a:endParaRPr></a:p>`;
}

function createRateTaskPair(taskName, statusText) {
    const taskPara = `<a:p><a:pPr lvl="1"><a:lnSpc><a:spcPct val="150000"/></a:lnSpc><a:buClr><a:srgbClr val="005E3C"/></a:buClr><a:buFont typeface="Wingdings"/><a:buChar char="l"/><a:defRPr/></a:pPr><a:r><a:rPr lang="zh-CN" altLang="en-US" sz="1200" kern="1200" dirty="0"><a:solidFill><a:prstClr val="black"/></a:solidFill><a:latin typeface="微软雅黑"/><a:ea typeface="微软雅黑"/><a:cs typeface="Arial"/></a:rPr><a:t>${taskName}</a:t></a:r><a:endParaRPr kumimoji="1" lang="zh-CN" altLang="en-US" sz="1200" kern="1200" dirty="0"><a:solidFill><a:prstClr val="black"/></a:solidFill><a:latin typeface="微软雅黑"/><a:ea typeface="微软雅黑"/><a:cs typeface="Arial"/></a:endParaRPr></a:p>`;

    const statusPara = `<a:p><a:pPr marL="190500" lvl="1" indent="-188913"><a:lnSpc><a:spcPct val="150000"/></a:lnSpc><a:buClr><a:srgbClr val="005E3C"/></a:buClr><a:buFont typeface="Wingdings"/><a:buChar char="ü"/><a:defRPr/></a:pPr><a:r><a:rPr kumimoji="1" lang="zh-CN" altLang="en-US" sz="1200"><a:solidFill><a:prstClr val="black"/></a:solidFill><a:latin typeface="微软雅黑"/><a:ea typeface="微软雅黑"/><a:cs typeface="Arial"/></a:rPr><a:t>${statusText}</a:t></a:r><a:endParaRPr kumimoji="1" lang="en-US" altLang="zh-CN" sz="1200"><a:solidFill><a:prstClr val="black"/></a:solidFill><a:latin typeface="微软雅黑"/><a:ea typeface="微软雅黑"/><a:cs typeface="Arial"/></a:endParaRPr></a:p>`;

    return taskPara + statusPara;
}

// 渲染通用明细页 1 -> Slide 4
console.log('4. 渲染通用明细页 1 (' + page1.title + ' -> Slide 4)...');
const slide4Path = path.join(targetDir, 'ppt', 'slides', 'slide4.xml');
let slide4Xml = fs.readFileSync(slide4Path, 'utf8');
const p1SubTitle = page1.title.replace('月度总结丨', '');
slide4Xml = slide4Xml.replace(/(<a:t>月度总结丨<\/a:t><\/a:r><a:r>[\s\S]*?<a:t>)LIMS(<\/a:t>)/, '$1' + p1SubTitle + '$2');
const s4LineSpacing = page1.items.length <= 6 ? 130000 : 120000;
const slide4Paras = page1.items.map(item => createWorkItemParagraph(item.text, item.status, 1150, s4LineSpacing)).join('');
slide4Xml = slide4Xml.replace(/(<p:cNvPr id="15" name="Rectangle 6"[\s\S]*?<p:txBody>[\s\S]*?<a:lstStyle>[\s\S]*?<\/a:lstStyle>)([\s\S]*?)(<\/p:txBody>)/, `$1${slide4Paras}$3`);
fs.writeFileSync(slide4Path, slide4Xml, 'utf8');

// 渲染通用明细页 2 -> Slide 5
console.log('5. 渲染通用明细页 2 (' + page2.title + ' -> Slide 5)...');
const slide5Path = path.join(targetDir, 'ppt', 'slides', 'slide5.xml');
let slide5Xml = fs.readFileSync(slide5Path, 'utf8');
const p2SubTitle = page2.title.replace('月度总结丨', '');
slide5Xml = slide5Xml.replace(/(<a:t>月度总结丨<\/a:t><\/a:r><a:r>[\s\S]*?<a:t>)LIMS(<\/a:t>)/, '$1' + p2SubTitle + '$2');
slide5Xml = slide5Xml.replace(/(<p:cNvPr id="6" name="文本框 5"[\s\S]*?<a:off x="323528" y="339502"\/>\s*<a:ext cx=")3528392(" cy="369332"\/>)/, '$16500000$2');

const s5LineSpacing = page2.items.length <= 7 ? 125000 : 115000;
const slide5Paras = page2.items.map(item => createWorkItemParagraph(item.text, item.status, 1100, s5LineSpacing)).join('');
slide5Xml = slide5Xml.replace(/(<p:cNvPr id="15" name="Rectangle 6"[\s\S]*?<p:txBody>[\s\S]*?<a:lstStyle>[\s\S]*?<\/a:lstStyle>)([\s\S]*?)(<\/p:txBody>)/, `$1${slide5Paras}$3`);
fs.writeFileSync(slide5Path, slide5Xml, 'utf8');

// 更新 Slide 7 (达成率)
console.log('6. 更新 Slide 7 (计划达成率)...');
const slide7Path = path.join(targetDir, 'ppt', 'slides', 'slide7.xml');
let slide7Xml = fs.readFileSync(slide7Path, 'utf8');
const slide7Content = rateTasks.map(t => createRateTaskPair(t.task, t.status)).join('');
slide7Xml = slide7Xml.replace(/(<p:cNvPr id="11" name="Rectangle 6"[\s\S]*?<p:txBody>[\s\S]*?<a:lstStyle>[\s\S]*?<\/a:lstStyle>)([\s\S]*?)(<\/p:txBody>)/, `$1${slide7Content}$3`);
fs.writeFileSync(slide7Path, slide7Xml, 'utf8');

// 更新 Slide 3 & SmartArt (日常工作总览)
console.log('7. 更新 Slide 3 & SmartArt (日常工作总览)...');
const drawing1Path = path.join(targetDir, 'ppt', 'diagrams', 'drawing1.xml');
let drawing1Xml = fs.readFileSync(drawing1Path, 'utf8');
const d1SpList = drawing1Xml.match(/<dsp:sp\b[\s\S]*?<\/dsp:sp>/g);
if (d1SpList && d1SpList.length >= 8) {
    d1SpList[0] = d1SpList[0].replace(/<dsp:txBody>[\s\S]*?<\/dsp:txBody>/,
        `<dsp:txBody><a:bodyPr spcFirstLastPara="0" vert="horz" wrap="square" lIns="638708" tIns="437388" rIns="324000" bIns="85344" numCol="1" spcCol="1270" anchor="t" anchorCtr="0"><a:noAutofit/></a:bodyPr><a:lstStyle/>${makeBulletPara(summaryText)}</dsp:txBody>`);
    drawing1Xml = drawing1Xml.substring(0, drawing1Xml.indexOf('<dsp:sp ')) + d1SpList.join('') + '</dsp:spTree></dsp:drawing>';
    fs.writeFileSync(drawing1Path, drawing1Xml, 'utf8');
}

const data1Path = path.join(targetDir, 'ppt', 'diagrams', 'data1.xml');
let data1Xml = fs.readFileSync(data1Path, 'utf8');
data1Xml = data1Xml.replace(/(<dgm:pt modelId="\{5157490D-1B52-4616-AD62-4BA390AF44B3\}"[\s\S]*?<dgm:t>)([\s\S]*?)(<\/dgm:t>)/,
    `$1<a:bodyPr/><a:lstStyle/>${makeBulletPara(summaryText)}$3`);
fs.writeFileSync(data1Path, data1Xml, 'utf8');

// 更新 Slide 9 & SmartArt (工作计划 - 固定骨架页)
console.log('8. 更新 Slide 9 & SmartArt (工作计划)...');
const slide9Path = path.join(targetDir, 'ppt', 'slides', 'slide9.xml');
let slide9Xml = fs.readFileSync(slide9Path, 'utf8');
slide9Xml = slide9Xml.replace(/<a:t>工作计划丨<\/a:t>/g, '<a:t>工作计划</a:t>');
slide9Xml = slide9Xml.replace(/<a:t>LIMS<\/a:t>/g, '<a:t></a:t>');
fs.writeFileSync(slide9Path, slide9Xml, 'utf8');

const drawing2Path = path.join(targetDir, 'ppt', 'diagrams', 'drawing2.xml');
let drawing2Xml = fs.readFileSync(drawing2Path, 'utf8');
const headerPara = `<a:p><a:pPr marL="0" lvl="0" indent="0" algn="l" defTabSz="622300"><a:lnSpc><a:spcPct val="90000"/></a:lnSpc><a:spcBef><a:spcPct val="0"/></a:spcBef><a:spcAft><a:spcPct val="35000"/></a:spcAft><a:buNone/></a:pPr><a:r><a:rPr lang="zh-CN" altLang="en-US" sz="1400" kern="1200" dirty="0"><a:latin typeface="微软雅黑"/><a:ea typeface="微软雅黑"/></a:rPr><a:t>${planCardTitle}</a:t></a:r><a:endParaRPr lang="zh-CN" altLang="en-US" sz="1400" kern="1200" dirty="0"><a:latin typeface="微软雅黑"/><a:ea typeface="微软雅黑"/></a:endParaRPr></a:p>`;

const planParas = planItems.slice(0, 4).map(p => makeBulletPara(p)).join('');

const d2SpList = drawing2Xml.match(/<dsp:sp\b[\s\S]*?<\/dsp:sp>/g);
if (d2SpList && d2SpList.length >= 2) {
    d2SpList[0] = d2SpList[0].replace(/<dsp:txBody>[\s\S]*?<\/dsp:txBody>/,
        `<dsp:txBody><a:bodyPr spcFirstLastPara="0" vert="horz" wrap="square" lIns="638708" tIns="437388" rIns="324000" bIns="85344" numCol="1" spcCol="1270" anchor="t" anchorCtr="0"><a:noAutofit/></a:bodyPr><a:lstStyle/>${planParas}</dsp:txBody>`);
    
    d2SpList[1] = d2SpList[1].replace(/<dsp:txBody>[\s\S]*?<\/dsp:txBody>/,
        `<dsp:txBody><a:bodyPr spcFirstLastPara="0" vert="horz" wrap="square" lIns="324000" tIns="194400" rIns="324000" bIns="194400" numCol="1" spcCol="1270" anchor="t" anchorCtr="0"><a:noAutofit/></a:bodyPr><a:lstStyle/>${headerPara}</dsp:txBody>`);

    drawing2Xml = drawing2Xml.substring(0, drawing2Xml.indexOf('<dsp:sp ')) + d2SpList.join('') + '</dsp:spTree></dsp:drawing>';
    fs.writeFileSync(drawing2Path, drawing2Xml, 'utf8');
}

const data2Path = path.join(targetDir, 'ppt', 'diagrams', 'data2.xml');
let data2Xml = fs.readFileSync(data2Path, 'utf8');
data2Xml = data2Xml.replace(/(<dgm:pt modelId="\{DC285ABB-E473-4E82-9CB1-E8B30F0C9399\}"[\s\S]*?<dgm:t>)([\s\S]*?)(<\/dgm:t>)/,
    `$1<a:bodyPr/><a:lstStyle/>${headerPara}$3`);

const planGuids = [
    '{5157490D-1B52-4616-AD62-4BA390AF44B3}',
    '{482E8B2C-0940-4EA2-8753-3073C97E81EF}',
    '{81FB98D7-C50E-4699-B081-C8B44EAC3CDC}',
    '{15EB4FDE-871D-4F48-8C92-BEE4CD173791}'
];

planItems.slice(0, 4).forEach((item, idx) => {
    const guid = planGuids[idx];
    const regex = new RegExp('(<dgm:pt modelId="\\' + guid + '"[\\s\\S]*?<dgm:t>)([\\s\\S]*?)(<\\/dgm:t>)');
    data2Xml = data2Xml.replace(regex, `$1<a:bodyPr/><a:lstStyle/>${makeBulletPara(item)}$3`);
});
fs.writeFileSync(data2Path, data2Xml, 'utf8');

// 封包
console.log('\n9. 重新打包为目标 PPTX: ' + outputPath);
if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
const parentDir = path.dirname(outputPath);
if (!fs.existsSync(parentDir)) fs.mkdirSync(parentDir, { recursive: true });

const packCmd = `powershell -ExecutionPolicy Bypass -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory('${tempBuildDir.replace(/'/g, "''")}', '${outputPath.replace(/'/g, "''")}')"`;
execSync(packCmd, { stdio: 'inherit' });

try {
    fs.rmSync(tempBuildDir, { recursive: true, force: true });
} catch (e) {}

console.log('\n🎉 月报 PPTX 动态生成完毕: ' + outputPath);
