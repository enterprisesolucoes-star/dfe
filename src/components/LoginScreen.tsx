import { useState } from 'react';
import { FileText, Lock, User } from 'lucide-react';
import type { Session } from '../App';
import FormAlert from './FormAlert';

const LoginScreen = ({ onLogin }: { onLogin: (s: Session, lembrar: boolean) => void }) => {
  const [login,   setLogin]   = useState('');
  const [senha,   setSenha]   = useState('');
  const [lembrar, setLembrar] = useState(false);
  const [erro,    setErro]    = useState('');
  const [manutencao, setManutencao] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!login || !senha) { setErro('Preencha login e senha.'); return; }
    setLoading(true); setErro('');
    try {
      const res  = await fetch('api.php?action=login', {
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
          caixaId: null,
          empresaId: data.empresaId ?? 0,
          empresaConfigurada: data.empresaConfigurada ?? true,
          usuarioDfe: data.usuarioDfe ?? 2
        }, lembrar);
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
      <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-sm text-center">
        <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Sistema em Manutenção</h2>
        <p className="text-gray-500 text-sm mb-6">Estamos realizando melhorias no sistema. Por favor, aguarde alguns minutos e tente novamente.</p>
        <button onClick={() => setManutencao(false)} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700">
          Tentar Novamente
        </button>
      </div>
    </div>
  );

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: 'url("bg_login.png")' }}
    >
      <div className="absolute inset-0 bg-blue-900/70 mix-blend-multiply"></div>
      <div className="absolute inset-0 bg-black/40"></div>

      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-sm p-8 relative z-10 border border-white/20">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-2xl mb-4">
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">DFe IA v2</h1>
          <p className="text-sm text-gray-500 mt-1">Sistema de Emissão Fiscal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Usuário</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={login}
                onChange={e => setLogin(e.target.value)}
                placeholder="login"
                autoFocus
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="password"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                placeholder="••••••"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={lembrar}
              onChange={e => setLembrar(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">Lembrar-me neste dispositivo</span>
          </label>

          <FormAlert message={erro} theme="light" />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? 'Autenticando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-xs mt-6 text-gray-400 hover:text-blue-500 transition-colors cursor-pointer">
          <a href="https://esolucoesia.com" target="_blank" rel="noopener noreferrer">
            Enterprise Soluções
          </a>
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;
