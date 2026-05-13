import React, { createContext, useContext, useState, useCallback } from 'react';

const apiFetch = (url: string, options?: RequestInit) => {
  const session = JSON.parse(sessionStorage.getItem('dfe_session') || '{}');
  const headers: Record<string, string> = { ...(options?.headers as Record<string, string> || {}) };
  if (session.empresaId) headers['X-Empresa-ID'] = String(session.empresaId);
  if (session.usuarioId) headers['X-Usuario-ID'] = String(session.usuarioId);
  return fetch(url, { ...options, headers });
};
import { Produto, Cliente, Fornecedor, Transportador, Medida, Bandeira } from '../types/nfce';

export type Vendedor = { id?: number; nome: string; documento?: string; telefone?: string; email?: string; percentual_comissao?: number; ativo?: number };

type AppDataCtx = {
  produtos: Produto[];
  clientes: Cliente[];
  fornecedores: Fornecedor[];
  vendedores: Vendedor[];
  transportadores: Transportador[];
  medidas: Medida[];
  bandeiras: Bandeira[];
  produtosRefreshKey: number;
  setProdutosRefreshKey: React.Dispatch<React.SetStateAction<number>>;
  fetchProdutos: () => Promise<void>;
  fetchClientes: () => Promise<void>;
  fetchFornecedores: () => Promise<void>;
  fetchVendedores: () => Promise<void>;
  fetchTransportadores: () => Promise<void>;
  fetchMedidas: () => Promise<void>;
  fetchBandeiras: () => Promise<void>;
};

const AppDataContext = createContext<AppDataCtx | null>(null);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [produtos, setProdutos]               = useState<Produto[]>([]);
  const [clientes, setClientes]               = useState<Cliente[]>([]);
  const [fornecedores, setFornecedores]       = useState<Fornecedor[]>([]);
  const [vendedores, setVendedores]           = useState<Vendedor[]>([]);
  const [transportadores, setTransportadores] = useState<Transportador[]>([]);
  const [medidas, setMedidas]                 = useState<Medida[]>([]);
  const [bandeiras, setBandeiras]             = useState<Bandeira[]>([]);
  const [produtosRefreshKey, setProdutosRefreshKey] = useState(0);

  const fetchProdutos = useCallback(async (busca = '') => {
    try {
      const url = busca ? `./api.php?action=produtos&busca=${encodeURIComponent(busca)}&limit=80` : './api.php?action=produtos&limit=200';
      const data = await fetch(url).then(r => r.json());
      const arr = Array.isArray(data) ? data : (data.data ?? []);
      if (Array.isArray(arr)) setProdutos(arr.map((p: any) => ({
        ...p, id: Number(p.id), valorUnitario: Number(p.valor_unitario),
        codigoInterno: p.codigo_interno, codigoBarras: p.codigo_barras || '',
        unidadeComercial: p.unidade_comercial, icmsAliquota: Number(p.icms_aliquota ?? 0),
        custoCopra: Number(p.custo_compra ?? 0), simplesNacional: Number(p.simples_nacional ?? 0),
        despesasOperacionais: Number(p.despesas_operacionais ?? 0), freteSeguro: Number(p.frete_seguro ?? 0),
        margemLucro: Number(p.margem_lucro ?? 0), estoque: Number(p.estoque ?? 0),
        cbsCst: p.cbs_cst ?? '', cbsClasstrib: p.cbs_classtrib ?? '',
        ibsCst: p.ibs_cst ?? '', ibsClasstrib: p.ibs_classtrib ?? '',
        cCredPres: p.ccredpres ?? '', icmsCstCsosn: p.icms_cst_csosn ?? '102',
        codigoFornecedor: p.codigo_fornecedor ?? ''
      })));
    } catch { /* silent */ }
  }, []);

  const fetchClientes = useCallback(async (busca = '') => {
    try {
      const url = `./api.php?action=clientes&busca=${encodeURIComponent(busca)}&limit=50`;
      const data = await fetch(url).then(r => r.json());
      const arr = Array.isArray(data) ? data : (data.data ?? []);
      if (Array.isArray(arr)) setClientes(arr.map((c: any) => ({
        ...c, id: Number(c.id), regimeTributario: c.regime_tributario || '1',
        entidadeGovernamental: c.entidade_governamental || '0', ie: c.ie || '',
        indIEDest: c.indIEDest || c.indiedest || '9',
        data_nascimento: c.data_nascimento || '',
        endereco: {
          logradouro: c.logradouro, numero: c.numero, complemento: c.complemento,
          bairro: c.bairro, municipio: c.municipio, codigoMunicipio: c.codigo_municipio, uf: c.uf, cep: c.cep
        }
      })));
    } catch { /* silent */ }
  }, []);

  const fetchFornecedores = useCallback(async (busca = '') => {
    try {
      const url = busca ? `./api.php?action=fornecedores&busca=${encodeURIComponent(busca)}&limit=80` : './api.php?action=fornecedores&limit=300';
      const data = await fetch(url).then(r => r.json());
      const arr = Array.isArray(data) ? data : (data.data ?? []);
      if (Array.isArray(arr)) setFornecedores(arr.map((f: any) => ({
        ...f, id: Number(f.id),
        endereco: {
          logradouro: f.logradouro, numero: f.numero, complemento: f.complemento,
          bairro: f.bairro, municipio: f.municipio, codigoMunicipio: f.codigo_municipio, uf: f.uf, cep: f.cep
        }
      })));
    } catch { /* silent */ }
  }, []);

  const fetchVendedores = useCallback(async () => {
    try {
      const data = await apiFetch('./api.php?action=listar_vendedores').then(r => r.json());
      if (Array.isArray(data)) setVendedores(data);
    } catch { /* silent */ }
  }, []);

  const fetchTransportadores = useCallback(async () => {
    try {
      const data = await apiFetch('./api.php?action=transportadores').then(r => r.json());
      if (Array.isArray(data)) setTransportadores(data.map((t: any) => ({
        ...t, id: Number(t.id),
        endereco: {
          logradouro: t.logradouro, numero: t.numero, complemento: t.complemento,
          bairro: t.bairro, municipio: t.municipio, codigoMunicipio: t.codigo_municipio, uf: t.uf, cep: t.cep
        }
      })));
    } catch { /* silent */ }
  }, []);

  const fetchMedidas = useCallback(async () => {
    try {
      const data = await apiFetch('./api.php?action=medidas').then(r => r.json());
      if (Array.isArray(data)) setMedidas(data.map((m: any) => ({
        ...m, id: Number(m.id), fator: Number(m.fator), pesavel: Number(m.pesavel) === 1
      })));
    } catch { /* silent */ }
  }, []);

  const fetchBandeiras = useCallback(async () => {
    try {
      const data = await fetch('./api.php?action=bandeiras').then(r => r.json());
      if (Array.isArray(data)) setBandeiras(data.map((b: any) => ({ ...b, id: Number(b.id) })));
    } catch { /* silent */ }
  }, []);

  return (
    <AppDataContext.Provider value={{
      produtos, clientes, fornecedores, vendedores, transportadores, medidas, bandeiras,
      produtosRefreshKey, setProdutosRefreshKey,
      fetchProdutos, fetchClientes, fetchFornecedores, fetchVendedores,
      fetchTransportadores, fetchMedidas, fetchBandeiras,
    }}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}
