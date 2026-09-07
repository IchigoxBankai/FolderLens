import React, { useState, useEffect } from 'react';
import { Folder } from '../types/api';
import { fetchFolders, createFolder, uploadFolderFromPC, renameFolder, deleteFolder } from '../services/api';
import { FolderUp, Folder as FolderIcon, MoreVertical, Edit2, Trash2, ArrowRight, Package, Loader2, Search } from 'lucide-react';
import { AddFolderModal } from '../components/AddFolderModal';
import { CreateFolderModal } from '../components/CreateFolderModal';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';

interface ProductStorageProps {
  onOpenFolder: (folder: Folder) => void;
}

export const ProductStorage: React.FC<ProductStorageProps> = ({ onOpenFolder }) => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal States
  const [isAddFolderOpen, setIsAddFolderOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [deletingFolder, setDeletingFolder] = useState<Folder | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const loadFolders = async () => {
    try {
      setLoading(true);
      const data = await fetchFolders();
      setFolders(data);
    } catch (err) {
      console.error('Failed to load folders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFolders();
  }, []);

  const handleUploadFolderFromPC = async (name: string, files: File[], onProgress: (msg: string) => void) => {
    await uploadFolderFromPC(name, files, onProgress);
    await loadFolders();
  };

  const handleCreateEmptyFolder = async (name: string) => {
    await createFolder(name);
    await loadFolders();
  };

  const handleRenameFolder = async (name: string) => {
    if (!editingFolder) return;
    await renameFolder(editingFolder.id, name);
    await loadFolders();
    setEditingFolder(null);
  };

  const handleDeleteFolder = async () => {
    if (!deletingFolder) return;
    await deleteFolder(deletingFolder.id);
    await loadFolders();
    setDeletingFolder(null);
  };

  const filteredFolders = folders.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-left space-y-8 font-sans transition-colors duration-200">
      {/* Top Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-panelBorder pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-normal text-darkText font-serif-title tracking-wide">Image Library & Folders</h1>
          <p className="text-xs sm:text-sm text-subtleText mt-1">Organize product images into folders with automated CLIP vector fingerprint indexing.</p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-4 h-4 text-subtleText absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search folders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-spaceBg border border-panelBorder rounded-xl text-xs text-darkText placeholder-subtleText focus:outline-none focus:border-olivePrimary w-52"
            />
          </div>
          <button
            onClick={() => setIsAddFolderOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-olivePrimary hover:bg-oliveHover text-white font-semibold text-xs shadow-md transition-all"
          >
            <FolderUp className="w-4 h-4" />
            <span>+ Create / Upload Folder</span>
          </button>
        </div>
      </div>

      {/* Folders Display Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-olivePrimary animate-spin" />
        </div>
      ) : filteredFolders.length === 0 ? (
        <div className="bg-panelBg rounded-2xl border border-panelBorder p-12 text-center max-w-md mx-auto space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-oliveActive text-olivePrimary flex items-center justify-center mx-auto border border-panelBorder">
            <FolderIcon className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-darkText">No folders found</h3>
          <p className="text-xs text-subtleText leading-relaxed">Import an image folder from your PC or create a new folder to begin indexing images.</p>
          <button
            onClick={() => setIsAddFolderOpen(true)}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-olivePrimary text-white font-semibold text-xs shadow-md transition-all"
          >
            <FolderUp className="w-4 h-4" />
            <span>+ Add Folder</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFolders.map((folder) => (
            <div
              key={folder.id}
              className="bg-panelBg p-6 rounded-2xl border border-panelBorder hover:border-olivePrimary hover:bg-oliveActive/40 transition-all relative flex flex-col justify-between group space-y-4 shadow-sm"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-oliveActive text-olivePrimary flex items-center justify-center mb-2 border border-panelBorder">
                    <FolderIcon className="w-5 h-5 text-olivePrimary" />
                  </div>

                  <div className="relative">
                    <button
                      onClick={() => setActiveMenuId(activeMenuId === folder.id ? null : folder.id)}
                      className="p-2 text-subtleText hover:text-darkText rounded-lg hover:bg-spaceBg transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {activeMenuId === folder.id && (
                      <div className="absolute right-0 top-10 w-36 bg-panelBg rounded-xl shadow-xl border border-panelBorder py-1.5 z-20 animate-fade-in">
                        <button
                          onClick={() => {
                            setEditingFolder(folder);
                            setActiveMenuId(null);
                          }}
                          className="w-full px-4 py-2 text-left text-xs font-medium text-darkText hover:bg-spaceBg flex items-center space-x-2"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-subtleText" />
                          <span>Rename</span>
                        </button>
                        <button
                          onClick={() => {
                            setDeletingFolder(folder);
                            setActiveMenuId(null);
                          }}
                          className="w-full px-4 py-2 text-left text-xs font-medium text-accentDanger hover:bg-accentDanger/10 flex items-center space-x-2"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-accentDanger" />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <h3 className="text-sm font-bold text-darkText truncate group-hover:text-olivePrimary transition-colors">
                  📁 {folder.name}
                </h3>
                <div className="flex items-center space-x-2 text-subtleText text-xs font-medium mt-1">
                  <Package className="w-3.5 h-3.5 text-olivePrimary" />
                  <span>{folder.product_count} {folder.product_count === 1 ? 'Image' : 'Images'}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-panelBorder flex items-center justify-between">
                <button
                  onClick={() => onOpenFolder(folder)}
                  className="flex items-center space-x-2 text-xs font-semibold text-olivePrimary hover:underline group-hover:translate-x-0.5 transition-all"
                >
                  <span>Open Folder</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Folder Modal (Folder picker from PC) */}
      <AddFolderModal
        isOpen={isAddFolderOpen}
        onClose={() => setIsAddFolderOpen(false)}
        onUploadFolder={handleUploadFolderFromPC}
        onCreateEmptyFolder={handleCreateEmptyFolder}
      />

      {/* Rename Folder Modal */}
      <CreateFolderModal
        isOpen={!!editingFolder}
        isEdit={true}
        initialName={editingFolder?.name || ''}
        onClose={() => setEditingFolder(null)}
        onSubmit={handleRenameFolder}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deletingFolder}
        title="Delete Folder?"
        message={`This folder contains ${deletingFolder?.product_count || 0} images. Deleting this folder will permanently remove all stored product files and their visual AI embeddings.`}
        onClose={() => setDeletingFolder(null)}
        onConfirm={handleDeleteFolder}
      />
    </div>
  );
};
