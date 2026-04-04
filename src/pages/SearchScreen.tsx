import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Clock, FileText } from 'lucide-react';
import { caseService } from '@/services/caseService';

interface SearchResult { id: string; patient_name: string; provisional_diagnosis?: string; final_diagnosis?: string; admission_date: string; chief_complaint?: string; status: string; }

const RECENT_KEY = 'medora_recent_searches';
const getRecent = (): string[] => { try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]'); } catch { return []; } };
const saveRecent = (q: string) => {
  const recent = [q, ...getRecent().filter(r => r !== q)].slice(0, 8);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
};

const SearchScreen = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(getRecent);
  const navigate = useNavigate();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Real-time search with 300ms debounce
  useEffect(() => {
    if (!query.trim()) {
      setHasSearched(false);
      setResults([]);
      return;
    }
    // Debounce
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setHasSearched(true);
      try {
        const found = await caseService.search(query.trim());
        setResults(found);
      } finally { setLoading(false); }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const handleSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    saveRecent(q.trim());
    setRecentSearches(getRecent());
  }, []);

  const clearSearch = () => { setQuery(''); setHasSearched(false); setResults([]); };

  return (
    <div className="px-5 py-6 space-y-5 animate-fade-in">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <input type="text" placeholder="Search diagnosis, patient, notes..."
          value={query} onChange={e => setQuery(e.target.value)}
          onBlur={() => query.trim() && handleSearch(query)}
          className="w-full h-12 pl-12 pr-10 bg-card border border-border rounded-2xl text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all shadow-card" />
        {query && (
          <button onClick={clearSearch} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"><X size={16} /></button>
        )}
      </div>

      {!hasSearched && recentSearches.length > 0 && (
        <div>
          <h3 className="text-[12px] font-bold text-muted-foreground uppercase tracking-wide mb-3">Recent Searches</h3>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map(r => (
              <button key={r} onClick={() => { setQuery(r); handleSearch(r); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-full text-[12px] text-foreground hover:border-primary/50 transition-colors">
                <Clock size={11} className="text-muted-foreground" />{r}
              </button>
            ))}
          </div>
        </div>
      )}

      {!hasSearched && recentSearches.length === 0 && (
        <div className="py-16 flex flex-col items-center text-center">
          <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mb-4"><Search size={24} className="text-muted-foreground" /></div>
          <p className="text-[14px] font-semibold text-foreground">Search your cases</p>
          <p className="text-[12px] text-muted-foreground mt-1 max-w-[200px]">Search by patient name, diagnosis, complaints, history, or medications</p>
        </div>
      )}

      {loading && <div className="py-10 text-center text-[13px] text-muted-foreground">Searching...</div>}

      {hasSearched && !loading && (
        <div>
          <h3 className="text-[12px] font-bold text-muted-foreground uppercase tracking-wide mb-3">
            {results.length} Result{results.length !== 1 ? 's' : ''} for "{query}"
          </h3>
          {results.length === 0 ? (
            <div className="py-10 text-center text-[13px] text-muted-foreground">No cases found for "{query}"</div>
          ) : (
            <div className="space-y-3">
              {results.map(r => (
                <div key={r.id} onClick={() => navigate(`/case/${r.id}`)}
                  className="p-3 bg-card border border-border rounded-xl cursor-pointer active:scale-[0.98] transition-all hover:shadow-card">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-primary mt-0.5 shrink-0" />
                      <span className="text-[14px] font-bold text-foreground">{r.patient_name}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {r.status}
                    </span>
                  </div>
                  <p className="text-[12px] text-primary font-medium mt-1 ml-5">{r.provisional_diagnosis ?? r.final_diagnosis ?? 'No diagnosis'}</p>
                  {r.chief_complaint && <p className="text-[11px] text-muted-foreground mt-0.5 ml-5">{r.chief_complaint}</p>}
                  <p className="text-[11px] text-muted-foreground mt-1 ml-5">{new Date(r.admission_date).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchScreen;
