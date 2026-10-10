import { jsPDF } from 'jspdf';
import { buildSummary, percent, sortEntriesByValue } from './dashboard';

type DashboardSummary = ReturnType<typeof buildSummary>;
type PdfCell = string | number;
type PdfColor = readonly [number, number, number];

const COLORS = {
  forest: [23, 76, 58] as const,
  forestDark: [16, 59, 45] as const,
  green: [38, 118, 83] as const,
  gold: [213, 168, 61] as const,
  ink: [27, 48, 40] as const,
  muted: [104, 122, 112] as const,
  line: [228, 234, 229] as const,
  tint: [244, 248, 244] as const,
  white: [255, 255, 255] as const,
};
const CHART_COLORS = [
  [38, 118, 83],
  [213, 168, 61],
  [67, 126, 142],
  [113, 133, 120],
  [132, 105, 155],
  [198, 112, 80],
] as const;

const MARGIN = 14;
const FOOTER_Y = 284;

function formatNumber(value: number) {
  return value.toLocaleString('pt-BR');
}

function shorten(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function chartColor(label: string, index: number) {
  const normalized = label.toLocaleLowerCase('pt-BR');
  if (normalized === 'confirmada' || normalized === 'confirmado') {
    return COLORS.green;
  }
  if (normalized === 'pendente') {
    return COLORS.gold;
  }
  return CHART_COLORS[index % CHART_COLORS.length];
}

function drawCardFrame(doc: jsPDF, x: number, y: number, width: number, height: number) {
  doc.setFillColor(...COLORS.white);
  doc.setDrawColor(...COLORS.line);
  doc.roundedRect(x, y, width, height, 3, 3, 'FD');
}

function drawDonut(
  doc: jsPDF,
  centerX: number,
  centerY: number,
  radius: number,
  innerRadius: number,
  values: Array<{ label: string; value: number; color: readonly [number, number, number] }>,
) {
  const total = values.reduce((sum, item) => sum + item.value, 0);
  if (total <= 0) {
    return;
  }

  let startAngle = -90;
  values.forEach((item) => {
    const endAngle = startAngle + (item.value / total) * 360;
    const stepCount = Math.max(1, Math.ceil((endAngle - startAngle) / 4));
    doc.setFillColor(...item.color);
    for (let step = 0; step < stepCount; step += 1) {
      const angle1 = ((startAngle + ((endAngle - startAngle) * step) / stepCount) * Math.PI) / 180;
      const angle2 = ((startAngle + ((endAngle - startAngle) * (step + 1)) / stepCount) * Math.PI) / 180;
      doc.triangle(
        centerX,
        centerY,
        centerX + radius * Math.cos(angle1),
        centerY + radius * Math.sin(angle1),
        centerX + radius * Math.cos(angle2),
        centerY + radius * Math.sin(angle2),
        'F',
      );
    }
    startAngle = endAngle;
  });

  doc.setFillColor(...COLORS.white);
  doc.circle(centerX, centerY, innerRadius, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.forestDark);
  doc.text(formatNumber(total), centerX, centerY, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.7);
  doc.setTextColor(...COLORS.muted);
  doc.text('inscrições', centerX, centerY + 4, { align: 'center' });
}

function drawStatusCard(doc: jsPDF, x: number, y: number, width: number, height: number, summary: DashboardSummary) {
  drawCardFrame(doc, x, y, width, height);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.forestDark);
  doc.text('Status do pagamento', x + 4, y + 8);

  const orderedStatuses = sortEntriesByValue(Object.entries(summary.paymentCounts));
  const visibleStatuses = orderedStatuses.slice(0, 3);
  const extraCount = orderedStatuses.slice(3).reduce((sum, [, count]) => sum + count, 0);
  const segments: Array<{ label: string; value: number; color: PdfColor }> = visibleStatuses.map(([label, value], index) => ({
    label,
    value,
    color: chartColor(label, index),
  }));
  if (extraCount > 0) {
    segments.push({ label: 'Outros', value: extraCount, color: CHART_COLORS[4] });
  }

  const centerX = x + width / 2;
  drawDonut(doc, centerX, y + 34, 18, 10.5, segments);

  const legendItems = segments.slice(0, 4);
  const rowStartY = y + 56;
  legendItems.forEach((item, index) => {
    const rowY = rowStartY + index * 5;
    doc.setFillColor(...item.color);
    doc.circle(x + 5.5, rowY - 1.1, 1.1, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(...COLORS.ink);
    doc.text(shorten(item.label, 13), x + 8, rowY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.muted);
    doc.text(
      `${formatNumber(item.value)} · ${percent(item.value, summary.total).toLocaleString('pt-BR')}%`,
      x + width - 4,
      rowY,
      { align: 'right' },
    );
  });
}

function drawBarCard(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  title: string,
  rows: Array<{ label: string; value: number; rate: number }>,
  barColor: readonly [number, number, number],
) {
  drawCardFrame(doc, x, y, width, height);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.forestDark);
  doc.text(title, x + 4, y + 8);

  const items = rows.slice(0, 5);
  if (!items.length) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.text('Sem dados disponíveis', x + 4, y + 22);
    return;
  }

  const maxValue = Math.max(...items.map((item) => item.value), 1);
  const barWidth = width - 8;
  items.forEach((item, index) => {
    const rowY = y + 20 + index * 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(...COLORS.ink);
    doc.text(shorten(item.label, 15), x + 4, rowY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.muted);
    doc.text(
      `${formatNumber(item.value)} · ${item.rate.toLocaleString('pt-BR')}%`,
      x + width - 4,
      rowY,
      { align: 'right' },
    );
    doc.setFillColor(...COLORS.tint);
    doc.roundedRect(x + 4, rowY + 2, barWidth, 2, 1, 1, 'F');
    doc.setFillColor(...barColor);
    doc.roundedRect(x + 4, rowY + 2, Math.max(1, (barWidth * item.value) / maxValue), 2, 1, 1, 'F');
  });
}

function drawCompetitionCard(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  summary: DashboardSummary,
) {
  drawCardFrame(doc, x, y, width, height);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.forestDark);
  doc.text('Concorrência por curso', x + 4, y + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(...COLORS.muted);
  doc.text('Inscritos por vaga', x + 4, y + 13);

  const courses = [...summary.competitionByCourse]
    .sort((first, second) => second.concorrencia - first.concorrencia)
    .slice(0, 5);
  if (!courses.length) {
    doc.setFontSize(7);
    doc.text('Sem dados disponíveis', x + 4, y + 23);
    return;
  }

  const maxValue = Math.max(...courses.map((course) => course.concorrencia), 1);
  const barWidth = width - 8;
  courses.forEach((course, index) => {
    const rowY = y + 22 + index * 10;
    doc.setFontSize(6.2);
    doc.setTextColor(...COLORS.ink);
    doc.text(shorten(course.curso, 17), x + 4, rowY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.muted);
    doc.text(
      `${course.concorrencia.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}x`,
      x + width - 4,
      rowY,
      { align: 'right' },
    );
    doc.setFillColor(...COLORS.tint);
    doc.roundedRect(x + 4, rowY + 2, barWidth, 2, 1, 1, 'F');
    doc.setFillColor(...COLORS.forest);
    doc.roundedRect(x + 4, rowY + 2, Math.max(1, (barWidth * course.concorrencia) / maxValue), 2, 1, 1, 'F');
  });
}

function drawOverviewCharts(doc: jsPDF, summary: DashboardSummary, y: number) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const gap = 5;
  const width = (pageWidth - MARGIN * 2 - gap) / 2;
  const height = 75;
  const x1 = MARGIN;
  const x2 = x1 + width + gap;
  const leadingCities = sortEntriesByValue(Object.entries(summary.cityCounts)).map(([city, count]) => ({
    label: city,
    value: count,
    rate: percent(count, summary.total),
  }));
  const leadingSchools = sortEntriesByValue(Object.entries(summary.schoolCounts)).map(([school, count]) => ({
    label: school,
    value: count,
    rate: percent(count, summary.total),
  }));
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.forestDark);
  doc.text('Resumo visual', MARGIN, y);
  const cardsY = y + 5;
  drawStatusCard(doc, x1, cardsY, width, height, summary);
  drawBarCard(doc, x2, cardsY, width, height, 'Principais cidades', leadingCities, COLORS.green);
  const secondRowY = cardsY + height + gap;
  drawBarCard(doc, x1, secondRowY, width, height, 'Principais escolas', leadingSchools, COLORS.gold);
  drawCompetitionCard(doc, x2, secondRowY, width, height, summary);
  return secondRowY + height + 7;
}

function continuationPage(doc: jsPDF) {
  doc.addPage();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.green);
  doc.text('COPESE  /  RELATÓRIO ANALÍTICO DE INSCRIÇÕES', MARGIN, 13);
  doc.setDrawColor(...COLORS.line);
  doc.line(MARGIN, 17, doc.internal.pageSize.getWidth() - MARGIN, 17);
  return 24;
}

function drawTable(
  doc: jsPDF,
  title: string,
  columns: string[],
  rows: PdfCell[][],
  startY: number,
  weights: number[] = columns.map(() => 1),
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const tableWidth = pageWidth - MARGIN * 2;
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const widths = weights.map((weight) => (tableWidth * weight) / totalWeight);
  let y = startY;

  const drawSectionTitle = (continuation = false) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.forestDark);
    doc.text(continuation ? `${title} (continuação)` : title, MARGIN, y);
    y += 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    const headerLines = columns.map((column, index) => doc.splitTextToSize(column, widths[index] - 6));
    const headerHeight = Math.max(9, ...headerLines.map((lines) => lines.length * 3.2 + 4));
    doc.setFillColor(...COLORS.tint);
    doc.rect(MARGIN, y, tableWidth, headerHeight, 'F');
    doc.setTextColor(...COLORS.muted);

    let x = MARGIN;
    headerLines.forEach((lines, index) => {
      doc.text(lines, x + 3, y + 4);
      x += widths[index];
    });
    y += headerHeight;
  };

  if (y + 20 > FOOTER_Y) {
    y = continuationPage(doc);
    drawSectionTitle(true);
  } else {
    drawSectionTitle();
  }

  rows.forEach((row, rowIndex) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const cellLines = columns.map((_, index) =>
      doc.splitTextToSize(String(row[index] ?? '—'), widths[index] - 6),
    );
    const rowHeight = Math.max(8, ...cellLines.map((lines) => lines.length * 3.8 + 4));

    if (y + rowHeight > FOOTER_Y) {
      y = continuationPage(doc);
      drawSectionTitle(true);
    }

    if (rowIndex % 2 === 0) {
      doc.setFillColor(250, 252, 250);
      doc.rect(MARGIN, y, tableWidth, rowHeight, 'F');
    }
    doc.setTextColor(...COLORS.ink);
    let x = MARGIN;
    cellLines.forEach((lines, index) => {
      doc.text(lines, x + 3, y + 4);
      x += widths[index];
    });
    doc.setDrawColor(...COLORS.line);
    doc.line(MARGIN, y + rowHeight, MARGIN + tableWidth, y + rowHeight);
    y += rowHeight;
  });

  return y + 9;
}

export function createPdfReport(summary: DashboardSummary, generatedAt = new Date()) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const dateLabel = generatedAt.toLocaleString('pt-BR', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  doc.setFillColor(...COLORS.forestDark);
  doc.rect(0, 0, pageWidth, 57, 'F');
  doc.setFillColor(...COLORS.gold);
  doc.roundedRect(MARGIN, 14, 1.5, 29, 0.7, 0.7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(197, 222, 204);
  doc.text('IFSULDEMINAS  /  COPESE', MARGIN + 7, 19);
  doc.setFontSize(19);
  doc.setTextColor(...COLORS.white);
  doc.text('Relatório de inscrições', MARGIN + 7, 30);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(222, 236, 225);
  doc.text(`Análise institucional · Gerado em ${dateLabel}`, MARGIN + 7, 38);

  const metrics: Array<{
    label: string;
    value: string;
    detail: string;
    color: PdfColor;
    text: PdfColor;
  }> = [
    {
      label: 'INSCRIÇÕES',
      value: formatNumber(summary.total),
      detail: 'total na base',
      color: COLORS.forest,
      text: COLORS.white,
    },
    {
      label: 'CONFIRMADOS',
      value: formatNumber(summary.confirmadas),
      detail: `${percent(summary.confirmadas, summary.total).toLocaleString('pt-BR')}% do total`,
      color: COLORS.tint,
      text: COLORS.forestDark,
    },
    {
      label: 'MAIOR CONCORRÊNCIA',
      value: summary.melhorCompeticao
        ? `${summary.melhorCompeticao.concorrencia.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}x`
        : '—',
      detail: summary.melhorCompeticao ? shorten(summary.melhorCompeticao.curso, 23) : 'Sem dados por curso',
      color: COLORS.forest,
      text: COLORS.white,
    },
    {
      label: 'TAXA DE CONFIRMAÇÃO',
      value: summary.taxaConfirmacao,
      detail: `${formatNumber(summary.confirmadas)} de ${formatNumber(summary.total)} inscrições`,
      color: [251, 241, 217],
      text: COLORS.forestDark,
    },
  ];

  const gap = 3;
  const metricWidth = (pageWidth - MARGIN * 2 - gap * (metrics.length - 1)) / metrics.length;
  metrics.forEach((metric, index) => {
    const x = MARGIN + index * (metricWidth + gap);
    doc.setFillColor(...metric.color);
    doc.roundedRect(x, 65, metricWidth, 34, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.6);
    doc.setTextColor(...metric.text);
    doc.text(metric.label, x + 4, 73);
    doc.setFontSize(14);
    doc.text(metric.value, x + 4, 84);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text(metric.detail, x + 4, 93);
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  doc.text(
    'Dados processados localmente. Concorrência = inscritos ÷ vagas; confirmação = confirmados ÷ inscritos.',
    MARGIN,
    108,
  );

  let y = drawOverviewCharts(doc, summary, 116);
  const paymentRows = sortEntriesByValue(Object.entries(summary.paymentCounts)).map(([status, count]) => [
    status,
    formatNumber(count),
    `${percent(count, summary.total).toLocaleString('pt-BR')}%`,
  ]);
  const courseRows = sortEntriesByValue(Object.entries(summary.courseCounts)).map(([course, count]) => [
    course,
    formatNumber(count),
    `${percent(count, summary.total).toLocaleString('pt-BR')}%`,
  ]);
  const conversionRows = summary.conversionByCourse.map((item) => [
    item.curso,
    formatNumber(item.inscritos),
    formatNumber(item.confirmados),
    `${percent(item.confirmados, item.inscritos).toLocaleString('pt-BR')}%`,
  ]);
  const competitionRows = [...summary.competitionByCourse]
    .sort((first, second) => second.concorrencia - first.concorrencia)
    .map((item) => [
    item.curso,
    formatNumber(item.vagas),
    formatNumber(item.inscritos),
    `${percent(item.inscritos, summary.total).toLocaleString('pt-BR')}%`,
    formatNumber(item.confirmados),
    `${percent(item.confirmados, item.inscritos).toLocaleString('pt-BR')}%`,
    `${item.concorrencia.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}x`,
  ]);
  const cityRows = sortEntriesByValue(Object.entries(summary.cityCounts)).map(([city, count]) => [
    city,
    formatNumber(count),
    `${percent(count, summary.total).toLocaleString('pt-BR')}%`,
  ]);
  const schoolRows = sortEntriesByValue(Object.entries(summary.schoolCounts)).map(([school, count]) => [
    school,
    formatNumber(count),
    `${percent(count, summary.total).toLocaleString('pt-BR')}%`,
  ]);
  const recentOriginRows = summary.recentOriginRows.map((item) => [
    item.Cidade,
    item.Escola,
    formatNumber(item.Quantidade),
    `${percent(item.Quantidade, summary.recentCount).toLocaleString('pt-BR')}%`,
  ]);
  y = drawTable(
    doc,
    'Vagas e concorrência por curso',
    ['Curso', 'Vagas', 'Inscritos', '% do total', 'Confirmados', 'Taxa', 'Concorrência'],
    competitionRows,
    y,
    [2.5, 0.8, 1, 1, 1, 0.9, 1.1],
  );
  y = drawTable(doc, 'Status do pagamento', ['Status', 'Inscrições', '% do total'], paymentRows, y, [2, 1, 1]);
  y = drawTable(doc, 'Inscrições por curso', ['Curso', 'Inscrições', '% do total'], courseRows, y, [3, 1, 1]);
  y = drawTable(
    doc,
    'Confirmação por curso',
    ['Curso', 'Inscritos', 'Confirmados', 'Taxa de confirmação'],
    conversionRows,
    y,
    [3, 1.1, 1.2, 1.7],
  );
  y = drawTable(doc, 'Inscrições por cidade', ['Cidade', 'Inscrições', '% do total'], cityRows, y, [3, 1, 1]);
  y = drawTable(doc, 'Inscrições por escola', ['Escola', 'Inscrições', '% do total'], schoolRows, y, [3, 1, 1]);
  y = drawTable(
    doc,
    `Origem dos últimos ${summary.recentCount} registros`,
    ['Cidade', 'Escola', 'Inscrições', '% do recorte'],
    recentOriginRows,
    y,
    [1.5, 3, 1, 1.1],
  );

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(...COLORS.line);
    doc.line(MARGIN, FOOTER_Y, pageWidth - MARGIN, FOOTER_Y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.text('COPESE · IFSULDEMINAS · Processamento local', MARGIN, FOOTER_Y + 5);
    doc.text(`${page} / ${pageCount}`, pageWidth - MARGIN, FOOTER_Y + 5, { align: 'right' });
  }

  return doc;
}
