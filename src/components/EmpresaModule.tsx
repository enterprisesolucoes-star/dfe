import React, { useState, useEffect } from 'react';
import { Input } from './UIComponents';
import { Emitente } from '../types/nfce';
import { ReformaTributariaTab } from './ReformaTributariaModule';
import { FileText, Send, AlertCircle, QrCode, Trash2, RefreshCw, Upload, DollarSign, ShieldCheck, ExternalLink, Building, Pencil, Image as ImageIcon, MessageCircle, CheckCircle, WifiOff } from 'lucide-react';

const ESTADOS_BR = [
  { sigla: 'AC', nome: 'Acre' }, { sigla: 'AL', nome: 'Alagoas' }, { sigla: 'AP', nome: 'Amapá' },
  { sigla: 'AM', nome: 'Amazonas' }, { sigla: 'BA', nome: 'Bahia' }, { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' }, { sigla: 'ES', nome: 'Espírito Santo' },
  { sigla: 'GO', nome: 'Goiás' }, { sigla: 'MA', nome: 'Maranhão' }, { sigla: 'MT', nome: 'Mato Grosso' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul' }, { sigla: 'MG', nome: 'Minas Gerais' },
  { sigla: 'PA', nome: 'Pará' }, { sigla: 'PB', nome: 'Paraíba' }, { sigla: 'PR', nome: 'Paraná' },
  { sigla: 'PE', nome: 'Pernambuco' }, { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' }, { sigla: 'RN', nome: 'Rio Grande do Norte' },
  { sigla: 'RS', nome: 'Rio Grande do Sul' }, { sigla: 'RO', nome: 'Rondônia' },
  { sigla: 'RR', nome: 'Roraima' }, { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' }, { sigla: 'SE', nome: 'Sergipe' }, { sigla: 'TO', nome: 'Tocantins' },
];

const SmartPosSection = ({ emitente, onUpdate, showAlert }: { emitente: Emitente, onUpdate: (e: Emitente) => void, showAlert: (title: string, message: string) => void }) => {
  const [smartPosList, setSmartPosList] = useState<SmartPos[]>([]);
  const [smartPosForm, setSmartPosForm] = useState<SmartPos>({ codigo: '', integradora: '', apelido: '', numeroSerie: '' });
  const [editingSmartPos, setEditingSmartPos] = useState<number | null>(null);
  const [erroSmartPos, setErroSmartPos] = useState('');

  useEffect(() => {
    fetch('./api.php?action=listar_smartpos').then(r => r.json()).then(d => { if (Array.isArray(d)) setSmartPosList(d); }).catch(() => {});
  }, []);

  return (
    <div className="pt-6 border-t border-gray-100 dark:border-gray-700 mt-8">
      <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-4">Integração SMARTPOS</h4>
      <div className="grid grid-cols-[100px_1fr_1fr_1fr] gap-3 mb-3">
        <Input label="ID *" value={smartPosForm.codigo} onChange={(e: any) => setSmartPosForm(f => ({ ...f, codigo: e.target.value }))} />
        <Input label="Nº Série *" value={smartPosForm.numeroSerie} onChange={(e: any) => setSmartPosForm(f => ({ ...f, numeroSerie: e.target.value }))} />
        <Input label="Integradora *" value={smartPosForm.integradora} onChange={(e: any) => setSmartPosForm(f => ({ ...f, integradora: e.target.value }))} />
        <Input label="Apelido *" value={smartPosForm.apelido} onChange={(e: any) => setSmartPosForm(f => ({ ...f, apelido: e.target.value }))} />
      </div>
      <FormAlert message={erroSmartPos} theme="light" />
      <button
        onClick={async () => {
          const erros = [
            !smartPosForm.codigo        && 'ID obrigatório',
            !smartPosForm.numeroSerie   && 'Nº Série obrigatório',
            !smartPosForm.integradora   && 'Integradora obrigatória',
            !smartPosForm.apelido       && 'Apelido obrigatório',
          ].filter(Boolean) as string[];
          if (erros.length) { setErroSmartPos(erros.join(' é ')); return; }
          setErroSmartPos('');
          const payload = editingSmartPos ? { ...smartPosForm, id: editingSmartPos } : smartPosForm;
          const res = await fetch('./api.php?action=salvar_smartpos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          const d = await res.json();
          if (d.success) {
            const novo = editingSmartPos ? smartPosList.map(s => s.id === editingSmartPos ? { ...smartPosForm, id: editingSmartPos } : s) : [...smartPosList, { ...smartPosForm, id: d.id }];
            setSmartPosList(novo);
            setSmartPosForm({ codigo: '', integradora: '', apelido: '', numeroSerie: '' });
            setEditingSmartPos(null);
          }
        }}
        className="mt-2 mb-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        {editingSmartPos ? 'Salvar Alteração' : '+ Adicionar Máquina'}
      </button>
      {smartPosList.length > 0 && (
        <table className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">ID</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Nº Série</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Integradora</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Apelido</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {smartPosList.map(s => (
              <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-4 py-2 font-mono">{s.codigo}</td>
                <td className="px-4 py-2 font-mono">{s.numeroSerie}</td>
                <td className="px-4 py-2">{s.integradora}</td>
                <td className="px-4 py-2">{s.apelido}</td>
                <td className="px-4 py-2 flex justify-end gap-2">
                  <button onClick={() => { setSmartPosForm({ codigo: s.codigo, integradora: s.integradora, apelido: s.apelido, numeroSerie: s.numeroSerie }); setEditingSmartPos(s.id!); }} 
                    className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors" title="Editar">
                    <Pencil size={18} />
                  </button>
                  <button onClick={async () => { await fetch(`./api.php?action=excluir_smartpos&id=${s.id}`); setSmartPosList(smartPosList.filter(x => x.id !== s.id)); }} 
                    className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Excluir">
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

const ConfigTab = ({ emitente, onUpdate, onSave, showAlert, usuarioDfe }: { emitente: Emitente, onUpdate: (e: Emitente) => void, onSave: () => void, showAlert: (title: string, message: string) => void, usuarioDfe?: string | number }) => {
  const [municipios, setMunicipios] = useState<{ id: number, nome: string }[]>([]);
  const [loadingMun, setLoadingMun] = useState(false);
  const [tabAtivo, setTabAtivo] = useState<'empresa'|'email'|'parametros'>('empresa');

  const handleChange = (field: string, value: any) => {
    onUpdate({ ...emitente, [field]: value });
  };

  const handleUfChange = async (uf: string) => {
    onUpdate({ ...emitente, uf, municipio: '', codigoMunicipio: '' });
    if (!uf) return;
    setLoadingMun(true);
    try {
      const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`);
      const data = await res.json();
      setMunicipios(data.map((m: any) => ({ id: m.id, nome: m.nome })));
    } catch { setMunicipios([]); }
    finally { setLoadingMun(false); }
  };

  const handleMunicipioChange = (id: string) => {
    const mun = municipios.find(m => String(m.id) === id);
    if (mun) {
      onUpdate({ ...emitente, municipio: mun.nome, codigoMunicipio: String(mun.id) });
    }
  };

  useEffect(() => {
    if (emitente.uf && municipios.length === 0) {
      setLoadingMun(true);
      fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${emitente.uf}/municipios?orderBy=nome`)
        .then(r => r.json())
        .then(data => setMunicipios(data.map((m: any) => ({ id: m.id, nome: m.nome }))))
        .catch(() => {})
        .finally(() => setLoadingMun(false));
    }
  }, []);

  const validateEmitente = () => {
    const campos: [keyof Emitente, string][] = [
      ['cnpj','CNPJ'],['inscricaoEstadual','Inscrição Estadual'],['razaoSocial','Razão Social'],
      ['logradouro','Logradouro'],['numero','Número'],['bairro','Bairro'],['cep','CEP'],
      ['uf','UF'],['municipio','Município'],['codigoMunicipio','Cód. Município IBGE'],['telefone','Telefone'],
    ];
    for (const [f, label] of campos) {
      if (!emitente[f]) { showAlert('Campo obrigatório', `Preencha o campo: ${label}`); return false; }
    }
    return true;
  };

  const handleSalvar = () => {
    if (!validateEmitente()) return;
    onSave();
  };

  const selClass = "w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100";
  const tabClass = (t: string) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tabAtivo === t ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`;

  return (
    <div className="max-w-3xl">
      <div className="flex gap-2 mb-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-2">
        <button onClick={() => setTabAtivo('empresa')} className={tabClass('empresa')}>Dados da Empresa</button>
        <button onClick={() => setTabAtivo('email')} className={tabClass('email')}>E-mail</button>
        <button onClick={() => setTabAtivo('parametros')} className={tabClass('parametros')}>Parâmetros</button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
        <div className="space-y-6">

        {/* ABA 1: Dados da Empresa */}
        {tabAtivo === 'empresa' && (
          <div className="animate-fadeIn grid grid-cols-2 gap-4">
            <Input label="CNPJ *" value={emitente.cnpj} onChange={(e: any) => handleChange('cnpj', e.target.value)} />
            <Input label="Inscrição Estadual *" value={emitente.inscricaoEstadual} onChange={(e: any) => handleChange('inscricaoEstadual', e.target.value)} />
            <div className="col-span-2">
              <Input label="Razão Social *" value={emitente.razaoSocial} onChange={(e: any) => handleChange('razaoSocial', e.target.value)} />
            </div>

            <div className="col-span-2 pt-2 border-t border-gray-100 dark:border-gray-700 mt-2">
              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-4">Endereço e Contato</h4>
            </div>

            <div className="col-span-2 grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <Input label="Logradouro *" value={emitente.logradouro || ''} onChange={(e: any) => handleChange('logradouro', e.target.value)} />
              </div>
              <Input label="Número *" value={emitente.numero || ''} onChange={(e: any) => handleChange('numero', e.target.value)} />
            </div>

            <Input label="Bairro *" value={emitente.bairro || ''} onChange={(e: any) => handleChange('bairro', e.target.value)} />
            <Input label="CEP *" value={emitente.cep || ''} onChange={(e: any) => handleChange('cep', e.target.value)} />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">UF (Estado) *</label>
              <select value={emitente.uf || ''} onChange={e => handleUfChange(e.target.value)} className={selClass}>
                <option value="">Selecione o estado...</option>
                {ESTADOS_BR.map(s => <option key={s.sigla} value={s.sigla}>{s.sigla}  —  {s.nome}</option>)}
              </select>
            </div>
            <Input label="Telefone *" value={emitente.telefone || ''} onChange={(e: any) => handleChange('telefone', e.target.value)} />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Município *</label>
              <select
                value={emitente.codigoMunicipio || ''}
                onChange={e => handleMunicipioChange(e.target.value)}
                disabled={loadingMun || municipios.length === 0}
                className={selClass}
              >
                <option value="">{loadingMun ? 'Carregando...' : 'Selecione o município...'}</option>
                {municipios.map(m => <option key={m.id} value={String(m.id)}>{m.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Cód. Município IBGE</label>
              <input
                readOnly
                value={emitente.codigoMunicipio || ''}
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 text-sm cursor-not-allowed"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Regime Tributário (CRT) *</label>
              <select value={emitente.crt || '1'} onChange={(e) => handleChange('crt', e.target.value)} className={selClass}>
                <option value="1">1 - Simples Nacional</option>
                <option value="2">2 - Simples Nacional - excesso de sublimite</option>
                <option value="3">3 - Regime Normal</option>
              </select>
            </div>

            {emitente.crt === '1' && (Number(usuarioDfe) === 1 || Number(usuarioDfe) === 2) && (
              <div className="col-span-2 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100/50 space-y-4 animate-fadeIn">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="gerarCreditoSimples"
                    checked={emitente.gerarCreditoSimples || false}
                    onChange={(e) => handleChange('gerarCreditoSimples', e.target.checked)}
                    className="w-5 h-5 text-blue-600 dark:text-blue-400 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="gerarCreditoSimples" className="text-sm font-semibold text-gray-700 dark:text-gray-200 cursor-pointer">
                    Permitir aos clientes gerar crédito de ICMS do Simples Nacional
                  </label>
                </div>
                {emitente.gerarCreditoSimples && (
                  <div className="pl-8">
                    <Input
                      label="Alíquota de Crédito do Simples Nacional (%)"
                      type="number"
                      step="0.01"
                      value={emitente.aliquotaCreditoSimples || 0}
                      onChange={(e: any) => handleChange('aliquotaCreditoSimples', parseFloat(e.target.value) || 0)}
                      placeholder="Ex: 2.50"
                    />
                    <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1 uppercase font-bold">
                      Será informada na NFe conforme LC 123/2006 (pCredSN/vCredICMSSN ao cliente)
                    </p>
                  </div>
                )}
                {(Number(usuarioDfe) === 1 || Number(usuarioDfe) === 2) && (
                  <div className="pt-3 mt-3 border-t border-blue-100/50 flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="recolhe_ibscbs_fora"
                      checked={emitente.recolhe_ibscbs_fora || false}
                      onChange={(e) => handleChange('recolhe_ibscbs_fora', e.target.checked)}
                      className="w-5 h-5 text-emerald-600 dark:text-emerald-400 rounded focus:ring-emerald-500 cursor-pointer"
                    />
                    <label htmlFor="recolhe_ibscbs_fora" className="text-sm font-semibold text-blue-800 dark:text-blue-300 cursor-pointer">
                      Recolher IBS e CBS "Por Fora" do Simples Nacional? (Opção LC 214)
                    </label>
                  </div>
                )}
              </div>
            )}

            <div className="col-span-2 pt-4 border-t border-gray-100 dark:border-gray-700">
              <button onClick={handleSalvar} className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm">
                Salvar Dados da Empresa
              </button>
            </div>
          </div>
        )}

        {/* ABA 2: E-mail */}
        {tabAtivo === 'email' && (
          <div className="animate-fadeIn grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Send className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Envio de Arquivos (Contador / SMTP)
              </h4>
            </div>
            <div className="col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="E-mail do Contador" type="email" value={emitente.emailContador || ''} onChange={(e: any) => handleChange('emailContador', e.target.value)} />
              <Input label="Servidor SMTP (Host)" placeholder="ex: smtp.hostinger.com" value={emitente.smtpHost || ''} onChange={(e: any) => handleChange('smtpHost', e.target.value)} />
              <Input label="Usuário SMTP" placeholder="ex: vendas@suaempresa.com" value={emitente.smtpUser || ''} onChange={(e: any) => handleChange('smtpUser', e.target.value)} />
              <Input label="Senha SMTP" placeholder="*******" type="password" value={emitente.smtpPass || ''} onChange={(e: any) => handleChange('smtpPass', e.target.value)} />
            </div>
            <div className="col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
              <Input label="Porta SMTP" type="number" placeholder="ex: 465" value={emitente.smtpPort || ''} onChange={(e: any) => handleChange('smtpPort', Number(e.target.value) || '')} />
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Segurança</label>
                <select value={emitente.smtpSecure || 'tls'} onChange={(e) => handleChange('smtpSecure', e.target.value)} className={selClass}>
                  <option value="tls">TLS</option>
                  <option value="ssl">SSL</option>
                  <option value="nenhum">Nenhum</option>
                </select>
              </div>
            </div>
            <div className="col-span-2 pt-4">
              <button onClick={handleSalvar} className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm">
                Salvar E-mail
              </button>
            </div>
          </div>
        )}

        {/* ABA 3: Parâmetros */}
        {tabAtivo === 'parametros' && (
          <div className="animate-fadeIn space-y-6">

            <div>
              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Comissão de Vendedor
              </h4>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Gerar comissão de vendedor</label>
                <select
                  value={emitente.momento_comissao || 'emissao'}
                  onChange={(e) => handleChange('momento_comissao', e.target.value)}
                  className={selClass}
                >
                  <option value="emissao">Na emissão do documento (Orçamento Aprovado / OS Concluída / Venda)</option>
                  <option value="pagamento">No pagamento do cliente (baixa em Contas a Receber)</option>
                </select>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Define quando a comissão do vendedor é contabilizada.</p>
              </div>
            </div>

            {(emitente.crt === '3') && (
              <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Fiscal — ICMS
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Input label="Alíquota padrão de ICMS (%)" type="number" step="0.01"
                      value={emitente.aliquota_icms_padrao ?? 0}
                      onChange={(e: any) => handleChange('aliquota_icms_padrao', parseFloat(e.target.value) || 0)}
                      placeholder="Ex: 12.00" />
                    <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1 uppercase font-bold">
                      Usada automaticamente na emissão quando o produto tem alíquota ICMS zerada
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Financeiro — Juros e Multa
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <Input label="Multa (%)" type="number" step="0.01"
                  value={emitente.multa_receber ?? ''}
                  onChange={(e: any) => handleChange('multa_receber', parseFloat(e.target.value) || 0)}
                  placeholder="Ex: 2.00" />
                <Input label="Juros ao dia (%)" type="number" step="0.01"
                  value={emitente.juros_dia_receber ?? ''}
                  onChange={(e: any) => handleChange('juros_dia_receber', parseFloat(e.target.value) || 0)}
                  placeholder="Ex: 0.033" />
                <Input label="Carência (dias)" type="number"
                  value={emitente.carencia_dias_receber ?? ''}
                  onChange={(e: any) => handleChange('carencia_dias_receber', parseInt(e.target.value) || 0)}
                  placeholder="Ex: 0" />
              </div>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
              <LogoUploadSection emitente={emitente} onUpdate={onUpdate} showAlert={showAlert} />
            </div>

            <div className="pt-4">
              <button onClick={handleSalvar} className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm">
                Salvar Parâmetros
              </button>
            </div>
          </div>
        )}

        </div>
      </div>
    </div>
  );
};

const LogoUploadSection = ({ emitente, onUpdate, showAlert }: { emitente: Emitente; onUpdate: (e: Emitente) => void; showAlert: (t: string, m: string) => void }) => {
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      showAlert('Formato inválido', 'Use PNG ou JPG.'); return;
    }
    setUploading(true);
    const fd = new FormData();
    fd.append('logo', file);
    try {
      const res  = await fetch('./api.php?action=upload_logo_empresa', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success) {
        fetch('./api.php?action=logo_base64').then(r=>r.json()).then(d=>{ if(d.success) onUpdate({ ...emitente, logoPath: d.data }); });
        showAlert('Logo', 'Logo atualizada com sucesso!');
      } else {
        showAlert('Erro', data.message || 'Falha ao enviar logo.');
      }
    } catch (err: any) { console.error('Falha na requisição:', err); showAlert('Erro', 'Falha na requisição: ' + (err?.message || 'desconhecido')); }
    finally { setUploading(false); }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mt-4">
      <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1 flex items-center gap-2">
        <ImageIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Logo da Empresa
      </h4>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Recomendado: PNG ou JPG, 678x228 px. Usada nos relatórios e orçamentos.</p>
      <div className="flex items-center gap-6">
        {emitente.logoPath ? (
          <img src={emitente.logoPath} alt="Logo" className="h-16 object-contain border border-gray-200 dark:border-gray-700 rounded-lg p-1 bg-gray-50 dark:bg-gray-900" />
        ) : (
          <div className="h-16 w-32 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-500 text-xs">Sem logo</div>
        )}
        <label className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${uploading ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
          {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? 'Enviando...' : 'Enviar Logo'}
          <input type="file" accept="image/png,image/jpeg" className="hidden" disabled={uploading}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </label>
        {emitente.logoPath && (
          <button onClick={async () => {
            await fetch('./api.php?action=upload_logo_empresa', { method: 'POST', body: (() => { const f = new FormData(); return f; })() });
            onUpdate({ ...emitente, logoPath: '' });
          }} className="text-xs text-red-500 dark:text-red-400 hover:text-red-700 underline">Remover</button>
        )}
      </div>
    </div>
  );
};
// â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬

// â€ â‚¬â€ â‚¬â€ â‚¬ Orçamentos â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬
type OrcItem = { id?: number; tipo: 'produto' | 'servico'; produto_id?: number | null; descricao: string; unidade: string; quantidade: number; valor_unitario: number; valor_total: number };
type Orcamento = {
  id?: number; numero?: number; status: string; cliente_id?: number | null;
  cliente_nome?: string; cliente_documento?: string; cliente_telefone?: string; cliente_email?: string;
  valor_total: number; observacao?: string; validade?: string; data_criacao?: string; vendedor_id?: number | null; itens: OrcItem[];
};

const EmpresaPage = ({
  emitente, onUpdate, onSave, onCancel, showAlert, usuarioDfe,
}: {
  emitente: Emitente;
  onUpdate: (e: Emitente) => void;
  onSave: () => void;
  onCancel: () => void;
  showAlert: (t: string, m: string) => void;
  usuarioDfe?: string | number;
}) => (
  <div className="overflow-y-auto h-full pb-6">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
        <Building className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Configurações da Empresa
      </h2>
      <button onClick={onCancel} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline">Cancelar</button>
    </div>
    <ConfigTab emitente={emitente} onUpdate={onUpdate} onSave={onSave} showAlert={showAlert} usuarioDfe={usuarioDfe} />
  </div>
);


// ── WhatsAppSection ───────────────────────────────────────────────────────────
const WhatsAppSection = ({ showAlert }: { showAlert: (t: string, m: string) => void }) => {
  const [status, setStatus] = React.useState<'loading'|'open'|'close'|'unconfigured'>('loading');
  const [phone, setPhone] = React.useState('');
  const [qrCode, setQrCode] = React.useState('');
  const [loadingQr, setLoadingQr] = React.useState(false);

  const checkStatus = async () => {
    try {
      const r = await fetch('/api/whatsapp/status');
      if (r.status === 503) { setStatus('unconfigured'); return; }
      const d = await r.json();
      const st = d.state === 'open' ? 'open' : 'close';
      setStatus(st);
      if (d.phone) setPhone(d.phone.replace('@s.whatsapp.net', '').replace(/^55/, ''));
    } catch { setStatus('unconfigured'); }
  };

  const loadQr = async () => {
    setLoadingQr(true);
    try {
      const r = await fetch('/api/whatsapp/qrcode');
      const d = await r.json();
      if (d.qrcode) setQrCode(d.qrcode);
      if (d.status === 'open') { setStatus('open'); setQrCode(''); }
    } catch {}
    setLoadingQr(false);
  };

  React.useEffect(() => { checkStatus(); }, []);

  React.useEffect(() => {
    if (status !== 'close') return;
    loadQr();
    const iv = setInterval(async () => {
      try {
        const r = await fetch('/api/whatsapp/status');
        const d = await r.json();
        if (d.state === 'open') {
          setStatus('open');
          setPhone((d.phone || '').replace('@s.whatsapp.net', '').replace(/^55/, ''));
          setQrCode('');
          clearInterval(iv);
        } else {
          loadQr();
        }
      } catch {}
    }, 12000);
    return () => clearInterval(iv);
  }, [status]);

  if (status === 'unconfigured') return (
    <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm text-gray-500 dark:text-gray-400">
      <WifiOff className="w-4 h-4" /> Evolution API não configurada no servidor.
    </div>
  );

  if (status === 'loading') return (
    <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
      <RefreshCw className="w-4 h-4 animate-spin" /> Verificando conexão...
    </div>
  );

  if (status === 'open') return (
    <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
        <span className="text-sm font-medium text-green-700 dark:text-green-300">Conectado</span>
        {phone && <span className="text-xs text-green-600 dark:text-green-400">— +55 {phone}</span>}
      </div>
      <button onClick={checkStatus} className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1">
        <RefreshCw className="w-3 h-3" /> Verificar
      </button>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
        <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
        Aguardando conexão — escaneie o QR Code com o WhatsApp
      </div>
      {loadingQr && !qrCode && (
        <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
          <RefreshCw className="w-4 h-4 animate-spin" /> Gerando QR Code...
        </div>
      )}
      {qrCode && (
        <div className="flex flex-col items-start gap-3">
          <img src={qrCode} alt="QR Code WhatsApp" className="w-48 h-48 rounded-lg border border-gray-200 dark:border-gray-700 bg-white p-1" />
          <button onClick={loadQr} disabled={loadingQr} className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50">
            <RefreshCw className={`w-3 h-3 ${loadingQr ? 'animate-spin' : ''}`} /> Atualizar QR Code
          </button>
        </div>
      )}
    </div>
  );
};
// ─────────────────────────────────────────────────────────────────────────────

// ── IntegracaoPage ────────────────────────────────────────────────────────────
const IntegracaoPage = ({
  emitente, onUpdate, showAlert,
}: {
  emitente: Emitente;
  onUpdate: (e: Emitente) => void;
  showAlert: (t: string, m: string) => void;
}) => {
  const handleChange = (field: keyof Emitente, value: any) => onUpdate({ ...emitente, [field]: value });

  const handleSalvar = async () => {
    try {
      const res = await fetch('./api.php?action=salvar_empresa', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emitente),
      });
      const data = await res.json();
      if (data.success === false) { showAlert('Erro', data.message || 'Falha ao salvar.'); return; }
      showAlert('Sucesso', 'Configurações de integração salvas!');
    } catch { showAlert('Erro', 'Falha ao salvar.'); }
  };

  return (
    <div className="overflow-y-auto h-full pb-6">
      <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
        <ExternalLink className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Integrações
      </h2>

      <div className="max-w-3xl bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 space-y-6">

        {/* Reforma Tributária — LC 214/2025 */}
        <div>
          <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
            <span className="w-4 h-4 text-green-600 dark:text-green-400 font-bold text-xs">§</span> Reforma Tributária — LC 214/2025
          </h4>
          <ReformaTributariaTab showAlert={showAlert} />
        </div>

        <div className="border-t border-gray-100 dark:border-gray-700" />

        {/* WhatsApp Business — Evolution API (apenas se habilitado pelo admin) */}
        {!!(emitente as any).integracaowhatsapp && (
          <div>
            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-green-600 dark:text-green-400" /> WhatsApp Business
            </h4>
            <WhatsAppSection showAlert={showAlert} />
          </div>
        )}


        <div className="pt-4">
          <button onClick={handleSalvar} className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm">
            Salvar Integrações
          </button>
        </div>
      </div>
    </div>
  );
};

// ── DfeConfigPage ─────────────────────────────────────────────────────────────
const DfeConfigPage = ({
  emitente, onUpdate, onSave, showAlert,
}: {
  emitente: Emitente;
  onUpdate: (e: Emitente) => void;
  onSave: () => void;
  showAlert: (t: string, m: string) => void;
}) => {
  const [uploadingCert, setUploadingCert] = useState(false);
  const [tabAtivo, setTabAtivo] = useState<'nfce'|'nfe'>('nfce');
  const selClass = "w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100";
  const tabClass = (t: string) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tabAtivo === t ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`;

  const handleChange = (field: keyof Emitente, value: any) => onUpdate({ ...emitente, [field]: value });

  const handleCertUpload = async (file: File) => {
    if (!file.name.endsWith('.pfx') && !file.name.endsWith('.p12')) {
      showAlert('Formato inválido', 'Selecione um arquivo .pfx ou .p12.'); return;
    }
    setUploadingCert(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const payload = { ...emitente, certificadoPfx: base64, certificadoFileName: file.name };
      const res = await fetch('./api.php?action=salvar_empresa', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success !== false) {
        onUpdate({ ...emitente, certificadoFileName: file.name });
        showAlert('Certificado', 'Certificado digital enviado com sucesso!');
      } else {
        showAlert('Erro', data.message || 'Falha ao enviar certificado.');
      }
    } catch { showAlert('Erro', 'Falha ao enviar certificado.'); }
    finally { setUploadingCert(false); }
  };

  return (
    <div className="overflow-y-auto h-full pb-6">
      <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Configurações DFe (NFC-e / NF-e)
      </h2>

      <div className="max-w-3xl space-y-6">

        {/* Certificado Digital — sempre visível */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Certificado Digital (A1)
          </h4>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Arquivo .pfx / .p12</label>
                {emitente.certificadoFileName && (
                  <p className="text-xs text-green-600 dark:text-green-400 mb-1 font-medium">✓ {emitente.certificadoFileName}</p>
                )}
                <label className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${uploadingCert ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                  {uploadingCert ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploadingCert ? 'Enviando...' : 'Enviar Certificado'}
                  <input type="file" accept=".pfx,.p12" className="hidden" disabled={uploadingCert}
                    onChange={e => e.target.files?.[0] && handleCertUpload(e.target.files[0])} />
                </label>
              </div>
            </div>
            <Input
              label="Senha do Certificado"
              type="password"
              value={emitente.certificadoSenha || ''}
              onChange={(e: any) => handleChange('certificadoSenha', e.target.value)}
              placeholder="Senha do arquivo .pfx"
            />
          </div>
        </div>

        {/* Navegação de abas */}
        <div className="flex gap-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-2">
          <button onClick={() => setTabAtivo('nfce')} className={tabClass('nfce')}>
            NFC-e (Modelo 65)
          </button>
          <button onClick={() => setTabAtivo('nfe')} className={tabClass('nfe')}>
            NF-e (Modelo 55)
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">

          {/* ABA: NFC-e */}
          {tabAtivo === 'nfce' && (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2 flex items-center gap-2">
                <QrCode className="w-4 h-4 text-blue-600 dark:text-blue-400" /> NFC-e (Modelo 65)
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Ambiente NFC-e</label>
                  <select value={emitente.ambiente || '2'} onChange={e => handleChange('ambiente', e.target.value as '1' | '2')} className={selClass}>
                    <option value="2">2 - Homologação (Testes)</option>
                    <option value="1">1 - Produção</option>
                  </select>
                </div>
                <Input
                  label="Série NFC-e"
                  type="number"
                  value={emitente.serieNfce ?? ''}
                  onChange={(e: any) => handleChange('serieNfce', parseInt(e.target.value) || 1)}
                />
                <Input
                  label="Próximo Número NFC-e"
                  type="number"
                  value={emitente.numeroNfce ?? ''}
                  onChange={(e: any) => handleChange('numeroNfce', parseInt(e.target.value) || 1)}
                />
                <Input
                  label="CSC Token (ID_TOKEN)"
                  value={emitente.cscToken || ''}
                  onChange={(e: any) => handleChange('cscToken', e.target.value)}
                  placeholder="Token fornecido pela SEFAZ"
                />
                <Input
                  label="CSC ID"
                  value={emitente.cscId || ''}
                  onChange={(e: any) => handleChange('cscId', e.target.value)}
                  placeholder="Identificador do CSC"
                />
                <div className="col-span-2 border-t border-gray-100 dark:border-gray-700 pt-4 mt-2">
                  <h5 className="text-xs font-semibold text-orange-600 dark:text-orange-400 mb-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> Contingência
                  </h5>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="contingenciaAuto"
                      checked={emitente.contingenciaAutomatica || false}
                      onChange={e => handleChange('contingenciaAutomatica', e.target.checked)}
                      className="w-5 h-5 text-blue-600 dark:text-blue-400 rounded focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="contingenciaAuto" className="text-sm font-medium text-gray-700 dark:text-gray-200 cursor-pointer">
                      Contingência automática quando SEFAZ indisponível
                    </label>
                  </div>
                </div>
                <div className="col-span-2 pt-2">
                  <div className="flex gap-3 mb-2">
                    <button onClick={async () => { const el = document.getElementById('sefaz-status-nfce'); if(el){el.textContent='Consultando...';el.className='text-xs text-yellow-500';} try { const r = await fetch('./api.php?action=sefaz_status_nfce').then(x=>x.json()); if(el){el.textContent=r.success?`✅ Online — ${r.xMotivo}`:`❌ Indisponível — ${r.xMotivo}`;el.className=r.success?'text-xs text-green-500 font-medium':'text-xs text-red-500 font-medium';} } catch{ if(el){el.textContent='❌ Erro ao consultar';el.className='text-xs text-red-500';} } }} className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-3 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">🔍 Status SEFAZ</button>
                    <button onClick={onSave} className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm">Salvar NFC-e</button>
                  </div>
                  <span id="sefaz-status-nfce" className="text-xs text-gray-400"></span>
                </div>
              </div>
            </div>
          )}

          {/* ABA: NF-e */}
          {tabAtivo === 'nfe' && (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" /> NF-e (Modelo 55)
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Ambiente NF-e</label>
                  <select value={emitente.ambienteNfe || '2'} onChange={e => handleChange('ambienteNfe', e.target.value as '1' | '2')} className={selClass}>
                    <option value="2">2 - Homologação (Testes)</option>
                    <option value="1">1 - Produção</option>
                  </select>
                </div>
                <Input
                  label="Série NF-e"
                  type="number"
                  value={emitente.serieNfe ?? ''}
                  onChange={(e: any) => handleChange('serieNfe', parseInt(e.target.value) || 1)}
                />
                <Input
                  label="Próximo Número NF-e"
                  type="number"
                  value={emitente.numeroNfe ?? ''}
                  onChange={(e: any) => handleChange('numeroNfe', parseInt(e.target.value) || 1)}
                />
                <div className="col-span-2">
                  <Input
                    label="Último NSU (DF-e / Distribuição)"
                    type="number"
                    value={emitente.ultimoNsu ?? '0'}
                    onChange={(e: any) => handleChange('ultimoNsu', e.target.value || '0')}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Número do último NSU consultado na SEFAZ. Ajuste apenas se necessário (ex: ressincronizar consulta de NF-es recebidas).
                  </p>
                </div>
                <div className="col-span-2 pt-2">
                  <button onClick={onSave} className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm">
                    Salvar NF-e
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};


export { EmpresaPage, IntegracaoPage, DfeConfigPage };
