import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Layout from './components/Layout';
import { RequireAuth, RequireAdmin } from './components/RouteGuards';
import Home from './pages/Home';
import ProductDetail from './pages/ProductDetail';
import Login from './pages/Login';
import CompleteProfile from './pages/CompleteProfile';
import VendorDashboard from './pages/VendorDashboard';
import AdminPortal from './pages/AdminPortal';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/login" element={<Login />} />
              <Route path="/complete-profile" element={<RequireAuth><CompleteProfile /></RequireAuth>} />
              <Route path="/dashboard" element={<RequireAuth><VendorDashboard /></RequireAuth>} />
              <Route path="/admin" element={<RequireAdmin><AdminPortal /></RequireAdmin>} />
              <Route path="*" element={<Home />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
