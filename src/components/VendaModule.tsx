import { useAppData } from '../contexts/AppDataContext';
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

const BANDEIRAS_CARTAO = [
  { id: 1,  tpag: '03', tband: '02', tband_opc: 'Mastercard',       cnpj: '05577343000137' },
  { id: 2,  tpag: '03', tband: '01', tband_opc: 'Visa Crédito',     cnpj: '31551765000143' },
  { id: 3,  tpag: '03', tband: '03', tband_opc: 'Amex',             cnpj: '60419645000195' },
  { id: 4,  tpag: '03', tband: '06', tband_opc: 'Elo Crédito',      cnpj: '09227084000175' },
  { id: 5,  tpag: '03', tband: '07', tband_opc: 'Hipercard',        cnpj: '03012230000169' },
  { id: 6,  tpag: '03', tband: '05', tband_opc: 'Diners',           cnpj: '33479023000180' },
  { id: 7,  tpag: '03', tband: '09', tband_opc: 'Cabal Crédito',    cnpj: '03766873000106' },
  { id: 8,  tpag: '03', tband: '99', tband_opc: 'Outro Crédito',    cnpj: '' },
  { id: 9,  tpag: '04', tband: '02', tband_opc: 'Mastercard Déb.',  cnpj: '05577343000137' },
  { id: 10, tpag: '04', tband: '01', tband_opc: 'Visa Débito',      cnpj: '31551765000143' },
  { id: 11, tpag: '04', tband: '06', tband_opc: 'Elo Débito',       cnpj: '09227084000175' },
  { id: 12, tpag: '04', tband: '09', tband_opc: 'Cabal Débito',     cnpj: '03766873000106' },
  { id: 13, tpag: '04', tband: '99', tband_opc: 'Outro Débito',     cnpj: '' },
];


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
        className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            {type === 'alert' && <AlertCircle className="w-6 h-6 text-blue-500" />}
            {type === 'confirm' && <HelpCircle className="w-6 h-6 text-orange-500" />}
            {type === 'prompt' && <Edit className="w-6 h-6 text-blue-500" />}
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
          </div>
          <p className="text-gray-600 dark:text-gray-300 mb-6 whitespace-pre-line">{message}</p>
          
          {type === 'prompt' && (
            <input 
              type="text"
              autoFocus
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl mb-6 focus:ring-2 focus:ring-blue-500 outline-none"
              value={val}
              onChange={(e) => setVal(e.target.value)}
            />
          )}

          <div className="flex justify-end gap-3">
            {(type === 'confirm' || type === 'prompt') && (
              <button 
                onClick={onClose}
                className="px-5 py-2.5 text-gray-500 dark:text-gray-400 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors"
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
  const { clientes, fetchClientes, produtos: produtosCtx, fetchProdutos } = useAppData();
  const [municipios, setMunicipios] = useState<{ id: number; nome: string }[]>([]);
  const [loadingMun, setLoadingMun] = useState(false);
  const [form, setForm]             = useState<any>({ nome: '', documento: '', uf: 'GO', municipio: '', codigoMunicipio: '', logradouro: '', numero: '', bairro: '', cep: '' });
  const selClass = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  useEffect(() => { fetchClientes(''); }, []);
  useEffect(() => { fetchMunicipios(form.uf); }, []);

  const fetchMunicipios = async (uf: string) => {
    if (!uf) return;
    setLoadingMun(true);
    try {
      const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`);
      setMunicipios((await res.json()).map((m: any) => ({ id: m.id, nome: m.nome })));
    } catch { setMunicipios([]); } finally { setLoadingMun(false); }
  };

  const filtrados = clientes.slice(0, 10);

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
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh]">
        <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2"><UserCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Identificar Cliente</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X className="w-5 h-5 text-gray-500 dark:text-gray-400" /></button>
        </div>
        <div className="flex border-b border-gray-100 dark:border-gray-700">
          <button onClick={() => setAba('buscar')} className={`flex-1 py-2.5 text-sm font-medium transition-colors ${aba === 'buscar' ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>Buscar Cadastrado</button>
          <button onClick={() => setAba('manual')} className={`flex-1 py-2.5 text-sm font-medium transition-colors ${aba === 'manual' ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>Digitar Manualmente</button>
        </div>

        <div className="flex-1 overflow-auto p-5">
          {aba === 'buscar' ? (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                <input type="text" value={busca} onChange={e => { const v = e.target.value; setBusca(v); clearTimeout((window as any)._clienteTimer); if (v.length === 0) fetchClientes(''); else if (v.length >= 2) { (window as any)._clienteTimer = setTimeout(() => fetchClientes(v), 400); } }} placeholder="Buscar por nome ou CPF/CNPJ..." className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="space-y-1 max-h-72 overflow-auto">
                {filtrados.length === 0 ? (
                  <p className="text-center text-gray-400 dark:text-gray-500 py-8 text-sm">Nenhum cliente encontrado.</p>
                ) : filtrados.map(c => (
                  <button key={c.id} onClick={() => selecionarCadastrado(c)} className="w-full text-left px-4 py-3 rounded-xl hover:bg-indigo-50 transition-colors border border-transparent hover:border-indigo-100">
                    <p className="font-medium text-gray-800 dark:text-gray-100 text-sm">{c.nome}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{c.documento} {c.endereco?.municipio ? ` - ${c.endereco.municipio}/${c.endereco.uf}` : ''}</p>
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
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium pt-1">Endereço <span className="text-gray-400 dark:text-gray-500">(opcional - se preenchido, todos os campos são obrigatórios)</span></p>
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Estado</label>
                  <select value={form.uf || ''} onChange={(e: any) => { setForm((f: any) => ({ ...f, uf: e.target.value, municipio: '', codigoMunicipio: '' })); fetchMunicipios(e.target.value); }} className={selClass}>
                    <option value="">UF</option>
                    {ESTADOS_BR.map(e => <option key={e.sigla} value={e.sigla}>{e.sigla}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Município</label>
                  <select value={form.codigoMunicipio || ''} onChange={(e: any) => { const m = municipios.find(m => String(m.id) === e.target.value); if (m) setForm((f: any) => ({ ...f, municipio: m.nome, codigoMunicipio: String(m.id) })); }} disabled={loadingMun || municipios.length === 0} className={selClass}>
                    <option value="">{loadingMun ? 'Carregando...' : 'Selecione...'}</option>
                    {municipios.map(m => <option key={m.id} value={String(m.id)}>{m.nome}</option>)}
                  </select>
                </div>
              </div>
              {!form.nome.trim() && <p className="text-xs text-red-500 dark:text-red-400">* Nome é obrigatório</p>}
              {form.logradouro && (!form.municipio || !form.uf || !form.cep) && <p className="text-xs text-red-500 dark:text-red-400">* Preencha todos os campos de endereço</p>}
            </div>
          )}
        </div>

        {aba === 'manual' && (
          <div className="p-5 border-t border-gray-100 dark:border-gray-700 flex gap-3">
            <button onClick={onClose} className="flex-1 px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Cancelar</button>
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

  const iconColor = status === 'aprovado' ? 'text-green-500' : status === 'rejeitado' || status === 'erro' ? 'text-red-500 dark:text-red-400' : 'text-blue-500';

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[300] p-4">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
        <div className="p-8 text-center">
          <div className="mb-6">
            {(status === 'solicitando' || status === 'aguardando') && (
              <div className="w-16 h-16 mx-auto border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 rounded-full animate-spin" />
            )}
            {status === 'aprovado' && <CheckCircle className={`w-16 h-16 mx-auto ${iconColor}`} />}
            {(status === 'rejeitado' || status === 'erro') && <AlertCircle className={`w-16 h-16 mx-auto ${iconColor}`} />}
          </div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1">TEF - Venda #{numero}{totalPagamentos > 1 ? ` (${pagamentoAtual}/${totalPagamentos})` : ''}</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">{mensagem}</p>
          {(status === 'rejeitado' || status === 'erro') && (
            <button onClick={onCancel} className="w-full py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-semibold rounded-xl hover:bg-red-100 transition-colors">Fechar (Venda Cancelada)</button>
          )}
          {(status === 'solicitando' || status === 'aguardando') && (
            <button onClick={onCancel} className="w-full py-3 text-gray-400 dark:text-gray-500 font-medium hover:text-gray-600 transition-colors text-sm">Cancelar</button>
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
  const { produtos: produtosCtx, fetchProdutos } = useAppData();
  useEffect(() => {
    if (buscaProduto.length >= 2) {
      const tl = buscaProduto.toLowerCase();
      const f = produtosCtx.filter(p =>
        p.descricao.toLowerCase().includes(tl) ||
        (p.codigoInterno||'').includes(buscaProduto) ||
        (p.codigoBarras||'').includes(buscaProduto)
      ).slice(0, 10);
      setProdutosFiltrados(f);
    } else if (buscaProduto.length === 0) {
      setProdutosFiltrados([]);
    }
  }, [produtosCtx]);
  const [termoBusca, setTermoBusca] = useState('');
  useEffect(() => {
    if (termoBusca.length >= 1) {
      const tl = termoBusca.toLowerCase();
      const f = produtosCtx.filter(p => p.descricao.toLowerCase().includes(tl) || (p.codigoInterno||'').includes(termoBusca) || (p.codigoBarras||'').includes(termoBusca)).slice(0, 10);
      setProdutosFiltrados(f);
      if (f.length === 1) { setSelectedProduto(String(f[0].id)); setBuscaProduto(f[0].descricao); setValorAtual(f[0].valorUnitario); setProdutosFiltrados([]); setTimeout(() => inputQtdRef.current?.focus(), 10); }
    }
  }, [produtosCtx]);
  const [produtosFiltrados, setProdutosFiltrados] = useState<Produto[]>([]);
  const [dropIdx, setDropIdx] = useState(-1);
  const [selectedProduto, setSelectedProduto] = useState<string>('');
  const [valorAtual, setValorAtual] = useState<number>(0);
  const [quantidade, setQuantidade] = useState<number>(1);
  const [valorDesconto, setValorDesconto] = useState<number>(0);
  const [formaPagamentoInput, setFormaPagamentoInput] = useState<string>('01');
  const [valorPagamentoInput, setValorPagamentoInput] = useState<number>(0);
  const [bandeiraSelecionada, setBandeiraSelecionada] = useState('');
  const [caixaDiaAnterior, setCaixaDiaAnterior] = useState<{bloqueado: boolean, data_abertura?: string, caixaId?: number} | null>(null);

  useEffect(() => {
    if (session?.usuarioId) {
      fetch(`./api.php?action=verificar_caixa_dia&usuarioId=${session.usuarioId}`)
        .then(r => r.json())
        .then(d => setCaixaDiaAnterior(d))
        .catch(() => {});
    }
  }, [session?.usuarioId]);
  const [autorizacaoInput, setAutorizacaoInput] = useState('');
  const [isEmitting, setIsEmitting] = useState(false);
  const [tefState, setTefState] = useState<{ pagamentosIds: number[]; currentIndex: number; vendaId: number; numero: number } | null>(null);
  const [showIdentificar, setShowIdentificar] = useState(false);
  const [showParcelamento, setShowParcelamento] = useState(false);
  const [parcelasCredito, setParcelasCredito] = useState<{ numero: number; valor: number; vencimento: string }[]>([]);
  const [pendingCreditoValor, setPendingCreditoValor] = useState(0);
  const [showPedidoModal, setShowPedidoModal] = useState(false);
  const [pedidoGerado, setPedidoGerado] = useState<{ numero: number; itens: any[]; total: number; pagamentos: any[]; data: string; cliente?: any } | null>(null);
  const [destinatario, setDestinatario] = useState<any>(null);
  const [searchIndex, setSearchIndex] = useState(-1);

  const btnAddRef = useRef<HTMLButtonElement>(null);
  const inputQtdRef = useRef<HTMLInputElement>(null);
  const inputValorRef = useRef<HTMLInputElement>(null);
  const buscaProdutoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {

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

  // Listener F8: finalizar como pedido (sem emitir NFC-e)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F8') {
        e.preventDefault();
        setShowPedidoModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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

  const addPagamento = async () => {
    if (valorPagamentoInput <= 0) return;
    // Crédito Loja: abre modal de parcelamento
    if (formaPagamentoInput === '05') {
      setPendingCreditoValor(valorPagamentoInput);
      setShowParcelamento(true);
      return;
    }
    const b = BANDEIRAS_CARTAO.find(x => String(x.id) === bandeiraSelecionada);
    let tBand = b?.tband || '99';
    let cAut = autorizacaoInput;
    let tpIntegra = isTefRequired ? '1' : '2';

    if (['03', '04'].includes(formaPagamentoInput) && !emitente.temTef) {
      tpIntegra = '2';
    }

    const novos = [...pagamentos, { formaPagamento: formaPagamentoInput, valorPagamento: valorPagamentoInput, tBand, cAut, tpIntegra }];
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

  const handleFinalizarPedido = async () => {
    if (itens.length === 0) { showAlert("Aviso", "Adicione ao menos um item."); return; }
    const formasPermitidas = ['01', '05'];
    const formasInvalidas = pagamentos.filter(p => !formasPermitidas.includes(p.formaPagamento));
    if (formasInvalidas.length > 0) {
      showAlert("Atenção", "Pedido sem NFC-e só é permitido para pagamento em Dinheiro ou Crédito Loja.");
      setShowPedidoModal(false);
      return;
    }
    if (pagamentos.length === 0 || totalPago < totalDevido) {
      showAlert("Atenção", "Adicione os pagamentos antes de finalizar o pedido.");
      setShowPedidoModal(false);
      return;
    }
    try {
      const payload = {
        valorTotal: totalDevido, valorDesconto, valorTroco: troco,
        usuarioId: session?.usuarioId, caixaId: session?.caixaId, destinatario,
        itens: itens.map((it, idx) => ({ id: idx + 1, produtoId: it.produtoId, quantidade: it.quantidade, valorUnitario: it.valorUnitario, valorTotal: it.quantidade * it.valorUnitario })),
        pagamentos: pagamentos.map((p, idx) => ({ id: idx + 1, formaPagamento: p.formaPagamento, valorPagamento: p.valorPagamento, tpIntegra: '2', tBand: '99', cAut: '', parcelas: p.parcelas || [] }))
      };
      const resp = await fetch('./api.php?action=salvar_pedido', { method: 'POST', body: JSON.stringify({ venda: payload, emitente }) });
      const data = await resp.json();
      if (data.success) {
        setPedidoGerado({ numero: data.numero, itens, total: totalDevido, pagamentos, data: new Date().toLocaleString('pt-BR'), cliente: destinatario });
        setShowPedidoModal(false);
      } else {
        showAlert("Erro", data.message || "Erro ao salvar pedido.");
        setShowPedidoModal(false);
      }
    } catch { showAlert("Erro", "Erro de conexão."); setShowPedidoModal(false); }
  };

  const handleFinalizar = async () => {
    if (itens.length === 0) { showAlert("Aviso", "Adicione ao menos um item."); return; }

    // Montar pagamentos base
    let pagsPayload = pagamentos.map((p, idx) => ({ id: idx + 1, formaPagamento: p.formaPagamento, valorPagamento: p.valorPagamento, tpIntegra: p.tpIntegra, tBand: p.tBand, cAut: p.cAut, parcelas: p.parcelas || [] }));

    // Se tem cartão ou PIX, verificar TEF antes de setIsEmitting
    if (pagamentos.some(p => ['03', '04', '17'].includes(p.formaPagamento))) {
      const spResp = await fetch('./api.php?action=tem_smartpos&_=' + Date.now());
      const spData = await spResp.json();
      if (spData.tem) {
        // TEF ativo com SmartPOS: salvar pendente e abrir fluxo SmartPOS
        setIsEmitting(true);
        const payload2 = {
          valorTotal: totalDevido, valorDesconto, valorTroco: troco, usuarioId: session?.usuarioId, caixaId: session?.caixaId, destinatario,
          itens: itens.map((it, idx) => ({ id: idx + 1, produtoId: it.produtoId, quantidade: it.quantidade, valorUnitario: it.valorUnitario, valorTotal: it.quantidade * it.valorUnitario, percentualTributosNacional: it.percentualTributosNacional, percentualTributosEstadual: it.percentualTributosEstadual })),
          pagamentos: pagsPayload
        };
        const resp = await fetch('./api.php?action=salvar_pendente', { method: 'POST', body: JSON.stringify({ venda: payload2 }) });
        const d = await resp.json();
        if (!d.success) { showAlert("Erro", d.message); setIsEmitting(false); return; }
        setTefState({ pagamentosIds: d.pagamentosIds, currentIndex: 0, vendaId: d.vendaId, numero: d.numero });
        return;
      } else {
        // Sem TEF: cartão já tem cAut do addPagamento; PIX sem card no XML
        pagsPayload = pagsPayload.map((p: any) =>
          p.formaPagamento === '17'
            ? { ...p, tpIntegra: '2', tBand: null, cAut: null }
            : p
        );
      }
    }

    setIsEmitting(true);
    const payload = {
      valorTotal: totalDevido, valorDesconto, valorTroco: troco, usuarioId: session?.usuarioId, caixaId: session?.caixaId, destinatario,
      itens: itens.map((it, idx) => ({ id: idx + 1, produtoId: it.produtoId, quantidade: it.quantidade, valorUnitario: it.valorUnitario, valorTotal: it.quantidade * it.valorUnitario, percentualTributosNacional: it.percentualTributosNacional, percentualTributosEstadual: it.percentualTributosEstadual })),
      pagamentos: pagsPayload
    };
    try {
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
      {showPedidoModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[2000]">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center">
            <div className="w-14 h-14 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1">Finalizar como Pedido</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">A venda será salva <strong>sem emitir NFC-e</strong>. Um comprovante sem valor fiscal será gerado.</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2 mb-5">Disponível apenas para pagamento em <strong>Dinheiro</strong> ou <strong>Crédito Loja</strong>.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowPedidoModal(false)} className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700">Cancelar</button>
              <button onClick={handleFinalizarPedido} className="flex-1 px-4 py-2 rounded-xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-600 shadow">Confirmar</button>
            </div>
          </div>
        </div>
      )}
      {pedidoGerado && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[2000]">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-xs">
            <div className="p-4 border-b text-center">
              <p className="font-bold text-gray-700 dark:text-gray-200 text-sm">{emitente?.razaoSocial}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">{emitente?.cnpj}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{pedidoGerado.data}</p>
              <div className="mt-2 bg-orange-50 dark:bg-orange-900/20 rounded px-2 py-1">
                <p className="text-xs font-bold text-orange-600 dark:text-orange-400">*** SEM VALOR FISCAL ***</p>
                <p className="text-xs text-orange-500">PEDIDO #{pedidoGerado.numero}</p>
              </div>
            </div>
            <div id="cupom-pedido" className="p-4 font-mono text-xs space-y-1">
              <div className="flex justify-between border-b pb-1 mb-1 text-gray-500 dark:text-gray-400">
                <span>ITEM</span><span>QTD</span><span>TOTAL</span>
              </div>
              {pedidoGerado.itens.map((it, i) => {
                const prod = produtos.find(p => p.id === it.produtoId);
                return (
                  <div key={i} className="flex justify-between">
                    <span className="flex-1 truncate">{prod?.descricao || 'Produto'}</span>
                    <span className="w-8 text-center">{it.quantidade}</span>
                    <span className="w-16 text-right">R${(it.quantidade * it.valorUnitario).toFixed(2)}</span>
                  </div>
                );
              })}
              <div className="border-t pt-2 mt-2 space-y-1">
                <div className="flex justify-between font-bold"><span>TOTAL</span><span>R$ {pedidoGerado.total.toFixed(2)}</span></div>
                {pedidoGerado.pagamentos.map((p, i) => (
                  <div key={i} className="flex justify-between text-gray-500 dark:text-gray-400">
                    <span>{p.formaPagamento === '01' ? 'Dinheiro' : 'Crédito Loja'}</span>
                    <span>R$ {p.valorPagamento.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="text-center mt-3 text-gray-400 dark:text-gray-500 border-t pt-2">
                <p>*** SEM VALOR FISCAL ***</p>
                <p>Obrigado pela preferência!</p>
              </div>
            </div>
            <div className="p-4 flex gap-2 no-print">
              <button onClick={() => {
                const itensList = pedidoGerado.itens.map(it => {
                  const prod = produtos.find((p: any) => p.id === it.produtoId);
                  return `<tr><td style="padding:1px 2px">${prod?.descricao || 'Produto'}</td><td style="padding:1px 2px;text-align:center">${it.quantidade}</td><td style="padding:1px 2px;text-align:right">R$ ${(it.quantidade * it.valorUnitario).toFixed(2)}</td></tr>`;
                }).join('');
                const pagsHtml = pedidoGerado.pagamentos.map((p: any) =>
                  `<tr><td>${p.formaPagamento === '01' ? 'Dinheiro' : 'Crédito Loja'}</td><td style="text-align:right">R$ ${p.valorPagamento.toFixed(2)}</td></tr>`
                ).join('');
                const clienteHtml = pedidoGerado.cliente?.nome
                  ? `<p style="margin:1px 0">${pedidoGerado.cliente.nome}</p>${pedidoGerado.cliente.documento ? `<p style="margin:1px 0">CPF/CNPJ: ${pedidoGerado.cliente.documento}</p>` : ''}<hr style="border-top:1px dashed #000;margin:4px 0"/>`
                  : '';
                const html = `<html><head><title>Pedido</title><style>
                  @page{size:80mm auto;margin:2mm}
                  body{font-family:'Courier New',monospace;font-size:11px;width:76mm;margin:0;padding:2mm}
                  table{width:100%;border-collapse:collapse}
                  td{font-size:11px;padding:1px 2px;vertical-align:top}
                  hr{border:none;border-top:1px dashed #000;margin:4px 0}
                  .c{text-align:center} .b{font-weight:bold} .r{text-align:right} .s{color:#666;font-size:10px}
                </style></head><body>
                  <div class="c b">${emitente?.razaoSocial || ''}</div>
                  <div class="c s">CNPJ: ${emitente?.cnpj || ''}</div>
                  <div class="c s">${pedidoGerado.data}</div>
                  <hr/>
                  <div class="c b">*** SEM VALOR FISCAL ***</div>
                  <div class="c b">PEDIDO #${String(pedidoGerado.numero).padStart(4,'0')}</div>
                  <hr/>
                  ${clienteHtml}
                  <table>
                    <thead><tr><td class="b">PRODUTO</td><td class="b c">QTD</td><td class="b r">TOTAL</td></tr></thead>
                    <tbody>${itensList}</tbody>
                  </table>
                  <hr/>
                  <table>
                    <tr><td class="b">TOTAL</td><td class="b r">R$ ${pedidoGerado.total.toFixed(2)}</td></tr>
                    ${pagsHtml}
                  </table>
                  <hr/>
                  <div class="c">*** SEM VALOR FISCAL ***</div>
                  <div class="c">Obrigado pela preferência!</div>
                </body></html>`;
                const w = window.open('', '_blank', 'width=320,height=700');
                if (w) { w.document.write(html); w.document.close(); w.focus(); setTimeout(() => { w.print(); w.close(); }, 300); }
              }} className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600">Imprimir</button>
              <button onClick={() => { setPedidoGerado(null); onSave({ id: 0, numero: 0, status: 'Pedido' } as any); }} className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700">Fechar</button>
            </div>
          </div>
        </div>
      )}
      {showParcelamento && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[2000]">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Crédito Loja — Parcelamento</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500">Total: R$ {pendingCreditoValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
            <div className="mb-4">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Número de Parcelas</label>
              <select
                className="mt-1 w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-500"
                value={parcelasCredito.length || 1}
                onChange={e => {
                  const n = parseInt(e.target.value);
                  const valorParcela = parseFloat((pendingCreditoValor / n).toFixed(2));
                  const hoje = new Date();
                  const novas = Array.from({ length: n }, (_, i) => {
                    const venc = new Date(hoje);
                    venc.setMonth(venc.getMonth() + i + 1);
                    return { numero: i + 1, valor: valorParcela, vencimento: venc.toISOString().split('T')[0] };
                  });
                  setParcelasCredito(novas);
                }}
              >
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => <option key={n} value={n}>{n}x de R$ {(pendingCreditoValor / n).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</option>)}
              </select>
            </div>
            {parcelasCredito.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
                {parcelasCredito.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 rounded-lg px-3 py-2">
                    <span className="text-xs font-bold text-purple-600 w-6">{p.numero}x</span>
                    <span className="text-sm font-bold flex-1">R$ {p.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    <input type="date" value={p.vencimento} onChange={e => {
                      const novas = [...parcelasCredito];
                      novas[i] = { ...novas[i], vencimento: e.target.value };
                      setParcelasCredito(novas);
                    }} className="border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-xs outline-none focus:border-purple-500" />
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-3 mt-2">
              <button onClick={() => { setShowParcelamento(false); setParcelasCredito([]); }} className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700">Cancelar</button>
              <button
                onClick={() => {
                  const parc = parcelasCredito.length > 0 ? parcelasCredito : [{ numero: 1, valor: pendingCreditoValor, vencimento: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0] }];
                  const novos = [...pagamentos, { formaPagamento: '05', valorPagamento: pendingCreditoValor, tBand: '99', cAut: '', tpIntegra: '2', parcelas: parc }];
                  setPagamentos(novos);
                  const novoTotalPago = novos.reduce((acc, p) => acc + p.valorPagamento, 0);
                  setValorPagamentoInput(parseFloat(Math.max(0, totalDevido - novoTotalPago).toFixed(2)));
                  setShowParcelamento(false);
                  setParcelasCredito([]);
                }}
                className="flex-1 px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-bold hover:bg-purple-700 shadow"
              >Confirmar</button>
            </div>
          </div>
        </div>
      )}
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] sm:p-2">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-gray-800 rounded-none sm:rounded-2xl w-full h-full sm:max-w-[98vw] sm:max-h-[98vh] overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-4">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 flex-1">Nova NFC-e #{proximoNumero}</h3>
            {destinatario && <span className="text-xs bg-indigo-100 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded-lg flex items-center gap-1">{destinatario.nome} <button onClick={() => setDestinatario(null)}>✕</button></span>}
            <button onClick={() => setShowIdentificar(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium flex items-center gap-2 shadow-md hover:bg-indigo-700"><UserCheck className="w-4 h-4" /> Identificar</button>
            <button onClick={handleFinalizar} disabled={isEmitting || itens.length === 0 || totalPago < totalDevido || !!caixaDiaAnterior?.bloqueado} className={`px-5 py-2 rounded-xl text-sm font-medium flex items-center gap-2 ${isEmitting || totalPago < totalDevido ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500' : 'bg-green-600 text-white hover:bg-green-700 shadow-md'}`}>{isEmitting ? 'Transmitindo...' : <><Send className="w-4 h-4" /> Emitir NFC-e</>}</button>
            <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600">✕</button>
          </div>
          <div className="flex-1 overflow-hidden p-3 sm:p-5 grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3 flex flex-col gap-4 min-h-0">
              <div className="flex gap-4 items-end">
                <div className="flex-1 relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Buscar Produto</label>
                  <input ref={buscaProdutoInputRef} type="text" value={buscaProduto} placeholder="Por código, código de barras ou nome..." className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800"
                    onChange={(e) => {
                      const t = e.target.value; setBuscaProduto(t); setSelectedProduto(''); setDropIdx(-1);
                      if (t.length < 1) { setProdutosFiltrados([]); return; }
                      const qtyMatch = t.match(/^(\d+)[*xX]\s*(.*)/);
                      const termo = qtyMatch ? qtyMatch[2] : t;
                      if (qtyMatch) { const q = parseInt(qtyMatch[1], 10); if (q > 0) setQuantidade(q); }
                      if (termo.length < 1) { setProdutosFiltrados([]); return; }
                      const tl = termo.toLowerCase();
                      clearTimeout((window as any)._produtoVendaTimer);
                      (window as any)._produtoVendaTimer = setTimeout(() => fetchProdutos(termo), 400);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowDown') { e.preventDefault(); setDropIdx(i => Math.min(i + 1, produtosFiltrados.length - 1)); }
                      else if (e.key === 'ArrowUp') { e.preventDefault(); setDropIdx(i => Math.max(i - 1, -1)); }
                      else if (e.key === 'Escape') { setProdutosFiltrados([]); setDropIdx(-1); }
                      else if (e.key === 'Enter') {
                        if (selectedProduto) { setTimeout(() => inputQtdRef.current?.focus(), 10); }
                        else if (produtosFiltrados.length > 0) {
                          const p = produtosFiltrados[dropIdx >= 0 ? dropIdx : 0];
                          setSelectedProduto(String(p.id)); setBuscaProduto(p.descricao); setValorAtual(p.valorUnitario); setProdutosFiltrados([]); setDropIdx(-1);
                          setTimeout(() => inputQtdRef.current?.focus(), 10);
                        }
                      }
                    }}
                  />
                  {produtosFiltrados.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-[200] max-h-60 overflow-auto">
                      {produtosFiltrados.map((p, idx) => (
                        <button key={p.id} onClick={() => { setSelectedProduto(String(p.id)); setBuscaProduto(p.descricao); setValorAtual(p.valorUnitario); setProdutosFiltrados([]); setDropIdx(-1); setTimeout(() => inputQtdRef.current?.focus(), 10); }} className={`w-full text-left px-4 py-2 flex justify-between ${dropIdx === idx ? 'bg-blue-100 dark:bg-blue-900/40' : 'hover:bg-blue-50 dark:hover:bg-blue-900/30'}`}>
                          <div><p className="font-medium text-sm">{p.descricao}</p><p className="text-[10px] text-gray-400 dark:text-gray-500">{p.codigoInterno}</p></div>
                          <span className="text-sm font-bold text-blue-600 dark:text-blue-400">R$ {brl(p.valorUnitario)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="w-24"><label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Qtd</label><input ref={inputQtdRef} type="number" min="1" value={quantidade} onChange={e => setQuantidade(Number(e.target.value))} onKeyDown={e => { if (e.key === 'Enter') inputValorRef.current?.focus(); }} className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg" /></div>
                <div className="w-32"><label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Valor</label><input ref={inputValorRef} type="text" value={valorAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} onChange={e => setValorAtual(Number(e.target.value.replace(/\D/g, '')) / 100)} onKeyDown={e => { if (e.key === 'Enter') addItem(); }} className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-right font-bold" /></div>
                <button ref={btnAddRef} onClick={addItem} disabled={!selectedProduto} className="p-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-200"><Plus className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden min-h-0">
                <div className="h-full overflow-y-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase">Produto</th>
                        <th className="px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase text-center w-16">Qtd</th>
                        <th className="px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase text-right w-28">Unit.</th>
                        <th className="px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase text-right w-32">Total</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {itens.length === 0
                        ? <tr><td colSpan={5} className="py-16 text-center text-gray-300 dark:text-gray-600 font-bold uppercase tracking-widest text-lg">Caixa Livre</td></tr>
                        : itens.map((it, i) => {
                            const p = produtos.find(x => x.id === it.produtoId);
                            return (
                              <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                                <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">{p?.descricao}</td>
                                <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300">{it.quantidade}</td>
                                <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">R$ {brl(it.valorUnitario)}</td>
                                <td className="px-4 py-3 text-right font-bold text-gray-800 dark:text-gray-100">R$ {brl(it.quantidade * it.valorUnitario)}</td>
                                <td className="px-4 py-3 text-right"><button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 dark:hover:text-red-400"><Trash2 className="w-4 h-4" /></button></td>
                              </tr>
                            );
                          })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="lg:col-span-2 bg-gray-50 dark:bg-gray-900 rounded-2xl p-5 flex flex-col overflow-y-auto">
              <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-6">Resumo</h4>
              {caixaDiaAnterior?.bloqueado && (
                <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-xs text-red-700 dark:text-red-300 font-semibold">
                  ⚠️ Caixa aberto em {caixaDiaAnterior.data_abertura?.split('-').reverse().join('/')} não foi fechado. Feche o caixa antes de realizar novas vendas.
                </div>
              )}
              <div className="space-y-4 flex-1">
                <div className="flex justify-between text-gray-500 dark:text-gray-400"><span>Subtotal</span><span>R$ {brl(subtotal)}</span></div>
                <div className="flex justify-between items-center text-gray-500 dark:text-gray-400"><span>Desconto</span><input type="text" value={valorDesconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} onChange={e => setValorDesconto(Number(e.target.value.replace(/\D/g, '')) / 100)} className="w-24 text-right bg-transparent border-b border-gray-300 dark:border-gray-600 font-bold text-red-500 dark:text-red-400 outline-none focus:border-blue-500" /></div>
                <div className="pt-4 border-t border-gray-100 dark:border-gray-700 space-y-3">
                  <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">Pagamentos</label>
                  <select value={formaPagamentoInput} onChange={e => setFormaPagamentoInput(e.target.value)} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm outline-none">
                    <option value="01">Dinheiro</option><option value="17">PIX</option><option value="03">Cartão Crédito</option><option value="04">Cartão Débito</option><option value="05" disabled={!destinatario?.isCadastrado}>Crédito Loja</option>
                  </select>
                  {!emitente.temTef && ['03', '04'].includes(formaPagamentoInput) && (
                    <div className="flex gap-2">
                       <select value={bandeiraSelecionada} onChange={e => setBandeiraSelecionada(e.target.value)} className="flex-1 bg-white dark:bg-gray-800 border p-1 rounded text-xs">
                         <option value="">Bandeira...</option>{BANDEIRAS_CARTAO.filter(b => b.tpag === formaPagamentoInput).map(b => <option key={b.id} value={String(b.id)}>{b.tband_opc}</option>)}
                       </select>
                       <input value={autorizacaoInput} onChange={e => setAutorizacaoInput(e.target.value)} placeholder="Autorização" className="w-32 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-2 text-xs bg-white dark:bg-gray-800" />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input type="text" value={valorPagamentoInput.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} onChange={e => setValorPagamentoInput(Number(e.target.value.replace(/\D/g, '')) / 100)} className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-right font-bold" />
                    <button onClick={addPagamento} className="w-10 h-10 bg-green-500 text-white rounded-lg hover:bg-green-600 font-bold">+</button>
                  </div>
                  <div className="space-y-1">
                    {pagamentos.map((p, i) => {
                      const banda = BANDEIRAS_CARTAO.find(b => b.tband === p.tBand);
                      const label = p.formaPagamento === '01' ? 'Dinheiro' : p.formaPagamento === '17' ? 'PIX' : p.formaPagamento === '03' ? `Crédito${banda ? ' · ' + banda.tband_opc : ''}` : p.formaPagamento === '04' ? `Débito${banda ? ' · ' + banda.tband_opc : ''}` : 'Cartão';
                      return <div key={i} className="flex justify-between bg-white dark:bg-gray-800 p-2 rounded border text-sm"><span>{label}</span><div className="flex gap-2"><b>R$ {brl(p.valorPagamento)}</b><button onClick={() => removePagamento(i)} className="text-red-500 dark:text-red-400">✕</button></div></div>;
                    })}
                  </div>
                </div>
              </div>
              <div className="mt-auto pt-6 border-t border-gray-200 dark:border-gray-700">
                 <div className="flex justify-between items-center mb-2">
                   <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Devido</p>
                   <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">R$ {brl(totalDevido)}</p>
                 </div>
                 {totalPago > totalDevido && (
                   <div className="flex justify-between items-center text-green-600 dark:text-green-400">
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
