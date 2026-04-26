import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';
import { ComprasTab, ImportXmlModal, CompraModal } from './ComprasModule';
import { OrdemServicoTab } from './OrdemServicoModule';
import { RelatoriosHub } from './RelatorioTefModule';
import { StatCard, Input } from './UIComponents';
import { FinanceiroView, CaixaView, BaixaModal, ParcelamentoModal } from './FinanceiroModule';
import { Sidebar } from './SidebarModule';
import { 
  ProdutoModal, ClienteModal, FornecedorModal, TransportadorModal, MedidaModal, BandeiraModal,
  ProdutosTab, ClientesTab, FornecedoresTab, TransportadoresTab, BandeirasTab, MedidasTab, NcmTab
} from './CadastrosModule';
import { VendasTab, GeralNfceTab, GeralNfeTab, NfeDashboardTab } from './FiscalModule';
import { VendaModal, IdentificarModal, TefModal, GlobalMessageModal } from './VendaModule';
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

const NfceDashboard: React.FC<{ session: Session; onLogout: () => void; onUpdateSession: (s: Session) => void }> = ({ session, onLogout, onUpdateSession }) => {

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('dfe_dark_mode') === 'true';
  });

  useEffect(() => {
    const html = document.documentElement;
    if (darkMode) {
      html.classList.add('dark');
      localStorage.setItem('dfe_dark_mode', 'true');
    } else {
      html.classList.remove('dark');
      localStorage.setItem('dfe_dark_mode', 'false');
    }
  }, [darkMode]);

  const isFiscal = Number(session.usuarioDfe) !== 0 && Number(session.usuarioDfe) !== 4;

// Se empresa não está configurada, força aba de configurações e bloqueia as demais
const [activeTab, setActiveTab] = useState<'dashboard' | 'vendas' | 'vendas_geral' | 'produtos' | 'clientes' | 'fornecedores' | 'compras' | 'orcamentos' | 'transportadores' | 'config' | 'ncm' | 'usuarios' | 'medidas' | 'bandeiras' | 'dfe_nfe' | 'dfe_nfe_geral' | 'dfe_nfe_parametros' | 'dfe_nfce_parametros' | 'reforma_tributaria' | 'config_empresa' | 'config_email' | 'config_smartpos' | 'config_integracao' | 'dfe_nfe_dados' | 'dfe_nfce_dados' | 'dfe_provedor' | 'empresa' | 'dfe_config' | 'fin_receber' | 'fin_pagar' | 'fin_caixa' | 'relatorios_tef'>(
  session.empresaConfigurada ? 'dashboard' : 'empresa'
);
const empresaBloqueada = !session.empresaConfigurada;
const CONFIG_TABS = ['config', 'config_empresa', 'config_email', 'config_smartpos', 'config_integracao', 'dfe_nfe_dados', 'dfe_nfce_dados', 'dfe_provedor', 'empresa', 'dfe_config'];
const [prevTab, setPrevTab] = useState<typeof activeTab>(session.empresaConfigurada ? 'dashboard' : 'empresa');

const handleSetActiveTab = (tab: typeof activeTab) => {
  if (empresaBloqueada && !CONFIG_TABS.includes(tab)) return;
  setPrevTab(activeTab);
  setActiveTab(tab);
};
  const [cadastrosOpen, setCadastrosOpen] = useState(false);
  const [dfeNfceOpen, setDfeNfceOpen] = useState(true);
  const [dfeNfeOpen, setDfeNfeOpen] = useState(true);
  const [configEmpresaOpen, setConfigEmpresaOpen] = useState(false);
  const [configDfeOpen, setConfigDfeOpen] = useState(false);
  const [financeiroOpen, setFinanceiroOpen] = useState(false);
  const [showCaixaModal, setShowCaixaModal] = useState(false);
  const [showFecharCaixaModal, setShowFecharCaixaModal] = useState(false);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [transportadores, setTransportadores] = useState<Transportador[]>([]);
  const [isProdutoModalOpen, setIsProdutoModalOpen] = useState(false);
  const [isClienteModalOpen, setIsClienteModalOpen] = useState(false);
  const [isFornecedorModalOpen, setIsFornecedorModalOpen] = useState(false);
  const [isTransportadorModalOpen, setIsTransportadorModalOpen] = useState(false);
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [editingFornecedor, setEditingFornecedor] = useState<Fornecedor | null>(null);
  const [editingTransportador, setEditingTransportador] = useState<Transportador | null>(null);
  const [medidas, setMedidas] = useState<Medida[]>([]);
  const [isMedidaModalOpen, setIsMedidaModalOpen] = useState(false);
  const [editingMedida, setEditingMedida] = useState<Medida | null>(null);
  const [bandeiras, setBandeiras] = useState<Bandeira[]>([]);
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

  const showAlert = (title: string, message: string) => setGlobalModal({ isOpen: true, type: 'alert', title, message });
  const showConfirm = (title: string, message: string, onConfirm: () => void) => setGlobalModal({ isOpen: true, type: 'confirm', title, message, onConfirm });
  const showPrompt = (title: string, message: string, onConfirm: (val: string) => void, initialValue = '') => setGlobalModal({ isOpen: true, type: 'prompt', title, message, inputValue: initialValue, onConfirm });
  const closeGlobalModal = () => setGlobalModal(prev => ({ ...prev, isOpen: false }));
  
  const fetchProdutos = async () => {
    try {
      const response = await fetch('./api.php?action=produtos');
      const data = await response.json();
      if (Array.isArray(data)) {
        setProdutos(data.map((p: any) => ({
          ...p,
          id: Number(p.id),
          valorUnitario: Number(p.valor_unitario),
          codigoInterno: p.codigo_interno,
          codigoBarras: p.codigo_barras || '',
          unidadeComercial: p.unidade_comercial,
          icmsAliquota: Number(p.icms_aliquota ?? 0),
          custoCopra: Number(p.custo_compra ?? 0),
          simplesNacional: Number(p.simples_nacional ?? 0),
          despesasOperacionais: Number(p.despesas_operacionais ?? 0),
          freteSeguro: Number(p.frete_seguro ?? 0),
          margemLucro: Number(p.margem_lucro ?? 0),
          estoque: Number(p.estoque ?? 0),
          cbsCst: p.cbs_cst ?? '',
          cbsClasstrib: p.cbs_classtrib ?? '',
          ibsCst: p.ibs_cst ?? '',
          ibsClasstrib: p.ibs_classtrib ?? '',
          cCredPres: p.ccredpres ?? '',
          icmsCstCsosn: p.icms_cst_csosn ?? '102',
          codigoFornecedor: p.codigo_fornecedor ?? ''
        })));
      }
    } catch (error) {
      console.error("Erro ao buscar produtos:", error);
    }
  };

  const fetchClientes = async () => {
    try {
      const response = await fetch('./api.php?action=clientes');
      const data = await response.json();
      if (Array.isArray(data)) {
        setClientes(data.map((c: any) => ({
          ...c,
          id: Number(c.id),
          regimeTributario: c.regime_tributario || '1',
          entidadeGovernamental: c.entidade_governamental || '0',
          ie: c.ie || '',
          indIEDest: c.indIEDest || c.indiedest || '9',
          endereco: {
            logradouro: c.logradouro,
            numero: c.numero,
            complemento: c.complemento,
            bairro: c.bairro,
            municipio: c.municipio,
            codigoMunicipio: c.codigo_municipio,
            uf: c.uf,
            cep: c.cep
          }
        })));
      }
    } catch (error) {
      console.error("Erro ao buscar clientes:", error);
    }
  };

  const fetchFornecedores = async () => {
    try {
      const response = await fetch('./api.php?action=fornecedores');
      const data = await response.json();
      if (Array.isArray(data)) {
        setFornecedores(data.map((f: any) => ({
          ...f,
          id: Number(f.id),
          endereco: {
            logradouro: f.logradouro,
            numero: f.numero,
            complemento: f.complemento,
            bairro: f.bairro,
            municipio: f.municipio,
            codigoMunicipio: f.codigo_municipio,
            uf: f.uf,
            cep: f.cep
          }
        })));
      }
    } catch (error) {
      console.error("Erro ao buscar fornecedores:", error);
    }
  };

  const fetchTransportadores = async () => {
    try {
      const response = await fetch('./api.php?action=transportadores');
      const data = await response.json();
      if (Array.isArray(data)) {
        setTransportadores(data.map((t: any) => ({
          ...t,
          id: Number(t.id),
          endereco: {
            logradouro: t.logradouro,
            numero: t.numero,
            complemento: t.complemento,
            bairro: t.bairro,
            municipio: t.municipio,
            codigoMunicipio: t.codigo_municipio,
            uf: t.uf,
            cep: t.cep
          }
        })));
      }
    } catch (error) {
      console.error("Erro ao buscar transportadores:", error);
    }
  };

  const fetchMedidas = async () => {
    try {
      const response = await fetch('./api.php?action=medidas');
      const data = await response.json();
      if (Array.isArray(data)) {
        setMedidas(data.map((m: any) => ({
          ...m,
          id: Number(m.id),
          fator: Number(m.fator),
          pesavel: Number(m.pesavel) === 1
        })));
      }
    } catch (error) {
      console.error("Erro ao buscar medidas:", error);
    }
  };

  const fetchBandeiras = async () => {
    try {
      const response = await fetch('./api.php?action=bandeiras');
      const data = await response.json();
      if (Array.isArray(data)) {
        setBandeiras(data.map((b: any) => ({ ...b, id: Number(b.id) })));
      }
    } catch (error) {
      console.error("Erro ao buscar bandeiras:", error);
    }
  };

  const fetchEmpresa = async () => {
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
          emissaoContingencia: Number(data.emissao_contingencia) === 1,
          contingenciaAutomatica: Number(data.contingencia_automatica) !== 0,
          tef_required_states: data.tef_required_states || '',
          ultimoNsu: data.ultimo_nsu || '0',
          dataUltimaConsultaDfe: data.data_ultima_consulta_dfe || ''
        }));
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
    } catch (error) {
      console.error("Erro ao buscar NF-e:", error);
    }
  };

  // Estado para recuperar pagamento TEF pendente após reload
  type PendingTef = { pagamentosIds: number[]; currentIndex: number; uniqueid: string; vendaId: number; numero: number } | null;
  const [pendingTef, setPendingTef] = useState<PendingTef>(null);

  useEffect(() => {
    fetchVendas();
    fetchNfeList();
    fetchProdutos();
    fetchClientes();
    fetchFornecedores();
    fetchTransportadores();
    fetchMedidas();
    fetchBandeiras();
    fetchEmpresa();
    // Verifica se existe pagamento TEF pendente (evita duplicidade por refresh)
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
      showAlert("Enviando", "Aguarde, enviando e-mail...");
      try {
        const action = isNfe ? 'nfe_enviar_email_doc' : 'enviar_email_doc';
        const res = await fetch(`./api.php?action=${action}&id=${id}&email=${encodeURIComponent(email.trim())}`, { method: 'POST' });
        const d = await res.json();
        if(d.success) showAlert("Sucesso", "E-mail enviado com sucesso!");
        else showAlert("Erro", d.message || "Não foi possível enviar o e-mail");
      } catch (e) {
        showAlert("Erro", "Falha de comunicação.");
      }
    }, emailSugerido);
  };

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

  const renderTab = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardTab isFiscal={isFiscal} />;
      case 'fin_receber': return <FinanceiroView tipo="R" emitente={emitente} showAlert={showAlert} showConfirm={showConfirm} />;
      case 'fin_pagar': return <FinanceiroView tipo="P" emitente={emitente} showAlert={showAlert} showConfirm={showConfirm} />;
      case 'fin_caixa': return <CaixaView emitente={emitente} showAlert={showAlert} showConfirm={showConfirm} />;
      case 'vendas_geral': return <GeralNfceTab showAlert={showAlert} showConfirm={showConfirm} showPrompt={showPrompt} onEmailDoc={handleEmailDoc} onDevolucao={handleDevolucao} onCancelar={handleCancelar} onRetryTef={handleRetryTef} onExcluir={handleExcluirVenda} emitente={emitente} />;
      case 'vendas': return <VendasTab vendas={vendas} onCancelar={handleCancelar} onSincronizar={handleSincronizarContingencia} onRetryTef={handleRetryTef} onExcluir={handleExcluirVenda} onEmailDoc={handleEmailDoc} onDevolucao={handleDevolucao} />;
      case 'produtos': return (
        <ProdutosTab 
          produtos={produtos} 
          onEdit={(p) => { setEditingProduto(p); setIsProdutoModalOpen(true); }} 
          onDelete={handleExcluirProduto}
          onRefresh={fetchProdutos}
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
      case 'config_email':      return <EmpresaPage emitente={emitente} onUpdate={setEmitente} onSave={handleSalvarEmpresa} onCancel={() => handleSetActiveTab('empresa')} showAlert={showAlert} usuarioDfe={session.usuarioDfe} />;
      case 'config_integracao': return <IntegracaoPage emitente={emitente} onUpdate={setEmitente} showAlert={showAlert} />;
      case 'dfe_config':
      case 'dfe_nfce_dados':
      case 'dfe_nfe_dados':
      case 'dfe_provedor':   return <DfeConfigPage emitente={emitente} onUpdate={setEmitente} onSave={handleSalvarEmpresa} onCancel={() => handleSetActiveTab('dfe_config')} showAlert={showAlert} />;
      case 'ncm':       return <NcmTab ufEmpresa={emitente.uf} />;
      case 'usuarios':  return <UsuariosTab session={session} showAlert={showAlert} showConfirm={showConfirm} />;
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
      case 'dfe_nfe_geral': return <GeralNfeTab showAlert={showAlert} showConfirm={showConfirm} showPrompt={showPrompt} onEmailDoc={handleEmailDoc} onDevolucao={handleDevolucao} emitente={emitente} />;
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
          produtos={produtos}
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
      case 'relatorios_tef': return <RelatoriosHub showAlert={showAlert} emitente={emitente} />;
      case 'ordens_servico': return (
        <OrdemServicoTab
          clientes={clientes}
          produtos={produtos}
          emitente={emitente}
          showAlert={showAlert}
          showConfirm={showConfirm}
          onAfterSave={fetchProdutos}
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
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
      <div className="flex-1 flex">
        <Sidebar
          activeTab={activeTab}
          handleSetActiveTab={handleSetActiveTab}
          onLogout={onLogout}
          financeiroOpen={financeiroOpen}
          setFinanceiroOpen={setFinanceiroOpen}
          dfeNfeOpen={dfeNfeOpen}
          setDfeNfeOpen={setDfeNfeOpen}
          dfeNfceOpen={dfeNfceOpen}
          setDfeNfceOpen={setDfeNfceOpen}
          cadastrosOpen={cadastrosOpen}
          setCadastrosOpen={setCadastrosOpen}
          usuarioDfe={session.usuarioDfe}
        />

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Banner de primeiro acesso */}
        {empresaBloqueada && (
          <div className="bg-amber-50 border-b border-amber-200 px-8 py-3 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800 font-medium">
              Empresa ainda não configurada. Preencha os dados abaixo para liberar o acesso ao sistema.
            </p>
          </div>
        )}
        <header className="bg-white h-16 border-b border-gray-200 flex items-center justify-between px-8">
          <h2 className="text-lg font-semibold text-gray-800 capitalize">
            {{ dashboard: 'Dashboard', fin_receber: 'Financeiro - Contas à Receber', fin_pagar: 'Financeiro - Contas à Pagar', fin_caixa: 'Financeiro - Movimento de Caixa', vendas: 'DFe - NFCe - Emissão', vendas_geral: 'DFe - NFCe - Geral', produtos: 'Produtos', clientes: 'Clientes', fornecedores: 'Fornecedores', compras: 'Compras', orcamentos: 'Orçamentos', ordens_servico: 'Ordem de Serviços', relatorios_tef: 'Relatórios do Sistema', config: 'Empresa', config_empresa: 'Empresa', config_email: 'Empresa', config_smartpos: 'Empresa', config_integracao: 'Integração', ncm: 'NCM / Tabela IBPT', usuarios: 'Usuários', medidas: 'Medidas', bandeiras: 'Bandeiras de Cartão', dfe_nfe: 'DFe - NFe - Emissão', dfe_nfe_geral: 'DFe - NFe - Geral', dfe_nfce_parametros: 'DFe - NFCe - Parâmetros', dfe_nfe_parametros: 'DFe - NFe - Parâmetros', dfe_nfe_dados: 'DFe Configurações', dfe_nfce_dados: 'DFe Configurações', dfe_provedor: 'DFe Configurações', reforma_tributaria: 'Reforma Tributária', transportadores: 'Transportadores', empresa: 'Empresa', dfe_config: 'DFe Configurações' }[activeTab]}
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
                  <button onClick={() => setShowFecharCaixaModal(true)} className="flex items-center gap-2 px-4 py-2 text-sm bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors">
                    <DollarSign className="w-4 h-4" /> Caixa Aberto  —  Fechar
                  </button>
                ) : (
                  <button onClick={() => setShowCaixaModal(true)} className="flex items-center gap-2 px-4 py-2 text-sm bg-orange-50 text-orange-600 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors">
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
                <Plus className="w-4 h-4" />
                Novo Produto
              </button>
            )}
            {activeTab === 'clientes' && (
              <button
                onClick={() => { setEditingCliente(null); setIsClienteModalOpen(true); }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Novo Cliente
              </button>
            )}
            {activeTab === 'fornecedores' && (
              <button
                onClick={() => { setEditingFornecedor(null); setIsFornecedorModalOpen(true); }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Novo Fornecedor
              </button>
            )}
            {/* Botão Nova Compra removido daqui por duplicidade */}
            {activeTab === 'transportadores' && (
              <button
                onClick={() => { setEditingTransportador(null); setIsTransportadorModalOpen(true); }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Novo Transportador
              </button>
            )}
            {activeTab === 'medidas' && (
              <button
                onClick={() => { setEditingMedida(null); setIsMedidaModalOpen(true); }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Nova Medida
              </button>
            )}
            {activeTab === 'bandeiras' && (
              <button
                onClick={() => { setEditingBandeira(null); setIsBandeiraModalOpen(true); }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Nova Bandeira
              </button>
            )}

            {/* Toggle dark/light mode */}
            <button
              onClick={() => setDarkMode(d => !d)}
              title={darkMode ? 'Modo claro' : 'Modo escuro'}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
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
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <FileText className="w-6 h-6 text-blue-600" /> Nova Nota Fiscal Eletrônica (NF-e)
              </h3>
              <button onClick={() => setIsNfeModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <Suspense fallback={<div className="flex items-center justify-center h-40 text-gray-400 text-sm">Carregando...</div>}>
                <NfeDashboard
                  emitente={emitente}
                  clientes={clientes}
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
          usuarioDfe={session.usuarioDfe}
        />
      )}

      {isClienteModalOpen && (
        <ClienteModal
          onClose={() => setIsClienteModalOpen(false)}
          onSave={handleSalvarCliente}
          cliente={editingCliente}
          showAlert={showAlert}
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
          onFechado={() => { setShowFecharCaixaModal(false); onUpdateSession({ ...session, caixaId: null }); }}
        />
      )}

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
  );
};

// â€ â‚¬â€ â‚¬â€ â‚¬ Modal de Devolução â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬
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
        <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-gray-600 font-medium">Carregando dados da venda...</p>
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
          className="bg-white rounded-2xl w-full max-w-md shadow-2xl"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-yellow-100 flex items-center justify-center">
                <CornerUpLeft className="w-5 h-5 text-yellow-700" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">Devolução de Venda</h2>
                <p className="text-xs text-gray-500">NFC-e nº {venda.numero}/{venda.serie}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-gray-700 font-medium text-center">Como deseja identificar o destinatário desta devolução?</p>
            <p className="text-sm text-gray-500 text-center">A NFC-e original foi emitida a consumidor não identificado. Escolha como proceder:</p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setTipoDestinatario('empresa')}
                className="flex flex-col items-center gap-2 p-4 border-2 border-gray-200 rounded-xl hover:border-yellow-400 hover:bg-yellow-50 transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center group-hover:bg-yellow-200 transition-colors">
                  <Building2 className="w-5 h-5 text-yellow-700" />
                </div>
                <span className="font-semibold text-gray-800 text-sm">Própria Empresa</span>
                <span className="text-xs text-gray-500 text-center">Emitir contra o CNPJ da sua empresa</span>
              </button>
              <button
                onClick={() => setTipoDestinatario('identificar')}
                className="flex flex-col items-center gap-2 p-4 border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <UserCheck className="w-5 h-5 text-blue-700" />
                </div>
                <span className="font-semibold text-gray-800 text-sm">Identificar Cliente</span>
                <span className="text-xs text-gray-500 text-center">Informar dados do cliente para a nota</span>
              </button>
            </div>
          </div>
          <div className="px-6 py-4 border-t border-gray-100">
            <button onClick={onClose} className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors">
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
        className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-yellow-100 flex items-center justify-center">
              <CornerUpLeft className="w-5 h-5 text-yellow-700" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">Devolução de Venda</h2>
              <p className="text-xs text-gray-500">
                {modeloOrigem === 65 ? 'NFC-e' : 'NF-e'} nº {venda.numero}/{venda.serie}  —  Gerará NF-e de Entrada (finalidade 4)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {modeloOrigem === 65 && (
              <button
                onClick={() => setTipoDestinatario(null)}
                className="text-xs text-blue-600 hover:underline px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
              >
                ‹ Voltar
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Destinatário: identificar cliente manually */}
          {modeloOrigem === 65 && tipoDestinatario === 'identificar' && (
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 space-y-3">
              <p className="text-xs font-semibold text-blue-600 uppercase mb-1">Dados do Cliente</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 mb-1 block">Nome / Razão Social *</label>
                  <input value={clienteManual.nome} onChange={e => setClienteManual(p => ({ ...p, nome: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    placeholder="Nome completo ou razão social" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">CPF / CNPJ</label>
                  <input value={clienteManual.documento} onChange={e => setClienteManual(p => ({ ...p, documento: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    placeholder="000.000.000-00" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">CEP</label>
                  <input value={clienteManual.cep} onChange={e => setClienteManual(p => ({ ...p, cep: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    placeholder="00000-000" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 mb-1 block">Logradouro</label>
                  <input value={clienteManual.logradouro} onChange={e => setClienteManual(p => ({ ...p, logradouro: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    placeholder="Rua, Av., etc." />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Número</label>
                  <input value={clienteManual.numero} onChange={e => setClienteManual(p => ({ ...p, numero: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    placeholder="SN" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Bairro</label>
                  <input value={clienteManual.bairro} onChange={e => setClienteManual(p => ({ ...p, bairro: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    placeholder="Bairro" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">UF *</label>
                  <select value={clienteManual.uf} onChange={e => { const uf = e.target.value; setClienteManual(p => ({ ...p, uf, municipio: '', codigoMunicipio: '' })); fetchMunicipios(uf); }}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                    <option value="">Selecione</option>
                    {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Município *</label>
                  <select value={clienteManual.codigoMunicipio} onChange={e => { const opt = municipiosList.find(m => String(m.id) === e.target.value); setClienteManual(p => ({ ...p, codigoMunicipio: e.target.value, municipio: opt?.nome || '' })); }}
                    disabled={!clienteManual.uf || loadingMunicipios}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:opacity-50">
                    <option value="">{loadingMunicipios ? 'Carregando...' : 'Selecione a UF primeiro'}</option>
                    {municipiosList.map(m => <option key={m.id} value={String(m.id)}>{m.nome}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Destinatário: empresa or NF-e 55 client */}
          {(modeloOrigem !== 65 || tipoDestinatario === 'empresa') && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                {tipoDestinatario === 'empresa' ? 'Destinatário  —  Própria Empresa' : 'Destinatário  —  Cliente'}
              </p>
              <p className="font-semibold text-gray-800">{destinatario.nome}</p>
              <p className="text-sm text-gray-600">{destinatario.documento}{destinatario.ie ? `  —  IE: ${destinatario.ie}` : ''}</p>
              {destinatario.endereco.logradouro && (
                <p className="text-sm text-gray-500">{destinatario.endereco.logradouro}, {destinatario.endereco.numero}  —  {destinatario.endereco.municipio}/{destinatario.endereco.uf}</p>
              )}
            </div>
          )}

          {/* Informações Adicionais (NFC-e 65 / empresa path) */}
          {modeloOrigem === 65 && tipoDestinatario === 'empresa' && (
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Informações Adicionais</label>
              <textarea
                value={informacoesAdicionais}
                onChange={e => setInformacoesAdicionais(e.target.value)}
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              />
            </div>
          )}

          {/* Itens */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Itens da Devolução</p>
            <div className="space-y-2">
              {itens.map((it, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm truncate">{it.descricao}</p>
                    <p className="text-xs text-gray-400">CFOP {it.cfop}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex flex-col items-end">
                      <span className="text-xs text-gray-400">Qtd</span>
                      <input
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={it.quantidade}
                        onChange={e => {
                          const q = parseFloat(e.target.value) || 0;
                          setItens(prev => prev.map((x, i) => i === idx ? { ...x, quantidade: q, valorTotal: parseFloat((q * x.valorUnitario).toFixed(2)) } : x));
                        }}
                        className="w-20 text-right px-2 py-1 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-xs text-gray-400">Unit.</span>
                      <span className="text-sm font-medium text-gray-700 w-24 text-right">{it.valorUnitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-xs text-gray-400">Total</span>
                      <span className="text-sm font-semibold text-blue-600 w-24 text-right">{it.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                    <button onClick={() => setEditingItemIdx(idx)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-400 hover:text-blue-600 transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setItens(prev => prev.filter((_, i) => i !== idx))} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="flex justify-end">
            <div className="bg-blue-50 rounded-xl px-5 py-3 text-right">
              <p className="text-xs text-blue-500 font-semibold uppercase">Total da Devolução</p>
              <p className="text-xl font-bold text-blue-700">{totalValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-800 text-xs mt-4">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>
              Será emitida uma <strong>NF-e de Entrada (tpNF=0)</strong> com finalidade <strong>Devolução (finNFe=4)</strong> referenciando a {modeloOrigem === 65 ? 'NFC-e' : 'NF-e'} original. O estoque dos produtos será <strong>devolvido</strong>.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
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
              <motion.div initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2"><Edit2 className="w-5 h-5" /> Ajuste Fiscal do Item</h3>
                    <p className="text-blue-100 text-sm mt-0.5">{it.descricao}</p>
                  </div>
                  <button onClick={() => setEditingItemIdx(null)} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                </div>
                <div className="px-6 pt-4">
                  <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
                    {(['PRODUTO','ICMS','IPI','PIS','COFINS'] as const).map(tab => (
                      <button key={tab} onClick={() => setDevolTab(tab)}
                        className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all ${devolTab === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
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
                          <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block">{f.label}</label>
                          <input type="text" value={it[f.field] ?? ''} maxLength={f.max}
                            onChange={e => upd(f.field, e.target.value)}
                            className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-xl px-4 py-3 text-sm font-medium text-gray-700 outline-none transition-all"
                            placeholder={f.ph} />
                        </div>
                      ))}
                      <div className="col-span-2 space-y-1.5">
                        <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block">Origem da Mercadoria</label>
                        <select value={it.origemMercadoria ?? '0'} onChange={e => upd('origemMercadoria', e.target.value)}
                          className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-xl px-4 py-3 text-sm font-medium text-gray-700 outline-none transition-all">
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
                          <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block">Base de Cálculo</label>
                          <input type="number" step="0.01" value={it[bc] ?? 0}
                            onChange={e => { const v = parseFloat(e.target.value)||0; upd(bc, v); upd(val, parseFloat((v * ((it[aliq]||0)/100)).toFixed(2))); }}
                            className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-xl px-4 py-3.5 text-gray-700 font-semibold outline-none transition-all" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block">Alíquota (%)</label>
                          <input type="number" step="0.01" value={it[aliq] ?? 0}
                            onChange={e => { const v = parseFloat(e.target.value)||0; upd(aliq, v); upd(val, parseFloat(((it[bc]||0) * (v/100)).toFixed(2))); }}
                            className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-xl px-4 py-3.5 text-blue-600 font-semibold outline-none transition-all text-center" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block">Valor do Imposto</label>
                          <input type="number" step="0.01" value={it[val] ?? 0}
                            onChange={e => upd(val, parseFloat(e.target.value)||0)}
                            className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-xl px-4 py-3.5 text-gray-700 font-semibold outline-none transition-all" />
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <div className="px-6 py-4 border-t border-gray-100">
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
const AbrirCaixaModal = ({ session, onClose, onAberto }: { session: Session; onClose: () => void; onAberto: (caixaId: number) => void }) => {
  const [troco, setTroco]     = useState('0,00');
  const [loading, setLoading] = useState(false);
  const [erro, setErro]       = useState('');

  const handleAbrir = async () => {
    setLoading(true); setErro('');
    const trocoVal = parseFloat(troco.replace(',', '.')) || 0;
    try {
      const res = await fetch('./api.php?action=abrir_caixa', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuarioId: session.usuarioId, nomeUsuario: session.nome, trocoInicial: trocoVal }),
      });
      const data = await res.json();
      if (data.success) onAberto(data.caixaId);
      else setErro(data.message || 'Erro ao abrir caixa.');
    } catch { setErro('Erro de comunicação.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center"><DollarSign className="w-5 h-5 text-green-600" /></div>
          <div><h3 className="font-semibold text-gray-800">Abrir Caixa</h3><p className="text-xs text-gray-500">{session.nome}</p></div>
        </div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Troco Inicial (R$)</label>
        <input type="text" value={troco} onChange={e => setTroco(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 mb-4" />
        <FormAlert message={erro} theme="light" />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
          <button onClick={handleAbrir} disabled={loading} className="flex-1 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
            {loading ? 'Abrindo...' : 'Abrir Caixa'}
          </button>
        </div>
      </div>
    </div>
  );
};

// â€ â‚¬â€ â‚¬ Fechar Caixa â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬
const FecharCaixaModal = ({ caixaId, showConfirm, onClose, onFechado }: { caixaId: number; showConfirm: any; onClose: () => void; onFechado: () => void }) => {
  const [relatorio, setRelatorio] = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [fechando, setFechando]   = useState(false);

  const formaLabel: Record<string, string> = {
    '01': 'Dinheiro', '02': 'Cheque', '03': 'Cartão Crédito', '04': 'Cartão Débito',
    '05': 'Crédito Loja', '10': 'Vale Alimentação', '11': 'Vale Refeição',
    '12': 'Vale Presente', '13': 'Vale Combustível', '15': 'Boleto', '17': 'PIX', '90': 'Sem Pagamento', '99': 'Outros',
  };

  useEffect(() => {
    fetch(`./api.php?action=relatorio_caixa&caixaId=${caixaId}`)
      .then(r => r.json()).then(setRelatorio).finally(() => setLoading(false));
  }, [caixaId]);

    const handleFechar = async () => {
    setFechando(true);
    try {
      const res = await fetch('./api.php?action=fechar_caixa', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caixaId }),
      });
      const data = await res.json();
      
      if (data.success) {
        window.open(`relatorio_caixa.php?caixaId=${caixaId}&print=1`, '_blank', 'noopener,noreferrer');
      }
      onFechado();
    } catch (e) {
      console.error(e);
      onFechado();
    }
  };

  const totalVendas = relatorio?.vendas?.filter((v: any) => ['Autorizada','Contingencia'].includes(v.status)).reduce((a: number, v: any) => a + parseFloat(v.valor_total), 0) ?? 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2"><DollarSign className="w-5 h-5 text-green-600" /> Fechar Caixa</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="p-5 max-h-[60vh] overflow-auto">
          {loading ? <p className="text-center text-gray-400 py-8">Carregando relatório...</p> : (
            <div className="space-y-4">
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <p className="text-xs text-green-600 font-medium uppercase">Total de Vendas</p>
                <p className="text-3xl font-bold text-green-700">{totalVendas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                <p className="text-xs text-green-600">{relatorio?.vendas?.filter((v: any) => ['Autorizada','Contingencia'].includes(v.status)).length ?? 0} vendas autorizadas</p>
              </div>
              {relatorio?.pagamentos?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Por Forma de Pagamento</p>
                  <div className="space-y-1">
                    {relatorio.pagamentos.map((p: any, i: number) => (
                      <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-50">
                        <span className="text-gray-600">{formaLabel[p.forma_pagamento] ?? p.forma_pagamento}</span>
                        <span className="font-medium">{parseFloat(p.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {relatorio?.vendas?.length > 0 && (
                <div className="pt-2">
                  <p className="text-sm font-semibold text-gray-700 mb-2 border-t border-gray-100 pt-3">Vendas Realizadas (Prévia)</p>
                  <div className="max-h-40 overflow-auto border border-gray-100 rounded-lg">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2">Nº</th>
                          <th className="px-3 py-2">Total</th>
                          <th className="px-3 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {relatorio.vendas.map((v: any, i: number) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-3 py-1.5 font-mono">#{v.numero}</td>
                            <td className="px-3 py-1.5 font-medium">R$ {brl(v.valor_total)}</td>
                            <td className="px-3 py-1.5"><span className={v.status === 'Autorizada' ? 'text-green-600' : 'text-red-500'}>{v.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="p-5 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Sair</button>
          <button onClick={handleFechar} disabled={fechando || loading} className="flex-1 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
            {fechando ? 'Fechando...' : 'Confirmar Fechamento'}
          </button>
        </div>
      </div>
    </div>
  );
};

// â€ â‚¬â€ â‚¬ Usuários â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬
type Usuario = { id?: number; nome: string; login: string; senha?: string; perfil: 'admin' | 'operador'; ativo: number };
type PreCadastro = { id: number; nome: string; email: string; cnpj: string; razao_social: string; telefone: string; login_desejado: string; status: string; created_at: string };

const UsuariosTab = ({ session, showAlert, showConfirm }: { session: Session; showAlert: (t: string, m: string) => void; showConfirm: (t: string, m: string, cb: () => void) => void }) => {
  const [activeSection, setActiveSection] = useState<'usuarios' | 'pendentes'>('usuarios');
  const [usuarios, setUsuarios]     = useState<Usuario[]>([]);
  const [pendentes, setPendentes]   = useState<PreCadastro[]>([]);
  const [editando, setEditando]     = useState<Usuario | null>(null);
  const [showModal, setShowModal]   = useState(false);
  const [loadingId, setLoadingId]   = useState<number | null>(null);

  const carregarUsuarios = () => fetch('./api.php?action=listar_usuarios').then(r => r.json()).then(setUsuarios);
  const carregarPendentes = () => fetch('./api.php?action=listar_pre_cadastros').then(r => r.json()).then((d: PreCadastro[]) => {
    if (Array.isArray(d)) setPendentes(d);
  });

  useEffect(() => { carregarUsuarios(); carregarPendentes(); }, []);

  const handleExcluir = (id: number) => {
    showConfirm('Excluir Usuário', 'Esta ação não pode ser desfeita. Confirma?', async () => {
      await fetch(`./api.php?action=excluir_usuario&id=${id}`);
      carregarUsuarios();
    });
  };

  const handleAprovar = async (id: number) => {
    setLoadingId(id);
    const res = await fetch(`./api.php?action=aprovar_pre_cadastro&id=${id}`);
    const data = await res.json();
    setLoadingId(null);
    if (data.success) { carregarPendentes(); carregarUsuarios(); }
    else showAlert('Erro ao Aprovar', data.message || 'Não foi possível aprovar o cadastro.');
  };

  const handleReprovar = (id: number) => {
    showConfirm('Reprovar Cadastro', 'Confirma reprovação deste pré-cadastro?', async () => {
      await fetch(`./api.php?action=reprovar_pre_cadastro&id=${id}`);
      carregarPendentes();
    });
  };

  const pendentesCount = pendentes.filter(p => p.status === 'aguardando').length;
  const fmtCnpj = (c: string) => c.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  const fmtDate = (d: string) => new Date(d).toLocaleString('pt-BR').replace(',', '');

  return (
    <div className="space-y-4">
      {/* Abas */}
      <div className="flex border-b border-gray-200">
        <button onClick={() => setActiveSection('usuarios')}
          className={`py-2.5 px-5 text-sm font-semibold transition-colors ${activeSection === 'usuarios' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
          Usuários
        </button>
        <button onClick={() => setActiveSection('pendentes')}
          className={`py-2.5 px-5 text-sm font-semibold transition-colors flex items-center gap-2 ${activeSection === 'pendentes' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
          Solicitações de Acesso
          {pendentesCount > 0 && (
            <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pendentesCount}</span>
          )}
        </button>
      </div>

      {activeSection === 'usuarios' && (
        <>
          <div className="flex justify-end">
            <button onClick={() => { setEditando(null); setShowModal(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-blue-700">
              <UserPlus className="w-4 h-4" /> Novo Usuário
            </button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Nome</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Login</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Perfil</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {usuarios.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-400">Nenhum usuário cadastrado.</td></tr>
                ) : usuarios.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium">{u.nome}</td>
                    <td className="px-5 py-3 font-mono text-gray-500">{u.login}</td>
                    <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.perfil === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{u.perfil}</span></td>
                    <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${u.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{u.ativo ? 'Ativo' : 'Inativo'}</span></td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => { setEditando(u); setShowModal(true); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => u.id && handleExcluir(u.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeSection === 'pendentes' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Empresa / Responsável</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">CNPJ</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Contato</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Usuário</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Data</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pendentes.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-gray-400">Nenhuma solicitação encontrada.</td></tr>
              ) : pendentes.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{p.razao_social}</p>
                    <p className="text-xs text-gray-400">{p.nome}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-600 text-xs">{fmtCnpj(p.cnpj)}</td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-gray-600">{p.email}</p>
                    {p.telefone && <p className="text-xs text-gray-400">{p.telefone}</p>}
                  </td>
                  <td className="px-4 py-3 font-mono text-blue-600 font-semibold text-xs">{p.login_desejado}</td>
                  <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{fmtDate(p.created_at)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      p.status === 'aguardando' ? 'bg-amber-100 text-amber-700' :
                      p.status === 'aprovado'   ? 'bg-green-100 text-green-700' :
                                                  'bg-red-100 text-red-700'}`}>
                      {p.status === 'aguardando' ? 'Aguardando' : p.status === 'aprovado' ? 'Aprovado' : 'Reprovado'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {p.status === 'aguardando' && (
                      <div className="flex gap-2">
                        <button onClick={() => handleAprovar(p.id)} disabled={loadingId === p.id}
                          className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 disabled:opacity-50">
                          {loadingId === p.id ? '...' : 'Aprovar'}
                        </button>
                        <button onClick={() => handleReprovar(p.id)}
                          className="px-3 py-1 bg-red-50 text-red-600 border border-red-200 text-xs rounded-lg hover:bg-red-100">
                          Reprovar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && <UsuarioModal usuario={editando} onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); carregarUsuarios(); }} showAlert={showAlert} />}
    </div>
  );
};

const UsuarioModal = ({ usuario, onClose, onSave, showAlert }: { usuario: Usuario | null; onClose: () => void; onSave: () => void; showAlert: (t: string, m: string) => void }) => {
  const [form, setForm]       = useState<Usuario>(usuario || { nome: '', login: '', senha: '', perfil: 'operador', ativo: 1 });
  const [showSenha, setShowSenha] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSalvar = async () => {
    const erros = [
      !form.nome?.trim()  && '• Nome completo',
      !form.login?.trim() && '• Login',
      !usuario && !form.senha?.trim() && '• Senha (obrigatória para novo usuário)',
    ].filter(Boolean) as string[];
    if (erros.length) { showAlert('Campos obrigatórios', 'Preencha os campos:\n' + erros.join('\n')); return; }
    setLoading(true);
    const res  = await fetch('./api.php?action=salvar_usuario', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.success) onSave();
    else showAlert('Erro ao salvar', data.message || 'Erro ao salvar usuário.');
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-gray-800">{usuario ? 'Editar Usuário' : 'Novo Usuário'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="space-y-3">
          <Input label="Nome completo" value={form.nome} onChange={(e: any) => setForm({ ...form, nome: e.target.value })} />
          <Input label="Login" value={form.login} onChange={(e: any) => setForm({ ...form, login: e.target.value })} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{usuario ? 'Nova Senha (deixe vazio para manter)' : 'Senha *'}</label>
            <div className="relative">
              <input type={showSenha ? 'text' : 'password'} value={form.senha || ''} onChange={e => setForm({ ...form, senha: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10" />
              <button type="button" onClick={() => setShowSenha((s: boolean) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Perfil</label>
              <select value={form.perfil} onChange={e => setForm({ ...form, perfil: e.target.value as 'admin' | 'operador' })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="operador">Operador</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={form.ativo} onChange={e => setForm({ ...form, ativo: Number(e.target.value) })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value={1}>Ativo</option>
                <option value={0}>Inativo</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
            <button onClick={handleSalvar} disabled={loading} className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{loading ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

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
    <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-4">
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
        <div className="bg-white border border-blue-100 rounded-lg p-4 space-y-3">
          <p className="text-xs text-gray-500">Informe as URLs dos JSONs atualizados (ex: raw do GitHub):</p>
          {(['urlCstClasstrib', 'urlAnexos', 'urlCcredpres'] as const).map((k, i) => (
            <div key={k}>
              <label className="block text-[10px] uppercase font-medium text-gray-500 mb-1">{['cst_classtrib.json', 'anexos.json', 'ccredpres.json'][i]}</label>
              <input type="text" value={urls[k]} onChange={e => setUrls(p => ({ ...p, [k]: e.target.value }))}
                placeholder="https://..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
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
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <p className="text-xs font-bold text-gray-700">Alíquotas CBS / IBS</p>
            <button onClick={() => setEditAliq({ imposto: 'CBS', percentual: 0, dIniVig: '', dFimVig: '', observacao: '' } as any)}
              className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700">+ Nova</button>
          </div>
          <table className="w-full text-xs">
            <thead><tr className="border-b text-gray-500">
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
                  <td className="py-1 text-center">{a.vigente ? <span className="text-green-600 font-bold">Sim</span> : <span className="text-gray-400">Não</span>}</td>
                  <td className="py-1 text-right flex gap-1 justify-end">
                    <button onClick={() => setEditAliq({ ...a, d_ini_vig: a.d_ini_vig, d_fim_vig: a.d_fim_vig ?? '' } as any)} className="text-blue-500 hover:text-blue-700">✏</button>
                    <button onClick={() => handleExcluirAliq(a.id)} className="text-red-400 hover:text-red-600">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Form edição */}
          {editAliq && (
            <div className="mt-4 border-t pt-4 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-medium text-gray-500 mb-1">Imposto</label>
                <select value={(editAliq as any).imposto} onChange={e => setEditAliq(p => ({ ...p, imposto: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
                  <option value="CBS">CBS</option>
                  <option value="IBS_UF">IBS UF</option>
                  <option value="IBS_MUNICIPAL">IBS Municipal</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-medium text-gray-500 mb-1">Percentual (%)</label>
                <input type="number" step="0.0001" min="0" value={(editAliq as any).percentual ?? 0}
                  onChange={e => setEditAliq(p => ({ ...p, percentual: parseFloat(e.target.value) }))}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-medium text-gray-500 mb-1">Início (AAAA-MM-DD)</label>
                <input type="date" value={(editAliq as any).d_ini_vig ?? ''} onChange={e => setEditAliq(p => ({ ...p, d_ini_vig: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-medium text-gray-500 mb-1">Fim (opcional)</label>
                <input type="date" value={(editAliq as any).d_fim_vig ?? ''} onChange={e => setEditAliq(p => ({ ...p, d_fim_vig: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] uppercase font-medium text-gray-500 mb-1">Observação</label>
                <input type="text" value={(editAliq as any).observacao ?? ''} onChange={e => setEditAliq(p => ({ ...p, observacao: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
              <div className="col-span-2 flex gap-2">
                <button onClick={handleSalvarAliq} className="px-4 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700">Salvar</button>
                <button onClick={() => setEditAliq(null)} className="px-4 py-1.5 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400">Cancelar</button>
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

const SmartPosSection = ({ emitente, onUpdate, showAlert }: { emitente: Emitente, onUpdate: (e: Emitente) => void, showAlert: (title: string, message: string) => void }) => {
  const [smartPosList, setSmartPosList] = useState<SmartPos[]>([]);
  const [smartPosForm, setSmartPosForm] = useState<SmartPos>({ codigo: '', integradora: '', apelido: '', numeroSerie: '' });
  const [editingSmartPos, setEditingSmartPos] = useState<number | null>(null);
  const [erroSmartPos, setErroSmartPos] = useState('');

  useEffect(() => {
    fetch('./api.php?action=listar_smartpos').then(r => r.json()).then(d => { if (Array.isArray(d)) setSmartPosList(d); }).catch(() => {});
  }, []);

  return (
    <div className="pt-6 border-t border-gray-100 mt-8">
      <h4 className="text-sm font-semibold text-gray-800 mb-4">Integração SMARTPOS</h4>
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
        <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">ID</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Nº Série</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Integradora</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Apelido</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {smartPosList.map(s => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 font-mono">{s.codigo}</td>
                <td className="px-4 py-2 font-mono">{s.numeroSerie}</td>
                <td className="px-4 py-2">{s.integradora}</td>
                <td className="px-4 py-2">{s.apelido}</td>
                <td className="px-4 py-2 flex justify-end gap-2">
                  <button onClick={() => { setSmartPosForm({ codigo: s.codigo, integradora: s.integradora, apelido: s.apelido, numeroSerie: s.numeroSerie }); setEditingSmartPos(s.id!); }} 
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                    <Pencil size={18} />
                  </button>
                  <button onClick={async () => { await fetch(`./api.php?action=excluir_smartpos&id=${s.id}`); setSmartPosList(smartPosList.filter(x => x.id !== s.id)); }} 
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
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

  // Carrega municípios quando já há UF salva
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

  const selClass = "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm";

  return (
    <div className="max-w-3xl bg-white rounded-xl border border-gray-200 p-8">
      <div className="space-y-6">
        <div className="animate-fadeIn grid grid-cols-2 gap-4">
            <Input label="CNPJ *" value={emitente.cnpj} onChange={(e: any) => handleChange('cnpj', e.target.value)} />
            <Input label="Inscrição Estadual *" value={emitente.inscricaoEstadual} onChange={(e: any) => handleChange('inscricaoEstadual', e.target.value)} />
            <div className="col-span-2">
              <Input label="Razão Social *" value={emitente.razaoSocial} onChange={(e: any) => handleChange('razaoSocial', e.target.value)} />
            </div>

            <div className="col-span-2 pt-2 border-t border-gray-100 mt-2">
              <h4 className="text-sm font-semibold text-gray-800 mb-4">Endereço e Contato</h4>
            </div>

            <div className="col-span-2 grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <Input label="Logradouro *" value={emitente.logradouro || ''} onChange={(e: any) => handleChange('logradouro', e.target.value)} />
              </div>
              <Input label="Número *" value={emitente.numero || ''} onChange={(e: any) => handleChange('numero', e.target.value)} />
            </div>

            <Input label="Bairro *" value={emitente.bairro || ''} onChange={(e: any) => handleChange('bairro', e.target.value)} />
            <Input label="CEP *" value={emitente.cep || ''} onChange={(e: any) => handleChange('cep', e.target.value)} />

            {/* UF + Telefone na mesma linha (UF subiu) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">UF (Estado) *</label>
              <select value={emitente.uf || ''} onChange={e => handleUfChange(e.target.value)} className={selClass}>
                <option value="">Selecione o estado...</option>
                {ESTADOS_BR.map(s => <option key={s.sigla} value={s.sigla}>{s.sigla}  —  {s.nome}</option>)}
              </select>
            </div>
            <Input label="Telefone *" value={emitente.telefone || ''} onChange={(e: any) => handleChange('telefone', e.target.value)} />

            {/* Município + Cód. IBGE desceram para cá */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Município *</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Cód. Município IBGE</label>
              <input
                readOnly
                value={emitente.codigoMunicipio || ''}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 text-sm cursor-not-allowed"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Regime Tributário (CRT) *</label>
              <select value={emitente.crt || '1'} onChange={(e) => handleChange('crt', e.target.value)} className={selClass}>
                <option value="1">1 - Simples Nacional</option>
                <option value="2">2 - Simples Nacional - excesso de sublimite</option>
                <option value="3">3 - Regime Normal</option>
              </select>
            </div>

            {emitente.crt === '1' && (
              <div className="col-span-2 bg-blue-50/50 p-4 rounded-xl border border-blue-100/50 space-y-4 animate-fadeIn">
                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    id="gerarCreditoSimples" 
                    checked={emitente.gerarCreditoSimples || false} 
                    onChange={(e) => handleChange('gerarCreditoSimples', e.target.checked)} 
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer" 
                  />
                  <label htmlFor="gerarCreditoSimples" className="text-sm font-semibold text-gray-700 cursor-pointer">
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
                    <p className="text-[10px] text-blue-600 mt-1 uppercase font-bold">
                      Será informada na NFe conforme LC 123/2006 (pCredSN/vCredICMSSN ao cliente)
                    </p>
                  </div>
                )}
                
                {/* Reforma Tributária — Opção IBS/CBS Por Fora */}
                {(Number(usuarioDfe) === 1 || Number(usuarioDfe) === 2) && (
                   <div className="pt-3 mt-3 border-t border-blue-100/50 flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      id="recolhe_ibscbs_fora" 
                      checked={emitente.recolhe_ibscbs_fora || false} 
                      onChange={(e) => handleChange('recolhe_ibscbs_fora', e.target.checked)} 
                      className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer" 
                    />
                    <label htmlFor="recolhe_ibscbs_fora" className="text-sm font-semibold text-blue-800 cursor-pointer">
                      Recolher IBS e CBS "Por Fora" do Simples Nacional? (Opção LC 214)
                    </label>
                  </div>
                )}
              </div>
            )}

            <div className="col-span-2 pt-4 border-t border-gray-100 mt-4">
              <h4 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Send className="w-4 h-4 text-blue-600" /> Envio de Arquivos (Contador / SMTP)
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Segurança</label>
                <select value={emitente.smtpSecure || 'tls'} onChange={(e) => handleChange('smtpSecure', e.target.value)} className={selClass}>
                  <option value="tls">TLS</option>
                  <option value="ssl">SSL</option>
                  <option value="nenhum">Nenhum</option>
                </select>
              </div>
            </div>

          </div>
        {/* Financeiro — Juros e Multa */}
        <div className="pt-6 border-t border-gray-100 mt-2">
          <h4 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-blue-600" /> Financeiro — Juros e Multa
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

        {/* Logo da empresa */}
        <LogoUploadSection emitente={emitente} onUpdate={onUpdate} showAlert={showAlert} />

        <div className="pt-4">
          <button onClick={handleSalvar} className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm">
            Salvar Configurações
          </button>
        </div>
      </div>
    </div>
  );
};

// â€ â‚¬â€ â‚¬â€ â‚¬ Logo Upload Section â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬â€ â‚¬
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
    } catch { showAlert('Erro', 'Falha na requisição.'); }
    finally { setUploading(false); }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mt-4">
      <h4 className="text-sm font-semibold text-gray-800 mb-1 flex items-center gap-2">
        <ImageIcon className="w-4 h-4 text-blue-600" /> Logo da Empresa
      </h4>
      <p className="text-xs text-gray-500 mb-4">Recomendado: PNG ou JPG, 678x228 px. Usada nos relatórios e orçamentos.</p>
      <div className="flex items-center gap-6">
        {emitente.logoPath ? (
          <img src={emitente.logoPath} alt="Logo" className="h-16 object-contain border border-gray-200 rounded-lg p-1 bg-gray-50" />
        ) : (
          <div className="h-16 w-32 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 text-gray-400 text-xs">Sem logo</div>
        )}
        <label className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${uploading ? 'bg-gray-200 text-gray-400' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
          {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? 'Enviando...' : 'Enviar Logo'}
          <input type="file" accept="image/png,image/jpeg" className="hidden" disabled={uploading}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </label>
        {emitente.logoPath && (
          <button onClick={async () => {
            await fetch('./api.php?action=upload_logo_empresa', { method: 'POST', body: (() => { const f = new FormData(); return f; })() });
            onUpdate({ ...emitente, logoPath: '' });
          }} className="text-xs text-red-500 hover:text-red-700 underline">Remover</button>
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
  valor_total: number; observacao?: string; validade?: string; data_criacao?: string; itens: OrcItem[];
};

const STATUS_ORC_COLORS: Record<string, string> = {
  Rascunho: 'bg-gray-100 text-gray-600',
  Enviado:  'bg-blue-100 text-blue-700',
  Aprovado: 'bg-green-100 text-green-700',
  Recusado: 'bg-red-100 text-red-600',
  Expirado: 'bg-orange-100 text-orange-600',
};

const OrcamentosTab = ({
  clientes, produtos, emitente, showAlert, showConfirm, isFiscal, onExportarNFCe
}: {
  clientes: Cliente[];
  produtos: Produto[];
  emitente: Emitente;
  showAlert: (t: string, m: string) => void;
  showConfirm: (t: string, m: string, fn: () => void) => void;
  isFiscal: boolean;
  onExportarNFCe: (itens: any[], destinatario: any) => void;
}) => {
  // ── List state ──────────────────────────────────────────────────────────
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(false);
  const [di, setDi] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; });
  const [df, setDf] = useState(() => getLocalToday());

  // ── View / wizard state ─────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [formStep, setFormStep] = useState<1 | 2 | 3>(1);

  // ── Email modal state ────────────────────────────────────────────────────
  const [showEmail, setShowEmail] = useState(false);
  const [emailOrc, setEmailOrc] = useState<Orcamento | null>(null);
  const [emailDest, setEmailDest] = useState('');
  const [emailSending, setEmailSending] = useState(false);

  // ── Form data ────────────────────────────────────────────────────────────
  const emptyOrc = (): Orcamento => ({ status: 'Rascunho', valor_total: 0, itens: [] });
  const [form, setForm] = useState<Orcamento>(emptyOrc());
  const [clienteMode, setClienteMode] = useState<'cadastrado' | 'manual'>('manual');
  const [saving, setSaving] = useState(false);

  // ── Item add state ────────────────────────────────────────────────────────
  const [tipoItem, setTipoItem] = useState<'produto' | 'servico'>('produto');
  const [buscaProd, setBuscaProd] = useState('');
  const [prodFiltrados, setProdFiltrados] = useState<Produto[]>([]);
  const [searchIdx, setSearchIdx] = useState(-1);
  const [selectedProd, setSelectedProd] = useState<Produto | null>(null);
  const [qtd, setQtd] = useState('1');
  const [vUnit, setVUnit] = useState('');
  const [unid, setUnid] = useState('UN');
  const [descServ, setDescServ] = useState('');
  const [qtdServ, setQtdServ] = useState('1');
  const [vServ, setVServ] = useState('');
  const [unidServ, setUnidServ] = useState('UN');

  const buscaRef = useRef<HTMLInputElement>(null);
  const qtdRef   = useRef<HTMLInputElement>(null);

  const setField = (f: keyof Orcamento, v: any) => setForm(p => ({ ...p, [f]: v }));
  const calcTotal = (itens: { valor_total: number }[]) => parseFloat(itens.reduce((s, i) => s + i.valor_total, 0).toFixed(2));

  const fetchOrcamentos = async () => {
    setLoading(true);
    try {
      const res = await fetch(`./api.php?action=listar_orcamentos&data_inicio=${di}&data_fim=${df}`);
      const data = await res.json();
      if (Array.isArray(data)) setOrcamentos(data);
    } catch { /* silent */ }
    setLoading(false);
  };

  useEffect(() => { fetchOrcamentos(); }, [di, df]);

  const openForm = (orc: Orcamento | null) => {
    setForm(orc ? { ...orc } : { status: 'Rascunho', valor_total: 0, itens: [] });
    setClienteMode(orc?.cliente_id ? 'cadastrado' : 'manual');
    setBuscaProd(''); setProdFiltrados([]); setSelectedProd(null);
    setQtd('1'); setVUnit(''); setUnid('UN');
    setDescServ(''); setQtdServ('1'); setVServ(''); setUnidServ('UN');
    setTipoItem('produto'); setFormStep(1); setViewMode('form');
  };

  const handleExcluir = (id: number) => {
    showConfirm('Excluir Orçamento', 'Confirma exclusão?', async () => {
      await fetch(`./api.php?action=excluir_orcamento&id=${id}`);
      fetchOrcamentos();
    });
  };

  const handlePrint = (id: number) => window.open(`./api.php?action=orcamento_pdf&id=${id}`, '_blank');

  const handleBusca = (termo: string) => {
    setBuscaProd(termo); setSelectedProd(null); setVUnit('');
    if (!termo) { setProdFiltrados([]); setSearchIdx(-1); return; }
    const lo = termo.toLowerCase();
    const fil = produtos.filter(p => p.descricao.toLowerCase().includes(lo) || (p.codigoInterno || '').toLowerCase().includes(lo) || (p.codigoBarras || '').includes(termo));
    setProdFiltrados(fil); setSearchIdx(-1);
    if (fil.length === 1) selecionarProduto(fil[0]);
  };

  const selecionarProduto = (p: Produto) => {
    setSelectedProd(p); setBuscaProd(p.descricao);
    setVUnit(Number(p.valorUnitario).toFixed(2).replace('.', ','));
    setUnid(p.unidadeComercial || 'UN'); setProdFiltrados([]); setSearchIdx(-1);
    setTimeout(() => { qtdRef.current?.focus(); qtdRef.current?.select(); }, 10);
  };

  const handleAddProduto = () => {
    if (!selectedProd) { showAlert('Produto', 'Selecione um produto.'); return; }
    const q = parseFloat(String(qtd).replace(/\./g, '').replace(',', '.')) || 0;
    const v = parseFloat(String(vUnit).replace(/\./g, '').replace(',', '.')) || 0;
    if (q <= 0 || v <= 0) { showAlert('Item inválido', 'Qtd e valor devem ser maiores que zero.'); return; }
    const novosItens = [...form.itens, { tipo: 'produto' as const, produto_id: selectedProd.id ?? null, descricao: selectedProd.descricao, unidade: unid, quantidade: q, valor_unitario: v, valor_total: parseFloat((q * v).toFixed(2)) }];
    setForm(p => ({ ...p, itens: novosItens, valor_total: calcTotal(novosItens) }));
    setBuscaProd(''); setSelectedProd(null); setQtd('1'); setVUnit(''); setUnid('UN');
    setTimeout(() => buscaRef.current?.focus(), 10);
  };

  const handleAddServico = () => {
    const q = parseFloat(String(qtdServ).replace(/\./g, '').replace(',', '.')) || 0;
    const v = parseFloat(String(vServ).replace(/\./g, '').replace(',', '.')) || 0;
    if (!descServ.trim() || q <= 0 || v <= 0) { showAlert('Serviço inválido', 'Preencha descrição, quantidade e valor.'); return; }
    const novosItens = [...form.itens, { tipo: 'servico' as const, produto_id: null, descricao: descServ, unidade: unidServ, quantidade: q, valor_unitario: v, valor_total: parseFloat((q * v).toFixed(2)) }];
    setForm(p => ({ ...p, itens: novosItens, valor_total: calcTotal(novosItens) }));
    setDescServ(''); setQtdServ('1'); setVServ(''); setUnidServ('UN');
  };

  const handleRemoveItem = (idx: number) => {
    const n = form.itens.filter((_, i) => i !== idx);
    setForm(p => ({ ...p, itens: n, valor_total: calcTotal(n) }));
  };

  const handleEditItem = (idx: number) => {
    const it = form.itens[idx];
    if (it.tipo === 'produto') {
      setSelectedProd(produtos.find(p => p.id === it.produto_id) || null);
      setBuscaProd(it.descricao); setQtd(String(it.quantidade).replace('.', ','));
      setVUnit(Number(it.valor_unitario).toFixed(2).replace('.', ',')); setUnid(it.unidade); setTipoItem('produto');
    } else {
      setDescServ(it.descricao); setQtdServ(String(it.quantidade).replace('.', ','));
      setVServ(Number(it.valor_unitario).toFixed(2).replace('.', ',')); setUnidServ(it.unidade); setTipoItem('servico');
    }
    handleRemoveItem(idx);
  };

  const handleClienteCadastrado = (id: string) => {
    const c = clientes.find(x => String(x.id) === id);
    if (c) setForm(p => ({ ...p, cliente_id: c.id, cliente_nome: c.nome, cliente_documento: c.documento, cliente_telefone: '', cliente_email: c.email || '' }));
  };

  const handleSalvar = async () => {
    if (form.itens.length === 0) { showAlert('Atenção', 'Adicione pelo menos um item.'); return; }
    setSaving(true);
    try {
      const res = await fetch('./api.php?action=salvar_orcamento', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (data.success) { setViewMode('list'); fetchOrcamentos(); }
      else showAlert('Erro', data.message || 'Falha ao salvar.');
    } catch { showAlert('Erro', 'Falha na requisição.'); }
    setSaving(false);
  };

  const handleWhatsApp = (orc: Orcamento) => {
    const num = String(orc.numero ?? '').padStart(4, '0');
    const val = 'R$ ' + Number(orc.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const val2 = orc.validade ? new Date(orc.validade + 'T12:00:00').toLocaleDateString('pt-BR') : 'Sem prazo';
    const base = window.location.origin + window.location.pathname.replace(/\/$/, '');
    const linkPdf = `${base}/./api.php?action=orcamento_pdf&id=${orc.id}`;
    let msg = `*Orçamento Nº ${num}*\nCliente: ${orc.cliente_nome || '-'}\nTotal: ${val}\nValidade: ${val2}\n`;
    if (orc.observacao) msg += `Obs: ${orc.observacao}\n`;
    msg += `\n📄 *Visualize seu Orçamento em PDF clicando abaixo:*\n${linkPdf}`;
    const tel = (orc.cliente_telefone || '').replace(/\D/g, '');
    window.open(tel ? `https://wa.me/55${tel}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleEnviarEmail = async () => {
    if (!emailOrc || !emailDest) return;
    setEmailSending(true);
    const res = await fetch('./api.php?action=orcamento_email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: emailOrc.id, email: emailDest }) });
    const data = await res.json();
    setEmailSending(false);
    showAlert(data.success ? 'E-mail enviado' : 'Erro', data.message);
    if (data.success) { setShowEmail(false); setEmailDest(''); }
  };

  const handleExportarNFCe = (orc: Orcamento) => {
    const itensProduto = (orc.itens || []).filter(i => i.tipo === 'produto' && i.produto_id);
    if (!itensProduto.length) { showAlert('Exportar NFC-e', 'Este orçamento não possui itens de produto válidos para emissão de NFC-e.'); return; }
    const hasServico = (orc.itens || []).some(i => i.tipo === 'servico');
    const proceed = () => {
      onExportarNFCe(itensProduto.map(i => ({ produtoId: i.produto_id!, quantidade: i.quantidade, valorUnitario: i.valor_unitario })),
        orc.cliente_nome ? { nome: orc.cliente_nome, documento: orc.cliente_documento || '' } : null);
    };
    if (hasServico) { showConfirm('Exportar NFC-e', 'Itens de serviço não podem ser incluídos na NFC-e e serão ignorados. Continuar?', proceed); }
    else { proceed(); }
  };

  const fmtVal = (v: number) => 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  const fmtDt = (s?: string) => { if (!s) return '-'; const norm = s.replace(' ', 'T'); return new Date(norm.includes('T') ? norm : norm + 'T12:00:00').toLocaleDateString('pt-BR'); };
  const ic = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  const totalProdutos = form.itens.filter(i => i.tipo === 'produto').reduce((s, i) => s + i.valor_total, 0);
  const totalServicos = form.itens.filter(i => i.tipo === 'servico').reduce((s, i) => s + i.valor_total, 0);

  const orcamentosFiltrados = orcamentos.filter(o => {
    const q = busca.toLowerCase().trim();
    if (!q) return true;
    return String(o.numero ?? '').includes(q) || (o.cliente_nome || '').toLowerCase().includes(q);
  });

  // ── Wizard form view ──────────────────────────────────────────────────────
  if (viewMode === 'form') {
    const steps = [{ n: 1, label: 'Identificação' }, { n: 2, label: 'Produtos/Serviços' }, { n: 3, label: 'Finalizar' }];
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-blue-600" />
              {form.id ? `Editar Orçamento #${String(form.numero ?? '').padStart(4, '0')}` : 'Novo Orçamento'}
            </h2>
            <button onClick={() => setViewMode('list')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50">
              <X className="w-4 h-4" /> Cancelar
            </button>
          </div>
          <div className="flex items-center">
            {steps.map((s, i) => (
              <React.Fragment key={s.n}>
                <button onClick={() => setFormStep(s.n as 1 | 2 | 3)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${formStep === s.n ? 'bg-blue-50 text-blue-700' : formStep > s.n ? 'text-green-600' : 'text-gray-400'}`}>
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${formStep === s.n ? 'bg-blue-600 text-white' : formStep > s.n ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>{s.n}</span>
                  <span className="text-sm font-medium hidden sm:block">{s.label}</span>
                </button>
                {i < steps.length - 1 && <div className={`flex-1 h-0.5 mx-2 ${formStep > s.n ? 'bg-green-400' : 'bg-gray-200'}`} />}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {formStep === 1 && (
            <div className="space-y-5 max-w-2xl mx-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
                  <select value={form.status} onChange={e => setField('status', e.target.value)} className={ic}>
                    {['Rascunho','Enviado','Aprovado','Recusado','Expirado'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Validade</label>
                  <input type="date" value={form.validade || ''} onChange={e => setField('validade', e.target.value)} className={ic} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Observações</label>
                  <textarea value={form.observacao || ''} onChange={e => setField('observacao', e.target.value)} rows={3} className={ic + ' resize-none'} placeholder="Condições de pagamento, prazo de entrega, etc." />
                </div>
              </div>
              <div className="border border-gray-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-gray-700">Cliente</span>
                  <div className="flex rounded-lg overflow-hidden border border-gray-200">
                    {(['cadastrado', 'manual'] as const).map(m => (
                      <button key={m} onClick={() => setClienteMode(m)} className={`px-3 py-1.5 text-xs font-medium transition-colors ${clienteMode === m ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                        {m === 'cadastrado' ? 'Cadastrado' : 'Manual'}
                      </button>
                    ))}
                  </div>
                </div>
                {clienteMode === 'cadastrado' ? (
                  <select value={form.cliente_id ? String(form.cliente_id) : ''} onChange={e => handleClienteCadastrado(e.target.value)} className={ic}>
                    <option value="">Selecione o cliente...</option>
                    {clientes.map(c => <option key={c.id} value={String(c.id)}>{c.nome}{c.documento ? ` — ${c.documento}` : ''}</option>)}
                  </select>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <input placeholder="Nome / Razão Social" value={form.cliente_nome || ''} onChange={e => setField('cliente_nome', e.target.value)} className={ic} />
                    <input placeholder="CPF / CNPJ" value={form.cliente_documento || ''} onChange={e => setField('cliente_documento', e.target.value)} className={ic} />
                    <input placeholder="Telefone / WhatsApp" value={form.cliente_telefone || ''} onChange={e => setField('cliente_telefone', e.target.value)} className={ic} />
                    <input placeholder="E-mail" type="email" value={form.cliente_email || ''} onChange={e => setField('cliente_email', e.target.value)} className={ic} />
                  </div>
                )}
              </div>
            </div>
          )}

          {formStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">Adicionar Item</span>
                <div className="flex rounded-lg overflow-hidden border border-gray-200">
                  {(['produto', 'servico'] as const).map(t => (
                    <button key={t} onClick={() => setTipoItem(t)} className={`px-3 py-1.5 text-xs font-medium transition-colors ${tipoItem === t ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                      {t === 'produto' ? 'Produto' : 'Serviço'}
                    </button>
                  ))}
                </div>
              </div>
              {tipoItem === 'produto' && (
                <div className="bg-blue-50/50 rounded-xl p-3 space-y-2">
                  <div className="flex gap-2 items-end flex-wrap">
                    <div className="flex-1 min-w-[200px] relative">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Buscar Produto</label>
                      <input ref={buscaRef} type="text" value={buscaProd} onChange={e => handleBusca(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'ArrowDown') { e.preventDefault(); setSearchIdx(p => Math.min(p + 1, prodFiltrados.length - 1)); }
                          else if (e.key === 'ArrowUp') { e.preventDefault(); setSearchIdx(p => Math.max(p - 1, -1)); }
                          else if (e.key === 'Enter' && prodFiltrados.length > 0) { e.preventDefault(); selecionarProduto(searchIdx >= 0 ? prodFiltrados[searchIdx] : prodFiltrados[0]); }
                          else if (e.key === 'Escape') { setProdFiltrados([]); }
                        }}
                        placeholder="Código, cód. de barras ou nome..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" autoComplete="off" />
                      {prodFiltrados.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-auto z-50">
                          {prodFiltrados.map((p, idx) => (
                            <button key={p.id} type="button" onClick={() => selecionarProduto(p)} className={`w-full text-left px-3 py-2.5 flex justify-between items-center border-b border-gray-50 last:border-0 transition-colors ${searchIdx === idx ? 'bg-blue-100' : 'hover:bg-blue-50'}`}>
                              <div><p className="font-medium text-gray-800 text-sm">{p.descricao}</p><p className="text-xs text-gray-400">{p.codigoInterno}{p.codigoBarras ? ` • ${p.codigoBarras}` : ''}</p></div>
                              <span className="text-sm font-semibold text-blue-600 ml-3 whitespace-nowrap">{Number(p.valorUnitario).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="w-20"><label className="block text-xs font-medium text-gray-600 mb-1">Unid.</label><input value={unid} onChange={e => setUnid(e.target.value)} className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                    <div className="w-24"><label className="block text-xs font-medium text-gray-600 mb-1">Qtd</label><input ref={qtdRef} type="text" value={qtd} onChange={e => setQtd(e.target.value.replace(/[^0-9,]/g, ''))} onKeyDown={e => e.key === 'Enter' && handleAddProduto()} className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                    <div className="w-32"><label className="block text-xs font-medium text-gray-600 mb-1">Valor Unit.</label><input type="text" value={vUnit} onChange={e => setVUnit(e.target.value.replace(/[^0-9,]/g, ''))} onKeyDown={e => e.key === 'Enter' && handleAddProduto()} placeholder="0,00" className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                    <button onClick={handleAddProduto} className="mb-0.5 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1 text-sm whitespace-nowrap"><Plus className="w-4 h-4" /> Adicionar</button>
                  </div>
                  {selectedProd && <p className="text-xs text-blue-600 pl-1">✓ {selectedProd.descricao} — {Number(selectedProd.valorUnitario).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>}
                </div>
              )}
              {tipoItem === 'servico' && (
                <div className="bg-purple-50/50 rounded-xl p-3">
                  <div className="flex gap-2 items-end flex-wrap">
                    <div className="flex-1 min-w-[200px]"><label className="block text-xs font-medium text-gray-600 mb-1">Descrição do Serviço</label><input value={descServ} onChange={e => setDescServ(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddServico()} placeholder="Ex: Mão de obra, Consultoria..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500" /></div>
                    <div className="w-20"><label className="block text-xs font-medium text-gray-600 mb-1">Unid.</label><input value={unidServ} onChange={e => setUnidServ(e.target.value)} className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500" /></div>
                    <div className="w-24"><label className="block text-xs font-medium text-gray-600 mb-1">Qtd</label><input type="text" value={qtdServ} onChange={e => setQtdServ(e.target.value.replace(/[^0-9,]/g, ''))} className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500" /></div>
                    <div className="w-32"><label className="block text-xs font-medium text-gray-600 mb-1">Valor</label><input type="text" value={vServ} onChange={e => setVServ(e.target.value.replace(/[^0-9,]/g, ''))} onKeyDown={e => e.key === 'Enter' && handleAddServico()} placeholder="0,00" className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500" /></div>
                    <button onClick={handleAddServico} className="mb-0.5 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-1 text-sm whitespace-nowrap"><Plus className="w-4 h-4" /> Adicionar</button>
                  </div>
                </div>
              )}
              {form.itens.length > 0 ? (
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase border-b border-gray-100">
                      <tr>
                        <th className="px-3 py-2 text-left">Descrição</th><th className="px-3 py-2 text-center">Tipo</th>
                        <th className="px-3 py-2 text-center">Unid.</th><th className="px-3 py-2 text-right">Qtd</th>
                        <th className="px-3 py-2 text-right">Vlr Unit.</th><th className="px-3 py-2 text-right">Total</th><th className="px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {form.itens.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-3 py-2 max-w-[200px] truncate" title={item.descricao}>{item.descricao}</td>
                          <td className="px-3 py-2 text-center"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.tipo === 'servico' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{item.tipo === 'servico' ? 'Serviço' : 'Produto'}</span></td>
                          <td className="px-3 py-2 text-center text-gray-500">{item.unidade}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{Number(item.quantidade).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{fmtVal(item.valor_unitario)}</td>
                          <td className="px-3 py-2 text-right font-semibold text-blue-600">{fmtVal(item.valor_total)}</td>
                          <td className="px-3 py-2 text-center whitespace-nowrap">
                            <button onClick={() => handleEditItem(idx)} className="p-1 hover:bg-blue-50 rounded text-blue-500 mr-1"><Edit className="w-3.5 h-3.5 inline" /></button>
                            <button onClick={() => handleRemoveItem(idx)} className="p-1 hover:bg-red-50 rounded text-red-400"><Trash2 className="w-3.5 h-3.5 inline" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
                    <div className="space-y-1 text-sm w-48">
                      {totalProdutos > 0 && <div className="flex justify-between text-gray-600"><span>Produtos</span><span className="font-medium">{fmtVal(totalProdutos)}</span></div>}
                      {totalServicos > 0 && <div className="flex justify-between text-purple-700"><span>Serviços</span><span className="font-medium">{fmtVal(totalServicos)}</span></div>}
                      <div className="flex justify-between font-bold text-blue-700 border-t border-gray-200 pt-1"><span>Total</span><span>{fmtVal(form.valor_total)}</span></div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                  <p className="text-sm">Nenhum item adicionado. Use os campos acima para adicionar produtos ou serviços.</p>
                </div>
              )}
            </div>
          )}

          {formStep === 3 && (
            <div className="space-y-5 max-w-2xl mx-auto">
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Cliente:</span><span className="font-medium text-gray-800">{form.cliente_nome || 'Não informado'}</span></div>
                <div className="flex justify-between items-center"><span className="text-gray-500">Status:</span><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_ORC_COLORS[form.status] ?? 'bg-gray-100 text-gray-600'}`}>{form.status}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Validade:</span><span className="font-medium text-gray-800">{form.validade ? new Date(form.validade + 'T12:00:00').toLocaleDateString('pt-BR') : 'Sem prazo'}</span></div>
                {form.observacao && <div className="flex justify-between gap-4"><span className="text-gray-500 shrink-0">Obs:</span><span className="text-gray-700 text-right">{form.observacao}</span></div>}
              </div>
              {form.itens.length > 0 ? (
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase border-b border-gray-100">
                      <tr><th className="px-3 py-2 text-left">Descrição</th><th className="px-3 py-2 text-center">Tipo</th><th className="px-3 py-2 text-right">Qtd</th><th className="px-3 py-2 text-right">Unit.</th><th className="px-3 py-2 text-right">Total</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {form.itens.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2 text-gray-800">{item.descricao}</td>
                          <td className="px-3 py-2 text-center"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.tipo === 'servico' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{item.tipo === 'servico' ? 'Serviço' : 'Produto'}</span></td>
                          <td className="px-3 py-2 text-right text-gray-600">{Number(item.quantidade).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{fmtVal(item.valor_unitario)}</td>
                          <td className="px-3 py-2 text-right font-semibold text-blue-600">{fmtVal(item.valor_total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
                    <div className="space-y-1 text-sm w-48">
                      {totalProdutos > 0 && <div className="flex justify-between text-gray-600"><span>Produtos</span><span className="font-medium">{fmtVal(totalProdutos)}</span></div>}
                      {totalServicos > 0 && <div className="flex justify-between text-purple-700"><span>Serviços</span><span className="font-medium">{fmtVal(totalServicos)}</span></div>}
                      <div className="flex justify-between font-bold text-blue-700 border-t border-gray-200 pt-1 text-base"><span>Total</span><span>{fmtVal(form.valor_total)}</span></div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-sm text-red-500 py-4">Nenhum item adicionado. Volte para a aba anterior.</p>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            {formStep > 1 && (
              <button onClick={() => setFormStep(s => (s - 1) as 1 | 2 | 3)} className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">
                ← Anterior
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {formStep < 3 && (
              <button onClick={() => setFormStep(s => (s + 1) as 1 | 2 | 3)} className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                Próximo →
              </button>
            )}
            {formStep === 3 && (
              <button onClick={handleSalvar} disabled={saving || form.itens.length === 0} className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm">
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {saving ? 'Salvando...' : 'Salvar Orçamento'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── List view ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>De:</span>
          <input type="date" value={di} onChange={e => setDi(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <span>Até:</span>
          <input type="date" value={df} onChange={e => setDf(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button onClick={fetchOrcamentos} className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"><RefreshCw className="w-4 h-4" /> Atualizar</button>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Nº orçamento ou nome..." className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-56" />
        </div>
        <div className="flex-1" />
        <button onClick={() => openForm(null)} className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" /> Novo Orçamento
        </button>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Nº</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Cliente</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Emissão</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Validade</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Total</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Carregando...</td></tr>}
              {!loading && orcamentosFiltrados.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">{busca ? 'Nenhum orçamento encontrado.' : 'Nenhum orçamento no período. Clique em "Novo Orçamento" para começar.'}</td></tr>
              )}
              {orcamentosFiltrados.map(orc => (
                <tr key={orc.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800">{String(orc.numero ?? '').padStart(4, '0')}</td>
                  <td className="px-4 py-3 text-gray-700 max-w-[180px] truncate">{orc.cliente_nome || <span className="text-gray-400 italic">Sem cliente</span>}</td>
                  <td className="px-4 py-3 text-gray-500">{fmtDt(orc.data_criacao)}</td>
                  <td className="px-4 py-3 text-gray-500">{fmtDt(orc.validade)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-blue-600">{fmtVal(orc.valor_total)}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_ORC_COLORS[orc.status] ?? 'bg-gray-100 text-gray-600'}`}>{orc.status}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button title="Editar" onClick={() => openForm(orc)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"><Edit className="w-4 h-4" /></button>
                      <button title="Imprimir PDF" onClick={() => handlePrint(orc.id!)} className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-600 transition-colors"><Printer className="w-4 h-4" /></button>
                      <button title="Enviar por e-mail" onClick={() => { setEmailOrc(orc); setEmailDest(orc.cliente_email || ''); setShowEmail(true); }} className="p-1.5 hover:bg-purple-50 rounded-lg text-purple-600 transition-colors"><Mail className="w-4 h-4" /></button>
                      <button title="Enviar WhatsApp" onClick={() => handleWhatsApp(orc)} className="p-1.5 hover:bg-green-50 rounded-lg text-green-600 transition-colors"><MessageCircle className="w-4 h-4" /></button>
                      <button title="Exportar para NFC-e" onClick={() => handleExportarNFCe(orc)} className="p-1.5 hover:bg-orange-50 rounded-lg text-orange-600 transition-colors"><ArrowRight className="w-4 h-4" /></button>
                      <button title="Excluir" onClick={() => handleExcluir(orc.id!)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {showEmail && emailOrc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200]">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2"><Mail className="w-5 h-5 text-purple-600" /> Enviar por E-mail</h3>
              <button onClick={() => setShowEmail(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <p className="text-sm text-gray-600 mb-3">Orçamento Nº {String(emailOrc.numero ?? '').padStart(4, '0')}</p>
            <input type="email" placeholder="E-mail do destinatário" value={emailDest} onChange={e => setEmailDest(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setShowEmail(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm hover:bg-gray-50">Cancelar</button>
              <button onClick={handleEnviarEmail} disabled={emailSending || !emailDest} className="flex-1 bg-purple-600 text-white rounded-lg py-2 text-sm hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {emailSending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                {emailSending ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const OrcamentoModal = ({
  orcamento, clientes, produtos, onClose, onSaved, showAlert
}: {
  orcamento: Orcamento | null;
  clientes: Cliente[];
  produtos: Produto[];
  onClose: () => void;
  onSaved: () => void;
  showAlert: (t: string, m: string) => void;
}) => {
  const emptyOrc = (): Orcamento => ({ status: 'Rascunho', valor_total: 0, itens: [] });
  const [form, setForm]         = useState<Orcamento>(orcamento ? { ...orcamento } : emptyOrc());
  const [clienteMode, setClienteMode] = useState<'cadastrado' | 'manual'>(orcamento?.cliente_id ? 'cadastrado' : 'manual');
  const [saving, setSaving]     = useState(false);

  // �â€â‚¬�â€â‚¬ campos de adição de item �â€â‚¬�â€â‚¬
  const [tipoItem, setTipoItem] = useState<'produto' | 'servico'>('produto');
  // produto
  const [buscaProd, setBuscaProd]   = useState('');
  const [prodFiltrados, setProdFiltrados] = useState<Produto[]>([]);
  const [searchIdx, setSearchIdx]   = useState(-1);
  const [selectedProd, setSelectedProd] = useState<Produto | null>(null);
  const [qtd,  setQtd]  = useState('1');
  const [vUnit, setVUnit] = useState('');
  const [unid, setUnid]  = useState('UN');
  // serviço
  const [descServ, setDescServ]   = useState('');
  const [qtdServ,  setQtdServ]    = useState('1');
  const [vServ,    setVServ]      = useState('');
  const [unidServ, setUnidServ]   = useState('UN');

  const buscaRef = useRef<HTMLInputElement>(null);
  const qtdRef   = useRef<HTMLInputElement>(null);

  const setField = (f: keyof Orcamento, v: any) => setForm(p => ({ ...p, [f]: v }));
  const calcTotal = (itens: OrcItem[]) => parseFloat(itens.reduce((s, i) => s + i.valor_total, 0).toFixed(2));

  // Busca produto
  const handleBusca = (termo: string) => {
    setBuscaProd(termo);
    setSelectedProd(null);
    setVUnit('');
    if (!termo) { setProdFiltrados([]); setSearchIdx(-1); return; }
    const lo = termo.toLowerCase();
    const fil = produtos.filter(p =>
      p.descricao.toLowerCase().includes(lo) ||
      (p.codigoInterno || '').toLowerCase().includes(lo) ||
      (p.codigoBarras  || '').includes(termo)
    );
    setProdFiltrados(fil);
    setSearchIdx(-1);
    if (fil.length === 1) selecionarProduto(fil[0]);
  };

  const selecionarProduto = (p: Produto) => {
    setSelectedProd(p);
    setBuscaProd(p.descricao);
    setVUnit(Number(p.valorUnitario).toFixed(2).replace('.', ','));
    setUnid(p.unidadeComercial || 'UN');
    setProdFiltrados([]);
    setSearchIdx(-1);
    setTimeout(() => { qtdRef.current?.focus(); qtdRef.current?.select(); }, 10);
  };

  const handleAddProduto = () => {
    if (!selectedProd) { showAlert('Produto', 'Selecione um produto.'); return; }
    const qStr = String(qtd).replace(/\./g, '').replace(',', '.');
    const q = parseFloat(qStr) || 0;
    const vStr = String(vUnit).replace(/\./g, '').replace(',', '.');
    const v = parseFloat(vStr) || 0;
    if (q <= 0 || v <= 0) { showAlert('Item inválido', 'Qtd e valor devem ser maiores que zero.'); return; }
    const novosItens = [...form.itens, {
      tipo: 'produto' as const,
      produto_id: selectedProd.id ?? null,
      descricao: selectedProd.descricao,
      unidade: unid,
      quantidade: q,
      valor_unitario: v,
      valor_total: parseFloat((q * v).toFixed(2)),
    }];
    setForm(p => ({ ...p, itens: novosItens, valor_total: calcTotal(novosItens) }));
    setBuscaProd(''); setSelectedProd(null); setQtd('1'); setVUnit(''); setUnid('UN');
    setTimeout(() => buscaRef.current?.focus(), 10);
  };

  const handleAddServico = () => {
    const qStr = String(qtdServ).replace(/\./g, '').replace(',', '.');
    const q = parseFloat(qStr) || 0;
    const vStr = String(vServ).replace(/\./g, '').replace(',', '.');
    const v = parseFloat(vStr) || 0;
    if (!descServ.trim() || q <= 0 || v <= 0) { showAlert('Serviço inválido', 'Preencha descrição, quantidade e valor.'); return; }
    const novosItens = [...form.itens, {
      tipo: 'servico' as const,
      produto_id: null,
      descricao: descServ,
      unidade: unidServ,
      quantidade: q,
      valor_unitario: v,
      valor_total: parseFloat((q * v).toFixed(2)),
    }];
    setForm(p => ({ ...p, itens: novosItens, valor_total: calcTotal(novosItens) }));
    setDescServ(''); setQtdServ('1'); setVServ(''); setUnidServ('UN');
  };

  const handleRemoveItem = (idx: number) => {
    const novosItens = form.itens.filter((_, i) => i !== idx);
    setForm(p => ({ ...p, itens: novosItens, valor_total: calcTotal(novosItens) }));
  };

  const handleEditItem = (idx: number) => {
    const it = form.itens[idx];
    if (it.tipo === 'produto') {
      const prod = produtos.find(p => p.id === it.produto_id) || null;
      setSelectedProd(prod);
      setBuscaProd(it.descricao);
      setQtd(String(it.quantidade).replace('.', ','));
      setVUnit(Number(it.valor_unitario).toFixed(2).replace('.', ','));
      setUnid(it.unidade);
      setTipoItem('produto');
    } else {
      setDescServ(it.descricao);
      setQtdServ(String(it.quantidade).replace('.', ','));
      setVServ(Number(it.valor_unitario).toFixed(2).replace('.', ','));
      setUnidServ(it.unidade);
      setTipoItem('servico');
    }
    handleRemoveItem(idx);
  };

  const handleClienteCadastrado = (id: string) => {
    const c = clientes.find(x => String(x.id) === id);
    if (c) setForm(p => ({ ...p, cliente_id: c.id, cliente_nome: c.nome, cliente_documento: c.documento, cliente_telefone: '', cliente_email: c.email || '' }));
  };

  const handleSalvar = async () => {
    if (form.itens.length === 0) { showAlert('Atenção', 'Adicione pelo menos um item.'); return; }
    setSaving(true);
    try {
      const res  = await fetch('./api.php?action=salvar_orcamento', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) onSaved();
      else showAlert('Erro', data.message || 'Falha ao salvar.');
    } catch { showAlert('Erro', 'Falha na requisição.'); }
    setSaving(false);
  };

  const selClass = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const inpClass = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const fmtVal = (v: number) => 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

  const totalProdutos = form.itens.filter(i => i.tipo === 'produto').reduce((s, i) => s + i.valor_total, 0);
  const totalServicos = form.itens.filter(i => i.tipo === 'servico').reduce((s, i) => s + i.valor_total, 0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-600" />
            {form.id ? `Editar Orçamento #${String(form.numero ?? '').padStart(4, '0')}` : 'Novo Orçamento'}
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
          {/* Dados gerais */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
              <select value={form.status} onChange={e => setField('status', e.target.value)} className={selClass}>
                {['Rascunho','Enviado','Aprovado','Recusado','Expirado'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Validade</label>
              <input type="date" value={form.validade || ''} onChange={e => setField('validade', e.target.value)} className={inpClass} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Observações</label>
              <textarea value={form.observacao || ''} onChange={e => setField('observacao', e.target.value)}
                rows={2} className={inpClass + ' resize-none'} placeholder="Condições de pagamento, prazo de entrega, etc." />
            </div>
          </div>

          <div className="border border-gray-100 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-700">Cliente</span>
              <div className="flex rounded-lg overflow-hidden border border-gray-200">
                {(['cadastrado', 'manual'] as const).map(m => (
                  <button key={m} onClick={() => setClienteMode(m)}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${clienteMode === m ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                    {m === 'cadastrado' ? 'Cadastrado' : 'Manual'}
                  </button>
                ))}
              </div>
            </div>
            {clienteMode === 'cadastrado' ? (
              <select value={form.cliente_id ? String(form.cliente_id) : ''} onChange={e => handleClienteCadastrado(e.target.value)} className={selClass}>
                <option value="">Selecione o cliente...</option>
                {clientes.map(c => <option key={c.id} value={String(c.id)}>{c.nome}{c.documento ? `  —  ${c.documento}` : ''}</option>)}
              </select>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Nome / Razão Social" value={form.cliente_nome || ''} onChange={e => setField('cliente_nome', e.target.value)} className={inpClass} />
                <input placeholder="CPF / CNPJ" value={form.cliente_documento || ''} onChange={e => setField('cliente_documento', e.target.value)} className={inpClass} />
                <input placeholder="Telefone / WhatsApp" value={form.cliente_telefone || ''} onChange={e => setField('cliente_telefone', e.target.value)} className={inpClass} />
                <input placeholder="E-mail" type="email" value={form.cliente_email || ''} onChange={e => setField('cliente_email', e.target.value)} className={inpClass} />
              </div>
            )}
          </div>

          {/* Itens */}
          <div className="border border-gray-100 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">Itens</span>
              <div className="flex rounded-lg overflow-hidden border border-gray-200">
                {(['produto', 'servico'] as const).map(t => (
                  <button key={t} onClick={() => setTipoItem(t)}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${tipoItem === t ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                    {t === 'produto' ? 'Produto' : 'Serviço'}
                  </button>
                ))}
              </div>
            </div>

            {/* �â€â‚¬�â€â‚¬ Adicionar produto (igual NFC-e) �â€â‚¬�â€â‚¬ */}
            {tipoItem === 'produto' && (
              <div className="bg-blue-50/50 rounded-xl p-3 space-y-2">
                <div className="flex gap-2 items-end">
                  {/* Busca */}
                  <div className="flex-1 relative">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Buscar Produto</label>
                    <input
                      ref={buscaRef}
                      type="text"
                      value={buscaProd}
                      onChange={e => handleBusca(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'ArrowDown') { e.preventDefault(); setSearchIdx(p => Math.min(p + 1, prodFiltrados.length - 1)); }
                        else if (e.key === 'ArrowUp') { e.preventDefault(); setSearchIdx(p => Math.max(p - 1, -1)); }
                        else if (e.key === 'Enter' && prodFiltrados.length > 0) {
                          e.preventDefault();
                          selecionarProduto(searchIdx >= 0 ? prodFiltrados[searchIdx] : prodFiltrados[0]);
                        } else if (e.key === 'Escape') { setProdFiltrados([]); }
                      }}
                      placeholder="Código, cód. de barras ou nome..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      autoComplete="off"
                    />
                    {prodFiltrados.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-auto z-[200]">
                        {prodFiltrados.map((p, idx) => (
                          <button key={p.id} type="button"
                            onClick={() => selecionarProduto(p)}
                            className={`w-full text-left px-3 py-2.5 flex justify-between items-center border-b border-gray-50 last:border-0 transition-colors ${searchIdx === idx ? 'bg-blue-100' : 'hover:bg-blue-50'}`}>
                            <div>
                              <p className="font-medium text-gray-800 text-sm">{p.descricao}</p>
                              <p className="text-xs text-gray-400">{p.codigoInterno}{p.codigoBarras ? ` • ${p.codigoBarras}` : ''}</p>
                            </div>
                            <span className="text-sm font-semibold text-blue-600 ml-3 whitespace-nowrap">
                              {Number(p.valorUnitario).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Unidade */}
                  <div className="w-20">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Unid.</label>
                    <input value={unid} onChange={e => setUnid(e.target.value)} className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                  </div>
                  {/* Qtd */}
                  <div className="w-24">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Qtd</label>
                    <input ref={qtdRef} type="text" value={qtd}
                      onChange={e => setQtd(e.target.value.replace(/[^0-9,]/g, ''))}
                      onKeyDown={e => e.key === 'Enter' && handleAddProduto()}
                      className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                  </div>
                  {/* Valor */}
                  <div className="w-32">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Valor Unit.</label>
                    <input type="text" value={vUnit}
                      onChange={e => setVUnit(e.target.value.replace(/[^0-9,]/g, ''))}
                      onKeyDown={e => e.key === 'Enter' && handleAddProduto()}
                      placeholder="0,00"
                      className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                  </div>
                  <button onClick={handleAddProduto}
                    className="mb-0.5 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1 text-sm whitespace-nowrap">
                    <Plus className="w-4 h-4" /> Adicionar
                  </button>
                </div>
                                {selectedProd && (
                  <p className="text-xs text-blue-600 pl-1">? {selectedProd.descricao} é {Number(selectedProd.valorUnitario).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 uppercase text-sm font-bold">
           <button onClick={onClose} className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-100 flex-1">Cancelar</button>
           <button onClick={() => {}} className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 flex-1">Salvar</button>
        </div>
      </div>
    </div>
  );
};



// �â€â‚¬�â€â‚¬�â€â‚¬ Modal de Consulta SEFAZ (Distribuição DF-e) �â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬
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
    setLoading(true);
    try {
      const res = await fetch(`./api.php?action=dist_dfe&nsu=${nsu}`);
      const data = await res.json();
      setLoading(false);
      // Atualiza data e NSU no estado tanto no sucesso quanto no consumo indevido (656)
      if (data.data_consulta) setLastQuery(data.data_consulta);
      if (data.ultimo_nsu) setNsu(data.ultimo_nsu);
      if (data.data_consulta || data.ultimo_nsu) {
        onUpdateEmitente((prev: any) => ({
          ...prev,
          ultimoNsu: data.ultimo_nsu || prev.ultimoNsu,
          dataUltimaConsultaDfe: data.data_consulta || prev.dataUltimaConsultaDfe
        }));
      }

      if (data.success) {
         fetchLocalDocs();
         if (data.docs_count > 0) {
           showAlert('Consulta Finalizada', `${data.docs_count} novos documentos foram localizados e salvos.`);
         } else {
           showAlert('Consulta Concluída', data.xMotivo || 'Nenhum documento novo foi localizado para o NSU informado.');
         }
      } else {
        showAlert('Erro SEFAZ', data.message || 'Falha na consulta.');
      }
    } catch (err: any) { 
      setLoading(false);
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
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h4 className="text-lg font-bold text-gray-800 uppercase tracking-tight">Consulta de Documentos (SEFAZ)</h4>
            <p className="text-[10px] text-gray-500 font-medium">
              Notas emitidas contra o CNPJ {emitente.cnpj} — 
              <span className={`ml-1 font-bold ${emitente.ambienteNfe === '1' ? 'text-green-600' : 'text-orange-500'}`}>
                AMBIENTE DE {emitente.ambienteNfe === '1' ? 'PRODUÇÃO' : 'HOMOLOGAÇÃO'}
              </span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        
        <div className="p-6 bg-blue-50/50 flex items-end gap-4 border-b border-blue-100">
           <div className="flex-1 max-w-[200px]">
             <label className="block text-[10px] font-bold text-blue-900 uppercase mb-1">Último NSU</label>
             <input type="text" value={nsu} onChange={e => setNsu(e.target.value)} className="w-full px-4 py-2 border border-blue-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none" />
             {lastQuery && (
               <p className="text-[9px] text-blue-400 mt-1 font-medium">Última consulta: {new Date(lastQuery).toLocaleString('pt-BR')}</p>
             )}
           </div>
           <button onClick={handleConsultar} disabled={loading} className={`px-8 py-2.5 ${loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-2 shadow-lg`}>
             {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
             {loading ? 'Consultando SEFAZ...' : 'Consultar Documentos'}
           </button>
           <div className="flex-1 flex flex-col justify-center">
             {loading ? (
               <p className="text-[10px] text-blue-700 font-bold animate-pulse">Buscando novos lotes na SEFAZ. Por favor, não feche esta janela...</p>
             ) : (
               <p className="text-[10px] text-blue-600 italic">Notas listadas abaixo estão salvas no sistema local. Clique em Consultar para buscar novos lotes.</p>
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
            <thead className="bg-gray-50 sticky top-0 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Emitente</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">CNPJ</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Chave de Acesso / NSU</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Valor</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-center">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {docs.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-20 text-center text-gray-400 italic">Ainda não há notas salvas. Clique em Consultar Novos Documentos.</td></tr>
              ) : docs.map((doc, idx) => (
                <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-800 truncate">{doc.xNome || doc.nome_emitente}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-600 font-mono">{doc.CNPJ || doc.cnpj_emitente}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-mono text-gray-700 truncate">{doc.chave || ' — '}</p>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">NSU: {doc.nsu}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="text-sm font-medium text-gray-800 whitespace-nowrap">{Number(doc.vNF || doc.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {Number(doc.manifesto) === 2 ? (
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 uppercase">Confirmado</span>
                    ) : Number(doc.manifesto) === 1 ? (
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 uppercase">Ciência</span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500 uppercase">Pendente</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1.5">
                      {/* Imprimir  —  sempre visível */}
                      <button onClick={() => handlePrintDanfe(doc.chave)} title="Imprimir DANFE" className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-800 hover:text-white transition-all flex-shrink-0">
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      {/* Ciência  —  espaço reservado para manter alinhamento */}
                      {Number(doc.manifesto) === 0 ? (
                        <button onClick={() => handleManifestar(doc.chave)} title="Dar Ciência" className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all flex-shrink-0">
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
                        className="p-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-600 hover:text-white transition-all active:scale-95 flex-shrink-0"
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

        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
           <button onClick={onClose} className="px-6 py-2 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-100 transition-all">
             Cancelar
           </button>
        </div>
      </motion.div>
    </div>
  );
};

// �â€â‚¬�â€â‚¬�â€â‚¬ Componente Dashboard �â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬�â€â‚¬
const DashboardTab = ({ isFiscal }: { isFiscal: boolean }) => {
  const [data, setData] = useState<any[]>([]);
  const [finChart, setFinChart] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ 
    total: 0, count: 0, avg: 0, nfeCount: 0, nfceCount: 0, canceladoCount: 0,
    trendTotal: 0, trendCount: 0 
  });
  const [finSummary, setFinSummary] = useState({ total_receber: 0, total_pagar: 0, trendReceber: 0, trendPagar: 0 });

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch('./api.php?action=dashboard_vendas');
        const json = await res.json();
        if (Array.isArray(json)) {
          const formatted = json.map(item => ({
            ...item,
            periodoStr: String(item.periodo).substring(5, 7) + '/' + String(item.periodo).substring(0, 4),
          }));
          setData(formatted);
          
          if (formatted.length > 0) {
            const last = formatted[formatted.length - 1];
            const prev = formatted[formatted.length - 2];
            const calcTrend = (cur: number, old: number) => {
              if (!old) return 0;
              return ((cur - old) / old) * 100;
            };

            setSummary({
              total: last.total || 0,
              count: last.count || 0,
              avg: (last.total / (last.count || 1)),
              nfeCount: last.nfe_count || 0,
              nfceCount: last.nfce_count || 0,
              canceladoCount: last.cancelado_count || 0,
              trendTotal: prev ? calcTrend(last.total, prev.total) : 0,
              trendCount: prev ? calcTrend(last.count, prev.count) : 0
            });
          }
        }

        const finRes = await fetch('./api.php?action=dashboard_financeiro');
        const finJson = await finRes.json();
        if (finJson) {
           const tRec = finJson.total_receber || 0;
           const tPag = finJson.total_pagar || 0;
           const aRec = finJson.receber_ant || 0;
           const aPag = finJson.pagar_ant || 0;
           const trendRec = aRec > 0 ? ((tRec - aRec) / aRec) * 100 : (tRec > 0 ? 100 : 0);
           const trendPag = aPag > 0 ? ((tPag - aPag) / aPag) * 100 : (tPag > 0 ? 100 : 0);
           
           setFinSummary({
             total_receber: tRec,
             total_pagar: tPag,
             trendReceber: trendRec,
             trendPagar: trendPag
           });
           if (Array.isArray(finJson.chart)) {
             const fFormatted = finJson.chart.map((item: any) => ({
                ...item,
                periodoStr: String(item.periodo).substring(5, 7) + '/' + String(item.periodo).substring(0, 4)
             }));
             setFinChart(fFormatted);
           }
        }
      } catch (err) {
        console.error("Erro dashboard:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-4 border border-gray-100 dark:border-gray-700 rounded-xl shadow-2xl backdrop-blur-md">
          <p className="text-xs font-bold text-gray-500 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-3 mb-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
              <p className="text-xs font-bold text-gray-700 dark:text-gray-200">
                {entry.name}: <span className="text-blue-600">R$ {entry.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </p>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <RefreshCw className="w-10 h-10 text-blue-600 animate-spin" />
      <p className="text-gray-400 animate-pulse">Carregando indicadores...</p>
    </div>
  );

  return (
    <div className="space-y-8 pb-10">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          label="Vendas do Mês" 
          value={summary.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} 
          icon={DollarSign} 
          trend={summary.trendTotal}
          color="blue"
        />
        {isFiscal && (
          <StatCard 
            label="Contas Autorizadas" 
            value={summary.count.toString()} 
            icon={CheckCircle} 
            trend={summary.trendCount}
            color="green"
          />
        )}
        {isFiscal && (
          <StatCard 
            label="Cancelados no Mês" 
            value={summary.canceladoCount.toString()} 
            icon={XCircle} 
            color="red"
          />
        )}
      </div>



      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }} className="bg-white dark:bg-gray-800 p-8 rounded-[2rem] shadow-xl border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h4 className="text-xl font-bold text-gray-800 dark:text-white">Evolução de Vendas</h4>
            <p className="text-xs text-gray-400 uppercase">ÚLTIMOS 12 MESES</p>
          </div>
          <div className="flex items-center gap-4">
            {isFiscal && <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500 rounded-full"></div><span className="text-[10px] text-gray-500 uppercase">NFC-E</span></div>}
            {isFiscal && <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-500 rounded-full"></div><span className="text-[10px] text-gray-500 uppercase">NF-E</span></div>}
          </div>
        </div>

        <div className="h-[400px] w-full" style={{ minHeight: '400px', minWidth: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorNfce" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorNfe" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis 
                dataKey="periodoStr" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} 
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                tickFormatter={(val) => `R$ ${val >= 1000 ? (val/1000).toFixed(1) + 'k' : val}`}
              />
              <Tooltip content={<CustomTooltip />} />
              {isFiscal && <Area type="monotone" name="NFC-e" dataKey="nfce" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorNfce)" />}
              {isFiscal && <Area type="monotone" name="NF-e" dataKey="nfe" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorNfe)" />}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="flex flex-col gap-6">
          <StatCard 
            label="Total a Receber" 
            value={finSummary.total_receber.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} 
            icon={DollarSign}
            trend={finSummary.trendReceber}
            color="green"
          />
          <StatCard 
            label="Total a Pagar" 
            value={finSummary.total_pagar.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} 
            icon={TrendingDown}
            trend={finSummary.trendPagar}
            color="red"
          />
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-8 rounded-[2rem] shadow-xl border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h4 className="text-xl font-bold text-gray-800 dark:text-white">Previsão Financeira</h4>
              <p className="text-xs text-gray-400 uppercase">PRÓXIMOS 6 MESES</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-500 rounded-full"></div><span className="text-[10px] text-gray-500 uppercase">A RECEBER</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-400 rounded-full"></div><span className="text-[10px] text-gray-500 uppercase">A PAGAR</span></div>
            </div>
          </div>

          <div className="h-[400px] w-full" style={{ minHeight: '400px', minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={finChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReceber" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPagar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f87171" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f87171" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="periodoStr" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  tickFormatter={(val) => `R$ ${val >= 1000 ? (val/1000).toFixed(1) + 'k' : val}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" name="A Receber" dataKey="receber" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorReceber)" />
                <Area type="monotone" name="A Pagar" dataKey="pagar" stroke="#f87171" strokeWidth={4} fillOpacity={1} fill="url(#colorPagar)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>
    </div>
  );
};


// ── EmpresaPage ──────────────────────────────────────────────────────────────
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
      <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
        <Building className="w-5 h-5 text-blue-600" /> Configurações da Empresa
      </h2>
      <button onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-700 underline">Cancelar</button>
    </div>
    <ConfigTab emitente={emitente} onUpdate={onUpdate} onSave={onSave} showAlert={showAlert} usuarioDfe={usuarioDfe} />
  </div>
);

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
      <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
        <ExternalLink className="w-5 h-5 text-blue-600" /> Integrações
      </h2>

      <div className="max-w-3xl bg-white rounded-xl border border-gray-200 p-8 space-y-6">

        {/* Reforma Tributária — LC 214/2025 */}
        <div>
          <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-4 h-4 text-green-600 font-bold text-xs">§</span> Reforma Tributária — LC 214/2025
          </h4>
          <ReformaTributariaTab showAlert={showAlert} />
        </div>

        <div className="border-t border-gray-100" />





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
  const selClass = "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm";

  const handleChange = (field: keyof Emitente, value: any) => onUpdate({ ...emitente, [field]: value });

  const handleCertUpload = async (file: File) => {
    if (!file.name.endsWith('.pfx') && !file.name.endsWith('.p12')) {
      showAlert('Formato inválido', 'Selecione um arquivo .pfx ou .p12.'); return;
    }
    setUploadingCert(true);
    const fd = new FormData();
    fd.append('certificado', file);
    fd.append('senha', emitente.certificadoSenha || '');
    try {
      const res = await fetch('./api.php?action=upload_certificado', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success) {
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
      <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-blue-600" /> Configurações DFe (NFC-e / NF-e)
      </h2>

      <div className="max-w-3xl space-y-6">

        {/* Certificado Digital */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h4 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600" /> Certificado Digital (A1)
          </h4>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Arquivo .pfx / .p12</label>
                {emitente.certificadoFileName && (
                  <p className="text-xs text-green-600 mb-1 font-medium">✓ {emitente.certificadoFileName}</p>
                )}
                <label className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${uploadingCert ? 'bg-gray-200 text-gray-400' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
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

        {/* NFC-e */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h4 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <QrCode className="w-4 h-4 text-blue-600" /> NFC-e (Modelo 65)
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Ambiente NFC-e</label>
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
            <div className="col-span-2 border-t border-gray-100 pt-4 mt-2">
              <h5 className="text-xs font-semibold text-orange-600 mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Contingência
              </h5>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="contingenciaAuto"
                  checked={emitente.contingenciaAutomatica || false}
                  onChange={e => handleChange('contingenciaAutomatica', e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="contingenciaAuto" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Contingência automática quando SEFAZ indisponível
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* NF-e */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h4 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" /> NF-e (Modelo 55)
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Ambiente NF-e</label>
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
          </div>
        </div>

        <div className="pt-2">
          <button onClick={onSave} className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm">
            Salvar Configurações DFe
          </button>
        </div>
      </div>
    </div>
  );
};

export default NfceDashboard;


