import { maskCPFCNPJ } from './UIComponents';
import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Search, Edit, Trash2, RefreshCw, X, CheckCircle, Printer, Mail,
  MessageCircle, Wrench
} from 'lucide-react';
import { Produto, Cliente, Emitente } from '../types/nfce';

const getLocalToday = () => {
  const tzOffset = new Date().getTimezoneOffset() * 60000;
  return new Date(Date.now() - tzOffset).toISOString().split('T')[0];
};

type OsItem = { id?: number; tipo: 'produto' | 'servico'; produto_id?: number | null; descricao: string; unidade: string; quantidade: number; valor_unitario: number; valor_total: number };
type OrdemServico = {
  id?: number; numero?: number; status: string; cliente_id?: number | null;
  cliente_nome?: string; cliente_documento?: string; cliente_telefone?: string; cliente_email?: string;
  valor_total: number; observacao?: string; previsao?: string; data_criacao?: string; vendedor_id?: number | null; itens: OsItem[];
};

const STATUS_OS_COLORS: Record<string, string> = {
  Rascunho:       'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
  Aberta:         'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  'Em Andamento': 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300',
  'Concluída':    'bg-green-100 text-green-700 dark:text-green-300',
  Cancelada:      'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400',
};

export const OrdemServicoTab = ({
  clientes, produtos, vendedores, emitente, showAlert, showConfirm
}: {
  clientes: Cliente[];
  produtos: Produto[];
  vendedores: Vendedor[];
  emitente: Emitente;
  showAlert: (t: string, m: string) => void;
  showConfirm: (t: string, m: string, fn: () => void) => void;
}) => {
  // ── List state ──────────────────────────────────────────────────────────
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(false);
  const [di, setDi] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; });
  const [df, setDf] = useState(() => getLocalToday());

  // ── Email modal state ────────────────────────────────────────────────────
  const [showEmail, setShowEmail] = useState(false);
  const [emailOs, setEmailOs] = useState<OrdemServico | null>(null);
  const [emailDest, setEmailDest] = useState('');
  const [emailSending, setEmailSending] = useState(false);

  // ── View / wizard state ─────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [formStep, setFormStep] = useState<1 | 2 | 3>(1);

  // ── Form data ────────────────────────────────────────────────────────────
  const emptyOs = (): OrdemServico => ({ status: 'Rascunho', valor_total: 0, itens: [] });
  const [form, setForm] = useState<OrdemServico>(emptyOs());
  const [clienteMode, setClienteMode] = useState<'cadastrado' | 'manual'>('manual');
  const [saving, setSaving] = useState(false);

  // ── Item add state ────────────────────────────────────────────────────────
  const [tipoItem, setTipoItem] = useState<'produto' | 'servico'>('servico');
  const [buscaProd, setBuscaProd] = useState('');
  const [prodFiltrados, setProdFiltrados] = useState<Produto[]>([]);
  const [searchIdx, setSearchIdx] = useState(-1);
  const [selectedProd, setSelectedProd] = useState<Produto | null>(null);
  const [qtd, setQtd] = useState('1');
  const [vUnit, setVUnit] = useState('');
  const [unid, setUnid] = useState('UN');
  const [descServ, setDescServ] = useState('');
  const [qtdServ, setQtdServ] = useState('1');
  const [vServ, setVServ] = useState('');
  const [unidServ, setUnidServ] = useState('UN');

  const buscaRef = useRef<HTMLInputElement>(null);
  const qtdRef   = useRef<HTMLInputElement>(null);

  const setField = (f: keyof OrdemServico, v: any) => setForm(p => ({ ...p, [f]: v }));
  const calcTotal = (itens: { valor_total: number }[]) => parseFloat(itens.reduce((s, i) => s + i.valor_total, 0).toFixed(2));

  const fetchOrdens = async () => {
    setLoading(true);
    try {
      const res = await fetch(`./api.php?action=listar_os&data_inicio=${di}&data_fim=${df}`);
      const data = await res.json();
      if (Array.isArray(data)) setOrdens(data);
    } catch { /* silent */ }
    setLoading(false);
  };

  useEffect(() => { fetchOrdens(); }, [di, df]);

  const openForm = (os: OrdemServico | null) => {
    setForm(os ? { ...os } : { status: 'Rascunho', valor_total: 0, itens: [] });
    setClienteMode(os?.cliente_id ? 'cadastrado' : 'manual');
    setBuscaProd(''); setProdFiltrados([]); setSelectedProd(null);
    setQtd('1'); setVUnit(''); setUnid('UN');
    setDescServ(''); setQtdServ('1'); setVServ(''); setUnidServ('UN');
    setTipoItem('servico'); setFormStep(1); setViewMode('form');
  };

  const handleExcluir = (id: number) => {
    showConfirm('Excluir OS', 'Confirma exclusão desta ordem de serviço?', async () => {
      await fetch(`./api.php?action=excluir_os&id=${id}`);
      fetchOrdens();
    });
  };

  const handlePrint = (id: number) => window.open(`./api.php?action=os_pdf&id=${id}`, '_blank');

  const handleBusca = (termo: string) => {
    setBuscaProd(termo); setSelectedProd(null); setVUnit('');
    if (!termo) { setProdFiltrados([]); setSearchIdx(-1); return; }
    const lo = termo.toLowerCase();
    const fil = produtos.filter(p => p.descricao.toLowerCase().includes(lo) || (p.codigoInterno || '').toLowerCase().includes(lo) || (p.codigoBarras || '').includes(termo));
    setProdFiltrados(fil); setSearchIdx(-1);
    if (fil.length === 1) selecionarProduto(fil[0]);
  };

  const selecionarProduto = (p: Produto) => {
    setSelectedProd(p); setBuscaProd(p.descricao);
    setVUnit(Number(p.valorUnitario).toFixed(2).replace('.', ','));
    setUnid(p.unidadeComercial || 'UN'); setProdFiltrados([]); setSearchIdx(-1);
    setTimeout(() => { qtdRef.current?.focus(); qtdRef.current?.select(); }, 10);
  };

  const handleAddProduto = () => {
    if (!selectedProd) { showAlert('Produto', 'Selecione uma peça/produto.'); return; }
    const q = parseFloat(String(qtd).replace(/\./g, '').replace(',', '.')) || 0;
    const v = parseFloat(String(vUnit).replace(/\./g, '').replace(',', '.')) || 0;
    if (q <= 0 || v <= 0) { showAlert('Item inválido', 'Qtd e valor devem ser maiores que zero.'); return; }
    const novosItens = [...form.itens, { tipo: 'produto' as const, produto_id: selectedProd.id ?? null, descricao: selectedProd.descricao, unidade: unid, quantidade: q, valor_unitario: v, valor_total: parseFloat((q * v).toFixed(2)) }];
    setForm(p => ({ ...p, itens: novosItens, valor_total: calcTotal(novosItens) }));
    setBuscaProd(''); setSelectedProd(null); setQtd('1'); setVUnit(''); setUnid('UN');
    setTimeout(() => buscaRef.current?.focus(), 10);
  };

  const handleAddServico = () => {
    const q = parseFloat(String(qtdServ).replace(/\./g, '').replace(',', '.')) || 0;
    const v = parseFloat(String(vServ).replace(/\./g, '').replace(',', '.')) || 0;
    if (!descServ.trim() || q <= 0 || v <= 0) { showAlert('Serviço inválido', 'Preencha descrição, quantidade e valor.'); return; }
    const novosItens = [...form.itens, { tipo: 'servico' as const, produto_id: null, descricao: descServ, unidade: unidServ, quantidade: q, valor_unitario: v, valor_total: parseFloat((q * v).toFixed(2)) }];
    setForm(p => ({ ...p, itens: novosItens, valor_total: calcTotal(novosItens) }));
    setDescServ(''); setQtdServ('1'); setVServ(''); setUnidServ('UN');
  };

  const handleRemoveItem = (idx: number) => {
    const n = form.itens.filter((_, i) => i !== idx);
    setForm(p => ({ ...p, itens: n, valor_total: calcTotal(n) }));
  };

  const handleEditItem = (idx: number) => {
    const it = form.itens[idx];
    if (it.tipo === 'produto') {
      setSelectedProd(produtos.find(p => p.id === it.produto_id) || null);
      setBuscaProd(it.descricao); setQtd(String(it.quantidade).replace('.', ','));
      setVUnit(Number(it.valor_unitario).toFixed(2).replace('.', ',')); setUnid(it.unidade); setTipoItem('produto');
    } else {
      setDescServ(it.descricao); setQtdServ(String(it.quantidade).replace('.', ','));
      setVServ(Number(it.valor_unitario).toFixed(2).replace('.', ',')); setUnidServ(it.unidade); setTipoItem('servico');
    }
    handleRemoveItem(idx);
  };

  const handleClienteCadastrado = (id: string) => {
    const c = clientes.find(x => String(x.id) === id);
    if (c) setForm(p => ({ ...p, cliente_id: c.id, cliente_nome: c.nome, cliente_documento: c.documento, cliente_telefone: '', cliente_email: c.email || '' }));
  };

  const handleSalvar = async () => {
    if (form.itens.length === 0) { showAlert('Atenção', 'Adicione pelo menos um item.'); return; }
    setSaving(true);
    try {
      const res = await fetch('./api.php?action=salvar_os', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (data.success) { setViewMode('list'); fetchOrdens(); }
      else showAlert('Erro', data.message || 'Falha ao salvar.');
    } catch (err: any) { console.error('handleSalvar OS erro:', err); showAlert('Erro', 'Falha na requisição: ' + (err?.message || 'desconhecido')); }
    setSaving(false);
  };

  const handleWhatsApp = (os: OrdemServico) => {
    const num = String(os.numero ?? '').padStart(4, '0');
    const val = 'R$ ' + Number(os.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const prev = os.previsao ? new Date(os.previsao + 'T12:00:00').toLocaleDateString('pt-BR') : 'Sem prazo';
    const base = window.location.origin + window.location.pathname.replace(/\/$/, '');
    const linkPdf = `${base}/./api.php?action=os_pdf&id=${os.id}`;
    let msg = `*Ordem de Serviço Nº ${num}*\nCliente: ${os.cliente_nome || '-'}\nTotal: ${val}\nPrevisão: ${prev}\n`;
    if (os.observacao) msg += `Obs: ${os.observacao}\n`;
    msg += `\n📄 *Visualize sua OS em PDF clicando abaixo:*\n${linkPdf}`;
    const tel = (os.cliente_telefone || '').replace(/\D/g, '');
    window.open(tel ? `https://wa.me/55${tel}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleEnviarEmail = async () => {
    if (!emailOs || !emailDest) return;
    setEmailSending(true);
    const res = await fetch('./api.php?action=os_email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: emailOs.id, email: emailDest }) });
    const data = await res.json();
    setEmailSending(false);
    showAlert(data.success ? 'E-mail enviado' : 'Erro', data.message);
    if (data.success) { setShowEmail(false); setEmailDest(''); }
  };

  const fmtVal = (v: number) => 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  const fmtDt = (s?: string) => { if (!s) return '-'; const norm = s.replace(' ', 'T'); return new Date(norm.includes('T') ? norm : norm + 'T12:00:00').toLocaleDateString('pt-BR'); };
  const ic = "w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  const totalProdutos = form.itens.filter(i => i.tipo === 'produto').reduce((s, i) => s + i.valor_total, 0);
  const totalServicos = form.itens.filter(i => i.tipo === 'servico').reduce((s, i) => s + i.valor_total, 0);

  const ordensFiltradas = ordens.filter(o => {
    const q = busca.toLowerCase().trim();
    if (!q) return true;
    return String(o.numero ?? '').includes(q) || (o.cliente_nome || '').toLowerCase().includes(q);
  });

  // ── Wizard form view ──────────────────────────────────────────────────────
  if (viewMode === 'form') {
    const steps = [{ n: 1, label: 'Identificação' }, { n: 2, label: 'Itens' }, { n: 3, label: 'Finalizar' }];
    return (
      <div className="space-y-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              {form.id ? `Editar OS #${String(form.numero ?? '').padStart(4, '0')}` : 'Nova Ordem de Serviço'}
            </h2>
            <button onClick={() => setViewMode('list')} className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
              <X className="w-4 h-4" /> Cancelar
            </button>
          </div>
          <div className="flex items-center">
            {steps.map((s, i) => (
              <React.Fragment key={s.n}>
                <button onClick={() => setFormStep(s.n as 1 | 2 | 3)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${formStep === s.n ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : formStep > s.n ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${formStep === s.n ? 'bg-blue-600 text-white' : formStep > s.n ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>{s.n}</span>
                  <span className="text-sm font-medium hidden sm:block">{s.label}</span>
                </button>
                {i < steps.length - 1 && <div className={`flex-1 h-0.5 mx-2 ${formStep > s.n ? 'bg-green-400' : 'bg-gray-200 dark:bg-gray-700'}`} />}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          {formStep === 1 && (
            <div className="space-y-5 max-w-2xl mx-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Status</label>
                  <select value={form.status} onChange={e => setField('status', e.target.value)} className={ic}>
                    {['Rascunho','Aberta','Em Andamento','Concluída','Cancelada'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Previsão</label>
                  <input type="date" value={form.previsao || ''} onChange={e => setField('previsao', e.target.value)} className={ic} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Observações</label>
                  <textarea value={form.observacao || ''} onChange={e => setField('observacao', e.target.value)} rows={3} className={ic + ' resize-none'} placeholder="Defeito relatado, peças necessárias, etc." />
                </div>
                {vendedores.length > 0 && (
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Vendedor</label>
                    <select value={form.vendedor_id ? String(form.vendedor_id) : ''} onChange={e => setField('vendedor_id', e.target.value ? Number(e.target.value) : null)} className={ic}>
                      <option value="">Sem vendedor</option>
                      {vendedores.filter(v => v.ativo).map(v => (
                        <option key={v.id} value={String(v.id)}>{v.nome} ({Number(v.percentual_comissao).toFixed(2)}%)</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="border border-gray-100 dark:border-gray-700 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Cliente</span>
                  <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                    {(['cadastrado', 'manual'] as const).map(m => (
                      <button key={m} onClick={() => setClienteMode(m)} className={`px-3 py-1.5 text-xs font-medium transition-colors ${clienteMode === m ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                        {m === 'cadastrado' ? 'Cadastrado' : 'Manual'}
                      </button>
                    ))}
                  </div>
                </div>
                {clienteMode === 'cadastrado' ? (
                  <select value={form.cliente_id ? String(form.cliente_id) : ''} onChange={e => handleClienteCadastrado(e.target.value)} className={ic}>
                    <option value="">Selecione o cliente...</option>
                    {clientes.map(c => <option key={c.id} value={String(c.id)}>{c.nome}{c.documento ? ` — ${c.documento}` : ''}</option>)}
                  </select>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <input placeholder="Nome / Razão Social" value={form.cliente_nome || ''} onChange={e => setField('cliente_nome', e.target.value)} className={ic} />
                    <input placeholder="CPF / CNPJ" value={form.cliente_documento || ''} onChange={e => setField('cliente_documento', maskCPFCNPJ(e.target.value))} className={ic} />
                    <input placeholder="Telefone / WhatsApp" value={form.cliente_telefone || ''} onChange={e => setField('cliente_telefone', e.target.value)} className={ic} />
                    <input placeholder="E-mail" type="email" value={form.cliente_email || ''} onChange={e => setField('cliente_email', e.target.value)} className={ic} />
                  </div>
                )}
              </div>
            </div>
          )}

          {formStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Adicionar Item</span>
                <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                  {(['servico', 'produto'] as const).map(t => (
                    <button key={t} onClick={() => setTipoItem(t)} className={`px-3 py-1.5 text-xs font-medium transition-colors ${tipoItem === t ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                      {t === 'produto' ? 'Peça/Produto' : 'Serviço'}
                    </button>
                  ))}
                </div>
              </div>
              {tipoItem === 'produto' && (
                <div className="bg-blue-50 dark:bg-blue-900/20/50 rounded-xl p-3 space-y-2">
                  <div className="flex gap-2 items-end flex-wrap">
                    <div className="flex-1 min-w-[200px] relative">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Buscar Peça/Produto</label>
                      <input ref={buscaRef} type="text" value={buscaProd} onChange={e => handleBusca(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'ArrowDown') { e.preventDefault(); setSearchIdx(p => Math.min(p + 1, prodFiltrados.length - 1)); }
                          else if (e.key === 'ArrowUp') { e.preventDefault(); setSearchIdx(p => Math.max(p - 1, -1)); }
                          else if (e.key === 'Enter' && prodFiltrados.length > 0) { e.preventDefault(); selecionarProduto(searchIdx >= 0 ? prodFiltrados[searchIdx] : prodFiltrados[0]); }
                          else if (e.key === 'Escape') { setProdFiltrados([]); }
                        }}
                        placeholder="Código, cód. de barras ou nome..." className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500" autoComplete="off" />
                      {prodFiltrados.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-52 overflow-auto z-50">
                          {prodFiltrados.map((p, idx) => (
                            <button key={p.id} type="button" onClick={() => selecionarProduto(p)} className={`w-full text-left px-3 py-2.5 flex justify-between items-center border-b border-gray-50 dark:border-gray-700 last:border-0 transition-colors ${searchIdx === idx ? 'bg-blue-100 dark:bg-blue-900/40' : 'hover:bg-blue-50 dark:hover:bg-blue-900/30'}`}>
                              <div><p className="font-medium text-gray-800 dark:text-gray-100 text-sm">{p.descricao}</p><p className="text-xs text-gray-400 dark:text-gray-500">{p.codigoInterno}{p.codigoBarras ? ` • ${p.codigoBarras}` : ''}</p></div>
                              <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 ml-3 whitespace-nowrap">{Number(p.valorUnitario).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="w-20"><label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Unid.</label><input value={unid} onChange={e => setUnid(e.target.value)} className="w-full px-2 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                    <div className="w-24"><label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Qtd</label><input ref={qtdRef} type="text" value={qtd} onChange={e => setQtd(e.target.value.replace(/[^0-9,]/g, ''))} onKeyDown={e => e.key === 'Enter' && handleAddProduto()} className="w-full px-2 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                    <div className="w-32"><label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Valor Unit.</label><input type="text" value={vUnit} onChange={e => setVUnit(e.target.value.replace(/[^0-9,]/g, ''))} onKeyDown={e => e.key === 'Enter' && handleAddProduto()} placeholder="0,00" className="w-full px-2 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                    <button onClick={handleAddProduto} className="mb-0.5 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1 text-sm whitespace-nowrap"><Plus className="w-4 h-4" /> Adicionar</button>
                  </div>
                  {selectedProd && <p className="text-xs text-blue-600 dark:text-blue-400 pl-1">✓ {selectedProd.descricao} — {Number(selectedProd.valorUnitario).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>}
                </div>
              )}
              {tipoItem === 'servico' && (
                <div className="bg-purple-50 dark:bg-purple-900/20/50 rounded-xl p-3">
                  <div className="flex gap-2 items-end flex-wrap">
                    <div className="flex-1 min-w-[200px]"><label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Descrição do Serviço</label><input value={descServ} onChange={e => setDescServ(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddServico()} placeholder="Ex: Troca de tela, Formatação..." className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500" /></div>
                    <div className="w-20"><label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Unid.</label><input value={unidServ} onChange={e => setUnidServ(e.target.value)} className="w-full px-2 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500" /></div>
                    <div className="w-24"><label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Qtd</label><input type="text" value={qtdServ} onChange={e => setQtdServ(e.target.value.replace(/[^0-9,]/g, ''))} className="w-full px-2 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500" /></div>
                    <div className="w-32"><label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Valor</label><input type="text" value={vServ} onChange={e => setVServ(e.target.value.replace(/[^0-9,]/g, ''))} onKeyDown={e => e.key === 'Enter' && handleAddServico()} placeholder="0,00" className="w-full px-2 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500" /></div>
                    <button onClick={handleAddServico} className="mb-0.5 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-1 text-sm whitespace-nowrap"><Plus className="w-4 h-4" /> Adicionar</button>
                  </div>
                </div>
              )}
              {form.itens.length > 0 ? (
                <div className="border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-900 text-xs text-gray-500 dark:text-gray-400 uppercase border-b border-gray-100 dark:border-gray-700">
                      <tr>
                        <th className="px-3 py-2 text-left">Descrição</th><th className="px-3 py-2 text-center">Tipo</th>
                        <th className="px-3 py-2 text-center">Unid.</th><th className="px-3 py-2 text-right">Qtd</th>
                        <th className="px-3 py-2 text-right">Vlr Unit.</th><th className="px-3 py-2 text-right">Total</th><th className="px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {form.itens.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-3 py-2 max-w-[200px] truncate" title={item.descricao}>{item.descricao}</td>
                          <td className="px-3 py-2 text-center"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.tipo === 'servico' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'}`}>{item.tipo === 'servico' ? 'Serviço' : 'Peça'}</span></td>
                          <td className="px-3 py-2 text-center text-gray-500 dark:text-gray-400">{item.unidade}</td>
                          <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">{Number(item.quantidade).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}</td>
                          <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">{fmtVal(item.valor_unitario)}</td>
                          <td className="px-3 py-2 text-right font-semibold text-blue-600 dark:text-blue-400">{fmtVal(item.valor_total)}</td>
                          <td className="px-3 py-2 text-center whitespace-nowrap">
                            <button onClick={() => handleEditItem(idx)} className="p-1 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded text-blue-500 mr-1"><Edit className="w-3.5 h-3.5 inline" /></button>
                            <button onClick={() => handleRemoveItem(idx)} className="p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-red-400"><Trash2 className="w-3.5 h-3.5 inline" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                    <div className="space-y-1 text-sm w-48">
                      {totalProdutos > 0 && <div className="flex justify-between text-gray-600 dark:text-gray-300"><span>Peças</span><span className="font-medium">{fmtVal(totalProdutos)}</span></div>}
                      {totalServicos > 0 && <div className="flex justify-between text-purple-700"><span>Serviços</span><span className="font-medium">{fmtVal(totalServicos)}</span></div>}
                      <div className="flex justify-between font-bold text-blue-700 dark:text-blue-300 border-t border-gray-200 dark:border-gray-700 pt-1"><span>Total</span><span>{fmtVal(form.valor_total)}</span></div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400 dark:text-gray-500 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                  <p className="text-sm">Nenhum item adicionado. Use os campos acima para adicionar peças/produtos ou serviços.</p>
                </div>
              )}
            </div>
          )}

          {formStep === 3 && (
            <div className="space-y-5 max-w-2xl mx-auto">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Cliente:</span><span className="font-medium text-gray-800 dark:text-gray-100">{form.cliente_nome || 'Não informado'}</span></div>
                <div className="flex justify-between items-center"><span className="text-gray-500 dark:text-gray-400">Status:</span><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_OS_COLORS[form.status] ?? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>{form.status}</span></div>
                <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Previsão:</span><span className="font-medium text-gray-800 dark:text-gray-100">{form.previsao ? new Date(form.previsao + 'T12:00:00').toLocaleDateString('pt-BR') : 'Sem prazo'}</span></div>
                {form.observacao && <div className="flex justify-between gap-4"><span className="text-gray-500 dark:text-gray-400 shrink-0">Obs:</span><span className="text-gray-700 dark:text-gray-200 text-right">{form.observacao}</span></div>}
              </div>
              {form.itens.length > 0 ? (
                <div className="border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-900 text-xs text-gray-500 dark:text-gray-400 uppercase border-b border-gray-100 dark:border-gray-700">
                      <tr><th className="px-3 py-2 text-left">Descrição</th><th className="px-3 py-2 text-center">Tipo</th><th className="px-3 py-2 text-right">Qtd</th><th className="px-3 py-2 text-right">Unit.</th><th className="px-3 py-2 text-right">Total</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {form.itens.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2 text-gray-800 dark:text-gray-100">{item.descricao}</td>
                          <td className="px-3 py-2 text-center"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.tipo === 'servico' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'}`}>{item.tipo === 'servico' ? 'Serviço' : 'Peça'}</span></td>
                          <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">{Number(item.quantidade).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}</td>
                          <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">{fmtVal(item.valor_unitario)}</td>
                          <td className="px-3 py-2 text-right font-semibold text-blue-600 dark:text-blue-400">{fmtVal(item.valor_total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                    <div className="space-y-1 text-sm w-48">
                      {totalProdutos > 0 && <div className="flex justify-between text-gray-600 dark:text-gray-300"><span>Peças</span><span className="font-medium">{fmtVal(totalProdutos)}</span></div>}
                      {totalServicos > 0 && <div className="flex justify-between text-purple-700"><span>Serviços</span><span className="font-medium">{fmtVal(totalServicos)}</span></div>}
                      <div className="flex justify-between font-bold text-blue-700 dark:text-blue-300 border-t border-gray-200 dark:border-gray-700 pt-1 text-base"><span>Total</span><span>{fmtVal(form.valor_total)}</span></div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-sm text-red-500 dark:text-red-400 py-4">Nenhum item adicionado. Volte para a etapa anterior.</p>
              )}
              <div className="flex justify-center pt-2">
                <button onClick={handleSalvar} disabled={saving || form.itens.length === 0} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  {saving ? 'Salvando...' : 'Salvar OS'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── List view ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <span>De:</span>
          <input type="date" value={di} onChange={e => setDi(e.target.value)} className="border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <span>Até:</span>
          <input type="date" value={df} onChange={e => setDf(e.target.value)} className="border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button onClick={fetchOrdens} className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"><RefreshCw className="w-4 h-4" /> Atualizar</button>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <input type="text" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Nº OS ou nome..." className="pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-56" />
        </div>
        <div className="flex-1" />
        <button onClick={() => openForm(null)} className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" /> Nova OS
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Nº</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Cliente</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Abertura</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Previsão</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase text-right">Total</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">Carregando...</td></tr>}
              {!loading && ordensFiltradas.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">{busca ? 'Nenhuma OS encontrada.' : 'Nenhuma OS no período. Clique em "Nova OS" para começar.'}</td></tr>
              )}
              {ordensFiltradas.map(os => (
                <tr key={os.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">{String(os.numero ?? '').padStart(4, '0')}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-200 max-w-[180px] truncate">{os.cliente_nome || <span className="text-gray-400 dark:text-gray-500 italic">Sem cliente</span>}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{fmtDt(os.data_criacao)}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{fmtDt(os.previsao)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-blue-600 dark:text-blue-400">{fmtVal(os.valor_total)}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_OS_COLORS[os.status] ?? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>{os.status}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button title="Editar" onClick={() => openForm(os)} className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400"><Edit className="w-4 h-4" /></button>
                      <button title="PDF" onClick={() => handlePrint(os.id!)} className="p-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300"><Printer className="w-4 h-4" /></button>
                      <button title="E-mail" onClick={() => { setEmailOs(os); setEmailDest(os.cliente_email || ''); setShowEmail(true); }} className="p-1.5 hover:bg-purple-50 rounded-lg text-purple-600"><Mail className="w-4 h-4" /></button>
                      <button title="WhatsApp" onClick={() => handleWhatsApp(os)} className="p-1.5 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400"><MessageCircle className="w-4 h-4" /></button>
                      <button title="Excluir" onClick={() => handleExcluir(os.id!)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg text-red-500 dark:text-red-400"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showEmail && emailOs && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200]">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2"><Mail className="w-5 h-5 text-purple-600" /> Enviar por E-mail</h3>
              <button onClick={() => setShowEmail(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X className="w-5 h-5 text-gray-400 dark:text-gray-500" /></button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">OS Nº {String(emailOs.numero ?? '').padStart(4, '0')}</p>
            <input type="email" placeholder="E-mail do destinatário" value={emailDest} onChange={e => setEmailDest(e.target.value)} className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setShowEmail(false)} className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700">Cancelar</button>
              <button onClick={handleEnviarEmail} disabled={emailSending || !emailDest} className="flex-1 bg-purple-600 text-white rounded-lg py-2 text-sm hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {emailSending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                {emailSending ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
