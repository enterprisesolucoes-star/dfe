import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Info, TriangleAlert, X } from 'lucide-react';

/* ─── tipos ─────────────────────────────────────────────────── */
type Severity = 'error' | 'warning' | 'success' | 'info';
type Theme    = 'dark' | 'light';

interface FormAlertProps {
  /** Mensagem única ou lista de erros de campo */
  message: string | string[] | null | undefined;
  severity?: Severity;
  /** 'dark' para fundos escuros (padrão), 'light' para modais/cards brancos */
  theme?: Theme;
  /** Conteúdo extra renderizado abaixo da mensagem (chave, botões, etc.) */
  children?: React.ReactNode;
  /** Exibe botão de fechar */
  dismissible?: boolean;
  /** Callback chamado após fechar */
  onDismiss?: () => void;
  /** Fecha automaticamente após N ms (0 = nunca) */
  autoDismissMs?: number;
}

/* ─── mapa visual ────────────────────────────────────────────── */
type VariantMap = Record<Severity, {
  wrapper: string;
  iconColor: string;
  textColor: string;
  closeColor: string;
  Icon: React.ComponentType<{ className?: string }>;
}>;

const DARK: VariantMap = {
  error: {
    wrapper:    'border-red-900/50 bg-red-950/40',
    iconColor:  'text-red-400',
    textColor:  'text-red-300',
    closeColor: 'text-red-400 hover:text-red-200 hover:bg-red-900/40',
    Icon: AlertCircle,
  },
  warning: {
    wrapper:    'border-amber-800/50 bg-amber-950/40',
    iconColor:  'text-amber-400',
    textColor:  'text-amber-300',
    closeColor: 'text-amber-400 hover:text-amber-200 hover:bg-amber-900/40',
    Icon: TriangleAlert,
  },
  success: {
    wrapper:    'border-emerald-800/50 bg-emerald-950/40',
    iconColor:  'text-emerald-400',
    textColor:  'text-emerald-300',
    closeColor: 'text-emerald-400 hover:text-emerald-200 hover:bg-emerald-900/40',
    Icon: CheckCircle,
  },
  info: {
    wrapper:    'border-sky-800/50 bg-sky-950/40',
    iconColor:  'text-sky-400',
    textColor:  'text-sky-300',
    closeColor: 'text-sky-400 hover:text-sky-200 hover:bg-sky-900/40',
    Icon: Info,
  },
};

const LIGHT: VariantMap = {
  error: {
    wrapper:    'border-red-200 bg-red-50',
    iconColor:  'text-red-500',
    textColor:  'text-red-700',
    closeColor: 'text-red-400 hover:text-red-600 hover:bg-red-100',
    Icon: AlertCircle,
  },
  warning: {
    wrapper:    'border-amber-200 bg-amber-50',
    iconColor:  'text-amber-500',
    textColor:  'text-amber-700',
    closeColor: 'text-amber-400 hover:text-amber-600 hover:bg-amber-100',
    Icon: TriangleAlert,
  },
  success: {
    wrapper:    'border-emerald-200 bg-emerald-50',
    iconColor:  'text-emerald-500',
    textColor:  'text-emerald-700',
    closeColor: 'text-emerald-400 hover:text-emerald-600 hover:bg-emerald-100',
    Icon: CheckCircle,
  },
  info: {
    wrapper:    'border-sky-200 bg-sky-50',
    iconColor:  'text-sky-500',
    textColor:  'text-sky-700',
    closeColor: 'text-sky-400 hover:text-sky-600 hover:bg-sky-100',
    Icon: Info,
  },
};

/* ─── animação CSS inline (sem Framer Motion) ───────────────── */
const KEYFRAMES = `
  @keyframes fa-in  { from { opacity:0; transform:translateY(-6px) } to { opacity:1; transform:translateY(0) } }
  @keyframes fa-out { from { opacity:1; transform:translateY(0)    } to { opacity:0; transform:translateY(-6px) } }
  .fa-enter { animation: fa-in  0.18s ease-out forwards }
  .fa-exit  { animation: fa-out 0.15s ease-in  forwards }
`;

/* ─── componente ────────────────────────────────────────────── */
export default function FormAlert({
  message,
  severity = 'error',
  theme = 'dark',
  children,
  dismissible = false,
  onDismiss,
  autoDismissMs = 0,
}: FormAlertProps) {
  const [exiting, setExiting] = useState(false);

  /* normaliza mensagem → array */
  const messages = !message
    ? []
    : Array.isArray(message)
      ? message.filter(Boolean)
      : [message];

  /* dispara saída animada antes de notificar o pai */
  const handleDismiss = () => {
    setExiting(true);
    setTimeout(() => onDismiss?.(), 150);
  };

  /* auto-dismiss */
  useEffect(() => {
    if (!autoDismissMs || !messages.length) return;
    const t = setTimeout(handleDismiss, autoDismissMs);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDismissMs, message]);

  /* reinicia estado de saída quando uma nova mensagem chega */
  useEffect(() => { if (messages.length) setExiting(false); }, [message]);

  if (!messages.length) return null;

  const { wrapper, iconColor, textColor, closeColor, Icon } = (theme === 'light' ? LIGHT : DARK)[severity];

  return (
    <>
      <style>{KEYFRAMES}</style>

      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className={[
          'flex items-start gap-3 rounded-lg border p-3',
          wrapper,
          exiting ? 'fa-exit' : 'fa-enter',
        ].join(' ')}
      >
        {/* ícone */}
        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconColor}`} />

        {/* conteúdo */}
        <div className="flex-1 min-w-0">
          {messages.length === 1 ? (
            <p className={`text-sm leading-relaxed ${children ? 'font-semibold' : ''} ${textColor}`}>{messages[0]}</p>
          ) : (
            <ul className={`text-sm leading-relaxed ${textColor} list-disc list-inside space-y-0.5`}>
              {messages.map((m, i) => <li key={i}>{m}</li>)}
            </ul>
          )}
          {children}
        </div>

        {/* botão dispensar */}
        {dismissible && (
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Fechar alerta"
            className={`-mt-0.5 -mr-0.5 rounded p-0.5 transition-colors ${closeColor}`}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </>
  );
}
