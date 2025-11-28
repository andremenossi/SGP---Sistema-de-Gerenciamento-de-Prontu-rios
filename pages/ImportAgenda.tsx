
import React, { useState, useEffect } from 'react';
import { AgendaItem, ProntuarioStatus, AgendaHistory } from '../types';
import { db } from '../services/database';
import { Upload, FileSpreadsheet, Check, AlertTriangle, AlertCircle, Calendar, Trash2, Eye, X, MoveRight } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ImportAgendaProps {
  userLogin: string;
}

const ImportAgenda: React.FC<ImportAgendaProps> = ({ userLogin }) => {
  // Step 1: Upload
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1=Upload, 2=Review, 3=HistoryView
  
  // Metadata for the Agenda being imported
  const [agendaDate, setAgendaDate] = useState(new Date().toISOString().split('T')[0]);
  const [agendaDoctor, setAgendaDoctor] = useState('');
  const [agendaSpecialty, setAgendaSpecialty] = useState('');

  // Conflict Handling
  const [conflictItems, setConflictItems] = useState<AgendaItem[]>([]);
  const [showConflictModal, setShowConflictModal] = useState(false);

  // History
  const [historyList, setHistoryList] = useState<AgendaHistory[]>([]);
  const [viewingHistory, setViewingHistory] = useState<AgendaHistory | null>(null);

  useEffect(() => {
    refreshHistory();
  }, []);

  const refreshHistory = () => {
    const all = db.getAgendaHistory();
    setHistoryList(all.sort((a, b) => new Date(b.data_importacao).getTime() - new Date(a.data_importacao).getTime()));
  };

  // Handle Excel File Upload with Robust Parsing
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const arrayBuffer = evt.target?.result;
      
      try {
        const wb = XLSX.read(arrayBuffer, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        // CRITICAL: raw: false forces Excel to return formatted strings (e.g. "07:00") instead of decimals (0.29)
        // defval: '' ensures we get empty strings instead of null/undefined for empty cells
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' }) as string[][];

        let detectedDoc = '';
        let detectedSpec = '';
        let detectedDate = '';
        
        const parsedItems: AgendaItem[] = [];

        // Regex Helpers
        // Time: Accepts 07:00, 7:00, 07:00:00
        const timeRegex = /^\d{1,2}:\d{2}(:\d{2})?$/; 
        const dateRegex = /(\d{2}[-/]\d{2}[-/]\d{2,4})/;
        // Prontuario: Handles Prontuário, Prontuario, Codigo, Matricula with optional accents and separators
        const prontuarioRegex = /(?:PRONTU[ÁA]RIO|PRONT|C[ÓO]DIGO|MATR[ÍI]CULA)\s*[:.]?\s*(\d+)/i;

        for (let i = 0; i < rows.length; i++) {
            const rowRaw = rows[i];
            const rowStr = rowRaw.join(' ').toUpperCase(); 

            // --- 1. Metadata Detection ---
            if (!detectedDoc && (rowStr.includes('PROFISSIONAL') || rowStr.includes('MEDICO') || rowStr.includes('DR.'))) {
                const match = rowStr.match(/(?:PROFISSIONAL|MEDICO|DR\.|DOUTOR)[\s:.-]*(.*)/i);
                if (match && match[1]) detectedDoc = match[1].split(/[|-]/)[0].trim();
            }

            if (!detectedSpec && (rowStr.includes('ESPECIALIDADE'))) {
                const match = rowStr.match(/ESPECIALIDADE[\s:.-]*(.*)/i);
                if (match && match[1]) detectedSpec = match[1].trim();
            }

            if (!detectedDate && (rowStr.includes('DATA') || rowStr.includes('DIA:'))) {
                const match = rowStr.match(dateRegex);
                if (match) {
                    // Convert DD/MM/YYYY to YYYY-MM-DD
                    const parts = match[1].replace(/-/g, '/').split('/');
                    if (parts.length === 3) detectedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
                }
            }

            // --- 2. Patient Data Detection ---
            // Skip header rows
            if (rowStr.includes('HORÁRIO') && rowStr.includes('PACIENTE')) continue;

            // Strategy: Look for a Time Pattern in the first few columns
            let timeIdx = -1;
            for(let c=0; c<6; c++) { // Check first 6 columns
               if (rowRaw[c] && typeof rowRaw[c] === 'string' && timeRegex.test(rowRaw[c].trim())) {
                   timeIdx = c;
                   break;
               }
            }

            if (timeIdx !== -1) {
                // Found a time, likely a patient row
                const horario = rowRaw[timeIdx].trim();
                
                // Name is usually to the right of time
                let nome = '';
                // Heuristic: Look for long string not containing only numbers
                for(let c=timeIdx+1; c<rowRaw.length; c++) {
                    const val = rowRaw[c];
                    if (val && val.length > 5 && isNaN(Number(val))) {
                        // Avoid capturing "Agendamento" or statuses
                        if (!val.toUpperCase().includes('AGENDAMENTO') && !val.toUpperCase().includes('RETORNO')) {
                             nome = val.trim();
                             break;
                        }
                    }
                }

                if (nome) {
                    // Extract Age (Look for "anos", "meses", "dias")
                    let idade = 0;
                    const ageMatch = rowStr.match(/(\d+)\s*(ANOS?|MESES?|DIAS?)/);
                    if (ageMatch) {
                        if (ageMatch[2].startsWith('ANO')) idade = parseInt(ageMatch[1]);
                        else idade = 0; // Days/Months = 0 years
                    }

                    // Extract Prontuario
                    let prontuario = '';
                    
                    // 1. Check Current Row
                    const pMatchRow = rowStr.match(prontuarioRegex);
                    if (pMatchRow) prontuario = pMatchRow[1];

                    // 2. Check Next Row (Common in reports where data wraps)
                    if (!prontuario && i + 1 < rows.length) {
                        const nextRowStr = rows[i+1].join(' ').toUpperCase();
                        const pMatchNext = nextRowStr.match(prontuarioRegex);
                        if (pMatchNext) prontuario = pMatchNext[1];
                    }

                    // 3. Check Next Next Row (Rare but possible)
                    if (!prontuario && i + 2 < rows.length) {
                        const nextNextRowStr = rows[i+2].join(' ').toUpperCase();
                        const pMatchNextNext = nextNextRowStr.match(prontuarioRegex);
                        if (pMatchNextNext) prontuario = pMatchNextNext[1];
                    }
                    
                    if (prontuario) {
                        parsedItems.push({
                            id: crypto.randomUUID(),
                            numero_prontuario: prontuario,
                            nome_paciente: nome,
                            idade: idade,
                            horario: horario,
                            medico: detectedDoc,
                            especialidade: detectedSpec,
                            selecionado: true,
                            statusProcessamento: 'pendente'
                        });
                    }
                }
            }
        }

        if (detectedDoc) setAgendaDoctor(detectedDoc);
        if (detectedSpec) setAgendaSpecialty(detectedSpec);
        if (detectedDate) setAgendaDate(detectedDate);

        if (parsedItems.length === 0) {
            alert(`O sistema leu ${rows.length} linhas mas não identificou pacientes.\n\nDicas:\n1. Certifique-se que há uma coluna com horário (ex: 07:00).\n2. O campo Prontuário deve estar visível (mesmo que na linha de baixo).`);
            return;
        }

        setItems(parsedItems);
        setStep(2);

      } catch (error) {
        console.error(error);
        alert("Erro ao ler o arquivo. Se o arquivo estiver corrompido ou em formato antigo (.xls), abra-o no Excel e Salve Como pasta de trabalho (.xlsx) antes de importar.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const toggleSelection = (id: string) => {
    setItems(items.map(i => i.id === id ? { ...i, selecionado: !i.selecionado } : i));
  };

  const initiateProcessing = () => {
    const selected = items.filter(i => i.selecionado);
    if (selected.length === 0) {
        alert("Selecione pelo menos um paciente.");
        return;
    }

    const conflicts: AgendaItem[] = [];

    selected.forEach(item => {
        const existing = db.getProntuarioByNumber(item.numero_prontuario);
        if (existing) {
            // Conflict logic: User is NOT in 'Arquivo'
            if (existing.local_atual !== 'Arquivo') {
                conflicts.push(item);
            }
        }
    });

    if (conflicts.length > 0) {
        setConflictItems(conflicts);
        setShowConflictModal(true);
    } else {
        executeMovements(selected);
    }
  };

  const confirmConflicts = () => {
    setShowConflictModal(false);
    executeMovements(items.filter(i => i.selecionado));
  };

  const executeMovements = (toProcess: AgendaItem[]) => {
    let movedCount = 0;
    let createdCount = 0;

    const processedItems = toProcess.map(item => {
        let p = db.getProntuarioByNumber(item.numero_prontuario);
        let status: 'movido' | 'criado_e_movido' | 'erro' = 'movido';

        // 1. Create if doesn't exist
        if (!p) {
            try {
                db.addProntuario({
                    numero_prontuario: item.numero_prontuario,
                    nome_paciente: item.nome_paciente,
                    idade: item.idade || 0,
                    sexo: 'O', // Default unknown
                    data_nascimento: 'Não Informado', 
                    status: ProntuarioStatus.ATIVO,
                    local_atual: 'Arquivo'
                });
                p = db.getProntuarioByNumber(item.numero_prontuario);
                createdCount++;
                status = 'criado_e_movido';
            } catch (e) {
                console.error(e);
                status = 'erro';
            }
        }

        // 2. Move (Arquivo -> Ambulatório)
        if (p) {
             db.addMovimentacao({
                numero_prontuario: p.numero_prontuario,
                nome_paciente: p.nome_paciente,
                idade: p.idade,
                origem: p.local_atual, 
                destino: 'Ambulatório',
                usuario_responsavel: userLogin,
                observacao: `Importação de Agenda (${agendaDate})`
            });
            movedCount++;
        }

        return { ...item, statusProcessamento: status };
    });

    // Save History
    const historyEntry: AgendaHistory = {
        id: crypto.randomUUID(),
        data_importacao: new Date().toISOString(),
        usuario: userLogin,
        nome_medico: agendaDoctor || toProcess[0]?.medico || 'Vários',
        especialidade: agendaSpecialty || toProcess[0]?.especialidade || 'Geral',
        total_pacientes: toProcess.length,
        items: processedItems
    };
    db.addAgendaHistory(historyEntry);

    alert(`Processamento Concluído!\n${createdCount} Novos Prontuários Criados.\n${movedCount} Movimentações Realizadas.`);
    setItems([]);
    setStep(1);
    refreshHistory();
  };

  const handleDeleteHistory = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      // Using visual modal instead of window.confirm could be better, but sticking to logic
      // Adding robust delete check
      if (window.confirm('Tem certeza que deseja excluir este histórico?')) {
          db.deleteAgendaHistory(id);
          refreshHistory();
          if (viewingHistory?.id === id) setViewingHistory(null);
      }
  };

  const openHistoryDetails = (h: AgendaHistory) => {
      setViewingHistory(h);
      setStep(3);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      
      {/* STEP 1: UPLOAD */}
      {step === 1 && (
        <div className="space-y-8">
            <div className="bg-white dark:bg-slate-700 p-10 rounded-xl shadow-sm border border-slate-200 dark:border-slate-600 flex flex-col items-center justify-center text-center">
                <div className="p-4 bg-hospital-100 dark:bg-hospital-900/30 text-hospital-600 dark:text-hospital-400 rounded-full mb-4">
                <FileSpreadsheet size={48} />
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Importar Agenda Diária (Excel)</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 max-w-md">
                   Carregue um arquivo .xlsx ou .csv. O sistema identificará automaticamente Horários, Pacientes e Prontuários (Linha principal ou linha de detalhe).
                </p>
                <label className="bg-hospital-600 hover:bg-hospital-700 text-white px-8 py-4 rounded-xl cursor-pointer transition-transform hover:-translate-y-1 shadow-lg font-bold flex items-center gap-3">
                    <Upload size={20} />
                    Selecionar Arquivo
                <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} />
                </label>
            </div>

            {/* History Cards */}
            <div>
                <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2"><Calendar size={20}/> Agendas Importadas (Hoje/Recentes)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {historyList.map(h => (
                        <div key={h.id} onClick={() => openHistoryDetails(h)} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-600 hover:border-hospital-400 dark:hover:border-hospital-500 cursor-pointer transition-all shadow-sm hover:shadow-md group relative">
                             <div className="flex justify-between items-start mb-3">
                                 <div>
                                     <h4 className="font-bold text-slate-800 dark:text-slate-100 truncate w-48" title={h.nome_medico}>{h.nome_medico || 'Médico N/A'}</h4>
                                     <span className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate block">{h.especialidade}</span>
                                 </div>
                                 <div className="text-right">
                                     <span className="text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded">{new Date(h.data_importacao).toLocaleDateString()}</span>
                                 </div>
                             </div>
                             <div className="flex items-center justify-between text-sm">
                                 <span className="text-slate-600 dark:text-slate-300 font-medium">{h.total_pacientes} Pacientes</span>
                                 <button onClick={(e) => handleDeleteHistory(h.id, e)} className="text-slate-400 hover:text-red-500 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors z-10"><Trash2 size={16}/></button>
                             </div>
                        </div>
                    ))}
                    {historyList.length === 0 && (
                        <p className="text-slate-400 text-sm col-span-3 text-center py-8">Nenhuma importação realizada.</p>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* STEP 2: REVIEW */}
      {step === 2 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-600 overflow-hidden flex flex-col h-[calc(100vh-140px)]">
          {/* Header Controls */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 grid grid-cols-1 md:grid-cols-3 gap-4">
             <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Data da Agenda</label>
                <input type="date" value={agendaDate} onChange={e => setAgendaDate(e.target.value)} className="w-full border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm dark:bg-slate-800 dark:text-white" />
             </div>
             <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Nome do Doutor(a)</label>
                <input type="text" value={agendaDoctor} onChange={e => setAgendaDoctor(e.target.value)} placeholder="Ex: Dr. Silva" className="w-full border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm dark:bg-slate-800 dark:text-white" />
             </div>
             <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Especialidade</label>
                <input type="text" value={agendaSpecialty} onChange={e => setAgendaSpecialty(e.target.value)} placeholder="Ex: Cardiologia" className="w-full border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm dark:bg-slate-800 dark:text-white" />
             </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-900/50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-600 overflow-hidden">
                <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 uppercase font-bold text-xs sticky top-0 z-10 shadow-sm">
                    <tr>
                    <th className="px-6 py-3 w-10 bg-slate-50 dark:bg-slate-900">
                        <input type="checkbox" onChange={(e) => setItems(items.map(i => ({...i, selecionado: e.target.checked})))} checked={items.length > 0 && items.every(i => i.selecionado)} />
                    </th>
                    <th className="px-6 py-3 bg-slate-50 dark:bg-slate-900">Horário</th>
                    <th className="px-6 py-3 bg-slate-50 dark:bg-slate-900">Prontuário</th>
                    <th className="px-6 py-3 bg-slate-50 dark:bg-slate-900">Paciente</th>
                    <th className="px-6 py-3 bg-slate-50 dark:bg-slate-900">Médico / Esp.</th>
                    <th className="px-6 py-3 bg-slate-50 dark:bg-slate-900">Situação no Sistema</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {items.map(item => {
                    const existing = db.getProntuarioByNumber(item.numero_prontuario);
                    return (
                        <tr key={item.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${item.selecionado ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                        <td className="px-6 py-4">
                            <input type="checkbox" checked={item.selecionado} onChange={() => toggleSelection(item.id)} className="rounded text-hospital-600 focus:ring-hospital-500" />
                        </td>
                        <td className="px-6 py-4 font-mono text-slate-500 dark:text-slate-400 font-medium">{item.horario}</td>
                        <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{item.numero_prontuario}</td>
                        <td className="px-6 py-4">
                            <div className="font-medium text-slate-900 dark:text-white">{item.nome_paciente}</div>
                            <span className="text-xs text-slate-400">({item.idade || 0} anos)</span>
                        </td>
                        <td className="px-6 py-4">
                            <div className="text-slate-700 dark:text-slate-300">{item.medico || agendaDoctor || '-'}</div>
                            <div className="text-xs text-slate-400">{item.especialidade || agendaSpecialty || '-'}</div>
                        </td>
                        <td className="px-6 py-4">
                            {existing ? (
                            <div className="flex flex-col gap-1">
                                <span className={`inline-flex items-center gap-1 w-fit px-2 py-0.5 rounded text-xs font-bold uppercase ${existing.local_atual === 'Arquivo' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                                    {existing.local_atual === 'Arquivo' ? <Check size={10}/> : <AlertTriangle size={10}/>}
                                    {existing.local_atual}
                                </span>
                                {existing.status !== 'Ativo' && <span className="text-xs text-red-500 font-bold">({existing.status})</span>}
                            </div>
                            ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 rounded text-xs font-bold uppercase">
                                <AlertCircle size={10}/> Novo Cadastro
                            </span>
                            )}
                        </td>
                        </tr>
                    );
                    })}
                </tbody>
                </table>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 flex justify-end gap-3 z-20 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
               <button onClick={() => setStep(1)} className="px-6 py-3 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 rounded-xl font-medium transition-colors">Cancelar Revisão</button>
               
               <div className="flex items-center gap-4">
                   <div className="hidden md:flex items-center gap-2 text-xs font-bold uppercase text-slate-400 bg-slate-50 dark:bg-slate-900 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 opacity-60">
                       <span className="text-slate-500 dark:text-slate-400">Arquivo</span>
                       <MoveRight size={14} />
                       <span className="text-hospital-600 dark:text-hospital-400">Ambulatório</span>
                   </div>
                   <button 
                     onClick={initiateProcessing}
                     className="px-6 py-3 bg-hospital-600 hover:bg-hospital-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg hover:shadow-xl transform active:scale-95 transition-all"
                   >
                     Fazer Movimentações
                   </button>
               </div>
          </div>
        </div>
      )}

      {/* STEP 3: VIEW HISTORY DETAIL */}
      {step === 3 && viewingHistory && (
         <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-600 overflow-hidden h-[calc(100vh-140px)] flex flex-col">
            <div className="p-6 border-b border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">{viewingHistory.nome_medico}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Importado em {new Date(viewingHistory.data_importacao).toLocaleString()} por {viewingHistory.usuario}</p>
                </div>
                <button onClick={() => {setStep(1); setViewingHistory(null)}} className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 p-2 rounded-full"><X size={20}/></button>
            </div>
            <div className="flex-1 overflow-auto p-6">
                <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                    <thead className="border-b border-slate-200 dark:border-slate-700">
                        <tr>
                            <th className="py-2">Prontuário</th>
                            <th className="py-2">Paciente</th>
                            <th className="py-2">Horário</th>
                            <th className="py-2">Resultado</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {viewingHistory.items.map(item => (
                            <tr key={item.id}>
                                <td className="py-3 font-bold">{item.numero_prontuario}</td>
                                <td className="py-3">{item.nome_paciente}</td>
                                <td className="py-3">{item.horario}</td>
                                <td className="py-3">
                                    {item.statusProcessamento === 'criado_e_movido' && <span className="text-green-600 font-bold text-xs">Criado & Movido</span>}
                                    {item.statusProcessamento === 'movido' && <span className="text-blue-600 font-bold text-xs">Movido</span>}
                                    {item.statusProcessamento === 'erro' && <span className="text-red-600 font-bold text-xs">Erro</span>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
         </div>
      )}

      {/* CONFLICT MODAL */}
      {showConflictModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowConflictModal(false)}>
           <div className="bg-white dark:bg-slate-700 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-slate-200 dark:border-slate-600 bg-red-50 dark:bg-red-900/20">
                  <h3 className="text-lg font-bold text-red-700 dark:text-red-300 flex items-center gap-2">
                     <AlertTriangle size={24}/> Conflitos Detectados
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
                      Os seguintes prontuários <strong>não estão no Arquivo</strong>. 
                      Deseja forçar a movimentação deles para o Ambulatório mesmo assim?
                  </p>
              </div>
              <div className="flex-1 overflow-auto p-4">
                  <table className="w-full text-left text-sm">
                     <tbody className="divide-y divide-slate-100 dark:divide-slate-600">
                         {conflictItems.map(item => {
                             const p = db.getProntuarioByNumber(item.numero_prontuario);
                             return (
                                 <tr key={item.id}>
                                     <td className="py-3 font-bold text-slate-800 dark:text-slate-200">#{item.numero_prontuario}</td>
                                     <td className="py-3 text-slate-700 dark:text-slate-300">{item.nome_paciente}</td>
                                     <td className="py-3 text-red-600 dark:text-red-400 font-bold text-right uppercase text-xs">
                                         Está em: {p?.local_atual || 'Desconhecido'}
                                     </td>
                                 </tr>
                             )
                         })}
                     </tbody>
                  </table>
              </div>
              <div className="p-6 border-t border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 flex justify-end gap-3">
                  <button onClick={() => setShowConflictModal(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors">Cancelar</button>
                  <button onClick={confirmConflicts} className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-md">Sim, Mover Mesmo Assim</button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default ImportAgenda;
