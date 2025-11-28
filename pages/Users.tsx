
import React, { useState } from 'react';
import { db } from '../services/database';
import { User, UserType } from '../types';
import { Trash2, UserPlus, Shield, User as UserIcon, Edit, Save, X } from 'lucide-react';

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>(db.getUsers());
  const [formUser, setFormUser] = useState({ id: 0, nome: '', login: '', senha: '', tipo: UserType.COMUM });
  const [isEditing, setIsEditing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const refreshUsers = () => {
    setUsers([...db.getUsers()]); 
  };

  const resetForm = () => {
    setFormUser({ id: 0, nome: '', login: '', senha: '', tipo: UserType.COMUM });
    setIsEditing(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUser.nome || !formUser.login) return;

    if (isEditing) {
      const currentUser = users.find(u => u.id === formUser.id);
      if (currentUser) {
        db.updateUser({
          ...currentUser,
          nome: formUser.nome,
          login: formUser.login,
          tipo: formUser.tipo,
          senha_hash: formUser.senha ? formUser.senha : currentUser.senha_hash
        });
      }
    } else {
      if (!formUser.senha) return alert('Senha obrigatória para novos usuários');
      db.addUser({
        nome: formUser.nome,
        login: formUser.login,
        senha_hash: formUser.senha, 
        tipo: formUser.tipo
      });
    }

    refreshUsers();
    resetForm();
  };

  const handleEdit = (user: User) => {
    setFormUser({
      id: user.id,
      nome: user.nome,
      login: user.login,
      senha: '',
      tipo: user.tipo
    });
    setIsEditing(true);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      db.deleteUser(deleteTarget.id);
      refreshUsers();
      setDeleteTarget(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Form Section */}
      <div className="lg:col-span-1">
        <div className={`p-6 rounded-xl shadow-md border transition-colors ${isEditing ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600'}`}>
          <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${isEditing ? 'text-amber-800 dark:text-amber-400' : 'text-slate-800 dark:text-slate-100'}`}>
            {isEditing ? <Edit size={20} /> : <UserPlus size={20} className="text-hospital-600 dark:text-hospital-400"/>}
            {isEditing ? 'Editar Usuário' : 'Novo Usuário'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome Completo</label>
              <input 
                type="text" 
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-500 rounded-lg focus:ring-2 focus:ring-hospital-500 bg-white dark:bg-slate-800 dark:text-white" 
                value={formUser.nome}
                onChange={e => setFormUser({...formUser, nome: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Login</label>
              <input 
                type="text" 
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-500 rounded-lg focus:ring-2 focus:ring-hospital-500 bg-white dark:bg-slate-800 dark:text-white" 
                value={formUser.login}
                onChange={e => setFormUser({...formUser, login: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {isEditing ? 'Nova Senha (Opcional)' : 'Senha'}
              </label>
              <input 
                type="password" 
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-500 rounded-lg focus:ring-2 focus:ring-hospital-500 bg-white dark:bg-slate-800 dark:text-white" 
                value={formUser.senha}
                onChange={e => setFormUser({...formUser, senha: e.target.value})}
                placeholder={isEditing ? '********' : ''}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo de Acesso</label>
              <select 
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-500 rounded-lg bg-white dark:bg-slate-800 dark:text-white"
                value={formUser.tipo}
                onChange={e => setFormUser({...formUser, tipo: e.target.value as UserType})}
              >
                <option value={UserType.COMUM}>Comum</option>
                <option value={UserType.ADMIN}>Administrador</option>
              </select>
            </div>
            
            <div className="flex gap-2">
              <button 
                type="submit" 
                className={`flex-1 font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-white ${isEditing ? 'bg-amber-600 hover:bg-amber-700' : 'bg-hospital-600 hover:bg-hospital-700'}`}
              >
                {isEditing ? <><Save size={16}/> Salvar</> : <><UserPlus size={16}/> Cadastrar</>}
              </button>
              {isEditing && (
                <button 
                  type="button" 
                  onClick={resetForm}
                  className="px-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500 text-slate-600 dark:text-slate-200 rounded-lg"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* List Section */}
      <div className="lg:col-span-2">
        <div className="bg-white dark:bg-slate-700 rounded-xl shadow-md border border-slate-200 dark:border-slate-600 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 uppercase font-semibold text-xs">
              <tr>
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">Login</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-600">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">{u.nome}</td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{u.login}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      u.tipo === UserType.ADMIN ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-600 dark:text-slate-300'
                    }`}>
                      {u.tipo === UserType.ADMIN ? <Shield size={12}/> : <UserIcon size={12}/>}
                      {u.tipo}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right flex justify-end gap-2">
                    <button 
                      onClick={() => handleEdit(u)}
                      className="text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 p-2 rounded transition-colors"
                      title="Editar"
                    >
                      <Edit size={18} />
                    </button>
                    {u.login !== 'admin' && (
                      <button 
                        type="button" 
                        onClick={() => setDeleteTarget(u)}
                        className="text-red-500 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded transition-colors"
                        title="Remover"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

       {/* DELETE MODAL */}
       {deleteTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setDeleteTarget(null)}>
           <div className="bg-white dark:bg-slate-700 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6 border border-slate-200 dark:border-slate-600" onClick={e => e.stopPropagation()}>
              <div className="flex flex-col items-center text-center mb-6">
                 <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-600 dark:text-red-400 mb-4"><Trash2 size={24} /></div>
                 <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Excluir Usuário?</h3>
                 <p className="text-sm text-slate-500 dark:text-slate-300">
                    Deseja realmente remover <strong>{deleteTarget.nome}</strong>?
                 </p>
              </div>
              <div className="flex gap-3">
                 <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-600 rounded-lg font-medium">Cancelar</button>
                 <button onClick={confirmDelete} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold">Excluir</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
