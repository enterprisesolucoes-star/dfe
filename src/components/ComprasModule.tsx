import { useState, useEffect } from 'react';
import {
  Plus, Search, Pencil, Upload, FileText, CheckCircle, AlertCircle,
  Trash2, Eye, Edit, Package, ShoppingCart, ArrowRight, X,
  Globe, RefreshCw, Save, User, Wallet, Landmark, Ban, CreditCard, ClipboardCheck
} from 'lucide-react';
import { motion } from 'motion/react';
import { Produto, Fornecedor } from '../types/nfce';

interface Compra {
  id: number;
  fornecedor_nome: string;
  fornecedor_documento: string;
  numero_nf: string;
  data_entrada: string;
  valor_total: number;
  status: string;
  qtd_itens: number;
}

interface ItemXml {
  codigo_xml: string;
  barras_xml: string;
  nome_xml: string;
  cfop_xml: string;
  un_xml: string;
  qtd_xml: number;
  vun_xml: number;
  total_xml: number;
  matching_id: number | null;
  matching_desc: string;
  matching_cfop: string;
  matching_cod: string;
  valor_venda_atual: number;
}

export const ComprasTab = ({ 
  onImportXml, 
  onNewCompra,
  onNewManual,
  onViewCompra,
  onOpenSefazConsult
}: { 
  onImportXml: () => void, 
  onNewCompra: () => void,
  onNewManual: () => void,
  onViewCompra: (id: number) => void,
  onOpenSefazConsult: () => void
}) => {
  const [compras, setCompras] = useState<Compra[]>([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [di, setDi] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; });
  const [df, setDf] = useState(() => new Date().toISOString().split('T')[0]);

  const fetchCompras = async () => {
    setLoading(true);
    try {
      const res = await fetch(`.http://187.77.240?action=listar_compras&data_inicio=${di}&data_fim=${df}`);
      const data = await res.json();
      if (Array.isArray(data)) setCompras(data);
    } catch { /* silent */ }
    setLoading(false);
  };

  useEffect(() => { fetchCompras(); }, [di, df]);

  const filtradas = compras.filter(c => 
    c.fornecedor_nome.toLowerCase().includes(busca.toLowerCase()) || 
    c.numero_nf.includes(busca)
  );

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-wrap gap-3 items-center shadow-sm">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>De:</span>
          <input type="date" value={di} onChange={e => setDi(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          <span>Até:</span>
          <input type="date" value={df} onChange={e => setDf(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Fornecedor ou NF..." className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-56" />
        </div>
        <div className="flex-1" />
        <button onClick={() => setShowSourceModal(true)} className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm">
          <Upload className="w-4 h-4" /> Importar XML
        </button>
        <button onClick={() => setShowSourceModal(true)} className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Nota Entrada
        </button>

        {showSourceModal && (
          <ImportSourceModal 
            onClose={() => setShowSourceModal(false)}
            onSelectLocal={() => { setShowSourceModal(false); onImportXml(); }}
            onSelectSefaz={() => { setShowSourceModal(false); onOpenSefazConsult(); }}
            onNewManual={() => { setShowSourceModal(false); onNewManual(); }}
          />
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">NF</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Fornecedor</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Entrada</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Total</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-center">Itens</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Carregando...</td></tr>
            ) : filtradas.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">Nenhuma compra localizada no período.</td></tr>
            ) : filtradas.map(c => (
              <tr key={c.id} className="hover:bg-gray-50 transition-all">
                <td className="px-4 py-3 font-medium text-gray-800">#{c.numero_nf}</td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-gray-700">{c.fornecedor_nome}</p>
                  <p className="text-[10px] text-gray-400">{c.fornecedor_documento}</p>
                </td>
                <td className="px-4 py-3 text-gray-500">{new Date(c.data_entrada + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                <td className="px-4 py-3 text-right font-bold text-blue-600">R$ {Number(c.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td className="px-4 py-3 text-center"><span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-[10px] font-bold">{c.qtd_itens}</span></td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => onViewCompra(c.id)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Eye className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const ImportXmlModal = ({ 
  xmlData, 
  onClose, 
  onConfirm,
  produtos,
  fetchProdutos,
  showAlert,
  showConfirm,
  onEditProduto
}: { 
  xmlData: any, 
  onClose: () => void, 
  onConfirm: (data: any) => void,
  produtos: Produto[],
  fetchProdutos: () => void,
  showAlert: (t: string, m: string) => void,
  showConfirm: (t: string, m: string, cb: () => void) => void,
  onEditProduto: (p: Produto) => void
}) => {
  const [itens, setItens] = useState<ItemXml[]>(xmlData.itens || []);
  const [saving, setSaving] = useState(false);

  const handleConfirmar = async () => {
    // Verifica se todos os itens estão vinculados
    const naoVinculados = itens.filter(i => !i.matching_id);
    if (naoVinculados.length > 0) {
      showAlert('Pendência', `Existem ${naoVinculados.length} produtos não vinculados ao sistema. Vincule-os antes de confirmar.`);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        fornecedorId: xmlData.nota.fornecedor_id,
        numeroNf: xmlData.nota.numero,
        dataEntrada: xmlData.nota.data,
        valorTotal: xmlData.nota.valor_total,
        itens: itens.map(i => ({
          produtoId: i.matching_id,
          quantidade: i.qtd_xml,
          valorUnitario: i.vun_xml,
          valorTotal: i.total_xml
        }))
      };

      const res = await fetch('.http://187.77.240?action=salvar_compra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        onConfirm(data);
      } else {
        showAlert('Erro', data.message);
      }
    } catch {
      showAlert('Erro', 'Falha ao salvar compra.');
    }
    setSaving(false);
  };

  const handleAutoCadastrar = async (idx: number) => {
    const item = itens[idx];
    showConfirm('Auto-Cadastro', `Deseja cadastrar "${item.nome_xml}" automaticamente no sistema?`, async () => {
      try {
        const prodData = {
          descricao: item.nome_xml,
          codigoBarras: (item.barras_xml && item.barras_xml !== 'SEM GTIN') ? item.barras_xml : '',
          codigoFornecedor: item.codigo_xml,
          unidadeComercial: item.un_xml,
          valorUnitario: item.vun_xml * 1.5, // Sugestão 50% margem
          custoCopra: item.vun_xml,
          ncm: item.matching_id ? '' : '00000000', // Marcador para pedir NCM se novo
          cfop: '5102',
          icmsCstCsosn: '102'
        };

        const res = await fetch('.http://187.77.240?action=salvar_produto', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(prodData)
        });
        const data = await res.json();
        if (data.success) {
          fetchProdutos();
          // Simula re-processamento do match (idealmente faria no backend ou recarregaria)
          showAlert('Sucesso', 'Produto cadastrado com sucesso! Clique em "Vincular" para localizar o novo cadastro.');
        }
      } catch { showAlert('Erro', 'Falha ao cadastrar produto.'); }
    });
  };

  const [vinculandoIdx, setVinculandoIdx] = useState<number | null>(null);
  const [buscaProd, setBuscaProd] = useState('');
  
  const handleVincularManual = (idx: number) => {
    setVinculandoIdx(idx);
    setBuscaProd(itens[idx].nome_xml);
  };

  const selecionarProduto = (p: Produto) => {
    if (vinculandoIdx === null) return;
    const novos = [...itens];
    novos[vinculandoIdx] = {
      ...novos[vinculandoIdx],
      matching_id: p.id!,
      matching_desc: p.descricao,
      matching_cod: p.codigoInterno,
      valor_venda_atual: p.valorUnitario
    };
    setItens(novos);
    setVinculandoIdx(null);
  };

  const handlesUnlink = (idx: number) => {
    const novos = [...itens];
    novos[idx] = {
      ...novos[idx],
      matching_id: null,
      matching_desc: '',
      matching_cod: '',
      valor_venda_atual: 0
    };
    setItens(novos);
  };

  const prodsFiltrados = produtos.filter(p => 
    p.descricao.toLowerCase().includes(buscaProd.toLowerCase()) || 
    p.codigoInterno.toLowerCase().includes(buscaProd.toLowerCase()) || 
    (p.codigoBarras || '').includes(buscaProd)
  ).slice(0, 5);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[95vh] shadow-2xl border border-gray-100">
        <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <FileText className="w-6 h-6 text-green-600" /> Revisar Importação de XML
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              NF #{xmlData.nota.numero} • {xmlData.nota.emitente.nome} ({xmlData.nota.emitente.cnpj})
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        {!xmlData.nota.cnpj_valido && (
          <div className="bg-amber-50 border-b border-amber-200 p-3 flex items-center gap-2 text-amber-800 text-xs font-medium">
            <AlertCircle className="w-4 h-4" /> ATENÇÃO: O CNPJ destinatário deste XML não confere com o CNPJ do sistema. Verifique a procedência.
          </div>
        )}

        <div className="p-6 overflow-auto flex-1">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-bold tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Dados do XML (Fornecedor)</th>
                <th className="px-4 py-3 text-left">Produto no Sistema (Matching)</th>
                <th className="px-4 py-3 text-right">Qtd</th>
                <th className="px-4 py-3 text-right">Custo</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {itens.map((it, idx) => (
                <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 border-r border-gray-50 italic text-gray-600 max-w-[250px]">
                    <p className="font-bold text-gray-700">{it.nome_xml}</p>
                    <p className="text-[10px] text-gray-400">Cód: {it.codigo_xml} • EAN: {it.barras_xml}</p>
                  </td>
                  <td className={`px-4 py-3 ${!it.matching_id ? 'bg-red-50/30' : ''}`}>
                    {it.matching_id ? (
                      <div className="flex items-center justify-between group">
                        <div>
                          <p className="font-semibold text-blue-800">{it.matching_desc}</p>
                          <p className="text-[10px] text-gray-400">Interno: {it.matching_cod} • Preço Venda: R$ {Number(it.valor_venda_atual).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>

                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-red-500 font-bold uppercase text-[10px]">
                        <AlertCircle className="w-3.5 h-3.5" /> Não localizado no sistema
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{Number(it.qtd_xml).toLocaleString('pt-BR')} <span className="text-[10px]">{it.un_xml}</span></td>
                  <td className="px-4 py-3 text-right font-mono text-gray-500">R$ {it.vun_xml.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-800 font-mono">R$ {it.total_xml.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-1">
                      <button onClick={() => handleVincularManual(idx)} title="Vincular Manualmente" className="p-1.5 hover:bg-blue-100 rounded text-blue-600 transition-colors"><Pencil className="w-4 h-4" /></button>
                      {it.matching_id ? (
                        <button onClick={() => handlesUnlink(idx)} title="Desfazer Vínculo" className="p-1.5 hover:bg-gray-100 rounded text-gray-400 transition-colors"><X className="w-4 h-4" /></button>
                      ) : (
                        <button onClick={() => handleAutoCadastrar(idx)} title="Cadastrar Automaticamente" className="p-1.5 hover:bg-green-100 rounded text-green-600 transition-colors"><Package className="w-4 h-4" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {vinculandoIdx !== null && (
          <div className="absolute inset-0 bg-white/95 flex items-center justify-center p-12 z-[110] backdrop-blur-sm">
            <div className="w-full max-w-lg bg-white shadow-2xl border border-gray-100 rounded-3xl p-8">
              <h4 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Search className="w-6 h-6 text-blue-600" /> Localizar Produto
              </h4>
              <p className="text-xs text-gray-400 uppercase font-black mb-2">Item do XML:</p>
              <p className="text-sm font-semibold text-gray-700 bg-gray-50 p-4 rounded-xl border border-gray-100 mb-6 italic">
                "{itens[vinculandoIdx].nome_xml}"
              </p>
              
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  autoFocus
                  type="text" 
                  value={buscaProd} 
                  onChange={e => setBuscaProd(e.target.value)} 
                  placeholder="Pesquise por nome, código ou EAN..." 
                  className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-2xl text-base focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                />
              </div>

              <div className="space-y-2 mb-8">
                {prodsFiltrados.map(p => (
                  <button key={p.id} onClick={() => selecionarProduto(p)} className="w-full text-left p-4 rounded-2xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all flex justify-between items-center group">
                    <div>
                      <p className="font-bold text-gray-800 group-hover:text-blue-700">{p.descricao}</p>
                      <p className="text-[10px] text-gray-400">Cód: {p.codigoInterno} • Barra: {p.codigoBarras || '-'}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
                {buscaProd && prodsFiltrados.length === 0 && (
                  <p className="text-center py-8 text-gray-400 italic">Nenhum produto encontrado...</p>
                )}
              </div>

              <button onClick={() => setVinculandoIdx(null)} className="w-full py-4 text-gray-500 font-bold uppercase text-xs tracking-widest hover:bg-gray-50 rounded-2xl transition-all">Cancelar</button>
            </div>
          </div>
        )}

        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
          <div className="flex gap-8">
            <div className="text-center">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Total da Nota</p>
              <p className="text-2xl font-semibold text-blue-600 tracking-tight">R$ {Number(xmlData.nota.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Itens</p>
              <p className="text-2xl font-semibold text-slate-700">{itens.length}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-6 py-3 border border-slate-200 text-slate-500 rounded-2xl text-[11px] font-semibold uppercase tracking-widest hover:bg-slate-50 transition-all">Cancelar</button>
            <button onClick={handleConfirmar} disabled={saving} className="px-10 py-4 bg-blue-600 text-white rounded-2xl text-[11px] font-semibold uppercase tracking-widest hover:shadow-lg hover:shadow-blue-200/50 hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-2">
              {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
              {saving ? 'REGISTRANDO...' : 'CONFIRMAR E LANÇAR'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const ImportSourceModal = ({ onClose, onSelectLocal, onSelectSefaz, onNewManual }: { 
  onClose: () => void, 
  onSelectLocal: () => void, 
  onSelectSefaz: () => void,
  onNewManual: () => void
}) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl shadow-blue-900/20">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <h4 className="text-lg font-bold text-gray-800 uppercase tracking-tight">Origem da Importação</h4>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
      </div>
      <div className="p-6 grid grid-cols-1 gap-4">
        <button onClick={onSelectSefaz} className="p-6 bg-blue-50 border-2 border-blue-100 rounded-2xl text-left hover:border-blue-400 transition-all group">
          <Globe className="w-8 h-8 text-blue-600 mb-3 group-hover:scale-110 transition-transform" />
          <p className="text-sm font-bold text-blue-900 uppercase">Consultar SEFAZ</p>
          <p className="text-[10px] text-blue-600 font-medium">Baixar notas emitidas contra o CNPJ (via NSU)</p>
        </button>
        <button onClick={onSelectLocal} className="p-6 bg-green-50 border-2 border-green-100 rounded-2xl text-left hover:border-green-400 transition-all group">
          <Upload className="w-8 h-8 text-green-600 mb-3 group-hover:scale-110 transition-transform" />
          <p className="text-sm font-bold text-green-900 uppercase">Arquivo XML Local</p>
          <p className="text-[10px] text-green-600 font-medium">Importar arquivo XML salvo em seu computador</p>
        </button>
        <button onClick={onNewManual} className="p-6 bg-amber-50 border-2 border-amber-100 rounded-2xl text-left hover:border-amber-400 transition-all group">
          <Edit className="w-8 h-8 text-amber-600 mb-3 group-hover:scale-110 transition-transform" />
          <p className="text-sm font-bold text-amber-900 uppercase">Lançamento Manual</p>
          <p className="text-[10px] text-amber-600 font-medium">Digitar os dados da nota manualmente</p>
        </button>
      </div>
      <div className="px-6 py-4 bg-gray-50 text-center">
        <p className="text-[10px] text-gray-400 font-medium">Selecione uma opção para continuar o processo de entrada</p>
      </div>
    </motion.div>
  </div>
);

const FORMAS_PAG = [
  { v: '01', l: 'Dinheiro' }, { v: '03', l: 'Cartão Crédito' }, { v: '04', l: 'Cartão Débito' },
  { v: '17', l: 'PIX' }, { v: '15', l: 'Boleto' }, { v: '02', l: 'Cheque' }, { v: '99', l: 'Outros' },
];

export const CompraModal = ({
  onClose,
  onSave,
  fornecedores,
  produtos,
  showAlert,
}: {
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  fornecedores: Fornecedor[];
  produtos: Produto[];
  showAlert: (t: string, m: string) => void;
}) => {
  type Tab = 'identificacao' | 'produtos' | 'financeiro' | 'finalizar';
  const [activeTab, setActiveTab] = useState<Tab>('identificacao');

  // ── Identificação ──────────────────────────────────────────────────────────
  const [fornecedorId, setFornecedorId]       = useState<number | string>('');
  const [numeroNf, setNumeroNf]               = useState('');
  const [chaveAcesso, setChaveAcesso]         = useState('');
  const [dataEntrada, setDataEntrada]         = useState(() => new Date().toISOString().split('T')[0]);
  const [naturezaOperacao, setNaturezaOperacao] = useState('COMPRA DE MERCADORIA');
  const [observacoes, setObservacoes]         = useState('');

  // ── Produtos ───────────────────────────────────────────────────────────────
  const [itens, setItens] = useState<{ produtoId: number; descricao: string; quantidade: number; valorUnitario: number; valorTotal: number }[]>([]);
  const [buscaProd, setBuscaProd] = useState('');

  // ── Financeiro ─────────────────────────────────────────────────────────────
  type Lancamento = 'nenhum' | 'financeiro' | 'caixa';
  const [lancamento, setLancamento]         = useState<Lancamento>('nenhum');
  const [finVencimento, setFinVencimento]   = useState(() => new Date().toISOString().split('T')[0]);
  const [finParcelas, setFinParcelas]       = useState(1);
  const [finForma, setFinForma]             = useState('01');
  const [finContaId, setFinContaId]         = useState<number | ''>('');
  const [contas, setContas]                 = useState<any[]>([]);

  const [loading, setLoading] = useState(false);

  const totalNota = itens.reduce((a, it) => a + it.valorTotal, 0);

  useEffect(() => {
    if (lancamento === 'caixa' && contas.length === 0) {
      fetch('.http://187.77.240?action=fin_listar_contas')
        .then(r => r.json())
        .then(d => { if (Array.isArray(d)) { setContas(d); if (d[0]) setFinContaId(d[0].id); } })
        .catch(() => {});
    }
  }, [lancamento]);

  const handleAddItem = (p: Produto) => {
    const custo = Number((p as any).custoCopra || p.valorUnitario || 0);
    setItens(prev => [...prev, { produtoId: Number(p.id), descricao: p.descricao, quantidade: 1, valorUnitario: custo, valorTotal: custo }]);
    setBuscaProd('');
  };

  const handleUpdateItem = (idx: number, field: string, raw: string) => {
    const val = parseFloat(raw) || 0;
    setItens(prev => prev.map((it, i) => {
      if (i !== idx) return it;
      const updated = { ...it, [field]: val };
      updated.valorTotal = updated.quantidade * updated.valorUnitario;
      return updated;
    }));
  };

  const handleSalvar = async () => {
    if (!fornecedorId)  return showAlert('Atenção', 'Selecione um fornecedor.');
    if (!numeroNf)      return showAlert('Atenção', 'Informe o número da nota.');
    if (itens.length === 0) return showAlert('Atenção', 'Adicione pelo menos um produto.');
    if (chaveAcesso && chaveAcesso.length !== 44) return showAlert('Atenção', 'Chave de acesso deve ter 44 dígitos.');
    if (lancamento === 'caixa' && !finContaId) return showAlert('Atenção', 'Selecione a conta de caixa.');

    setLoading(true);
    await onSave({
      fornecedorId, numeroNf, chaveAcesso, dataEntrada,
      naturezaOperacao, observacoes, valorTotal: totalNota, itens,
      lancamento,
      fin_vencimento: finVencimento,
      fin_parcelas: finParcelas,
      fin_forma_pagamento: finForma,
      fin_conta_id: finContaId || null,
    });
    setLoading(false);
  };

  const prodsFiltrados = buscaProd.length >= 1 ? produtos.filter(p =>
    (p.descricao || '').toLowerCase().includes(buscaProd.toLowerCase()) ||
    (p.codigoInterno || '').toLowerCase().includes(buscaProd.toLowerCase()) ||
    (p.codigoBarras || '').includes(buscaProd)
  ).slice(0, 8) : [];

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'identificacao', label: '1. Identificação', icon: User },
    { id: 'produtos',      label: '2. Produtos',      icon: Package },
    { id: 'financeiro',    label: '3. Financeiro',    icon: Wallet },
    { id: 'finalizar',     label: '4. Finalizar',     icon: ClipboardCheck },
  ];

  const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all';
  const labelCls = 'block text-xs font-semibold text-gray-500 uppercase mb-1';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
      <style>{`b, strong, h1, h2, h3 { font-weight: 600 !important; color: #334155; }`}</style>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col h-[88vh]">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="text-base font-semibold text-gray-800">Nota de Entrada</h3>
              <p className="text-xs text-gray-400">{fornecedores.find(f => String(f.id) === String(fornecedorId))?.nome || 'Selecione o fornecedor'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 shrink-0">
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl border border-gray-200">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all flex-1 justify-center ${activeTab === t.id ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-white hover:text-blue-600'}`}>
                <t.icon className="w-4 h-4" />{t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ── Aba 1: Identificação ────────────────────────────────────────── */}
          {activeTab === 'identificacao' && (
            <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-5">
              <h4 className="text-base font-semibold text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-3">
                <User className="w-4 h-4 text-blue-600" /> Dados da Nota Fiscal
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className={labelCls}>Fornecedor</label>
                  <select value={fornecedorId} onChange={e => setFornecedorId(e.target.value)} className={inputCls}>
                    <option value="">Selecione...</option>
                    {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome} — {f.documento}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Número NF</label>
                  <input type="text" value={numeroNf} onChange={e => setNumeroNf(e.target.value)} placeholder="000000" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Data de Entrada</label>
                  <input type="date" value={dataEntrada} onChange={e => setDataEntrada(e.target.value)} className={inputCls} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelCls}>Chave de Acesso (opcional)</label>
                  <input type="text" maxLength={44} value={chaveAcesso} onChange={e => setChaveAcesso(e.target.value.replace(/\D/g, ''))} placeholder="44 dígitos..." className={`${inputCls} font-mono tracking-wider`} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelCls}>Natureza da Operação</label>
                  <input type="text" value={naturezaOperacao} onChange={e => setNaturezaOperacao(e.target.value)} className={inputCls} />
                </div>
                <div className="md:col-span-4">
                  <label className={labelCls}>Observações</label>
                  <input type="text" value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Opcional..." className={inputCls} />
                </div>
              </div>
            </section>
          )}

          {/* ── Aba 2: Produtos ─────────────────────────────────────────────── */}
          {activeTab === 'produtos' && (
            <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
              <h4 className="text-base font-semibold text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-3">
                <Package className="w-4 h-4 text-blue-600" /> Produtos da Entrada
              </h4>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" value={buscaProd} onChange={e => setBuscaProd(e.target.value)}
                  placeholder="Buscar por nome, código ou EAN..."
                  className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none shadow-sm" />
                {prodsFiltrados.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                    {prodsFiltrados.map(p => (
                      <button key={p.id} onClick={() => handleAddItem(p)}
                        className="w-full text-left px-4 py-3 hover:bg-blue-50 flex justify-between items-center transition-colors border-b border-gray-50 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{p.descricao}</p>
                          <p className="text-xs text-gray-400">Cód: {p.codigoInterno} · EAN: {p.codigoBarras || '—'}</p>
                        </div>
                        <Plus className="w-4 h-4 text-blue-500" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-left">Produto</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-center w-28">Qtd</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right w-36">Custo Unit.</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right w-36">Total</th>
                      <th className="px-4 py-3 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {itens.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">Use o campo acima para adicionar produtos.</td></tr>
                    ) : itens.map((it, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-800">{it.descricao}</td>
                        <td className="px-4 py-3 text-center">
                          <input type="number" step="0.001" min="0.001" value={it.quantidade}
                            onChange={e => handleUpdateItem(idx, 'quantidade', e.target.value)}
                            className="w-20 border-b-2 border-transparent focus:border-blue-500 outline-none text-center bg-transparent font-medium text-gray-700" />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <input type="number" step="0.01" min="0" value={it.valorUnitario}
                            onChange={e => handleUpdateItem(idx, 'valorUnitario', e.target.value)}
                            className="w-28 border-b-2 border-transparent focus:border-blue-500 outline-none text-right bg-transparent font-medium text-blue-700" />
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-800">
                          {it.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => setItens(p => p.filter((_, i) => i !== idx))}
                            className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {itens.length > 0 && (
                    <tfoot className="bg-blue-50 border-t-2 border-blue-200">
                      <tr>
                        <td colSpan={3} className="px-4 py-3 text-xs font-semibold text-blue-700 uppercase">Total — {itens.length} produto(s)</td>
                        <td className="px-4 py-3 text-right text-base font-bold text-blue-700">{totalNota.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                        <td />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </section>
          )}

          {/* ── Aba 3: Financeiro ───────────────────────────────────────────── */}
          {activeTab === 'financeiro' && (
            <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
              <h4 className="text-base font-semibold text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-3">
                <Wallet className="w-4 h-4 text-blue-600" /> Lançamento Financeiro
              </h4>

              {/* Escolha do tipo */}
              <div className="grid grid-cols-3 gap-4">
                {([
                  { v: 'nenhum',     icon: Ban,      label: 'Não lançar',       desc: 'Somente entrada de estoque',          cor: 'gray'  },
                  { v: 'financeiro', icon: Landmark,  label: 'Contas a Pagar',   desc: 'Gera título(s) no financeiro',        cor: 'blue'  },
                  { v: 'caixa',      icon: CreditCard,label: 'Lançar no Caixa',  desc: 'Débito imediato na conta de caixa',   cor: 'green' },
                ] as const).map(op => (
                  <button key={op.v} onClick={() => setLancamento(op.v)}
                    className={`p-5 rounded-2xl border-2 text-left transition-all ${lancamento === op.v
                      ? op.cor === 'gray'  ? 'border-gray-400  bg-gray-50'
                      : op.cor === 'blue'  ? 'border-blue-500  bg-blue-50'
                      :                     'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'}`}>
                    <op.icon className={`w-7 h-7 mb-3 ${lancamento === op.v
                      ? op.cor === 'gray' ? 'text-gray-600' : op.cor === 'blue' ? 'text-blue-600' : 'text-green-600'
                      : 'text-gray-400'}`} />
                    <p className={`text-sm font-semibold ${lancamento === op.v
                      ? op.cor === 'gray' ? 'text-gray-800' : op.cor === 'blue' ? 'text-blue-800' : 'text-green-800'
                      : 'text-gray-700'}`}>{op.label}</p>
                    <p className="text-xs text-gray-500 mt-1">{op.desc}</p>
                  </button>
                ))}
              </div>

              {/* Contas a Pagar */}
              {lancamento === 'financeiro' && (
                <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100 space-y-4">
                  <p className="text-xs font-semibold text-blue-700 uppercase">Parâmetros do Título</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className={labelCls}>1º Vencimento</label>
                      <input type="date" value={finVencimento} onChange={e => setFinVencimento(e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Parcelas</label>
                      <input type="number" min={1} max={60} value={finParcelas} onChange={e => setFinParcelas(Math.max(1, Number(e.target.value)))} className={inputCls} />
                      {finParcelas > 1 && (
                        <p className="text-xs text-blue-600 mt-1">
                          {finParcelas}× {(totalNota / finParcelas).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} — intervalo 30 dias
                        </p>
                      )}
                    </div>
                    <div>
                      <label className={labelCls}>Forma de Pagamento Prevista</label>
                      <select value={finForma} onChange={e => setFinForma(e.target.value)} className={inputCls}>
                        {FORMAS_PAG.map(f => <option key={f.v} value={f.v}>{f.l}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Caixa */}
              {lancamento === 'caixa' && (
                <div className="bg-green-50 rounded-2xl p-5 border border-green-100 space-y-4">
                  <p className="text-xs font-semibold text-green-700 uppercase">Parâmetros do Débito</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Conta / Caixa</label>
                      <select value={finContaId} onChange={e => setFinContaId(Number(e.target.value))} className={inputCls}>
                        <option value="">Selecione...</option>
                        {contas.map(c => <option key={c.id} value={c.id}>{c.nome} ({c.tipo})</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Forma de Pagamento</label>
                      <select value={finForma} onChange={e => setFinForma(e.target.value)} className={inputCls}>
                        {FORMAS_PAG.map(f => <option key={f.v} value={f.v}>{f.l}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}

            </section>
          )}

          {/* ── Aba 4: Finalizar ────────────────────────────────────────────── */}
          {activeTab === 'finalizar' && (
            <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
              <h4 className="text-base font-semibold text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-3">
                <ClipboardCheck className="w-4 h-4 text-blue-600" /> Resumo da Entrada
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Fornecedor',  value: fornecedores.find(f => String(f.id) === String(fornecedorId))?.nome || '—' },
                  { label: 'NF',          value: numeroNf || '—' },
                  { label: 'Data Entrada',value: dataEntrada ? new Date(dataEntrada + 'T12:00:00').toLocaleDateString('pt-BR') : '—' },
                  { label: 'Itens',       value: `${itens.length} produto(s)` },
                ].map(s => (
                  <div key={s.label} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <p className="text-xs font-semibold text-gray-400 uppercase mb-1">{s.label}</p>
                    <p className="text-sm font-medium text-gray-800 truncate">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Tabela de itens resumida */}
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase text-left">Produto</th>
                      <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase text-center">Qtd</th>
                      <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {itens.map((it, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-800">{it.descricao}</td>
                        <td className="px-4 py-2 text-center text-gray-600">{it.quantidade}</td>
                        <td className="px-4 py-2 text-right font-medium text-gray-800">{it.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Lançamento */}
              <div className={`flex items-center gap-3 p-4 rounded-xl border text-sm font-medium ${
                lancamento === 'financeiro' ? 'bg-blue-50 border-blue-200 text-blue-800' :
                lancamento === 'caixa'      ? 'bg-green-50 border-green-200 text-green-800' :
                                             'bg-gray-50 border-gray-200 text-gray-600'}`}>
                {lancamento === 'financeiro' && <><Landmark className="w-4 h-4" /> Contas a Pagar: {finParcelas}× de {(totalNota / finParcelas).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} — {FORMAS_PAG.find(f => f.v === finForma)?.l}</>}
                {lancamento === 'caixa'      && <><CreditCard className="w-4 h-4" /> Débito no caixa: {totalNota.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} — {FORMAS_PAG.find(f => f.v === finForma)?.l}</>}
                {lancamento === 'nenhum'     && <><Ban className="w-4 h-4" /> Sem lançamento financeiro — somente atualização de estoque</>}
              </div>

              <div className="flex justify-between items-center pt-2">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Total da Entrada</p>
                  <p className="text-3xl font-bold text-blue-600">{totalNota.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={handleSalvar} disabled={loading || itens.length === 0}
                    className="px-10 py-3 bg-green-600 text-white rounded-xl font-semibold text-sm hover:bg-green-700 shadow-lg shadow-green-200 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2">
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {loading ? 'Processando...' : 'Confirmar Entrada'}
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
      </motion.div>
    </div>
  );
};
