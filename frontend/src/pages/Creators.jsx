import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Filter, Users, Star, Loader2, User, 
  ChevronDown, ArrowUpRight, Zap 
} from 'lucide-react';
import api from '../services/api';
import { useTheme } from '../hooks/useTheme';
const CARD_CLASSES = `
  group relative p-5 rounded-2xl transition-all duration-500 
  dark:bg-zinc-200/20 
  border border-zinc-200/40 dark:border-zinc-800/40
  hover:border-zinc-300 dark:hover:border-zinc-700
  hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)]
`;

const Creators = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [creators, setCreators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const fetchCreators = useCallback(async (pageNum = 1, isLoadMore = false) => {
    try {
      setLoading(true);
      const params = { page: pageNum, limit: 12, sort: 'followers_desc', ...filters };
      if (searchQuery) params.q = searchQuery;

      const response = await api.get('/search/creators', { params });

      if (response.data?.success) {
        const newCreators = response.data.creators || [];
        setCreators(prev => isLoadMore ? [...prev, ...newCreators] : newCreators);
        setHasMore(newCreators.length === 12);
        setPage(pageNum);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, searchQuery]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => fetchCreators(1, false), 500);
    return () => clearTimeout(delayDebounce);
  }, [fetchCreators]);

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num || '0';
  };

  return (
    <div className={`relative min-h-screen selection:bg-zinc-200 dark:selection:bg-zinc-800 ${isDark ? 'bg-[#0a0a0a] text-zinc-100' : 'bg-white text-zinc-900'}`}>
      
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        className="relative z-10 max-w-[1100px] mx-auto px-6 py-16"
      >
        {/* --- Header: Refined & Slim --- */}
        <header className="mb-16 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-medium tracking-tight">Influence X</h1>
            <p className="text-sm text-zinc-500 font-light">Explore top creators in tech, gaming, lifestyle and more.</p>
          </div>

          <div className="flex gap-10">
            {[ { l: 'Creators', v: '12K' }, { l: 'Reach', v: '850M' } ].map((stat, i) => (
              <div key={i} className="flex flex-col border-l border-zinc-200 dark:border-zinc-800 pl-4">
                <span className="text-lg font-semibold tracking-tight">{stat.v}</span>
                <span className="text-[10px] text-zinc-400 uppercase tracking-widest">{stat.l}</span>
              </div>
            ))}
          </div>
        </header>

        {/* --- Search: Ultra Minimal --- */}
        <section className="mb-12">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-3 w-4 top-3 h-4 text-zinc-400 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors" />
              <input
                type="text"
                placeholder="Search by name, niche or handle..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-7 py-2 bg-transparent border-b border-zinc-200 dark:border-zinc-800 outline-none text-sm focus:border-zinc-900 dark:focus:border-white transition-all placeholder:text-zinc-400"
              />
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-xs font-medium hover:text-zinc-500 transition-colors"
            >
              <Filter className="w-3.5 h-3.5" />
              Filter
            </button>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="mt-6 p-6 border border-zinc-100 dark:border-zinc-800 rounded-xl grid grid-cols-2 md:grid-cols-4 gap-8"
              >
                <FilterGroup label="Niche">
                  <select 
                    onChange={(e) => setFilters(prev => ({...prev, niche: e.target.value}))}
                    className="w-full bg-transparent text-xs font-medium outline-none cursor-pointer"
                  >
                    <option value="">All Categories</option>
                    <option value="Tech">Technology</option>
                    <option value="Fashion">Fashion</option>
                    <option value="Travel">Lifestyle</option>
                  </select>
                </FilterGroup>
                
                <FilterGroup label="Engagement">
                  <select className="w-full bg-transparent text-xs font-medium outline-none cursor-pointer">
                    <option>Any Level</option>
                    <option>High (5%+)</option>
                    <option>Medium (2-5%)</option>
                  </select>
                </FilterGroup>

                <div className="flex items-end">
                  <button onClick={() => setFilters({})} className="text-[10px] uppercase tracking-tighter text-zinc-400">Clear</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* --- Creator Grid: Clean Layout --- */}
        <section>
          {loading && creators.length === 0 ? (
            <div className="flex items-center justify-center py-32">
              <Loader2 className="w-5 h-5 animate-spin text-zinc-300" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode='popLayout'>
                {creators.map((creator) => (
                  <motion.div
                    key={creator._id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
className={`${CARD_CLASSES} ${isDark ? '!bg-zinc-900' : 'bg-white'}`}                  >
                    <div className="flex items-center gap-4 mb-5">
                     <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
  {creator.profilePicture ? (
    <img
      src={creator.profilePicture}
      alt=""
      className={`w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all ${
        isDark ? 'bg-[#000000] text-zinc-100' : 'bg-white text-zinc-900'
      }`}
    />
  ) : (
    <div className="w-full h-full flex items-center justify-center text-zinc-400">
      <User size={18} />
    </div>
  )}
</div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold truncate tracking-tight">{creator.displayName}</h3>
                        <p className="text-[11px] text-zinc-400 truncate">@{creator.handle}</p>
                      </div>
                      <ArrowUpRight size={14} className="text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors" />
                    </div>

                    <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed mb-6 font-light">
                      {creator.bio || "Digital creator focused on quality content and community."}
                    </p>

                    <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800/50">
                      <div>
                        <p className="text-[9px] text-zinc-400 uppercase tracking-wider">Followers</p>
                        <p className="text-xs font-bold">{formatNumber(creator.totalFollowers)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] text-zinc-400 uppercase tracking-wider">Engage</p>
                        <p className="text-xs font-bold">{creator.averageEngagement?.toFixed(1) || '0.0'}%</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {hasMore && !loading && (
            <div className="flex justify-center mt-16">
              <button
                onClick={() => fetchCreators(page + 1, true)}
                className="text-xs font-medium text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                Show more
              </button>
            </div>
          )}
        </section>
      </motion.div>
    </div>
  );
};

const FilterGroup = ({ label, children }) => (
  <div className="space-y-1">
    <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 block">{label}</label>
    {children}
  </div>
);

export default Creators;  