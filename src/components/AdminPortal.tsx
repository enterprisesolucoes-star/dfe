import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
    Building, Lock, LogOut, Plus, Edit2, Trash2, ShieldCheck, 
    Search, MapPin, Mail, Phone, Globe, Info, CheckCircle, Smartphone, AlertTriangle
} from 'lucide-react';

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

const AdminPortal = () => {
    const [loggedIn, setLoggedIn] = useState(false);
    const [login, setLogin] = useState('');
    const [senha, setSenha] = useState('');
    const [empresas, setEmpresas] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [editing, setEditing] = useState<any>(null);
    const [deleting, setDeleting] = useState<number | null>(null);
    const [userModal, setUserModal] = useState<{ open: boolean; empresaId: number; empresaNome: string }>({ open: false, empresaId: 0, empresaNome: '' });

    const handleLogin = async (e: any) => {
        e.preventDefault();
        setLoading(true);
        const res = await fetch('api.php?action=login_admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login, senha })
        });
        const data = await res.json();
        if (data.success) {
            setLoggedIn(true);
            fetchEmpresas();
        } else {
            setError(data.message);
        }
        setLoading(false);
    };

    const fetchEmpresas = async () => {
        setLoading(true);
        try {
            const res = await fetch('api.php?action=listar_empresas_admin');
            const data = await res.json();
            if (Array.isArray(data)) { setEmpresas(data); } else { setEmpresas([]); }
        } catch { setEmpresas([]); }
        finally { setLoading(false); }
    };

    const handleSave = async (e: any) => {
        e.preventDefault();
        const res = await fetch('api.php?action=salvar_empresa_admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(editing)
        });
        const data = await res.json();
        if (data.success) {
            setEditing(null);
            fetchEmpresas();
            if (data.id) {
                setUserModal({ open: true, empresaId: data.id, empresaNome: editing.razao_social || 'Nova Empresa' });
            }
        }
    };

    const handleExcluirConfirm = async () => {
        if (!deleting) return;
        await fetch(`./api.php?action=excluir_empresa_admin&id=${deleting}`);
        setDeleting(null);
        fetchEmpresas();
    };

    const filteredEmpresas = empresas.filter(emp => 
        emp.razao_social?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.cnpj?.includes(searchTerm)
    );

    if (!loggedIn) {
        return (
            <div
                className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat relative font-sans"
                style={{ backgroundImage: 'url("bg_login.png")' }}
            >
                <div className="absolute inset-0 bg-blue-900/70 mix-blend-multiply"></div>
                <div className="absolute inset-0 bg-black/40"></div>
                <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-sm p-8 relative z-10 border border-white/20">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-2xl mb-4">
                            <ShieldCheck className="w-8 h-8 text-blue-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-800">Admin DFe</h1>
                        <p className="text-sm text-gray-500 mt-1">Área Restrita</p>
                    </div>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Login</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input type="text" value={login} onChange={e => setLogin(e.target.value)} placeholder="admin" className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="••••••" className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                            </div>
                        </div>
                        {error && <p className="text-xs text-red-500 text-center px-4 py-2 bg-red-50 rounded-lg border border-red-100">{error}</p>}
                        <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                            {loading ? 'Autenticando...' : 'Entrar'}
                        </button>
                    </form>
                    <p className="text-center text-xs mt-6 text-gray-400">
                        <a href="https://esolucoesia.com" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 transition-colors cursor-pointer">
                            Enterprise Soluções
                        </a>
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 font-sans text-slate-600">
            <style>{`b, strong, h1, h2, h3 { font-weight: 600 !important; color: #334155; }`}</style>
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 bg-white p-6 rounded-[2rem] shadow-sm border border-white gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100">
                            <ShieldCheck className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Gerenciamento Central</h2>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Status e Licenciamento das Empresas</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="Busca rápida por empresa..." 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <button onClick={() => setLoggedIn(false)} className="p-3 text-slate-400 hover:text-red-600 bg-white shadow-sm rounded-2xl border border-slate-100 transition-all"><LogOut className="w-5 h-5" /></button>
                    </div>
                </div>

                <div className="flex justify-end mb-6">
                    <button onClick={() => setEditing({ status: 'Ativo', usuario_dfe: 2 })} className="bg-blue-600 text-white px-8 py-3.5 rounded-2xl font-bold flex items-center gap-2 shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all text-sm">
                        <Plus className="w-5 h-5" /> Adicionar Empresa
                    </button>
                </div>

                <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden border border-white">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-400 text-[10px] font-bold uppercase tracking-[0.15em] border-b border-slate-50">
                            <tr>
                                <th className="px-8 py-6">Empresa / CNPJ</th>
                                <th className="px-8 py-6">Cidade</th>
                                <th className="px-8 py-6 text-center">Status</th>
                                <th className="px-8 py-6">Tipo Licença</th>
                                <th className="px-8 py-6 text-right">Opções</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50/50">
                            {filteredEmpresas.map(emp => (
                                <tr key={emp.id} className="hover:bg-slate-50/30 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="font-bold text-slate-700 group-hover:text-blue-600 transition-colors">{emp.razao_social}</div>
                                        <div className="text-[10px] text-slate-400 font-bold mt-1 tracking-wider">{emp.cnpj}</div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="text-xs font-bold text-slate-600">{emp.municipio || '---'}</div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase">{emp.uf}</div>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-tight ${
                                            emp.status === 'Ativo' ? 'bg-emerald-50 text-emerald-600' :
                                            emp.status === 'Inativo' ? 'bg-slate-100 text-slate-400' : 'bg-red-50 text-red-600'
                                        }`}>
                                            {emp.status}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${emp.usuario_dfe === 0 || emp.usuario_dfe === 4 ? 'bg-slate-300' : 'bg-blue-600'}`}></div>
                                            <div className="text-xs font-bold text-slate-700">
                                                {emp.usuario_dfe === 0 && 'S/ Recurso Fiscal'}
                                                {emp.usuario_dfe === 1 && 'NFe'}
                                                {emp.usuario_dfe === 2 && 'NFe + NFCe'}
                                                {emp.usuario_dfe === 3 && 'PDV Offline'}
                                                {emp.usuario_dfe === 4 && 'DFe BLOQUEADO'}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => setEditing(emp)} className="p-3 text-slate-400 hover:text-blue-600 bg-white shadow-sm rounded-xl border border-slate-100 transition-all"><Edit2 className="w-4 h-4" /></button>
                                            <button onClick={() => setDeleting(emp.id)} className="p-3 text-slate-400 hover:text-red-600 bg-white shadow-sm rounded-xl border border-slate-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Configuração */}
            <AnimatePresence>
                {editing && (
                    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[500] p-4 backdrop-blur-sm overflow-y-auto">
                        <motion.form 
                            initial={{ scale: 0.98, opacity: 0 }} 
                            animate={{ scale: 1, opacity: 1 }} 
                            exit={{ scale: 0.98, opacity: 0 }}
                            onSubmit={handleSave} 
                            className="bg-white rounded-[2.5rem] p-10 w-full max-w-4xl shadow-2xl my-8 relative border border-white"
                        >
                            <div className="flex items-center gap-4 mb-10 border-b border-slate-100 pb-6">
                                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100">
                                    <Building className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">Dados da Empresa</h3>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Gerencie os detalhes cadastrais</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 ml-1">CNPJ *</label>
                                    <input type="text" value={editing.cnpj || ''} onChange={e => setEditing({...editing, cnpj: e.target.value})} className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-slate-700" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 ml-1">Inscrição Estadual *</label>
                                    <input type="text" value={editing.ie || ''} onChange={e => setEditing({...editing, ie: e.target.value})} className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-slate-700" />
                                </div>

                                <div className="md:col-span-2 space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 ml-1">Razão Social *</label>
                                    <input type="text" value={editing.razao_social || ''} onChange={e => setEditing({...editing, razao_social: e.target.value})} className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-slate-700" />
                                </div>

                                <div className="md:col-span-2 pt-6 border-t border-slate-50 mt-2">
                                    <h4 className="text-[10px] font-bold uppercase text-slate-400 tracking-[0.3em] mb-6 flex items-center gap-2">
                                        <MapPin className="w-3 h-3 text-blue-500" /> Informações de Endereço
                                    </h4>
                                </div>

                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="md:col-span-2 space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 ml-1">Logradouro *</label>
                                        <input type="text" value={editing.logradouro || ''} onChange={e => setEditing({...editing, logradouro: e.target.value})} className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-slate-700" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 ml-1">Número *</label>
                                        <input type="text" value={editing.numero || ''} onChange={e => setEditing({...editing, numero: e.target.value})} className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-slate-700" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 md:col-span-2 gap-6">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 ml-1">Bairro *</label>
                                        <input type="text" value={editing.bairro || ''} onChange={e => setEditing({...editing, bairro: e.target.value})} className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-slate-700" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 ml-1">CEP *</label>
                                        <input type="text" value={editing.cep || ''} onChange={e => setEditing({...editing, cep: e.target.value})} className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-slate-700" />
                                    </div>
                                </div>

                                <MunicipioSelectSection editing={editing} setEditing={setEditing} />

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 ml-1">Regime Tributário (CRT) *</label>
                                    <select value={editing.crt || '1'} onChange={e => setEditing({...editing, crt: e.target.value})} className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-slate-600">
                                        <option value="1">1 - Simples Nacional</option>
                                        <option value="2">2 - Simples (Sublimite)</option>
                                        <option value="3">3 - Regime Normal</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 ml-1">Telefone Comercial *</label>
                                    <input type="text" value={editing.telefone || ''} onChange={e => setEditing({...editing, telefone: e.target.value})} className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-slate-700" />
                                </div>

                                <div className="md:col-span-2 pt-6 border-t border-slate-50 mt-2">
                                    <h4 className="text-[10px] font-bold uppercase text-slate-400 tracking-[0.3em] mb-6 flex items-center gap-2">
                                        <ShieldCheck className="w-3 h-3 text-emerald-500" /> Parâmetros de Licenciamento
                                    </h4>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 ml-1">Status Operacional</label>
                                    <select value={editing.status || 'Ativo'} onChange={e => setEditing({...editing, status: e.target.value})} className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-slate-600">
                                        <option value="Ativo">Ativo</option>
                                        <option value="Inativo">Inativo</option>
                                        <option value="Bloqueado">Bloqueado</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 ml-1">Nível de Licença DFe</label>
                                    <select value={editing.usuario_dfe || 0} onChange={e => setEditing({...editing, usuario_dfe: Number(e.target.value)})} className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-slate-600">
                                        <option value={0}>0 - Sem Recursos Fiscais</option>
                                        <option value={1}>1 - Emissão de NF-e</option>
                                        <option value={2}>2 - NF-e e NFC-e</option>
                                        <option value={3}>3 - PDV Offline</option>
                                        <option value={4}>4 - Bloqueio de DFe</option>
                                    </select>
                                </div>

                                {(editing.usuario_dfe === 1 || editing.usuario_dfe === 2) && (
                                    <div className="md:col-span-2 bg-blue-50/30 p-5 rounded-2xl border border-blue-100/50 flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">Estratégia Reforma Tributária (LC 214)</p>
                                            <p className="text-xs text-slate-500 font-bold">Recolher IBS e CBS "Por Fora" do Simples Nacional?</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setEditing({ ...editing, recolhe_ibscbs_fora: editing.recolhe_ibscbs_fora === 1 ? 0 : 1 })}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${editing.recolhe_ibscbs_fora === 1 ? 'bg-blue-600' : 'bg-slate-200'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${editing.recolhe_ibscbs_fora === 1 ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                )}

                                {/* TEF */}
                                <div className="md:col-span-2 bg-slate-50/60 p-5 rounded-2xl border border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Smartphone className="w-4 h-4 text-slate-400" />
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">TEF — Transferência Eletrônica de Fundos</p>
                                            <p className="text-xs text-slate-500 font-bold">Esta empresa utiliza integração TEF / SmartPOS?</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setEditing({ ...editing, usa_tef: editing.usa_tef === 1 ? 0 : 1 })}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${editing.usa_tef === 1 ? 'bg-blue-600' : 'bg-slate-200'}`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${editing.usa_tef === 1 ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>

                                {editing.usa_tef === 1 && editing.id && (
                                    <div className="md:col-span-2">
                                        <SmartPosAdminSection empresaId={editing.id} />
                                    </div>
                                )}
                                {editing.usa_tef === 1 && !editing.id && (
                                    <div className="md:col-span-2 text-xs text-slate-400 italic px-1">
                                        Salve a empresa primeiro para cadastrar as máquinas SmartPOS.
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-end gap-10 pt-10 mt-6 border-t border-slate-100">
                                <button type="button" onClick={() => setEditing(null)} className="text-xs font-bold uppercase text-slate-500 hover:text-slate-800 transition-colors tracking-widest">Cancelar</button>
                                <button type="submit" className="px-12 py-3 bg-blue-600 text-white font-bold uppercase text-sm rounded-full shadow-2xl shadow-blue-100 hover:bg-blue-700 transition-all tracking-widest">Salvar</button>
                            </div>
                        </motion.form>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal de Confirmação de Exclusão */}
            <AnimatePresence>
                {deleting && (
                    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[600] p-4 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl text-center border border-white">
                            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <AlertTriangle className="w-8 h-8 text-red-500" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800">Deseja Inativar?</h3>
                            <p className="text-sm text-slate-400 mt-2">A empresa selecionada perderá o acesso ao sistema imediatamente.</p>
                            <div className="flex gap-4 mt-8">
                                <button onClick={() => setDeleting(null)} className="flex-1 py-3 text-slate-400 font-bold uppercase text-[10px] tracking-widest">Voltar</button>
                                <button onClick={handleExcluirConfirm} className="flex-1 py-3 bg-red-500 text-white font-bold uppercase text-[10px] rounded-xl shadow-xl shadow-red-100 tracking-widest hover:bg-red-600">Sim, Inativar</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {userModal.open && (
                <UserRegistrationModal 
                    empresaId={userModal.empresaId}
                    empresaNome={userModal.empresaNome}
                    onClose={() => setUserModal({ open: false, empresaId: 0, empresaNome: '' })}
                />
            )}
        </div>
    );
};

// Componente Sincronizado com codigo_municipio do Banco
const MunicipioSelectSection = ({ editing, setEditing }: any) => {
    const [municipios, setMunicipios] = useState<{ id: number, nome: string }[]>([]);
    const [loadingMun, setLoadingMun] = useState(false);

    const handleUfChange = async (uf: string) => {
        setEditing({ ...editing, uf, municipio: '', codigo_municipio: '' });
        if (!uf) { setMunicipios([]); return; }
        await fetchCidades(uf);
    };

    const fetchCidades = async (uf: string) => {
        setLoadingMun(true);
        try {
            const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`);
            const data = await res.json();
            const list = data.map((m: any) => ({ id: m.id, nome: m.nome }));
            setMunicipios(list);
            return list;
        } catch { 
            setMunicipios([]); 
            return [];
        } finally { 
            setLoadingMun(false); 
        }
    };

    const handleMunicipioChange = (id: string) => {
        const mun = municipios.find(m => String(m.id) === id);
        if (mun) {
            setEditing({ ...editing, municipio: mun.nome, codigo_municipio: String(mun.id) });
        }
    };

    useEffect(() => {
        if (editing.uf) {
            fetchCidades(editing.uf);
        }
    }, [editing.uf]);

    return (
        <>
            <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 ml-1">UF (Estado) *</label>
                <select value={editing.uf || ''} onChange={e => handleUfChange(e.target.value)} className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-slate-600">
                    <option value="">Selecione o estado...</option>
                    {ESTADOS_BR.map(s => <option key={s.sigla} value={s.sigla}>{s.sigla} — {s.nome}</option>)}
                </select>
            </div>
            
            <div className="grid grid-cols-5 gap-4">
                <div className="col-span-3 space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 ml-1">Município *</label>
                    <select 
                        value={editing.codigo_municipio || ''} 
                        onChange={e => handleMunicipioChange(e.target.value)}
                        disabled={loadingMun || !editing.uf}
                        className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-slate-700 disabled:opacity-50"
                    >
                        {loadingMun ? (
                            <option value="">Buscando cidades...</option>
                        ) : (
                            <>
                                <option value="">Selecione a cidade...</option>
                                {municipios.map(m => (
                                    <option key={m.id} value={String(m.id)}>{m.nome}</option>
                                ))}
                            </>
                        )}
                    </select>
                </div>
                <div className="col-span-2 space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 ml-1 font-mono">IBGE</label>
                    <input 
                        readOnly 
                        value={editing.codigo_municipio || ''} 
                        className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-400 cursor-not-allowed text-center" 
                    />
                </div>
            </div>
        </>
    );
};

const UserRegistrationModal = ({ empresaId, empresaNome, onClose }: { empresaId: number; empresaNome: string; onClose: () => void }) => {
    const [form, setForm] = useState({ nome: '', login: '', senha: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        if (!form.login || !form.senha) { setError('Acesso requer usuário e senha.'); return; }
        setLoading(true);
        try {
            const res = await fetch('api.php?action=salvar_usuario_admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, empresa_id: empresaId })
            });
            const data = await res.json();
            if (data.success) { onClose(); } else { setError(data.message || 'Erro no processamento.'); }
        } catch { setError('Erro de conexão.'); }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[700] p-4 backdrop-blur-md text-slate-600">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[2rem] p-10 w-full max-w-sm shadow-2xl border border-white">
                <style>{`b, strong, h1, h2, h3 { font-weight: 600 !important; color: #334155; }`}</style>
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                        <CheckCircle className="w-10 h-10 text-emerald-600" />
                    </div>
                    <h3 className="text-xl font-bold">Ativar Acesso</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{empresaNome}</p>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="text" placeholder="Nome Completo" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-sm" />
                    <input type="text" placeholder="Usuário Principal" value={form.login} onChange={e => setForm({...form, login: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-sm" />
                    <input type="password" placeholder="Definição de Senha" value={form.senha} onChange={e => setForm({...form, senha: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-sm" />
                    {error && <p className="text-[10px] text-red-500 font-bold text-center px-4 py-2 bg-red-50 rounded-lg">{error}</p>}
                    <div className="flex gap-4 pt-6">
                        <button type="button" onClick={onClose} className="flex-1 py-3 text-slate-400 font-bold uppercase text-[10px] tracking-widest">Pular</button>
                        <button type="submit" disabled={loading} className="flex-2 py-4 bg-emerald-600 text-white font-bold uppercase text-[10px] rounded-2xl shadow-xl shadow-emerald-100 tracking-widest hover:bg-emerald-700 transition-all">Ativar Acesso</button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

const SmartPosAdminSection = ({ empresaId }: { empresaId: number }) => {
    const [list, setList] = useState<any[]>([]);
    const [form, setForm] = useState({ codigo: '', numero_serie: '', integradora: '', apelido: '' });
    const [editingId, setEditingId] = useState<number | null>(null);
    const [erro, setErro] = useState('');

    useEffect(() => {
        fetch(`api.php?action=listar_smartpos_admin&empresa_id=${empresaId}`)
            .then(r => r.json()).then(d => { if (Array.isArray(d)) setList(d); }).catch(() => {});
    }, [empresaId]);

    const handleSalvar = async () => {
        if (!form.codigo || !form.numero_serie || !form.integradora || !form.apelido) {
            setErro('Preencha todos os campos.'); return;
        }
        setErro('');
        const payload = { ...form, empresa_id: empresaId, ...(editingId ? { id: editingId } : {}) };
        const res = await fetch('api.php?action=salvar_smartpos_admin', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
            setList(editingId ? list.map(s => s.id === editingId ? { ...s, ...form } : s) : [...list, { ...form, id: data.id }]);
            setForm({ codigo: '', numero_serie: '', integradora: '', apelido: '' });
            setEditingId(null);
        }
    };

    const handleExcluir = async (id: number) => {
        await fetch(`api.php?action=excluir_smartpos_admin&id=${id}`);
        setList(list.filter(s => s.id !== id));
    };

    const inp = "w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-slate-700";

    return (
        <div className="pt-4 border-t border-slate-100 mt-2">
            <h4 className="text-[10px] font-bold uppercase text-slate-400 tracking-[0.3em] mb-4 flex items-center gap-2">
                <Smartphone className="w-3 h-3 text-blue-500" /> Máquinas SmartPOS
            </h4>
            <div className="grid grid-cols-4 gap-3 mb-2">
                {[['ID *', 'codigo'], ['Nº Série *', 'numero_serie'], ['Integradora *', 'integradora'], ['Apelido *', 'apelido']].map(([label, key]) => (
                    <div key={key} className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">{label}</label>
                        <input value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} className={inp} />
                    </div>
                ))}
            </div>
            {erro && <p className="text-xs text-red-500 mb-2">{erro}</p>}
            <button type="button" onClick={handleSalvar} className="mb-4 px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors">
                {editingId ? 'Salvar Alteração' : '+ Adicionar Máquina'}
            </button>
            {list.length > 0 && (
                <table className="w-full text-xs border border-slate-100 rounded-xl overflow-hidden">
                    <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] tracking-wider">
                        <tr>
                            {['ID', 'Nº Série', 'Integradora', 'Apelido', ''].map(h => (
                                <th key={h} className="px-4 py-2 text-left font-bold">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {list.map(s => (
                            <tr key={s.id} className="hover:bg-slate-50/50">
                                <td className="px-4 py-2 font-mono">{s.codigo}</td>
                                <td className="px-4 py-2 font-mono">{s.numero_serie}</td>
                                <td className="px-4 py-2">{s.integradora}</td>
                                <td className="px-4 py-2">{s.apelido}</td>
                                <td className="px-4 py-2 text-right">
                                    <button type="button" onClick={() => { setForm({ codigo: s.codigo, numero_serie: s.numero_serie, integradora: s.integradora, apelido: s.apelido }); setEditingId(s.id); }} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg mr-1"><Edit2 className="w-3 h-3" /></button>
                                    <button type="button" onClick={() => handleExcluir(s.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-3 h-3" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default AdminPortal;
