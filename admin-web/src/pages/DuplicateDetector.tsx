import React, { useState, useEffect } from 'react';
import { Copy, Trash2, CheckCircle2, HardDrive, RefreshCw, Layers } from 'lucide-react';
import { DuplicateIntelligenceResponse } from '../types/api';
import { fetchDuplicates, deleteProduct, getImageUrl } from '../services/api';

export const DuplicateDetector: React.FC = () => {
  const [data, setData] = useState<DuplicateIntelligenceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadDuplicates = async () => {
    try {
      setLoading(true);
      const res = await fetchDuplicates();
      setData(res);
    } catch (e) {
      console.error('Failed to fetch duplicates:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDuplicates();
  }, []);

  const handleDeleteDuplicate = async (productId: string) => {
    if (!window.confirm('Are you sure you want to remove this duplicate image from your library?')) return;

    try {
      setDeletingId(productId);
      await deleteProduct(productId);
      await loadDuplicates();
    } catch (err) {
      alert('Failed to delete product duplicate');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-left font-sans transition-colors duration-200">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-panelBorder pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-normal text-darkText font-serif-title tracking-wide">
              DUPLICATE INTELLIGENCE
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-oliveActive text-olivePrimary border border-panelBorder rounded-md">
              HASH SCANNER
            </span>
          </div>
          <p className="text-xs sm:text-sm text-subtleText mt-1">
            Detect exact SHA-256 binary file duplicates and near-duplicate pHash resized images across your library.
          </p>
        </div>

        <button
          onClick={loadDuplicates}
          disabled={loading}
          className="px-4 py-2 bg-panelBg border border-panelBorder hover:border-olivePrimary text-darkText rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 text-olivePrimary ${loading ? 'animate-spin' : ''}`} />
          <span>Rescan Library</span>
        </button>
      </div>

      {/* Savings Metric Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-panelBg p-5 rounded-2xl border border-panelBorder flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-oliveActive text-accentWarning rounded-xl border border-panelBorder">
            <Copy className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-subtleText uppercase tracking-wider">Potential Duplicates</div>
            <div className="text-2xl font-semibold text-darkText">{data?.total_duplicates || 0} files</div>
          </div>
        </div>

        <div className="bg-panelBg p-5 rounded-2xl border border-panelBorder flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-oliveActive text-accentSuccess rounded-xl border border-panelBorder">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-subtleText uppercase tracking-wider">Potential Storage Savings</div>
            <div className="text-2xl font-semibold text-accentSuccess">{data?.potential_savings_mb || 0} MB</div>
          </div>
        </div>

        <div className="bg-panelBg p-5 rounded-2xl border border-panelBorder flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-oliveActive text-olivePrimary rounded-xl border border-panelBorder">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-subtleText uppercase tracking-wider">Duplicate Clusters</div>
            <div className="text-2xl font-semibold text-darkText">{data?.groups.length || 0} groups</div>
          </div>
        </div>
      </div>

      {/* Groups List */}
      {loading ? (
        <div className="py-16 text-center text-subtleText space-y-3">
          <RefreshCw className="w-8 h-8 text-olivePrimary animate-spin mx-auto" />
          <div className="text-xs font-semibold text-darkText">Scanning binary hashes & perceptual vectors...</div>
        </div>
      ) : !data || data.groups.length === 0 ? (
        <div className="bg-panelBg p-12 rounded-2xl border border-panelBorder text-center space-y-3 shadow-sm">
          <CheckCircle2 className="w-12 h-12 text-accentSuccess mx-auto" />
          <h3 className="text-base font-bold text-darkText">Your Library Looks Clean!</h3>
          <p className="text-xs text-subtleText max-w-md mx-auto">
            No exact SHA-256 or near-duplicate pHash images were detected. All stored assets are unique.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {data.groups.map((group, groupIdx) => (
            <div key={groupIdx} className="bg-panelBg p-6 rounded-2xl border border-panelBorder space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-panelBorder pb-3">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${group.match_type === 'exact'
                      ? 'bg-accentDanger/15 text-accentDanger border border-accentDanger/30'
                      : 'bg-accentWarning/15 text-accentWarning border border-accentWarning/30'
                    }`}>
                    {group.match_type === 'exact' ? 'Exact SHA-256 Duplicate' : 'Near-Duplicate dHash Match'}
                  </span>
                  <span className="text-xs font-mono text-subtleText">{group.hash_value}</span>
                </div>
                <span className="text-xs text-accentSuccess font-semibold">
                  Save {roundMb(group.potential_savings_bytes)} MB
                </span>
              </div>

              {/* Side by side product comparison */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.products.map((prod, pIdx) => (
                  <div
                    key={prod.id}
                    className={`bg-spaceBg p-4 rounded-xl border ${pIdx === 0 ? 'border-olivePrimary' : 'border-panelBorder'
                      } flex flex-col justify-between space-y-3 relative`}
                  >
                    {pIdx === 0 && (
                      <span className="absolute top-2 right-2 px-2 py-0.5 text-[9px] font-bold bg-olivePrimary text-white rounded">
                        KEEP PRIMARY
                      </span>
                    )}

                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-lg overflow-hidden border border-panelBorder bg-panelBg">
                        <img src={getImageUrl(prod.thumbnail_url || prod.image_url)} alt="Thumbnail" className="w-full h-full object-cover" />
                      </div>
                      <div className="overflow-hidden">
                        <div className="text-xs font-bold text-darkText truncate">{prod.name}</div>
                        <div className="text-[11px] text-olivePrimary truncate">{prod.folder_name}</div>
                        <div className="text-[10px] text-subtleText mt-0.5">
                          {prod.width}x{prod.height}px • {roundMb(prod.file_size || 0)} MB
                        </div>
                      </div>
                    </div>

                    {pIdx > 0 && (
                      <button
                        onClick={() => handleDeleteDuplicate(prod.id)}
                        disabled={deletingId === prod.id}
                        className="w-full py-2 bg-accentDanger/15 hover:bg-accentDanger/25 text-accentDanger border border-accentDanger/30 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Duplicate</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

function roundMb(bytes: number) {
  return (bytes / (1024 * 1024)).toFixed(2);
}
