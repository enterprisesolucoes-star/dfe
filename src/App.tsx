import { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import NfceDashboard from './components/NfceDashboard';
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
    const saved = localStorage.getItem('dfe_session');
    if (saved) {
      try { setSession(JSON.parse(saved)); } catch {}
    }
  }, []);

  const handleLogin = (s: Session, lembrar: boolean) => {
    if (lembrar) localStorage.setItem('dfe_session', JSON.stringify(s));
    setSession(s);
  };

  const handleLogout = () => {
    localStorage.removeItem('dfe_session');
    setSession(null);
  };

  const handleUpdateSession = (s: Session) => {
    setSession(s);
    if (localStorage.getItem('dfe_session')) {
      localStorage.setItem('dfe_session', JSON.stringify(s));
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
      <NfceDashboard
        session={session}
        onLogout={handleLogout}
        onUpdateSession={handleUpdateSession}
      />
    </div>
  );
}
