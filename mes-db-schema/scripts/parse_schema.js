const fs = require('fs');
const path = require('path');

const sqlPath = path.join(__dirname, '..', 'resources', 'dbo.sql');
const outputPath = path.join(__dirname, '..', 'resources', 'tables_index.json');
const summaryPath = path.join(__dirname, '..', 'resources', 'tables_summary.md');

console.log('Reading ' + sqlPath + '...');
const content = fs.readFileSync(sqlPath, 'utf8');
const lines = content.split(/\r?\n/);

const tables = {};
let currentTable = null;

// Regex patterns
const createTableRegex = /^CREATE TABLE \[dbo\]\.\[([^\]]+)\]/i;
const columnRegex = /^\s+\[([^\]]+)\]\s+([a-zA-Z0-9_()]+)(.*)$/;
const tableDescRegex = /EXEC sp_addextendedproperty\s+'MS_Description',\s+N'([^']*(?:''[^']*)*)',\s+'SCHEMA',\s+N'dbo',\s+'TABLE',\s+N'([^']+)'(?:\s*GO|\s*$)/i;
const colDescRegex = /EXEC sp_addextendedproperty\s+'MS_Description',\s+N'([^']*(?:''[^']*)*)',\s+'SCHEMA',\s+N'dbo',\s+'TABLE',\s+N'([^']+)',\s+'COLUMN',\s+N'([^']+)'/i;

let inCreateTable = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  const createMatch = line.match(createTableRegex);
  if (createMatch) {
    const tableName = createMatch[1];
    currentTable = {
      name: tableName,
      description: '',
      columns: [],
      columnMap: {},
      primaryKeys: []
    };
    tables[tableName] = currentTable;
    inCreateTable = true;
    continue;
  }

  if (inCreateTable) {
    if (line.trim().startsWith(')')) {
      inCreateTable = false;
      continue;
    }

    if (line.includes('PRIMARY KEY')) {
      const pkMatch = line.match(/PRIMARY KEY[^(]*\(([^)]+)\)/i);
      if (pkMatch && currentTable) {
        const pkCols = pkMatch[1].split(',').map(s => s.replace(/\[|\]|\s*ASC|\s*DESC/gi, '').trim());
        currentTable.primaryKeys = pkCols;
      }
      continue;
    }

    const colMatch = line.match(columnRegex);
    if (colMatch && currentTable) {
      const colName = colMatch[1];
      const colType = colMatch[2];
      const rest = colMatch[3] || '';
      const isNullable = !rest.toUpperCase().includes('NOT NULL');
      
      const colObj = {
        name: colName,
        type: colType,
        nullable: isNullable,
        description: ''
      };
      currentTable.columns.push(colObj);
      currentTable.columnMap[colName] = colObj;
    }
  }

  // Check extended properties
  if (line.startsWith('EXEC sp_addextendedproperty')) {
    // Collect full statement if multi-line
    let stmt = line;
    let j = i;
    while (!stmt.includes('GO') && j + 1 < lines.length && !lines[j + 1].startsWith('EXEC sp_addextendedproperty') && !lines[j + 1].startsWith('CREATE TABLE')) {
      j++;
      stmt += ' ' + lines[j].trim();
    }
    i = j;

    const colDescMatch = stmt.match(colDescRegex);
    if (colDescMatch) {
      const desc = colDescMatch[1].replace(/''/g, "'");
      const tbl = colDescMatch[2];
      const col = colDescMatch[3];
      if (tables[tbl] && tables[tbl].columnMap[col]) {
        tables[tbl].columnMap[col].description = desc;
      }
      continue;
    }

    const tblDescMatch = stmt.match(tableDescRegex);
    if (tblDescMatch) {
      const desc = tblDescMatch[1].replace(/''/g, "'");
      const tbl = tblDescMatch[2];
      if (tables[tbl]) {
        tables[tbl].description = desc;
      }
      continue;
    }
  }
}

// Clean up columnMap for lighter json output
const cleanTables = {};
for (const [tblName, tbl] of Object.entries(tables)) {
  cleanTables[tblName] = {
    name: tbl.name,
    description: tbl.description,
    primaryKeys: tbl.primaryKeys,
    columnCount: tbl.columns.length,
    columns: tbl.columns
  };
}

fs.writeFileSync(outputPath, JSON.stringify(cleanTables, null, 2), 'utf8');
console.log(`Successfully parsed ${Object.keys(cleanTables).length} tables into ${outputPath}`);

// Generate markdown summary
let md = '# MES 全量数据库表清单与字典速查\n\n';
md += `> 自动生成自 \`dbo.sql\`，共收录 **${Object.keys(cleanTables).length}** 张数据库表。\n\n`;
md += '| 表名 | 描述 | 主键 | 字段数 |\n';
md += '| :--- | :--- | :--- | :--- |\n';

const sortedTables = Object.keys(cleanTables).sort();
for (const name of sortedTables) {
  const tbl = cleanTables[name];
  const pkStr = tbl.primaryKeys.length > 0 ? tbl.primaryKeys.join(', ') : '-';
  const descStr = (tbl.description || '-').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
  md += `| \`${tbl.name}\` | ${descStr} | ${pkStr} | ${tbl.columnCount} |\n`;
}

fs.writeFileSync(summaryPath, md, 'utf8');
console.log(`Generated tables summary at ${summaryPath}`);
