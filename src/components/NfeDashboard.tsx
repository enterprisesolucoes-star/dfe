import React, { useState, useCallback, useEffect } from 'react';
import FormAlert from './FormAlert';
import { motion } from 'motion/react';
import {
  Plus, Trash2, Search, Send, FileText, CheckCircle, AlertCircle,
  Download, X, Truck, CreditCard, Package, User,
  Calculator, RefreshCw, AlertTriangle, Edit3, Save, ChevronRight, ChevronLeft,
  CalendarDays
} from 'lucide-react';
import {
  Produto, Cliente, Transportador, Emitente, Medida,
  Nfe, NfeItem, NfeTransporte, NfePagamento, NfeVolume
} from '../types/nfce';

// ─── Tipos locais ────────────────────────────────────────────────────────────

interface Props {
  emitente: Emitente;
  clientes: Cliente[];
  produtos: Produto[];
  transportadores: Transportador[];
  medidas: Medida[];
  showAlert: (title: string, msg: string) => void;
  showConfirm: (title: string, msg: string, fn: () => void) => void;
  showPrompt: (title: string, msg: string, fn: (v: string) => void) => void;
  onEmitted?: (chave: string, id: number) => void;
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const FORMAS_PAGAMENTO = [
  { codigo: '01', descricao: 'Dinheiro' },
  { codigo: '02', descricao: 'Cheque' },
  { codigo: '03', descricao: 'Cartão de Crédito' },
  { codigo: '04', descricao: 'Cartão de Débito' },
  { codigo: '05', descricao: 'Crédito Loja' },
  { codigo: '10', descricao: 'Vale Alimentação' },
  { codigo: '11', descricao: 'Vale Refeição' },
  { codigo: '15', descricao: 'Boleto Bancário' },
  { codigo: '17', descricao: 'PIX' },
  { codigo: '90', descricao: 'Sem Pagamento' },
  { codigo: '99', descricao: 'Outros' },
];

const MOD_FRETE_OPTIONS = [
  { value: '0', label: '0 – Por conta do Emitente (CIF)' },
  { value: '1', label: '1 – Por conta do Destinatário (FOB)' },
  { value: '2', label: '2 – Por conta de Terceiros' },
  { value: '3', label: '3 – Próprio por conta do Remetente' },
  { value: '4', label: '4 – Próprio por conta do Destinatário' },
  { value: '9', label: '9 – Sem Frete' },
];

const FINALIDADES = [
  { value: '1', label: '1 – NF-e Normal' },
  { value: '2', label: '2 – NF-e Complementar' },
  { value: '3', label: '3 – NF-e de Ajuste' },
  { value: '4', label: '4 – Devolução de Mercadoria' },
];

const IND_IE_DEST = [
  { value: '1', label: '1 – Contribuinte ICMS' },
  { value: '2', label: '2 – Contribuinte Isento' },
  { value: '9', label: '9 – Não Contribuinte' },
];

const FORM_VAZIO: Omit<Nfe, 'id' | 'empresaId' | 'serie' | 'numero' | 'dataEmissao' | 'status'> = {
  naturezaOperacao: 'VENDA',
  finalidade: '1',
  consumidorFinal: '0',
  presencaComprador: '1',
  valorProdutos: 0,
  valorDesconto: 0,
  valorFrete: 0,
  valorSeguro: 0,
  valorOutras: 0,
  valorIPI: 0,
  valorICMS: 0,
  valorPIS: 0,
  valorCOFINS: 0,
  valorTotal: 0,
  informacoesAdicionais: '',
  finalidadeCompra: '1',
  itens: [],
  pagamentos: [],
  transporte: { modFrete: '9', volumes: [] },
  destinatario: undefined,
};

// ─── BrDecimalInput ──────────────────────────────────────────────────────────
const BrDecimalInput: React.FC<{
  value: number;
  onChange: (val: number) => void;
  className?: string;
  placeholder?: string;
  decimals?: number;
}> = ({ value, onChange, className, placeholder, decimals = 2 }) => {
  const [editing, setEditing] = React.useState(false);
  const [raw, setRaw] = React.useState('');
  const fmt = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return (
    <input
      type="text"
      inputMode="decimal"
      value={editing ? raw : fmt(value)}
      className={className}
      placeholder={placeholder}
      onFocus={e => { setEditing(true); setRaw(fmt(value)); e.target.select(); }}
      onChange={e => setRaw(e.target.value)}
      onBlur={() => { const v = parseFloat(raw.replace(/\./g, '').replace(',', '.')) || 0; onChange(v); setEditing(false); setRaw(''); }}
    />
  );
};

// ─── Componente principal ────────────────────────────────────────────────────

const NfeDashboard: React.FC<Props> = ({
  emitente, clientes, produtos, transportadores,
  showAlert, onEmitted
}) => {
  // Controle de Abas
  const [activeSubTab, setActiveSubTab] = useState<'identificacao' | 'produtos' | 'transporte' | 'pagamento' | 'emitir'>('identificacao');
  
  // Formulário
  const [form, setForm] = useState({ ...FORM_VAZIO });
  const refBuscaProduto = React.useRef<HTMLInputElement>(null);
  const refBuscaCliente = React.useRef<HTMLInputElement>(null);
  const [clienteSel, setClienteSel] = useState<Cliente | null>(null);
  const [indIEDest, setIndIEDest] = useState<'1' | '2' | '9'>('9');
  const [ieDest, setIeDest] = useState('');
  const [itens, setItens] = useState<NfeItem[]>([]);
  const [pagamentos, setPagamentos] = useState<NfePagamento[]>([]);
  const [parcelamentoIdx, setParcelamentoIdx] = useState<number | null>(null);
  const [transporte, setTransporte] = useState<NfeTransporte>({ modFrete: '9', transportadorId: null, volumes: [] });
  const [volumes, setVolumes] = useState<NfeVolume[]>([]);

  // Busca produto/cliente
  const [buscaCliente, setBuscaCliente] = useState('');
  const [buscaProduto, setBuscaProduto] = useState('');
  const [dropCliente, setDropCliente] = useState(false);
  const [dropProduto, setDropProduto] = useState(false);

  // Edição manual de impostos
  const [editingItemIdx, setEditingItemIdx] = useState<number | null>(null);
  const [localTaxTab, setLocalTaxTab] = useState<'PRODUTO' | 'ICMS' | 'IPI' | 'PIS' | 'COFINS' | 'REFORMA'>('PRODUTO');
  const [taxEditingField, setTaxEditingField] = useState<'base' | 'aliq' | 'val' | null>(null);
  const [taxEditingRaw, setTaxEditingRaw] = useState('');

  // Gatilho automático para emissão ao entrar na aba
  useEffect(() => {
    if (activeSubTab === 'emitir' && !emitindo && itens.length > 0) {
      emitirNfe();
    }
  }, [activeSubTab]);

  // Foco automático ao selecionar cliente ou mudar de aba
  useEffect(() => {
    if (clienteSel && activeSubTab === 'identificacao') {
      setTimeout(() => {
        setActiveSubTab('produtos');
      }, 300);
    }
  }, [clienteSel]);

  useEffect(() => {
    if (activeSubTab === 'produtos') {
      setTimeout(() => refBuscaProduto.current?.focus(), 100);
    }
  }, [activeSubTab]);

  // Emissão
  const [emitindo, setEmitindo] = useState(false);
  const [resultadoEmissao, setResultadoEmissao] = useState<{ sucesso: boolean; msg: string; chave?: string; protocolo?: string; numero?: number; xml?: string } | null>(null);
  const [xmlCopiado, setXmlCopiado] = useState(false);

  // TEF (SMARTPOS) — para NF-e: ativa se SMARTPOS estiver configurado, independente do estado
  type NfeTefState = { pagamentosIds: number[]; currentIndex: number; vendaId: number; numero: number };
  const [nfeTefState, setNfeTefState] = useState<NfeTefState | null>(null);
  const [modalAutManual, setModalAutManual] = useState<{ operadora: string; codigo: string; resolve: ((v: { operadora: string; codigo: string } | null) => void) } | null>(null);
  const [bandeiras, setBandeiras] = useState<any[]>([]);
  useEffect(() => { fetch('./api.php?action=bandeiras').then(r => r.json()).then(d => { if (Array.isArray(d)) setBandeiras(d); }).catch(() => {}); }, []);

  const handleDownloadXml = (base64: string, filename: string) => {
    const link = document.createElement('a');
    link.href = `data:application/xml;base64,${base64}`;
    link.download = filename;
    link.click();
  };

  // ── Cálculos automáticos ────────────────────────────────────────────────

  function round2(n: number) { return Math.round(n * 100) / 100; }

  const totaisBase = (() => {
    let vProd = 0, vDesc = 0, vIPI = 0, vICMS = 0, vPIS = 0, vCOFINS = 0;
    for (const it of itens) {
      const bruto = it.quantidade * it.valorUnitario;
      vProd   += bruto;
      vDesc   += it.valorDesconto ?? 0;
      
      // Se tiver valores manuais, usa eles, senão calcula
      vIPI    += it.valor_ipi    ?? ( (bruto - (it.valorDesconto ?? 0)) * ((it.ipiAliquota ?? 0) / 100) );
      vICMS   += it.valor_icms   ?? ( (bruto - (it.valorDesconto ?? 0)) * ((it.icmsAliquota ?? 0) / 100) );
      vPIS    += it.valor_pis    ?? ( (bruto - (it.valorDesconto ?? 0)) * ((it.pisAliquota ?? 0) / 100) );
      vCOFINS += it.valor_cofins ?? ( (bruto - (it.valorDesconto ?? 0)) * ((it.cofinsAliquota ?? 0) / 100) );
    }
    return {
      valorProdutos: round2(vProd),
      valorDesconto: round2(vDesc),
      valorIPI:      round2(vIPI),
      valorICMS:     round2(vICMS),
      valorPIS:      round2(vPIS),
      valorCOFINS:   round2(vCOFINS),
    };
  })();

  const totalNF = round2(
    totaisBase.valorProdutos
    - totaisBase.valorDesconto
    + (form.valorFrete ?? 0)
    + (form.valorSeguro ?? 0)
    + (form.valorOutras ?? 0)
    + (Number(form.valorIPI) || 0)
  );
  const totalPago = pagamentos.reduce((s, p) => s + p.valorPagamento, 0);

  // ── Adicionar item ──────────────────────────────────────────────────────

  function adicionarProduto(p: Produto) {
    const novoItem: NfeItem = {
      produtoId:        p.id!,
      codigoInterno:    p.codigoInterno,
      descricao:        p.descricao,
      ncm:              p.ncm,
      cfop:             p.cfop ?? '5102',
      unidadeComercial: p.unidadeComercial,
      ean:              p.ean,
      origemMercadoria: p.origemMercadoria,
      icmsCstCsosn:     p.icmsCstCsosn,
      icmsAliquota:     p.icmsAliquota ?? 0,
      pisCst:           p.pisCst ?? '07',
      pisAliquota:      p.pisAliquota ?? 0,
      cofinsCst:        p.cofinsCst ?? '07',
      cofinsAliquota:   p.cofinsAliquota ?? 0,
      ipiCst:           '',
      ipiAliquota:      0,
      quantidade:       1,
      valorUnitario:    p.valorUnitario,
      valorDesconto:    0,
      valorTotal:       p.valorUnitario,
      cbsCst:           p.cbsCst ?? '',
      cbsClasstrib:     p.cbsClasstrib ?? '',
    };
    setItens(prev => [...prev, novoItem]);
    setBuscaProduto('');
    setDropProduto(false);
  }

  function atualizarItem(idx: number, campo: keyof NfeItem, valor: any) {
    setItens(prev => prev.map((it, i) => {
      if (i !== idx) return it;
      let finalVal = valor;
      if (campo === 'quantidade') finalVal = Math.max(1, Number(valor));
      const upd = { ...it, [campo]: finalVal } as NfeItem;
      // Recalcula totais apenas se não for campo manual de imposto
      if (['quantidade', 'valorUnitario', 'valorDesconto'].includes(campo as string)) {
        upd.valorTotal = round2(upd.quantidade * upd.valorUnitario - (upd.valorDesconto ?? 0));
        // Reset de manuais para forçar recalculo automático se desejar, ou mantém
      }
      return upd;
    }));
  }

  function removerItem(idx: number) {
    setItens(prev => prev.filter((_, i) => i !== idx));
  }

  // ── Pagamento ───────────────────────────────────────────────────────────

  function adicionarPagamento() {
    setPagamentos(prev => [...prev, { formaPagamento: '01', valorPagamento: round2(totalNF - totalPago) }]);
  }

  function atualizarPagamento(idx: number, campo: keyof NfePagamento, valor: any) {
    setPagamentos(prev => prev.map((p, i) => i === idx ? { ...p, [campo]: valor } : p));
  }

  function removerPagamento(idx: number) {
    setPagamentos(prev => prev.filter((_, i) => i !== idx));
  }

  // ── Volume ──────────────────────────────────────────────────────────────

  function adicionarVolume() {
    setVolumes(prev => [...prev, { qVol: 1, esp: '', marca: '', pesoL: 0, pesoB: 0 }]);
  }

  function atualizarVolume(idx: number, campo: keyof NfeVolume, valor: any) {
    setVolumes(prev => prev.map((v, i) => i === idx ? { ...v, [campo]: valor } : v));
  }

  // ── Emissão ─────────────────────────────────────────────────────────────

  async function emitirNfe() {
    if (!clienteSel) { showAlert('Atenção', 'Selecione o destinatário.'); return; }
    if (itens.length === 0) { showAlert('Atenção', 'Adicione ao menos um produto.'); return; }
    if (pagamentos.length === 0) { showAlert('Atenção', 'Informe a forma de pagamento.'); return; }

    const totalPagoCheck = pagamentos.reduce((s, p) => s + Number(p.valorPagamento), 0);
    console.log('Validação Totais:', { totalNF, totalPagoCheck });

    if (Math.abs(totalPagoCheck - totalNF) > 0.02) {
      showAlert('Atenção', `O valor total dos pagamentos (R$ ${totalPagoCheck.toFixed(2)}) deve ser igual ao total da nota (R$ ${totalNF.toFixed(2)}).`);
      return;
    }

    const hasTefPayment = pagamentos.some(p => ['03', '04', '17'].includes(p.formaPagamento));

    setEmitindo(true);
    setResultadoEmissao(null);
    try {
      const clientePayload = { ...clienteSel, indIEDest, ie: ieDest };
      const body = {
        venda: {
          naturezaOperacao:    form.naturezaOperacao,
          finalidade:          form.finalidade,
          consumidorFinal:     form.consumidorFinal,
          presencaComprador:   form.presencaComprador,
          valorTotal:          totalNF,
          valorDesconto:       totaisBase.valorDesconto,
          valorFrete:          form.valorFrete ?? 0,
          valorSeguro:         form.valorSeguro ?? 0,
          valorOutras:         form.valorOutras ?? 0,
          valorIPI:            totaisBase.valorIPI,
          valorICMS:           totaisBase.valorICMS,
          valorPIS:            totaisBase.valorPIS,
          valorCOFINS:         totaisBase.valorCOFINS,
          vbcICMS:             totaisBase.valorProdutos - totaisBase.valorDesconto,
          vbcPIS:              totaisBase.valorProdutos - totaisBase.valorDesconto,
          vbcCOFINS:           totaisBase.valorProdutos - totaisBase.valorDesconto,
          vbcIPI:              totaisBase.valorProdutos - totaisBase.valorDesconto,
          informacoesAdicionais: (() => {
            const base = form.informacoesAdicionais.trim();
            const geraCredito = (emitente.crt === '1' || emitente.crt === '2')
              && emitente.gerarCreditoSimples
              && (emitente.aliquotaCreditoSimples ?? 0) > 0;
            if (!geraCredito) return base;
            const aliq  = emitente.aliquotaCreditoSimples!;
            const valor = round2(totalNF * aliq / 100);
            const fmtBrl = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const msg = `PERMITE O APROVEITAMENTO DO CRÉDITO DE ICMS NO VALOR DE R$ ${fmtBrl(valor)} CORRESPONDENTE À ALÍQUOTA DE ${fmtBrl(aliq)}%, NOS TERMOS DO ART. 23 DA LC 123.`;
            return base ? `${base}\n${msg}` : msg;
          })(),
          itens:    itens.map(it => {
            const base = it.vbc_icms ?? round2((it.quantidade * it.valorUnitario) - (it.valorDesconto ?? 0));
            return {
              produtoId:    it.produtoId,
              quantidade:   it.quantidade,
              valorUnitario: it.valorUnitario,
              valorTotal:   it.valorTotal,
              valorDesconto: it.valorDesconto ?? 0,
              percentualTributosNacional: it.percentualTributosNacional ?? 0,
              percentualTributosEstadual: it.percentualTributosEstadual ?? 0,
              vbc_icms:     base,
              aliq_icms:    it.icmsAliquota ?? 0,
              valor_icms:   it.valor_icms ?? round2(base * ((it.icmsAliquota ?? 0)/100)),
              vbc_pis:      it.vbc_pis ?? base,
              aliq_pis:     it.pisAliquota ?? 0,
              valor_pis:    it.valor_pis ?? round2(base * ((it.pisAliquota ?? 0)/100)),
              vbc_cofins:   it.vbc_cofins ?? base,
              aliq_cofins:  it.cofinsAliquota ?? 0,
              valor_cofins: it.valor_cofins ?? round2(base * ((it.cofinsAliquota ?? 0)/100)),
              vbc_ipi:      it.vbc_ipi ?? base,
              aliq_ipi:     it.ipiAliquota ?? 0,
              valor_ipi:    it.valor_ipi ?? round2(base * ((it.ipiAliquota ?? 0)/100)),
              ncm:          it.ncm,
              cfop:         it.cfop,
              unidade:      it.unidadeComercial,
              origem:       it.origemMercadoria,
              cbsCst:       it.cbsCst,
              cbsClasstrib: it.cbsClasstrib,
            };
          }),
          pagamentos: pagamentos.map(p => ({
            formaPagamento: p.formaPagamento,
            valorPagamento: Number(p.valorPagamento),
            vencimentos: p.vencimentos ?? [],
          })),
        },
        cliente: clientePayload,
        transporte: {
          modFrete:        transporte.modFrete,
          transportadorId: transporte.transportadorId ?? null,
          volumes:         volumes,
        },
      };

      // ── Fluxo TEF: verifica tem_tef antes de emitir ──────────────────
      if (hasTefPayment) {
        const spResp = await fetch('api.php?action=tem_smartpos');
        const spData = await spResp.json();
        if (spData.tem) {
          // TEF ativo: salvar pendente e abrir fluxo SmartPOS
          const resp = await fetch('api.php?action=nfe_salvar_pendente', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          const d = await resp.json();
          if (!d.success) { showAlert('Erro', d.message || 'Erro ao salvar NF-e.'); setEmitindo(false); return; }
          setNfeTefState({ pagamentosIds: d.pagamentosIds ?? [d.pagamentoId], currentIndex: 0, vendaId: d.vendaId, numero: d.numero });
          setEmitindo(false);
          return;
        } else {
          // Sem TEF: cartão exige autorização manual, PIX finaliza direto
          const temCartao = pagamentos.some(p => ['03', '04'].includes(p.formaPagamento));
          if (temCartao) {
            setEmitindo(false);
            const autManual = await new Promise<{ operadora: string; codigo: string } | null>(resolve => {
              setModalAutManual({ operadora: '', codigo: '', resolve });
            });
            if (!autManual) return;
            setEmitindo(true);
            body.pagamentos = body.pagamentos.map((p: any) =>
              ['03', '04'].includes(p.formaPagamento)
                ? { ...p, tpIntegra: '2', cAut: autManual.codigo }
                : p
            );
          }
          // PIX: sem card no XML
          body.pagamentos = body.pagamentos.map((p: any) =>
            p.formaPagamento === '17'
              ? { ...p, tpIntegra: '2', tBand: null, cAut: null }
              : p
          );
        }
      }

      // ── Emissão direta (sem TEF ou SMARTPOS não configurado) ───────────
      console.log('Iniciando envio da NF-e...', body);

      const res  = await fetch('api.php?action=nfe_emitir', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
      const data = await res.json();
      console.log('Resposta da API:', data);

      if (data.success) {
        setResultadoEmissao({ sucesso: true, msg: 'NF-e emitida com sucesso!', chave: data.chaveAcesso, protocolo: data.protocolo, numero: data.numero, xml: data.xml });
        resetFormulario();
        if (onEmitted) onEmitted(data.chaveAcesso, data.id);
      } else {
        const errorMsg = data.message ?? 'Erro desconhecido na emissão.';
        setResultadoEmissao({ sucesso: false, msg: errorMsg, xml: data.xml });
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e: any) {
      console.error('Erro na emissão:', e);
      setResultadoEmissao({ sucesso: false, msg: 'Falha de comunicação: ' + e.message });
    }
    setEmitindo(false);
  }

  // Após aprovação TEF: emite a NF-e salva no banco
  const handleNfeTefComplete = async (vendaId: number) => {
    try {
      const resp = await fetch(`api.php?action=nfe_emitir_pendente&id=${vendaId}`);
      const result = await resp.json();
      setNfeTefState(null);
      if (result.success) {
        setResultadoEmissao({ sucesso: true, msg: 'NF-e emitida com sucesso!', chave: result.chaveAcesso, protocolo: result.protocolo, numero: result.numero });
        resetFormulario();
        if (onEmitted) onEmitted(result.chaveAcesso, result.id);
      } else {
        setResultadoEmissao({ sucesso: false, msg: result.message || 'Erro na emissão após aprovação TEF.' });
      }
    } catch {
      setNfeTefState(null);
      setResultadoEmissao({ sucesso: false, msg: 'Falha de comunicação ao emitir NF-e.' });
    }
  };

  function resetFormulario() {
    setForm({ ...FORM_VAZIO });
    setClienteSel(null);
    setIndIEDest('9');
    setIeDest('');
    setItens([]);
    setPagamentos([]);
    setTransporte({ modFrete: '9', transportadorId: null, volumes: [] });
    setVolumes([]);
    setBuscaCliente('');
    setBuscaProduto('');
    setActiveSubTab('identificacao');
  }

  // ── Helpers de filtro ────────────────────────────────────────────────────

  const clientesFiltrados = clientes.filter(c =>
    !buscaCliente || c.nome.toLowerCase().includes(buscaCliente.toLowerCase()) || c.documento.includes(buscaCliente)
  ).slice(0, 10);

  const produtosFiltrados = produtos.filter(p =>
    !buscaProduto || p.descricao.toLowerCase().includes(buscaProduto.toLowerCase()) || p.codigoInterno.includes(buscaProduto)
  ).slice(0, 10);

  return (
    <>
    <div className="space-y-4">
      {/* Resultado emissão */}
      <FormAlert
        message={resultadoEmissao?.msg}
        severity={resultadoEmissao?.sucesso ? 'success' : 'error'}
        theme="light"
        dismissible
        onDismiss={() => setResultadoEmissao(null)}
      >
        {resultadoEmissao?.chave && (
          <p className="text-gray-600 mt-1 font-mono text-xs break-all">Chave: {resultadoEmissao.chave}</p>
        )}
        {resultadoEmissao?.protocolo && (
          <p className="text-gray-600 text-xs">Protocolo: {resultadoEmissao.protocolo} | Nº {resultadoEmissao.numero}</p>
        )}
        {resultadoEmissao?.xml && (
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-current/20">
            <button
              onClick={() => handleDownloadXml(resultadoEmissao.xml!, `NFe_Analise_${resultadoEmissao.numero || 'Debug'}.xml`)}
              className="flex items-center gap-1.5 text-blue-700 hover:text-blue-900 font-bold text-xs uppercase transition-all"
            >
              <Download className="w-3.5 h-3.5" /> Baixar XML
            </button>
            <button
              onClick={() => {
                const xmlText = atob(resultadoEmissao.xml!);
                navigator.clipboard.writeText(xmlText);
                setXmlCopiado(true);
              }}
              className="flex items-center gap-1.5 text-blue-700 hover:text-blue-900 font-bold text-xs uppercase transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Copiar Texto XML
            </button>
          </div>
        )}
      </FormAlert>
      <FormAlert
        message={xmlCopiado ? 'XML copiado para a área de transferência.' : null}
        severity="success"
        theme="light"
        autoDismissMs={3000}
        onDismiss={() => setXmlCopiado(false)}
      />

      {/* Tabs Navigation */}
      <div className="sticky top-0 z-10 bg-white py-2">
        <div className="flex flex-wrap items-center gap-2 p-1 bg-gray-100 rounded-xl border border-gray-200">
          {[
            { id: 'identificacao', label: '1. Identificação', icon: User },
            { id: 'produtos',      label: '2. Produtos',      icon: Package },
            { id: 'transporte',    label: '3. Transporte',    icon: Truck },
            { id: 'pagamento',     label: '4. Pagamento',     icon: CreditCard },
            { id: 'emitir',        label: '5. Emitir NFe',    icon: Send },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                activeSubTab === tab.id 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-gray-500 hover:bg-white hover:text-blue-600'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        {/* ── Aba 1: Identificação ────────────────────────────────────── */}
        {activeSubTab === 'identificacao' && (
          <div className="space-y-4">
            <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-base font-semibold text-gray-800 mb-6 flex items-center gap-2 border-b border-gray-100 pb-3">
                <User className="w-5 h-5 text-blue-600" /> Destinatário (Cliente)
              </h3>
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={refBuscaCliente}
                  value={buscaCliente}
                  onChange={e => { setBuscaCliente(e.target.value); setDropCliente(true); }}
                  onFocus={() => setDropCliente(true)}
                  placeholder="Buscar por nome ou CPF/CNPJ..."
                  className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none shadow-sm"
                />
                {dropCliente && clientesFiltrados.length > 0 && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                    {clientesFiltrados.map(c => (
                      <button key={c.id} onClick={() => { 
                        setClienteSel(c); 
                        setBuscaCliente(c.nome); 
                        setDropCliente(false);
                        const doc = c.documento?.replace(/\D/g, '') || '';
                        const hasIe = !!(c.ie && c.ie.trim() && c.ie.toUpperCase() !== 'ISENTO');
                        if (doc.length === 14 && hasIe) {
                          setIndIEDest('1');
                          setIeDest(c.ie);
                        } else if (c.ie && c.ie.toUpperCase() === 'ISENTO') {
                          setIndIEDest('2');
                          setIeDest('');
                        } else {
                          setIndIEDest('9');
                          setIeDest('');
                          setForm(f => ({ ...f, consumidorFinal: '1' }));
                        }
                      }}
                        className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0">
                        <p className="font-semibold text-gray-700 text-sm">{c.nome}</p>
                        <p className="text-gray-400 text-xs">{c.documento} · {c.endereco?.municipio}/{c.endereco?.uf}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {clienteSel ? (
                <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 flex flex-wrap gap-6 items-start">
                  <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-200">
                    <User className="w-8 h-8 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex justify-between">
                      <p className="text-lg font-semibold text-gray-800">{clienteSel.nome}</p>
                      <button onClick={() => { setClienteSel(null); setBuscaCliente(''); }} className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <p className="text-sm font-medium text-gray-500 mb-4">{clienteSel.documento}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Tipo de Tributação</label>
                        <select value={indIEDest} 
                          onChange={e => {
                            const val = e.target.value as any;
                            setIndIEDest(val);
                            // Regra SEFAZ: Se indIEDest=9 (Não contrib.), indFinal deve ser 1 (Cons. Final)
                            if (val === '9') setForm(f => ({ ...f, consumidorFinal: '1' }));
                          }}
                          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs bg-white outline-none focus:ring-1 focus:ring-blue-500">
                          {IND_IE_DEST.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                      {indIEDest === '1' && (
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Inscrição Estadual</label>
                          <input value={ieDest} onChange={e => setIeDest(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Somente números" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 border-2 border-dashed border-gray-100 rounded-2xl">
                  <User className="w-12 h-12 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Nenhum cliente selecionado</p>
                </div>
              )}
            </section>

            <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-base font-semibold text-gray-800 mb-6 flex items-center gap-2 border-b border-gray-100 pb-3">
                <FileText className="w-5 h-5 text-blue-600" /> Operação e Finalidade
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">Finalidade da Compra</label>
                  <select value={form.finalidadeCompra || '1'} onChange={e => setForm(f => ({ ...f, finalidadeCompra: e.target.value as any }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm bg-white">
                    <option value="1">Revenda / Industrialização</option>
                    <option value="2">Uso e Consumo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">Natureza da Operação</label>
                  <input value={form.naturezaOperacao}
                    onChange={e => setForm(f => ({ ...f, naturezaOperacao: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                    placeholder="Ex: VENDA" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">Finalidade NF-e</label>
                  <select value={form.finalidade} onChange={e => setForm(f => ({ ...f, finalidade: e.target.value as any }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm bg-white">
                    {FINALIDADES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">Consumidor Final</label>
                  <select value={form.consumidorFinal} onChange={e => setForm(f => ({ ...f, consumidorFinal: e.target.value as any }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm bg-white">
                    <option value="0">0 – Normal (B2B)</option>
                    <option value="1">1 – Consumidor Final</option>
                  </select>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ── Aba 2: Produtos ─────────────────────────────────────────── */}
        {activeSubTab === 'produtos' && (
          <div className="space-y-4">
            <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center gap-4 mb-6">
                <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2 shrink-0">
                  <Package className="w-5 h-5 text-blue-600" /> Itens da Nota
                </h3>
                <div className="relative flex-1 max-w-xl">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    ref={refBuscaProduto}
                    value={buscaProduto}
                    onChange={e => { setBuscaProduto(e.target.value); setDropProduto(true); } }
                    onFocus={() => setDropProduto(true)}
                    placeholder="Buscar produto..."
                    className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-base outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 shadow-sm transition-all"
                  />
                  {dropProduto && produtosFiltrados.length > 0 && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                      {produtosFiltrados.map(p => (
                        <button key={p.id} onClick={() => adicionarProduto(p)}
                          className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0 flex justify-between items-center">
                          <div>
                            <p className="font-semibold text-gray-700 text-sm">{p.descricao}</p>
                            <p className="text-gray-400 text-[11px] font-medium">{p.codigoInterno} · NCM {p.ncm} · <span className={p.estoque && p.estoque > 0 ? "text-green-600" : "text-red-500"}>Estoque: {p.estoque ?? 0}</span></p>
                          </div>
                          <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-1 rounded-lg">R$ {p.valorUnitario.toFixed(2)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {itens.length > 0 ? (
                <div className="overflow-x-auto -mx-6">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-xs font-semibold border-y border-gray-100">
                        <th className="text-left px-6 py-3">Produto</th>
                        <th className="text-center px-4 py-3">Qtd</th>
                        <th className="text-center px-4 py-3">Vl. Unit</th>
                        <th className="text-center px-4 py-3">Subtotal</th>
                        <th className="text-center px-4 py-3">Total</th>
                        <th className="text-right px-6 py-3">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {itens.map((it, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 transition-colors group">
                          <td className="px-6 py-4">
                            <p className="font-semibold text-gray-700 text-sm">{it.descricao}</p>
                            <p className="text-xs text-gray-400 font-medium tracking-tight">NCM {it.ncm} · CFOP {it.cfop}</p>
                          </td>
                          <td className="px-4 py-4 w-24">
                            <BrDecimalInput value={it.quantidade} decimals={3} onChange={v => atualizarItem(idx, 'quantidade', v)}
                              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-center text-sm outline-none focus:ring-1 focus:ring-blue-500" />
                          </td>
                          <td className="px-4 py-4 w-28">
                            <BrDecimalInput value={it.valorUnitario} onChange={v => atualizarItem(idx, 'valorUnitario', v)}
                              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-center text-sm outline-none focus:ring-1 focus:ring-blue-500 font-medium text-blue-600" />
                          </td>
                          <td className="px-4 py-4 text-center text-xs text-gray-500">
                            R$ {(it.quantidade * it.valorUnitario).toFixed(2)}
                          </td>
                          <td className="px-4 py-4 text-center font-bold text-gray-800 text-sm">
                            R$ {it.valorTotal.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setEditingItemIdx(editingItemIdx === idx ? null : idx)}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                title="Editar Impostos">
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button onClick={() => removerItem(idx)}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                title="Remover">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Package className="w-10 h-10 text-gray-300" />
                  </div>
                  <p className="text-gray-400 font-medium">Nenhum produto na lista</p>
                </div>
              )}
            </section>

            {/* Modal de Edição Fiscal do Item */}
            {editingItemIdx !== null && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-5 text-white flex justify-between items-center shrink-0">
                    <div>
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Edit3 className="w-5 h-5" /> Ajuste Fiscal do Item
                      </h3>
                      <p className="text-blue-100 text-sm font-medium mt-0.5">{itens[editingItemIdx].descricao}</p>
                    </div>
                    <button onClick={() => setEditingItemIdx(null)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="p-6 overflow-y-auto flex-1">
                    {/* Tabs: Produto | ICMS | IPI | PIS | COFINS | Reforma */}
                    <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-6">
                      {['PRODUTO', 'ICMS', 'IPI', 'PIS', 'COFINS', 'REFORMA'].map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setLocalTaxTab(tab as any)}
                          className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all ${
                            localTaxTab === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          {tab === 'PRODUTO' ? 'Produto' : tab === 'REFORMA' ? 'Reforma' : tab}
                        </button>
                      ))}
                    </div>

                    {/* ── Aba PRODUTO ── */}
                    {localTaxTab === 'PRODUTO' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block">NCM</label>
                          <input
                            type="text" value={itens[editingItemIdx].ncm ?? ''}
                            onChange={e => atualizarItem(editingItemIdx, 'ncm', e.target.value)}
                            className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-xl px-4 py-3 text-sm font-medium text-gray-700 outline-none transition-all"
                            placeholder="00000000" maxLength={8}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block">CFOP</label>
                          <input
                            type="text" value={itens[editingItemIdx].cfop ?? ''}
                            onChange={e => atualizarItem(editingItemIdx, 'cfop', e.target.value)}
                            className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-xl px-4 py-3 text-sm font-medium text-gray-700 outline-none transition-all"
                            placeholder="5102" maxLength={4}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block">CST/CSOSN (ICMS)</label>
                          <input
                            type="text" value={itens[editingItemIdx].icmsCstCsosn ?? ''}
                            onChange={e => atualizarItem(editingItemIdx, 'icmsCstCsosn', e.target.value)}
                            className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-xl px-4 py-3 text-sm font-medium text-gray-700 outline-none transition-all"
                            placeholder="102" maxLength={3}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block">Origem da Mercadoria</label>
                          <select
                            value={itens[editingItemIdx].origemMercadoria ?? '0'}
                            onChange={e => atualizarItem(editingItemIdx, 'origemMercadoria', e.target.value)}
                            className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-xl px-4 py-3 text-sm font-medium text-gray-700 outline-none transition-all"
                          >
                            <option value="0">0 – Nacional</option>
                            <option value="1">1 – Estrangeira (imp. direta)</option>
                            <option value="2">2 – Estrangeira (merc. interno)</option>
                            <option value="3">3 – Nacional c/ 40-70% importado</option>
                            <option value="5">5 – Nacional c/ importação inferior a 40%</option>
                            <option value="8">8 – Nacional, importação superior a 70%</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block">CST PIS</label>
                          <input
                            type="text" value={itens[editingItemIdx].pisCst ?? ''}
                            onChange={e => atualizarItem(editingItemIdx, 'pisCst', e.target.value)}
                            className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-xl px-4 py-3 text-sm font-medium text-gray-700 outline-none transition-all"
                            placeholder="07" maxLength={2}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block">CST COFINS</label>
                          <input
                            type="text" value={itens[editingItemIdx].cofinsCst ?? ''}
                            onChange={e => atualizarItem(editingItemIdx, 'cofinsCst', e.target.value)}
                            className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-xl px-4 py-3 text-sm font-medium text-gray-700 outline-none transition-all"
                            placeholder="07" maxLength={2}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block">CST IPI</label>
                          <input
                            type="text" value={itens[editingItemIdx].ipiCst ?? ''}
                            onChange={e => atualizarItem(editingItemIdx, 'ipiCst', e.target.value)}
                            className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-xl px-4 py-3 text-sm font-medium text-gray-700 outline-none transition-all"
                            placeholder="99" maxLength={2}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block">Unidade Comercial</label>
                          <input
                            type="text" value={itens[editingItemIdx].unidadeComercial ?? ''}
                            onChange={e => atualizarItem(editingItemIdx, 'unidadeComercial', e.target.value.toUpperCase())}
                            className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-xl px-4 py-3 text-sm font-medium text-gray-700 outline-none transition-all"
                            placeholder="UN" maxLength={6}
                          />
                        </div>
                      </div>
                    )}

                    {/* ── Aba REFORMA ── */}
                    {localTaxTab === 'REFORMA' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block">CST CBS/IBS</label>
                          <input
                            type="text" value={itens[editingItemIdx].cbsCst ?? ''}
                            onChange={e => atualizarItem(editingItemIdx, 'cbsCst', e.target.value)}
                            className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-xl px-4 py-3 text-sm font-medium text-gray-700 outline-none transition-all"
                            placeholder="00" maxLength={2}
                          />
                          <p className="text-[10px] text-gray-400">Deixe vazio para não enviar IBS/CBS</p>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block">cClassTrib (Classificação Tributária)</label>
                          <input
                            type="text" value={itens[editingItemIdx].cbsClasstrib ?? ''}
                            onChange={e => atualizarItem(editingItemIdx, 'cbsClasstrib', e.target.value)}
                            className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-xl px-4 py-3 text-sm font-medium text-gray-700 outline-none transition-all"
                            placeholder="Ex: 0000000"
                          />
                        </div>
                        <div className="md:col-span-2 bg-blue-50 rounded-xl p-4 border border-blue-100">
                          <p className="text-xs text-blue-700 font-medium">As alíquotas CBS/IBS são configuradas na tela de Parâmetros RTC (Reforma Tributária). Aqui você ajusta apenas o CST e cClassTrib por item.</p>
                        </div>
                      </div>
                    )}

                    {/* ── Abas de Impostos (ICMS, IPI, PIS, COFINS) ── */}
                    {['ICMS', 'IPI', 'PIS', 'COFINS'].includes(localTaxTab) && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Base de Cálculo */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block">Base de Cálculo</label>
                          <BrDecimalInput 
                            value={
                              localTaxTab === 'ICMS' ? (itens[editingItemIdx].vbc_icms ?? 0) :
                              localTaxTab === 'IPI'  ? (itens[editingItemIdx].vbc_ipi ?? 0) :
                              localTaxTab === 'PIS'  ? (itens[editingItemIdx].vbc_pis ?? 0) :
                              (itens[editingItemIdx].vbc_cofins ?? 0)
                            }
                            onChange={val => {
                              const fBase = localTaxTab === 'ICMS' ? 'vbc_icms' : localTaxTab === 'IPI' ? 'vbc_ipi' : localTaxTab === 'PIS' ? 'vbc_pis' : 'vbc_cofins';
                              const fAliq = localTaxTab === 'ICMS' ? 'icmsAliquota' : localTaxTab === 'IPI' ? 'ipiAliquota' : localTaxTab === 'PIS' ? 'pisAliquota' : 'cofinsAliquota';
                              const fVal  = localTaxTab === 'ICMS' ? 'valor_icms'  : localTaxTab === 'IPI' ? 'valor_ipi'  : localTaxTab === 'PIS' ? 'valor_pis'  : 'valor_cofins';
                              atualizarItem(editingItemIdx, fBase as any, val);
                              const aliq = (itens[editingItemIdx][fAliq as keyof NfeItem] as number) ?? 0;
                              atualizarItem(editingItemIdx, fVal as any, round2(val * (aliq / 100)));
                            }}
                            className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-xl px-4 py-3.5 text-gray-700 font-semibold outline-none transition-all"
                          />
                        </div>

                        {/* Alíquota */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block">Alíquota (%)</label>
                          <BrDecimalInput 
                            value={
                              localTaxTab === 'ICMS' ? (itens[editingItemIdx].icmsAliquota ?? 0) :
                              localTaxTab === 'IPI'  ? (itens[editingItemIdx].ipiAliquota ?? 0) :
                              localTaxTab === 'PIS'  ? (itens[editingItemIdx].pisAliquota ?? 0) :
                              (itens[editingItemIdx].cofinsAliquota ?? 0)
                            }
                            onChange={val => {
                              const fAliq = localTaxTab === 'ICMS' ? 'icmsAliquota' : localTaxTab === 'IPI' ? 'ipiAliquota' : localTaxTab === 'PIS' ? 'pisAliquota' : 'cofinsAliquota';
                              const fBase = localTaxTab === 'ICMS' ? 'vbc_icms' : localTaxTab === 'IPI' ? 'vbc_ipi' : localTaxTab === 'PIS' ? 'vbc_pis' : 'vbc_cofins';
                              const fVal  = localTaxTab === 'ICMS' ? 'valor_icms' : localTaxTab === 'IPI' ? 'valor_ipi' : localTaxTab === 'PIS' ? 'valor_pis' : 'valor_cofins';
                              atualizarItem(editingItemIdx, fAliq as any, val);
                              const base = (itens[editingItemIdx][fBase as keyof NfeItem] as number) ?? 0;
                              atualizarItem(editingItemIdx, fVal as any, round2(base * (val / 100)));
                            }}
                            className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-xl px-4 py-3.5 text-blue-600 font-semibold outline-none transition-all text-center"
                          />
                        </div>

                        {/* Valor do Imposto */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block">Valor do Imposto</label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">R$</span>
                            <input
                              type="text" inputMode="decimal"
                              value={taxEditingField === 'val' ? taxEditingRaw : (
                                localTaxTab === 'ICMS' ? (itens[editingItemIdx].valor_icms ?? 0) :
                                localTaxTab === 'IPI'  ? (itens[editingItemIdx].valor_ipi ?? 0) :
                                localTaxTab === 'PIS'  ? (itens[editingItemIdx].valor_pis ?? 0) :
                                (itens[editingItemIdx].valor_cofins ?? 0)
                              ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              onFocus={e => {
                                const cur = localTaxTab === 'ICMS' ? (itens[editingItemIdx].valor_icms ?? 0) : localTaxTab === 'IPI' ? (itens[editingItemIdx].valor_ipi ?? 0) : localTaxTab === 'PIS' ? (itens[editingItemIdx].valor_pis ?? 0) : (itens[editingItemIdx].valor_cofins ?? 0);
                                setTaxEditingField('val'); setTaxEditingRaw(cur.toLocaleString('pt-BR', { minimumFractionDigits: 2 })); e.target.select();
                              }}
                              onChange={e => { if (taxEditingField === 'val') setTaxEditingRaw(e.target.value); }}
                              onBlur={() => {
                                if (taxEditingField !== 'val') return;
                                const val = parseFloat(taxEditingRaw.replace(/\./g, '').replace(',', '.')) || 0;
                                const fVal = localTaxTab === 'ICMS' ? 'valor_icms' : localTaxTab === 'IPI' ? 'valor_ipi' : localTaxTab === 'PIS' ? 'valor_pis' : 'valor_cofins';
                                atualizarItem(editingItemIdx, fVal as any, val);
                                setTaxEditingField(null);
                              }}
                              className="w-full bg-blue-50 border-2 border-blue-100 focus:border-blue-500 focus:bg-white rounded-xl pl-11 pr-4 py-3.5 text-blue-700 font-semibold outline-none transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mt-8 flex gap-4">
                      <button onClick={() => setEditingItemIdx(null)} className="flex-1 py-3.5 bg-gray-100 text-gray-600 font-semibold rounded-xl hover:bg-gray-200 transition-colors">
                        Cancelar
                      </button>
                      <button onClick={() => setEditingItemIdx(null)} className="flex-[2] py-3.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 flex items-center justify-center gap-2">
                        <Save className="w-5 h-5" /> Confirmar Ajustes
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-base font-semibold text-gray-800 mb-6 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-blue-600" /> Totais e Bases
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { label: 'Valor Produtos', val: totaisBase.valorProdutos, primary: false },
                  { label: '(-) Desconto',   val: totaisBase.valorDesconto, primary: false },
                  { label: 'BC ICMS',        val: totaisBase.valorProdutos - totaisBase.valorDesconto, primary: false },
                  { label: 'Total ICMS',     val: totaisBase.valorICMS, primary: true, color: 'blue' },
                  { label: 'Total IPI',      val: totaisBase.valorIPI, primary: true, color: 'orange' },
                  { label: 'PIS',            val: totaisBase.valorPIS, primary: false },
                  { label: 'COFINS',         val: totaisBase.valorCOFINS, primary: false },
                  { label: 'Outras Desp.',   val: (form.valorFrete ?? 0) + (form.valorSeguro ?? 0) + (form.valorOutras ?? 0), primary: false },
                ].map((item) => (
                  <div key={item.label} className={`rounded-xl p-3 border text-right ${item.primary ? 'bg-blue-50 border-blue-100 shadow-inner' : 'bg-white border-gray-100'}`}>
                    <p className="text-xs font-medium text-gray-400 mb-1">{item.label}</p>
                    <p className={`text-sm font-semibold ${item.primary ? 'text-blue-700' : 'text-gray-700'}`}>
                      R$ {item.val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                ))}
                <div className="bg-blue-600 rounded-xl p-4 text-white col-span-2 shadow-lg shadow-blue-200 text-right">
                  <p className="text-sm font-semibold opacity-90 mb-1">Total da Nota</p>
                  <p className="text-xl font-semibold">
                    R$ {totalNF.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="mt-8">
                <label className="block text-sm font-medium text-gray-500 mb-2">Informações Complementares (infCpl)</label>
                <textarea rows={4} value={form.informacoesAdicionais}
                  onChange={e => setForm(f => ({ ...f, informacoesAdicionais: e.target.value }))}
                  placeholder="Mensagens que sairão no corpo da nota..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm resize-none" />
                {(emitente.crt === '1' || emitente.crt === '2') && emitente.gerarCreditoSimples && (emitente.aliquotaCreditoSimples ?? 0) > 0 && (
                  <div className="mt-2 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                    <span className="font-semibold shrink-0 mt-0.5">Auto →</span>
                    <span>
                      PERMITE O APROVEITAMENTO DO CRÉDITO DE ICMS NO VALOR DE R$ {round2(totalNF * emitente.aliquotaCreditoSimples! / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} CORRESPONDENTE À ALÍQUOTA DE {(emitente.aliquotaCreditoSimples!).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}%, NOS TERMOS DO ART. 23 DA LC 123.
                    </span>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* ── Aba 3: Transporte ───────────────────────────────────────── */}
        {activeSubTab === 'transporte' && (
          <div className="space-y-4">
            <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-base font-semibold text-gray-800 mb-6 flex items-center gap-2 border-b border-gray-100 pb-3">
                <Truck className="w-5 h-5 text-blue-600" /> Detalhes do Transporte
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-500 mb-2">Modalidade do Frete</label>
                  <select value={transporte.modFrete}
                    onChange={e => setTransporte(t => ({ ...t, modFrete: e.target.value as any }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm bg-white">
                    {MOD_FRETE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                {transporte.modFrete !== '9' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-500 mb-2">Transportadora</label>
                    <select value={transporte.transportadorId ?? ''}
                      onChange={e => setTransporte(t => ({ ...t, transportadorId: e.target.value ? Number(e.target.value) : null }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm bg-white">
                      <option value="">-- Nenhuma selecionada --</option>
                      {transportadores.map(t => (
                        <option key={t.id} value={t.id}>{t.nome} — {t.documento}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">Frete (R$)</label>
                  <BrDecimalInput value={form.valorFrete ?? 0} onChange={v => setForm(f => ({ ...f, valorFrete: v }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm text-right" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2 text-right">Seguro (R$)</label>
                  <BrDecimalInput value={form.valorSeguro ?? 0} onChange={v => setForm(f => ({ ...f, valorSeguro: v }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm text-right" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2 text-right">Outras Despesas (R$)</label>
                  <BrDecimalInput value={form.valorOutras ?? 0} onChange={v => setForm(f => ({ ...f, valorOutras: v }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm text-right" />
                </div>
              </div>
            </section>

            <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600" /> Volumes e Carga
                </h3>
                <button onClick={adicionarVolume}
                  className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-xs font-semibold hover:bg-blue-100 transition-colors flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Adicionar Volume
                </button>
              </div>

              <div className="space-y-4">
                {volumes.map((vol, idx) => (
                  <div key={idx} className="relative bg-gray-50 rounded-2xl p-6 border border-gray-100 grid grid-cols-2 md:grid-cols-6 gap-4">
                    <button onClick={() => setVolumes(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute -top-3 -right-3 w-8 h-8 bg-white border border-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 shadow-sm transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="text-right">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Qtd</label>
                      <input type="number" value={vol.qVol ?? ''} onChange={e => atualizarVolume(idx, 'qVol', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-500 text-right" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-medium text-gray-400 uppercase mb-1">Espécie</label>
                      <input value={vol.esp ?? ''} onChange={e => atualizarVolume(idx, 'esp', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-gray-400 uppercase mb-1">Marca</label>
                      <input value={vol.marca ?? ''} onChange={e => atualizarVolume(idx, 'marca', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                    <div className="text-right">
                      <label className="block text-[10px] font-medium text-gray-400 uppercase mb-1">Peso Líq (kg)</label>
                      <BrDecimalInput value={vol.pesoL ?? 0} decimals={3} onChange={v => atualizarVolume(idx, 'pesoL', v)}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-500 text-right" />
                    </div>
                    <div className="text-right">
                      <label className="block text-[10px] font-medium text-gray-400 uppercase mb-1">Peso Bruto (kg)</label>
                      <BrDecimalInput value={vol.pesoB ?? 0} decimals={3} onChange={v => atualizarVolume(idx, 'pesoB', v)}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-500 text-right" />
                    </div>
                  </div>
                ))}
                {volumes.length === 0 && <p className="text-center py-6 text-gray-400 text-sm italic">Nenhum volume informado</p>}
              </div>
            </section>
          </div>
        )}

        {/* ── Aba 4: Pagamento ───────────────────────────────────────── */}
        {activeSubTab === 'pagamento' && (
          <div className="space-y-4">
            <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-600" /> Detalhamento Financeiro
                </h3>
                <button onClick={adicionarPagamento}
                  className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-xs font-semibold hover:bg-blue-100 transition-colors flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Adicionar Pagamento
                </button>
              </div>

              <div className="space-y-4 mb-8">
                {pagamentos.map((pag, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex gap-4 items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Forma de Pagamento</label>
                        <select value={pag.formaPagamento} onChange={e => atualizarPagamento(idx, 'formaPagamento', e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500/20">
                          {FORMAS_PAGAMENTO.map(f => <option key={f.codigo} value={f.codigo}>{f.codigo} – {f.descricao}</option>)}
                        </select>
                      </div>
                      <div className="w-48 text-right">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Valor (R$)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">R$</span>
                          <BrDecimalInput value={pag.valorPagamento} onChange={v => atualizarPagamento(idx, 'valorPagamento', v)}
                            className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500/20 shadow-inner text-right" />
                        </div>
                      </div>
                      {['05', '15'].includes(pag.formaPagamento) && (
                        <button onClick={() => setParcelamentoIdx(idx)} title="Gerar Parcelas"
                          className={`mt-5 p-2 rounded-xl transition-all active:scale-95 ${pag.vencimentos?.length ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100'}`}>
                          <CalendarDays className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => removerPagamento(idx)} className="mt-5 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {pag.vencimentos && pag.vencimentos.length > 0 && (
                      <div className="ml-4 flex flex-wrap gap-2">
                        {pag.vencimentos.map((v, i) => (
                          <span key={i} className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-2 py-0.5 font-medium">
                            {i + 1}/{pag.vencimentos!.length} · {v.vencimento.split('-').reverse().join('/')} · R$ {Number(v.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {pagamentos.length === 0 && <p className="text-center py-6 text-gray-400 text-sm italic">Nenhuma forma de pagamento vinculada</p>}
              </div>

              <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100 flex justify-between items-center">
                <div className="text-left">
                  <p className="text-sm font-semibold text-blue-700 mb-1">Cálculo de Fechamento</p>
                  <p className="text-sm font-medium text-blue-800">
                    Total NF: <span className="font-semibold">R$ {totalNF.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> | Total Informado: <span className="font-semibold">R$ {totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </p>
                </div>
                <div className={`px-4 py-2 rounded-xl text-sm font-medium ${Math.abs(totalPago - totalNF) < 0.02 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                  {Math.abs(totalPago - totalNF) < 0.02 ? '✓ Valores informados corretamente' : `Pendente R$ ${Math.abs(totalNF - totalPago).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ── Aba 5: Status de Emissão ───────────────────────────────────────── */}
        {activeSubTab === 'emitir' && (
          <div className="flex flex-col items-center justify-center min-h-[400px] animate-in fade-in zoom-in duration-500">
            {emitindo ? (
              <div className="text-center">
                <div className="relative mb-8">
                  <div className="w-24 h-24 border-4 border-green-100 border-t-green-600 rounded-full animate-spin mx-auto"></div>
                  <Send className="w-8 h-8 text-green-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Emitindo Nota Fiscal...</h3>
                <p className="text-gray-500">Aguarde a resposta da SEFAZ</p>
              </div>
            ) : (
              <div className="w-full">
                {/* O Banner de Resultado já é exibido no topo do componente se resultadoEmissao estiver preenchido */}
                {!resultadoEmissao && (
                  <div className="text-center">
                    <button onClick={emitirNfe} className="px-12 py-5 bg-green-600 text-white rounded-2xl font-bold text-xl hover:bg-green-700 transition-all">
                      TENTAR EMITIR NOVAMENTE
                    </button>
                    <button onClick={() => setActiveSubTab('pagamento')} className="block mx-auto mt-4 text-gray-400 hover:text-gray-600 font-medium">
                      Voltar e revisar dados
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>

    {/* ── Modal Parcelamento ───────────────────────────────────────────────── */}
    {parcelamentoIdx !== null && (
      <NfeParcelamentoModal
        total={pagamentos[parcelamentoIdx]?.valorPagamento ?? 0}
        inicial={pagamentos[parcelamentoIdx]?.vencimentos ?? []}
        onCancel={() => setParcelamentoIdx(null)}
        onConfirm={(parts) => {
          atualizarPagamento(parcelamentoIdx, 'vencimentos', parts);
          setParcelamentoIdx(null);
        }}
      />
    )}

    {/* ── TEF Modal (SMARTPOS) ───────────────────────────────────────────── */}
    {modalAutManual && (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[2000]">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">Pagamento com Cartão</h3>
              <p className="text-xs text-gray-400">Informe os dados da transação</p>
            </div>
          </div>
          <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-5 mt-2">
            Integração TEF não ativa. Registre os dados manualmente conforme exigido pela legislação fiscal.
          </p>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Operadora / Bandeira</label>
              <select
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                value={modalAutManual.operadora}
                onChange={e => setModalAutManual(prev => prev ? { ...prev, operadora: e.target.value } : null)}
              >
                <option value="">Selecione...</option>
                {bandeiras.map((b: any) => <option key={b.id} value={b.tpag || b.id}>{b.tband_opc}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Código de Autorização</label>
              <input
                type="text"
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 font-mono tracking-widest"
                placeholder="Ex: 123456"
                value={modalAutManual.codigo}
                onChange={e => setModalAutManual(prev => prev ? { ...prev, codigo: e.target.value } : null)}
                autoFocus
              />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => { modalAutManual.resolve(null); setModalAutManual(null); }} className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50">Cancelar</button>
            <button
              onClick={() => {
                if (!modalAutManual.codigo.trim()) { alert('Informe o código de autorização.'); return; }
                const val = { operadora: modalAutManual.operadora, codigo: modalAutManual.codigo };
                modalAutManual.resolve(val);
                setModalAutManual(null);
              }}
              className="flex-1 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 shadow"
            >Confirmar</button>
          </div>
        </div>
      </div>
    )}
    {nfeTefState && (
      <NfeTefModal
        pagamentoId={nfeTefState.pagamentosIds[nfeTefState.currentIndex]}
        vendaId={nfeTefState.vendaId}
        numero={nfeTefState.numero}
        pagamentoAtual={nfeTefState.currentIndex + 1}
        totalPagamentos={nfeTefState.pagamentosIds.length}
        onComplete={(vendaId) => {
          const nextIndex = nfeTefState.currentIndex + 1;
          if (nextIndex < nfeTefState.pagamentosIds.length) {
            setNfeTefState({ ...nfeTefState, currentIndex: nextIndex });
          } else {
            handleNfeTefComplete(vendaId);
          }
        }}
        onCancel={() => setNfeTefState(null)}
      />
    )}
  </>
  );
};

// ── TEF Modal para NF-e ───────────────────────────────────────────────────────
const NfeTefModal = ({ pagamentoId, vendaId, numero, pagamentoAtual = 1, totalPagamentos = 1, onComplete, onCancel }: {
  pagamentoId: number;
  vendaId: number;
  numero: number;
  pagamentoAtual?: number;
  totalPagamentos?: number;
  onComplete: (vendaId: number) => void;
  onCancel: () => void;
}) => {
  const [status, setStatus] = useState<'solicitando' | 'aguardando' | 'aprovado' | 'rejeitado' | 'erro'>('solicitando');
  const [mensagem, setMensagem] = useState('Solicitando transação ao terminal...');
  const [uniqueId, setUniqueId] = useState('');

  useEffect(() => {
    setStatus('solicitando');
    setMensagem('Solicitando transação ao terminal...');
    setUniqueId('');
  }, [pagamentoId]);

  useEffect(() => {
    if (status !== 'solicitando') return;
    const solicitar = async () => {
      try {
        const resp = await fetch('api.php?action=tef_solicitar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_pagamento: pagamentoId }),
        });
        const d = await resp.json();
        if (d.success) {
          setUniqueId(d.uniqueid);
          setStatus('aguardando');
          setMensagem('Aguardando confirmação no terminal...');
        } else {
          setStatus('erro');
          setMensagem(d.message || 'Erro ao solicitar transação.');
        }
      } catch {
        setStatus('erro');
        setMensagem('Erro de comunicação com o servidor.');
      }
    };
    solicitar();
  }, [status, pagamentoId]);

  useEffect(() => {
    if (status !== 'aguardando' || !uniqueId) return;
    const interval = setInterval(async () => {
      try {
        const resp = await fetch(`api.php?action=tef_consultar&uniqueid=${uniqueId}`);
        const d = await resp.json();
        if (d.status === 4) {
          setStatus('aprovado');
          setMensagem('Pagamento aprovado!');
          clearInterval(interval);
          setTimeout(() => onComplete(vendaId), 800);
        } else if (d.status === 5 || d.status === 6) {
          setStatus('rejeitado');
          setMensagem(d.message || 'Pagamento recusado pelo terminal.');
          clearInterval(interval);
        }
      } catch { /* tenta novamente */ }
    }, 3000);
    return () => clearInterval(interval);
  }, [status, uniqueId]);

  const iconColor = status === 'aprovado' ? 'text-green-500' : (status === 'rejeitado' || status === 'erro') ? 'text-red-500' : 'text-blue-500';

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[300] p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
      >
        <div className="p-8 text-center">
          <div className="mb-6">
            {(status === 'solicitando' || status === 'aguardando') && (
              <div className="w-16 h-16 mx-auto border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            )}
            {status === 'aprovado' && <CheckCircle className={`w-16 h-16 mx-auto ${iconColor}`} />}
            {(status === 'rejeitado' || status === 'erro') && <AlertCircle className={`w-16 h-16 mx-auto ${iconColor}`} />}
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-1">
            TEF — NF-e #{numero}{totalPagamentos > 1 ? ` (${pagamentoAtual}/${totalPagamentos})` : ''}
          </h3>
          <p className="text-gray-500 text-sm mb-6">{mensagem}</p>
          {(status === 'rejeitado' || status === 'erro') && (
            <button onClick={onCancel} className="w-full py-3 bg-red-50 text-red-600 font-semibold rounded-xl hover:bg-red-100 transition-colors">
              Fechar (Emissão Cancelada)
            </button>
          )}
          {(status === 'solicitando' || status === 'aguardando') && (
            <button onClick={onCancel} className="w-full py-3 text-gray-400 font-medium hover:text-gray-600 transition-colors text-sm">
              Cancelar
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// ─── Modal de Parcelamento (NF-e) ─────────────────────────────────────────────
type Parcela = { numero: number; vencimento: string; valor: number };

const NfeParcelamentoModal = ({ total, inicial, onConfirm, onCancel }: {
  total: number;
  inicial: { numero: string | number; vencimento: string; valor: number }[];
  onConfirm: (parts: Parcela[]) => void;
  onCancel: () => void;
}) => {
  const [numParcelas, setNumParcelas] = useState(inicial.length || 1);
  const [parcelas, setParcelas] = useState<Parcela[]>([]);

  const gerarParcelas = (n: number) => {
    const base = Math.floor((total / n) * 100) / 100;
    let soma = 0;
    const arr: Parcela[] = [];
    for (let i = 1; i <= n; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i * 30);
      const valor = i === n ? Number((total - soma).toFixed(2)) : base;
      soma += base;
      arr.push({ numero: i, vencimento: d.toISOString().split('T')[0], valor });
    }
    setParcelas(arr);
  };

  useEffect(() => {
    if (inicial.length > 0) {
      setParcelas(inicial.map((p, i) => ({ numero: i + 1, vencimento: p.vencimento, valor: Number(p.valor) })));
    } else {
      gerarParcelas(numParcelas);
    }
  }, []);

  useEffect(() => { gerarParcelas(numParcelas); }, [numParcelas]);

  const totalParcelas = parcelas.reduce((s, p) => s + Number(p.valor), 0);
  const invalido = Math.abs(totalParcelas - total) > 0.01;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[300] p-4 backdrop-blur-sm">
      <style>{`b, strong, h1, h2, h3 { font-weight: 600 !important; color: #334155; }`}</style>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h3 className="text-lg font-bold text-gray-800 uppercase tracking-tight">Configurar Parcelamento</h3>
          <span className="bg-blue-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm">
            TOTAL: R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="p-6 space-y-6 flex-1 overflow-auto">
          <div className="bg-blue-50 p-4 rounded-2xl flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-blue-600 uppercase mb-1">Quantidade de Parcelas</label>
              <input type="number" min={1} value={numParcelas}
                onChange={e => setNumParcelas(Math.max(1, Number(e.target.value)))}
                className="w-full bg-white border-0 rounded-xl px-4 py-2 font-bold text-blue-800 outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <p className="text-xs text-blue-500 font-medium">Intervalo padrão de 30 dias.</p>
          </div>
          <div className="border border-gray-100 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-[10px] font-bold text-gray-400">#</th>
                  <th className="px-4 py-2 text-[10px] font-bold text-gray-400">Vencimento</th>
                  <th className="px-4 py-2 text-[10px] font-bold text-gray-400 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {parcelas.map((p, idx) => (
                  <tr key={p.numero}>
                    <td className="px-4 py-3 font-bold text-gray-400">{p.numero}</td>
                    <td className="px-4 py-3">
                      <input type="date" value={p.vencimento}
                        onChange={e => { const n = [...parcelas]; n[idx].vencimento = e.target.value; setParcelas(n); }}
                        className="bg-transparent font-medium text-gray-700 outline-none focus:text-blue-600 transition-colors" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2 group">
                        <span className="text-[10px] font-bold text-gray-400">R$</span>
                        <input 
                          type="text" 
                          inputMode="decimal"
                          value={p.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
                          onChange={e => {
                            const valStr = e.target.value.replace(/\D/g, '');
                            const valNum = Number(valStr) / 100;
                            const newP = [...parcelas];
                            newP[idx].valor = valNum;
                            setParcelas(newP);
                          }} 
                          className="w-28 text-right bg-white border border-gray-100 rounded-lg px-2 py-1.5 font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" 
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {invalido && (
            <div className="bg-red-50 p-3 rounded-xl flex items-center gap-2 text-red-600 text-xs font-bold">
              <AlertCircle className="w-4 h-4" />
              A soma das parcelas (R$ {totalParcelas.toFixed(2)}) não confere com o total. Ajuste os valores.
            </div>
          )}
        </div>
        <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-4 items-center">
          <button onClick={onCancel} className="flex-1 py-3 bg-white border border-gray-200 text-gray-500 font-semibold rounded-xl hover:bg-gray-100 hover:text-gray-700 transition-all uppercase text-[11px] tracking-wider active:scale-95">
            Cancelar
          </button>
          <button 
            disabled={invalido} 
            onClick={() => onConfirm(parcelas)}
            className={`flex-1 py-3 rounded-xl font-bold transition-all uppercase text-[11px] tracking-wider active:scale-95 shadow-md ${invalido ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none' : 'bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700 hover:shadow-lg'}`}
          >
            Salvar
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default NfeDashboard;
