import { useFormBehavior } from '../hooks/useFormBehavior';
import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';
import { ComprasTab, ImportXmlModal, CompraModal } from './ComprasModule';
import { OrdemServicoTab } from './OrdemServicoModule';
import { OrdemServicoOticaTab } from './OrdemServicoOticaModule';
import { RelatoriosHub } from './RelatorioTefModule';
import { StatCard, Input, TopProgressBar } from './UIComponents';
import { FinanceiroView, CaixaView, BaixaModal, ParcelamentoModal } from './FinanceiroModule';
import { PedidoTab } from './PedidoModule';
import { CobrancaConfigTab, CobrancaBoletosTab, CobrancaHistoricoTab } from './CobrancaModule';
import { ComissoesTab } from './ComissoesModule';
import { DashboardTab } from './DashboardModule';
import { Sidebar } from './SidebarModule';
import CommandPalette from './CommandPalette';
import { 
  ProdutoModal, ClienteModal, FornecedorModal, TransportadorModal, MedidaModal, BandeiraModal,
  ProdutosTab, ClientesTab, FornecedoresTab, TransportadoresTab, BandeirasTab, MedidasTab, NcmTab
} from './CadastrosModule';
import { VendasTab, GeralNfceTab, GeralNfeTab, NfeDashboardTab } from './FiscalModule';
import { VendaModal, IdentificarModal, TefModal, GlobalMessageModal } from './VendaModule';
import { DevolucaoModal } from './DevolucaoModal';
import { AbrirCaixaModal, FecharCaixaModal } from './CaixaModals';
import { VendedoresTab } from './VendedoresModule';
import { UsuariosTab } from './UsuariosModule';
import InstallPrompt from './InstallPrompt';
import { ReformaTributariaTab } from './ReformaTributariaModule';
import { MarketingModule, FogosAniversario } from './MarketingModule';

export const apiFetch = (url: string, options?: RequestInit) => {
  const session = JSON.parse(sessionStorage.getItem('dfe_session') || '{}');
  const headers: Record<string, string> = { ...(options?.headers as Record<string, string> || {}) };
  if (session.empresaId) headers['X-Empresa-ID'] = String(session.empresaId);
  if (session.usuarioId) headers['X-Usuario-ID'] = String(session.usuarioId);
  return fetch(url, { ...options, headers });
};
import { EmpresaPage, IntegracaoPage, DfeConfigPage } from './EmpresaModule';
import { OrcamentosTab } from './OrcamentosModule';
import { SefazConsultModal } from './SefazConsultModal';
import {
  Plus,
  FileText,
  Package,
  Users,
  Settings,
  Send,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  QrCode,
  Search,
  Download,
  Edit,
  Trash2,
  RefreshCw,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  Hash,
  Upload,
  X,
  UserCheck,
  LogOut,
  DollarSign,
  Edit2,
  CornerUpLeft,
  ShieldCheck,
  UserPlus,
  Eye,
  EyeOff,
  Ruler,
  Scale,
  Truck,
  ClipboardList,
  Printer,
  Mail,
  MessageCircle,
  Image as ImageIcon,
  ExternalLink,
  ArrowRight,
  XCircle,
  Moon,
  Sun,
  Building,
  Building2,
  Monitor,
  Store,
  ShoppingCart,
  CreditCard,
  ArrowUpCircle,
  ArrowDownCircle,
  History,
  TrendingUp,
  TrendingDown,
  FileDown,
  Wrench,
  Pencil
} from 'lucide-react';

const getLocalToday = () => {
  const tzOffset = new Date().getTimezoneOffset() * 60000;
  return new Date(Date.now() - tzOffset).toISOString().split('T')[0];
};
import type { Session } from '../App';
import FormAlert from './FormAlert';
import { motion, AnimatePresence } from 'motion/react';
import { Produto, Cliente, Fornecedor, Transportador, Venda as Nfce, Emitente, Medida, Bandeira } from '../types/nfce';
import { useTheme } from '../contexts/ThemeContext';
import { AppDataProvider, useAppData } from '../contexts/AppDataContext';
import { maskCPFCNPJ, maskCEP } from './UIComponents';
import { useToast } from '../contexts/ToastContext';

const lazyRetry = (componentImport: any) => {
  return lazy(async () => {
    try {
      return await componentImport();
    } catch (error) {
      console.error("Erro ao carregar componente. Tentando recarregar a página...", error);
      window.location.reload();
      return { default: () => null };
    }
  });
};

const NfeDashboard = lazyRetry(() => import('./NfeDashboard'));

const AppShell: React.FC<{ session: Session; onLogout: () => void; onUpdateSession: (s: Session) => void }> = ({ session, onLogout, onUpdateSession }) => {

  // Dark mode gerenciado pelo ThemeContext
  const { theme: themeMode, toggleTheme } = useTheme();
  const darkMode = themeMode === 'dark';
  const { toast } = useToast();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [navLoading, setNavLoading] = useState(false);
  useEffect(() => {
    const _kh = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCmdOpen(o => !o); } };
    window.addEventListener('keydown', _kh);
    return () => window.removeEventListener('keydown', _kh);
  }, []);

  const [usuarioDfeAtual, setUsuarioDfeAtual] = useState<number>(Number(session.usuarioDfe) ?? 2);
  const isFiscal = usuarioDfeAtual !== 0 && usuarioDfeAtual !== 4;

// Se empresa não está configurada, força aba de configurações e bloqueia as demais
useFormBehavior();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'vendas' | 'vendas_geral' | 'produtos' | 'clientes' | 'fornecedores' | 'compras' | 'orcamentos' | 'transportadores' | 'config' | 'ncm' | 'usuarios' | 'medidas' | 'bandeiras' | 'dfe_nfe' | 'dfe_nfe_geral' | 'dfe_nfe_parametros' | 'dfe_nfce_parametros' | 'reforma_tributaria' | 'config_empresa' | 'config_email' | 'config_smartpos' | 'config_integracao' | 'dfe_nfe_dados' | 'dfe_nfce_dados' | 'dfe_provedor' | 'empresa' | 'dfe_config' | 'fin_receber' | 'fin_pagar' | 'fin_caixa' | 'relatorios_tef' | 'vendedores' | 'comissoes' | 'pedidos' | 'cobranca_config' | 'cobranca_boletos' | 'cobranca_historico' | 'marketing' | 'os_otica'>(
  session.empresaConfigurada ? 'dashboard' : 'empresa'
);
const empresaBloqueada = !session.empresaConfigurada;
const CONFIG_TABS = ['config', 'config_empresa', 'config_email', 'config_smartpos', 'config_integracao', 'dfe_nfe_dados', 'dfe_nfce_dados', 'dfe_provedor', 'empresa', 'dfe_config'];
const [prevTab, setPrevTab] = useState<typeof activeTab>(session.empresaConfigurada ? 'dashboard' : 'empresa');

const [showOticaForm, setShowOticaForm] = React.useState(false);
const handleSetActiveTab = (tab: typeof activeTab) => { setShowOticaForm(false);
  if (empresaBloqueada && !CONFIG_TABS.includes(tab)) return;
  setNavLoading(true);
  setTimeout(() => setNavLoading(false), 350);
  setPrevTab(activeTab);
  setActiveTab(tab);
};
  const [cadastrosOpen, setCadastrosOpen] = useState(false);
  const [dfeNfceOpen, setDfeNfceOpen] = useState(true);
  const [dfeNfeOpen, setDfeNfeOpen] = useState(true);
  const [configEmpresaOpen, setConfigEmpresaOpen] = useState(false);
  const [configDfeOpen, setConfigDfeOpen] = useState(false);
  const [financeiroOpen, setFinanceiroOpen] = useState(false);
  const [cobrancaAtiva, setCobrancaAtiva] = useState(false);

  useEffect(() => {
    fetch('./api.php?action=cobranca_config_buscar')
      .then(r => r.json())
      .then(d => { if (d.success && d.data && d.data.ativo == 1) setCobrancaAtiva(true); })
      .catch(() => {});
  }, []);
  const [showCaixaModal, setShowCaixaModal] = useState(false);
  const [fogosAniversario, setFogosAniversario] = useState<string[]>([]);
  const [showFecharCaixaModal, setShowFecharCaixaModal] = useState(false);
  const {
    produtos, clientes, fornecedores, vendedores, transportadores, medidas, bandeiras,
    produtosRefreshKey, setProdutosRefreshKey,
    fetchProdutos, fetchClientes, fetchFornecedores, fetchVendedores,
    fetchTransportadores, fetchMedidas, fetchBandeiras,
  } = useAppData();
  const [isProdutoModalOpen, setIsProdutoModalOpen] = useState(false);
  const [isClienteModalOpen, setIsClienteModalOpen] = useState(false);
  const [isFornecedorModalOpen, setIsFornecedorModalOpen] = useState(false);
  const [isTransportadorModalOpen, setIsTransportadorModalOpen] = useState(false);
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [editingFornecedor, setEditingFornecedor] = useState<Fornecedor | null>(null);
  const [editingTransportador, setEditingTransportador] = useState<Transportador | null>(null);
  const [isMedidaModalOpen, setIsMedidaModalOpen] = useState(false);
  const [editingMedida, setEditingMedida] = useState<Medida | null>(null);
  const [isBandeiraModalOpen, setIsBandeiraModalOpen] = useState(false);
  const [editingBandeira, setEditingBandeira] = useState<Bandeira | null>(null);

  // States Compras
  const [isImportXmlModalOpen, setIsImportXmlModalOpen] = useState(false);
  const [isSefazConsultModalOpen, setIsSefazConsultModalOpen] = useState(false);
  const [importingXmlData, setImportingXmlData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportXmlFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('xml', file);
    try {
      const resp = await fetch('./api.php?action=importar_xml', { method: 'POST', body: formData });
      const res = await resp.json();
      if (res.success) {
        setImportingXmlData(res);
        setIsImportXmlModalOpen(true);
      } else {
        showAlert('Erro na Importação', res.message);
      }
    } catch { showAlert('Erro', 'Falha ao processar arquivo.'); }
    e.target.value = ''; // Reset input
  };

  type GlobalModalState = { isOpen: boolean; type: 'alert' | 'confirm' | 'prompt'; title: string; message: string; inputValue?: string; onConfirm?: (val?: string) => void };
  const [globalModal, setGlobalModal] = useState<GlobalModalState>({ isOpen: false, type: 'alert', title: '', message: '' });

  const showAlert = (title: string, message: string) => {
    const low = title.toLowerCase();
    if (low.includes('sucesso') || low.includes('ok')) { toast(message, 'success'); }
    else if (low.includes('atenção') || low.includes('aviso')) { toast(message, 'warning'); }
    else { setGlobalModal({ isOpen: true, type: 'alert', title, message }); }
  };
  const showConfirm = (title: string, message: string, onConfirm: () => void) => setGlobalModal({ isOpen: true, type: 'confirm', title, message, onConfirm });
  const showPrompt = (title: string, message: string, onConfirm: (val: string) => void, initialValue = '') => setGlobalModal({ isOpen: true, type: 'prompt', title, message, inputValue: initialValue, onConfirm });
  const closeGlobalModal = () => setGlobalModal(prev => ({ ...prev, isOpen: false }));
  
  const fetchEmpresa = async () => {
    // Verificar aniversariantes do dia (apenas uma vez por dia)
    const hoje = new Date().toDateString();
    const jaViu = sessionStorage.getItem('fogos_aniversario');
    if (jaViu !== hoje) {
      fetch(`./api.php?action=marketing_aniversariantes&mes=${new Date().getMonth()+1}`)
        .then(r => r.json())
        .then((data: any[]) => {
          if (Array.isArray(data)) {
            const diaHoje = new Date().getDate();
            const aniv = data.filter((c: any) => new Date(c.data_nascimento + 'T12:00:00').getDate() === diaHoje);
            if (aniv.length > 0) {
              setFogosAniversario(aniv.map((c: any) => c.nome));
              sessionStorage.setItem('fogos_aniversario', hoje);
            }
          }
        }).catch(() => {});
    }
    try {
      const response = await fetch('./api.php?action=empresa');
      const data = await response.json();
      if (data && data.id) {
        setEmitente(prev => ({
          ...prev,
          id: data.id,
          razaoSocial: data.razao_social || '',
          cnpj: data.cnpj || '',
          inscricaoEstadual: data.inscricao_estadual || '',
          ambiente: data.ambiente?.toString() || '2',
          cscToken: data.csc_token || '',
          cscId: data.csc_id || '',
          numeroNfce: data.numero_nfce ? Number(data.numero_nfce) : 0,
          serieNfce: data.serie_nfce ? Number(data.serie_nfce) : 1,
          numeroNfe: data.numero_nfe ? Number(data.numero_nfe) : 0,
          serieNfe: data.serie_nfe ? Number(data.serie_nfe) : 1,
          ambienteNfe: data.ambiente_nfe?.toString() || '2',
          codigoMunicipio: data.codigo_municipio || '',
          uf: data.uf || '',
          logradouro: data.logradouro || '',
          numero: data.numero || '',
          bairro: data.bairro || '',
          municipio: data.municipio || '',
          cep: data.cep || '',
          telefone: data.telefone || '',
          crt: data.crt || '1',
          certificadoSenha: data.certificado_senha || '',
          certificadoFileName: data.certificado_file_name || '',
          emailContador: data.email_contador || '',
          otica: Number(data.otica || 0),
          temTef: Number(data.tem_tef) === 1,
          smtpHost: data.smtp_host || '',
          smtpPort: data.smtp_port ? Number(data.smtp_port) : 587,
          smtpUser: data.smtp_user || '',
          smtpPass: data.smtp_pass || '',
          smtpSecure: data.smtp_secure || 'tls',
          fiscalApi: 'nfephp', // Forçar NFePHP como padrão no frontend
          logoPath: '',
          gerarCreditoSimples: Number(data.gerar_credito_simples) === 1,
          aliquotaCreditoSimples: Number(data.aliquota_credito_simples || 0),
          recolhe_ibscbs_fora: Number(data.recolhe_ibscbs_fora) === 1,
          momento_comissao: data.momento_comissao || 'emissao',
          emissaoContingencia: Number(data.emissao_contingencia) === 1,
          contingenciaAutomatica: Number(data.contingencia_automatica) !== 0,
          tef_required_states: data.tef_required_states || '',
          ultimoNsu: data.ultimo_nsu || '0',
          dataUltimaConsultaDfe: data.data_ultima_consulta_dfe || '',
          integracaowhatsapp: Number(data.integracaowhatsapp),
          chavepix: data.chavepix || ''
        }));
        console.log('usuario_dfe da API:', data.usuario_dfe); if (data.usuario_dfe !== undefined) setUsuarioDfeAtual(Number(data.usuario_dfe));
        if (data.logo_url) {
          fetch('./api.php?action=logo_base64')
            .then(r => r.json())
            .then(d => { if (d.success) setEmitente(prev => ({ ...prev, logoPath: d.data })); });
        }
      }
    } catch (error) {
      console.error("Erro ao buscar empresa:", error);
    }
  };

  const [vendas, setVendas] = useState<Nfce[]>([]);
  const [nfeList, setNfeList] = useState<any[]>([]);
  const [isCompraModalOpen, setIsCompraModalOpen] = useState(false);

  const fetchVendas = async () => {
    try {
      const hoje = getLocalToday();
      const response = await fetch(`./api.php?action=vendas&data_inicio=${hoje}&data_fim=${hoje}`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setVendas(data.map((v: any) => ({
          ...v,
          id: Number(v.id),
          numero: Number(v.numero),
          valorTotal: Number(v.valor_total),
          dataEmissao: v.data_emissao,
          chaveAcesso: v.chave_acesso,
          serie: Number(v.serie),
          temTef: Number(v.tem_tef) > 0
        })));
      }
    } catch (error) {
      console.error("Erro ao buscar vendas:", error);
    }
  };

  const fetchNfeList = async () => {
    try {
      const hoje = getLocalToday();
      const primeiroDia = hoje.substring(0, 8) + '01';
      const response = await fetch(`./api.php?action=nfe_listar&data_inicio=${primeiroDia}&data_fim=${hoje}`);
      const data = await response.json();
      if (Array.isArray(data)) setNfeList(data);
      else if (data && Array.isArray(data.data)) setNfeList(data.data);
    } catch (error) {
      console.error("Erro ao buscar NF-e:", error);
    }
  };

  // Estado para recuperar pagamento TEF pendente após reload
  type PendingTef = { pagamentosIds: number[]; currentIndex: number; uniqueid: string; vendaId: number; numero: number } | null;
  const [pendingTef, setPendingTef] = useState<PendingTef>(null);

  useEffect(() => {
    fetchEmpresa();
    fetchVendas();
    fetchNfeList();
    fetch('./api.php?action=verificar_tef_pendente')
      .then(r => r.json())
      .then(d => { if (d.found) setPendingTef({ pagamentosIds: d.pagamentosIds ?? [d.pagamentoId], currentIndex: 0, uniqueid: d.uniqueid, vendaId: d.vendaId, numero: d.numero }); })
      .catch(() => {});
  }, []);
  const [emitente, setEmitente] = useState<Emitente>({
    razaoSocial: 'EMPRESA DE TESTE GOIAS LTDA',
    cnpj: '00.000.000/0001-91',
    inscricaoEstadual: '123456789',
    crt: '1',
    gerarCreditoSimples: false,
    aliquotaCreditoSimples: 0,
    ambiente: '2',
    cscToken: '',
    cscId: '',
    codigoMunicipio: '5208707',
    uf: 'GO',
    logradouro: 'AVENIDA CENTRAL',
    numero: '1000',
    bairro: 'SETOR CENTRAL',
    municipio: 'GOIANIA',
    cep: '74003-010',
    tef_required_states: 'GO,MT',
    ultimoNsu: '0',
    multa_receber: 0,
    juros_dia_receber: 0,
    carencia_dias_receber: 0
  });
  const [isVendaModalOpen, setIsVendaModalOpen] = useState(false);
  const [isNfeModalOpen, setIsNfeModalOpen] = useState(false);
  const [vendaPreload, setVendaPreload] = useState<{ itens: any[]; destinatario: any } | null>(null);

  // Lazy loading de catálogos por aba
  useEffect(() => {
    if (activeTab === 'produtos' || activeTab === 'vendas' || activeTab === 'pedidos' || activeTab === 'orcamentos' || activeTab === 'ordens_servico' || activeTab === 'os_otica') fetchProdutos();
    if (activeTab === 'clientes' || activeTab === 'pedidos' || activeTab === 'orcamentos' || activeTab === 'ordens_servico' || activeTab === 'os_otica' || activeTab === 'dfe_nfe') fetchClientes();
    if (activeTab === 'fornecedores') fetchFornecedores();
    if (activeTab === 'vendedores' || activeTab === 'pedidos' || activeTab === 'orcamentos' || activeTab === 'ordens_servico' || activeTab === 'os_otica') fetchVendedores();
    if (activeTab === 'transportadores') fetchTransportadores();
    if (activeTab === 'medidas') fetchMedidas();
    if (activeTab === 'bandeiras') fetchBandeiras();
  }, [activeTab]);

  // Garante clientes carregados ao abrir modais que precisam de busca
  useEffect(() => { if (isNfeModalOpen) { fetchClientes(); fetchProdutos(); } }, [isNfeModalOpen]);
  useEffect(() => { if (isVendaModalOpen) { fetchVendedores(); } }, [isVendaModalOpen]);

  const handleNovaVenda = (novaVenda: Nfce) => {
    fetchVendas();
    setIsVendaModalOpen(false);
  };

  const handleCancelar = (id: number) => {
    // Verifica prazo de cancelamento (168 horas = 7 dias após emissão)
    const venda = vendas.find(v => v.id === id);
    if (venda?.dataEmissao) {
      const emissao = new Date(venda.dataEmissao.replace(' ', 'T'));
      const horasDecorridas = (Date.now() - emissao.getTime()) / 3_600_000;
      if (horasDecorridas > 168) {
        showAlert(
          "Prazo Expirado",
          `Esta NFC-e foi emitida há ${Math.floor(horasDecorridas)} horas. O prazo máximo para cancelamento na SEFAZ é de 168 horas (7 dias) após a autorização.`
        );
        return;
      }
    }
    showPrompt("Cancelar NFC-e", "Informe a justificativa do cancelamento (mínimo 15 caracteres):", async (justificativa) => {
      if (!justificativa || justificativa.length < 15) {
        showAlert("Ação Inválida", "A justificativa deve ter no mínimo 15 caracteres.");
        return;
      }
      try {
        const resp = await fetch(`./api.php?action=cancelar&id=${id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ justificativa })
        });
        const data = await resp.json();
        if (data.success) {
          showAlert("Cancelada", `NFC-e #${id} cancelada com sucesso na SEFAZ. Protocolo: ${data.protocolo}`);
          fetchVendas();
          fetchProdutos();
        } else {
          showAlert("Falha no Cancelamento", data.message || "Erro desconhecido.");
        }
      } catch {
        showAlert("Erro de Conexão", "Não foi possível comunicar com o servidor.");
      }
    });
  };

  const handleCancelarNfe = (id: number) => {
    const nfe = nfeList.find(v => v.id === id);
    if (nfe?.data_emissao) {
      const emissao = new Date(nfe.data_emissao.replace(' ', 'T'));
      const horasDecorridas = (Date.now() - emissao.getTime()) / 3_600_000;
      if (horasDecorridas > 168) {
        showAlert('Prazo Expirado', `Esta NF-e foi emitida há ${Math.floor(horasDecorridas)} horas. O prazo máximo para cancelamento é de 168 horas (7 dias).`);
        return;
      }
    }
    showPrompt('Cancelar NF-e', 'Informe a justificativa do cancelamento (mínimo 15 caracteres):', async (justificativa) => {
      if (!justificativa || justificativa.length < 15) { showAlert('Ação Inválida', 'A justificativa deve ter no mínimo 15 caracteres.'); return; }
      try {
        const resp = await fetch(`./api.php?action=nfe_cancelar&id=${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ justificativa }) });
        const data = await resp.json();
        if (data.success) {
          showAlert('Cancelada', `NF-e #${id} cancelada com sucesso. Protocolo: ${data.protocolo}`);
          fetchNfeList();
          fetchProdutos();
        } else { showAlert('Falha', data.message || 'Erro desconhecido.'); }
      } catch { showAlert('Erro de Conexão', 'Não foi possível comunicar com o servidor.'); }
    });
  };

  const handleExcluirNfe = (id: number) => {
    showConfirm('Excluir NF-e', 'Deseja excluir esta NF-e permanentemente? Esta ação não pode ser desfeita.', async () => {
      try {
        const resp = await fetch(`./api.php?action=nfe_excluir&id=${id}`);
        const data = await resp.json();
        if (data.success) {
          fetchNfeList();
          showAlert('Excluída', 'NF-e removida com sucesso.');
        } else {
          showAlert('Erro', data.message || 'Não foi possível excluir a NF-e.');
        }
      } catch {
        showAlert('Erro', 'Falha ao comunicar com o servidor.');
      }
    });
  };

  const handleSalvarEmpresa = async () => {
    try {
      const response = await fetch('./api.php?action=salvar_empresa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emitente)
      });
      const text = await response.text();
      let data: any = {};
      try { data = JSON.parse(text); } catch { /* resposta não é JSON */ }
      if (!response.ok || data.success === false) {
        const msg = data.message || data.error || text || `HTTP ${response.status}`;
        showAlert("Erro ao salvar", msg);
        console.error("Erro salvar_empresa:", text);
        return;
      }
      fetchEmpresa();
      if (emitente.contingenciaAutomatica) {
        showAlert('⚠️ Configurações salvas — Contingência Ativa', 'Modo contingência está ativado. NFC-e emitidas não são autorizadas pela SEFAZ imediatamente. Retransmita em até 168h após o retorno da conexão.');
      } else {
        showAlert('Configurações salvas', 'As configurações foram salvas com sucesso.');
      }
      // Voltar para a aba correta após salvar
      if (['dfe_config','dfe_nfe_dados','dfe_nfce_dados','dfe_provedor'].includes(activeTab)) {
        handleSetActiveTab('dfe_config');
      } else {
        handleSetActiveTab('empresa');
      }
      if (!session.empresaConfigurada && emitente.razaoSocial && emitente.cnpj) {
        onUpdateSession({ ...session, empresaConfigurada: true });
      }
    } catch (error) {
      console.error("Erro ao salvar empresa:", error);
      showAlert("Erro", "Erro ao salvar configurações.");
    }
  };

  const handleSincronizarContingencia = async (id: number) => {
    try {
      const resp = await fetch(`./api.php?action=transmitir_contingencia&id=${id}`);
      const data = await resp.json();
      if (data.success) {
        showAlert("Sincronizado", "Nota transmitida e autorizada com sucesso!");
      } else {
        showAlert("Falha na Sefaz", data.message || "Rejeitada pela Sefaz.");
      }
      fetchVendas();
      fetchProdutos();
    } catch(err) {
       showAlert("Erro de Conexão", "Falha ao se comunicar com a Sefaz para re-transmitir.");
    }
  };

  const handleExcluirVenda = (id: number) => {
    showConfirm("Excluir Venda", "Deseja excluir esta venda permanentemente? Esta ação não pode ser desfeita.", async () => {
      try {
        const resp = await fetch(`./api.php?action=excluir_venda&id=${id}`);
        const data = await resp.json();
        if (data.success) {
          fetchVendas();
          showAlert("Excluída", "Venda removida com sucesso.");
        } else {
          showAlert("Erro", data.message || "Não foi possível excluir a venda.");
        }
      } catch {
        showAlert("Erro", "Falha ao comunicar com o servidor.");
      }
    });
  };

  const handleRetryNfeTef = async (vendaId: number) => {
    showAlert('Processando', 'Tentando emitir NF-e pendente...');
    try {
      const resp = await fetch(`./api.php?action=nfe_emitir_pendente&id=${vendaId}`);
      const data = await resp.json();
      if (data.success) {
        fetchNfeList();
        fetchProdutos();
        showAlert('Sucesso!', 'NFe Autorizada.');
      } else {
        showAlert('Erro na Emissão', data.message || 'Falha ao emitir NF-e pendente.');
      }
    } catch {
      showAlert('Erro', 'Falha de comunicação ao emitir NF-e.');
    }
  };

  const handleRetryTef = async (vendaId: number) => {
    const resp = await fetch(`./api.php?action=tef_retry&venda_id=${vendaId}`);
    const data = await resp.json();
    if (data.success) {
      setPendingTef({ pagamentosIds: data.pagamentosIds ?? [data.pagamentoId], currentIndex: 0, uniqueid: '', vendaId: data.vendaId, numero: data.numero });
    } else {
      showAlert('Erro', data.message || 'Não foi possível iniciar nova tentativa TEF.');
    }
  };

  const handleEmailDoc = async (id: number, modelo: number | string, defaultEmail = '') => {
    const isNfe = modelo === 55 || modelo === '55' || modelo === 'nfe';
    let emailSugerido = defaultEmail;
    if (!emailSugerido) {
      try {
        const action = isNfe ? 'nfe_buscar_email_cliente' : 'nfce_buscar_email_cliente';
        const res = await fetch(`./api.php?action=${action}&id=${id}`);
        const d = await res.json();
        if (d.email) emailSugerido = d.email;
      } catch {}
    }
    showPrompt("Enviar E-mail", "Digite o e-mail do destinatário:", async (email) => {
      if (!email || email.trim() === '') return;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        showAlert("E-mail inválido", "Digite um e-mail válido.");
        return;
      }
      setEmailSendingOverlay(true);
      try {
        const action = isNfe ? 'nfe_enviar_email_doc' : 'enviar_email_doc';
        const res = await fetch(`./api.php?action=${action}&id=${id}&email=${encodeURIComponent(email.trim())}`, { method: 'POST' });
        const d = await res.json();
        setEmailSendingOverlay(false);
        if(!d.success) showAlert("Erro", d.message || "Não foi possível enviar o e-mail");
      } catch (e) {
        setEmailSendingOverlay(false);
        showAlert("Erro", "Falha de comunicação.");
      }
    }, emailSugerido);
  };

  const [emailSendingOverlay, setEmailSendingOverlay] = useState(false);
  const [devolucaoModal, setDevolucaoModal] = useState<{ isOpen: boolean; vendaId: number; modeloOrigem: number; loading: boolean; data: any | null }>({ isOpen: false, vendaId: 0, modeloOrigem: 55, loading: false, data: null });

  const handleDevolucao = async (id: number, modeloOrigem = 55) => {
    setDevolucaoModal({ isOpen: true, vendaId: id, modeloOrigem, loading: true, data: null });
    try {
      const res = await fetch(`./api.php?action=nfe_buscar_para_devolucao&id=${id}&modelo=${modeloOrigem}`);
      const d = await res.json();
      if (d.success) {
        setDevolucaoModal(prev => ({ ...prev, loading: false, data: d }));
      } else {
        setDevolucaoModal({ isOpen: false, vendaId: 0, modeloOrigem: 55, loading: false, data: null });
        showAlert('Erro', d.message || 'Não foi possível carregar os dados da venda.');
      }
    } catch {
      setDevolucaoModal({ isOpen: false, vendaId: 0, modeloOrigem: 55, loading: false, data: null });
      showAlert('Erro', 'Falha de comunicação.');
    }
  };

  const finNavPreset = React.useRef<string | null>(null);

  const renderTab = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardTab isFiscal={isFiscal} onNavigate={(t: any, opts?: any) => { finNavPreset.current = opts?.preset ?? null; handleSetActiveTab(t); }} />;
      case 'fin_receber': { const _p = finNavPreset.current; finNavPreset.current = null; return <FinanceiroView tipo="R" emitente={emitente} showAlert={showAlert} showConfirm={showConfirm} cobrancaAtiva={cobrancaAtiva} initPreset={_p} />; }
      case 'fin_pagar': { const _p = finNavPreset.current; finNavPreset.current = null; return <FinanceiroView tipo="P" emitente={emitente} showAlert={showAlert} showConfirm={showConfirm} initPreset={_p} />; }
      case 'fin_caixa': return <CaixaView emitente={emitente} showAlert={showAlert} showConfirm={showConfirm} />;
      case 'marketing': return <MarketingModule emitente={emitente} showAlert={showAlert} />;
      case 'vendas_geral': return <GeralNfceTab showAlert={showAlert} showConfirm={showConfirm} showPrompt={showPrompt} onEmailDoc={handleEmailDoc} onDevolucao={handleDevolucao} onCancelar={handleCancelar} onRetryTef={handleRetryTef} onExcluir={handleExcluirVenda} emitente={emitente} setEmailSending={setEmailSendingOverlay} />;
      case 'vendas': return <VendasTab vendas={vendas} onCancelar={handleCancelar} onSincronizar={handleSincronizarContingencia} onRetryTef={handleRetryTef} onExcluir={handleExcluirVenda} onEmailDoc={handleEmailDoc} onDevolucao={handleDevolucao} emitente={emitente} />;
      case 'produtos': return (
        <ProdutosTab
          onEdit={(p) => { setEditingProduto(p); setIsProdutoModalOpen(true); }}
          onDelete={handleExcluirProduto}
          refreshTrigger={produtosRefreshKey}
        />
      );
      case 'clientes': return (
        <ClientesTab
          clientes={clientes}
          onEdit={(c) => { setEditingCliente(c); setIsClienteModalOpen(true); }}
          onDelete={handleExcluirCliente}
        />
      );
      case 'fornecedores': return (
        <FornecedoresTab
          fornecedores={fornecedores}
          onEdit={(f) => { setEditingFornecedor(f); setIsFornecedorModalOpen(true); }}
          onDelete={handleExcluirFornecedor}
        />
      );
      case 'transportadores': return (
        <TransportadoresTab
          transportadores={transportadores}
          onEdit={(t: Transportador) => { setEditingTransportador(t); setIsTransportadorModalOpen(true); }}
          onDelete={handleExcluirTransportador}
        />
      );
      case 'empresa':
      case 'config':
      case 'config_empresa':
      case 'config_email':      return <EmpresaPage emitente={emitente} onUpdate={setEmitente} onSave={handleSalvarEmpresa} onCancel={() => handleSetActiveTab('empresa')} showAlert={showAlert} usuarioDfe={(emitente as any).usuarioDfe ?? session.usuarioDfe} />;
      case 'config_integracao': return <IntegracaoPage emitente={emitente} onUpdate={setEmitente} showAlert={showAlert} />;
      case 'dfe_config':
      case 'dfe_nfce_dados':
      case 'dfe_nfe_dados':
      case 'dfe_provedor':   return <DfeConfigPage emitente={emitente} onUpdate={setEmitente} onSave={handleSalvarEmpresa} onCancel={() => handleSetActiveTab('dfe_config')} showAlert={showAlert} />;
      case 'ncm':       return <NcmTab ufEmpresa={emitente.uf} />;
      case 'usuarios':  return <UsuariosTab session={session} showAlert={showAlert} showConfirm={showConfirm} />;
      case 'vendedores': return <VendedoresTab showAlert={showAlert} showConfirm={showConfirm} />;
      case 'pedidos': return <PedidoTab produtos={produtos} fetchProdutos={fetchProdutos} clientes={clientes} fetchClientes={fetchClientes} vendedores={vendedores} emitente={emitente} showAlert={showAlert} showConfirm={showConfirm} showPrompt={showPrompt} session={session} />;
      case 'comissoes': return <ComissoesTab showAlert={showAlert} showConfirm={showConfirm} />;
      case 'cobranca_config': return <CobrancaConfigTab showAlert={showAlert} />;
      case 'cobranca_boletos': return <CobrancaBoletosTab showAlert={showAlert} showConfirm={showConfirm} />;
      case 'cobranca_historico': return <CobrancaHistoricoTab showAlert={showAlert} />;
      case 'medidas': return (
        <MedidasTab
          medidas={medidas}
          onEdit={(m) => { setEditingMedida(m); setIsMedidaModalOpen(true); }}
          onDelete={handleExcluirMedida}
        />
      );
      case 'bandeiras': return (
        <BandeirasTab
          bandeiras={bandeiras}
          onEdit={(b) => { setEditingBandeira(b); setIsBandeiraModalOpen(true); }}
          onDelete={handleExcluirBandeira}
        />
      );
      case 'dfe_nfe': return (
        <NfeDashboardTab
          nfeList={nfeList}
          emitente={emitente}
          showAlert={showAlert}
          showPrompt={showPrompt}
          onNovaNfe={() => setIsNfeModalOpen(true)}
          onCancelarNfe={handleCancelarNfe}
          onExcluirNfe={handleExcluirNfe}
          onRefresh={fetchNfeList}
          onEmailDoc={handleEmailDoc}
          onDevolucao={handleDevolucao}
          onRetryTef={handleRetryNfeTef}
        />
      );
      case 'dfe_nfe_geral': return <GeralNfeTab showAlert={showAlert} showConfirm={showConfirm} showPrompt={showPrompt} onEmailDoc={handleEmailDoc} onDevolucao={handleDevolucao} emitente={emitente} setEmailSending={setEmailSendingOverlay} />;
      case 'compras': return (
        <ComprasTab
          onImportXml={() => fileInputRef.current?.click()}
          onOpenSefazConsult={() => setIsSefazConsultModalOpen(true)}
          onNewCompra={() => setIsCompraModalOpen(true)}
          onNewManual={() => setIsCompraModalOpen(true)}
          onViewCompra={(id) => showAlert('Em breve', `Visualizar compra ${id}`)}
        />
      );
      case 'reforma_tributaria': return <ReformaTributariaTab showAlert={showAlert} />;
      case 'orcamentos': return (
        <OrcamentosTab
          clientes={clientes}
          fetchClientes={fetchClientes}
          fetchProdutos={fetchProdutos}
          produtos={produtos}
          vendedores={vendedores}
          emitente={emitente}
          showAlert={showAlert}
          showConfirm={showConfirm}
          isFiscal={isFiscal}
          onExportarNFCe={(itens, dest) => {
            setVendaPreload({ itens, destinatario: dest });
            handleSetActiveTab('vendas');
            setIsVendaModalOpen(true);
          }}
        />
      );
      case 'relatorios_tef': return <RelatoriosHub showAlert={showAlert} emitente={emitente} isFiscal={isFiscal} />;
      case 'ordens_servico': return emitente?.otica ? (
        showOticaForm ? (
          <OrdemServicoOticaTab
            clientes={clientes}
            fetchClientes={fetchClientes}
            fetchProdutosOtica={fetchProdutos}
            produtos={produtos}
            vendedores={vendedores}
            emitente={emitente}
            showAlert={showAlert}
            showConfirm={showConfirm}
            onAfterSave={() => { setShowOticaForm(false); fetchProdutos(); }}
          />
        ) : (
        <OrdemServicoTab
          clientes={clientes}
          fetchClientes={fetchClientes}
          fetchProdutos={fetchProdutos}
          produtos={produtos}
          vendedores={vendedores}
          emitente={emitente}
          showAlert={showAlert}
          showConfirm={showConfirm}
          otica={true}
          onNovaOsOtica={() => setShowOticaForm(true)}
        />
        )
      ) : (
        <OrdemServicoTab
          clientes={clientes}
          fetchClientes={fetchClientes}
          fetchProdutos={fetchProdutos}
          produtos={produtos}
          vendedores={vendedores}
          emitente={emitente}
          showAlert={showAlert}
          showConfirm={showConfirm}
        />
      );

    }
  };

  const handleSalvarProduto = async (p: Produto) => {
    try {
      await fetch('./api.php?action=salvar_produto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p)
      });
      fetchProdutos();
      setProdutosRefreshKey(k => k + 1);
      setIsProdutoModalOpen(false);
      setEditingProduto(null);
    } catch (error) {
      console.error("Erro ao salvar produto:", error);
    }
  };

  const handleExcluirProduto = (id: number) => {
    showConfirm("Exclusão", "Deseja excluir este produto permanentemente?", async () => {
      try {
        await fetch(`./api.php?action=excluir_produto&id=${id}`);
        fetchProdutos();
        setProdutosRefreshKey(k => k + 1);
        showAlert("Sucesso", "Produto removido com sucesso.");
      } catch (error) {
        console.error("Erro ao excluir produto:", error);
      }
    });
  };

  const handleSalvarCliente = async (c: Cliente) => {
    try {
      await fetch('./api.php?action=salvar_cliente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(c)
      });
      fetchClientes();
      setIsClienteModalOpen(false);
      setEditingCliente(null);
    } catch (error) {
      console.error("Erro ao salvar cliente:", error);
    }
  };

  const handleExcluirCliente = (id: number) => {
    showConfirm("Inativar Cliente", "Deseja inativar este cliente? O registro será mantido no histórico.", async () => {
      try {
        await fetch(`./api.php?action=excluir_cliente&id=${id}`);
        fetchClientes();
        showAlert("Sucesso", "Cliente inativado com sucesso.");
      } catch (error) {
        console.error("Erro ao inativar cliente:", error);
      }
    });
  };

  const handleSalvarFornecedor = async (f: Fornecedor) => {
    try {
      await fetch('./api.php?action=salvar_fornecedor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(f)
      });
      fetchFornecedores();
      setIsFornecedorModalOpen(false);
      setEditingFornecedor(null);
    } catch (error) {
      console.error("Erro ao salvar fornecedor:", error);
    }
  };

  const handleExcluirFornecedor = (id: number) => {
    showConfirm("Inativar Fornecedor", "Deseja inativar este fornecedor? O registro será mantido no histórico.", async () => {
      try {
        await fetch(`./api.php?action=excluir_fornecedor&id=${id}`);
        fetchFornecedores();
        showAlert("Sucesso", "Fornecedor inativado com sucesso.");
      } catch (error) {
        console.error("Erro ao inativar fornecedor:", error);
      }
    });
  };

  const handleSalvarTransportador = async (t: Transportador) => {
    try {
      await fetch('./api.php?action=salvar_transportador', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(t)
      });
      fetchTransportadores();
      setIsTransportadorModalOpen(false);
      setEditingTransportador(null);
    } catch (error) {
      console.error("Erro ao salvar transportador:", error);
    }
  };

  const handleExcluirTransportador = (id: number) => {
    showConfirm("Inativar Transportador", "Deseja inativar este transportador? O registro será mantido no histórico.", async () => {
      try {
        await fetch(`./api.php?action=excluir_transportador&id=${id}`);
        fetchTransportadores();
        showAlert("Sucesso", "Transportador inativado com sucesso.");
      } catch (error) {
        console.error("Erro ao inativar transportador:", error);
      }
    });
  };

  const handleSalvarMedida = async (m: Medida) => {
    try {
      await fetch('./api.php?action=salvar_medida', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(m)
      });
      fetchMedidas();
      setIsMedidaModalOpen(false);
      setEditingMedida(null);
    } catch (error) {
      console.error("Erro ao salvar medida:", error);
    }
  };

  const handleExcluirMedida = (id: number) => {
    showConfirm("Inativar Medida", "Deseja inativar esta medida? O registro será mantido no histórico.", async () => {
      try {
        await fetch(`./api.php?action=excluir_medida&id=${id}`);
        fetchMedidas();
        showAlert("Sucesso", "Medida inativada com sucesso.");
      } catch (error) {
        console.error("Erro ao inativar medida:", error);
      }
    });
  };

  const handleSalvarBandeira = async (b: Bandeira) => {
    try {
      await fetch('./api.php?action=salvar_bandeira', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(b)
      });
      fetchBandeiras();
      setIsBandeiraModalOpen(false);
      setEditingBandeira(null);
    } catch (error) {
      console.error("Erro ao salvar bandeira:", error);
    }
  };

  const handleExcluirBandeira = (id: number) => {
    showConfirm("Excluir Bandeira", "Deseja excluir esta bandeira permanentemente?", async () => {
      try {
        await fetch(`./api.php?action=excluir_bandeira&id=${id}`);
        fetchBandeiras();
        showAlert("Sucesso", "Bandeira removida com sucesso.");
      } catch (error) {
        console.error("Erro ao excluir bandeira:", error);
      }
    });
  };

  return (
    <>
      <TopProgressBar active={navLoading} />
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#0a0e1a] flex flex-col">
      <div className="flex-1 flex">
        <Sidebar
          activeTab={activeTab}
          handleSetActiveTab={handleSetActiveTab}
          onLogout={onLogout}
          financeiroOpen={financeiroOpen}
          setFinanceiroOpen={setFinanceiroOpen}
          cobrancaAtiva={cobrancaAtiva}
          dfeNfeOpen={dfeNfeOpen}
          setDfeNfeOpen={setDfeNfeOpen}
          dfeNfceOpen={dfeNfceOpen}
          setDfeNfceOpen={setDfeNfceOpen}
          cadastrosOpen={cadastrosOpen}
          setCadastrosOpen={setCadastrosOpen}
          usuarioDfe={usuarioDfeAtual}
          session={session}
        />

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Banner de primeiro acesso */}
        {empresaBloqueada && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-8 py-3 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-sm text-amber-800 font-medium">
              Empresa ainda não configurada. Preencha os dados abaixo para liberar o acesso ao sistema.
            </p>
          </div>
        )}
        <header className="bg-white dark:bg-gray-800 h-16 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-8">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 capitalize">
            {{ dashboard: 'Dashboard', fin_receber: 'Financeiro - Contas à Receber', fin_pagar: 'Financeiro - Contas à Pagar', fin_caixa: 'Financeiro - Movimento de Caixa', vendas: 'DFe - NFCe - Emissão', vendas_geral: 'DFe - NFCe - Geral', produtos: 'Produtos', clientes: 'Clientes', fornecedores: 'Fornecedores', compras: 'Compras', orcamentos: 'Orçamentos', ordens_servico: 'Ordem de Serviços', os_otica: 'OS – Ótica', relatorios_tef: 'Relatórios do Sistema', config: 'Empresa', config_empresa: 'Empresa', config_email: 'Empresa', config_smartpos: 'Empresa', config_integracao: 'Integração', ncm: 'NCM / Tabela IBPT', usuarios: 'Usuários', vendedores: 'Vendedores', marketing: 'Marketing Sazonal', comissoes: 'Comissões', pedidos: 'Pedidos', cobranca_config: 'Cobrança - Configuração', cobranca_boletos: 'Cobrança - Boletos', cobranca_historico: 'Cobrança - Histórico', medidas: 'Medidas', bandeiras: 'Bandeiras de Cartão', dfe_nfe: 'DFe - NFe - Emissão', dfe_nfe_geral: 'DFe - NFe - Geral', dfe_nfce_parametros: 'DFe - NFCe - Parâmetros', dfe_nfe_parametros: 'DFe - NFe - Parâmetros', dfe_nfe_dados: 'DFe Configurações', dfe_nfce_dados: 'DFe Configurações', dfe_provedor: 'DFe Configurações', reforma_tributaria: 'Reforma Tributária', transportadores: 'Transportadores', empresa: 'Empresa', dfe_config: 'DFe Configurações' }[activeTab]}
          </h2>
          <div className="flex items-center gap-4">
            {activeTab === 'dfe_nfe' && (
              <button
                onClick={() => setIsNfeModalOpen(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Nova NF-e
              </button>
            )}
            {activeTab === 'vendas' && (
              <>
                {session.caixaId ? (
                  <button onClick={() => setShowFecharCaixaModal(true)} className="flex items-center gap-2 px-4 py-2 text-sm bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 rounded-lg hover:bg-green-100 transition-colors">
                    <DollarSign className="w-4 h-4" /> Caixa Aberto  —  Fechar
                  </button>
                ) : (
                  <button onClick={() => setShowCaixaModal(true)} className="flex items-center gap-2 px-4 py-2 text-sm bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors">
                    <DollarSign className="w-4 h-4" /> Abrir Caixa
                  </button>
                )}
                <button
                  onClick={() => setIsVendaModalOpen(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Nova Venda
                </button>
    </>
            )}
            {activeTab === 'produtos' && (
              <button 
                onClick={() => { setEditingProduto(null); setIsProdutoModalOpen(true); }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
              >
                <Package className="w-4 h-4" />
                Novo Produto
              </button>
            )}
            {activeTab === 'clientes' && (
              <button
                onClick={() => { setEditingCliente(null); setIsClienteModalOpen(true); }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                Novo Cliente
              </button>
            )}
            {activeTab === 'fornecedores' && (
              <button
                onClick={() => { setEditingFornecedor(null); setIsFornecedorModalOpen(true); }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
              >
                <Building2 className="w-4 h-4" />
                Novo Fornecedor
              </button>
            )}
            {/* Botão Nova Compra removido daqui por duplicidade */}
            {activeTab === 'transportadores' && (
              <button
                onClick={() => { setEditingTransportador(null); setIsTransportadorModalOpen(true); }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
              >
                <Truck className="w-4 h-4" />
                Novo Transportador
              </button>
            )}
            {activeTab === 'medidas' && (
              <button
                onClick={() => { setEditingMedida(null); setIsMedidaModalOpen(true); }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
              >
                <Ruler className="w-4 h-4" />
                Nova Medida
              </button>
            )}
            {activeTab === 'bandeiras' && (
              <button
                onClick={() => { setEditingBandeira(null); setIsBandeiraModalOpen(true); }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
              >
                <CreditCard className="w-4 h-4" />
                Nova Bandeira
              </button>
            )}

            {/* Toggle dark/light mode */}
            <button
              onClick={toggleTheme}
              title={darkMode ? 'Modo claro' : 'Modo escuro'}
              className="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        <div className="p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderTab()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {isVendaModalOpen && (
        <VendaModal
          produtos={produtos}
          emitente={emitente}
          vendedores={vendedores}
          onClose={() => { setIsVendaModalOpen(false); setVendaPreload(null); }}
          onSave={handleNovaVenda}
          proximoNumero={vendas.length > 0 ? Math.max(...vendas.map(v => v.numero)) + 1 : 1}
          showAlert={showAlert}
          showConfirm={showConfirm}
          session={session}
          initialItens={vendaPreload?.itens}
          initialDestinatario={vendaPreload?.destinatario}
        />
      )}

      {isNfeModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[80] p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" /> Nova Nota Fiscal Eletrônica (NF-e)
              </h3>
              <button onClick={() => setIsNfeModalOpen(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors">
                <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <Suspense fallback={<div className="flex items-center justify-center h-40 text-gray-400 dark:text-gray-500 text-sm">Carregando...</div>}>
                <NfeDashboard
                  emitente={emitente}
                  clientes={clientes}
                  fetchClientes={fetchClientes}
                  fetchProdutos={fetchProdutos}
                  produtos={produtos}
                  transportadores={transportadores}
                  medidas={medidas}
                  showAlert={showAlert}
                  showConfirm={showConfirm}
                  showPrompt={showPrompt}
                  onEmitted={(chave, id) => {
                    setIsNfeModalOpen(false);
                    fetchNfeList();
                    window.open(`./api.php?action=nfe_danfe&id=${id}`, '_blank');
                  }}
                />
              </Suspense>
            </div>
          </motion.div>
        </div>
      )}

      {isProdutoModalOpen && (
        <ProdutoModal
          onClose={() => setIsProdutoModalOpen(false)}
          onSave={handleSalvarProduto}
          produto={editingProduto}
          medidas={medidas}
          showAlert={showAlert}
          usuarioDfe={(emitente as any).usuarioDfe ?? session.usuarioDfe}
        />
      )}

      {isClienteModalOpen && (
        <ClienteModal
          onClose={() => setIsClienteModalOpen(false)}
          onSave={handleSalvarCliente}
          cliente={editingCliente}
          showAlert={showAlert}
          emitente={emitente}
        />
      )}

      {isFornecedorModalOpen && (
        <FornecedorModal
          onClose={() => setIsFornecedorModalOpen(false)}
          onSave={handleSalvarFornecedor}
          fornecedor={editingFornecedor}
          showAlert={showAlert}
        />
      )}

      {isTransportadorModalOpen && (
        <TransportadorModal
          onClose={() => { setIsTransportadorModalOpen(false); setEditingTransportador(null); }}
          onSave={handleSalvarTransportador}
          transportador={editingTransportador}
          showAlert={showAlert}
        />
      )}

      {isMedidaModalOpen && (
        <MedidaModal
          onClose={() => { setIsMedidaModalOpen(false); setEditingMedida(null); }}
          onSave={handleSalvarMedida}
          medida={editingMedida}
          showAlert={showAlert}
        />
      )}

      {isBandeiraModalOpen && (
        <BandeiraModal
          onClose={() => { setIsBandeiraModalOpen(false); setEditingBandeira(null); }}
          onSave={handleSalvarBandeira}
          bandeira={editingBandeira}
          showAlert={showAlert}
        />
      )}

      {/* Recuperação de pagamento TEF pendente (após refresh) */}
      {pendingTef && (
        <TefModal
          pagamentoId={pendingTef.pagamentosIds[pendingTef.currentIndex]}
          vendaId={pendingTef.vendaId}
          numero={pendingTef.numero}
          uniqueid={pendingTef.currentIndex === 0 ? pendingTef.uniqueid : undefined}
          pagamentoAtual={pendingTef.currentIndex + 1}
          totalPagamentos={pendingTef.pagamentosIds.length}
          onComplete={async (vendaId) => {
            const nextIndex = pendingTef.currentIndex + 1;
            if (nextIndex < pendingTef.pagamentosIds.length) {
              setPendingTef({ ...pendingTef, currentIndex: nextIndex, uniqueid: '' });
              return;
            }
            setPendingTef(null);
            const resp = await fetch(`./api.php?action=emitir_pendente&id=${vendaId}`);
            const result = await resp.json();
            if (result.success) {
              fetchVendas();
              showConfirm("NFC-e Autorizada!", "Deseja imprimir o DANFE agora?", () => {
                window.open(`./api.php?action=danfe&id=${result.id}`, '_blank');
              });
            } else {
              showAlert("Erro na Emissão", result.message);
            }
          }}
          onCancel={() => setPendingTef(null)}
        />
      )}

      {showCaixaModal && (
        <AbrirCaixaModal
          session={session}
          onClose={() => setShowCaixaModal(false)}
          onAberto={(caixaId) => { setShowCaixaModal(false); onUpdateSession({ ...session, caixaId }); }}
        />
      )}
      {showFecharCaixaModal && session.caixaId && (
        <FecharCaixaModal
          caixaId={session.caixaId}
          showConfirm={showConfirm}
          onClose={() => setShowFecharCaixaModal(false)}
          onLogout={onLogout}
          onFechado={() => { setShowFecharCaixaModal(false); onUpdateSession({ ...session, caixaId: null }); }}
        />
      )}

      {fogosAniversario.length > 0 && <FogosAniversario nomes={fogosAniversario} onClose={() => setFogosAniversario([])} />}
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} onNavigate={handleSetActiveTab} isFiscal={isFiscal} />

      {/* Global Alert/Confirm Modal */}
      {globalModal.isOpen && (
      <GlobalMessageModal
          {...globalModal}
          onClose={closeGlobalModal}
          onConfirm={(val) => {
            if (globalModal.onConfirm) globalModal.onConfirm(val);
            closeGlobalModal();
          }}
        />
      )}

      {/* Modal de Devolução */}
      {devolucaoModal.isOpen && (
        <DevolucaoModal
          loading={devolucaoModal.loading}
          data={devolucaoModal.data}
          vendaId={devolucaoModal.vendaId}
          modeloOrigem={devolucaoModal.modeloOrigem}
          onClose={() => setDevolucaoModal({ isOpen: false, vendaId: 0, modeloOrigem: 55, loading: false, data: null })}
          onSuccess={(id: number) => {
            setDevolucaoModal({ isOpen: false, vendaId: 0, modeloOrigem: 55, loading: false, data: null });
            showAlert('Devolução Emitida', 'NF-e de devolução emitida com sucesso!');
            fetchNfeList();
            window.open(`./api.php?action=nfe_danfe&id=${id}`, '_blank');
          }}
          showAlert={showAlert}
        />
      )}

      {isImportXmlModalOpen && importingXmlData && (
        <ImportXmlModal
          xmlData={importingXmlData}
          onClose={() => { setIsImportXmlModalOpen(false); setImportingXmlData(null); }}
          onConfirm={() => { setIsImportXmlModalOpen(false); setImportingXmlData(null); }}
          produtos={produtos}
          fetchProdutos={fetchProdutos}
          showAlert={showAlert}
          showConfirm={showConfirm}
          onEditProduto={(p) => { setEditingProduto(p); setIsProdutoModalOpen(true); }}
        />
      )}

      {isCompraModalOpen && (
        <CompraModal
          onClose={() => setIsCompraModalOpen(false)}
          fornecedores={fornecedores}
          produtos={produtos}
          showAlert={showAlert}
          showConfirm={showConfirm}
          onSave={async (data) => {
            try {
              const res = await fetch('./api.php?action=salvar_compra', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
              });
              const result = await res.json();
              if (result.success) {
                showAlert('Sucesso', 'Entrada de nota realizada com sucesso!');
                setIsCompraModalOpen(false);
                // Força atualização da lista de compras se a aba estiver ativa
                if (activeTab === 'compras') handleSetActiveTab('compras'); 
              } else {
                showAlert('Erro', result.message);
              }
            } catch {
              showAlert('Erro', 'Falha ao conectar com o servidor.');
            }
          }}
        />
      )}

      {isSefazConsultModalOpen && (
        <SefazConsultModal
          onClose={() => setIsSefazConsultModalOpen(false)}
          onImportXml={(data) => {
            setImportingXmlData(data);
            setIsImportXmlModalOpen(true);
            setIsSefazConsultModalOpen(false);
          }}
          showAlert={showAlert}
          emitente={emitente}
          onUpdateEmitente={setEmitente}
        />
      )}

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImportXmlFile} 
        accept=".xml" 
        style={{ display: 'none' }} 
      />
      </div>
    </div>
      {emailSendingOverlay && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-2xl px-10 py-8 flex flex-col items-center gap-4 shadow-2xl">
            <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-base font-semibold text-gray-700 dark:text-gray-200">Enviando e-mail...</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">Por favor aguarde</p>
          </div>
        </div>
      )}
      <InstallPrompt />
    </>
  );
};

// â€ â‚¬â€ â‚¬â€ â‚¬ Modal de Devolução â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬
const AppShellWithProvider: React.FC<{ session: Session; onLogout: () => void; onUpdateSession: (s: Session) => void }> = (props) => (
  <AppDataProvider>
    <AppShell {...props} />
  </AppDataProvider>
);
export default AppShellWithProvider;



