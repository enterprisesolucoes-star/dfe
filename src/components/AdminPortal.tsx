import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  FileText, Lock, User, LogOut, Plus, Edit, Trash2,
  Search, CheckCircle, X, Smartphone, Shield, RefreshCw
} from 'lucide-react';

const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
const RECURSOS: Record<number, string> = { 0: 'S/ Recurso', 1: 'NFe', 2: 'NFe + NFCe', 3: 'Contingência Automática', 4: 'BLOQUEADO' };

const AdminPortal = () => {
  const [loggedIn, setLoggedIn] = useState(false);
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const [adminToken, setAdminToken] = useState(() => {
    // Sempre exigir novo login ao acessar /admin
    localStorage.removeItem('dfe_admin_token');
    return '';
  });
  const [municipios, setMunicipios] = useState<string[]>([]);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [busca, setBusca] = useState('');
  const [modal, setModal] = useState(false);
  const [tab, setTab] = useState<'dados'|'smartpos'>('dados');
  const [form, setForm] = useState<any>({});
  const [smartPosList, setSmartPosList] = useState<any[]>([]);
  const [spForm, setSpForm] = useState({ codigo: '', numero_serie: '', integradora: '', apelido: '' });
  const [editingSp, setEditingSp] = useState<number|null>(null);
  const [empresaId, setEmpresaId] = useState<number|null>(null);
  const [confirmModal, setConfirmModal] = useState<{open: boolean, id: number|null, nome: string, tipo: 'inativar'|'bloquear'|'desbloquear'}>({open: false, id: null, nome: '', tipo: 'inativar'});
  const [alertModal, setAlertModal] = useState<{open: boolean, tipo: 'error'|'warning'|'info'|'success', titulo: string, msg: string}>({open: false, tipo: 'info', titulo: '', msg: ''});
  const [confirmSmartPos, setConfirmSmartPos] = useState<{open: boolean, id: number|null}>({open: false, id: null});

  const api = async (action: string, method = 'GET', body?: any) => {
    const token = adminToken || localStorage.getItem('dfe_admin_token') || '';
    const url = `./api.php?action=${action}&adm_token=${token}`;
    const opts: any = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    return res.json();
  };

  const apiWithToken = async (action: string, token: string, method = 'GET', body?: any) => {
    const url = `./api.php?action=${action}&adm_token=${token}`;
    const opts: any = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    return res.json();
  };

  // useEffect removido - sempre exigir login

  const handleLogin = async (e: any) => {
    e.preventDefault();
    setLoading(true); setErro('');
    try {
      const data = await apiWithToken('login_admin', '', 'POST', { login, senha });
      if (data.success) {
        const tok = data.token || '';
        localStorage.setItem('dfe_admin_token', tok);
        setAdminToken(tok);
        setLoggedIn(true);
        const empresasData = await apiWithToken('listar_empresas_admin', tok);
        if (Array.isArray(empresasData)) setEmpresas(empresasData);
      } else { setErro(data.message || 'Erro ao autenticar.'); }
    } catch { setErro('Erro de comunicação.'); }
    setLoading(false);
  };

  const fetchEmpresas = async (tok?: string) => {
    const token = tok || adminToken;
    const data = await apiWithToken('listar_empresas_admin', token);
    if (Array.isArray(data)) setEmpresas(data);
  };

  const handleLogout = () => {
    localStorage.removeItem('dfe_admin_token');
    setAdminToken(''); setLoggedIn(false); setEmpresas([]);
  };

  const abrirModal = async (emp?: any) => {
    setTab('dados');
    setSpForm({ codigo: '', numero_serie: '', integradora: '', apelido: '' });
    if (emp) {
      setForm({ ...emp });
      if (emp.uf) buscarMunicipios(emp.uf);
      setEmpresaId(emp.id);
      const sps = await api(`listar_smartpos_admin&empresa_id=${emp.id}`);
      setSmartPosList(Array.isArray(sps) ? sps : []);
    } else {
      setForm({ status: 'Ativo', usuario_dfe: 2, ambiente: 2, crt: 1, tem_tef: 0, uf: 'GO' });
      buscarMunicipios('GO');
      setEmpresaId(null);
      setSmartPosList([]);
    }
    setModal(true);
  };

  const salvar = async () => {
    // Garantir valores padrão antes de enviar
    const payload: any = {
      ...form,
      usuario_dfe: Number(form.usuario_dfe ?? 2),
      status: form.status || 'Ativo',
      tem_tef: Number(form.tem_tef) || 0,
    };
    // Valores padrão apenas para novos cadastros
    if (!empresaId) {
      payload.ambiente = 2;  // Homologação
      payload.crt = '1';     // Simples Nacional
    }
    const data = await api('salvar_empresa_admin', 'POST', payload);
    if (data.success) { setModal(false); fetchEmpresas(); }
    else setAlertModal({open: true, tipo: 'error', titulo: 'Erro ao salvar', msg: data.message || 'Tente novamente.'});
  };

  const excluir = (id: number, nome: string) => {
    setConfirmModal({ open: true, id, nome, tipo: 'inativar' });
  };

  const [modalManutencao, setModalManutencao] = useState<{ ativar: boolean } | null>(null);

  const manutencaoGlobal = async (ativar: boolean) => {
    console.log('manutencaoGlobal chamado', ativar);
    setModalManutencao({ ativar });
    console.log('modalManutencao setado');
  };

  const confirmarManutencao = async () => {
    if (!modalManutencao) return;
    await api('manutencao_global', 'POST', { ativar: modalManutencao.ativar });
    setModalManutencao(null);
    setAlertModal({ open: true, tipo: 'success', titulo: modalManutencao.ativar ? 'Manutenção Ativada' : 'Sistema Reativado', msg: modalManutencao.ativar ? 'Todas as empresas ativas foram colocadas em manutenção.' : 'Todas as empresas em manutenção foram reativadas.' });
    fetchEmpresas();
  };

  const bloquear = (id: number, nome: string, status: string) => {
    const tipo = status === 'Bloqueado' ? 'desbloquear' : 'bloquear';
    setConfirmModal({ open: true, id, nome, tipo });
  };

  const confirmarAcao = async () => {
    if (!confirmModal.id) return;
    const novoStatus = confirmModal.tipo === 'inativar' ? 'Inativo' : confirmModal.tipo === 'bloquear' ? 'Bloqueado' : 'Ativo';
    await api('alterar_status_empresa', 'POST', { id: confirmModal.id, status: novoStatus });
    setConfirmModal({ open: false, id: null, nome: '', tipo: 'inativar' });
    fetchEmpresas();
  };

  const addSmartPos = async () => {
    if (!spForm.codigo || !spForm.numero_serie || !spForm.integradora) {
      setAlertModal({open: true, tipo: 'warning', titulo: 'Campos obrigatórios', msg: 'Preencha ID, Nº Série e Integradora.'});
      return;
    }
    const payload: any = { ...spForm, empresa_id: empresaId };
    if (editingSp) payload.id = editingSp;
    const data = await api('salvar_smartpos_admin', 'POST', payload);
    if (data.success) {
      const sps = await api(`listar_smartpos_admin&empresa_id=${empresaId}`);
      setSmartPosList(Array.isArray(sps) ? sps : []);
      setSpForm({ codigo: '', numero_serie: '', integradora: '', apelido: '' });
      setEditingSp(null);
    }
  };

  const editSmartPos = (sp: any) => {
    setSpForm({ codigo: sp.codigo || '', numero_serie: sp.numero_serie || '', integradora: sp.integradora || '', apelido: sp.apelido || '' });
    setEditingSp(sp.id);
  };

  const cancelarEditSp = () => {
    setSpForm({ codigo: '', numero_serie: '', integradora: '', apelido: '' });
    setEditingSp(null);
  };

  const delSmartPos = (id: number) => {
    setConfirmSmartPos({open: true, id});
  };

  const confirmarDelSmartPos = async () => {
    if (!confirmSmartPos.id) return;
    await api('excluir_smartpos_admin', 'POST', { id: confirmSmartPos.id });
    const sps = await api(`listar_smartpos_admin&empresa_id=${empresaId}`);
    setSmartPosList(Array.isArray(sps) ? sps : []);
    setConfirmSmartPos({open: false, id: null});
  };

  const set = (f: string, v: any) => setForm((p: any) => ({ ...p, [f]: v }));

  const buscarMunicipios = async (uf: string) => {
    try {
      const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`);
      const data = await res.json();
      setMunicipios(data.map((m: any) => m.nome));
    } catch { setMunicipios([]); }
  };

  const handleUfChange = (uf: string) => { set('uf', uf); buscarMunicipios(uf); };

  const lista = empresas.filter(e =>
    e.status !== 'Inativo' &&
    (!busca || (e.razao_social || '').toLowerCase().includes(busca.toLowerCase()) ||
    (e.cnpj || '').includes(busca) || (e.nome_fantasia || '').toLowerCase().includes(busca.toLowerCase()))
  );

  // ─── LOGIN ───────────────────────────────────────────────────────────────
  if (!loggedIn) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-blue-700 p-4">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-2xl mb-4">
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">DFe IA</h1>
          <p className="text-sm text-gray-500 mt-1">Painel Administrativo</p>
        </div>
        {erro && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">{erro}</div>}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Login</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={login} onChange={e => setLogin(e.target.value)} placeholder="admin"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="••••••"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {loading ? 'Autenticando...' : 'Entrar'}
          </button>
        </form>
        <p className="text-center text-xs mt-6 text-gray-400">Enterprise Soluções</p>
      </motion.div>
    </div>
  );

  // ─── PAINEL ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-800 text-sm">DFe IA — Admin</h1>
            <p className="text-xs text-gray-400">Gerenciamento de Empresas</p>
          </div>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 text-xs text-gray-500 hover:text-red-600 font-bold transition-colors">
          <LogOut className="w-4 h-4" /> Sair
        </button>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-800">Empresas Cadastradas</h2>
          <div className="flex gap-2">
            <button onClick={() => manutencaoGlobal(true)} className="px-3 py-1.5 bg-orange-500 text-white text-xs font-bold rounded-lg hover:bg-orange-600 flex items-center gap-1">
              Manutenção ON
            </button>
            <button onClick={() => manutencaoGlobal(false)} className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 flex items-center gap-1">
              Manutenção OFF
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="text" placeholder="Buscar empresa..." value={busca} onChange={e => setBusca(e.target.value)}
                className="border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-400 w-56" />
            </div>
            <button onClick={() => fetchEmpresas()} className="p-2 bg-gray-100 text-gray-500 hover:bg-gray-200 rounded-xl transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={() => abrirModal()}
              className="bg-blue-600 text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-2">
              <Plus className="w-4 h-4" /> Nova Empresa
            </button>
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-400 text-[10px] uppercase">
              <tr>
                <th className="px-6 py-4 font-bold">Empresa</th>
                <th className="px-6 py-4 font-bold">CNPJ</th>
                <th className="px-6 py-4 font-bold">UF</th>
                <th className="px-6 py-4 font-bold">Recurso DFe</th>
                <th className="px-6 py-4 font-bold">Status</th>
                <th className="px-6 py-4 font-bold text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {lista.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-xs text-gray-400">Nenhuma empresa encontrada.</td></tr>
              )}
              {lista.map(e => (
                <tr key={e.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-xs font-bold text-gray-800">{e.razao_social || '—'}</p>
                    <p className="text-[10px] text-gray-400">{e.nome_fantasia || ''}</p>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-600">{e.cnpj ? e.cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5') : '—'}</td>
                  <td className="px-6 py-4 text-xs text-gray-600">{e.uf || '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${e.usuario_dfe == 4 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                      {RECURSOS[e.usuario_dfe] || '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${e.status === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {e.status || 'Ativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => abrirModal(e)} className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors" title="Editar">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => bloquear(e.id, e.razao_social || e.cnpj, e.status)}
                        className={`p-1.5 transition-colors ${e.status === 'Bloqueado' ? 'text-green-500 hover:text-green-700' : 'text-orange-400 hover:text-orange-600'}`}
                        title={e.status === 'Bloqueado' ? 'Desbloquear' : 'Bloquear'}>
                        <Shield className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => excluir(e.id, e.razao_social || e.cnpj)} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors" title="Inativar">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col" style={{height: 'calc(100vh - 4rem)', maxHeight: '750px'}}>
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 rounded-t-2xl">
              <h3 className="font-bold text-gray-800">{empresaId ? 'Editar Empresa' : 'Nova Empresa'}</h3>
              <button onClick={() => setModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Tabs */}
            <div className="grid grid-cols-2 border-b border-gray-100">
              {([['dados','Dados'],['smartpos','SmartPOS / TEF']] as const).map(([t,l]) => (
                <button key={t} onClick={() => setTab(t as any)}
                  className={`py-3 text-[11px] font-bold uppercase tracking-wider border-b-2 transition-all text-center w-full ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                  {l}
                </button>
              ))}
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 min-h-[400px]">

              {/* Tab Dados */}
              {tab === 'dados' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Razão Social</label>
                      <input value={form.razao_social || ''} onChange={e => set('razao_social', e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nome Fantasia</label>
                      <input value={form.nome_fantasia || ''} onChange={e => set('nome_fantasia', e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">CNPJ</label>
                      <input value={form.cnpj || ''} onChange={e => set('cnpj', e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Inscrição Estadual</label>
                      <input value={form.ie || form.inscricao_estadual || ''} onChange={e => set('inscricao_estadual', e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">UF</label>
                      <select value={form.uf || 'GO'} onChange={e => handleUfChange(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400">
                        {ESTADOS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Município</label>
                      <select value={form.municipio || ''} onChange={e => set('municipio', e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400">
                        <option value="">Selecione...</option>
                        {municipios.map(m => <option key={m} value={m}>{m}</option>)}
                        {form.municipio && !municipios.includes(form.municipio) && <option value={form.municipio}>{form.municipio}</option>}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">CEP</label>
                      <input value={form.cep || ''} onChange={e => set('cep', e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Logradouro</label>
                      <input value={form.logradouro || ''} onChange={e => set('logradouro', e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Número</label>
                      <input value={form.numero || ''} onChange={e => set('numero', e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Bairro</label>
                      <input value={form.bairro || ''} onChange={e => set('bairro', e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Telefone</label>
                      <input value={form.telefone || ''} onChange={e => set('telefone', e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">E-mail</label>
                      <input type="email" value={form.email || ''} onChange={e => set('email', e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Recurso DFe</label>
                      <select value={form.usuario_dfe ?? 2} onChange={e => set('usuario_dfe', Number(e.target.value))}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400">
                        <option value={0}>S/ Recurso Fiscal</option>
                        <option value={1}>NFe</option>
                        <option value={2}>NFe + NFCe</option>
                        <option value={3}>Contingência Automática</option>
                        <option value={4}>DFe BLOQUEADO</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Status</label>
                      <select value={form.status || 'Ativo'} onChange={e => set('status', e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400">
                        <option value="Ativo">Ativo</option>
                        <option value="Bloqueado">Bloqueado (Inadimplente)</option>
                        <option value="Suspenso">Suspenso</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}



              {/* Tab SmartPOS */}
              {tab === 'smartpos' && (
                <div className="space-y-6">
                  <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50/50">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={Number(form.tem_tef) === 1}
                        onChange={e => set('tem_tef', e.target.checked ? 1 : 0)}
                        className="w-4 h-4 rounded text-blue-600" />
                      <div>
                        <p className="text-sm font-bold text-gray-700">Integração TEF ativa</p>
                        <p className="text-xs text-gray-400">Empresa utiliza terminal SmartPOS para pagamentos</p>
                      </div>
                    </label>
                  </div>

                  {empresaId && Number(form.tem_tef) === 1 && (
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-3">Máquinas SmartPOS</p>
                      <div className="grid grid-cols-4 gap-2 mb-3">
                        {[['codigo','ID *'],['numero_serie','Nº Série *'],['integradora','Integradora *'],['apelido','Apelido']].map(([f,l]) => (
                          <div key={f}>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">{l}</label>
                            <input value={(spForm as any)[f]} onChange={e => setSpForm(p => ({ ...p, [f]: e.target.value }))}
                              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-400" />
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={addSmartPos}
                          className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-2">
                          <Plus className="w-3.5 h-3.5" /> {editingSp ? 'Salvar Alteração' : 'Adicionar Máquina'}
                        </button>
                        {editingSp && (
                          <button onClick={cancelarEditSp}
                            className="bg-gray-100 text-gray-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-gray-200 transition-colors">
                            Cancelar
                          </button>
                        )}
                      </div>
                      <div className="mt-4 border border-gray-100 rounded-xl overflow-hidden">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-gray-50 text-gray-400">
                            <tr>
                              <th className="px-4 py-3 font-bold uppercase text-[10px]">ID</th>
                              <th className="px-4 py-3 font-bold uppercase text-[10px]">Nº Série</th>
                              <th className="px-4 py-3 font-bold uppercase text-[10px]">Integradora</th>
                              <th className="px-4 py-3 font-bold uppercase text-[10px]">Apelido</th>
                              <th className="px-4 py-3 text-center font-bold uppercase text-[10px]">Ação</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {smartPosList.length === 0 && (
                              <tr><td colSpan={5} className="px-4 py-4 text-center text-gray-400">Nenhuma máquina cadastrada.</td></tr>
                            )}
                            {smartPosList.map(sp => (
                              <tr key={sp.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3">{sp.codigo}</td>
                                <td className="px-4 py-3">{sp.numero_serie}</td>
                                <td className="px-4 py-3">{sp.integradora}</td>
                                <td className="px-4 py-3">{sp.apelido}</td>
                                <td className="px-4 py-3 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <button onClick={() => editSmartPos(sp)} className="text-gray-400 hover:text-blue-600 transition-colors" title="Editar">
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => delSmartPos(sp.id)} className="text-gray-400 hover:text-red-600 transition-colors" title="Excluir">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  {!empresaId && <p className="text-xs text-gray-400 text-center py-4">Salve a empresa primeiro para cadastrar máquinas SmartPOS.</p>}
                  {empresaId && Number(form.tem_tef) !== 1 && <p className="text-xs text-gray-400 text-center py-4">Ative a Integração TEF acima para cadastrar máquinas SmartPOS.</p>}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex justify-end gap-3 rounded-b-2xl">
              <button onClick={() => setModal(false)} className="px-6 py-2.5 text-gray-500 font-bold text-xs uppercase hover:bg-gray-100 rounded-xl transition-colors">Cancelar</button>
              <button onClick={salvar} className="px-8 py-2.5 bg-blue-600 text-white font-bold text-xs uppercase rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100">Salvar</button>
            </div>
          </motion.div>
        </div>
      )}
      {/* Modal Confirmação */}
      {modalManutencao && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${modalManutencao.ativar ? 'bg-orange-100' : 'bg-green-100'}`}>
                <svg className={`w-5 h-5 ${modalManutencao.ativar ? 'text-orange-500' : 'text-green-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              <div>
                <p className="font-bold text-gray-800 text-sm">{modalManutencao.ativar ? 'Ativar Manutenção Global' : 'Desativar Manutenção'}</p>
                <p className="text-xs text-gray-400">{modalManutencao.ativar ? 'Todas as empresas ativas serão afetadas' : 'Todas as empresas em manutenção serão reativadas'}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-6">{modalManutencao.ativar ? 'Deseja colocar TODAS as empresas ativas em modo manutenção? Os usuários não conseguirão fazer login.' : 'Deseja reativar TODAS as empresas que estão em manutenção?'}</p>
            <div className="flex gap-3">
              <button onClick={() => setModalManutencao(null)} className="flex-1 py-2.5 text-gray-500 font-bold text-xs uppercase hover:bg-gray-100 rounded-xl transition-colors">Cancelar</button>
              <button onClick={confirmarManutencao} className={`flex-1 py-2.5 text-white font-bold text-xs uppercase rounded-xl transition-colors ${modalManutencao.ativar ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-600 hover:bg-green-700'}`}>{modalManutencao.ativar ? 'Ativar' : 'Reativar'}</button>
            </div>
          </div>
        </div>
      )}
      {confirmModal.open && (() => {
        const cfg = {
          inativar:   { titulo: 'Inativar Empresa',     subtitulo: 'A empresa não aparecerá mais na lista', acao: 'Inativar',     cor: 'red',    icon: Trash2 },
          bloquear:   { titulo: 'Bloquear Empresa',     subtitulo: 'Uso por inadimplência',                  acao: 'Bloquear',     cor: 'orange', icon: Shield },
          desbloquear:{ titulo: 'Desbloquear Empresa',  subtitulo: 'Liberar acesso ao sistema',              acao: 'Desbloquear',  cor: 'green',  icon: CheckCircle },
        }[confirmModal.tipo];
        const Icon = cfg.icon;
        const cores: Record<string,string> = {
          red:    'bg-red-100 text-red-600',
          orange: 'bg-orange-100 text-orange-600',
          green:  'bg-green-100 text-green-600',
        };
        const btnCores: Record<string,string> = {
          red:    'bg-red-600 hover:bg-red-700',
          orange: 'bg-orange-600 hover:bg-orange-700',
          green:  'bg-green-600 hover:bg-green-700',
        };
        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cores[cfg.cor]}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-gray-800 text-sm">{cfg.titulo}</p>
                  <p className="text-xs text-gray-400">{cfg.subtitulo}</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-6">
                Deseja {cfg.acao.toLowerCase()} <span className="font-bold text-gray-800">{confirmModal.nome}</span>?
              </p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmModal({ open: false, id: null, nome: '', tipo: 'inativar' })}
                  className="flex-1 py-2.5 text-gray-500 font-bold text-xs uppercase hover:bg-gray-100 rounded-xl transition-colors">
                  Cancelar
                </button>
                <button onClick={confirmarAcao}
                  className={`flex-1 py-2.5 text-white font-bold text-xs uppercase rounded-xl transition-colors ${btnCores[cfg.cor]}`}>
                  {cfg.acao}
                </button>
              </div>
            </motion.div>
          </div>
        );
      })()}
    </div>
  );
};

export default AdminPortal;
