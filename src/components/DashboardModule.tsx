import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { DollarSign, CheckCircle, XCircle, TrendingDown, TrendingUp, RefreshCw, FileText, Wrench, Users, Package, AlertTriangle, Clock, Calendar } from 'lucide-react';
import { StatCard, useCountUp, EmptyState } from './UIComponents';

// ─────────────────────────────────────────
// DASHBOARD MODULE — KPIs com filtro de período + cards clicáveis + trends
// ─────────────────────────────────────────

type Periodo = 'hoje' | 'semana' | 'mes' | 'mes_passado' | 'custom';

const PERIODO_LABELS: Record<Periodo, string> = {
  hoje: 'Hoje',
  semana: 'Esta semana',
  mes: 'Este mês',
  mes_passado: 'Mês passado',
  custom: 'Personalizado',
};

function calcularPeriodo(p: Periodo, customIni?: string, customFim?: string): { dtIni: string; dtFim: string } {
  const hoje = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const ini = new Date(hoje); ini.setHours(0,0,0,0);
  const fim = new Date(hoje); fim.setHours(23,59,59,999);

  if (p === 'hoje') {
    return { dtIni: fmt(ini), dtFim: fmt(fim) };
  }
  if (p === 'semana') {
    const diff = ini.getDay(); // 0 = domingo
    ini.setDate(ini.getDate() - diff);
    return { dtIni: fmt(ini), dtFim: fmt(fim) };
  }
  if (p === 'mes') {
    ini.setDate(1);
    const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    return { dtIni: fmt(ini), dtFim: fmt(ultimoDia) };
  }
  if (p === 'mes_passado') {
    const ini2 = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    const fim2 = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
    return { dtIni: fmt(ini2), dtFim: fmt(fim2) };
  }
  return { dtIni: customIni || fmt(ini), dtFim: customFim || fmt(fim) };
}

// Componente de StatCard com Trend explícito (extensão do StatCard padrão)
const KPICard = ({ label, value, icon: Icon, color, trend, sub, onClick }: any) => {
  const colorMap: Record<string, string> = {
    blue: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
    green: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20',
    red: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
    orange: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20',
    purple: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20',
  };
  const trendColor = trend > 0 ? 'text-emerald-600' : trend < 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-gray-500';
  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : null;
  const isNumeric = typeof value === 'number';
  const animated = useCountUp(isNumeric ? value : 0);

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-gray-800 dark:bg-gray-800 p-5 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 dark:border-gray-700 ${onClick ? 'cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all' : ''}`}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider">{label}</p>
        {Icon && <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorMap[color] || colorMap.blue}`}>
          <Icon className="w-4 h-4" />
        </div>}
      </div>
      <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 dark:text-white">{isNumeric ? animated : value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
      {trend !== undefined && trend !== null && (
        <div className={`flex items-center gap-1 mt-2 ${trendColor}`}>
          {TrendIcon && <TrendIcon className="w-3 h-3" />}
          <span className="text-xs font-bold">{trend > 0 ? '+' : ''}{trend}% vs período anterior</span>
        </div>
      )}
    </div>
  );
};

interface DashboardTabProps {
  isFiscal: boolean;
  onNavigate?: (tab: string, opts?: { preset?: string }) => void;
}

export const DashboardTab = ({ isFiscal, onNavigate }: DashboardTabProps) => {
  const [data, setData] = useState<any[]>([]);
  const [finChart, setFinChart] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState({
    total: 0, count: 0, avg: 0, nfeCount: 0, nfceCount: 0, canceladoCount: 0,
    trendTotal: 0, trendCount: 0
  });
  const [finSummary, setFinSummary] = useState({ total_receber: 0, total_pagar: 0, trendReceber: 0, trendPagar: 0 });
  const [donutData, setDonutData] = useState<{segmentos: any[]; total_qtd: number}>({ segmentos: [], total_qtd: 0 });
  const [kpis, setKpis] = useState<any>({
    orcamentos_pendentes: { qtd: 0, valor: 0 },
    taxa_conversao: { percentual: 0, aprovados: 0, total: 0, trend: 0 },
    os_andamento: { qtd: 0 },
    os_concluidas_periodo: { qtd: 0, trend: 0 },
    ticket_medio: { orcamento: 0, os: 0, medio: 0, trend: 0 },
    top_clientes: [], top_produtos: [],
    contas_receber: { vencendo_7d: { qtd: 0, valor: 0 }, vencidas: { qtd: 0, valor: 0 } },
    contas_pagar:   { vencendo_7d: { qtd: 0, valor: 0 }, vencidas: { qtd: 0, valor: 0 } },
    vendas_periodo: { total: 0, qtd: 0, trend: 0 },
  });

  // Filtro de período
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [customIni, setCustomIni] = useState('');
  const [customFim, setCustomFim] = useState('');

  const { dtIni, dtFim } = calcularPeriodo(periodo, customIni, customFim);

  const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const goTo = (tab: string, opts?: { preset?: string }) => onNavigate && onNavigate(tab, opts);

  const fetchAll = async () => {
    try {
      // Donut chart de status (sempre mês atual)
      try {
        const donutRes = await fetch(`./api.php?action=dashboard_status_donut&dt_inicio=${dtIni}&dt_fim=${dtFim}`);
        const donutJson = await donutRes.json();
        if (donutJson && donutJson.success !== false) setDonutData(donutJson);
      } catch (e) { console.error('donut:', e); }

      // KPIs (com filtro de período)
      const kpiRes = await fetch(`./api.php?action=dashboard_kpis&dt_inicio=${dtIni}&dt_fim=${dtFim}`);
      const kpiJson = await kpiRes.json();
      if (kpiJson && kpiJson.success !== false) setKpis(kpiJson);

      // Dashboard vendas (sempre últimos 12 meses)
      const res = await fetch('./api.php?action=dashboard_vendas');
      const json = await res.json();
      if (Array.isArray(json)) {
        const formatted = json.map(item => ({
          ...item,
          periodoStr: String(item.periodo).substring(5, 7) + '/' + String(item.periodo).substring(0, 4),
        }));
        setData(formatted);
        if (formatted.length > 0) {
          const last = formatted[formatted.length - 1];
          const prev = formatted[formatted.length - 2];
          const calcTrend = (cur: number, old: number) => !old ? 0 : ((cur - old) / old) * 100;
          setSummary({
            total: last.total || 0, count: last.count || 0,
            avg: (last.total / (last.count || 1)),
            nfeCount: last.nfe_count || 0, nfceCount: last.nfce_count || 0,
            canceladoCount: last.cancelado_count || 0,
            trendTotal: prev ? calcTrend(last.total, prev.total) : 0,
            trendCount: prev ? calcTrend(last.count, prev.count) : 0,
          });
        }
      }

      // Financeiro (sempre snapshot)
      const finRes = await fetch('./api.php?action=dashboard_financeiro');
      const finJson = await finRes.json();
      if (finJson) {
        const tRec = finJson.total_receber || 0;
        const tPag = finJson.total_pagar || 0;
        const aRec = finJson.receber_ant || 0;
        const aPag = finJson.pagar_ant || 0;
        setFinSummary({
          total_receber: tRec, total_pagar: tPag,
          trendReceber: aRec > 0 ? ((tRec - aRec) / aRec) * 100 : (tRec > 0 ? 100 : 0),
          trendPagar:   aPag > 0 ? ((tPag - aPag) / aPag) * 100 : (tPag > 0 ? 100 : 0),
        });
        if (Array.isArray(finJson.chart)) {
          setFinChart(finJson.chart.map((item: any) => ({
            ...item,
            periodoStr: String(item.periodo).substring(5, 7) + '/' + String(item.periodo).substring(0, 4),
          })));
        }
      }
    } catch (err) {
      console.error("Erro dashboard:", err);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchAll().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo, customIni, customFim]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 p-4 border border-gray-100 dark:border-gray-700 dark:border-gray-700 rounded-xl shadow-2xl backdrop-blur-md">
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-3 mb-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
              <p className="text-xs font-bold text-gray-700 dark:text-gray-200 dark:text-gray-200">
                {entry.name}: <span className="text-blue-600">R$ {entry.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </p>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <RefreshCw className="w-10 h-10 text-blue-600 animate-spin" />
      <p className="text-gray-400 dark:text-gray-500 animate-pulse">Carregando indicadores...</p>
    </div>
  );

  return (
    <div className="space-y-8 pb-10">
      {/* ─── Filtro de Período + Refresh ─── */}
      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 dark:border-gray-700 p-4 flex flex-wrap items-center gap-3">
        <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500" />
        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase">Período:</span>
        {(['hoje','semana','mes','mes_passado','custom'] as Periodo[]).map(p => (
          <button key={p} onClick={() => setPeriodo(p)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              periodo === p ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}>
            {PERIODO_LABELS[p]}
          </button>
        ))}
        {periodo === 'custom' && (
          <>
            <input type="date" value={customIni} onChange={e => setCustomIni(e.target.value)}
              className="border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-blue-400" />
            <span className="text-xs text-gray-400 dark:text-gray-500">até</span>
            <input type="date" value={customFim} onChange={e => setCustomFim(e.target.value)}
              className="border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-blue-400" />
          </>
        )}
        <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
          {dtIni.split('-').reverse().join('/')} a {dtFim.split('-').reverse().join('/')}
        </span>
        <button onClick={handleRefresh} disabled={refreshing}
          className="ml-auto px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-medium flex items-center gap-2">
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* ─── Cards Vendas + Donut Chart Status ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card Vendas + Total a Receber + Total a Pagar (coluna esquerda) */}
        <div className="flex flex-col gap-6">
          <StatCard
            label={PERIODO_LABELS[periodo]}
            value={(kpis.vendas_periodo?.total ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            icon={DollarSign} trend={kpis.vendas_periodo?.trend ?? 0} color="blue"
          />
          <StatCard
            label="Total a Receber"
            value={finSummary.total_receber.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            icon={DollarSign} trend={finSummary.trendReceber} color="green"
          />
          <StatCard
            label="Total a Pagar"
            value={finSummary.total_pagar.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            icon={TrendingDown} trend={finSummary.trendPagar} color="red"
          />
        </div>

        {/* Donut Chart Status (2 colunas) */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-base font-bold text-gray-800 dark:text-gray-100">Status de Documentos Fiscais</h4>
              <p className="text-xs text-gray-400 dark:text-gray-500 uppercase">{PERIODO_LABELS[periodo]}</p>
            </div>
          </div>

          {donutData.segmentos.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-12">Nenhum documento no período selecionado</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              {/* Donut */}
              <div className="relative h-[240px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData.segmentos}
                      dataKey="qtd"
                      nameKey="nome"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      {donutData.segmentos.map((entry: any, idx: number) => (
                        <Cell key={idx} fill={entry.cor} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: any, _n: any, item: any) => [`${v} documento(s) — R$ ${Number(item.payload.val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, item.payload.nome]}
                      contentStyle={{ backgroundColor: 'rgba(15, 20, 32, 0.95)', border: '1px solid #1a1f2e', borderRadius: 12, color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">{donutData.total_qtd}</p>
                  <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider">Total</p>
                </div>
              </div>

              {/* Lista de status */}
              <div className="space-y-3">
                {donutData.segmentos.map((s: any, i: number) => {
                  const pct = donutData.total_qtd > 0 ? Math.round((s.qtd / donutData.total_qtd) * 100) : 0;
                  return (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.cor }}></div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{s.nome}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{s.qtd}</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500">{pct}%</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── KPIs Operacionais (clicáveis) ─── */}
      <div>
        <h4 className="text-xs uppercase font-bold text-gray-400 dark:text-gray-500 mb-3 tracking-wider">Operacional</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <KPICard label="Orçamentos Pendentes"
            value={kpis.orcamentos_pendentes.qtd}
            sub={fmtBRL(kpis.orcamentos_pendentes.valor)}
            icon={FileText} color="orange"
            onClick={() => goTo('orcamentos')} />
          <KPICard label="OS em Andamento"
            value={kpis.os_andamento.qtd}
            icon={Wrench} color="blue"
            onClick={() => goTo('ordens_servico')} />
          <KPICard label="Taxa de Conversão"
            value={`${kpis.taxa_conversao.percentual}%`}
            sub={`${kpis.taxa_conversao.aprovados} de ${kpis.taxa_conversao.total} orçamentos`}
            icon={TrendingUp}
            color={kpis.taxa_conversao.percentual >= 50 ? 'green' : 'orange'}
            trend={kpis.taxa_conversao.trend}
            onClick={() => goTo('orcamentos')} />
          <KPICard label="Ticket Médio"
            value={fmtBRL(kpis.ticket_medio.medio || kpis.ticket_medio.orcamento || kpis.ticket_medio.os || 0)}
            icon={DollarSign} color="purple"
            trend={kpis.ticket_medio.trend} />
        </div>
      </div>

      {/* ─── Alertas Financeiros (clicáveis) ─── */}
      {(kpis.contas_receber.vencidas.qtd > 0 || kpis.contas_pagar.vencidas.qtd > 0 ||
        kpis.contas_receber.vencendo_7d.qtd > 0 || kpis.contas_pagar.vencendo_7d.qtd > 0) && (
        <div>
          <h4 className="text-xs uppercase font-bold text-gray-400 dark:text-gray-500 mb-3 tracking-wider">Alertas Financeiros</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpis.contas_receber.vencidas.qtd > 0 && (
              <div onClick={() => goTo('fin_receber', { preset: 'vencidas' })} className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-2xl p-5 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all">
                <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" /><p className="text-[10px] uppercase font-bold text-red-600 dark:text-red-400">A Receber — Vencidas</p></div>
                <p className="text-2xl font-bold text-red-700 dark:text-red-300">{fmtBRL(kpis.contas_receber.vencidas.valor)}</p>
                <p className="text-xs text-red-500 dark:text-red-400 mt-1">{kpis.contas_receber.vencidas.qtd} título(s) — clique para abrir</p>
              </div>
            )}
            {kpis.contas_receber.vencendo_7d.qtd > 0 && (
              <div onClick={() => goTo('fin_receber')} className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-2xl p-5 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all">
                <div className="flex items-center gap-2 mb-2"><Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" /><p className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">A Receber — Próx. 7 dias</p></div>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{fmtBRL(kpis.contas_receber.vencendo_7d.valor)}</p>
                <p className="text-xs text-amber-500 dark:text-amber-400 mt-1">{kpis.contas_receber.vencendo_7d.qtd} título(s) — clique para abrir</p>
              </div>
            )}
            {kpis.contas_pagar.vencidas.qtd > 0 && (
              <div onClick={() => goTo('fin_pagar', { preset: 'vencidas' })} className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-2xl p-5 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all">
                <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" /><p className="text-[10px] uppercase font-bold text-red-600 dark:text-red-400">A Pagar — Vencidas</p></div>
                <p className="text-2xl font-bold text-red-700 dark:text-red-300">{fmtBRL(kpis.contas_pagar.vencidas.valor)}</p>
                <p className="text-xs text-red-500 dark:text-red-400 mt-1">{kpis.contas_pagar.vencidas.qtd} título(s) — clique para abrir</p>
              </div>
            )}
            {kpis.contas_pagar.vencendo_7d.qtd > 0 && (
              <div onClick={() => goTo('fin_pagar')} className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-2xl p-5 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all">
                <div className="flex items-center gap-2 mb-2"><Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" /><p className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">A Pagar — Próx. 7 dias</p></div>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{fmtBRL(kpis.contas_pagar.vencendo_7d.valor)}</p>
                <p className="text-xs text-amber-500 dark:text-amber-400 mt-1">{kpis.contas_pagar.vencendo_7d.qtd} título(s) — clique para abrir</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Top 5 Clientes / Produtos ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-blue-600" />
            <h4 className="text-base font-bold text-gray-800 dark:text-gray-100 dark:text-white">Top 5 Clientes</h4>
          </div>
          {kpis.top_clientes.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-8">Nenhum cliente no período</p>
          ) : (
            <div className="space-y-2">
              {kpis.top_clientes.map((c: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{c.cliente_nome}</p>
                  </div>
                  <p className="text-sm font-bold text-blue-700 dark:text-blue-300 flex-shrink-0">{fmtBRL(Number(c.total))}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-emerald-600" />
            <h4 className="text-base font-bold text-gray-800 dark:text-gray-100 dark:text-white">Top 5 Produtos</h4>
          </div>
          {kpis.top_produtos.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-8">Nenhum produto vendido no período</p>
          ) : (
            <div className="space-y-2">
              {kpis.top_produtos.map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{p.descricao}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{Number(p.qtd).toLocaleString('pt-BR')} un.</p>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300 flex-shrink-0">{fmtBRL(Number(p.total))}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Gráfico de Evolução ─── */}
      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }} className="bg-white dark:bg-gray-800 dark:bg-gray-800 p-8 rounded-[2rem] shadow-xl border border-gray-100 dark:border-gray-700 dark:border-gray-700">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h4 className="text-xl font-bold text-gray-800 dark:text-gray-100 dark:text-white">Evolução de Vendas</h4>
            <p className="text-xs text-gray-400 dark:text-gray-500 uppercase">ÚLTIMOS 12 MESES</p>
          </div>
          <div className="flex items-center gap-4">
            {isFiscal && <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500 rounded-full"></div><span className="text-[10px] text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase">NFC-E</span></div>}
            {isFiscal && <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-500 rounded-full"></div><span className="text-[10px] text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase">NF-E</span></div>}
          </div>
        </div>
        <div className="h-[400px] w-full" style={{ minHeight: '400px', minWidth: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" strokeOpacity={0.3} />
              <XAxis dataKey="periodoStr" axisLine={false} tickLine={false}
                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} dy={10} />
              <YAxis axisLine={false} tickLine={false}
                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                tickFormatter={(val) => `R$ ${val >= 1000 ? (val/1000).toFixed(1) + 'k' : val}`} />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: 'rgba(6, 182, 212, 0.05)' }}
              />
              {isFiscal && (
                <Bar name="NFC-e" dataKey="nfce" radius={[6, 6, 0, 0]}>
                  {data.map((_, idx) => (
                    <Cell key={`nfce-${idx}`} fill={idx === data.length - 1 ? '#06b6d4' : '#3b82f6'} />
                  ))}
                </Bar>
              )}
              {isFiscal && (
                <Bar name="NF-e" dataKey="nfe" radius={[6, 6, 0, 0]}>
                  {data.map((_, idx) => (
                    <Cell key={`nfe-${idx}`} fill={idx === data.length - 1 ? '#10b981' : '#34d399'} fillOpacity={idx === data.length - 1 ? 1 : 0.5} />
                  ))}
                </Bar>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* ─── A Receber / A Pagar + Previsão ─── */}
      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }}>
        <div className="bg-white dark:bg-gray-800 p-8 rounded-[2rem] shadow-xl border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h4 className="text-xl font-bold text-gray-800 dark:text-gray-100 dark:text-white">Previsão Financeira</h4>
              <p className="text-xs text-gray-400 dark:text-gray-500 uppercase">PRÓXIMOS 6 MESES</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-500 rounded-full"></div><span className="text-[10px] text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase">A RECEBER</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-400 rounded-full"></div><span className="text-[10px] text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase">A PAGAR</span></div>
            </div>
          </div>
          <div className="h-[400px] w-full" style={{ minHeight: '400px', minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={finChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReceber" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPagar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f87171" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f87171" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="periodoStr" axisLine={false} tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} dy={10} />
                <YAxis axisLine={false} tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  tickFormatter={(val) => `R$ ${val >= 1000 ? (val/1000).toFixed(1) + 'k' : val}`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" name="A Receber" dataKey="receber" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorReceber)" />
                <Area type="monotone" name="A Pagar"   dataKey="pagar"   stroke="#f87171" strokeWidth={4} fillOpacity={1} fill="url(#colorPagar)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
