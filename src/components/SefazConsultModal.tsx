import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Emitente } from '../types/nfce';
import { Search, RefreshCw, X, ShieldCheck, Printer, FileDown } from 'lucide-react';

const SefazConsultModal = ({ onClose, onImportXml, showAlert, emitente, onUpdateEmitente }: { 
  onClose: () => void, 
  onImportXml: (data: any) => void, 
  showAlert: (t: string, m: string) => void,
  emitente: Emitente,
  onUpdateEmitente: any
}) => {
  const [loading, setLoading] = useState(false);
  const [docs, setDocs] = useState<any[]>([]);
  const [lastQuery, setLastQuery] = useState(emitente.dataUltimaConsultaDfe || '');
  const [nsu, setNsu] = useState(emitente.ultimoNsu || '0');
  const [progresso, setProgresso] = useState<{aberto: boolean; lote: number; baixados: number; nsuAtual: string; cancelar: boolean}>({
    aberto: false, lote: 0, baixados: 0, nsuAtual: '0', cancelar: false
  });
  const cancelarRef = useRef(false);

  const fetchLocalDocs = async () => {
    try {
      const res = await fetch('./api.php?action=dist_listar_locais');
      const data = await res.json();
      if (Array.isArray(data)) setDocs(data.map(d => ({
        ...d,
        nsu: d.nsu, chave: d.chave, xNome: d.nome_emitente, CNPJ: d.cnpj_emitente, vNF: d.valor, dhEmi: d.data_emissao
      })));
    } catch {}
  };

  useEffect(() => { fetchLocalDocs(); }, []);

  const handleConsultar = async () => {
    cancelarRef.current = false;
    setProgresso({ aberto: true, lote: 0, baixados: 0, nsuAtual: nsu, cancelar: false });
    let nsuAtual = nsu;
    let totalBaixados = 0;
    let lote = 0;
    let ultimaResposta: any = null;
    try {
      while (true) {
        if (cancelarRef.current) break;
        lote++;
        setProgresso(p => ({ ...p, lote, nsuAtual: nsuAtual }));
        const res = await fetch(`./api.php?action=dist_dfe&nsu=${nsuAtual}`);
        const data = await res.json();
        ultimaResposta = data;
        if (data.data_consulta) setLastQuery(data.data_consulta);
        if (data.ultimo_nsu) {
          setNsu(data.ultimo_nsu);
          nsuAtual = data.ultimo_nsu;
        }
        if (data.data_consulta || data.ultimo_nsu) {
          onUpdateEmitente((prev: any) => ({
            ...prev,
            ultimoNsu: data.ultimo_nsu || prev.ultimoNsu,
            dataUltimaConsultaDfe: data.data_consulta || prev.dataUltimaConsultaDfe
          }));
        }
        if (!data.success) {
          setProgresso(p => ({ ...p, aberto: false }));
          showAlert('Erro SEFAZ', data.message || 'Falha na consulta.');
          return;
        }
        totalBaixados += (data.docs_count || 0);
        setProgresso(p => ({ ...p, baixados: totalBaixados }));
        if (!data.tem_mais) break;
        await new Promise(r => setTimeout(r, 2000));
      }
      setProgresso(p => ({ ...p, aberto: false }));
      fetchLocalDocs();
      if (cancelarRef.current) {
        showAlert('Consulta Cancelada', `Operação interrompida. ${totalBaixados} documentos baixados em ${lote} lote(s).`);
      } else if (totalBaixados > 0) {
        showAlert('Consulta Finalizada', `${totalBaixados} documento(s) baixado(s) em ${lote} lote(s).`);
      } else {
        showAlert('Consulta Concluída', ultimaResposta?.xMotivo || 'Nenhum documento novo foi localizado.');
      }
    } catch (err: any) {
      setProgresso(p => ({ ...p, aberto: false }));
      showAlert('Erro', 'Falha ao conectar com o servidor.');
    }
  };

  const handleManifestar = async (chave: string) => {
    setLoading(true);
    try {
      const res = await fetch(`./api.php?action=dist_manifestar&chave=${chave}&tipo=210210`);
      const data = await res.json();
      if (data.success) {
        showAlert('Sucesso', 'Ciência da Operação registrada com sucesso.');
        fetchLocalDocs();
      } else {
        showAlert('Erro', data.message || 'Falha ao manifestar.');
      }
    } catch { showAlert('Erro', 'Falha ao manifestar.'); }
    setLoading(false);
  };

  const handlePrintDanfe = (chave: string) => {
    window.open(`./api.php?action=dist_danfe&chave=${chave}`, '_blank');
  };

  const handleDownload = async (chave: string) => {
    setLoading(true);
    try {
      const res = await fetch(`./api.php?action=dist_download&chave=${chave}`);
      const data = await res.json();
      if (data.success) {
        onImportXml(data);
      } else {
        showAlert('Erro', data.message || 'Falha ao baixar XML.');
      }
    } catch { showAlert('Erro', 'Falha ao baixar XML.'); }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[120] p-4">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
          <div>
            <h4 className="text-lg font-bold text-gray-800 dark:text-gray-100 uppercase tracking-tight">Consulta de Documentos (SEFAZ)</h4>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
              Notas emitidas contra o CNPJ {emitente.cnpj} — 
              <span className={`ml-1 font-bold ${emitente.ambienteNfe === '1' ? 'text-green-600 dark:text-green-400' : 'text-orange-500'}`}>
                AMBIENTE DE {emitente.ambienteNfe === '1' ? 'PRODUÇÃO' : 'HOMOLOGAÇÃO'}
              </span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"><X className="w-5 h-5 text-gray-400 dark:text-gray-500" /></button>
        </div>
        
        <div className="p-6 bg-blue-50 dark:bg-blue-900/20/50 flex items-end gap-4 border-b border-blue-100">
           <div className="flex-1 max-w-[200px]">
             <label className="block text-[10px] font-bold text-blue-900 uppercase mb-1">Último NSU</label>
             <input type="text" value={nsu} onChange={e => setNsu(e.target.value)} className="w-full px-4 py-2 border border-blue-200 dark:border-blue-800 rounded-xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none" />
             {lastQuery && (
               <p className="text-[9px] text-blue-400 mt-1 font-medium">Última consulta: {new Date(lastQuery).toLocaleString('pt-BR')}</p>
             )}
           </div>
           <button onClick={handleConsultar} disabled={progresso.aberto} className={`px-8 py-2.5 ${progresso.aberto ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-2 shadow-lg`}>
             {progresso.aberto ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
             {progresso.aberto ? 'Consultando SEFAZ...' : 'Consultar Documentos'}
           </button>
           <div className="flex-1 flex flex-col justify-center">
             {loading ? (
               <p className="text-[10px] text-blue-700 dark:text-blue-300 font-bold animate-pulse">Buscando novos lotes na SEFAZ. Por favor, não feche esta janela...</p>
             ) : (
               <p className="text-[10px] text-blue-600 dark:text-blue-400 italic">Notas listadas abaixo estão salvas no sistema local. Clique em Consultar para buscar novos lotes.</p>
             )}
           </div>
        </div>

        <div className="p-0 overflow-auto flex-1">
          <table className="w-full text-left text-sm table-fixed">
            <colgroup>
              <col style={{ width: '22%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '30%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '12%' }} />
            </colgroup>
            <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 border-b border-gray-100 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Emitente</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">CNPJ</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Chave de Acesso / NSU</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase text-right">Valor</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase text-center">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {docs.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-20 text-center text-gray-400 dark:text-gray-500 italic">Ainda não há notas salvas. Clique em Consultar Novos Documentos.</td></tr>
              ) : docs.map((doc, idx) => (
                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/80 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{doc.xNome || doc.nome_emitente}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-600 dark:text-gray-300 font-mono">{doc.CNPJ || doc.cnpj_emitente}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-mono text-gray-700 dark:text-gray-200 truncate">{doc.chave || ' — '}</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono mt-0.5">NSU: {doc.nsu}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100 whitespace-nowrap">{Number(doc.vNF || doc.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {Number(doc.manifesto) === 2 ? (
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 uppercase">Confirmado</span>
                    ) : Number(doc.manifesto) === 1 ? (
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 uppercase">Ciência</span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 uppercase">Pendente</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1.5">
                      {/* Imprimir  —  sempre visível */}
                      <button onClick={() => handlePrintDanfe(doc.chave)} title="Imprimir DANFE" className="p-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-800 hover:text-white transition-all flex-shrink-0">
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      {/* Ciência  —  espaço reservado para manter alinhamento */}
                      {Number(doc.manifesto) === 0 ? (
                        <button onClick={() => handleManifestar(doc.chave)} title="Dar Ciência" className="p-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-600 hover:text-white transition-all flex-shrink-0">
                          <ShieldCheck className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="p-1.5 w-[28px] flex-shrink-0" />
                      )}
                      {/* Importar  —  sempre visível */}
                      <button
                        onClick={() => handleDownload(doc.chave)}
                        disabled={loading}
                        title="Importar XML"
                        className="p-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-600 hover:text-white transition-all active:scale-95 flex-shrink-0"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
           <button onClick={onClose} className="px-6 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
             Cancelar
           </button>
        </div>
      </motion.div>
      {progresso.aberto && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[90] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin" />
              </div>
              <div>
                <p className="font-bold text-gray-800 dark:text-gray-100">Consultando SEFAZ</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Buscando documentos em lotes</p>
              </div>
            </div>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-300">Lote atual:</span>
                <span className="font-bold text-gray-800 dark:text-gray-100">{progresso.lote}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-300">Documentos baixados:</span>
                <span className="font-bold text-green-600 dark:text-green-400">{progresso.baixados}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-300">NSU atual:</span>
                <span className="font-mono text-xs font-bold text-gray-700 dark:text-gray-200">{progresso.nsuAtual}</span>
              </div>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-6 overflow-hidden">
              <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '100%' }}></div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-4">
              Aguardando 2s entre lotes (rate limit SEFAZ). Não feche esta janela.
            </p>
            <div className="flex justify-center">
              <button
                onClick={() => { cancelarRef.current = true; }}
                className="px-6 py-2 text-sm font-semibold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/30 transition-all"
              >
                Cancelar Consulta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// �â€â‚¬�â€â‚¬�â€â‚¬ Componente Dashboard �â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬
// ── EmpresaPage ──────────────────────────────────────────────────────────────

export { SefazConsultModal };
