import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, LayoutDashboard, Shield } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function Header() {
  const { user, role, config, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (!user) return null;

  return (
    <header className="app-header animate-fade-in">
      <div className="container flex items-center justify-between">
        <Link to="/lobby" className="app-logo">
          {config?.logoUrl ? (
            <img src={config.logoUrl} alt="Logo" />
          ) : (
            <div className="flex items-center gap-2">
              <div style={{ width: 32, height: 32, background: 'var(--color-primary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: 'white', fontWeight: 800 }}>S</span>
              </div>
              Splash Tech
            </div>
          )}
        </Link>
        
        <div className="flex items-center gap-6">
          <nav className="flex gap-4">
            <Link to="/lobby" className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--color-text)' }}>
              <LayoutDashboard size={18} />
              Lobby
            </Link>
            {(role === 'admin' || role === 'super_admin') && (
              <Link to="/admin" className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--color-warning)' }}>
                <Shield size={18} />
                Admin Panel
              </Link>
            )}
          </nav>
          
          <div className="flex items-center gap-4 border-l border-[var(--color-border)] pl-6">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-bold">{user.displayName}</div>
              <div className="text-xs text-[var(--color-text-muted)] capitalize">{role?.replace('_', ' ')}</div>
            </div>
            {user.photoURL ? (
              <img src={user.photoURL} alt="Avatar" style={{ width: 36, height: 36, borderRadius: '50%' }} />
            ) : (
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {user.email?.[0].toUpperCase()}
              </div>
            )}
            <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '8px' }} title="Log out">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
