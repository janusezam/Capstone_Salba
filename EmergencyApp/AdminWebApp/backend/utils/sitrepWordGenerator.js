// utils/sitrepWordGenerator.js
const Docxtemplater = require('docxtemplater');
const PizZip = require('pizzip');
const fs = require('fs');
const path = require('path');
const { DOMParser, XMLSerializer } = require('@xmldom/xmldom');
const { Document, Packer, Paragraph, Table, TableCell, TableRow, BorderStyle, WidthType, AlignmentType } = require('docx');

const WORD_XML_PATH = 'word/document.xml';

const hasDocxtemplaterTags = (xmlText) => {
  try {
    const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
    const textNodes = Array.from(doc.getElementsByTagName('w:t'));
    const tagRegex = /\{[#\/]?[A-Za-z_][A-Za-z0-9_.-]*\}/;
    return textNodes.some(node => tagRegex.test(node.textContent || ''));
  } catch (e) {
    // On parser failure, be conservative and disable docxtemplater path.
    return false;
  }
};

const directChildren = (node, tagName) => {
  const out = [];
  for (let i = 0; i < node.childNodes.length; i += 1) {
    const c = node.childNodes[i];
    if (c.nodeType === 1 && c.nodeName === tagName) out.push(c);
  }
  return out;
};

const cleanText = (val) => (val || '').replace(/\s+/g, ' ').trim();

const tableText = (tbl) => cleanText(tbl.textContent).toUpperCase();

const paragraphText = (p) => cleanText(p.textContent).toUpperCase();

const getTables = (doc) => Array.from(doc.getElementsByTagName('w:tbl'));

const getParagraphs = (doc) => Array.from(doc.getElementsByTagName('w:p'));

const getDirectRows = (tbl) => directChildren(tbl, 'w:tr');

const getDirectCells = (row) => directChildren(row, 'w:tc');

const getOrCreateDirectChild = (doc, parent, tagName) => {
  const existing = directChildren(parent, tagName)[0];
  if (existing) return existing;
  const node = doc.createElement(tagName);
  parent.appendChild(node);
  return node;
};

const setBorderNode = (doc, parent, sideTag) => {
  let node = directChildren(parent, sideTag)[0];
  if (!node) {
    node = doc.createElement(sideTag);
    parent.appendChild(node);
  }
  node.setAttribute('w:val', 'single');
  node.setAttribute('w:sz', '8');
  node.setAttribute('w:space', '0');
  node.setAttribute('w:color', '000000');
};

const normalizeTableLayoutAndBorders = (doc, table) => {
  if (!table) return;

  const tblPr = getOrCreateDirectChild(doc, table, 'w:tblPr');
  const tblW = getOrCreateDirectChild(doc, tblPr, 'w:tblW');
  tblW.setAttribute('w:type', 'pct');
  tblW.setAttribute('w:w', '5000');

  const tblInd = getOrCreateDirectChild(doc, tblPr, 'w:tblInd');
  tblInd.setAttribute('w:type', 'dxa');
  tblInd.setAttribute('w:w', '0');

  const cellMar = getOrCreateDirectChild(doc, tblPr, 'w:tblCellMar');
  const marTop = getOrCreateDirectChild(doc, cellMar, 'w:top');
  marTop.setAttribute('w:type', 'dxa');
  marTop.setAttribute('w:w', '40');
  const marLeft = getOrCreateDirectChild(doc, cellMar, 'w:left');
  marLeft.setAttribute('w:type', 'dxa');
  marLeft.setAttribute('w:w', '80');
  const marBottom = getOrCreateDirectChild(doc, cellMar, 'w:bottom');
  marBottom.setAttribute('w:type', 'dxa');
  marBottom.setAttribute('w:w', '40');
  const marRight = getOrCreateDirectChild(doc, cellMar, 'w:right');
  marRight.setAttribute('w:type', 'dxa');
  marRight.setAttribute('w:w', '80');

  const tblBorders = getOrCreateDirectChild(doc, tblPr, 'w:tblBorders');
  ['w:top', 'w:left', 'w:bottom', 'w:right', 'w:insideH', 'w:insideV'].forEach(side => {
    setBorderNode(doc, tblBorders, side);
  });

  const rows = getDirectRows(table);
  rows.forEach(row => {
    const cells = getDirectCells(row);
    cells.forEach(cell => {
      const tcPr = getOrCreateDirectChild(doc, cell, 'w:tcPr');
      const tcBorders = getOrCreateDirectChild(doc, tcPr, 'w:tcBorders');
      ['w:top', 'w:left', 'w:bottom', 'w:right'].forEach(side => {
        setBorderNode(doc, tcBorders, side);
      });
    });
  });
};

const isPlaceholderText = (text) => {
  const compact = cleanText(text)
    .replace(/[•·]/g, '')
    .replace(/[-_]/g, '')
    .trim();
  return compact === '';
};

const isCellEmpty = (cell) => isPlaceholderText(cell.textContent);

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const createStyledRun = (doc, text) => {
  const r = doc.createElement('w:r');
  const rPr = doc.createElement('w:rPr');
  const rFonts = doc.createElement('w:rFonts');
  rFonts.setAttribute('w:ascii', 'Arial Narrow');
  rFonts.setAttribute('w:hAnsi', 'Arial Narrow');
  rPr.appendChild(rFonts);

  // Word stores font size in half-points: 12pt => 24
  const sz = doc.createElement('w:sz');
  sz.setAttribute('w:val', '24');
  rPr.appendChild(sz);

  const szCs = doc.createElement('w:szCs');
  szCs.setAttribute('w:val', '24');
  rPr.appendChild(szCs);

  r.appendChild(rPr);
  const t = doc.createElement('w:t');
  t.setAttribute('xml:space', 'preserve');
  t.appendChild(doc.createTextNode(String(text ?? '')));
  r.appendChild(t);
  return r;
};

const appendMultilineText = (doc, paragraph, text) => {
  const lines = String(text ?? '').split(/\r?\n/);
  lines.forEach((line, idx) => {
    paragraph.appendChild(createStyledRun(doc, line));
    if (idx < lines.length - 1) {
      const brRun = doc.createElement('w:r');
      const br = doc.createElement('w:br');
      brRun.appendChild(br);
      paragraph.appendChild(brRun);
    }
  });
};

const clearCellText = (doc, cell) => {
  const paragraphs = directChildren(cell, 'w:p');
  if (paragraphs.length === 0) return;
  paragraphs.forEach(p => setParagraphText(doc, p, ''));
};

const setCellText = (doc, cell, text) => {
  for (let i = cell.childNodes.length - 1; i >= 0; i -= 1) {
    cell.removeChild(cell.childNodes[i]);
  }

  const p = doc.createElement('w:p');
  appendMultilineText(doc, p, text);
  cell.appendChild(p);
};

const setParagraphText = (doc, paragraph, text) => {
  for (let i = paragraph.childNodes.length - 1; i >= 0; i -= 1) {
    paragraph.removeChild(paragraph.childNodes[i]);
  }

  appendMultilineText(doc, paragraph, text);
};

const insertParagraphAfter = (doc, paragraph, text, cloneParagraphPropsFrom = null) => {
  if (!paragraph || !paragraph.parentNode) return null;
  const newParagraph = doc.createElement('w:p');

  const source = cloneParagraphPropsFrom || paragraph;
  const pPr = directChildren(source, 'w:pPr')[0];
  if (pPr) newParagraph.appendChild(pPr.cloneNode(true));

  appendMultilineText(doc, newParagraph, text);

  if (paragraph.nextSibling) {
    paragraph.parentNode.insertBefore(newParagraph, paragraph.nextSibling);
  } else {
    paragraph.parentNode.appendChild(newParagraph);
  }

  return newParagraph;
};

const setTotalRowValues = (doc, table, values, startCol) => {
  if (!table || !Array.isArray(values) || values.length === 0) return;
  const rows = getDirectRows(table);
  const totalRow = rows.find(r => {
    const cells = getDirectCells(r);
    const firstCell = cleanText((cells[0] && cells[0].textContent) || '').toUpperCase();
    return firstCell.includes('GRAND TOTAL') || firstCell === 'TOTAL';
  });
  if (!totalRow) return;

  const cells = getDirectCells(totalRow);
  for (let i = 0; i < values.length; i += 1) {
    const col = startCol + i;
    if (cells[col]) setCellText(doc, cells[col], String(values[i]));
  }
};

const findTableByHeaders = (tables, headers, nth = 0) => {
  const upper = headers.map(h => h.toUpperCase());
  const matches = tables.filter(tbl => {
    const txt = tableText(tbl);
    return upper.every(h => txt.includes(h));
  });
  return matches[nth] || null;
};

const fillRowsIntoTable = (doc, table, rowsData, expectedCols, options = {}) => {
  if (!table || !Array.isArray(rowsData) || rowsData.length === 0) return;
  const headerKeywords = (options.headerKeywords || []).map(h => h.toUpperCase());

  let rows = getDirectRows(table);
  const writableRows = rows.filter(row => {
    const cells = getDirectCells(row);
    if (cells.length < expectedCols) return false;
    const rowText = cleanText(row.textContent).toUpperCase();
    const isTotalRow = /\b(GRAND\s+TOTAL|TOTAL)\b/i.test(rowText);
    const isHeaderRow = headerKeywords.some(h => rowText.includes(h));
    return !isTotalRow && !isHeaderRow;
  });

  if (rowsData.length > writableRows.length) {
    const totalRowRegex = /\b(GRAND\s+TOTAL|TOTAL)\b/i;
    const totalRow = rows.find(r => totalRowRegex.test(cleanText(r.textContent)));

    const templateRow = writableRows[writableRows.length - 1]
      || rows.find(r => {
        const cells = getDirectCells(r);
        if (cells.length < expectedCols) return false;
        const txt = cleanText(r.textContent);
        const upperTxt = txt.toUpperCase();
        const isHeader = headerKeywords.some(h => upperTxt.includes(h));
        return !totalRowRegex.test(txt) && !isHeader;
      });

    if (templateRow) {
      const toAdd = rowsData.length - writableRows.length;
      for (let i = 0; i < toAdd; i += 1) {
        const newRow = templateRow.cloneNode(true);
        const newCells = getDirectCells(newRow);
        newCells.forEach(cell => clearCellText(doc, cell));
        if (totalRow && totalRow.parentNode) {
          totalRow.parentNode.insertBefore(newRow, totalRow);
        } else {
          table.appendChild(newRow);
        }
        writableRows.push(newRow);
      }
      rows = getDirectRows(table);
    }
  }

  for (let i = 0; i < rowsData.length && i < writableRows.length; i += 1) {
    const data = rowsData[i];
    const cells = getDirectCells(writableRows[i]);
    for (let c = 0; c < expectedCols; c += 1) {
      setCellText(doc, cells[c], data[c] ?? '');
    }
  }
};

const fillStaticClientTemplate = (docxBuffer, sitrep, templateType, reportId, timestamp) => {
  const zip = new PizZip(docxBuffer);
  const xmlFile = zip.file(WORD_XML_PATH);
  if (!xmlFile) {
    throw new Error('word/document.xml not found in template');
  }

  const xml = xmlFile.asText();
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const tables = getTables(doc);

  // Fill tables in the client-provided layout.
  const affectedTbl = findTableByHeaders(tables, ['AFFECTED POPULATION', 'LOCATION', 'FAMILIES', 'PERSONS']);
  const affectedRows = sitrep.affectedPopulation || [];
  fillRowsIntoTable(
    doc,
    affectedTbl,
    affectedRows.map(r => [r.location || '', String(r.families || 0), String(r.persons || 0)]),
    3,
    { headerKeywords: ['LOCATION', 'AFFECTED POPULATION', 'FAMILIES', 'PERSONS'] }
  );
  setTotalRowValues(
    doc,
    affectedTbl,
    [
      affectedRows.reduce((sum, r) => sum + toNumber(r.families), 0),
      affectedRows.reduce((sum, r) => sum + toNumber(r.persons), 0)
    ],
    1
  );

  const idpTbl = findTableByHeaders(tables, ['LGU', 'FAMILIES', 'INDIVIDUALS', 'EVACUATION CENTER', 'REMARKS']);
  const idpRows = sitrep.idpCenters || [];
  fillRowsIntoTable(
    doc,
    idpTbl,
    idpRows.map(r => [
      r.lgu || '',
      String(r.families || 0),
      String(r.individuals || 0),
      r.evacuationCenter || '',
      r.remarks || ''
    ]),
    5,
    { headerKeywords: ['LGU', 'FAMILIES', 'INDIVIDUALS', 'EVACUATION CENTER', 'REMARKS', 'PROFILE OF IDP CENTER'] }
  );
  setTotalRowValues(
    doc,
    idpTbl,
    [
      idpRows.reduce((sum, r) => sum + toNumber(r.families), 0),
      idpRows.reduce((sum, r) => sum + toNumber(r.individuals), 0)
    ],
    1
  );

  const lifelineTbl = findTableByHeaders(tables, ['LIFELINE', 'AFFECTED AREA', 'STATUS', 'DESCRIPTION OF DAMAGE', 'ACTIONS TAKEN']);
  if (lifelineTbl) {
    const lf = sitrep.lifelines || {};
    const rows = getDirectRows(lifelineTbl);
    const rowLabel = (idx) => {
      const cells = getDirectCells(rows[idx] || {});
      return cleanText((cells[0] && cells[0].textContent) || '').toUpperCase();
    };

    const roadsIdx = rows.findIndex((_, i) => rowLabel(i).includes('ROADS AND BRIDGES'));
    const elecIdx = rows.findIndex((_, i) => rowLabel(i).includes('ELECTRICITY'));
    const waterIdx = rows.findIndex((_, i) => rowLabel(i).includes('WATER SYSTEM'));
    const commIdx = rows.findIndex((_, i) => rowLabel(i).includes('COMMUNICATION'));

    const clearRowDataCells = (idx) => {
      if (idx < 0 || !rows[idx]) return;
      const cells = getDirectCells(rows[idx]);
      if (cells.length >= 5) {
        for (let c = 1; c <= 4; c += 1) setCellText(doc, cells[c], '');
      } else if (cells.length === 2) {
        setCellText(doc, cells[1], '');
      }
    };

    const writeLifelineSection = (startIdx, endIdxExclusive, data) => {
      if (startIdx < 0) return;
      const from = startIdx + 1;
      const to = endIdxExclusive > from ? endIdxExclusive : rows.length;

      // Clear the label row's merged content (roads row in template carries old sample text here).
      clearRowDataCells(startIdx);

      // Hard clear for merged roads content cell used in legacy template blocks.
      const labelCells = getDirectCells(rows[startIdx]);
      if (labelCells.length === 2) {
        const targetCell = labelCells[1];
        const tcPr = directChildren(targetCell, 'w:tcPr')[0];
        const tcPrClone = tcPr ? tcPr.cloneNode(true) : null;

        for (let i = targetCell.childNodes.length - 1; i >= 0; i -= 1) {
          targetCell.removeChild(targetCell.childNodes[i]);
        }

        if (tcPrClone) targetCell.appendChild(tcPrClone);
        const p = doc.createElement('w:p');
        appendMultilineText(doc, p, '');
        targetCell.appendChild(p);
      }

      let targetRow = null;
      for (let i = from; i < to; i += 1) {
        const cells = getDirectCells(rows[i]);
        if (cells.length >= 5) {
          if (!targetRow) targetRow = rows[i];
          clearRowDataCells(i);
        } else {
          clearRowDataCells(i);
        }
      }

      if (!targetRow) {
        const labelCells = getDirectCells(rows[startIdx]);
        if (labelCells.length >= 5) targetRow = rows[startIdx];
      }
      if (!targetRow) return;

      const cells = getDirectCells(targetRow);
      if (cells.length < 5) return;
      setCellText(doc, cells[1], data.affectedArea || '');
      setCellText(doc, cells[2], data.status || '');
      setCellText(doc, cells[3], data.damageDescription || '');
      setCellText(doc, cells[4], data.actionsTaken || data.intervention || data.interventions || '');
    };

    writeLifelineSection(roadsIdx, elecIdx, lf.roadsAndBridges || {});
    writeLifelineSection(elecIdx, waterIdx, lf.electricity || {});
    writeLifelineSection(waterIdx, commIdx, lf.waterSystem || {});
    writeLifelineSection(commIdx, rows.length, lf.communication || {});

    // Final scrub for legacy template sample narrative in lifelines block.
    const legacyMarkers = ['AS OF 0735H', 'RDANA TEAM CONVENED', 'FLOODED BRGYS'];
    rows.forEach(row => {
      const cells = getDirectCells(row);
      for (let c = 1; c < cells.length; c += 1) {
        const txt = cleanText(cells[c].textContent).toUpperCase();
        if (legacyMarkers.some(m => txt.includes(m))) {
          setCellText(doc, cells[c], '');
        }
      }
    });

    // Some templates split legacy sample text into many runs inside the merged roads cell.
    // Remove those marker runs directly so they cannot appear in output.
    const textRuns = Array.from(lifelineTbl.getElementsByTagName('w:t'));
    textRuns.forEach(t => {
      const up = String(t.textContent || '').toUpperCase();
      if (legacyMarkers.some(m => up.includes(m))) {
        t.textContent = '';
      }
    });
  }

  const houseTbl = findTableByHeaders(tables, ['LOCATION', 'TOTALLY', 'PARTIALLY', 'TOTAL', 'VALUE (PHP)']);
  const houseRows = sitrep.houseDamage || [];
  fillRowsIntoTable(
    doc,
    houseTbl,
    houseRows.map(r => [
      r.location || '',
      String(r.totallyNo || 0),
      String(r.totallyValue || 0),
      String(r.partiallyNo || 0),
      String(r.partiallyValue || 0),
      String((r.totalNo ?? (toNumber(r.totallyNo) + toNumber(r.partiallyNo))) || 0),
      String(r.totalValue || 0)
    ]),
    7,
    { headerKeywords: ['LOCATION', 'TOTALLY', 'PARTIALLY', 'TOTAL', 'DAMAGE TO HOUSES', 'NO.', 'VALUE (PHP)', 'VALUE(PHP)', 'VALUE'] }
  );
  setTotalRowValues(
    doc,
    houseTbl,
    [
      houseRows.reduce((sum, r) => sum + toNumber(r.totallyNo), 0),
      houseRows.reduce((sum, r) => sum + toNumber(r.totallyValue), 0),
      houseRows.reduce((sum, r) => sum + toNumber(r.partiallyNo), 0),
      houseRows.reduce((sum, r) => sum + toNumber(r.partiallyValue), 0),
      houseRows.reduce((sum, r) => sum + toNumber(r.totalNo ?? (toNumber(r.totallyNo) + toNumber(r.partiallyNo))), 0),
      houseRows.reduce((sum, r) => sum + toNumber(r.totalValue), 0)
    ],
    1
  );

  const riceRows = sitrep.agriculture?.rice || [];
  const cornRows = sitrep.agriculture?.corn || [];
  const hvccRows = sitrep.agriculture?.hvcc || [];
  const cropTables = tables.filter(tbl => {
    const txt = tableText(tbl);
    return txt.includes('LGU') && txt.includes('AREA') && txt.includes('FARMERS AFFECTED') && txt.includes('EXPECTED PRODUCTION VOLUME') && txt.includes('ESTIMATED COST OF DAMAGE');
  });
  fillRowsIntoTable(doc, cropTables[0], riceRows.map(r => [r.lgu || '', String(r.area || 0), String(r.farmers || 0), String(r.expectedProduction || 0), String(r.estimatedCost || 0)]), 5, { headerKeywords: ['LGU', 'AREA', 'FARMERS AFFECTED', 'EXPECTED PRODUCTION', 'ESTIMATED COST'] });
  fillRowsIntoTable(doc, cropTables[1], cornRows.map(r => [r.lgu || '', String(r.area || 0), String(r.farmers || 0), String(r.expectedProduction || 0), String(r.estimatedCost || 0)]), 5, { headerKeywords: ['LGU', 'AREA', 'FARMERS AFFECTED', 'EXPECTED PRODUCTION', 'ESTIMATED COST'] });
  fillRowsIntoTable(doc, cropTables[2], hvccRows.map(r => [r.lgu || '', String(r.area || 0), String(r.farmers || 0), String(r.expectedProduction || 0), String(r.estimatedCost || 0)]), 5, { headerKeywords: ['LGU', 'AREA', 'FARMERS AFFECTED', 'EXPECTED PRODUCTION', 'ESTIMATED COST'] });
  setTotalRowValues(doc, cropTables[0], [
    riceRows.reduce((sum, r) => sum + toNumber(r.area), 0),
    riceRows.reduce((sum, r) => sum + toNumber(r.farmers), 0),
    riceRows.reduce((sum, r) => sum + toNumber(r.expectedProduction), 0),
    riceRows.reduce((sum, r) => sum + toNumber(r.estimatedCost), 0)
  ], 1);
  setTotalRowValues(doc, cropTables[1], [
    cornRows.reduce((sum, r) => sum + toNumber(r.area), 0),
    cornRows.reduce((sum, r) => sum + toNumber(r.farmers), 0),
    cornRows.reduce((sum, r) => sum + toNumber(r.expectedProduction), 0),
    cornRows.reduce((sum, r) => sum + toNumber(r.estimatedCost), 0)
  ], 1);
  setTotalRowValues(doc, cropTables[2], [
    hvccRows.reduce((sum, r) => sum + toNumber(r.area), 0),
    hvccRows.reduce((sum, r) => sum + toNumber(r.farmers), 0),
    hvccRows.reduce((sum, r) => sum + toNumber(r.expectedProduction), 0),
    hvccRows.reduce((sum, r) => sum + toNumber(r.estimatedCost), 0)
  ], 1);

  const livestockTbl = findTableByHeaders(tables, ['LOCATION', 'SPECIE', 'NO. OF HEADS', 'AMOUNT']);
  const livestockRows = sitrep.agriculture?.livestock || [];
  fillRowsIntoTable(
    doc,
    livestockTbl,
    livestockRows.map(r => [r.location || '', r.specie || '', String(r.numberOfHeads || 0), String(r.amount || 0)]),
    4,
    { headerKeywords: ['LOCATION', 'SPECIE', 'NO. OF HEADS', 'AMOUNT', 'LIVESTOCK'] }
  );
  setTotalRowValues(
    doc,
    livestockTbl,
    [
      livestockRows.reduce((sum, r) => sum + toNumber(r.numberOfHeads), 0),
      livestockRows.reduce((sum, r) => sum + toNumber(r.amount), 0)
    ],
    2
  );

  // Fill simple paragraph-based fields where client template has empty trailing paragraphs.
  const paragraphs = getParagraphs(doc);
  const setAfterLabel = (label, value) => {
    const idx = paragraphs.findIndex(p => paragraphText(p).includes(label));
    if (idx < 0 || !value) return;
    for (let i = idx + 1; i < Math.min(paragraphs.length, idx + 6); i += 1) {
      if (isPlaceholderText(paragraphs[i].textContent)) {
        setParagraphText(doc, paragraphs[i], value);
        break;
      }
    }
  };

  const setActionsTakenInSection = (value) => {
    if (!value) return;
    let idx = paragraphs.findIndex(p => /\bIII\.?\s*ACTIONS TAKEN\b/.test(paragraphText(p)));
    if (idx < 0) {
      const allIdx = paragraphs
        .map((p, i) => ({ i, txt: paragraphText(p) }))
        .filter(item => item.txt.includes('ACTIONS TAKEN'));
      idx = allIdx.length ? allIdx[allIdx.length - 1].i : -1;
    }
    if (idx < 0) return;

    const end = Math.min(paragraphs.length, idx + 25);
    const signoffRegex = /\b(PREPARED BY|RECOMMENDING APPROVAL|APPROVED BY)\b/;
    let target = null;
    let lguIdx = -1;

    for (let i = idx + 1; i < end; i += 1) {
      const txt = paragraphText(paragraphs[i]);
      if (signoffRegex.test(txt)) break;
      if (txt.includes('LGU MALAYBALAY')) {
        lguIdx = i;
        break;
      }
    }

    if (lguIdx >= 0) {
      for (let i = lguIdx + 1; i < end; i += 1) {
        const txt = paragraphText(paragraphs[i]);
        if (signoffRegex.test(txt)) break;
        if (isPlaceholderText(paragraphs[i].textContent)) {
          target = paragraphs[i];
          break;
        }
      }

      if (target) {
        setParagraphText(doc, target, value);
        return;
      }

      // If no placeholder exists below LGU MALAYBALAY, inject a new paragraph there.
      insertParagraphAfter(doc, paragraphs[lguIdx], value, paragraphs[lguIdx]);
      return;
    }

    for (let i = idx + 1; i < end; i += 1) {
      const txt = paragraphText(paragraphs[i]);
      if (signoffRegex.test(txt)) break;
      if (!target && isPlaceholderText(paragraphs[i].textContent)) {
        target = paragraphs[i];
      }
    }

    if (target) setParagraphText(doc, target, value);
  };

  setAfterLabel('SITUATION OVERVIEW', sitrep.situationOverview || '');
  setAfterLabel('1.1 CROPS', '• RICE');
  setActionsTakenInSection(sitrep.actionsTaken || '');
  const admin = sitrep.administrativeActions || {};
    const setAdminLine = (label, checked, details) => {
      const idx = paragraphs.findIndex(p => paragraphText(p).includes(label));
      if (idx < 0) return;
      const line = checked
        ? (details ? `• YES - ${details}` : '• YES')
        : '• NO';
      for (let i = idx + 1; i < Math.min(paragraphs.length, idx + 6); i += 1) {
        const txt = paragraphText(paragraphs[i]);
        if (txt.includes('SUSPENSION OF') || txt.includes('DECLARATION OF') || txt.includes('ACTIONS TAKEN')) break;
        if (txt === '' || txt.includes('NONE') || txt.startsWith('•')) {
          setParagraphText(doc, paragraphs[i], line);
          break;
        }
      }
    };

    setAdminLine('SUSPENSION OF CLASSES', admin.suspensionOfClasses, admin.suspensionOfClassesDetails);
    setAdminLine('SUSPENSION OF WORK', admin.suspensionOfWork, admin.suspensionOfWorkDetails);
    setAdminLine('DECLARATION OF STATE OF CALAMITY', admin.declarationOfCalamity, admin.declarationOfCalamityDetails);

    // Enforce consistent visual layout: solid borders and aligned table margins.
    [
      affectedTbl,
      idpTbl,
      lifelineTbl,
      houseTbl,
      cropTables[0],
      cropTables[1],
      cropTables[2],
      livestockTbl
    ].forEach(tbl => normalizeTableLayoutAndBorders(doc, tbl));

    // Final hard cleanup for the known legacy roads narrative row in client template.
    // Table index 2 is the lifelines table in SITREP2.docx.
    if (tables[2]) {
      const lfRows = getDirectRows(tables[2]);
      if (lfRows[1]) {
        const lfCells = getDirectCells(lfRows[1]);
        if (lfCells.length === 2 && cleanText(lfCells[0].textContent).toUpperCase().includes('ROADS AND BRIDGES')) {
          const targetCell = lfCells[1];
          const tcPr = directChildren(targetCell, 'w:tcPr')[0];
          const tcPrClone = tcPr ? tcPr.cloneNode(true) : null;
          for (let i = targetCell.childNodes.length - 1; i >= 0; i -= 1) {
            targetCell.removeChild(targetCell.childNodes[i]);
          }
          if (tcPrClone) targetCell.appendChild(tcPrClone);
          const p = doc.createElement('w:p');
          appendMultilineText(doc, p, '');
          targetCell.appendChild(p);
        }
      }
    }

  const updatedXml = new XMLSerializer().serializeToString(doc);
  zip.file(WORD_XML_PATH, updatedXml);
  console.log(`✅ ${templateType} Word document generated using static client-template filler`);
  return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
};

/**
 * Generate a Word document from SITREP data using actual template files with fallback
 * @param {Object} sitrep - SITREP data object
 * @param {String} templateType - SITREP1 or SITREP2
 * @param {String} reportId - Report ID
 * @returns {Promise<Buffer>} - Word document buffer
 */
const generateSitrepWord = async (sitrep, templateType, reportId) => {
  try {
    const timestamp = new Date().toLocaleString();
    
    // Path to template files in frontend/public folder
    const templateFilePath = path.join(
      __dirname,
      '../../frontend/public',
      `${templateType}.docx`
    );

    // Check if template file exists, if yes try to use it with fallback
    if (fs.existsSync(templateFilePath)) {
      try {
        const docxContent = fs.readFileSync(templateFilePath);

        const zipForDetect = new PizZip(docxContent);
        const xmlDetect = zipForDetect.file(WORD_XML_PATH)?.asText() || '';
        if (!hasDocxtemplaterTags(xmlDetect)) {
          return fillStaticClientTemplate(docxContent, sitrep, templateType, reportId, timestamp);
        }

        const zip = new PizZip(docxContent);
        const doc = new Docxtemplater(zip, {
          paragraphLoop: true,
          linebreaks: true
        });

        // Prepare data for template - map new SITREP2 structure to template variables
        const data = {
          reportId: reportId,
          dateTime: timestamp,
          status: sitrep.status || 'Draft',
          templateType: templateType,
          situationOverview: sitrep.situationOverview || 'No information provided',
          
          // Affected Population
          affectedPopulationList: (sitrep.affectedPopulation || []).map(ap => ({
            location: ap.location || '',
            families: ap.families || 0,
            persons: ap.persons || 0
          })),
          
          // IDP Centers
          idpCentersList: (sitrep.idpCenters || []).map(icp => ({
            lgu: icp.lgu || '',
            families: icp.families || 0,
            individuals: icp.individuals || 0,
            evacuationCenter: icp.evacuationCenter || '',
            remarks: icp.remarks || ''
          })),
          
          // Lifelines
          roadsBridges: sitrep.lifelines?.roadsAndBridges || {},
          electricity: sitrep.lifelines?.electricity || {},
          waterSystem: sitrep.lifelines?.waterSystem || {},
          communication: sitrep.lifelines?.communication || {},
          
          // Houses
          houseDamageList: (sitrep.houseDamage || []).map(hd => ({
            location: hd.location || '',
            totallyNo: hd.totallyNo || 0,
            totallyValue: hd.totallyValue || 0,
            partiallyNo: hd.partiallyNo || 0,
            partiallyValue: hd.partiallyValue || 0,
            totalValue: hd.totalValue || 0
          })),
          
          // Agriculture - Rice
          riceList: (sitrep.agriculture?.rice || []).map(r => ({
            lgu: r.lgu || '',
            area: r.area || 0,
            farmers: r.farmers || 0,
            expectedProduction: r.expectedProduction || 0,
            estimatedCost: r.estimatedCost || 0
          })),
          
          // Agriculture - Corn
          cornList: (sitrep.agriculture?.corn || []).map(c => ({
            lgu: c.lgu || '',
            area: c.area || 0,
            farmers: c.farmers || 0,
            expectedProduction: c.expectedProduction || 0,
            estimatedCost: c.estimatedCost || 0
          })),
          
          // Agriculture - HVCC
          hvccList: (sitrep.agriculture?.hvcc || []).map(h => ({
            lgu: h.lgu || '',
            area: h.area || 0,
            farmers: h.farmers || 0,
            expectedProduction: h.expectedProduction || 0,
            estimatedCost: h.estimatedCost || 0
          })),
          
          // Agriculture - Livestock
          livestockList: (sitrep.agriculture?.livestock || []).map(l => ({
            location: l.location || '',
            specie: l.specie || '',
            numberOfHeads: l.numberOfHeads || 0,
            amount: l.amount || 0
          })),
          
          // Administrative Actions
          suspensionOfClasses: sitrep.administrativeActions?.suspensionOfClasses ? 'YES' : 'NO',
          suspensionOfWork: sitrep.administrativeActions?.suspensionOfWork ? 'YES' : 'NO',
          declarationOfCalamity: sitrep.administrativeActions?.declarationOfCalamity ? 'YES' : 'NO',
          
          // Actions
          actionsTaken: sitrep.actionsTaken || 'No actions taken'
        };

        doc.render(data);
        const output = doc.getZip().generate({
          type: 'nodebuffer',
          compression: 'DEFLATE'
        });

        console.log(`✅ ${templateType} Word document generated successfully using template`);
        return output;
      } catch (templateError) {
        console.warn(`⚠️  Template rendering failed, using fallback generation: ${templateError.message}`);
        // Fall through to fallback generation below
      }
    } else {
      console.warn(`⚠️  Template file not found at ${templateFilePath}, using fallback generation`);
    }

    // FALLBACK: Generate professional document from scratch based on template type
    return generateFallbackDocument(sitrep, templateType, reportId, timestamp);

  } catch (error) {
    console.error('❌ Error generating Word document:', error.message);
    throw error;
  }
};

/**
 * Fallback function to generate professional SITREP documents using NEW form structure
 */
const generateFallbackDocument = async (sitrep, templateType, reportId, timestamp) => {
  let sections = [];

  // Header
  sections.push(
    new Paragraph({
      text: 'CITY DISASTER RISK REDUCTION AND MANAGEMENT OFFICE (CDRRMO)',
      alignment: AlignmentType.CENTER,
      bold: true,
      size: 24
    }),
    new Paragraph({
      text: 'Malaybalay City, Bukidnon',
      alignment: AlignmentType.CENTER,
      size: 20
    }),
    new Paragraph({ text: '' }),
    new Paragraph({
      text: `SITUATION REPORT (${templateType})`,
      alignment: AlignmentType.CENTER,
      bold: true,
      size: 28
    }),
    new Paragraph({ text: '' })
  );

  // Report Info
  sections.push(
    new Paragraph({
      text: `Report ID: ${reportId}`,
      bold: true
    }),
    new Paragraph({
      text: `Date/Time: ${timestamp}`
    }),
    new Paragraph({
      text: `Status: ${sitrep.status || 'Draft'}`,
      bold: true
    }),
    new Paragraph({
      text: `Template Type: ${templateType}`,
      bold: true
    }),
    new Paragraph({ text: '' })
  );

  // I. SITUATION OVERVIEW
  sections.push(
    new Paragraph({
      text: 'I. SITUATION OVERVIEW',
      bold: true,
      size: 24,
      spacing: { before: 200, after: 100 }
    }),
    new Paragraph({
      text: sitrep.situationOverview || 'No information provided',
      spacing: { after: 200 }
    })
  );

  // II. EFFECTS
  sections.push(
    new Paragraph({
      text: 'II. EFFECTS',
      bold: true,
      size: 24,
      spacing: { before: 200, after: 100 }
    })
  );

  // II.a. AFFECTED POPULATION
  if (sitrep.affectedPopulation && sitrep.affectedPopulation.length > 0) {
    sections.push(
      new Paragraph({
        text: 'a. SUMMARY OF AFFECTED POPULATION',
        bold: true,
        size: 20,
        spacing: { before: 100, after: 100 }
      })
    );

    const populationTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ text: 'LOCATION', bold: true })],
              borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE } },
              shading: { fill: 'ADD8E6' }
            }),
            new TableCell({
              children: [new Paragraph({ text: 'No. of FAMILIES', bold: true })],
              borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE } },
              shading: { fill: 'ADD8E6' }
            }),
            new TableCell({
              children: [new Paragraph({ text: 'No. of PERSONS', bold: true })],
              borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE } },
              shading: { fill: 'ADD8E6' }
            })
          ]
        }),
        ...sitrep.affectedPopulation.map(
          pop =>
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph(pop.location || 'N/A')] }),
                new TableCell({ children: [new Paragraph((pop.families || 0).toString())] }),
                new TableCell({ children: [new Paragraph((pop.persons || 0).toString())] })
              ]
            })
        )
      ]
    });
    sections.push(populationTable, new Paragraph({ text: '' }));
  }

  // II.b. IDP CENTER PROFILE
  if (sitrep.idpCenters && sitrep.idpCenters.length > 0) {
    sections.push(
      new Paragraph({
        text: 'b. PROFILE OF IDP CENTER',
        bold: true,
        size: 20,
        spacing: { before: 100, after: 100 }
      })
    );

    const idpTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ text: 'LGU', bold: true })],
              shading: { fill: 'FFFF00' }
            }),
            new TableCell({
              children: [new Paragraph({ text: 'Families', bold: true })],
              shading: { fill: 'FFFF00' }
            }),
            new TableCell({
              children: [new Paragraph({ text: 'Individuals', bold: true })],
              shading: { fill: 'FFFF00' }
            }),
            new TableCell({
              children: [new Paragraph({ text: 'Evacuation Center', bold: true })],
              shading: { fill: 'FFFF00' }
            }),
            new TableCell({
              children: [new Paragraph({ text: 'Remarks', bold: true })],
              shading: { fill: 'FFFF00' }
            })
          ]
        }),
        ...sitrep.idpCenters.map(
          center =>
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph(center.lgu || 'N/A')] }),
                new TableCell({ children: [new Paragraph((center.families || 0).toString())] }),
                new TableCell({ children: [new Paragraph((center.individuals || 0).toString())] }),
                new TableCell({ children: [new Paragraph(center.evacuationCenter || 'N/A')] }),
                new TableCell({ children: [new Paragraph(center.remarks || 'N/A')] })
              ]
            })
        )
      ]
    });
    sections.push(idpTable, new Paragraph({ text: '' }));
  }

  // II.c. LIFELINES
  sections.push(
    new Paragraph({
      text: 'c. LIFELINES',
      bold: true,
      size: 20,
      spacing: { before: 100, after: 100 }
    })
  );

  if (templateType === 'SITREP2' && sitrep.lifelines) {
    // SITREP2 - Detailed lifelines table
    const lifelinesData = [
      { name: 'Roads and Bridges', key: 'roadsAndBridges' },
      { name: 'Electricity', key: 'electricity' },
      { name: 'Water System', key: 'waterSystem' },
      { name: 'Communication', key: 'communication' }
    ];

    const lifelinesTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: 'LIFELINE', bold: true })], shading: { fill: 'ADD8E6' } }),
            new TableCell({ children: [new Paragraph({ text: 'AFFECTED AREA', bold: true })], shading: { fill: 'ADD8E6' } }),
            new TableCell({ children: [new Paragraph({ text: 'STATUS', bold: true })], shading: { fill: 'ADD8E6' } }),
            new TableCell({ children: [new Paragraph({ text: 'DESCRIPTION OF DAMAGE', bold: true })], shading: { fill: 'ADD8E6' } }),
            new TableCell({ children: [new Paragraph({ text: 'ACTIONS TAKEN', bold: true })], shading: { fill: 'ADD8E6' } })
          ]
        }),
        ...lifelinesData.map(lifeline => {
          const data = sitrep.lifelines?.[lifeline.key] || {};
          return new TableRow({
            children: [
              new TableCell({ children: [new Paragraph(lifeline.name)] }),
              new TableCell({ children: [new Paragraph(data.affectedArea || '•')] }),
              new TableCell({ children: [new Paragraph(data.status || 'No Report')] }),
              new TableCell({ children: [new Paragraph(data.damageDescription || 'N/A')] }),
              new TableCell({ children: [new Paragraph(data.actionsTaken || 'N/A')] })
            ]
          });
        })
      ]
    });
    sections.push(lifelinesTable);
  } else {
    // SITREP1 - Simple lifelines
    sections.push(new Paragraph('No reports of affected lifelines'));
  }
  sections.push(new Paragraph({ text: '' }));

  // II.d. DAMAGE TO HOUSES
  if (sitrep.houseDamage && sitrep.houseDamage.length > 0) {
    sections.push(
      new Paragraph({
        text: 'd. DAMAGE TO HOUSES',
        bold: true,
        size: 20,
        spacing: { before: 100, after: 100 }
      })
    );

    if (templateType === 'SITREP2') {
      // Detailed table for SITREP2
      const houseTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ text: 'LOCATION', bold: true })], shading: { fill: 'ADD8E6' } }),
              new TableCell({ children: [new Paragraph({ text: 'TOTALLY (No)', bold: true })], shading: { fill: 'ADD8E6' } }),
              new TableCell({ children: [new Paragraph({ text: 'TOTALLY (Value)', bold: true })], shading: { fill: 'ADD8E6' } }),
              new TableCell({ children: [new Paragraph({ text: 'PARTIALLY (No)', bold: true })], shading: { fill: 'ADD8E6' } }),
              new TableCell({ children: [new Paragraph({ text: 'PARTIALLY (Value)', bold: true })], shading: { fill: 'ADD8E6' } }),
              new TableCell({ children: [new Paragraph({ text: 'TOTAL VALUE (Php)', bold: true })], shading: { fill: 'ADD8E6' } })
            ]
          }),
          ...sitrep.houseDamage.map(
            house =>
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph(house.location || 'N/A')] }),
                  new TableCell({ children: [new Paragraph((house.totallyNo || 0).toString())] }),
                  new TableCell({ children: [new Paragraph((house.totallyValue || 0).toString())] }),
                  new TableCell({ children: [new Paragraph((house.partiallyNo || 0).toString())] }),
                  new TableCell({ children: [new Paragraph((house.partiallyValue || 0).toString())] }),
                  new TableCell({ children: [new Paragraph((house.totalValue || 0).toString())] })
                ]
              })
          )
        ]
      });
      sections.push(houseTable);
    } else {
      // Simple table for SITREP1
      const houseTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ text: 'LOCATION', bold: true })], shading: { fill: 'ADD8E6' } }),
              new TableCell({ children: [new Paragraph({ text: 'No. DAMAGED', bold: true })], shading: { fill: 'ADD8E6' } })
            ]
          }),
          ...sitrep.houseDamage.map(
            house =>
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph(house.location || 'N/A')] }),
                  new TableCell({ children: [new Paragraph((house.totallyNo || 0).toString())] })
                ]
              })
          )
        ]
      });
      sections.push(houseTable);
    }
    sections.push(new Paragraph({ text: '' }));
  }

  // II.e. AGRICULTURE
  if (sitrep.agriculture) {
    sections.push(
      new Paragraph({
        text: 'e. AGRICULTURE',
        bold: true,
        size: 20,
        spacing: { before: 100, after: 100 }
      })
    );

    if (templateType === 'SITREP2') {
      // SITREP2 - Detailed agriculture

      // Rice
      if (sitrep.agriculture.rice && sitrep.agriculture.rice.length > 0) {
        sections.push(new Paragraph({ text: '• RICE', bold: true, spacing: { before: 100, after: 50 } }));
        const riceTable = new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: 'LGU', bold: true })], shading: { fill: 'ADD8E6' } }),
                new TableCell({ children: [new Paragraph({ text: 'AREA (has)', bold: true })], shading: { fill: 'ADD8E6' } }),
                new TableCell({ children: [new Paragraph({ text: 'FARMERS AFFECTED', bold: true })], shading: { fill: 'ADD8E6' } }),
                new TableCell({ children: [new Paragraph({ text: 'EXPECTED PRODUCTION VOL (MT)', bold: true })], shading: { fill: 'ADD8E6' } }),
                new TableCell({ children: [new Paragraph({ text: 'ESTIMATED COST OF DAMAGE', bold: true })], shading: { fill: 'ADD8E6' } })
              ]
            }),
            ...sitrep.agriculture.rice.map(crop => new TableRow({
              children: [
                new TableCell({ children: [new Paragraph(crop.lgu || '')] }),
                new TableCell({ children: [new Paragraph((crop.area || 0).toString())] }),
                new TableCell({ children: [new Paragraph((crop.farmers || 0).toString())] }),
                new TableCell({ children: [new Paragraph((crop.expectedProduction || 0).toString())] }),
                new TableCell({ children: [new Paragraph((crop.estimatedCost || 0).toString())] })
              ]
            }))
          ]
        });
        sections.push(riceTable, new Paragraph({ text: '' }));
      }

      // Corn
      if (sitrep.agriculture.corn && sitrep.agriculture.corn.length > 0) {
        sections.push(new Paragraph({ text: '• CORN', bold: true, spacing: { before: 100, after: 50 } }));
        const cornTable = new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: 'LGU', bold: true })], shading: { fill: 'ADD8E6' } }),
                new TableCell({ children: [new Paragraph({ text: 'AREA (has)', bold: true })], shading: { fill: 'ADD8E6' } }),
                new TableCell({ children: [new Paragraph({ text: 'FARMERS AFFECTED', bold: true })], shading: { fill: 'ADD8E6' } }),
                new TableCell({ children: [new Paragraph({ text: 'EXPECTED PRODUCTION VOL (MT)', bold: true })], shading: { fill: 'ADD8E6' } }),
                new TableCell({ children: [new Paragraph({ text: 'ESTIMATED COST OF DAMAGE', bold: true })], shading: { fill: 'ADD8E6' } })
              ]
            }),
            ...sitrep.agriculture.corn.map(crop => new TableRow({
              children: [
                new TableCell({ children: [new Paragraph(crop.lgu || '')] }),
                new TableCell({ children: [new Paragraph((crop.area || 0).toString())] }),
                new TableCell({ children: [new Paragraph((crop.farmers || 0).toString())] }),
                new TableCell({ children: [new Paragraph((crop.expectedProduction || 0).toString())] }),
                new TableCell({ children: [new Paragraph((crop.estimatedCost || 0).toString())] })
              ]
            }))
          ]
        });
        sections.push(cornTable, new Paragraph({ text: '' }));
      }

      // HVCC
      if (sitrep.agriculture.hvcc && sitrep.agriculture.hvcc.length > 0) {
        sections.push(new Paragraph({ text: '• HVCC (Fruit trees, assorted vegetables, Banana, Cassava & Coconut)', bold: true, spacing: { before: 100, after: 50 } }));
        const hvccTable = new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: 'LGU', bold: true })], shading: { fill: 'ADD8E6' } }),
                new TableCell({ children: [new Paragraph({ text: 'AREA (has)', bold: true })], shading: { fill: 'ADD8E6' } }),
                new TableCell({ children: [new Paragraph({ text: 'FARMERS AFFECTED', bold: true })], shading: { fill: 'ADD8E6' } }),
                new TableCell({ children: [new Paragraph({ text: 'EXPECTED PRODUCTION VOL (MT)', bold: true })], shading: { fill: 'ADD8E6' } }),
                new TableCell({ children: [new Paragraph({ text: 'ESTIMATED COST OF DAMAGE', bold: true })], shading: { fill: 'ADD8E6' } })
              ]
            }),
            ...sitrep.agriculture.hvcc.map(crop => new TableRow({
              children: [
                new TableCell({ children: [new Paragraph(crop.lgu || '')] }),
                new TableCell({ children: [new Paragraph((crop.area || 0).toString())] }),
                new TableCell({ children: [new Paragraph((crop.farmers || 0).toString())] }),
                new TableCell({ children: [new Paragraph((crop.expectedProduction || 0).toString())] }),
                new TableCell({ children: [new Paragraph((crop.estimatedCost || 0).toString())] })
              ]
            }))
          ]
        });
        sections.push(hvccTable, new Paragraph({ text: '' }));
      }

      // Livestock
      if (sitrep.agriculture.livestock && sitrep.agriculture.livestock.length > 0) {
        sections.push(new Paragraph({ text: '1.2 LIVESTOCK', bold: true, spacing: { before: 100, after: 50 } }));
        const livestockTable = new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: 'LOCATION', bold: true })], shading: { fill: 'ADD8E6' } }),
                new TableCell({ children: [new Paragraph({ text: 'SPECIE', bold: true })], shading: { fill: 'ADD8E6' } }),
                new TableCell({ children: [new Paragraph({ text: 'No. OF HEADS', bold: true })], shading: { fill: 'ADD8E6' } }),
                new TableCell({ children: [new Paragraph({ text: 'AMOUNT', bold: true })], shading: { fill: 'ADD8E6' } })
              ]
            }),
            ...sitrep.agriculture.livestock.map(item => new TableRow({
              children: [
                new TableCell({ children: [new Paragraph(item.lgu || '')] }),
                new TableCell({ children: [new Paragraph(item.area || '')] }),
                new TableCell({ children: [new Paragraph((item.farmers || 0).toString())] }),
                new TableCell({ children: [new Paragraph((item.expectedProduction || 0).toString())] })
              ]
            }))
          ]
        });
        sections.push(livestockTable, new Paragraph({ text: '' }));
      }
    } else {
      // SITREP1 - Simple agriculture
      sections.push(new Paragraph('In-progress assessment to affected barangays.'));
    }
  }

  // II.f. ADMINISTRATIVE ACTIONS
  if (sitrep.administrativeActions) {
    sections.push(
      new Paragraph({
        text: 'j. Suspension of Classes',
        spacing: { before: 100, after: 50 }
      }),
      new Paragraph({
        text: sitrep.administrativeActions.suspensionOfClasses ? '• YES' : '• NO'
      }),
      new Paragraph({
        text: 'k. Suspension of work in all government office',
        spacing: { before: 100, after: 50 }
      }),
      new Paragraph({
        text: sitrep.administrativeActions.suspensionOfWork ? '• YES' : '• NO'
      }),
      new Paragraph({
        text: 'l. Declaration of State of Calamity',
        spacing: { before: 100, after: 50 }
      }),
      new Paragraph({
        text: sitrep.administrativeActions.declarationOfCalamity ? '• YES' : '• NO',
        spacing: { after: 200 }
      })
    );
  }

  // III. ACTIONS TAKEN
  sections.push(
    new Paragraph({
      text: 'III. Actions Taken',
      bold: true,
      size: 24,
      spacing: { before: 200, after: 100 }
    }),
    new Paragraph({
      text: sitrep.actionsTaken || 'No actions taken',
      spacing: { after: 200 }
    })
  );

  // APPROVAL SECTION
  sections.push(
    new Paragraph({
      text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 200 }
    }),
    new Paragraph({
      text: 'APPROVAL SECTION',
      alignment: AlignmentType.CENTER,
      bold: true,
      size: 24,
      spacing: { after: 200 }
    }),
    new Paragraph({
      text: 'Prepared by:',
      bold: true
    }),
    new Paragraph({
      text: '_________________________'
    }),
    new Paragraph({
      text: 'Name:____________________',
      spacing: { after: 200 }
    }),
    new Paragraph({
      text: 'Recommending Approval:',
      bold: true
    }),
    new Paragraph({
      text: '_________________________'
    }),
    new Paragraph({
      text: 'Name:____________________',
      spacing: { after: 200 }
    }),
    new Paragraph({
      text: 'Approved by:',
      bold: true
    }),
    new Paragraph({
      text: '_________________________'
    }),
    new Paragraph({
      text: 'Name:____________________',
      spacing: { after: 400 }
    }),
    new Paragraph({
      text: `Status: ${sitrep.status || 'Draft'} | Generated: ${timestamp}`,
      italic: true,
      size: 18,
      alignment: AlignmentType.CENTER
    })
  );

  // Create and pack document
  const doc = new Document({
    sections: [{ children: sections }]
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer;
};

module.exports = { generateSitrepWord };
