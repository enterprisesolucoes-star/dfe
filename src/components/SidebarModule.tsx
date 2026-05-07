import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../contexts/ThemeContext';
import {
  Monitor, DollarSign, ChevronDown, ChevronRight, ArrowUpCircle,
  ArrowDownCircle, History, FileText, Send, QrCode, Package,
  Users, Store, ShoppingCart, ClipboardList, Wrench, FolderOpen, BarChart2,
  Hash, Ruler, CreditCard, Truck, ShieldCheck, Building, Settings, LogOut,
  Zap, UserCircle, TrendingUp, Landmark, Archive, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';

const COLLAPSED_KEY = 'sidebar_collapsed';

function Tooltip({ label, children, collapsed }: { label: string; children: React.ReactNode; collapsed: boolean }) {
  const [visible, setVisible] = useState(false);
  if (!collapsed) return <>{children}</>;
  return (
    <div
      className="relative flex items-center"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-full ml-2 z-50 px-2 py-1 text-xs bg-gray-900 text-white rounded-md whitespace-nowrap pointer-events-none"
          >
            {label}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const SidebarItem = ({ icon: Icon, label, active, onClick, collapsed }: any) => (
  <Tooltip label={label} collapsed={!!collapsed}>
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
        active
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 font-semibold'
          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400'
      } ${collapsed ? 'justify-center px-2' : ''}`}
    >
      <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-white' : ''}`} />
      <AnimatePresence>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2 }}
            className="text-sm overflow-hidden whitespace-nowrap"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  </Tooltip>
);

interface SidebarGroupProps {
  icon: React.ElementType;
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  isActive: boolean;
  collapsed: boolean;
  children: React.ReactNode;
}

function SidebarGroup({ icon: Icon, label, isOpen, onToggle, isActive, collapsed, children }: SidebarGroupProps) {
  return (
    <div>
      <Tooltip label={label} collapsed={collapsed}>
        <button
          onClick={onToggle}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
            isOpen || isActive
              ? 'text-blue-600 font-bold bg-blue-50/50 dark:bg-blue-900/20'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
          } ${collapsed ? 'justify-center px-2' : ''}`}
        >
          <Icon className="w-5 h-5 flex-shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="flex-1 text-left text-sm overflow-hidden whitespace-nowrap"
              >
                {label}
              </motion.span>
            )}
          </AnimatePresence>
          {!collapsed && (
            <motion.div animate={{ rotate: isOpen ? 0 : -90 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="w-4 h-4" />
            </motion.div>
          )}
        </button>
      </Tooltip>

      <AnimatePresence initial={false}>
        {isOpen && !collapsed && (
          <motion.div
            key="submenu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="mt-1 ml-4 border-l-2 border-blue-100 dark:border-blue-900 pl-2 space-y-1">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SubItem({ id, label, icon: Icon, activeTab, onClick }: any) {
  const isActive = activeTab === id;
  return (
    <button
      onClick={() => onClick(id)}
      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
        isActive
          ? 'bg-blue-600 text-white font-bold shadow-md'
          : 'text-gray-500 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400'
      }`}
    >
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      {label}
    </button>
  );
}

export const Sidebar = ({
  activeTab,
  handleSetActiveTab,
  session,
  onLogout,
  financeiroOpen,
  setFinanceiroOpen,
  cobrancaAtiva,
  cadastrosOpen,
  setCadastrosOpen,
  usuarioDfe
}: any) => {
  const { theme } = useTheme();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem(COLLAPSED_KEY) === 'true'; } catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem(COLLAPSED_KEY, String(collapsed)); } catch { /* ignore */ }
  }, [collapsed]);

  const isFiscal = Number(usuarioDfe ?? session?.usuarioDfe ?? 0) > 0 &&
    Number(usuarioDfe ?? session?.usuarioDfe ?? 0) !== 4;

  const financeiroActive = ['fin_receber', 'fin_pagar', 'fin_caixa', 'cobranca_boletos', 'cobranca_historico'].includes(activeTab);
  const nfeActive = activeTab === 'dfe';
  const nfceActive = activeTab === 'vendas';
  const cadastrosActive = ['ncm', 'usuarios', 'medidas', 'bandeiras', 'transportadores', 'vendedores',
    'comissoes', 'cobranca_config', 'config_integracao', 'dfe_config', 'dfe_nfe_dados', 'dfe_nfce_dados', 'dfe_provedor'].includes(activeTab);

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 256 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="bg-white dark:bg-gray-800 flex flex-col shadow-sm border-r border-gray-100 dark:border-gray-700 h-screen sticky top-0 z-50 overflow-hidden"
    >
      {/* Header */}
      <div className={`p-4 border-b border-gray-50 dark:border-gray-700 flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
        <AnimatePresence>
          {!collapsed && (
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2 whitespace-nowrap"
            >
              <FileText className="w-6 h-6 text-blue-600 flex-shrink-0" />
              DFe IA
            </motion.h1>
          )}
        </AnimatePresence>

        <button
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          className="p-2 text-gray-400 dark:text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all flex-shrink-0"
        >
          {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar overflow-x-hidden">
        <SidebarItem icon={Monitor} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => handleSetActiveTab('dashboard')} collapsed={collapsed} />

        <SidebarGroup
          icon={DollarSign}
          label="Financeiro"
          isOpen={financeiroOpen}
          onToggle={() => setFinanceiroOpen(!financeiroOpen)}
          isActive={financeiroActive}
          collapsed={collapsed}
        >
          <SubItem id="fin_receber" label="Receber" icon={ArrowUpCircle} activeTab={activeTab} onClick={handleSetActiveTab} />
          <SubItem id="fin_pagar" label="Pagar" icon={ArrowDownCircle} activeTab={activeTab} onClick={handleSetActiveTab} />
          <SubItem id="fin_caixa" label="Caixa" icon={History} activeTab={activeTab} onClick={handleSetActiveTab} />
          {cobrancaAtiva && <>
            <SubItem id="cobranca_boletos" label="Boletos" icon={FileText} activeTab={activeTab} onClick={handleSetActiveTab} />
            <SubItem id="cobranca_historico" label="Arquivos" icon={Archive} activeTab={activeTab} onClick={handleSetActiveTab} />
          </>}
        </SidebarGroup>

        {isFiscal && (
          <SidebarItem icon={FileText} label="DFe" active={nfeActive} onClick={() => handleSetActiveTab('dfe')} collapsed={collapsed} />
        )}
        {isFiscal && (
          <SidebarItem icon={QrCode} label="PDV / NFCe" active={nfceActive} onClick={() => handleSetActiveTab('vendas')} collapsed={collapsed} />
        )}

        {!isFiscal && (
          <SidebarItem icon={ShoppingCart} label="Pedidos" active={activeTab === 'pedidos'} onClick={() => handleSetActiveTab('pedidos')} collapsed={collapsed} />
        )}

        <SidebarItem icon={Package} label="Produtos" active={activeTab === 'produtos'} onClick={() => handleSetActiveTab('produtos')} collapsed={collapsed} />
        <SidebarItem icon={Users} label="Clientes" active={activeTab === 'clientes'} onClick={() => handleSetActiveTab('clientes')} collapsed={collapsed} />
        <SidebarItem icon={Store} label="Fornecedores" active={activeTab === 'fornecedores'} onClick={() => handleSetActiveTab('fornecedores')} collapsed={collapsed} />
        <SidebarItem icon={ShoppingCart} label="Compras" active={activeTab === 'compras'} onClick={() => handleSetActiveTab('compras')} collapsed={collapsed} />
        <SidebarItem icon={ClipboardList} label="Orçamentos" active={activeTab === 'orcamentos'} onClick={() => handleSetActiveTab('orcamentos')} collapsed={collapsed} />
        <SidebarItem icon={Wrench} label="Ordem Serviços" active={activeTab === 'ordens_servico'} onClick={() => handleSetActiveTab('ordens_servico')} collapsed={collapsed} />
        <SidebarItem icon={BarChart2} label="Relatórios" active={activeTab === 'relatorios_tef'} onClick={() => handleSetActiveTab('relatorios_tef')} collapsed={collapsed} />

        <SidebarGroup
          icon={FolderOpen}
          label="Configurações"
          isOpen={cadastrosOpen}
          onToggle={() => setCadastrosOpen(!cadastrosOpen)}
          isActive={cadastrosActive}
          collapsed={collapsed}
        >
          <SubItem id="ncm" label="NCM/IBPT" icon={Hash} activeTab={activeTab} onClick={handleSetActiveTab} />
          <SubItem id="medidas" label="Medidas" icon={Ruler} activeTab={activeTab} onClick={handleSetActiveTab} />
          {isFiscal && <SubItem id="bandeiras" label="Bandeiras" icon={CreditCard} activeTab={activeTab} onClick={handleSetActiveTab} />}
          <SubItem id="transportadores" label="Transportadores" icon={Truck} activeTab={activeTab} onClick={handleSetActiveTab} />
          <SubItem id="vendedores" label="Vendedores" icon={UserCircle} activeTab={activeTab} onClick={handleSetActiveTab} />
          <SubItem id="comissoes" label="Comissões" icon={TrendingUp} activeTab={activeTab} onClick={handleSetActiveTab} />
          <SubItem id="cobranca_config" label="Cobrança" icon={Landmark} activeTab={activeTab} onClick={handleSetActiveTab} />
          {isFiscal && <SubItem id="config_integracao" label="Integração" icon={Zap} activeTab={activeTab} onClick={handleSetActiveTab} />}
          {isFiscal && <SubItem id="dfe_config" label="DFe" icon={Settings} activeTab={activeTab} onClick={handleSetActiveTab} />}
          <SubItem id="usuarios" label="Usuários" icon={ShieldCheck} activeTab={activeTab} onClick={handleSetActiveTab} />
        </SidebarGroup>

        <SidebarItem
          icon={Building}
          label="Empresa"
          active={['empresa', 'config', 'config_empresa', 'config_email', 'config_smartpos'].includes(activeTab)}
          onClick={() => handleSetActiveTab('empresa')}
          collapsed={collapsed}
        />
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-gray-50 dark:border-gray-700">
        <div className={`bg-gray-50 dark:bg-gray-900 rounded-2xl p-3 flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          <button
            onClick={onLogout}
            title="Sair"
            className="flex-shrink-0 p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
          >
            <LogOut className="w-4 h-4" />
          </button>
          <AnimatePresence>
            {!collapsed && (
              <motion.p
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="text-[11px] text-gray-600 dark:text-gray-400 font-medium truncate overflow-hidden whitespace-nowrap"
              >
                {session?.nome || ''}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  );
};
