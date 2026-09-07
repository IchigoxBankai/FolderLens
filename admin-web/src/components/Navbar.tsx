import React from 'react';
import { Search, Folder, Copy, Bot, BarChart3, Command, Shield, Sparkles, Layers } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenCommandPalette: () => void;
  onOpenAboutModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenCommandPalette,
  onOpenAboutModal
}) => {
  const navItems = [
    { id: 'landing', label: 'Overview', icon: Sparkles },
    { id: 'dashboard', label: 'Dashboard', icon: Layers },
    { id: 'library', label: 'Library', icon: Folder },
    { id: 'duplicates', label: 'Duplicates', icon: Copy },
    { id: 'assistant', label: 'AI Assistant', icon: Bot },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-panelBg/95 backdrop-blur-md border-b border-panelBorder transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
          <div className="w-9 h-9 rounded-xl bg-spaceBg border border-panelBorder flex items-center justify-center shadow-sm">
            <Search className="w-4 h-4 text-olivePrimary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-darkText tracking-tight text-base font-sans">FOLDERLENS</span>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-oliveActive text-olivePrimary border border-oliveBorder rounded-md">
                v2.0
              </span>
            </div>
            <p className="text-[10px] text-subtleText leading-none">Creative File Intelligence</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-spaceBg/80 p-1 rounded-xl border border-panelBorder">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-oliveActive text-darkText border border-oliveBorder shadow-sm'
                    : 'text-subtleText hover:text-darkText hover:bg-panelBg'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-olivePrimary' : 'text-subtleText'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Command Palette Button */}
          <button
            onClick={onOpenCommandPalette}
            className="flex items-center gap-2 px-3 py-1.5 bg-spaceBg border border-panelBorder rounded-xl text-xs text-mutedText hover:text-darkText hover:border-oliveBorder transition-colors shadow-sm"
          >
            <Command className="w-3.5 h-3.5 text-olivePrimary" />
            <span className="hidden sm:inline">Search...</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] bg-panelBg border border-panelBorder rounded font-mono text-subtleText">
              Ctrl+K
            </kbd>
          </button>

          {/* Architecture Button */}
          <button
            onClick={onOpenAboutModal}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-oliveActive border border-oliveBorder text-olivePrimary rounded-xl text-xs font-medium hover:bg-olivePrimary/20 transition-colors"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Architecture</span>
          </button>
        </div>

      </div>
    </header>
  );
};
