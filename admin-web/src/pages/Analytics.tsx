import React, { useState, useEffect } from 'react';
import { Folder, CheckCircle2, RefreshCw, FileText } from 'lucide-react';
import { AnalyticsResponse } from '../types/api';
import { fetchAnalytics } from '../services/api';

export const Analytics: React.FC = () => {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const res = await fetchAnalytics();
      setData(res);
    } catch (e) {
      console.error('Failed to load analytics:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-left font-sans transition-colors duration-200">
      {/* Header Banner */}
      <div className="flex items-center justify-between border-b border-panelBorder pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-normal text-darkText font-serif-title tracking-wide">
            Library Analytics
          </h1>
          <p className="text-xs sm:text-sm text-subtleText mt-1">
            Visual metrics, folder file breakdowns, format distribution, and indexing activity.
          </p>
        </div>

        <button
          onClick={loadAnalytics}
          disabled={loading}
          className="px-4 py-2 bg-panelBg border border-panelBorder hover:border-olivePrimary text-darkText rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 text-olivePrimary ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-panelBg p-5 rounded-2xl border border-panelBorder space-y-2 shadow-sm">
          <div className="text-[10px] font-bold text-subtleText uppercase tracking-wider">Total Files</div>
          <div className="text-2xl font-semibold text-darkText">{data?.total_files || 0}</div>
          <div className="text-[11px] text-accentSuccess flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> 100% Vector Indexed
          </div>
        </div>

        <div className="bg-panelBg p-5 rounded-2xl border border-panelBorder space-y-2 shadow-sm">
          <div className="text-[10px] font-bold text-subtleText uppercase tracking-wider">Storage Usage</div>
          <div className="text-2xl font-semibold text-olivePrimary">{data?.storage_used_mb || 0} MB</div>
          <div className="text-[11px] text-subtleText">Disk space allocated</div>
        </div>

        <div className="bg-panelBg p-5 rounded-2xl border border-panelBorder space-y-2 shadow-sm">
          <div className="text-[10px] font-bold text-subtleText uppercase tracking-wider">Active Folders</div>
          <div className="text-2xl font-semibold text-darkText">{data?.total_folders || 0}</div>
          <div className="text-[11px] text-subtleText">Organized directories</div>
        </div>

        <div className="bg-panelBg p-5 rounded-2xl border border-panelBorder space-y-2 shadow-sm">
          <div className="text-[10px] font-bold text-subtleText uppercase tracking-wider">Search Activity</div>
          <div className="text-2xl font-semibold text-olivePrimary">{data?.recent_searches_count || 0}</div>
          <div className="text-[11px] text-subtleText">Total queries logged</div>
        </div>
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Folder Distribution */}
        <div className="bg-panelBg p-6 rounded-2xl border border-panelBorder space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-darkText uppercase tracking-wider flex items-center gap-2">
            <Folder className="w-4 h-4 text-olivePrimary" /> Folder File Breakdown
          </h3>

          {!data || data.folder_distribution.length === 0 ? (
            <div className="py-8 text-center text-xs text-subtleText">No folder distribution data available</div>
          ) : (
            <div className="space-y-3">
              {data.folder_distribution.map((f, idx) => {
                const pct = data.total_files > 0 ? Math.round((f.count / data.total_files) * 100) : 0;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium text-darkText">
                      <span>{f.folder_name}</span>
                      <span className="font-mono text-subtleText">{f.count} files ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-spaceBg rounded-full overflow-hidden border border-panelBorder">
                      <div className="h-full bg-olivePrimary rounded-full transition-all duration-500" style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Format Distribution */}
        <div className="bg-panelBg p-6 rounded-2xl border border-panelBorder space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-darkText uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-olivePrimary" /> Image Format Breakdown
          </h3>

          {!data || data.format_distribution.length === 0 ? (
            <div className="py-8 text-center text-xs text-subtleText">No format distribution data available</div>
          ) : (
            <div className="space-y-3">
              {data.format_distribution.map((fmt, idx) => {
                const pct = data.total_files > 0 ? Math.round((fmt.count / data.total_files) * 100) : 0;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium text-darkText">
                      <span>{fmt.format}</span>
                      <span className="font-mono text-subtleText">{fmt.count} files ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-spaceBg rounded-full overflow-hidden border border-panelBorder">
                      <div className="h-full bg-olivePrimary rounded-full transition-all duration-500" style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
