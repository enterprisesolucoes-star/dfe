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
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-900 to-blue-700">
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
