import type { Vendedor } from '../contexts/AppDataContext';
import React, { useState, useEffect } from 'react';
import { Plus, CheckCircle, Edit, Trash2, RefreshCw, X } from 'lucide-react';

const VendedoresTab = ({ showAlert, showConfirm }: { showAlert: (t: string, m: string) => void; showConfirm: (t: string, m: string, cb: () => void) => void }) => {
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [showModal, setShowModal]   = useState(false);
  const [editando, setEditando]     = useState<Vendedor | null>(null);
  const [saving, setSaving]         = useState(false);
  const [form, setForm]             = useState<Vendedor>({ nome: '', documento: '', telefone: '', email: '', percentual_comissao: 0, ativo: 1 });

  const carregar = () =>
    fetch('./api.php?action=listar_vendedores')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setVendedores(d); });

  useEffect(() => { carregar(); }, []);

  const abrirModal = (v: Vendedor | null) => {
    setEditando(v);
    setForm(v ? { ...v } : { nome: '', documento: '', telefone: '', email: '', percentual_comissao: 0, ativo: 1 });
    setShowModal(true);
  };

  const handleSalvar = async () => {
    if (!form.nome.trim()) { showAlert('Atenção', 'Nome é obrigatório.'); return; }
    if (form.percentual_comissao < 0 || form.percentual_comissao > 100) { showAlert('Atenção', 'Percentual deve estar entre 0 e 100.'); return; }
    setSaving(true);
    const res = await fetch('./api.php?action=salvar_vendedor', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, id: editando?.id }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.success) { setShowModal(false); carregar(); }
    else showAlert('Erro', data.message || 'Falha ao salvar.');
  };

  const handleExcluir = (id: number) => {
    showConfirm('Excluir Vendedor', 'Confirma exclusão deste vendedor?', async () => {
      await fetch(`./api.php?action=excluir_vendedor&id=${id}`);
      carregar();
    });
  };

  const ic = "w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => abrirModal(null)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Novo Vendedor
        </button>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Nome</th>
              <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Documento</th>
              <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Telefone</th>
              <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">E-mail</th>
              <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase text-right">Comissão %</th>
              <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase text-center">Status</th>
              <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {vendedores.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-gray-400 dark:text-gray-500">Nenhum vendedor cadastrado. Clique em "Novo Vendedor" para começar.</td></tr>
            ) : vendedores.map(v => (
              <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-5 py-3 font-medium text-gray-800 dark:text-gray-100">{v.nome}</td>
                <td className="px-5 py-3 text-gray-500 dark:text-gray-400">{v.documento || <span className="text-gray-300 dark:text-gray-600 italic">—</span>}</td>
                <td className="px-5 py-3 text-gray-500 dark:text-gray-400">{v.telefone || <span className="text-gray-300 dark:text-gray-600 italic">—</span>}</td>
                <td className="px-5 py-3 text-gray-500 dark:text-gray-400">{v.email || <span className="text-gray-300 dark:text-gray-600 italic">—</span>}</td>
                <td className="px-5 py-3 text-right font-semibold text-blue-700 dark:text-blue-300">{Number(v.percentual_comissao).toFixed(2)}%</td>
                <td className="px-5 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${v.ativo ? 'bg-green-100 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400'}`}>
                    {v.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex gap-2 justify-center">
                    <button onClick={() => abrirModal(v)} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => v.id && handleExcluir(v.id)} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">{editando?.id ? 'Editar Vendedor' : 'Novo Vendedor'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X className="w-5 h-5 text-gray-400 dark:text-gray-500" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Nome *</label>
                <input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} placeholder="Nome completo do vendedor" className={ic} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">CPF / CNPJ</label>
                  <input value={form.documento || ''} onChange={e => setForm(p => ({ ...p, documento: e.target.value }))} placeholder="000.000.000-00" className={ic} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Telefone</label>
                  <input value={form.telefone || ''} onChange={e => setForm(p => ({ ...p, telefone: e.target.value }))} placeholder="(00) 00000-0000" className={ic} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">E-mail</label>
                <input type="email" value={form.email || ''} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="vendedor@email.com" className={ic} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Comissão (%)</label>
                  <input type="number" step="0.01" min="0" max="100" value={form.percentual_comissao} onChange={e => setForm(p => ({ ...p, percentual_comissao: parseFloat(e.target.value) || 0 }))} className={ic} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Status</label>
                  <select value={form.ativo} onChange={e => setForm(p => ({ ...p, ativo: parseInt(e.target.value) }))} className={ic}>
                    <option value={1}>Ativo</option>
                    <option value={0}>Inativo</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700">Cancelar</button>
              <button onClick={handleSalvar} disabled={saving} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {saving ? 'Salvando...' : 'Salvar Vendedor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export { VendedoresTab };
