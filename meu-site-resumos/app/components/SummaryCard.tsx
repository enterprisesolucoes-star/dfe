import Link from "next/link";

interface SummaryCardProps {
  id: string | number;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  readingTime: string;
}

export default function SummaryCard({ id, title, excerpt, category, date, readingTime }: SummaryCardProps) {
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all hover:-translate-y-1 hover:shadow-2xl dark:border-slate-800 dark:bg-slate-900/50">
      {/* Card Image */}
      <div className="relative h-40 w-full overflow-hidden">
        <img 
          src="/images/card_pattern.png" 
          alt={title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />
        <div className="absolute bottom-3 left-4">
          <span className="inline-flex items-center rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold text-white backdrop-blur-md">
            {category}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">
            {readingTime} de leitura
          </span>
          <span className="text-xs text-slate-400">
            {date}
          </span>
        </div>
        
        <Link href={`/resumos/${id}`}>
          <h3 className="mb-2 text-xl font-bold leading-tight tracking-tight text-slate-800 group-hover:text-primary dark:text-slate-100 dark:group-hover:text-primary pointer-events-auto">
            {title}
          </h3>
        </Link>
        
        <p className="mb-6 line-clamp-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {excerpt}
        </p>
        
        <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
          <Link href={`/resumos/${id}`} className="text-sm font-bold text-primary transition-colors hover:text-accent">
            Ver Protocolo
            <span className="ml-1 inline-block transition-transform group-hover:translate-x-1">→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}


