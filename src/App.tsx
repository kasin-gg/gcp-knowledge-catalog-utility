import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { GlossaryHub } from './components/GlossaryHub';
import { DiscoverySearch } from './components/DiscoverySearch';
import { AssetDetailModal } from './components/AssetDetailModal';
import { TermDetailModal } from './components/TermDetailModal';
import { BulkImportModal } from './components/BulkImportModal';
import { ConfigModal } from './components/ConfigModal';
import type { CatalogAsset, GlossaryTerm, GCPConfig, UserProfile } from './types';

export function App() {
  const [activeTab, setActiveTab] = useState<'glossary' | 'discovery'>('glossary');
  const [selectedAsset, setSelectedAsset] = useState<CatalogAsset | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<GlossaryTerm | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  
  const [gcpConfig, setGcpConfig] = useState<GCPConfig>(() => {
    const saved = localStorage.getItem('kc_portal_config');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      projectId: 'gsb-data-driven-sandbox',
      isConnected: true,
      statusMessage: "Using default sandbox ADC credentials.",
      portalTitle: "Google Cloud Knowledge Catalog"
    };
  });

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const handleUpdateConfig = (newCfg: GCPConfig) => {
    setGcpConfig(newCfg);
    localStorage.setItem('kc_portal_config', JSON.stringify(newCfg));
    setShowConfig(false);
  };

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data);
      }
    } catch (err) {
      console.error("Failed to fetch user profile:", err);
      setCurrentUser({
        email: "kasin@enterprise.com",
        name: "Kasin",
        avatar_initials: "K",
        auth_source: "Offline SSO"
      });
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Sticky Navigation */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        config={gcpConfig}
        onOpenConfig={() => setShowConfig(true)}
        user={currentUser}
      />

      {/* Main Content Area */}
      <main style={{ flex: 1 }}>
        {activeTab === 'glossary' ? (
          <GlossaryHub 
            projectId={gcpConfig.projectId} 
            onSelectTerm={(term) => setSelectedTerm(term)}
            onOpenBulkImport={() => setShowBulkImport(true)}
          />
        ) : (
          <DiscoverySearch 
            projectId={gcpConfig.projectId} 
            onSelectAsset={(asset) => setSelectedAsset(asset)} 
          />
        )}
      </main>

      {/* Discovery Asset Inspection Modal */}
      <AssetDetailModal 
        asset={selectedAsset} 
        onClose={() => setSelectedAsset(null)} 
      />

      {/* Business Glossary Term Pop-Up Modal */}
      <TermDetailModal 
        term={selectedTerm}
        onClose={() => setSelectedTerm(null)}
      />

      {/* Bulk Excel/Sheets Import Modal */}
      {showBulkImport && (
        <BulkImportModal 
          projectId={gcpConfig.projectId}
          onClose={() => setShowBulkImport(false)}
          onSuccess={() => {
            setShowBulkImport(false);
            // Trigger refresh
            window.location.reload();
          }}
        />
      )}

      {/* GCP Project & White-Label Branding Configuration Modal */}
      {showConfig && (
        <ConfigModal 
          config={gcpConfig}
          onUpdateConfig={handleUpdateConfig}
          onClose={() => setShowConfig(false)}
        />
      )}

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-color)', padding: '24px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '64px' }}>
        {gcpConfig.portalTitle || "Google Cloud Knowledge Catalog Portal"} &bull; Logged in as: <strong>{currentUser?.email || "SSO User"}</strong> &bull; Active Scope: <strong>{gcpConfig.projectId}</strong>
      </footer>

    </div>
  );
}

export default App;
