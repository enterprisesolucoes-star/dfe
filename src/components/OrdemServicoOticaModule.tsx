import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, X, ChevronDown, User, CheckCircle, Save, Send, Package, RefreshCw, Glasses, Wrench, MessageCircle } from 'lucide-react';
import { Cliente, Produto } from '../types/nfce';
import type { Vendedor } from '../contexts/AppDataContext';

interface ItemOS { id?:number; tipo:'produto'|'servico'; produto_id?:number; descricao:string; unidade:string; quantidade:number; valor_unitario:number; valor_total:number; }
interface Receita { longe_od_esferico?:string; longe_od_cilindrico?:string; longe_od_eixo?:string; longe_od_dnp?:string; longe_od_altura?:string; longe_oe_esferico?:string; longe_oe_cilindrico?:string; longe_oe_eixo?:string; longe_oe_dnp?:string; longe_oe_altura?:string; perto_od_esferico?:string; perto_od_cilindrico?:string; perto_od_eixo?:string; perto_od_dnp?:string; perto_od_altura?:string; perto_od_adicao?:string; perto_oe_esferico?:string; perto_oe_cilindrico?:string; perto_oe_eixo?:string; perto_oe_dnp?:string; perto_oe_altura?:string; perto_oe_adicao?:string; d_maior?:string; horizontal?:string; vertical?:string; ponte?:string; tipo_armacao?:string; laboratorio?:string; observacoes?:string; }
interface OS { id?:number; numero?:number; cliente_id?:string; cliente_nome?:string; cliente_doc?:string; cliente_fone?:string; vendedor_id?:string; status:string; previsao?:string; observacoes?:string; itens:ItemOS[]; receita?:Receita; total?:number; }
interface Props { clientes:Cliente[]; produtos:Produto[]; vendedores?:Vendedor[]; emitente:any; showAlert:(t:string,m:string)=>void; showConfirm:(t:string,m:string,cb:()=>void)=>void; fetchClientes?:(q:string)=>Promise<void>; fetchProdutosOtica?:(q:string)=>Promise<void>; onAfterSave?:()=>void; }

const brl = (v:number) => v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const fmtDate = (s?:string) => s ? new Date(s+'T00:00:00').toLocaleDateString('pt-BR') : '';
const STATUS_COLORS:Record<string,string> = { Rascunho:'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300', Aberta:'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300', 'Em andamento':'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300', Concluída:'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300', Cancelada:'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400', Finalizada:'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300' };
const REC0:Receita = {longe_od_esferico:'',longe_od_cilindrico:'',longe_od_eixo:'',longe_od_dnp:'',longe_od_altura:'',longe_oe_esferico:'',longe_oe_cilindrico:'',longe_oe_eixo:'',longe_oe_dnp:'',longe_oe_altura:'',perto_od_esferico:'',perto_od_cilindrico:'',perto_od_eixo:'',perto_od_dnp:'',perto_od_altura:'',perto_od_adicao:'',perto_oe_esferico:'',perto_oe_cilindrico:'',perto_oe_eixo:'',perto_oe_dnp:'',perto_oe_altura:'',perto_oe_adicao:'',d_maior:'',horizontal:'',vertical:'',ponte:'',tipo_armacao:'',laboratorio:'',observacoes:''};
const F0 = ():OS => ({cliente_id:'',cliente_nome:'',cliente_doc:'',cliente_fone:'',vendedor_id:'',status:'Rascunho',previsao:'',observacoes:'',itens:[],receita:{...REC0}});
const getLocalToday = () => { const o=new Date().getTimezoneOffset()*60000; return new Date(Date.now()-o).toISOString().split('T')[0]; };

const CI = ({value,onChange,w='w-20'}:{value:string;onChange:(v:string)=>void;w?:string}) => (
  <input type="text" value={value} onChange={e=>onChange(e.target.value)} className={`${w} px-1 py-1 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white focus:border-blue-500 outline-none text-center`}/>
);

const ModalFinalizar = ({os,onClose,showAlert}:{os:OS;onClose:(r:boolean)=>void;showAlert:(t:string,m:string)=>void}) => {
  const [opcao,setOpcao] = useState<'finalizar'|'nfce'|'nfe'>('finalizar');
  const [loading,setLoading] = useState(false);
  const confirmar = async () => {
    setLoading(true);
    try {
      const action = opcao==='finalizar'?'salvar_os_otica':opcao==='nfce'?'emitir_nfce_os':'emitir_nfe_os';
      const body = opcao==='finalizar'?{...os,status:'Finalizada'}:{os_id:os.id};
      const r = await fetch(`./api.php?action=${action}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const d = await r.json();
      if(d.success){showAlert('Sucesso',opcao==='finalizar'?'OS finalizada!':`${opcao==='nfce'?'NFC-e':'NF-e'} emitida!`);onClose(true);}
      else showAlert('Erro',d.message||'Falha.');
    } catch{showAlert('Erro','Falha na requisição.');}
    setLoading(false);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="font-semibold text-gray-900 dark:text-white flex items-center gap-2"><CheckCircle size={18} className="text-green-500"/>Finalizar OS #{os.numero||os.id}</span>
          <button onClick={()=>onClose(false)}><X size={18} className="text-gray-400 hover:text-gray-700 dark:hover:text-white"/></button>
        </div>
        <p className="text-sm text-gray-500 mb-4">Como deseja concluir esta OS?</p>
        <div className="space-y-2">
          {([['finalizar','Apenas Finalizar','Marca como finalizada sem emitir nota'],['nfce','Emitir NFC-e','Emite Nota Fiscal de Consumidor e finaliza'],['nfe','Emitir NF-e','Emite Nota Fiscal Eletrônica e finaliza']] as [string,string,string][]).map(([v,l,d])=>(
            <label key={v} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${opcao===v?'border-blue-500 bg-blue-50 dark:bg-blue-500/10':'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
              <input type="radio" name="op" value={v} checked={opcao===v as any} onChange={()=>setOpcao(v as any)} className="mt-0.5 accent-blue-500"/>
              <div><div className="text-sm font-medium text-gray-900 dark:text-white">{l}</div><div className="text-xs text-gray-500">{d}</div></div>
            </label>
          ))}
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={()=>onClose(false)} className="flex-1 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800">Cancelar</button>
          <button onClick={confirmar} disabled={loading} className="flex-1 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
            {loading?<><RefreshCw size={14} className="animate-spin"/>Aguarde...</>:<><Send size={14}/>Confirmar</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export const OrdemServicoOticaTab = ({clientes,produtos,vendedores=[],emitente,showAlert,showConfirm,fetchClientes,fetchProdutosOtica,onAfterSave}:Props) => {
  const [viewMode,setViewMode] = useState<'list'|'form'>('list');
  const [lista,setLista] = useState<OS[]>([]);
  const [loading,setLoading] = useState(false);
  const [busca,setBusca] = useState('');
  const [filtroStatus,setFiltroStatus] = useState('');
  const [di,setDi] = useState(()=>{const d=new Date();d.setDate(1);return d.toISOString().split('T')[0];});
  const [df,setDf] = useState(getLocalToday);
  const [form,setForm] = useState<OS>(F0());
  const [saving,setSaving] = useState(false);
  const [receitaOpen,setReceitaOpen] = useState(false);
  const [tipoItem,setTipoItem] = useState<'produto'|'servico'>('produto');
  const [buscaItem,setBuscaItem] = useState('');
  const [dropItem,setDropItem] = useState(false);
  const [itemSel,setItemSel] = useState<Produto|null>(null);
  const [itemQtd,setItemQtd] = useState(1);
  const [itemVlr,setItemVlr] = useState(0);
  const [itemUnid,setItemUnid] = useState('UN');
  const [itemDesc,setItemDesc] = useState('');
  const [buscaCli,setBuscaCli] = useState('');
  const [dropCli,setDropCli] = useState(false);
  const [modoCli,setModoCli] = useState<'cadastrado'|'manual'>('cadastrado');
  const [modalFin,setModalFin] = useState<OS|null>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [clienteDebito,setClienteDebito] = useState<{total:number;qtd:number}|null>(null);
  const [loadingDebito,setLoadingDebito] = useState(false);
  const [showWaModal,setShowWaModal] = useState(false);
  const [waPhone,setWaPhone] = useState('');
  const [waMensagem,setWaMensagem] = useState('');
  const [waSending,setWaSending] = useState(false);
  const fetchDebito = async (clienteId:string) => {
    setLoadingDebito(true); setClienteDebito(null);
    try {
      const r=await fetch(`./api.php?action=debitos_cliente&cliente_id=${clienteId}`);
      const d=await r.json();
      if(d&&Number(d.total)>0) setClienteDebito({total:Number(d.total),qtd:Number(d.qtd)});
      else setClienteDebito(null);
    } catch{setClienteDebito(null);}
    setLoadingDebito(false);
  };
  const abrirWaModal = () => {
    const phone=(form.cliente_fone||'').replace(/\D/g,'');
    const empresa=emitente?.razaoSocial||emitente?.nomeFantasia||'Nossa empresa';
    const nome=(form.cliente_nome||'').split(' ')[0];
    const totalOS=form.itens.reduce((s,i)=>s+i.valor_total,0);
    setWaPhone(phone);
    setWaMensagem(`Olá ${nome}, tudo bem? 😊

Somos da *${empresa}* e gostaríamos de informar sobre sua Ordem de Serviço.

`+(form.observacoes?`📋 *Serviço:* ${form.observacoes}
`:'')+( form.previsao?`📅 *Previsão:* ${new Date(form.previsao+'T12:00:00').toLocaleDateString('pt-BR')}
`:'')+`💰 *Valor:* ${brl(totalOS)}

Qualquer dúvida, estamos à disposição!`);
    setShowWaModal(true);
  };
  const enviarWa = async () => {
    if(!waPhone||waPhone.length<10||!waMensagem.trim()) return;
    setWaSending(true);
    try {
      const r=await fetch('/api/whatsapp/send-text',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:waPhone,text:waMensagem})});
      const d=await r.json();
      if(d.success){setShowWaModal(false);showAlert('WhatsApp','Mensagem enviada! ✅');setWaSending(false);return;}
    } catch{}
    setWaSending(false);
    window.open(`https://wa.me/55${waPhone}?text=${encodeURIComponent(waMensagem)}`,'_blank');
    setShowWaModal(false);
  };

  const fetchLista = async () => {
    setLoading(true);
    try { const r=await fetch(`./api.php?action=listar_os_otica&data_inicio=${di}&data_fim=${df}`); const d=await r.json(); setLista(Array.isArray(d)?d:[]); }
    catch{setLista([]);}
    setLoading(false);
  };
  useEffect(()=>{fetchLista();},[di,df]);
  useEffect(()=>{
    const h=(e:MouseEvent)=>{if(dropRef.current&&!dropRef.current.contains(e.target as Node))setDropItem(false);};
    document.addEventListener('mousedown',h); return()=>document.removeEventListener('mousedown',h);
  },[]);

  const abrirForm = (os?:OS) => { setForm(os?{...os,receita:os.receita||{...REC0}}:F0()); setBuscaCli(os?.cliente_nome||''); setReceitaOpen(false); setViewMode('form'); window.scrollTo({top:0,behavior:'smooth'}); };
  const voltarLista = () => { setForm(F0()); setBuscaCli(''); setReceitaOpen(false); setViewMode('list'); };

  const selCli = (id:string) => { const c=clientes.find(x=>String(x.id)===id); if(c){setForm(f=>({...f,cliente_id:String(c.id),cliente_nome:c.nome,cliente_doc:(c as any).documento||'',cliente_fone:(c as any).telefone||''}));setBuscaCli(c.nome);fetchDebito(String(c.id));} setDropCli(false); };

  const addItem = () => {
    if(tipoItem==='produto'&&!itemSel){showAlert('Atenção','Selecione um produto.');return;}
    if(tipoItem==='servico'&&!itemDesc.trim()){showAlert('Atenção','Informe a descrição.');return;}
    const it:ItemOS={tipo:tipoItem,produto_id:tipoItem==='produto'?itemSel?.id:undefined,descricao:tipoItem==='produto'?((itemSel as any)?.descricao||(itemSel as any)?.nome||buscaItem||''):itemDesc,unidade:itemUnid,quantidade:itemQtd,valor_unitario:itemVlr,valor_total:+(itemQtd*itemVlr).toFixed(2)};
    setForm(f=>({...f,itens:[...f.itens,it]}));
    setItemSel(null);setBuscaItem('');setItemDesc('');setItemQtd(1);setItemVlr(0);setItemUnid('UN');
  };
  const total = form.itens.reduce((s,i)=>s+i.valor_total,0);

  const salvar = async () => {
    if(!form.cliente_nome&&!form.cliente_id){showAlert('Atenção','Informe o cliente.');return;}
    if(form.itens.length===0){showAlert('Atenção','Adicione ao menos um item.');return;}
    setSaving(true);
    try {
      const r=await fetch('./api.php?action=salvar_os_otica',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...form,total})});
      const d=await r.json();
      if(d.success){showAlert('Sucesso',form.id?'OS atualizada!':'OS criada!');voltarLista();fetchLista();onAfterSave?.();}
      else showAlert('Erro',d.message||'Falha ao salvar.');
    } catch{showAlert('Erro','Falha na requisição.');}
    setSaving(false);
  };

  const excluir = (os:OS) => showConfirm('Excluir','Deseja excluir a OS #'+(os.numero||os.id)+'?',async()=>{
    try{const r=await fetch('./api.php?action=excluir_os_otica',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:os.id})});const d=await r.json();if(d.success){showAlert('Sucesso','OS excluída.');fetchLista();}else showAlert('Erro',d.message||'Falha.');}catch{showAlert('Erro','Falha.');}
  });

  const setR=(k:keyof Receita)=>(v:string)=>setForm(f=>({...f,receita:{...(f.receita||REC0),[k]:v}}));
  const rec=form.receita||REC0;
  const listaFiltrada=lista.filter(os=>{const q=busca.toLowerCase();return(!q||(os.cliente_nome||'').toLowerCase().includes(q)||String(os.numero||'').includes(q))&&(!filtroStatus||os.status===filtroStatus);});

  // ── LISTA ──
  if(viewMode==='list') return (
    <div className="p-4">
      {modalFin&&<ModalFinalizar os={modalFin} showAlert={showAlert} onClose={(r)=>{setModalFin(null);if(r)fetchLista();}}/>}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-sm text-gray-500 dark:text-gray-400">De:</span>
        <input type="date" value={di} onChange={e=>setDi(e.target.value)} className="px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none"/>
        <span className="text-sm text-gray-500 dark:text-gray-400">Até:</span>
        <input type="date" value={df} onChange={e=>setDf(e.target.value)} className="px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none"/>
        <button onClick={fetchLista} className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"><RefreshCw size={14}/> Atualizar</button>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input type="text" value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Nº OS ou nome..." className="pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-48"/>
        </div>
        <select value={filtroStatus} onChange={e=>setFiltroStatus(e.target.value)} className="px-2 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 outline-none">
          <option value="">Todos status</option>
          {['Rascunho','Aberta','Em andamento','Concluída','Cancelada','Finalizada'].map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <div className="flex-1"/>
        <button onClick={()=>abrirForm()} className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Glasses size={14}/> Nova OS
        </button>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading?(
          <div className="flex items-center justify-center py-16 text-gray-400 gap-2 text-sm"><RefreshCw size={16} className="animate-spin"/>Carregando...</div>
        ):listaFiltrada.length===0?(
          <div className="text-center py-16 text-gray-400 text-sm">Nenhuma OS no período. Clique em "Nova OS" para começar.</div>
        ):(
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase">Nº</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase">Cliente</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase hidden md:table-cell">Abertura</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase hidden md:table-cell">Previsão</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase text-right">Total</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase">Status</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {listaFiltrada.map(os=>(
                  <tr key={os.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">{String(os.numero||os.id||'').padStart(4,'0')}</td>
                    <td className="px-4 py-3"><div className="font-medium text-gray-900 dark:text-gray-100">{os.cliente_nome||'—'}</div>{os.cliente_doc&&<div className="text-xs text-gray-400">{os.cliente_doc}</div>}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs hidden md:table-cell">{os.created_at?new Date(os.created_at).toLocaleDateString('pt-BR'):'—'}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs hidden md:table-cell">{os.previsao?fmtDate(os.previsao):'—'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-blue-600 dark:text-blue-400">{brl(os.total||0)}</td>
                    <td className="px-4 py-3"><span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[os.status]||'bg-gray-100 text-gray-600'}`}>{os.status}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={()=>abrirForm(os)} title="Editar" className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"><Edit2 size={14}/></button>
                        {os.status==='Concluída'&&<button onClick={()=>setModalFin(os)} title="Finalizar" className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10 rounded-lg transition-colors"><Send size={14}/></button>}
                        <button onClick={()=>excluir(os)} title="Excluir" className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 size={14}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  // ── FORMULÁRIO ──
  return (
    <div className="flex flex-col gap-4 p-4">
      {showWaModal&&(
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 p-4" onClick={()=>setShowWaModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center"><MessageCircle size={18} className="text-green-600 dark:text-green-400"/></div>
                <div><h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">Enviar mensagem WhatsApp</h3><p className="text-xs text-gray-400">{form.cliente_nome}</p></div>
              </div>
              <button onClick={()=>setShowWaModal(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X size={16} className="text-gray-400"/></button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Telefone (com DDD)</label>
              <input type="tel" value={waPhone} onChange={e=>setWaPhone(e.target.value.replace(/\D/g,''))} placeholder="11999999999" className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"/>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Mensagem</label>
                <span className="text-xs text-gray-400">{waMensagem.length} caracteres</span>
              </div>
              <textarea value={waMensagem} onChange={e=>setWaMensagem(e.target.value)} rows={7} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"/>
              <p className="text-xs text-gray-400 mt-1">Use *texto* para negrito</p>
            </div>
            <div className="flex gap-2">
              <button onClick={()=>setShowWaModal(false)} className="flex-1 py-2.5 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Cancelar</button>
              <button onClick={enviarWa} disabled={waSending||waPhone.length<10||!waMensagem.trim()} className="flex-1 py-2.5 text-sm font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {waSending?<RefreshCw size={14} className="animate-spin"/>:<MessageCircle size={14}/>}{waSending?'Enviando...':'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={voltarLista} className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
          ← Voltar
        </button>
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
          <Glasses size={15} className="text-blue-500"/>{form.id?`Editando OS #${form.numero||form.id}`:'Nova OS – Ótica'}
        </span>
      </div>

      {/* Cliente */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2"><User size={14} className="text-blue-500"/>Cliente</span>
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 p-0.5 rounded-lg">
            {(['cadastrado','manual'] as const).map(m=>(
              <button key={m} onClick={()=>{setModoCli(m);setClienteDebito(null);setBuscaCli('');}}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-150 ${modoCli===m?'bg-blue-600 text-white shadow-sm':'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                {m==='cadastrado'?'Cadastrado':'Manual'}
              </button>
            ))}
          </div>
        </div>
        {modoCli==='cadastrado'&&(
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input type="text" placeholder="Localizar por nome, documento ou celular..." value={buscaCli}
              onChange={e=>{setBuscaCli(e.target.value);setDropCli(true);clearTimeout((window as any)._ct);if(e.target.value.length>=2)(window as any)._ct=setTimeout(()=>fetchClientes?.(e.target.value),400);if(!e.target.value)setForm(f=>({...f,cliente_id:'',cliente_nome:''}));}}
              onFocus={()=>setDropCli(true)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none"/>
            {dropCli&&clientes.filter(c=>!buscaCli||(c.nome||'').toLowerCase().includes(buscaCli.toLowerCase())||(c as any).documento?.includes(buscaCli)).length>0&&(
              <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                {clientes.filter(c=>!buscaCli||(c.nome||'').toLowerCase().includes(buscaCli.toLowerCase())||(c as any).documento?.includes(buscaCli)).slice(0,10).map(c=>(
                  <div key={c.id} onMouseDown={()=>selCli(String(c.id))} className="px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                    <div className="font-medium">{c.nome}</div>
                    {(c as any).documento&&<div className="text-xs text-gray-400">{(c as any).documento}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {modoCli==='cadastrado'&&form.cliente_id&&(
          <div className="mt-2 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-blue-600 dark:text-blue-400 pl-1">✓ {form.cliente_nome}{form.cliente_doc?` — ${form.cliente_doc}`:''}</p>
              {form.cliente_fone&&(<button type="button" onClick={abrirWaModal} className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold rounded-lg transition-colors"><MessageCircle size={13}/>WhatsApp</button>)}
            </div>
            {loadingDebito&&<div className="flex items-center gap-1.5 text-xs text-gray-400 pl-1"><RefreshCw size={11} className="animate-spin"/>Verificando débitos...</div>}
            {!loadingDebito&&clienteDebito&&clienteDebito.total>0&&(
              <div className="flex items-center gap-3 px-3 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <span className="text-lg shrink-0">⚠️</span>
                <div><p className="text-xs font-semibold text-red-700 dark:text-red-400">Cliente com débito em aberto</p><p className="text-xs text-red-600 dark:text-red-400">{clienteDebito.qtd} {clienteDebito.qtd===1?'título':'títulos'} · Total: <span className="font-bold">{brl(clienteDebito.total)}</span></p></div>
              </div>
            )}
          </div>
        )}
        {modoCli==='manual'&&(
          <div className="grid grid-cols-2 gap-2 mt-2">
            <input type="text" placeholder="Nome" value={form.cliente_nome||''} onChange={e=>setForm(f=>({...f,cliente_nome:e.target.value}))} className="col-span-2 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none"/>
            <input type="text" placeholder="CPF/CNPJ" value={form.cliente_doc||''} onChange={e=>setForm(f=>({...f,cliente_doc:e.target.value}))} className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none"/>
            <input type="text" placeholder="Telefone" value={form.cliente_fone||''} onChange={e=>setForm(f=>({...f,cliente_fone:e.target.value}))} className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none"/>
          </div>
        )}
        {/* Vendedor / Status / Previsão / Obs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Vendedor</label>
            <select value={form.vendedor_id||''} onChange={e=>setForm(f=>({...f,vendedor_id:e.target.value}))} className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">Sem vendedor</option>{vendedores.map(v=><option key={v.id} value={v.id}>{v.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Status</label>
            <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))} className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none">
              {['Rascunho','Aberta','Em andamento','Concluída','Cancelada','Finalizada'].map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Previsão</label>
            <input type="date" value={form.previsao||''} onChange={e=>setForm(f=>({...f,previsao:e.target.value}))} className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"/>
          </div>
          <div className="col-span-2 sm:col-span-3">
            <label className="text-xs text-gray-500 block mb-1">Observações</label>
            <textarea rows={2} value={form.observacoes||''} onChange={e=>setForm(f=>({...f,observacoes:e.target.value}))} placeholder="Defeito relatado, peças necessárias, etc."
              className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none resize-none"/>
          </div>
        </div>
      </div>

      {/* Botão Receita */}
      <button onClick={()=>setReceitaOpen(r=>!r)}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-200 ${receitaOpen?'bg-blue-50 dark:bg-blue-600/20 border-blue-400 text-blue-600 dark:text-blue-300':'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'}`}>
        <span className="flex items-center gap-2 text-sm font-medium"><Glasses size={15}/>Receita Óptica</span>
        <ChevronDown size={15} className={`transition-transform duration-300 ${receitaOpen?'rotate-180':''}`}/>
      </button>

      {/* Painel Receita */}
      <div className="overflow-hidden transition-all duration-500" style={{maxHeight:receitaOpen?'900px':'0',opacity:receitaOpen?1:0}}>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
          <div className="overflow-x-auto">
            <table className="text-xs w-full">
              <thead><tr>
                <th className="w-16 text-left text-gray-400 pb-2"></th>
                <th className="w-8 text-gray-400 pb-2"></th>
                {['Esférico','Cilíndrico','Eixo','DNP','Altura','Adição'].map(h=><th key={h} className="text-gray-500 pb-2 px-1 text-center font-medium">{h}</th>)}
              </tr></thead>
              <tbody>
                <tr>
                  <td rowSpan={2} className="font-bold text-blue-500 pr-2 align-middle">LONGE</td>
                  <td className="text-gray-400 pr-1 py-0.5 whitespace-nowrap">OD:</td>
                  {(['longe_od_esferico','longe_od_cilindrico','longe_od_eixo','longe_od_dnp','longe_od_altura'] as (keyof Receita)[]).map(k=><td key={k} className="py-0.5 px-1"><CI value={rec[k]||''} onChange={setR(k)}/></td>)}
                  <td className="py-0.5 px-1 text-center text-gray-300">—</td>
                </tr>
                <tr>
                  <td className="text-gray-400 pr-1 py-0.5 whitespace-nowrap">OE:</td>
                  {(['longe_oe_esferico','longe_oe_cilindrico','longe_oe_eixo','longe_oe_dnp','longe_oe_altura'] as (keyof Receita)[]).map(k=><td key={k} className="py-0.5 px-1"><CI value={rec[k]||''} onChange={setR(k)}/></td>)}
                  <td className="py-0.5 px-1 text-center text-gray-300">—</td>
                </tr>
                <tr><td colSpan={8} className="py-1"></td></tr>
                <tr>
                  <td rowSpan={2} className="font-bold text-green-500 pr-2 align-middle">PERTO</td>
                  <td className="text-gray-400 pr-1 py-0.5 whitespace-nowrap">OD:</td>
                  {(['perto_od_esferico','perto_od_cilindrico','perto_od_eixo','perto_od_dnp','perto_od_altura','perto_od_adicao'] as (keyof Receita)[]).map(k=><td key={k} className="py-0.5 px-1"><CI value={rec[k]||''} onChange={setR(k)}/></td>)}
                </tr>
                <tr>
                  <td className="text-gray-400 pr-1 py-0.5 whitespace-nowrap">OE:</td>
                  {(['perto_oe_esferico','perto_oe_cilindrico','perto_oe_eixo','perto_oe_dnp','perto_oe_altura','perto_oe_adicao'] as (keyof Receita)[]).map(k=><td key={k} className="py-0.5 px-1"><CI value={rec[k]||''} onChange={setR(k)}/></td>)}
                </tr>
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-3">
            {(['d_maior','horizontal','vertical','ponte'] as (keyof Receita)[]).map(k=>(
              <div key={k} className="flex items-center gap-1.5"><span className="text-xs text-gray-400 whitespace-nowrap capitalize">{k.replace('_',' ')}</span><CI value={rec[k]||''} onChange={setR(k)} w="w-16"/></div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-gray-400 block mb-1">Tipo de Armação</label><input type="text" value={rec.tipo_armacao||''} onChange={e=>setR('tipo_armacao')(e.target.value)} className="w-full px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"/></div>
            <div><label className="text-xs text-gray-400 block mb-1">Laboratório de Destino</label><input type="text" value={rec.laboratorio||''} onChange={e=>setR('laboratorio')(e.target.value)} className="w-full px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"/></div>
          </div>
          <div><label className="text-xs text-gray-400 block mb-1">Observações da Receita</label><textarea rows={2} value={rec.observacoes||''} onChange={e=>setR('observacoes')(e.target.value)} className="w-full px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"/></div>
        </div>
      </div>

      {/* Adicionar Item */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2"><Package size={14} className="text-blue-500"/>Adicionar Item</span>
          <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            {(['produto','servico'] as const).map(t=>(
              <button key={t} onClick={()=>{setTipoItem(t);setBuscaItem('');setItemSel(null);setItemDesc('');}}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${tipoItem===t?'bg-blue-600 text-white':'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>
                {t==='produto'?'Peça/Produto':'Serviço'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-end">
          {tipoItem==='produto'?(
            <div className="relative flex-1 min-w-48" ref={dropRef}>
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input type="text" placeholder="Localizar por nome, código ou código de barras..." value={buscaItem}
                onChange={e=>{const v=e.target.value;setBuscaItem(v);setItemSel(null);setDropItem(true);clearTimeout((window as any)._oticaProdTimer);if(v.length>=1)(window as any)._oticaProdTimer=setTimeout(()=>fetchProdutosOtica?.(v),300);else setDropItem(false);}} onFocus={()=>setDropItem(true)}
                className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none"/>
              {dropItem&&buscaItem.length>=1&&(
                <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl max-h-40 overflow-y-auto">
                  {produtos.length>0?produtos.slice(0,10).map(p=>(
                    <div key={p.id} onMouseDown={()=>{setItemSel(p);setBuscaItem((p as any).descricao||p.nome||'');setItemVlr(Number((p as any).valorUnitario||(p as any).preco_venda||0));setItemUnid((p as any).unidadeComercial||(p as any).unidade||'UN');setDropItem(false);}}
                      className="px-3 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer flex justify-between gap-2">
                      <div><span className="font-medium">{(p as any).descricao||p.nome}</span>{(p as any).codigoInterno&&<span className="text-gray-400 ml-2">#{(p as any).codigoInterno}</span>}</div>
                      <span className="text-green-500 font-semibold whitespace-nowrap">{brl(Number((p as any).valorUnitario||(p as any).preco_venda||0))}</span>
                    </div>
                  )):<div className="px-3 py-2 text-xs text-gray-400 text-center">Nenhum produto encontrado.</div>}
                </div>
              )}
            </div>
          ):(
            <input type="text" placeholder="Descrição do serviço" value={itemDesc} onChange={e=>setItemDesc(e.target.value)}
              className="flex-1 min-w-48 px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none"/>
          )}
          <div className="flex items-end gap-2">
            <div><label className="text-[10px] text-gray-400 block mb-0.5">Unid.</label><input type="text" value={itemUnid} onChange={e=>setItemUnid(e.target.value)} className="w-14 px-2 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-center focus:ring-2 focus:ring-blue-500 outline-none"/></div>
            <div><label className="text-[10px] text-gray-400 block mb-0.5">Qtd</label><input type="number" min={1} step={0.01} value={itemQtd} onChange={e=>setItemQtd(+e.target.value)} className="w-16 px-2 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-center focus:ring-2 focus:ring-blue-500 outline-none"/></div>
            <div><label className="text-[10px] text-gray-400 block mb-0.5">Valor Unit.</label><input type="number" min={0} step={0.01} value={itemVlr} onChange={e=>setItemVlr(+e.target.value)} className="w-24 px-2 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-right focus:ring-2 focus:ring-blue-500 outline-none"/></div>
            <button onClick={addItem} className="px-4 py-2 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap"><Plus size={13}/>Adicionar</button>
          </div>
        </div>
      </div>

      {/* Tabela Itens */}
      {form.itens.length>0?(
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700"><tr>
              <th className="text-left px-3 py-2 text-gray-500 font-medium">Descrição</th>
              <th className="text-center px-3 py-2 text-gray-500 font-medium w-16">Unid.</th>
              <th className="text-center px-3 py-2 text-gray-500 font-medium w-16">Qtd</th>
              <th className="text-right px-3 py-2 text-gray-500 font-medium w-24">Unit.</th>
              <th className="text-right px-3 py-2 text-gray-500 font-medium w-24">Total</th>
              <th className="w-8"></th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {form.itens.map((it,i)=>(
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-200">
                    <span className={`inline-block mr-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${it.tipo==='produto'?'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400':'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400'}`}>{it.tipo==='produto'?'PROD':'SVC'}</span>
                    {it.descricao}
                  </td>
                  <td className="px-3 py-2 text-center text-gray-500">{it.unidade}</td>
                  <td className="px-3 py-2 text-center text-gray-700 dark:text-gray-300">{it.quantidade}</td>
                  <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{brl(it.valor_unitario)}</td>
                  <td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-white">{brl(it.valor_total)}</td>
                  <td className="px-2 py-2 text-center"><button onClick={()=>setForm(f=>({...f,itens:f.itens.filter((_,j)=>j!==i)}))} className="text-gray-300 hover:text-red-500"><X size={13}/></button></td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700"><tr>
              <td colSpan={4} className="px-3 py-2 text-right text-gray-500 font-medium">Total</td>
              <td className="px-3 py-2 text-right font-bold text-gray-900 dark:text-white">{brl(total)}</td>
              <td></td>
            </tr></tfoot>
          </table>
        </div>
      ):(
        <div className="text-center py-8 text-xs text-gray-400 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800">
          Nenhum item adicionado. Use os campos acima para adicionar peças/produtos ou serviços.
        </div>
      )}

      {/* Botões */}
      <div className="flex justify-end gap-3 pb-4">
        <button onClick={voltarLista} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800">Cancelar</button>
        <button onClick={salvar} disabled={saving} className="px-6 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-50 flex items-center gap-2">
          {saving?<><RefreshCw size={14} className="animate-spin"/>Salvando...</>:<><Save size={14}/>{form.id?'Atualizar OS':'Salvar OS'}</>}
        </button>
      </div>
    </div>
  );
};
