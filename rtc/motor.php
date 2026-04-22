<?php

/**
 * MOTOR TRIBUTÁRIO RTC - VERSÃO ESTÁVEL (LC 214/2025)
 */
class MotorTributarioIBSCBS {

    public function classificarItem(array $dados): array {
        // Fallbacks seguros
        $natureza       = $dados['natureza'] ?? 'onerosa';
        $destinatario   = $dados['destinatario'] ?? 'privado';
        $isSimples      = ($dados['simples'] ?? 'nao') === 'sim';
        $recolheFora    = isset($dados['por_fora']);
        $isPF           = ($dados['tipo_pessoa'] ?? 'pj') === 'pf';
        $isSeletivoAuto = ($dados['seletivo'] ?? 'nao') === 'sim';
        $ncm            = $dados['ncm'] ?? '';

        // 1. Resultado Padrão (Base Ampla)
        $resultado = [
            'cst_ibscbs'              => '000',
            'cClassTrib'              => '000001',
            'permissao_credito'       => 'Pleno (Regime Normal)',
            'sujeito_imposto_seletivo'=> false,
            'alertas'                 => []
        ];

        // 2. Regra Natureza (Suspensão)
        if ($natureza === 'nao_onerosa') {
            $resultado['cst_ibscbs'] = '400';
            $resultado['cClassTrib'] = '999999';
            $resultado['permissao_credito'] = 'Nenhum (Suspensão)';
            $resultado['alertas'][] = 'Operação não onerosa identificada.';
            return $resultado;
        }

        // 3. Regra Imposto Seletivo
        if ($isSeletivoAuto || in_array($ncm, ['22021000', '24022000', '22030000', '87032210'])) {
            $resultado['sujeito_imposto_seletivo'] = true;
            $resultado['alertas'][] = '⚠️ Incidência de Imposto Seletivo ativa.';
        }

        // 4. Regra Simples Nacional
        if ($isSimples) {
            if ($recolheFora) {
                $resultado['cst_ibscbs'] = '010';
                $resultado['permissao_credito'] = 'Pleno (Regime Normal)';
                $resultado['alertas'][] = 'Opção pelo Regime Normal para IBS/CBS.';
            } else {
                $resultado['cst_ibscbs'] = '091';
                $resultado['permissao_credito'] = 'Restrito (Direito via DAS)';
            }
        }

        // 5. Destinatário Pessoa Física (Bloqueio de Crédito)
        if ($isPF) {
            $resultado['permissao_credito'] = 'Sem Direito (B2C)';
        }

        // 6. Destinatário Governo
        if ($destinatario === 'governo') {
            $resultado['cClassTrib'] = '200999';
            $resultado['alertas'][] = 'Benefício Governamental aplicado.';
        }

        return $resultado;
    }
}

$dados = $_POST;
$resultado = null;
if ($_SERVER['REQUEST_METHOD'] === 'POST' && !empty($dados['ncm'])) {
    $motor = new MotorTributarioIBSCBS();
    $resultado = $motor->classificarItem($dados);
}
?>
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Simulador RTC - Reforma Tributária</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Outfit', sans-serif; background-color: #020617; color: #f8fafc; }
        b, strong, h1, h2, h3 { font-weight: 600 !important; color: #f1f5f9; }
        .glass { background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.08); }
        .active-ring { ring: 2px solid #3b82f6; ring-offset: 2px; }
        .toggle-active { background: #2563eb !important; color: white !important; border-color: #3b82f6 !important; box-shadow: 0 0 15px rgba(37, 99, 235, 0.3); }
        select, input { background: #1e293b !important; border-color: #334155 !important; color: #f8fafc !important; }
        .btn-submit { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .btn-submit:hover { transform: translateY(-2px); box-shadow: 0 10px 20px -5px rgba(37, 99, 235, 0.4); }
    </style>
</head>
<body class="p-4 md:p-8 min-h-screen">
    <div class="max-w-5xl mx-auto">
        
        <!-- Header -->
        <div class="flex items-center gap-6 mb-12 bg-white/5 p-6 rounded-3xl border border-white/5">
            <div class="w-16 h-16 bg-blue-600 rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-blue-500/20">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"></path></svg>
            </div>
            <div>
                <h2 class="text-3xl font-bold tracking-tight">Simulador Motor RTC</h2>
                <div class="flex items-center gap-2 mt-1">
                    <span class="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[9px] font-bold rounded-md border border-blue-500/20">VERSÃO 2026.1</span>
                    <span class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Compliance LC 214/2025</span>
                </div>
            </div>
        </div>

        <form method="POST" class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            <!-- Coluna 1: Operação e Destinatário -->
            <div class="lg:col-span-2 space-y-8">
                <div class="glass p-8 rounded-[2.5rem] space-y-8">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        
                        <!-- Natureza -->
                        <div class="space-y-4">
                            <label class="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Natureza da Operação</label>
                            <div class="flex gap-2 bg-slate-900 p-1.5 rounded-2xl border border-white/5">
                                <button type="button" onclick="setV('natureza','onerosa')" id="btn_natureza_onerosa" class="flex-1 py-3 rounded-xl text-xs font-bold transition-all <?= ($dados['natureza'] ?? 'onerosa') === 'onerosa' ? 'toggle-active' : 'text-slate-500 hover:text-slate-300' ?>">ONEROSA</button>
                                <button type="button" onclick="setV('natureza','nao_onerosa')" id="btn_natureza_nao_onerosa" class="flex-1 py-3 rounded-xl text-xs font-bold transition-all <?= ($dados['natureza'] ?? '') === 'nao_onerosa' ? 'toggle-active' : 'text-slate-500 hover:text-slate-300' ?>">NÃO ONEROSA</button>
                                <input type="hidden" name="natureza" id="natureza" value="<?= $dados['natureza'] ?? 'onerosa' ?>">
                            </div>
                        </div>

                        <!-- Destinatário -->
                        <div class="space-y-4">
                            <label class="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Destinatário</label>
                            <div class="flex gap-2 bg-slate-900 p-1.5 rounded-2xl border border-white/5">
                                <button type="button" onclick="setV('tipo_pessoa','pj')" id="btn_tipo_pessoa_pj" class="flex-1 py-3 rounded-xl text-xs font-bold transition-all <?= ($dados['tipo_pessoa'] ?? 'pj') === 'pj' ? 'toggle-active' : 'text-slate-500 hover:text-slate-300' ?>">PJ (B2B)</button>
                                <button type="button" onclick="setV('tipo_pessoa','pf')" id="btn_tipo_pessoa_pf" class="flex-1 py-3 rounded-xl text-xs font-bold transition-all <?= ($dados['tipo_pessoa'] ?? '') === 'pf' ? 'toggle-active' : 'text-slate-500 hover:text-slate-300' ?>">PF (B2C)</button>
                                <input type="hidden" name="tipo_pessoa" id="tipo_pessoa" value="<?= $dados['tipo_pessoa'] ?? 'pj' ?>">
                            </div>
                        </div>

                        <!-- Emissor e Opção -->
                        <div class="space-y-4">
                            <label class="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Regime do Emissor</label>
                            <select name="simples" class="w-full p-4 rounded-2xl text-sm font-bold border-none focus:ring-2 focus:ring-blue-500 outline-none">
                                <option value="nao" <?= ($dados['simples'] ?? '') == 'nao' ? 'selected' : '' ?>>Lucro Real / Presumido</option>
                                <option value="sim" <?= ($dados['simples'] ?? '') == 'sim' ? 'selected' : '' ?>>Simples Nacional</option>
                            </select>
                        </div>

                        <!-- Opção Simples Nacional -->
                        <div class="space-y-4">
                            <label class="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Sujeito ao Imposto Seletivo?</label>
                            <div class="flex gap-2 bg-slate-900 p-1.5 rounded-2xl border border-white/5">
                                <button type="button" onclick="setV('seletivo','nao')" id="btn_seletivo_nao" class="flex-1 py-3 rounded-xl text-xs font-bold transition-all <?= ($dados['seletivo'] ?? 'nao') === 'nao' ? 'toggle-active' : 'text-slate-500 hover:text-slate-300' ?>">NÃO</button>
                                <button type="button" onclick="setV('seletivo','sim')" id="btn_seletivo_sim" class="flex-1 py-3 rounded-xl text-xs font-bold transition-all <?= ($dados['seletivo'] ?? '') === 'sim' ? 'toggle-active' : 'text-slate-500 hover:text-slate-300' ?>">SIM</button>
                                <input type="hidden" name="seletivo" id="seletivo" value="<?= $dados['seletivo'] ?? 'nao' ?>">
                            </div>
                        </div>
                    </div>

                    <div class="pt-8 border-t border-white/5 flex flex-wrap gap-4 items-center">
                        <div class="flex items-center gap-3 bg-blue-500/10 px-6 py-4 rounded-2xl border border-blue-500/20">
                            <input type="checkbox" name="por_fora" id="por_fora" <?= isset($dados['por_fora']) ? 'checked' : '' ?> class="w-5 h-5 rounded-md border-none bg-slate-800 text-blue-600 focus:ring-0">
                            <label for="por_fora" class="text-xs font-bold text-blue-400 uppercase tracking-tight">Recolher IBS/CBS "Por Fora" (Opção LC 214)</label>
                        </div>
                        <select name="destinatario" class="bg-slate-900 p-4 rounded-2xl text-[10px] font-bold text-slate-400 border-none outline-none">
                            <option value="privado" <?= ($dados['destinatario'] ?? '') == 'privado' ? 'selected' : '' ?>>CLIENTE: SETOR PRIVADO</option>
                            <option value="governo" <?= ($dados['destinatario'] ?? '') == 'governo' ? 'selected' : '' ?>>CLIENTE: PODER PÚBLICO</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- Coluna 2: NCM e Ação -->
            <div class="space-y-8">
                <div class="glass p-8 rounded-[2.5rem] h-full flex flex-col justify-between">
                    <div class="space-y-6">
                        <label class="text-[11px] font-bold uppercase text-blue-400 tracking-[0.2em]">Informa NCM do Item</label>
                        <input type="text" name="ncm" value="<?= htmlspecialchars($dados['ncm'] ?? '') ?>" placeholder="84182100" class="w-full p-6 bg-slate-900 border-none rounded-3xl text-4xl font-black text-center tracking-[0.1em] text-white focus:ring-2 focus:ring-blue-500 outline-none placeholder:opacity-10">
                    </div>

                    <div class="space-y-4 mt-12">
                        <button type="submit" class="btn-submit w-full py-6 rounded-3xl font-bold uppercase text-[11px] tracking-[0.3em] shadow-2xl">Classificar Item</button>
                        <p class="text-[9px] text-center text-slate-500 font-bold uppercase tracking-widest px-4">A operação será validada pelo motor RTC em conformidade com o enquadramento fiscal</p>
                    </div>
                </div>
            </div>
        </form>

        <!-- Resultados -->
        <?php if ($resultado): ?>
        <div class="mt-12 glass p-12 rounded-[3.5rem] border-l-[12px] border-blue-600 animate-in slide-in-from-bottom-8 duration-700">
            <h3 class="text-[11px] font-bold uppercase text-slate-500 tracking-[0.5em] mb-12 flex items-center gap-4">
                <span class="w-12 h-0.5 bg-blue-600"></span> RESUMO TRIBUTÁRIO RESULTANTE
            </h3>
            
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-12">
                <div class="space-y-2">
                    <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">CST IBS/CBS</p>
                    <p class="text-5xl font-black text-white"><?= $resultado['cst_ibscbs'] ?></p>
                </div>
                <div class="space-y-2">
                    <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">cClassTrib</p>
                    <p class="text-5xl font-black text-emerald-400"><?= $resultado['cClassTrib'] ?></p>
                </div>
                <div class="space-y-2">
                    <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Imposto Seletivo</p>
                    <p class="text-xs font-bold leading-relaxed <?= $resultado['sujeito_imposto_seletivo'] ? 'text-orange-500' : 'text-slate-400' ?>">
                        <?= $resultado['sujeito_imposto_seletivo'] ? '✦ INCIDÊNCIA ATIVA' : '✦ NÃO SUJEITO / ISENTO' ?>
                    </p>
                </div>
                <div class="space-y-2">
                    <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Natureza do Crédito</p>
                    <p class="text-sm font-bold text-emerald-500 uppercase"><?= $resultado['permissao_credito'] ?></p>
                </div>
            </div>

            <?php if (!empty($resultado['alertas'])): ?>
            <div class="mt-16 pt-10 border-t border-white/5 space-y-4">
                <?php foreach ($resultado['alertas'] as $msg): ?>
                    <div class="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <div class="w-1.5 h-1.5 rounded-full bg-blue-600 shadow-lg shadow-blue-600/50"></div>
                        <span><?= $msg ?></span>
                    </div>
                <?php endforeach; ?>
            </div>
            <?php endif; ?>
        </div>
        <?php endif; ?>

    </div>

    <script>
        function setV(id, val) {
            document.getElementById(id).value = val;
            const parent = document.getElementById(id).parentElement;
            parent.querySelectorAll('button').forEach(b => {
                b.classList.remove('toggle-active');
                if (b.id.includes(val)) b.classList.add('toggle-active');
            });
        }
    </script>
</body>
</html>
