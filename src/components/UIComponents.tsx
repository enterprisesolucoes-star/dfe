import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export const StatCard = ({ label, value, icon: Icon, color, trend }: any) => {
  const colorMap: any = {
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-emerald-600 bg-emerald-50',
    red: 'text-red-600 bg-red-50',
    orange: 'text-orange-600 bg-orange-50',
    purple: 'text-purple-600 bg-purple-50',
    amber: 'text-amber-600 bg-amber-50'
  };
  
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-[12px] shadow-sm p-6 flex flex-col justify-between h-full hover:shadow-md transition-shadow duration-300">
      <div>
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-4">
          <Icon className="w-4 h-4 stroke-[1.5px]" />
          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
        </div>
        <h3 className="text-slate-800 dark:text-slate-100 text-2xl font-bold font-mono tracking-tighter">
          {value}
        </h3>
      </div>
      <div className="mt-4 flex items-center gap-2">
         {trend !== undefined && (
           <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold ${trend >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
             {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
             {Math.abs(trend).toFixed(1)}%
           </div>
         )}
      </div>
    </motion.div>
  );
};

export const Input = React.forwardRef<HTMLInputElement, any>(({ label, ...props }, ref) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{label}</label>
    <input
      ref={ref}
      {...props}
      className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
    />
  </div>
));
Input.displayName = 'Input';

const shimmer = 'animate-pulse bg-gray-200 dark:bg-gray-700 rounded';

function SkeletonRow({ cols }: { cols: number[] }) {
  return (
    <tr>
      {cols.map((w, i) => (
        <td key={i} className="px-6 py-4">
          <div className={`${shimmer} h-3 rounded`} style={{ width: `${w}%` }} />
          {i === 0 && <div className={`${shimmer} h-2.5 rounded mt-1.5`} style={{ width: `${Math.max(w - 20, 30)}%` }} />}
        </td>
      ))}
    </tr>
  );
}

export function SkeletonTable({ cols, rows = 6 }: { cols: number; rows?: number }) {
  const widths = Array.from({ length: cols }, (_, i) => [80, 60, 50, 40, 55, 45][i % 6]);
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} cols={widths} />
      ))}
    </>
  );
}

export function SkeletonCards({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700 space-y-3">
          <div className={`${shimmer} h-3 w-1/3`} />
          <div className={`${shimmer} h-6 w-2/3`} />
          <div className={`${shimmer} h-2.5 w-1/2`} />
        </div>
      ))}
    </div>
  );
}

/* ─── Máscaras de input ─────────────────────────────────────── */

export function maskCPFCNPJ(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 14);
  if (d.length <= 11)
    return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  return d.replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

export function maskCEP(v: string): string {
  return v.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2');
}

export function maskPhone(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 10)
    return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
  return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
}

export function maskCurrency(v: string): string {
  const num = v.replace(/\D/g, '');
  if (!num) return '';
  return (Number(num) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type MaskType = 'cpfcnpj' | 'cep' | 'phone' | 'currency';
const MASK_FN: Record<MaskType, (v: string) => string> = {
  cpfcnpj: maskCPFCNPJ,
  cep: maskCEP,
  phone: maskPhone,
  currency: maskCurrency,
};

export const MaskedInput = React.forwardRef<HTMLInputElement, any>(
  ({ label, mask, onChange, ...props }, ref) => {
    const apply = mask ? MASK_FN[mask as MaskType] : null;
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (apply) {
        const masked = apply(e.target.value);
        e.target.value = masked;
      }
      onChange?.(e);
    };
    return (
      <div>
        {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{label}</label>}
        <input
          ref={ref}
          {...props}
          onChange={handleChange}
          className={props.className || 'w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm'}
        />
      </div>
    );
  }
);
MaskedInput.displayName = 'MaskedInput';

/* ─── Top Progress Bar ───────────────────────────────────────── */
import { useRef as _useRef, useEffect as _useEffect } from 'react';

export function TopProgressBar({ active }: { active: boolean }) {
  return (
    <div className={`fixed top-0 left-0 right-0 z-[10000] h-[2px] transition-opacity duration-300 ${active ? 'opacity-100' : 'opacity-0'}`}>
      <div
        className="h-full bg-blue-500"
        style={{
          animation: active ? 'topbar-progress 0.8s ease-in-out infinite alternate' : 'none',
          width: active ? '90%' : '100%',
          transition: active ? 'none' : 'width 0.3s ease',
        }}
      />
      <style>{`@keyframes topbar-progress { from { width: 20%; } to { width: 85%; } }`}</style>
    </div>
  );
}

/* ─── useCountUp hook ────────────────────────────────────────── */
export function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = React.useState(0);
  const raf = _useRef<number>(0);
  _useEffect(() => {
    if (!target) { setValue(0); return; }
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * ease));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return value;
}

/* ─── Empty State ────────────────────────────────────────────── */
export function EmptyState({ icon: Icon, title, subtitle }: { icon?: React.ElementType; title: string; subtitle?: string }) {
  const Ic = Icon;
  return (
    <tr>
      <td colSpan={99} className="px-6 py-16 text-center">
        {Ic && <Ic className="w-10 h-10 mx-auto mb-3 text-gray-200 dark:text-gray-700" />}
        <p className="text-sm font-medium text-gray-400 dark:text-gray-500">{title}</p>
        {subtitle && <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">{subtitle}</p>}
      </td>
    </tr>
  );
}

/* ─── useDebounce hook ───────────────────────────────────────── */
export function useDebounce<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = React.useState<T>(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── Pagination ─────────────────────────────────────────────────────────────
export function Pagination({ page, pages, total, limit, onChange }: {
  page: number; pages: number; total: number; limit: number; onChange: (p: number) => void;
}) {
  if (pages <= 1) return null;
  const start = (page - 1) * limit + 1;
  const end   = Math.min(page * limit, total);
  const range: (number | '…')[] = [];
  if (pages <= 7) {
    for (let i = 1; i <= pages; i++) range.push(i);
  } else if (page <= 4) {
    [1,2,3,4,5,'…',pages].forEach(x => range.push(x as any));
  } else if (page >= pages - 3) {
    [1,'…',pages-4,pages-3,pages-2,pages-1,pages].forEach(x => range.push(x as any));
  } else {
    [1,'…',page-1,page,page+1,'…',pages].forEach(x => range.push(x as any));
  }
  const btn = 'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed';
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 select-none">
      <span>{start.toLocaleString('pt-BR')}–{end.toLocaleString('pt-BR')} de {total.toLocaleString('pt-BR')}</span>
      <div className="flex items-center gap-0.5">
        <button className={`${btn} hover:bg-gray-100 dark:hover:bg-gray-700`} disabled={page === 1} onClick={() => onChange(page - 1)}>‹</button>
        {range.map((p, i) => p === '…'
          ? <span key={`e${i}`} className="px-1.5">…</span>
          : <button key={p} onClick={() => onChange(p as number)}
              className={`${btn} min-w-[28px] ${page === p ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>{p}</button>
        )}
        <button className={`${btn} hover:bg-gray-100 dark:hover:bg-gray-700`} disabled={page === pages} onClick={() => onChange(page + 1)}>›</button>
      </div>
    </div>
  );
}
