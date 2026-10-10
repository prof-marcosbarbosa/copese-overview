export type DashboardRow = Record<string, unknown>;

type CourseConversion = {
  curso: string;
  inscritos: number;
  confirmados: number;
  taxa: string;
};

type CourseCompetition = {
  curso: string;
  vagas: number;
  inscritos: number;
  confirmados: number;
  concorrencia: number;
};

type OriginRow = {
  Cidade: string;
  Escola: string;
  Quantidade: number;
};

export type DashboardSummary = {
  total: number;
  confirmadas: number;
  pendentes: number;
  vagas: number;
  taxaConfirmacao: string;
  paymentCounts: Record<string, number>;
  courseCounts: Record<string, number>;
  cityCounts: Record<string, number>;
  schoolCounts: Record<string, number>;
  conversionByCourse: CourseConversion[];
  competitionByCourse: CourseCompetition[];
  melhorCompeticao: CourseCompetition | null;
  concorrenciaPorVaga: number;
  recentCities: Record<string, number>;
  recentSchools: Record<string, number>;
  recentOriginRows: OriginRow[];
  recentCount: number;
};

export const REQUIRED_COLUMNS = [
  'Inscrição',
  'Nome',
  'Celular',
  'Curso',
  'Status do Pagamento',
  'Data Nascimento',
  'Municipio da residência',
  'Escola de origem do ensino fundamental',
  'Cidade da escola de origem do ensino fundamental',
];

export const CHART_COLORS = ['#267653', '#d5a83d', '#48859e', '#7a927f', '#896fa0', '#c67050', '#547584', '#a7b89c'];

export function cleanText(value: unknown): string {
  return String(value ?? 'Não informado').trim() || 'Não informado';
}

export function safeLower(value: unknown): string {
  return cleanText(value).toLowerCase();
}

export function countBy(rows: DashboardRow[], field: string): Record<string, number> {
  const counter = new Map<string, number>();
  rows.forEach((row) => {
    const key = cleanText(row[field]);
    counter.set(key, (counter.get(key) || 0) + 1);
  });
  return Object.fromEntries(counter);
}

export function sortEntriesByValue(entries: Array<[string, number]>): Array<[string, number]> {
  return [...entries].sort((a, b) => b[1] - a[1]);
}

function compareRegistrationIds(first: DashboardRow, second: DashboardRow): number {
  const firstId = cleanText(first['Inscrição']);
  const secondId = cleanText(second['Inscrição']);
  const firstNumber = Number(firstId);
  const secondNumber = Number(secondId);
  const firstIsNumeric = firstId !== 'Não informado' && Number.isFinite(firstNumber);
  const secondIsNumeric = secondId !== 'Não informado' && Number.isFinite(secondNumber);

  if (firstIsNumeric && secondIsNumeric) {
    return firstNumber - secondNumber;
  }
  if (firstIsNumeric !== secondIsNumeric) {
    return firstIsNumeric ? -1 : 1;
  }
  return firstId.localeCompare(secondId, 'pt-BR', { numeric: true, sensitivity: 'base' });
}

export function percent(part: number, total: number): number {
  return total ? Number(((part / total) * 100).toFixed(1)) : 0;
}

export function normalizeHeaderKeys(rows: DashboardRow[]): DashboardRow[] {
  return rows.map((row) => {
    const normalized: DashboardRow = {};
    Object.keys(row).forEach((key) => {
      normalized[String(key).trim()] = row[key];
    });
    return normalized;
  });
}

export function getCourseVacancies(courseName: string, defaultVacancy: number): number {
  const normalized = cleanText(courseName).toLowerCase();

  if (normalized.includes('adm') || normalized.includes('admin')) {
    return 35;
  }

  if (normalized.includes('info') || normalized.includes('inform')) {
    return 35;
  }

  return Number.isFinite(defaultVacancy) && defaultVacancy > 0 ? defaultVacancy : 35;
}

export function parseBirthDate(value: unknown): Date | null {
  const raw = cleanText(value);
  if (raw === 'Não informado' || !raw || raw === '0000-00-00') {
    return null;
  }

  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split('-').map(Number);
    return createValidatedDate(year, month, day);
  }

  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(trimmed)) {
    const [day, month, year] = trimmed.split(/[/-]/).map((part) => Number(part));
    const normalizedYear = year < 100 ? (year < 50 ? 2000 + year : 1900 + year) : year;
    return createValidatedDate(normalizedYear, month, day);
  }

  const numericValue = Number(trimmed);
  if (Number.isFinite(numericValue)) {
    const date = new Date(Math.round((numericValue - 25569) * 86400000));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function createValidatedDate(year: number, month: number, day: number): Date | null {
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return null;
    }
    const date = new Date(0);
    date.setHours(0, 0, 0, 0);
    date.setFullYear(year, month - 1, day);
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }
    return date;
  }

  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isValidBirthDate(value: unknown): boolean {
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

export function buildSummary(
  rows: DashboardRow[],
  recentCount = 20,
  defaultVacancy = 35,
): DashboardSummary {
  const normalizedRows = normalizeHeaderKeys(rows);
  const total = normalizedRows.length;

  const paymentCounts = countBy(normalizedRows, 'Status do Pagamento');
  const courseCounts = countBy(normalizedRows, 'Curso');
  const cityCounts = countBy(normalizedRows, 'Municipio da residência');
  const schoolCounts = countBy(normalizedRows, 'Escola de origem do ensino fundamental');

  const confirmadas = normalizedRows.filter(
    (row) => safeLower(row['Status do Pagamento']) === 'confirmada',
  ).length;

  const conversionByCourse = sortEntriesByValue(Object.entries(courseCounts)).map(([curso, inscritos]) => {
    const courseRows = normalizedRows.filter((row) => cleanText(row['Curso']) === curso);
    const confirmados = courseRows.filter(
      (row) => safeLower(row['Status do Pagamento']) === 'confirmada',
    ).length;

    return {
      curso,
      inscritos,
      confirmados,
      taxa: `${percent(confirmados, inscritos)}%`,
    };
  });

  const competitionByCourse = Object.entries(courseCounts).map(([curso, inscritos]) => {
    const courseVagas = getCourseVacancies(curso, defaultVacancy);
    const courseRows = normalizedRows.filter((row) => cleanText(row['Curso']) === curso);
    const confirmados = courseRows.filter(
      (row) => safeLower(row['Status do Pagamento']) === 'confirmada',
    ).length;

    return {
      curso,
      vagas: courseVagas,
      inscritos,
      confirmados,
      concorrencia: Number((inscritos / courseVagas).toFixed(2)),
    };
  });

  const melhorCompeticao = [...competitionByCourse].sort((a, b) => b.concorrencia - a.concorrencia)[0] || null;
  const recentRows = [...normalizedRows]
    .sort(compareRegistrationIds)
    .slice(-Math.max(0, recentCount));
  const recentCities = countBy(recentRows, 'Municipio da residência');
  const recentSchools = countBy(recentRows, 'Escola de origem do ensino fundamental');

  const recentOriginMap = new Map();
  recentRows.forEach((row) => {
    const cidade = cleanText(row['Municipio da residência']);
    const escola = cleanText(row['Escola de origem do ensino fundamental']);
    const key = JSON.stringify([cidade, escola]);
    recentOriginMap.set(key, (recentOriginMap.get(key) || 0) + 1);
  });

  const recentOriginRows = [...recentOriginMap.entries()]
    .map(([origem, quantidade]) => {
      const [cidade, escola] = JSON.parse(origem) as [string, string];
      return { Cidade: cidade, Escola: escola, Quantidade: quantidade };
    })
    .sort((a, b) => b.Quantidade - a.Quantidade);

  return {
    total,
    confirmadas,
    pendentes: normalizedRows.filter((row) => safeLower(row['Status do Pagamento']) === 'pendente').length,
    vagas: defaultVacancy,
    taxaConfirmacao: `${percent(confirmadas, total)}%`,
    paymentCounts,
    courseCounts,
    cityCounts,
    schoolCounts,
    conversionByCourse,
    competitionByCourse,
    melhorCompeticao,
    concorrenciaPorVaga: melhorCompeticao ? melhorCompeticao.concorrencia : 0,
    recentCities,
    recentSchools,
    recentOriginRows,
    recentCount: recentRows.length,
  };
}
