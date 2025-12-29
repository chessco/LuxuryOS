
import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Inventory from './pages/Inventory';
import InventoryDetail from './pages/InventoryDetail';
import Finance from './pages/Finance';
import Settings from './pages/Settings';
import TransactionDetail from './pages/TransactionDetail';
import AIAssistant from './pages/AIAssistant';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <div className="flex h-screen w-full overflow-hidden">
        <Sidebar onLogout={handleLogout} />
        <div className="flex flex-1 flex-col h-full overflow-hidden bg-background-light dark:bg-background-dark">
          <Header />
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/ai-assistant" element={<AIAssistant />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/clients/:id" element={<ClientDetail />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/orders/:id" element={<OrderDetail />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/inventory/:id" element={<InventoryDetail />} />
              <Route path="/finance" element={<Finance />} />
              <Route path="/transactions/:id" element={<TransactionDetail />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
};

export default App;
