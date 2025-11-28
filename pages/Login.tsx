import React, { useState } from 'react';
import { db } from '../services/database';
import { User } from '../types';
import { Activity } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const users = db.getUsers();
    const user = users.find(u => u.login === login && u.senha_hash === password);

    if (user) {
      onLogin(user);
    } else {
      setError('Credenciais inválidas.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-hospital-600 p-8 text-center">
          <div className="mx-auto bg-white/20 w-16 h-16 rounded-full flex items-center justify-center backdrop-blur-sm mb-4">
            <Activity className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white">SGP Hospitalar</h1>
          <p className="text-hospital-100 text-sm mt-1">Sistema de Gerenciamento de Prontuários</p>
        </div>
        
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 text-center">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Usuário</label>
              <input
                type="text"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-hospital-500 focus:border-hospital-500 transition-all outline-none"
                placeholder="Digite seu usuário"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
              <input
                type="password"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-hospital-500 focus:border-hospital-500 transition-all outline-none"
                placeholder="Digite sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            
            <button
              type="submit"
              className="w-full bg-hospital-600 hover:bg-hospital-700 text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
            >
              Entrar no Sistema
            </button>
          </form>
          
          <div className="mt-6 text-center text-xs text-slate-400">
            &copy; 2024 Vibe Tech Solutions
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;