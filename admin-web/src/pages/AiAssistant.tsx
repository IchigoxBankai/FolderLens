import React, { useState } from 'react';
import { Send, Folder, RefreshCw, Search } from 'lucide-react';
import { AssistantResponse } from '../types/api';
import { queryAiAssistant, getImageUrl } from '../services/api';

export const AiAssistant: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<{ query: string; response: AssistantResponse }[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  const suggestedPrompts = [
    'Find all Nike shoes',
    'Which folder has charger products?',
    'Show me black electronics',
    'Show recently added images'
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
            <h1 className="text-2xl sm:text-3xl font-normal text-darkText font-serif-title tracking-wide">
              FOLDERLENS ASSIST
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-oliveActive text-olivePrimary border border-panelBorder rounded-md">
              CLIP TEXT EMBEDDING
            </span>
          </div>
          <p className="text-xs sm:text-sm text-subtleText mt-1">
            Ask about your visual library using natural language prompts.
          </p>
        </div>
      </div>

      {/* Suggested Query Pills */}
      <div className="space-y-2">
        <span className="text-[10px] font-bold text-subtleText uppercase tracking-wider">Suggested Queries</span>
        <div className="flex flex-wrap gap-2">
          {suggestedPrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSendQuery(p)}
              disabled={loading}
              className="px-3 py-1.5 bg-panelBg hover:bg-oliveActive/40 border border-panelBorder hover:border-olivePrimary text-xs text-mutedText hover:text-darkText rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Search className="w-3 h-3 text-olivePrimary" />
              <span>{p}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Query Input Box */}
      <div className="bg-panelBg p-4 rounded-2xl border border-panelBorder flex items-center gap-3 shadow-sm">
        <div className="w-2 h-2 rounded-full bg-olivePrimary"></div>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendQuery()}
          placeholder="Ask about your visual library (e.g. 'Find black shoes', 'Charger cables')..."
          className="flex-1 bg-transparent text-xs text-darkText placeholder-subtleText focus:outline-none"
        />
        <button
          onClick={() => handleSendQuery()}
          disabled={loading || !prompt.trim()}
          className="px-4 py-2 bg-olivePrimary hover:bg-oliveHover disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin text-white" /> : <Send className="w-4 h-4" />}
          <span>Search</span>
        </button>
      </div>

      {/* Responses Timeline */}
      <div className="space-y-6">
        {history.length === 0 ? (
          <div className="bg-panelBg p-12 rounded-2xl border border-panelBorder text-center space-y-3 text-subtleText shadow-sm">
            <Search className="w-10 h-10 mx-auto text-olivePrimary opacity-40" />
            <div className="text-xs font-medium text-mutedText">No search query executed yet. Type a question above!</div>
          </div>
        ) : (
          history.map((item, idx) => (
            <div key={idx} className="bg-panelBg p-6 rounded-2xl border border-panelBorder space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-panelBorder pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-olivePrimary">Query:</span>
                  <span className="text-xs text-darkText font-medium">"{item.query}"</span>
                </div>
                <span className="text-[11px] font-mono text-subtleText">{item.response.matches.length} match(es)</span>
              </div>

              <div className="text-xs text-mutedText flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-olivePrimary"></span>
                <span>{item.response.message}</span>
              </div>

              {item.response.matches.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                  {item.response.matches.map((cand, cIdx) => (
                    <div key={cIdx} className="bg-spaceBg p-3 rounded-xl border border-panelBorder flex items-center gap-3">
                      <div className="w-14 h-14 rounded-lg overflow-hidden border border-panelBorder bg-panelBg flex-shrink-0">
                        <img src={getImageUrl(cand.product.thumbnail_url || cand.product.image_url)} alt="Product" className="w-full h-full object-cover" />
                      </div>
                      <div className="overflow-hidden">
                        <div className="text-xs font-bold text-darkText truncate">{cand.product.name}</div>
                        <div className="text-[11px] text-olivePrimary flex items-center gap-1 mt-0.5">
                          <Folder className="w-3 h-3" />
                          <span className="truncate">{cand.folder.name}</span>
                        </div>
                        <div className="text-[10px] text-accentSuccess mt-0.5 font-mono">{cand.confidence}% Match</div>
                      </div>
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
