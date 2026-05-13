import { SkeletonTable, EmptyState, Pagination } from './UIComponents';
import { ClienteSearchInput } from './ClienteSearchInput';
import { useAppData } from '../contexts/AppDataContext';
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { DollarSign, CheckCircle, Trash2, Search, TrendingUp, TrendingDown, Plus, RotateCcw, Edit2, FileText, Loader2, Copy, ExternalLink, MessageCircle, Send } from 'lucide-react';
import { StatCard, Input } from './UIComponents';

const WaModal = ({ onClose, onSend, sending, defaultPhone = '' }: { onClose: () => void; onSend: (phone: string) => void; sending: boolean; defaultPhone?: string }) => {
  const [phone, setPhone] = React.useState(defaultPhone.replace(/\D/g,''));
  return (
    <div className="fixed inset-0 bg-black/60 z-[9990] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <h3 className="font-bold text-gray-800 dark:text-gray-100">Enviar via WhatsApp</h3>
        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Telefone (somente números)</label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g,''))} placeholder="11999999999" className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-400 dark:bg-gray-700 dark:text-gray-100" />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 bg-gray-700 text-white rounded-xl text-sm font-semibold hover:bg-gray-600 transition-colors">Cancelar</button>
          <button onClick={() => onSend(phone)} disabled={sending || phone.length < 10} className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-colors">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
            {sending ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Abre boleto via fetch+document.write (bypassa Service Worker navigation)
const abrirBoleto = async (id: number) => {
  try {
    const res = await fetch(`./api.php?action=boleto_imprimir&id=${id}`);
    if (!res.ok) return;
    const html = await res.text();
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.open(); win.document.write(html); win.document.close();
  } catch { /* silent */ }
};

const CobrancaMassaModal = ({ onClose, emitente, di, df, showAlert }: { onClose: () => void; emitente: any; di: string; df: string; showAlert: any }) => {
  const [clientes, setClientes] = React.useState<any[]>([]);
  const [selecionados, setSelecionados] = React.useState<Set<number>>(new Set());
  const [loading, setLoading] = React.useState(true);
  const [enviando, setEnviando] = React.useState(false);
  const [progresso, setProgresso] = React.useState<{atual: number; total: number; nome: string}>({ atual: 0, total: 0, nome: '' });
  const [erros, setErros] = React.useState<string[]>([]);
  const [concluido, setConcluido] = React.useState(false);

  React.useEffect(() => {
    const fetchAgrupado = async () => {
      setLoading(true);
      try {
        const r = await fetch(`./api.php?action=fin_cobrar_agrupado&di=${di}&df=${df}`);
        const d = await r.json();
        const lista = Array.isArray(d) ? d : [];
        setClientes(lista);
        setSelecionados(new Set(lista.map((c: any) => Number(c.cliente_id))));
      } catch { setClientes([]); }
      setLoading(false);
    };
    fetchAgrupado();
  }, [di, df]);

  const toggleCliente = (id: number) => {
    setSelecionados(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleTodos = () => {
    const aptos = clientes.map(c => Number(c.cliente_id));
    setSelecionados(selecionados.size === aptos.length ? new Set() : new Set(aptos));
  };

  const gerarMensagem = (idx: number, nome: string, valor: string, descricao: string): string => {
    const msgs = [
      `Olá, ${nome}! Consta em nosso sistema o valor de ${valor} em aberto. Para sua comodidade, segue a chave PIX para pagamento: ${(emitente as any).chavepix || ''}`,
      `Oi, ${nome}! Tudo bem? Passando só para te dar um alô sobre aquele valor de ${valor} referente a ${descricao}. Se puder enviar o Pix quando tiver um tempinho, agradeço! 😊`,
      `Olá, ${nome}, como vai? Notamos que o pagamento de ${valor} referente a ${descricao} ainda consta em aberto. Caso já tenha realizado, desconsidere. Se precisar da chave Pix, é só avisar! Abraço.`
    ];
    return msgs[idx % 3];
  };

  const paraEnviar = clientes.filter(c => selecionados.has(Number(c.cliente_id)) && c.telefone && c.telefone.replace(/\D/g,'').length >= 10);

  const iniciarEnvio = async () => {
    if (paraEnviar.length === 0) { showAlert('Atenção', 'Nenhum cliente selecionado com telefone cadastrado.'); return; }
    setEnviando(true);
    setErros([]);
    setProgresso({ atual: 0, total: paraEnviar.length, nome: '' });

    for (let i = 0; i < paraEnviar.length; i++) {
      const c = paraEnviar[i];
      const valorFmt = Number(c.total_aberto).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const phone = c.telefone.replace(/\D/g,'');
      setProgresso({ atual: i + 1, total: paraEnviar.length, nome: c.nome });

      const chavepix = (emitente as any).chavepix || '';
      const texto = gerarMensagem(i, c.nome, valorFmt, 'nossos serviços');

      try {
        await fetch('/api/whatsapp/send-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, text: texto })
        });
      } catch { setErros(p => [...p, `Falha texto: ${c.nome}`]); }

      if (chavepix && Number(c.total_aberto) > 0) {
        try {
          const { gerarPixQrCodeBase64 } = await import('../utils/pixQrCode');
          const qr = await gerarPixQrCodeBase64(chavepix, Number(c.total_aberto), emitente.razaoSocial || 'Empresa', emitente.municipio || 'Cidade');
          await fetch('/api/whatsapp/send-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, base64: qr, caption: `QR Code PIX — ${valorFmt}` })
          });
        } catch { setErros(p => [...p, `Falha QR: ${c.nome}`]); }
      }

      if (i < paraEnviar.length - 1) {
        await new Promise(r => setTimeout(r, 3000 + Math.random() * 3000));
      }
    }
    setConcluido(true);
    setEnviando(false);
  };

  const todosChecked = clientes.length > 0 && selecionados.size === clientes.length;
  const algunsChecked = selecionados.size > 0 && selecionados.size < clientes.length;

  return (
    <div className="fixed inset-0 bg-black/60 z-[9990] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg flex items-center gap-2"><MessageCircle className="w-5 h-5 text-green-500" /> Cobrança em Massa via WhatsApp</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Período: {di} a {df}</p>
          </div>
          <button onClick={onClose} disabled={enviando} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-green-500" /></div>
          ) : concluido ? (
            <div className="text-center py-8 space-y-3">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center mx-auto"><MessageCircle className="w-8 h-8 text-green-600" /></div>
              <p className="font-bold text-gray-800 dark:text-gray-100">Envio concluído!</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{progresso.total} cliente(s) processado(s)</p>
              {erros.length > 0 && <div className="text-xs text-red-500 space-y-0.5">{erros.slice(0,5).map((e,i) => <p key={i}>{e}</p>)}</div>}
            </div>
          ) : enviando ? (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Enviando para <span className="text-green-600">{progresso.nome}</span>...</p>
                <p className="text-xs text-gray-400 mt-1">{progresso.atual} de {progresso.total}</p>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${(progresso.atual / progresso.total) * 100}%` }} />
              </div>
              <p className="text-xs text-center text-gray-400 dark:text-gray-500">Aguardando intervalo entre envios para evitar bloqueio...</p>
            </div>
          ) : (
            <>
              {clientes.length === 0 ? (
                <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">Nenhum título pendente no período selecionado.</div>
              ) : (
                <div className="space-y-2">
                  {!(emitente as any).chavepix && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3 text-xs text-yellow-700 dark:text-yellow-300">
                      ⚠ Chave PIX não configurada. As mensagens não incluirão QR Code. Configure em Admin → Empresas.
                    </div>
                  )}
                  <div className="overflow-auto rounded-xl border border-gray-100 dark:border-gray-700">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                          <th className="px-3 py-2.5 text-center w-8">
                            <input type="checkbox" checked={todosChecked} ref={el => { if (el) el.indeterminate = algunsChecked; }} onChange={toggleTodos} className="w-4 h-4 accent-green-600 cursor-pointer" />
                          </th>
                          <th className="px-4 py-2.5 text-left font-bold text-gray-500 dark:text-gray-400 uppercase">Cliente</th>
                          <th className="px-4 py-2.5 text-left font-bold text-gray-500 dark:text-gray-400 uppercase">Documento</th>
                          <th className="px-4 py-2.5 text-right font-bold text-gray-500 dark:text-gray-400 uppercase">Total Aberto</th>
                          <th className="px-4 py-2.5 text-center font-bold text-gray-500 dark:text-gray-400 uppercase">WhatsApp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                        {clientes.map((c) => {
                          const id = Number(c.cliente_id);
                          const checked = selecionados.has(id);
                          return (
                            <tr key={id} onClick={() => toggleCliente(id)} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                              <td className="px-3 py-2.5 text-center">
                                <input type="checkbox" checked={checked} onChange={() => toggleCliente(id)} onClick={e => e.stopPropagation()} className="w-4 h-4 accent-green-600 cursor-pointer" />
                              </td>
                              <td className="px-4 py-2.5 font-semibold text-gray-700 dark:text-gray-200">{c.nome || 'Sem nome'}</td>
                              <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">{c.documento || '—'}</td>
                              <td className="px-4 py-2.5 text-right font-bold text-blue-600 dark:text-blue-400">{Number(c.total_aberto).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                              <td className="px-4 py-2.5 text-center">
                                <span className="text-green-500">✓ {c.telefone}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {selecionados.size === 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">⚠ Nenhum cliente selecionado.</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {!concluido && !enviando && clientes.length > 0 && (
          <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 bg-gray-700 dark:bg-gray-600 text-white text-sm font-semibold rounded-xl hover:bg-gray-600 dark:hover:bg-gray-500 transition-colors">Cancelar</button>
            <button onClick={iniciarEnvio} disabled={paraEnviar.length === 0} className="flex-1 py-3 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 transition-colors shadow-md disabled:opacity-50 flex items-center justify-center gap-2">
              <Send className="w-4 h-4" /> Iniciar Envio ({paraEnviar.length} cliente{paraEnviar.length !== 1 ? 's' : ''})
            </button>
          </div>
        )}
        {concluido && (
          <div className="p-6 border-t border-gray-100 dark:border-gray-700">
            <button onClick={onClose} className="w-full py-3 bg-gray-700 text-white text-sm font-semibold rounded-xl hover:bg-gray-600 transition-colors">Fechar</button>
          </div>
        )}
      </div>
    </div>
  );
};


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
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between">
          <h3 className="font-bold text-gray-800 dark:text-gray-100 uppercase text-sm">Baixar {titulo.tipo === 'R' ? 'Recebimento' : 'Pagamento'}</h3>
          <span className="text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded font-bold">TITULO #{titulo.id}</span>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Valor Original</label>
              <p className="text-xl font-bold text-gray-800 dark:text-gray-100">R$ {Number(titulo.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Vencimento</label>
              <p className="text-sm font-bold text-gray-600 dark:text-gray-300">{new Date(titulo.vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
            </div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500 dark:text-gray-400">Multa / Juros (+)</span>
              <div className="flex gap-2">
                <input type="number" step="0.01" value={valorMulta} onChange={e => setValorMulta(Number(e.target.value))} className="w-20 text-right bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 text-xs font-bold text-red-500 dark:text-red-400" />
                <input type="number" step="0.01" value={valorJuros} onChange={e => setValorJuros(Number(e.target.value))} className="w-20 text-right bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 text-xs font-bold text-red-500 dark:text-red-400" />
              </div>
            </div>
            <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
              <span className="text-xs font-medium">Desconto (-)</span>
              <input type="number" step="0.01" value={valorDesconto} onChange={e => setValorDesconto(Number(e.target.value))} className="w-20 text-right bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <span className="text-sm font-bold text-gray-800 dark:text-gray-100">TOTAL A LIQUIDAR</span>
              <span className="text-lg font-bold text-blue-700 dark:text-blue-300">R$ {valorFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
          <div className="space-y-3">
            <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Conta de Destino / Data</label>
            <select value={contaId} onChange={e => setContaId(e.target.value)} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-sm outline-none">
              {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            <Input label="Data Baixa" type="date" value={dataPagamento} onChange={(e:any) => setDataPagamento(e.target.value)} />
          </div>
        </div>
        <div className="p-6 bg-gray-50 dark:bg-gray-900 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 text-gray-500 dark:text-gray-400 font-bold text-xs uppercase">Cancelar</button>
          <button onClick={handleConfirmar} disabled={loading} className="flex-1 py-3 bg-blue-600 text-white font-bold text-xs uppercase rounded-xl">{loading ? 'Aguarde...' : 'Confirmar'}</button>
        </div>
      </motion.div>
    </div>
  );
};

// ─── Componente de Listagem Financeiro ───────────────────────────────────────
export const FinanceiroView = ({ tipo, emitente, showAlert, showConfirm, cobrancaAtiva = false, initPreset = null }: { tipo: 'R' | 'P', emitente: any, showAlert: any, showConfirm: any, cobrancaAtiva?: boolean, initPreset?: string | null }) => {
  const [titulos, setTitulos] = useState<any[]>([]);
  const [totPendente, setTotPendente] = useState(0);
  const [totPago, setTotPago] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<'Pendente' | 'Pago' | ''>(initPreset === 'vencidas' ? 'Pendente' : '');
  const [di, setDi] = useState(() => {
    if (initPreset === 'vencidas') return '2020-01-01';
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
  });
  const [df, setDf] = useState(() => {
    if (initPreset === 'vencidas') return new Date(Date.now() - 86400000).toISOString().split('T')[0];
    return new Date().toISOString().split('T')[0];
  });
  const [busca, setBusca] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 0 });
  const [baixaTitulo, setBaixaTitulo] = useState<any | null>(null);

  const toggleSelect = (id: number) => setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleSelectAll = () => {
    const pendentesIds = titulos.filter(t => t.status !== 'Pago').map(t => t.id);
    const allSel = pendentesIds.length > 0 && pendentesIds.every(id => selectedIds.has(id));
    setSelectedIds(allSel ? new Set() : new Set(pendentesIds));
  };

  const baixarLote = () => {
    if (selectedIds.size === 0) return;
    const selecionados = titulos.filter(t => selectedIds.has(t.id));
    const total = selecionados.reduce((a, t) => a + Number(t.valor_total || 0), 0);
    const hoje = new Date().toISOString().split('T')[0];
    showConfirm(
      `Baixar ${selectedIds.size} título(s)`,
      `Confirmar recebimento de ${total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} com data de hoje (${new Date().toLocaleDateString('pt-BR')})?`,
      async () => {
        let ok = 0, fail = 0;
        for (const id of Array.from(selectedIds)) {
          const titulo = titulos.find(t => t.id === id);
          if (!titulo) continue;
          try {
            const r = await fetch('./api.php?action=fin_baixar_titulo', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id, data_pagamento: hoje, valor_pago: Number(titulo.valor_total), valor_multa: 0, valor_juros: 0, valor_desconto: 0, conta_id: null })
            });
            const d = await r.json();
            d.success ? ok++ : fail++;
          } catch { fail++; }
        }
        setSelectedIds(new Set());
        fetchTitulos();
        showAlert(ok > 0 ? 'Sucesso' : 'Erro', `${ok} título(s) baixado(s).${fail > 0 ? ` ${fail} com falha.` : ''}`);
      }
    );
  };
  const [showLancamento, setShowLancamento] = useState(false);
  const [editTitulo, setEditTitulo] = useState<any | null>(null);
  const [boletoTitulo, setBoletoTitulo] = useState<any | null>(null);
  const [waTarget, setWaTarget] = React.useState<{titulo: any} | null>(null);
  const [waSending, setWaSending] = React.useState(false);
  const [showMassa, setShowMassa] = React.useState(false);

  const fetchTitulos = async (p = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ action: 'fin_listar_titulos', tipo, status: filtroStatus, di, df, busca: busca.trim(), page: String(p), limit: '50' });
      const resp = await fetch(`./api.php?${params}`);
      const data = await resp.json();
      if (Array.isArray(data)) {
        setTitulos(data); setTotPendente(0); setTotPago(0);
      } else {
        setTitulos(data.titulos || []);
        setPagination({ total: data.total ?? 0, pages: data.pages ?? 0 });
        setTotPendente(data.total_pendente || 0);
        setTotPago(data.total_pago || 0);
      }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { setPage(1); }, [tipo, filtroStatus, di, df, busca]);
  useEffect(() => { fetchTitulos(page); }, [page, tipo, filtroStatus, di, df]);

  const handleExcluir = (id: number) => {
    showConfirm("Confirmação", "Excluir este título?", async () => {
      const res = await fetch(`./api.php?action=fin_excluir_titulo&id=${id}`);
      if ((await res.json()).success) { fetchTitulos(); }
    });
  };
  const imprimirLote = async (lancamentoId: number) => {
    const res = await fetch(`./api.php?action=fin_ids_por_lancamento&lancamento_id=${lancamentoId}`);
    const data = await res.json();
    if (data.ids && data.ids.length > 0) {
      data.ids.forEach((id: number) => abrirBoleto(id));
    }
  };

  const handleEstornar = (id: number) => {
    showConfirm('Estornar Recebimento', 'Esta ação irá reverter o pagamento e remover o lançamento do caixa. Deseja continuar?', async () => {
      const res = await fetch('./api.php?action=fin_estornar_titulo', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ id }) });
      const data = await res.json();
      if (data.success) { fetchTitulos(); showAlert('Sucesso', 'Estorno realizado.'); } else showAlert('Erro', data.message || 'Falha ao estornar.');
    });
  };

  const sendWaTitulo = async (phone: string) => {
    if (!waTarget) return;
    const t = waTarget.titulo;
    const valorFmt = Number(t.valor_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const nome = t.nome_entidade || 'Cliente';
    setWaSending(true);
    const msgs = [
      `Olá, ${nome}! Consta em nosso sistema o valor de ${valorFmt} em aberto. Para sua comodidade, segue a chave PIX: ${(emitente as any).chavepix || ''}`,
      `Oi, ${nome}! Tudo bem? Passando para avisar sobre o valor de ${valorFmt} em aberto. Se puder enviar o Pix quando tiver um tempinho, agradeço! 😊`,
      `Olá, ${nome}, como vai? O pagamento de ${valorFmt} ainda consta em aberto. Se precisar da chave Pix, é só avisar! Abraço.`
    ];
    const texto = msgs[Math.floor(Math.random() * 3)];
    try {
      await fetch('/api/whatsapp/send-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, text: texto })
      });
      const chavepix = (emitente as any).chavepix || '';
      if (chavepix && Number(t.valor_total) > 0) {
        const { gerarPixQrCodeBase64 } = await import('../utils/pixQrCode');
        const qr = await gerarPixQrCodeBase64(chavepix, Number(t.valor_total), emitente.razaoSocial || 'Empresa', emitente.municipio || 'Cidade');
        await fetch('/api/whatsapp/send-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, base64: qr, caption: `QR Code PIX — ${valorFmt}` })
        });
      }
    } catch {}
    setWaSending(false);
    setWaTarget(null);
  };

  return (
    <div className="space-y-4">
      {baixaTitulo && <BaixaModal titulo={baixaTitulo} emitente={emitente} onClose={() => setBaixaTitulo(null)} onSuccess={() => { setBaixaTitulo(null); fetchTitulos(); }} showAlert={showAlert} />}
      {showLancamento && <LancamentoManualModal tipo={tipo} onClose={() => setShowLancamento(false)} onSuccess={() => { setShowLancamento(false); fetchTitulos(); }} showAlert={showAlert} />}
      {editTitulo && <EditarTituloModal titulo={editTitulo} onClose={() => setEditTitulo(null)} onSuccess={() => { setEditTitulo(null); fetchTitulos(); }} showAlert={showAlert} />}
      {boletoTitulo && <BoletoModal titulo={boletoTitulo} onClose={() => { setBoletoTitulo(null); fetchTitulos(); }} showAlert={showAlert} />}
      {waTarget && <WaModal onClose={() => setWaTarget(null)} onSend={sendWaTitulo} sending={waSending} defaultPhone={(waTarget.titulo.telefone_entidade || '').replace(/\D/g,'')} />}
      {showMassa && <CobrancaMassaModal onClose={() => setShowMassa(false)} emitente={emitente} di={di} df={df} showAlert={showAlert} />}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard label={tipo === 'R' ? "Contas a Receber" : "Contas a Pagar"} value={Number(totPendente).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} icon={DollarSign} color={tipo === 'R' ? 'blue' : 'red'} />
        <StatCard label={tipo === 'R' ? "Recebido no Período" : "Pago no Período"} value={Number(totPago).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} icon={CheckCircle} color="green" />
      </div>

      <div className="flex flex-wrap items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 gap-4">
        <div className="flex items-center gap-2">
          {([['', 'TODOS'], ['Pendente', 'PENDENTE'], ['Pago', 'PAGOS']] as [string, string][]).map(([val, label]) => (
            <button key={val} onClick={() => setFiltroStatus(val as any)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filtroStatus === val ? 'bg-blue-600 text-white' : 'bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
              {label}
            </button>
          ))}
          <span className="text-gray-300 dark:text-gray-600 text-xs">|</span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase">De:</span>
          <input type="date" value={di} onChange={e => setDi(e.target.value)} className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-2 py-1.5 text-xs outline-none" />
          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase">Até:</span>
          <input type="date" value={df} onChange={e => setDf(e.target.value)} className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-2 py-1.5 text-xs outline-none" />
          <button onClick={fetchTitulos} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-all">Atualizar</button>
          <button onClick={() => setShowLancamento(true)} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-all"><Plus className="w-3 h-3" /> Novo Lançamento</button>
          {tipo === 'R' && !!(emitente as any).integracaowhatsapp && titulos.some(t => t.status !== 'Pago') && (
            <button onClick={() => setShowMassa(true)} className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-xl hover:bg-green-700 transition-all">
              <MessageCircle className="w-3 h-3" /> Cobrança em Massa
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="Localizar por nome, documento ou celular..." value={busca} onChange={e => setBusca(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchTitulos()} className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl pl-8 pr-3 py-1.5 text-xs outline-none w-48" />
          </div>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl">
          <span className="text-sm font-bold text-blue-700 dark:text-blue-300">{selectedIds.size} título(s) selecionado(s)</span>
          <button onClick={baixarLote} className="ml-auto px-4 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-all flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5" /> Baixar selecionados
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="text-xs text-blue-500 hover:underline">Limpar</button>
        </div>
      )}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-4 w-10">
                <input type="checkbox" className="w-3.5 h-3.5 rounded accent-blue-600 cursor-pointer"
                  checked={titulos.filter(t => t.status !== 'Pago').length > 0 && titulos.filter(t => t.status !== 'Pago').every(t => selectedIds.has(t.id))}
                  onChange={toggleSelectAll} />
              </th>
              <th className="px-6 py-4 font-bold uppercase text-[10px]">Descrição / Cliente</th>
              <th className="px-6 py-4 font-bold uppercase text-[10px]">Vencimento</th>
              <th className="px-6 py-4 font-bold uppercase text-[10px]">Status</th>
              <th className="px-6 py-4 font-bold uppercase text-[10px] text-right">Valor</th>
              <th className="px-6 py-4 font-bold uppercase text-[10px] text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {loading && (
              <SkeletonTable cols={5} />
            )}
            {!loading && titulos.length === 0 && (
              <EmptyState icon={FileText} title="Nenhum registro encontrado" subtitle="Ajuste os filtros ou cadastre um novo lançamento" />
            )}
            {!loading && titulos.map((t) => (
              <tr key={t.id} onClick={() => t.status !== 'Pago' && toggleSelect(t.id)}
                className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all cursor-pointer ${selectedIds.has(t.id) ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}>
                <td className="px-4 py-4 w-10" onClick={e => e.stopPropagation()}>
                  {t.status !== 'Pago' && (
                    <input type="checkbox" className="w-3.5 h-3.5 rounded accent-blue-600 cursor-pointer"
                      checked={selectedIds.has(t.id)} onChange={() => toggleSelect(t.id)} />
                  )}
                </td>
                <td className="px-6 py-4">
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-200">{t.categoria}</p>
                  <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">{t.nome_entidade}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-xs text-gray-600 dark:text-gray-300">{t.vencimento ? new Date(t.vencimento + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${t.status === 'Pago' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' : 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300'}`}>
                    {t.status || 'Pendente'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <p className={`text-xs font-bold ${tipo === 'R' ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                    {Number(t.valor_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    {t.status !== 'Pago' && <button onClick={() => setBaixaTitulo(t)} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-emerald-600" title="Baixar"><CheckCircle className="w-3.5 h-3.5" /></button>}
                    {t.status !== 'Pago' && <button onClick={() => setEditTitulo(t)} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400" title="Editar"><Edit2 className="w-3.5 h-3.5" /></button>}
                    {cobrancaAtiva && tipo === 'R' && t.status !== 'Pago' && t.entidade_id && (
                      t.boleto_status === 'registrado'
                        ? <button onClick={() => setBoletoTitulo({ ...t, _modo: 'visualizar' })} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-indigo-600" title="Ver Boleto"><FileText className="w-3.5 h-3.5" /></button>
                        : <button onClick={() => setBoletoTitulo({ ...t, _modo: 'gerar' })} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-indigo-600" title="Gerar Boleto"><FileText className="w-3.5 h-3.5" /></button>
                    )}
                    {cobrancaAtiva && tipo === 'R' && t.lancamento_id && t.parcela_total > 1 && t.boleto_status === 'registrado' && (
                      <button onClick={() => imprimirLote(t.lancamento_id)} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-purple-600" title="Imprimir Lote"><ExternalLink className="w-3.5 h-3.5" /></button>
                    )}
                    {tipo === 'R' && t.status !== 'Pago' && !!(emitente as any).integracaowhatsapp && (
                      <button onClick={() => setWaTarget({ titulo: t })} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-green-600 transition-colors" title="Cobrar via WhatsApp"><MessageCircle className="w-3.5 h-3.5" /></button>
                    )}
                    {t.status === 'Pago' && <button onClick={() => handleEstornar(t.id)} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-amber-600" title="Estornar"><RotateCcw className="w-3.5 h-3.5" /></button>}
                    <button onClick={() => handleExcluir(t.id)} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400" title="Excluir"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pagination.pages > 1 && <Pagination page={page} pages={pagination.pages} total={pagination.total} limit={50} onChange={p => setPage(p)} />}
      </div>
    </div>
  );
};

// ─── Componente Parcelamento ────────────────────────────────────────────────
export const EditarTituloModal = ({ titulo, onClose, onSuccess, showAlert }: any) => {
  const tipoTexto = titulo.tipo === 'R' ? 'Receber' : 'Pagar';
  const corBtn = titulo.tipo === 'R' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700';
  const [categoria, setCategoria] = useState(titulo.categoria || '');
  const [valorTotal, setValorTotal] = useState(String(titulo.valor_total || ''));
  const [vencimento, setVencimento] = useState(titulo.vencimento || '');
  const [observacoes, setObservacoes] = useState(titulo.observacoes || '');
  const [formaPgto, setFormaPgto] = useState(titulo.forma_pagamento_prevista || '01');
  const [saving, setSaving] = useState(false);

  const handleSalvar = async () => {
    const valorNum = Number(String(valorTotal).replace(',','.')) || 0;
    if (!categoria.trim()) { showAlert('Atenção', 'Descrição é obrigatória.'); return; }
    if (valorNum <= 0) { showAlert('Atenção', 'Valor deve ser maior que zero.'); return; }
    setSaving(true);
    try {
      const res = await fetch('./api.php?action=fin_editar_titulo', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          id: titulo.id, categoria, valor_total: valorNum, vencimento,
          observacoes, forma_pagamento_prevista: formaPgto
        })
      });
      const data = await res.json();
      if (data.success) { showAlert('Sucesso', 'Título atualizado.'); onSuccess(); }
      else showAlert('Erro', data.message || 'Falha ao salvar.');
    } catch { showAlert('Erro', 'Falha ao conectar.'); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm">Editar Título — {tipoTexto}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Parcela {titulo.parcela_numero}/{titulo.parcela_total}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>
        <div className="p-6 space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Descrição</label>
            <input type="text" value={categoria} onChange={e => setCategoria(e.target.value)} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Valor (R$)</label>
              <input type="number" step="0.01" value={valorTotal} onChange={e => setValorTotal(e.target.value)} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Vencimento</label>
              <input type="date" value={vencimento} onChange={e => setVencimento(e.target.value)} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Forma de Pagamento Prevista</label>
            <select value={formaPgto} onChange={e => setFormaPgto(e.target.value)} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm">
              <option value="01">01 - Dinheiro</option>
              <option value="03">03 - Crédito</option>
              <option value="04">04 - Débito</option>
              <option value="15">15 - Boleto</option>
              <option value="17">17 - PIX</option>
              <option value="99">99 - Outros</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Observações</label>
            <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm resize-none" />
          </div>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-gray-700 dark:bg-gray-600 text-white text-sm font-semibold rounded-xl hover:bg-gray-600 dark:hover:bg-gray-500 transition-colors">Cancelar</button>
          <button onClick={handleSalvar} disabled={saving} className="flex-1 py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50">
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export const LancamentoManualModal = ({ tipo, onClose, onSuccess, showAlert }: any) => {
  const tipoTexto = tipo === 'R' ? 'Receber' : 'Pagar';
  const corBtn    = tipo === 'R' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700';

  const [descricao,     setDescricao]     = useState('');
  const [valorTotal,    setValorTotal]    = useState('');
  const [numParcelas,   setNumParcelas]   = useState(1);
  const [primeiroVenc,  setPrimeiroVenc]  = useState(new Date().toISOString().split('T')[0]);
  const [intervaloDias, setIntervaloDias] = useState(30);
  const [observacoes,   setObservacoes]   = useState('');
  const [parcelas,      setParcelas]      = useState<any[]>([]);
  const [saving,        setSaving]        = useState(false);
  const [gerandoBoletos, setGerandoBoletos] = useState(false);
  const [savedIds,      setSavedIds]      = useState<number[]>([]);
  const [formaPgto,     setFormaPgto]     = useState('01');

  // cliente
  const [clientes,        setClientes]        = useState<any[]>([]);
  const [clienteId,       setClienteId]       = useState('');
  const [clienteBusca,    setClienteBusca]    = useState('');
  const [showDropCliente, setShowDropCliente] = useState(false);
  const clientesFiltrados = clientes.filter(c =>
    clienteBusca.length < 2 ? false :
    (c.nome || c.razao_social || '').toLowerCase().includes(clienteBusca.toLowerCase()) ||
    (c.documento || '').includes(clienteBusca)
  );

  const isBoleto = formaPgto === '15';
  const precisaCliente = formaPgto === '15' || formaPgto === '05';

  useEffect(() => {
    if (precisaCliente && tipo === 'R') {
      fetch('./api.php?action=clientes')
        .then(r => r.json())
        .then(d => setClientes(Array.isArray(d.clientes) ? d.clientes : Array.isArray(d) ? d : []))
        .catch(() => {});
    }
  }, [precisaCliente, tipo]);

  const valorNum = Number(String(valorTotal).replace(',', '.')) || 0;

  // Arredondamento correto: distribui centavos nas primeiras parcelas
  useEffect(() => {
    if (valorNum <= 0 || numParcelas < 1) { setParcelas([]); return; }
    const totalCentavos = Math.round(valorNum * 100);
    const baseCentavos  = Math.floor(totalCentavos / numParcelas);
    const restoCentavos = totalCentavos - baseCentavos * numParcelas;
    const arr = [];
    for (let i = 1; i <= numParcelas; i++) {
      const data = new Date((primeiroVenc || new Date().toISOString().split('T')[0]) + 'T12:00:00'); if (isNaN(data.getTime())) return;
      data.setDate(data.getDate() + ((i - 1) * intervaloDias));
      const centavos = baseCentavos + (i <= restoCentavos ? 1 : 0);
      arr.push({ numero: i, vencimento: data.toISOString().split('T')[0], valor: centavos / 100 });
    }
    setParcelas(arr);
    setSavedIds([]);
  }, [valorNum, numParcelas, primeiroVenc, intervaloDias]);

  const totalParcelas = parcelas.reduce((acc, p) => acc + Number(p.valor), 0);
  const diferenca     = Math.abs(Math.round(totalParcelas * 100) - Math.round(valorNum * 100));

  const handleSalvar = async () => {
    if (!descricao.trim()) { showAlert('Atenção', 'Descrição é obrigatória.'); return; }
    if (valorNum <= 0)     { showAlert('Atenção', 'Valor total deve ser maior que zero.'); return; }
    if (precisaCliente && tipo === 'R' && !clienteId) { showAlert('Atenção', 'Selecione o cliente para Boleto ou Crédito Loja.'); return; }
    if (diferenca > 0)     { showAlert('Atenção', 'Soma das parcelas não confere com o valor total.'); return; }
    setSaving(true);
    try {
      const res = await fetch('./api.php?action=fin_lancar_parcelado', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo, descricao, categoria: descricao,
          valor_total: valorNum,
          forma_pagamento: formaPgto,
          entidade_id: clienteId || null,
          parcelas: parcelas.map(p => ({ valor: Number(p.valor), vencimento: p.vencimento })),
          observacoes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSavedIds(data.ids || []);
        if (!isBoleto) { showAlert('Sucesso', `${parcelas.length} parcela(s) lançada(s) com sucesso.`); onSuccess(); }
      } else { showAlert('Erro', data.message || 'Falha ao salvar.'); }
    } catch { showAlert('Erro', 'Falha ao conectar.'); }
    setSaving(false);
  };

  const handleGerarBoletos = async () => {
    if (savedIds.length === 0) return;
    setGerandoBoletos(true);
    let ok = 0; let erro = 0;
    for (const id of savedIds) {
      try {
        const res  = await fetch('./api.php?action=boleto_gerar', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ financeiro_id: id }),
        });
        const data = await res.json();
        if (data.success) ok++; else erro++;
      } catch { erro++; }
    }
    setGerandoBoletos(false);
    if (erro === 0) {
      // Abre impressão de todos os boletos gerados
      savedIds.forEach((id: number) => abrirBoleto(id));
      onSuccess();
    } else {
      showAlert('Atenção', `${ok} gerado(s), ${erro} com erro. Verifique configurações de cobrança.`);
      onSuccess();
    }
  };

  const clienteSelecionado = clientes.find(c => String(c.id) === String(clienteId));

  // Tela pós-salvar com boleto: pergunta se gera agora
  if (savedIds.length > 0 && isBoleto) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4 backdrop-blur-sm">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-indigo-50 dark:bg-indigo-900/20 flex items-center gap-3">
            <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <div>
              <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm">{parcelas.length} Parcela(s) Lançada(s)!</h3>
              <p className="text-xs text-indigo-600 dark:text-indigo-400">Forma de pagamento: Boleto Bancário</p>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-4 space-y-1">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase">Resumo</p>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{descricao}</p>
              {clienteSelecionado && <p className="text-xs text-indigo-700 dark:text-indigo-300">Cliente: {clienteSelecionado.nome || clienteSelecionado.razao_social}</p>}
              <p className="text-xs text-gray-600 dark:text-gray-300">{parcelas.length}x · Total: <span className="font-bold text-indigo-700 dark:text-indigo-300">R$ {valorNum.toFixed(2)}</span></p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">Deseja gerar os boletos agora?<br/>Você também pode gerá-los depois na lista de títulos.</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 flex gap-3">
            <button onClick={onSuccess} className="flex-1 py-2.5 bg-gray-700 dark:bg-gray-600 text-white font-bold uppercase text-xs rounded-xl hover:bg-gray-600 dark:hover:bg-gray-500 transition-colors">
              Cancelar
            </button>
            <button onClick={handleGerarBoletos} disabled={gerandoBoletos}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white font-bold uppercase text-xs rounded-xl flex items-center justify-center gap-2">
              {gerandoBoletos
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Gerando...</>
                : <><FileText className="w-3.5 h-3.5" /> Gerar e Imprimir</>}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm">Novo Lançamento — Contas a {tipoTexto}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Lançamento manual com parcelamento opcional</p>
          </div>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">

          <div>
            <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Descrição / Categoria</label>
            <input type="text" value={descricao} onChange={e => setDescricao(e.target.value)}
              placeholder="Ex: Aluguel, Fatura #123, Energia..."
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm" />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Forma de Pagamento</label>
            <select value={formaPgto} onChange={e => { setFormaPgto(e.target.value); setClienteId(''); setClienteBusca(''); }}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800">
              <option value="01">01 - Dinheiro</option>
              <option value="02">02 - Cheque</option>
              <option value="03">03 - Cartão de Crédito</option>
              <option value="04">04 - Cartão de Débito</option>
              <option value="05">05 - Crédito Loja</option>
              <option value="10">10 - Vale Alimentação</option>
              <option value="11">11 - Vale Refeição</option>
              <option value="15">15 - Boleto Bancário</option>
              <option value="17">17 - PIX</option>
              <option value="90">90 - Sem Pagamento</option>
              <option value="99">99 - Outros</option>
            </select>
          </div>

          {precisaCliente && tipo === 'R' && (
            <div className="relative">
              <label className="block text-[10px] font-bold text-indigo-500 uppercase mb-1">
                Cliente <span className="text-red-500 dark:text-red-400">*</span> (obrigatório para Boleto/Crédito Loja)
              </label>
              <ClienteSearchInput
                value={clienteSelecionado || null}
                onChange={cl => setClienteId(cl ? String(cl.id) : '')}
                placeholder="Digite nome ou CPF/CNPJ do cliente..."
              />
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Valor Total (R$)</label>
              <input type="number" step="0.01" value={valorTotal} onChange={e => setValorTotal(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Nº Parcelas</label>
              <input type="number" min="1" max="120" value={numParcelas}
                onChange={e => setNumParcelas(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Intervalo (dias)</label>
              <input type="number" min="1" value={intervaloDias}
                onChange={e => setIntervaloDias(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Primeiro Vencimento</label>
            <input type="date" value={primeiroVenc} onChange={e => setPrimeiroVenc(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm" />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Observações</label>
            <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm resize-none" />
          </div>

          {parcelas.length > 0 && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <div className="bg-gray-50 dark:bg-gray-900 px-4 py-2 flex justify-between items-center">
                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">
                  Parcelas Geradas ({parcelas.length}){isBoleto && <span className="ml-2 text-indigo-500">· Boleto</span>}
                </span>
                <span className={`text-xs font-bold ${diferenca > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  Total: {totalParcelas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
              <table className="w-full text-xs">
                <thead className="bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700">
                  <tr className="text-left">
                    <th className="px-4 py-2 font-bold text-[10px] text-gray-500 dark:text-gray-400 uppercase">#</th>
                    <th className="px-4 py-2 font-bold text-[10px] text-gray-500 dark:text-gray-400 uppercase">Vencimento</th>
                    <th className="px-4 py-2 font-bold text-[10px] text-gray-500 dark:text-gray-400 uppercase text-right">Valor (R$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {parcelas.map((p, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-2 font-bold text-gray-600 dark:text-gray-300">{p.numero}/{parcelas.length}</td>
                      <td className="px-4 py-2">
                        <input type="date" value={p.vencimento}
                          onChange={e => { const n = [...parcelas]; n[idx].vencimento = e.target.value; setParcelas(n); }}
                          className="border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-0.5 text-xs bg-white dark:bg-gray-800" />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <input type="number" step="0.01" value={Number(p.valor).toFixed(2)}
                          onChange={e => { const n = [...parcelas]; n[idx].valor = Number(e.target.value); setParcelas(n); }}
                          className="border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-0.5 text-right w-28 text-xs font-bold bg-white dark:bg-gray-800" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {diferenca > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 px-4 py-2 text-xs text-red-600 dark:text-red-400 font-bold border-t border-red-100">
                  ⚠ Diferença de {(diferenca / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} — ajuste os valores antes de salvar.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 bg-gray-700 dark:bg-gray-600 text-white text-sm font-semibold rounded-xl hover:bg-gray-600 dark:hover:bg-gray-500 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSalvar}
            disabled={saving || diferenca > 0 || !descricao.trim() || valorNum <= 0 || (precisaCliente && tipo === 'R' && !clienteId)}
            className="flex-1 py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...</> : 'Salvar'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

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
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between bg-gray-50 dark:bg-gray-900">
          <h3 className="font-bold text-gray-800 dark:text-gray-100 uppercase text-xs">Parcelamento</h3>
          <span className="font-bold text-blue-600 dark:text-blue-400">Total: R$ {total.toFixed(2)}</span>
        </div>
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="flex items-center gap-4">
            <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">Parcelas:</label>
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
        <div className="p-6 bg-gray-50 dark:bg-gray-900 flex gap-4">
          <button onClick={onCancel} className="flex-1 py-3 bg-gray-700 dark:bg-gray-600 text-white text-sm font-semibold rounded-xl hover:bg-gray-600 dark:hover:bg-gray-500 transition-colors">Cancelar</button>
          <button onClick={() => onConfirm(parcelas)} disabled={Math.abs(tP - total) > 0.01} className="flex-1 py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50">Salvar</button>
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
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <h3 className="font-bold text-gray-800 dark:text-gray-100 uppercase text-sm">Lançamento Manual</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex gap-2">
                {[['E','Entrada'],['S','Saída']].map(([v,l]) => (
                  <button key={v} onClick={() => setTipoMov(v as 'E'|'S')} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${tipoMov === v ? (v === 'E' ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white') : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>{l}</button>
                ))}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Descrição</label>
                <input value={descricao} onChange={e => setDescricao(e.target.value)} className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-sm outline-none" placeholder="Ex: Pagamento de aluguel" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Valor (R$)</label>
                <input type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-sm outline-none" placeholder="0,00" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Conta</label>
                <select value={contaId} onChange={e => setContaId(e.target.value)} className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-sm outline-none">
                  {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
            </div>
            <div className="p-6 bg-gray-50 dark:bg-gray-900 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 bg-gray-700 dark:bg-gray-600 text-white text-sm font-semibold rounded-xl hover:bg-gray-600 dark:hover:bg-gray-500 transition-colors">Cancelar</button>
              <button onClick={handleSalvar} disabled={savingMov} className="flex-1 py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50">{savingMov ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </motion.div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Saldo em Caixa" value={Number(saldo).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} icon={DollarSign} color="blue" />
        <StatCard label="Entradas (Crédito)" value={Number(totEntradas).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} icon={TrendingUp} color="green" />
        <StatCard label="Saídas (Débito)" value={Number(totSaidas).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} icon={TrendingDown} color="red" />
      </div>

      <div className="flex flex-wrap items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 gap-4">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase">De:</span>
          <input type="date" value={di} onChange={e => setDi(e.target.value)} className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-2 py-1.5 text-xs outline-none" />
          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase">Até:</span>
          <input type="date" value={df} onChange={e => setDf(e.target.value)} className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-2 py-1.5 text-xs outline-none" />
          <button onClick={fetchMovimentos} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-all">Atualizar</button>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-all">
          <span className="text-base leading-none">+</span> Lançamento Manual
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-6 py-4 font-bold uppercase text-[10px]">Data</th>
              <th className="px-6 py-4 font-bold uppercase text-[10px]">Descrição</th>
              <th className="px-6 py-4 font-bold uppercase text-[10px]">Conta</th>
              <th className="px-6 py-4 font-bold uppercase text-[10px] text-right">Entrada</th>
              <th className="px-6 py-4 font-bold uppercase text-[10px] text-right">Saída</th>
              <th className="px-6 py-4 font-bold uppercase text-[10px] text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {loading && <SkeletonTable cols={6} />}
            {!loading && movimentos.length === 0 && <EmptyState icon={History} title="Nenhum movimento encontrado" subtitle="Selecione outro período ou registre um novo lançamento" />}
            {!loading && movimentos.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all">
                <td className="px-6 py-4 text-xs text-gray-600 dark:text-gray-300">{m.data_movimento ? new Date(m.data_movimento).toLocaleDateString('pt-BR') : '-'}</td>
                <td className="px-6 py-4 text-xs font-bold text-gray-700 dark:text-gray-200">{m.historico}</td>
                <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400">{m.conta_nome || 'CAIXA GERAL'}</td>
                <td className="px-6 py-4 text-right text-xs font-bold text-emerald-600 dark:text-emerald-400">{m.tipo === 'C' ? Number(m.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : ''}</td>
                <td className="px-6 py-4 text-right text-xs font-bold text-red-500 dark:text-red-400">{m.tipo === 'D' ? Number(m.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : ''}</td>
                <td className="px-6 py-4 text-center">
                  {!m.venda_id && !m.compra_id && !m.financeiro_id && <button onClick={() => handleExcluir(m.id)} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400"><svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Modal Gerar / Visualizar Boleto ─────────────────────────────────────────
const BoletoModal = ({ titulo, onClose, showAlert }: { titulo: any; onClose: () => void; showAlert: (t: string, m: string) => void }) => {
  const [loading, setLoading]   = useState(titulo._modo === 'gerar');
  const [boleto, setBoleto]     = useState<any>(titulo.boleto_status === 'registrado' ? titulo : null);
  const [copiado, setCopiado]   = useState(false);

  useEffect(() => {
    if (titulo._modo === 'gerar') gerarBoleto();
    else setBoleto(titulo);
  }, []);

  const gerarBoleto = async () => {
    setLoading(true);
    try {
      const res  = await fetch('./api.php?action=boleto_gerar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ financeiro_id: titulo.id }),
      });
      const data = await res.json();
      if (data.success) {
        setBoleto(data.boleto);
      } else {
        showAlert('Erro', data.message || 'Falha ao gerar boleto.');
        onClose();
      }
    } catch { showAlert('Erro', 'Erro de conexão.'); onClose(); }
    finally { setLoading(false); }
  };

  const copiarLinha = () => {
    if (!boleto?.boleto_linha_digitavel) return;
    navigator.clipboard.writeText(boleto.boleto_linha_digitavel);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const brl = (v: number) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            {loading ? 'Gerando Boleto...' : 'Boleto Gerado'}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600">✕</button>
        </div>

        {/* Conteúdo */}
        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center py-10 gap-4">
              <Loader2 className="w-10 h-10 text-indigo-600 dark:text-indigo-400 animate-spin" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">Registrando boleto no banco...</p>
            </div>
          ) : boleto ? (
            <div className="space-y-4">
              {/* Info do título */}
              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4 border border-indigo-100">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold uppercase">Valor do Boleto</p>
                  <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">{brl(boleto.valor_total)}</p>
                </div>
                <div className="flex justify-between text-xs text-indigo-500">
                  <span>Vencimento: {new Date(boleto.vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                  <span>Nosso Nº: {boleto.boleto_nosso_numero || '—'}</span>
                </div>
              </div>

              {/* Linha digitável */}
              {boleto.boleto_linha_digitavel && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1.5">Linha Digitável</p>
                  <div className="flex gap-2 items-center bg-gray-50 dark:bg-gray-900 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
                    <p className="flex-1 text-xs font-mono text-gray-700 dark:text-gray-200 break-all">{boleto.boleto_linha_digitavel}</p>
                    <button onClick={copiarLinha} className={`shrink-0 p-2 rounded-lg transition-all ${copiado ? 'bg-green-100 text-green-600 dark:text-green-400' : 'bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 border border-gray-200 dark:border-gray-700'}`}>
                      {copiado ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  {copiado && <p className="text-xs text-green-600 dark:text-green-400 mt-1">✓ Copiado!</p>}
                </div>
              )}

              {/* Código de barras */}
              {boleto.boleto_codigo_barras && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1.5">Código de Barras</p>
                  <p className="text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-xl p-3 border border-gray-100 dark:border-gray-700 break-all">{boleto.boleto_codigo_barras}</p>
                </div>
              )}

              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">Status:</span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  boleto.boleto_status === 'registrado' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' :
                  boleto.boleto_status === 'pago'       ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' :
                  'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300'
                }`}>{boleto.boleto_status || 'pendente'}</span>
              </div>
            </div>
          ) : null}
        </div>

        {/* Rodapé */}
        {!loading && boleto && (
          <div className="p-5 border-t border-gray-100 dark:border-gray-700 flex gap-3">
            <button onClick={() => abrirBoleto(boleto.id)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700">
              <ExternalLink className="w-4 h-4" /> Imprimir Boleto
            </button>
            <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700">
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
