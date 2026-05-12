import React, { useState, useEffect } from 'react';
import type { Session } from '../App';
import FormAlert from './FormAlert';
import { X, DollarSign } from 'lucide-react';
const brl = (v: number) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const AbrirCaixaModal = ({ session, onClose, onAberto }: { session: Session; onClose: () => void; onAberto: (caixaId: number) => void }) => {
  const [troco, setTroco]     = useState('0,00');
  const [loading, setLoading] = useState(false);
  const [erro, setErro]       = useState('');

  const handleAbrir = async () => {
    setLoading(true); setErro('');
    const trocoVal = parseFloat(troco.replace(',', '.')) || 0;
    try {
      const res = await fetch('./api.php?action=abrir_caixa', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuarioId: session.usuarioId, nomeUsuario: session.nome, trocoInicial: trocoVal }),
      });
      const data = await res.json();
      if (data.success) onAberto(data.caixaId);
      else setErro(data.message || 'Erro ao abrir caixa.');
    } catch { setErro('Erro de comunicação.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200]">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center"><DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" /></div>
          <div><h3 className="font-semibold text-gray-800 dark:text-gray-100">Abrir Caixa</h3><p className="text-xs text-gray-500 dark:text-gray-400">{session.nome}</p></div>
        </div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Troco Inicial (R$)</label>
        <input type="text" value={troco} onChange={e => setTroco(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 mb-4" />
        <FormAlert message={erro} theme="light" />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Cancelar</button>
          <button onClick={handleAbrir} disabled={loading} className="flex-1 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
            {loading ? 'Abrindo...' : 'Abrir Caixa'}
          </button>
        </div>
      </div>
    </div>
  );
};

// â€ â‚¬â€ â‚¬ Fechar Caixa â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬
const FecharCaixaModal = ({ caixaId, showConfirm, onClose, onFechado }: { caixaId: number; showConfirm: any; onClose: () => void; onFechado: () => void }) => {
  const [relatorio, setRelatorio] = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [fechando, setFechando]   = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  const formaLabel: Record<string, string> = {
    '01': 'Dinheiro', '02': 'Cheque', '03': 'Cartão Crédito', '04': 'Cartão Débito',
    '05': 'Crédito Loja', '10': 'Vale Alimentação', '11': 'Vale Refeição',
    '12': 'Vale Presente', '13': 'Vale Combustível', '15': 'Boleto', '17': 'PIX', '90': 'Sem Pagamento', '99': 'Outros',
  };

  useEffect(() => {
    fetch(`./api.php?action=relatorio_caixa&caixaId=${caixaId}`)
      .then(r => r.json()).then(setRelatorio).finally(() => setLoading(false));
  }, [caixaId]);

    const handleFechar = async () => {
    setFechando(true);
    try {
      const res = await fetch('./api.php?action=fechar_caixa', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caixaId }),
      });
      const data = await res.json();
      if (data.success) {
        onFechado();
        setTimeout(() => {
          window.open(`relatorio_caixa.php?caixaId=${caixaId}&print=1`, '_blank', 'noopener,noreferrer');
        }, 300);
      } else {
        setFechando(false);
      }
    } catch (e) {
      console.error(e);
      setFechando(false);
    }
  };

  const totalVendas = relatorio?.vendas?.filter((v: any) => ['Autorizada','Contingencia'].includes(v.status)).reduce((a: number, v: any) => a + parseFloat(v.valor_total), 0) ?? 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2"><DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" /> Fechar Caixa</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X className="w-5 h-5 text-gray-500 dark:text-gray-400" /></button>
        </div>
        <div className="p-5 max-h-[60vh] overflow-auto">
          {loading ? <p className="text-center text-gray-400 dark:text-gray-500 py-8">Carregando relatório...</p> : (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center">
                <p className="text-xs text-green-600 dark:text-green-400 font-medium uppercase">Total de Vendas</p>
                <p className="text-3xl font-bold text-green-700 dark:text-green-300">{totalVendas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                <p className="text-xs text-green-600 dark:text-green-400">{relatorio?.vendas?.filter((v: any) => ['Autorizada','Contingencia'].includes(v.status)).length ?? 0} vendas autorizadas</p>
              </div>
              {relatorio?.pagamentos?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Por Forma de Pagamento</p>
                  <div className="space-y-1">
                    {relatorio.pagamentos.map((p: any, i: number) => (
                      <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-50 dark:border-gray-700">
                        <span className="text-gray-600 dark:text-gray-300">{formaLabel[p.forma_pagamento] ?? p.forma_pagamento}</span>
                        <span className="font-medium">{parseFloat(p.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {relatorio?.vendas?.length > 0 && (
                <div className="pt-2">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 border-t border-gray-100 dark:border-gray-700 pt-3">Vendas Realizadas (Prévia)</p>
                  <div className="max-h-40 overflow-auto border border-gray-100 dark:border-gray-700 rounded-lg">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
                        <tr>
                          <th className="px-3 py-2">Nº</th>
                          <th className="px-3 py-2">Total</th>
                          <th className="px-3 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                        {relatorio.vendas.map((v: any, i: number) => (
                          <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-3 py-1.5 font-mono">#{v.numero}</td>
                            <td className="px-3 py-1.5 font-medium">R$ {brl(v.valor_total)}</td>
                            <td className="px-3 py-1.5"><span className={v.status === 'Autorizada' ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}>{v.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="p-5 border-t border-gray-100 dark:border-gray-700 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Sair</button>
          <button
            onClick={async () => {
              try {
                const res = await fetch(`./api.php?action=relatorio_caixa_pdf&caixaId=${caixaId}`);
                if (!res.ok) throw new Error('Erro ao gerar PDF');
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.target = '_blank'; a.rel = 'noopener';
                document.body.appendChild(a); a.click();
                setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
              } catch(e) { alert('Erro ao gerar relatório: ' + e); }
            }}
            disabled={loading}
            className="px-4 py-2 text-sm border border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50"
          >
            🖨️ Imprimir
          </button>
          <button onClick={() => setConfirmando(true)} disabled={fechando || loading} className="flex-1 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
            {fechando ? 'Fechando...' : 'Fechar Caixa'}
          </button>
        </div>

        {confirmando && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[300]">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/40 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 dark:text-gray-100">Confirmar Fechamento</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Esta ação não pode ser desfeita</p>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 mb-4 text-sm text-gray-700 dark:text-gray-200">
                <p>Total de vendas: <strong>{totalVendas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{relatorio?.vendas?.filter((v: any) => ['Autorizada','Contingencia'].includes(v.status)).length ?? 0} vendas autorizadas</p>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-5">Deseja realmente fechar o caixa agora?</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmando(false)} className="flex-1 px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Cancelar</button>
                <button onClick={() => { setConfirmando(false); handleFechar(); }} className="flex-1 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold">
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// â€ â‚¬â€ â‚¬ Usuários â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬
type Usuario = { id?: number; nome: string; login: string; senha?: string; perfil: 'admin' | 'operador'; ativo: number };
type PreCadastro = { id: number; nome: string; email: string; cnpj: string; razao_social: string; telefone: string; login_desejado: string; status: string; created_at: string };

// ── Vendedores ──────────────────────────────────────────────
type Vendedor = { id?: number; nome: string; documento?: string; telefone?: string; email?: string; percentual_comissao: number; ativo: number };


export { AbrirCaixaModal, FecharCaixaModal };
