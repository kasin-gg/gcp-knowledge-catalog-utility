import React from 'react';
import type { GCPConfig, UserProfile } from '../types';
import { Database, BookOpen, Search, Sparkles, Cloud, Settings, User } from 'lucide-react';

interface NavbarProps {
  activeTab: 'glossary' | 'discovery';
  setActiveTab: (tab: 'glossary' | 'discovery') => void;
  config: GCPConfig;
  onOpenConfig: () => void;
  user: UserProfile | null;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, config, onOpenConfig, user }) => {
  return (
    <header className="glass-header" style={{ position: 'sticky', top: 0, zIndex: 50, padding: '16px 32px' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        
        {/* Brand Logo & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {config.portalLogoUrl ? (
            <div style={{ 
              width: '44px', height: '44px', borderRadius: '12px', 
              background: 'var(--bg-card)', border: '1px solid var(--border-color)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', padding: '4px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
            }}>
              <img src={config.portalLogoUrl} alt="Custom Portal Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
          ) : (
            <div style={{ 
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', 
              padding: '10px', 
              borderRadius: '12px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 8px 16px -4px rgba(59, 130, 246, 0.3)'
            }}>
              <Database size={24} />
            </div>
          )}

          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.2 }}>
              {config.portalTitle || 'Google Cloud Knowledge Catalog'}
            </h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={12} style={{ color: '#ec4899' }} /> Business Self-Service Portal
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', gap: '8px', background: 'var(--bg-card)', padding: '6px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <button 
            onClick={() => setActiveTab('glossary')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'glossary' ? 'var(--brand-primary)' : 'transparent',
              color: activeTab === 'glossary' ? 'white' : 'var(--text-main)',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <BookOpen size={18} /> Business Glossary
          </button>

          <button 
            onClick={() => setActiveTab('discovery')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'discovery' ? 'var(--brand-primary)' : 'transparent',
              color: activeTab === 'discovery' ? 'white' : 'var(--text-main)',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <Search size={18} /> Universal Discovery
          </button>
        </nav>

        {/* GCP Project Selector & Logged-In User Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
            onClick={onOpenConfig}
            className={`badge ${config.isConnected ? 'badge-green' : 'badge-yellow'}`}
            style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer', border: '1px solid currentColor', padding: '6px 14px' }}
          >
            <Cloud size={14} />
            <span>Project: <strong>{config.projectId}</strong></span>
            <Settings size={14} style={{ marginLeft: '2px', opacity: 0.8 }} />
          </button>

          {/* User Profile Section */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '16px', borderLeft: '1px solid var(--border-color)' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, lineHeight: 1.2 }}>
                {user ? user.name : "Loading..."}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                <User size={10} style={{ color: '#10b981' }} /> {user ? user.auth_source : "SSO"}
              </div>
            </div>

            <div style={{ 
              width: '40px', height: '40px', borderRadius: '50%', 
              background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 700, fontSize: '0.95rem',
              boxShadow: '0 4px 12px rgba(14, 165, 233, 0.25)',
              border: '2px solid rgba(255, 255, 255, 0.3)'
            }}>
              {user ? user.avatar_initials : "U"}
            </div>
          </div>

        </div>

      </div>
    </header>
  );
};
