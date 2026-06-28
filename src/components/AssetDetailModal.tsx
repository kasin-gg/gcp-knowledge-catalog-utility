import React, { useState } from 'react';
import type { CatalogAsset, AccessRequest } from '../types';
import { X, Database, Lock, CheckCircle2, Send, Sparkles, Share2, GitBranch } from 'lucide-react';

interface AssetDetailModalProps {
  asset: CatalogAsset | null;
  onClose: () => void;
}

export const AssetDetailModal: React.FC<AssetDetailModalProps> = ({ asset, onClose }) => {
  const [justification, setJustification] = useState('');
  const [duration, setDuration] = useState(30);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [lineage, setLineage] = React.useState<any>(null);

  React.useEffect(() => {
    if (asset) {
      fetch(`http://localhost:8000/api/catalog/lineage/${asset.id}`)
        .then(r => r.json())
        .then(data => setLineage(data))
        .catch(e => console.error("Lin err:", e));
    }
  }, [asset]);

  if (!asset) return null;

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const reqBody: AccessRequest = {
        asset_id: asset.id,
        user_email: "business.user@enterprise.com",
        justification,
        duration_days: duration
      };
      const res = await fetch('http://localhost:8000/api/catalog/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody)
      });
      if (res.ok) {
        setSubmitted(true);
      }
    } catch (err) {
      console.error("Failed to submit access request:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      
      <div className="glass-panel" style={{ width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', padding: '32px', position: 'relative', background: 'var(--bg-card)' }}>
        
        {/* Close Button */}
        <button onClick={onClose} style={{ position: 'absolute', right: '24px', top: '24px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <X size={24} />
        </button>

        {/* Modal Header */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
          <span className="badge badge-blue">{asset.system}</span>
          <span className="badge badge-yellow">{asset.asset_type}</span>
          <span className="badge badge-green">Tier: {asset.tier}</span>
        </div>

        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '6px' }}>{asset.display_name}</h2>
        <p style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '24px' }}>
          {asset.fully_qualified_name}
        </p>

        {/* 360° Metadata Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '32px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Database size={18} style={{ color: '#3b82f6' }} /> Business Description
            </h3>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, fontSize: '0.95rem', background: 'rgba(0,0,0,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              {asset.description}
            </p>

            {/* Dataplex Aspects & Policy Tags 360° Inspection */}
            {asset.aspects && (
              <div style={{ marginTop: '24px', padding: '20px', background: 'light-dark(rgba(139,92,246,0.06), rgba(139,92,246,0.15))', borderRadius: '14px', border: '1px solid rgba(139,92,246,0.25)' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#8b5cf6', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={18} /> Dataplex Knowledge Catalog Aspects
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.9rem' }}>
                  <div><span style={{ color: 'var(--text-muted)' }}>Thai Name:</span> <strong>{asset.aspects.thai_description}</strong></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Security Tier:</span> <strong>{asset.aspects.security_tier}</strong></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Personal Data (PII):</span> <strong>{asset.aspects.is_personal_data ? "Yes (Governed)" : "No"}</strong></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Owner Dept:</span> <strong>{asset.aspects.data_owner}</strong></div>
                </div>
                {asset.policy_tags && asset.policy_tags.length > 0 && (
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(139,92,246,0.2)', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                    <span style={{ color: '#ef4444', fontWeight: 700 }}>🔒 Active Policy Tags: </span>
                    {asset.policy_tags.join(', ')}
                  </div>
                )}
              </div>
            )}

            {/* Lineage Preview */}
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '24px 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <GitBranch size={18} style={{ color: '#10b981' }} /> Upstream & Downstream Lineage (Zero-Footprint)
            </h3>
            <div style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.02)' }}>
              {lineage ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '16px', alignItems: 'center', fontSize: '0.85rem' }}>
                  <div style={{ padding: '12px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid #3b82f6' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Upstream Source</span>
                    {lineage.upstream && lineage.upstream.length > 0 ? lineage.upstream.map((u: any, i: number) => <strong key={i} style={{ display: 'block', color: '#3b82f6' }}>{u.name} ({u.system})</strong>) : <span style={{ color: 'var(--text-muted)' }}>Core Banking Landing Zone</span>}
                  </div>
                  <div style={{ fontWeight: 700, color: '#10b981', fontSize: '1.25rem' }}>➔</div>
                  <div style={{ padding: '12px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid #10b981' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Downstream Staging</span>
                    {lineage.downstream && lineage.downstream.length > 0 ? lineage.downstream.map((d: any, i: number) => <strong key={i} style={{ display: 'block', color: '#10b981' }}>{d.name} ({d.system})</strong>) : <span style={{ color: 'var(--text-muted)' }}>Enterprise Analytics Mart</span>}
                  </div>
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Discovering live lineage flows...</div>
              )}
            </div>
          </div>

          {/* Right Sidebar - Stewardship & Tags */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.02)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Data Steward</span>
              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{asset.steward.name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{asset.steward.department}</div>
              <div style={{ fontSize: '0.75rem', color: '#3b82f6', marginTop: '4px' }}>{asset.steward.email}</div>
            </div>

            <div style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.02)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Data Quality Health</span>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#10b981' }}>{asset.quality_score}%</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dataplex Automated DQ Scan Passed</div>
            </div>
          </div>
        </div>

        {/* Self-Service Access Request Section */}
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '24px' }}>
          {asset.access_status === 'GRANTED' ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'light-dark(#dcfce7, rgba(6,78,59,0.4))', padding: '20px', borderRadius: '16px', border: '1px solid #10b981' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <CheckCircle2 size={28} style={{ color: '#10b981' }} />
                <div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'light-dark(#15803d, #6ee7b7)' }}>You have active access to this asset</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Granted via GCP IAM Downscoped Group Policy</p>
                </div>
              </div>
              <button className="btn-secondary" style={{ background: 'white', color: 'black' }} onClick={() => alert("Querying BigQuery table directly...")}>
                <Share2 size={16} style={{ marginRight: '6px' }} /> Query Asset
              </button>
            </div>
          ) : submitted ? (
            <div style={{ textAlign: 'center', padding: '32px', background: 'rgba(59,130,246,0.1)', borderRadius: '16px', border: '1px solid #3b82f6' }}>
              <Sparkles size={32} style={{ color: '#3b82f6', margin: '0 auto 12px auto' }} />
              <h4 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Access Request Submitted!</h4>
              <p style={{ color: 'var(--text-muted)', marginTop: '6px' }}>
                An automated Slack / Email approval notification has been sent to <strong>{asset.steward.name}</strong>. Once approved, GCP IAM Conditions will grant temporary access automatically.
              </p>
            </div>
          ) : (
            <form onSubmit={handleRequestAccess} style={{ background: 'rgba(0,0,0,0.03)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
              <h4 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={20} style={{ color: '#ef4444' }} /> Self-Service Access Request
              </h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
                You do not currently have IAM permissions to view raw rows in this dataset. Submit a request to the data steward below.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Business Justification / Project Name</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Q4 Executive Churn Analysis for Board Deck..."
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Duration (Days)</label>
                  <input 
                    type="number"
                    min={1}
                    max={180}
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value))}
                    style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  <Send size={16} /> {submitting ? "Submitting..." : "Submit Request to Steward"}
                </button>
              </div>
            </form>
          )}
        </div>

      </div>

    </div>
  );
};
