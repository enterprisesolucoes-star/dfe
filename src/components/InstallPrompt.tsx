import { Download, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [show, setShow] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (localStorage.getItem('pwa_install_dismissed') === '1') return;

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt.current) return;
    await deferredPrompt.current.prompt();
    const { outcome } = await deferredPrompt.current.userChoice;
    if (outcome === 'accepted') setShow(false);
    deferredPrompt.current = null;
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem('pwa_install_dismissed', '1');
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-2rem)] max-w-sm">
      <div className="flex items-center gap-3 bg-gradient-to-r from-[#0c2461] to-[#1a56db] text-white rounded-2xl shadow-2xl px-4 py-3 border border-blue-400/30">
        <img src="./icons/icon-192.png" alt="DFe IA" className="w-12 h-12 rounded-xl shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm leading-tight">Instale o DFe IA</p>
          <p className="text-xs text-blue-200 leading-tight mt-0.5">Acesso rápido, funciona como app nativo no seu dispositivo.</p>
        </div>
        <div className="flex flex-col gap-1.5 shrink-0">
          <button
            onClick={handleInstall}
            className="flex items-center gap-1 bg-white text-blue-700 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" /> Instalar
          </button>
          <button
            onClick={handleDismiss}
            className="flex items-center justify-center gap-1 text-blue-200 text-xs px-3 py-1 rounded-lg hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-3 h-3" /> Agora não
          </button>
        </div>
      </div>
    </div>
  );
}
