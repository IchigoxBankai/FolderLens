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
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-xl border-b border-[#E2D7C3] shadow-sm transition-all duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
          <div className="w-9 h-9 rounded-xl bg-[#F8F4EA] border border-[#E2D7C3] flex items-center justify-center shadow-sm">
            <Search className="w-4 h-4 text-[#0284C7]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#0F172A] tracking-tight text-base font-sans">FOLDERLENS</span>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-[#E0F2FE] text-[#0284C7] border border-[#BAE6FD] rounded-md">
                v2.0
              </span>
            </div>
            <p className="text-[10px] text-[#64748B] leading-none">Creative File Intelligence</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-[#F8F4EA] p-1 rounded-xl border border-[#E2D7C3] shadow-inner">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-white text-[#0284C7] border border-[#BAE6FD] shadow-sm'
                    : 'text-[#475569] hover:text-[#0F172A] hover:bg-white/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#0284C7]' : 'text-[#64748B]'}`} />
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
            className="flex items-center gap-2 px-3 py-1.5 bg-[#F8F4EA] border border-[#E2D7C3] rounded-xl text-xs text-[#334155] hover:text-[#0F172A] hover:border-[#0284C7] transition-colors shadow-sm"
          >
            <Command className="w-3.5 h-3.5 text-[#0284C7]" />
            <span className="hidden sm:inline font-medium">Search...</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] bg-white border border-[#E2D7C3] rounded font-mono text-[#64748B]">
              Ctrl+K
            </kbd>
          </button>

          {/* Architecture Button */}
          <button
            onClick={onOpenAboutModal}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-[#E0F2FE] border border-[#BAE6FD] text-[#0284C7] rounded-xl text-xs font-medium hover:bg-[#BAE6FD]/40 transition-colors shadow-sm"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Architecture</span>
          </button>
        </div>

      </div>
    </header>
  );
};
