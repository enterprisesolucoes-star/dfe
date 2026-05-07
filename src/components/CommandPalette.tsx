import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Monitor, DollarSign, ArrowUpCircle, ArrowDownCircle, History,
  FileText, Send, QrCode, Package, Users, Store, ShoppingCart,
  ClipboardList, Wrench, BarChart2, FolderOpen, Hash, Ruler,
  CreditCard, Truck, ShieldCheck, Building, Settings, Zap,
  UserCircle, TrendingUp, Landmark, Search, Command
} from 'lucide-react';

interface PaletteItem {
  id: string;
  label: string;
  group: string;
  icon: React.ElementType;
  keywords?: string[];
  fiscalOnly?: boolean;
}

const ALL_ITEMS: PaletteItem[] = [
  { id: 'dashboard',         label: 'Dashboard',        group: 'Geral',         icon: Monitor },
  { id: 'fin_receber',       label: 'Contas a Receber', group: 'Financeiro',    icon: ArrowUpCircle, keywords: ['receber', 'contas', 'títulos'] },
  { id: 'fin_pagar',         label: 'Contas a Pagar',   group: 'Financeiro',    icon: ArrowDownCircle, keywords: ['pagar', 'contas', 'títulos'] },
  { id: 'fin_caixa',         label: 'Caixa',             group: 'Financeiro',    icon: History, keywords: ['caixa', 'movimentos'] },
  { id: 'cobranca_boletos',  label: 'Boletos',           group: 'Financeiro',    icon: FileText, keywords: ['boleto', 'cobrança', 'sicoob'] },
  { id: 'dfe_nfe',           label: 'NF-e Emissão',      group: 'Fiscal',        icon: Send, fiscalOnly: true, keywords: ['nota', 'nfe', 'fiscal', 'emissão'] },
  { id: 'dfe_nfe_geral',     label: 'NF-e Geral',        group: 'Fiscal',        icon: FileText, fiscalOnly: true, keywords: ['nota', 'nfe', 'geral', 'histórico'] },
  { id: 'vendas',            label: 'NFC-e Emissão',     group: 'Fiscal',        icon: QrCode, fiscalOnly: true, keywords: ['nfce', 'cupom', 'venda', 'pdv', 'emissão'] },
  { id: 'vendas_geral',      label: 'NFC-e Geral',       group: 'Fiscal',        icon: FileText, fiscalOnly: true, keywords: ['nfce', 'geral', 'histórico'] },
  { id: 'produtos',          label: 'Produtos',           group: 'Cadastros',     icon: Package, keywords: ['produto', 'estoque', 'item'] },
  { id: 'clientes',          label: 'Clientes',           group: 'Cadastros',     icon: Users, keywords: ['cliente', 'comprador', 'cpf', 'cnpj'] },
  { id: 'fornecedores',      label: 'Fornecedores',       group: 'Cadastros',     icon: Store, keywords: ['fornecedor', 'compra', 'cnpj'] },
  { id: 'compras',           label: 'Compras',            group: 'Comercial',     icon: ShoppingCart, keywords: ['compra', 'entrada', 'nota', 'xml'] },
  { id: 'orcamentos',        label: 'Orçamentos',         group: 'Comercial',     icon: ClipboardList, keywords: ['orçamento', 'proposta', 'cotação'] },
  { id: 'ordens_servico',    label: 'Ordens de Serviço',  group: 'Comercial',     icon: Wrench, keywords: ['ordem', 'serviço', 'os', 'técnico'] },
  { id: 'relatorios_tef',    label: 'Relatórios',         group: 'Geral',         icon: BarChart2, keywords: ['relatório', 'tef', 'análise'] },
  { id: 'ncm',               label: 'NCM / IBPT',         group: 'Configurações', icon: Hash, keywords: ['ncm', 'ibpt', 'tabela', 'fiscal'] },
  { id: 'medidas',           label: 'Medidas',            group: 'Configurações', icon: Ruler, keywords: ['medida', 'unidade', 'kg', 'un'] },
  { id: 'bandeiras',         label: 'Bandeiras TEF',      group: 'Configurações', icon: CreditCard, fiscalOnly: true, keywords: ['bandeira', 'tef', 'cartão', 'credenciadora'] },
  { id: 'transportadores',   label: 'Transportadores',    group: 'Configurações', icon: Truck, keywords: ['transportador', 'frete', 'logística'] },
  { id: 'vendedores',        label: 'Vendedores',         group: 'Configurações', icon: UserCircle, keywords: ['vendedor', 'representante'] },
  { id: 'comissoes',         label: 'Comissões',          group: 'Configurações', icon: TrendingUp, keywords: ['comissão', 'percentual'] },
  { id: 'cobranca_config',   label: 'Config. Cobrança',   group: 'Configurações', icon: Landmark, keywords: ['cobrança', 'boleto', 'banco', 'sicoob'] },
  { id: 'config_integracao', label: 'Integração',         group: 'Configurações', icon: Zap, fiscalOnly: true, keywords: ['integração', 'api', 'webhook'] },
  { id: 'dfe_config',        label: 'Config. DFe',        group: 'Configurações', icon: Settings, fiscalOnly: true, keywords: ['dfe', 'certificado', 'sefaz', 'nfe', 'config'] },
  { id: 'usuarios',          label: 'Usuários',           group: 'Configurações', icon: ShieldCheck, keywords: ['usuário', 'acesso', 'senha', 'permissão'] },
  { id: 'empresa',           label: 'Empresa',            group: 'Configurações', icon: Building, keywords: ['empresa', 'emitente', 'cnpj', 'config'] },
];

function normalize(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function score(item: PaletteItem, q: string): number {
  if (!q) return 1;
  const n = normalize(q);
  const label = normalize(item.label);
  const keywords = (item.keywords || []).map(normalize);
  if (label.startsWith(n)) return 3;
  if (label.includes(n)) return 2;
  if (keywords.some(k => k.includes(n))) return 1;
  return 0;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
  isFiscal: boolean;
}

export default function CommandPalette({ open, onClose, onNavigate, isFiscal }: Props) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const items = ALL_ITEMS
    .filter(i => !i.fiscalOnly || isFiscal)
    .map(i => ({ item: i, s: score(i, query) }))
    .filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .map(x => x.item);

  useEffect(() => { if (open) { setQuery(''); setSelected(0); setTimeout(() => inputRef.current?.focus(), 50); } }, [open]);
  useEffect(() => { setSelected(0); }, [query]);

  const navigate = useCallback((tab: string) => { onNavigate(tab); onClose(); }, [onNavigate, onClose]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, items.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
      if (e.key === 'Enter' && items[selected]) { navigate(items[selected].id); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, items, selected, navigate, onClose]);

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selected}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  const groups = [...new Set(items.map(i => i.group))];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[9998] flex items-start justify-center pt-[12vh] px-4"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.18 }}
            className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Search bar */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Ir para..."
                className="flex-1 text-sm bg-transparent outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400"
              />
              <kbd className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono text-gray-400 border border-gray-200 dark:border-gray-700 rounded">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div ref={listRef} className="max-h-80 overflow-y-auto py-2">
              {items.length === 0 && (
                <p className="text-center text-xs text-gray-400 py-8">Nenhum resultado para "{query}"</p>
              )}
              {groups.map(group => {
                const groupItems = items.filter(i => i.group === group);
                return (
                  <div key={group}>
                    <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{group}</p>
                    {groupItems.map(item => {
                      const idx = items.indexOf(item);
                      const Icon = item.icon;
                      const isSelected = idx === selected;
                      return (
                        <button
                          key={item.id}
                          data-idx={idx}
                          onMouseEnter={() => setSelected(idx)}
                          onClick={() => navigate(item.id)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`}
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-3 px-4 py-2 border-t border-gray-100 dark:border-gray-800 text-[10px] text-gray-400">
              <span className="flex items-center gap-1"><kbd className="font-mono border border-gray-200 dark:border-gray-700 rounded px-1">↑↓</kbd> navegar</span>
              <span className="flex items-center gap-1"><kbd className="font-mono border border-gray-200 dark:border-gray-700 rounded px-1">↵</kbd> abrir</span>
              <span className="flex items-center gap-1"><kbd className="font-mono border border-gray-200 dark:border-gray-700 rounded px-1">ESC</kbd> fechar</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
