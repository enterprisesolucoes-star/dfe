import { useState, useEffect } from 'react';

// ─────────────────────────────────────────
// COMISSÕES MODULE — Fase 5
// ─────────────────────────────────────────

interface Comissao {
  id: number;
  vendedor_id: number;
  vendedor_nome: string;
  documento_tipo: string;
  documento_id: number;
  valor_documento: number;
  percentual: number;
  valor_comissao: number;
  status: 'pendente' | 'aprovada' | 'paga' | 'cancelada';
  competencia: string;
  gerado_em: string;
  pago_em?: string;
  gerado_por_nome?: string;
  aprovado_por_nome?: string;
  pago_por_nome?: string;
  cancelado_motivo?: string;
}

interface Totais {
  pendente: number;
  aprovada: number;
  paga: number;
  cancelada: number;
  geral: number;
}

interface ResumoVendedor {
  id: number;
  nome: string;
  total_documentos: number;
  total_vendas: number;
  total_comissao: number;
  pendente: number;
  aprovada: number;
  paga: number;
}

interface ComissoesTabProps {
  showAlert: (t: string, m: string) => void;
  showConfirm: (t: string, m: string, cb: () => void) => void;
}

export const ComissoesTab = ({ showAlert, showConfirm }: ComissoesTabProps) => {
  const [aba, setAba]                   = useState<'lista' | 'resumo'>('lista');
  const [comissoes, setComissoes]       = useState<Comissao[]>([]);
  const [resumo, setResumo]             = useState<ResumoVendedor[]>([]);
  const [totais, setTotais]             = useState<Totais>({ pendente: 0, aprovada: 0, paga: 0, cancelada: 0, geral: 0 });
  const [selecionados, setSelecionados] = useState<number[]>([]);
  const [loading, setLoading]           = useState(false);

  // Filtros
  const mesAtual = new Date().toISOString().slice(0, 7);
  const [filtroCompetencia, setFiltroCompetencia] = useState(mesAtual);
  const [filtroStatus, setFiltroStatus]           = useState('');
  const [filtroVendedor, setFiltroVendedor]       = useState('');

  const fmt = (v: number) => v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const tipoLabel: Record<string, string> = {
    orcamento: 'Orçamento',
    os:        'OS',
    venda:     'NFCe/Pedido',
    nfe:       'NFe',
    nfce:      'NFCe',
  };

  const statusStyle: Record<string, string> = {
    pendente:  'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300',
    aprovada:  'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
    paga:      'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
    cancelada: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400',
  };

  const carregarLista = async () => {
    setLoading(true);
    const params = new URLSearchParams({ action: 'listar_comissoes' });
    if (filtroCompetencia) params.append('competencia', filtroCompetencia);
    if (filtroStatus)      params.append('status', filtroStatus);
    if (filtroVendedor)    params.append('vendedor_id', filtroVendedor);
    const res  = await fetch(`./api.php?${params}`);
    const data = await res.json();
    setLoading(false);
    if (data.success) { setComissoes(data.data); setTotais(data.totais); setSelecionados([]); }
  };

  const carregarResumo = async () => {
    setLoading(true);
    const res  = await fetch(`./api.php?action=resumo_vendedores&competencia=${filtroCompetencia}`);
    const data = await res.json();
    setLoading(false);
    if (data.success) setResumo(data.data);
  };

  useEffect(() => { aba === 'lista' ? carregarLista() : carregarResumo(); }, [aba, filtroCompetencia, filtroStatus, filtroVendedor]);

  const toggleSelecionado = (id: number) =>
    setSelecionados(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const toggleTodos = () =>
    setSelecionados(selecionados.length === comissoes.filter(c => c.status === 'pendente').length
      ? [] : comissoes.filter(c => c.status === 'pendente').map(c => c.id));

  const acao = async (action: string, ids: number[], label: string) => {
    showConfirm('Confirmar', `${label} ${ids.length} comissão(ões)?`, async () => {
      const res  = await fetch(`./api.php?action=${action}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json();
      if (data.success) { showAlert('Sucesso', `${data.atualizadas} comissão(ões) atualizadas.`); carregarLista(); }
      else showAlert('Erro', data.message || 'Falha ao processar.');
    });
  };

  const ic = "border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="space-y-4">

      {/* Cards totalizadores */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Pendente',  valor: totais.pendente,  cor: 'yellow' },
          { label: 'Aprovada',  valor: totais.aprovada,  cor: 'blue'   },
          { label: 'Paga',      valor: totais.paga,      cor: 'green'  },
          { label: 'Cancelada', valor: totais.cancelada, cor: 'red'    },
        ].map(({ label, valor, cor }) => (
          <div key={label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
            <p className={`text-lg font-bold text-${cor}-600`}>{fmt(valor)}</p>
          </div>
        ))}
      </div>

      {/* Abas + Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-wrap gap-3 items-end">
        <div className="flex gap-2">
          <button onClick={() => setAba('lista')}  className={`px-4 py-2 rounded-lg text-sm font-medium ${aba === 'lista'  ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>Lista</button>
          <button onClick={() => setAba('resumo')} className={`px-4 py-2 rounded-lg text-sm font-medium ${aba === 'resumo' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>Resumo por Vendedor</button>
        </div>
        <div className="flex gap-2 flex-wrap ml-auto items-end">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Competência</label>
            <input type="month" value={filtroCompetencia} onChange={e => setFiltroCompetencia(e.target.value)} className={ic} />
          </div>
          {aba === 'lista' && <>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Status</label>
              <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className={ic}>
                <option value="">Todos</option>
                <option value="pendente">Pendente</option>
                <option value="aprovada">Aprovada</option>
                <option value="paga">Paga</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>
          </>}
          <button onClick={() => {
              const params = new URLSearchParams();
              if (filtroCompetencia) params.append('competencia', filtroCompetencia);
              if (filtroStatus)      params.append('status', filtroStatus);
              if (filtroVendedor)    params.append('vendedor_id', filtroVendedor);
              window.location.href = `./api.php?action=relatorio_comissoes_geral&${params}`;
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium"
            title="Baixar relatório geral em PDF">
            📄 Relatório Geral
          </button>
          <button onClick={() => {
              const params = new URLSearchParams();
              if (filtroCompetencia) params.append('competencia', filtroCompetencia);
              if (filtroVendedor)    params.append('vendedor_id', filtroVendedor);
              window.location.href = `./api.php?action=relatorio_comissoes_recibo&${params}`;
            }}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium"
            title="Baixar recibo por vendedor (somente comissões aprovadas)">
            🧾 Recibo Vendedor
          </button>
          <button onClick={() => aba === 'lista' ? carregarLista() : carregarResumo()}
            className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-lg text-sm">
            Atualizar
          </button>
        </div>
      </div>

      {/* Ações em massa */}
      {aba === 'lista' && selecionados.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 flex items-center gap-3">
          <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">{selecionados.length} selecionada(s)</span>
          <button onClick={() => acao('aprovar_comissao', selecionados, 'Aprovar')}
            className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-blue-700">Aprovar</button>
          <button onClick={() => acao('pagar_comissao', selecionados, 'Marcar como paga')}
            className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-green-700">Marcar como Paga</button>
        </div>
      )}

      {/* LISTA */}
      {aba === 'lista' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3">
                  <input type="checkbox"
                    checked={selecionados.length > 0 && selecionados.length === comissoes.filter(c => c.status === 'pendente').length}
                    onChange={toggleTodos} className="rounded" />
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Vendedor</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Tipo</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Doc #</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase text-right">Vl. Doc</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase text-right">%</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase text-right">Comissão</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase text-center">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Gerado em</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400 dark:text-gray-500">Carregando...</td></tr>
              ) : comissoes.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400 dark:text-gray-500">Nenhuma comissão encontrada para o período.</td></tr>
              ) : comissoes.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3">
                    {c.status === 'pendente' && (
                      <input type="checkbox" checked={selecionados.includes(c.id)}
                        onChange={() => toggleSelecionado(c.id)} className="rounded" />
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">{c.vendedor_nome}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{tipoLabel[c.documento_tipo] || c.documento_tipo}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">#{c.documento_id}</td>
                  <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{fmt(Number(c.valor_documento))}</td>
                  <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">{Number(c.percentual).toFixed(2)}%</td>
                  <td className="px-4 py-3 text-right font-semibold text-blue-700 dark:text-blue-300">{fmt(Number(c.valor_comissao))}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle[c.status]}`}>
                      {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 dark:text-gray-500 text-xs">
                    {new Date(c.gerado_em).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* RESUMO POR VENDEDOR */}
      {aba === 'resumo' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Vendedor</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase text-right">Docs</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase text-right">Total Vendas</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase text-right">Pendente</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase text-right">Aprovada</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase text-right">Paga</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase text-right">Total Comissão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-gray-400 dark:text-gray-500">Carregando...</td></tr>
              ) : resumo.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-gray-400 dark:text-gray-500">Nenhum dado para o período.</td></tr>
              ) : resumo.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-5 py-3 font-medium text-gray-800 dark:text-gray-100">{r.nome}</td>
                  <td className="px-5 py-3 text-right text-gray-500 dark:text-gray-400">{r.total_documentos}</td>
                  <td className="px-5 py-3 text-right text-gray-600 dark:text-gray-300">{fmt(Number(r.total_vendas))}</td>
                  <td className="px-5 py-3 text-right text-yellow-600 dark:text-yellow-400 font-medium">{fmt(Number(r.pendente))}</td>
                  <td className="px-5 py-3 text-right text-blue-600 dark:text-blue-400 font-medium">{fmt(Number(r.aprovada))}</td>
                  <td className="px-5 py-3 text-right text-green-600 dark:text-green-400 font-medium">{fmt(Number(r.paga))}</td>
                  <td className="px-5 py-3 text-right font-bold text-gray-800 dark:text-gray-100">{fmt(Number(r.total_comissao))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
