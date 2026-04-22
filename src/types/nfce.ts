export interface Emitente {
  id?: number;
  razaoSocial: string;
  nomeFantasia?: string;
  cnpj: string;
  inscricaoEstadual?: string;
  inscricaoMunicipal?: string;
  crt: '1' | '2' | '3';
  endereco: Endereco;
  telefone?: string;
  certificadoPfx?: string;
  certificadoSenha?: string;
  certificadoFileName?: string;
  cscToken?: string;
  cscId?: string;
  codigoMunicipio: string;
  uf: string;
  ambiente: '1' | '2';
}

export interface Produto {
  id?: number;
  codigoInterno: string;
  descricao: string;
  ean?: string;
  ncm: string;
  cest?: string;
  unidadeComercial: string;
  valorUnitario: number;
  cfop: string;
  origemMercadoria: string;
  icmsCstCsosn: string;
  icmsAliquota: number;
  pisCst: string;
  pisAliquota: number;
  cofinsCst: string;
  cofinsAliquota: number;
}

export interface Venda {
  id?: number;
  empresaId: number;
  clienteId?: number;
  serie: number;
  numero: number;
  dataEmissao: string;
  valorTotal: number;
  valorDesconto: number;
  status: 'Pendente' | 'Autorizada' | 'Cancelada' | 'Rejeitada';
  chaveAcesso?: string;
  protocolo?: string;
  xmlEnvio?: string;
  xmlRetorno?: string;
  qrcodeUrl?: string;
  itens?: VendaItem[];
  pagamentos?: VendaPagamento[];
}

export interface VendaItem {
  id?: number;
  vendaId: number;
  produtoId: number;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  valorDesconto: number;
}

export interface VendaPagamento {
  id?: number;
  vendaId: number;
  formaPagamento: string;
  valorPagamento: number;
}

export interface Cliente {
  id?: number;
  nome: string;
  documento: string;
  email?: string;
  endereco?: Endereco;
}

export interface Endereco {
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  codigoMunicipio: string;
  municipio: string;
  uf: string;
  cep: string;
}
