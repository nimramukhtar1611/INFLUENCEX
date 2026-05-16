// pages/Brand/SearchCreators.js
import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useTheme } from '../../hooks/useTheme';
import { motion } from "framer-motion";
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, SlidersHorizontal, X, Star, Instagram, Youtube, 
  Globe, ChevronLeft, ChevronRight, Loader, User, Sparkles, 
  ArrowUpRight, MapPin, Users 
} from 'lucide-react';
import brandService from '../../services/brandService';
import campaignService from '../../services/campaignService';
import { formatNumber } from '../../utils/helpers';
import { useSubscription } from '../../context/SubscriptionContext';

const normalizePlanId = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value.trim().toLowerCase();
  if (typeof value.planId === 'string') return value.planId.trim().toLowerCase();
  if (typeof value.id === 'string') return value.id.trim().toLowerCase();
  return '';
};

const SearchCreators = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [creators, setCreators] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [aiMatchingActive, setAiMatchingActive] = useState(false);
  const [aiMatchingCanUse, setAiMatchingCanUse] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const requestIdRef = useRef(0);
  const { currentSubscription } = useSubscription();

  const currentPlanId = normalizePlanId(currentSubscription?.planId || currentSubscription?.plan || currentSubscription);
  const canUseAiMatchingByPlan = ['professional', 'enterprise'].includes(currentPlanId);

  const [filters, setFilters] = useState({
    q: '',
    niche: '',
    minFollowers: '',
    maxFollowers: '',
    minEngagement: '',
    platform: '',
    location: '',
    verified: '',
    available: '',
    sort: 'relevance',
    aiMatching: false,
    campaignId: ''
  });

  useEffect(() => { fetchCreators(); }, [filters, pagination.page]);
  
  useEffect(() => {
    if (canUseAiMatchingByPlan) {
      fetchCampaignOptions();
      return;
    }
    setCampaigns([]);
    setAiMatchingCanUse(false);
  }, [canUseAiMatchingByPlan]);

  const fetchCampaignOptions = async () => {
    try {
      const res = await campaignService.getBrandCampaigns('all', 1, 100);
      setCampaigns(Array.isArray(res?.campaigns) ? res.campaigns : []);
    } catch (error) {
      console.error('Failed to load campaign options:', error);
    }
  };

  const fetchCreators = async () => {
    const requestId = ++requestIdRef.current;
    try {
      setLoading(true);
      const res = await brandService.searchCreators(filters, pagination.page, pagination.limit);
      if (requestId !== requestIdRef.current) return;
      if (res?.success || res?.creators) {
        setCreators(res.creators || []);
        setAiMatchingActive(Boolean(res.aiMatching));
        setAiMatchingCanUse(typeof res?.aiMatchingEntitlement?.canUse === 'boolean' ? res.aiMatchingEntitlement.canUse : canUseAiMatchingByPlan);
        setPagination(res.pagination || { page: 1, limit: 10, total: 0, pages: 1 });
      }
    } catch (e) { console.error('Search error:', e); }
    finally { if (requestId === requestIdRef.current) setLoading(false); }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({ q: '', niche: '', minFollowers: '', maxFollowers: '', minEngagement: '', platform: '', location: '', verified: '', available: '', sort: 'relevance', aiMatching: false, campaignId: '' });
    setAiMatchingActive(false);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const niches = ['Fashion', 'Beauty', 'Fitness', 'Travel', 'Food', 'Tech', 'Gaming', 'Lifestyle', 'Parenting', 'Finance'];
  const platforms = ['instagram', 'youtube', 'tiktok', 'facebook'];

  if (loading && creators.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-zinc-500 mx-auto mb-4" />
          <p className="text-zinc-500 text-xs font-medium">Searching creators...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-6xl mx-auto space-y-6 p-4 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl  tracking-tight"><span className="font-semibold ">Brand</span> <span className="font-bold">Search</span></h1>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Connect with top-tier talent for your brand.</p>
        </div>

        <div className="flex items-center gap-2">
          {aiMatchingActive && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[9px] font-bold uppercase tracking-wider">
              <Sparkles className="w-2.5 h-2.5" /> AI Optimized
            </div>
          )}
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${
              showFilters 
                ? (isDark ? 'bg-black border-white text-white' : 'bg-black border-black text-white')
                : (isDark ? 'border-zinc-800 text-zinc-500' : 'border-zinc-200 text-zinc-500')
            }`}
          >
            <SlidersHorizontal className="w-3 h-3" /> Filters
          </button>
        </div>
      </div>

      {/* Modern Search Bar */}
      <div className="relative group">
        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`} />
        <input 
          type="text" 
          placeholder="Search name, niche, or location..."
          className={`w-full pl-11 pr-4 py-3 rounded-xl border transition-all outline-none text-sm ${
            isDark 
              ? 'bg-zinc-900/50 border-zinc-800 focus:border-zinc-600 text-white' 
              : 'bg-white border-zinc-100 focus:border-zinc-300 shadow-sm'
          }`}
          value={filters.q}
          onChange={e => handleFilterChange('q', e.target.value)}
        />
      </div>

      {/* Expanded Filters Panel */}
      {showFilters && (
        <div className={`p-5 rounded-xl border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} animate-in fade-in slide-in-from-top-2 duration-200`}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div>
              <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block">Niche</label>
              <select 
                value={filters.niche} 
                onChange={e => handleFilterChange('niche', e.target.value)}
                className={`w-full bg-transparent  border-b py-1.5 focus:outline-none text-xs ${isDark ? 'border-zinc-800 !bg-black' : 'border-zinc-200'}`}
              >
                <option value="">All Niches</option>
                {niches.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block">Platform</label>
              <select 
                value={filters.platform} 
                onChange={e => handleFilterChange('platform', e.target.value)}
                className={`w-full bg-transparent border-b py-1.5 focus:outline-none text-xs ${isDark ? 'border-zinc-800 !bg-black' : 'border-zinc-200'}`}
              >
                <option value="">All Platforms</option>
                {platforms.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block">Followers</label>
              <input 
                type="number" 
                placeholder="Min e.g. 10k"
                value={filters.minFollowers}
                onChange={e => handleFilterChange('minFollowers', e.target.value)}
                className={`w-full bg-transparent border-b py-1.5 focus:outline-none text-xs ${isDark ? 'border-zinc-800 !bg-black' : 'border-zinc-200'}`}
              />
            </div>
            <div className="flex items-end">
              <button onClick={clearFilters} className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 hover:text-red-500 transition-colors mb-1.5">Reset All</button>
            </div>
          </div>

          {aiMatchingCanUse && (
            <div className={`mt-6 pt-5 border-t ${isDark ? 'border-zinc-800' : 'border-zinc-100'}`}>
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-tight text-[#667eea]">AI Matching Engine</p>
                  <p className={`text-[10px] ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>Smart scoring based on campaign objectives.</p>
                </div>
                <div className="flex items-center gap-3">
                  {filters.aiMatching && (
                    <select
                      value={filters.campaignId}
                      onChange={(e) => handleFilterChange('campaignId', e.target.value)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200 border'}`}
                    >
                      <option value="">No context</option>
                      {campaigns.map((c) => <option key={c._id} value={c._id}>{c.title}</option>)}
                    </select>
                  )}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={Boolean(filters.aiMatching)}
                      onChange={(e) => {
                        const enabled = e.target.checked;
                        setFilters(prev => ({ ...prev, aiMatching: enabled, sort: enabled ? 'ai_match' : 'relevance' }));
                      }}
                    />
                    <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#667eea]"></div>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Creator Table/List Interface */}
    <div className="space-y-4">
  {/* Row Header - Ultra-wide tracking for an editorial feel */}
  <div className={`hidden md:grid grid-cols-12 px-8 py-3 text-[10px] font-black uppercase tracking-[0.25em] ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
    <div className="col-span-4">Talent Profile</div>
    <div className="col-span-2">Audience Size</div>
    <div className="col-span-2">Engagement</div>
    <div className="col-span-2">AI Match Score</div>
    <div className="col-span-2 text-right">Acquisition</div>
  </div>

  {creators.length > 0 ? (
    creators.map((creator, index) => (
      <div 
        key={creator._id}
        className={`
          group relative grid grid-cols-1 md:grid-cols-12 items-center px-8 py-5 rounded-[2.5rem] border 
          transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
          ${isDark 
            ? 'bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-900 hover:border-zinc-700 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)]' 
            : 'bg-white border-zinc-100 hover:border-zinc-200 hover:shadow-[0_20px_50px_rgba(0,0,0,0.04)]'}
        `}
      >
        {/* Profile Identity: Squircle + Social Badge */}
        <div className="col-span-4 flex items-center gap-5">
          <div className="relative shrink-0">
            <div className={`
              p-1 rounded-[1.4rem] border transition-all duration-700 
              ${isDark ? 'bg-zinc-800 border-zinc-700 group-hover:border-zinc-500' : 'bg-white border-zinc-100 shadow-sm group-hover:border-zinc-300'}
            `}>
              {creator.profilePicture ? (
                <img 
                  src={creator.profilePicture} 
                  className="w-12 h-12 rounded-[1rem] object-cover grayscale group-hover:grayscale-0 transition-all duration-700 ease-in-out group-hover:scale-110" 
                  alt="" 
                />
              ) : (
                <div className={`w-12 h-12 rounded-[1rem] flex items-center justify-center ${isDark ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
                  <User className="w-6 h-6 text-zinc-500 opacity-40" />
                </div>
              )}
            </div>
            {/* Social Floating Badge */}
            {creator.socialMedia?.instagram && (
              <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full shadow-lg border border-zinc-100">
                <Instagram className="w-3 h-3 text-pink-500 fill-current" />
              </div>
            )}
          </div>
          
          <div className="flex flex-col min-w-0">
            <span className={`font-bold text-[15px] tracking-tight leading-tight ${isDark ? 'text-zinc-100 group-hover:text-white' : 'text-zinc-900'}`}>
              {creator.displayName}
            </span>
            <div className="flex items-center gap-1 mt-1">
              <span className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                {creator.niches?.slice(0, 2).join(' • ') || 'General'}
              </span>
            </div>
          </div>
        </div>

        {/* Audience Size: Clean Financial Look */}
        <div className="col-span-2 mt-4 md:mt-0 flex flex-col">
          <span className={`text-lg font-bold tracking-tighter leading-tight ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
            {formatNumber(creator.totalFollowers || 0)}
          </span>
          <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 opacity-50">Reach Potential</span>
        </div>

        {/* Engagement: Emerald Pill */}
        <div className="col-span-2 mt-4 md:mt-0 flex items-center">
          <span className={`
            inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border
            ${isDark 
              ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-500' 
              : 'bg-emerald-50 border-emerald-100 text-emerald-600'}
          `}>
            {creator.averageEngagement?.toFixed(1) || '0'}% Eng.
          </span>
        </div>

        {/* AI Match Score: Gradient Impact */}
        <div className="col-span-2 mt-4 md:mt-0">
          {creator.aiMatch ? (
            <div className="flex flex-col">
              <span className="text-sm text-white font-black bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent italic">
                {creator.aiMatch.score}% MATCH
              </span>
              <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest opacity-40">Predictive Fit</span>
            </div>
          ) : (
            <span className="text-zinc-500 opacity-20 text-xs">--</span>
          )}
        </div>

        {/* Action Col: Inverted Utility Buttons */}
        <div className="col-span-2 mt-4 md:mt-0 flex justify-end gap-2.5">
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(`/brand/createdeal?creator=${creator._id}`)}
            className={`
              p-3 rounded-xl transition-all duration-300 group/btn shadow-sm
              ${isDark 
                ? 'bg-zinc-800 text-zinc-400 hover:bg-white hover:text-black' 
                : 'bg-zinc-100 text-zinc-500 hover:bg-black hover:text-white'}
            `}
            title="Create Deal"
          >
            <ArrowUpRight className="w-4 h-4 transition-transform group-hover/btn:rotate-45" strokeWidth={3} />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(`/brand/creators/${creator._id}`)}
            className={`
              p-3 rounded-xl border transition-all duration-300 group/btn
              ${isDark 
                ? 'border-zinc-800 text-zinc-500 hover:border-zinc-500 hover:text-white' 
                : 'border-zinc-200 text-zinc-400 hover:border-zinc-900 hover:text-zinc-900 shadow-sm'}
            `}
          >
            <User className="w-4 h-4" strokeWidth={2.5} />
          </motion.button>
        </div>
      </div>
    ))
  ) : (
    /* Clean Discovery Empty State */
    <div className={`
      flex flex-col items-center justify-center py-32 rounded-[3.5rem] border-2 border-dashed transition-all
      ${isDark ? 'border-zinc-800 bg-zinc-900/10' : 'border-zinc-100 bg-zinc-50/50'}
    `}>
      <div className={`p-8 rounded-[2.5rem] mb-6 shadow-inner ${isDark ? 'bg-zinc-800/50' : 'bg-white'}`}>
        <Search className="w-12 h-12 text-zinc-500 opacity-20 stroke-[1px]" />
      </div>
      <h3 className="text-lg font-bold tracking-tight">Marketplace Silent</h3>
      <p className="text-[12px] text-zinc-500 mt-2 max-w-[240px] text-center leading-relaxed">
        No creators match your current discovery parameters. Try expanding your niche filters.
      </p>
    </div>
  )}
</div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between pt-6 border-t border-zinc-800/10 dark:border-zinc-200/10">
          <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
            Page {pagination.page} / {pagination.pages}
          </p>
          <div className="flex gap-1.5">
            <button
              onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
              disabled={pagination.page === 1}
              className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 disabled:opacity-30 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
              disabled={pagination.page === pagination.pages}
              className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 disabled:opacity-30 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchCreators;