import React, { useState, useEffect } from 'react';
import { Search, FolderPlus, Layers, Copy, Bot, BarChart3, Command, X, ArrowRight, Shield } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
  onOpenCreateFolder: () => void;
  onOpenAboutModal: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onOpenCreateFolder,
  onOpenAboutModal,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const actions = [
    { id: 'dashboard', label: 'Go to Dashboard', icon: Layers, category: 'Navigation', action: () => { onNavigate('dashboard'); onClose(); } },
    { id: 'library', label: 'Browse Image Library', icon: Search, category: 'Navigation', action: () => { onNavigate('library'); onClose(); } },
    { id: 'duplicates', label: 'View Duplicate Intelligence', icon: Copy, category: 'Tools', action: () => { onNavigate('duplicates'); onClose(); } },
    { id: 'assistant', label: 'Open AI Natural Language Assistant', icon: Bot, category: 'AI Tools', action: () => { onNavigate('assistant'); onClose(); } },
    { id: 'analytics', label: 'View Library Analytics', icon: BarChart3, category: 'Analytics', action: () => { onNavigate('analytics'); onClose(); } },
    { id: 'create-folder', label: 'Create New Folder', icon: FolderPlus, category: 'Actions', action: () => { onOpenCreateFolder(); onClose(); } },
    { id: 'about', label: 'About FolderLens (Architecture & Stack)', icon: Shield, category: 'Portfolio', action: () => { onOpenAboutModal(); onClose(); } },
  ];

  const filteredActions = actions.filter(a =>
    a.label.toLowerCase().includes(query.toLowerCase()) ||
    a.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-darkText/40 backdrop-blur-md animate-fade-in text-left">
      <div className="w-full max-w-2xl bg-panelBg border border-panelBorder rounded-2xl shadow-2xl overflow-hidden">
        <div className="relative flex items-center px-4 border-b border-panelBorder">
          <Search className="w-5 h-5 text-subtleText mr-3" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search (e.g., 'duplicates', 'library', 'create folder')..."
            className="w-full py-4 bg-transparent text-darkText placeholder-subtleText text-sm focus:outline-none"
            autoFocus
          />
          <button
            onClick={onClose}
            className="p-1.5 text-subtleText hover:text-darkText hover:bg-spaceBg rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto p-2">
          {filteredActions.length === 0 ? (
            <div className="py-8 text-center text-subtleText text-sm">
              No command matching "{query}"
            </div>
          ) : (
            filteredActions.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-oliveActive/50 transition-colors text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-oliveActive text-olivePrimary group-hover:bg-olivePrimary group-hover:text-white transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-darkText group-hover:text-olivePrimary transition-colors">
                        {item.label}
                      </div>
                      <div className="text-xs text-subtleText">
                        {item.category}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-subtleText group-hover:text-darkText group-hover:translate-x-0.5 transition-all" />
                </button>
              );
            })
          )}
        </div>

        <div className="px-4 py-2.5 bg-spaceBg border-t border-panelBorder flex items-center justify-between text-xs text-subtleText">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-panelBg rounded border border-panelBorder font-mono">↑↓</kbd> navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-panelBg rounded border border-panelBorder font-mono">⏎</kbd> select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-panelBg rounded border border-panelBorder font-mono">esc</kbd> close
            </span>
          </div>
          <div className="flex items-center gap-1 text-olivePrimary">
            <Command className="w-3 h-3" /> FolderLens Palette
          </div>
        </div>
      </div>
    </div>
  );
};
