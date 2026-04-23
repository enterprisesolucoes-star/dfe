import Navbar from "./components/Navbar";
import SummaryCard from "./components/SummaryCard";
import { SUMMARIES } from "@/lib/data";

export default function Home() {
  return (
    <div className="min-h-screen">
      <Navbar />
      
      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-16 pb-24 sm:pt-24 sm:pb-32">
          {/* Background Image with Overlay */}
          <div className="absolute inset-0 -z-10">
            <img 
              src="/images/hero.png" 
              alt="Medical background" 
              className="h-full w-full object-cover opacity-10 dark:opacity-20"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-white via-white/80 to-white dark:from-slate-950 dark:via-slate-950/80 dark:to-slate-950" />
          </div>

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary italic mb-6">
                + de 500 resumos médicos atualizados
              </span>
              <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-7xl dark:text-white">
                Domine a <span className="text-primary">Medicina</span> com <br/> resumos de alto impacto.
              </h1>
              <p className="mx-auto max-w-2xl text-lg text-slate-600 dark:text-slate-400">
                Acesse protocolos revisados, escores diagnósticos e condutas de urgência para sua prática clínica ou residência.
              </p>
              
              <div className="mt-10 flex flex-wrap justify-center gap-4">
                <div className="relative w-full max-w-lg">
                  <div className="flex items-center rounded-full border border-slate-200 bg-white p-1.5 shadow-2xl shadow-primary/10 transition-all focus-within:ring-2 focus-within:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
                    <input 
                      type="text" 
                      placeholder="Busque por doença, sintoma ou conduta..."
                      className="flex-1 bg-transparent px-6 py-3 text-slate-900 focus:outline-none dark:text-white"
                    />
                    <button className="rounded-full bg-primary px-8 py-3 text-sm font-bold text-white transition-all hover:bg-accent ring-offset-2 focus:ring-2 focus:ring-primary">
                      Buscar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Categories / Filters */}
        <section className="sticky top-16 z-40 border-y border-slate-200/60 bg-white/80 py-4 backdrop-blur-md dark:border-slate-800/60 dark:bg-slate-950/80">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-hide">
              {["Todos", "Clínica Médica", "Cirurgia", "Pediatria", "Ginecologia", "Infectologia"].map((cat) => (
                <button 
                  key={cat}
                  className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-6 py-2 text-sm font-semibold text-slate-600 transition-all hover:border-primary hover:text-primary dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Summaries Grid */}
        <section className="py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 flex items-end justify-between">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Últimas Atualizações</h2>
                <p className="mt-1 text-slate-500">Conteúdo revisado conforme diretrizes 2024/25</p>
              </div>
              <a href="#" className="hidden text-sm font-bold text-primary hover:underline sm:block">
                Ver todos os temas
              </a>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {SUMMARIES.map((summary) => (
                <SummaryCard key={summary.id} {...summary} />
              ))}
            </div>
          </div>
        </section>
      </main>


      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-12 dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-sm text-slate-500">
            &copy; 2026 Resumos.it. Feito com paixão pelo conhecimento.
          </p>
        </div>
      </footer>
    </div>
  );
}

