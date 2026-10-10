const REQUIRED_COLUMNS = [
  'Inscrição',
  'Nome',
  'Celular',
  'Curso',
  'Status do Pagamento',
  'Data Nascimento',
  'Municipio da residência',
  'Escola de origem do ensino fundamental',
  'Cidade da escola de origem do ensino fundamental'
];

const SUGGESTIONS = [
  'Avaliar a taxa de confirmação de pagamento por curso para priorizar atenção financeira em turmas com menor conversão.',
  'Comparar municípios e cidades de origem para identificar as regiões com maior demanda e potencial de captação.',
  'Mapear escolas de origem para entender quais redes de ensino mais encaminham candidatos ao processo seletivo.',
  'Analisar a distribuição por faixa etária para verificar se o perfil dos inscritos está alinhado ao público-alvo do programa.',
  'Revisar candidatos com dados incompletos, especialmente celular, município e escola, para reduzir perda de comunicação e conversão.',
  'Observar a evolução dos últimos candidatos por município para detectar tendências recentes de origem e comportamento de inscrição.'
];

const fileInput = document.getElementById('fileInput');
const vagasInput = document.getElementById('vagasInput');
const pdfBtn = document.getElementById('pdfBtn');
const statusEl = document.getElementById('status');
const dashboardEl = document.getElementById('dashboard');

let currentRows = [];

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? '#b91c1c' : '#334155';
}

function cleanText(value) {
  return String(value ?? 'Não informado').trim() || 'Não informado';
}

function safeLower(value) {
  return cleanText(value).toLowerCase();
}

function sortEntriesByValue(entries) {
  return [...entries].sort((a, b) => b[1] - a[1]);
}

function parseBirthDate(value) {
  const raw = cleanText(value);

  if (raw === 'Não informado' || !raw || raw === '0000-00-00') {
    return null;
  }

  const trimmed = raw.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(trimmed)) {
    const [day, month, year] = trimmed.split(/[/-]/).map((part) => Number(part));
    const normalizedYear = year < 100 ? 2000 + year : year;
    const date = new Date(normalizedYear, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const numericValue = Number(trimmed);
  if (Number.isFinite(numericValue)) {
    const date = new Date(Math.round((numericValue - 25569) * 86400000));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isValidBirthDate(value) {
  const date = parseBirthDate(value);
  if (!date) {
    return false;
  }

  const today = new Date();
  const minDate = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());

  if (date > today || date < minDate) {
    return false;
  }

  return true;
}

function countBy(rows, field) {
  const counter = {};

  rows.forEach((row) => {
    const key = cleanText(row[field]);
    counter[key] = (counter[key] || 0) + 1;
  });

  return counter;
}

function percent(part, total) {
  return total ? Number(((part / total) * 100).toFixed(1)) : 0;
}

function getVagas() {
  const vagas = Number.parseInt(vagasInput.value, 10);
  return Number.isFinite(vagas) && vagas > 0 ? vagas : 35;
}

function getCourseVacancies(courseName) {
  const normalized = cleanText(courseName).toLowerCase();

  if (normalized.includes('adm') || normalized.includes('admin')) {
    return 35;
  }

  if (normalized.includes('info') || normalized.includes('inform')) {
    return 35;
  }

  const fallback = Number.parseInt(vagasInput.value, 10);
  return Number.isFinite(fallback) && fallback > 0 ? fallback : 35;
}

function normalizeHeaderKeys(rows) {
  return rows.map((row) => {
    const normalized = {};
    Object.keys(row).forEach((key) => {
      normalized[String(key).trim()] = row[key];
    });
    return normalized;
  });
}

function validateColumns(columns) {
  const normalized = columns.map((column) => String(column).trim());
  const missing = REQUIRED_COLUMNS.filter((column) => !normalized.includes(column));
  return { missing };
}

function buildSummary(rows, recentCount) {
  const normalizedRows = normalizeHeaderKeys(rows);
  const total = normalizedRows.length;
  const vagas = getVagas();

  const paymentCounts = countBy(normalizedRows, 'Status do Pagamento');
  const courseCounts = countBy(normalizedRows, 'Curso');
  const cityCounts = countBy(normalizedRows, 'Municipio da residência');
  const schoolCounts = countBy(normalizedRows, 'Escola de origem do ensino fundamental');

  const confirmadas = normalizedRows.filter(
    (row) => safeLower(row['Status do Pagamento']) === 'confirmada'
  ).length;
  const pendentes = normalizedRows.filter(
    (row) => safeLower(row['Status do Pagamento']) === 'pendente'
  ).length;

  const conversionByCourse = sortEntriesByValue(Object.entries(courseCounts)).map(([curso, inscritos]) => {
    const courseRows = normalizedRows.filter((row) => cleanText(row['Curso']) === curso);
    const confirmados = courseRows.filter(
      (row) => safeLower(row['Status do Pagamento']) === 'confirmada'
    ).length;

    return {
      curso,
      inscritos,
      confirmados,
      taxa: `${percent(confirmados, inscritos)}%`
    };
  });

  const competitionByCourse = Object.entries(courseCounts).map(([curso, inscritos]) => {
    const courseVagas = getCourseVacancies(curso);
    const courseRows = normalizedRows.filter((row) => cleanText(row['Curso']) === curso);
    const confirmados = courseRows.filter(
      (row) => safeLower(row['Status do Pagamento']) === 'confirmada'
    ).length;

    return {
      curso,
      vagas: courseVagas,
      inscritos,
      confirmados,
      concorrencia: Number((confirmados / courseVagas).toFixed(2))
    };
  });

  const melhorCompeticao = [...competitionByCourse].sort((a, b) => b.concorrencia - a.concorrencia)[0] || null;
  const concorrenciaPorVaga = melhorCompeticao ? melhorCompeticao.concorrencia : 0;
  const nomeCursoMaiorConcorrencia = melhorCompeticao ? melhorCompeticao.curso : 'Nenhum curso';
  const recentRows = normalizedRows.slice(-recentCount);
  const recentCities = countBy(recentRows, 'Municipio da residência');
  const recentSchools = countBy(recentRows, 'Escola de origem do ensino fundamental');

  const recentOriginMap = {};
  recentRows.forEach((row) => {
    const cidade = cleanText(row['Municipio da residência']);
    const escola = cleanText(row['Escola de origem do ensino fundamental']);

    if (cidade === 'Não informado' && escola === 'Não informado') {
      return;
    }

    const key = `${cidade} | ${escola}`;
    recentOriginMap[key] = (recentOriginMap[key] || 0) + 1;
  });

  const recentOriginRows = Object.entries(recentOriginMap)
    .map(([origem, quantidade]) => {
      const [cidade, escola] = origem.split(' | ');
      return {
        Cidade: cidade,
        Escola: escola,
        Quantidade: quantidade
      };
    })
    .sort((a, b) => b.Quantidade - a.Quantidade);

  const birthIssues = normalizedRows
    .filter((row) => !isValidBirthDate(row['Data Nascimento']))
    .map((row) => ({
      Nome: cleanText(row['Nome']),
      'Data Nascimento': cleanText(row['Data Nascimento']),
      Observação: cleanText(row['Data Nascimento']) === 'Não informado' ? 'Data ausente' : 'Data fora do intervalo válido'
    }))
    .slice(0, 12);

  return {
    total,
    confirmadas,
    pendentes,
    vagas,
    concorrenciaPorVaga,
    taxaConfirmacao: `${percent(confirmadas, total)}%`,
    paymentCounts,
    courseCounts,
    cityCounts,
    schoolCounts,
    conversionByCourse,
    competitionByCourse,
    melhorCompeticao,
    nomeCursoMaiorConcorrencia,
    recentCities,
    recentSchools,
    recentOriginRows,
    birthIssues,
    recentCount
  };
}

function tableMarkup(rows, columns, noDataMessage = 'Nenhum dado para exibir.') {
  if (!rows.length) {
    return `<p class="empty-state">${noDataMessage}</p>`;
  }

  const headers = columns.map((column) => `<th>${column}</th>`).join('');
  const body = rows
    .map((row) => {
      const cells = columns.map((column) => `<td>${row[column] ?? '—'}</td>`).join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  return `
    <table>
      <thead>
        <tr>${headers}</tr>
      </thead>
      <tbody>
        ${body}
      </tbody>
    </table>
  `;
}

function updateMetrics(summary) {
  document.getElementById('totalCount').textContent = summary.total;
  document.getElementById('confirmadasCount').textContent = summary.confirmadas;
  document.getElementById('taxaConfirmacao').textContent = summary.taxaConfirmacao;
}

function destroyChart(chartKey) {
  if (!window.chartInstances) {
    window.chartInstances = {};
  }

  if (window.chartInstances[chartKey]) {
    window.chartInstances[chartKey].destroy();
    delete window.chartInstances[chartKey];
  }
}

function renderBarChart(chartKey, labels, values, color = '#127a53') {
  const canvas = document.getElementById(chartKey);
  if (!canvas || typeof Chart === 'undefined') {
    return;
  }

  destroyChart(chartKey);

  window.chartInstances[chartKey] = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Quantidade',
        data: values,
        backgroundColor: Array.from({ length: labels.length }, (_, index) => index % 2 === 0 ? color : '#f4c95d'),
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (context) => `${context.parsed.y}` } }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { precision: 0 }
        },
        x: {
          ticks: {
            autoSkip: false,
            maxRotation: 45,
            minRotation: 0
          }
        }
      }
    }
  });
}

function renderPieChart(chartKey, labels, values) {
  const canvas = document.getElementById(chartKey);
  if (!canvas || typeof Chart === 'undefined') {
    return;
  }

  destroyChart(chartKey);

  const total = values.reduce((sum, value) => sum + value, 0) || 1;
  const baseColors = ['#0f5e42', '#127a53', '#f4c95d', '#2a9d8f', '#5c6b73', '#a8dadc', '#d4a373', '#b5179e', '#ff6b6b', '#4cc9f0'];

  window.chartInstances[chartKey] = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: baseColors.slice(0, labels.length),
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 18
          }
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const value = context.parsed;
              const percent = ((value / total) * 100).toFixed(1);
              return `${context.label}: ${value} (${percent}%)`;
            }
          }
        }
      }
    }
  });
}

function renderExpandableBarChart(chartKey, toggleKey, items, labelKey, valueKey, limit = 8) {
  const button = document.getElementById(toggleKey);
  if (!button) {
    return;
  }

  let expanded = false;

  const draw = () => {
    const visibleItems = expanded ? items : items.slice(0, limit);
    const labels = visibleItems.map((item) => item[labelKey]);
    const values = visibleItems.map((item) => item[valueKey]);
    renderBarChart(chartKey, labels, values);

    button.textContent = expanded ? 'Mostrar menos' : 'Mostrar mais';
    button.hidden = items.length <= limit;
  };

  button.onclick = () => {
    expanded = !expanded;
    draw();
  };

  draw();
}

function renderAnalysis(summary) {
  updateMetrics(summary);

  const statusRows = sortEntriesByValue(Object.entries(summary.paymentCounts)).map(([status, quantidade]) => ({
    Status: status,
    Quantidade: quantidade
  }));

  const courseRows = sortEntriesByValue(Object.entries(summary.courseCounts)).map(([curso, quantidade]) => ({
    Curso: curso,
    Quantidade: quantidade
  }));

  const cityRows = sortEntriesByValue(Object.entries(summary.cityCounts)).map(([cidade, quantidade]) => ({
    Cidade: cidade,
    Quantidade: quantidade
  }));

  const schoolRows = sortEntriesByValue(Object.entries(summary.schoolCounts)).map(([escola, quantidade]) => ({
    Escola: escola,
    Quantidade: quantidade
  }));

  const conversionRows = summary.conversionByCourse.map((item) => ({
    Curso: item.curso,
    Inscritos: item.inscritos,
    Confirmados: item.confirmados,
    Taxa: item.taxa
  }));

  const recentCityRows = sortEntriesByValue(Object.entries(summary.recentCities)).map(([municipio, quantidade]) => ({
    Município: municipio,
    Quantidade: quantidade
  }));

  const recentOriginRows = summary.recentOriginRows.map((item) => ({
    Cidade: item.Cidade,
    Escola: item.Escola,
    Quantidade: item.Quantidade
  }));

  const birthIssueRows = summary.birthIssues.map((item) => ({
    Nome: item.Nome,
    'Data Nascimento': item['Data Nascimento'],
    Observação: item.Observação
  }));

  const competitionRows = summary.competitionByCourse.map((item) => ({
    Curso: item.curso,
    Vagas: item.vagas,
    Inscritos: item.inscritos,
    Confirmados: item.confirmados,
    Concorrência: `${item.concorrencia}x`
  }));

  renderPieChart('statusChart', statusRows.map((row) => row.Status), statusRows.map((row) => row.Quantidade));
  document.getElementById('courseTable').innerHTML = tableMarkup(
    competitionRows,
    ['Curso', 'Vagas', 'Inscritos', 'Confirmados', 'Concorrência']
  );
  renderExpandableBarChart('cityChart', 'cityToggle', cityRows, 'Cidade', 'Quantidade');
  renderExpandableBarChart('schoolChart', 'schoolToggle', schoolRows, 'Escola', 'Quantidade');
  document.getElementById('conversionTable').innerHTML = tableMarkup(conversionRows, ['Curso', 'Inscritos', 'Confirmados', 'Taxa']);
}

function drawTable(doc, columns, rows, startY, left = 14, right = 14) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const usableWidth = pageWidth - left - right;
  const columnWidths = columns.map((_, index) => {
    const totalColumns = columns.length;
    return usableWidth / totalColumns;
  });

  let currentY = startY;
  const headerHeight = 10;

  const drawCellText = (text, x, y, width, fillColor = null, textColor = [15, 23, 42], isHeader = false) => {
    const normalized = String(text ?? '').trim() || '—';
    const wrapped = doc.splitTextToSize(normalized, width - 4);
    const lines = Array.isArray(wrapped) ? wrapped : [wrapped];
    const lineHeight = isHeader ? 6 : 5.5;
    const cellHeight = Math.max(1, lines.length) * lineHeight + 4;

    if (fillColor) {
      doc.setFillColor(...fillColor);
      doc.rect(x, y, width, cellHeight, 'F');
    } else {
      doc.setDrawColor(223, 234, 228);
      doc.rect(x, y, width, cellHeight, 'S');
    }

    doc.setTextColor(...textColor);
    lines.forEach((line, index) => {
      doc.text(line, x + 2, y + 5 + index * lineHeight);
    });

    return cellHeight;
  };

  const drawHeader = () => {
    const headerWidth = usableWidth;
    doc.setFillColor(15, 94, 66);
    doc.rect(left, currentY, headerWidth, headerHeight, 'F');
    doc.setTextColor(255, 255, 255);
    columns.forEach((column, index) => {
      const x = left + columnWidths.slice(0, index).reduce((sum, width) => sum + width, 0);
      doc.text(String(column), x + 2, currentY + 7);
    });
    currentY += headerHeight;
  };

  drawHeader();

  rows.forEach((row, rowIndex) => {
    const contentLines = row.map((cell, columnIndex) => {
      const text = String(cell ?? '');
      const width = columnWidths[columnIndex] - 2;
      const wrapped = doc.splitTextToSize(text, width);
      return Array.isArray(wrapped) ? wrapped : [wrapped];
    });

    const rowHeight = Math.max(...contentLines.map((lines) => lines.length), 1) * 6 + 4;

    if (currentY + rowHeight > doc.internal.pageSize.getHeight() - 18) {
      doc.addPage();
      currentY = 18;
      drawHeader();
    }

    const rowColor = rowIndex % 2 === 0 ? [248, 250, 249] : [255, 255, 255];
    row.forEach((cell, columnIndex) => {
      const x = left + columnWidths.slice(0, columnIndex).reduce((sum, width) => sum + width, 0);
      const width = columnWidths[columnIndex];
      const textColor = [15, 23, 42];
      drawCellText(cell, x, currentY, width, rowColor, textColor, false);
    });

    currentY += rowHeight;
  });

  return currentY;
}

function exportPdf(summary) {
  const jspdfGlobal = window.jspdf;
  if (!jspdfGlobal || !jspdfGlobal.jsPDF) {
    setStatus('Não foi possível carregar a biblioteca de PDF no navegador.', true);
    return;
  }

  const { jsPDF } = jspdfGlobal;
  const doc = new jsPDF();
  const competitionRows = summary.competitionByCourse.map((item) => [
    item.curso,
    item.vagas,
    item.inscritos,
    `${item.concorrencia}x`
  ]);
  const recentOriginRows = summary.recentOriginRows.map((item) => [
    item.Cidade,
    item.Escola,
    item.Quantidade
  ]);
  const birthIssueRows = summary.birthIssues.slice(0, 10).map((item) => [
    item.Nome,
    item['Data Nascimento'],
    item.Observação
  ]);

  doc.setFillColor(15, 94, 66);
  doc.rect(0, 0, 210, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(17);
  doc.text('Relatório COPESE - Análise de inscrições', 14, 18);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);

  const metrics = [
    `Total de inscritos: ${summary.total}`,
    `Confirmados: ${summary.confirmadas}`,
    `Taxa de conversão: ${summary.taxaConfirmacao}`,
    `Maior concorrência por curso: ${summary.melhorCompeticao ? `${summary.melhorCompeticao.curso} (${summary.concorrenciaPorVaga.toFixed(2)}x)` : 'Sem dados'}`,
    `Últimos ${summary.recentCount} candidatos por município: ${Object.keys(summary.recentCities).length ? Object.keys(summary.recentCities).join(', ') : 'Sem dados'}`
  ];

  metrics.forEach((line, index) => {
    doc.text(line, 14, 40 + index * 8);
  });

  const statusRows = sortEntriesByValue(Object.entries(summary.paymentCounts)).map(([status, quantidade]) => [status, quantidade]);
  const courseRows = sortEntriesByValue(Object.entries(summary.courseCounts)).map(([curso, quantidade]) => [curso, quantidade]);
  const cityRows = sortEntriesByValue(Object.entries(summary.cityCounts)).map(([cidade, quantidade]) => [cidade, quantidade]);
  const schoolRows = sortEntriesByValue(Object.entries(summary.schoolCounts)).map(([escola, quantidade]) => [escola, quantidade]);
  const conversionRows = summary.conversionByCourse.map((item) => [item.curso, item.inscritos, item.confirmados, item.taxa]);

  let currentY = 90;
  currentY = drawTable(doc, ['Status do pagamento', 'Quantidade'], statusRows, currentY, 14, 14);
  currentY += 10;
  currentY = drawTable(doc, ['Curso', 'Quantidade'], courseRows, currentY, 14, 14);
  currentY += 10;
  currentY = drawTable(doc, ['Curso', 'Vagas', 'Inscritos', 'Concorrência'], competitionRows, currentY, 14, 14);
  currentY += 10;
  currentY = drawTable(doc, ['Cidade', 'Quantidade'], cityRows, currentY, 14, 14);
  currentY += 10;
  currentY = drawTable(doc, ['Escola', 'Quantidade'], schoolRows, currentY, 14, 14);
  currentY += 10;
  currentY = drawTable(doc, ['Curso', 'Inscritos', 'Confirmados', 'Taxa'], conversionRows, currentY, 14, 14);
  currentY += 10;
  currentY = drawTable(doc, ['Cidade', 'Escola', 'Últimos candidatos'], recentOriginRows, currentY, 14, 14);
  currentY += 10;
  drawTable(doc, ['Nome', 'Data Nascimento', 'Observação'], birthIssueRows, currentY, 14, 14);

  doc.save(`relatorio_copese_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.pdf`);
}

async function processSpreadsheet(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const sourceSheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json(sourceSheet, { defval: '', raw: false });

    if (!rows.length) {
      setStatus('A planilha está vazia.', true);
      return;
    }

    const keys = Object.keys(rows[0]).map((key) => String(key).trim());
    const { missing } = validateColumns(keys);

    if (missing.length) {
      setStatus(`Faltam colunas obrigatórias: ${missing.join(', ')}`, true);
      return;
    }

    currentRows = rows;
    const summary = buildSummary(rows, 10);
    renderAnalysis(summary);
    dashboardEl.hidden = false;
    pdfBtn.disabled = false;
    setStatus('Análise concluída automaticamente.');
  } catch (error) {
    setStatus(`Não foi possível processar a planilha: ${error.message}`, true);
  }
}

fileInput.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  setStatus(`Processando arquivo: ${file.name}...`);
  await processSpreadsheet(file);
});

vagasInput.addEventListener('input', () => {
  if (!currentRows.length) {
    return;
  }

  const summary = buildSummary(currentRows, 10);
  renderAnalysis(summary);
  setStatus('Concorrência por vaga atualizada.');
});

pdfBtn.addEventListener('click', () => {
  if (!currentRows.length) {
    setStatus('Envie uma planilha antes de exportar o PDF.', true);
    return;
  }

  const summary = buildSummary(currentRows, 10);
  exportPdf(summary);
  setStatus('PDF gerado com sucesso.');
});

