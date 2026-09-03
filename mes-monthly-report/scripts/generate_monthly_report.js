#!/usr/bin/env node
/**
 * MES Monthly Report Generator CLI
 * Automatically parses work record JSON, dynamically extracts tasks, 
 * classifies business dimensions, and injects into PPTX presentation.
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
MES 月报 PPT 动态解析与自动生成工具
=============================================================================
用法: node generate_monthly_report.js [参数]

核心参数:
  --input <path>          工作记录 JSON 文件路径 (必需或默认读取 sample_work_record.json)
  --template <path>       企业月报 PPT 模板路径 (默认: Monthly_Report_202608_cyjiang.pptx)
  --output <path>         输出 PPTX 保存路径 (默认: 用户桌面)
  --name <string>         汇报人姓名 (默认: 自动从 JSON 解析)
  --group <string>        所属班组/部门 (默认: 自动从 JSON 解析)

时间范围筛选参数:
  --month <string>        按月份过滤 (如 "08", "09", "202608")
  --start-date <YYYYMMDD> 起始日期 (包含)，如 "20260801"
  --end-date <YYYYMMDD>   截止日期 (包含)，如 "20260831"
  --range <string>        快捷区间，如 "20260826-20260902"

自定义标题覆盖 (可选):
  --title-slide4 <string> Slide 4 页面标题 (默认: 月度总结丨MES系统开发)
  --title-slide5 <string> Slide 5 页面标题 (默认: 月度总结丨PDA开发与技术攻关)
  --plan-title <string>   Slide 9 计划卡片标题 (默认: MES与PDA项目)
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
// 1. 读取并动态解析 JSON 数据
// =============================================================================
console.log('1. 读取并解析输入数据: ' + inputJsonPath);
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

let slide4Items = [];
let slide5Items = [];
let rateTasks = [];
let planItems = [];
let summaryText = '';
let slide4Title = params['title-slide4'] || '月度总结丨MES系统开发';
let slide5Title = params['title-slide5'] || '月度总结丨PDA开发与技术攻关';
let planCardTitle = params['plan-title'] || 'MES与PDA项目';

// 判断是否为结构化预置 JSON (Case B)
if (rawData.slide4Items || rawData.slide5Items) {
    console.log('ℹ️ 检测到结构化预置 JSON，直接应用预设条目。');
    reporterName = reporterName || rawData.name || '开发工程师';
    reporterGroup = reporterGroup || rawData.group || '智能制造组';
    targetMonth = targetMonth || rawData.month || '08';
    slide4Items = rawData.slide4Items || [];
    slide5Items = rawData.slide5Items || [];
    rateTasks = rawData.rateTasks || [];
    planItems = rawData.planItems || [];
    summaryText = rawData.summary || '';
    if (rawData.slide4Title) slide4Title = rawData.slide4Title;
    if (rawData.slide5Title) slide5Title = rawData.slide5Title;
    if (rawData.planTitle) planCardTitle = rawData.planTitle;
} else {
    // 动态智能解析系统原始工作记录 (Case A)
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
    console.log('=============================================================================');

    if (filteredRows.length === 0) {
        console.warn('⚠️ 警告: 指定时间范围内未匹配到记录，将使用全量数据。');
        filteredRows = rows;
    }

    // 提取所有原始任务
    const extractedTasks = [];
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
                    if (nc['项目名称']) projectName = nc['项目名称'];
                } catch (e) {}
            }
            // 文本清洗：去除 URL、换行符转换为中文分句
            desc = desc.replace(/https?:\/\/\S+/gi, '').replace(/[\r\n]+/g, '，').trim();
            desc = desc.replace(/^[，,\s]+|[，,\s]+$/g, '').trim();
            if (!desc) continue;

            const isDone = item.progress === '100' || parseInt(item.progress || '100', 10) >= 100;
            let status = isDone ? '完成' : '进行中';
            if (desc.includes('学习自学习') || desc.includes('探索使用')) {
                status = '进行中';
            }

            extractedTasks.push({
                text: desc,
                status,
                type: item.type || '开发',
                projectName,
                date: r.date
            });
        }
    }

    // 去重与合并（按文本相似度/完全相同去重）
    const uniqueMap = new Map();
    for (const t of extractedTasks) {
        if (!uniqueMap.has(t.text)) {
            uniqueMap.set(t.text, t);
        }
    }
    const cleanTasks = Array.from(uniqueMap.values());

    // 业务分类逻辑 (MES管理端业务 vs PDA/架构/AI/工控)
    const isTechPdaAiOrTraining = (txt) => /PDA|MUI|Vue|ASHX|BLL|DAL|Skill|Workflow|工作流|Router|Kepware|OPC|POP|机台|点位|Agent|Hermes|MCP|考试|知能|守护天使|人力|培训/i.test(txt);
    const isMesBiz = (txt) => /MES|管理端|WinForms|半成品|物料|流转|周期|投入记录|质量|顾工|王处长|宋工|乔工|乔洪磊|界面|报表|权限|授权|业务|表单/i.test(txt);

    for (const t of cleanTasks) {
        if (isMesBiz(t.text) && !isTechPdaAiOrTraining(t.text)) {
            slide4Items.push({ text: t.text, status: t.status });
        } else if (isTechPdaAiOrTraining(t.text)) {
            slide5Items.push({ text: t.text, status: t.status });
        } else {
            if (t.type === '开发') slide4Items.push({ text: t.text, status: t.status });
            else slide5Items.push({ text: t.text, status: t.status });
        }
    }

    // 若某一类数量过多，适当截取高价值项防溢出 (Slide 4 最多 7 条，Slide 5 最多 9 条)
    if (slide4Items.length > 7) slide4Items = slide4Items.slice(0, 7);
    if (slide5Items.length > 9) slide5Items = slide5Items.slice(0, 9);

    // 动态生成 Slide 3 总结 (日常工作总览)
    const topDone = [];
    if (slide4Items.length > 0) topDone.push(slide4Items[0].text.replace(/（.*$/, ''));
    if (slide4Items.length > 1) topDone.push(slide4Items[1].text.replace(/（.*$/, ''));
    if (slide5Items.length > 0) topDone.push(slide5Items[0].text.replace(/（.*$/, ''));
    summaryText = '已完成：' + topDone.slice(0, 3).join('、') + '。未完成：无';

    // 动态生成 Slide 7 达成率 (选取 4~5 项重点完成成果)
    const candidates = [...slide4Items, ...slide5Items].filter(x => x.status === '完成');
    rateTasks = candidates.slice(0, 5).map(c => ({
        task: c.text.endsWith('。') ? c.text : c.text + '。',
        status: '状态：完成。'
    }));

    // 动态生成 Slide 9 计划 (优先延续进行中任务，辅以模块规划)
    planItems = [
        'MES管理端与PDA业务功能持续迭代开发与生产现场运维保障。',
        '深入Kepware工控点位对接与POP系统交互联调，推进设备数采与机台联动。',
        '持续补充完善MES AI Skill体系与工作流，深化管理端与PDA自动化开发。',
        '推进自学习Agent及自动化工具链落地，提高业务需求交付与测试效能。'
    ];
}

console.log(`\n📊 动态提炼结果:`);
console.log(`• Slide 4 [MES业务开发] 提取到 ${slide4Items.length} 项`);
slide4Items.forEach((item, idx) => console.log(`   ${idx+1}. [${item.status}] ${item.text}`));
console.log(`• Slide 5 [PDA与技术攻关] 提取到 ${slide5Items.length} 项`);
slide5Items.forEach((item, idx) => console.log(`   ${idx+1}. [${item.status}] ${item.text}`));
console.log(`• Slide 7 [达成率核心项] 提取到 ${rateTasks.length} 项`);

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
    const statusColor = 'FF0000'; // Prinx Chengshan Red
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

// 更新 Slide 4 (MES业务)
console.log('4. 更新 Slide 4 (' + slide4Title + ')...');
const slide4Path = path.join(targetDir, 'ppt', 'slides', 'slide4.xml');
let slide4Xml = fs.readFileSync(slide4Path, 'utf8');
slide4Xml = slide4Xml.replace(/(<a:t>月度总结丨<\/a:t><\/a:r><a:r>[\s\S]*?<a:t>)LIMS(<\/a:t>)/, '$1' + slide4Title.replace('月度总结丨', '') + '$2');
const s4LineSpacing = slide4Items.length <= 6 ? 130000 : 120000;
const slide4Paras = slide4Items.map(item => createWorkItemParagraph(item.text, item.status, 1150, s4LineSpacing)).join('');
slide4Xml = slide4Xml.replace(/(<p:cNvPr id="15" name="Rectangle 6"[\s\S]*?<p:txBody>[\s\S]*?<a:lstStyle>[\s\S]*?<\/a:lstStyle>)([\s\S]*?)(<\/p:txBody>)/, `$1${slide4Paras}$3`);
fs.writeFileSync(slide4Path, slide4Xml, 'utf8');

// 更新 Slide 5 (PDA/技术攻关)
console.log('5. 更新 Slide 5 (' + slide5Title + ')...');
const slide5Path = path.join(targetDir, 'ppt', 'slides', 'slide5.xml');
let slide5Xml = fs.readFileSync(slide5Path, 'utf8');
slide5Xml = slide5Xml.replace(/(<a:t>月度总结丨<\/a:t><\/a:r><a:r>[\s\S]*?<a:t>)LIMS(<\/a:t>)/, '$1' + slide5Title.replace('月度总结丨', '') + '$2');
slide5Xml = slide5Xml.replace(/(<p:cNvPr id="6" name="文本框 5"[\s\S]*?<a:off x="323528" y="339502"\/>\s*<a:ext cx=")3528392(" cy="369332"\/>)/, '$16500000$2');

const s5LineSpacing = slide5Items.length <= 7 ? 125000 : 115000;
const slide5Paras = slide5Items.map(item => createWorkItemParagraph(item.text, item.status, 1100, s5LineSpacing)).join('');
slide5Xml = slide5Xml.replace(/(<p:cNvPr id="15" name="Rectangle 6"[\s\S]*?<p:txBody>[\s\S]*?<a:lstStyle>[\s\S]*?<\/a:lstStyle>)([\s\S]*?)(<\/p:txBody>)/, `$1${slide5Paras}$3`);
fs.writeFileSync(slide5Path, slide5Xml, 'utf8');

// 更新 Slide 7 (达成率)
console.log('6. 更新 Slide 7 (计划达成率)...');
const slide7Path = path.join(targetDir, 'ppt', 'slides', 'slide7.xml');
let slide7Xml = fs.readFileSync(slide7Path, 'utf8');
const slide7Content = rateTasks.map(t => createRateTaskPair(t.task, t.status)).join('');
slide7Xml = slide7Xml.replace(/(<p:cNvPr id="11" name="Rectangle 6"[\s\S]*?<p:txBody>[\s\S]*?<a:lstStyle>[\s\S]*?<\/a:lstStyle>)([\s\S]*?)(<\/p:txBody>)/, `$1${slide7Content}$3`);
fs.writeFileSync(slide7Path, slide7Xml, 'utf8');

// 更新 Slide 3 & SmartArt (日常工作)
console.log('7. 更新 Slide 3 & SmartArt (日常工作概括)...');
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

// 更新 Slide 9 & SmartArt (工作计划)
console.log('8. 更新 Slide 9 & SmartArt (工作计划)...');
const slide9Path = path.join(targetDir, 'ppt', 'slides', 'slide9.xml');
let slide9Xml = fs.readFileSync(slide9Path, 'utf8');
slide9Xml = slide9Xml.replace(/<a:t>LIMS<\/a:t>/g, '<a:t>智能制造与MES开发<\/a:t>');
fs.writeFileSync(slide9Path, slide9Xml, 'utf8');

const drawing2Path = path.join(targetDir, 'ppt', 'diagrams', 'drawing2.xml');
let drawing2Xml = fs.readFileSync(drawing2Path, 'utf8');
const headerPara = `<a:p><a:pPr marL="0" lvl="0" indent="0" algn="l" defTabSz="622300"><a:lnSpc><a:spcPct val="90000"/></a:lnSpc><a:spcBef><a:spcPct val="0"/></a:spcBef><a:spcAft><a:spcPct val="35000"/></a:spcAft><a:buNone/></a:pPr><a:r><a:rPr lang="zh-CN" altLang="en-US" sz="1400" kern="1200" dirty="0"><a:latin typeface="微软雅黑"/><a:ea typeface="微软雅黑"/></a:rPr><a:t>${planCardTitle}</a:t></a:r><a:endParaRPr lang="zh-CN" altLang="en-US" sz="1400" kern="1200" dirty="0"><a:latin typeface="微软雅黑"/><a:ea typeface="微软雅黑"/></a:endParaRPr></a:p>`;

const planParas = planItems.map(p => makeBulletPara(p)).join('');

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
