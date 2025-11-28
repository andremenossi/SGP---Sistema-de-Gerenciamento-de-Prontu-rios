import React, { useEffect, useState } from 'react';
import { db } from '../services/database';
import { Prontuario, Movimentacao, ProntuarioStatus } from '../types';
import { FolderOpen, Archive, Activity, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    dead: 0,
    movementsToday: 0
  });
  const [locationData, setLocationData] = useState<any[]>([]);

  useEffect(() => {
    const prontuarios = db.getProntuarios();
    const movements = db.getMovimentacoes();
    
    // Calculate basic stats
    const today = new Date().toISOString().split('T')[0];
    const todayMovs = movements.filter(m => m.data_hora.startsWith(today)).length;

    setStats({
      total: prontuarios.length,
      active: prontuarios.filter(p => p.status === ProntuarioStatus.ATIVO).length,
      dead: prontuarios.filter(p => p.local_atual === 'Arquivo Morto').length,
      movementsToday: todayMovs
    });

    // Calculate location distribution
    const locMap = prontuarios.reduce((acc, curr) => {
      acc[curr.local_atual] = (acc[curr.local_atual] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const locData = Object.entries(locMap).map(([name, value]) => ({ name, value }));
    setLocationData(locData);

  }, []);

  const COLORS = ['#0284c7', '#38bdf8', '#94a3b8', '#64748b', '#0ea5e9'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-hospital-100 rounded-lg text-hospital-600">
            <FolderOpen size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Prontuários Totais</p>
            <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-green-100 rounded-lg text-green-600">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Ativos</p>
            <p className="text-2xl font-bold text-slate-800">{stats.active}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-slate-100 rounded-lg text-slate-600">
            <Archive size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Arquivo Morto</p>
            <p className="text-2xl font-bold text-slate-800">{stats.dead}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-orange-100 rounded-lg text-orange-600">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Movimentações Hoje</p>
            <p className="text-2xl font-bold text-slate-800">{stats.movementsToday}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Charts */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Distribuição por Local</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={locationData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{fontSize: 12}} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Status dos Prontuários</h3>
          <div className="h-64 flex justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Ativos', value: stats.active },
                    { name: 'Arquivo Morto', value: stats.dead },
                    { name: 'Desativados', value: Math.max(0, stats.total - stats.active - stats.dead) }
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {locationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;