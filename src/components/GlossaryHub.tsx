import React, { useState, useEffect } from 'react';
import type { GlossaryTerm } from '../types';
import { Search, Plus, BookOpen, User, Link2, MessageSquare, ArrowUpRight, FileSpreadsheet } from 'lucide-react';

interface GlossaryHubProps {
  projectId: string;
  onSelectTerm: (term: GlossaryTerm) => void;
  onOpenBulkImport: () => void;
}

export const GlossaryHub: React.FC<GlossaryHubProps> = ({ projectId, onSelectTerm, onOpenBulkImport }) => {
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [search, setSearch] = useState('');
  const [selectedGlossary, setSelectedGlossary] = useState('All');
  const [loading, setLoading] = useState(true);

  const glossaries = ['All', 'General Business Glossary', 'Legacy Glossary Archive'];

  useEffect(() => {
    fetchTerms();
  }, [selectedGlossary, search, projectId]);

  const fetchTerms = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/api/glossary/terms?project_id=${projectId}&category=${selectedGlossary}&search=${search}`);
      if (res.ok) {
        const data = await res.json();
        setTerms(data);
      }
    } catch (err) {
      console.error("Failed to fetch glossary terms:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '32px auto', padding: '0 32px' }}>
      
      {/* Header Banner */}
      <div className="glass-panel" style={{ padding: '32px', marginBottom: '32px', background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(139,92,246,0.1))' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <BookOpen style={{ color: '#3b82f6' }} /> Enterprise Business Glossary
            </h2>
            <p style={{ color: 'var(--text-muted)', maxWidth: '700px', fontSize: '1rem', lineHeight: 1.6 }}>
              Viewing strictly verified Dataplex Business Terms for GCP Project: <strong style={{ color: '#3b82f6' }}>{projectId}</strong>.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="button" className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-card)', fontWeight: 600 }} onClick={onOpenBulkImport}>
              <FileSpreadsheet size={18} style={{ color: '#10b981' }} /> Bulk Import from Excel
            </button>
            <button type="button" className="btn-primary" onClick={() => alert("Opening 'Propose a New Term' workflow modal...")}>
              <Plus size={18} /> Propose Term
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ marginTop: '24px', position: 'relative' }}>
          <Search size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search terms or Thai descriptions (e.g. จำนวนเงินเดบิตล่าสุด, Debit, Amount)..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '16px 16px 16px 48px',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-card)',
              color: 'var(--text-main)',
              fontSize: '1rem',
              outline: 'none',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
            }}
          />
        </div>

        {/* Glossary Filter Pills */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginRight: '4px' }}>Filter by Glossary:</span>
          {glossaries.map((g) => (
            <button
              key={g}
              onClick={() => setSelectedGlossary(g)}
              style={{
                padding: '8px 16px',
                borderRadius: '9999px',
                border: '1px solid var(--border-color)',
                background: selectedGlossary === g ? 'var(--brand-primary)' : 'var(--bg-card)',
                color: selectedGlossary === g ? 'white' : 'var(--text-main)',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Glossary Results Summary Banner */}
      {!loading && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', padding: '14px 22px', background: 'rgba(0,0,0,0.03)', borderRadius: '14px', border: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem', color: 'var(--text-main)' }}>
            <BookOpen size={18} style={{ color: '#3b82f6' }} />
            <span>Showing <strong>{terms.length}</strong> Verified Business Glossary Terms</span>
            {search && <span className="badge badge-blue" style={{ fontSize: '0.75rem' }}>Search: "{search}"</span>}
            {selectedGlossary !== 'All' && <span className="badge badge-purple" style={{ fontSize: '0.75rem' }}>{selectedGlossary}</span>}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            ⚡ 100% Live Google Cloud Dataplex Vocabulary
          </div>
        </div>
      )}

      {/* Terms Grid & Skeleton Shimmers */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '24px' }}>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="glass-panel skeleton-shimmer" style={{ padding: '24px', height: '230px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid rgba(59,130,246,0.25)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ width: '130px', height: '22px', background: 'var(--border-color)', borderRadius: '6px' }} />
                <div style={{ width: '80px', height: '18px', background: 'var(--border-color)', borderRadius: '4px' }} />
              </div>
              <div style={{ width: '60%', height: '26px', background: 'var(--border-color)', borderRadius: '8px', margin: '14px 0 8px 0' }} />
              <div style={{ width: '100%', height: '40px', background: 'var(--border-color)', borderRadius: '8px', marginBottom: '16px' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
                <div style={{ width: '130px', height: '22px', background: 'var(--border-color)', borderRadius: '6px' }} />
                <div style={{ width: '80px', height: '22px', background: 'var(--border-color)', borderRadius: '6px' }} />
              </div>
            </div>
          ))}
        </div>
      ) : terms.length === 0 ? (
        <div className="glass-panel" style={{ padding: '64px', textAlign: 'center' }}>
          <BookOpen size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px auto', opacity: 0.4 }} />
          <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '8px' }}>No Business Terms Matched</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>No formal vocabulary terms matched your criteria in project '{projectId}'.</p>
          <button className="btn-secondary" onClick={() => { setSearch(''); setSelectedGlossary('All'); }}>
            Reset Search & Filters
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '24px' }}>
          {terms.map((t) => (
            <div 
              key={t.id} 
              onClick={() => onSelectTerm(t)}
              className="glass-panel interactive-card" 
              style={{ padding: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span className="badge badge-blue">Glossary: {t.category}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Updated {t.last_updated}</span>
                </div>

                <h3 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>{t.display_name}</span>
                  <ArrowUpRight size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '20px' }}>
                  {t.definition}
                </p>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <User size={16} style={{ color: '#8b5cf6' }} />
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{t.steward.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{t.steward.department}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={(e) => { e.stopPropagation(); alert("Asking steward..."); }}>
                    <MessageSquare size={14} /> Ask Steward
                  </button>
                  <span className="badge badge-green" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Link2 size={12} /> {t.linked_assets_count} {t.linked_assets_count === 1 ? 'Asset' : 'Assets'}
                  </span>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
};
