import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Movements from './pages/Movements';
import Search from './pages/Search';
import History from './pages/History';
import ImportAgenda from './pages/ImportAgenda';
import UsersPage from './pages/Users';
import Settings from './pages/Settings';
import Login from './pages/Login';
import { User, UserType } from './types';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check session
    const stored = localStorage.getItem('sgp_session');
    if (stored) {
      setUser(JSON.parse(stored));
    }
    setLoading(false);
  }, []);

  const handleLogin = (u: User) => {
    setUser(u);
    localStorage.setItem('sgp_session', JSON.stringify(u));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('sgp_session');
  };

  if (loading) return null;

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <HashRouter>
      <Layout user={user} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/movements" element={<Movements userLogin={user.login} />} />
          <Route path="/search" element={<Search />} />
          <Route path="/history" element={<History />} />
          <Route path="/import" element={<ImportAgenda userLogin={user.login} />} />
          <Route path="/settings" element={<Settings />} />
          <Route 
            path="/users" 
            element={user.tipo === UserType.ADMIN ? <UsersPage /> : <Navigate to="/" />} 
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}

export default App;
