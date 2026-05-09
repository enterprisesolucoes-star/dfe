import React, { useState, useEffect } from 'react';
import { Search, BarChart2, X, Monitor, Package, ChevronRight } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// ─── Hub de Relatórios ───────────────────────────────────────────────────────
export const RelatoriosHub = ({ showAlert, emitente, isFiscal }: any) => {
  const [ativo, setAtivo] = useState<string | null>(null);
  const temTef = (emitente?.temTef || false) && isFiscal !== false;

  const relatorios = [
    ...(temTef ? [{
      id: 'tef',
      icon: Monitor,
      color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
      iconBg: 'bg-blue-100 dark:bg-blue-900/40',
      titulo: 'Vendas SmartPOS',
      descricao: 'Transações realizadas na maquininha por período e forma de pagamento.',
    }] : []),
    {
      id: 'estoque',
      icon: Package,
      color: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200',
      iconBg: 'bg-green-100',
      titulo: 'Estoque',
      descricao: 'Posição atual do estoque com valor total e alertas de produtos baixos.',
    },
  ];

  if (ativo === 'tef') return <RelatorioTefTab showAlert={showAlert} onVoltar={() => setAtivo(null)} />;
  if (ativo === 'estoque') return <RelatorioEstoqueTab showAlert={showAlert} onVoltar={() => setAtivo(null)} />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Relatórios</h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Selecione o relatório que deseja visualizar</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {relatorios.map(r => (
          <button key={r.id} onClick={() => setAtivo(r.id)}
            className={`flex items-center gap-4 p-5 bg-white dark:bg-gray-800 rounded-3xl border shadow-sm hover:shadow-md transition-all text-left group ${r.color}`}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${r.iconBg}`}>
              <r.icon className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-800 dark:text-gray-100 text-sm">{r.titulo}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-2">{r.descricao}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 transition-colors shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── Relatório TEF ───────────────────────────────────────────────────────────
const STATUS_MAP: Record<number, { label: string; color: string }> = {
  1: { label: 'Solicitado',     color: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300' },
  2: { label: 'Processando',    color: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' },
  3: { label: 'Aguardando',     color: 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400' },
  4: { label: 'Pago',           color: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' },
  5: { label: 'Cancelado/Erro', color: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400' },
};
const TIPO_MAP: Record<string, string> = { '1': 'Débito', '2': 'Crédito', '3': 'PIX' };

const RelatorioTefTab = ({ showAlert, onVoltar }: any) => {
  const getLocalDate = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().split('T')[0]; };
  const getFirstDay = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().split('T')[0].substring(0, 8) + '01'; };
  const [di, setDi] = useState(getFirstDay);
  const [df, setDf] = useState(getLocalDate);
  const [smartposList, setSmartposList] = useState<any[]>([]);
  const [selectedPos, setSelectedPos] = useState('');
  const [loading, setLoading] = useState(false);
  const [transacoes, setTransacoes] = useState<any[]>([]);
  const [showGrafico, setShowGrafico] = useState(false);

  useEffect(() => {
    fetch('./api.php?action=listar_smartpos').then(r => r.json()).then(d => {
      if (Array.isArray(d)) { setSmartposList(d); if (d.length > 0) setSelectedPos(d[0].numero_serie); }
    }).catch(() => {});
  }, []);

  const buscar = async () => {
    if (!selectedPos) { showAlert('Atenção', 'Selecione uma máquina SmartPOS.'); return; }
    setLoading(true);
    try {
      const resp = await fetch(`./api.php?action=relatorio_tef&data_inicio=${di}&data_fim=${df}&cliente_chave=${selectedPos}`);
      const d = await resp.json();
      if (d.success) setTransacoes(d.data || []);
      else showAlert('Erro', d.message || 'Erro ao buscar transações.');
    } catch { showAlert('Erro', 'Falha de comunicação.'); }
    setLoading(false);
  };

  const pagas = transacoes.filter(t => t.payment_status === 4);
  const totais = pagas.reduce((acc, t) => {
    const tipo = t.payment_order?.transaction_type;
    const valor = parseFloat(t.payment_order?.amount || 0);
    if (tipo === '1') acc.debito += valor;
    else if (tipo === '2') acc.credito += valor;
    else if (tipo === '3') acc.pix += valor;
    acc.total += valor;
    return acc;
  }, { debito: 0, credito: 0, pix: 0, total: 0 });

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const graficoData = [
    { name: 'Débito', value: parseFloat(totais.debito.toFixed(2)), color: '#3b82f6' },
    { name: 'Crédito', value: parseFloat(totais.credito.toFixed(2)), color: '#8b5cf6' },
    { name: 'PIX', value: parseFloat(totais.pix.toFixed(2)), color: '#10b981' },
  ].filter(d => d.value > 0);

  const RADIAN = Math.PI / 180;
  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null;
    const r = innerRadius + (outerRadius - innerRadius) * 0.5;
    return <text x={cx + r * Math.cos(-midAngle * RADIAN)} y={cy + r * Math.sin(-midAngle * RADIAN)} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="bold">{`${(percent * 100).toFixed(1)}%`}</text>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={onVoltar} className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">← Relatórios</button>
        <span className="text-gray-300 dark:text-gray-600">/</span>
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Vendas SmartPOS</span>
      </div>
      <div className="flex flex-wrap items-end gap-3 bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div>
          <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase block mb-1">Máquina SmartPOS</label>
          <select value={selectedPos} onChange={e => setSelectedPos(e.target.value)} className="border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-1.5 text-xs outline-none">
            {smartposList.map(sp => <option key={sp.id} value={sp.numero_serie}>{sp.apelido || sp.numero_serie} ({sp.integradora})</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase block mb-1">Data Início</label>
          <input type="date" value={di} onChange={e => setDi(e.target.value)} className="border border-gray-200 dark:border-gray-700 rounded-xl px-2 py-1.5 text-xs outline-none" />
        </div>
        <div>
          <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase block mb-1">Data Fim</label>
          <input type="date" value={df} onChange={e => setDf(e.target.value)} className="border border-gray-200 dark:border-gray-700 rounded-xl px-2 py-1.5 text-xs outline-none" />
        </div>
        <button onClick={buscar} disabled={loading} className="px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-all flex items-center gap-1 disabled:opacity-50">
          <Search className="w-3 h-3" /> {loading ? 'Buscando...' : 'Buscar'}
        </button>
        {transacoes.length > 0 && (
          <button onClick={() => setShowGrafico(true)} className="px-4 py-1.5 bg-purple-600 text-white text-xs font-bold rounded-xl hover:bg-purple-700 transition-all flex items-center gap-1">
            <BarChart2 className="w-3 h-3" /> Gráfico
          </button>
        )}
      </div>

      {transacoes.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[{label:'Débito',value:totais.debito,color:'text-blue-600 dark:text-blue-400'},{label:'Crédito',value:totais.credito,color:'text-purple-600'},{label:'PIX',value:totais.pix,color:'text-green-600 dark:text-green-400'},{label:'Total',value:totais.total,color:'text-gray-800 dark:text-gray-100'}].map(t => (
            <div key={t.label} className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">{t.label}</p>
              <p className={`text-xl font-bold ${t.color}`}>{fmt(t.value)}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-6 py-4 font-bold uppercase text-[10px]">Data/Hora</th>
              <th className="px-6 py-4 font-bold uppercase text-[10px]">Tipo</th>
              <th className="px-6 py-4 font-bold uppercase text-[10px]">Bandeira</th>
              <th className="px-6 py-4 font-bold uppercase text-[10px]">NSU / Autorização</th>
              <th className="px-6 py-4 font-bold uppercase text-[10px] text-right">Valor</th>
              <th className="px-6 py-4 font-bold uppercase text-[10px]">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {loading && <tr><td colSpan={6} className="px-6 py-8 text-center text-xs text-gray-400 dark:text-gray-500">Carregando...</td></tr>}
            {!loading && transacoes.length === 0 && <tr><td colSpan={6} className="px-6 py-8 text-center text-xs text-gray-400 dark:text-gray-500">Nenhuma transação. Clique em Buscar.</td></tr>}
            {!loading && transacoes.map((t: any) => {
              const status = STATUS_MAP[t.payment_status] ?? { label: String(t.payment_status), color: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300' };
              const data = t.created_at ? new Date(t.created_at).toLocaleString('pt-BR') : '-';
              return (
                <tr key={t.payment_uniqueid} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all">
                  <td className="px-6 py-4 text-xs text-gray-600 dark:text-gray-300">{data}</td>
                  <td className="px-6 py-4 text-xs font-medium text-gray-700 dark:text-gray-200">{TIPO_MAP[t.payment_order?.transaction_type] ?? '-'}</td>
                  <td className="px-6 py-4 text-xs text-gray-600 dark:text-gray-300">{t.payment_data?.brand || '-'}</td>
                  <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400">
                    <div>{t.payment_data?.nsu || '-'}</div>
                    <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{t.payment_data?.authorization_code || '-'}</div>
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-gray-700 dark:text-gray-200 text-right">{fmt(parseFloat(t.payment_order?.amount || 0))}</td>
                  <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${status.color}`}>{status.label}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showGrafico && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[90] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-lg shadow-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Vendas por Forma de Pagamento</h2>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Total: {fmt(totais.total)} · {pagas.length} transações pagas</p>
              </div>
              <button onClick={() => setShowGrafico(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl"><X className="w-5 h-5 text-gray-500 dark:text-gray-400" /></button>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={graficoData} cx="50%" cy="50%" outerRadius={110} dataKey="value" labelLine={false} label={renderLabel}>
                  {graficoData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v: any) => fmt(v)} />
                <Legend formatter={(v) => <span className="text-xs font-medium">{v}: {fmt(graficoData.find(d => d.name === v)?.value || 0)}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Relatório Estoque ───────────────────────────────────────────────────────
const RelatorioEstoqueTab = ({ showAlert, onVoltar }: any) => {
  const [produtos, setProdutos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<'todos'|'baixo'|'zerado'>('todos');

  const buscar = async () => {
    setLoading(true);
    try {
      let all: any[] = [];
      let page = 1, pages = 1;
      do {
        const d = await fetch(`./api.php?action=produtos&page=${page}&limit=200`).then(r => r.json());
        if (d && Array.isArray(d.data)) { all = [...all, ...d.data]; pages = d.pages || 1; page++; }
        else break;
      } while (page <= pages);
      setProdutos(all);
    } catch { showAlert('Erro', 'Falha ao buscar produtos.'); }
    setLoading(false);
  };

  useEffect(() => { buscar(); }, []);

  const lista = produtos.filter(p => {
    const q = busca.toLowerCase();
    const match = !q || (p.descricao || '').toLowerCase().includes(q) || (p.codigo_interno || '').toLowerCase().includes(q);
    const est = parseFloat(p.estoque || 0);
    if (filtro === 'zerado') return match && est <= 0;
    if (filtro === 'baixo') return match && est > 0 && est <= 5;
    return match;
  });

  const totalEstoque = lista.reduce((s, p) => s + (parseFloat(p.estoque || 0) * parseFloat(p.custo_compra || 0)), 0);
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={onVoltar} className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">← Relatórios</button>
        <span className="text-gray-300 dark:text-gray-600">/</span>
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Estoque</span>
      </div>
      <div className="flex flex-wrap items-end gap-3 bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input type="text" placeholder="Buscar produto..." value={busca} onChange={e => setBusca(e.target.value)}
            className="w-full border border-gray-200 dark:border-gray-700 rounded-xl pl-8 pr-3 py-1.5 text-xs outline-none" />
        </div>
        <div className="flex gap-1">
          {(['todos','baixo','zerado'] as const).map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${filtro === f ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
              {f === 'todos' ? 'Todos' : f === 'baixo' ? 'Baixo (≤5)' : 'Zerado'}
            </button>
          ))}
        </div>
        <button onClick={buscar} disabled={loading} className="px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-all flex items-center gap-1 disabled:opacity-50">
          <Search className="w-3 h-3" /> Atualizar
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Produtos', value: String(lista.length), color: 'text-gray-800 dark:text-gray-100' },
          { label: 'Zerados', value: String(lista.filter(p => parseFloat(p.estoque||0) <= 0).length), color: 'text-red-600 dark:text-red-400' },
          { label: 'Estoque Baixo', value: String(lista.filter(p => parseFloat(p.estoque||0) > 0 && parseFloat(p.estoque||0) <= 5).length), color: 'text-orange-500' },
          { label: 'Valor Total', value: fmt(totalEstoque), color: 'text-green-600 dark:text-green-400' },
        ].map(c => (
          <div key={c.label} className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">{c.label}</p>
            <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-6 py-4 font-bold uppercase text-[10px]">Código</th>
              <th className="px-6 py-4 font-bold uppercase text-[10px]">Descrição</th>
              <th className="px-6 py-4 font-bold uppercase text-[10px]">Unidade</th>
              <th className="px-6 py-4 font-bold uppercase text-[10px] text-right">Preço Custo</th>
              <th className="px-6 py-4 font-bold uppercase text-[10px] text-right">Estoque</th>
              <th className="px-6 py-4 font-bold uppercase text-[10px] text-right">Valor Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {loading && <tr><td colSpan={6} className="px-6 py-8 text-center text-xs text-gray-400 dark:text-gray-500">Carregando...</td></tr>}
            {!loading && lista.length === 0 && <tr><td colSpan={6} className="px-6 py-8 text-center text-xs text-gray-400 dark:text-gray-500">Nenhum produto encontrado.</td></tr>}
            {!loading && lista.map((p: any) => {
              const est = parseFloat(p.estoque || 0);
              const estColor = est <= 0 ? 'text-red-600 dark:text-red-400 font-bold' : est <= 5 ? 'text-orange-500 font-bold' : 'text-gray-700 dark:text-gray-200';
              const valorTotal = est * parseFloat(p.custo_compra || 0);
              return (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all">
                  <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400">{p.codigo_interno || '-'}</td>
                  <td className="px-6 py-4 text-xs font-medium text-gray-800 dark:text-gray-100">{p.descricao}</td>
                  <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400">{p.unidade_comercial || 'UN'}</td>
                  <td className="px-6 py-4 text-xs text-gray-700 dark:text-gray-200 text-right">{fmt(parseFloat(p.custo_compra || 0))}</td>
                  <td className={`px-6 py-4 text-xs text-right ${estColor}`}>{est.toLocaleString('pt-BR', {maximumFractionDigits:3})}</td>
                  <td className="px-6 py-4 text-xs font-medium text-gray-700 dark:text-gray-200 text-right">{fmt(valorTotal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
