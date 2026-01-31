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
import QueueSettings from './pages/QueueSettings';
import OrderDetail from './pages/OrderDetail';
import Users from './pages/Users';
import Messages from './pages/Messages';
import Kiosk from './pages/Kiosk';
import PublicScreen from './pages/PublicScreen';
import StaffQueue from './pages/StaffQueue';
import Pickup from './pages/Pickup';
import Sidebar from './components/Sidebar';
import { ThemeProvider } from './context/ThemeContext';

function App() {
    const token = localStorage.getItem('token');

    return (
        <ThemeProvider>
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
                        <Route path="/settings/users" element={<Users />} />
                        <Route path="/settings/queue" element={<QueueSettings />} />
                        <Route path="/messages" element={<Messages />} />
                        <Route path="/screen" element={<PublicScreen />} />
                        <Route path="/staff/queue" element={<StaffQueue />} />
                        <Route path="/pickup" element={<Pickup />} />
                        <Route path="/" element={<Navigate to={token ? "/dashboard" : "/login"} replace />} />
                    </Route>
                    <Route path="/kiosk" element={<Kiosk />} />
                </Routes>
            </Router>
        </ThemeProvider>
    );
}

export default App;
