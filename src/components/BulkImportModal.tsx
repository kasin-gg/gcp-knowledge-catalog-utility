import React, { useState } from 'react';
import type { DraftTerm } from '../types';
import { X, FileSpreadsheet, Plus, Trash2, Send, Sparkles, CheckCircle2, Copy } from 'lucide-react';

interface BulkImportModalProps {
  projectId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({ projectId, onClose, onSuccess }) => {
  const [terms, setTerms] = useState<DraftTerm[]>([
    { id: '1', display_name: 'Annual Recurring Revenue', category: 'Finance', definition: 'Total annualized value of active subscription contracts.', synonyms: ['ARR', 'Run-Rate'] },
    { id: '2', display_name: 'Customer Acquisition Cost', category: 'Marketing', definition: 'Total sales and marketing expenditure required to acquire a new customer.', synonyms: ['CAC'] },
    { id: '3', display_name: 'Monthly Active Users', category: 'Product', definition: 'Unique users who initiate at least one session within a 30-day window.', synonyms: ['MAU'] }
  ]);

  const [targetGlossary, setTargetGlossary] = useState('General Business Glossary');
  const [submitting, setSubmitting] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [pasteNotice, setPasteNotice] = useState(false);

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        alert("Clipboard is empty! Copy a range of cells from Excel or Google Sheets first.");
        return;
      }
      parseTsvText(text);
    } catch (err) {
      alert("Please press Cmd+V / Ctrl+V inside the table or grant clipboard permission.");
    }
  };

  const parseTsvText = (text: string) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length === 0) return;

    const newTerms = lines.map((line, idx) => {
      const cols = line.split('\t');
      return {
        id: `pasted-${idx}-${Date.now()}`,
        display_name: cols[0] || '',
        category: cols[1] || 'General Business Glossary',
        definition: cols[2] || '',
        synonyms: cols[3] ? cols[3].split(',').map(s => s.trim()) : []
      };
    });

    setTerms(newTerms);
    setPasteNotice(true);
    setTimeout(() => setPasteNotice(false), 4000);
  };

  const handleAddRow = () => {
    setTerms([...terms, { id: Date.now().toString(), display_name: '', category: 'General Business Glossary', definition: '', synonyms: [] }]);
  };

  const handleDeleteRow = (id: string) => {
    setTerms(terms.filter(t => t.id !== id));
  };

  const handleUpdateCell = (id: string, field: keyof DraftTerm, value: any) => {
    setTerms(terms.map(t => {
      if (t.id === id) {
        if (field === 'synonyms' && typeof value === 'string') {
          return { ...t, synonyms: value.split(',').map(s => s.trim()) };
        }
        return { ...t, [field]: value };
      }
      return t;
    }));
  };

  const handleSubmitBulkCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setResultMsg(null);

    const payload = {
      project_id: projectId,
      parent_glossary: targetGlossary,
      terms: terms.map(t => ({
        display_name: t.display_name,
        category: t.category,
        definition: t.definition,
        synonyms: t.synonyms
      }))
    };

    try {
      const res = await fetch('http://localhost:8000/api/glossary/bulk-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        setResultMsg(data.message);
        setTimeout(() => {
          onSuccess();
        }, 2000);
      } else {
        alert(data.detail || "Failed to import terms.");
      }
    } catch (err) {
      alert("Cannot connect to backend server.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      zIndex: 200,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      
      <div className="glass-panel" style={{ width: '100%', maxWidth: '1100px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', position: 'relative', background: 'var(--bg-card)' }}>
        
        {/* Modal Header */}
        <div style={{ padding: '28px 36px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '12px', borderRadius: '12px', color: '#10b981' }}>
              <FileSpreadsheet size={28} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 700 }}>Mass-Create Business Terms</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Copy cells directly from Google Sheets or Excel and paste below</p>
            </div>
          </div>

          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={26} />
          </button>
        </div>

        {/* Action Toolbar */}
        <div style={{ padding: '16px 36px', background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button type="button" onClick={handlePasteFromClipboard} className="btn-primary" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', fontSize: '0.85rem', padding: '8px 16px' }}>
              <Copy size={16} /> Paste from Clipboard
            </button>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Or select table and press <strong>Cmd+V / Ctrl+V</strong>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Target Glossary:</span>
            <input 
              type="text" 
              value={targetGlossary} 
              onChange={(e) => setTargetGlossary(e.target.value)} 
              style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-page)', color: 'var(--text-main)', fontWeight: 600, outline: 'none' }}
            />
          </div>
        </div>

        {/* Paste Notice Banner */}
        {pasteNotice && (
          <div style={{ background: '#dcfce7', color: '#15803d', padding: '10px 36px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #86efac' }}>
            <Sparkles size={16} /> Successfully parsed spreadsheet rows from clipboard!
          </div>
        )}

        {/* Editable Table Area */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px 36px' }}>
          <form id="bulk-form" onSubmit={handleSubmitBulkCreate}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 8px', width: '25%' }}>Term Display Name</th>
                  <th style={{ padding: '12px 8px', width: '20%' }}>Category / Container</th>
                  <th style={{ padding: '12px 8px', width: '35%' }}>Business Definition</th>
                  <th style={{ padding: '12px 8px', width: '15%' }}>Synonyms (comma sep)</th>
                  <th style={{ padding: '12px 8px', width: '5%', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {terms.map((t) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '8px' }}>
                      <input 
                        type="text" required
                        placeholder="e.g. ARR"
                        value={t.display_name}
                        onChange={(e) => handleUpdateCell(t.id, 'display_name', e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-page)', color: 'var(--text-main)', outline: 'none', fontWeight: 600 }}
                      />
                    </td>
                    <td style={{ padding: '8px' }}>
                      <input 
                        type="text" required
                        value={t.category}
                        onChange={(e) => handleUpdateCell(t.id, 'category', e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-page)', color: 'var(--text-main)', outline: 'none' }}
                      />
                    </td>
                    <td style={{ padding: '8px' }}>
                      <input 
                        type="text"
                        placeholder="Enter definition..."
                        value={t.definition}
                        onChange={(e) => handleUpdateCell(t.id, 'definition', e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-page)', color: 'var(--text-main)', outline: 'none' }}
                      />
                    </td>
                    <td style={{ padding: '8px' }}>
                      <input 
                        type="text"
                        placeholder="ARR, Run-Rate"
                        value={t.synonyms.join(', ')}
                        onChange={(e) => handleUpdateCell(t.id, 'synonyms', e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-page)', color: 'var(--text-main)', outline: 'none', fontFamily: 'monospace', fontSize: '0.85rem' }}
                      />
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <button type="button" onClick={() => handleDeleteRow(t.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '6px' }}>
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <button type="button" onClick={handleAddRow} className="btn-secondary" style={{ marginTop: '16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={16} /> Add Blank Row
            </button>
          </form>
        </div>

        {/* Modal Footer */}
        <div style={{ padding: '20px 36px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-blue">{terms.length} Terms Ready</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mass-creates Entries in Dataplex Knowledge Catalog</span>
          </div>

          {resultMsg ? (
            <div style={{ color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={20} /> {resultMsg}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
              <button type="submit" form="bulk-form" disabled={submitting} className="btn-primary">
                <Send size={16} /> {submitting ? "Creating in GCP..." : "Mass-Create Terms in GCP"}
              </button>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
