import React, { useState, useEffect, useRef } from 'react';
import {
  Search, Plus, Trash2, User, Package, Truck, CreditCard,
  CheckCircle, AlertCircle, ChevronRight, Save, X, CalendarDays,
  UserCheck, RefreshCw, Eye, Printer, Mail, Edit, MessageCircle,
  AlertTriangle
} from 'lucide-react';
import { motion } from 'motion/react';

interface Produto  { id: number; descricao: string; valorUnitario: number; codigoInterno?: string; codigoBarras?: string; estoque?: number; unidadeComercial?: string; }
interface Cliente  { id: number; nome: string; documento?: string; endereco?: { logradouro?: string; numero?: string; bairro?: string; municipio?: string; uf?: string; cep?: string; }; }
interface Vendedor { id: number; nome: string; percentual_comissao: number; ativo: number; }
interface Bandeira { id: number; tband_opc: string; tpag?: string; }
interface PedidoItem { produtoId: number; descricao: string; unidade: string; quantidade: number; valorUnitario: number; desconto: number; valorTotal: number; }
interface PedidoPagamento { formaPagamento: string; valorPagamento: number; vencimentos?: { numero: number; vencimento: string; valor: number }[]; bandeira?: string; autorizacao?: string; }
interface PedidoLista { id: number; numero: number; data_emissao: string; status: string; valor_total: number; cliente_nome?: string; vendedor_nome?: string; }

const FORMAS_PAGAMENTO = [
  { codigo: '01', descricao: 'Dinheiro' }, { codigo: '02', descricao: 'Cheque' },
  { codigo: '03', descricao: 'Cartão de Crédito' }, { codigo: '04', descricao: 'Cartão de Débito' },
  { codigo: '05', descricao: 'Crédito Loja' }, { codigo: '10', descricao: 'Vale Alimentação' },
  { codigo: '11', descricao: 'Vale Refeição' }, { codigo: '15', descricao: 'Boleto Bancário' },
  { codigo: '17', descricao: 'PIX' }, { codigo: '99', descricao: 'Outros' },
];
const FORMAS_CAIXA   = ['01','03','04','17','10','11'];
const FORMAS_RECEBER = ['02','05','15','99'];
const brl    = (v: number) => Number(v)?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00';
const round2 = (v: number) => Math.round(v * 100) / 100;

export const PedidoTab = ({ produtos, clientes, vendedores, emitente, showAlert, showConfirm, showPrompt, session }: {
  produtos: Produto[]; clientes: Cliente[]; vendedores: Vendedor[];
  emitente: any; showAlert: (t: string, m: string) => void;
  showConfirm: (t: string, m: string, cb: () => void) => void;
  showPrompt: (t: string, m: string, cb: (v: string) => void, init?: string) => void;
  session: any;
}) => {
  // MODO CONTROLA QUAL TELA MOSTRAR
  const [modo, setModo] = useState<'lista' | 'novo' | 'sucesso'>('lista');

  // Lista
  const [pedidos, setPedidos]   = useState<PedidoLista[]>([]);
  const [loading, setLoading]   = useState(false);
  const [busca, setBusca]       = useState('');
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [modalFinanceiro, setModalFinanceiro] = useState<{ show: boolean; payload: any } | null>(null);
  const [dtInicio, setDtInicio] = useState(() => new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
  const [dtFim, setDtFim]       = useState(() => new Date().toISOString().split('T')[0]);

  // Formulário
  const [activeTab, setActiveTab] = useState<'identificacao'|'produtos'|'transporte'|'pagamento'>('identificacao');
  const [salvando, setSalvando]   = useState(false);
  const [pedidoSalvo, setPedidoSalvo] = useState<any>(null);

  const [clienteSel, setClienteSel]     = useState<Cliente | null>(null);
  const [buscaCliente, setBuscaCliente] = useState('');
  const [dropCliente, setDropCliente]   = useState(false);
  const [vendedorId, setVendedorId]     = useState(0);
  const [natureza, setNatureza]         = useState('VENDA');
  const [observacao, setObservacao]     = useState('');
  const [itens, setItens]               = useState<PedidoItem[]>([]);
  const [buscaProduto, setBuscaProduto] = useState('');
  const [dropProduto, setDropProduto]   = useState(false);
  const [valorFrete,  setValorFrete]    = useState(0);
  const [valorSeguro, setValorSeguro]   = useState(0);
  const [valorOutras, setValorOutras]   = useState(0);
  const [pagamentos, setPagamentos]         = useState<PedidoPagamento[]>([]);
  const [bandeiras, setBandeiras]           = useState<Bandeira[]>([]);
  const [parcelamentoIdx, setParcelamentoIdx] = useState<number | null>(null);

  const refBuscaProduto = useRef<HTMLInputElement>(null);
  const refBuscaCliente = useRef<HTMLInputElement>(null);

  const totalProdutos  = itens.reduce((s, i) => s + i.valorTotal, 0);
  const totalDescontos = itens.reduce((s, i) => s + i.desconto * i.quantidade, 0);
  const totalPedido    = round2(totalProdutos + valorFrete + valorSeguro + valorOutras);
  const totalPago      = pagamentos.reduce((s, p) => s + p.valorPagamento, 0);
  const troco          = Math.max(0, totalPago - totalPedido);

  const carregarPedidos = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`./api.php?action=listar_pedidos&dt_inicio=${dtInicio}&dt_fim=${dtFim}`);
      const data = await res.json();
      if (data.success) setPedidos(data.data);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { carregarPedidos(); }, [dtInicio, dtFim]);
  useEffect(() => {
    fetch('./api.php?action=bandeiras').then(r => r.json()).then(d => { if (Array.isArray(d)) setBandeiras(d); });
  }, []);

  const clientesFiltrados = clientes.filter(c =>
    c.nome?.toLowerCase().includes(buscaCliente.toLowerCase()) || c.documento?.includes(buscaCliente)
  );
  const produtosFiltrados = produtos.filter(p =>
    buscaProduto.length > 0 && (
      p.descricao.toLowerCase().includes(buscaProduto.toLowerCase()) ||
      (p.codigoInterno||'').includes(buscaProduto) || (p.codigoBarras||'').includes(buscaProduto)
    )
  );
  const pedidosFiltrados = pedidos.filter(p =>
    !busca || String(p.numero).includes(busca) || (p.cliente_nome||'').toLowerCase().includes(busca.toLowerCase())
  );

  const handleImprimir2 = async (id: number) => {
    const res  = await fetch('./api.php?action=buscar_pedido&id=' + id);
    const data = await res.json();
    if (!data.success) { showAlert('Erro', data.message); return; }
    const v = data.venda;
    const itensHtml = data.itens.map((it: any, i: number) => `
      <tr><td>${i+1}</td><td>${it.descricao||'Produto'}</td><td>${it.unidade||'UN'}</td>
      <td style="text-align:right">${Number(it.quantidade).toLocaleString('pt-BR',{minimumFractionDigits:3})}</td>
      <td style="text-align:right">R$ ${brl(it.valor_unitario)}</td>
      <td style="text-align:right"><strong>R$ ${brl(it.valor_total)}</strong></td></tr>`).join('');
    const pagsHtml = data.pagamentos.map((p: any) => {
      const label = FORMAS_PAGAMENTO.find(f => f.codigo === p.forma_pagamento)?.descricao || p.forma_pagamento;
      return `<tr><td>${label}</td><td style="text-align:right">R$ ${brl(p.valor_pagamento)}</td></tr>`;
    }).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Pedido #${String(v.numero).padStart(6,'0')}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:11pt;color:#222;padding:20mm 15mm}
.header{text-align:center;border-bottom:2px solid #333;padding-bottom:12px;margin-bottom:16px}
.header h1{font-size:18pt;font-weight:bold}.header p{font-size:10pt;color:#555;margin-top:2px}
.sem-fiscal{background:#fff3cd;border:1px solid #ffc107;padding:6px 12px;border-radius:4px;text-align:center;font-size:10pt;font-weight:bold;color:#856404;margin-bottom:16px}
table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:10pt}
th{background:#f1f5f9;font-weight:bold;padding:7px 6px;border:1px solid #ddd;text-align:left;font-size:9pt}
td{padding:6px;border:1px solid #eee}tr:nth-child(even) td{background:#f9fafb}
.total-final td{background:#1a56db;color:white;font-weight:bold;font-size:12pt}
.footer{text-align:center;font-size:9pt;color:#888;border-top:1px solid #ddd;padding-top:10px;margin-top:10px}
@media print{body{padding:10mm}}</style></head><body>
<div class="header"><h1>${emitente?.razaoSocial||''}</h1>
${emitente?.cnpj?`<p>CNPJ: ${emitente.cnpj}</p>`:''}
${emitente?.telefone?`<p>Tel: ${emitente.telefone}</p>`:''}</div>
<div class="sem-fiscal">⚠ DOCUMENTO SEM VALOR FISCAL — NÃO É NOTA FISCAL</div>
<div style="margin-bottom:16px">
<div style="font-size:14pt;font-weight:bold;color:#1a56db">PEDIDO Nº ${String(v.numero).padStart(6,'0')}</div>
<p style="font-size:10pt;color:#555">Emitido em: ${new Date(v.data_emissao).toLocaleString('pt-BR')}</p>
${v.natureza_operacao?`<p style="font-size:10pt;color:#555">Natureza: ${v.natureza_operacao}</p>`:''}
${v.vendedor_nome?`<p style="font-size:10pt;color:#555">Vendedor: ${v.vendedor_nome}</p>`:''}</div>
${v.cliente_nome?`<div style="border:1px solid #ddd;border-radius:4px;padding:10px;margin-bottom:16px"><strong>Cliente:</strong> ${v.cliente_nome}${v.cliente_documento?' — '+v.cliente_documento:''}</div>`:''}
<table><thead><tr><th>#</th><th>Produto</th><th>Un</th><th style="text-align:right">Qtd</th><th style="text-align:right">Vl.Unit</th><th style="text-align:right">Total</th></tr></thead>
<tbody>${itensHtml}</tbody></table>
<table style="width:320px;margin-left:auto"><tbody>
${v.valor_frete>0?`<tr><td>Frete</td><td style="text-align:right">R$ ${brl(v.valor_frete)}</td></tr>`:''}
<tr class="total-final"><td>TOTAL DO PEDIDO</td><td style="text-align:right">R$ ${brl(v.valor_total)}</td></tr>
</tbody></table>
<h4 style="font-size:10pt;font-weight:bold;margin:16px 0 8px;text-transform:uppercase">Formas de Pagamento</h4>
<table><thead><tr><th>Forma</th><th style="text-align:right">Valor</th></tr></thead><tbody>${pagsHtml}</tbody></table>
${v.observacao?`<div style="border:1px solid #ddd;border-radius:4px;padding:10px;margin-top:16px"><strong>Obs:</strong> ${v.observacao}</div>`:''}
<div class="footer"><p>⚠ ESTE DOCUMENTO NÃO TEM VALOR FISCAL ⚠</p><p>Obrigado pela preferência!</p></div>
<script>window.onload=()=>{window.print()}</script></body></html>`;
    const w = window.open('','_blank','width=900,height=700');
    if (w) { w.document.write(html); w.document.close(); }
  };

  const handleEmail = (p: PedidoLista) => {
    const emailInicial = '';
    showPrompt('Enviar E-mail', 'Digite o e-mail do destinatário:', async (email) => {
      if (!email?.trim()) return;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { showAlert('Atenção', 'E-mail inválido.'); return; }
      const res  = await fetch(`./api.php?action=pedido_email&id=${p.id}&email=${encodeURIComponent(email.trim())}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) showAlert('Sucesso', 'E-mail enviado com sucesso!');
      else showAlert('Erro', data.message || 'Falha ao enviar e-mail.');
    }, emailInicial);
  };

  const handleWhatsApp = (p: PedidoLista) => {
    const texto = encodeURIComponent(
      `*${emitente?.razaoSocial || ''}*\n` +
      `⚠ DOCUMENTO SEM VALOR FISCAL\n\n` +
      `*PEDIDO Nº ${String(p.numero).padStart(6,'0')}*\n` +
      `Data: ${new Date(p.data_emissao).toLocaleDateString('pt-BR')}\n` +
      (p.cliente_nome ? `Cliente: ${p.cliente_nome}\n` : '') +
      `\n*Total: R$ ${brl(Number(p.valor_total))}*\n\n` +
      `Obrigado pela preferência!`
    );
    window.open(`https://wa.me/?text=${texto}`, '_blank');
  };

  const handleExcluir = (p: PedidoLista) => {
    showConfirm('Excluir Pedido',
      `Confirma a exclusão do Pedido #${String(p.numero).padStart(6,'0')}?\n\nEsta ação irá:\n• Devolver o estoque dos produtos\n• Remover lançamentos financeiros pendentes\n• Cancelar a comissão gerada`,
      async () => {
        const res  = await fetch(`./api.php?action=excluir_pedido&id=${p.id}`);
        const data = await res.json();
        if (data.success) { await carregarPedidos(); showAlert('Sucesso', 'Pedido excluído com sucesso!'); }
        else showAlert('Erro', data.message || 'Falha ao excluir.');
      }
    );
  };

  const handleEditar = async (p: PedidoLista) => {
    const res  = await fetch('./api.php?action=buscar_pedido&id=' + p.id);
    const data = await res.json();
    if (!data.success) { showAlert('Erro', data.message); return; }
    const v = data.venda;
    // Recarregar formulário com dados do pedido
    setEditandoId(p.id);
    setClienteSel(v.cliente_id ? { id: v.cliente_id, nome: v.cliente_nome || '', documento: v.cliente_documento || '' } : null);
    setBuscaCliente(v.cliente_nome || '');
    setVendedorId(v.vendedor_id || 0);
    setNatureza(v.natureza_operacao || 'VENDA');
    setObservacao(v.observacao || '');
    setValorFrete(Number(v.valor_frete) || 0);
    setValorSeguro(Number(v.valor_seguro) || 0);
    setValorOutras(Number(v.valor_outras) || 0);
    setItens(data.itens.map((it: any) => ({
      produtoId: it.produto_id, descricao: it.descricao || 'Produto',
      unidade: it.unidade || 'UN', quantidade: Number(it.quantidade),
      valorUnitario: Number(it.valor_unitario), desconto: 0,
      valorTotal: Number(it.valor_total),
    })));
    setPagamentos(data.pagamentos.map((p: any) => ({
      formaPagamento: p.forma_pagamento, valorPagamento: Number(p.valor_pagamento),
      vencimentos: [],
    })));
    setActiveTab('identificacao');
    setModo('novo');
  };

  const handleFinalizarEdicao = async () => {
    const erro = validar();
    if (erro) { showAlert('Atenção', erro); return; }
    // Verificar se houve mudança financeira
    const res = await fetch('./api.php?action=buscar_pedido&id=' + editandoId);
    const data = await res.json();
    const finAtual = data.financeiro || [];
    const temFinanceiroPendente = finAtual.some((f: any) => f.status === 'Pendente');
    const valorMudou = Math.abs(Number(data.venda.valor_total) - totalPedido) > 0.01;
    if (temFinanceiroPendente && valorMudou) {
      setModalFinanceiro({ show: true, payload: buildPayload() });
    } else {
      await salvarEdicao(buildPayload(), 'manter');
    }
  };

  const buildPayload = () => ({
    id: editandoId,
    vendedor_id: vendedorId || null, natureza_operacao: natureza, observacao,
    valor_frete: valorFrete, valor_seguro: valorSeguro, valor_outras: valorOutras,
    valor_total: totalPedido, usuario_id: session?.usuarioId, caixa_id: session?.caixaId,
    cliente: clienteSel ? { id: clienteSel.id, nome: clienteSel.nome, documento: clienteSel.documento } : null,
    itens: itens.map(it => ({ produto_id: it.produtoId, descricao: it.descricao, unidade: it.unidade, quantidade: it.quantidade, valor_unitario: it.valorUnitario, desconto: it.desconto, valor_total: it.valorTotal })),
    pagamentos: pagamentos.map(p => ({ forma_pagamento: p.formaPagamento, valor: p.valorPagamento, vencimentos: p.vencimentos||[], bandeira: p.bandeira||'', autorizacao: p.autorizacao||'' })),
  });

  const salvarEdicao = async (payload: any, acaoFinanceiro: string) => {
    setSalvando(true);
    try {
      const res  = await fetch('./api.php?action=atualizar_pedido', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, acao_financeiro: acaoFinanceiro }) });
      const text = await res.text();
      let data: any = {};
      try { data = JSON.parse(text); } catch { showAlert('Erro', text.substring(0,200)); return; }
      if (data.success) {
        setEditandoId(null);
        setModalFinanceiro(null);
        showAlert('Sucesso', 'Pedido atualizado com sucesso!');
        setModo('lista');
        carregarPedidos();
      } else showAlert('Erro', data.message || 'Erro ao atualizar.');
    } catch (e: any) { showAlert('Erro', e?.message || 'Erro de conexão.'); }
    finally { setSalvando(false); }
  };

  const iniciarNovo = () => {
    setClienteSel(null); setBuscaCliente(''); setVendedorId(0);
    setNatureza('VENDA'); setObservacao('');
    setItens([]); setPagamentos([]);
    setValorFrete(0); setValorSeguro(0); setValorOutras(0);
    setPedidoSalvo(null); setActiveTab('identificacao');
    setModo('novo');
  };

  const adicionarProduto = (p: Produto) => {
    setItens(prev => [...prev, { produtoId: p.id, descricao: p.descricao, unidade: p.unidadeComercial||'UN', quantidade: 1, valorUnitario: p.valorUnitario, desconto: 0, valorTotal: p.valorUnitario }]);
    setBuscaProduto(''); setDropProduto(false);
    setTimeout(() => refBuscaProduto.current?.focus(), 50);
  };

  const atualizarItem = (idx: number, campo: keyof PedidoItem, valor: any) => {
    setItens(prev => prev.map((it, i) => {
      if (i !== idx) return it;
      const novo = { ...it, [campo]: valor };
      novo.valorTotal = round2((novo.quantidade * novo.valorUnitario) - (novo.quantidade * novo.desconto));
      return novo;
    }));
  };

  const adicionarPagamento = () =>
    setPagamentos(prev => [...prev, { formaPagamento: '01', valorPagamento: round2(Math.max(0, totalPedido - totalPago)) }]);

  const atualizarPagamento = (idx: number, campo: keyof PedidoPagamento, valor: any) =>
    setPagamentos(prev => prev.map((p, i) => i === idx ? { ...p, [campo]: valor } : p));

  const removerPagamento = (idx: number) => setPagamentos(prev => prev.filter((_, i) => i !== idx));

  const validar = (): string | null => {
    if (itens.length === 0)      return 'Adicione ao menos um produto.';
    if (pagamentos.length === 0) return 'Adicione ao menos uma forma de pagamento.';
    if (Math.abs(totalPago - totalPedido) > 0.02) return `Valor pago (R$ ${brl(totalPago)}) diferente do total (R$ ${brl(totalPedido)}).`;
    return null;
  };

  const handleFinalizar = async () => {
    const erro = validar();
    if (erro) { showAlert('Atenção', erro); return; }
    setSalvando(true);
    try {
      const payload = {
        vendedor_id: vendedorId || null, natureza_operacao: natureza, observacao,
        valor_frete: valorFrete, valor_seguro: valorSeguro, valor_outras: valorOutras,
        valor_total: totalPedido, usuario_id: session?.usuarioId, caixa_id: session?.caixaId,
        cliente: clienteSel ? { id: clienteSel.id, nome: clienteSel.nome, documento: clienteSel.documento, endereco: clienteSel.endereco } : null,
        itens: itens.map(it => ({ produto_id: it.produtoId, descricao: it.descricao, unidade: it.unidade, quantidade: it.quantidade, valor_unitario: it.valorUnitario, desconto: it.desconto, valor_total: it.valorTotal })),
        pagamentos: pagamentos.map(p => ({ forma_pagamento: p.formaPagamento, valor: p.valorPagamento, vencimentos: p.vencimentos||[], bandeira: p.bandeira||'', autorizacao: p.autorizacao||'' })),
      };
      const res  = await fetch('./api.php?action=salvar_pedido_completo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const text = await res.text();
      let data: any = {};
      try { data = JSON.parse(text); } catch { showAlert('Erro', 'Resposta inválida: ' + text.substring(0, 200)); setSalvando(false); return; }
      if (data.success) {
        setPedidoSalvo({ ...payload, numero: data.numero, id: data.id, data: new Date().toLocaleString('pt-BR') });
        setModo('sucesso');
        carregarPedidos();
      } else showAlert('Erro', data.message || 'Erro ao salvar pedido.');
    } catch (e: any) { showAlert('Erro', 'Erro de conexão: ' + (e?.message || String(e))); }
    finally { setSalvando(false); }
  };

  const handleImprimir = () => {
    if (!pedidoSalvo) return;
    const vendedorNome = vendedores.find(v => v.id === pedidoSalvo.vendedor_id)?.nome || '';
    const itensHtml = pedidoSalvo.itens.map((it: any, i: number) => `
      <tr><td>${i+1}</td><td>${it.descricao}</td><td>${it.unidade}</td>
      <td style="text-align:right">${Number(it.quantidade).toLocaleString('pt-BR',{minimumFractionDigits:3})}</td>
      <td style="text-align:right">R$ ${brl(it.valor_unitario)}</td>
      <td style="text-align:right">R$ ${brl(it.desconto*it.quantidade)}</td>
      <td style="text-align:right"><strong>R$ ${brl(it.valor_total)}</strong></td></tr>`).join('');
    const pagsHtml = pedidoSalvo.pagamentos.map((p: any) => {
      const label = FORMAS_PAGAMENTO.find(f => f.codigo === p.forma_pagamento)?.descricao || p.forma_pagamento;
      const parcs = p.vencimentos?.length ? p.vencimentos.map((v: any) =>
        `<tr style="color:#666"><td colspan="2" style="padding-left:20px;font-size:10pt">${v.numero}ª parcela — ${v.vencimento.split('-').reverse().join('/')} — R$ ${brl(v.valor)}</td></tr>`).join('') : '';
      return `<tr><td>${label}</td><td style="text-align:right">R$ ${brl(p.valor)}</td></tr>${parcs}`;
    }).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Pedido #${String(pedidoSalvo.numero).padStart(6,'0')}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:11pt;color:#222;padding:20mm 15mm}
.header{text-align:center;border-bottom:2px solid #333;padding-bottom:12px;margin-bottom:16px}
.header h1{font-size:18pt;font-weight:bold}.header p{font-size:10pt;color:#555;margin-top:2px}
.sem-fiscal{background:#fff3cd;border:1px solid #ffc107;padding:6px 12px;border-radius:4px;text-align:center;font-size:10pt;font-weight:bold;color:#856404;margin-bottom:16px}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}
.info-box{border:1px solid #ddd;border-radius:4px;padding:10px}
.info-box h4{font-size:9pt;font-weight:bold;color:#666;text-transform:uppercase;margin-bottom:6px;border-bottom:1px solid #eee;padding-bottom:4px}
.info-box p{font-size:10pt;margin:2px 0}
table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:10pt}
th{background:#f1f5f9;font-weight:bold;padding:7px 6px;border:1px solid #ddd;text-align:left;font-size:9pt;text-transform:uppercase}
td{padding:6px;border:1px solid #eee}tr:nth-child(even) td{background:#f9fafb}
.totais{margin-left:auto;width:320px;border:1px solid #ddd;border-radius:4px;overflow:hidden;margin-bottom:16px}
.totais table{margin:0}.totais td{padding:6px 10px;border:none;border-bottom:1px solid #eee}
.totais tr:last-child td{border-bottom:none}.total-final td{background:#1a56db;color:white;font-weight:bold;font-size:12pt}
.footer{text-align:center;font-size:9pt;color:#888;border-top:1px solid #ddd;padding-top:10px;margin-top:10px}
@media print{body{padding:10mm}}</style></head><body>
<div class="header"><h1>${emitente?.razaoSocial||''}</h1>
${emitente?.cnpj?`<p>CNPJ: ${emitente.cnpj}</p>`:''}
${emitente?.logradouro?`<p>${emitente.logradouro}, ${emitente.numero} — ${emitente.municipio}/${emitente.uf}</p>`:''}
${emitente?.telefone?`<p>Tel: ${emitente.telefone}</p>`:''}</div>
<div class="sem-fiscal">⚠ DOCUMENTO SEM VALOR FISCAL — NÃO É NOTA FISCAL</div>
<div style="margin-bottom:16px">
<div style="font-size:14pt;font-weight:bold;color:#1a56db;margin-bottom:4px">PEDIDO Nº ${String(pedidoSalvo.numero).padStart(6,'0')}</div>
<p style="font-size:10pt;color:#555">Emitido em: ${pedidoSalvo.data}</p>
${natureza?`<p style="font-size:10pt;color:#555">Natureza: ${natureza}</p>`:''}
${vendedorNome?`<p style="font-size:10pt;color:#555">Vendedor: ${vendedorNome}</p>`:''}</div>
<div class="info-grid">
<div class="info-box"><h4>Cliente</h4>
${pedidoSalvo.cliente?`<p><strong>${pedidoSalvo.cliente.nome}</strong></p>
${pedidoSalvo.cliente.documento?`<p>CPF/CNPJ: ${pedidoSalvo.cliente.documento}</p>`:''}
${pedidoSalvo.cliente.endereco?.municipio?`<p>${pedidoSalvo.cliente.endereco.municipio}/${pedidoSalvo.cliente.endereco.uf}</p>`:''}
`:'<p style="color:#aaa">Consumidor não identificado</p>'}</div>
<div class="info-box"><h4>Resumo Financeiro</h4>
<p>Produtos: R$ ${brl(totalProdutos)}</p>
${totalDescontos>0?`<p>Descontos: - R$ ${brl(totalDescontos)}</p>`:''}
${valorFrete>0?`<p>Frete: R$ ${brl(valorFrete)}</p>`:''}
<p><strong>Total: R$ ${brl(totalPedido)}</strong></p></div></div>
<table><thead><tr><th>#</th><th>Produto</th><th>Un</th><th style="text-align:right">Qtd</th>
<th style="text-align:right">Vl.Unit</th><th style="text-align:right">Desc</th><th style="text-align:right">Total</th></tr></thead>
<tbody>${itensHtml}</tbody></table>
<div class="totais"><table>
<tr><td>Subtotal</td><td style="text-align:right">R$ ${brl(totalProdutos)}</td></tr>
${totalDescontos>0?`<tr><td>(-) Descontos</td><td style="text-align:right">- R$ ${brl(totalDescontos)}</td></tr>`:''}
${valorFrete>0?`<tr><td>Frete</td><td style="text-align:right">R$ ${brl(valorFrete)}</td></tr>`:''}
<tr class="total-final"><td>TOTAL DO PEDIDO</td><td style="text-align:right">R$ ${brl(totalPedido)}</td></tr>
</table></div>
<h4 style="font-size:10pt;font-weight:bold;margin-bottom:8px;text-transform:uppercase">Formas de Pagamento</h4>
<table><thead><tr><th>Forma</th><th style="text-align:right">Valor</th></tr></thead><tbody>${pagsHtml}</tbody></table>
${observacao?`<div style="border:1px solid #ddd;border-radius:4px;padding:10px;margin-bottom:16px"><strong>Observações:</strong><br>${observacao}</div>`:''}
<div class="footer"><p>⚠ ESTE DOCUMENTO NÃO TEM VALOR FISCAL ⚠</p><p>Obrigado pela preferência!</p></div>
<script>window.onload=()=>{window.print()}</script></body></html>`;
    const w = window.open('','_blank','width=900,height=700');
    if (w) { w.document.write(html); w.document.close(); }
  };

  const ic = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none shadow-sm';
  const TABS = [
    { id: 'identificacao' as const, label: 'Identificação', icon: User },
    { id: 'produtos'      as const, label: 'Produtos',      icon: Package },
    { id: 'transporte'    as const, label: 'Transporte',    icon: Truck },
    { id: 'pagamento'     as const, label: 'Pagamento',     icon: CreditCard },
  ];

  // ══════════════════════════════════════════════════════════
  // TELA: LISTA
  // ══════════════════════════════════════════════════════════
  if (modo === 'lista') return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Pedidos</h2>
          <p className="text-xs text-amber-600 font-medium mt-0.5">⚠ Documentos sem valor fiscal</p>
        </div>
        <button onClick={iniciarNovo} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-blue-700 shadow">
          <Plus className="w-4 h-4" /> Novo Pedido
        </button>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Total Pedidos</p>
          <p className="text-lg font-bold text-blue-600">{pedidos.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Total Valor</p>
          <p className="text-lg font-bold text-green-600">R$ {brl(pedidos.reduce((s,p) => s + Number(p.valor_total), 0))}</p>
        </div>
      </div>

      {/* Filtros + Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por número ou cliente..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <div className="flex gap-2 items-center">
            <label className="text-xs text-gray-500">De</label>
            <input type="date" value={dtInicio} onChange={e => setDtInicio(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500" />
            <label className="text-xs text-gray-500">Até</label>
            <input type="date" value={dtFim} onChange={e => setDtFim(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <button onClick={carregarPedidos} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Nº</th>
              <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Data</th>
              <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Natureza / Cliente</th>
              <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Vendedor</th>
              <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Valor</th>
              <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase text-center">Status</th>
              <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="px-5 py-10 text-center"><RefreshCw className="w-5 h-5 animate-spin mx-auto text-gray-300" /></td></tr>
            ) : pedidosFiltrados.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400">Nenhum pedido encontrado. Clique em "Novo Pedido" para começar.</td></tr>
            ) : pedidosFiltrados.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 font-bold text-blue-600">#{String(p.numero).padStart(6,'0')}</td>
                <td className="px-5 py-3 text-gray-500 text-xs">{new Date(p.data_emissao).toLocaleDateString('pt-BR')}</td>
                <td className="px-5 py-3">
                  <p className="font-medium text-gray-800">{p.cliente_nome || <span className="text-gray-300 italic text-xs">Consumidor</span>}</p>
                </td>
                <td className="px-5 py-3 text-gray-500 text-xs">{p.vendedor_nome || '—'}</td>
                <td className="px-5 py-3 text-right font-semibold text-gray-800">R$ {brl(Number(p.valor_total))}</td>
                <td className="px-5 py-3 text-center">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">{p.status}</span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex gap-1 justify-center">
                    <button onClick={() => handleImprimir2(p.id)} title="Imprimir" className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Printer className="w-4 h-4" /></button>
                    <button onClick={() => handleEmail(p)} title="Enviar E-mail" className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Mail className="w-4 h-4" /></button>
                    <button onClick={() => handleWhatsApp(p)} title="WhatsApp" className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"><MessageCircle className="w-4 h-4" /></button>
                    <button onClick={() => handleEditar(p)} title="Editar" className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleExcluir(p)} title="Excluir" className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════
  // TELA: SUCESSO
  // ══════════════════════════════════════════════════════════
  if (modo === 'sucesso') return (
    <div className="space-y-4">
      <section className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-1">Pedido Salvo com Sucesso!</h3>
        <p className="text-gray-500 mb-1">Pedido Nº <strong className="text-blue-600">{String(pedidoSalvo?.numero).padStart(6,'0')}</strong></p>
        <p className="text-xs text-gray-400 mb-6">{pedidoSalvo?.data}</p>
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-8 text-xs text-amber-700 font-medium">
          ⚠ Este documento não tem valor fiscal
        </div>
        <div className="flex gap-3 justify-center">
          <button onClick={handleImprimir} className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow flex items-center gap-2">
            <Printer className="w-4 h-4" /> Imprimir (A4)
          </button>
          <button onClick={iniciarNovo} className="px-8 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Novo Pedido
          </button>
          <button onClick={() => setModo('lista')} className="px-8 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 flex items-center gap-2">
            <Eye className="w-4 h-4" /> Ver Lista
          </button>
        </div>
      </section>
    </div>
  );

  // ══════════════════════════════════════════════════════════
  // TELA: FORMULÁRIO NOVO PEDIDO
  // ══════════════════════════════════════════════════════════
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm">
            <button onClick={() => setModo('lista')} className="text-blue-600 hover:underline">← Pedidos</button>
            <span className="text-gray-300">/</span>
            <span className="font-semibold text-gray-800">{editandoId ? `Editando Pedido` : 'Novo Pedido'}</span>
          </div>
          <p className="text-xs text-amber-600 font-medium mt-0.5">⚠ Documento sem valor fiscal</p>
        </div>
      </div>

      {/* Abas padrão NFe */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map((tab, idx) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
              activeTab === tab.id ? 'bg-white text-blue-600 border-blue-200 shadow-sm' : 'bg-gray-50 text-gray-400 border-gray-100 hover:text-gray-600 hover:bg-white'
            }`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${activeTab === tab.id ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>{idx+1}</span>
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ABA: IDENTIFICAÇÃO */}
      {activeTab === 'identificacao' && (
        <div className="space-y-4">
          <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-100 pb-3">
              <User className="w-5 h-5 text-blue-600" /> Cliente
            </h3>
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input ref={refBuscaCliente} value={buscaCliente}
                onChange={e => { setBuscaCliente(e.target.value); setDropCliente(true); }}
                onFocus={() => setDropCliente(true)}
                placeholder="Buscar cliente por nome ou CPF/CNPJ..."
                className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none shadow-sm" />
              {dropCliente && clientesFiltrados.length > 0 && (
                <div className="absolute z-20 top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                  {clientesFiltrados.map(c => (
                    <button key={c.id} onClick={() => { setClienteSel(c); setBuscaCliente(c.nome); setDropCliente(false); }}
                      className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-50 last:border-0">
                      <p className="font-semibold text-gray-700 text-sm">{c.nome}</p>
                      <p className="text-gray-400 text-xs">{c.documento}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {clienteSel ? (
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-800">{clienteSel.nome}</p>
                  <p className="text-xs text-gray-500">{clienteSel.documento}</p>
                </div>
                <button onClick={() => { setClienteSel(null); setBuscaCliente(''); }} className="p-1 text-gray-400 hover:text-red-500 rounded-lg"><X className="w-5 h-5" /></button>
              </div>
            ) : (
              <div className="text-center py-8 border-2 border-dashed border-gray-100 rounded-xl">
                <User className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Nenhum cliente selecionado (opcional)</p>
              </div>
            )}
          </section>
          <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-100 pb-3">
              <UserCheck className="w-5 h-5 text-blue-600" /> Vendedor e Operação
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Vendedor</label>
                <select value={vendedorId} onChange={e => setVendedorId(Number(e.target.value))} className={ic}>
                  <option value={0}>— Sem vendedor —</option>
                  {vendedores.filter(v => v.ativo).map(v => <option key={v.id} value={v.id}>{v.nome} ({v.percentual_comissao}%)</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Natureza da Operação</label>
                <input value={natureza} onChange={e => setNatureza(e.target.value)} className={ic} placeholder="Ex: VENDA" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Observações</label>
                <input value={observacao} onChange={e => setObservacao(e.target.value)} className={ic} placeholder="Observações gerais..." />
              </div>
            </div>
          </section>
          <div className="flex justify-end">
            <button onClick={() => setActiveTab('produtos')} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 flex items-center gap-2">
              Próximo: Produtos <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ABA: PRODUTOS */}
      {activeTab === 'produtos' && (
        <div className="space-y-4">
          <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2 shrink-0"><Package className="w-5 h-5 text-blue-600" /> Itens do Pedido</h3>
              <div className="relative flex-1 max-w-xl">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input ref={refBuscaProduto} value={buscaProduto}
                  onChange={e => { setBuscaProduto(e.target.value); setDropProduto(true); }}
                  onFocus={() => setDropProduto(true)}
                  placeholder="Buscar produto por nome ou código..."
                  className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm" />
                {dropProduto && produtosFiltrados.length > 0 && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                    {produtosFiltrados.map(p => (
                      <button key={p.id} onClick={() => adicionarProduto(p)}
                        className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-50 last:border-0 flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-gray-700 text-sm">{p.descricao}</p>
                          <p className="text-gray-400 text-[11px]">{p.codigoInterno} · Estoque: <span className={p.estoque && p.estoque > 0 ? 'text-green-600' : 'text-red-500'}>{p.estoque ?? 0}</span></p>
                        </div>
                        <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-1 rounded-lg">R$ {brl(p.valorUnitario)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {itens.length > 0 ? (
              <div className="overflow-x-auto -mx-6">
                <table className="w-full border-collapse">
                  <thead><tr className="bg-gray-50 text-gray-500 text-xs font-semibold border-y border-gray-100">
                    <th className="text-left px-6 py-3">Produto</th>
                    <th className="text-center px-4 py-3 w-16">Un</th>
                    <th className="text-center px-4 py-3 w-24">Qtd</th>
                    <th className="text-center px-4 py-3 w-28">Vl. Unit</th>
                    <th className="text-center px-4 py-3 w-24">Desc/Un</th>
                    <th className="text-center px-4 py-3 w-28">Total</th>
                    <th className="px-6 py-3 w-16"></th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {itens.map((it, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-3"><p className="font-semibold text-gray-700 text-sm">{it.descricao}</p></td>
                        <td className="px-4 py-3 text-center text-xs text-gray-500">{it.unidade}</td>
                        <td className="px-4 py-3"><input type="number" min="0.001" step="0.001" value={it.quantidade} onChange={e => atualizarItem(idx,'quantidade',parseFloat(e.target.value)||0)} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-center text-sm outline-none focus:ring-1 focus:ring-blue-500" /></td>
                        <td className="px-4 py-3"><input type="number" min="0" step="0.01" value={it.valorUnitario} onChange={e => atualizarItem(idx,'valorUnitario',parseFloat(e.target.value)||0)} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-center text-sm outline-none focus:ring-1 focus:ring-blue-500 text-blue-600 font-medium" /></td>
                        <td className="px-4 py-3"><input type="number" min="0" step="0.01" value={it.desconto} onChange={e => atualizarItem(idx,'desconto',parseFloat(e.target.value)||0)} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-center text-sm outline-none focus:ring-1 focus:ring-blue-500 text-red-500" /></td>
                        <td className="px-4 py-3 text-center font-bold text-gray-800 text-sm">R$ {brl(it.valorTotal)}</td>
                        <td className="px-6 py-3 text-right"><button onClick={() => setItens(prev => prev.filter((_,i) => i !== idx))} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"><Package className="w-10 h-10 text-gray-300" /></div>
                <p className="text-gray-400 font-medium">Nenhum produto adicionado</p>
              </div>
            )}
          </section>
          {itens.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-4 flex justify-end gap-8 text-sm">
              <div className="text-right"><p className="text-gray-400 text-xs">Subtotal</p><p className="font-semibold">R$ {brl(totalProdutos)}</p></div>
              {totalDescontos > 0 && <div className="text-right"><p className="text-gray-400 text-xs">Descontos</p><p className="font-semibold text-red-500">- R$ {brl(totalDescontos)}</p></div>}
              <div className="text-right"><p className="text-blue-600 text-xs">Total</p><p className="font-bold text-blue-600 text-lg">R$ {brl(totalProdutos - totalDescontos)}</p></div>
            </div>
          )}
          <div className="flex justify-between">
            <button onClick={() => setActiveTab('identificacao')} className="px-6 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200">Voltar</button>
            <button onClick={() => setActiveTab('transporte')} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 flex items-center gap-2">Próximo: Transporte <ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* ABA: TRANSPORTE */}
      {activeTab === 'transporte' && (
        <div className="space-y-4">
          <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-base font-semibold text-gray-800 mb-6 flex items-center gap-2 border-b border-gray-100 pb-3"><Truck className="w-5 h-5 text-blue-600" /> Frete e Despesas Adicionais</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div><label className="block text-sm font-medium text-gray-500 mb-2">Frete (R$)</label><input type="number" min="0" step="0.01" value={valorFrete} onChange={e => setValorFrete(parseFloat(e.target.value)||0)} className={ic+' text-right'} /></div>
              <div><label className="block text-sm font-medium text-gray-500 mb-2">Seguro (R$)</label><input type="number" min="0" step="0.01" value={valorSeguro} onChange={e => setValorSeguro(parseFloat(e.target.value)||0)} className={ic+' text-right'} /></div>
              <div><label className="block text-sm font-medium text-gray-500 mb-2">Outras Despesas (R$)</label><input type="number" min="0" step="0.01" value={valorOutras} onChange={e => setValorOutras(parseFloat(e.target.value)||0)} className={ic+' text-right'} /></div>
            </div>
            {(valorFrete > 0 || valorSeguro > 0 || valorOutras > 0) && (
              <div className="mt-6 bg-blue-50 rounded-xl p-4 flex justify-between items-center">
                <p className="text-sm text-blue-700 font-medium">Total com acréscimos</p>
                <p className="text-lg font-bold text-blue-700">R$ {brl(totalPedido)}</p>
              </div>
            )}
          </section>
          <div className="flex justify-between">
            <button onClick={() => setActiveTab('produtos')} className="px-6 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200">Voltar</button>
            <button onClick={() => setActiveTab('pagamento')} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 flex items-center gap-2">Próximo: Pagamento <ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* ABA: PAGAMENTO */}
      {activeTab === 'pagamento' && (
        <div className="space-y-4">
          <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2"><CreditCard className="w-5 h-5 text-blue-600" /> Formas de Pagamento</h3>
              <button onClick={adicionarPagamento} className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-xs font-semibold hover:bg-blue-100 flex items-center gap-2"><Plus className="w-4 h-4" /> Adicionar</button>
            </div>
            <div className="space-y-3 mb-6">
              {pagamentos.map((pag, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex gap-4 items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Forma de Pagamento</label>
                      <select value={pag.formaPagamento} onChange={e => atualizarPagamento(idx,'formaPagamento',e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500/20">
                        {FORMAS_PAGAMENTO.map(f => <option key={f.codigo} value={f.codigo}>{f.codigo} – {f.descricao}</option>)}
                      </select>
                    </div>
                    <div className="w-48">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Valor (R$)</label>
                      <input type="number" min="0" step="0.01" value={pag.valorPagamento} onChange={e => atualizarPagamento(idx,'valorPagamento',parseFloat(e.target.value)||0)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-right font-semibold outline-none focus:ring-2 focus:ring-blue-500/20" />
                    </div>
                    {['03','04'].includes(pag.formaPagamento) && (<>
                      <div className="w-36"><label className="block text-xs font-medium text-gray-500 mb-1">Bandeira</label>
                        <select value={pag.bandeira||''} onChange={e => atualizarPagamento(idx,'bandeira',e.target.value)} className="w-full border border-gray-200 rounded-lg px-2 py-2 text-xs bg-white outline-none">
                          <option value="">Selecione...</option>
                          {bandeiras.map(b => <option key={b.id} value={b.tpag||String(b.id)}>{b.tband_opc}</option>)}
                        </select>
                      </div>
                      <div className="w-28"><label className="block text-xs font-medium text-gray-500 mb-1">Autorização</label>
                        <input value={pag.autorizacao||''} onChange={e => atualizarPagamento(idx,'autorizacao',e.target.value)} className="w-full border border-gray-200 rounded-lg px-2 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500" placeholder="Código" />
                      </div>
                    </>)}
                    {['05','02','15'].includes(pag.formaPagamento) && (
                      <button onClick={() => setParcelamentoIdx(idx)} title="Configurar Parcelas"
                        className={`mt-5 p-2 rounded-xl transition-all ${pag.vencimentos?.length ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50 border border-gray-200'}`}>
                        <CalendarDays className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => removerPagamento(idx)} className="mt-5 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  {pag.vencimentos && pag.vencimentos.length > 0 && (
                    <div className="ml-4 flex flex-wrap gap-2">
                      {pag.vencimentos.map((v, i) => (
                        <span key={i} className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-2 py-0.5 font-medium">
                          {i+1}/{pag.vencimentos!.length} · {v.vencimento.split('-').reverse().join('/')} · R$ {brl(v.valor)}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="ml-4">
                    {FORMAS_CAIXA.includes(pag.formaPagamento)
                      ? <span className="text-[10px] bg-green-50 text-green-700 border border-green-100 rounded-full px-2 py-0.5 font-medium">✓ Lança no caixa</span>
                      : <span className="text-[10px] bg-orange-50 text-orange-700 border border-orange-100 rounded-full px-2 py-0.5 font-medium">→ Contas a Receber</span>}
                  </div>
                </div>
              ))}
              {pagamentos.length === 0 && <p className="text-center py-6 text-gray-400 text-sm italic">Nenhuma forma de pagamento adicionada</p>}
            </div>
            <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-semibold text-blue-700">Total do Pedido</p>
                <p className="text-xl font-bold text-blue-800">R$ {brl(totalPedido)}</p>
              </div>
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-blue-600">Total Informado</p>
                <p className="text-lg font-bold text-blue-700">R$ {brl(totalPago)}</p>
              </div>
              {troco > 0 && <div className="flex justify-between items-center mt-2 pt-2 border-t border-blue-200">
                <p className="text-sm font-bold text-green-700">Troco</p>
                <p className="text-lg font-bold text-green-700">R$ {brl(troco)}</p>
              </div>}
              <div className={`mt-3 px-3 py-2 rounded-xl text-xs font-medium text-center ${Math.abs(totalPago-totalPedido)<0.02?'bg-green-100 text-green-700':'bg-orange-100 text-orange-700'}`}>
                {Math.abs(totalPago-totalPedido)<0.02 ? '✓ Valores conferem' : `Pendente R$ ${brl(Math.abs(totalPedido-totalPago))}`}
              </div>
            </div>
          </section>
          <div className="flex justify-between">
            <button onClick={() => setActiveTab('transporte')} className="px-6 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200">Voltar</button>
            <button onClick={editandoId ? handleFinalizarEdicao : handleFinalizar} disabled={salvando || !!validar()}
              className={`px-8 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 ${salvando || validar() ? 'bg-gray-200 text-gray-400' : editandoId ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-md' : 'bg-green-600 text-white hover:bg-green-700 shadow-md'}`}>
              {salvando ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Salvando...</> : editandoId ? <><Save className="w-4 h-4" /> Salvar Alterações</> : <><Save className="w-4 h-4" /> Finalizar Pedido</>}
            </button>
          </div>
        </div>
      )}

      {/* Modal decisão financeira */}
      {modalFinanceiro?.show && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[400] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">Alteração Financeira Detectada</h3>
                <p className="text-xs text-gray-500">O valor do pedido foi alterado</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-6">Existem lançamentos financeiros pendentes vinculados a este pedido. O que deseja fazer?</p>
            <div className="space-y-3">
              <button onClick={() => salvarEdicao(modalFinanceiro.payload, 'recriar')}
                className="w-full px-4 py-3 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 text-left">
                🔄 Recriar lançamentos financeiros
                <p className="text-xs font-normal opacity-80 mt-0.5">Remove pendentes e gera novos com os valores atualizados</p>
              </button>
              <button onClick={() => salvarEdicao(modalFinanceiro.payload, 'manter')}
                className="w-full px-4 py-3 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-sm font-bold hover:bg-blue-100 text-left">
                ✅ Manter lançamentos existentes
                <p className="text-xs font-normal opacity-80 mt-0.5">Atualiza apenas os dados do pedido sem mexer no financeiro</p>
              </button>
              <button onClick={() => setModalFinanceiro(null)}
                className="w-full px-4 py-3 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {parcelamentoIdx !== null && (
        <PedidoParcelamentoModal
          total={pagamentos[parcelamentoIdx]?.valorPagamento ?? 0}
          inicial={pagamentos[parcelamentoIdx]?.vencimentos ?? []}
          onCancel={() => setParcelamentoIdx(null)}
          onConfirm={parts => { atualizarPagamento(parcelamentoIdx, 'vencimentos', parts); setParcelamentoIdx(null); }}
        />
      )}
    </div>
  );
};

const PedidoParcelamentoModal = ({ total, inicial, onConfirm, onCancel }: {
  total: number; inicial: { numero: number; vencimento: string; valor: number }[];
  onConfirm: (parts: { numero: number; vencimento: string; valor: number }[]) => void; onCancel: () => void;
}) => {
  const [numParcelas, setNumParcelas] = useState(inicial.length || 1);
  const [parcelas, setParcelas]       = useState<{ numero: number; vencimento: string; valor: number }[]>([]);
  const gerarParcelas = (n: number) => {
    const base = Math.floor((total / n) * 100) / 100; let soma = 0;
    setParcelas(Array.from({ length: n }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() + (i+1) * 30);
      const valor = i === n-1 ? round2(total - soma) : base; soma += base;
      return { numero: i+1, vencimento: d.toISOString().split('T')[0], valor };
    }));
  };
  useEffect(() => { if (inicial.length > 0) setParcelas(inicial); else gerarParcelas(numParcelas); }, []);
  useEffect(() => { gerarParcelas(numParcelas); }, [numParcelas]);
  const totalParcelas = parcelas.reduce((s, p) => s + p.valor, 0);
  const invalido = Math.abs(totalParcelas - total) > 0.01;
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[300] p-4 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <h3 className="text-lg font-bold text-gray-800">Configurar Parcelamento</h3>
          <span className="bg-blue-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold">TOTAL: R$ {brl(total)}</span>
        </div>
        <div className="p-6 space-y-4 flex-1 overflow-auto">
          <div className="bg-blue-50 p-4 rounded-2xl flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-blue-600 uppercase mb-1">Nº de Parcelas</label>
              <input type="number" min={1} value={numParcelas} onChange={e => setNumParcelas(Math.max(1, Number(e.target.value)))} className="w-full bg-white rounded-xl px-4 py-2 font-bold text-blue-800 outline-none focus:ring-2 focus:ring-blue-400 border-0" />
            </div>
            <p className="text-xs text-blue-500 font-medium">Intervalo padrão 30 dias</p>
          </div>
          <div className="border border-gray-100 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr>
                <th className="px-4 py-2 text-[10px] font-bold text-gray-400 text-left">#</th>
                <th className="px-4 py-2 text-[10px] font-bold text-gray-400 text-left">Vencimento</th>
                <th className="px-4 py-2 text-[10px] font-bold text-gray-400 text-right">Valor</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {parcelas.map((p, idx) => (
                  <tr key={p.numero}>
                    <td className="px-4 py-3 font-bold text-gray-400">{p.numero}</td>
                    <td className="px-4 py-3"><input type="date" value={p.vencimento} onChange={e => { const n=[...parcelas]; n[idx].vencimento=e.target.value; setParcelas(n); }} className="bg-transparent font-medium text-gray-700 outline-none focus:text-blue-600" /></td>
                    <td className="px-4 py-3 text-right"><input type="text" inputMode="decimal" value={p.valor.toLocaleString('pt-BR',{minimumFractionDigits:2})} onChange={e => { const n=[...parcelas]; n[idx].valor=Number(e.target.value.replace(/\D/g,''))/100; setParcelas(n); }} className="w-28 text-right bg-white border border-gray-100 rounded-lg px-2 py-1 font-bold text-gray-700 outline-none focus:ring-1 focus:ring-blue-500" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {invalido && <div className="bg-red-50 p-3 rounded-xl flex items-center gap-2 text-red-600 text-xs font-bold"><AlertCircle className="w-4 h-4" />Soma das parcelas (R$ {brl(totalParcelas)}) não confere.</div>}
        </div>
        <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-4">
          <button onClick={onCancel} className="flex-1 py-3 bg-white border border-gray-200 text-gray-500 font-semibold rounded-xl hover:bg-gray-100 text-sm">Cancelar</button>
          <button disabled={invalido} onClick={() => onConfirm(parcelas)} className={`flex-1 py-3 rounded-xl font-bold text-sm ${invalido?'bg-gray-200 text-gray-400 cursor-not-allowed':'bg-blue-600 text-white hover:bg-blue-700 shadow-md'}`}>Confirmar</button>
        </div>
      </motion.div>
    </div>
  );
};

export default PedidoTab;
