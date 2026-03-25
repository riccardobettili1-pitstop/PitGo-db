import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import BookingPWA from './pages/BookingPWA';
import Calendar from './pages/Calendar';
import StaffManager from './pages/StaffManager';
import Finances from './pages/Finances';
import './index.css';

// Componente di protezione route
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <div>Caricamento...</div>;
  if (!user) return <Navigate to="/auth" />;

  return children;
};

// Se utente è già loggato e va su /auth, portalo alla dashboard
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <div>Caricamento...</div>;
  if (user) return <Navigate to="/dashboard" />;

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Rotta PWA Pubblica per i Clienti */}
      <Route path="/prenota/:codiceUrl" element={<BookingPWA />} />

      <Route path="/auth" element={
        <PublicRoute>
          <Auth />
        </PublicRoute>
      } />

      <Route path="/" element={<Navigate to="/dashboard" />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/calendario" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
      <Route path="/staff" element={<ProtectedRoute><StaffManager /></ProtectedRoute>} />
      <Route path="/finanze" element={<ProtectedRoute><Finances /></ProtectedRoute>} />

      {/* Route di default */}
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;