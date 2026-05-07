import { SkeletonTable, useDebounce, Pagination } from './UIComponents';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Search, RefreshCw, X, Printer, 
  ShieldCheck, FileDown, Trash2, Mail, Send, 
  Download, QrCode, CornerUpLeft, ChevronDown, 
  ChevronRight, CheckCircle, XCircle, AlertCircle,
  DollarSign, Edit, Trash, Plus, Edit3, MessageCircle } from 'lucide-react';
import { StatCard, Input } from './UIComponents';
import { Nfce, Nfe, Produto, Cliente, Medida } from '../types/nfce';

// ── WaModal ───────────────────────────────────────────────────────────────────
const WaModal = ({ onClose, onSend, sending, defaultPhone = '' }: { onClose: () => void; onSend: (phone: string) => void; sending: boolean; defaultPhone?: string }) => {
  const [phone, setPhone] = React.useState(defaultPhone);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-80 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-green-500" />
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">Enviar DANFE por WhatsApp</h3>
        </div>
        <input
          type="tel" placeholder="Telefone com DDD (ex: 11999999999)"
          value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-green-500"
        />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Cancelar</button>
          <button onClick={() => onSend(phone)} disabled={sending || phone.length < 10} className="flex-1 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-1.5">
            {sending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <MessageCircle className="w-3.5 h-3.5" />}
            {sending ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  );
};
// ─────────────────────────────────────────────────────────────────────────────


const getLocalToday = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
};

const downloadXml = (url: string, filename: string) => {
    fetch(url)
        .then(r => r.blob())
        .then(blob => {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = filename;
            a.click();
            URL.revokeObjectURL(a.href);
        });
};

export const VendasTab = ({ vendas, onCancelar, onSincronizar, onRetryTef, onExcluir, onEmailDoc, onDevolucao }: {
    vendas: Nfce[],
    onCancelar: (id: number) => void,
    onSincronizar: (id: number) => void,
    onRetryTef: (id: number) => void,
    onExcluir: (id: number) => void,
    onEmailDoc: (id: number, modelo: number, defaultEmail?: string) => void,
    onDevolucao?: (id: number, modelo: number) => void
}) => {
    const dataHoje = getLocalToday();
    const vendasHoje = vendas.filter(v => v.dataEmissao && v.dataEmissao.startsWith(dataHoje));
    const [busca, setBusca] = useState('');
  const debouncedBusca = useDebounce(busca);
  const [waTarget, setWaTarget] = useState<{id: number; action: string; filename: string; caption: string; phone?: string} | null>(null);
  const [waSending, setWaSending] = useState(false);

  const sendWhatsApp = async (phone: string) => {
    if (!waTarget) return;
    setWaSending(true);
    try {
      const r = await fetch('/api/whatsapp/send-document', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...waTarget, phone })
      });
      const d = await r.json();
      if (d.success) { setWaTarget(null); }
      else { alert('Falha ao enviar: ' + (d.message || 'Erro desconhecido')); }
    } catch { alert('Erro ao conectar com o servidor.'); }
    setWaSending(false);
  };
    const vendasFiltradas = vendasHoje.filter(v => {
        const q = debouncedBusca.toLowerCase().trim();
        if (!q) return true;
        return String(v.numero).includes(q) || String(v.clienteId || '').toLowerCase().includes(q);
    });
    const totalHoje = vendasHoje.filter(v => v.status === 'Autorizada').reduce((acc, v) => acc + (Number(v.valorTotal) || 0), 0);
    const emitidasCard = vendasHoje.filter(v => v.status === 'Autorizada').length;
    return (
        <div className="space-y-6">
          {waTarget && <WaModal onClose={() => setWaTarget(null)} onSend={sendWhatsApp} sending={waSending} defaultPhone={waTarget.phone || ''} />}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Hoje" value={totalHoje.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} icon={DollarSign} color="blue" />
                <StatCard label="Autorizadas" value={emitidasCard.toString()} icon={CheckCircle} color="green" />
                <StatCard label="Canceladas" value={vendasHoje.filter(v => v.status === 'Cancelada').length.toString()} icon={XCircle} color="red" />
                <StatCard label="Contingência" value={vendasHoje.filter(v => v.status === 'Contingencia' || v.status === 'Contingência').length.toString()} icon={AlertCircle} color="orange" />
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
                    <div className="relative max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                        <input type="text" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar Nº cupom ou cliente..." className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">Nº/Série</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">Data/Hora</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">Cliente</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase text-right">Valor</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase text-center">Status</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {vendasFiltradas.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400 dark:text-gray-500 italic">
                                    {debouncedBusca ? 'Nenhum resultado.' : 'Nenhuma venda hoje.'}
                                </td></tr>
                            ) : vendasFiltradas.map((v, i) => (
                                <tr key={v.id ?? i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all">
                                    <td className="px-4 py-3 text-xs font-bold text-gray-700 dark:text-gray-200">{v.numero}/{v.serie || 1}</td>
                                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">{v.dataEmissao ? new Date(v.dataEmissao).toLocaleDateString('pt-BR') + ' ' + new Date(v.dataEmissao).toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'}) : '-'}</td>
                                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">{v.clienteNome || 'Consumidor Final'}</td>
                                    <td className="px-4 py-3 text-xs font-bold text-right">{Number(v.valorTotal || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${v.status === 'Autorizada' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' : v.status === 'Cancelada' ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400' : 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300'}`}>{v.status}</span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            {v.status === 'Autorizada' && <button onClick={() => window.open(`./api.php?action=danfe&id=${v.id}`, '_blank')} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400" title="DANFE"><FileText className="w-3.5 h-3.5" /></button>}
                                            {v.status === 'Autorizada' && <button onClick={() => setWaTarget({ id: v.id, action: 'danfe', filename: `nfce_${v.numero}.pdf`, caption: `NFCe N\xba ${String(v.numero).padStart(6,'0')}`, phone: ((v as any).cliente_telefone || '').replace(/\D/g,'') })} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-green-600 dark:hover:text-green-400" title="Enviar WhatsApp"><MessageCircle className="w-3.5 h-3.5" /></button>}
                                            {v.status === 'Autorizada' && onEmailDoc && <button onClick={() => onEmailDoc(v.id, 65)} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-blue-500" title="Email"><Send className="w-3.5 h-3.5" /></button>}
                                            {v.status === 'Autorizada' && <button onClick={() => downloadXml(`./api.php?action=nfce_download_xml&id=${v.id}`, `nfce_${v.numero}.xml`)} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-green-600" title="XML"><Download className="w-3.5 h-3.5" /></button>}
                                            {v.status === 'Autorizada' && onDevolucao && <button onClick={() => onDevolucao(v.id, 65)} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-orange-500" title="Devolução"><RefreshCw className="w-3.5 h-3.5" /></button>}
                                            {v.status === 'Autorizada' && onCancelar && <button onClick={() => onCancelar(v.id)} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-500" title="Cancelar"><X className="w-3.5 h-3.5" /></button>}
                                            {v.status === 'Contingencia' && onSincronizar && <button onClick={() => onSincronizar(v.id)} className="p-1.5 text-blue-400 hover:text-blue-600 dark:hover:text-blue-400" title="Sincronizar"><RefreshCw className="w-3.5 h-3.5" /></button>}
                                            {v.status === 'PendenteTEF' && onRetryTef && <button onClick={() => onRetryTef(v.id)} className="p-1.5 text-amber-400 hover:text-amber-600" title="Tentar TEF novamente"><RefreshCw className="w-3.5 h-3.5" /></button>}
                                            {v.status !== 'Autorizada' && onExcluir && <button onClick={() => onExcluir(v.id)} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400" title="Excluir"><Trash2 className="w-3.5 h-3.5" /></button>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export const GeralNfeTab = ({ showAlert, showConfirm, showPrompt, onEmailDoc, onDevolucao, emitente }: any) => {
    const [cceModal, setCceModal] = React.useState<{open: boolean, nfe: any}>({open: false, nfe: null});
    const [nfeList, setNfeList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [di, setDi] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`; });
    const [df, setDf] = useState(() => new Date().toISOString().split('T')[0]);
    const [busca, setBusca] = useState('');
    const debouncedBusca = useDebounce(busca);
    const [nfePage, setNfePage] = useState(1);
    const [nfePagination, setNfePagination] = useState({ total: 0, pages: 0 });
    const [waTarget, setWaTarget] = useState<{id: number; action: string; filename: string; caption: string; phone?: string} | null>(null);
    const [waSending, setWaSending] = useState(false);

    const sendWhatsApp = async (phone: string) => {
        if (!waTarget) return;
        setWaSending(true);
        try {
            const r = await fetch('/api/whatsapp/send-document', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...waTarget, phone })
            });
            const d = await r.json();
            if (d.success) setWaTarget(null);
            else alert('Falha: ' + (d.message || 'Erro desconhecido'));
        } catch { alert('Erro ao conectar com o servidor.'); }
        setWaSending(false);
    };

    const fetchNfeList = async (page = nfePage) => {
        setLoading(true);
        try {
            const p = new URLSearchParams({ action: 'nfe_listar', data_inicio: di, data_fim: df, page: String(page), limit: '50' });
            if (debouncedBusca) p.set('busca', debouncedBusca);
            const resp = await fetch(`./api.php?${p}`);
            const data = await resp.json();
            if (data && Array.isArray(data.data)) {
                setNfeList(data.data);
                setNfePagination({ total: data.total, pages: data.pages });
            }
        } catch {} finally { setLoading(false); }
    };
    useEffect(() => { setNfePage(1); }, [di, df, debouncedBusca]);
    useEffect(() => { fetchNfeList(nfePage); }, [nfePage, di, df, debouncedBusca]);
    const lista = nfeList;
    const totAutorizado = lista.filter(n => n.status === 'Autorizada' && n.finalidade !== '4' && n.finalidade !== 4 && !(n.natureza_operacao || '').toUpperCase().includes('DEVOL')).reduce((a, n) => a + Number(n.valor_total || 0), 0);
    const qtdAutorizadas = lista.filter(n => n.status === 'Autorizada').length;
    const qtdCanceladas = lista.filter(n => n.status === 'Cancelada').length;
    const qtdPendentes = lista.filter(n => !['Autorizada','Cancelada'].includes(n.status)).length;
    return (
        <div className="space-y-4">
            {waTarget && <WaModal onClose={() => setWaTarget(null)} onSend={sendWhatsApp} sending={waSending} defaultPhone={waTarget.phone || ''} />}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Autorizado" value={totAutorizado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} icon={DollarSign} color="blue" />
                <StatCard label="Autorizadas" value={qtdAutorizadas.toString()} icon={CheckCircle} color="green" />
                <StatCard label="Canceladas" value={qtdCanceladas.toString()} icon={XCircle} color="red" />
                <StatCard label="Pendentes" value={qtdPendentes.toString()} icon={AlertCircle} color="orange" />
            </div>
            <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase">Data Início</span>
                <input type="date" value={di} onChange={e => setDi(e.target.value)} className="border border-gray-200 dark:border-gray-700 rounded-xl px-2 py-1.5 text-xs outline-none" />
                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase">Data Fim</span>
                <input type="date" value={df} onChange={e => setDf(e.target.value)} className="border border-gray-200 dark:border-gray-700 rounded-xl px-2 py-1.5 text-xs outline-none" />
                <button onClick={() => fetchNfeList()} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-all flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Atualizar</button>
                <button onClick={() => downloadXml(`./api.php?action=nfe_baixar_xml_lote&data_inicio=${di}&data_fim=${df}`, `NFe_XMLs_${di}_${df}.zip`)} className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-xl hover:bg-green-700 transition-all flex items-center gap-1"><Download className="w-3 h-3" /> XML Lote</button>
                <button onClick={() => showPrompt && showPrompt('Enviar XML ao Contador', 'Informe o e-mail do contador:', async (email: string) => { if (!email) return; const r = await fetch(`./api.php?action=nfe_enviar_xml_contador&data_inicio=${di}&data_fim=${df}&email=${encodeURIComponent(email)}`, {method:'GET'}); const d = await r.json(); showAlert && showAlert(d.success ? 'Enviado' : 'Erro', d.message || ''); }, emitente?.emailContador || '')} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-all flex items-center gap-1"><Send className="w-3 h-3" /> Enviar Contador</button>
                <div className="relative ml-auto flex-1 max-w-xs">
                    <Search className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input type="text" placeholder="Buscar Nº Nota, Cliente ou Natureza..." value={busca} onChange={e => setBusca(e.target.value)} className="w-full border border-gray-200 dark:border-gray-700 rounded-xl pl-8 pr-3 py-1.5 text-xs outline-none" />
                </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                        <tr>
                            <th className="px-6 py-4 font-bold uppercase text-[10px]">Nº/Série</th>
                            <th className="px-6 py-4 font-bold uppercase text-[10px]">Data</th>
                            <th className="px-6 py-4 font-bold uppercase text-[10px]">Natureza / Cliente</th>
                            <th className="px-6 py-4 font-bold uppercase text-[10px] text-right">Valor</th>
                            <th className="px-6 py-4 font-bold uppercase text-[10px]">Status</th>
                            <th className="px-6 py-4 font-bold uppercase text-[10px] text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {loading && <SkeletonTable cols={6} />}
                        {!loading && lista.length === 0 && <tr><td colSpan={6} className="px-6 py-8 text-center text-xs text-gray-400 dark:text-gray-500">Nenhuma NF-e encontrada.</td></tr>}
                        {!loading && lista.map((n: any) => (
                            <tr key={n.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all">
                                <td className="px-6 py-4 text-xs font-bold text-gray-700 dark:text-gray-200">{n.numero}/{n.serie || 1}</td>
                                <td className="px-6 py-4 text-xs text-gray-600 dark:text-gray-300">{n.data_emissao ? new Date(n.data_emissao).toLocaleDateString('pt-BR') : '-'}</td>
                                <td className="px-6 py-4 text-xs text-gray-600 dark:text-gray-300"><div>{n.natureza_operacao || '-'}</div><div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{n.cliente_nome || ''}{n.cliente_documento ? ` · ${n.cliente_documento}` : ''}</div></td>
                                <td className="px-6 py-4 text-xs font-bold text-gray-700 dark:text-gray-200 text-right">{Number(n.valor_total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${n.status === 'Autorizada' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' : n.status === 'Cancelada' ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400' : 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300'}`}>{n.status}</span></td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        {n.status === 'Autorizada' && <button onClick={() => window.open(`./api.php?action=nfe_danfe&id=${n.id}`, '_blank')} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400" title="DANFE"><FileText className="w-3.5 h-3.5" /></button>}
                                        {n.status === 'Autorizada' && <button onClick={() => setWaTarget({ id: n.id, action: 'nfe_danfe', filename: `nfe_${n.numero}.pdf`, caption: `NFe N\xba ${String(n.numero).padStart(6,'0')}`, phone: (n.cliente_telefone || '').replace(/\D/g,'') })} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-green-600 dark:hover:text-green-400" title="WhatsApp"><MessageCircle className="w-3.5 h-3.5" /></button>}
                                        {n.status === 'Autorizada' && onEmailDoc && <button onClick={() => onEmailDoc(n.id, 'nfe')} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-blue-500" title="Email"><Send className="w-3.5 h-3.5" /></button>}
                                        {n.status === 'Autorizada' && <button onClick={() => downloadXml(`./api.php?action=nfe_download_xml&id=${n.id}`, `nfe_${n.numero}.xml`)} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-green-600" title="XML"><Download className="w-3.5 h-3.5" /></button>}
                                        {n.status === 'Autorizada' && onDevolucao && <button onClick={() => onDevolucao(n.id)} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-orange-500" title="Devolução"><RefreshCw className="w-3.5 h-3.5" /></button>}
                                        {n.status === 'Autorizada' && <button onClick={() => setCceModal({open: true, nfe: n})} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400" title="Carta de Correção"><Edit3 className="w-3.5 h-3.5" /></button>}
                                        {n.status !== 'Autorizada' && <button onClick={() => {}} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400" title="Excluir"><Trash2 className="w-3.5 h-3.5" /></button>}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {nfePagination.pages > 1 && <Pagination page={nfePage} pages={nfePagination.pages} total={nfePagination.total} limit={50} onChange={p => setNfePage(p)} />}
            </div>
            {cceModal.open && <CceModal nfe={cceModal.nfe} showAlert={showAlert} onClose={() => setCceModal({open: false, nfe: null})} />}
        </div>
    );
};
const CceModal = ({ nfe, showAlert, onClose }: any) => {
    const [cceList, setCceList] = React.useState<any[]>([]);
    const [correcao, setCorrecao] = React.useState('');
    const [loading, setLoading] = React.useState(true);
    const [enviando, setEnviando] = React.useState(false);
    const fetchCce = async () => {
        setLoading(true);
        const r = await fetch(`./api.php?action=nfe_listar_cce&id=${nfe.id}`);
        const d = await r.json();
        setCceList(Array.isArray(d) ? d : []);
        setLoading(false);
    };
    React.useEffect(() => { fetchCce(); }, []);
    const enviar = async () => {
        if (correcao.trim().length < 15) {
            showAlert('Correção curta', 'A correção deve ter no mínimo 15 caracteres.');
            return;
        }
        setEnviando(true);
        const r = await fetch(`./api.php?action=nfe_enviar_cce&id=${nfe.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correcao: correcao.trim() })
        });
        const d = await r.json();
        setEnviando(false);
        if (d.success) {
            showAlert('CCe Autorizada', d.message || 'Carta de correção enviada com sucesso.');
            setCorrecao('');
            fetchCce();
        } else {
            showAlert('Erro ao enviar CCe', d.message || 'Não foi possível enviar.');
        }
    };
    const cceAutorizadas = cceList.filter(c => c.status === 'Autorizada').length;
    const restantes = 20 - cceAutorizadas;
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col" style={{height: 'calc(100vh - 4rem)', maxHeight: '750px'}}>
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Carta de Correção Eletrônica</h2>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">NFe {nfe.numero}/{nfe.serie || 1} — {restantes} de 20 disponíveis</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600"><X className="w-5 h-5" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Nova Correção (mín. 15 e máx. 1000 caracteres)</label>
                        <textarea value={correcao} onChange={e => setCorrecao(e.target.value)} rows={4}
                            placeholder="Descreva a correção a ser aplicada na NFe..."
                            className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
                        <div className="flex items-center justify-between mt-2">
                            <p className="text-[10px] text-gray-400 dark:text-gray-500">{correcao.length}/1000 caracteres</p>
                            <button onClick={enviar} disabled={enviando || restantes <= 0}
                                className={`px-5 py-2 text-white font-bold text-xs uppercase rounded-xl transition-colors ${enviando || restantes <= 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>
                                {enviando ? 'Enviando...' : 'Enviar CCe'}
                            </button>
                        </div>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Histórico</p>
                        {loading ? (
                            <div className="px-6 py-4"><div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-3 w-1/2 mx-auto"></div></div>
                        ) : cceList.length === 0 ? (
                            <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-6">Nenhuma carta de correção emitida.</p>
                        ) : (
                            <div className="space-y-2">
                                {cceList.map((c: any) => (
                                    <div key={c.id} className="border border-gray-100 dark:border-gray-700 rounded-xl p-3">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs font-bold text-gray-700 dark:text-gray-200">CCe #{c.numero_sequencia}</span>
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${c.status === 'Autorizada' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400'}`}>{c.status}</span>
                                        </div>
                                        <p className="text-xs text-gray-600 dark:text-gray-300 mb-1">{c.correcao}</p>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] text-gray-400 dark:text-gray-500">Protocolo: {c.protocolo || '-'}</span>
                                            <div className="flex items-center gap-2">
                                                {c.status === 'Autorizada' && (
                                                    <button onClick={() => window.open(`./api.php?action=nfe_cce_pdf&id=${c.id}`, '_blank')}
                                                        className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 flex items-center gap-1">
                                                        <FileText className="w-3 h-3" /> PDF
                                                    </button>
                                                )}
                                                <span className="text-[10px] text-gray-400 dark:text-gray-500">{c.created_at ? new Date(c.created_at).toLocaleString('pt-BR') : ''}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                    <button onClick={onClose} className="px-5 py-2 text-gray-500 dark:text-gray-400 font-bold text-xs uppercase hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">Fechar</button>
                </div>
            </div>
        </div>
    );
};

export const NfeDashboardTab = ({ nfeList, showAlert, showPrompt, onNovaNfe, onCancelarNfe, onExcluirNfe, onRefresh, onEmailDoc, onDevolucao, onRetryTef }: any) => {
    const [cceModalNfe, setCceModalNfe] = React.useState<{open: boolean, nfe: any}>({open: false, nfe: null});
    const [busca, setBusca] = useState('');
    const debouncedBusca = useDebounce(busca);
    const [waTarget, setWaTarget] = useState<{id: number; action: string; filename: string; caption: string; phone?: string} | null>(null);
    const [waSending, setWaSending] = useState(false);

    useEffect(() => { onRefresh?.(); }, []);

    const sendWhatsApp = async (phone: string) => {
        if (!waTarget) return;
        setWaSending(true);
        try {
            const r = await fetch('/api/whatsapp/send-document', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...waTarget, phone })
            });
            const d = await r.json();
            if (d.success) setWaTarget(null);
            else alert('Falha: ' + (d.message || 'Erro desconhecido'));
        } catch { alert('Erro ao conectar com o servidor.'); }
        setWaSending(false);
    };

    const hoje = getLocalToday();
    const listaHoje = (nfeList || []).filter((n: any) => n.data_emissao && n.data_emissao.startsWith(hoje));
    const lista = listaHoje.filter((n: any) =>
        !debouncedBusca || String(n.numero || '').includes(debouncedBusca) || (n.natureza_operacao || '').toLowerCase().includes(debouncedBusca.toLowerCase()) || (n.cliente_nome || '').toLowerCase().includes(debouncedBusca.toLowerCase())
    );
    const totAutorizado = lista.filter((n: any) => n.status === 'Autorizada' && n.finalidade !== '4' && n.finalidade !== 4 && !(n.natureza_operacao || '').toUpperCase().includes('DEVOL')).reduce((a: number, n: any) => a + Number(n.valor_total || 0), 0);
    const qtdAutorizadas = lista.filter((n: any) => n.status === 'Autorizada').length;
    const qtdCanceladas = lista.filter((n: any) => n.status === 'Cancelada').length;
    const qtdPendentes = lista.filter((n: any) => !['Autorizada','Cancelada'].includes(n.status)).length;
    return (
        <div className="space-y-4">
            {waTarget && <WaModal onClose={() => setWaTarget(null)} onSend={sendWhatsApp} sending={waSending} defaultPhone={waTarget.phone || ''} />}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Autorizado" value={totAutorizado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} icon={DollarSign} color="blue" />
                <StatCard label="Autorizadas" value={qtdAutorizadas.toString()} icon={CheckCircle} color="green" />
                <StatCard label="Canceladas" value={qtdCanceladas.toString()} icon={XCircle} color="red" />
                <StatCard label="Pendentes" value={qtdPendentes.toString()} icon={AlertCircle} color="orange" />
            </div>
            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input type="text" placeholder="Buscar Nº Nota, Cliente ou Natureza..." value={busca} onChange={e => setBusca(e.target.value)} className="w-full border border-gray-200 dark:border-gray-700 rounded-xl pl-8 pr-3 py-1.5 text-xs outline-none" />
                </div>
                <button onClick={() => onRefresh?.()} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-all flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Atualizar</button>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                        <tr>
                            <th className="px-6 py-4 font-bold uppercase text-[10px]">Nº/Série</th>
                            <th className="px-6 py-4 font-bold uppercase text-[10px]">Data</th>
                            <th className="px-6 py-4 font-bold uppercase text-[10px]">Natureza / Cliente</th>
                            <th className="px-6 py-4 font-bold uppercase text-[10px] text-right">Valor</th>
                            <th className="px-6 py-4 font-bold uppercase text-[10px]">Status</th>
                            <th className="px-6 py-4 font-bold uppercase text-[10px] text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {lista.length === 0 && <tr><td colSpan={6} className="px-6 py-8 text-center text-xs text-gray-400 dark:text-gray-500">Nenhuma NF-e hoje.</td></tr>}
                        {lista.map((n: any) => (
                            <tr key={n.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all">
                                <td className="px-6 py-4 text-xs font-bold text-gray-700 dark:text-gray-200">{n.numero}/{n.serie || 1}</td>
                                <td className="px-6 py-4 text-xs text-gray-600 dark:text-gray-300">{n.data_emissao ? new Date(n.data_emissao).toLocaleDateString('pt-BR') : '-'}</td>
                                <td className="px-6 py-4 text-xs text-gray-600 dark:text-gray-300"><div>{n.natureza_operacao || '-'}</div><div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{n.cliente_nome || ''}{n.cliente_documento ? ` · ${n.cliente_documento}` : ''}</div></td>
                                <td className="px-6 py-4 text-xs font-bold text-gray-700 dark:text-gray-200 text-right">{Number(n.valor_total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${n.status === 'Autorizada' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' : n.status === 'Cancelada' ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400' : 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300'}`}>{n.status}</span></td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        {n.status === 'Autorizada' && <button onClick={() => window.open(`./api.php?action=nfe_danfe&id=${n.id}`, '_blank')} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400" title="DANFE"><FileText className="w-3.5 h-3.5" /></button>}
                                        {n.status === 'Autorizada' && <button onClick={() => setWaTarget({ id: n.id, action: 'nfe_danfe', filename: `nfe_${n.numero}.pdf`, caption: `NFe N\xba ${String(n.numero).padStart(6,'0')}`, phone: (n.cliente_telefone || '').replace(/\D/g,'') })} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-green-600 dark:hover:text-green-400" title="WhatsApp"><MessageCircle className="w-3.5 h-3.5" /></button>}
                                        {n.status === 'Autorizada' && onEmailDoc && <button onClick={() => onEmailDoc(n.id, 'nfe')} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-blue-500" title="Email"><Send className="w-3.5 h-3.5" /></button>}
                                        {n.status === 'Autorizada' && <button onClick={() => downloadXml(`./api.php?action=nfe_download_xml&id=${n.id}`, `nfe_${n.numero}.xml`)} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-green-600" title="XML"><Download className="w-3.5 h-3.5" /></button>}
                                        {n.status === 'Autorizada' && onDevolucao && <button onClick={() => onDevolucao(n.id)} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-orange-500" title="Devolução"><RefreshCw className="w-3.5 h-3.5" /></button>}
                                        {n.status === 'Autorizada' && <button onClick={() => setCceModalNfe({open: true, nfe: n})} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400" title="Carta de Correção"><Edit3 className="w-3.5 h-3.5" /></button>}
                                        {n.status === 'Autorizada' && onCancelarNfe && <button onClick={() => onCancelarNfe(n.id)} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-500" title="Cancelar"><X className="w-3.5 h-3.5" /></button>}
                                        {n.status !== 'Autorizada' && onExcluirNfe && <button onClick={() => onExcluirNfe(n.id)} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400" title="Excluir"><Trash2 className="w-3.5 h-3.5" /></button>}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {cceModalNfe.open && <CceModal nfe={cceModalNfe.nfe} showAlert={showAlert} onClose={() => setCceModalNfe({open: false, nfe: null})} />}
        </div>
    );
};
export const GeralNfceTab = ({ showAlert, showConfirm, showPrompt, onEmailDoc, onDevolucao, onCancelar, onRetryTef, onExcluir, emitente }: any) => {
    const [nfceList, setNfceList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [di, setDi] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`; });
    const [df, setDf] = useState(() => new Date().toISOString().split('T')[0]);
    const [busca, setBusca] = useState('');
  const debouncedBusca = useDebounce(busca);
    const [waTarget, setWaTarget] = useState<{id: number; action: string; filename: string; caption: string; phone?: string} | null>(null);
    const [waSending, setWaSending] = useState(false);

    const sendWhatsApp = async (phone: string) => {
        if (!waTarget) return;
        setWaSending(true);
        try {
            const r = await fetch('/api/whatsapp/send-document', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...waTarget, phone })
            });
            const d = await r.json();
            if (d.success) setWaTarget(null);
            else alert('Falha: ' + (d.message || 'Erro desconhecido'));
        } catch { alert('Erro ao conectar com o servidor.'); }
        setWaSending(false);
    };

    const fetchList = async () => {
        setLoading(true);
        try {
            const resp = await fetch(`./api.php?action=vendas&data_inicio=${di}&data_fim=${df}`);
            const data = await resp.json();
            if (Array.isArray(data)) setNfceList(data);
        } catch {} finally { setLoading(false); }
    };

    useEffect(() => { fetchList(); }, [di, df]);

    const lista = nfceList.filter(n => !debouncedBusca || String(n.numero || '').includes(debouncedBusca) || (n.cliente_nome || n.clienteNome || '').toLowerCase().includes(debouncedBusca.toLowerCase()));
    const totAutorizado = lista.filter(n => n.status === 'Autorizada').reduce((a, n) => a + Number(n.valor_total || n.valorTotal || 0), 0);
    const qtdAutorizadas = lista.filter(n => n.status === 'Autorizada').length;
    const qtdCanceladas = lista.filter(n => n.status === 'Cancelada').length;
    const qtdPendentes = lista.filter(n => !['Autorizada','Cancelada'].includes(n.status)).length;

    return (
        <div className="space-y-4">
            {waTarget && <WaModal onClose={() => setWaTarget(null)} onSend={sendWhatsApp} sending={waSending} defaultPhone={waTarget.phone || ''} />}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Autorizado" value={totAutorizado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} icon={DollarSign} color="blue" />
                <StatCard label="Autorizadas" value={qtdAutorizadas.toString()} icon={CheckCircle} color="green" />
                <StatCard label="Canceladas" value={qtdCanceladas.toString()} icon={XCircle} color="red" />
                <StatCard label="Pendentes" value={qtdPendentes.toString()} icon={AlertCircle} color="orange" />
            </div>
            <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase">Data Início</span>
                <input type="date" value={di} onChange={e => setDi(e.target.value)} className="border border-gray-200 dark:border-gray-700 rounded-xl px-2 py-1.5 text-xs outline-none" />
                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase">Data Fim</span>
                <input type="date" value={df} onChange={e => setDf(e.target.value)} className="border border-gray-200 dark:border-gray-700 rounded-xl px-2 py-1.5 text-xs outline-none" />
                <button onClick={fetchList} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-all flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Atualizar</button>
                <button onClick={() => downloadXml(`./api.php?action=baixar_xml_lote&data_inicio=${di}&data_fim=${df}`, `NFCe_XMLs_${di}_${df}.zip`)} className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-xl hover:bg-green-700 transition-all flex items-center gap-1"><Download className="w-3 h-3" /> XML Lote</button>
                <button onClick={() => showPrompt && showPrompt('Enviar XML ao Contador', 'Informe o e-mail do contador:', async (email: string) => { if (!email) return; const r = await fetch(`./api.php?action=enviar_xml_contador&data_inicio=${di}&data_fim=${df}&email=${encodeURIComponent(email)}`, {method:'GET'}); const d = await r.json(); showAlert && showAlert(d.success ? 'Enviado' : 'Erro', d.message || ''); }, emitente?.emailContador || '')} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-all flex items-center gap-1"><Send className="w-3 h-3" /> Enviar Contador</button>
                <div className="relative ml-auto flex-1 max-w-xs">
                    <Search className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input type="text" placeholder="Buscar Nº Cupom ou Cliente..." value={busca} onChange={e => setBusca(e.target.value)} className="w-full border border-gray-200 dark:border-gray-700 rounded-xl pl-8 pr-3 py-1.5 text-xs outline-none" />
                </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                        <tr>
                            <th className="px-6 py-4 font-bold uppercase text-[10px]">Nº/Série</th>
                            <th className="px-6 py-4 font-bold uppercase text-[10px]">Data</th>
                            <th className="px-6 py-4 font-bold uppercase text-[10px]">Cliente</th>
                            <th className="px-6 py-4 font-bold uppercase text-[10px] text-right">Valor</th>
                            <th className="px-6 py-4 font-bold uppercase text-[10px]">Status</th>
                            <th className="px-6 py-4 font-bold uppercase text-[10px] text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {loading && <SkeletonTable cols={6} />}
                        {!loading && lista.length === 0 && <tr><td colSpan={6} className="px-6 py-8 text-center text-xs text-gray-400 dark:text-gray-500">Nenhuma NFC-e encontrada.</td></tr>}
                        {!loading && lista.map((n: any) => (
                            <tr key={n.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all">
                                <td className="px-6 py-4 text-xs font-bold text-gray-700 dark:text-gray-200">{n.numero}/{n.serie || 1}</td>
                                <td className="px-6 py-4 text-xs text-gray-600 dark:text-gray-300">{(n.data_emissao || n.dataEmissao) ? new Date(n.data_emissao || n.dataEmissao).toLocaleDateString('pt-BR') : '-'}</td>
                                <td className="px-6 py-4 text-xs text-gray-600 dark:text-gray-300">{n.cliente_nome || n.clienteNome || 'Consumidor Final'}</td>
                                <td className="px-6 py-4 text-xs font-bold text-gray-700 dark:text-gray-200 text-right">{Number(n.valor_total || n.valorTotal || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${n.status === 'Autorizada' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' : n.status === 'Cancelada' ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400' : 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300'}`}>{n.status}</span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        {n.status === 'Autorizada' && <button onClick={() => window.open(`./api.php?action=danfe&id=${n.id}`, '_blank')} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400" title="DANFE"><FileText className="w-3.5 h-3.5" /></button>}
                                        {n.status === 'Autorizada' && <button onClick={() => setWaTarget({ id: n.id, action: 'danfe', filename: `nfce_${n.numero}.pdf`, caption: `NFCe N\xba ${String(n.numero).padStart(6,'0')}`, phone: (n.cliente_telefone || n.clienteTelefone || '').replace(/\D/g,'') })} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-green-600 dark:hover:text-green-400" title="WhatsApp"><MessageCircle className="w-3.5 h-3.5" /></button>}
                                        {n.status === 'Autorizada' && onEmailDoc && <button onClick={() => onEmailDoc(n.id, 65)} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-blue-500" title="Email"><Send className="w-3.5 h-3.5" /></button>}
                                        {n.status === 'Autorizada' && <button onClick={() => downloadXml(`./api.php?action=nfce_download_xml&id=${n.id}`, `nfce_${n.numero}.xml`)} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-green-600" title="XML"><Download className="w-3.5 h-3.5" /></button>}
                                        {n.status === 'Autorizada' && onDevolucao && <button onClick={() => onDevolucao(n.id, 65)} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-orange-500" title="Devolução"><RefreshCw className="w-3.5 h-3.5" /></button>}
                                        {n.status === 'Autorizada' && onCancelar && <button onClick={() => onCancelar(n.id)} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-500" title="Cancelar"><X className="w-3.5 h-3.5" /></button>}
                                        {n.status === 'PendenteTEF' && onRetryTef && <button onClick={() => onRetryTef(n.id)} className="p-1.5 text-amber-400 hover:text-amber-600" title="Tentar TEF"><RefreshCw className="w-3.5 h-3.5" /></button>}
                                        {n.status !== 'Autorizada' && onExcluir && <button onClick={() => onExcluir(n.id)} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400" title="Excluir"><Trash2 className="w-3.5 h-3.5" /></button>}
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
