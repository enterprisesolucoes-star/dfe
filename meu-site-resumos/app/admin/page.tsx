"use client";

import { useState } from "react";
import Navbar from "../components/Navbar";
import FormAlert from "../components/FormAlert";

export default function AdminPage() {
  const [success, setSuccess] = useState(false);
  
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulação de salvamento
    setSuccess(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />
      
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Gerenciar Resumos</h1>
            <p className="text-slate-500">Adicione ou edite protocolos médicos</p>
          </div>
          <button className="rounded-full bg-primary px-6 py-2 text-sm font-bold text-white transition-all hover:bg-accent">
            Ver Todos
          </button>
        </header>

        {success && (
          <div className="mb-8">
            <FormAlert message="Resumo salvo com sucesso no banco de dados!" theme="dark" onDismiss={() => setSuccess(false)} />
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-8">
          {/* Informações Básicas */}
          <section className="rounded-2xl border border-slate-100 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-6 text-xl font-bold border-b border-slate-50 pb-4 dark:border-slate-800">1. Informações Básicas</h2>
            <div className="grid gap-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Título do Resumo</label>
                <input 
                  type="text" 
                  placeholder="Ex: Manejo da Insuficiência Cardíaca"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 focus:border-primary focus:outline-none dark:border-slate-800 dark:bg-slate-950" 
                  required
                />
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Categoria</label>
                  <select className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 focus:outline-none dark:border-slate-800 dark:bg-slate-950">
                    <option>Clínica Médica</option>
                    <option>Cirurgia</option>
                    <option>Pediatria</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Tempo de Leitura</label>
                  <input type="text" placeholder="Ex: 8 min" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950" />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Excerto (Breve Descrição)</label>
                <textarea rows={2} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950"></textarea>
              </div>
            </div>
          </section>

          {/* Conteúdo Detalhado */}
          <section className="rounded-2xl border border-slate-100 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-6 text-xl font-bold border-b border-slate-50 pb-4 dark:border-slate-800">2. Protocolo e Conduta</h2>
            <p className="mb-4 text-xs text-slate-400">Use ### para títulos, #### para subtítulos e - para listas.</p>
            <textarea 
              rows={10} 
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm focus:border-primary focus:outline-none dark:border-slate-800 dark:bg-slate-950"
              placeholder="### Título Seção..."
              required
            ></textarea>
          </section>

          {/* Componentes Médicos */}
          <div className="grid gap-8 lg:grid-cols-2">
             {/* Adicionar Tabela */}
             <section className="rounded-2xl border border-slate-100 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h2 className="mb-6 text-lg font-bold">3. Tabela de Dosagem (Opcional)</h2>
                <div className="space-y-4">
                  <input type="text" placeholder="Título da Tabela" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 dark:border-slate-800 dark:bg-slate-950" />
                  <div className="bg-slate-50 p-4 rounded-xl dark:bg-slate-950 text-center">
                    <p className="text-xs text-slate-400 italic">Interface para adicionar linhas da tabela virá em breve (Fase 2)</p>
                  </div>
                </div>
             </section>

             {/* Adicionar Escore */}
             <section className="rounded-2xl border border-slate-100 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h2 className="mb-6 text-lg font-bold">4. Escore Diagnóstico (Opcional)</h2>
                <div className="space-y-4">
                   <input type="text" placeholder="Nome do Escore" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 dark:border-slate-800 dark:bg-slate-950" />
                   <div className="bg-slate-50 p-4 rounded-xl dark:bg-slate-950 text-center">
                    <p className="text-xs text-slate-400 italic">Interface para adicionar itens do escore virá em breve (Fase 2)</p>
                  </div>
                </div>
             </section>
          </div>

          <div className="flex justify-end">
            <button className="rounded-full bg-slate-900 px-12 py-4 font-bold text-white transition-all hover:bg-slate-800 dark:bg-white dark:text-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-none">
              Salvar Protocolo
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
