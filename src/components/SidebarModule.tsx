import React from 'react';
import { 
  Monitor, DollarSign, ChevronDown, ChevronRight, ArrowUpCircle, 
  ArrowDownCircle, History, FileText, Send, QrCode, Package, 
  Users, Store, ShoppingCart, ClipboardList, Wrench, FolderOpen, BarChart2, 
  Hash, Ruler, CreditCard, Truck, ShieldCheck, Building, Settings, LogOut, Zap
} from 'lucide-react';

export const SidebarItem = ({ icon: Icon, label, active, onClick }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
      active 
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 font-semibold' 
        : 'text-gray-500 hover:bg-gray-50 hover:text-blue-600'
    }`}
  >
    <Icon className={`w-5 h-5 ${active ? 'text-white' : ''}`} />
    <span className="text-sm">{label}</span>
  </button>
);

export const Sidebar = ({
  activeTab,
  handleSetActiveTab,
  session,
  onLogout,
  financeiroOpen,
  setFinanceiroOpen,
  dfeNfeOpen,
  setDfeNfeOpen,
  dfeNfceOpen,
  setDfeNfceOpen,
  cadastrosOpen,
  setCadastrosOpen
}: any) => {
  const isFiscal = Number(usuarioDfe ?? session?.usuarioDfe ?? 0) > 0 && Number(usuarioDfe ?? session?.usuarioDfe ?? 0) !== 4;

  return (
    <aside className="w-64 bg-white flex flex-col shadow-sm border-r border-gray-100 h-screen sticky top-0 z-50">
      <div className="p-6 border-b border-gray-50 flex items-center justify-between">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
          <FileText className="w-6 h-6 text-blue-600" />
          DFe IA
        </h1>
        <div className="flex items-center gap-2">
          <button onClick={onLogout} title="Sair" className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto custom-scrollbar">
        <SidebarItem icon={Monitor} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => handleSetActiveTab('dashboard')} />
        
        {/* Financeiro */}
        <div>
          <button
            onClick={() => setFinanceiroOpen(!financeiroOpen)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              financeiroOpen || ['fin_receber', 'fin_pagar', 'fin_caixa'].includes(activeTab) ? 'text-blue-600 font-bold bg-blue-50/50' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <DollarSign className="w-5 h-5" />
            <span className="flex-1 text-left text-sm">Financeiro</span>
            {financeiroOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          {financeiroOpen && (
            <div className="mt-1 ml-4 border-l-2 border-blue-100 pl-2 space-y-1">
              {[
                { id: 'fin_receber', label: 'Receber', icon: ArrowUpCircle },
                { id: 'fin_pagar', label: 'Pagar', icon: ArrowDownCircle },
                { id: 'fin_caixa', label: 'Caixa', icon: History },
              ].map(sub => (
                <button
                  key={sub.id}
                  onClick={() => handleSetActiveTab(sub.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
                    activeTab === sub.id ? 'bg-blue-600 text-white font-bold shadow-md' : 'text-gray-500 hover:bg-blue-50 hover:text-blue-600'
                  }`}
                >
                  <sub.icon className="w-3.5 h-3.5" /> {sub.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* DFe - NFe */}
        {isFiscal && <div>
          <button
            onClick={() => setDfeNfeOpen(!dfeNfeOpen)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              dfeNfeOpen || ['dfe_nfe', 'dfe_nfe_geral'].includes(activeTab) ? 'text-blue-600 font-bold bg-blue-50/50' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span className="flex-1 text-left text-sm">NF-e</span>
            {dfeNfeOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          {dfeNfeOpen && (
            <div className="mt-1 ml-4 border-l-2 border-blue-100 pl-2 space-y-1">
              <button onClick={() => handleSetActiveTab('dfe_nfe')} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${activeTab === 'dfe_nfe' ? 'bg-blue-600 text-white font-bold' : 'text-gray-500 hover:bg-blue-50'}`}>
                <Send className="w-3.5 h-3.5" /> Emissão
              </button>
              <button onClick={() => handleSetActiveTab('dfe_nfe_geral')} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${activeTab === 'dfe_nfe_geral' ? 'bg-blue-600 text-white font-bold' : 'text-gray-500 hover:bg-blue-50'}`}>
                <FileText className="w-3.5 h-3.5" /> Geral
              </button>
            </div>
          )}
        </div>}
        {/* DFe - NFCe */}
        {isFiscal && <div>
          <button
            onClick={() => setDfeNfceOpen(!dfeNfceOpen)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              dfeNfceOpen || ['vendas', 'vendas_geral'].includes(activeTab) ? 'text-blue-600 font-bold bg-blue-50/50' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <QrCode className="w-5 h-5" />
            <span className="flex-1 text-left text-sm">NFC-e</span>
            {dfeNfceOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          {dfeNfceOpen && (
            <div className="mt-1 ml-4 border-l-2 border-blue-100 pl-2 space-y-1">
              <button onClick={() => handleSetActiveTab('vendas')} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${activeTab === 'vendas' ? 'bg-blue-600 text-white font-bold' : 'text-gray-500 hover:bg-blue-50'}`}>
                <Send className="w-3.5 h-3.5" /> Emissão
              </button>
              <button onClick={() => handleSetActiveTab('vendas_geral')} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${activeTab === 'vendas_geral' ? 'bg-blue-600 text-white font-bold' : 'text-gray-500 hover:bg-blue-50'}`}>
                <FileText className="w-3.5 h-3.5" /> Geral
              </button>
            </div>
          )}
        </div>}
        <SidebarItem icon={Package} label="Produtos" active={activeTab === 'produtos'} onClick={() => handleSetActiveTab('produtos')} />
        <SidebarItem icon={Users} label="Clientes" active={activeTab === 'clientes'} onClick={() => handleSetActiveTab('clientes')} />
        <SidebarItem icon={Store} label="Fornecedores" active={activeTab === 'fornecedores'} onClick={() => handleSetActiveTab('fornecedores')} />
        <SidebarItem icon={ShoppingCart} label="Compras" active={activeTab === 'compras'} onClick={() => handleSetActiveTab('compras')} />
        <SidebarItem icon={ClipboardList} label="Orçamentos" active={activeTab === 'orcamentos'} onClick={() => handleSetActiveTab('orcamentos')} />
        <SidebarItem icon={Wrench} label="Ordem Serviços" active={activeTab === 'ordens_servico'} onClick={() => handleSetActiveTab('ordens_servico')} />
        <SidebarItem icon={BarChart2} label="Relatórios" active={activeTab === 'relatorios_tef'} onClick={() => handleSetActiveTab('relatorios_tef')} />

        {/* Cadastros */}
        <div>
          <button
            onClick={() => setCadastrosOpen(!cadastrosOpen)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              cadastrosOpen || ['ncm', 'usuarios', 'medidas', 'bandeiras', 'transportadores', 'config_integracao', 'dfe_config', 'dfe_nfe_dados', 'dfe_nfce_dados', 'dfe_provedor'].includes(activeTab) ? 'text-blue-600 font-bold bg-blue-50/50' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <FolderOpen className="w-5 h-5" />
            <span className="flex-1 text-left text-sm">Configurações</span>
            {cadastrosOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          {cadastrosOpen && (
            <div className="mt-1 ml-4 border-l-2 border-blue-100 pl-2 space-y-1">
              {[
                { id: 'ncm', label: 'NCM/IBPT', icon: Hash },
                { id: 'medidas', label: 'Medidas', icon: Ruler },
                ...(isFiscal ? [{ id: 'bandeiras', label: 'Bandeiras', icon: CreditCard }] : []),
                { id: 'transportadores', label: 'Transportadores', icon: Truck },
                ...(isFiscal ? [{ id: 'config_integracao', label: 'Integração', icon: Zap }] : []),
                ...(isFiscal ? [{ id: 'dfe_config', label: 'DFe', icon: Settings }] : []),
                { id: 'usuarios', label: 'Usuários', icon: ShieldCheck },
              ].map(sub => (
                <button
                  key={sub.id}
                  onClick={() => handleSetActiveTab(sub.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
                    activeTab === sub.id ? 'bg-blue-600 text-white font-bold' : 'text-gray-500 hover:bg-blue-50'
                  }`}
                >
                  <sub.icon className="w-3.5 h-3.5" /> {sub.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <SidebarItem icon={Building} label="Empresa"
          active={['empresa','config','config_empresa','config_email','config_smartpos'].includes(activeTab)}
          onClick={() => handleSetActiveTab('empresa')} />
        

      </nav>

      <div className="p-4 border-t border-gray-50">
        <div className="bg-gray-50 rounded-2xl p-4">
          
          <p className="text-[11px] text-gray-600 font-medium truncate">{session?.nome || ""}</p>
        </div>
      </div>
    </aside>
  );
};
