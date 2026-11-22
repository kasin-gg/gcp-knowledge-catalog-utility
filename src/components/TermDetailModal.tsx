import React from 'react';
import type { GlossaryTerm } from '../types';
import { X, BookOpen, User, Link2, MessageSquare, Calendar, Tag, ShieldCheck, Share2, Database } from 'lucide-react';

interface TermDetailModalProps {
  term: GlossaryTerm | null;
  onClose: () => void;
}

export const TermDetailModal: React.FC<TermDetailModalProps> = ({ term, onClose }) => {
  if (!term) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      
      <div className="glass-panel" style={{ width: '100%', maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto', padding: '36px', position: 'relative', background: 'var(--bg-card)' }}>
        
        {/* Close Button */}
        <button onClick={onClose} style={{ position: 'absolute', right: '24px', top: '24px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <X size={24} />
        </button>

        {/* Header Badges */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
          <span className="badge badge-blue">Glossary: {term.category}</span>
          <span className="badge badge-green" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <ShieldCheck size={12} /> Verified Dataplex Term
          </span>
        </div>

        <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <BookOpen style={{ color: '#3b82f6' }} /> {term.display_name}
        </h2>
        
        <p style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '28px', wordBreak: 'break-all' }}>
          RESOURCE URI: {term.id}
        </p>

        {/* Definition Box */}
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '10px', color: 'var(--text-main)' }}>
            Business Definition & Overview
          </h3>
          <div style={{ color: 'var(--text-main)', lineHeight: 1.7, fontSize: '1.1rem', background: 'rgba(59, 130, 246, 0.08)', padding: '20px', borderRadius: '14px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
            {term.definition || "No detailed business description provided in Google Cloud Knowledge Catalog."}
          </div>
        </div>

        {/* Metadata & Stewardship Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '20px', marginBottom: '32px' }}>
          
          {/* Steward Box */}
          <div style={{ padding: '20px', borderRadius: '14px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.02)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '10px' }}>Assigned Data Steward</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ background: 'rgba(139, 92, 246, 0.15)', padding: '10px', borderRadius: '50%', color: '#8b5cf6' }}>
                <User size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>{term.steward.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{term.steward.department}</div>
              </div>
            </div>
            <button className="btn-secondary" style={{ width: '100%', padding: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} onClick={() => alert(`Opening draft to ${term.steward.email}...`)}>
              <MessageSquare size={16} /> Contact Steward
            </button>
          </div>

          {/* Tagged Assets Box */}
          <div style={{ padding: '20px', borderRadius: '14px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Catalog Usage</span>
                <span className="badge badge-green" style={{ fontSize: '0.75rem' }}>
                  <Link2 size={12} style={{ marginRight: '4px' }} />
                  {term.linked_assets_count} {term.linked_assets_count === 1 ? 'Asset' : 'Assets'}
                </span>
              </div>

              {/* Tagged Asset Names List */}
              {term.linked_assets_names && term.linked_assets_names.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tagged Cloud Resources:</span>
                  {term.linked_assets_names.map((assetName) => (
                    <div key={assetName} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'monospace', fontSize: '0.82rem', background: 'var(--bg-card)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', color: '#3b82f6', wordBreak: 'break-all' }}>
                      <Database size={14} style={{ flexShrink: 0, color: '#10b981' }} />
                      <span>{assetName}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  No catalog assets currently tagged with this term.
                </p>
              )}
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginTop: '16px' }}>
              <Calendar size={14} /> Last Synced: {term.last_updated}
            </div>
          </div>

        </div>

        {/* Synonyms Footer */}
        {term.synonyms.length > 0 && (
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Tag size={16} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Synonyms / Engine:</span>
              {term.synonyms.map(syn => (
                <span key={syn} style={{ background: 'rgba(0,0,0,0.05)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                  {syn}
                </span>
              ))}
            </div>

            <button className="btn-primary" style={{ padding: '8px 18px', fontSize: '0.85rem' }} onClick={() => alert("Copying term link to clipboard...")}>
              <Share2 size={16} /> Share Term
            </button>
          </div>
        )}

      </div>

    </div>
  );
};
