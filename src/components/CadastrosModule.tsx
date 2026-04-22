import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Search, Edit, Trash2, Package, Users, Truck, 
  Ruler, CreditCard, Scale, X, MapPin, Mail, Hash, Upload, RefreshCw
} from 'lucide-react';
import { Input } from './UIComponents';
import FormAlert from './FormAlert';
import { Produto, Cliente, Fornecedor, Transportador, Bandeira, Medida } from '../types/nfce';

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

const selClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

// --- Sub-componentes de Listagem ---

export const ProdutosTab = ({ produtos, onEdit, onDelete }: { produtos: Produto[], onEdit: (p: Produto) => void, onDelete: (id: number) => void }) => {
  const [busca, setBusca] = useState('');
  const filtrados = produtos.filter(p =>
    p.descricao.toLowerCase().includes(busca.toLowerCase()) ||
    p.codigoInterno.toLowerCase().includes(busca.toLowerCase()) ||
    (p.codigoBarras || '').includes(busca) ||
    p.ncm.includes(busca)
  );
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      <div className="p-4 border-b border-gray-50 bg-gray-50/30">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar produto..." className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50/50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Código</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Descrição</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">NCM</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Preço</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Estoque</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtrados.map(p => (
              <tr key={p.id} className="hover:bg-gray-50/50 transition-colors group">
                <td className="px-6 py-4 text-xs font-mono text-gray-500">{p.codigoInterno}</td>
                <td className="px-6 py-4 text-sm font-semibold text-gray-700">{p.descricao}</td>
                <td className="px-6 py-4 text-xs text-gray-400">{p.ncm}</td>
                <td className="px-6 py-4 text-right text-sm font-bold text-blue-600">
                  {Number(p.valorUnitario || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>
                <td className="px-6 py-4 text-right">
                   <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${Number(p.estoque || 0) <= 0 ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600'}`}>
                     {Number(p.estoque || 0).toFixed(0)}
                   </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(p)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => p.id && onDelete(p.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
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

export const ClientesTab = ({ clientes, onEdit, onDelete }: { clientes: Cliente[], onEdit: (c: Cliente) => void, onDelete: (id: number) => void }) => {
    const [busca, setBusca] = useState('');
    const filtrados = clientes.filter(c => 
        (c.nome || '').toLowerCase().includes(busca.toLowerCase()) || 
        (c.documento || '').includes(busca)
    );
    return (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-50 bg-gray-50/30">
                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Filtrar clientes..." className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50/50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Cliente</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filtrados.map(c => (
                            <tr key={c.id} className="hover:bg-gray-50/50 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-gray-700">{c.nome}</div>
                                    <div className="text-[10px] text-gray-400 font-mono">{c.documento}</div>
                                </td>
                                <td className="px-6 py-4 text-xs text-gray-500">{c.email || '---'}</td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => onEdit(c)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Edit className="w-4 h-4" /></button>
                                        <button onClick={() => c.id && onDelete(c.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
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

export const FornecedoresTab = ({ fornecedores, onEdit, onDelete }: { fornecedores: Fornecedor[], onEdit: (f: Fornecedor) => void, onDelete: (id: number) => void }) => {
    const [busca, setBusca] = useState('');
    const filtrados = fornecedores.filter(f => (f.nome || '').toLowerCase().includes(busca.toLowerCase()));
    return (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-50 bg-gray-50/30">
                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Filtrar fornecedores..." className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50/50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Fornecedor</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filtrados.map(f => (
                            <tr key={f.id} className="hover:bg-gray-50/50 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-gray-700">{f.nome}</div>
                                    <div className="text-[10px] text-gray-400 font-mono">{f.documento}</div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => onEdit(f)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Edit className="w-4 h-4" /></button>
                                        <button onClick={() => f.id && onDelete(f.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
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

export const TransportadoresTab = ({ transportadores, onEdit, onDelete }: { transportadores: Transportador[], onEdit: (t: Transportador) => void, onDelete: (id: number) => void }) => {
    return <div className="p-8 text-center text-gray-400 italic">Lista de Transportadores</div>;
};

export const BandeirasTab = ({ bandeiras, onEdit, onDelete }: { bandeiras: Bandeira[], onEdit: (b: Bandeira) => void, onDelete: (id: number) => void }) => {
    return <div className="p-8 text-center text-gray-400 italic">Lista de Bandeiras</div>;
};

export const MedidasTab = ({ medidas, onEdit, onDelete }: { medidas: Medida[], onEdit: (m: Medida) => void, onDelete: (id: number) => void }) => {
    return <div className="p-8 text-center text-gray-400 italic">Lista de Unidades de Medida</div>;
};

// --- NCM / Tabela IBPT ---

export const NcmTab = ({ ufEmpresa }: { ufEmpresa?: string }) => {
  const [query,      setQuery]      = useState('');
  const [rows,       setRows]       = useState<any[]>([]);
  const [total,      setTotal]      = useState(0);
  const [offset,     setOffset]     = useState(0);
  const [loading,    setLoading]    = useState(false);
  const [temDados,   setTemDados]   = useState(false);
  const [showImport, setShowImport] = useState(false);
  const LIMIT = 50;

  const buscar = async (q: string, off: number) => {
    setLoading(true);
    try {
        const params = new URLSearchParams({ action: 'ncm_listar', q, limit: String(LIMIT), offset: String(off) });
        if (ufEmpresa) params.set('uf', ufEmpresa.toUpperCase());
        const res = await fetch(`.http://187.77.240?${params}`);
        const data = await res.json();
        setRows(data.data ?? []);
        setTotal(data.total ?? 0);
        setTemDados((data.total ?? 0) > 0 || q !== '');
    } catch {} finally { setLoading(false); }
  };

  const verificarDados = async () => {
    try {
        const res = await fetch('.http://187.77.240?action=ncm_ufs');
        const ufs: any[] = await res.json();
        const temParaUf = ufEmpresa ? ufs.some(u => u.uf === ufEmpresa.toUpperCase()) : ufs.length > 0;
        setTemDados(temParaUf);
        if (temParaUf) buscar('', 0);
    } catch {}
  };

  useEffect(() => { verificarDados(); }, [ufEmpresa]);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-wrap gap-3 items-center shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && buscar(query, 0)} placeholder="Buscar NCM..." className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button onClick={() => setShowImport(true)} className="px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-bold uppercase hover:bg-orange-600 transition-all flex items-center gap-2"><Upload className="w-4 h-4" /> Importar</button>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50/50 border-b border-gray-100">
            <tr><th className="px-6 py-4">NCM</th><th className="px-6 py-4">Descrição</th><th className="px-6 py-4 text-right">Alíquota Total</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((r, i) => (
              <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 font-mono text-gray-500">{r.codigo}</td>
                <td className="px-6 py-4 text-xs text-gray-600 truncate max-w-xs">{r.descricao}</td>
                <td className="px-6 py-4 text-right font-bold text-blue-600">{(parseFloat(r.aliquota_nacional) + parseFloat(r.aliquota_estadual)).toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showImport && <NcmImportModal defaultUf={ufEmpresa ?? ''} onClose={() => { setShowImport(false); verificarDados(); }} />}
    </div>
  );
};

const NcmImportModal = ({ defaultUf, onClose }: any) => {
    // ... simplificado ...
    return <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[300]"><div className="bg-white p-6 rounded-2xl">Importar IBPT <button onClick={onClose}>Fechar</button></div></div>;
};


// --- Modais de Cadastro ---

export const ClienteModal = ({ cliente, onClose, onSave, showAlert }: any) => {
  const [form, setForm] = useState<Cliente>(cliente || {
    nome: '', documento: '', email: '',
    regimeTributario: '1', entidadeGovernamental: '0',
    endereco: { logradouro: '', numero: '', bairro: '', municipio: '', codigoMunicipio: '', uf: 'GO', cep: '' }
  });
  const [municipios, setMunicipios] = useState<{ id: number, nome: string }[]>([]);
  const [loadingMun, setLoadingMun] = useState(false);

  useEffect(() => { if (form.endereco?.uf) fetchMunicipios(form.endereco.uf, false); }, []);

  const fetchMunicipios = async (uf: string, reset = true) => {
    if (reset) setForm((f: any) => ({ ...f, endereco: { ...f.endereco, municipio: '', codigoMunicipio: '' } }));
    if (!uf) return;
    setLoadingMun(true);
    try {
      const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`);
      setMunicipios((await res.json()).map((m: any) => ({ id: m.id, nome: m.nome })));
    } catch { setMunicipios([]); } finally { setLoadingMun(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="text-xl font-bold text-gray-800">{cliente ? 'Editar Cliente' : 'Novo Cliente'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-all"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-auto">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nome" value={form.nome} onChange={(e: any) => setForm({ ...form, nome: e.target.value })} />
            <Input label="CPF / CNPJ" value={form.documento} onChange={(e: any) => setForm({ ...form, documento: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">UF</label>
              <select value={form.endereco?.uf} onChange={e => fetchMunicipios(e.target.value)} className={selClass}>
                {ESTADOS_BR.map(e => <option key={e.sigla} value={e.sigla}>{e.sigla}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Município</label>
              <select disabled={loadingMun} value={form.endereco?.codigoMunicipio} onChange={e => {
                  const m = municipios.find(x => String(x.id) === e.target.value);
                  if (m) setForm((f:any) => ({ ...f, endereco: { ...f.endereco, municipio: m.nome, codigoMunicipio: String(m.id) } }));
              }} className={selClass}>
                <option value="">{loadingMun ? 'Carregando...' : 'Selecione...'}</option>
                {municipios.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/30">
          <button onClick={onClose} className="px-6 py-2 text-gray-500 font-bold uppercase text-[11px] hover:bg-gray-100 rounded-xl transition-all">Cancelar</button>
          <button onClick={() => onSave(form)} className="px-8 py-2 bg-blue-600 text-white font-bold uppercase text-[11px] rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all">Salvar</button>
        </div>
      </motion.div>
    </div>
  );
};

export const ProdutoModal = ({ produto, onClose, onSave, showAlert }: any) => {
    const [form, setForm] = useState<Produto>(produto || {
        descricao: '', valorUnitario: 0, ncm: '', codigoInterno: '', estoque: 0
    });
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl w-full max-w-xl p-6 shadow-2xl">
                <h3 className="text-xl font-bold mb-6">{produto ? 'Editar Produto' : 'Novo Produto'}</h3>
                <div className="space-y-4">
                    <Input label="Descrição" value={form.descricao} onChange={(e:any) => setForm({...form, descricao: e.target.value})} />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Preço" type="number" value={form.valorUnitario} onChange={(e:any) => setForm({...form, valorUnitario: Number(e.target.value)})} />
                        <Input label="NCM" value={form.ncm} onChange={(e:any) => setForm({...form, ncm: e.target.value})} />
                    </div>
                </div>
                <div className="mt-8 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-400 font-bold uppercase text-[11px]">Voltar</button>
                    <button onClick={() => onSave(form)} className="px-8 py-2 bg-blue-600 text-white font-bold uppercase text-[11px] rounded-xl">Gravar</button>
                </div>
            </motion.div>
        </div>
    );
};

export const FornecedorModal = ({ fornecedor, onClose, onSave }: any) => { return null; };
export const TransportadorModal = ({ transportador, onClose, onSave }: any) => { return null; };
export const MedidaModal = ({ medida, onClose, onSave }: any) => { return null; };
export const BandeiraModal = ({ bandeira, onClose, onSave }: any) => { return null; };
