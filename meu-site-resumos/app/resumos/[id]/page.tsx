import { SUMMARIES } from "@/lib/data";
import Navbar from "@/app/components/Navbar";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function SummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const summary = SUMMARIES.find((s) => s.id.toString() === id);

  if (!summary) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <Navbar />
      
      <main className="mx-auto max-w-3xl px-4 pt-16 pb-24 sm:px-6 lg:px-8">
        <Link 
          href="/" 
          className="mb-8 inline-flex items-center text-sm font-medium text-primary hover:text-accent transition-colors"
        >
          <span className="mr-2">←</span> Voltar para a Início
        </Link>
        
        <article className="prose prose-slate dark:prose-invert max-w-none">
          <header className="mb-12 border-b border-slate-100 pb-12 dark:border-slate-800">
            <div className="mb-6 flex items-center gap-3">
              <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary italic">
                {summary.category}
              </span>
              <span className="text-sm text-slate-400">{summary.readingTime} de leitura</span>
            </div>
            
            <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
              {summary.title}
            </h1>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-400">
                  {summary.author.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{summary.author}</p>
                  <p className="text-xs text-slate-500">{summary.date}</p>
                </div>
              </div>
              
              <button className="rounded-full border border-slate-200 px-4 py-2 text-xs font-bold hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900">
                Salvar resumo
              </button>
            </div>
          </header>

          <div className="space-y-8 leading-relaxed text-slate-700 dark:text-slate-300">
            {summary.content.split('\n').map((paragraph, idx) => {
              const trimmed = paragraph.trim();
              if (!trimmed) return null;
              
              if (trimmed.startsWith('###')) {
                return (
                  <h3 key={idx} className="mt-12 text-2xl font-bold text-slate-900 dark:text-white">
                    {trimmed.replace('###', '')}
                  </h3>
                );
              }
              
              if (trimmed.startsWith('####')) {
                return (
                  <h4 key={idx} className="mt-8 text-xl font-bold text-primary italic underline decoration-primary/20 transition-all hover:decoration-primary/60">
                    {trimmed.replace('####', '')}
                  </h4>
                );
              }

              if (trimmed.startsWith('1.') || trimmed.startsWith('-')) {
                return (
                  <div key={idx} className="ml-4 flex items-start gap-2">
                    <span className="text-primary font-bold">•</span>
                    <p>{trimmed.replace(/^[0-9]\.|\-/, '')}</p>
                  </div>
                );
              }

              return <p key={idx} className="text-lg">{trimmed}</p>;
            })}

            {/* Renderizar Tabela se existir */}
            {summary.table && (
              <div className="relative mt-12 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 dark:bg-slate-900 dark:border-slate-800">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">{summary.table.title}</h3>
                </div>
                <div className="overflow-x-auto blur-sm select-none pointer-events-none grayscale opacity-40">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100/50 text-slate-500 dark:bg-slate-800/50">
                      <tr>
                        {summary.table.headers.map((header) => (
                          <th key={header} className="px-4 py-3 font-semibold">{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {summary.table.rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                          {summary.table.headers.map((header) => (
                            <td key={header} className="px-4 py-3 text-slate-700 dark:text-slate-300">{row[header]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Paywall Overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-white/10 backdrop-blur-[2px] dark:bg-slate-950/20">
                  <div className="text-center p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 max-w-xs">
                    <p className="mb-4 text-xs font-bold text-slate-900 dark:text-white uppercase tracking-widest">Conteúdo Privado</p>
                    <p className="mb-6 text-sm text-slate-500">As tabelas de dosagem e condutas avançadas são exclusivas para assinantes.</p>
                    <a 
                      href="https://hotmart.com" 
                      target="_blank"
                      className="block w-full rounded-full bg-primary px-6 py-3 text-sm font-bold text-white transition-all hover:bg-accent shadow-lg shadow-primary/25"
                    >
                      Assinar Protocolos PRO
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Renderizar Escore se existir */}
            {summary.score && (
              <div className="relative mt-12 rounded-2xl bg-gradient-to-br from-primary/5 to-accent/5 p-8 border border-primary/10 dark:border-primary/20">
                <div className="blur-md select-none pointer-events-none opacity-30">
                  <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{summary.score.name}</h3>
                    <div className="rounded-full bg-primary/20 px-3 py-1 text-xs font-bold text-primary">Protocolo Diagnóstico</div>
                  </div>
                  <div className="space-y-3">
                    {summary.score.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between rounded-lg bg-white/50 p-3 shadow-sm dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.label}</span>
                        <span className="text-sm font-bold text-primary">+{item.points} pt</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Paywall Overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-slate-50/10 dark:bg-slate-950/20 backdrop-blur-[1px]">
                   <div className="p-1.5 rounded-full bg-primary/10 mb-4">
                     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                   </div>
                   <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 underline decoration-primary decoration-2">Desbloqueie agora</h3>
                   <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 max-w-sm">Tenha acesso a todos os escores interativos e calculadoras médicas.</p>
                   <a 
                      href="https://hotmart.com" 
                      target="_blank"
                      className="rounded-full bg-primary px-10 py-3 text-sm font-bold text-white transition-all hover:bg-accent"
                    >
                      Quero Acesso Total
                    </a>
                </div>
              </div>
            )}

          </div>

        </article>

        <section className="mt-24 border-t border-slate-100 pt-16 dark:border-slate-800">
          <h2 className="mb-8 text-xl font-bold text-slate-900 dark:text-white">Gostou deste resumo?</h2>
          <div className="rounded-2xl bg-slate-50 p-8 text-center dark:bg-slate-900">
            <p className="mb-6 text-slate-600 dark:text-slate-400">
              Assine nossa newsletter para receber os melhores resumos diretamente no seu e-mail.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <input 
                type="email" 
                placeholder="Seu melhor e-mail" 
                className="rounded-full border border-slate-200 px-6 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-black"
              />
              <button className="rounded-full bg-primary px-8 py-3 font-bold text-white transition-all hover:bg-accent ring-offset-2 focus:ring-2 focus:ring-primary">
                Inscrever-se
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
