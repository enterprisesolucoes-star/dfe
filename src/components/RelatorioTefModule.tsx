import React, { useState, useEffect } from 'react';
import { Search, RefreshCw } from 'lucide-react';

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
    </div>
  );
};
