
import React, { useState, useEffect } from 'react';
import { db } from '../services/database';
import { User, UserType, SystemConfig } from '../types';
import { Save, Shield, User as UserIcon, Lock, Plus, Trash2, X, Edit2, Check, Settings as SettingsIcon, AlertTriangle } from 'lucide-react';

const Settings: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  // Destinations
  const [destinations, setDestinations] = useState<string[]>([]);
  const [newDest, setNewDest] = useState('');
  const [editingDest, setEditingDest] = useState<{original: string, current: string} | null>(null);

  // Deletion State (Modal)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // System Config
  const [config, setConfig] = useState<SystemConfig>(db.getConfig());

  useEffect(() => {
    const session = localStorage.getItem('sgp_session');
    if (session) {
      const u = JSON.parse(session);
      setCurrentUser(u);
      setName(u.nome);
    }
    loadDestinations();
    setConfig(db.getConfig());
  }, []);

  const loadDestinations = () => {
    setDestinations([...db.getDestinations()]);
  };

  // --- Profile Handlers ---
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    const updatedUser = { 
      ...currentUser, 
      nome: name, 
      ...(password ? { senha_hash: password } : {}) 
    };
    db.updateUser(updatedUser);
    localStorage.setItem('sgp_session', JSON.stringify(updatedUser));
    setCurrentUser(updatedUser);
    setPassword('');
    alert('Perfil atualizado com sucesso!');
  };

  // --- Destination Handlers ---
  const handleAddDestination = () => {
    const val = newDest.trim();
    if (val && !destinations.includes(val)) {
      const updated = [...destinations, val];
      setDestinations(updated);
      db.saveDestinations(updated);
      setNewDest('');
    }
  };

  const confirmDeleteDestination = () => {
    if (deleteTarget) {
      const updated = destinations.filter(d => d !== deleteTarget);
      setDestinations(updated);
      db.saveDestinations(updated);
      setDeleteTarget(null);
    }
  }

  const startEditDest = (dest: string) => {
    setEditingDest({ original: dest, current: dest });
  };

  const saveEditDest = () => {
    if (editingDest && editingDest.current.trim() !== '') {
       const updated = destinations.map(d => d === editingDest.original ? editingDest.current.trim() : d);
       setDestinations(updated);
       db.saveDestinations(updated);
       setEditingDest(null);
    }
  };

  // --- System Config Handlers ---
  const handleConfigChange = (section: 'requiredFields' | 'permissions', key: string, value: boolean) => {
    const newConfig = {
      ...config,
      [section]: {
        ...config[section as keyof SystemConfig],
        [key]: value
      }
    };
    setConfig(newConfig);
    db.saveConfig(newConfig);
  };

  if (!currentUser) return <div>Carregando...</div>;

  const isAdmin = currentUser.tipo === UserType.ADMIN;
  const canManageDestinations = isAdmin || config.permissions.commonCanManageDestinations;
  const canManageRequiredFields = isAdmin || config.permissions.commonCanManageRequiredFields;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* 1. Profile Settings */}
      <div className="bg-white dark:bg-slate-700 rounded-xl shadow-sm border border-slate-200 dark:border-slate-600 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 flex items-center gap-3">
          <UserIcon className="text-hospital-600 dark:text-hospital-400" />
          <h3 className="font-bold text-slate-800 dark:text-slate-100">Meu Perfil</h3>
        </div>
        <div className="p-8">
          <form onSubmit={handleSaveProfile} className="space-y-6 max-w-lg">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome Completo</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-2 border border-slate-300 dark:border-slate-500 rounded-lg focus:ring-2 focus:ring-hospital-500 dark:bg-slate-800 dark:text-white"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nova Senha</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="********" className="w-full px-4 py-2 border border-slate-300 dark:border-slate-500 rounded-lg focus:ring-2 focus:ring-hospital-500 dark:bg-slate-800 dark:text-white"/>
            </div>
            <button type="submit" className="flex items-center gap-2 bg-hospital-600 hover:bg-hospital-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"><Save size={18} /> Salvar Alterações</button>
          </form>
        </div>
      </div>

      {/* 2. Destinations */}
      {canManageDestinations && (
        <div className="bg-white dark:bg-slate-700 rounded-xl shadow-sm border border-slate-200 dark:border-slate-600 overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 flex items-center gap-3">
            <Shield className="text-purple-600 dark:text-purple-400" />
            <h3 className="font-bold text-slate-800 dark:text-slate-100">Gerenciar Destinos / Setores</h3>
          </div>
          <div className="p-8">
            <div className="flex gap-2 mb-6 relative max-w-lg">
              <input type="text" value={newDest} onChange={e => setNewDest(e.target.value)} placeholder="Novo destino (ex: Raio-X)" className="flex-1 px-4 py-2 pr-10 border border-slate-300 dark:border-slate-500 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-slate-800 dark:text-white"/>
               {newDest && <button onClick={() => setNewDest('')} className="absolute right-32 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={18} /></button>}
              <button onClick={handleAddDestination} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"><Plus size={18} /> Adicionar</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {destinations.map((dest, index) => (
                <div key={`${dest}-${index}`} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 px-3 py-2 rounded-lg">
                  {editingDest?.original === dest ? (
                     <div className="flex items-center gap-1 flex-1">
                        <input autoFocus type="text" className="w-full text-sm bg-white dark:bg-slate-700 border border-purple-300 rounded px-1 py-0.5 outline-none dark:text-white" value={editingDest.current} onChange={(e) => setEditingDest({...editingDest, current: e.target.value})}/>
                        <button type="button" onClick={saveEditDest} className="text-green-600 dark:text-green-400 p-1 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"><Check size={16}/></button>
                        <button type="button" onClick={() => setEditingDest(null)} className="text-red-500 dark:text-red-400 p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"><X size={16}/></button>
                     </div>
                  ) : (
                     <span className="text-slate-700 dark:text-slate-200 text-sm font-medium pl-1">{dest}</span>
                  )}
                  
                  {!editingDest || editingDest.original !== dest ? (
                    <div className="flex items-center gap-1">
                       <button type="button" onClick={() => startEditDest(dest)} className="text-slate-400 hover:text-blue-500 dark:hover:text-blue-300 p-1.5 rounded" title="Editar"><Edit2 size={15} /></button>
                       <button 
                         type="button" 
                         onClick={(e) => { e.stopPropagation(); setDeleteTarget(dest); }}
                         className="text-slate-400 hover:text-red-500 dark:hover:text-red-300 p-1.5 rounded" 
                         title="Remover"
                       >
                         <Trash2 size={15} />
                       </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. Required Fields */}
      {canManageRequiredFields && (
        <div className="bg-white dark:bg-slate-700 rounded-xl shadow-sm border border-slate-200 dark:border-slate-600 overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 flex items-center gap-3">
            <SettingsIcon className="text-orange-600 dark:text-orange-400" />
            <h3 className="font-bold text-slate-800 dark:text-slate-100">Campos Obrigatórios</h3>
          </div>
          <div className="p-8">
             <div className="space-y-4">
                {Object.entries(config.requiredFields).map(([key, val]) => (
                  <label key={key} className="flex items-center gap-3 cursor-pointer select-none">
                    <input type="checkbox" className="w-5 h-5 rounded text-orange-600 focus:ring-orange-500" 
                      checked={val} 
                      onChange={(e) => handleConfigChange('requiredFields', key, e.target.checked)}
                    />
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300 capitalize">{key}</span>
                  </label>
                ))}
             </div>
          </div>
        </div>
      )}

      {/* 4. Access Control */}
      {isAdmin && (
        <div className="bg-white dark:bg-slate-700 rounded-xl shadow-sm border border-slate-200 dark:border-slate-600 overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 flex items-center gap-3">
            <Lock className="text-red-600 dark:text-red-400" />
            <h3 className="font-bold text-slate-800 dark:text-slate-100">Controle de Permissões (Usuários Comuns)</h3>
          </div>
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
             <div>
                <h5 className="font-bold text-slate-500 dark:text-slate-400 text-xs uppercase mb-4 tracking-wider">Acesso a Módulos</h5>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input type="checkbox" className="w-5 h-5 rounded text-red-600 focus:ring-red-500" checked={config.permissions.commonCanViewHistory} onChange={(e) => handleConfigChange('permissions', 'commonCanViewHistory', e.target.checked)}/>
                    <span className="text-sm text-slate-700 dark:text-slate-300">Visualizar Histórico</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input type="checkbox" className="w-5 h-5 rounded text-red-600 focus:ring-red-500" checked={config.permissions.commonCanImportAgenda} onChange={(e) => handleConfigChange('permissions', 'commonCanImportAgenda', e.target.checked)}/>
                    <span className="text-sm text-slate-700 dark:text-slate-300">Importar Agenda</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input type="checkbox" className="w-5 h-5 rounded text-red-600 focus:ring-red-500" checked={config.permissions.commonCanManageDestinations} onChange={(e) => handleConfigChange('permissions', 'commonCanManageDestinations', e.target.checked)}/>
                    <span className="text-sm text-slate-700 dark:text-slate-300">Gerenciar Destinos</span>
                  </label>
                </div>
             </div>
             <div>
                <h5 className="font-bold text-slate-500 dark:text-slate-400 text-xs uppercase mb-4 tracking-wider">Dados</h5>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input type="checkbox" className="w-5 h-5 rounded text-red-600 focus:ring-red-500" checked={config.permissions.commonCanEditProntuario} onChange={(e) => handleConfigChange('permissions', 'commonCanEditProntuario', e.target.checked)}/>
                    <span className="text-sm text-slate-700 dark:text-slate-300">Editar Prontuários</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input type="checkbox" className="w-5 h-5 rounded text-red-600 focus:ring-red-500" checked={config.permissions.commonCanDeleteProntuario} onChange={(e) => handleConfigChange('permissions', 'commonCanDeleteProntuario', e.target.checked)}/>
                    <span className="text-sm text-slate-700 dark:text-slate-300">Excluir Prontuários</span>
                  </label>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setDeleteTarget(null)}>
           <div className="bg-white dark:bg-slate-700 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6 border border-slate-200 dark:border-slate-600" onClick={e => e.stopPropagation()}>
              <div className="flex flex-col items-center text-center mb-6">
                 <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-600 dark:text-red-400 mb-4"><Trash2 size={24} /></div>
                 <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Excluir Setor?</h3>
                 <p className="text-sm text-slate-500 dark:text-slate-300">
                    Deseja realmente remover <strong>{deleteTarget}</strong>?
                 </p>
              </div>
              <div className="flex gap-3">
                 <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-600 rounded-lg font-medium">Cancelar</button>
                 <button onClick={confirmDeleteDestination} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold">Excluir</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
