import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { CommandPalette } from './components/CommandPalette';
import { AboutModal } from './components/AboutModal';
import { LandingPage } from './pages/LandingPage';
import { Dashboard } from './pages/Dashboard';
import { ProductStorage as Library } from './pages/ProductStorage';
import { FolderDetail } from './pages/FolderDetail';
import { DuplicateDetector } from './pages/DuplicateDetector';
import { AiAssistant } from './pages/AiAssistant';
import { Analytics } from './pages/Analytics';
import { Folder } from './types/api';
import { demoLogin } from './services/api';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('landing');
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);

  // Modal States
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.remove('light');
    localStorage.removeItem('folderlens_theme');
    demoLogin().catch((err) => console.log('Demo login init:', err));
  }, []);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab !== 'library') {
      setSelectedFolder(null);
    }
  };

  const handleOpenFolder = (folder: Folder) => {
    setSelectedFolder(folder);
    setActiveTab('library');
  };

  return (
    <div className="min-h-screen bg-spaceBg text-darkText flex flex-col font-sans selection:bg-olivePrimary/30 selection:text-darkText transition-colors duration-200">
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenAboutModal={() => setIsAboutModalOpen(true)}
      />

      <main className="flex-1">
        {activeTab === 'landing' && (
          <LandingPage
            onOpenApp={() => setActiveTab('dashboard')}
            onOpenAboutModal={() => setIsAboutModalOpen(true)}
          />
        )}

        {activeTab === 'dashboard' && (
          <Dashboard
            onNavigateFolder={handleOpenFolder}
            onNavigateTab={handleTabChange}
          />
        )}

        {activeTab === 'library' && (
          selectedFolder ? (
            <FolderDetail
              folder={selectedFolder}
              onBack={() => setSelectedFolder(null)}
            />
          ) : (
            <Library
              onOpenFolder={handleOpenFolder}
            />
          )
        )}

        {activeTab === 'duplicates' && <DuplicateDetector />}

        {activeTab === 'assistant' && <AiAssistant />}

        {activeTab === 'analytics' && <Analytics />}
      </main>

      {/* Command Palette Modal */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={handleTabChange}
        onOpenCreateFolder={() => {
          setActiveTab('library');
        }}
        onOpenAboutModal={() => setIsAboutModalOpen(true)}
      />

      {/* About Architecture Modal */}
      <AboutModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
      />
    </div>
  );
};

export default App;
