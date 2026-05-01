import React, { useEffect, useState, useRef } from 'react';
import { Lightbulb, RefreshCw, Clock3, Sparkles, Users, Loader, AlertCircle } from 'lucide-react';
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
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-black' : 'bg-white'}`}>
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
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-white border'}`}>
              <Lightbulb className="w-5 h-5 text-amber-500" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">Creator <span className="font-bold">Growth OS</span></h1>
          </div>
          <p className="text-sm text-zinc-500">Platform-specific suggestions for posting times, ideas, and audience quality growth.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          icon={RefreshCw}
          loading={refreshing}
          onClick={() => fetchGrowthOS(true)}
          className="text-xs font-bold uppercase tracking-widest"
        >
          Refresh
        </Button>
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
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-white border'}`}>
              <Clock3 className="w-4 h-4 text-indigo-600" />
            </div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500">Best Posting Time</h2>
          </div>

          {postingInsights.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {postingInsights.map((insight) => (
                <div
                  key={insight.platform}
                  className={`p-5 rounded-2xl border transition-all ${
                    isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className={`text-sm font-semibold capitalize ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{insight.platform}</p>
                    <span className={`text-xs px-2 py-1 rounded-full capitalize ${
                      isDark ? 'bg-indigo-950 text-indigo-300' : 'bg-indigo-100 text-indigo-700'
                    }`}>
                      {insight.confidence} confidence
                    </span>
                  </div>
                  <div className="space-y-3">
                    {(insight.windows || []).map((window) => (
                      <div
                        key={`${insight.platform}-${window.label}`}
                        className={`p-3 rounded-xl border ${
                          isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'
                        }`}
                      >
                        <p className={`text-sm font-medium ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{window.label}</p>
                        <p className={`text-xs mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>{window.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={`p-8 rounded-2xl border text-center ${
              isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
            }`}>
              <p className="text-sm text-zinc-500">No posting-time insight available yet.</p>
            </div>
          )}
        </section>

        {/* Content Ideas and Audience Tips Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Content Ideas Section */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-white border'}`}>
                  <Sparkles className="w-4 h-4 text-fuchsia-600" />
                </div>
                <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500">Content Ideas</h2>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value)}
                  className={`px-3 py-2 text-xs rounded-xl border focus:outline-none transition-all ${
                    isDark
                      ? 'bg-zinc-900 border-zinc-800 focus:border-zinc-500 text-white'
                      : 'bg-white border-zinc-200 focus:border-black text-black'
                  }`}
                >
                  {contentTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchGrowthOS(false, { onlyIdeas: true, contentType })}
                  loading={ideasLoading}
                  className="text-xs font-bold uppercase tracking-widest"
                >
                  Give Ideas
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  icon={RefreshCw}
                  onClick={() => fetchGrowthOS(false, { onlyIdeas: true, contentType, refreshIdeas: true })}
                  loading={ideasRefreshLoading}
                  className="text-xs font-bold uppercase tracking-widest"
                >
                  Refresh
                </Button>
              </div>
            </div>
            {contentIdeas.length > 0 ? (
              <div className="space-y-3">
                {contentIdeas.map((idea) => (
                  <div
                    key={idea}
                    className={`p-4 rounded-2xl border text-sm transition-all hover:scale-[1.02] ${
                      isDark
                        ? 'bg-fuchsia-950/35 border-fuchsia-900 text-fuchsia-100'
                        : 'bg-fuchsia-50 border-fuchsia-100 text-gray-800'
                    }`}
                  >
                    {idea}
                  </div>
                ))}
              </div>
            ) : (
              <div className={`p-8 rounded-2xl border text-center ${
                isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
              }`}>
                <p className="text-sm text-zinc-500">No content ideas available yet.</p>
              </div>
            )}
          </section>

          {/* Audience Tips Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-white border'}`}>
                <Users className="w-4 h-4 text-emerald-600" />
              </div>
              <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500">Audience Improvement Tips</h2>
            </div>
            {audienceTips.length > 0 ? (
              <div className="space-y-3">
                {audienceTips.map((tip) => (
                  <div
                    key={tip}
                    className={`p-4 rounded-2xl border text-sm transition-all hover:scale-[1.02] ${
                      isDark
                        ? 'bg-emerald-950/35 border-emerald-900 text-emerald-100'
                        : 'bg-emerald-50 border-emerald-100 text-gray-800'
                    }`}
                  >
                    {tip}
                  </div>
                ))}
              </div>
            ) : (
              <div className={`p-8 rounded-2xl border text-center ${
                isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
              }`}>
                <p className="text-sm text-zinc-500">No audience tips available yet.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default CreatorGrowthOS;