import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, ArrowLeftRight, Search, History, FileInput, Users, LogOut, Settings, Sun, Moon } from 'lucide-react';
import { User, UserType } from '../types';
import { db } from '../services/database';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [config, setConfig] = useState(db.getConfig());

  useEffect(() => {
    // Theme
    const savedTheme = localStorage.getItem('sgp_theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
    // Config
    setConfig(db.getConfig());
  }, []);

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('sgp_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('sgp_theme', 'light');
    }
  };

  if (!user) return <>{children}</>;

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
      isActive 
        ? 'bg-hospital-600 text-white shadow-md' 
        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
    }`;
  
  // Permissions Check
  const canViewHistory = user.tipo === UserType.ADMIN || config.permissions.commonCanViewHistory;
  const canImport = user.tipo === UserType.ADMIN || config.permissions.commonCanImportAgenda;

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-800 transition-colors overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 dark:bg-slate-900 text-white flex flex-col shadow-xl flex-shrink-0 border-r border-slate-800">
        <div className="p-6 border-b border-slate-800 flex items-center gap-2">
          <div className="w-8 h-8 bg-hospital-500 rounded flex items-center justify-center font-bold text-white">SGP</div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Hospital</h1>
            <p className="text-xs text-slate-400">Gestão de Prontuários</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Principal</div>
          <NavLink to="/" className={navItemClass}><LayoutDashboard size={18} /> Dashboard</NavLink>
          <NavLink to="/movements" className={navItemClass}><ArrowLeftRight size={18} /> Registrar Movimentação</NavLink>
          <NavLink to="/search" className={navItemClass}><Search size={18} /> Consulta / Localização</NavLink>

          <div className="mt-6 px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Gestão</div>
          {canViewHistory && (
             <NavLink to="/history" className={navItemClass}><History size={18} /> Histórico Completo</NavLink>
          )}
          {canImport && (
             <NavLink to="/import" className={navItemClass}><FileInput size={18} /> Importar Agenda</NavLink>
          )}

          <div className="mt-6 px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Sistema</div>
          {user.tipo === UserType.ADMIN && (
            <NavLink to="/users" className={navItemClass}><Users size={18} /> Usuários</NavLink>
          )}
          <NavLink to="/settings" className={navItemClass}><Settings size={18} /> Configurações</NavLink>
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
           <button onClick={toggleTheme} className="flex items-center justify-center gap-2 w-full px-3 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors mb-2">
            {isDarkMode ? <Sun size={14} /> : <Moon size={14} />} {isDarkMode ? 'Modo Claro' : 'Modo Escuro'}
          </button>
          <div className="flex items-center gap-3 mb-3 px-2 pt-2 border-t border-slate-900">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold uppercase text-white">{user.nome.charAt(0)}</div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate text-white">{user.nome}</p>
              <p className="text-xs text-slate-400 truncate capitalize">{user.tipo}</p>
            </div>
          </div>
          <button onClick={onLogout} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-slate-900 rounded-md transition-colors"><LogOut size={16} /> Sair do Sistema</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-800 flex flex-col transition-colors">
        <header className="bg-white dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600 px-8 py-4 sticky top-0 z-10 flex justify-between items-center shadow-sm">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            {location.pathname === '/' && 'Visão Geral'}
            {location.pathname === '/movements' && 'Movimentação de Prontuários'}
            {location.pathname === '/search' && 'Consulta e Localização'}
            {location.pathname === '/history' && 'Histórico de Movimentações'}
            {location.pathname === '/import' && 'Importar Agenda Diária'}
            {location.pathname === '/users' && 'Gerenciar Usuários'}
            {location.pathname === '/settings' && 'Configurações do Sistema'}
          </h2>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </header>
        <div className="p-8 flex-1">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;