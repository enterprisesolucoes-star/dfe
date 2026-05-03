import React, { useState, useEffect } from 'react';
import { Save, Building2, CreditCard, FileText, AlertCircle, RefreshCw, Eye, EyeOff, Download, Upload, Printer, X } from 'lucide-react';

interface ConfigCobranca {
  id?: number;
  banco_codigo: string; banco_nome: string;
  agencia: string; conta: string; convenio: string;
  nosso_numero: number; ultima_remessa: number;
  modalidade: string; forma_entrega: string;
  carteira: string; carteira_codigo: string;
  prazo_devolucao: number; prazo_protesto: number;
  multa_valor: number; multa_tipo: string;
  juros_valor: number; juros_tipo: string;
  desconto_valor: number; desconto_tipo: string;
  instrucoes: string; client_id: string; client_secret: string;
  certificado_pem: string; certificado_key: string;
  ambiente: string; ativo: number;
}

const BANCOS = [
  { codigo: '756', nome: 'SICOOB' },
  { codigo: '341', nome: 'Itaú' },
  { codigo: '237', nome: 'Bradesco' },
  { codigo: '033', nome: 'Santander' },
  { codigo: '001', nome: 'Banco do Brasil' },
  { codigo: '104', nome: 'Caixa Econômica Federal' },
  { codigo: '748', nome: 'Sicredi' },
];

const FORM_INICIAL: ConfigCobranca = {
  banco_codigo: '756', banco_nome: 'SICOOB',
  agencia: '', conta: '', convenio: '',
  nosso_numero: 1, ultima_remessa: 0,
  modalidade: 'Registrada', forma_entrega: 'Cedente',
  carteira: 'Simples', carteira_codigo: '',
  prazo_devolucao: 30, prazo_protesto: 30,
  multa_valor: 3.00, multa_tipo: '%',
  juros_valor: 0.07, juros_tipo: '%',
  desconto_valor: 1.00, desconto_tipo: '%',
  instrucoes: '', client_id: '', client_secret: '',
  certificado_pem: '', certificado_key: '',
  ambiente: 'sandbox', ativo: 1,
};

const ic = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none shadow-sm bg-white';
const lb = 'block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider';

export const CobrancaConfigTab = ({ showAlert }: { showAlert: (t: string, m: string) => void }) => {
  const [form, setForm]         = useState<ConfigCobranca>(FORM_INICIAL);
  const [saving, setSaving]     = useState(false);
  const [loading, setLoading]   = useState(true);
  const [aba, setAba]           = useState<'banco' | 'prazos' | 'api'>('banco');
  const [showSecret, setShowSecret] = useState(false);
  const [showKey, setShowKey]   = useState(false);

  const set = (campo: keyof ConfigCobranca, valor: any) =>
    setForm(prev => ({ ...prev, [campo]: valor }));

  useEffect(() => {
    fetch('./api.php?action=cobranca_config_buscar')
      .then(r => r.json())
      .then(d => { if (d.success && d.data) setForm({ ...FORM_INICIAL, ...d.data }); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleBancoChange = (codigo: string) => {
    const banco = BANCOS.find(b => b.codigo === codigo);
    set('banco_codigo', codigo);
    set('banco_nome', banco?.nome || '');
  };

  const handleSalvar = async () => {
    if (!form.agencia || !form.conta || !form.convenio) {
      showAlert('Atenção', 'Agência, Conta e Convênio são obrigatórios.');
      return;
    }
    setSaving(true);
    try {
      const res  = await fetch('./api.php?action=cobranca_config_salvar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) showAlert('Sucesso', 'Configurações salvas com sucesso!');
      else showAlert('Erro', data.message || 'Falha ao salvar.');
    } catch { showAlert('Erro', 'Erro de conexão.'); }
    finally { setSaving(false); }
  };

  const ABAS = [
    { id: 'banco'  as const, label: 'Dados Bancários',          icon: Building2 },
    { id: 'prazos' as const, label: 'Prazos e Encargos',        icon: CreditCard },
    { id: 'api'    as const, label: 'API / Registro Automático', icon: FileText },
  ];

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Configuração de Cobrança</h2>
          <p className="text-xs text-gray-500 mt-0.5">Dados do cedente para emissão de boletos</p>
        </div>
        <button onClick={handleSalvar} disabled={saving}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 ${saving ? 'bg-gray-200 text-gray-400' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'}`}>
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {ABAS.map((a, idx) => (
          <button key={a.id} onClick={() => setAba(a.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
              aba === a.id ? 'bg-white text-blue-600 border-blue-200 shadow-sm' : 'bg-gray-50 text-gray-400 border-gray-100 hover:text-gray-600 hover:bg-white'
            }`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${aba === a.id ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>{idx + 1}</span>
            <a.icon className="w-4 h-4" />
            {a.label}
          </button>
        ))}
      </div>

      {aba === 'banco' && (
        <div className="space-y-4">
          <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-base font-semibold text-gray-800 mb-6 flex items-center gap-2 border-b border-gray-100 pb-3">
              <Building2 className="w-5 h-5 text-blue-600" /> Dados do Banco
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className={lb}>Banco</label>
                <select value={form.banco_codigo} onChange={e => handleBancoChange(e.target.value)} className={ic}>
                  {BANCOS.map(b => <option key={b.codigo} value={b.codigo}>{b.codigo} — {b.nome}</option>)}
                </select>
              </div>
              <div>
                <label className={lb}>Agência *</label>
                <input value={form.agencia} onChange={e => set('agencia', e.target.value)} className={ic} placeholder="Ex: 3043" />
              </div>
              <div>
                <label className={lb}>Conta *</label>
                <input value={form.conta} onChange={e => set('conta', e.target.value)} className={ic} placeholder="Ex: 76279" />
              </div>
              <div>
                <label className={lb}>Convênio *</label>
                <input value={form.convenio} onChange={e => set('convenio', e.target.value)} className={ic} placeholder="Ex: 176605" />
              </div>
              <div>
                <label className={lb}>Nosso Número Atual</label>
                <input type="number" value={form.nosso_numero} onChange={e => set('nosso_numero', parseInt(e.target.value) || 1)} className={ic} />
              </div>
              <div>
                <label className={lb}>Última Remessa</label>
                <input type="number" value={form.ultima_remessa} onChange={e => set('ultima_remessa', parseInt(e.target.value) || 0)} className={ic} />
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-base font-semibold text-gray-800 mb-6 flex items-center gap-2 border-b border-gray-100 pb-3">
              <CreditCard className="w-5 h-5 text-blue-600" /> Configuração da Carteira
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className={lb}>Modalidade</label>
                <select value={form.modalidade} onChange={e => set('modalidade', e.target.value)} className={ic}>
                  <option value="Registrada">Registrada</option>
                  <option value="Sem Registro">Sem Registro</option>
                </select>
              </div>
              <div>
                <label className={lb}>Forma de Entrega</label>
                <select value={form.forma_entrega} onChange={e => set('forma_entrega', e.target.value)} className={ic}>
                  <option value="Cedente">Cedente</option>
                  <option value="Banco">Banco</option>
                </select>
              </div>
              <div>
                <label className={lb}>Carteira</label>
                <select value={form.carteira} onChange={e => set('carteira', e.target.value)} className={ic}>
                  <option value="Simples">Simples</option>
                  <option value="Descontada">Descontada</option>
                  <option value="Caucionada">Caucionada</option>
                  <option value="Vinculada">Vinculada</option>
                </select>
              </div>
              <div>
                <label className={lb}>Código da Carteira</label>
                <input value={form.carteira_codigo} onChange={e => set('carteira_codigo', e.target.value)} className={ic} placeholder="Ex: 1, 3, 5" />
              </div>
              <div>
                <label className={lb}>Ambiente</label>
                <select value={form.ambiente} onChange={e => set('ambiente', e.target.value)} className={ic}>
                  <option value="sandbox">Sandbox (Homologação)</option>
                  <option value="producao">Produção</option>
                </select>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-100 pb-3">
              <FileText className="w-5 h-5 text-blue-600" /> Instruções do Boleto
            </h3>
            <textarea value={form.instrucoes} onChange={e => set('instrucoes', e.target.value)} rows={4}
              placeholder="Ex: Não receber após o vencimento. Cobrar multa de 2% após vencimento..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm resize-none" />
          </section>
        </div>
      )}

      {aba === 'prazos' && (
        <div className="space-y-4">
          <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-base font-semibold text-gray-800 mb-6 flex items-center gap-2 border-b border-gray-100 pb-3">
              <CreditCard className="w-5 h-5 text-blue-600" /> Prazos
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={lb}>Prazo de Devolução (dias)</label>
                <input type="number" min="0" value={form.prazo_devolucao} onChange={e => set('prazo_devolucao', parseInt(e.target.value) || 0)} className={ic} />
                <p className="text-xs text-gray-400 mt-1">Dias após vencimento para devolução do título</p>
              </div>
              <div>
                <label className={lb}>Prazo de Protesto (dias)</label>
                <input type="number" min="0" value={form.prazo_protesto} onChange={e => set('prazo_protesto', parseInt(e.target.value) || 0)} className={ic} />
                <p className="text-xs text-gray-400 mt-1">Dias após vencimento para protesto automático</p>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-base font-semibold text-gray-800 mb-6 flex items-center gap-2 border-b border-gray-100 pb-3">
              <CreditCard className="w-5 h-5 text-blue-600" /> Encargos por Atraso
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                <p className="text-xs font-bold text-red-600 uppercase mb-3">Multa</p>
                <div className="flex gap-2 mb-3">
                  {['%','R$'].map(t => (
                    <button key={t} onClick={() => set('multa_tipo', t)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${form.multa_tipo === t ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-500 border-gray-200'}`}>{t}</button>
                  ))}
                </div>
                <input type="number" step="0.01" min="0" value={form.multa_valor}
                  onChange={e => set('multa_valor', parseFloat(e.target.value) || 0)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-right font-semibold outline-none bg-white" />
              </div>
              <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                <p className="text-xs font-bold text-orange-600 uppercase mb-3">Juros ao Dia</p>
                <div className="flex gap-2 mb-3">
                  {['%','R$'].map(t => (
                    <button key={t} onClick={() => set('juros_tipo', t)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${form.juros_tipo === t ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-500 border-gray-200'}`}>{t}</button>
                  ))}
                </div>
                <input type="number" step="0.0001" min="0" value={form.juros_valor}
                  onChange={e => set('juros_valor', parseFloat(e.target.value) || 0)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-right font-semibold outline-none bg-white" />
              </div>
              <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                <p className="text-xs font-bold text-green-600 uppercase mb-3">Desconto</p>
                <div className="flex gap-2 mb-3">
                  {['%','R$'].map(t => (
                    <button key={t} onClick={() => set('desconto_tipo', t)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${form.desconto_tipo === t ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-500 border-gray-200'}`}>{t}</button>
                  ))}
                </div>
                <input type="number" step="0.01" min="0" value={form.desconto_valor}
                  onChange={e => set('desconto_valor', parseFloat(e.target.value) || 0)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-right font-semibold outline-none bg-white" />
              </div>
            </div>
          </section>
        </div>
      )}

      {aba === 'api' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-semibold mb-1">Credenciais para Registro Automático</p>
              <p className="text-xs">Necessário para gerar boletos individualmente em tempo real via API REST. Obtenha no portal do desenvolvedor do banco.</p>
            </div>
          </div>

          <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-base font-semibold text-gray-800 mb-6 flex items-center gap-2 border-b border-gray-100 pb-3">
              <FileText className="w-5 h-5 text-blue-600" /> Credenciais OAuth2
            </h3>
            <div className="space-y-4">
              <div>
                <label className={lb}>Client ID</label>
                <input value={form.client_id} onChange={e => set('client_id', e.target.value)} className={ic} placeholder="client_id fornecido pelo banco" />
              </div>
              <div>
                <label className={lb}>Client Secret</label>
                <div className="relative">
                  <input type={showSecret ? 'text' : 'password'} value={form.client_secret}
                    onChange={e => set('client_secret', e.target.value)}
                    className={ic + ' pr-10'} placeholder="client_secret fornecido pelo banco" />
                  <button onClick={() => setShowSecret(!showSecret)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-base font-semibold text-gray-800 mb-6 flex items-center gap-2 border-b border-gray-100 pb-3">
              <FileText className="w-5 h-5 text-blue-600" /> Certificado mTLS
            </h3>
            <div className="space-y-4">
              <div>
                <label className={lb}>Certificado (.pem)</label>
                <textarea value={form.certificado_pem} onChange={e => set('certificado_pem', e.target.value)} rows={5}
                  placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm resize-none" />
              </div>
              <div>
                <label className={lb}>Chave Privada (.key)</label>
                <div className="relative">
                  <textarea
                    value={showKey ? form.certificado_key : (form.certificado_key ? '••••••••••••••••••••••••••••••••' : '')}
                    onChange={e => showKey && set('certificado_key', e.target.value)}
                    readOnly={!showKey} rows={5}
                    placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm resize-none" />
                  <button onClick={() => setShowKey(!showKey)} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default CobrancaConfigTab;

// ─── Aba de Administração de Boletos ─────────────────────────────────────────
export const CobrancaBoletosTab = ({ showAlert, showConfirm }: {
  showAlert: (t: string, m: string) => void;
  showConfirm: (t: string, m: string, cb: () => void) => void;
}) => {
  const [boletos, setBoletos]       = useState<any[]>([]);
  const [totais, setTotais]         = useState<any>({});
  const [loading, setLoading]       = useState(false);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [selecionados, setSelecionados] = useState<number[]>([]);
  const [dtInicio, setDtInicio]     = useState(() => new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
  const [dtFim, setDtFim]           = useState(() => new Date().toISOString().split('T')[0]);
  const [importando, setImportando] = useState(false);

  const brl = (v: number) => Number(v)?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00';

  const carregar = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`./api.php?action=boleto_listar&status=${filtroStatus}&dt_inicio=${dtInicio}&dt_fim=${dtFim}`);
      const data = await res.json();
      if (data.success) { setBoletos(data.data); setTotais(data.totais); setSelecionados([]); }
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { carregar(); }, [filtroStatus, dtInicio, dtFim]);

  const handleImprimir = (id: number) => window.open(`./api.php?action=boleto_imprimir&id=${id}`, '_blank');

  const handleCancelar = (id: number) => {
    showConfirm('Cancelar Boleto', 'Confirma o cancelamento deste boleto?', async () => {
      const res  = await fetch(`./api.php?action=boleto_cancelar&id=${id}`);
      const data = await res.json();
      if (data.success) { showAlert('Sucesso', 'Boleto cancelado.'); carregar(); }
      else showAlert('Erro', data.message || 'Falha ao cancelar.');
    });
  };

  const handleGerarRemessa = async () => {
    if (selecionados.length === 0) { showAlert('Atenção', 'Selecione ao menos um boleto.'); return; }
    const res  = await fetch('./api.php?action=boleto_remessa', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: selecionados }),
    });
    const data = await res.json();
    if (data.success) {
      // Download automático
      const blob = new Blob([atob(data.conteudo)], { type: 'text/plain' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = data.arquivo; a.click();
      URL.revokeObjectURL(url);
      showAlert('Sucesso', `Remessa ${data.arquivo} gerada com ${data.total} título(s).`);
      carregar();
    } else showAlert('Erro', data.message || 'Falha ao gerar remessa.');
  };

  const handleImportarRetorno = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportando(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const conteudo = btoa(ev.target?.result as string);
        const res  = await fetch('./api.php?action=boleto_retorno', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conteudo, nome: file.name }),
        });
        const data = await res.json();
        if (data.success) {
          showAlert('Retorno Processado', `${data.pagos} título(s) baixado(s) — Total: ${brl(data.valor_total)}`);
          carregar();
        } else showAlert('Erro', data.message || 'Falha ao processar retorno.');
        setImportando(false);
      };
      reader.readAsBinaryString(file);
    } catch { setImportando(false); }
    e.target.value = '';
  };

  const toggleSel = (id: number) =>
    setSelecionados(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const toggleTodos = () =>
    setSelecionados(selecionados.length === boletos.filter(b => b.boleto_status === 'registrado').length
      ? [] : boletos.filter(b => b.boleto_status === 'registrado').map(b => b.id));

  const statusStyle: Record<string, string> = {
    registrado: 'bg-blue-100 text-blue-700',
    pago:       'bg-green-100 text-green-700',
    cancelado:  'bg-red-100 text-red-600',
    devolvido:  'bg-gray-100 text-gray-600',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Administração de Boletos</h2>
          <p className="text-xs text-gray-500 mt-0.5">Gerencie boletos, remessas e retornos</p>
        </div>
        <div className="flex gap-2">
          <label className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer ${importando ? 'bg-gray-200 text-gray-400' : 'bg-purple-600 text-white hover:bg-purple-700'}`}>
            <Upload className="w-4 h-4" />
            {importando ? 'Processando...' : 'Importar Retorno'}
            <input type="file" accept=".ret,.RET,.txt" onChange={handleImportarRetorno} className="hidden" disabled={importando} />
          </label>
          {selecionados.length > 0 && (
            <button onClick={handleGerarRemessa}
              className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 flex items-center gap-2">
              <Download className="w-4 h-4" /> Gerar Remessa ({selecionados.length})
            </button>
          )}
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total', valor: totais.total || 0, cor: 'gray', tipo: 'num' },
          { label: 'Registrados', valor: totais.registrado || 0, cor: 'blue', tipo: 'num' },
          { label: 'Pagos', valor: totais.pago || 0, cor: 'green', tipo: 'num' },
          { label: 'Valor Total', valor: totais.valor_total || 0, cor: 'indigo', tipo: 'brl' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">{c.label}</p>
            <p className={`text-lg font-bold text-${c.cor}-600`}>
              {c.tipo === 'brl' ? brl(c.valor as number) : c.valor}
            </p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3 items-end">
        <div className="flex gap-2 flex-wrap">
          {['', 'registrado', 'pago', 'cancelado'].map(s => (
            <button key={s} onClick={() => setFiltroStatus(s)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filtroStatus === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              {s === '' ? 'Todos' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex gap-2 items-center ml-auto">
          <label className="text-xs text-gray-500">De</label>
          <input type="date" value={dtInicio} onChange={e => setDtInicio(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500" />
          <label className="text-xs text-gray-500">Até</label>
          <input type="date" value={dtFim} onChange={e => setDtFim(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500" />
          <button onClick={carregar} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Seleção em massa */}
      {selecionados.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex items-center gap-3">
          <span className="text-sm text-indigo-700 font-medium">{selecionados.length} selecionado(s)</span>
          <button onClick={handleGerarRemessa}
            className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-700 flex items-center gap-1">
            <Download className="w-3 h-3" /> Gerar Remessa CNAB 240
          </button>
        </div>
      )}

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3">
                <input type="checkbox"
                  checked={selecionados.length > 0 && selecionados.length === boletos.filter(b => b.boleto_status === 'registrado').length}
                  onChange={toggleTodos} className="rounded" />
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Nosso Nº</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Cliente</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Vencimento</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Valor</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-center">Status</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Remessa</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center"><RefreshCw className="w-5 h-5 animate-spin mx-auto text-gray-300" /></td></tr>
            ) : boletos.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">Nenhum boleto encontrado.</td></tr>
            ) : boletos.map(b => (
              <tr key={b.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  {b.boleto_status === 'registrado' && (
                    <input type="checkbox" checked={selecionados.includes(b.id)}
                      onChange={() => toggleSel(b.id)} className="rounded" />
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-600">{b.boleto_nosso_numero}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-800 text-xs">{b.cliente_nome || '—'}</p>
                  <p className="text-gray-400 text-[10px]">{b.cliente_documento}</p>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{new Date(b.vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-800 text-sm">{brl(Number(b.valor_total))}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle[b.boleto_status] || 'bg-gray-100 text-gray-600'}`}>
                    {b.boleto_status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">
                  {b.boleto_remessa_numero ? `#${b.boleto_remessa_numero}` : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 justify-center">
                    <button onClick={() => handleImprimir(b.id)} title="Imprimir"
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                      <Printer className="w-4 h-4" />
                    </button>
                    {b.boleto_status === 'registrado' && (
                      <button onClick={() => handleCancelar(b.id)} title="Cancelar"
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                        <X className="w-4 h-4" />
                      </button>
                    )}
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
