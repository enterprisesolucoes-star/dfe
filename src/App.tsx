import { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import AppShell from './components/AppShell';
import AdminPortal from './components/AdminPortal';

export type Session = {
  usuarioId: number;
  nome: string;
  perfil: string;
  caixaId: number | null;
  empresaId: number;
  empresaConfigurada: boolean;
  usuarioDfe: number;
};

export default function App() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem('dfe_session');
    if (saved) {
      try {
        const s = JSON.parse(saved);
        // Sempre buscar caixaId atualizado da API
        fetch(`./api.php?action=caixa_atual&usuarioId=${s.usuarioId}`)
          .then(r => r.json())
          .then(cx => {
            setSession({ ...s, caixaId: cx?.id ?? null });
          })
          .catch(() => setSession(s));
      } catch {}
    }
  }, []);

  const handleLogin = async (s: Session) => {
    try {
      const cx = await fetch(`./api.php?action=caixa_atual&usuarioId=${s.usuarioId}`).then(r => r.json());
      s = { ...s, caixaId: cx?.id ?? null };
    } catch {}
    sessionStorage.setItem('dfe_session', JSON.stringify(s));
    setSession(s);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('dfe_session');
    setSession(null);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isHardRefresh =
        (e.ctrlKey && e.key === 'F5') ||
        (e.ctrlKey && e.shiftKey && (e.key === 'R' || e.key === 'r'));
      if (isHardRefresh) {
        sessionStorage.removeItem('dfe_session');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleUpdateSession = (s: Session) => {
    setSession(s);
    if (sessionStorage.getItem('dfe_session')) {
      sessionStorage.setItem('dfe_session', JSON.stringify(s));
    }
  };

  // Rota /admin
  if (window.location.pathname.startsWith('/admin')) {
    return <AdminPortal />;
  }

  if (!session) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="antialiased font-sans">
      <AppShell
        session={session}
        onLogout={handleLogout}
        onUpdateSession={handleUpdateSession}
      />
    </div>
  );
}
