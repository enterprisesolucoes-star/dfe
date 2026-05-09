import { Download, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface Window {
    _deferredInstallPrompt: BeforeInstallPromptEvent | null;
  }
}

export default function InstallPrompt() {
  const [show, setShow] = useState(false);
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (localStorage.getItem('pwa_install_dismissed') === '1') return;

    // Se o evento já foi capturado antes do React montar
    if (window._deferredInstallPrompt) {
      promptRef.current = window._deferredInstallPrompt;
      setShow(true);
      return;
    }

    // Ou escuta o evento customizado disparado pelo script global
    const onInstallable = () => {
      if (window._deferredInstallPrompt) {
        promptRef.current = window._deferredInstallPrompt;
        setShow(true);
      }
    };
    window.addEventListener('pwa-installable', onInstallable);
    return () => window.removeEventListener('pwa-installable', onInstallable);
  }, []);

  const handleInstall = async () => {
    const prompt = promptRef.current;
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') {
      window._deferredInstallPrompt = null;
      setShow(false);
    }
    promptRef.current = null;
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem('pwa_install_dismissed', '1');
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-2rem)] max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-3 bg-gradient-to-r from-[#0c2461] to-[#1a56db] text-white rounded-2xl shadow-2xl px-4 py-3 border border-blue-400/30">
        <img src="./icons/icon-192.png" alt="DFe IA" className="w-12 h-12 rounded-xl shrink-0 shadow-md" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm leading-tight">Instale o DFe IA</p>
          <p className="text-xs text-blue-200 leading-tight mt-0.5">Acesso rápido como app nativo — sem precisar abrir o navegador.</p>
        </div>
        <div className="flex flex-col gap-1.5 shrink-0">
          <button
            onClick={handleInstall}
            className="flex items-center gap-1 bg-white text-blue-700 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap shadow-sm"
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
