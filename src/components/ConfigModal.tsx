import React, { useState } from 'react';
import type { GCPConfig } from '../types';
import { X, Cloud, CheckCircle2, AlertTriangle, Shield, KeyRound, Loader2, Image as ImageIcon, Sparkles } from 'lucide-react';

interface ConfigModalProps {
  config: GCPConfig;
  onUpdateConfig: (newConfig: GCPConfig) => void;
  onClose: () => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({ config, onUpdateConfig, onClose }) => {
  const [projectId, setProjectId] = useState(config.projectId);
  const [logoUrl, setLogoUrl] = useState(config.portalLogoUrl || '');
  const [portalTitle, setPortalTitle] = useState(config.portalTitle || 'Google Cloud Knowledge Catalog');
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(config.statusMessage || null);

  const handleSaveAndTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setTesting(true);

    try {
      const res = await fetch('http://localhost:8000/api/config/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId })
      });
      
      const data = await res.json();
      if (res.ok && data.status === 'CONNECTED') {
        setSuccessMsg(data.message);
        onUpdateConfig({
          projectId: data.project_id,
          isConnected: true,
          statusMessage: data.message,
          sampleAssetsCount: data.sample_assets_found,
          portalLogoUrl: logoUrl.trim() || undefined,
          portalTitle: portalTitle.trim() || 'Google Cloud Knowledge Catalog'
        });
      } else {
        setError(data.detail || "Failed to connect to GCP project.");
        onUpdateConfig({ 
          projectId, 
          isConnected: false,
          portalLogoUrl: logoUrl.trim() || undefined,
          portalTitle: portalTitle.trim() || 'Google Cloud Knowledge Catalog'
        });
      }
    } catch (err) {
      setError("Cannot reach backend server. Saved branding locally.");
      onUpdateConfig({ 
        projectId, 
        isConnected: false,
        portalLogoUrl: logoUrl.trim() || undefined,
        portalTitle: portalTitle.trim() || 'Google Cloud Knowledge Catalog'
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      zIndex: 150,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      
      <div className="glass-panel" style={{ width: '100%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto', padding: '36px', position: 'relative', background: 'var(--bg-card)' }}>
        
        <button onClick={onClose} style={{ position: 'absolute', right: '24px', top: '24px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <X size={24} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div style={{ background: 'rgba(59, 130, 246, 0.15)', padding: '12px', borderRadius: '12px', color: '#3b82f6' }}>
            <Cloud size={28} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Portal Configuration & Branding</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Customize target GCP scope and enterprise UI aesthetics</p>
          </div>
        </div>

        <form onSubmit={handleSaveAndTest}>
          
          {/* Section 1: GCP Scope */}
          <div style={{ marginBottom: '24px', padding: '20px', borderRadius: '14px', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <KeyRound size={16} style={{ color: '#3b82f6' }} /> Target Google Cloud Project
            </h3>
            <input 
              type="text"
              required
              placeholder="e.g. gsb-data-driven-sandbox"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                fontSize: '0.95rem',
                outline: 'none',
                fontFamily: 'monospace'
              }}
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
              Queries live Dataplex & Knowledge Catalog metadata using active ADC credentials.
            </p>
          </div>

          {/* Section 2: Custom Branding & Logo */}
          <div style={{ marginBottom: '24px', padding: '20px', borderRadius: '14px', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ImageIcon size={16} style={{ color: '#ec4899' }} /> Enterprise White-Label Branding
            </h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Portal Title</label>
              <input 
                type="text"
                placeholder="Google Cloud Knowledge Catalog"
                value={portalTitle}
                onChange={(e) => setPortalTitle(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Custom Logo Image URL</label>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input 
                  type="url"
                  placeholder="https://example.com/company-logo.png"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none' }}
                />
                {/* Live Logo Preview */}
                <div style={{ width: '44px', height: '44px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo Preview" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px' }} onError={(e) => (e.currentTarget.style.display = 'none')} />
                  ) : (
                    <Sparkles size={20} style={{ color: 'var(--text-muted)' }} />
                  )}
                </div>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                Paste any public PNG/SVG image URL. Replaces the default top-left portal logo.
              </p>
            </div>
          </div>

          {/* Status Banners */}
          {error && (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '14px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', marginBottom: '20px', fontSize: '0.85rem' }}>
              <AlertTriangle size={18} style={{ flexShrink: 0 }} />
              <div><strong>Connection Notice:</strong> {error}</div>
            </div>
          )}

          {successMsg && (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '14px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', color: '#10b981', marginBottom: '20px', fontSize: '0.85rem' }}>
              <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
              <div>{successMsg}</div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Shield size={14} /> Persisted to Local Storage
            </span>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={testing} className="btn-primary">
                {testing ? <Loader2 size={16} className="animate-spin" /> : <Cloud size={16} />}
                {testing ? "Saving..." : "Save Configuration"}
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
};
