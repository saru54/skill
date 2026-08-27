#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'resources', 'tables_index.json');
if (!fs.existsSync(indexPath)) {
  console.error('Error: tables_index.json not found. Run parse_schema.js first.');
  process.exit(1);
}

const tables = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '-h' || args[0] === '--help') {
  console.log(`
MES 数据库结构速查工具 (query_schema)

用法:
  node query_schema.js <表名>                  查看指定表的全部字段、类型、注释及主键
  node query_schema.js --find-column <字段名>  查找包含该字段的所有表
  node query_schema.js --search <关键词>      根据表名或表描述搜索表
  node query_schema.js --list <前缀>           按前缀列出所有表 (如 LTC, STE, EDA, WIP)

示例:
  node query_schema.js LTC0001
  node query_schema.js --find-column TLOTID
  node query_schema.js --search "半成品投入"
  node query_schema.js --list LTC
`);
  process.exit(0);
}

const mode = args[0];
const param = args[1] ? args[1].trim() : '';

if (mode === '--find-column' || mode === '-c') {
  const colQuery = param.toUpperCase();
  console.log(`\n🔍 正在检索包含字段 [${colQuery}] 的表...\n`);
  const matches = [];
  for (const [tblName, tbl] of Object.entries(tables)) {
    const foundCol = tbl.columns.find(c => c.name.toUpperCase() === colQuery);
    if (foundCol) {
      matches.push({
        table: tblName,
        desc: tbl.description || '-',
        type: foundCol.type,
        colDesc: foundCol.description || '-'
      });
    }
  }

  if (matches.length === 0) {
    console.log(`未找到包含字段 [${colQuery}] 的表。`);
  } else {
    console.log(`共找到 ${matches.length} 张表包含字段 [${colQuery}]:\n`);
    console.log('| 表名 | 表描述 | 字段类型 | 字段注释 |');
    console.log('| :--- | :--- | :--- | :--- |');
    for (const m of matches) {
      console.log(`| \`${m.table}\` | ${m.desc} | \`${m.type}\` | ${m.colDesc} |`);
    }
  }
} else if (mode === '--search' || mode === '-s') {
  const kw = param.toLowerCase();
  console.log(`\n🔍 正在按关键词 [${param}] 搜索表...\n`);
  const matches = [];
  for (const [tblName, tbl] of Object.entries(tables)) {
    if (tblName.toLowerCase().includes(kw) || (tbl.description && tbl.description.toLowerCase().includes(kw))) {
      matches.push(tbl);
    }
  }

  if (matches.length === 0) {
    console.log(`未找到匹配关键词 [${param}] 的表。`);
  } else {
    console.log(`共找到 ${matches.length} 张匹配表:\n`);
    console.log('| 表名 | 表描述 | 主键 | 字段数 |');
    console.log('| :--- | :--- | :--- | :--- |');
    for (const t of matches) {
      const pkStr = t.primaryKeys.length > 0 ? t.primaryKeys.join(', ') : '-';
      console.log(`| \`${t.name}\` | ${t.description || '-'} | ${pkStr} | ${t.columnCount} |`);
    }
  }
} else if (mode === '--list' || mode === '-l') {
  const prefix = param.toUpperCase();
  console.log(`\n📋 列出前缀为 [${prefix}] 的表...\n`);
  const matches = Object.values(tables).filter(t => t.name.toUpperCase().startsWith(prefix));
  console.log(`共找到 ${matches.length} 张表:\n`);
  console.log('| 表名 | 表描述 | 字段数 |');
  console.log('| :--- | :--- | :--- |');
  for (const t of matches) {
    console.log(`| \`${t.name}\` | ${t.description || '-'} | ${t.columnCount} |`);
  }
} else {
  // Direct table query
  const tblName = mode.toUpperCase();
  const tbl = tables[tblName] || tables[Object.keys(tables).find(k => k.toUpperCase() === tblName)];
  
  if (!tbl) {
    console.log(`\n❌ 未找到表: ${tblName}`);
    // Suggest similar tables
    const similar = Object.keys(tables).filter(k => k.toUpperCase().includes(tblName));
    if (similar.length > 0) {
      console.log(`您是否想查找: ${similar.slice(0, 10).join(', ')}`);
    }
    process.exit(1);
  }

  console.log(`\n======================================================`);
  console.log(`🏛️ 表名: ${tbl.name}`);
  console.log(`📝 描述: ${tbl.description || '(无描述)'}`);
  console.log(`🔑 主键: ${tbl.primaryKeys.length > 0 ? tbl.primaryKeys.join(', ') : '(无明确主键)'}`);
  console.log(`📊 字段总数: ${tbl.columnCount}`);
  console.log(`======================================================\n`);

  console.log('| # | 字段名 (Column) | 类型 (Type) | 允许空 | 字段描述 (Description) |');
  console.log('| :--- | :--- | :--- | :--- | :--- |');
  
  tbl.columns.forEach((col, idx) => {
    const isPk = tbl.primaryKeys.includes(col.name) ? ' 🔑[PK]' : '';
    const nullStr = col.nullable ? 'YES' : 'NO';
    const descStr = col.description || '-';
    console.log(`| ${idx + 1} | \`${col.name}\`${isPk} | \`${col.type}\` | ${nullStr} | ${descStr} |`);
  });
  console.log('\n');
}
