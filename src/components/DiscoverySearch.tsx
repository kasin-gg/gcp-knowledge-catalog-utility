import React, { useState, useEffect } from 'react';
import type { CatalogAsset } from '../types';
import { Search, Sparkles, CheckCircle2, Lock, ArrowUpRight } from 'lucide-react';

interface DiscoverySearchProps {
  projectId: string;
  onSelectAsset: (asset: CatalogAsset) => void;
}

export const DiscoverySearch: React.FC<DiscoverySearchProps> = ({ projectId, onSelectAsset }) => {
  const [assets, setAssets] = useState<CatalogAsset[]>([]);
  const [query, setQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('All');
  const [selectedSystem, setSelectedSystem] = useState('All');
  const [loading, setLoading] = useState(true);
  const [aiThinking, setAiThinking] = useState(false);

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

      {/* Asset Cards Grid */}
      {aiThinking ? (
        <div style={{ padding: '80px', textAlign: 'center' }}>
          <Sparkles className="animate-spin" size={36} style={{ color: '#8b5cf6', margin: '0 auto 16px auto' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Querying live GCP Knowledge Catalog API...</h3>
        </div>
      ) : loading ? (
        <div style={{ textAlign: 'center', padding: '64px', color: 'var(--text-muted)' }}>Searching Knowledge Catalog in {projectId}...</div>
      ) : assets.length === 0 ? (
        <div className="glass-panel" style={{ padding: '64px', textAlign: 'center', color: 'var(--text-muted)' }}>
          No data assets found in GCP project '{projectId}'.
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
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span className="badge badge-blue">{asset.system}</span>
                    <span className="badge badge-yellow">{asset.asset_type}</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: asset.quality_score >= 95 ? '#10b981' : '#f59e0b' }}>
                    DQ Score: {asset.quality_score}%
                  </span>
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

    </div>
  );
};
