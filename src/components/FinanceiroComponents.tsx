// ─── Componente de Baixa Financeira ─────────────────────────────────────────
const BaixaModal = ({ titulo, emitente, onClose, onSuccess, showAlert }: any) => {
  const [loading, setLoading] = useState(false);
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split('T')[0]);
  const [valorMulta, setValorMulta] = useState(0);
  const [valorJuros, setValorJuros] = useState(0);
  const [valorDesconto, setValorDesconto] = useState(0);
  const [contaId, setContaId] = useState('');
  const [contas, setContas] = useState<any[]>([]);

  useEffect(() => {
    // Buscar contas disponíveis
    fetch('./api.php?action=fin_listar_contas').then(r => r.json()).then(d => {
      setContas(d);
      if (d.length > 0) setContaId(d[0].id);
    });

    // Calcular encargos se for Recebimento ('R') e estiver atrasado
    if (titulo.tipo === 'R' && titulo.status === 'Pendente') {
      const venc = new Date(titulo.vencimento + 'T12:00:00');
      const hoje = new Date();
      hoje.setHours(12, 0, 0, 0);

      const diffTime = hoje.getTime() - venc.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > (emitente.carencia_dias_receber || 0)) {
        const m = (Number(titulo.valor_total) * (Number(emitente.multa_receber || 0) / 100));
        const j = (Number(titulo.valor_total) * (Number(emitente.juros_dia_receber || 0) / 100) * diffDays);
        setValorMulta(Number(m.toFixed(2)));
        setValorJuros(Number(j.toFixed(2)));
      }
    }
  }, [titulo, emitente]);

  const valorFinal = Number(titulo.valor_total) + valorMulta + valorJuros - valorDesconto;

  const handleConfirmar = async () => {
    setLoading(true);
    try {
      const res = await fetch('./api.php?action=fin_baixar_titulo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: titulo.id,
          data_pagamento: dataPagamento,
          valor_pago: valorFinal,
          valor_multa: valorMulta,
          valor_juros: valorJuros,
          valor_desconto: valorDesconto,
          conta_id: contaId
        })
      });
      const data = await res.json();
      if (data.success) {
        onSuccess();
      } else {
        showAlert('Erro na Baixa', data.message);
      }
    } catch { showAlert('Erro', 'Falha de comunicação.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[300] p-4 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <h3 className="font-bold text-gray-800">BAIXAR {titulo.tipo === 'R' ? 'RECEBIMENTO' : 'PAGAMENTO'}</h3>
          <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded font-bold">TITULO #{titulo.id}</span>
        </div>

        <div className="p-6 space-y-4">
           <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Valor Original</label>
               <p className="text-xl font-bold text-gray-800">R$ {Number(titulo.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
             </div>
             <div>
               <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Vencimento</label>
               <p className="text-sm font-bold text-gray-600">{new Date(titulo.vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
             </div>
           </div>

           <div className="p-4 bg-gray-50 rounded-2xl space-y-3">
              <div className="flex justify-between items-center">
                 <span className="text-xs text-gray-500">Multa / Juros (+)</span>
                 <div className="flex gap-2">
                   <input type="number" step="0.01" value={valorMulta} onChange={e => setValorMulta(Number(e.target.value))} className="w-20 text-right bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold text-red-500" />
                   <input type="number" step="0.01" value={valorJuros} onChange={e => setValorJuros(Number(e.target.value))} className="w-20 text-right bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold text-red-500" />
                 </div>
              </div>
              <div className="flex justify-between items-center text-emerald-600">
                 <span className="text-xs font-medium">Desconto (-)</span>
                 <input type="number" step="0.01" value={valorDesconto} onChange={e => setValorDesconto(Number(e.target.value))} className="w-20 text-right bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold text-emerald-600" />
              </div>
              <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
                 <span className="text-sm font-bold text-gray-800">TOTAL A RECEBER</span>
                 <span className="text-xl font-bold text-blue-600">R$ {valorFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
           </div>

           <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Conta de Destino</label>
              <select value={contaId} onChange={e => setContaId(e.target.value)} className="w-full bg-gray-50 border-0 rounded-xl px-4 py-2.5 font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-400">
                {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
           </div>
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 text-gray-400 font-bold hover:bg-gray-100 rounded-2xl transition-all">CANCELAR</button>
          <button onClick={handleConfirmar} disabled={loading} className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all">
            {loading ? 'PROCESSANDO...' : 'CONFIRMAR BAIXA'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
