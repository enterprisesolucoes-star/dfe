import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { DollarSign, CheckCircle, Trash2, Search, TrendingUp, TrendingDown } from 'lucide-react';
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
    fetch('./api.php?action=fin_listar_contas').then(r => r.json()).then(d => {
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
      const res = await fetch('./api.php?action=fin_baixar_titulo', {
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
          <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded font-bold">TITULO #{titulo.id}</span>
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
          <div className="p-4 bg-gray-50 rounded-2xl space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Multa / Juros (+)</span>
              <div className="flex gap-2">
                <input type="number" step="0.01" value={valorMulta} onChange={e => setValorMulta(Number(e.target.value))} className="w-20 text-right bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold text-red-500" />
                <input type="number" step="0.01" value={valorJuros} onChange={e => setValorJuros(Number(e.target.value))} className="w-20 text-right bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold text-red-500" />
              </div>
            </div>
            <div className="flex justify-between items-center text-emerald-600">
              <span className="text-xs font-medium">Desconto (-)</span>
              <input type="number" step="0.01" value={valorDesconto} onChange={e => setValorDesconto(Number(e.target.value))} className="w-20 text-right bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold text-emerald-600" />
            </div>
            <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
              <span className="text-sm font-bold text-gray-800">TOTAL A LIQUIDAR</span>
              <span className="text-lg font-bold text-blue-700">R$ {valorFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
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
          <button onClick={handleConfirmar} disabled={loading} className="flex-1 py-3 bg-blue-600 text-white font-bold text-xs uppercase rounded-xl">{loading ? 'Aguarde...' : 'Confirmar'}</button>
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
  const [di, setDi] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`; });
  const [df, setDf] = useState(() => new Date().toISOString().split('T')[0]);
  const [busca, setBusca] = useState('');
  const [baixaTitulo, setBaixaTitulo] = useState<any | null>(null);

  const fetchTitulos = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`./api.php?action=fin_listar_titulos&tipo=${tipo}&status=${filtroStatus}&di=${di}&df=${df}&busca=${encodeURIComponent(busca.trim())}`);
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
    showConfirm("Confirmação", "Excluir este título?", async () => {
      const res = await fetch(`./api.php?action=fin_excluir_titulo&id=${id}`);
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
          {([['', 'TODOS'], ['Pendente', 'PENDENTE'], ['Pago', 'PAGOS']] as [string, string][]).map(([val, label]) => (
            <button key={val} onClick={() => setFiltroStatus(val as any)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filtroStatus === val ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
              {label}
            </button>
          ))}
          <span className="text-gray-300 text-xs">|</span>
          <span className="text-[10px] text-gray-400 font-bold uppercase">De:</span>
          <input type="date" value={di} onChange={e => setDi(e.target.value)} className="border border-gray-200 rounded-xl px-2 py-1.5 text-xs outline-none" />
          <span className="text-[10px] text-gray-400 font-bold uppercase">Até:</span>
          <input type="date" value={df} onChange={e => setDf(e.target.value)} className="border border-gray-200 rounded-xl px-2 py-1.5 text-xs outline-none" />
          <button onClick={fetchTitulos} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-all">Atualizar</button>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="Buscar cliente..." value={busca} onChange={e => setBusca(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchTitulos()} className="border border-gray-200 rounded-xl pl-8 pr-3 py-1.5 text-xs outline-none w-48" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-6 py-4 font-bold uppercase text-[10px]">Descrição / Cliente</th>
              <th className="px-6 py-4 font-bold uppercase text-[10px]">Vencimento</th>
              <th className="px-6 py-4 font-bold uppercase text-[10px]">Status</th>
              <th className="px-6 py-4 font-bold uppercase text-[10px] text-right">Valor</th>
              <th className="px-6 py-4 font-bold uppercase text-[10px] text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-xs text-gray-400">Carregando...</td></tr>
            )}
            {!loading && titulos.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-xs text-gray-400">Nenhum registro encontrado.</td></tr>
            )}
            {!loading && titulos.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50/50 transition-all">
                <td className="px-6 py-4">
                  <p className="text-xs font-bold text-gray-700">{t.categoria}</p>
                  <p className="text-[10px] text-blue-600 font-bold">{t.nome_entidade}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-xs text-gray-600">{t.vencimento ? new Date(t.vencimento + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${t.status === 'Pago' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {t.status || 'Pendente'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <p className={`text-xs font-bold ${tipo === 'R' ? 'text-blue-600' : 'text-red-600'}`}>
                    {Number(t.valor_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    {t.status !== 'Pago' && <button onClick={() => setBaixaTitulo(t)} className="p-1.5 text-gray-400 hover:text-emerald-600" title="Baixar"><CheckCircle className="w-3.5 h-3.5" /></button>}
                    <button onClick={() => handleExcluir(t.id)} className="p-1.5 text-gray-400 hover:text-red-600" title="Excluir"><Trash2 className="w-3.5 h-3.5" /></button>
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
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
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

export const CaixaView = ({ emitente, showAlert, showConfirm }: { emitente: any, showAlert: any, showConfirm: any }) => {
  const [movimentos, setMovimentos] = useState<any[]>([]);
  const [saldo, setSaldo] = useState(0);
  const [totEntradas, setTotEntradas] = useState(0);
  const [totSaidas, setTotSaidas] = useState(0);
  const [di, setDi] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`; });
  const [df, setDf] = useState(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [tipoMov, setTipoMov] = useState<'E'|'S'>('E');
  const [contaId, setContaId] = useState('');
  const [contas, setContas] = useState<any[]>([]);
  const [savingMov, setSavingMov] = useState(false);

  const fetchMovimentos = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`./api.php?action=fin_listar_movimentos&di=${di}&df=${df}`);
      const data = await resp.json();
      setMovimentos(data.movimentos || []);
      const ent = data.total_credito || 0;
      const sai = data.total_debito || 0;
      setTotEntradas(ent);
      setTotSaidas(sai);
      setSaldo(ent - sai);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchMovimentos(); }, [di, df]);

  useEffect(() => {
    fetch('./api.php?action=fin_listar_contas').then(r => r.json()).then(d => {
      if (Array.isArray(d)) { setContas(d); if (d[0]) setContaId(d[0].id); }
    }).catch(() => {});
  }, []);

  const handleSalvar = async () => {
    if (!descricao.trim() || !valor) return showAlert('Atenção', 'Preencha descrição e valor.');
    setSavingMov(true);
    try {
      const res = await fetch('./api.php?action=fin_salvar_movimento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ historico: descricao, valor: Number(valor), tipo: tipoMov === 'E' ? 'C' : 'D', conta_id: contaId, data_movimento: new Date().toISOString().split('T')[0] + ' 12:00:00' })
      });
      const data = await res.json();
      if (data.success) { setShowModal(false); setDescricao(''); setValor(''); fetchMovimentos(); }
      else showAlert('Erro', data.message || 'Erro ao salvar.');
    } catch { showAlert('Erro', 'Falha de comunicação.'); }
    finally { setSavingMov(false); }
  };

  const handleExcluir = (id: number) => {
    showConfirm('Confirmação', 'Excluir este movimento?', async () => {
      const res = await fetch(`./api.php?action=fin_excluir_movimento&id=${id}`);
      if ((await res.json()).success) fetchMovimentos();
    });
  };

  return (
    <div className="space-y-4">
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[300] p-4 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-bold text-gray-800 uppercase text-sm">Lançamento Manual</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex gap-2">
                {[['E','Entrada'],['S','Saída']].map(([v,l]) => (
                  <button key={v} onClick={() => setTipoMov(v as 'E'|'S')} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${tipoMov === v ? (v === 'E' ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white') : 'bg-gray-100 text-gray-500'}`}>{l}</button>
                ))}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Descrição</label>
                <input value={descricao} onChange={e => setDescricao(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none" placeholder="Ex: Pagamento de aluguel" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Valor (R$)</label>
                <input type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none" placeholder="0,00" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Conta</label>
                <select value={contaId} onChange={e => setContaId(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none">
                  {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
            </div>
            <div className="p-6 bg-gray-50 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 text-gray-500 font-bold text-xs uppercase">Cancelar</button>
              <button onClick={handleSalvar} disabled={savingMov} className="flex-1 py-3 bg-blue-600 text-white font-bold text-xs uppercase rounded-xl">{savingMov ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </motion.div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Saldo em Caixa" value={Number(saldo).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} icon={DollarSign} color="blue" />
        <StatCard label="Entradas (Crédito)" value={Number(totEntradas).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} icon={TrendingUp} color="green" />
        <StatCard label="Saídas (Débito)" value={Number(totSaidas).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} icon={TrendingDown} color="red" />
      </div>

      <div className="flex flex-wrap items-center justify-between bg-white p-4 rounded-3xl shadow-sm border border-gray-100 gap-4">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400 font-bold uppercase">De:</span>
          <input type="date" value={di} onChange={e => setDi(e.target.value)} className="border border-gray-200 rounded-xl px-2 py-1.5 text-xs outline-none" />
          <span className="text-[10px] text-gray-400 font-bold uppercase">Até:</span>
          <input type="date" value={df} onChange={e => setDf(e.target.value)} className="border border-gray-200 rounded-xl px-2 py-1.5 text-xs outline-none" />
          <button onClick={fetchMovimentos} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-all">Atualizar</button>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-all">
          <span className="text-base leading-none">+</span> Lançamento Manual
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-6 py-4 font-bold uppercase text-[10px]">Data</th>
              <th className="px-6 py-4 font-bold uppercase text-[10px]">Descrição</th>
              <th className="px-6 py-4 font-bold uppercase text-[10px]">Conta</th>
              <th className="px-6 py-4 font-bold uppercase text-[10px] text-right">Entrada</th>
              <th className="px-6 py-4 font-bold uppercase text-[10px] text-right">Saída</th>
              <th className="px-6 py-4 font-bold uppercase text-[10px] text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && <tr><td colSpan={6} className="px-6 py-8 text-center text-xs text-gray-400">Carregando...</td></tr>}
            {!loading && movimentos.length === 0 && <tr><td colSpan={6} className="px-6 py-8 text-center text-xs text-gray-400">Nenhum movimento encontrado.</td></tr>}
            {!loading && movimentos.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50/50 transition-all">
                <td className="px-6 py-4 text-xs text-gray-600">{m.data_movimento ? new Date(m.data_movimento).toLocaleDateString('pt-BR') : '-'}</td>
                <td className="px-6 py-4 text-xs font-bold text-gray-700">{m.historico}</td>
                <td className="px-6 py-4 text-xs text-gray-500">{m.conta_nome || 'CAIXA GERAL'}</td>
                <td className="px-6 py-4 text-right text-xs font-bold text-emerald-600">{m.tipo === 'C' ? Number(m.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : ''}</td>
                <td className="px-6 py-4 text-right text-xs font-bold text-red-500">{m.tipo === 'D' ? Number(m.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : ''}</td>
                <td className="px-6 py-4 text-center">
                  {!m.venda_id && !m.compra_id && !m.financeiro_id && <button onClick={() => handleExcluir(m.id)} className="p-1.5 text-gray-400 hover:text-red-600"><svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
