import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Clients from './pages/Clients';
import Inventory from './pages/Inventory';
import Finance from './pages/Finance';
import AIAssistant from './pages/AIAssistant';
import Settings from './pages/Settings';
import Login from './pages/Login';
import OrderDetail from './pages/OrderDetail';

function App() {
    const token = localStorage.getItem('token');

    return (
        <Router>
            <Routes>
                <Route path="/login" element={<Login />} />

                <Route element={<AppLayout />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/orders" element={<Orders />} />
                    <Route path="/orders/:id" element={<OrderDetail />} />
                    <Route path="/clients" element={<Clients />} />
                    <Route path="/inventory" element={<Inventory />} />
                    <Route path="/finance" element={<Finance />} />
                    <Route path="/ai-assistant" element={<AIAssistant />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/" element={<Navigate to={token ? "/dashboard" : "/login"} replace />} />
                </Route>
            </Routes>
        </Router>
    );
}

export default App;
