// CreatorDashboard.jsx - Complete professional dashboard with dark/light mode
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp, Users, DollarSign, Clock, Star, Award,
  ChevronRight, Calendar, Activity, Briefcase, CheckCircle,
  User, Wallet, BarChart3, Loader, AlertCircle, Eye,
  Heart, MessageSquare, Share2, PieChart, Zap, RefreshCw
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart as RePieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import { useCreatorData } from '../../hooks/useCreatorData';
import { useEarnings } from '../../hooks/useEarnings';
import { formatCurrency, formatNumber, timeAgo } from '../../utils/helpers';
import toast from 'react-hot-toast';
import { useTheme } from '../../hooks/useTheme';

// Stats Card Component
const StatsCard = ({ title, value, change, icon: Icon, link, color = 'indigo' }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const CardWrapper = link ? Link : 'div';
  const isPositive = change?.startsWith('+');

  // Map the color prop to Tailwind shades for the hover effects
  const colorMap = {
    indigo: 'group-hover:text-indigo-500',
    emerald: 'group-hover:text-emerald-500',
    rose: 'group-hover:text-rose-500',
    amber: 'group-hover:text-amber-500',
    gray: 'group-hover:text-zinc-400'
  };

  return (
    <CardWrapper to={link || '#'} className="block h-full group outline-none">
      <div className={`
        relative overflow-hidden p-6 rounded-[2rem] border transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]
        h-full flex flex-col justify-between
        ${isDark 
          ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-600 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]' 
          : 'bg-white border-zinc-100 hover:border-zinc-300 hover:shadow-[0_20px_40px_rgba(0,0,0,0.04)]'}
        hover:-translate-y-1.5
      `}>
        
        {/* Subtle Background Glow - Pulsates on hover */}
        <div className={`
          absolute -right-8 -top-8 w-32 h-32 blur-3xl rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-700
          ${isDark ? 'bg-white' : 'bg-black'}
        `} />

        <div className="flex justify-between items-start relative z-10">
          <div className={`
            p-3 rounded-2xl transition-all duration-500 transform group-hover:scale-110 group-hover:rotate-3
            ${isDark 
              ? 'bg-zinc-800 text-zinc-400 group-hover:bg-white group-hover:text-black' 
              : 'bg-zinc-50 text-zinc-500 group-hover:bg-black group-hover:text-white'}
          `}>
            {Icon && <Icon size={18} strokeWidth={2.5} />}
          </div>

          {change && (
            <div className={`
              text-[10px] font-black px-2.5 py-1 rounded-lg tracking-tighter transition-all duration-500
              ${isPositive 
                ? 'text-emerald-500 bg-emerald-500/10' 
                : 'text-zinc-400 bg-zinc-400/10'}
              group-hover:scale-105
            `}>
              {change}
            </div>
          )}
        </div>

        <div className="mt-8 relative z-10">
          <h3 className={`
            text-[10px] font-black uppercase tracking-[0.2em] mb-1 transition-colors duration-500
            ${isDark ? 'text-zinc-600 group-hover:text-zinc-400' : 'text-zinc-400 group-hover:text-zinc-600'}
          `}>
            {title}
          </h3>
          
          <div className="flex items-baseline gap-2">
            <p className={`
              text-3xl font-mono font-bold tracking-tighter transition-all duration-500
              ${isDark ? 'text-white' : 'text-black'}
            `}>
              {value}
            </p>
            
            {/* The "Activity Bar" - Grows when the card is hovered/focused */}
            <div className={`
              h-[3px] w-0 group-hover:w-8 rounded-full transition-all duration-700 ease-out
              ${isDark ? 'bg-zinc-700 group-hover:bg-white' : 'bg-zinc-200 group-hover:bg-black'}
            `} />
          </div>
        </div>

        {/* Bottom Corner Accent - Only visible on hover */}
        <div className={`
          absolute bottom-2 right-4 text-[10px] font-black tracking-widest opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0
          ${isDark ? 'text-zinc-800' : 'text-zinc-200'}
        `}>
          DATA.REF
        </div>
      </div>
    </CardWrapper>
  );
};

// Chart Card Component
const ChartCard = ({ title, children, action }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  return (
    <div className={`p-5 rounded-xl border shadow-sm ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-black'}`}>
          {title}
        </h3>
        {action && <div>{action}</div>}
      </div>
      <div>
        {children}
      </div>
    </div>
  );
};

// Main Dashboard Component
const CreatorDashboard = () => {
  const { theme, isDark, toggleTheme } = useTheme();
  
  const {
    loading: dataLoading,
    refreshing,
    profile,
    deals,
    availableCampaigns,
    analytics,
    stats,
    refreshData
  } = useCreatorData();

  const { balance, pendingBalance, getGrowthPercentage, loading: earningsLoading } = useEarnings();
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!dataLoading && !earningsLoading) setLoading(false);
  }, [dataLoading, earningsLoading]);

  // Computed data
  const activeDeals = useMemo(() => (deals || []).filter(d => ['accepted', 'in-progress'].includes(d.status)), [deals]);
  const completedDeals = useMemo(() => (deals || []).filter(d => d.status === 'completed'), [deals]);
  const pendingDeals = useMemo(() => (deals || []).filter(d => d.status === 'pending'), [deals]);
  
  const upcomingDeadlines = useMemo(() => {
    return (deals || [])
      .filter(d => ['accepted', 'in-progress'].includes(d.status) && d.deadline)
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
      .slice(0, 4);
  }, [deals]);

  const recentActivity = useMemo(() => {
    return (deals || []).slice(0, 5).map(deal => ({
      id: deal._id,
      title: deal.campaignId?.title || 'Deal',
      brand: deal.brandId?.brandName || 'Brand',
      amount: deal.budget,
      status: deal.status,
      date: deal.updatedAt || deal.createdAt,
    }));
  }, [deals]);

  const performanceData = useMemo(() => {
    return (analytics?.monthly || []).map(item => ({
      month: item.month || `${item._id?.month || ''}/${item._id?.year || ''}`,
      earnings: item.earnings || 0,
      deals: item.deals || 0
    }));
  }, [analytics]);

  const platformData = useMemo(() => {
    if (analytics?.platforms?.length) {
      return analytics.platforms.map(p => ({ name: p.name, value: p.followers || 0 }));
    }
    if (profile?.socialMedia) {
      const platforms = [];
      if (profile.socialMedia.instagram?.followers) platforms.push({ name: 'instagram', value: profile.socialMedia.instagram.followers });
      if (profile.socialMedia.youtube?.subscribers) platforms.push({ name: 'youtube', value: profile.socialMedia.youtube.subscribers });
      if (profile.socialMedia.tiktok?.followers) platforms.push({ name: 'tiktok', value: profile.socialMedia.tiktok.followers });
      return platforms;
    }
    return [];
  }, [analytics, profile]);

  const engagementMetrics = [
    { label: 'Impressions', value: formatNumber(analytics?.engagement?.impressions || 0), icon: Eye },
    { label: 'Likes', value: formatNumber(analytics?.engagement?.likes || 0), icon: Heart },
    { label: 'Comments', value: formatNumber(analytics?.engagement?.comments || 0), icon: MessageSquare },
    { label: 'Shares', value: formatNumber(analytics?.engagement?.shares || 0), icon: Share2 },
  ];

  const summaryMetrics = [
    { title: 'Total Earnings', value: formatCurrency(stats?.totalEarnings || 0), icon: DollarSign, color: 'green' },
    { title: 'Total Followers', value: formatNumber(profile?.totalFollowers || 0), icon: Users, color: 'blue' },
    { title: 'Avg Engagement', value: `${(profile?.averageEngagement || 0).toFixed(1)}%`, icon: Activity, color: 'purple' },
    { title: 'Completed Deals', value: stats?.completedDeals || 0, icon: Award, color: 'orange' },
    { title: 'Avg Rating', value: (stats?.averageRating || 0).toFixed(1), icon: Star, color: 'yellow' },
    { title: 'Active Deals', value: stats?.activeDeals || 0, icon: Briefcase, color: 'blue' },
  ];

  const metrics = [
    { title: 'Available Balance', value: formatCurrency(balance || 0), change: getGrowthPercentage ? getGrowthPercentage() : '0%', icon: DollarSign, color: 'green' },
    { title: 'Active Deals', value: activeDeals.length.toString(), change: `${completedDeals.length} completed`, icon: Briefcase, color: 'blue' },
    { title: 'Total Followers', value: formatNumber(profile?.totalFollowers || 0), change: `${(profile?.averageEngagement || 0).toFixed(1)}% engagement`, icon: Users, color: 'purple' },
    { title: 'Pending Earnings', value: formatCurrency(pendingBalance || 0), change: `${pendingDeals.length} deals pending`, icon: Clock, color: 'orange' }
  ];

  const handleRefresh = async () => {
    try {
      await refreshData();
      toast.success('Dashboard refreshed');
    } catch (err) {
      toast.error('Failed to refresh');
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center`}>
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-zinc-500 mx-auto mb-4" />
          <p className="text-zinc-500 text-xs font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen`}>
      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className={`text-3xl font-semibold tracking-tight ${isDark ? 'text-white' : 'text-black'}`}>
              Creator <span className="font-bold">Dashboard</span>
            </h1>
            <p className={`text-sm mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Track your performance, earnings, and campaign activities in one place.
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`p-2 rounded-lg transition-all border ${
              refreshing 
                ? isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-400' : 'bg-white border-zinc-200 text-zinc-500'
                : isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white' : 'bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Tab Navigation - Smaller height */}
        <div className="flex gap-1 mb-8 p-1 bg-zinc-100 dark:bg-zinc-900 w-fit rounded-lg">
          {['overview', 'analytics'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
                activeTab === tab
                  ? 'bg-white dark:bg-black text-black dark:text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div>
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
         <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {metrics.map((metric, idx) => (
                <StatsCard key={idx} {...metric} />
              ))}
            </div>

          {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
  {/* Left Column: Primary Feed */}
  <div className="lg:col-span-2 space-y-8">
    
    {/* Active Deals - The "Interactive Slab" Style */}
    <ChartCard title="Active Flux" action={
      <Link to="/creator/deals" className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500 hover:text-white' : 'text-zinc-400 hover:text-black'}`}>
        All Operations &rarr;
      </Link>
    }>
      {activeDeals.length > 0 ? (
        <div className="space-y-2">
          {activeDeals.slice(0, 4).map(deal => (
            <Link key={deal._id} to={`/creator/deals/${deal._id}`} className="group block">
              <div className={`
                flex items-center justify-between p-5 rounded-3xl transition-all duration-500
                ${isDark ? 'hover:bg-zinc-800/40' : 'hover:bg-zinc-50 hover:shadow-sm'}
              `}>
                <div className="flex-1 min-w-0 mr-6">
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className={`text-[13px] font-bold tracking-tight ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                      {deal.brandId?.brandName || 'Unidentified Brand'}
                    </span>
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${
                      deal.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-500' :
                      deal.status === 'in-progress' ? 'bg-blue-500/10 text-blue-500' :
                      'bg-zinc-500/10 text-zinc-500'
                    }`}>
                      {deal.status}
                    </span>
                  </div>
                  <p className={`text-[11px] font-medium opacity-60 mb-2 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    {deal.campaignId?.title} {deal.deliverables?.length || 0} Assets
                  </p>
                  {deal.deadline && (
                    <div className="flex items-center gap-1.5">
                       <Clock size={10} className="text-zinc-500" />
                       <span className={`text-[10px] font-mono font-bold uppercase tracking-tighter ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                         Est. {new Date(deal.deadline).toLocaleDateString()}
                       </span>
                    </div>
                  )}
                </div>
                
                <div className="text-right">
                  <p className={`text-lg font-mono font-bold tracking-tighter mb-2 ${isDark ? 'text-white' : 'text-black'}`}>
                    {formatCurrency(deal.budget || 0)}
                  </p>
                  <div className="flex flex-col items-end gap-1.5">
                    <div className={`w-24 h-1 rounded-full overflow-hidden ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                      <div 
                        className="h-full bg-indigo-500 transition-all duration-1000 ease-out" 
                        style={{ width: `${deal.progress || 0}%` }} 
                      />
                    </div>
                    <span className="text-[9px] font-black font-mono opacity-40">{deal.progress || 0}% COMPLETE</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <Briefcase className={`w-12 h-12 mx-auto mb-4 opacity-20 ${isDark ? 'text-white' : 'text-black'}`} />
          <p className="text-[11px] font-black uppercase tracking-widest opacity-40">No Active Operations</p>
        </div>
      )}
    </ChartCard>

    {/* Performance Overview - Clean Area Chart */}
    <ChartCard title="Capital Flow">
      <div className="group-hover:scale-[1.01] transition-transform duration-700">
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={performanceData}>
            <defs>
              <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isDark ? "#ffffff" : "#000000"} stopOpacity={0.15} />
                <stop offset="95%" stopColor={isDark ? "#ffffff" : "#000000"} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="8 8" vertical={false} stroke={isDark ? '#27272a' : '#f4f4f5'} />
            <XAxis 
                dataKey="month" 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#71717a', fontSize: 10, fontWeight: 700}}
            />
            <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#71717a', fontSize: 10, fontWeight: 700}} 
                tickFormatter={v => `$${v/1000}k`} 
            />
            <Tooltip
              cursor={{ stroke: isDark ? '#3f3f46' : '#e4e4e7', strokeWidth: 2 }}
              contentStyle={{ 
                backgroundColor: isDark ? '#09090b' : '#fff', 
                border: '1px solid #27272a', 
                borderRadius: '16px',
                fontSize: '11px',
                fontWeight: '900'
              }}
            />
            <Area 
                type="monotone" 
                dataKey="earnings" 
                stroke={isDark ? "#ffffff" : "#000000"} 
                fill="url(#earningsGradient)" 
                strokeWidth={3} 
                animationDuration={2000}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  </div>

  {/* Right Column: Intelligence & Actions */}
  <div className="space-y-8">
    
    {/* Balance Card - The "Gold Standard" Slab */}
    <div className={`
        relative p-8 rounded-[2.5rem] border overflow-hidden transition-all duration-500
        ${isDark ? 'bg-zinc-900 border-zinc-800 shadow-2xl' : 'bg-white border-zinc-100 shadow-xl shadow-zinc-200/50'}
    `}>
      <div className="flex justify-between items-start mb-6">
        <div className={`p-3 rounded-2xl ${isDark ? 'bg-zinc-800 text-zinc-100' : 'bg-zinc-100 text-zinc-900'}`}>
          <Wallet size={20} strokeWidth={2.5} />
        </div>
        <div className="text-right">
            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block">In Escrow</span>
            <span className={`text-xs font-mono font-bold ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>{formatCurrency(pendingBalance || 0)}</span>
        </div>
      </div>
      <h3 className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Liquid Balance</h3>
      <p className={`text-4xl font-mono font-bold tracking-tighter ${isDark ? 'text-white' : 'text-black'}`}>
        {formatCurrency(balance || 0)}
      </p>
      
      <div className="grid grid-cols-2 gap-3 mt-8">
        <button className={`py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${isDark ? 'bg-white text-black hover:bg-zinc-200' : 'bg-black text-white hover:bg-zinc-800'}`}>
          Withdraw
        </button>
        <button className={`py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${isDark ? 'border-zinc-800 text-zinc-400 hover:bg-zinc-800' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}>
          Ledger
        </button>
      </div>
    </div>

    {/* Platform Health - "The Glass Pillar" */}
    <div className={`p-8 rounded-[2.5rem] border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100 shadow-sm'}`}>
      <h3 className={`text-[11px] font-black uppercase tracking-[0.2em] mb-8 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Reach Index</h3>
      <div className="space-y-6">
        {platformData.map((platform, idx) => {
          const maxVal = Math.max(...platformData.map(p => p.value), 1);
          return (
            <div key={idx} className="group/item">
              <div className="flex justify-between items-end mb-2">
                <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>{platform.name}</span>
                <span className={`text-xs font-mono font-bold ${isDark ? 'text-white' : 'text-black'}`}>{formatNumber(platform.value)}</span>
              </div>
              <div className={`w-full h-1.5 rounded-full ${isDark ? 'bg-zinc-800' : 'bg-zinc-50'}`}>
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ease-out group-hover/item:bg-indigo-500 ${isDark ? 'bg-zinc-600' : 'bg-zinc-300'}`} 
                  style={{ width: `${(platform.value / maxVal) * 100}%` }} 
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </div>
</div>
        </>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === 'analytics' && (
         <>
         <div className="space-y-6">
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
    {summaryMetrics.map((metric, idx) => (
      <div 
        key={idx} 
        className={`
          group relative p-4 rounded-2xl border transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
          hover:-translate-y-1
          ${isDark 
            ? 'bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-900 hover:border-zinc-700 hover:shadow-[0_10px_20px_rgba(0,0,0,0.4)]' 
            : 'bg-white border-zinc-100 hover:border-zinc-300 hover:shadow-[0_10px_20px_rgba(0,0,0,0.03)]'}
        `}
      >
        {/* Top Accent Line - Lights up on hover */}
        <div className={`
          absolute top-0 left-4 right-4 h-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-500
          ${isDark ? 'bg-gradient-to-r from-transparent via-zinc-500 to-transparent' : 'bg-gradient-to-r from-transparent via-zinc-400 to-transparent'}
        `} />

        <p className={`
          text-[9px] font-black uppercase tracking-[0.15em] mb-1.5 transition-colors duration-500
          ${isDark ? 'text-zinc-600 group-hover:text-zinc-400' : 'text-zinc-400 group-hover:text-zinc-600'}
        `}>
          {metric.title}
        </p>
        
        <div className="flex items-baseline gap-1">
          <p className={`
            text-base font-mono font-bold tracking-tighter transition-all duration-500
            ${isDark ? 'text-white' : 'text-black'}
          `}>
            {metric.value}
          </p>
          
          {/* Decorative suffix/unit if needed, or a subtle indicator dot */}
          <div className={`
            w-1 h-1 rounded-full mb-1 opacity-0 group-hover:opacity-100 transition-all duration-700
            ${isDark ? 'bg-indigo-500 shadow-[0_0_8px_#6366f1]' : 'bg-indigo-500'}
          `} />
        </div>
      </div>
    ))}
  </div>
</div>

           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  {/* Engagement Breakdown Card - The "Signal Monitor" */}
  <div className={`
    group p-8 rounded-[2.5rem] border transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]
    ${isDark 
      ? 'bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-900 hover:border-zinc-700 hover:shadow-[0_30px_60px_rgba(0,0,0,0.5)]' 
      : 'bg-white border-zinc-100 hover:border-zinc-200 hover:shadow-[0_30px_60px_rgba(0,0,0,0.05)]'}
  `}>
    <div className="flex justify-between items-center mb-8">
      <h3 className={`text-[11px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-zinc-500 group-hover:text-zinc-300' : 'text-zinc-400 group-hover:text-black'}`}>
        Engagement Breakdown
      </h3>
      <div className={`w-2 h-2 rounded-full animate-pulse ${isDark ? 'bg-emerald-500/50' : 'bg-emerald-500'}`} />
    </div>

    <div className="h-[240px] w-full transition-transform duration-700 group-hover:scale-[1.02]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={engagementMetrics} layout="vertical" margin={{ left: -20 }}>
          <XAxis type="number" hide />
          <YAxis 
            dataKey="label" 
            type="category" 
            axisLine={false} 
            tickLine={false} 
            width={100} 
            tick={{
              fill: isDark ? '#52525b' : '#a1a1aa', 
              fontSize: 9, 
              fontWeight: 800, 
              textTransform: 'uppercase', 
              letterSpacing: '0.1em'
            }} 
          />
          <Tooltip 
            cursor={{fill: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'}} 
            contentStyle={{ 
              backgroundColor: isDark ? 'rgba(9, 9, 11, 0.95)' : 'rgba(255, 255, 255, 0.95)', 
              border: '1px solid #27272a',
              borderRadius: '12px',
              backdropFilter: 'blur(10px)',
              fontSize: '10px',
              fontWeight: '900',
              padding: '8px 12px'
            }} 
          />
          <Bar 
            dataKey="value" 
            fill={isDark ? "#ffffff" : "#000000"} 
            radius={[0, 12, 12, 0]} 
            barSize={12}
            animationDuration={1500}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
  
  {/* Small Metric Grid - The "Tactile Buttons" */}
  <div className="grid grid-cols-2 gap-4">
    {engagementMetrics.map((metric, idx) => (
      <div 
        key={idx} 
        className={`
          group relative p-6 rounded-[2rem] border transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
          cursor-pointer hover:scale-[1.05] overflow-hidden
          ${isDark 
            ? 'bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-900 hover:border-zinc-500 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]' 
            : 'bg-white border-zinc-100 hover:border-zinc-300 hover:shadow-[0_20px_40px_rgba(0,0,0,0.04)]'}
        `}
      >
        {/* Subtle Background Glow */}
        <div className={`
          absolute -right-4 -top-4 w-16 h-16 blur-2xl rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-500
          ${isDark ? 'bg-white' : 'bg-black'}
        `} />

        <metric.icon className={`
          w-5 h-5 mb-4 transition-all duration-500 transform group-hover:-translate-y-1 group-hover:scale-110
          ${isDark ? 'text-zinc-600 group-hover:text-white' : 'text-zinc-400 group-hover:text-black'}
        `} />
        
        <p className={`
          text-2xl font-mono font-bold tracking-tighter transition-all duration-500
          ${isDark ? 'text-white' : 'text-black'}
        `}>
          {metric.value}
        </p>
        
        <p className={`
          text-[9px] font-black uppercase tracking-[0.2em] mt-1.5 transition-colors
          ${isDark ? 'text-zinc-600 group-hover:text-zinc-400' : 'text-zinc-400 group-hover:text-zinc-600'}
        `}>
          {metric.label}
        </p>
      </div>
    ))}
  </div>
</div>

          <div className={`
  group relative p-8 rounded-[2.5rem] border transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]
  ${isDark 
    ? 'bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-900 hover:border-zinc-700 hover:shadow-[0_30px_60px_rgba(0,0,0,0.5)]' 
    : 'bg-white border-zinc-100 hover:border-zinc-200 hover:shadow-[0_30px_60px_rgba(0,0,0,0.05)]'}
`}>
  {/* Performance Header */}
  <div className="flex justify-between items-end mb-8">
    <div>
      <h3 className={`text-[11px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-zinc-500 group-hover:text-zinc-300' : 'text-zinc-400 group-hover:text-black'}`}>
        Performance Trend
      </h3>
      <div className="flex items-center gap-2 mt-1">
        <span className={`text-2xl font-mono font-bold tracking-tighter ${isDark ? 'text-white' : 'text-black'}`}>
          {/* Dynamic summary if available, otherwise static */}
          Analytics
        </span>
        <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md uppercase tracking-widest">
          Live
        </span>
      </div>
    </div>
    
    {/* Optional: Legend or Timeframe Switcher */}
    <div className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
      Monthly Revenue Alpha
    </div>
  </div>

  <div className="h-[240px] w-full group-hover:scale-[1.01] transition-transform duration-700 ease-out">
    <ResponsiveContainer width="100%" height="100%">
      {performanceData.length > 0 ? (
        <AreaChart data={performanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={isDark ? "#ffffff" : "#000000"} stopOpacity={0.12} />
              <stop offset="95%" stopColor={isDark ? "#ffffff" : "#000000"} stopOpacity={0} />
            </linearGradient>
          </defs>
          
          {/* Subtle horizontal grid lines only */}
          <CartesianGrid 
            strokeDasharray="8 8" 
            vertical={false} 
            stroke={isDark ? '#27272a' : '#f4f4f5'} 
          />
          
          <XAxis 
            dataKey="month" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: isDark ? '#52525b' : '#a1a1aa', fontSize: 9, fontWeight: 800, textTransform: 'uppercase' }} 
            dy={15} 
          />
          
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: isDark ? '#52525b' : '#a1a1aa', fontSize: 9, fontWeight: 800 }} 
            tickFormatter={v => `$${v}`} 
          />
          
          <Tooltip 
            cursor={{ stroke: isDark ? '#3f3f46' : '#e4e4e7', strokeWidth: 2 }}
            contentStyle={{ 
              backgroundColor: isDark ? 'rgba(9, 9, 11, 0.95)' : 'rgba(255, 255, 255, 0.95)', 
              border: isDark ? '1px solid #27272a' : '1px solid #e4e4e7',
              borderRadius: '16px', 
              backdropFilter: 'blur(12px)',
              fontSize: '11px',
              fontWeight: '900',
              textTransform: 'uppercase',
              boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
            }}
            itemStyle={{ color: isDark ? '#fff' : '#000' }}
            formatter={(v) => [formatCurrency(v), 'Settlement']}
          />
          
          <Area 
            type="monotone" 
            dataKey="earnings" 
            stroke={isDark ? "#fff" : "#000"} 
            strokeWidth={3} 
            fillOpacity={1} 
            fill="url(#colorValue)"
            animationDuration={2000}
            animationEasing="ease-in-out"
          />
        </AreaChart>
      ) : (
        <div className="h-full flex flex-col items-center justify-center space-y-2">
          <div className={`w-8 h-[1px] ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Awaiting Data Cycles</p>
        </div>
      )}
    </ResponsiveContainer>
  </div>
</div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Platform Distribution Chart */}
             <div className={`
  group relative p-8 rounded-[2.5rem] border transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]
  ${isDark 
    ? 'bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-900 hover:border-zinc-700 hover:shadow-[0_30px_60px_rgba(0,0,0,0.5)]' 
    : 'bg-white border-zinc-100 hover:border-zinc-300 hover:shadow-[0_30px_60px_rgba(0,0,0,0.05)]'}
`}>
  {/* Header Section */}
  <div className="flex justify-between items-start mb-4">
    <h3 className={`text-[11px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-zinc-500 group-hover:text-zinc-300' : 'text-zinc-400 group-hover:text-black'}`}>
      Platform Distribution
    </h3>
    <div className={`p-2 rounded-xl ${isDark ? 'bg-zinc-800 text-white' : 'bg-zinc-100 text-black'}`}>
      <Share2 size={14} strokeWidth={2.5} />
    </div>
  </div>

  <div className="h-[240px] w-full relative">
    {/* Center Readout Label */}
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
      <span className={`text-[9px] font-black uppercase tracking-widest opacity-40 ${isDark ? 'text-white' : 'text-black'}`}>
        Total
      </span>
      <span className={`text-xl font-mono font-bold tracking-tighter ${isDark ? 'text-white' : 'text-black'}`}>
        100%
      </span>
    </div>

    <ResponsiveContainer width="100%" height="100%">
      {platformData.length > 0 ? (
        <RePieChart>
          <Pie
            data={platformData}
            innerRadius={65} // Increased slightly for a thinner, more elegant ring
            outerRadius={85}
            paddingAngle={8} // More breathing room between segments
            dataKey="value"
            stroke="none" // Removes the default border between segments
            animationBegin={200}
            animationDuration={1800}
          >
            {platformData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={isDark && (entry.color === '#000000' || entry.color === '#18181b') ? '#ffffff' : entry.color} 
                className="hover:opacity-80 transition-opacity cursor-pointer outline-none"
              />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              backgroundColor: isDark ? 'rgba(9, 9, 11, 0.95)' : 'rgba(255, 255, 255, 0.95)', 
              border: isDark ? '1px solid #27272a' : '1px solid #e4e4e7',
              borderRadius: '16px', 
              backdropFilter: 'blur(12px)',
              fontSize: '11px',
              fontWeight: '900',
              textTransform: 'uppercase',
              padding: '12px'
            }}
            itemStyle={{ color: isDark ? '#fff' : '#000' }}
          />
        </RePieChart>
      ) : (
        <div className="h-full flex flex-col items-center justify-center space-y-2 opacity-40">
            <PieChartIcon size={32} strokeWidth={1} />
            <p className="text-[10px] font-black uppercase tracking-widest">No Signals Detected</p>
        </div>
      )}
    </ResponsiveContainer>
  </div>

  {/* Footer Legend */}
  <div className="mt-4 flex flex-wrap justify-center gap-4">
    {platformData.slice(0, 3).map((entry, index) => (
      <div key={index} className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
        <span className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
          {entry.name}
        </span>
      </div>
    ))}
  </div>
</div>
            </div>

          

            {/* Top Brands */}
          {analytics?.topBrands?.length > 0 && (
  <div className={`
    group p-8 rounded-[2.5rem] border transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]
    ${isDark 
      ? 'bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-900 hover:border-zinc-700 hover:shadow-[0_30px_60px_rgba(0,0,0,0.5)]' 
      : 'bg-white border-zinc-100 hover:border-zinc-200 hover:shadow-[0_30px_60px_rgba(0,0,0,0.05)]'}
  `}>
    <div className="flex justify-between items-center mb-8">
      <h3 className={`text-[11px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-zinc-500 group-hover:text-zinc-300' : 'text-zinc-400 group-hover:text-black'}`}>
        Top Performing Partners
      </h3>
      <div className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-tighter ${isDark ? 'bg-zinc-800 text-zinc-500' : 'bg-zinc-100 text-zinc-400'}`}>
        Ranked by Revenue
      </div>
    </div>

    <div className="space-y-2">
      {analytics.topBrands.map((brand, idx) => (
        <div 
          key={idx} 
          className={`
            group/item flex items-center justify-between p-4 rounded-2xl transition-all duration-500
            ${isDark 
              ? 'hover:bg-white/[0.03] border border-transparent hover:border-zinc-800' 
              : 'hover:bg-zinc-50 border border-transparent hover:border-zinc-100'}
          `}
        >
          <div className="flex items-center gap-4">
            {/* The Beveled Avatar */}
            <div className={`
              w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500
              ${isDark 
                ? 'bg-zinc-800 text-zinc-400 group-hover/item:bg-white group-hover/item:text-black' 
                : 'bg-zinc-100 text-zinc-500 group-hover/item:bg-black group-hover/item:text-white'}
            `}>
              <span className="text-xs font-black uppercase">
                {brand.brand?.brandName?.charAt(0) || 'B'}
              </span>
            </div>

            <div>
              <p className={`text-[13px] font-bold tracking-tight ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                {brand.brand?.brandName || 'Unidentified Brand'}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                  {brand.deals} Operations
                </span>
                <div className={`w-1 h-1 rounded-full ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
                <span className={`text-[10px] font-medium ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                  Completed
                </span>
              </div>
            </div>
          </div>

          <div className="text-right">
            <p className={`text-sm font-mono font-bold tracking-tighter transition-all duration-500 ${isDark ? 'text-emerald-400' : 'text-emerald-600'} group-hover/item:scale-110`}>
              {formatCurrency(brand.earnings)}
            </p>
            <div className={`text-[9px] font-black uppercase tracking-tighter mt-0.5 ${isDark ? 'text-zinc-700' : 'text-zinc-300'}`}>
              Net Yield
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
)}
        </>
        )}
        </div>
      </div>
    </div>
  );
};

export default CreatorDashboard;