import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Plus, Search, Edit, Trash2, X, Upload, RefreshCw
} from 'lucide-react';
import { Input } from './UIComponents';
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

const useMunicipios = (ufInicial?: string) => {
  const [municipios, setMunicipios] = useState<{ id: number; nome: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const carregar = async (uf: string) => {
    if (!uf) { setMunicipios([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`);
      setMunicipios((await res.json()).map((m: any) => ({ id: m.id, nome: m.nome })));
    } catch { setMunicipios([]); } finally { setLoading(false); }
  };

  useEffect(() => { if (ufInicial) carregar(ufInicial); }, []);

  return { municipios, loading, carregar };
};

// ── Listagem: Produtos ───────────────────────────────────────────────────────
export const ProdutosTab = ({ produtos, onEdit, onDelete, onRefresh }: { produtos: Produto[]; onEdit: (p: Produto) => void; onDelete: (id: number) => void; onRefresh?: () => void }) => {
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
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar Código ou Nome..." className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          {onRefresh && <button onClick={onRefresh} className="p-2 bg-gray-100 text-gray-500 hover:bg-gray-200 rounded-xl transition-all" title="Atualizar"><RefreshCw className="w-4 h-4" /></button>}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50/50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase">Código</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase">Descrição</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase">NCM</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase text-right">Preço</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase text-right">Estoque</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtrados.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400 italic">Nenhum produto cadastrado.</td></tr>
            ) : filtrados.map(p => (
              <tr key={p.id} className="hover:bg-gray-50/50 transition-colors group">
                <td className="px-4 py-3 text-xs font-mono text-gray-500">{p.codigoInterno}</td>
                <td className="px-4 py-3 text-sm font-semibold text-gray-700">{p.descricao}</td>
                <td className="px-4 py-3 text-xs text-gray-400">{p.ncm}</td>
                <td className="px-4 py-3 text-right text-sm font-bold text-blue-600">{Number(p.valorUnitario || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                <td className="px-4 py-3 text-right">
                  <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${Number(p.estoque || 0) <= 0 ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600'}`}>{Number(p.estoque || 0).toFixed(0)}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(p)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => p.id && onDelete(p.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
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

// ── Listagem: Clientes ────────────────────────────────────────────────────────
export const ClientesTab = ({ clientes, onEdit, onDelete }: { clientes: Cliente[]; onEdit: (c: Cliente) => void; onDelete: (id: number) => void }) => {
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
          <input type="text" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Filtrar clientes..." className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50/50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase">Cliente</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase">Telefone</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase">Email</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtrados.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-400 italic">Nenhum cliente cadastrado.</td></tr>
            ) : filtrados.map(c => (
              <tr key={c.id} className="hover:bg-gray-50/50 transition-colors group">
                <td className="px-4 py-3">
                  <div className="font-bold text-gray-700">{c.nome}</div>
                  <div className="text-[10px] text-gray-400 font-mono">{c.documento}</div>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{c.telefone || '---'}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{c.email || '---'}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(c)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => c.id && onDelete(c.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
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

// ── Listagem: Fornecedores ────────────────────────────────────────────────────
export const FornecedoresTab = ({ fornecedores, onEdit, onDelete }: { fornecedores: Fornecedor[]; onEdit: (f: Fornecedor) => void; onDelete: (id: number) => void }) => {
  const [busca, setBusca] = useState('');
  const filtrados = fornecedores.filter(f => (f.nome || '').toLowerCase().includes(busca.toLowerCase()) || (f.documento || '').includes(busca));
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      <div className="p-4 border-b border-gray-50 bg-gray-50/30">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Filtrar fornecedores..." className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50/50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase">Fornecedor</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase">Telefone</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase">Email</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtrados.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-400 italic">Nenhum fornecedor cadastrado.</td></tr>
            ) : filtrados.map(f => (
              <tr key={f.id} className="hover:bg-gray-50/50 transition-colors group">
                <td className="px-4 py-3">
                  <div className="font-bold text-gray-700">{f.nome}</div>
                  <div className="text-[10px] text-gray-400 font-mono">{f.documento}</div>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{f.telefone || '---'}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{f.email || '---'}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(f)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => f.id && onDelete(f.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
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

// ── Listagem: Transportadores ─────────────────────────────────────────────────
export const TransportadoresTab = ({ transportadores, onEdit, onDelete }: { transportadores: Transportador[]; onEdit: (t: Transportador) => void; onDelete: (id: number) => void }) => {
  const [busca, setBusca] = useState('');
  const filtrados = transportadores.filter(t => (t.nome || '').toLowerCase().includes(busca.toLowerCase()) || (t.documento || '').includes(busca));
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      <div className="p-4 border-b border-gray-50 bg-gray-50/30">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Filtrar transportadores..." className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50/50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase">Transportador</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase">IE</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase">Telefone</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtrados.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-400 italic">Nenhum transportador cadastrado.</td></tr>
            ) : filtrados.map(t => (
              <tr key={t.id} className="hover:bg-gray-50/50 transition-colors group">
                <td className="px-4 py-3">
                  <div className="font-bold text-gray-700">{t.nome}</div>
                  <div className="text-[10px] text-gray-400 font-mono">{t.documento}</div>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{t.ie || '---'}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{t.telefone || '---'}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(t)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => t.id && onDelete(t.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
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

// ── Listagem: Bandeiras ───────────────────────────────────────────────────────
const TPAG_LABELS: Record<string, string> = {
  '01': 'Dinheiro', '02': 'Cheque', '03': 'Cartão de Crédito', '04': 'Cartão de Débito',
  '05': 'Crédito Loja', '10': 'Vale Alimentação', '11': 'Vale Refeição', '12': 'Vale Presente',
  '13': 'Vale Combustível', '15': 'Boleto Bancário', '16': 'Depósito Bancário',
  '17': 'PIX', '18': 'Transferência', '19': 'Programa de Fidelidade', '99': 'Outros',
};

export const BandeirasTab = ({ bandeiras, onEdit, onDelete }: { bandeiras: Bandeira[]; onEdit: (b: Bandeira) => void; onDelete: (id: number) => void }) => (
  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead className="bg-gray-50/50 border-b border-gray-100">
          <tr>
            <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase">Forma de Pagamento</th>
            <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase">Bandeira / Credenciadora</th>
            <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase">CNPJ Credenciadora</th>
            <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {bandeiras.length === 0 ? (
            <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-400 italic">Nenhuma bandeira cadastrada.</td></tr>
          ) : bandeiras.map(b => (
            <tr key={b.id} className="hover:bg-gray-50/50 transition-colors group">
              <td className="px-4 py-3 text-sm font-semibold text-gray-700">{TPAG_LABELS[b.tpag] || b.tpag}</td>
              <td className="px-4 py-3 text-xs text-gray-500">{b.tband_opc || '---'}</td>
              <td className="px-4 py-3 text-xs font-mono text-gray-400">{b.cnpj_opc || '---'}</td>
              <td className="px-4 py-3 text-right">
                <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => onEdit(b)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => b.id && onDelete(b.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// ── Listagem: Medidas ─────────────────────────────────────────────────────────
export const MedidasTab = ({ medidas, onEdit, onDelete }: { medidas: Medida[]; onEdit: (m: Medida) => void; onDelete: (id: number) => void }) => (
  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead className="bg-gray-50/50 border-b border-gray-100">
          <tr>
            <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase">Código</th>
            <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase">Descrição</th>
            <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase text-center">Fator</th>
            <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase text-center">Pesável</th>
            <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase text-center">Ativo</th>
            <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {medidas.length === 0 ? (
            <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400 italic">Nenhuma medida cadastrada.</td></tr>
          ) : medidas.map(m => (
            <tr key={m.id} className="hover:bg-gray-50/50 transition-colors group">
              <td className="px-4 py-3 font-mono font-bold text-gray-700">{m.codigo}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{m.descricao}</td>
              <td className="px-4 py-3 text-center text-xs text-gray-500">{m.fator}</td>
              <td className="px-4 py-3 text-center">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${m.pesavel ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>{m.pesavel ? 'Sim' : 'Não'}</span>
              </td>
              <td className="px-4 py-3 text-center">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${m.ativo !== false ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>{m.ativo !== false ? 'Ativo' : 'Inativo'}</span>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => onEdit(m)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => m.id && onDelete(m.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// ── NCM / Tabela IBPT ─────────────────────────────────────────────────────────
export const NcmTab = ({ ufEmpresa }: { ufEmpresa?: string }) => {
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [temDados, setTemDados] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const LIMIT = 50;

  const buscar = async (q: string, off: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ action: 'ncm_listar', q, limit: String(LIMIT), offset: String(off) });
      if (ufEmpresa) params.set('uf', ufEmpresa.toUpperCase());
      const res = await fetch(`./api.php?${params}`);
      const data = await res.json();
      setRows(data.data ?? []);
      setTotal(data.total ?? 0);
      setTemDados((data.total ?? 0) > 0 || q !== '');
    } catch { } finally { setLoading(false); }
  };

  const verificarDados = async () => {
    try {
      const res = await fetch('./api.php?action=ncm_ufs');
      const ufs: any[] = await res.json();
      const temParaUf = ufEmpresa ? ufs.some(u => u.uf === ufEmpresa.toUpperCase()) : ufs.length > 0;
      setTemDados(temParaUf);
      if (temParaUf) buscar('', 0);
    } catch { }
  };

  useEffect(() => { verificarDados(); }, [ufEmpresa]);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-wrap gap-3 items-center shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && buscar(query, 0)} placeholder="Buscar NCM..." className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button onClick={() => buscar(query, 0)} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Buscar
        </button>
        <button onClick={() => setShowImport(true)} className="px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 flex items-center gap-2">
          <Upload className="w-4 h-4" /> Importar IBPT
        </button>
      </div>
      {!temDados && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          Tabela IBPT não importada. Clique em <strong>Importar IBPT</strong> para carregar as alíquotas.
        </div>
      )}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50/50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase">NCM</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase">Descrição</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase text-right">Alíquota Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={3} className="px-4 py-10 text-center text-gray-400"><RefreshCw className="w-5 h-5 animate-spin mx-auto" /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-10 text-center text-gray-400 italic">Nenhum resultado.</td></tr>
            ) : rows.map((r, i) => (
              <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3 font-mono text-gray-500">{r.codigo}</td>
                <td className="px-4 py-3 text-xs text-gray-600 truncate max-w-xs">{r.descricao}</td>
                <td className="px-4 py-3 text-right font-bold text-blue-600">{(parseFloat(r.aliquota_nacional || 0) + parseFloat(r.aliquota_estadual || 0)).toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        {total > LIMIT && (
          <div className="p-3 border-t border-gray-100 flex justify-between items-center text-xs text-gray-400">
            <span>{offset + 1}–{Math.min(offset + LIMIT, total)} de {total}</span>
            <div className="flex gap-2">
              <button disabled={offset === 0} onClick={() => { setOffset(offset - LIMIT); buscar(query, offset - LIMIT); }} className="px-3 py-1 border rounded-lg disabled:opacity-40">Anterior</button>
              <button disabled={offset + LIMIT >= total} onClick={() => { setOffset(offset + LIMIT); buscar(query, offset + LIMIT); }} className="px-3 py-1 border rounded-lg disabled:opacity-40">Próximo</button>
            </div>
          </div>
        )}
      </div>
      {showImport && <NcmImportModal defaultUf={ufEmpresa ?? ''} onClose={() => { setShowImport(false); verificarDados(); }} />}
    </div>
  );
};

const NcmImportModal = ({ defaultUf, onClose }: { defaultUf: string; onClose: () => void }) => {
  const [uf, setUf] = useState(defaultUf);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const handleImport = async () => {
    if (!uf) { setMsg('Selecione o estado.'); return; }
    setLoading(true); setMsg('');
    try {
      const res = await fetch('./api.php?action=ncm_importar_ibpt', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uf }),
      });
      const data = await res.json();
      setMsg(data.success ? `Importado com sucesso! ${data.total ?? ''} registros.` : data.message || 'Erro ao importar.');
    } catch { setMsg('Falha de comunicação.'); } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[300] p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-gray-800">Importar Tabela IBPT</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <p className="text-xs text-gray-500 mb-4">Selecione o estado para importar as alíquotas de tributos (IBPT) do servidor.</p>
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-600 mb-1">Estado (UF)</label>
          <select value={uf} onChange={e => setUf(e.target.value)} className={selClass}>
            <option value="">Selecione...</option>
            {ESTADOS_BR.map(e => <option key={e.sigla} value={e.sigla}>{e.sigla} — {e.nome}</option>)}
          </select>
        </div>
        {msg && <p className={`text-sm mb-4 ${msg.includes('sucesso') ? 'text-green-600' : 'text-red-600'}`}>{msg}</p>}
        <button onClick={handleImport} disabled={loading} className="w-full py-2 bg-orange-500 text-white rounded-xl font-bold text-sm hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2">
          {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Importando...</> : <><Upload className="w-4 h-4" /> Importar</>}
        </button>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════════
// MODAIS DE CADASTRO
// ════════════════════════════════════════════════════════════════════════════════

// ── Modal: Cliente ────────────────────────────────────────────────────────────
export const ClienteModal = ({ cliente, onClose, onSave, showAlert }: any) => {
  const [form, setForm] = useState<any>(cliente || {
    nome: '', documento: '', email: '', telefone: '', ie: '', indIEDest: '9',
    regimeTributario: '1', entidadeGovernamental: '0',
    endereco: { logradouro: '', numero: '', complemento: '', bairro: '', municipio: '', codigoMunicipio: '', uf: 'GO', cep: '' }
  });
  const { municipios, loading: loadingMun, carregar } = useMunicipios(form.endereco?.uf);

  const setEnd = (field: string, val: string) => setForm((f: any) => ({ ...f, endereco: { ...f.endereco, [field]: val } }));

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="text-lg font-bold text-gray-800">{cliente ? 'Editar Cliente' : 'Novo Cliente'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nome *" value={form.nome} onChange={(e: any) => setForm({ ...form, nome: e.target.value })} />
            <Input label="CPF / CNPJ *" value={form.documento} onChange={(e: any) => setForm({ ...form, documento: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" type="email" value={form.email || ''} onChange={(e: any) => setForm({ ...form, email: e.target.value })} />
            <Input label="Telefone" value={form.telefone || ''} onChange={(e: any) => setForm({ ...form, telefone: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Inscrição Estadual" value={form.ie || ''} onChange={(e: any) => setForm({ ...form, ie: e.target.value })} />
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Indicador IE Destinatário</label>
              <select value={form.indIEDest || '9'} onChange={e => setForm({ ...form, indIEDest: e.target.value })} className={selClass}>
                <option value="1">1 – Contribuinte ICMS</option>
                <option value="2">2 – Contribuinte isento</option>
                <option value="9">9 – Não contribuinte</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Regime Tributário</label>
              <select value={form.regimeTributario || '1'} onChange={e => setForm({ ...form, regimeTributario: e.target.value })} className={selClass}>
                <option value="1">1 – Simples Nacional</option>
                <option value="2">2 – Simples Nacional – Excesso</option>
                <option value="3">3 – Regime Normal</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Entidade Governamental</label>
              <select value={form.entidadeGovernamental || '0'} onChange={e => setForm({ ...form, entidadeGovernamental: e.target.value })} className={selClass}>
                <option value="0">0 – Não é entidade governamental</option>
                <option value="1">1 – Administração Pública Federal</option>
                <option value="2">2 – Administração Pública Estadual ou DF</option>
                <option value="3">3 – Administração Pública Municipal</option>
              </select>
            </div>
          </div>
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase mb-3">Endereço</p>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <Input label="Logradouro" value={form.endereco?.logradouro || ''} onChange={(e: any) => setEnd('logradouro', e.target.value)} />
              </div>
              <Input label="Número" value={form.endereco?.numero || ''} onChange={(e: any) => setEnd('numero', e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-4 mt-3">
              <Input label="Complemento" value={form.endereco?.complemento || ''} onChange={(e: any) => setEnd('complemento', e.target.value)} />
              <Input label="Bairro" value={form.endereco?.bairro || ''} onChange={(e: any) => setEnd('bairro', e.target.value)} />
              <Input label="CEP" value={form.endereco?.cep || ''} onChange={(e: any) => setEnd('cep', e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-4 mt-3">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">UF</label>
                <select value={form.endereco?.uf || 'GO'} onChange={e => { setEnd('uf', e.target.value); carregar(e.target.value); }} className={selClass}>
                  {ESTADOS_BR.map(e => <option key={e.sigla} value={e.sigla}>{e.sigla}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Município</label>
                <select disabled={loadingMun} value={form.endereco?.codigoMunicipio || ''} onChange={e => {
                  const m = municipios.find(x => String(x.id) === e.target.value);
                  if (m) { setEnd('municipio', m.nome); setEnd('codigoMunicipio', String(m.id)); }
                }} className={selClass}>
                  <option value="">{loadingMun ? 'Carregando...' : 'Selecione...'}</option>
                  {municipios.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>
        <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/30">
          <button onClick={onClose} className="px-6 py-2 text-gray-500 font-bold uppercase text-[11px] hover:bg-gray-100 rounded-xl">Cancelar</button>
          <button onClick={() => {
            const end = form.endereco || {};
            if (!end.logradouro?.trim() || !end.numero?.trim() || !end.bairro?.trim() || !end.codigoMunicipio || !end.cep?.trim()) {
              showAlert?.('Atenção', 'Endereço completo é obrigatório: Logradouro, Número, Bairro, Município e CEP.');
              return;
            }
            onSave(form);
          }} className="px-8 py-2 bg-blue-600 text-white font-bold uppercase text-[11px] rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700">Salvar</button>
        </div>
      </motion.div>
    </div>
  );
};

// ── Modal: Produto ────────────────────────────────────────────────────────────
const normalizeProduto = (p: any) => p ? {
  id: p.id,
  codigoInterno:         p.codigoInterno         ?? p.codigo_interno         ?? '',
  codigoBarras:          p.codigoBarras           ?? p.codigo_barras          ?? '',
  codigoFornecedor:      p.codigoFornecedor       ?? p.codigo_fornecedor      ?? '',
  descricao:             p.descricao              ?? '',
  ncm:                   p.ncm                    ?? '',
  cest:                  p.cest                   ?? '',
  unidadeComercial:      p.unidadeComercial       ?? p.unidade_comercial      ?? 'UN',
  valorUnitario:         Number(p.valorUnitario   ?? p.valor_unitario         ?? 0),
  estoque:               Number(p.estoque         ?? 0),
  custoCopra:            Number(p.custoCopra      ?? p.custo_compra           ?? 0),
  simplesNacional:       Number(p.simplesNacional  ?? p.simples_nacional       ?? 0),
  despesasOperacionais:  Number(p.despesasOperacionais ?? p.despesas_operacionais ?? 0),
  freteSeguro:           Number(p.freteSeguro      ?? p.frete_seguro           ?? 0),
  margemLucro:           Number(p.margemLucro      ?? p.margem_lucro           ?? 0),
  cfop:                  p.cfop                   ?? '5102',
  origemMercadoria:      String(p.origemMercadoria ?? p.origem_mercadoria      ?? '0'),
  icmsCstCsosn:          p.icmsCstCsosn           ?? p.icms_cst_csosn         ?? '102',
  icmsAliquota:          Number(p.icmsAliquota     ?? p.icms_aliquota          ?? 0),
  pisCst:                p.pisCst                 ?? p.pis_cst                ?? '07',
  pisAliquota:           Number(p.pisAliquota      ?? p.pis_aliquota           ?? 0),
  cofinsCst:             p.cofinsCst              ?? p.cofins_cst             ?? '07',
  cofinsAliquota:        Number(p.cofinsAliquota   ?? p.cofins_aliquota        ?? 0),
  cbsCst:                p.cbsCst                 ?? p.cbs_cst                ?? '',
  cbsClasstrib:          p.cbsClasstrib           ?? p.cbs_classtrib          ?? '',
  ibsCst:                p.ibsCst                 ?? p.ibs_cst                ?? '',
  ibsClasstrib:          p.ibsClasstrib           ?? p.ibs_classtrib          ?? '',
  cCredPres:             p.cCredPres              ?? p.ccredpres              ?? '',
} : {
  codigoInterno: '', codigoBarras: '', codigoFornecedor: '', descricao: '', ncm: '', cest: '',
  unidadeComercial: 'UN', valorUnitario: 0, estoque: 0,
  custoCopra: 0, simplesNacional: 0, despesasOperacionais: 0, freteSeguro: 0, margemLucro: 0,
  cfop: '5102', origemMercadoria: '0',
  icmsCstCsosn: '102', icmsAliquota: 0,
  pisCst: '07', pisAliquota: 0,
  cofinsCst: '07', cofinsAliquota: 0,
  cbsCst: '', cbsClasstrib: '', ibsCst: '', ibsClasstrib: '', cCredPres: '',
};

const NumInput = ({ value, onChange, className }: { value: number; onChange: (n: number) => void; className?: string }) => {
  const [editing, setEditing] = React.useState(false);
  const [raw, setRaw] = React.useState('');
  const fmt = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <input type="text" inputMode="decimal"
      value={editing ? raw : fmt(value)}
      onFocus={() => { setEditing(true); setRaw(value === 0 ? '' : String(value).replace('.', ',')); }}
      onBlur={e => { setEditing(false); onChange(parseFloat(e.target.value.replace(',', '.')) || 0); }}
      onChange={e => setRaw(e.target.value)}
      className={className}
    />
  );
};

export const ProdutoModal = ({ produto, onClose, onSave, showAlert, usuarioDfe }: any) => {
  const [form, setForm] = useState<any>(() => normalizeProduto(produto));
  const isFiscal = ![0, 3].includes(usuarioDfe);
  const [aba, setAba] = useState<'geral' | 'fiscal'>('geral');

  const [ncmDetect, setNcmDetect] = useState<{ ibpt: any; rtc: any[] } | null>(null);
  const [ncmLoading, setNcmLoading] = useState(false);
  const [rtcCstList, setRtcCstList] = useState<any[]>([]);
  const [rtcCcredpres, setRtcCcredpres] = useState<any[]>([]);
  const [rtcConfirmIdx, setRtcConfirmIdx] = useState<number | null>(null);
  const set = (f: string, v: any) => setForm((p: any) => ({ ...p, [f]: v }));

  const isRtcContextSpecific = (r: any) =>
    String(r.classtrib ?? '').startsWith('2') || parseInt(r.cst ?? '0') >= 200;

  useEffect(() => {
    fetch('./api.php?action=rtc_cst_classtrib').then(r => r.json()).then(d => { if (Array.isArray(d)) setRtcCstList(d); }).catch(() => {});
    fetch('./api.php?action=rtc_ccredpres').then(r => r.json()).then(d => { if (Array.isArray(d)) setRtcCcredpres(d); }).catch(() => {});
  }, []);

  const handleNcmChange = async (val: string) => {
    set('ncm', val);
    const clean = val.replace(/\D/g, '');
    if (clean.length < 8) { setNcmDetect(null); return; }
    setNcmLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        fetch(`./api.php?action=ncm_listar&q=${clean}&limit=5`).then(r => r.json()).catch(() => ({ data: [] })),
        fetch(`./api.php?action=rtc_consultar_ncm&ncm=${clean}&modelo=55`).then(r => r.json()).catch(() => []),
      ]);
      const ibpt = (r1.data || []).find((x: any) => x.codigo === clean) || r1.data?.[0] || null;
      let rtc: any[] = Array.isArray(r2) ? r2 : [];
      // NCM sem enquadramento especial nos anexos LC 214 → sugere tributação integral padrão
      if (rtc.length === 0 && ibpt) {
        rtc = [{
          cst: '000',
          classtrib: '000001',
          nome_classtrib: 'Tributação integral — sem enquadramento especial nos anexos LC 214',
          pred_cbs: 1,
          pred_ibs: 1,
          legislacao: 'LC 214/2025 Art. 4º',
          _padrao: true,
        }];
      }
      setNcmDetect((ibpt || rtc.length) ? { ibpt, rtc } : null);
    } catch { setNcmDetect(null); } finally { setNcmLoading(false); }
  };

  const applyRtcSugestao = (idx = 0) => {
    if (!ncmDetect?.rtc?.length) return;
    const hit = ncmDetect.rtc[idx];
    // pred_cbs/pred_ibs são percentuais de redução (0 = sem redução ≠ não aplicar) — sempre aplica o CST
    setForm((p: any) => ({
      ...p,
      cbsCst:       hit.cst       || p.cbsCst,
      cbsClasstrib: hit.classtrib || p.cbsClasstrib,
      ibsCst:       hit.cst       || p.ibsCst,
      ibsClasstrib: hit.classtrib || p.ibsClasstrib,
    }));
  };

  const uniqBy = (arr: any[], key: string) => [...new Map(arr.map(x => [x[key], x])).values()];
  const cstOpts = rtcCstList.length ? uniqBy(rtcCstList, 'cst') : [
    { cst: '01', descricao_cst: 'Tributável' }, { cst: '02', descricao_cst: 'Tributável monofásico' },
    { cst: '03', descricao_cst: 'Alíquota zero' }, { cst: '04', descricao_cst: 'Isenta' },
    { cst: '05', descricao_cst: 'Imune' }, { cst: '06', descricao_cst: 'Suspensa' },
    { cst: '07', descricao_cst: 'Não incidência' }, { cst: '49', descricao_cst: 'Outras saídas' },
  ];
  const classOpts = rtcCstList.length ? uniqBy(rtcCstList, 'classtrib') : [
    { classtrib: 'B00', nome_classtrib: 'Bem' }, { classtrib: 'S00', nome_classtrib: 'Serviço' },
  ];
  const ccredOpts = rtcCcredpres.length ? rtcCcredpres : [
    { ccredpres: '1', descricao: 'Crédito integral' },
    { ccredpres: '2', descricao: 'Crédito parcial' },
    { ccredpres: '3', descricao: 'Sem crédito' },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="text-lg font-bold text-gray-800">{produto ? 'Editar Produto' : 'Novo Produto'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="flex border-b border-gray-100">
          {(['geral', 'fiscal'] as const).map(t => {
            if (t === 'fiscal' && !isFiscal) return null;
            return (
              <button key={t} onClick={() => setAba(t)} className={`flex-1 py-3 text-xs font-bold uppercase transition-all text-center ${aba === t ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
                {t === 'geral' ? 'Geral' : 'Fiscal'}
              </button>
            );
          })}
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {aba === 'geral' ? (
            <>
              <div className="col-span-2">
                <Input label="Descrição *" value={form.descricao} onChange={(e: any) => set('descricao', e.target.value)} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Input label="Código Interno *" value={form.codigoInterno} onChange={(e: any) => set('codigoInterno', e.target.value)} />
                <Input label="Código de Barras (EAN)" value={form.codigoBarras || ''} onChange={(e: any) => set('codigoBarras', e.target.value)} />
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Unidade</label>
                  <select value={form.unidadeComercial || 'UN'} onChange={e => set('unidadeComercial', e.target.value)} className={selClass}>
                    {['UN', 'KG', 'G', 'L', 'ML', 'MT', 'CM', 'CX', 'PCT', 'PAR', 'DZ', 'PC'].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Estoque" type="number" step="0.001" value={form.estoque || 0} onChange={(e: any) => set('estoque', Number(e.target.value))} />
                <Input label="Cód. Fornecedor" value={form.codigoFornecedor || ''} onChange={(e: any) => set('codigoFornecedor', e.target.value)} />
              </div>
              <div className="border border-blue-100 bg-blue-50/30 rounded-xl p-4 space-y-3">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">Formação do Preço de Venda — Markup Divisor</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Custo de Compra (R$)</label>
                    <NumInput value={form.custoCopra || 0}
                      onChange={custo => {
                        const soma = Number(form.simplesNacional||0) + Number(form.despesasOperacionais||0) + Number(form.freteSeguro||0) + Number(form.margemLucro||0);
                        const div = 1 - soma / 100;
                        setForm((p: any) => ({ ...p, custoCopra: custo, valorUnitario: custo > 0 && div > 0 ? parseFloat((custo / div).toFixed(2)) : p.valorUnitario }));
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Simples Nacional (%)</label>
                    <NumInput value={form.simplesNacional || 0}
                      onChange={val => {
                        const custo = Number(form.custoCopra || 0);
                        const soma = val + Number(form.despesasOperacionais||0) + Number(form.freteSeguro||0) + Number(form.margemLucro||0);
                        const div = 1 - soma / 100;
                        setForm((p: any) => ({ ...p, simplesNacional: val, valorUnitario: custo > 0 && div > 0 ? parseFloat((custo / div).toFixed(2)) : p.valorUnitario }));
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Despesas Operacionais (%)</label>
                    <NumInput value={form.despesasOperacionais || 0}
                      onChange={val => {
                        const custo = Number(form.custoCopra || 0);
                        const soma = Number(form.simplesNacional||0) + val + Number(form.freteSeguro||0) + Number(form.margemLucro||0);
                        const div = 1 - soma / 100;
                        setForm((p: any) => ({ ...p, despesasOperacionais: val, valorUnitario: custo > 0 && div > 0 ? parseFloat((custo / div).toFixed(2)) : p.valorUnitario }));
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Frete e Seguro (%)</label>
                    <NumInput value={form.freteSeguro || 0}
                      onChange={val => {
                        const custo = Number(form.custoCopra || 0);
                        const soma = Number(form.simplesNacional||0) + Number(form.despesasOperacionais||0) + val + Number(form.margemLucro||0);
                        const div = 1 - soma / 100;
                        setForm((p: any) => ({ ...p, freteSeguro: val, valorUnitario: custo > 0 && div > 0 ? parseFloat((custo / div).toFixed(2)) : p.valorUnitario }));
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Margem de Lucro (%)</label>
                    <NumInput value={form.margemLucro || 0}
                      onChange={val => {
                        const custo = Number(form.custoCopra || 0);
                        const soma = Number(form.simplesNacional||0) + Number(form.despesasOperacionais||0) + Number(form.freteSeguro||0) + val;
                        const div = 1 - soma / 100;
                        setForm((p: any) => ({ ...p, margemLucro: val, valorUnitario: custo > 0 && div > 0 ? parseFloat((custo / div).toFixed(2)) : p.valorUnitario }));
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-blue-700 uppercase mb-1 ml-1">Preço de Venda (R$) *</label>
                    <NumInput value={form.valorUnitario || 0}
                      onChange={preco => {
                        const custo = Number(form.custoCopra || 0);
                        const fixo = Number(form.simplesNacional||0) + Number(form.despesasOperacionais||0) + Number(form.freteSeguro||0);
                        const margem = preco > 0 && custo > 0 ? parseFloat(((1 - custo / preco) * 100 - fixo).toFixed(2)) : form.margemLucro;
                        setForm((p: any) => ({ ...p, valorUnitario: preco, margemLucro: margem > 0 ? margem : p.margemLucro }));
                      }}
                      className="w-full border-2 border-blue-400 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-blue-700 bg-blue-50" />
                  </div>
                </div>
                {Number(form.custoCopra) > 0 && Number(form.valorUnitario) > 0 && (() => {
                  const custo = Number(form.custoCopra);
                  const preco = Number(form.valorUnitario);
                  const soma = Number(form.simplesNacional||0) + Number(form.despesasOperacionais||0) + Number(form.freteSeguro||0) + Number(form.margemLucro||0);
                  const lucro = preco - custo;
                  const markup = ((preco / custo) - 1) * 100;
                  return (
                    <div className="border-t border-blue-100 pt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <span className="text-gray-500">Markup Divisor: <strong className="text-gray-700">{(1 - soma/100).toFixed(4)}</strong></span>
                      <span className="text-gray-500">Markup: <strong className="text-blue-600">{markup.toFixed(2)}%</strong></span>
                      <span className="text-gray-500">Lucro bruto: <strong className="text-green-600">R$ {lucro.toFixed(2).replace('.', ',')}</strong></span>
                      <span className="text-gray-500">Margem real: <strong className="text-purple-600">{((lucro / preco) * 100).toFixed(2)}%</strong></span>
                    </div>
                  );
                })()}
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Input label="NCM *" value={form.ncm} onChange={(e: any) => handleNcmChange(e.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="Ex: 22021000" maxLength={8} inputMode="numeric" />
                  {ncmLoading && <p className="text-[10px] text-blue-500 mt-1 ml-1 animate-pulse">Buscando NCM...</p>}
                </div>
                <Input label="CEST" value={form.cest || ''} onChange={(e: any) => set('cest', e.target.value)} placeholder="Ex: 0300200" />
              </div>
              {ncmDetect && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 space-y-2">
                  {ncmDetect.ibpt && (
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-indigo-500 uppercase mb-0.5">IBPT — {ncmDetect.ibpt.codigo}</p>
                        <p className="text-sm font-semibold text-gray-800 leading-snug">{ncmDetect.ibpt.descricao}</p>
                        <div className="flex flex-wrap gap-3 mt-1.5">
                          <span className="text-[11px] text-gray-500">Nacional: <strong className="text-gray-700">{Number(ncmDetect.ibpt.aliquota_nacional || 0).toFixed(2)}%</strong></span>
                          <span className="text-[11px] text-gray-500">Estadual: <strong className="text-gray-700">{Number(ncmDetect.ibpt.aliquota_estadual || 0).toFixed(2)}%</strong></span>
                        </div>
                      </div>
                    </div>
                  )}
                  {ncmDetect.rtc.length > 0 && (
                    <div className="border-t border-indigo-200 pt-2">
                      <p className="text-[10px] font-bold text-purple-600 uppercase mb-2">
                        LC 214/2025 — Sugestões IBS/CBS
                        {ncmDetect.rtc.length > 1 && <span className="normal-case font-normal text-gray-400 ml-1">({ncmDetect.rtc.length} enquadramentos — selecione a finalidade de uso)</span>}
                      </p>
                      <div className="space-y-2">
                        {ncmDetect.rtc.map((r: any, i: number) => {
                          const specific = isRtcContextSpecific(r);
                          const isPadrao = !!r._padrao;
                          const confirming = rtcConfirmIdx === i;
                          const cardCls = specific ? 'border-amber-300 bg-amber-50' : isPadrao ? 'border-gray-200 bg-gray-50' : 'border-purple-100 bg-purple-50';
                          return (
                            <div key={i} className={`rounded-lg border ${cardCls}`}>
                              <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                                <div className="flex flex-wrap gap-1.5 text-[11px] text-gray-600 flex-1 min-w-0">
                                  <span className={`font-mono px-1.5 rounded ${specific ? 'bg-amber-200 text-amber-800' : isPadrao ? 'bg-gray-200 text-gray-700' : 'bg-purple-100 text-purple-700'}`}>{r.cst || '—'}</span>
                                  <span className="text-gray-700 font-medium">{r.classtrib || ''}</span>
                                  <span className="bg-blue-100 text-blue-700 px-1.5 rounded font-bold">CBS</span>
                                  <span className="bg-green-100 text-green-700 px-1.5 rounded font-bold">IBS</span>
                                  {r.nome_classtrib ? <span className={`text-[10px] ${specific ? 'text-amber-700 font-medium' : isPadrao ? 'text-gray-500 italic' : 'text-gray-500'}`}>{r.nome_classtrib}</span> : null}
                                  {r.legislacao ? <span className="text-gray-400 text-[10px]">{r.legislacao}{r.anexo ? ` Anx.${r.anexo}` : ''}</span> : null}
                                  {specific && <span className="text-[9px] font-bold bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full uppercase">Finalidade específica</span>}
                                </div>
                                <button type="button"
                                  onClick={() => specific ? setRtcConfirmIdx(confirming ? null : i) : applyRtcSugestao(i)}
                                  className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded transition-colors whitespace-nowrap ${specific ? 'bg-amber-500 text-white hover:bg-amber-600' : isPadrao ? 'bg-gray-500 text-white hover:bg-gray-600' : 'bg-purple-600 text-white hover:bg-purple-700'}`}>
                                  {specific ? (confirming ? 'Cancelar' : 'Verificar') : 'Aplicar'}
                                </button>
                              </div>
                              {confirming && specific && (
                                <div className="px-3 pb-3 pt-2 border-t border-amber-200 space-y-2">
                                  {/* Título e cClassTrib */}
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[10px] font-bold bg-amber-200 text-amber-800 px-2 py-0.5 rounded font-mono">{r.classtrib}</span>
                                    {r.lc_referencia && <span className="text-[10px] text-amber-700 font-medium">{r.lc_referencia}</span>}
                                  </div>
                                  {/* Redução CBS / IBS */}
                                  <div className="flex gap-4">
                                    <div className="flex flex-col items-center bg-amber-100 rounded px-3 py-1">
                                      <span className="text-[9px] font-bold text-amber-700 uppercase tracking-wide">% Red. CBS</span>
                                      <span className="text-[15px] font-extrabold text-amber-900">{r.pred_cbs != null ? Number(r.pred_cbs).toFixed(0) : '—'}</span>
                                    </div>
                                    <div className="flex flex-col items-center bg-amber-100 rounded px-3 py-1">
                                      <span className="text-[9px] font-bold text-amber-700 uppercase tracking-wide">% Red. IBS</span>
                                      <span className="text-[15px] font-extrabold text-amber-900">{r.pred_ibs != null ? Number(r.pred_ibs).toFixed(0) : '—'}</span>
                                    </div>
                                  </div>
                                  {/* Link para averiguação */}
                                  {r.link && (
                                    <div className="bg-blue-50 border border-blue-200 rounded px-2 py-1.5">
                                      <p className="text-[9px] font-bold text-blue-600 uppercase tracking-wide mb-0.5">Link (clique para abrir no navegador)</p>
                                      <a href={r.link} target="_blank" rel="noreferrer" className="text-[10px] text-blue-700 hover:text-blue-900 hover:underline break-all">{r.link}</a>
                                    </div>
                                  )}
                                  {/* Nome */}
                                  {r.nome_classtrib && (
                                    <p className="text-[11px] font-semibold text-amber-900">{r.nome_classtrib}</p>
                                  )}
                                  {/* Descrição detalhada */}
                                  {r.descricao_classtrib && r.descricao_classtrib !== r.nome_classtrib && (
                                    <p className="text-[11px] text-amber-800">{r.descricao_classtrib}</p>
                                  )}
                                  {/* Redação da lei */}
                                  {r.lc_redacao && (
                                    <details className="text-[10px]">
                                      <summary className="cursor-pointer text-amber-700 font-medium hover:text-amber-900">Redação da LC 214/2025 ▾</summary>
                                      <pre className="mt-1 whitespace-pre-wrap text-amber-800 bg-amber-100 rounded p-2 leading-relaxed">{r.lc_redacao}</pre>
                                    </details>
                                  )}
                                  <p className="text-[11px] text-amber-900 font-medium pt-1 border-t border-amber-200">
                                    ⚠️ Este enquadramento aplica-se <strong>exclusivamente</strong> às operações descritas acima. Confirme antes de aplicar ao produto.
                                  </p>
                                  <div className="flex justify-end pt-1">
                                    <button type="button" onClick={() => { applyRtcSugestao(i); setRtcConfirmIdx(null); }}
                                      className="text-[11px] font-bold bg-amber-600 text-white px-4 py-1.5 rounded hover:bg-amber-700 transition-colors">
                                      Confirmar e Aplicar
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">CFOP *</label>
                  <select value={form.cfop} onChange={e => set('cfop', e.target.value)} className={selClass}>
                    <option value="5102">5102 – Venda de mercadoria (dentro UF)</option>
                    <option value="5405">5405 – Venda com ST (dentro UF)</option>
                    <option value="6102">6102 – Venda de mercadoria (outra UF)</option>
                    <option value="5949">5949 – Outras saídas</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Origem da Mercadoria *</label>
                  <select value={form.origemMercadoria} onChange={e => set('origemMercadoria', e.target.value)} className={selClass}>
                    <option value="0">0 – Nacional</option>
                    <option value="1">1 – Estrangeira (importação direta)</option>
                    <option value="2">2 – Estrangeira (mercado interno)</option>
                    <option value="3">3 – Nacional com mais de 40% conteúdo estrangeiro</option>
                    <option value="4">4 – Nacional com processo produtivo básico</option>
                    <option value="5">5 – Nacional com até 40% conteúdo estrangeiro</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">ICMS CST/CSOSN *</label>
                  <select value={form.icmsCstCsosn} onChange={e => set('icmsCstCsosn', e.target.value)} className={selClass}>
                    <option value="102">102 – Tributada SN s/ crédito</option>
                    <option value="202">202 – Tributada SN s/ crédito + ST</option>
                    <option value="400">400 – Não tributada (SN)</option>
                    <option value="500">500 – ICMS cobrado anteriormente por ST</option>
                    <option value="00">00 – Tributada integralmente</option>
                    <option value="20">20 – Tributada com redução de BC</option>
                    <option value="40">40 – Isenta</option>
                    <option value="41">41 – Não tributada</option>
                    <option value="60">60 – ICMS cobrado anteriormente por ST</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Alíquota ICMS (%)</label>
                  <input type="number" step="0.01" value={form.icmsAliquota || 0} onChange={(e: any) => set('icmsAliquota', Number(e.target.value))} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-right" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">PIS CST *</label>
                  <select value={form.pisCst} onChange={e => set('pisCst', e.target.value)} className={selClass}>
                    <option value="07">07 – Operação isenta</option>
                    <option value="01">01 – Operação tributável alíquota básica</option>
                    <option value="02">02 – Operação tributável alíquota diferenciada</option>
                    <option value="05">05 – Tributável monofásica (redução)</option>
                    <option value="49">49 – Outras operações de saída</option>
                    <option value="99">99 – Outras operações</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Alíquota PIS (%)</label>
                  <input type="number" step="0.01" value={form.pisAliquota || 0} onChange={(e: any) => set('pisAliquota', Number(e.target.value))} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-right" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">COFINS CST *</label>
                  <select value={form.cofinsCst} onChange={e => set('cofinsCst', e.target.value)} className={selClass}>
                    <option value="07">07 – Operação isenta</option>
                    <option value="01">01 – Operação tributável alíquota básica</option>
                    <option value="02">02 – Operação tributável alíquota diferenciada</option>
                    <option value="05">05 – Tributável monofásica (redução)</option>
                    <option value="49">49 – Outras operações de saída</option>
                    <option value="99">99 – Outras operações</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Alíquota COFINS (%)</label>
                  <input type="number" step="0.01" value={form.cofinsAliquota || 0} onChange={(e: any) => set('cofinsAliquota', Number(e.target.value))} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-right" />
                </div>
              </div>

              {/* Reforma Tributária - IBS/CBS */}
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-bold text-purple-500 uppercase flex items-center gap-1">
                    Reforma Tributária (IBS / CBS){rtcCstList.length > 0 && <span className="ml-1 text-[9px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full">LC 214 importada</span>}
                  </p>
                </div>

                {/* CBS */}
                <p className="text-[10px] font-semibold text-blue-500 uppercase mb-2">CBS — Contribuição sobre Bens e Serviços</p>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">CBS CST</label>
                    <select value={form.cbsCst || ''} onChange={e => set('cbsCst', e.target.value)} className={selClass}>
                      <option value="">— Não informar —</option>
                      {cstOpts.map((o: any) => <option key={o.cst} value={o.cst}>{o.cst} – {o.descricao_cst}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">CBS cClassTrib</label>
                    <select value={form.cbsClasstrib || ''} onChange={e => set('cbsClasstrib', e.target.value)} className={selClass}>
                      <option value="">— Não informar —</option>
                      {classOpts.map((o: any) => <option key={o.classtrib} value={o.classtrib}>{o.classtrib} – {o.nome_classtrib}</option>)}
                    </select>
                  </div>
                </div>

                {/* IBS */}
                <p className="text-[10px] font-semibold text-green-600 uppercase mb-2">IBS — Imposto sobre Bens e Serviços</p>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">IBS CST</label>
                    <select value={form.ibsCst || ''} onChange={e => set('ibsCst', e.target.value)} className={selClass}>
                      <option value="">— Não informar —</option>
                      {cstOpts.map((o: any) => <option key={o.cst} value={o.cst}>{o.cst} – {o.descricao_cst}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">IBS cClassTrib</label>
                    <select value={form.ibsClasstrib || ''} onChange={e => set('ibsClasstrib', e.target.value)} className={selClass}>
                      <option value="">— Não informar —</option>
                      {classOpts.map((o: any) => <option key={o.classtrib} value={o.classtrib}>{o.classtrib} – {o.nome_classtrib}</option>)}
                    </select>
                  </div>
                </div>

                {/* cCredPres */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">cCredPres — Crédito Presumido</label>
                  <select value={form.cCredPres || ''} onChange={e => set('cCredPres', e.target.value)} className={selClass}>
                    <option value="">— Não informar —</option>
                    {ccredOpts.map((o: any) => <option key={o.ccredpres} value={o.ccredpres}>{o.ccredpres} – {o.descricao}</option>)}
                  </select>
                </div>
              </div>
            </>
          )}
        </div>
        <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/30">
          <button onClick={onClose} className="px-6 py-2 text-gray-500 font-bold uppercase text-[11px] hover:bg-gray-100 rounded-xl">Cancelar</button>
          <button onClick={() => onSave(form)} className="px-8 py-2 bg-blue-600 text-white font-bold uppercase text-[11px] rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700">
            {produto ? 'Salvar' : 'Cadastrar'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ── Modal: Fornecedor ─────────────────────────────────────────────────────────
export const FornecedorModal = ({ fornecedor, onClose, onSave, showAlert }: any) => {
  const [form, setForm] = useState<any>(fornecedor || {
    nome: '', documento: '', email: '', telefone: '',
    endereco: { logradouro: '', numero: '', complemento: '', bairro: '', municipio: '', codigoMunicipio: '', uf: 'GO', cep: '' }
  });
  const { municipios, loading: loadingMun, carregar } = useMunicipios(form.endereco?.uf);
  const set = (f: string, v: any) => setForm((p: any) => ({ ...p, [f]: v }));
  const setEnd = (f: string, v: string) => setForm((p: any) => ({ ...p, endereco: { ...p.endereco, [f]: v } }));

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="text-lg font-bold text-gray-800">{fornecedor ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nome / Razão Social *" value={form.nome} onChange={(e: any) => set('nome', e.target.value)} />
            <Input label="CNPJ / CPF *" value={form.documento} onChange={(e: any) => set('documento', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" type="email" value={form.email || ''} onChange={(e: any) => set('email', e.target.value)} />
            <Input label="Telefone" value={form.telefone || ''} onChange={(e: any) => set('telefone', e.target.value)} />
          </div>
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase mb-3">Endereço</p>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <Input label="Logradouro" value={form.endereco?.logradouro || ''} onChange={(e: any) => setEnd('logradouro', e.target.value)} />
              </div>
              <Input label="Número" value={form.endereco?.numero || ''} onChange={(e: any) => setEnd('numero', e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-4 mt-3">
              <Input label="Complemento" value={form.endereco?.complemento || ''} onChange={(e: any) => setEnd('complemento', e.target.value)} />
              <Input label="Bairro" value={form.endereco?.bairro || ''} onChange={(e: any) => setEnd('bairro', e.target.value)} />
              <Input label="CEP" value={form.endereco?.cep || ''} onChange={(e: any) => setEnd('cep', e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-4 mt-3">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">UF</label>
                <select value={form.endereco?.uf || 'GO'} onChange={e => { setEnd('uf', e.target.value); carregar(e.target.value); }} className={selClass}>
                  {ESTADOS_BR.map(e => <option key={e.sigla} value={e.sigla}>{e.sigla}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Município</label>
                <select disabled={loadingMun} value={form.endereco?.codigoMunicipio || ''} onChange={e => {
                  const m = municipios.find(x => String(x.id) === e.target.value);
                  if (m) { setEnd('municipio', m.nome); setEnd('codigoMunicipio', String(m.id)); }
                }} className={selClass}>
                  <option value="">{loadingMun ? 'Carregando...' : 'Selecione...'}</option>
                  {municipios.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>
        <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/30">
          <button onClick={onClose} className="px-6 py-2 text-gray-500 font-bold uppercase text-[11px] hover:bg-gray-100 rounded-xl">Cancelar</button>
          <button onClick={() => {
            const end = form.endereco || {};
            if (!end.logradouro?.trim() || !end.numero?.trim() || !end.bairro?.trim() || !end.codigoMunicipio || !end.cep?.trim()) {
              showAlert?.('Atenção', 'Endereço completo é obrigatório: Logradouro, Número, Bairro, Município e CEP.');
              return;
            }
            onSave(form);
          }} className="px-8 py-2 bg-blue-600 text-white font-bold uppercase text-[11px] rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700">Salvar</button>
        </div>
      </motion.div>
    </div>
  );
};

// ── Modal: Transportador ──────────────────────────────────────────────────────
export const TransportadorModal = ({ transportador, onClose, onSave }: any) => {
  const [form, setForm] = useState<any>(transportador || {
    nome: '', documento: '', ie: '', email: '', telefone: '',
    endereco: { logradouro: '', numero: '', complemento: '', bairro: '', municipio: '', codigoMunicipio: '', uf: 'GO', cep: '' }
  });
  const { municipios, loading: loadingMun, carregar } = useMunicipios(form.endereco?.uf);
  const set = (f: string, v: any) => setForm((p: any) => ({ ...p, [f]: v }));
  const setEnd = (f: string, v: string) => setForm((p: any) => ({ ...p, endereco: { ...p.endereco, [f]: v } }));

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="text-lg font-bold text-gray-800">{transportador ? 'Editar Transportador' : 'Novo Transportador'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nome / Razão Social *" value={form.nome} onChange={(e: any) => set('nome', e.target.value)} />
            <Input label="CNPJ / CPF *" value={form.documento} onChange={(e: any) => set('documento', e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Inscrição Estadual" value={form.ie || ''} onChange={(e: any) => set('ie', e.target.value)} />
            <Input label="Email" type="email" value={form.email || ''} onChange={(e: any) => set('email', e.target.value)} />
            <Input label="Telefone" value={form.telefone || ''} onChange={(e: any) => set('telefone', e.target.value)} />
          </div>
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase mb-3">Endereço</p>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <Input label="Logradouro" value={form.endereco?.logradouro || ''} onChange={(e: any) => setEnd('logradouro', e.target.value)} />
              </div>
              <Input label="Número" value={form.endereco?.numero || ''} onChange={(e: any) => setEnd('numero', e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-4 mt-3">
              <Input label="Bairro" value={form.endereco?.bairro || ''} onChange={(e: any) => setEnd('bairro', e.target.value)} />
              <Input label="CEP" value={form.endereco?.cep || ''} onChange={(e: any) => setEnd('cep', e.target.value)} />
              <Input label="Complemento" value={form.endereco?.complemento || ''} onChange={(e: any) => setEnd('complemento', e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-4 mt-3">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">UF</label>
                <select value={form.endereco?.uf || 'GO'} onChange={e => { setEnd('uf', e.target.value); carregar(e.target.value); }} className={selClass}>
                  {ESTADOS_BR.map(e => <option key={e.sigla} value={e.sigla}>{e.sigla}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Município</label>
                <select disabled={loadingMun} value={form.endereco?.codigoMunicipio || ''} onChange={e => {
                  const m = municipios.find(x => String(x.id) === e.target.value);
                  if (m) { setEnd('municipio', m.nome); setEnd('codigoMunicipio', String(m.id)); }
                }} className={selClass}>
                  <option value="">{loadingMun ? 'Carregando...' : 'Selecione...'}</option>
                  {municipios.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>
        <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/30">
          <button onClick={onClose} className="px-6 py-2 text-gray-500 font-bold uppercase text-[11px] hover:bg-gray-100 rounded-xl">Cancelar</button>
          <button onClick={() => onSave(form)} className="px-8 py-2 bg-blue-600 text-white font-bold uppercase text-[11px] rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700">Salvar</button>
        </div>
      </motion.div>
    </div>
  );
};

// ── Modal: Medida ─────────────────────────────────────────────────────────────
export const MedidaModal = ({ medida, onClose, onSave }: any) => {
  const [form, setForm] = useState<any>(medida || { codigo: '', descricao: '', fator: 1, pesavel: false, ativo: true });
  const set = (f: string, v: any) => setForm((p: any) => ({ ...p, [f]: v }));

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="text-lg font-bold text-gray-800">{medida ? 'Editar Medida' : 'Nova Medida'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Código *" value={form.codigo} onChange={(e: any) => set('codigo', e.target.value.toUpperCase())} placeholder="Ex: KG" />
            <Input label="Fator de Conversão" type="number" step="0.001" value={form.fator} onChange={(e: any) => set('fator', Number(e.target.value))} />
          </div>
          <Input label="Descrição *" value={form.descricao} onChange={(e: any) => set('descricao', e.target.value)} placeholder="Ex: Quilograma" />
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.pesavel} onChange={e => set('pesavel', e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-sm text-gray-700">Pesável (balança)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.ativo !== false} onChange={e => set('ativo', e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-sm text-gray-700">Ativo</span>
            </label>
          </div>
        </div>
        <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/30">
          <button onClick={onClose} className="px-6 py-2 text-gray-500 font-bold uppercase text-[11px] hover:bg-gray-100 rounded-xl">Cancelar</button>
          <button onClick={() => onSave(form)} className="px-8 py-2 bg-blue-600 text-white font-bold uppercase text-[11px] rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700">Salvar</button>
        </div>
      </motion.div>
    </div>
  );
};

// ── Modal: Bandeira ───────────────────────────────────────────────────────────
export const BandeiraModal = ({ bandeira, onClose, onSave }: any) => {
  const [form, setForm] = useState<any>(bandeira || { tpag: '03', tband_opc: '', cnpj_opc: '' });
  const set = (f: string, v: any) => setForm((p: any) => ({ ...p, [f]: v }));

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="text-lg font-bold text-gray-800">{bandeira ? 'Editar Bandeira' : 'Nova Bandeira'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Forma de Pagamento *</label>
            <select value={form.tpag} onChange={e => set('tpag', e.target.value)} className={selClass}>
              {Object.entries(TPAG_LABELS).map(([k, v]) => <option key={k} value={k}>{k} – {v}</option>)}
            </select>
          </div>
          <Input label="Bandeira / Credenciadora" value={form.tband_opc || ''} onChange={(e: any) => set('tband_opc', e.target.value)} placeholder="Ex: Visa, Mastercard, Cielo..." />
          <Input label="CNPJ da Credenciadora" value={form.cnpj_opc || ''} onChange={(e: any) => set('cnpj_opc', e.target.value)} placeholder="Ex: 00000000000000" />
        </div>
        <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/30">
          <button onClick={onClose} className="px-6 py-2 text-gray-500 font-bold uppercase text-[11px] hover:bg-gray-100 rounded-xl">Cancelar</button>
          <button onClick={() => onSave(form)} className="px-8 py-2 bg-blue-600 text-white font-bold uppercase text-[11px] rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700">Salvar</button>
        </div>
      </motion.div>
    </div>
  );
};
