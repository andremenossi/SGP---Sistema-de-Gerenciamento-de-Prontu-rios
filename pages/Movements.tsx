
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../services/database';
import { Prontuario, ProntuarioStatus } from '../types';
import { AlertTriangle, CheckCircle, Search, Plus, X, ArrowLeftRight, User, Filter, SortAsc, SortDesc, Calendar, Edit2, Clock, MoveRight, History, Trash2 } from 'lucide-react';

interface MovementProps {
  userLogin: string;
}

const Movements: React.FC<MovementProps> = ({ userLogin }) => {
  // --- Register State ---
  const [numero, setNumero] = useState('');
  const [currentProntuario, setCurrentProntuario] = useState<Prontuario | null>(null);
  const [destino, setDestino] = useState('');
  const [message, setMessage] = useState<{type: 'success' | 'error' | 'warning', text: string} | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  // --- Correction (Edit) Modal State ---
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionTarget, setCorrectionTarget] = useState<Prontuario | null>(null);
  const [correctionLocal, setCorrectionLocal] = useState('');
  const [correctionStatus, setCorrectionStatus] = useState<ProntuarioStatus>(ProntuarioStatus.ATIVO);
  
  // --- Delete Confirmation State ---
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // --- List & Filter State ---
  const [listSearch, setListSearch] = useState('');
  const [showListFilters, setShowListFilters] = useState(false);
  const [allProntuarios, setAllProntuarios] = useState<Prontuario[]>([]);
  const filterRef = useRef<HTMLDivElement>(null);

  // List Filter Options (Persisted)
  const [listSortBy, setListSortBy] = useState<'nome' | 'numero' | 'idade' | 'movimentacao'>(() => {
    return (localStorage.getItem('sgp_listSortBy') as any) || 'movimentacao';
  });
  const [listSortOrder, setListSortOrder] = useState<'asc' | 'desc'>(() => {
    return (localStorage.getItem('sgp_listSortOrder') as any) || 'desc';
  });
  const [listFilterLocal, setListFilterLocal] = useState(() => {
    return localStorage.getItem('sgp_listFilterLocal') || '';
  });

  // Common Data & Config
  const [destinations, setDestinations] = useState<string[]>([]);
  const [newP, setNewP] = useState({ numero: '', nome: '', idade: '', sexo: 'F', nascimento: '', local: 'Arquivo', status: ProntuarioStatus.ATIVO });
  const [config, setConfig] = useState(db.getConfig());

  useEffect(() => {
    setDestinations(db.getDestinations());
    setDestino(db.getDestinations()[0] || '');
    setConfig(db.getConfig());
    refreshList();

    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowListFilters(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    localStorage.setItem('sgp_listSortBy', listSortBy);
  }, [listSortBy]);
  
  useEffect(() => {
    localStorage.setItem('sgp_listSortOrder', listSortOrder);
  }, [listSortOrder]);

  useEffect(() => {
    localStorage.setItem('sgp_listFilterLocal', listFilterLocal);
  }, [listFilterLocal]);

  // --- Auto Calc Date from Age ---
  const handleAgeChange = (val: string) => {
    setNewP(prev => {
      let newState = { ...prev, idade: val };
      if (val && !prev.nascimento) {
        // Calculate Approx Year
        const ageNum = parseInt(val);
        if (!isNaN(ageNum)) {
          const currentYear = new Date().getFullYear();
          const birthYear = currentYear - ageNum;
          // Set to Jan 1st of that year as default
          newState.nascimento = `${birthYear}-01-01`;
        }
      }
      return newState;
    });
  };

  const refreshList = () => {
    setAllProntuarios(db.getProntuarios());
  };

  const filteredList = useMemo(() => {
    let result = [...allProntuarios];
    if (listSearch) {
      const lower = listSearch.toLowerCase();
      result = result.filter(p => 
        p.numero_prontuario.includes(lower) || 
        p.nome_paciente.toLowerCase().includes(lower)
      );
    }
    if (listFilterLocal) {
        result = result.filter(p => p.local_atual === listFilterLocal);
    }
    result.sort((a, b) => {
      let valA: any = a[listSortBy === 'nome' ? 'nome_paciente' : listSortBy === 'numero' ? 'numero_prontuario' : listSortBy === 'idade' ? 'idade' : 'ultima_movimentacao'];
      let valB: any = b[listSortBy === 'nome' ? 'nome_paciente' : listSortBy === 'numero' ? 'numero_prontuario' : listSortBy === 'idade' ? 'idade' : 'ultima_movimentacao'];
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (listSortBy === 'numero') { valA = parseInt(valA) || valA; valB = parseInt(valB) || valB; }
      if (listSortBy === 'movimentacao') { valA = valA || ''; valB = valB || ''; }
      if (valA < valB) return listSortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return listSortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [allProntuarios, listSearch, listSortBy, listSortOrder, listFilterLocal]);

  useEffect(() => {
    if (numero) {
      const p = allProntuarios.find(x => x.numero_prontuario === numero);
      if (p) setCurrentProntuario(p);
      else {
        const pByName = allProntuarios.find(x => x.nome_paciente.toLowerCase() === numero.toLowerCase());
        setCurrentProntuario(pByName || null);
      }
    } else {
      setCurrentProntuario(null);
    }
  }, [numero, allProntuarios]);

  const selectProntuario = (p: Prontuario) => {
    setNumero(p.numero_prontuario);
    setCurrentProntuario(p);
  };

  const handleRegisterMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProntuario) {
      setMessage({ type: 'error', text: 'Prontuário inválido ou não encontrado.' });
      return;
    }
    if (currentProntuario.local_atual === destino) {
      setMessage({ type: 'warning', text: 'O prontuário já está neste local.' });
      return;
    }
    setIsRegistering(true);
    try {
      db.addMovimentacao({
        numero_prontuario: currentProntuario.numero_prontuario,
        nome_paciente: currentProntuario.nome_paciente,
        idade: currentProntuario.idade,
        origem: currentProntuario.local_atual,
        destino: destino,
        usuario_responsavel: userLogin
      });
      setMessage({ type: 'success', text: 'Movimentação registrada com sucesso!' });
      const updated = db.getProntuarioByNumber(currentProntuario.numero_prontuario);
      if (updated) setCurrentProntuario(updated);
      refreshList();
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao salvar movimentação.' });
    } finally {
      setIsRegistering(false);
    }
  };

  const handleCreateProntuario = (e: React.FormEvent) => {
    e.preventDefault();
    // Config validation
    if (config.requiredFields.idade && !newP.idade) { alert('Idade é obrigatória.'); return; }
    if (config.requiredFields.sexo && !newP.sexo) { alert('Sexo é obrigatório.'); return; }
    if (config.requiredFields.nascimento && !newP.nascimento) { alert('Data de Nascimento é obrigatória.'); return; }

    try {
      if (!newP.numero || !newP.nome) throw new Error("Preencha número e nome.");
      
      db.addProntuario({
        numero_prontuario: newP.numero,
        nome_paciente: newP.nome,
        idade: parseInt(newP.idade) || 0,
        sexo: newP.sexo,
        data_nascimento: newP.nascimento,
        status: newP.status,
        local_atual: newP.local,
        local_anterior: newP.local
      });
      refreshList();
      setNumero(newP.numero);
      setShowModal(false);
      setNewP({ numero: '', nome: '', idade: '', sexo: 'F', nascimento: '', local: 'Arquivo', status: ProntuarioStatus.ATIVO });
      setMessage({type: 'success', text: 'Prontuário criado com sucesso!'});
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openCorrectionModal = (p: Prontuario, e: React.MouseEvent) => {
    e.stopPropagation();
    setCorrectionTarget(p);
    setCorrectionLocal(p.local_atual); 
    setCorrectionStatus(p.status);
    setShowCorrectionModal(true);
    setShowDeleteConfirm(false);
  };

  const handleCorrection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionTarget) return;

    if (correctionLocal === correctionTarget.local_atual && correctionStatus === correctionTarget.status) {
        alert("Nenhuma alteração realizada.");
        return;
    }

    db.correctProntuarioLocation(correctionTarget.numero_prontuario, correctionLocal, userLogin, false);
    
    // Also update status if changed
    if (correctionStatus !== correctionTarget.status) {
        const updated = { ...correctionTarget, status: correctionStatus, local_atual: correctionLocal };
        db.updateProntuario(updated);
    }

    setMessage({ type: 'success', text: `Dados atualizados com sucesso.` });
    refreshList();
    if (currentProntuario?.id === correctionTarget.id) {
       const updated = db.getProntuarioByNumber(correctionTarget.numero_prontuario);
       if (updated) setCurrentProntuario(updated);
    }
    setShowCorrectionModal(false);
    setTimeout(() => setMessage(null), 3000);
  };

  const initiateDelete = () => {
    if (!correctionTarget) return;
    if (!correctionTarget.local_anterior) {
         alert("Não é possível desfazer: Este prontuário não possui histórico de movimentação anterior registrado no sistema.");
         return;
    }
    setShowDeleteConfirm(true);
  }

  const confirmDeleteMovement = () => {
     if (!correctionTarget) return;
     
     db.correctProntuarioLocation(correctionTarget.numero_prontuario, "", userLogin, true);
     setMessage({ type: 'warning', text: `Movimentação revertida/excluída.` });
     refreshList();
     if (currentProntuario?.id === correctionTarget.id) {
        const updated = db.getProntuarioByNumber(correctionTarget.numero_prontuario);
        if (updated) setCurrentProntuario(updated);
     }
     setShowDeleteConfirm(false);
     setShowCorrectionModal(false);
     setTimeout(() => setMessage(null), 3000);
  }

  const getStatusColor = (status: ProntuarioStatus) => {
    switch (status) {
        case ProntuarioStatus.ATIVO: return 'bg-green-500';
        case ProntuarioStatus.DESATIVADO: return 'bg-red-500';
        case ProntuarioStatus.PERDIDO: return 'bg-yellow-500';
        default: return 'bg-slate-400';
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)]">
      {/* LEFT: Register */}
      <div className="flex-1 overflow-y-auto">
        <div className="bg-white dark:bg-slate-700 rounded-xl shadow-md overflow-hidden border border-slate-200 dark:border-slate-600 h-full flex flex-col">
          <div className="p-6 border-b border-slate-100 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">Registrar Movimentação</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Mover prontuário entre setores.</p>
            </div>
            <button onClick={() => setShowModal(true)} className="bg-hospital-600 hover:bg-hospital-700 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm">
              <Plus size={16} /> Novo Prontuário
            </button>
          </div>
          <div className="p-8 space-y-8 flex-1 overflow-y-auto">
            {message && (
              <div className={`p-4 rounded-lg flex items-center gap-3 ${
                message.type === 'success' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800' :
                message.type === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800' :
                'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
              }`}>
                {message.type === 'success' ? <CheckCircle size={20}/> : <AlertTriangle size={20}/>}
                {message.text}
              </div>
            )}
            <form onSubmit={handleRegisterMovement} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Buscar Prontuário</label>
                <div className="relative">
                  <input type="text" value={numero} onChange={(e) => setNumero(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-slate-300 dark:border-slate-500 rounded-lg focus:ring-2 focus:ring-hospital-500 dark:bg-slate-800 dark:text-white" placeholder="Digite número ou nome..." autoFocus />
                  {numero && <button type="button" onClick={() => setNumero('')} className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={18}/></button>}
                  <Search className="absolute left-3 top-3.5 text-slate-400" size={18} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Destino</label>
                <select value={destino} onChange={(e) => setDestino(e.target.value)} className="w-full px-4 py-3 border border-slate-300 dark:border-slate-500 rounded-lg focus:ring-2 focus:ring-hospital-500 bg-white dark:bg-slate-800 dark:text-white shadow-sm">
                  {destinations.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              {currentProntuario ? (
                <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-600 shadow-inner">
                  <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2 text-lg">
                    <span className={`w-3 h-3 rounded-full ${getStatusColor(currentProntuario.status)}`}></span>
                    {currentProntuario.nome_paciente}
                  </h4>
                  <div className="grid grid-cols-2 gap-y-6 text-sm">
                    <div>
                      <span className="block text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider mb-1">Prontuário</span>
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-200 text-base bg-white dark:bg-slate-700 px-2 py-1 rounded border border-slate-200 dark:border-slate-500 inline-block">#{currentProntuario.numero_prontuario}</span>
                    </div>
                    <div>
                      <span className="block text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider mb-1">Idade / Sexo</span>
                      <span className="font-medium text-slate-900 dark:text-white text-base">{currentProntuario.idade} Anos / {currentProntuario.sexo || 'N/A'}</span>
                    </div>
                     <div className="col-span-2 grid grid-cols-2 gap-4 bg-white dark:bg-slate-700 p-3 rounded-lg border border-slate-200 dark:border-slate-600">
                        <div>
                          <span className="block text-slate-400 dark:text-slate-400 text-xs uppercase tracking-wider mb-1">Local Anterior</span>
                          <span className="font-medium text-slate-600 dark:text-slate-300 text-sm flex items-center gap-1"><History size={14} />{currentProntuario.local_anterior || '-'}</span>
                        </div>
                        <div>
                           <span className="block text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider mb-1">Local Atual</span>
                           <span className="font-bold text-hospital-700 dark:text-hospital-400 text-base flex items-center gap-1"><ArrowLeftRight size={14}/> {currentProntuario.local_atual}</span>
                        </div>
                        <div className="col-span-2 pt-2 border-t border-slate-100 dark:border-slate-600 mt-1">
                           <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1"><Clock size={12}/> Última: {currentProntuario.ultima_movimentacao ? new Date(currentProntuario.ultima_movimentacao).toLocaleString('pt-BR') : '-'}</span>
                        </div>
                     </div>
                  </div>
                  {currentProntuario.local_atual !== 'Arquivo' && currentProntuario.local_atual !== 'Recepção' && (
                    <div className="mt-5 p-3 bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200 text-sm rounded-lg border border-orange-100 dark:border-orange-800 flex gap-2 items-start">
                      <AlertTriangle size={16} className="mt-0.5 flex-shrink-0"/>
                      <span><strong>Alerta:</strong> Fora do arquivo ({currentProntuario.local_atual}).</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-slate-50 dark:bg-slate-800 p-12 rounded-xl border border-slate-200 dark:border-slate-600 border-dashed text-center text-slate-400 dark:text-slate-500">
                  <Search size={48} className="mx-auto mb-2 opacity-20" />
                  <p>Busque um prontuário para visualizar detalhes</p>
                </div>
              )}
              <div className="pt-4">
                <button type="submit" disabled={isRegistering || !currentProntuario} className="w-full bg-hospital-600 hover:bg-hospital-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 text-lg transform active:scale-95">
                  {isRegistering ? 'Registrando...' : 'Confirmar Transferência'} <ArrowLeftRight size={22} />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* RIGHT: List */}
      <div className="w-full lg:w-96 bg-white dark:bg-slate-700 rounded-xl shadow-md border border-slate-200 dark:border-slate-600 flex flex-col h-full overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 z-20">
          <div className="flex justify-between items-center mb-3">
             <h4 className="font-semibold text-slate-700 dark:text-slate-200">Lista de Prontuários</h4>
             <span className="text-xs text-slate-500 bg-slate-200 dark:bg-slate-600 dark:text-slate-200 px-2 py-0.5 rounded-full">{filteredList.length}</span>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input type="text" placeholder="Filtrar..." className="w-full pl-8 pr-8 py-2 text-sm border border-slate-300 dark:border-slate-500 rounded-lg focus:ring-2 focus:ring-hospital-500 dark:bg-slate-800 dark:text-white" value={listSearch} onChange={e => setListSearch(e.target.value)} />
              <Search className="absolute left-2.5 top-2.5 text-slate-400" size={14} />
              {listSearch && <button onClick={() => setListSearch('')} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={14}/></button>}
            </div>
            <div className="relative" ref={filterRef}>
              <button onClick={() => setShowListFilters(!showListFilters)} className={`p-2 border rounded-lg transition-colors ${showListFilters ? 'bg-hospital-100 border-hospital-300 text-hospital-700 dark:bg-slate-600' : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-500 dark:text-slate-400'}`}>
                <Filter size={18} />
              </button>
              {showListFilters && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-600 p-4 z-50">
                  <h5 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-3 border-b dark:border-slate-700 pb-2">Opções de Filtro</h5>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Ordenar por</label>
                      <select value={listSortBy} onChange={(e) => setListSortBy(e.target.value as any)} className="w-full text-sm border-slate-300 dark:border-slate-600 rounded-md dark:bg-slate-700 dark:text-white">
                        <option value="movimentacao">Última Movimentação</option>
                        <option value="nome">Nome</option>
                        <option value="numero">N° Prontuário</option>
                        <option value="idade">Idade</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Ordem</label>
                      <div className="flex bg-slate-100 dark:bg-slate-700 rounded p-1">
                        <button onClick={() => setListSortOrder('asc')} className={`flex-1 flex justify-center py-1 rounded text-xs ${listSortOrder === 'asc' ? 'bg-white dark:bg-slate-600 shadow font-bold' : 'text-slate-500 dark:text-slate-400'}`}><SortAsc size={14}/> Cresc</button>
                        <button onClick={() => setListSortOrder('desc')} className={`flex-1 flex justify-center py-1 rounded text-xs ${listSortOrder === 'desc' ? 'bg-white dark:bg-slate-600 shadow font-bold' : 'text-slate-500 dark:text-slate-400'}`}><SortDesc size={14}/> Decr</button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Local</label>
                      <select value={listFilterLocal} onChange={(e) => setListFilterLocal(e.target.value)} className="w-full text-sm border-slate-300 dark:border-slate-600 rounded-md dark:bg-slate-700 dark:text-white">
                        <option value="">Todos</option>
                        {destinations.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-slate-50/50 dark:bg-slate-800/50">
           {filteredList.map(p => (
             <button key={p.id} onClick={() => selectProntuario(p)} className={`w-full text-left p-4 rounded-lg border transition-all group relative ${currentProntuario?.id === p.id ? 'bg-hospital-50 dark:bg-hospital-900/30 border-hospital-200 dark:border-hospital-700 shadow-sm ring-1 ring-hospital-300' : 'bg-white dark:bg-slate-700 border-slate-100 dark:border-slate-600 hover:shadow-sm'}`}>
               <div className="flex justify-between items-start mb-2">
                 <span className="font-bold text-slate-800 dark:text-slate-200 text-sm font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-500">#{p.numero_prontuario}</span>
                 <span className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1 font-mono font-medium opacity-90">
                    <Clock size={12} /> {p.ultima_movimentacao ? new Date(p.ultima_movimentacao).toLocaleString('pt-BR', {day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute:'2-digit'}) : '--/-- --:--'}
                 </span>
               </div>
               <div className="text-base text-slate-700 dark:text-slate-200 truncate font-semibold mb-3">
                  {p.nome_paciente} <span className="text-sm text-slate-500 dark:text-slate-400 font-normal ml-2 opacity-80">{p.idade} anos</span>
               </div>
               
               <div className="bg-slate-100 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-500 p-3 flex items-center justify-between text-xs">
                  <div className="text-slate-600 dark:text-slate-300 truncate max-w-[40%] text-center font-medium">{p.local_anterior || 'INICIO'}</div>
                  <MoveRight size={20} className="text-hospital-500 flex-shrink-0" />
                  <div className="text-hospital-700 dark:text-hospital-300 font-bold truncate max-w-[40%] text-center uppercase text-sm">{p.local_atual}</div>
               </div>

               <div className="flex justify-end items-center mt-3">
                 <div onClick={(e) => openCorrectionModal(p, e)} className="flex items-center gap-1 px-2 py-1 text-slate-600 hover:text-hospital-700 hover:bg-hospital-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-hospital-900 rounded cursor-pointer transition-colors text-xs font-bold border border-transparent hover:border-hospital-200 opacity-90 hover:opacity-100">
                   <Edit2 size={14} /> Editar
                 </div>
               </div>
             </button>
           ))}
        </div>
      </div>

      {/* New Prontuario Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-700 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-600">
            <div className="p-5 border-b border-slate-100 dark:border-slate-600 flex justify-between items-center bg-hospital-50 dark:bg-slate-800">
              <h3 className="font-bold text-hospital-800 dark:text-hospital-400 flex items-center gap-2 text-lg"><User size={20}/> Novo Prontuário</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={20}/></button>
            </div>
            <form onSubmit={handleCreateProntuario} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div><label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5 uppercase">Número *</label><input required type="text" className="w-full border-slate-300 dark:border-slate-500 rounded-lg p-2.5 text-sm dark:bg-slate-800 dark:text-white" value={newP.numero} onChange={e => setNewP({...newP, numero: e.target.value})} placeholder="Ex: 1004"/></div>
                <div><label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5 uppercase">Local Inicial</label><select className="w-full border-slate-300 dark:border-slate-500 rounded-lg p-2.5 text-sm bg-white dark:bg-slate-800 dark:text-white" value={newP.local} onChange={e => setNewP({...newP, local: e.target.value})}>{destinations.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
              </div>
              <div><label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5 uppercase">Nome Completo *</label><input required type="text" className="w-full border-slate-300 dark:border-slate-500 rounded-lg p-2.5 text-sm dark:bg-slate-800 dark:text-white" value={newP.nome} onChange={e => setNewP({...newP, nome: e.target.value})}/></div>
              <div className="grid grid-cols-3 gap-5">
                <div><label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5 uppercase">Idade {config.requiredFields.idade && '*'}</label><input type="number" className="w-full border-slate-300 dark:border-slate-500 rounded-lg p-2.5 text-sm dark:bg-slate-800 dark:text-white" value={newP.idade} onChange={e => handleAgeChange(e.target.value)} /></div>
                <div><label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5 uppercase">Sexo {config.requiredFields.sexo && '*'}</label><select className="w-full border-slate-300 dark:border-slate-500 rounded-lg p-2.5 text-sm bg-white dark:bg-slate-800 dark:text-white" value={newP.sexo} onChange={e => setNewP({...newP, sexo: e.target.value})}><option value="M">Masculino</option><option value="F">Feminino</option><option value="O">Outro</option></select></div>
                <div><label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5 uppercase">Nascimento {config.requiredFields.nascimento && '*'}</label><input type="date" className="w-full border-slate-300 dark:border-slate-500 rounded-lg p-2.5 text-sm dark:bg-slate-800 dark:text-white text-slate-600 dark:text-slate-300" value={newP.nascimento} onChange={e => setNewP({...newP, nascimento: e.target.value})} /></div>
              </div>
              <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5 uppercase">Situação</label>
                  <select className="w-full border-slate-300 dark:border-slate-500 rounded-lg p-2.5 text-sm bg-white dark:bg-slate-800 dark:text-white" value={newP.status} onChange={e => setNewP({...newP, status: e.target.value as any})}>
                      <option value={ProntuarioStatus.ATIVO}>Ativo</option>
                      <option value={ProntuarioStatus.DESATIVADO}>Desativado</option>
                      <option value={ProntuarioStatus.PERDIDO}>Perdido</option>
                  </select>
              </div>
              <div className="pt-4"><button type="submit" className="w-full bg-hospital-600 hover:bg-hospital-700 text-white font-bold py-3 rounded-lg text-sm">Cadastrar Prontuário</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Edit/Correction Modal */}
      {showCorrectionModal && correctionTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowCorrectionModal(false)}>
           <div className="bg-white dark:bg-slate-700 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6 border border-slate-200 dark:border-slate-600" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-lg mb-2 text-slate-800 dark:text-slate-100 flex items-center gap-2">
                 <Edit2 size={20} className="text-hospital-600"/> Editar Movimentação
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                 Ajuste para <strong>#{correctionTarget.numero_prontuario}</strong>.<br/>
              </p>
              
              <form onSubmit={handleCorrection}>
                 <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5 uppercase">Alterar Destino Atual</label>
                 <select className="w-full border-slate-300 dark:border-slate-500 rounded-lg p-2.5 text-sm bg-white dark:bg-slate-800 dark:text-white focus:ring-hospital-500 mb-3" value={correctionLocal} onChange={e => setCorrectionLocal(e.target.value)}>
                    {destinations.map(d => <option key={d} value={d}>{d}</option>)}
                 </select>

                 <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5 uppercase">Situação</label>
                 <select className="w-full border-slate-300 dark:border-slate-500 rounded-lg p-2.5 text-sm bg-white dark:bg-slate-800 dark:text-white focus:ring-hospital-500 mb-6" value={correctionStatus} onChange={e => setCorrectionStatus(e.target.value as any)}>
                    <option value={ProntuarioStatus.ATIVO}>Ativo</option>
                    <option value={ProntuarioStatus.DESATIVADO}>Desativado</option>
                    <option value={ProntuarioStatus.PERDIDO}>Perdido</option>
                 </select>

                 <div className="flex gap-3 mb-3">
                    <button type="button" onClick={() => setShowCorrectionModal(false)} className="flex-1 py-2.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-600 rounded-lg text-sm font-medium">Cancelar</button>
                    <button type="submit" className="flex-1 py-2.5 bg-hospital-600 text-white rounded-lg text-sm font-bold hover:bg-hospital-700 shadow-md">Salvar</button>
                 </div>
                 
                 <button 
                    type="button" 
                    onClick={initiateDelete} 
                    className="w-full py-2.5 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/40 rounded-lg text-sm font-medium flex items-center justify-center gap-2 border border-transparent hover:border-red-200"
                 >
                    <Trash2 size={16}/> Desfazer/Excluir Movimentação
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={() => setShowDeleteConfirm(false)}>
           <div className="bg-white dark:bg-slate-700 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6 border border-slate-200 dark:border-slate-600" onClick={e => e.stopPropagation()}>
              <div className="flex flex-col items-center text-center mb-6">
                 <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-600 dark:text-red-400 mb-4"><Trash2 size={24} /></div>
                 <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Confirmar Exclusão</h3>
                 <p className="text-sm text-slate-500 dark:text-slate-300">
                    O prontuário voltará para o local anterior e esta movimentação será apagada.
                 </p>
              </div>
              <div className="flex gap-3">
                 <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-600 rounded-lg font-medium">Cancelar</button>
                 <button onClick={confirmDeleteMovement} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold">Confirmar</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Movements;
