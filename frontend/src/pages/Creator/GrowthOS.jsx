import React, { useEffect, useState, useRef } from 'react';
import { Lightbulb, RefreshCw, Clock3, Sparkles, Users, Loader, AlertCircle, Target, Activity, TrendingUp, ChevronLeft, ChevronRight, ArrowUpRight, Calendar } from 'lucide-react';
import creatorService from '../../services/creatorService';
import Button from '../../components/UI/Button';
import toast from 'react-hot-toast';
import { useTheme } from '../../hooks/useTheme';

const CreatorGrowthOS = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ideasLoading, setIdeasLoading] = useState(false);
  const [ideasRefreshLoading, setIdeasRefreshLoading] = useState(false);
  const [growthOS, setGrowthOS] = useState(null);
  const [contentType, setContentType] = useState('general');
  const [error, setError] = useState('');
  const fetchedRef = useRef(false);

  const fetchGrowthOS = async (showToast = false, options = {}) => {
    const ideasOnly = Boolean(options.onlyIdeas);
    const refreshingIdeas = Boolean(options.refreshIdeas);

    try {
      if (ideasOnly) {
        if (refreshingIdeas) {
          setIdeasRefreshLoading(true);
        } else {
          setIdeasLoading(true);
        }
      } else if (showToast) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');
      const params = {
        contentType: options.contentType || contentType,
      };
      if (refreshingIdeas) {
        params.refreshToken = `${Date.now()}`;
      }

      const response = await creatorService.getGrowthOS(params);

      if (response?.success) {
        setGrowthOS(response.growthOS || null);
        setContentType(response.growthOS?.selectedContentType || params.contentType || 'general');
        if (showToast && !ideasOnly) toast.success('Growth OS refreshed');
      } else {
        setError(response?.error || 'Failed to load growth suggestions');
        if (!ideasOnly) setGrowthOS(null);
      }
    } catch (err) {
      console.error('Growth OS page fetch error:', err);
      setError('Failed to load growth suggestions');
      if (!ideasOnly) setGrowthOS(null);
    } finally {
      if (ideasOnly) {
        setIdeasRefreshLoading(false);
        setIdeasLoading(false);
      } else if (showToast) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchGrowthOS();
      fetchedRef.current = true;
    }
  }, []);

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center`}>
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-zinc-500 mx-auto mb-4" />
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Loading Creator Growth OS...</p>
        </div>
      </div>
    );
  }

  const postingInsights = growthOS?.postingInsights || [];
  const contentIdeas = growthOS?.contentIdeas || [];
  const audienceTips = growthOS?.audienceImprovementTips || [];
  const contentTypeOptions = growthOS?.availableContentTypes || [
    { value: 'general', label: 'General' },
    { value: 'fashion', label: 'Fashion' },
    { value: 'beauty', label: 'Beauty' },
    { value: 'technology', label: 'Technology' },
    { value: 'food & beverage', label: 'Food & Beverage' },
    { value: 'fitness', label: 'Fitness' },
    { value: 'travel', label: 'Travel' },
    { value: 'gaming', label: 'Gaming' },
    { value: 'lifestyle', label: 'Lifestyle' },
    { value: 'parenting', label: 'Parenting' },
    { value: 'finance', label: 'Finance' },
    { value: 'education', label: 'Education' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'sports', label: 'Sports' },
    { value: 'automotive', label: 'Automotive' },
    { value: 'real estate', label: 'Real Estate' },
    { value: 'health', label: 'Health' },
    { value: 'wellness', label: 'Wellness' },
    { value: 'other', label: 'Other' }
  ];

  return (
    <div className={`max-w-7xl mx-auto p-6 space-y-8 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-left">
          <div className="flex items-center gap-3 mb-2 group">
            <div className={`
              p-2 rounded-lg transition-all duration-500 transform 
              group-hover:scale-110 group-hover:rotate-12 group-hover:animate-pulse
              ${isDark 
                ? 'bg-zinc-800 text-zinc-400 group-hover:bg-zinc-600 group-hover:text-white' 
                : 'bg-zinc-100 text-zinc-600 group-hover:bg-zinc-800 group-hover:text-white'}
            `}>
              <Lightbulb className="transition-all duration-500 group-hover:animate-bounce" size={18} strokeWidth={2.5} />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight transition-colors duration-300 group-hover:text-zinc-600">
              Creator <span className="font-bold">Growth OS</span>
            </h1>
          </div>
          <p className="text-sm text-zinc-500">Platform-specific suggestions for posting times, ideas, and audience quality growth.</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={RefreshCw}
          loading={refreshing}
          onClick={() => fetchGrowthOS(true)}
          className="text-xs font-bold uppercase tracking-widest"
        >
          Refresh
        </Button>
      </div>

      {/* Stats Cards - Dashboard Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`
          relative overflow-hidden p-5 rounded-[1.5rem] border transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]
          h-full flex flex-col justify-between group
          ${isDark 
            ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-600 hover:shadow-[0_15px_30px_rgba(0,0,0,0.3)]' 
            : 'bg-white border-zinc-100 hover:border-zinc-300 hover:shadow-[0_15px_30px_rgba(0,0,0,0.03)]'}
          hover:-translate-y-1
        `}>
          {/* Subtle Background Glow */}
          <div className={`
            absolute -right-6 -top-6 w-24 h-24 blur-3xl rounded-full opacity-0 hover:opacity-15 transition-opacity duration-700
            ${isDark ? 'bg-white' : 'bg-black'}
          `} />

          <div className="flex justify-between items-start relative z-10">
            <div className={`
              p-2.5 rounded-xl transition-all duration-500 transform 
              group-hover:scale-110 group-hover:rotate-12 group-hover:animate-pulse
              ${isDark 
                ? 'bg-zinc-800 text-zinc-400 group-hover:bg-white group-hover:text-black' 
                : 'bg-zinc-50 text-zinc-500 group-hover:bg-black group-hover:text-white'}
            `}>
              <Activity className="transition-all duration-500 group-hover:animate-bounce" size={16} strokeWidth={2.5} />
            </div>
          </div>

          <div className="mt-6 relative z-10">
            <h3 className={`
              text-[9px] font-black uppercase tracking-[0.2em] mb-1 transition-colors duration-500
              ${isDark ? 'text-zinc-600 hover:text-zinc-400' : 'text-zinc-400 hover:text-zinc-600'}
            `}>
              Platforms
            </h3>
            
            <div className="flex items-baseline gap-2">
              <p className={`
                text-2xl font-mono font-bold tracking-tighter transition-all duration-500
                ${isDark ? 'text-white' : 'text-black'}
              `}>
                {postingInsights.length}
              </p>
              
              <div className={`
                h-[2px] w-0 hover:w-6 rounded-full transition-all duration-700 ease-out
                ${isDark ? 'bg-zinc-700 hover:bg-white' : 'bg-zinc-200 hover:bg-black'}
              `} />
            </div>
          </div>
        </div>

        <div className={`
          relative overflow-hidden p-5 rounded-[1.5rem] border transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]
          h-full flex flex-col justify-between group
          ${isDark 
            ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-600 hover:shadow-[0_15px_30px_rgba(0,0,0,0.3)]' 
            : 'bg-white border-zinc-100 hover:border-zinc-300 hover:shadow-[0_15px_30px_rgba(0,0,0,0.03)]'}
          hover:-translate-y-1
        `}>
          {/* Subtle Background Glow */}
          <div className={`
            absolute -right-6 -top-6 w-24 h-24 blur-3xl rounded-full opacity-0 hover:opacity-15 transition-opacity duration-700
            ${isDark ? 'bg-white' : 'bg-black'}
          `} />

          <div className="flex justify-between items-start relative z-10">
            <div className={`
              p-2.5 rounded-xl transition-all duration-500 transform 
              group-hover:scale-110 group-hover:rotate-12 group-hover:animate-pulse
              ${isDark 
                ? 'bg-zinc-800 text-zinc-400 group-hover:bg-white group-hover:text-black' 
                : 'bg-zinc-50 text-zinc-500 group-hover:bg-black group-hover:text-white'}
            `}>
              <Sparkles className="transition-all duration-500 group-hover:animate-bounce" size={16} strokeWidth={2.5} />
            </div>
          </div>

          <div className="mt-6 relative z-10">
            <h3 className={`
              text-[9px] font-black uppercase tracking-[0.2em] mb-1 transition-colors duration-500
              ${isDark ? 'text-zinc-600 hover:text-zinc-400' : 'text-zinc-400 hover:text-zinc-600'}
            `}>
              Content Ideas
            </h3>
            
            <div className="flex items-baseline gap-2">
              <p className={`
                text-2xl font-mono font-bold tracking-tighter transition-all duration-500
                ${isDark ? 'text-white' : 'text-black'}
              `}>
                {contentIdeas.length}
              </p>
              
              <div className={`
                h-[2px] w-0 hover:w-6 rounded-full transition-all duration-700 ease-out
                ${isDark ? 'bg-zinc-700 hover:bg-white' : 'bg-zinc-200 hover:bg-black'}
              `} />
            </div>
          </div>
        </div>

        <div className={`
          relative overflow-hidden p-5 rounded-[1.5rem] border transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]
          h-full flex flex-col justify-between group
          ${isDark 
            ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-600 hover:shadow-[0_15px_30px_rgba(0,0,0,0.3)]' 
            : 'bg-white border-zinc-100 hover:border-zinc-300 hover:shadow-[0_15px_30px_rgba(0,0,0,0.03)]'}
          hover:-translate-y-1
        `}>
          {/* Subtle Background Glow */}
          <div className={`
            absolute -right-6 -top-6 w-24 h-24 blur-3xl rounded-full opacity-0 hover:opacity-15 transition-opacity duration-700
            ${isDark ? 'bg-white' : 'bg-black'}
          `} />

          <div className="flex justify-between items-start relative z-10">
            <div className={`
              p-2.5 rounded-xl transition-all duration-500 transform 
              group-hover:scale-110 group-hover:rotate-12 group-hover:animate-pulse
              ${isDark 
                ? 'bg-zinc-800 text-zinc-400 group-hover:bg-white group-hover:text-black' 
                : 'bg-zinc-50 text-zinc-500 group-hover:bg-black group-hover:text-white'}
            `}>
              <Users className="transition-all duration-500 group-hover:animate-bounce" size={16} strokeWidth={2.5} />
            </div>
          </div>

          <div className="mt-6 relative z-10">
            <h3 className={`
              text-[9px] font-black uppercase tracking-[0.2em] mb-1 transition-colors duration-500
              ${isDark ? 'text-zinc-600 hover:text-zinc-400' : 'text-zinc-400 hover:text-zinc-600'}
            `}>
              Audience Tips
            </h3>
            
            <div className="flex items-baseline gap-2">
              <p className={`
                text-2xl font-mono font-bold tracking-tighter transition-all duration-500
                ${isDark ? 'text-white' : 'text-black'}
              `}>
                {audienceTips.length}
              </p>
              
              <div className={`
                h-[2px] w-0 hover:w-6 rounded-full transition-all duration-700 ease-out
                ${isDark ? 'bg-zinc-700 hover:bg-white' : 'bg-zinc-200 hover:bg-black'}
              `} />
            </div>
          </div>
        </div>

        <div className={`
          relative overflow-hidden p-5 rounded-[1.5rem] border transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]
          h-full flex flex-col justify-between group
          ${isDark 
            ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-600 hover:shadow-[0_15px_30px_rgba(0,0,0,0.3)]' 
            : 'bg-white border-zinc-100 hover:border-zinc-300 hover:shadow-[0_15px_30px_rgba(0,0,0,0.03)]'}
          hover:-translate-y-1
        `}>
          {/* Subtle Background Glow */}
          <div className={`
            absolute -right-6 -top-6 w-24 h-24 blur-3xl rounded-full opacity-0 hover:opacity-15 transition-opacity duration-700
            ${isDark ? 'bg-white' : 'bg-black'}
          `} />

          <div className="flex justify-between items-start relative z-10">
            <div className={`
              p-2.5 rounded-xl transition-all duration-500 transform 
              group-hover:scale-110 group-hover:rotate-12 group-hover:animate-pulse
              ${isDark 
                ? 'bg-zinc-800 text-zinc-400 group-hover:bg-white group-hover:text-black' 
                : 'bg-zinc-50 text-zinc-500 group-hover:bg-black group-hover:text-white'}
            `}>
              <TrendingUp className="transition-all duration-500 group-hover:animate-bounce" size={16} strokeWidth={2.5} />
            </div>
          </div>

          <div className="mt-6 relative z-10">
            <h3 className={`
              text-[9px] font-black uppercase tracking-[0.2em] mb-1 transition-colors duration-500
              ${isDark ? 'text-zinc-600 hover:text-zinc-400' : 'text-zinc-400 hover:text-zinc-600'}
            `}>
              Growth Score
            </h3>
            
            <div className="flex items-baseline gap-2">
              <p className={`
                text-2xl font-mono font-bold tracking-tighter transition-all duration-500
                ${isDark ? 'text-white' : 'text-black'}
              `}>
                87%
              </p>
              
              <div className={`
                h-[2px] w-0 hover:w-6 rounded-full transition-all duration-700 ease-out
                ${isDark ? 'bg-zinc-700 hover:bg-white' : 'bg-zinc-200 hover:bg-black'}
              `} />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 border ${
          isDark ? 'bg-red-950/40 border-red-900' : 'bg-red-50 border-red-200'
        }`}>
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className={`text-sm ${isDark ? 'text-red-300' : 'text-red-700'}`}>{error}</p>
        </div>
      )}

      <div className="space-y-8">
        {/* Best Posting Time Section */}
        <section className="space-y-8">
          <div className="flex items-center gap-4 group">
            <div className={`
              p-3 rounded-xl transition-all duration-500 transform 
              group-hover:scale-110 group-hover:rotate-12 group-hover:animate-pulse
              ${isDark 
                ? 'bg-zinc-800 text-zinc-400 group-hover:bg-zinc-600 group-hover:text-white' 
                : 'bg-zinc-100 text-zinc-600 group-hover:bg-zinc-800 group-hover:text-white'}
            `}>
              <Clock3 className="transition-all duration-500 group-hover:animate-bounce" size={18} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 group-hover:text-zinc-300 transition-colors duration-300">
                Best Posting Time
              </h2>
              <p className={`text-xs mt-1 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                Optimal windows for maximum engagement
              </p>
            </div>
          </div>

          {postingInsights.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {postingInsights.map((insight, index) => (
                <div
                  key={insight.platform}
                  className={`
                    relative overflow-hidden p-6 rounded-2xl border transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]
                    group hover:-translate-y-2 hover:shadow-2xl
                    ${isDark 
                      ? 'bg-zinc-900/80 border-zinc-800/60 hover:border-zinc-600 hover:shadow-[0_25px_50px_rgba(0,0,0,0.3)]' 
                      : 'bg-white border-zinc-100/50 hover:border-zinc-300 hover:shadow-[0_25px_50px_rgba(0,0,0,0.1)]'}
                  `}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Background Gradient */}
                  <div className={`
                    absolute inset-0 bg-gradient-to-br from-zinc-500/5 to-zinc-600/5 
                    opacity-0 group-hover:opacity-100 transition-opacity duration-700
                  `} />
                  
                  {/* Platform Header */}
                  <div className="flex items-center justify-between mb-6 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className={`
                        p-2 rounded-lg transition-all duration-500
                        ${isDark 
                          ? 'bg-zinc-800/50 text-zinc-400 group-hover:bg-zinc-600 group-hover:text-white' 
                          : 'bg-zinc-100 text-zinc-600 group-hover:bg-zinc-800 group-hover:text-white'}
                      `}>
                        <Activity size={16} strokeWidth={2.5} />
                      </div>
                      <h3 className={`text-lg font-bold capitalize transition-colors duration-300 ${
                        isDark ? 'text-zinc-100 group-hover:text-white' : 'text-zinc-900 group-hover:text-zinc-900'
                      }`}>
                        {insight.platform}
                      </h3>
                    </div>
                    <div className={`
                      px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border
                      transition-all duration-500 transform group-hover:scale-110
                      ${isDark 
                        ? 'bg-zinc-800/50 text-zinc-300 border-zinc-700/50 group-hover:bg-zinc-600 group-hover:text-white group-hover:border-zinc-600' 
                        : 'bg-zinc-100 text-zinc-700 border-zinc-200 group-hover:bg-zinc-800 group-hover:text-white group-hover:border-zinc-800'}
                    `}>
                      <span className="inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                        {insight.confidence}
                      </span>
                    </div>
                  </div>

                  {/* Time Windows */}
                  <div className="space-y-3 relative z-10">
                    {(insight.windows || []).map((window, windowIndex) => (
                      <div
                        key={`${insight.platform}-${window.label}`}
                        className={`
                          p-4 rounded-xl border transition-all duration-500
                          hover:scale-[1.02] hover:shadow-lg
                          ${isDark 
                            ? 'bg-zinc-800/50 border-zinc-700/50 hover:bg-zinc-800 hover:border-zinc-600' 
                            : 'bg-zinc-50/50 border-zinc-200/50 hover:bg-white hover:border-zinc-300'}
                        `}
                        style={{ animationDelay: `${(index * 100) + (windowIndex * 50)}ms` }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className={`text-sm font-semibold transition-colors duration-300 ${
                            isDark ? 'text-zinc-100 group-hover:text-zinc-200' : 'text-zinc-900 group-hover:text-zinc-700'
                          }`}>
                            {window.label}
                          </p>
                          <div className={`
                            w-2 h-2 rounded-full bg-zinc-500 opacity-0 group-hover:opacity-100
                            transition-all duration-500 group-hover:animate-pulse
                          `} />
                        </div>
                        <p className={`text-xs leading-relaxed transition-colors duration-300 ${
                          isDark ? 'text-zinc-400 group-hover:text-zinc-300' : 'text-zinc-600 group-hover:text-zinc-500'
                        }`}>
                          {window.reason}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Decorative Element */}
                  <div className={`
                    absolute -bottom-2 -right-2 w-16 h-16 rounded-full
                    bg-gradient-to-br from-zinc-500/10 to-zinc-600/10
                    opacity-0 group-hover:opacity-100 transition-all duration-700
                    group-hover:scale-150
                  `} />
                </div>
              ))}
            </div>
          ) : (
            <div className={`
              relative overflow-hidden p-12 rounded-3xl border text-center transition-all duration-500
              ${isDark ? 'bg-zinc-900/50 border-zinc-800/50' : 'bg-zinc-50/50 border-zinc-200/50'}
            `}>
              <div className={`
                p-6 rounded-2xl mb-6 mx-auto w-fit transition-all duration-500
                ${isDark ? 'bg-zinc-800/50' : 'bg-white/50'}
              `}>
                <Clock3 className={`w-12 h-12 ${isDark ? 'text-zinc-600' : 'text-zinc-400'} animate-pulse`} strokeWidth={2} />
              </div>
              <h3 className="text-lg font-bold mb-2 text-zinc-700">No Data Available</h3>
              <p className="text-sm text-zinc-500 max-w-md mx-auto">
                Start posting to get personalized optimal time recommendations based on your audience engagement patterns.
              </p>
            </div>
          )}
        </section>

        {/* Content Ideas and Audience Tips Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Content Ideas Section */}
          <section className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4 group">
                <div className={`
                  p-3 rounded-xl transition-all duration-500 transform 
                  group-hover:scale-110 group-hover:rotate-12 group-hover:animate-pulse
                  ${isDark 
                    ? 'bg-zinc-800 text-zinc-400 group-hover:bg-zinc-600 group-hover:text-white' 
                    : 'bg-zinc-100 text-zinc-600 group-hover:bg-zinc-800 group-hover:text-white'}
                `}>
                  <Sparkles className="transition-all duration-500 group-hover:animate-bounce" size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 group-hover:text-zinc-300 transition-colors duration-300">
                    Content Ideas
                  </h2>
                  <p className={`text-xs mt-1 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                    AI-powered suggestions for your niche
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value)}
                  className={`px-3 py-1.5 text-xs rounded-lg border focus:outline-none transition-all ${
                    isDark
                      ? 'bg-zinc-900 border-zinc-800 focus:border-zinc-500 text-white'
                      : 'bg-white border-zinc-200 focus:border-zinc-500 text-black'
                  }`}
                >
                  {contentTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <button
                  onClick={() => fetchGrowthOS(false, { onlyIdeas: true, contentType })}
                  disabled={ideasLoading}
                  className={`
                    group relative px-3 py-1.5 text-xs font-medium rounded-lg
                    transition-all duration-300 transform hover:scale-105 active:scale-95
                    flex items-center gap-1.5 border
                    ${ideasLoading
                      ? isDark 
                        ? 'bg-zinc-800 border-zinc-700 text-zinc-500 cursor-not-allowed' 
                        : 'bg-zinc-100 border-zinc-200 text-zinc-400 cursor-not-allowed'
                      : isDark
                        ? 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-600 hover:text-white'
                        : 'bg-white border-zinc-300 text-zinc-700 hover:bg-zinc-50 hover:border-zinc-400 hover:text-zinc-900'
                    }
                  `}
                >
                  {ideasLoading ? (
                    <>
                      <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      <span>Gen...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={12} strokeWidth={2} className="transition-transform duration-300 group-hover:rotate-12" />
                      <span>Generate</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => fetchGrowthOS(false, { onlyIdeas: true, contentType, refreshIdeas: true })}
                  disabled={ideasRefreshLoading}
                  className={`
                    group relative p-1.5 rounded-lg
                    transition-all duration-300 transform hover:scale-110 active:scale-95
                    border
                    ${ideasRefreshLoading
                      ? isDark 
                        ? 'bg-zinc-800 border-zinc-700 text-zinc-500 cursor-not-allowed' 
                        : 'bg-zinc-100 border-zinc-200 text-zinc-400 cursor-not-allowed'
                      : isDark
                        ? 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:border-zinc-600 hover:text-white'
                        : 'bg-white border-zinc-300 text-zinc-600 hover:bg-zinc-50 hover:border-zinc-400 hover:text-zinc-900'
                    }
                  `}
                >
                  {ideasRefreshLoading ? (
                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <RefreshCw size={12} strokeWidth={2} className="transition-transform duration-300 group-hover:rotate-180" />
                  )}
                </button>
              </div>
            </div>
            {contentIdeas.length > 0 ? (
              <div className="space-y-4">
                {contentIdeas.map((idea, index) => (
                  <div
                    key={index}
                    className={`
                      relative overflow-hidden p-5 rounded-2xl border transition-all duration-500
                      hover:scale-[1.02] hover:shadow-lg group
                      ${isDark
                        ? 'bg-zinc-900/60 border-zinc-800/60 hover:bg-zinc-900 hover:border-zinc-600'
                        : 'bg-zinc-50/60 border-zinc-200/60 hover:bg-white hover:border-zinc-300'}
                    `}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Background Gradient */}
                    <div className={`
                      absolute inset-0 bg-gradient-to-br from-zinc-500/3 to-zinc-600/3 
                      opacity-0 group-hover:opacity-100 transition-opacity duration-500
                    `} />
                    
                    <div className="relative z-10 flex items-start gap-4">
                      <div className={`
                        p-2 rounded-lg transition-all duration-300
                        ${isDark 
                          ? 'bg-zinc-800/50 text-zinc-400 group-hover:bg-zinc-600 group-hover:text-white' 
                          : 'bg-zinc-200 text-zinc-600 group-hover:bg-zinc-800 group-hover:text-white'}
                      `}>
                        <Sparkles size={16} strokeWidth={2} />
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm leading-relaxed transition-colors duration-300 ${
                          isDark ? 'text-zinc-100 group-hover:text-zinc-200' : 'text-zinc-800 group-hover:text-zinc-700'
                        }`}>
                          {idea}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-[9px] font-mono px-2 py-1 rounded border transition-all duration-300 ${
                            isDark ? 'bg-zinc-800/50 border-zinc-700/50 text-zinc-500' : 'bg-zinc-100/50 border-zinc-200/50 text-zinc-600'
                          }`}>
                            #{index + 1}
                          </span>
                          <div className={`
                            w-1.5 h-1.5 rounded-full bg-zinc-400 opacity-0 group-hover:opacity-100
                            transition-all duration-500 group-hover:animate-pulse
                          `} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`
                relative overflow-hidden p-12 rounded-3xl border text-center transition-all duration-500
                ${isDark ? 'bg-zinc-900/50 border-zinc-800/50' : 'bg-zinc-50/50 border-zinc-200/50'}
              `}>
                <div className={`
                  p-6 rounded-2xl mb-6 mx-auto w-fit transition-all duration-500
                  ${isDark ? 'bg-zinc-800/50' : 'bg-white/50'}
                `}>
                  <Sparkles className={`w-12 h-12 ${isDark ? 'text-zinc-600' : 'text-zinc-400'} animate-pulse`} strokeWidth={2} />
                </div>
                <h3 className="text-lg font-bold mb-2 text-zinc-700">No Ideas Available</h3>
                <p className="text-sm text-zinc-500 max-w-md mx-auto">
                  Generate personalized content ideas tailored to your niche and audience preferences.
                </p>
              </div>
            )}
          </section>

          {/* Audience Tips Section */}
          <section className="space-y-8">
            <div className="flex items-center gap-4 group">
              <div className={`
                p-3 rounded-xl transition-all duration-500 transform 
                group-hover:scale-110 group-hover:rotate-12 group-hover:animate-pulse
                ${isDark 
                  ? 'bg-zinc-800 text-zinc-400 group-hover:bg-zinc-600 group-hover:text-white' 
                  : 'bg-zinc-100 text-zinc-600 group-hover:bg-zinc-800 group-hover:text-white'}
              `}>
                <Users className="transition-all duration-500 group-hover:animate-bounce" size={18} strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 group-hover:text-zinc-300 transition-colors duration-300">
                  Audience Improvement Tips
                </h2>
                <p className={`text-xs mt-1 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                  Strategies to grow your audience quality
                </p>
              </div>
            </div>
            {audienceTips.length > 0 ? (
              <div className="space-y-4">
                {audienceTips.map((tip, index) => (
                  <div
                    key={index}
                    className={`
                      relative overflow-hidden p-5 rounded-2xl border transition-all duration-500
                      hover:scale-[1.02] hover:shadow-lg group
                      ${isDark
                        ? 'bg-zinc-900/60 border-zinc-800/60 hover:bg-zinc-900 hover:border-zinc-600'
                        : 'bg-zinc-50/60 border-zinc-200/60 hover:bg-white hover:border-zinc-300'}
                    `}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Background Gradient */}
                    <div className={`
                      absolute inset-0 bg-gradient-to-br from-zinc-500/3 to-zinc-600/3 
                      opacity-0 group-hover:opacity-100 transition-opacity duration-500
                    `} />
                    
                    <div className="relative z-10 flex items-start gap-4">
                      <div className={`
                        p-2 rounded-lg transition-all duration-300
                        ${isDark 
                          ? 'bg-zinc-800/50 text-zinc-400 group-hover:bg-zinc-600 group-hover:text-white' 
                          : 'bg-zinc-200 text-zinc-600 group-hover:bg-zinc-800 group-hover:text-white'}
                      `}>
                        <Users size={16} strokeWidth={2} />
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm leading-relaxed transition-colors duration-300 ${
                          isDark ? 'text-zinc-100 group-hover:text-zinc-200' : 'text-zinc-800 group-hover:text-zinc-700'
                        }`}>
                          {tip}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-[9px] font-mono px-2 py-1 rounded border transition-all duration-300 ${
                            isDark ? 'bg-zinc-800/50 border-zinc-700/50 text-zinc-500' : 'bg-zinc-100/50 border-zinc-200/50 text-zinc-600'
                          }`}>
                            #{index + 1}
                          </span>
                          <div className={`
                            w-1.5 h-1.5 rounded-full bg-zinc-400 opacity-0 group-hover:opacity-100
                            transition-all duration-500 group-hover:animate-pulse
                          `} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`
                relative overflow-hidden p-12 rounded-3xl border text-center transition-all duration-500
                ${isDark ? 'bg-zinc-900/50 border-zinc-800/50' : 'bg-zinc-50/50 border-zinc-200/50'}
              `}>
                <div className={`
                  p-6 rounded-2xl mb-6 mx-auto w-fit transition-all duration-500
                  ${isDark ? 'bg-zinc-800/50' : 'bg-white/50'}
                `}>
                  <Users className={`w-12 h-12 ${isDark ? 'text-zinc-600' : 'text-zinc-400'} animate-pulse`} strokeWidth={2} />
                </div>
                <h3 className="text-lg font-bold mb-2 text-zinc-700">No Tips Available</h3>
                <p className="text-sm text-zinc-500 max-w-md mx-auto">
                  Start engaging with your audience to get personalized growth recommendations.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default CreatorGrowthOS;