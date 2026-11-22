import React, { useState, useEffect } from 'react';
import type { CatalogAsset } from '../types';
import { Search, Sparkles, CheckCircle2, Lock, ArrowUpRight, Database, ShoppingCart, Filter, BookOpen } from 'lucide-react';

interface DiscoverySearchProps {
  projectId: string;
  onSelectAsset: (asset: CatalogAsset) => void;
}

const getTierBadgeClass = (tierOrTag: string = '') => {
  const lower = tierOrTag.toLowerCase();
  if (lower.includes('tier 4') || lower.includes('secret')) return 'badge badge-red';
  if (lower.includes('tier 3') || lower.includes('confidential')) return 'badge badge-yellow';
  if (lower.includes('tier 2') || lower.includes('internal')) return 'badge badge-green';
  return 'badge badge-blue';
};

export const DiscoverySearch: React.FC<DiscoverySearchProps> = ({ projectId, onSelectAsset }) => {
  const [assets, setAssets] = useState<CatalogAsset[]>([]);
  const [query, setQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('All');
  const [selectedSystem, setSelectedSystem] = useState('All');
  const [loading, setLoading] = useState(true);
  const [aiThinking, setAiThinking] = useState(false);
  const [cart, setCart] = useState<string[]>([]);

  const toggleCart = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCart(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const handleBulkCheckout = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/catalog/request-bulk-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset_ids: cart, user_email: "business.user@enterprise.com", justification: "Bulk Data Cart Checkout", duration_days: 30 })
      });
      if (res.ok) {
        const data = await res.json();
        alert(`🎉 Bulk Access Submitted!\nTicket: ${data.ticket_id}\nRouting IAM Conditions for ${cart.length} assets.`);
        setCart([]);
      }
    } catch (err) {
      console.error("Bulk err:", err);
    }
  };

  const domains = ['All', 'Finance', 'Risk & Retention', 'Marketing', 'Enterprise Data'];
  const systems = ['All', 'BigQuery', 'Pub/Sub', 'Cloud Storage'];

  useEffect(() => {
    fetchAssets();
  }, [selectedDomain, selectedSystem, projectId]);

  const fetchAssets = async (searchQuery?: string) => {
    setLoading(true);
    try {
      const q = searchQuery !== undefined ? searchQuery : query;
      const res = await fetch(`http://localhost:8000/api/catalog/search?project_id=${projectId}&query=${q}&domain=${selectedDomain}&system=${selectedSystem}`);
      if (res.ok) {
        const data = await res.json();
        setAssets(data);
      }
    } catch (err) {
      console.error("Failed to search catalog:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAiSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setAiThinking(true);
    setTimeout(() => {
      setAiThinking(false);
      fetchAssets(query);
    }, 600);
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '32px auto', padding: '0 32px' }}>
      
      {/* AI Semantic Search Hero */}
      <div className="glass-panel" style={{ padding: '40px', marginBottom: '32px', textAlign: 'center', background: 'linear-gradient(135deg, rgba(14,165,233,0.08), rgba(236,72,153,0.08))' }}>
        <span className="badge badge-blue" style={{ marginBottom: '16px' }}>
          <Sparkles size={14} style={{ marginRight: '6px', color: '#0ea5e9' }} /> Live GCP Query Scope: {projectId}
        </span>
        <h2 style={{ fontSize: '2.25rem', fontWeight: 700, marginBottom: '12px' }}>Universal Data Discovery</h2>
        <p style={{ color: 'var(--text-muted)', maxWidth: '650px', margin: '0 auto 28px auto', fontSize: '1.05rem', lineHeight: 1.6 }}>
          Ask questions in plain English. Our AI co-pilot queries live Google Cloud Knowledge Catalog metadata for project <strong>{projectId}</strong>.
        </p>

        {/* Natural Language Form */}
        <form onSubmit={handleAiSearch} style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', gap: '12px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={22} style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', color: '#8b5cf6' }} />
            <input 
              type="text"
              placeholder='e.g. "Show BigQuery tables" or "Search customer datasets"...'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '18px 18px 18px 54px',
                borderRadius: '14px',
                border: '2px solid rgba(139, 92, 246, 0.3)',
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                fontSize: '1.05rem',
                outline: 'none',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)'
              }}
            />
          </div>
          <button type="submit" className="btn-primary" style={{ padding: '0 28px', fontSize: '1rem', borderRadius: '14px' }}>
            <Sparkles size={18} /> Search GCP
          </button>
        </form>

        {/* Filters */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '28px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Domain:</span>
            {domains.map(d => (
              <button key={d} onClick={() => setSelectedDomain(d)} className="btn-secondary" style={{ padding: '4px 12px', fontSize: '0.8rem', background: selectedDomain === d ? 'var(--brand-primary)' : 'transparent', color: selectedDomain === d ? 'white' : 'var(--text-main)' }}>
                {d}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>System:</span>
            {systems.map(s => (
              <button key={s} onClick={() => setSelectedSystem(s)} className="btn-secondary" style={{ padding: '4px 12px', fontSize: '0.8rem', background: selectedSystem === s ? 'var(--brand-primary)' : 'transparent', color: selectedSystem === s ? 'white' : 'var(--text-main)' }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search Results Summary Banner */}
      {!loading && !aiThinking && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', padding: '14px 22px', background: 'rgba(0,0,0,0.03)', borderRadius: '14px', border: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem', color: 'var(--text-main)' }}>
            <Sparkles size={18} style={{ color: '#8b5cf6' }} />
            <span>Showing <strong>{assets.length}</strong> Governed Cloud Assets</span>
            {query && <span className="badge badge-purple" style={{ fontSize: '0.75rem' }}>Query: "{query}"</span>}
            {(selectedDomain !== 'All' || selectedSystem !== 'All') && <span className="badge badge-blue" style={{ fontSize: '0.75rem' }}>Active Filters</span>}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            ⚡ 100% Live BigQuery Harvest (No Mock Data)
          </div>
        </div>
      )}

      {/* Asset Cards Grid & Loading Skeletons */}
      {aiThinking || loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '24px' }}>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="glass-panel skeleton-shimmer" style={{ padding: '24px', height: '280px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid rgba(139,92,246,0.25)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ width: '50px', height: '22px', background: 'var(--border-color)', borderRadius: '6px' }} />
                  <div style={{ width: '80px', height: '22px', background: 'var(--border-color)', borderRadius: '6px' }} />
                </div>
                <div style={{ width: '60px', height: '18px', background: 'var(--border-color)', borderRadius: '4px' }} />
              </div>
              <div style={{ width: '100%', height: '6px', background: 'var(--border-color)', borderRadius: '3px', margin: '12px 0' }} />
              <div style={{ width: '65%', height: '26px', background: 'var(--border-color)', borderRadius: '8px', marginBottom: '12px' }} />
              <div style={{ width: '100%', height: '48px', background: 'var(--border-color)', borderRadius: '8px', marginBottom: '16px' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
                <div style={{ width: '120px', height: '18px', background: 'var(--border-color)', borderRadius: '4px' }} />
                <div style={{ width: '90px', height: '22px', background: 'var(--border-color)', borderRadius: '6px' }} />
              </div>
            </div>
          ))}
        </div>
      ) : assets.length === 0 ? (
        <div className="glass-panel" style={{ padding: '64px', textAlign: 'center' }}>
          <Database size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px auto', opacity: 0.4 }} />
          <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '8px' }}>No Governed Assets Matched</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>No tables or topics matched your search query in GCP project '{projectId}'.</p>
          <button className="btn-secondary" onClick={() => { setQuery(''); setSelectedDomain('All'); setSelectedSystem('All'); }}>
            Reset Search & Filters
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '24px' }}>
          {assets.map((asset) => (
            <div 
              key={asset.id} 
              onClick={() => onSelectAsset(asset)}
              className="glass-panel interactive-card" 
              style={{ padding: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={cart.includes(asset.id)}
                      onChange={() => {}}
                      onClick={(e) => toggleCart(asset.id, e)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#10b981' }}
                    />
                    <span className="badge badge-blue">{asset.system}</span>
                    <span className="badge badge-yellow">{asset.asset_type}</span>
                    <span className={getTierBadgeClass(asset.tier)}>{asset.tier}</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: asset.quality_score >= 95 ? '#10b981' : '#f59e0b' }}>
                    DQ Score: {asset.quality_score}%
                  </span>
                </div>

                {/* Visual Dataplex DQ Health Bar */}
                <div style={{ width: '100%', background: 'rgba(0,0,0,0.1)', borderRadius: '4px', height: '6px', overflow: 'hidden', marginBottom: '14px' }}>
                  <div style={{ width: `${asset.quality_score}%`, background: asset.quality_score >= 95 ? '#10b981' : '#f59e0b', height: '100%', transition: 'width 0.5s ease' }} />
                </div>

                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px', wordBreak: 'break-all', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>{asset.display_name}</span>
                  <ArrowUpRight size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                </h3>
                <p style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  {asset.fully_qualified_name}
                </p>

                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '16px' }}>
                  {asset.description}
                </p>

                {/* Clickable Glossary Semantic Linkage Pills */}
                {asset.glossary_terms && asset.glossary_terms.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#8b5cf6', display: 'flex', alignItems: 'center', marginRight: '2px' }}>📖 Governed By:</span>
                    {asset.glossary_terms.map(gt => (
                      <span key={gt} className="badge badge-purple" style={{ cursor: 'pointer', fontSize: '0.75rem' }} onClick={(e) => { e.stopPropagation(); alert(`Navigating to Dataplex Business Glossary Term: ${gt}`); }}>
                        {gt}
                      </span>
                    ))}
                  </div>
                )}

                {/* Dataplex Governance Aspects Box */}
                {asset.aspects && (
                  <div style={{ padding: '12px', background: 'light-dark(rgba(139,92,246,0.06), rgba(139,92,246,0.15))', borderRadius: '10px', border: '1px solid rgba(139,92,246,0.2)', marginBottom: '16px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8b5cf6', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Sparkles size={13} /> DATAPLEX ASPECT: cbs_asset_governance
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{asset.aspects.thai_description}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Owner: {asset.aspects.data_owner}</div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '20px' }}>
                  {asset.tags.map(tag => (
                    <span key={tag.key} className={`badge badge-${tag.badge_color}`} style={{ fontSize: '0.7rem' }}>
                      {tag.display_name}: {tag.value}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Steward: <strong>{asset.steward.name}</strong></span>
                
                {asset.access_status === 'GRANTED' ? (
                  <span className="badge badge-green" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <CheckCircle2 size={14} /> Access Granted
                  </span>
                ) : (
                  <span className="badge badge-red" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <Lock size={14} /> Request Access
                  </span>
                )}
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Feature 1: Floating Enterprise Data Cart Checkout Bar */}
      {cart.length > 0 && (
        <div className="glass-panel animate-bounce" style={{ position: 'fixed', bottom: '32px', left: '50%', transform: 'translateX(-50%)', zIndex: 90, padding: '16px 32px', borderRadius: '9999px', display: 'flex', alignItems: 'center', gap: '24px', background: 'var(--bg-card)', border: '2px solid #10b981', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.5rem' }}>🛒</span>
            <div style={{ textAlign: 'left' }}>
              <strong style={{ display: 'block', fontSize: '1rem', color: 'var(--text-main)' }}>{cart.length} Governed {cart.length === 1 ? 'Asset' : 'Assets'} Selected</strong>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ready for bulk IAM downscoped policy routing</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-secondary" style={{ padding: '8px 16px', borderRadius: '9999px', fontSize: '0.85rem' }} onClick={() => setCart([])}>Clear Cart</button>
            <button className="btn-primary" style={{ background: '#10b981', padding: '10px 24px', borderRadius: '9999px', fontSize: '0.95rem', fontWeight: 700 }} onClick={handleBulkCheckout}>
              Request Bulk Access
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
