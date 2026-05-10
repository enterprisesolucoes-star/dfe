import { Edit2, Trash2 } from 'lucide-react';
import React, { useState, useEffect } from 'react';

const ESTADOS_BR = [
  { sigla: 'AC', nome: 'Acre' }, { sigla: 'AL', nome: 'Alagoas' }, { sigla: 'AP', nome: 'Amapá' },
  { sigla: 'AM', nome: 'Amazonas' }, { sigla: 'BA', nome: 'Bahia' }, { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' }, { sigla: 'ES', nome: 'Espírito Santo' }, { sigla: 'GO', nome: 'Goiás' },
  { sigla: 'MA', nome: 'Maranhão' }, { sigla: 'MT', nome: 'Mato Grosso' }, { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' }, { sigla: 'PA', nome: 'Pará' }, { sigla: 'PB', nome: 'Paraíba' },
  { sigla: 'PR', nome: 'Paraná' }, { sigla: 'PE', nome: 'Pernambuco' }, { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' }, { sigla: 'RN', nome: 'Rio Grande do Norte' }, { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'RO', nome: 'Rondônia' }, { sigla: 'RR', nome: 'Roraima' }, { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' }, { sigla: 'SE', nome: 'Sergipe' }, { sigla: 'TO', nome: 'Tocantins' },
];

type SmartPos = { id?: number; codigo: string; integradora: string; apelido: string; numeroSerie: string };

type RtcAliquota = { id: number; imposto: string; percentual: number; d_ini_vig: string; d_fim_vig: string | null; observacao: string; vigente: number };

const RtcImportButton = ({ showAlert }: { showAlert: (t: string, m: string) => void }) => {
  const [loadingImport, setLoadingImport]   = useState(false);
  const [loadingOnline, setLoadingOnline]   = useState(false);
  const [showUrls, setShowUrls]             = useState(false);
  const [urls, setUrls] = useState({ urlCstClasstrib: '', urlAnexos: '', urlCcredpres: '' });
  const [aliquotas, setAliquotas]           = useState<RtcAliquota[]>([]);
  const [showAliquotas, setShowAliquotas]   = useState(true);
  const [editAliq, setEditAliq]             = useState<Partial<RtcAliquota> | null>(null);

  const fetchAliquotas = async () => {
    const res = await fetch('./api.php?action=rtc_aliquotas_listar');
    const data = await res.json();
    if (Array.isArray(data)) setAliquotas(data);
  };

  useEffect(() => { fetchAliquotas(); }, []);

  const handleImport = async () => {
    setLoadingImport(true);
    try {
      const res = await fetch('./api.php?action=rtc_importar');
      const data = await res.json();
      if (data.success) showAlert('Reforma Tributária', `Tabelas importadas!\nCST/cClassTrib: ${data.cst_count} | NCM Anexos: ${data.ncm_count} | cCredPres: ${data.cred_count}`);
      else showAlert('Erro', data.message || 'Falha ao importar.');
    } catch { showAlert('Erro', 'Falha ao importar tabelas RTC.'); }
    finally { setLoadingImport(false); }
  };

  const handleAtualizarOnline = async () => {
    if (!urls.urlCstClasstrib && !urls.urlAnexos && !urls.urlCcredpres) { showAlert('Atenção', 'Informe ao menos uma URL.'); return; }
    setLoadingOnline(true);
    try {
      const res = await fetch('./api.php?action=rtc_atualizar_online', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(urls) });
      const data = await res.json();
      if (data.success) showAlert('Sucesso', data.message);
      else showAlert('Erro', data.message);
    } catch { showAlert('Erro', 'Falha ao baixar arquivos.'); }
    finally { setLoadingOnline(false); }
  };

  const handleSalvarAliq = async () => {
    if (!editAliq?.imposto || editAliq?.percentual === undefined || !editAliq?.d_ini_vig) { showAlert('Atenção', 'Preencha imposto, percentual e data inicial.'); return; }
    await fetch('./api.php?action=rtc_aliquota_salvar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editAliq) });
    setEditAliq(null);
    fetchAliquotas();
  };

  const handleExcluirAliq = async (id: number) => {
    await fetch(`./api.php?action=rtc_aliquota_excluir&id=${id}`);
    fetchAliquotas();
  };

  const fmtDate = (d: string | null) => d ? d.split('-').reverse().join('/') : ' — ';
  const fmtPct  = (v: number) => `${Number(v).toFixed(4).replace('.', ',')}%`;

  return (
    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-xl p-4 space-y-4">
      <p className="text-sm font-bold text-green-800">Reforma Tributária  —  LC 214/2025</p>

      {/* Botões principais */}
      <div className="flex flex-wrap gap-2">
        <button onClick={handleImport} disabled={loadingImport}
          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-40">
          {loadingImport ? 'Importando...' : 'Importar Tabelas RTC (local)'}
        </button>
        <button onClick={() => setShowUrls(v => !v)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          Atualizar Online
        </button>
        <button onClick={() => setShowAliquotas(v => !v)}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors">
          {showAliquotas ? 'Ocultar Alíquotas' : 'Alíquotas de Transição'}
        </button>
      </div>

      {/* URLs para download */}
      {showUrls && (
        <div className="bg-white dark:bg-gray-800 border border-blue-100 rounded-lg p-4 space-y-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">Informe as URLs dos JSONs atualizados (ex: raw do GitHub):</p>
          {(['urlCstClasstrib', 'urlAnexos', 'urlCcredpres'] as const).map((k, i) => (
            <div key={k}>
              <label className="block text-[10px] uppercase font-medium text-gray-500 dark:text-gray-400 mb-1">{['cst_classtrib.json', 'anexos.json', 'ccredpres.json'][i]}</label>
              <input type="text" value={urls[k]} onChange={e => setUrls(p => ({ ...p, [k]: e.target.value }))}
                placeholder="https://..."
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          ))}
          <button onClick={handleAtualizarOnline} disabled={loadingOnline}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40">
            {loadingOnline ? 'Baixando...' : 'Baixar e Salvar'}
          </button>
        </div>
      )}

      {/* Tabela de alíquotas */}
      {showAliquotas && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <p className="text-xs font-bold text-gray-700 dark:text-gray-200">Alíquotas CBS / IBS</p>
            <button onClick={() => setEditAliq({ imposto: 'CBS', percentual: 0, dIniVig: '', dFimVig: '', observacao: '' } as any)}
              className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700">+ Nova</button>
          </div>
          <table className="w-full text-xs">
            <thead><tr className="border-b text-gray-500 dark:text-gray-400">
              <th className="text-left pb-1">Imposto</th><th className="text-right pb-1">%</th>
              <th className="text-center pb-1">Início</th><th className="text-center pb-1">Fim</th>
              <th className="text-center pb-1">Vigente</th><th className="pb-1"></th>
            </tr></thead>
            <tbody>
              {aliquotas.map(a => (
                <tr key={a.id} className="border-b last:border-0">
                  <td className="py-1 font-mono">{a.imposto}</td>
                  <td className="py-1 text-right font-mono">{fmtPct(a.percentual)}</td>
                  <td className="py-1 text-center">{fmtDate(a.d_ini_vig)}</td>
                  <td className="py-1 text-center">{fmtDate(a.d_fim_vig)}</td>
                  <td className="py-1 text-center">{a.vigente ? <span className="text-green-600 dark:text-green-400 font-bold">Sim</span> : <span className="text-gray-400 dark:text-gray-500">Não</span>}</td>
                  <td className="py-1 text-right flex gap-1 justify-end">
                    <button onClick={() => setEditAliq({ ...a, d_ini_vig: a.d_ini_vig, d_fim_vig: a.d_fim_vig ?? '' } as any)} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" title="Editar"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleExcluirAliq(a.id)} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-500 transition-colors" title="Excluir"><Trash2 className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Form edição */}
          {editAliq && (
            <div className="mt-4 border-t pt-4 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-medium text-gray-500 dark:text-gray-400 mb-1">Imposto</label>
                <select value={(editAliq as any).imposto} onChange={e => setEditAliq(p => ({ ...p, imposto: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
                  <option value="CBS">CBS</option>
                  <option value="IBS_UF">IBS UF</option>
                  <option value="IBS_MUNICIPAL">IBS Municipal</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-medium text-gray-500 dark:text-gray-400 mb-1">Percentual (%)</label>
                <input type="number" step="0.0001" min="0" value={(editAliq as any).percentual ?? 0}
                  onChange={e => setEditAliq(p => ({ ...p, percentual: parseFloat(e.target.value) }))}
                  className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-medium text-gray-500 dark:text-gray-400 mb-1">Início (AAAA-MM-DD)</label>
                <input type="date" value={(editAliq as any).d_ini_vig ?? ''} onChange={e => setEditAliq(p => ({ ...p, d_ini_vig: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-medium text-gray-500 dark:text-gray-400 mb-1">Fim (opcional)</label>
                <input type="date" value={(editAliq as any).d_fim_vig ?? ''} onChange={e => setEditAliq(p => ({ ...p, d_fim_vig: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] uppercase font-medium text-gray-500 dark:text-gray-400 mb-1">Observação</label>
                <input type="text" value={(editAliq as any).observacao ?? ''} onChange={e => setEditAliq(p => ({ ...p, observacao: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
              <div className="col-span-2 flex gap-2">
                <button onClick={handleSalvarAliq} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-md">Salvar</button>
                <button onClick={() => setEditAliq(null)} className="px-4 py-2 bg-gray-700 dark:bg-gray-600 text-white rounded-xl text-sm font-semibold hover:bg-gray-600 dark:hover:bg-gray-500 transition-colors">Cancelar</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ReformaTributariaTab = ({ showAlert }: { showAlert: (title: string, message: string) => void }) => {
  return (
    <div className="max-w-3xl">
      <RtcImportButton showAlert={showAlert} />
    </div>
  );
};


export { ReformaTributariaTab };
