import React, { useState, useEffect } from 'react';
import { Folder, Product, FolderDetail as FolderDetailType } from '../types/api';
import { fetchFolderDetail, createProduct, deleteProduct, getImageUrl } from '../services/api';
import { ArrowLeft, Plus, Trash2, Image as ImageIcon, Loader2, LayoutGrid, List, Search, CheckCircle2 } from 'lucide-react';
import { AddProductModal } from '../components/AddProductModal';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';

interface FolderDetailProps {
  folder: Folder;
  onBack: () => void;
}

const ProductImageCard: React.FC<{ src: string; alt: string; className?: string }> = ({ src, alt, className }) => {
  const [error, setError] = useState(false);

  if (error || !src) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-oliveActive/20 p-2 text-center text-subtleText">
        <ImageIcon className="w-7 h-7 opacity-50 text-olivePrimary mb-1" />
        <span className="text-[10px] font-medium text-darkText truncate max-w-[90%] px-1">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setError(true)}
      className={className || "w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"}
      loading="lazy"
    />
  );
};

export const FolderDetail: React.FC<FolderDetailProps> = ({ folder, onBack }) => {
  const [detail, setDetail] = useState<FolderDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'compact'>('grid');
  const [filterQuery, setFilterQuery] = useState('');

  // Modals
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  const loadDetail = async () => {
    try {
      setLoading(true);
      const data = await fetchFolderDetail(folder.id);
      setDetail(data);
    } catch (err) {
      console.error('Failed to load folder detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [folder.id]);

  const handleAddProduct = async (name: string, file: File, onProgress: (step: string) => void) => {
    await createProduct(folder.id, name, file, onProgress);
    await loadDetail();
  };

  const handleDeleteProduct = async () => {
    if (!deletingProduct) return;
    await deleteProduct(deletingProduct.id);
    await loadDetail();
    setDeletingProduct(null);
  };

  const filteredProducts = (detail?.products || []).filter((p) =>
    p.name.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-left font-sans transition-colors duration-200">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-panelBorder pb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-xs font-semibold text-mutedText hover:text-darkText px-3 py-2 rounded-xl bg-panelBg border border-panelBorder hover:border-olivePrimary transition-all shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Library</span>
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-normal text-darkText font-serif-title">📁 {folder.name}</h1>
            <p className="text-xs text-subtleText mt-0.5">
              {detail ? detail.products.length : folder.product_count} Indexed Image Files
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Search Filter */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-subtleText absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Filter images..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="pl-8 pr-3 py-2 bg-spaceBg border border-panelBorder rounded-xl text-xs text-darkText placeholder-subtleText focus:outline-none focus:border-olivePrimary w-44"
            />
          </div>

          {/* View Toggle */}
          <div className="flex items-center bg-panelBg p-1 rounded-xl border border-panelBorder">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-oliveActive text-olivePrimary' : 'text-subtleText hover:text-darkText'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('compact')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'compact' ? 'bg-oliveActive text-olivePrimary' : 'text-subtleText hover:text-darkText'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setIsAddProductOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-olivePrimary hover:bg-oliveHover text-white font-semibold text-xs shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Image</span>
          </button>
        </div>
      </div>

      {/* Products Display */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-olivePrimary animate-spin" />
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-panelBg rounded-2xl border border-panelBorder p-12 text-center max-w-md mx-auto space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-oliveActive text-olivePrimary flex items-center justify-center mx-auto border border-panelBorder">
            <ImageIcon className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-darkText">No images in this folder</h3>
          <p className="text-xs text-subtleText leading-relaxed">Upload product images to automatically generate visual AI embeddings.</p>
          <button
            onClick={() => setIsAddProductOpen(true)}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-olivePrimary text-white font-semibold text-xs shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Image</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-panelBg rounded-2xl border border-panelBorder overflow-hidden hover:border-olivePrimary hover:bg-oliveActive/40 transition-all flex flex-col justify-between group space-y-3 p-3 shadow-sm"
            >
              <div className="relative aspect-square bg-spaceBg rounded-xl overflow-hidden flex items-center justify-center border border-panelBorder">
                <ProductImageCard
                  src={getImageUrl(product.thumbnail_url || product.image_url)}
                  alt={product.name}
                />
              </div>

              <div className="flex flex-col justify-between space-y-2">
                <div>
                  <h4 className="font-bold text-darkText text-xs truncate" title={product.name}>
                    {product.name}
                  </h4>
                  {product.width && (
                    <div className="text-[10px] text-subtleText mt-0.5">
                      {product.width}x{product.height}px • {product.mime_type?.split('/')[1]?.toUpperCase() || 'JPG'}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-panelBorder flex items-center justify-between">
                  <span className="text-[10px] font-mono text-accentSuccess flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> CLIP Vector Active
                  </span>
                  <button
                    onClick={() => setDeletingProduct(product)}
                    className="p-1.5 text-subtleText hover:text-accentDanger rounded-lg hover:bg-spaceBg transition-colors"
                    title="Delete Image"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Compact List View */
        <div className="bg-panelBg rounded-2xl border border-panelBorder overflow-hidden divide-y divide-panelBorder shadow-sm">
          {filteredProducts.map((product) => (
            <div key={product.id} className="p-3 flex items-center justify-between hover:bg-oliveActive/40 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg overflow-hidden border border-panelBorder bg-spaceBg flex-shrink-0">
                  <ProductImageCard
                    src={getImageUrl(product.thumbnail_url || product.image_url)}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="text-xs font-bold text-darkText">{product.name}</div>
                  <div className="text-[10px] font-mono text-subtleText">
                    SHA: {product.sha256_hash ? product.sha256_hash.substring(0, 12) + '...' : 'Indexed'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-[10px] font-mono text-accentSuccess flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Indexed
                </span>
                <button
                  onClick={() => setDeletingProduct(product)}
                  className="p-1.5 text-subtleText hover:text-accentDanger rounded-lg hover:bg-spaceBg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Product Modal */}
      <AddProductModal
        isOpen={isAddProductOpen}
        folderName={folder.name}
        onClose={() => setIsAddProductOpen(false)}
        onSubmit={handleAddProduct}
      />

      {/* Delete Product Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deletingProduct}
        title="Delete Product Image?"
        message={`Are you sure you want to delete "${deletingProduct?.name}"? This action cannot be undone.`}
        onClose={() => setDeletingProduct(null)}
        onConfirm={handleDeleteProduct}
      />
    </div>
  );
};
