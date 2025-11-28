
import React, { useState, useMemo, useEffect } from 'react';
import { db } from '../services/database';
import { Search as SearchIcon, Calendar, MapPin, User, FileText, ArrowUp, ArrowDown, X, Clock, Edit, Trash2, Save, AlertTriangle } from 'lucide-react';
import { Prontuario, ProntuarioStatus } from '../types';

type SortKey = keyof Prontuario | 'nascimento';

const Search: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateSearch, setDateSearch] = useState('');
  const [prontuarios, setProntuarios] = useState<Prontuario[]>([]);
  const [config, setConfig] = useState(db.getConfig());
  const [currentUser, setCurrentUser] = useState<any>(null); // To check role
  
  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editingProntuario, setEditingProntuario] = useState<Prontuario | null>(null);

  // Delete State
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Prontuario | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  // Sort state
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'ultima_movimentacao', direction: 'desc' });

  useEffect(() => {
    const session = localStorage.getItem('sgp_session');
    if (session) setCurrentUser(JSON.parse(session));
    setConfig(db.getConfig());
    refreshData();
  }, []);

  const refreshData = () => {
    setProntuarios(db.getProntuarios());
  };

  const handleSort = (key: SortKey) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const filteredAndSorted = useMemo(() => {
    let result = [...prontuarios];
    
    // Text Filter
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(p => 
        p.numero_prontuario.toLowerCase().includes(lower) || 
        p.nome_paciente.toLowerCase().includes(lower) ||
        p.local_atual.toLowerCase().includes(lower)
      );
    }

    // Flexible Date Filter (Matches stored YYYY-MM-DD OR localized DD/MM/YYYY)
    if (dateSearch) {
       const searchClean = dateSearch.trim();
       result = result.filter(p => {
          if (!p.data_nascimento) return false;
          const stored = p.data_nascimento; // YYYY-MM-DD
          const [y, m, d] = stored.split('-');
          const localizedDate = `${d}/${m}/${y}`; // 14/05/1990
          return stored.includes(searchClean) || localizedDate.includes(searchClean);
       });
    }

    // Sorting
    result.sort((a, b) => {
      let valA: any;
      let valB: any;
      switch(sortConfig.key) {
        case 'nome_paciente': valA = a.nome_paciente.toLowerCase(); valB = b.nome_paciente.toLowerCase(); break;
        case 'numero_prontuario': valA = parseInt(a.numero_prontuario) || a.numero_prontuario; valB = parseInt(b.numero_prontuario) || b.numero_prontuario; break;
        case 'idade': valA = a.idade; valB = b.idade; break;
        case 'local_atual': valA = a.local_atual.toLowerCase(); valB = b.local_atual.toLowerCase(); break;
        case 'status': valA = a.status.toLowerCase(); valB = b.status.toLowerCase(); break;
        case 'nascimento': valA = a.data_nascimento || ''; valB = b.data_nascimento || ''; break;
        case 'ultima_movimentacao': valA = a.ultima_movimentacao || ''; valB = b.ultima_movimentacao || ''; break;
        default: return 0;
      }
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [searchTerm, dateSearch, sortConfig, prontuarios]);

  const initiateDelete = (p: Prontuario) => {
    setDeleteTarget(p);
    setDeleteConfirmation('');
    setIsDeleting(true);
  };

  const confirmDelete = (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteTarget && deleteConfirmation.toLowerCase() === 'sim, excluir') {
      db.deleteProntuario(deleteTarget.id);
      refreshData();
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const openEditModal = (p: Prontuario) => {
    setEditingProntuario({...p});
    setIsEditing(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProntuario) {
       try {
         db.updateProntuario(editingProntuario);
         refreshData();
         setIsEditing(false);
       } catch (error: any) {
         alert(error.message);
       }
    }
  };

  // Permission Check
  const canEdit = currentUser?.tipo === 'admin' || config.permissions.commonCanEditProntuario;
  const canDelete = currentUser?.tipo === 'admin' || config.permissions.commonCanDeleteProntuario;

  const SortIcon = ({ colKey }: { colKey: SortKey }) => {
    if (sortConfig.key !== colKey) return <div className="w-4 h-4 ml-1"></div>;
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="ml-1 text-hospital-600" /> : <ArrowDown size={14} className="ml-1 text-hospital-600" />;
  };

  const Header = ({ label, colKey, className = "" }: { label: string, colKey: SortKey, className?: string }) => (
    <th className={`px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors select-none group ${className}`} onClick={() => handleSort(colKey)}>
      <div className="flex items-center">{label}<SortIcon colKey={colKey} /></div>
    </th>
  );

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex-shrink-0">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-grow-[2]">
            <input type="text" className="w-full pl-12 pr-10 py-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-950 focus:ring-2 focus:ring-hospital-500 outline-none transition-all" placeholder="Buscar por número, nome do paciente ou setor..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            <SearchIcon className="absolute left-4 top-3.5 text-slate-400" size={20} />
            {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={18} /></button>}
          </div>
          <div className="relative flex-grow-[1] flex items-center gap-2">
             <div className="relative w-full">
                <input 
                  type="text" 
                  value={dateSearch} 
                  onChange={e => setDateSearch(e.target.value)} 
                  className="w-full pl-10 pr-10 py-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-950 focus:ring-2 focus:ring-hospital-500 outline-none transition-all text-slate-600 dark:text-slate-300" 
                  placeholder="Ex: 1990, 05/1990 ou 14/05/1990"
                />
                <Calendar className="absolute left-3 top-3.5 text-slate-400" size={18}/>
                {dateSearch && <button onClick={() => setDateSearch('')} className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={18} /></button>}
             </div>
             <button className="bg-hospital-600 hover:bg-hospital-700 text-white p-3 rounded-lg transition-colors shadow-sm" title="Pesquisar">
                <SearchIcon size={20} />
             </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex-1 flex flex-col">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 shadow-sm">
              <tr>
                <Header label="Data Movimentação" colKey="ultima_movimentacao" className="w-48"/>
                <Header label="Prontuário" colKey="numero_prontuario" />
                <Header label="Paciente" colKey="nome_paciente" />
                <Header label="Idade / Nasc." colKey="idade" />
                <Header label="Local Atual" colKey="local_atual" />
                <Header label="Situação" colKey="status" />
                {(canEdit || canDelete) && <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-right">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-800">
              {filteredAndSorted.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap"><div className="flex items-center gap-2 text-hospital-600 dark:text-hospital-400 font-medium text-sm"><Clock size={16} />{p.ultima_movimentacao ? new Date(p.ultima_movimentacao).toLocaleString('pt-BR', {day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'}) : '-'}</div></td>
                  <td className="px-6 py-4 whitespace-nowrap"><span className="font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded text-sm border border-slate-200 dark:border-slate-600">#{p.numero_prontuario}</span></td>
                  <td className="px-6 py-4"><div className="font-medium text-slate-900 dark:text-white">{p.nome_paciente}</div><div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{p.sexo === 'M' ? 'Masculino' : p.sexo === 'F' ? 'Feminino' : 'Outro'}</div></td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium">
                        <User size={16} className="text-slate-400"/>
                        <span>{p.idade} Anos</span>
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 ml-6 mt-0.5">
                        Nasc: {p.data_nascimento ? new Date(p.data_nascimento).toLocaleDateString('pt-BR') : 'N/A'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap"><div className="flex flex-col">{p.local_anterior && <div className="text-xs text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1 opacity-90 font-medium">{p.local_anterior} <span>&rarr;</span></div>}<div className="flex items-center gap-2"><MapPin size={16} className="text-hospital-500"/><span className="font-bold text-slate-700 dark:text-slate-200">{p.local_atual}</span></div></div></td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold ${p.status === ProntuarioStatus.ATIVO ? 'bg-green-100 text-green-700' : p.status === ProntuarioStatus.DESATIVADO ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                       <span className={`w-2 h-2 rounded-full ${p.status === ProntuarioStatus.ATIVO ? 'bg-green-500' : p.status === ProntuarioStatus.DESATIVADO ? 'bg-red-500' : 'bg-yellow-500'}`}></span>
                       {p.status}
                    </span>
                  </td>
                  {(canEdit || canDelete) && (
                    <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                        {canEdit && <button onClick={() => openEditModal(p)} className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-hospital-600 hover:bg-hospital-50 dark:hover:bg-hospital-900/30 rounded transition-colors" title="Editar"><Edit size={16} /></button>}
                        {canDelete && <button onClick={() => initiateDelete(p)} className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors" title="Excluir"><Trash2 size={16} /></button>}
                        </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal (Click outside to close) */}
      {isEditing && editingProntuario && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setIsEditing(false)}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
               <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-hospital-50 dark:bg-slate-900">
                  <h3 className="font-bold text-hospital-800 dark:text-hospital-400 flex items-center gap-2 text-lg"><Edit size={20}/> Editar Prontuário</h3>
                  <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={20}/></button>
               </div>
               <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 text-xs rounded border border-yellow-200 dark:border-yellow-800 flex gap-2"><AlertTriangle size={16} className="flex-shrink-0"/><span>Atenção: A edição destes dados altera permanentemente o registro do paciente.</span></div>
                  <div className="grid grid-cols-2 gap-4">
                     <div><label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5 uppercase">Número</label><input required type="text" className="w-full border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm focus:ring-hospital-500 dark:bg-slate-900 dark:text-white" value={editingProntuario.numero_prontuario} onChange={e => setEditingProntuario({...editingProntuario, numero_prontuario: e.target.value})} /></div>
                     <div><label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5 uppercase">Nome</label><input required type="text" className="w-full border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm focus:ring-hospital-500 dark:bg-slate-900 dark:text-white" value={editingProntuario.nome_paciente} onChange={e => setEditingProntuario({...editingProntuario, nome_paciente: e.target.value})} /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                     <div><label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5 uppercase">Idade</label><input required type="number" className="w-full border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm focus:ring-hospital-500 dark:bg-slate-900 dark:text-white" value={editingProntuario.idade} onChange={e => setEditingProntuario({...editingProntuario, idade: parseInt(e.target.value) || 0})} /></div>
                     <div><label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5 uppercase">Sexo</label><select className="w-full border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm bg-white dark:bg-slate-900 dark:text-white" value={editingProntuario.sexo} onChange={e => setEditingProntuario({...editingProntuario, sexo: e.target.value})}><option value="M">Masculino</option><option value="F">Feminino</option><option value="O">Outro</option></select></div>
                     <div><label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5 uppercase">Nascimento</label><input type="date" className="w-full border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm focus:ring-hospital-500 dark:bg-slate-900 dark:text-white" value={editingProntuario.data_nascimento} onChange={e => setEditingProntuario({...editingProntuario, data_nascimento: e.target.value})} /></div>
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5 uppercase">Situação</label>
                     <select className="w-full border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm bg-white dark:bg-slate-900 dark:text-white" value={editingProntuario.status} onChange={e => setEditingProntuario({...editingProntuario, status: e.target.value as any})}>
                        <option value={ProntuarioStatus.ATIVO}>Ativo</option>
                        <option value={ProntuarioStatus.DESATIVADO}>Desativado</option>
                        <option value={ProntuarioStatus.PERDIDO}>Perdido</option>
                     </select>
                  </div>
                  <div className="pt-4 flex gap-3">
                     <button type="button" onClick={() => setIsEditing(false)} className="flex-1 py-2.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 rounded-lg font-medium">Cancelar</button>
                     <button type="submit" className="flex-1 py-2.5 bg-hospital-600 hover:bg-hospital-700 text-white rounded-lg font-bold flex items-center justify-center gap-2"><Save size={18}/> Salvar Alterações</button>
                  </div>
               </form>
            </div>
         </div>
      )}

      {/* Delete Modal */}
      {isDeleting && deleteTarget && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => { setIsDeleting(false); setDeleteTarget(null); }}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-700 p-6" onClick={e => e.stopPropagation()}>
              <div className="flex flex-col items-center text-center mb-6">
                 <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-600 dark:text-red-400 mb-4"><Trash2 size={24} /></div>
                 <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Excluir Prontuário</h3>
                 <p className="text-sm text-slate-500 dark:text-slate-400">Tem certeza que deseja excluir este prontuário? Essa ação não pode ser desfeita.</p>
              </div>
              <form onSubmit={confirmDelete}>
                 <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Para confirmar, digite "Sim, excluir"</label>
                 <input type="text" className="w-full border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm focus:ring-red-500 focus:border-red-500 dark:bg-slate-900 dark:text-white mb-4" value={deleteConfirmation} onChange={e => setDeleteConfirmation(e.target.value)} placeholder="Sim, excluir" autoFocus />
                 <div className="flex gap-3">
                    <button type="button" onClick={() => { setIsDeleting(false); setDeleteTarget(null); }} className="flex-1 py-2.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 rounded-lg font-medium">Cancelar</button>
                    <button type="submit" disabled={deleteConfirmation.toLowerCase() !== 'sim, excluir'} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold">Excluir</button>
                 </div>
              </form>
            </div>
         </div>
      )}
    </div>
  );
};

export default Search;
