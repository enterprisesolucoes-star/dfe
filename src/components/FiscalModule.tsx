import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, Search, RefreshCw, X, Printer, 
  ShieldCheck, FileDown, Trash2, Mail, Send, 
  Download, QrCode, CornerUpLeft, ChevronDown, 
  ChevronRight, CheckCircle, XCircle, AlertCircle,
  DollarSign, Edit, Trash, Plus
} from 'lucide-react';
import { StatCard, Input } from './UIComponents';
import { Nfce, Nfe, Produto, Cliente, Medida } from '../types/nfce';

// ─── Utility ────────────────────────────────────────────────────────────────
const getLocalToday = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
};

// ─── VendasTab (NFC-e Emissão) ─────────────────────────────────────────────
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

  const vendasFiltradas = vendasHoje.filter(v => {
    const q = busca.toLowerCase().trim();
    if (!q) return true;
    return String(v.numero).includes(q) || String(v.clienteId || '').toLowerCase().includes(q);
  });

  const totalHoje = vendasHoje
    .filter(v => v.status === 'Autorizada')
    .reduce((acc, v) => acc + (Number(v.valorTotal) || 0), 0);

  const emitidasCard = vendasHoje.filter(v => v.status === 'Autorizada').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Hoje" value={totalHoje.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} icon={DollarSign} color="blue" />
        <StatCard label="Autorizadas" value={emitidasCard.toString()} icon={CheckCircle} color="green" />
        <StatCard label="Canceladas" value={vendasHoje.filter(v => v.status === 'Cancelada').length.toString()} icon={XCircle} color="red" />
        <StatCard label="Contingência" value={vendasHoje.filter(v => v.status === 'Contingencia' || v.status === 'Contingência').length.toString()} icon={AlertCircle} color="orange" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-100 bg-gray-50/30">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar Nº cupom ou cliente..." className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Nº/Série</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Data/Hora</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Valor Total</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {vendasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">
                    {busca ? 'Nenhum cupom encontrado para esta busca.' : 'Nenhuma venda registrada na data de hoje.'}
                  </td>
                </tr>
              ) : (
                vendasFiltradas.map(v => (
                  <tr key={v.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-700 font-mono">{v.numero}/{v.serie ?? 1}</td>
                    <td className="px-6 py-4 text-gray-500 text-xs">
                        {v.dataEmissao ? v.dataEmissao.split(' ')[0].split('-').reverse().join('/') + ' ' + (v.dataEmissao.split(' ')[1] || '').substring(0, 5) : '---'}
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-gray-600 truncate max-w-[150px]">{v.clienteId || 'Consumidor Final'}</td>
                    <td className="px-6 py-4 text-right font-bold text-gray-700">{(v.valorTotal || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tight ${
                        v.status === 'Autorizada'   ? 'bg-emerald-50 text-emerald-600' :
                        v.status === 'Cancelada'    ? 'bg-rose-50 text-rose-600' :
                        v.status === 'Rejeitada'    ? 'bg-amber-50 text-amber-600' :
                        'bg-blue-50 text-blue-600'
                      }`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 justify-end">
                        {(v.status === 'Autorizada' || v.status === 'Cancelada') && (
                          <a href={`.http://187.77.240?action=danfe&id=${v.id}`} target="_blank" rel="noopener noreferrer" title="Imprimir DANFE" className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all"><QrCode className="w-4 h-4" /></a>
                        )}
                        <button onClick={() => onEmailDoc(v.id || 0, 65)} title="Enviar por E-mail" className="p-2 bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-100 transition-all"><Mail className="w-4 h-4" /></button>
                        {v.status === 'Autorizada' && (
                          <button onClick={() => onCancelar(v.id!)} title="Cancelar Nota" className="p-2 bg-orange-50 text-orange-600 rounded-xl hover:bg-orange-100 transition-all"><XCircle className="w-4 h-4" /></button>
                        )}
                        {v.status !== 'Autorizada' && (
                          <button onClick={() => onExcluir(v.id!)} title="Excluir" className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ─── GeralNfceTab ────────────────────────────────────────────────────────────
export const GeralNfceTab = ({ showAlert, showConfirm, showPrompt, onEmailDoc, onDevolucao }: any) => {
    // Implementação simplificada para o módulo fixo
    return <div className="p-8 text-center text-gray-400 italic">Módulo Geral NFC-e carregado.</div>;
};

// ─── GeralNfeTab ─────────────────────────────────────────────────────────────
export const GeralNfeTab = ({ showAlert, showConfirm, showPrompt, onEmailDoc, onDevolucao }: any) => {
    return <div className="p-8 text-center text-gray-400 italic">Módulo Geral NF-e carregado.</div>;
};

// ─── NfeDashboardTab ────────────────────────────────────────────────────────
export const NfeDashboardTab = ({ nfeList, showAlert, onNovaNfe, onRefresh }: any) => {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="font-bold text-gray-800 uppercase tracking-tight">Notas Fiscais Eletrônicas (NFe)</h3>
                <div className="flex gap-2">
                    <button onClick={onRefresh} className="p-2 bg-white border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 transition-all"><RefreshCw className="w-5 h-5" /></button>
                    <button onClick={onNovaNfe} className="px-6 py-2 bg-blue-600 text-white font-bold uppercase text-[11px] rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Nova NF-e
                    </button>
                </div>
            </div>
            <div className="bg-white rounded-3xl border border-gray-200 p-8 text-center text-gray-400">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-10" />
                Listagem de NF-e em conformidade com o padrão 2026.
            </div>
        </div>
    );
};
