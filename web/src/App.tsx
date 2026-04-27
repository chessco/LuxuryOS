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
import Integrations from './pages/Integrations';
import Sidebar from './components/Sidebar';
import { ThemeProvider } from './context/ThemeContext';

const RoleRedirect = ({ children, allowedRoles, redirectTo }: { children: React.ReactNode, allowedRoles: string[], redirectTo: string }) => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role && !allowedRoles.includes(user.role)) {
        return <Navigate to={redirectTo} replace />;
    }
    return <>{children}</>;
};

function App() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const defaultRoute = user.role === 'VENDEDOR' ? "/orders" : "/dashboard";

    return (
        <ThemeProvider>
            <Router>
                <Routes>
                    <Route path="/login" element={<Login />} />

                    <Route element={<AppLayout />}>
                        <Route path="/dashboard" element={
                            <RoleRedirect allowedRoles={['TENANT_ADMIN', 'SYSTEM_ADMIN', 'TENANT_USER']} redirectTo="/orders">
                                <Dashboard />
                            </RoleRedirect>
                        } />
                        <Route path="/orders" element={<Orders />} />
                        <Route path="/orders/:id" element={<OrderDetail />} />
                        <Route path="/clients" element={<Clients />} />
                        <Route path="/inventory" element={<Inventory />} />
                        <Route path="/finance" element={
                            <RoleRedirect allowedRoles={['TENANT_ADMIN', 'SYSTEM_ADMIN']} redirectTo="/orders">
                                <Finance />
                            </RoleRedirect>
                        } />
                        <Route path="/ai-assistant" element={
                            <RoleRedirect allowedRoles={['TENANT_ADMIN', 'SYSTEM_ADMIN', 'TENANT_USER']} redirectTo="/orders">
                                <AIAssistant />
                            </RoleRedirect>
                        } />
                        <Route path="/settings" element={
                            <RoleRedirect allowedRoles={['TENANT_ADMIN', 'SYSTEM_ADMIN']} redirectTo="/orders">
                                <Settings />
                            </RoleRedirect>
                        } />
                        <Route path="/settings/users" element={
                            <RoleRedirect allowedRoles={['TENANT_ADMIN', 'SYSTEM_ADMIN']} redirectTo="/orders">
                                <Users />
                            </RoleRedirect>
                        } />
                        <Route path="/settings/queue" element={
                            <RoleRedirect allowedRoles={['TENANT_ADMIN', 'SYSTEM_ADMIN']} redirectTo="/orders">
                                <QueueSettings />
                            </RoleRedirect>
                        } />
                        <Route path="/settings/integrations" element={
                            <RoleRedirect allowedRoles={['TENANT_ADMIN', 'SYSTEM_ADMIN']} redirectTo="/orders">
                                <Integrations />
                            </RoleRedirect>
                        } />
                        <Route path="/messages" element={
                            <RoleRedirect allowedRoles={['TENANT_ADMIN', 'SYSTEM_ADMIN', 'TENANT_USER']} redirectTo="/orders">
                                <Messages />
                            </RoleRedirect>
                        } />
                        <Route path="/screen" element={<PublicScreen />} />
                        <Route path="/staff/queue" element={
                            <RoleRedirect allowedRoles={['TENANT_ADMIN', 'SYSTEM_ADMIN', 'TENANT_USER', 'VENDEDOR']} redirectTo="/orders">
                                <StaffQueue />
                            </RoleRedirect>
                        } />
                        <Route path="/pickup" element={<Pickup />} />
                        <Route path="/" element={<Navigate to={token ? defaultRoute : "/login"} replace />} />
                    </Route>
                    <Route path="/kiosk" element={<Kiosk />} />
                </Routes>
            </Router>
        </ThemeProvider>
    );
}

export default App;
