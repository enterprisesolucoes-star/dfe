import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { DollarSign, CheckCircle, XCircle, TrendingDown, RefreshCw } from 'lucide-react';
import { StatCard } from './UIComponents';

// ─────────────────────────────────────────
// DASHBOARD MODULE — KPIs e gráficos principais
// ─────────────────────────────────────────

export const DashboardTab = ({ isFiscal }: { isFiscal: boolean }) => {
  const [data, setData] = useState<any[]>([]);
  const [finChart, setFinChart] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    total: 0, count: 0, avg: 0, nfeCount: 0, nfceCount: 0, canceladoCount: 0,
    trendTotal: 0, trendCount: 0
  });
  const [finSummary, setFinSummary] = useState({ total_receber: 0, total_pagar: 0, trendReceber: 0, trendPagar: 0 });

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
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
            const calcTrend = (cur: number, old: number) => {
              if (!old) return 0;
              return ((cur - old) / old) * 100;
            };

            setSummary({
              total: last.total || 0,
              count: last.count || 0,
              avg: (last.total / (last.count || 1)),
              nfeCount: last.nfe_count || 0,
              nfceCount: last.nfce_count || 0,
              canceladoCount: last.cancelado_count || 0,
              trendTotal: prev ? calcTrend(last.total, prev.total) : 0,
              trendCount: prev ? calcTrend(last.count, prev.count) : 0
            });
          }
        }

        const finRes = await fetch('./api.php?action=dashboard_financeiro');
        const finJson = await finRes.json();
        if (finJson) {
           const tRec = finJson.total_receber || 0;
           const tPag = finJson.total_pagar || 0;
           const aRec = finJson.receber_ant || 0;
           const aPag = finJson.pagar_ant || 0;
           const trendRec = aRec > 0 ? ((tRec - aRec) / aRec) * 100 : (tRec > 0 ? 100 : 0);
           const trendPag = aPag > 0 ? ((tPag - aPag) / aPag) * 100 : (tPag > 0 ? 100 : 0);

           setFinSummary({
             total_receber: tRec,
             total_pagar: tPag,
             trendReceber: trendRec,
             trendPagar: trendPag
           });
           if (Array.isArray(finJson.chart)) {
             const fFormatted = finJson.chart.map((item: any) => ({
                ...item,
                periodoStr: String(item.periodo).substring(5, 7) + '/' + String(item.periodo).substring(0, 4)
             }));
             setFinChart(fFormatted);
           }
        }
      } catch (err) {
        console.error("Erro dashboard:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-4 border border-gray-100 dark:border-gray-700 rounded-xl shadow-2xl backdrop-blur-md">
          <p className="text-xs font-bold text-gray-500 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-3 mb-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
              <p className="text-xs font-bold text-gray-700 dark:text-gray-200">
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
      <p className="text-gray-400 animate-pulse">Carregando indicadores...</p>
    </div>
  );

  return (
    <div className="space-y-8 pb-10">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          label="Vendas do Mês"
          value={summary.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          icon={DollarSign}
          trend={summary.trendTotal}
          color="blue"
        />
        {isFiscal && (
          <StatCard
            label="AUTORIZADAS NO MÊS"
            value={summary.count.toString()}
            icon={CheckCircle}
            trend={summary.trendCount}
            color="green"
          />
        )}
        {isFiscal && (
          <StatCard
            label="Cancelados no Mês"
            value={summary.canceladoCount.toString()}
            icon={XCircle}
            color="red"
          />
        )}
      </div>

      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }} className="bg-white dark:bg-gray-800 p-8 rounded-[2rem] shadow-xl border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h4 className="text-xl font-bold text-gray-800 dark:text-white">Evolução de Vendas</h4>
            <p className="text-xs text-gray-400 uppercase">ÚLTIMOS 12 MESES</p>
          </div>
          <div className="flex items-center gap-4">
            {isFiscal && <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500 rounded-full"></div><span className="text-[10px] text-gray-500 uppercase">NFC-E</span></div>}
            {isFiscal && <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-500 rounded-full"></div><span className="text-[10px] text-gray-500 uppercase">NF-E</span></div>}
          </div>
        </div>

        <div className="h-[400px] w-full" style={{ minHeight: '400px', minWidth: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorNfce" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorNfe" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis
                dataKey="periodoStr"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                tickFormatter={(val) => `R$ ${val >= 1000 ? (val/1000).toFixed(1) + 'k' : val}`}
              />
              <Tooltip content={<CustomTooltip />} />
              {isFiscal && <Area type="monotone" name="NFC-e" dataKey="nfce" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorNfce)" />}
              {isFiscal && <Area type="monotone" name="NF-e" dataKey="nfe" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorNfe)" />}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <div className="flex flex-col gap-6">
          <StatCard
            label="Total a Receber"
            value={finSummary.total_receber.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            icon={DollarSign}
            trend={finSummary.trendReceber}
            color="green"
          />
          <StatCard
            label="Total a Pagar"
            value={finSummary.total_pagar.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            icon={TrendingDown}
            trend={finSummary.trendPagar}
            color="red"
          />
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-8 rounded-[2rem] shadow-xl border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h4 className="text-xl font-bold text-gray-800 dark:text-white">Previsão Financeira</h4>
              <p className="text-xs text-gray-400 uppercase">PRÓXIMOS 6 MESES</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-500 rounded-full"></div><span className="text-[10px] text-gray-500 uppercase">A RECEBER</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-400 rounded-full"></div><span className="text-[10px] text-gray-500 uppercase">A PAGAR</span></div>
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
                <XAxis
                  dataKey="periodoStr"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  tickFormatter={(val) => `R$ ${val >= 1000 ? (val/1000).toFixed(1) + 'k' : val}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" name="A Receber" dataKey="receber" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorReceber)" />
                <Area type="monotone" name="A Pagar" dataKey="pagar" stroke="#f87171" strokeWidth={4} fillOpacity={1} fill="url(#colorPagar)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
