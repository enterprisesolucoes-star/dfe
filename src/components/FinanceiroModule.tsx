import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  DollarSign, CheckCircle, Trash2, Search, 
  RefreshCw, TrendingUp, TrendingDown, AlertCircle
} from 'lucide-react';
import { StatCard, Input } from './UIComponents';

// ─── Componente Baixa de Título ──────────────────────────────────────────────
export const BaixaModal = ({ titulo, emitente, onClose, onSuccess, showAlert }: any) => {
  const [loading, setLoading] = useState(false);
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split('T')[0]);
  const [valorMulta, setValorMulta] = useState(0);
  const [valorJuros, setValorJuros] = useState(0);
  const [valorDesconto, setValorDesconto] = useState(0);
  const [contaId, setContaId] = useState('');
  const [contas, setContas] = useState<any[]>([]);

  useEffect(() => {
    fetch('.http://187.77.240?action=fin_listar_contas').then(r => r.json()).then(d => {
      setContas(Array.isArray(d) ? d : []);
      if (d.length > 0) setContaId(d[0].id);
    });

    if (titulo.tipo === 'R' && titulo.status === 'Pendente') {
      const venc = new Date(titulo.vencimento + 'T12:00:00');
      const hoje = new Date();
      hoje.setHours(12, 0, 0, 0);
      const diffTime = hoje.getTime() - venc.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > (emitente.carencia_dias_receber || 0)) {
        const m = (Number(titulo.valor_total) * (Number(emitente.multa_receber || 0) / 100));
        const j = (Number(titulo.valor_total) * (Number(emitente.juros_dia_receber || 0) / 100) * diffDays);
        setValorMulta(Number(m.toFixed(2)));
        setValorJuros(Number(j.toFixed(2)));
      }
    }
  }, [titulo, emitente]);

  const valorFinal = Number(titulo.valor_total) + valorMulta + valorJuros - valorDesconto;

  const handleConfirmar = async () => {
    setLoading(true);
    try {
      const res = await fetch('.http://187.77.240?action=fin_baixar_titulo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: titulo.id,
          data_pagamento: dataPagamento,
          valor_pago: valorFinal,
          valor_multa: valorMulta,
          valor_juros: valorJuros,
          valor_desconto: valorDesconto,
          conta_id: contaId
        })
      });
      const data = await res.json();
      if (data.success) { onSuccess(); } else { showAlert('Erro na Baixa', data.message); }
    } catch { showAlert('Erro', 'Falha de comunicação.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[300] p-4 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <h3 className="font-bold text-gray-800 uppercase text-sm">Baixar {titulo.tipo === 'R' ? 'Recebimento' : 'Pagamento'}</h3>
        </div>
        <div className="p-6 space-y-4">
           <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Valor Original</label>
               <p className="text-xl font-bold text-gray-800">R$ {Number(titulo.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
             </div>
             <div>
               <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Vencimento</label>
               <p className="text-sm font-bold text-gray-600">{new Date(titulo.vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
             </div>
           </div>
           {/* ... outros campos ... */}
           <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
              <span className="text-sm font-bold text-gray-800">TOTAL A LIQUIDAR</span>
              <span className="text-lg font-bold text-blue-700">R$ {valorFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
           </div>
           <div className="space-y-3">
             <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Conta de Destino / Data</label>
             <select value={contaId} onChange={e => setContaId(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none">
                {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
             </select>
             <Input label="Data Baixa" type="date" value={dataPagamento} onChange={(e:any) => setDataPagamento(e.target.value)} />
           </div>
        </div>
        <div className="p-6 bg-gray-50 flex gap-3">
           <button onClick={onClose} className="flex-1 py-3 text-gray-500 font-bold text-xs uppercase">Cancelar</button>
           <button onClick={handleConfirmar} disabled={loading} className="flex-1 py-3 bg-blue-600 text-white font-bold text-xs uppercase rounded-xl">Confirmar</button>
        </div>
      </motion.div>
    </div>
  );
};

// ─── Componente de Listagem Financeiro ───────────────────────────────────────
export const FinanceiroView = ({ tipo, emitente, showAlert, showConfirm }: { tipo: 'R' | 'P', emitente: any, showAlert: any, showConfirm: any }) => {
  const [titulos, setTitulos] = useState<any[]>([]);
  const [totPendente, setTotPendente] = useState(0);
  const [totPago, setTotPago] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<'Pendente' | 'Pago' | ''>('');
  const [di, setDi] = useState('');
  const [df, setDf] = useState('');
  const [busca, setBusca] = useState('');
  const [baixaTitulo, setBaixaTitulo] = useState<any | null>(null);

  const fetchTitulos = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`.http://187.77.240?action=fin_listar_titulos&tipo=${tipo}&status=${filtroStatus}&di=${di}&df=${df}&busca=${encodeURIComponent(busca.trim())}`);
      const data = await resp.json();
      if (Array.isArray(data)) {
         setTitulos(data); setTotPendente(0); setTotPago(0);
      } else {
         setTitulos(data.titulos || []);
         setTotPendente(data.total_pendente || 0);
         setTotPago(data.total_pago || 0);
      }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchTitulos(); }, [tipo, filtroStatus, di, df]);

  const handleExcluir = (id: number) => {
    showConfirm("Confirmação", "Excluir?", async () => {
      const res = await fetch(`.http://187.77.240?action=fin_excluir_titulo&id=${id}`);
      if ((await res.json()).success) { fetchTitulos(); }
    });
  };

  return (
    <div className="space-y-4">
      {baixaTitulo && <BaixaModal titulo={baixaTitulo} emitente={emitente} onClose={() => setBaixaTitulo(null)} onSuccess={() => { setBaixaTitulo(null); fetchTitulos(); }} showAlert={showAlert} />}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard label={tipo === 'R' ? "Contas a Receber" : "Contas a Pagar"} value={Number(totPendente).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} icon={DollarSign} color={tipo === 'R' ? 'blue' : 'red'} />
        <StatCard label={tipo === 'R' ? "Recebido no Período" : "Pago no Período"} value={Number(totPago).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} icon={CheckCircle} color="green" />
      </div>

      <div className="flex flex-wrap items-center justify-between bg-white p-4 rounded-3xl shadow-sm border border-gray-100 gap-4">
        <div className="flex items-center gap-2">
          {['Pendente', 'Pago', ''].map(st => (
            <button key={st} onClick={() => setFiltroStatus(st as any)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filtroStatus === st ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
              {st === 'Pendente' ? 'P' : st === 'Pago' ? 'OK' : 'TODOS'}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
           <input type="text" placeholder="Buscar..." value={busca} onChange={e => setBusca(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchTitulos()} className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs outline-none" />
           <button onClick={fetchTitulos} className="p-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-xl"><Search className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-6 py-4 font-bold uppercase text-[10px]">Descrição / Nome</th>
              <th className="px-6 py-4 font-bold uppercase text-[10px] text-right">Valor</th>
              <th className="px-6 py-4 font-bold uppercase text-[10px] text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {titulos.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50/50 transition-all">
                <td className="px-6 py-4">
                  <p className="text-xs font-bold">{t.categoria}</p>
                  <p className="text-[10px] text-blue-600 font-bold">{t.nome_entidade}</p>
                </td>
                <td className="px-6 py-4 text-right">
                  <p className={`text-xs font-bold ${tipo === 'R' ? 'text-blue-600' : 'text-red-600'}`}>R$ {Number(t.valor_total).toFixed(2)}</p>
                </td>
                <td className="px-6 py-4 text-center">
                   <div className="flex items-center justify-center gap-2">
                      {t.status !== 'Pago' && <button onClick={() => setBaixaTitulo(t)} className="p-1.5 text-gray-400 hover:text-emerald-600"><CheckCircle className="w-3.5 h-3.5" /></button>}
                      <button onClick={() => handleExcluir(t.id)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Componente Parcelamento ────────────────────────────────────────────────
export const ParcelamentoModal = ({ total, initialParcelas, onConfirm, onCancel }: any) => {
  const [numParcelas, setNumParcelas] = useState(initialParcelas?.length || 1);
  const [parcelas, setParcelas] = useState<any[]>(initialParcelas || []);

  useEffect(() => {
    if (initialParcelas?.length > 0) return;
    const valorBase = Math.floor((total / numParcelas) * 100) / 100;
    const array = [];
    let soma = 0;
    for (let i = 1; i <= numParcelas; i++) {
      const data = new Date(); data.setDate(data.getDate() + (i * 30));
      let v = valorBase;
      if (i === numParcelas) v = Number((total - soma).toFixed(2));
      else soma += valorBase;
      array.push({ numero: i, vencimento: data.toISOString().split('T')[0], valor: v });
    }
    setParcelas(array);
  }, [numParcelas, total]);

  const tP = parcelas.reduce((acc, p) => acc + Number(p.valor), 0);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[300] p-4 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden shadow-2xl">
         <div className="p-6 border-b border-gray-100 flex justify-between bg-gray-50">
            <h3 className="font-bold text-gray-800 uppercase text-xs">Parcelamento</h3>
            <span className="font-bold text-blue-600">Total: R$ {total.toFixed(2)}</span>
         </div>
         <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="flex items-center gap-4">
               <label className="text-xs font-bold text-gray-400 uppercase">Parcelas:</label>
               <input type="number" value={numParcelas} onChange={e => setNumParcelas(Math.max(1, Number(e.target.value)))} className="w-20 border rounded-xl px-3 py-1 text-sm font-bold" />
            </div>
            <table className="w-full text-left text-xs">
               <thead><tr><th>#</th><th>Vencimento</th><th className="text-right">Valor</th></tr></thead>
               <tbody>
                 {parcelas.map((p, idx) => (
                   <tr key={idx} className="border-t">
                     <td className="py-2">{p.numero}</td>
                     <td><input type="date" value={p.vencimento} onChange={e => { const n = [...parcelas]; n[idx].vencimento = e.target.value; setParcelas(n); }} className="border-0 bg-transparent" /></td>
                     <td className="text-right">R$ {p.valor.toFixed(2)}</td>
                   </tr>
                 ))}
               </tbody>
            </table>
         </div>
         <div className="p-6 bg-gray-50 flex gap-4">
            <button onClick={onCancel} className="flex-1 py-3 text-gray-500 font-bold uppercase text-xs">Cancelar</button>
            <button onClick={() => onConfirm(parcelas)} disabled={Math.abs(tP - total) > 0.01} className="flex-1 py-3 bg-blue-600 text-white font-bold uppercase text-xs rounded-xl">Salvar</button>
         </div>
      </motion.div>
    </div>
  );
};
