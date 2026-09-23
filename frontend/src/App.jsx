import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import SendMoney from './pages/SendMoney';
import Activity from './pages/Activity';
import Onboarding from './pages/Onboarding';

function ProtectedLayout({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="app-shell">
      <Navbar />
      <main className="main">{children}</main>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={!loading && user ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/signup"
        element={!loading && user ? <Navigate to="/" replace /> : <Signup />}
      />
      <Route path="/" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
      <Route path="/send" element={<ProtectedLayout><SendMoney /></ProtectedLayout>} />
      <Route path="/activity" element={<ProtectedLayout><Activity /></ProtectedLayout>} />
      <Route path="/onboarding" element={<ProtectedLayout><Onboarding /></ProtectedLayout>} />
    </Routes>
  );
}
