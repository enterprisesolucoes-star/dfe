import React, { useState, useEffect } from 'react';
import { Input } from './UIComponents';
import type { Session } from '../App';
import { Edit, Trash2, X, UserPlus, Eye, EyeOff } from 'lucide-react';

const UsuariosTab = ({ session, showAlert, showConfirm }: { session: Session; showAlert: (t: string, m: string) => void; showConfirm: (t: string, m: string, cb: () => void) => void }) => {
  const [activeSection, setActiveSection] = useState<'usuarios' | 'pendentes'>('usuarios');
  const [usuarios, setUsuarios]     = useState<Usuario[]>([]);
  const [pendentes, setPendentes]   = useState<PreCadastro[]>([]);
  const [editando, setEditando]     = useState<Usuario | null>(null);
  const [showModal, setShowModal]   = useState(false);
  const [loadingId, setLoadingId]   = useState<number | null>(null);

  const carregarUsuarios = () => fetch('./api.php?action=listar_usuarios').then(r => r.json()).then(setUsuarios);
  const carregarPendentes = () => fetch('./api.php?action=listar_pre_cadastros').then(r => r.json()).then((d: PreCadastro[]) => {
    if (Array.isArray(d)) setPendentes(d);
  });

  useEffect(() => { carregarUsuarios(); carregarPendentes(); }, []);

  const handleExcluir = (id: number) => {
    showConfirm('Excluir Usuário', 'Esta ação não pode ser desfeita. Confirma?', async () => {
      await fetch(`./api.php?action=excluir_usuario&id=${id}`);
      carregarUsuarios();
    });
  };

  const handleAprovar = async (id: number) => {
    setLoadingId(id);
    const res = await fetch(`./api.php?action=aprovar_pre_cadastro&id=${id}`);
    const data = await res.json();
    setLoadingId(null);
    if (data.success) { carregarPendentes(); carregarUsuarios(); }
    else showAlert('Erro ao Aprovar', data.message || 'Não foi possível aprovar o cadastro.');
  };

  const handleReprovar = (id: number) => {
    showConfirm('Reprovar Cadastro', 'Confirma reprovação deste pré-cadastro?', async () => {
      await fetch(`./api.php?action=reprovar_pre_cadastro&id=${id}`);
      carregarPendentes();
    });
  };

  const pendentesCount = pendentes.filter(p => p.status === 'aguardando').length;
  const fmtCnpj = (c: string) => c.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  const fmtDate = (d: string) => new Date(d).toLocaleString('pt-BR').replace(',', '');

  return (
    <div className="space-y-4">
      {/* Abas */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button onClick={() => setActiveSection('usuarios')}
          className={`py-2.5 px-5 text-sm font-semibold transition-colors ${activeSection === 'usuarios' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
          Usuários
        </button>
      </div>

      {activeSection === 'usuarios' && (
        <>
          <div className="flex justify-end">
            <button onClick={() => { setEditando(null); setShowModal(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-blue-700">
              <UserPlus className="w-4 h-4" /> Novo Usuário
            </button>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Nome</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Login</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Perfil</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {usuarios.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-400 dark:text-gray-500">Nenhum usuário cadastrado.</td></tr>
                ) : usuarios.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-5 py-3 font-medium">{u.nome}</td>
                    <td className="px-5 py-3 font-mono text-gray-500 dark:text-gray-400">{u.login}</td>
                    <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.perfil === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'}`}>{u.perfil}</span></td>
                    <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${u.ativo ? 'bg-green-100 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'}`}>{u.ativo ? 'Ativo' : 'Inativo'}</span></td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => { setEditando(u); setShowModal(true); }} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => u.id && handleExcluir(u.id)} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeSection === 'pendentes' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Empresa / Responsável</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">CNPJ</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Contato</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Usuário</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Data</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {pendentes.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-gray-400 dark:text-gray-500">Nenhuma solicitação encontrada.</td></tr>
              ) : pendentes.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800 dark:text-gray-100">{p.razao_social}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{p.nome}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-600 dark:text-gray-300 text-xs">{fmtCnpj(p.cnpj)}</td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-gray-600 dark:text-gray-300">{p.email}</p>
                    {p.telefone && <p className="text-xs text-gray-400 dark:text-gray-500">{p.telefone}</p>}
                  </td>
                  <td className="px-4 py-3 font-mono text-blue-600 dark:text-blue-400 font-semibold text-xs">{p.login_desejado}</td>
                  <td className="px-4 py-3 text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">{fmtDate(p.created_at)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      p.status === 'aguardando' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' :
                      p.status === 'aprovado'   ? 'bg-green-100 text-green-700 dark:text-green-300' :
                                                  'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'}`}>
                      {p.status === 'aguardando' ? 'Aguardando' : p.status === 'aprovado' ? 'Aprovado' : 'Reprovado'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {p.status === 'aguardando' && (
                      <div className="flex gap-2">
                        <button onClick={() => handleAprovar(p.id)} disabled={loadingId === p.id}
                          className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 disabled:opacity-50">
                          {loadingId === p.id ? '...' : 'Aprovar'}
                        </button>
                        <button onClick={() => handleReprovar(p.id)}
                          className="px-3 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 text-xs rounded-lg hover:bg-red-100">
                          Reprovar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && <UsuarioModal usuario={editando} onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); carregarUsuarios(); }} showAlert={showAlert} />}
    </div>
  );
};

const UsuarioModal = ({ usuario, onClose, onSave, showAlert }: { usuario: Usuario | null; onClose: () => void; onSave: () => void; showAlert: (t: string, m: string) => void }) => {
  const [form, setForm]       = useState<Usuario>(usuario || { nome: '', login: '', senha: '', perfil: 'operador', ativo: 1 });
  const [showSenha, setShowSenha] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSalvar = async () => {
    const erros = [
      !form.nome?.trim()  && '• Nome completo',
      !form.login?.trim() && '• Login',
      !usuario && !form.senha?.trim() && '• Senha (obrigatória para novo usuário)',
    ].filter(Boolean) as string[];
    if (erros.length) { showAlert('Campos obrigatórios', 'Preencha os campos:\n' + erros.join('\n')); return; }
    setLoading(true);
    const res  = await fetch('./api.php?action=salvar_usuario', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.success) onSave();
    else if (data.duplicado) showAlert('Login e Senha Duplicados', data.message);
    else showAlert('Erro ao salvar', data.message || 'Erro ao salvar usuário.');
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100">{usuario ? 'Editar Usuário' : 'Novo Usuário'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X className="w-5 h-5 text-gray-500 dark:text-gray-400" /></button>
        </div>
        <div className="space-y-3">
          <Input label="Nome completo" value={form.nome} onChange={(e: any) => setForm({ ...form, nome: e.target.value })} />
          <Input label="Login" value={form.login} onChange={(e: any) => setForm({ ...form, login: e.target.value })} />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{usuario ? 'Nova Senha (deixe vazio para manter)' : 'Senha *'}</label>
            <div className="relative">
              <input type={showSenha ? 'text' : 'password'} value={form.senha || ''} onChange={e => setForm({ ...form, senha: e.target.value })} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10" />
              <button type="button" onClick={() => setShowSenha((s: boolean) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
                {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Perfil</label>
              <select value={form.perfil} onChange={e => setForm({ ...form, perfil: e.target.value as 'admin' | 'operador' })} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="operador">Operador</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Status</label>
              <select value={form.ativo} onChange={e => setForm({ ...form, ativo: Number(e.target.value) })} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value={1}>Ativo</option>
                <option value={0}>Inativo</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Cancelar</button>
            <button onClick={handleSalvar} disabled={loading} className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{loading ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </div>
      </div>
    </div>
  );
};


export { UsuariosTab };
