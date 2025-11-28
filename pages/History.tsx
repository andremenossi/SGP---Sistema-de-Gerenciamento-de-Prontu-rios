import React, { useState, useMemo } from 'react';
import { db } from '../services/database';
import { Movimentacao } from '../types';
import { Download, Filter, Calendar, ArrowUp, ArrowDown } from 'lucide-react';
import * as XLSX from 'xlsx';

type SortKey = keyof Movimentacao;

const History: React.FC = () => {
  const [filterText, setFilterText] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'data_hora', direction: 'desc' });
  
  const history = db.getMovimentacoes();

  const handleSort = (key: SortKey) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortedData = useMemo(() => {
    let sorted = [...history];
    sorted.sort((a, b) => {
      let valA = a[sortConfig.key] || '';
      let valB = b[sortConfig.key] || '';
      
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [history, sortConfig]);

  const filteredData = useMemo(() => {
    return sortedData.filter(item => {
      const matchesText = 
        item.nome_paciente.toLowerCase().includes(filterText.toLowerCase()) ||
        item.numero_prontuario.includes(filterText) ||
        item.destino.toLowerCase().includes(filterText.toLowerCase()) ||
        item.usuario_responsavel.toLowerCase().includes(filterText.toLowerCase());
      
      const matchesDate = dateFilter ? item.data_hora.startsWith(dateFilter) : true;

      return matchesText && matchesDate;
    });
  }, [sortedData, filterText, dateFilter]);

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Histórico");
    XLSX.writeFile(wb, "SGP_Historico_Movimentacoes.xlsx");
  };

  const SortIcon = ({ colKey }: { colKey: SortKey }) => {
    if (sortConfig.key !== colKey) return <span className="w-4 inline-block"></span>;
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  const Header = ({ label, colKey }: { label: string, colKey: SortKey }) => (
    <th 
      className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors select-none group border-b border-slate-200 dark:border-slate-700"
      onClick={() => handleSort(colKey)}
    >
      <div className="flex items-center gap-2">
        {label}
        <span className="text-slate-400 group-hover:text-hospital-600">
          <SortIcon colKey={colKey} />
        </span>
      </div>
    </th>
  );

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
        <div className="flex flex-col md:flex-row gap-4 flex-1 w-full">
          <div className="relative flex-1">
             <Filter className="absolute left-3 top-2.5 text-slate-400" size={18} />
             <input
                type="text"
                placeholder="Filtrar por nome, prontuário, destino..."
                className="pl-10 pr-4 py-2 w-full border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-hospital-500 outline-none dark:bg-slate-900 dark:text-white"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
             />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-2.5 text-slate-400" size={18} />
             <input
                type="date"
                className="pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-hospital-500 outline-none dark:bg-slate-900 dark:text-white text-slate-600 dark:text-slate-300"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
             />
          </div>
        </div>
        
        <button 
          onClick={exportToExcel}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
        >
          <Download size={18} />
          Exportar Excel
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-900 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">
              <tr>
                <Header label="Data/Hora" colKey="data_hora" />
                <Header label="Prontuário" colKey="numero_prontuario" />
                <Header label="Paciente" colKey="nome_paciente" />
                <Header label="Idade" colKey="idade" />
                <Header label="Origem" colKey="origem" />
                <Header label="Destino" colKey="destino" />
                <Header label="Usuário" colKey="usuario_responsavel" />
                <Header label="Observação" colKey="observacao" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredData.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {new Date(item.data_hora).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                    {item.numero_prontuario}
                  </td>
                  <td className="px-6 py-4">
                    {item.nome_paciente}
                  </td>
                   <td className="px-6 py-4">
                    {item.idade}
                  </td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{item.origem}</td>
                  <td className="px-6 py-4 text-hospital-700 dark:text-hospital-400 font-medium flex items-center gap-1">
                    {item.destino}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs">
                      {item.usuario_responsavel}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs italic text-slate-500 dark:text-slate-400">
                    {item.observacao || '-'}
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500">
                    Nenhum registro encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default History;