import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Send, 
  UserCheck, 
  RefreshCw, 
  CreditCard, 
  DollarSign, 
  History, 
  Search,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Edit,
  X
} from 'lucide-react';
import { motion } from 'motion/react';
import { Produto, Cliente, Venda as Nfce, Emitente, Session } from '../types/nfce';
import { Input } from './UIComponents';

const brl = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ESTADOS_BR = [
  { sigla: 'AC', nome: 'Acre' }, { sigla: 'AL', nome: 'Alagoas' }, { sigla: 'AP', nome: 'Amapá' },
  { sigla: 'AM', nome: 'Amazonas' }, { sigla: 'BA', nome: 'Bahia' }, { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' }, { sigla: 'ES', nome: 'Espírito Santo' }, { sigla: 'GO', nome: 'Goiás' },
  { sigla: 'MA', nome: 'Maranhão' }, { sigla: 'MT', nome: 'Mato Grosso' }, { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' }, { sigla: 'PA', nome: 'Pará' }, { sigla: 'PB', nome: 'Paraíba' },
  { sigla: 'PR', nome: 'Paraná' }, { sigla: 'PE', nome: 'Pernambuco' }, { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' }, { sigla: 'RN', nome: 'Rio Grande do Norte' }, { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'RO', nome: 'Rondônia' }, { sigla: 'RR', nome: 'Roraima' }, { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' }, { sigla: 'SE', nome: 'Sergipe' }, { sigla: 'TO', nome: 'Tocantins' }
];

export const GlobalMessageModal = ({ type, title, message, inputValue, onClose, onConfirm }: any) => {
  const [val, setVal] = useState(inputValue || '');
  useEffect(() => { setVal(inputValue || ''); }, [inputValue]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            {type === 'alert' && <AlertCircle className="w-6 h-6 text-blue-500" />}
            {type === 'confirm' && <HelpCircle className="w-6 h-6 text-orange-500" />}
            {type === 'prompt' && <Edit className="w-6 h-6 text-blue-500" />}
            <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          </div>
          <p className="text-gray-600 mb-6 whitespace-pre-line">{message}</p>
          
          {type === 'prompt' && (
            <input 
              type="text"
              autoFocus
              className="w-full px-4 py-3 border border-gray-200 rounded-xl mb-6 focus:ring-2 focus:ring-blue-500 outline-none"
              value={val}
              onChange={(e) => setVal(e.target.value)}
            />
          )}

          <div className="flex justify-end gap-3">
            {(type === 'confirm' || type === 'prompt') && (
              <button 
                onClick={onClose}
                className="px-5 py-2.5 text-gray-500 font-semibold hover:bg-gray-50 rounded-xl transition-colors"
              >
                Cancelar
              </button>
            )}
            <button 
              onClick={() => onConfirm(val)}
              className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
            >
              {type === 'alert' ? 'Entendido' : 'Confirmar'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export const IdentificarModal = ({ onClose, onConfirm }: { onClose: () => void; onConfirm: (dest: any) => void }) => {
  const [aba, setAba]               = useState<'buscar' | 'manual'>('buscar');
  const [busca, setBusca]           = useState('');
  const [clientes, setClientes]     = useState<Cliente[]>([]);
  const [municipios, setMunicipios] = useState<{ id: number; nome: string }[]>([]);
  const [loadingMun, setLoadingMun] = useState(false);
  const [form, setForm]             = useState<any>({ nome: '', documento: '', uf: 'GO', municipio: '', codigoMunicipio: '', logradouro: '', numero: '', bairro: '', cep: '' });
  const selClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  useEffect(() => {
    fetch('./api.php?action=clientes').then(r => r.json()).then(d => setClientes(Array.isArray(d) ? d : []));
  }, []);

  const fetchMunicipios = async (uf: string) => {
    if (!uf) return;
    setLoadingMun(true);
    try {
      const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`);
      setMunicipios((await res.json()).map((m: any) => ({ id: m.id, nome: m.nome })));
    } catch { setMunicipios([]); } finally { setLoadingMun(false); }
  };

  const filtrados = clientes.filter(c =>
    c.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    c.documento?.includes(busca)
  );

  const selecionarCadastrado = (c: Cliente) => onConfirm({
    nome: c.nome, documento: c.documento ?? '',
    logradouro: c.endereco?.logradouro, numero: c.endereco?.numero,
    bairro: c.endereco?.bairro, municipio: c.endereco?.municipio,
    codigoMunicipio: c.endereco?.codigoMunicipio, uf: c.endereco?.uf, cep: c.endereco?.cep,
    isCadastrado: true
  });

  const handleConfirmarManual = () => {
    if (!form.nome.trim()) return;
    if (form.logradouro && (!form.municipio || !form.uf || !form.cep)) return;
    onConfirm({ ...form, isCadastrado: false });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[300] p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh]">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-800 flex items-center gap-2"><UserCheck className="w-5 h-5 text-indigo-600" /> Identificar Cliente</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="flex border-b border-gray-100">
          <button onClick={() => setAba('buscar')} className={`flex-1 py-2.5 text-sm font-medium transition-colors ${aba === 'buscar' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>Buscar Cadastrado</button>
          <button onClick={() => setAba('manual')} className={`flex-1 py-2.5 text-sm font-medium transition-colors ${aba === 'manual' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>Digitar Manualmente</button>
        </div>

        <div className="flex-1 overflow-auto p-5">
          {aba === 'buscar' ? (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome ou CPF/CNPJ..." className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="space-y-1 max-h-72 overflow-auto">
                {filtrados.length === 0 ? (
                  <p className="text-center text-gray-400 py-8 text-sm">Nenhum cliente encontrado.</p>
                ) : filtrados.map(c => (
                  <button key={c.id} onClick={() => selecionarCadastrado(c)} className="w-full text-left px-4 py-3 rounded-xl hover:bg-indigo-50 transition-colors border border-transparent hover:border-indigo-100">
                    <p className="font-medium text-gray-800 text-sm">{c.nome}</p>
                    <p className="text-xs text-gray-400">{c.documento} {c.endereco?.municipio ? ` - ${c.endereco.municipio}/${c.endereco.uf}` : ''}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Input label="Nome *" value={form.nome} onChange={(e: any) => setForm((f: any) => ({ ...f, nome: e.target.value }))} /></div>
                <div className="col-span-2"><Input label="CPF / CNPJ" value={form.documento} onChange={(e: any) => setForm((f: any) => ({ ...f, documento: e.target.value }))} /></div>
              </div>
              <p className="text-xs text-gray-500 font-medium pt-1">Endereço <span className="text-gray-400">(opcional - se preenchido, todos os campos são obrigatórios)</span></p>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2"><Input label="Logradouro" value={form.logradouro || ''} onChange={(e: any) => setForm((f: any) => ({ ...f, logradouro: e.target.value }))} /></div>
                <Input label="Número" value={form.numero || ''} onChange={(e: any) => setForm((f: any) => ({ ...f, numero: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Bairro" value={form.bairro || ''} onChange={(e: any) => setForm((f: any) => ({ ...f, bairro: e.target.value }))} />
                <Input label="CEP" value={form.cep || ''} onChange={(e: any) => setForm((f: any) => ({ ...f, cep: e.target.value }))} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <select value={form.uf || ''} onChange={(e: any) => { setForm((f: any) => ({ ...f, uf: e.target.value, municipio: '', codigoMunicipio: '' })); fetchMunicipios(e.target.value); }} className={selClass}>
                    <option value="">UF</option>
                    {ESTADOS_BR.map(e => <option key={e.sigla} value={e.sigla}>{e.sigla}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Município</label>
                  <select value={form.codigoMunicipio || ''} onChange={(e: any) => { const m = municipios.find(m => String(m.id) === e.target.value); if (m) setForm((f: any) => ({ ...f, municipio: m.nome, codigoMunicipio: String(m.id) })); }} disabled={loadingMun || municipios.length === 0} className={selClass}>
                    <option value="">{loadingMun ? 'Carregando...' : 'Selecione...'}</option>
                    {municipios.map(m => <option key={m.id} value={String(m.id)}>{m.nome}</option>)}
                  </select>
                </div>
              </div>
              {!form.nome.trim() && <p className="text-xs text-red-500">* Nome é obrigatório</p>}
              {form.logradouro && (!form.municipio || !form.uf || !form.cep) && <p className="text-xs text-red-500">* Preencha todos os campos de endereço</p>}
            </div>
          )}
        </div>

        {aba === 'manual' && (
          <div className="p-5 border-t border-gray-100 flex gap-3">
            <button onClick={onClose} className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
            <button onClick={handleConfirmarManual} disabled={!form.nome.trim() || !!(form.logradouro && (!form.municipio || !form.uf || !form.cep))} className="flex-1 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">Confirmar</button>
          </div>
        )}
      </div>
    </div>
  );
};

export const TefModal = ({ pagamentoId, vendaId, numero, uniqueid: initialUniqueId, pagamentoAtual = 1, totalPagamentos = 1, onComplete, onCancel }: any) => {
  const [status, setStatus] = useState<'solicitando' | 'aguardando' | 'aprovado' | 'rejeitado' | 'erro'>('solicitando');
  const [mensagem, setMensagem] = useState('Solicitando transação ao terminal...');
  const [uniqueId, setUniqueId] = useState(initialUniqueId || '');

  useEffect(() => {
    setStatus('solicitando');
    setMensagem('Solicitando transação ao terminal...');
    setUniqueId(initialUniqueId || '');
  }, [pagamentoId]);

  useEffect(() => {
    if (status !== 'solicitando') return;
    const solicitar = async () => {
      if (initialUniqueId) {
        setStatus('aguardando');
        setMensagem('Aguardando confirmação no terminal...');
        return;
      }
      try {
        const resp = await fetch('./api.php?action=tef_solicitar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_pagamento: pagamentoId })
        });
        const d = await resp.json();
        if (d.success) {
          setUniqueId(d.uniqueid);
          setStatus('aguardando');
          setMensagem('Aguardando confirmação no terminal...');
        } else {
          setStatus('erro');
          const msgTef = d.message || 'Erro ao solicitar transação.';
          setMensagem(msgTef);
        }
      } catch {
        setStatus('erro');
        setMensagem('Erro de comunicação com o servidor.');
      }
    };
    solicitar();
  }, [status, pagamentoId]);

  useEffect(() => {
    if (status !== 'aguardando' || !uniqueId) return;
    const interval = setInterval(async () => {
      try {
        const resp = await fetch(`./api.php?action=tef_consultar&uniqueid=${uniqueId}`);
        const d = await resp.json();
        if (d.status === 4) {
          setStatus('aprovado');
          setMensagem('Pagamento aprovado!');
          clearInterval(interval);
          setTimeout(() => onComplete(vendaId), 800);
        } else if (d.status === 5 || d.status === 6) {
          setStatus('rejeitado');
          setMensagem(d.message || 'Pagamento recusado pelo terminal.');
          clearInterval(interval);
        }
      } catch { }
    }, 3000);
    return () => clearInterval(interval);
  }, [status, uniqueId]);

  const iconColor = status === 'aprovado' ? 'text-green-500' : status === 'rejeitado' || status === 'erro' ? 'text-red-500' : 'text-blue-500';

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[300] p-4">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
        <div className="p-8 text-center">
          <div className="mb-6">
            {(status === 'solicitando' || status === 'aguardando') && (
              <div className="w-16 h-16 mx-auto border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            )}
            {status === 'aprovado' && <CheckCircle className={`w-16 h-16 mx-auto ${iconColor}`} />}
            {(status === 'rejeitado' || status === 'erro') && <AlertCircle className={`w-16 h-16 mx-auto ${iconColor}`} />}
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-1">TEF - Venda #{numero}{totalPagamentos > 1 ? ` (${pagamentoAtual}/${totalPagamentos})` : ''}</h3>
          <p className="text-gray-500 text-sm mb-6">{mensagem}</p>
          {(status === 'rejeitado' || status === 'erro') && (
            <button onClick={onCancel} className="w-full py-3 bg-red-50 text-red-600 font-semibold rounded-xl hover:bg-red-100 transition-colors">Fechar (Venda Cancelada)</button>
          )}
          {(status === 'solicitando' || status === 'aguardando') && (
            <button onClick={onCancel} className="w-full py-3 text-gray-400 font-medium hover:text-gray-600 transition-colors text-sm">Cancelar</button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export const VendaModal = ({ produtos, emitente, onClose, onSave, proximoNumero, showAlert, showConfirm, session, initialItens, initialDestinatario }: {
  produtos: Produto[],
  emitente: Emitente,
  onClose: () => void,
  onSave: (venda: Nfce) => void,
  proximoNumero: number,
  showAlert: (title: string, message: string) => void,
  showConfirm: (title: string, message: string, onConfirm: () => void) => void,
  session?: Session,
  initialItens?: { produtoId: number; quantidade: number; valorUnitario: number }[],
  initialDestinatario?: any
}) => {
  const [itens, setItens] = useState<{ produtoId: number, quantidade: number, valorUnitario: number, percentualTributosNacional: number, percentualTributosEstadual: number }[]>([]);
  const [pagamentos, setPagamentos] = useState<any[]>([]);
  const [buscaProduto, setBuscaProduto] = useState('');
  const [produtosFiltrados, setProdutosFiltrados] = useState<Produto[]>([]);
  const [selectedProduto, setSelectedProduto] = useState<string>('');
  const [valorAtual, setValorAtual] = useState<number>(0);
  const [quantidade, setQuantidade] = useState<number>(1);
  const [valorDesconto, setValorDesconto] = useState<number>(0);
  const [formaPagamentoInput, setFormaPagamentoInput] = useState<string>('01');
  const [valorPagamentoInput, setValorPagamentoInput] = useState<number>(0);
  const [bandeiras, setBandeiras] = useState<any[]>([]);
  const [bandeiraSelecionada, setBandeiraSelecionada] = useState('');
  const [autorizacaoInput, setAutorizacaoInput] = useState('');
  const [isEmitting, setIsEmitting] = useState(false);
  const [tefState, setTefState] = useState<{ pagamentosIds: number[]; currentIndex: number; vendaId: number; numero: number } | null>(null);
  const [showIdentificar, setShowIdentificar] = useState(false);
  const [showParcelamento, setShowParcelamento] = useState(false);
  const [destinatario, setDestinatario] = useState<any>(null);
  const [searchIndex, setSearchIndex] = useState(-1);

  const btnAddRef = useRef<HTMLButtonElement>(null);
  const inputQtdRef = useRef<HTMLInputElement>(null);
  const inputValorRef = useRef<HTMLInputElement>(null);
  const buscaProdutoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('./api.php?action=bandeiras').then(r => r.json()).then(d => { if (Array.isArray(d)) setBandeiras(d); else setBandeiras([]); }).catch(() => setBandeiras([]));
  }, []);

  useEffect(() => {
    if (initialItens && initialItens.length > 0) {
      setItens(initialItens.map(it => ({
        produtoId: it.produtoId,
        quantidade: it.quantidade,
        valorUnitario: it.valorUnitario,
        percentualTributosNacional: 0,
        percentualTributosEstadual: 0,
      })));
    }
    if (initialDestinatario) setDestinatario(initialDestinatario);
  }, []);

  const isTefRequired = emitente.tef_required_states?.split(',').map(s => s.trim().toUpperCase()).includes(emitente.uf?.trim().toUpperCase());
  const subtotal = itens.reduce((acc, item) => acc + (item.quantidade * item.valorUnitario), 0);
  const totalDevido = Math.max(0, subtotal - valorDesconto);
  const totalPago = pagamentos.reduce((acc, p) => acc + p.valorPagamento, 0);
  const troco = Math.max(0, totalPago - totalDevido);

  useEffect(() => {
    if (pagamentos.length === 0) setValorPagamentoInput(parseFloat(totalDevido.toFixed(2)));
  }, [totalDevido]);

  const addItem = async () => {
    if (quantidade <= 0) { showAlert('Atenção', 'A quantidade deve ser maior que zero.'); return; }
    const p = produtos.find(p => p.id === Number(selectedProduto));
    if (!p || valorAtual <= 0) return;

    let nac = 0, est = 0;
    try {
      const ncmLimpo = p.ncm?.replace(/\D/g, '') || '';
      const resIbpt = await fetch(`./api.php?action=ibpt_consultar&ncm=${ncmLimpo}&descricao=${encodeURIComponent(p.descricao)}&unidade=${encodeURIComponent(p.unidadeComercial || 'UN')}&valor=${valorAtual.toFixed(2)}&gtin=${encodeURIComponent(p.codigoBarras || '')}`).then(r => r.json());
      if (resIbpt.success) { nac = resIbpt.nacional || 0; est = resIbpt.estadual || 0; }
    } catch { }

    setItens([...itens, { produtoId: p.id!, quantidade, valorUnitario: valorAtual, percentualTributosNacional: nac, percentualTributosEstadual: est }]);
    setSelectedProduto(''); setBuscaProduto(''); setQuantidade(1); setValorAtual(0);
    setTimeout(() => buscaProdutoInputRef.current?.focus(), 10);
  };

  const removeItem = (idx: number) => setItens(itens.filter((_, i) => i !== idx));

  const addPagamento = () => {
    if (valorPagamentoInput <= 0) return;
    if (!isTefRequired && ['03', '04'].includes(formaPagamentoInput) && !bandeiraSelecionada) {
      showAlert('Atenção', 'Selecione a bandeira do cartão.'); return;
    }
    const b = bandeiras.find(x => String(x.id) === bandeiraSelecionada);
    const novos = [...pagamentos, { formaPagamento: formaPagamentoInput, valorPagamento: valorPagamentoInput, tBand: b?.tpag || '99', cAut: autorizacaoInput, tpIntegra: isTefRequired ? '1' : '2' }];
    setPagamentos(novos);
    const novoTotalPago = novos.reduce((acc, p) => acc + p.valorPagamento, 0);
    setValorPagamentoInput(parseFloat(Math.max(0, totalDevido - novoTotalPago).toFixed(2)));
    setBandeiraSelecionada(''); setAutorizacaoInput('');
  };

  const removePagamento = (idx: number) => {
    const novos = pagamentos.filter((_, i) => i !== idx);
    setPagamentos(novos);
    setValorPagamentoInput(parseFloat(Math.max(0, totalDevido - novos.reduce((acc, p) => acc + p.valorPagamento, 0)).toFixed(2)));
  };

  const handleFinalizar = async () => {
    if (itens.length === 0) { showAlert("Aviso", "Adicione ao menos um item."); return; }
    setIsEmitting(true);
    const payload = {
      valorTotal: totalDevido, valorDesconto, valorTroco: troco, usuarioId: session?.usuarioId, caixaId: session?.caixaId, destinatario,
      itens: itens.map((it, idx) => ({ id: idx + 1, produtoId: it.produtoId, quantidade: it.quantidade, valorUnitario: it.valorUnitario, valorTotal: it.quantidade * it.valorUnitario, percentualTributosNacional: it.percentualTributosNacional, percentualTributosEstadual: it.percentualTributosEstadual })),
      pagamentos: pagamentos.map((p, idx) => ({ id: idx + 1, formaPagamento: p.formaPagamento, valorPagamento: p.valorPagamento, tpIntegra: p.tpIntegra, tBand: p.tBand, cAut: p.cAut }))
    };
    try {
      if (pagamentos.some(p => ['03', '04', '17'].includes(p.formaPagamento))) {
        const spResp = await fetch('./api.php?action=tem_smartpos&_=' + Date.now());
        const spData = await spResp.json();
        if (!spData.tem) {
          showAlert('TEF não disponível', spData.message || 'Integração TEF não configurada. Verifique as configurações da empresa.');
          return;
        }
        if (spData.tem) {
          const resp = await fetch('./api.php?action=salvar_pendente', { method: 'POST', body: JSON.stringify({ venda: payload }) });
          const d = await resp.json();
          if (!d.success) { showAlert("Erro", d.message); return; }
          setTefState({ pagamentosIds: d.pagamentosIds, currentIndex: 0, vendaId: d.vendaId, numero: d.numero });
          return;
        }
      }
      const response = await fetch('./api.php?action=emitir', { method: 'POST', body: JSON.stringify({ venda: payload, emitente }) });
      const result = await response.json();
      if (result.success) {
        onSave({ id: result.id, numero: result.numero || proximoNumero, status: result.status } as any);
        showConfirm("NFC-e Autorizada!", "Deseja imprimir o DANFE?", () => window.open(`./api.php?action=danfe&id=${result.id}`, '_blank'));
      } else showAlert("Erro na Emissão", result.message);
    } catch { showAlert("Erro", "Erro de conexão."); } finally { setIsEmitting(false); }
  };

  const handleTefComplete = async (vId: number) => {
    try {
      const r = await fetch(`./api.php?action=emitir_pendente&id=${vId}`).then(res => res.json());
      setTefState(null);
      if (r.success) {
        onSave({ id: r.id, numero: proximoNumero, status: r.status } as any);
        showConfirm("NFC-e Autorizada!", "Deseja imprimir o DANFE?", () => window.open(`./api.php?action=danfe&id=${r.id}`, '_blank'));
      } else showAlert("Erro", r.message);
    } catch { setTefState(null); }
  };

  return (
    <>
      {tefState && <TefModal pagamentoId={tefState.pagamentosIds[tefState.currentIndex]} vendaId={tefState.vendaId} numero={tefState.numero} pagamentoAtual={tefState.currentIndex + 1} totalPagamentos={tefState.pagamentosIds.length} onComplete={handleTefComplete} onCancel={() => setTefState(null)} />}
      {showIdentificar && <IdentificarModal onClose={() => setShowIdentificar(false)} onConfirm={(d) => { setDestinatario(d); setShowIdentificar(false); }} />}
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 flex items-center gap-4">
            <h3 className="text-xl font-semibold text-gray-800 flex-1">Nova NFC-e #{proximoNumero}</h3>
            {destinatario && <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-lg flex items-center gap-1">{destinatario.nome} <button onClick={() => setDestinatario(null)}>✕</button></span>}
            <button onClick={() => setShowIdentificar(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium flex items-center gap-2 shadow-md hover:bg-indigo-700"><UserCheck className="w-4 h-4" /> Identificar</button>
            <button onClick={handleFinalizar} disabled={isEmitting || itens.length === 0 || totalPago < totalDevido} className={`px-5 py-2 rounded-xl text-sm font-medium flex items-center gap-2 ${isEmitting || totalPago < totalDevido ? 'bg-gray-200 text-gray-400' : 'bg-green-600 text-white hover:bg-green-700 shadow-md'}`}>{isEmitting ? 'Transmitindo...' : <><Send className="w-4 h-4" /> Emitir NFC-e</>}</button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
          <div className="flex-1 overflow-auto p-6 grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="md:col-span-3 space-y-6">
              <div className="flex gap-4 items-end">
                <div className="flex-1 relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Buscar Produto</label>
                  <input ref={buscaProdutoInputRef} type="text" value={buscaProduto} placeholder="Código ou nome..." className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
                    onChange={(e) => {
                      const t = e.target.value; setBuscaProduto(t); setSelectedProduto('');
                      if (t.length < 1) { setProdutosFiltrados([]); return; }
                      const f = produtos.filter(p => p.descricao.toLowerCase().includes(t.toLowerCase()) || (p.codigoInterno || '').includes(t) || (p.codigoBarras || '').includes(t));
                      setProdutosFiltrados(f);
                      if (f.length === 1) { setSelectedProduto(String(f[0].id)); setBuscaProduto(f[0].descricao); setValorAtual(f[0].valorUnitario); setProdutosFiltrados([]); setTimeout(() => inputQtdRef.current?.focus(), 10); }
                    }} 
                  />
                  {produtosFiltrados.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-[200] max-h-60 overflow-auto">
                      {produtosFiltrados.map(p => (
                        <button key={p.id} onClick={() => { setSelectedProduto(String(p.id)); setBuscaProduto(p.descricao); setValorAtual(p.valorUnitario); setProdutosFiltrados([]); setTimeout(() => inputQtdRef.current?.focus(), 10); }} className="w-full text-left px-4 py-2 flex justify-between hover:bg-blue-50">
                          <div><p className="font-medium text-sm">{p.descricao}</p><p className="text-[10px] text-gray-400">{p.codigoInterno}</p></div>
                          <span className="text-sm font-bold text-blue-600">R$ {brl(p.valorUnitario)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="w-20"><label className="block text-sm font-medium text-gray-700 mb-1">Qtd</label><input ref={inputQtdRef} type="number" min="1" value={quantidade} onChange={e => setQuantidade(Number(e.target.value))} className="w-full px-4 py-2 border border-gray-200 rounded-lg" /></div>
                <div className="w-28"><label className="block text-sm font-medium text-gray-700 mb-1">Valor</label><input ref={inputValorRef} type="text" value={valorAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} onChange={e => setValorAtual(Number(e.target.value.replace(/\D/g, '')) / 100)} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-right font-bold" /></div>
                <button ref={btnAddRef} onClick={addItem} disabled={!selectedProduto} className="p-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-200"><Plus className="w-5 h-5" /></button>
              </div>
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50"><tr><th className="px-4 py-3">Produto</th><th className="px-4 py-3">Qtd</th><th className="px-4 py-3">Unit.</th><th className="px-4 py-3">Total</th><th></th></tr></thead>
                  <tbody className="divide-y">
                    {itens.length === 0 ? <tr><td colSpan={5} className="py-10 text-center text-gray-300 font-bold uppercase tracking-widest">Caixa Livre</td></tr> :
                      itens.map((it, i) => { const p = produtos.find(x => x.id === it.produtoId); return <tr key={i}><td className="px-4 py-3 font-medium">{p?.descricao}</td><td className="px-4 py-3">{it.quantidade}</td><td className="px-4 py-3">R$ {brl(it.valorUnitario)}</td><td className="px-4 py-3 font-bold">R$ {brl(it.quantidade * it.valorUnitario)}</td><td className="px-4 py-3 text-right"><button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button></td></tr>; })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="md:col-span-2 bg-gray-50 rounded-2xl p-5 flex flex-col">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Resumo</h4>
              <div className="space-y-4 flex-1">
                <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>R$ {brl(subtotal)}</span></div>
                <div className="flex justify-between items-center text-gray-500"><span>Desconto</span><input type="text" value={valorDesconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} onChange={e => setValorDesconto(Number(e.target.value.replace(/\D/g, '')) / 100)} className="w-24 text-right bg-transparent border-b border-gray-300 font-bold text-red-500 outline-none focus:border-blue-500" /></div>
                <div className="pt-4 border-t border-gray-100 space-y-3">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Pagamentos</label>
                  <select value={formaPagamentoInput} onChange={e => setFormaPagamentoInput(e.target.value)} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none">
                    <option value="01">Dinheiro</option><option value="17">PIX</option><option value="03">Cartão Crédito</option><option value="04">Cartão Débito</option><option value="05" disabled={!destinatario?.isCadastrado}>Crédito Loja</option>
                  </select>
                  {!isTefRequired && ['03', '04'].includes(formaPagamentoInput) && (
                    <div className="flex gap-2">
                       <select value={bandeiraSelecionada} onChange={e => setBandeiraSelecionada(e.target.value)} className="flex-1 bg-white border p-1 rounded text-xs">
                         <option value="">Bandeira...</option>{bandeiras.map(b => <option key={b.id} value={b.id}>{b.tband_opc}</option>)}
                       </select>
                       <input value={autorizacaoInput} onChange={e => setAutorizacaoInput(e.target.value)} placeholder="Aut." className="w-16 border rounded p-1 text-xs" />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input type="text" value={valorPagamentoInput.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} onChange={e => setValorPagamentoInput(Number(e.target.value.replace(/\D/g, '')) / 100)} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-right font-bold" />
                    <button onClick={addPagamento} className="w-10 h-10 bg-green-500 text-white rounded-lg hover:bg-green-600 font-bold">+</button>
                  </div>
                  <div className="space-y-1">
                    {pagamentos.map((p, i) => <div key={i} className="flex justify-between bg-white p-2 rounded border text-sm"><span>{p.formaPagamento === '01' ? 'Dinheiro' : p.formaPagamento === '17' ? 'PIX' : 'Cartão'}</span><div className="flex gap-2"><b>R$ {brl(p.valorPagamento)}</b><button onClick={() => removePagamento(i)} className="text-red-500">✕</button></div></div>)}
                  </div>
                </div>
              </div>
              <div className="mt-auto pt-6 border-t border-gray-200">
                 <div className="flex justify-between items-center mb-2">
                   <p className="text-sm font-medium text-gray-500">Total Devido</p>
                   <p className="text-2xl font-bold text-gray-800">R$ {brl(totalDevido)}</p>
                 </div>
                 {totalPago > totalDevido && (
                   <div className="flex justify-between items-center text-green-600">
                     <p className="text-sm font-semibold">Troco</p>
                     <p className="text-xl font-bold">R$ {brl(troco)}</p>
                   </div>
                 )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
};
