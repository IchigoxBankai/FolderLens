import React, { useState } from 'react';
import { Send, Folder, RefreshCw, Search, CheckCircle2, Sparkles, MapPin } from 'lucide-react';
import { AssistantResponse } from '../types/api';
import { queryAiAssistant, getImageUrl } from '../services/api';

export const AiAssistant: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<{ query: string; response: AssistantResponse }[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  const suggestedPrompts = [
    'Find "gojo"',
    'Where is gojo',
    'Which folder has shoes?',
    'Show me black electronics',
    'Find wallpaper'
  ];

  const handleSendQuery = async (queryText?: string) => {
    const text = (queryText || prompt).trim();
    if (!text || loading) return;

    try {
      setLoading(true);
      setErrorMsg('');
      const res = await queryAiAssistant(text);
      setHistory((prev) => [{ query: text, response: res }, ...prev]);
      setPrompt('');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'AI Assistant query failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-left font-sans transition-colors duration-200">
      {/* Header Banner */}
      <div className="flex items-center justify-between border-b border-panelBorder pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-normal text-darkText font-serif-title tracking-wide flex items-center gap-2.5">
              <span>FOLDERLENS AI ASSISTANT</span>
              <Sparkles className="w-5 h-5 text-olivePrimary" />
            </h1>
            <span className="px-2.5 py-0.5 text-[10px] font-semibold bg-oliveActive text-olivePrimary border border-panelBorder rounded-md">
              HYBRID FILENAME + CLIP SEARCH
            </span>
          </div>
          <p className="text-xs sm:text-sm text-subtleText mt-1">
            Locate images and discover exactly which folder they belong to using natural questions or file names (e.g. <i>find "gojo"</i>).
          </p>
        </div>
      </div>

      {/* Suggested Query Pills */}
      <div className="space-y-2">
        <span className="text-[10px] font-bold text-subtleText uppercase tracking-wider">Try Asking:</span>
        <div className="flex flex-wrap gap-2">
          {suggestedPrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSendQuery(p)}
              disabled={loading}
              className="px-3 py-1.5 bg-panelBg hover:bg-oliveActive/50 border border-panelBorder hover:border-olivePrimary text-xs text-mutedText hover:text-darkText rounded-xl transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <Search className="w-3 h-3 text-olivePrimary" />
              <span>{p}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Query Input Box */}
      <div className="bg-panelBg p-4 rounded-2xl border border-panelBorder flex items-center gap-3 shadow-sm focus-within:ring-2 focus-within:ring-olivePrimary/30 transition-all">
        <div className="w-2.5 h-2.5 rounded-full bg-olivePrimary animate-pulse"></div>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendQuery()}
          placeholder="Ask: 'find gojo', 'where is the blue shirt', 'which folder has car'..."
          className="flex-1 bg-transparent text-sm text-darkText placeholder-subtleText focus:outline-none"
        />
        <button
          onClick={() => handleSendQuery()}
          disabled={loading || !prompt.trim()}
          className="px-5 py-2.5 bg-olivePrimary hover:bg-oliveHover disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 active:scale-95"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin text-white" /> : <Send className="w-4 h-4" />}
          <span>Search</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:red-400 text-xs">
          {errorMsg}
        </div>
      )}

      {/* Responses Timeline */}
      <div className="space-y-6">
        {history.length === 0 ? (
          <div className="bg-panelBg p-12 rounded-2xl border border-panelBorder text-center space-y-3 text-subtleText shadow-sm">
            <Search className="w-10 h-10 mx-auto text-olivePrimary opacity-40" />
            <div className="text-sm font-medium text-mutedText">No assistant queries executed yet.</div>
            <p className="text-xs text-subtleText max-w-md mx-auto">
              Type any file name or visual description above (e.g. <i>find "gojo"</i> or <i>where is the sneakers</i>) to locate its folder instantly.
            </p>
          </div>
        ) : (
          history.map((item, idx) => (
            <div key={idx} className="bg-panelBg p-6 rounded-2xl border border-panelBorder space-y-4 shadow-sm animate-fade-in">
              <div className="flex items-center justify-between border-b border-panelBorder pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-olivePrimary">Query:</span>
                  <span className="text-xs font-medium text-darkText bg-spaceBg px-2.5 py-1 rounded-lg border border-panelBorder">
                    "{item.query}"
                  </span>
                </div>
                <span className="text-[11px] font-mono text-subtleText bg-spaceBg px-2 py-0.5 rounded border border-panelBorder">
                  {item.response.matches.length} result(s)
                </span>
              </div>

              {/* Highlighted Result Summary Banner */}
              <div className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${
                item.response.found 
                  ? 'bg-sky-50/70 dark:bg-sky-950/20 border-sky-200 dark:border-sky-800 text-darkText' 
                  : 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-darkText'
              }`}>
                {item.response.found ? (
                  <CheckCircle2 className="w-4 h-4 text-olivePrimary mt-0.5 flex-shrink-0" />
                ) : (
                  <Search className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                )}
                <div className="font-medium leading-relaxed">
                  {item.response.message}
                </div>
              </div>

              {/* Found Matches Grid with Folder Cards */}
              {item.response.matches.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                  {item.response.matches.map((cand, cIdx) => (
                    <div key={cIdx} className="bg-spaceBg p-3.5 rounded-xl border border-panelBorder hover:border-olivePrimary/50 transition-all flex flex-col gap-3 group shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 rounded-lg overflow-hidden border border-panelBorder bg-panelBg flex-shrink-0 shadow-inner">
                          <img 
                            src={getImageUrl(cand.product.thumbnail_url || cand.product.image_url)} 
                            alt={cand.product.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                          />
                        </div>
                        <div className="overflow-hidden flex-1 min-w-0">
                          <div className="text-xs font-bold text-darkText truncate" title={cand.product.name}>
                            {cand.product.name}
                          </div>
                          
                          {/* Folder Location Highlight Badge */}
                          <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 bg-oliveActive/80 border border-olivePrimary/30 rounded-md text-[11px] font-semibold text-olivePrimary max-w-full">
                            <Folder className="w-3.5 h-3.5 flex-shrink-0 text-olivePrimary" />
                            <span className="truncate">{cand.folder.name}</span>
                          </div>

                          <div className="text-[10px] text-accentSuccess font-mono mt-1 font-semibold">
                            {cand.confidence}% Match
                          </div>
                        </div>
                      </div>

                      {/* Match Reasons */}
                      {cand.reasons && cand.reasons.length > 0 && (
                        <div className="pt-2 border-t border-panelBorder/70 text-[10px] text-subtleText space-y-0.5">
                          {cand.reasons.map((r, rIdx) => (
                            <div key={rIdx} className="truncate" title={r}>
                              {r}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

