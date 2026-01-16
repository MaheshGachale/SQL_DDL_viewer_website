import { Node, Edge, MarkerType, Position } from 'reactflow';
import * as dagre from 'dagre';

interface Column {
    name: string;
    type: string;
    isPk: boolean;
    isFk: boolean;
    isGrouping?: boolean;
    isSortKey?: boolean;
}

interface TableData {
    name: string;
    columns: Column[];
    fks: { col: string, refTable: string, refCol: string }[];
    isView?: boolean;
    isCte?: boolean;
    lineage?: { sourceTable: string, sourceCol: string, targetCol: string, formula?: string }[];
}

const cleanSql = (sql: string) => {
    return sql.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
};

const splitByCommas = (str: string): string[] => {
    const tokens: string[] = [];
    let currentToken = '';
    let parenLevel = 0;
    for (let char of str) {
        if (char === '(') parenLevel++;
        if (char === ')') parenLevel--;
        if (char === ',' && parenLevel === 0) {
            tokens.push(currentToken.trim());
            currentToken = '';
        } else {
            currentToken += char;
        }
    }
    if (currentToken.trim()) tokens.push(currentToken.trim());
    return tokens;
};

const cleanIdentifier = (id: string) => id.replace(/["'`\[\]]/g, '').trim();

// Keywords to ignore when discovering potential columns or aliases
const SQL_KEYWORDS = new Set([
    'SELECT', 'FROM', 'WHERE', 'GROUP', 'BY', 'ORDER', 'HAVING', 'LIMIT', 'OFFSET',
    'JOIN', 'ON', 'AS', 'AND', 'OR', 'NOT', 'IN', 'IS', 'NULL', 'CASE', 'WHEN',
    'THEN', 'ELSE', 'END', 'DISTINCT', 'ALL', 'UNION', 'EXCEPT', 'INTERSECT',
    'WITH', 'RECURSIVE', 'MATERIALIZED', 'VIEW', 'TABLE', 'CREATE', 'DROP',
    'ALTER', 'TRUNCATE', 'INSERT', 'UPDATE', 'DELETE', 'DEFAULT', 'PRIMARY',
    'KEY', 'FOREIGN', 'REFERENCES', 'CONSTRAINT', 'INDEX', 'CHECK', 'DISTSTYLE',
    'DISTKEY', 'SORTKEY', 'COMPOUND', 'INTERLEAVED', 'EVEN', 'AUTO', 'REFRESH',
    'BACKUP', 'ENCODING', 'LATERAL', 'WINDOW', 'QUALIFY', 'OVER', 'UNNEST', 'APPLY',
    'TOP', 'COUNT', 'MIN', 'MAX', 'AVG', 'SUM',
    'LEAD', 'LAG', 'PARTITION', 'RANK', 'DENSE_RANK', 'ROW_NUMBER',
    'FIRST_VALUE', 'LAST_VALUE', 'NTH_VALUE', 'COALESCE', 'ABS', 'DRIFT', 'STABLE',
    'CURRENT_DATE', 'CURRENT_TIMESTAMP', 'CURRENT_USER', 'INTERVAL', 'DATE', 'TIMESTAMP',
    'DAY', 'DAYS', 'MONTH', 'MONTHS', 'YEAR', 'YEARS', 'HOUR', 'HOURS', 'MINUTE', 'MINUTES', 'SECOND', 'SECONDS',
    'INT', 'INTEGER', 'VARCHAR', 'TEXT', 'DECIMAL', 'NUMERIC', 'BOOLEAN', 'ROW', 'CAST', 'ROUND', 'IDENTITY',
    'LEFT', 'RIGHT', 'INNER', 'OUTER', 'CROSS', 'FULL', 'NATURAL', 'SELF',
    'TRUE', 'FALSE', 'BETWEEN', 'ASC', 'DESC', 'REPLACE', 'ALTER', 'DROP', 'PASS', 'FAIL'
]);

const isIgnoredToken = (token: string, additionalIgnores?: Set<string>) => {
    if (!token) return true;
    const upper = token.toUpperCase();
    if (SQL_KEYWORDS.has(upper)) return true;
    if (additionalIgnores && additionalIgnores.has(upper)) return true;
    if (/^\d+(\.\d+)?$/.test(token)) return true; // Skip numeric literals
    // Skip string literals (quoted)
    if ((token.startsWith("'") && token.endsWith("'")) ||
        (token.startsWith('"') && token.endsWith('"')) ||
        (token.startsWith('`') && token.endsWith('`'))) return true;
    // Also skip if it starts with a quote even if it doesn't end with one (partial tokens)
    if (token.startsWith("'") || token.startsWith('"') || token.startsWith('`')) return true;
    return false;
};

// --- HELPER: Extracts logic for ANY Select body (Used for Views and CTEs) ---
const parseSelectBody = (
    name: string,
    body: string,
    isView: boolean,
    isCte: boolean,
    discoveredTableColumns: Map<string, Set<string>>,
    cteNames: Set<string>,
    currentTables: TableData[]
): TableData => {
    const viewColumns: Column[] = [];
    const columnLineage: { sourceTable: string, sourceCol: string, targetCol: string, formula?: string }[] = [];
    const fks: { col: string, refTable: string, refCol: string }[] = [];

    const cleanIdentifier = (id: string) => id.replace(/["'`\[\]]/g, '').trim();

    // 1. Identify Aliases and Referenced Tables
    const aliasMap = new Map<string, string>();
    const referencedTables = new Set<string>();

    // Broadened regex to handle JOIN, APPLY (T-SQL), and UNNEST (BigQuery)
    const tableRefRegex = /(?:FROM|JOIN|APPLY|UNNEST)\s+((?:["'`\[][^"'`\]]+["'`\]]|[\w.]+))(?:\s+(?:AS\s+)?(["'`\[][^"'`\]]+["'`\]]|[\w]+))?/gmi;

    let tMatch;
    while ((tMatch = tableRefRegex.exec(body)) !== null) {
        const fullTableName = cleanIdentifier(tMatch[1]);
        const alias = tMatch[2] ? cleanIdentifier(tMatch[2]) : null;

        if (fullTableName.toUpperCase() === 'UNNEST') continue;

        const upperAlias = alias ? alias.toUpperCase() : '';
        const upperTable = fullTableName.toUpperCase();

        if (isIgnoredToken(upperTable)) continue;

        referencedTables.add(fullTableName);
        aliasMap.set(fullTableName.toUpperCase(), fullTableName); // Case-insensitive key

        if (alias && !isIgnoredToken(upperAlias)) {
            aliasMap.set(upperAlias, fullTableName);
        }

        const parts = fullTableName.split('.');
        if (parts.length > 1) {
            aliasMap.set(parts[parts.length - 1].toUpperCase(), fullTableName);
        }
    }

    // Comma Join Discovery
    const fromPartsMatch = body.match(/FROM\s+([\s\S]+?)(?:\bWHERE\b|\bGROUP\b|\bORDER\b|\bJOIN\b|\bAPPLY\b|\bUNNEST\b|\bLIMIT\b|\bOFFSET\b|\bFETCH\b|\bFOR\b|\bQUALIFY\b|\bWINDOW\b|$)/i);
    if (fromPartsMatch) {
        splitByCommas(fromPartsMatch[1]).forEach(pt => {
            const parts = pt.trim().split(/\s+/);
            if (parts.length > 0) {
                const tName = cleanIdentifier(parts[0]);
                if (tName && !isIgnoredToken(tName) && tName !== '(') {
                    referencedTables.add(tName);
                    aliasMap.set(tName.toUpperCase(), tName);
                    // Handle "Table Alias"
                    const possibleAlias = parts.length > 1 ? cleanIdentifier(parts[parts.length - 1]) : null;
                    if (possibleAlias && !isIgnoredToken(possibleAlias)) {
                        aliasMap.set(possibleAlias.toUpperCase(), tName);
                    }
                }
            }
        });
    }

    // 2. Prep Additional Ignores (Aliases and Table Names)
    const additionalIgnores = new Set<string>();
    referencedTables.forEach(t => additionalIgnores.add(t.toUpperCase()));
    aliasMap.forEach((val, key) => additionalIgnores.add(key.toUpperCase()));

    // 3. Extract Columns
    const selectKeywordRegex = /SELECT\s+(?:DISTINCT\s+|ALL\s+|TOP\s+\d+\s+)?/i;
    const selectKeywordMatch = body.match(selectKeywordRegex);

    if (selectKeywordMatch) {
        const selectStart = selectKeywordMatch.index! + selectKeywordMatch[0].length;
        let balance = 0;
        let mainFromIdx = -1;
        for (let i = selectStart; i < body.length; i++) {
            if (body[i] === '(') balance++;
            else if (body[i] === ')') balance--;
            else if (balance === 0) {
                const lookahead = body.substring(i);
                if (/^FROM\s+/i.test(lookahead)) { // Space-aware boundary
                    mainFromIdx = i;
                    break;
                }
            }
        }
        const selectList = mainFromIdx !== -1 ? body.substring(selectStart, mainFromIdx) : body.substring(selectStart);
        const columnDefs = splitByCommas(selectList);

        // 2a. Check for SELECT * and Expand if possible
        const expandedColumnDefs: string[] = [];
        columnDefs.forEach(colDef => {
            const trimmed = colDef.trim();
            if (trimmed === '*' || trimmed.endsWith('.*')) {
                const starMatch = trimmed.match(/^(?:((?:["'`\[][^"'`\]]+["'`\]]|[\w.]+))\.)?\*/);
                if (starMatch) {
                    const al = starMatch[1] ? cleanIdentifier(starMatch[1]).toUpperCase() : null;
                    let expanded = false;

                    if (al && aliasMap.has(al)) {
                        const tName = aliasMap.get(al)!;
                        const sourceTable = currentTables.find(t => t.name === tName);
                        if (sourceTable && sourceTable.columns.length > 0 && sourceTable.columns[0].name !== 'Unknown Cols') {
                            sourceTable.columns.forEach(c => expandedColumnDefs.push(`${al}.${c.name}`));
                            expanded = true;
                        }
                    } else if (!al && referencedTables.size > 0) {
                        referencedTables.forEach(tName => {
                            const sourceTable = currentTables.find(t => t.name === tName);
                            if (sourceTable && sourceTable.columns.length > 0 && sourceTable.columns[0].name !== 'Unknown Cols') {
                                sourceTable.columns.forEach(c => expandedColumnDefs.push(`${tName}.${c.name}`));
                                expanded = true;
                            }
                        });
                    }
                    if (!expanded) expandedColumnDefs.push(colDef);
                }
            } else {
                expandedColumnDefs.push(colDef);
            }
        });

        expandedColumnDefs.forEach(colDef => {
            colDef = colDef.trim();
            const asMatch = colDef.match(/AS\s+(["`\[][^"`\]]+["`\]]|[\w]+)$/i);
            const simpleSpaceMatch = colDef.match(/\s+(["`\[][^"`\]]+["`\]]|[\w]+)$/);

            let colName = '';
            if (asMatch) colName = cleanIdentifier(asMatch[1]);
            else if (simpleSpaceMatch) {
                const candidate = cleanIdentifier(simpleSpaceMatch[1]);
                if (!isIgnoredToken(candidate, additionalIgnores)) colName = candidate;
            }

            const definitionWithoutAlias = colDef.replace(/(?:AS\s+)?(?:["`\[][^"`\]]+["`\]]|[\w]+)$/i, '').trim();
            const isCalculation = /[\(\)\*\+\/\-]|CASE|OVER|RANK|LEAD|LAG|PARTITION|COALESCE|ABS|NTILE|ROW_NUMBER|SUM|COUNT|AVG|MIN|MAX|QUALIFY|ARRAY|UNNEST/i.test(definitionWithoutAlias);
            let formula = '';

            const lineageUsageRegex = /(?:(["`\[][^"`\]]+["`\]]|[\w.]+)\.)?(["`\[][^"`\]]+["`\]]|[\w]+)/g;

            if (isCalculation) {
                formula = definitionWithoutAlias;
                let usage;
                while ((usage = lineageUsageRegex.exec(formula)) !== null) {
                    const rawAl = usage[1];
                    const rawCol = usage[2];

                    // Skip if the whole token (with optional alias) looks like a literal
                    if (rawCol.startsWith("'") || rawCol.startsWith('"') || rawCol.startsWith('`')) continue;

                    const al = rawAl ? cleanIdentifier(rawAl).toUpperCase() : null;
                    const col = cleanIdentifier(rawCol);
                    if (isIgnoredToken(col, additionalIgnores)) continue;

                    if (al && aliasMap.has(al)) {
                        const tName = aliasMap.get(al)!;
                        if (!colName) colName = col;
                        columnLineage.push({ sourceTable: tName, sourceCol: col, targetCol: colName || col, formula: 'ƒx' });
                        if (!cteNames.has(tName)) {
                            if (!discoveredTableColumns.has(tName)) discoveredTableColumns.set(tName, new Set());
                            discoveredTableColumns.get(tName)!.add(col);
                        }
                    } else if (!al && referencedTables.size > 0) {
                        // Unaliased: pick the first referenced table for lineage
                        const tName = Array.from(referencedTables)[0];
                        if (!colName) colName = col;
                        columnLineage.push({ sourceTable: tName, sourceCol: col, targetCol: colName || col, formula: 'ƒx' });

                        // Add to ALL stubs for discovery only if truly unaliased across all
                        referencedTables.forEach(rt => {
                            if (!cteNames.has(rt)) {
                                if (!discoveredTableColumns.has(rt)) discoveredTableColumns.set(rt, new Set());
                                discoveredTableColumns.get(rt)!.add(col);
                            }
                        });
                    }
                }
            } else {
                // Direct mapping
                const parts = colDef.split('.');
                if (parts.length >= 2) {
                    const al = cleanIdentifier(parts[parts.length - 2]).toUpperCase();
                    const col = cleanIdentifier(parts[parts.length - 1]);
                    if (aliasMap.has(al)) {
                        const tName = aliasMap.get(al)!;
                        if (!colName) colName = col;
                        columnLineage.push({ sourceTable: tName, sourceCol: col, targetCol: colName, formula: '' });
                        if (!cteNames.has(tName)) {
                            if (!discoveredTableColumns.has(tName)) discoveredTableColumns.set(tName, new Set());
                            discoveredTableColumns.get(tName)!.add(col);
                        }
                    }
                } else if (referencedTables.size > 0) {
                    const col = cleanIdentifier(colDef.split(/\s+/)[0]);
                    if (!isIgnoredToken(col, additionalIgnores)) {
                        referencedTables.forEach(tName => {
                            if (!cteNames.has(tName)) {
                                if (!discoveredTableColumns.has(tName)) discoveredTableColumns.set(tName, new Set());
                                discoveredTableColumns.get(tName)!.add(col);
                            }
                        });
                        const tName = Array.from(referencedTables)[0];
                        if (!colName) colName = col;
                        columnLineage.push({ sourceTable: tName, sourceCol: col, targetCol: colName, formula: '' });
                    }
                }
            }

            if (!colName) {
                const parts = colDef.split(/[.\s]+/);
                const candidate = cleanIdentifier(parts[parts.length - 1]);
                if (!isIgnoredToken(candidate, additionalIgnores)) colName = candidate;
            }

            if (!colName || colName === '*' || colName.toUpperCase() === 'SELECT' || isIgnoredToken(colName, additionalIgnores)) return;

            viewColumns.push({
                name: colName,
                type: isCte ? 'Start' : (isCalculation ? 'Calculated' : 'Mapped'),
                isPk: false,
                isFk: false
            });
        });

        // --- GLOBAL COLUMN DISCOVERY ---
        const globalLineageRegex = /(?:(["'`\[][^"'`\]]+["'`\]]|[\w.]+)\.)?(["'`\[][^"'`\]]+["'`\]]|[\w]+)/g;
        let globalMatch;
        while ((globalMatch = globalLineageRegex.exec(body)) !== null) {
            const rawAl = globalMatch[1];
            const rawCol = globalMatch[2];

            // Literal check
            if (rawCol.startsWith("'") || rawCol.startsWith('"') || rawCol.startsWith('`')) continue;

            const al = rawAl ? cleanIdentifier(rawAl).toUpperCase() : null;
            const col = cleanIdentifier(rawCol);
            if (isIgnoredToken(col, additionalIgnores) || col === '*') continue;

            if (al && aliasMap.has(al)) {
                const tName = aliasMap.get(al)!;
                if (!cteNames.has(tName)) {
                    if (!discoveredTableColumns.has(tName)) discoveredTableColumns.set(tName, new Set());
                    discoveredTableColumns.get(tName)!.add(col);
                }
            } else if (!al && referencedTables.size > 0) {
                // Unaliased: add to all stubs
                referencedTables.forEach(tName => {
                    if (!cteNames.has(tName)) {
                        if (!discoveredTableColumns.has(tName)) discoveredTableColumns.set(tName, new Set());
                        discoveredTableColumns.get(tName)!.add(col);
                    }
                });
            }
        }

        // --- GROUP BY DISCOVERY ---
        const groupByMatch = body.match(/GROUP\s+BY\s+([\s\S]+?)(?:HAVING|ORDER|LIMIT|OFFSET|FETCH|FOR|QUALIFY|WINDOW|$)/i);
        if (groupByMatch) {
            const groupByCols = splitByCommas(groupByMatch[1]).map(c => {
                const parts = c.trim().split(/[.\s]+/);
                return cleanIdentifier(parts[parts.length - 1]);
            });
            viewColumns.forEach(vcol => {
                if (groupByCols.some(gc => gc.toLowerCase() === vcol.name.toLowerCase())) {
                    vcol.isGrouping = true;
                }
            });
        }
    } else {
        viewColumns.push({ name: 'Unknown Cols', type: 'SQL', isPk: false, isFk: false });
    }

    referencedTables.forEach(ref => {
        fks.push({ col: '', refTable: ref, refCol: '' });
    });

    return {
        name: cleanIdentifier(name),
        columns: viewColumns,
        fks,
        isView,
        isCte,
        lineage: columnLineage
    };
};

export const parseSqlToElements = (sql: string) => {
    const cleaned = cleanSql(sql);
    const statements = cleaned.split(/;\s*|(?:\r?\n|^)\s*GO\s*(?:\r?\n|$)/mi).map(s => s.trim()).filter(s => s);
    const tables: TableData[] = [];
    const edges: Edge[] = [];
    const existingTableNames = new Set<string>();
    const discoveredTableColumns = new Map<string, Set<string>>();

    const parseWithCtes = (body: string, finalName: string, isView: boolean): void => {
        const localCteNames = new Set<string>();
        let currentOffset = 0;
        const strippedBody = body.trim();

        if (strippedBody.toUpperCase().startsWith('WITH')) {
            currentOffset = 4;
            const maybeRecursive = strippedBody.substring(currentOffset).trim().toUpperCase();
            if (maybeRecursive.startsWith('RECURSIVE')) {
                currentOffset += 10;
            }

            let parsingCtes = true;
            while (parsingCtes) {
                const remainder = strippedBody.substring(currentOffset);
                const nameMatch = remainder.match(/^\s*([\w.]+)\s+AS\s*\(/i);

                if (nameMatch) {
                    const cteName = nameMatch[1];
                    const openParenIndex = remainder.indexOf('(');
                    const startBody = currentOffset + openParenIndex + 1;
                    let balance = 1;
                    let i = startBody;
                    for (; i < strippedBody.length; i++) {
                        if (strippedBody[i] === '(') balance++;
                        else if (strippedBody[i] === ')') balance--;
                        if (balance === 0) break;
                    }
                    const endBody = i;
                    const cteBody = strippedBody.substring(startBody, endBody);
                    localCteNames.add(cteName);
                    const cteTable = parseSelectBody(cteName, cteBody, true, true, discoveredTableColumns, localCteNames, tables);
                    tables.push(cteTable);
                    existingTableNames.add(cleanIdentifier(cteName));

                    currentOffset = endBody + 1;
                    const nextCharMatch = strippedBody.substring(currentOffset).match(/^\s*(,)/);
                    if (nextCharMatch) {
                        currentOffset += strippedBody.substring(currentOffset).indexOf(',') + 1;
                    } else {
                        parsingCtes = false;
                    }
                } else {
                    parsingCtes = false;
                }
            }
            const mainBody = strippedBody.substring(currentOffset);
            const mainTable = parseSelectBody(finalName, mainBody, isView, false, discoveredTableColumns, localCteNames, tables);
            tables.push(mainTable);
        } else {
            const mainTable = parseSelectBody(finalName, body, isView, false, discoveredTableColumns, localCteNames, tables);
            tables.push(mainTable);
        }
    };

    statements.forEach(stmt => {
        // More robust CREATE TABLE/VIEW detection
        const createTableMatch = stmt.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?((?:["'`\[][^"'`\]]+["'`\]]|[\w.]+))/i);
        const createViewMatch = stmt.match(/CREATE\s+(?:OR\s+(?:REPLACE|ALTER)\s+)?(?:MATERIALIZED\s+)?VIEW\s+(?:IF\s+NOT\s+EXISTS\s+)?((?:["'`\[][^"'`\]]+["'`\]]|[\w.]+))/i);

        if (createTableMatch) {
            const fullTableName = cleanIdentifier(createTableMatch[1]);
            existingTableNames.add(fullTableName);

            // Find the opening parenthesis of the columns block
            const openParenIdx = stmt.indexOf('(', createTableMatch.index! + createTableMatch[0].length);
            let columnsBody = '';
            let propertiesPart = '';

            if (openParenIdx !== -1) {
                let balance = 1;
                let i = openParenIdx + 1;
                for (; i < stmt.length; i++) {
                    if (stmt[i] === '(') balance++;
                    else if (stmt[i] === ')') balance--;
                    if (balance === 0) break;
                }
                columnsBody = stmt.substring(openParenIdx + 1, i);
                propertiesPart = stmt.substring(i + 1);
            } else {
                // Check if it's CREATE TABLE AS SELECT
                const asSelectMatch = stmt.match(/\bAS\b\s+([\s\S]*)/i);
                if (asSelectMatch) {
                    parseWithCtes(asSelectMatch[1], fullTableName, false);
                    return;
                }
            }

            // Extract SORTKEY and DISTKEY from the properties part (after columns) or before
            const preColumnsPart = stmt.substring(createTableMatch.index! + createTableMatch[0].length, openParenIdx !== -1 ? openParenIdx : stmt.length);
            const combinedProps = preColumnsPart + ' ' + propertiesPart;

            const sortKeyMatch = combinedProps.match(/SORTKEY\s*\(([\s\S]+?)\)/i);
            const sortKeyCols = sortKeyMatch ? splitByCommas(sortKeyMatch[1]).map(c => cleanIdentifier(c)) : [];

            const distKeyMatch = combinedProps.match(/DISTKEY\s*\(([\s\S]+?)\)/i);
            const distKeyCols = distKeyMatch ? splitByCommas(distKeyMatch[1]).map(c => cleanIdentifier(c)) : [];

            if (columnsBody) {
                const baseDefinitions = splitByCommas(columnsBody);
                const columns: Column[] = [];
                const fks: { col: string, refTable: string, refCol: string }[] = [];

                baseDefinitions.forEach(rawDef => {
                    // Split by newlines to handle stray words or multiple definitions without commas
                    const lines = rawDef.split(/\r?\n/).map(l => l.trim()).filter(l => l);
                    lines.forEach(def => {
                        const fkMatch = def.match(/FOREIGN\s+KEY\s*\(["`\[]?(\w+)["`\]]?\)\s*REFERENCES\s+((?:["`\[][^"`\]]+["`\]]|[\w.]+))\s*\(["`\[]?(\w+)["`\]]?\)/i);
                        const pkMatch = def.match(/PRIMARY\s+KEY\s*\(["`\[]?(\w+)["`\]]?\)/i);

                        if (fkMatch) {
                            fks.push({ col: fkMatch[1], refTable: cleanIdentifier(fkMatch[2]), refCol: fkMatch[3] });
                        } else if (pkMatch) {
                            const pkCol = pkMatch[1];
                            const col = columns.find(c => c.name === pkCol);
                            if (col) col.isPk = true;
                        } else if (!def.toUpperCase().startsWith('CONSTRAINT') && !def.toUpperCase().startsWith('KEY') && !def.toUpperCase().startsWith('INDEX') && !def.toUpperCase().startsWith('CHECK')) {
                            const parts = def.split(/\s+/);
                            const colName = cleanIdentifier(parts[0]);
                            // Ensure it looks like a column: name followed by a data type
                            // A data type usually follows, so parts.length >= 2
                            if (!isIgnoredToken(colName) && parts.length >= 2) {
                                // Extract type: skip the name and look for the next meaningful word
                                let typeSource = parts.slice(1).join(' ');
                                typeSource = typeSource.replace(/IDENTITY\s*\([\d\s,]+\)/i, '').trim();

                                if (typeSource) {
                                    const colType = typeSource.split(/(\s|,\s|\))/)[0] || 'TEXT';
                                    const isPk = /PRIMARY\s+KEY/i.test(def);
                                    const isFk = /REFERENCES/i.test(def);
                                    const isSortKey = sortKeyCols.some(sk => sk.toLowerCase() === colName.toLowerCase());

                                    if (isFk) {
                                        const refMatch = def.match(/REFERENCES\s+((?:["'`\[][^"'`\]]+["'`\]]|[\w.]+))\s*\(["'`\[]?(\w+)["'`\]]?\)/i);
                                        if (refMatch) fks.push({ col: colName, refTable: cleanIdentifier(refMatch[1]), refCol: refMatch[2] });
                                    }
                                    columns.push({ name: colName, type: colType, isPk, isFk, isSortKey });
                                }
                            }
                        }
                    });
                });
                tables.push({ name: fullTableName, columns, fks });
            }
        } else if (createViewMatch) {
            const fullViewName = cleanIdentifier(createViewMatch[1]);
            existingTableNames.add(fullViewName);

            const asMatch = stmt.match(/\bAS\s+([\s\S]+)/i);
            if (asMatch) {
                const body = asMatch[1];
                parseWithCtes(body, fullViewName, true);
            }
        } else if (stmt.toUpperCase().startsWith('WITH') || stmt.toUpperCase().startsWith('SELECT')) {
            parseWithCtes(stmt, "Query Result", true);
        }
    });

    const definedNames = new Set(tables.map(t => t.name));
    const stubTables: TableData[] = [];

    tables.forEach(t => {
        if (t.isView || t.isCte) {
            t.fks.forEach(fk => {
                const ref = fk.refTable;
                if (!definedNames.has(ref) && !existingTableNames.has(ref)) {
                    let stubCols: Column[] = [];
                    if (discoveredTableColumns.has(ref)) {
                        const cols = discoveredTableColumns.get(ref)!;
                        if (cols.has('*') && cols.size === 1) {
                            stubCols = [{ name: 'All Columns (*)', type: 'Source', isPk: false, isFk: false }];
                        } else {
                            stubCols = Array.from(cols).filter(c => c !== '*').map(c => ({
                                name: c, type: 'Source', isPk: false, isFk: false
                            }));
                            if (cols.has('*')) {
                                stubCols.push({ name: '... (others)', type: 'Source', isPk: false, isFk: false });
                            }
                        }
                    }
                    if (stubCols.length === 0) stubCols = [{ name: 'Unknown Schema', type: 'Stub', isPk: false, isFk: false }];
                    stubTables.push({ name: ref, columns: stubCols, fks: [] });
                    existingTableNames.add(ref);
                    definedNames.add(ref);
                }
            });
        }
    });
    tables.push(...stubTables);

    const nodes: Node[] = [];
    tables.forEach(table => {
        const isStub = table.columns[0]?.type === 'Stub' || table.columns[0]?.type === 'Source';
        let style = {};
        if (table.isCte) style = { border: '2px dashed #8b5cf6', backgroundColor: '#f5f3ff' };
        else if (table.isView) style = { border: '2px solid #007acc', backgroundColor: '#eef9ff' };
        else if (isStub) style = { border: '2px dashed #999', opacity: 0.9, backgroundColor: '#fdfbf7' };
        else style = { border: '1px solid #cbd5e1', backgroundColor: '#ffffff' };

        nodes.push({
            id: table.name,
            type: 'table',
            data: { label: table.name, columns: table.columns, isView: table.isView, isCte: table.isCte },
            position: { x: 0, y: 0 },
            style
        });
    });

    tables.forEach(table => {
        if (table.lineage) {
            table.lineage.forEach((lin, i) => {
                let stroke = '#3b82f6';
                const sourceIsCte = tables.find(t => t.name === lin.sourceTable)?.isCte;
                const targetIsCte = table.isCte;
                const targetIsView = table.isView && !table.isCte;

                if (sourceIsCte && targetIsCte) stroke = '#8b5cf6';
                if (sourceIsCte && targetIsView) stroke = '#10b981';
                if (lin.formula) stroke = '#f59e0b';

                edges.push({
                    id: `e-lin-${lin.sourceTable}.${lin.sourceCol}-${table.name}.${lin.targetCol}-${i}`,
                    source: lin.sourceTable,
                    target: table.name,
                    sourceHandle: `src-${lin.sourceCol}`,
                    targetHandle: `tgt-${lin.targetCol}`,
                    label: lin.formula ? 'ƒx' : '',
                    type: 'default',
                    style: { stroke, strokeWidth: 2 },
                    markerEnd: { type: MarkerType.ArrowClosed, color: stroke },
                    animated: true
                });
            });
        }

        const hasLineage = table.lineage && table.lineage.length > 0;
        table.fks.forEach((fk, i) => {
            if ((table.isView || table.isCte) && !hasLineage) {
                edges.push({
                    id: `e-struc-${fk.refTable}-${table.name}`,
                    source: fk.refTable,
                    target: table.name,
                    label: 'uses',
                    type: 'smoothstep',
                    style: { stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '5,5' },
                    markerEnd: { type: MarkerType.ArrowClosed }
                });
            } else if (!table.isView && !table.isCte) {
                edges.push({
                    id: `e-${table.name}-${fk.refTable}-${i}`,
                    source: table.name,
                    target: fk.refTable,
                    style: { stroke: '#94a3b8', strokeWidth: 1.5 },
                    markerEnd: { type: MarkerType.ArrowClosed }
                });
            }
        });
    });

    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setGraph({ rankdir: 'LR', nodesep: 100, ranksep: 250 });
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    nodes.forEach(node => {
        const nodeHeight = 60 + (node.data.columns.length * 32);
        dagreGraph.setNode(node.id, { width: 240, height: nodeHeight });
    });
    edges.forEach(edge => dagreGraph.setEdge(edge.source, edge.target));
    dagre.layout(dagreGraph);

    return {
        nodes: nodes.map(node => {
            const pos = dagreGraph.node(node.id);
            return {
                ...node,
                position: { x: pos.x - 120, y: pos.y - (60 + node.data.columns.length * 32) / 2 },
                targetPosition: Position.Left,
                sourcePosition: Position.Right
            };
        }),
        edges
    };
};
