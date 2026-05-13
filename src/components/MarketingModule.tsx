import React, { useState, useEffect, useCallback } from 'react';
import { Gift, Tag, UserX, Send, CheckCircle, AlertCircle, ChevronLeft, Sparkles } from 'lucide-react';

const brl = (v: number) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

type Cliente = {
  id: number;
  nome: string;
  telefone: string;
  data_nascimento?: string;
  ultima_compra?: string;
  selecionado?: boolean;
};

type Progresso = { atual: number; total: number; nome: string } | null;

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// ─── Fogos de artifício ────────────────────────────────────────────────────
export const FogosAniversario = ({ nomes, onClose }: { nomes: string[]; onClose: () => void }) => {
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; color: string; angle: number }[]>([]);

  useEffect(() => {
    const colors = ['#ff4444', '#ff9900', '#ffdd00', '#00dd44', '#00aaff', '#aa44ff', '#ff44aa'];
    const ps = Array.from({ length: 80 }, (_, i) => ({
      id: i,
      x: 20 + Math.random() * 60,
      y: 10 + Math.random() * 60,
      color: colors[Math.floor(Math.random() * colors.length)],
      angle: Math.random() * 360,
    }));
    setParticles(ps);
    const t = setTimeout(onClose, 6000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
      {particles.map(p => (
        <div key={p.id} className="absolute w-2 h-2 rounded-full animate-ping"
          style={{ left: `${p.x}%`, top: `${p.y}%`, backgroundColor: p.color, animationDuration: `${0.5 + Math.random()}s`, animationDelay: `${Math.random() * 2}s` }} />
      ))}
      <div className="pointer-events-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-sm text-center border border-yellow-200 dark:border-yellow-700">
        <div className="text-5xl mb-4">🎂</div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Aniversariantes de Hoje!</h2>
        <div className="space-y-1 mb-4">
          {nomes.map((n, i) => <p key={i} className="text-blue-600 dark:text-blue-400 font-semibold">🎉 {n}</p>)}
        </div>
        <button onClick={onClose} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          Fechar
        </button>
      </div>
    </div>
  );
};

// ─── Seleção de clientes ───────────────────────────────────────────────────
const ListaSelecao = ({ clientes, onChange }: { clientes: Cliente[]; onChange: (ids: number[]) => void }) => {
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set(clientes.filter(c => c.selecionado).map(c => c.id)));
  const [letraFiltro, setLetraFiltro] = useState('');
  const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const clientesFiltrados = letraFiltro ? clientes.filter(c => (c.nome || '').trim().toUpperCase().startsWith(letraFiltro)) : clientes;

  const toggle = (id: number) => {
    setSelecionados(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      onChange(Array.from(next));
      return next;
    });
  };

  const toggleAll = () => {
    if (selecionados.size === clientes.length) {
      setSelecionados(new Set());
      onChange([]);
    } else {
      const all = new Set(clientes.map(c => c.id));
      setSelecionados(all);
      onChange(Array.from(all));
    }
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <div className="bg-gray-50 dark:bg-gray-900 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-2">
          <input type="checkbox" checked={selecionados.size === clientes.length && clientes.length > 0}
            onChange={toggleAll} className="w-4 h-4 rounded" />
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
            {selecionados.size} de {clientes.length} selecionados
          </span>
          {letraFiltro && <button onClick={() => setLetraFiltro('')} className="text-xs text-blue-500 hover:text-blue-700">✕ Limpar filtro</button>}
        </div>
        <div className="flex flex-wrap gap-1">
          {LETRAS.map(l => (
            <button key={l} onClick={() => {
              const novaLetra = letraFiltro === l ? '' : l;
              setLetraFiltro(novaLetra);
              if (novaLetra) {
                const ids = clientes.filter(c => (c.nome || '').trim().toUpperCase().startsWith(novaLetra)).map(c => c.id);
                setSelecionados(prev => new Set([...Array.from(prev), ...ids]));
                onChange(Array.from(new Set([...Array.from(selecionados), ...ids])));
              }
            }}
              className={`w-6 h-6 text-[10px] font-bold rounded transition-colors ${letraFiltro === l ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-blue-100'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <div className="max-h-64 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-700">
        {clientesFiltrados.map(c => (
          <label key={c.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer">
            <input type="checkbox" checked={selecionados.has(c.id)} onChange={() => toggle(c.id)} className="w-4 h-4 rounded" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{c.nome}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">{c.telefone || 'Sem telefone'}
                {c.data_nascimento && ` · 🎂 ${new Date(c.data_nascimento + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`}
                {c.ultima_compra && ` · Última compra: ${new Date(c.ultima_compra).toLocaleDateString('pt-BR')}`}
              </p>
            </div>
          </label>
        ))}
        {clientes.length === 0 && (
          <p className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm italic">Nenhum cliente encontrado</p>
        )}
      </div>
    </div>
  );
};

// ─── Painel de envio ───────────────────────────────────────────────────────
const PainelEnvio = ({ clientes, mensagem, onVoltar, emitente }: {
  clientes: Cliente[]; mensagem: string; onVoltar: () => void; emitente: any;
}) => {
  const [texto, setTexto] = useState(mensagem);
  const [imagem, setImagem] = useState<{ base64: string; name: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [progresso, setProgresso] = useState<Progresso>(null);
  const [erros, setErros] = useState<string[]>([]);
  const [concluido, setConcluido] = useState(false);

  const handleImagem = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      setImagem({ base64, name: file.name });
    };
    reader.readAsDataURL(file);
  };

  const handleEnviar = async () => {
    if (!texto.trim()) return;
    setEnviando(true); setErros([]); setConcluido(false);
    const comTel = clientes.filter(c => c.telefone);
    for (let i = 0; i < comTel.length; i++) {
      const c = comTel[i];
      const phone = c.telefone.replace(/\D/g, '');
      setProgresso({ atual: i + 1, total: comTel.length, nome: c.nome });
      const primeiroNome = (c.nome || '').trim().split(/\s+/)[0];
      const nomeEmpresa = emitente?.razaoSocial || emitente?.nome || 'nossa empresa';
      const msg = texto
        .replace(/\{nome\}/g, primeiroNome)
        .replace(/\{nome_completo\}/g, c.nome)
        .replace(/\{empresa\}/g, nomeEmpresa);
      try {
        if (imagem) {
          await fetch('/api/whatsapp/send-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, base64: imagem.base64, caption: msg })
          });
        } else {
          await fetch('/api/whatsapp/send-text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, text: msg })
          });
        }
      } catch { setErros(p => [...p, `Falha: ${c.nome}`]); }
      if (i < comTel.length - 1) await delay(3000 + Math.random() * 3000);
    }
    setConcluido(true);
    setEnviando(false);
    setProgresso(null);
  };

  if (concluido) return (
    <div className="text-center py-10 space-y-4">
      <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Envio concluído!</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">{clientes.filter(c => c.telefone).length} mensagens enviadas</p>
      {erros.length > 0 && <p className="text-sm text-red-500">{erros.length} falhas</p>}
      <button onClick={onVoltar} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Voltar</button>
    </div>
  );

  return (
    <div className="space-y-4">
      <button onClick={onVoltar} className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
        <ChevronLeft className="w-4 h-4" /> Voltar
      </button>
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Mensagem</label>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">Use {'{nome}'} para o primeiro nome, {'{nome_completo}'} para nome completo, {'{empresa}'} para a empresa</p>
        <textarea rows={5} value={texto} onChange={e => setTexto(e.target.value)}
          className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm bg-white dark:bg-gray-800 outline-none focus:ring-2 focus:ring-blue-500/20 resize-none" />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Imagem (opcional)</label>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:border-blue-500 transition-colors text-sm text-gray-500 dark:text-gray-400">
            📎 {imagem ? imagem.name : 'Selecionar imagem'}
            <input type="file" accept="image/*" onChange={handleImagem} className="hidden" />
          </label>
          {imagem && (
            <button onClick={() => setImagem(null)} className="text-xs text-red-500 hover:text-red-700">Remover</button>
          )}
        </div>
        {imagem && <p className="text-xs text-green-600 dark:text-green-400 mt-1">✓ Imagem selecionada — será enviada junto com a mensagem</p>}
      </div>
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-sm text-blue-700 dark:text-blue-300">
        <p><strong>{clientes.filter(c => c.telefone).length}</strong> clientes com telefone serão notificados</p>
        {clientes.filter(c => !c.telefone).length > 0 &&
          <p className="text-amber-600 dark:text-amber-400 mt-1">{clientes.filter(c => !c.telefone).length} sem telefone serão ignorados</p>}
      </div>
      {progresso && (
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
          <p className="text-sm font-semibold text-green-700 dark:text-green-300 mb-2">
            Enviando {progresso.atual}/{progresso.total} — {progresso.nome}
          </p>
          <div className="w-full bg-green-200 dark:bg-green-800 rounded-full h-2">
            <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${(progresso.atual / progresso.total) * 100}%` }} />
          </div>
        </div>
      )}
      {erros.length > 0 && (
        <div className="space-y-1">
          {erros.map((e, i) => <p key={i} className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{e}</p>)}
        </div>
      )}
      <button onClick={handleEnviar} disabled={enviando || !texto.trim()}
        className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2">
        <Send className="w-4 h-4" /> {enviando ? 'Enviando...' : `Enviar para ${clientes.filter(c => c.telefone).length} clientes`}
      </button>
    </div>
  );
};

// ─── Módulo principal ──────────────────────────────────────────────────────
export const MarketingModule = ({ emitente, showAlert }: { emitente: any; showAlert: (t: string, m: string) => void }) => {
  const [aba, setAba] = useState<'menu' | 'aniversario' | 'promocao' | 'inativos' | 'envio'>('menu');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [selecionados, setSelecionados] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [mensagemPadrao, setMensagemPadrao] = useState('');
  const [inativosPeriodo, setInativosPeriodo] = useState<'3m' | '6m' | '1a' | '1amais'>('6m');

  const carregarAniversariantes = async () => {
    setLoading(true);
    try {
      const mes = new Date().getMonth() + 1;
      const dia = new Date().getDate();
      const res = await fetch(`./api.php?action=marketing_aniversariantes&mes=${mes}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        // Marcar aniversariantes do dia como selecionados
        const lista = data.filter((c: any) => c.telefone).map((c: any) => ({
          ...c,
          selecionado: new Date(c.data_nascimento + 'T12:00:00').getDate() === dia
        }));
        setClientes(lista);
        setSelecionados(lista.filter((c: any) => c.selecionado).map((c: any) => c.id));
        setMensagemPadrao(`🎂 Parabéns, {nome}!\n\nEm nome de toda a equipe da {empresa}, desejamos um feliz aniversário! 🎉\n\nQue este dia seja repleto de alegrias e realizações!\n\nCom carinho,\n{empresa}`);
        setAba('aniversario');
      }
    } catch { showAlert('Erro', 'Falha ao carregar aniversariantes'); }
    finally { setLoading(false); }
  };

  const carregarInativos = async () => {
    setLoading(true);
    try {
      const res = await fetch(`./api.php?action=marketing_inativos&periodo=${inativosPeriodo}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        const inativos = data.filter((c: any) => c.telefone);
        setClientes(inativos.map((c: any) => ({ ...c, selecionado: true })));
        setSelecionados(inativos.map((c: any) => c.id));
        setMensagemPadrao(`Olá, {nome}! 😊\n\nSentimos sua falta por aqui! Faz um tempinho que não te vemos na {empresa}.\n\nQue tal dar uma passada? Temos novidades esperando por você! 🛍️\n\nAté logo,\n{empresa}`);
        setAba('inativos');
      }
    } catch { showAlert('Erro', 'Falha ao carregar clientes inativos'); }
    finally { setLoading(false); }
  };

  const carregarTodosClientes = async () => {
    setLoading(true);
    try {
      const res = await fetch('./api.php?action=clientes&limit=500');
      const data = await res.json();
      const arr = Array.isArray(data) ? data : (data.data ?? []);
      setClientes(arr.filter((c: any) => c.telefone).map((c: any) => ({ ...c, selecionado: false })));
      setSelecionados([]);
      setMensagemPadrao(`Olá, {nome}! 👋\n\nTemos uma promoção especial para você na {empresa}!\n\n🔥 Aproveite nossas ofertas exclusivas!\n\nAté logo,\n{empresa}`);
      setAba('promocao');
    } catch { showAlert('Erro', 'Falha ao carregar clientes'); }
    finally { setLoading(false); }
  };

  const clientesSelecionados = clientes.filter(c => selecionados.includes(c.id));

  if (aba === 'envio') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <PainelEnvio clientes={clientesSelecionados} mensagem={mensagemPadrao}
            onVoltar={() => setAba(aba === 'envio' ? 'menu' : aba)} emitente={emitente} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Menu principal */}
      {aba === 'menu' && (
        <div className="grid grid-cols-1 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-500" /> Marketing Sazonal
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Envie mensagens personalizadas via WhatsApp</p>
            <div className="grid grid-cols-1 gap-3">
              <button onClick={carregarAniversariantes} disabled={loading}
                className="flex items-center gap-4 p-4 rounded-xl border-2 border-yellow-200 dark:border-yellow-800 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors text-left">
                <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/40 rounded-xl flex items-center justify-center text-2xl">🎂</div>
                <div>
                  <p className="font-semibold text-gray-800 dark:text-gray-100">Aniversariantes do Mês</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Clientes que fazem aniversário este mês — aniversariantes do dia já selecionados</p>
                </div>
              </button>
              <button onClick={carregarTodosClientes} disabled={loading}
                className="flex items-center gap-4 p-4 rounded-xl border-2 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-left">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center"><Tag className="w-6 h-6 text-blue-600 dark:text-blue-400" /></div>
                <div>
                  <p className="font-semibold text-gray-800 dark:text-gray-100">Promoções</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Selecione os clientes que deseja notificar sobre promoções</p>
                </div>
              </button>
              <div className="flex items-center gap-4 p-4 rounded-xl border-2 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/40 rounded-xl flex items-center justify-center"><UserX className="w-6 h-6 text-red-500" /></div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-800 dark:text-gray-100 mb-2">Clientes Inativos</p>
                  <div className="flex flex-wrap gap-2">
                    {[['3m','3 meses'],['6m','6 meses'],['1a','1 ano'],['1amais','Mais de 1 ano']].map(([v,l]) => (
                      <button key={v} onClick={() => setInativosPeriodo(v as any)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${inativosPeriodo === v ? 'bg-red-600 text-white' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200'}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={carregarInativos} disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                  Buscar
                </button>
              </div>
            </div>
            {loading && <p className="text-center text-sm text-gray-400 dark:text-gray-500 mt-4 animate-pulse">Carregando...</p>}
          </div>
        </div>
      )}

      {/* Lista de aniversariantes */}
      {aba === 'aniversario' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setAba('menu')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><ChevronLeft className="w-5 h-5" /></button>
            <div>
              <h3 className="font-bold text-gray-800 dark:text-gray-100">🎂 Aniversariantes do Mês</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{clientes.length} clientes encontrados</p>
            </div>
          </div>
          <ListaSelecao clientes={clientes} onChange={setSelecionados} />
          <button onClick={() => setAba('envio')} disabled={selecionados.length === 0}
            className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2">
            <Send className="w-4 h-4" /> Enviar para {selecionados.length} selecionados
          </button>
        </div>
      )}

      {/* Lista para promoção */}
      {aba === 'promocao' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setAba('menu')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><ChevronLeft className="w-5 h-5" /></button>
            <div>
              <h3 className="font-bold text-gray-800 dark:text-gray-100">🏷️ Promoções</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{clientes.length} clientes disponíveis</p>
            </div>
          </div>
          <ListaSelecao clientes={clientes} onChange={setSelecionados} />
          <button onClick={() => setAba('envio')} disabled={selecionados.length === 0}
            className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2">
            <Send className="w-4 h-4" /> Enviar para {selecionados.length} selecionados
          </button>
        </div>
      )}

      {/* Lista de inativos */}
      {aba === 'inativos' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setAba('menu')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><ChevronLeft className="w-5 h-5" /></button>
            <div>
              <h3 className="font-bold text-gray-800 dark:text-gray-100">😴 Clientes Inativos</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{clientes.length} clientes sem compras no período</p>
            </div>
          </div>
          <ListaSelecao clientes={clientes} onChange={setSelecionados} />
          <button onClick={() => setAba('envio')} disabled={selecionados.length === 0}
            className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2">
            <Send className="w-4 h-4" /> Enviar para {selecionados.length} selecionados
          </button>
        </div>
      )}
    </div>
  );
};
