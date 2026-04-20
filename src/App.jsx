import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Header from './components/Header';
import Login from './pages/Login';
import AccessRequest from './pages/AccessRequest';
import Lobby from './pages/Lobby';
import Game from './pages/Game';
import PrizeTable from './pages/PrizeTable';
import Admin from './pages/Admin';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) return (
    <div className="loader-container">
      <div className="spinner"></div>
    </div>
  );

  if (!user) return <Navigate to="/" state={{ from: location }} replace />;
  
  if (role === null && location.pathname !== '/request-access') {
    return <Navigate to="/request-access" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/lobby" replace />;
  }

  return children;
};

const Layout = ({ children }) => (
  <>
    <Header />
    <main className="container animate-slide-up" style={{ padding: '32px 24px', flex: 1 }}>
      {children}
    </main>
  </>
);

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route 
        path="/request-access" 
        element={
          <ProtectedRoute>
            <Layout><AccessRequest /></Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/lobby" 
        element={
          <ProtectedRoute allowedRoles={['player', 'admin', 'super_admin']}>
            <Layout><Lobby /></Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/game/:gameId" 
        element={
          <ProtectedRoute allowedRoles={['player', 'admin', 'super_admin']}>
            <Layout><Game /></Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/results/:gameId" 
        element={
          <ProtectedRoute allowedRoles={['player', 'admin', 'super_admin']}>
            <Layout><PrizeTable /></Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin" 
        element={
          <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
            <Layout><Admin /></Layout>
          </ProtectedRoute>
        } 
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
