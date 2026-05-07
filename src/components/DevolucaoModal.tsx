import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { maskCPFCNPJ, maskCEP } from './UIComponents';
import { Produto, Cliente } from '../types/nfce';
import { AlertCircle, Trash2, RefreshCw, X, UserCheck, Edit2, CornerUpLeft, Building2 } from 'lucide-react';

const DevolucaoModal = ({ loading, data, vendaId, modeloOrigem, onClose, onSuccess, showAlert }: {
  loading: boolean;
  data: any;
  vendaId: number;
  modeloOrigem: number;
  onClose: () => void;
  onSuccess: (id: number) => void;
  showAlert: (t: string, m: string) => void;
}) => {
  const [itens, setItens] = React.useState<any[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  // NFC-e (65) choice: null = pending choice, 'empresa' = própria empresa, 'identificar' = cliente manual
  const [tipoDestinatario, setTipoDestinatario] = React.useState<null | 'empresa' | 'identificar'>(null);
  const [clienteManual, setClienteManual] = React.useState({ nome: '', documento: '', logradouro: '', numero: '', bairro: '', municipio: '', codigoMunicipio: '', uf: '', cep: '' });
  const [municipiosList, setMunicipiosList] = React.useState<{nome: string, id: number}[]>([]);
  const [loadingMunicipios, setLoadingMunicipios] = React.useState(false);
  const [editingItemIdx, setEditingItemIdx] = React.useState<number | null>(null);
  const [devolTab, setDevolTab] = React.useState<'PRODUTO'|'ICMS'|'IPI'|'PIS'|'COFINS'>('PRODUTO');
  const [informacoesAdicionais, setInformacoesAdicionais] = React.useState('');

  const handleUpdateItemDetail = (updated: any) => {
    if (editingItemIdx === null) return;
    setItens(prev => prev.map((it, idx) => idx === editingItemIdx ? { ...it, ...updated, valorTotal: parseFloat((it.quantidade * updated.valorUnitario).toFixed(2)) } : it));
    setEditingItemIdx(null);
  };


  const fetchMunicipios = async (uf: string) => {
    if (!uf || uf.length !== 2) return;
    setLoadingMunicipios(true);
    try {
      const r = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`);
      const d = await r.json();
      setMunicipiosList(Array.isArray(d) ? d : []);
    } catch { setMunicipiosList([]); }
    setLoadingMunicipios(false);
  };

  React.useEffect(() => {
    if (!data) return;
    const isInterno = (data.cliente?.uf || data.venda?.uf || 'GO') === (data.empresa?.uf || 'GO');
    
    setItens((data.itens || []).map((it: any) => {
      let cfopDev = isInterno ? '1202' : '2202';
      const origCfop = String(it.cfop || '');
      
      if (origCfop.startsWith('5101') || origCfop.startsWith('6101')) cfopDev = isInterno ? '1201' : '2201';
      else if (origCfop.includes('403') || origCfop.includes('405')) cfopDev = isInterno ? '1411' : '2411';
      else cfopDev = isInterno ? '1202' : '2202';

      return {
        produtoId: it.produto_id,
        descricao: it.descricao || 'Produto',
        ncm: it.ncm || '',
        cfop: cfopDev,
        unidadeComercial: it.unidade_comercial || 'UN',
        icmsCstCsosn: it.icms_cst_csosn === '101' || it.icms_cst_csosn === '201' ? '900' : (it.icms_cst_csosn || '102'),
        icmsAliquota: it.icms_aliquota || 0,
        origemMercadoria: it.origem_mercadoria || '0',
        pisCst: it.pis_cst || '07',
        pisAliquota: it.pis_aliquota || 0,
        cofinsCst: it.cofins_cst || '07',
        cofinsAliquota: it.cofins_aliquota || 0,
        percentualTributosNacional: it.percentual_tributos_nacional || 0,
        percentualTributosEstadual: it.percentual_tributos_estadual || 0,
        quantidade: parseFloat(it.quantidade) || 1,
        valorUnitario: parseFloat(it.valor_unitario) || 0,
        valorTotal: parseFloat(it.valor_total) || 0,
      };
    }));
    // Reset choice when data loads
    if (data.cliente) {
      setTipoDestinatario('identificar');
      const ufCliente = data.cliente.uf || '';
      setClienteManual({
        nome: data.cliente.nome || '',
        documento: data.cliente.documento || '',
        cep: data.cliente.cep || '',
        logradouro: data.cliente.logradouro || '',
        numero: data.cliente.numero || '',
        bairro: data.cliente.bairro || '',
        municipio: data.cliente.municipio || '',
        codigoMunicipio: data.cliente.codigo_municipio || '',
        uf: ufCliente,
      });
      if (ufCliente) fetchMunicipios(ufCliente);
    } else if (modeloOrigem === 55) {
      setTipoDestinatario('empresa'); 
    } else {
      setTipoDestinatario(null);
    }
    setInformacoesAdicionais('');
  }, [data]);

  // When user picks "Própria Empresa" for NFC-e 65, pre-fill informacoesAdicionais
  React.useEffect(() => {
    if (modeloOrigem !== 65 || tipoDestinatario !== 'empresa' || !data) return;
    const v = data.venda;
    const dt = v.data_emissao ? new Date(v.data_emissao).toLocaleDateString('pt-BR') : '';
    setInformacoesAdicionais(`Devolução de mercadoria referente à NFC-e nº ${v.numero}, série ${v.serie}, de data ${dt}, emitida a consumidor não identificado.`);
  }, [tipoDestinatario, data]);

  if (loading || !data) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[90]">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
          <p className="text-gray-600 dark:text-gray-300 font-medium">Carregando dados da venda...</p>
        </div>
      </div>
    );
  }

  const venda = data.venda;
  const empresa = data.empresa;

  // Build destinatário based on choice
  const destinatario = modeloOrigem === 65
    ? tipoDestinatario === 'empresa'
      ? {
          nome: empresa?.razao_social || '',
          documento: empresa?.cnpj || '',
          indIEDest: '1',
          ie: empresa?.inscricao_estadual || '',
          telefone: empresa?.telefone || '',
          endereco: {
            logradouro: empresa?.logradouro || '',
            numero: empresa?.numero || 'SN',
            complemento: empresa?.complemento || '',
            bairro: empresa?.bairro || '',
            codigoMunicipio: empresa?.codigo_municipio || '',
            municipio: empresa?.municipio || '',
            uf: empresa?.uf || '',
            cep: empresa?.cep || '',
          }
        }
      : {
          nome: clienteManual.nome,
          documento: clienteManual.documento,
          indIEDest: '9',
          ie: '',
          telefone: '',
          endereco: {
            logradouro: clienteManual.logradouro,
            numero: clienteManual.numero || 'SN',
            complemento: '',
            bairro: clienteManual.bairro,
            codigoMunicipio: clienteManual.codigoMunicipio,
            municipio: clienteManual.municipio,
            uf: clienteManual.uf,
            cep: clienteManual.cep,
          }
        }
    : {
        nome: venda.cliente_nome || '',
        documento: venda.cliente_documento || '',
        indIEDest: venda.cliente_ind_ie_dest || '9',
        ie: venda.cliente_ie || '',
        telefone: venda.cliente_telefone || '',
        endereco: {
          logradouro: venda.logradouro || '',
          numero: venda.numero_end || 'SN',
          complemento: venda.complemento || '',
          bairro: venda.bairro || '',
          codigoMunicipio: venda.codigo_municipio || '',
          municipio: venda.municipio || '',
          uf: venda.uf || '',
          cep: venda.cep || '',
        }
      };

  const totalValor = itens.reduce((s, it) => s + it.valorTotal, 0);

  const handleSubmit = async () => {
    if (itens.length === 0) { showAlert('Atenção', 'Nenhum item na devolução.'); return; }
    if (modeloOrigem === 65 && tipoDestinatario === 'identificar' && !clienteManual.nome.trim()) {
      showAlert('Atenção', 'Informe o nome do cliente.'); return;
    }
    setSubmitting(true);
    try {
      const payload: any = {
        devolucaoDeId: vendaId,
        modeloOrigem,
        cliente: destinatario,
        venda: {
          naturezaOperacao: 'DEVOLUCAO DE VENDA',
          finalidade: '4',
          tpNF: '0',
          consumidorFinal: modeloOrigem === 65 ? '0' : (venda.consumidor_final?.toString() || '0'),
          presencaComprador: '9',
          valorTotal: totalValor,
          valorDesconto: 0,
          pagamentos: [{ formaPagamento: '90', valorPagamento: totalValor }],
          itens: itens.map(it => ({
            produtoId: it.produtoId,
            quantidade: it.quantidade,
            valorUnitario: it.valorUnitario,
            valorTotal: it.valorTotal,
            cfop: it.cfop,
            icmsCstCsosn: it.icmsCstCsosn,
            icmsAliquota: it.icmsAliquota,
            origemMercadoria: it.origemMercadoria,
            pisCst: it.pisCst,
            pisAliquota: it.pisAliquota,
            cofinsCst: it.cofinsCst,
            cofinsAliquota: it.cofinsAliquota,
            percentualTributosNacional: it.percentualTributosNacional,
            percentualTributosEstadual: it.percentualTributosEstadual,
          })),
        },
      };
      if (informacoesAdicionais.trim()) {
        payload.venda.informacoesAdicionais = informacoesAdicionais.trim();
      }
      const res = await fetch('./api.php?action=nfe_devolucao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (d.success) {
        onSuccess(d.id);
      } else {
        showAlert('Erro', d.message || 'Falha ao emitir devolução.');
      }
    } catch {
      showAlert('Erro', 'Falha de comunicação.');
    }
    setSubmitting(false);
  };

  // â€ â‚¬â€ â‚¬ NFC-e (65): choice screen â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬
  if (modeloOrigem === 65 && tipoDestinatario === null) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[90] p-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-yellow-100 dark:bg-yellow-900/40 flex items-center justify-center">
                <CornerUpLeft className="w-5 h-5 text-yellow-700 dark:text-yellow-300" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Devolução de Venda</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">NFC-e nº {venda.numero}/{venda.serie}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-gray-700 dark:text-gray-200 font-medium text-center">Como deseja identificar o destinatário desta devolução?</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">A NFC-e original foi emitida a consumidor não identificado. Escolha como proceder:</p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setTipoDestinatario('empresa')}
                className="flex flex-col items-center gap-2 p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-yellow-400 hover:bg-yellow-50 transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/40 flex items-center justify-center group-hover:bg-yellow-200 transition-colors">
                  <Building2 className="w-5 h-5 text-yellow-700 dark:text-yellow-300" />
                </div>
                <span className="font-semibold text-gray-800 dark:text-gray-100 text-sm">Própria Empresa</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 text-center">Emitir contra o CNPJ da sua empresa</span>
              </button>
              <button
                onClick={() => setTipoDestinatario('identificar')}
                className="flex flex-col items-center gap-2 p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <UserCheck className="w-5 h-5 text-blue-700 dark:text-blue-300" />
                </div>
                <span className="font-semibold text-gray-800 dark:text-gray-100 text-sm">Identificar Cliente</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 text-center">Informar dados do cliente para a nota</span>
              </button>
            </div>
          </div>
          <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700">
            <button onClick={onClose} className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
              Cancelar
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // â€ â‚¬â€ â‚¬ Main form â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[90] p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-yellow-100 dark:bg-yellow-900/40 flex items-center justify-center">
              <CornerUpLeft className="w-5 h-5 text-yellow-700 dark:text-yellow-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Devolução de Venda</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {modeloOrigem === 65 ? 'NFC-e' : 'NF-e'} nº {venda.numero}/{venda.serie}  —  Gerará NF-e de Entrada (finalidade 4)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {modeloOrigem === 65 && (
              <button
                onClick={() => setTipoDestinatario(null)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline px-2 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
              >
                ‹ Voltar
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Destinatário: identificar cliente manually */}
          {modeloOrigem === 65 && tipoDestinatario === 'identificar' && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800 space-y-3">
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase mb-1">Dados do Cliente</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Nome / Razão Social *</label>
                  <input value={clienteManual.nome} onChange={e => setClienteManual(p => ({ ...p, nome: e.target.value }))}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-800"
                    placeholder="Nome completo ou razão social" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">CPF / CNPJ</label>
                  <input value={clienteManual.documento} onChange={e => setClienteManual(p => ({ ...p, documento: maskCPFCNPJ(e.target.value) }))}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-800"
                    placeholder="000.000.000-00" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">CEP</label>
                  <input value={clienteManual.cep} onChange={e => setClienteManual(p => ({ ...p, cep: maskCEP(e.target.value) }))}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-800"
                    placeholder="00000-000" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Logradouro</label>
                  <input value={clienteManual.logradouro} onChange={e => setClienteManual(p => ({ ...p, logradouro: e.target.value }))}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-800"
                    placeholder="Rua, Av., etc." />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Número</label>
                  <input value={clienteManual.numero} onChange={e => setClienteManual(p => ({ ...p, numero: e.target.value }))}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-800"
                    placeholder="SN" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Bairro</label>
                  <input value={clienteManual.bairro} onChange={e => setClienteManual(p => ({ ...p, bairro: e.target.value }))}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-800"
                    placeholder="Bairro" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">UF *</label>
                  <select value={clienteManual.uf} onChange={e => { const uf = e.target.value; setClienteManual(p => ({ ...p, uf, municipio: '', codigoMunicipio: '' })); fetchMunicipios(uf); }}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-800">
                    <option value="">Selecione</option>
                    {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Município *</label>
                  <select value={clienteManual.codigoMunicipio} onChange={e => { const opt = municipiosList.find(m => String(m.id) === e.target.value); setClienteManual(p => ({ ...p, codigoMunicipio: e.target.value, municipio: opt?.nome || '' })); }}
                    disabled={!clienteManual.uf || loadingMunicipios}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-800 disabled:opacity-50">
                    <option value="">{loadingMunicipios ? 'Carregando...' : 'Selecione a UF primeiro'}</option>
                    {municipiosList.map(m => <option key={m.id} value={String(m.id)}>{m.nome}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Destinatário: empresa or NF-e 55 client */}
          {(modeloOrigem !== 65 || tipoDestinatario === 'empresa') && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                {tipoDestinatario === 'empresa' ? 'Destinatário  —  Própria Empresa' : 'Destinatário  —  Cliente'}
              </p>
              <p className="font-semibold text-gray-800 dark:text-gray-100">{destinatario.nome}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">{destinatario.documento}{destinatario.ie ? `  —  IE: ${destinatario.ie}` : ''}</p>
              {destinatario.endereco.logradouro && (
                <p className="text-sm text-gray-500 dark:text-gray-400">{destinatario.endereco.logradouro}, {destinatario.endereco.numero}  —  {destinatario.endereco.municipio}/{destinatario.endereco.uf}</p>
              )}
            </div>
          )}

          {/* Informações Adicionais (NFC-e 65 / empresa path) */}
          {modeloOrigem === 65 && tipoDestinatario === 'empresa' && (
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Informações Adicionais</label>
              <textarea
                value={informacoesAdicionais}
                onChange={e => setInformacoesAdicionais(e.target.value)}
                rows={3}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              />
            </div>
          )}

          {/* Itens */}
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Itens da Devolução</p>
            <div className="space-y-2">
              {itens.map((it, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 dark:text-gray-100 text-sm truncate">{it.descricao}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">CFOP {it.cfop}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex flex-col items-end">
                      <span className="text-xs text-gray-400 dark:text-gray-500">Qtd</span>
                      <input
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={it.quantidade}
                        onChange={e => {
                          const q = parseFloat(e.target.value) || 0;
                          setItens(prev => prev.map((x, i) => i === idx ? { ...x, quantidade: q, valorTotal: parseFloat((q * x.valorUnitario).toFixed(2)) } : x));
                        }}
                        className="w-20 text-right px-2 py-1 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-xs text-gray-400 dark:text-gray-500">Unit.</span>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200 w-24 text-right">{it.valorUnitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-xs text-gray-400 dark:text-gray-500">Total</span>
                      <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 w-24 text-right">{it.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                    <button onClick={() => setEditingItemIdx(idx)} className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg text-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setItens(prev => prev.filter((_, i) => i !== idx))} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg text-red-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="flex justify-end">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl px-5 py-3 text-right">
              <p className="text-xs text-blue-500 font-semibold uppercase">Total da Devolução</p>
              <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{totalValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex gap-3 text-amber-800 text-xs mt-4">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>
              Será emitida uma <strong>NF-e de Entrada (tpNF=0)</strong> com finalidade <strong>Devolução (finNFe=4)</strong> referenciando a {modeloOrigem === 65 ? 'NFC-e' : 'NF-e'} original. O estoque dos produtos será <strong>devolvido</strong>.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-all"
          >
            Fechar
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-200 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {submitting ? <><RefreshCw className="w-4 h-4 animate-spin" /> Emitindo...</> : <><CornerUpLeft className="w-4 h-4" /> Emitir Devolução</>}
          </button>
        </div>

        {/* Modal de Ajuste Fiscal do Item */}
        {editingItemIdx !== null && (() => {
          const it = itens[editingItemIdx];
          const upd = (field: string, val: any) => setItens(prev => prev.map((x, i) => i === editingItemIdx ? { ...x, [field]: val } : x));
          return (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
              <motion.div initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2"><Edit2 className="w-5 h-5" /> Ajuste Fiscal do Item</h3>
                    <p className="text-blue-100 text-sm mt-0.5">{it.descricao}</p>
                  </div>
                  <button onClick={() => setEditingItemIdx(null)} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                </div>
                <div className="px-6 pt-4">
                  <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-700 rounded-xl">
                    {(['PRODUTO','ICMS','IPI','PIS','COFINS'] as const).map(tab => (
                      <button key={tab} onClick={() => setDevolTab(tab)}
                        className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all ${devolTab === tab ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                        {tab === 'PRODUTO' ? 'Produto' : tab}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-6 overflow-y-auto flex-1">
                  {devolTab === 'PRODUTO' && (
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        {label:'NCM', field:'ncm', ph:'00000000', max:8},
                        {label:'CFOP', field:'cfop', ph:'1202', max:4},
                        {label:'CST/CSOSN (ICMS)', field:'icmsCstCsosn', ph:'102', max:3},
                        {label:'CST PIS', field:'pisCst', ph:'07', max:2},
                        {label:'CST COFINS', field:'cofinsCst', ph:'07', max:2},
                        {label:'Unidade Comercial', field:'unidadeComercial', ph:'UN', max:6},
                      ].map(f => (
                        <div key={f.field} className="space-y-1.5">
                          <label className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider block">{f.label}</label>
                          <input type="text" value={it[f.field] ?? ''} maxLength={f.max}
                            onChange={e => upd(f.field, e.target.value)}
                            className="w-full bg-gray-50 dark:bg-gray-900 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-xl px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 outline-none transition-all"
                            placeholder={f.ph} />
                        </div>
                      ))}
                      <div className="col-span-2 space-y-1.5">
                        <label className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Origem da Mercadoria</label>
                        <select value={it.origemMercadoria ?? '0'} onChange={e => upd('origemMercadoria', e.target.value)}
                          className="w-full bg-gray-50 dark:bg-gray-900 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-xl px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 outline-none transition-all">
                          <option value="0">0 – Nacional</option>
                          <option value="1">1 – Estrangeira (imp. direta)</option>
                          <option value="2">2 – Estrangeira (merc. interno)</option>
                          <option value="3">3 – Nacional c/ 40-70% importado</option>
                          <option value="5">5 – Nacional c/ importação inferior a 40%</option>
                          <option value="8">8 – Nacional, importação superior a 70%</option>
                        </select>
                      </div>
                    </div>
                  )}
                  {(['ICMS','IPI','PIS','COFINS'] as const).includes(devolTab as any) && (() => {
                    const map: Record<string,{bc:string,aliq:string,val:string}> = {
                      ICMS:   {bc:'vbc_icms',   aliq:'icmsAliquota',   val:'valor_icms'},
                      IPI:    {bc:'vbc_ipi',    aliq:'ipiAliquota',    val:'valor_ipi'},
                      PIS:    {bc:'vbc_pis',    aliq:'pisAliquota',    val:'valor_pis'},
                      COFINS: {bc:'vbc_cofins', aliq:'cofinsAliquota', val:'valor_cofins'},
                    };
                    const {bc, aliq, val} = map[devolTab];
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Base de Cálculo</label>
                          <input type="number" step="0.01" value={it[bc] ?? 0}
                            onChange={e => { const v = parseFloat(e.target.value)||0; upd(bc, v); upd(val, parseFloat((v * ((it[aliq]||0)/100)).toFixed(2))); }}
                            className="w-full bg-gray-50 dark:bg-gray-900 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-xl px-4 py-3.5 text-gray-700 dark:text-gray-200 font-semibold outline-none transition-all" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Alíquota (%)</label>
                          <input type="number" step="0.01" value={it[aliq] ?? 0}
                            onChange={e => { const v = parseFloat(e.target.value)||0; upd(aliq, v); upd(val, parseFloat(((it[bc]||0) * (v/100)).toFixed(2))); }}
                            className="w-full bg-gray-50 dark:bg-gray-900 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-xl px-4 py-3.5 text-blue-600 dark:text-blue-400 font-semibold outline-none transition-all text-center" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Valor do Imposto</label>
                          <input type="number" step="0.01" value={it[val] ?? 0}
                            onChange={e => upd(val, parseFloat(e.target.value)||0)}
                            className="w-full bg-gray-50 dark:bg-gray-900 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-xl px-4 py-3.5 text-gray-700 dark:text-gray-200 font-semibold outline-none transition-all" />
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700">
                  <button onClick={() => setEditingItemIdx(null)}
                    className="w-full py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all">
                    Concluir
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </motion.div>
    </div>
  );
};


// â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬

// â€ â‚¬â€ â‚¬ Abrir Caixa â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬

export { DevolucaoModal };
