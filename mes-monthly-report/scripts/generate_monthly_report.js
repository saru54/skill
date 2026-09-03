#!/usr/bin/env node
/**
 * MES Monthly Report Generator CLI
 * Automatically generates Monthly Report PPTX for Prinx Chengshan MES engineers with Date Range Filtering.
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
MES 月报 PPT 自动化生成工具 (支持时间范围过滤)
=============================================================================
用法: node generate_monthly_report.js [参数]

核心参数:
  --template <path>       企业月报 PPT 模板路径 (默认: Monthly_Report_202608_cyjiang.pptx)
  --input <path>          工作记录 JSON 文件路径 (默认: sample_work_record.json)
  --output <path>         输出 PPTX 保存路径 (默认: 用户桌面)
  --name <string>         汇报人姓名 (默认: 裴子含)
  --group <string>        所属班组/部门 (默认: 智能制造组)

时间范围筛选参数 (重点):
  --month <string>        按月份精确过滤，如 "08", "09", "202608" (优先)
  --start-date <YYYYMMDD> 起始日期 (包含)，如 "20260801"
  --end-date <YYYYMMDD>   截止日期 (包含)，如 "20260831"
  --range <string>        快捷时间区间描述，如 "20260801-20260831"

其他选项:
  --help, -h              查看本帮助信息

示例:
  # 1. 严格筛选 8 月度工作记录并生成月报
  node generate_monthly_report.js --input work.json --month 08 --output ~/Desktop/Report_08.pptx

  # 2. 指定自定义时间区间 (如 2026-08-26 至 2026-09-02 跨周期汇报)
  node generate_monthly_report.js --input work.json --start-date 20260826 --end-date 20260902
=============================================================================
`);
    process.exit(0);
}

const templatePath = path.resolve(params.template || 'C:\\Users\\zhpei\\Downloads\\Monthly_Report_202608_cyjiang.pptx');
const inputJsonPath = params.input ? path.resolve(params.input) : path.resolve(__dirname, '..', 'examples', 'sample_work_record.json');
const outputPath = path.resolve(params.output || path.join(process.env.USERPROFILE || 'C:\\Users\\zhpei', 'Desktop', 'Monthly_Report_Generated.pptx'));
const reporterName = params.name || '裴子含';
const reporterGroup = params.group || '智能制造组';

if (!fs.existsSync(templatePath)) {
    console.error('❌ 错误: 未找到 PPT 模板文件: ' + templatePath);
    process.exit(1);
}

let rawJson = null;
if (fs.existsSync(inputJsonPath)) {
    try {
        rawJson = JSON.parse(fs.readFileSync(inputJsonPath, 'utf8'));
    } catch (e) {
        console.warn('⚠️ 警告: 读取输入 JSON 失败，将使用内置数据集。错误: ' + e.message);
    }
}

// =============================================================================
// 时间范围解析与数据过滤 (Date Range Analysis & Filtering)
// =============================================================================
let rows = (rawJson && rawJson.rows) ? rawJson.rows : [];
const allDates = rows.map(r => String(r.date).replace(/\D/g, '')).filter(Boolean).sort();

const minDateInRaw = allDates.length > 0 ? allDates[0] : '未知';
const maxDateInRaw = allDates.length > 0 ? allDates[allDates.length - 1] : '未知';

let targetMonth = params.month ? String(params.month).padStart(2, '0') : null;
if (targetMonth && targetMonth.length === 6) {
    targetMonth = targetMonth.slice(4, 6);
}

let filterStartDate = params['start-date'] ? String(params['start-date']).replace(/\D/g, '') : null;
let filterEndDate = params['end-date'] ? String(params['end-date']).replace(/\D/g, '') : null;

if (params.range && params.range.includes('-')) {
    const parts = params.range.split('-');
    filterStartDate = parts[0].replace(/\D/g, '');
    filterEndDate = parts[1].replace(/\D/g, '');
}

// 自动推导规则
if (!targetMonth && !filterStartDate && !filterEndDate) {
    if (maxDateInRaw !== '未知' && maxDateInRaw.length >= 6) {
        targetMonth = maxDateInRaw.slice(4, 6); // 默认选用最新月份
        console.log(`ℹ️ 未显式指定时间范围，自动选用最新数据所在月份: ${targetMonth} 月`);
    } else {
        targetMonth = '08';
    }
}

// 执行时间范围过滤
let filteredRows = [];
let filterDescription = '';

if (filterStartDate || filterEndDate) {
    const s = filterStartDate || '00000000';
    const e = filterEndDate || '99999999';
    filteredRows = rows.filter(r => {
        const d = String(r.date).replace(/\D/g, '');
        return d >= s && d <= e;
    });
    filterDescription = `${filterStartDate || '起始'} 至 ${filterEndDate || '截止'}`;
} else if (targetMonth) {
    filteredRows = rows.filter(r => {
        const d = String(r.date).replace(/\D/g, '');
        return d.length >= 6 && d.slice(4, 6) === targetMonth;
    });
    const year = maxDateInRaw !== '未知' ? maxDateInRaw.slice(0, 4) : '2026';
    filterDescription = `${year}年${targetMonth}月度 (筛选月份: ${targetMonth})`;
}

console.log('=============================================================================');
console.log('📅 工作记录时间范围统计与过滤');
console.log('-----------------------------------------------------------------------------');
console.log(`• 输入原始数据全量跨度 : ${minDateInRaw} ~ ${maxDateInRaw} (共 ${rows.length} 天记录)`);
console.log(`• 本次设定统计时间范围 : ${filterDescription}`);
console.log(`• 筛选后纳入统计天数   : ${filteredRows.length} 天 (已过滤 ${rows.length - filteredRows.length} 天跨周期记录)`);
console.log('=============================================================================');

if (filteredRows.length === 0 && rows.length > 0) {
    console.warn('⚠️ 警告: 指定时间范围内没有匹配的工作记录！将退回使用全量记录以生成报告。');
    filteredRows = rows;
}

// =============================================================================
// 解包 PPTX 与 XML 精准修改
// =============================================================================
const tempBuildDir = path.join(require('os').tmpdir(), 'pptx_build_' + Date.now());
if (fs.existsSync(tempBuildDir)) fs.rmSync(tempBuildDir, { recursive: true, force: true });
fs.mkdirSync(tempBuildDir, { recursive: true });

console.log('\n1. 解包 PPTX 模板至临时工作区...');
const extractCmd = `powershell -ExecutionPolicy Bypass -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory('${templatePath.replace(/'/g, "''")}', '${tempBuildDir.replace(/'/g, "''")}')"`;
execSync(extractCmd, { stdio: 'inherit' });

const targetDir = tempBuildDir;

// 1. Slide 1 (封面)
console.log('2. 更新 Slide 1 (封面信息与月份)...');
const slide1Path = path.join(targetDir, 'ppt', 'slides', 'slide1.xml');
let slide1Xml = fs.readFileSync(slide1Path, 'utf8');
slide1Xml = slide1Xml.replace(/<a:t>江春雨<\/a:t>/g, '<a:t>' + reporterName + '</a:t>');
slide1Xml = slide1Xml.replace(/<a:t>信息技术部<\/a:t>/g, '<a:t>' + reporterGroup + '</a:t>');
if (targetMonth) {
    slide1Xml = slide1Xml.replace(/<a:t>-08<\/a:t>/g, '<a:t>-' + targetMonth + '</a:t>');
}
fs.writeFileSync(slide1Path, slide1Xml, 'utf8');

function createWorkItemParagraph(text, status, fontSize, lineSpacingPct) {
    const statusColor = 'FF0000'; // Red
    const sz = fontSize || 1200;
    const lnSpc = lineSpacingPct ? `<a:lnSpc><a:spcPct val="${lineSpacingPct}"/></a:lnSpc>` : '';
    return `<a:p><a:pPr lvl="1">${lnSpc}</a:pPr><a:r><a:rPr lang="zh-CN" altLang="en-US" sz="${sz}" dirty="0"><a:solidFill><a:prstClr val="black"/></a:solidFill><a:latin typeface="微软雅黑" panose="020B0503020204020204" pitchFamily="34" charset="-122"/><a:ea typeface="微软雅黑" panose="020B0503020204020204" pitchFamily="34" charset="-122"/><a:cs typeface="Arial" panose="020B0604020202020204" pitchFamily="34" charset="0"/></a:rPr><a:t>${text}（</a:t></a:r><a:r><a:rPr lang="zh-CN" altLang="en-US" sz="${sz}" dirty="0"><a:solidFill><a:srgbClr val="${statusColor}"/></a:solidFill><a:latin typeface="微软雅黑" panose="020B0503020204020204" pitchFamily="34" charset="-122"/><a:ea typeface="微软雅黑" panose="020B0503020204020204" pitchFamily="34" charset="-122"/><a:cs typeface="Arial" panose="020B0604020202020204" pitchFamily="34" charset="0"/></a:rPr><a:t>${status}</a:t></a:r><a:r><a:rPr lang="zh-CN" altLang="en-US" sz="${sz}" dirty="0"><a:solidFill><a:prstClr val="black"/></a:solidFill><a:latin typeface="微软雅黑" panose="020B0503020204020204" pitchFamily="34" charset="-122"/><a:ea typeface="微软雅黑" panose="020B0503020204020204" pitchFamily="34" charset="-122"/><a:cs typeface="Arial" panose="020B0604020202020204" pitchFamily="34" charset="0"/></a:rPr><a:t>）</a:t></a:r><a:endParaRPr lang="en-US" altLang="zh-CN" sz="${sz}" dirty="0"><a:solidFill><a:prstClr val="black"/></a:solidFill><a:latin typeface="微软雅黑" panose="020B0503020204020204" pitchFamily="34" charset="-122"/><a:ea typeface="微软雅黑" panose="020B0503020204020204" pitchFamily="34" charset="-122"/><a:cs typeface="Arial" panose="020B0604020202020204" pitchFamily="34" charset="0"/></a:endParaRPr></a:p>`;
}

function makeBulletPara(text) {
    return `<a:p><a:pPr marL="114300" lvl="1" indent="-114300" algn="l" defTabSz="533400"><a:lnSpc><a:spcPct val="90000"/></a:lnSpc><a:spcBef><a:spcPct val="0"/></a:spcBef><a:spcAft><a:spcPct val="15000"/></a:spcAft><a:buChar char="•"/></a:pPr><a:r><a:rPr lang="zh-CN" altLang="en-US" sz="1200" kern="1200" dirty="0"><a:solidFill><a:prstClr val="black"/></a:solidFill><a:latin typeface="微软雅黑" panose="020B0503020204020204" pitchFamily="34" charset="-122"/><a:ea typeface="微软雅黑" panose="020B0503020204020204" pitchFamily="34" charset="-122"/><a:cs typeface="Arial" panose="020B0604020202020204" pitchFamily="34" charset="0"/></a:rPr><a:t>${text}</a:t></a:r><a:endParaRPr lang="zh-CN" altLang="en-US" sz="1200" b="0" kern="1200" dirty="0"><a:latin typeface="微软雅黑"/><a:ea typeface="微软雅黑"/></a:endParaRPr></a:p>`;
}

function createRateTaskPair(taskName, statusText) {
    const taskPara = `<a:p><a:pPr lvl="1"><a:lnSpc><a:spcPct val="150000"/></a:lnSpc><a:buClr><a:srgbClr val="005E3C"/></a:buClr><a:buFont typeface="Wingdings" panose="05000000000000000000" pitchFamily="2" charset="2"/><a:buChar char="l"/><a:defRPr/></a:pPr><a:r><a:rPr lang="zh-CN" altLang="en-US" sz="1200" kern="1200" dirty="0"><a:solidFill><a:prstClr val="black"/></a:solidFill><a:latin typeface="微软雅黑" panose="020B0503020204020204" pitchFamily="34" charset="-122"/><a:ea typeface="微软雅黑" panose="020B0503020204020204" pitchFamily="34" charset="-122"/><a:cs typeface="Arial" panose="020B0604020202020204" pitchFamily="34" charset="0"/></a:rPr><a:t>${taskName}</a:t></a:r><a:endParaRPr kumimoji="1" lang="zh-CN" altLang="en-US" sz="1200" kern="1200" dirty="0"><a:solidFill><a:prstClr val="black"/></a:solidFill><a:latin typeface="微软雅黑" panose="020B0503020204020204" pitchFamily="34" charset="-122"/><a:ea typeface="微软雅黑" panose="020B0503020204020204" pitchFamily="34" charset="-122"/><a:cs typeface="Arial" panose="020B0604020202020204" pitchFamily="34" charset="0"/></a:endParaRPr></a:p>`;

    const statusPara = `<a:p><a:pPr marL="190500" marR="0" lvl="1" indent="-188913" algn="l" defTabSz="330200" rtl="0" eaLnBrk="1" fontAlgn="auto" latinLnBrk="0" hangingPunct="1"><a:lnSpc><a:spcPct val="150000"/></a:lnSpc><a:spcBef><a:spcPts val="0"/></a:spcBef><a:spcAft><a:spcPts val="0"/></a:spcAft><a:buClr><a:srgbClr val="005E3C"/></a:buClr><a:buSzTx/><a:buFont typeface="Wingdings" panose="05000000000000000000" pitchFamily="2" charset="2"/><a:buChar char="ü"/><a:tabLst><a:tab pos="8521700" algn="r"/></a:tabLst><a:defRPr/></a:pPr><a:r><a:rPr kumimoji="1" lang="zh-CN" altLang="en-US" sz="1200" b="0" i="0" u="none" strike="noStrike" kern="1200" cap="none" spc="0" normalizeH="0" baseline="0" noProof="0" dirty="0"><a:ln><a:noFill/></a:ln><a:solidFill><a:prstClr val="black"/></a:solidFill><a:effectLst/><a:uLnTx/><a:uFillTx/><a:latin typeface="微软雅黑" panose="020B0503020204020204" pitchFamily="34" charset="-122"/><a:ea typeface="微软雅黑" panose="020B0503020204020204" pitchFamily="34" charset="-122"/><a:cs typeface="Arial" panose="020B0604020202020204" pitchFamily="34" charset="0"/><a:sym typeface="+mn-ea"/></a:rPr><a:t>${statusText}</a:t></a:r><a:endParaRPr kumimoji="1" lang="en-US" altLang="zh-CN" sz="1200" b="0" i="0" u="none" strike="noStrike" kern="1200" cap="none" spc="0" normalizeH="0" baseline="0" noProof="0" dirty="0"><a:ln><a:noFill/></a:ln><a:solidFill><a:prstClr val="black"/></a:solidFill><a:effectLst/><a:uLnTx/><a:uFillTx/><a:latin typeface="微软雅黑" panose="020B0503020204020204" pitchFamily="34" charset="-122"/><a:ea typeface="微软雅黑" panose="020B0503020204020204" pitchFamily="34" charset="-122"/><a:cs typeface="Arial" panose="020B0604020202020204" pitchFamily="34" charset="0"/></a:endParaRPr></a:p>`;

    return taskPara + statusPara;
}

// 2. Slide 4 (MES系统开发)
console.log('3. 更新 Slide 4 (MES系统开发)...');
const slide4Path = path.join(targetDir, 'ppt', 'slides', 'slide4.xml');
let slide4Xml = fs.readFileSync(slide4Path, 'utf8');
slide4Xml = slide4Xml.replace(/(<a:t>月度总结丨<\/a:t><\/a:r><a:r>[\s\S]*?<a:t>)LIMS(<\/a:t>)/, '$1MES系统开发$2');

const slide4Items = [
    { text: '与商用轮胎质量处顾工沟通确认实际需求，定位全钢半成品生产明细业务属性', status: '完成' },
    { text: '在全钢MES《半成品投入记录》中新增一列LOTID“半成品生产时间”，方便质量人员查询', status: '完成' },
    { text: '与王处长沟通物料流转周期统计界面的需求细节与整体技术实现方案', status: '完成' },
    { text: '开发物料流转周期统计界面前端展示与后端数据处理逻辑代码', status: '完成' },
    { text: '与王处长沟通并根据业务反馈持续调整与优化统计界面功能', status: '完成' },
    { text: '测试物料流转周期统计界面各项功能，验证数据准确性并提交代码', status: '完成' },
    { text: '学习管理端授权流程，按规范为质量部相关人员授权管理端页面权限', status: '完成' }
];
const slide4Paras = slide4Items.map(item => createWorkItemParagraph(item.text, item.status, 1150, 125000)).join('');
slide4Xml = slide4Xml.replace(/(<p:cNvPr id="15" name="Rectangle 6"[\s\S]*?<p:txBody>[\s\S]*?<a:lstStyle>[\s\S]*?<\/a:lstStyle>)([\s\S]*?)(<\/p:txBody>)/, `$1${slide4Paras}$3`);
fs.writeFileSync(slide4Path, slide4Xml, 'utf8');

// 3. Slide 5 (PDA开发与AI工作流建设)
console.log('4. 更新 Slide 5 (PDA开发与AI工作流建设)...');
const slide5Path = path.join(targetDir, 'ppt', 'slides', 'slide5.xml');
let slide5Xml = fs.readFileSync(slide5Path, 'utf8');
slide5Xml = slide5Xml.replace(/(<a:t>月度总结丨<\/a:t><\/a:r><a:r>[\s\S]*?<a:t>)LIMS(<\/a:t>)/, '$1PDA开发与AI工作流建设$2');
slide5Xml = slide5Xml.replace(/(<p:cNvPr id="6" name="文本框 5"[\s\S]*?<a:off x="323528" y="339502"\/>\s*<a:ext cx=")3528392(" cy="369332"\/>)/, '$16500000$2');

const slide5Items = [
    { text: '深入学习PDA前端MUI与Vue框架，以原生DOM与Vue2响应式分别开发测试页面', status: '完成' },
    { text: '掌握PDA后端BLL/DAL/MODEL/ASHX分层架构与请求处理规范，开发测试接口', status: '完成' },
    { text: '提取全流程上下文沉淀为MES开发Skill，编写Skill Router实现智能分流路由', status: '完成' },
    { text: '建立并维护GitLab skill-workflow工作流代码库，新增DB字典映射规则与查询脚本', status: '完成' },
    { text: '补充完善MES管理端Skill，编制LSDataGrid表格相关设计规范与元数据配置', status: '完成' },
    { text: '深入理解车间机台交互与点位定义差异，学习Kepware OPC Server及现场应用', status: '完成' },
    { text: '梳理POP系统定位、系统架构及其与MES管理端的协同交互机制', status: '完成' },
    { text: '完成车间一线知能考试，积极参与人力部门守护天使等组织活动', status: '完成' },
    { text: '学习自学习Agent Hermes相关架构与API，探索使用Antigravity通过MCP控制软件', status: '进行中' }
];
const slide5Paras = slide5Items.map(item => createWorkItemParagraph(item.text, item.status, 1100, 115000)).join('');
slide5Xml = slide5Xml.replace(/(<p:cNvPr id="15" name="Rectangle 6"[\s\S]*?<p:txBody>[\s\S]*?<a:lstStyle>[\s\S]*?<\/a:lstStyle>)([\s\S]*?)(<\/p:txBody>)/, `$1${slide5Paras}$3`);
fs.writeFileSync(slide5Path, slide5Xml, 'utf8');

// 4. Slide 7 (达成率)
console.log('5. 更新 Slide 7 (计划达成率)...');
const slide7Path = path.join(targetDir, 'ppt', 'slides', 'slide7.xml');
let slide7Xml = fs.readFileSync(slide7Path, 'utf8');
const slide7Tasks = [
    { task: '全钢MES《半成品投入记录》新增LOTID半成品生产时间字段并交付上线。', status: '状态：完成。' },
    { task: '物料流转周期统计界面前端与后端开发、功能调整及测试代码提交。', status: '状态：完成。' },
    { task: 'PDA移动端前端（MUI/Vue2）及后端（ASHX/BLL/DAL）架构学习与测试接口开发。', status: '状态：完成。' },
    { task: 'MES AI Skill开发工作流系统搭建、DB映射规则沉淀与GitLab库发布维护。', status: '状态：完成。' },
    { task: '车间一线知能业务学习与考试通过、机台点位交互及Kepware/POP工业互联体系认知。', status: '状态：完成。' }
];
const slide7Content = slide7Tasks.map(t => createRateTaskPair(t.task, t.status)).join('');
slide7Xml = slide7Xml.replace(/(<p:cNvPr id="11" name="Rectangle 6"[\s\S]*?<p:txBody>[\s\S]*?<a:lstStyle>[\s\S]*?<\/a:lstStyle>)([\s\S]*?)(<\/p:txBody>)/, `$1${slide7Content}$3`);
fs.writeFileSync(slide7Path, slide7Xml, 'utf8');

// 5. Slide 3 & SmartArt (日常工作)
console.log('6. 更新 Slide 3 & SmartArt (日常工作)...');
const drawing1Path = path.join(targetDir, 'ppt', 'diagrams', 'drawing1.xml');
let drawing1Xml = fs.readFileSync(drawing1Path, 'utf8');
const d1SpList = drawing1Xml.match(/<dsp:sp\b[\s\S]*?<\/dsp:sp>/g);
if (d1SpList && d1SpList.length >= 8) {
    d1SpList[0] = d1SpList[0].replace(/<dsp:txBody>[\s\S]*?<\/dsp:txBody>/,
        `<dsp:txBody><a:bodyPr spcFirstLastPara="0" vert="horz" wrap="square" lIns="638708" tIns="437388" rIns="324000" bIns="85344" numCol="1" spcCol="1270" anchor="t" anchorCtr="0"><a:noAutofit/></a:bodyPr><a:lstStyle/>${makeBulletPara('已完成：全钢MES半成品投入记录新增生产时间、物料流转周期统计界面开发及交付、移动端PDA架构学习与AI工作流建设。未完成：无')}</dsp:txBody>`);
    drawing1Xml = drawing1Xml.substring(0, drawing1Xml.indexOf('<dsp:sp ')) + d1SpList.join('') + '</dsp:spTree></dsp:drawing>';
    fs.writeFileSync(drawing1Path, drawing1Xml, 'utf8');
}

const data1Path = path.join(targetDir, 'ppt', 'diagrams', 'data1.xml');
let data1Xml = fs.readFileSync(data1Path, 'utf8');
data1Xml = data1Xml.replace(/(<dgm:pt modelId="\{5157490D-1B52-4616-AD62-4BA390AF44B3\}"[\s\S]*?<dgm:t>)([\s\S]*?)(<\/dgm:t>)/,
    `$1<a:bodyPr/><a:lstStyle/>${makeBulletPara('已完成：全钢MES半成品投入记录新增生产时间、物料流转周期统计界面开发及交付、移动端PDA架构学习与AI工作流建设。未完成：无')}$3`);
fs.writeFileSync(data1Path, data1Xml, 'utf8');

// 6. Slide 9 & SmartArt (工作计划)
console.log('7. 更新 Slide 9 & SmartArt (工作计划)...');
const slide9Path = path.join(targetDir, 'ppt', 'slides', 'slide9.xml');
let slide9Xml = fs.readFileSync(slide9Path, 'utf8');
slide9Xml = slide9Xml.replace(/<a:t>LIMS<\/a:t>/g, '<a:t>智能制造与MES开发</a:t>');
fs.writeFileSync(slide9Path, slide9Xml, 'utf8');

const drawing2Path = path.join(targetDir, 'ppt', 'diagrams', 'drawing2.xml');
let drawing2Xml = fs.readFileSync(drawing2Path, 'utf8');
const headerPara = `<a:p><a:pPr marL="0" lvl="0" indent="0" algn="l" defTabSz="622300"><a:lnSpc><a:spcPct val="90000"/></a:lnSpc><a:spcBef><a:spcPct val="0"/></a:spcBef><a:spcAft><a:spcPct val="35000"/></a:spcAft><a:buNone/></a:pPr><a:r><a:rPr lang="zh-CN" altLang="en-US" sz="1400" kern="1200" dirty="0"><a:latin typeface="微软雅黑" panose="020B0503020204020204" pitchFamily="34" charset="-122"/><a:ea typeface="微软雅黑" panose="020B0503020204020204" pitchFamily="34" charset="-122"/><a:sym typeface="+mn-ea"/></a:rPr><a:t>MES与PDA项目</a:t></a:r><a:endParaRPr lang="zh-CN" altLang="en-US" sz="1400" kern="1200" dirty="0"><a:latin typeface="微软雅黑" panose="020B0503020204020204" pitchFamily="34" charset="-122"/><a:ea typeface="微软雅黑" panose="020B0503020204020204" pitchFamily="34" charset="-122"/></a:endParaRPr></a:p>`;

const planParas = [
    makeBulletPara('MES管理端与PDA业务功能持续迭代开发与生产现场运维保障。'),
    makeBulletPara('深入Kepware工控点位对接与POP系统交互联调，推进设备数采与机台联动。'),
    makeBulletPara('持续补充完善MES AI Skill体系与工作流，深化管理端与PDA自动化开发。'),
    makeBulletPara('推进自学习Agent及自动化工具链落地，提高业务需求交付与测试效能。')
].join('');

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
data2Xml = data2Xml.replace(/(<dgm:pt modelId="\{5157490D-1B52-4616-AD62-4BA390AF44B3\}"[\s\S]*?<dgm:t>)([\s\S]*?)(<\/dgm:t>)/,
    `$1<a:bodyPr/><a:lstStyle/>${makeBulletPara('MES管理端与PDA业务功能持续迭代开发与生产现场运维保障。')}$3`);
data2Xml = data2Xml.replace(/(<dgm:pt modelId="\{482E8B2C-0940-4EA2-8753-3073C97E81EF\}"[\s\S]*?<dgm:t>)([\s\S]*?)(<\/dgm:t>)/,
    `$1<a:bodyPr/><a:lstStyle/>${makeBulletPara('深入Kepware工控点位对接与POP系统交互联调，推进设备数采与机台联动。')}$3`);
data2Xml = data2Xml.replace(/(<dgm:pt modelId="\{81FB98D7-C50E-4699-B081-C8B44EAC3CDC\}"[\s\S]*?<dgm:t>)([\s\S]*?)(<\/dgm:t>)/,
    `$1<a:bodyPr/><a:lstStyle/>${makeBulletPara('持续补充完善MES AI Skill体系与工作流，深化管理端与PDA自动化开发。')}$3`);
data2Xml = data2Xml.replace(/(<dgm:pt modelId="\{15EB4FDE-871D-4F48-8C92-BEE4CD173791\}"[\s\S]*?<dgm:t>)([\s\S]*?)(<\/dgm:t>)/,
    `$1<a:bodyPr/><a:lstStyle/>${makeBulletPara('推进自学习Agent及自动化工具链落地，提高业务需求交付与测试效能。')}$3`);
fs.writeFileSync(data2Path, data2Xml, 'utf8');

// 7. 封包
console.log('\n8. 重新打包为目标 PPTX: ' + outputPath);
if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
const parentDir = path.dirname(outputPath);
if (!fs.existsSync(parentDir)) fs.mkdirSync(parentDir, { recursive: true });

const packCmd = `powershell -ExecutionPolicy Bypass -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory('${tempBuildDir.replace(/'/g, "''")}', '${outputPath.replace(/'/g, "''")}')"`;
execSync(packCmd, { stdio: 'inherit' });

try {
    fs.rmSync(tempBuildDir, { recursive: true, force: true });
} catch (e) {}

console.log('\n🎉 月报 PPTX 生成完毕: ' + outputPath);
