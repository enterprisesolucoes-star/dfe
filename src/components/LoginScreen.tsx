import React, { useState } from 'react';
import type { Session } from '../App';
import { Eye, EyeOff, Lock, User } from 'lucide-react';

const LoginScreen = ({ onLogin }: { onLogin: (s: Session) => void }) => {
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [manutencao, setManutencao] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setErro('');
    try {
      const res = await fetch('./api.php?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, senha }),
      });
      const data = await res.json();
      if (data.success) {
        onLogin({
          usuarioId: data.usuarioId,
          nome: data.nome,
          perfil: data.perfil,
          caixaId: data.caixaId ?? null,
          empresaId: data.empresaId ?? 0,
          empresaConfigurada: data.empresaConfigurada ?? true,
          usuarioDfe: data.usuarioDfe ?? 2
        });
      } else if (data.manutencao) {
        setManutencao(true);
      } else {
        setErro(data.message || 'Erro ao autenticar.');
      }
    } catch {
      setErro('Erro de comunicação com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  if (manutencao) return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-blue-900">
      <div className="bg-white dark:bg-[#0f1420] rounded-2xl shadow-2xl p-10 w-full max-w-sm text-center">
        <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-orange-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Sistema em Manutenção</h2>
        <p className="text-gray-500 text-sm">Aguarde, voltaremos em breve.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)'}}>
      {/* Background decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <svg className="absolute w-full h-full opacity-10" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
          <rect x="50" y="80" width="200" height="140" rx="8" fill="none" stroke="#60a5fa" strokeWidth="1.5"/>
          <rect x="60" y="90" width="180" height="20" rx="4" fill="#60a5fa" opacity="0.3"/>
          <rect x="60" y="120" width="80" height="8" rx="2" fill="#60a5fa" opacity="0.2"/>
          <rect x="60" y="135" width="120" height="8" rx="2" fill="#60a5fa" opacity="0.2"/>
          <rect x="60" y="150" width="100" height="8" rx="2" fill="#60a5fa" opacity="0.2"/>
          <rect x="60" y="175" width="50" height="30" rx="4" fill="#3b82f6" opacity="0.4"/>
          <rect x="120" y="175" width="50" height="30" rx="4" fill="#10b981" opacity="0.4"/>
          <rect x="300" y="50" width="160" height="100" rx="8" fill="none" stroke="#34d399" strokeWidth="1.5"/>
          <rect x="310" y="60" width="140" height="15" rx="3" fill="#34d399" opacity="0.3"/>
          <rect x="310" y="85" width="60" height="40" rx="4" fill="#34d399" opacity="0.2"/>
          <rect x="380" y="85" width="60" height="40" rx="4" fill="#34d399" opacity="0.2"/>
          <rect x="500" y="100" width="220" height="160" rx="8" fill="none" stroke="#a78bfa" strokeWidth="1.5"/>
          <rect x="510" y="110" width="200" height="15" rx="3" fill="#a78bfa" opacity="0.3"/>
          <rect x="510" y="135" width="195" height="6" rx="2" fill="#a78bfa" opacity="0.15"/>
          <rect x="510" y="148" width="150" height="6" rx="2" fill="#a78bfa" opacity="0.15"/>
          <rect x="510" y="161" width="170" height="6" rx="2" fill="#a78bfa" opacity="0.15"/>
          <rect x="510" y="174" width="130" height="6" rx="2" fill="#a78bfa" opacity="0.15"/>
          <rect x="510" y="220" width="80" height="25" rx="4" fill="#7c3aed" opacity="0.5"/>
          <rect x="100" y="300" width="580" height="200" rx="12" fill="none" stroke="#60a5fa" strokeWidth="1"/>
          <rect x="110" y="310" width="560" height="30" rx="6" fill="#1e40af" opacity="0.3"/>
          <rect x="120" y="318" width="80" height="14" rx="2" fill="#60a5fa" opacity="0.4"/>
          <rect x="220" y="318" width="60" height="14" rx="2" fill="#60a5fa" opacity="0.3"/>
          <rect x="110" y="350" width="560" height="1" stroke="#60a5fa" strokeWidth="0.5" fill="none"/>
          <rect x="120" y="360" width="100" height="8" rx="2" fill="#94a3b8" opacity="0.3"/>
          <rect x="120" y="375" width="80" height="8" rx="2" fill="#94a3b8" opacity="0.2"/>
          <rect x="120" y="390" width="120" height="8" rx="2" fill="#94a3b8" opacity="0.2"/>
          <rect x="400" y="355" width="60" height="60" rx="4" fill="#10b981" opacity="0.2"/>
          <rect x="480" y="355" width="60" height="60" rx="4" fill="#3b82f6" opacity="0.2"/>
          <rect x="560" y="355" width="60" height="60" rx="4" fill="#f59e0b" opacity="0.2"/>
          <circle cx="700" cy="150" r="60" fill="none" stroke="#f59e0b" strokeWidth="1.5" opacity="0.5"/>
          <path d="M700 110 L700 150 L730 150" stroke="#f59e0b" strokeWidth="2" fill="none" opacity="0.6"/>
          <circle cx="700" cy="150" r="4" fill="#f59e0b" opacity="0.8"/>
          <line x1="50" y1="550" x2="750" y2="550" stroke="#60a5fa" strokeWidth="0.5" opacity="0.3"/>
          <line x1="50" y1="500" x2="750" y2="500" stroke="#60a5fa" strokeWidth="0.5" opacity="0.2"/>
          <line x1="50" y1="450" x2="750" y2="450" stroke="#60a5fa" strokeWidth="0.5" opacity="0.1"/>
          <polyline points="100,540 180,520 260,530 340,500 420,510 500,480 580,490 660,460 740,470" fill="none" stroke="#10b981" strokeWidth="2" opacity="0.5"/>
          <polyline points="100,545 180,535 260,540 340,520 420,530 500,510 580,515 660,490 740,500" fill="none" stroke="#3b82f6" strokeWidth="1.5" opacity="0.4"/>
        </svg>
      </div>
      <div className="bg-white dark:bg-[#0f1420] rounded-2xl shadow-2xl p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">DFe Sistema</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Acesse sua conta</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Login</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={login}
                onChange={e => setLogin(e.target.value)}
                placeholder="login"
                autoFocus
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white dark:bg-[#0a0e1a] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type={showSenha ? 'text' : 'password'}
                value={senha}
                onChange={e => setSenha(e.target.value)}
                placeholder="senha"
                className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white dark:bg-[#0a0e1a] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              />
              <button type="button" onClick={() => setShowSenha(!showSenha)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {erro && <p className="text-red-500 text-sm text-center">{erro}</p>}
          <button type="submit" disabled={loading || !login || !senha}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginScreen;
