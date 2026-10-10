import { lazy, Suspense, useMemo, useState } from 'react';
import {
  buildSummary,
  CHART_COLORS,
  percent,
  REQUIRED_COLUMNS,
  sortEntriesByValue,
} from '../lib/dashboard';
import StatCard from '../components/StatCard';
import UploadPanel from '../components/UploadPanel';
import DataTable from '../components/DataTable';
import { Button } from '../components/ui/button';
import { Card, CardDescription, CardTitle } from '../components/ui/card';
import { Activity, BarChart3, Download, GraduationCap, MapPinned } from 'lucide-react';

const BarChartCard = lazy(() => import('../components/BarChartCard'));
const CityBubbleMap = lazy(() => import('../components/CityBubbleMap'));
const StatusDonutChart = lazy(() => import('../components/StatusDonutChart'));

type CourseRow = {
  Curso: string;
  Inscritos: number;
  Confirmados: number;
  Taxa: string;
};

type CompetitionRow = {
  Curso: string;
  Vagas: number;
  Inscritos: number;
  '% dos inscritos': string;
  Confirmados: number;
  'Taxa confirmação': string;
  Concorrência: string;
};

type RecentOriginRow = {
  Cidade: string;
  Escola: string;
  Inscrições: number;
  Participação: string;
};

export default function DashboardPage() {
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [vagas, setVagas] = useState(35);
  const [status, setStatus] = useState('Aguarde o upload da planilha para gerar a análise automaticamente.');
  const [error, setError] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const summary = useMemo(() => {
    if (!rows.length) {
      return null;
    }
    return buildSummary(rows, 20, vagas);
  }, [rows, vagas]);

  const paymentRows = useMemo(() => {
    if (!summary) {
      return [];
    }
    return sortEntriesByValue(Object.entries(summary.paymentCounts)).map(([key, value]) => ({
      Status: key,
      Quantidade: value,
    }));
  }, [summary]);

  const conversionRows = useMemo<CourseRow[]>(() => {
    if (!summary) {
      return [];
    }
    return summary.conversionByCourse.map((item) => ({
      Curso: item.curso,
      Inscritos: item.inscritos,
      Confirmados: item.confirmados,
      Taxa: item.taxa,
    }));
  }, [summary]);

  const competitionRows = useMemo<CompetitionRow[]>(() => {
    if (!summary) {
      return [];
    }
    return [...summary.competitionByCourse]
      .sort((first, second) => second.concorrencia - first.concorrencia)
      .map((item) => ({
        Curso: item.curso,
        Vagas: item.vagas,
        Inscritos: item.inscritos,
        '% dos inscritos': `${percent(item.inscritos, summary.total).toLocaleString('pt-BR')}%`,
        Confirmados: item.confirmados,
        'Taxa confirmação': `${percent(item.confirmados, item.inscritos).toLocaleString('pt-BR')}%`,
        Concorrência: `${item.concorrencia.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}x`,
      }));
  }, [summary]);

  const cityRows = useMemo(() => {
    if (!summary) {
      return [];
    }
    return sortEntriesByValue(Object.entries(summary.cityCounts)).map(([cidade, quantidade]) => ({
      Cidade: cidade,
      Quantidade: quantidade,
    }));
  }, [summary]);

  const schoolRows = useMemo(() => {
    if (!summary) {
      return [];
    }
    return sortEntriesByValue(Object.entries(summary.schoolCounts)).map(([escola, quantidade]) => ({
      Escola: escola,
      Quantidade: quantidade,
    }));
  }, [summary]);

  const statusData = useMemo(
    () => paymentRows.map((row) => ({ name: row.Status, value: row.Quantidade })),
    [paymentRows],
  );

  const topCities = useMemo(() => {
    if (!summary) {
      return [];
    }
    return cityRows.slice(0, 8).map((row) => ({
      name: row.Cidade,
      quantidade: row.Quantidade,
      percent: percent(row.Quantidade, summary.total),
    }));
  }, [cityRows, summary]);

  const topSchools = useMemo(() => {
    if (!summary) {
      return [];
    }
    return schoolRows.slice(0, 8).map((row) => ({
      name: row.Escola,
      quantidade: row.Quantidade,
      percent: percent(row.Quantidade, summary.total),
    }));
  }, [schoolRows, summary]);

  const recentCityData = useMemo(() => {
    if (!summary) {
      return [];
    }
    return sortEntriesByValue(Object.entries(summary.recentCities)).slice(0, 8).map(([name, quantidade]) => ({
      name,
      quantidade,
      percent: percent(quantidade, summary.recentCount),
    }));
  }, [summary]);

  const recentOriginRows = useMemo<RecentOriginRow[]>(() => {
    if (!summary) {
      return [];
    }
    return summary.recentOriginRows.map((item) => ({
      Cidade: item.Cidade,
      Escola: item.Escola,
      Inscrições: item.Quantidade,
      Participação: `${percent(item.Quantidade, summary.recentCount).toLocaleString('pt-BR')}%`,
    }));
  }, [summary]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setStatus(`Processando arquivo: ${file.name}...`);
      setError(false);

      const XLSX = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const sourceSheet = workbook.Sheets[firstSheetName];
      const parsedRows = XLSX.utils.sheet_to_json<Record<string, string>>(sourceSheet, { defval: '', raw: false });

      if (!parsedRows.length) {
        setStatus('A planilha está vazia.');
        setError(true);
        return;
      }

      const keys = Object.keys(parsedRows[0]).map((key) => String(key).trim());
      const missing = REQUIRED_COLUMNS.filter((column) => !keys.includes(column));
      if (missing.length) {
        setStatus(`Faltam colunas obrigatórias: ${missing.join(', ')}`);
        setError(true);
        return;
      }

      setRows(parsedRows);
      setFileName(file.name);
      setStatus('Análise concluída automaticamente.');
    } catch (error) {
      setStatus(`Não foi possível processar a planilha: ${(error as Error).message}`);
      setError(true);
    }
  };

  const handleVacancyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = Number.parseInt(event.target.value, 10);
    const normalized = Number.isFinite(nextValue) && nextValue > 0 ? nextValue : 35;
    setVagas(normalized);
    if (rows.length) {
      setStatus('Concorrência por vaga atualizada.');
    }
  };

  const handleExportPdf = async () => {
    if (!rows.length || !summary) {
      setStatus('Envie uma planilha antes de exportar o PDF.');
      setError(true);
      return;
    }

    setIsExporting(true);
    setError(false);
    setStatus('Preparando o relatório em PDF...');
    try {
      const { createPdfReport } = await import('../lib/pdfReport');
      const document = createPdfReport(summary);
      document.save(`relatorio_copese_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.pdf`);
      setStatus('PDF gerado com sucesso.');
    } catch (exportError) {
      setStatus(`Não foi possível gerar o PDF: ${(exportError as Error).message}`);
      setError(true);
    } finally {
      setIsExporting(false);
    }
  };

  const donutColors = paymentRows.map((row, index) => {
    if (row.Status.toLowerCase() === 'confirmada') {
      return '#127a53';
    }
    if (row.Status.toLowerCase() === 'pendente') {
      return '#f4c95d';
    }
    return CHART_COLORS[index % CHART_COLORS.length];
  });

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-wrap">
          <div className="brand-mark" aria-hidden="true">
            <GraduationCap />
          </div>
          <div>
            <p className="eyebrow">IFSULDEMINAS · CAMPUS ITAJUBÁ</p>
            <p className="brand-name">COPESE · Inteligência de inscrições</p>
          </div>
        </div>
        <nav className="primary-nav" aria-label="Navegação do dashboard">
          <a href="#overview"><Activity className="nav-icon" aria-hidden="true" />Visão geral</a>
          <a href="#courses"><GraduationCap className="nav-icon" aria-hidden="true" />Cursos</a>
          <a href="#recent-origins"><MapPinned className="nav-icon" aria-hidden="true" />Origens</a>
        </nav>
        <div className="header-actions">
          <Button
            className="primary-btn"
            type="button"
            disabled={!rows.length || isExporting}
            aria-busy={isExporting}
            onClick={handleExportPdf}
          >
            <Download aria-hidden="true" />
            {isExporting ? 'Gerando PDF...' : 'Exportar relatório'}
          </Button>
        </div>
      </header>

      <main className="content">
        <UploadPanel
          fileName={fileName}
          vagas={vagas}
          status={status}
          error={error}
          onFileChange={handleFileChange}
          onVacancyChange={handleVacancyChange}
        />

        {summary && (
          <section className="dashboard" id="overview">
            <div className="dashboard-heading">
              <div>
                <p className="section-tag">Painel analítico</p>
                <h1>Análise de inscrições</h1>
              </div>
              <div className="data-freshness">
                <span className="status-dot" aria-hidden="true" />
                Dados processados localmente
              </div>
            </div>

            <div className="metrics-grid">
              <StatCard
                label="Total de inscrições"
                value={summary.total.toLocaleString('pt-BR')}
                detail="Base analisada"
                icon={BarChart3}
                accent
              />
              <StatCard
                label="Pagamentos confirmados"
                value={summary.confirmadas.toLocaleString('pt-BR')}
                detail={`${percent(summary.confirmadas, summary.total).toLocaleString('pt-BR')}% das inscrições`}
                icon={Activity}
              />
              <StatCard
                label="Taxa de confirmação"
                value={summary.taxaConfirmacao}
                detail={`${summary.confirmadas.toLocaleString('pt-BR')} de ${summary.total.toLocaleString('pt-BR')} inscrições`}
                icon={GraduationCap}
              />
            </div>

            <div className="sections-grid">
              <Card id="payments" className="panel-surface">
                <CardTitle>Status do pagamento</CardTitle>
                <CardDescription className="panel-caption">Quantidade de inscrições e proporção no total</CardDescription>
                <Suspense fallback={<p className="chart-loading">Carregando gráfico...</p>}>
                  <StatusDonutChart data={statusData} colors={donutColors} />
                </Suspense>
              </Card>

              <Card id="courses" className="panel-surface">
                <CardTitle>Taxa de confirmação por curso</CardTitle>
                <CardDescription className="panel-caption">Inscritos, confirmações e conversão em cada curso</CardDescription>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Curso</th>
                        <th>Inscritos</th>
                        <th>Confirmados</th>
                        <th>Taxa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {conversionRows.map((row) => (
                        <tr key={row.Curso}>
                          <td>{row.Curso}</td>
                          <td>{row.Inscritos.toLocaleString('pt-BR')}</td>
                          <td>{row.Confirmados.toLocaleString('pt-BR')}</td>
                          <td><span className="rate-pill">{row.Taxa}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card className="panel-surface wide-panel">
                <CardTitle>Candidatos e concorrência por curso</CardTitle>
                <CardDescription className="panel-caption">Concorrência = inscrições confirmadas ÷ vagas; inscritos e participação também são exibidos para contexto</CardDescription>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Curso</th>
                        <th>Vagas</th>
                        <th>Inscritos</th>
                        <th>% inscritos</th>
                        <th>Confirmados</th>
                        <th>Taxa confirmação</th>
                        <th>Concorrência</th>
                      </tr>
                    </thead>
                    <tbody>
                      {competitionRows.map((row) => (
                        <tr key={row.Curso}>
                          <td>{row.Curso}</td>
                          <td>{row.Vagas.toLocaleString('pt-BR')}</td>
                          <td>{row.Inscritos.toLocaleString('pt-BR')}</td>
                          <td>{row['% dos inscritos']}</td>
                          <td>{row.Confirmados.toLocaleString('pt-BR')}</td>
                          <td><span className="rate-pill">{row['Taxa confirmação']}</span></td>
                          <td>{row.Concorrência}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <div className="origins-heading" id="origins">
                <div>
                  <p className="section-tag">Perfil de origem</p>
                  <h2>De onde vêm os candidatos</h2>
                </div>
              </div>
              <Suspense fallback={<p className="chart-loading">Carregando gráfico...</p>}>
                <CityBubbleMap
                  id="cities-map"
                  cityCounts={summary.cityCounts}
                  total={summary.total}
                />
              </Suspense>
              <Suspense fallback={<p className="chart-loading">Carregando gráfico...</p>}>
                <BarChartCard id="cities" title="Cidades com mais candidatos" data={topCities} color="#267653" />
              </Suspense>
              <Suspense fallback={<p className="chart-loading">Carregando gráfico...</p>}>
                <BarChartCard id="schools" title="Escolas com mais candidatos" data={topSchools} color="#d5a83d" />
              </Suspense>
              <Suspense fallback={<p className="chart-loading">Carregando gráfico...</p>}>
                <BarChartCard
                  id="recent-origins"
                  title={`Municípios nos ${summary.recentCount} registros finais`}
                  description="Distribuição da cidade de residência entre as linhas finais da planilha"
                  data={recentCityData}
                  color="#48859e"
                  className="wide-panel"
                />
              </Suspense>
              <DataTable
                id="recent-origin-details"
                title={`Escola e cidade de origem — ${summary.recentCount} registros finais`}
                description="Contagem e participação nas linhas finais da planilha; registros sem origem informada também são contabilizados."
                columns={['Cidade', 'Escola', 'Inscrições', 'Participação']}
                rows={recentOriginRows}
                className="wide-panel"
              />
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
