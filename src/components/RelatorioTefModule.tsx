import React, { useState, useEffect } from 'react';
import { Search, BarChart2, X } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const STATUS_MAP: Record<number, { label: string; color: string }> = {
  1: { label: 'Solicitado',     color: 'bg-yellow-100 text-yellow-700' },
  2: { label: 'Processando',    color: 'bg-blue-100 text-blue-600' },
  3: { label: 'Aguardando',     color: 'bg-orange-100 text-orange-600' },
  4: { label: 'Pago',           color: 'bg-green-100 text-green-700' },
  5: { label: 'Cancelado/Erro', color: 'bg-red-100 text-red-600' },
};

const TIPO_MAP: Record<string, string> = {
  '1': 'Débito', '2': 'Crédito', '3': 'PIX',
};

export const RelatorioTefTab = ({ showAlert }: any) => {
  const getLocalDate = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };
  const getFirstDayOfMonth = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0].substring(0, 8) + '01';
  };
  const [di, setDi] = useState(getFirstDayOfMonth);
  const [df, setDf] = useState(getLocalDate);
  const [smartposList, setSmartposList] = useState<any[]>([]);
  const [selectedPos, setSelectedPos] = useState('');
  const [loading, setLoading] = useState(false);
  const [transacoes, setTransacoes] = useState<any[]>([]);
  const [showGrafico, setShowGrafico] = useState(false);

  useEffect(() => {
    fetch('./api.php?action=listar_smartpos')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) { setSmartposList(d); if (d.length > 0) setSelectedPos(d[0].numero_serie); } })
      .catch(() => {});
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

  const totais = transacoes.reduce((acc, t) => {
    if (t.payment_status === 4) {
      const tipo = t.payment_order?.transaction_type;
      const valor = parseFloat(t.payment_order?.amount || 0);
      if (tipo === '1') acc.debito += valor;
      else if (tipo === '2') acc.credito += valor;
      else if (tipo === '3') acc.pix += valor;
      acc.total += valor;
    }
    return acc;
  }, { debito: 0, credito: 0, pix: 0, total: 0 });

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Máquina SmartPOS</label>
          <select value={selectedPos} onChange={e => setSelectedPos(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs outline-none">
            {smartposList.map(sp => (<option key={sp.id} value={sp.numero_serie}>{sp.apelido || sp.numero_serie} ({sp.integradora})</option>))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Data Início</label>
          <input type="date" value={di} onChange={e => setDi(e.target.value)} className="border border-gray-200 rounded-xl px-2 py-1.5 text-xs outline-none" />
        </div>
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Data Fim</label>
          <input type="date" value={df} onChange={e => setDf(e.target.value)} className="border border-gray-200 rounded-xl px-2 py-1.5 text-xs outline-none" />
        </div>
        <button onClick={buscar} disabled={loading} className="mt-4 px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-all flex items-center gap-1 disabled:opacity-50">
          <Search className="w-3 h-3" /> {loading ? 'Buscando...' : 'Buscar'}
        </button>
        {transacoes.length > 0 && (
          <button onClick={() => setShowGrafico(true)} className="mt-4 px-4 py-1.5 bg-purple-600 text-white text-xs font-bold rounded-xl hover:bg-purple-700 transition-all flex items-center gap-1">
            <BarChart2 className="w-3 h-3" /> Gráfico
          </button>
        )}
      </div>

      {transacoes.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[{label:'Débito',value:totais.debito,color:'text-blue-600'},{label:'Crédito',value:totais.credito,color:'text-purple-600'},{label:'PIX',value:totais.pix,color:'text-green-600'},{label:'Total',value:totais.total,color:'text-gray-800'}].map(t => (
            <div key={t.label} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{t.label}</p>
              <p className={`text-xl font-bold ${t.color}`}>{fmt(t.value)}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-6 py-4 font-bold uppercase text-[10px]">Data/Hora</th>
              <th className="px-6 py-4 font-bold uppercase text-[10px]">Tipo</th>
              <th className="px-6 py-4 font-bold uppercase text-[10px]">Bandeira</th>
              <th className="px-6 py-4 font-bold uppercase text-[10px]">NSU / Autorização</th>
              <th className="px-6 py-4 font-bold uppercase text-[10px] text-right">Valor</th>
              <th className="px-6 py-4 font-bold uppercase text-[10px]">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && <tr><td colSpan={7} className="px-6 py-8 text-center text-xs text-gray-400">Carregando...</td></tr>}
            {!loading && transacoes.length === 0 && <tr><td colSpan={7} className="px-6 py-8 text-center text-xs text-gray-400">Nenhuma transação encontrada. Clique em Buscar.</td></tr>}
            {!loading && transacoes.map((t: any) => {
              const status = STATUS_MAP[t.payment_status] ?? { label: String(t.payment_status), color: 'bg-gray-100 text-gray-600' };
              const tipo = TIPO_MAP[t.payment_order?.transaction_type] ?? '-';
              const data = t.created_at ? new Date(t.created_at).toLocaleString('pt-BR') : '-';
              const valor = parseFloat(t.payment_order?.amount || 0);
              return (
                <tr key={t.payment_uniqueid} className="hover:bg-gray-50/50 transition-all">
                  <td className="px-6 py-4 text-xs text-gray-600">{data}</td>
                  <td className="px-6 py-4 text-xs font-medium text-gray-700">{tipo}</td>
                  <td className="px-6 py-4 text-xs text-gray-600">{t.payment_data?.brand || '-'}</td>
                  <td className="px-6 py-4 text-xs text-gray-500">
                    <div>{t.payment_data?.nsu || '-'}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{t.payment_data?.authorization_code || '-'}</div>
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-gray-700 text-right">{fmt(valor)}</td>
                  <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${status.color}`}>{status.label}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    {/* Modal Gráfico */}
      {showGrafico && (() => {
        const pagas = transacoes.filter(t => t.payment_status === 4);
        const debito = pagas.filter(t => t.payment_order?.transaction_type === '1').reduce((s,t) => s + parseFloat(t.payment_order?.amount||0), 0);
        const credito = pagas.filter(t => t.payment_order?.transaction_type === '2').reduce((s,t) => s + parseFloat(t.payment_order?.amount||0), 0);
        const pix = pagas.filter(t => t.payment_order?.transaction_type === '3').reduce((s,t) => s + parseFloat(t.payment_order?.amount||0), 0);
        const total = debito + credito + pix;
        const data = [
          { name: 'Débito', value: parseFloat(debito.toFixed(2)), color: '#3b82f6' },
          { name: 'Crédito', value: parseFloat(credito.toFixed(2)), color: '#8b5cf6' },
          { name: 'PIX', value: parseFloat(pix.toFixed(2)), color: '#10b981' },
        ].filter(d => d.value > 0);
        const RADIAN = Math.PI / 180;
        const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
          const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
          const x = cx + radius * Math.cos(-midAngle * RADIAN);
          const y = cy + radius * Math.sin(-midAngle * RADIAN);
          return percent > 0.05 ? (
            <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="bold">
              {`${(percent * 100).toFixed(1)}%`}
            </text>
          ) : null;
        };
        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[90] p-4">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">Vendas por Forma de Pagamento</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Total: {fmt(total)} · {pagas.length} transações</p>
                </div>
                <button onClick={() => setShowGrafico(false)} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5 text-gray-500" /></button>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={data} cx="50%" cy="50%" outerRadius={110} dataKey="value" labelLine={false} label={renderLabel}>
                    {data.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => fmt(v)} />
                  <Legend formatter={(v) => <span className="text-xs font-medium">{v}: {fmt(data.find(d => d.name === v)?.value || 0)}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
