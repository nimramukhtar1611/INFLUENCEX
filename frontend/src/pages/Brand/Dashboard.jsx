import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp, Users, DollarSign, Clock, Plus, ChevronRight, Calendar, Activity, Briefcase, CheckCircle,
  User, Wallet, BarChart3, Loader, AlertCircle, Eye, Heart, MessageSquare, Share2, PieChart, Zap, RefreshCw,
  Target, Award, Megaphone, Handshake, Bell, Settings, Search
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart as RePieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import brandService from '../../services/brandService';
import campaignService from '../../services/campaignService';
import dealService from '../../services/dealService';
import paymentService from '../../services/paymentService';
import { formatCurrency, formatNumber, timeAgo } from '../../utils/helpers';
import StatsCard from '../../components/Common/StatsCard';
import ChartCard from '../../components/Common/ChartCard';
import Button from '../../components/UI/Button';
import toast from 'react-hot-toast';

const BrandDashboard = () => {
  const { user } = useAuth();
  const { theme, isDark } = useTheme();
    const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [deals, setDeals] = useState([]);
  const [balance, setBalance] = useState(0);
  const [pendingBalance, setPendingBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [analytics, setAnalytics] = useState({
    campaignPerformance: [],
    platformDistribution: [],
    topCreators: [],
    engagement: {}
  });
  const [dateRange, setDateRange] = useState('30d');
  const [stats, setStats] = useState({
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalDeals: 0,
    activeDeals: 0,
    completedDeals: 0,
    totalSpent: 0,
    avgROI: 0
  });

  // Use useRef to prevent infinite loop
  const fetchDashboardDataRef = useRef(null);
  
  const fetchDashboardData = useCallback(async (showToast = false) => {
    try {
      if (showToast) setRefreshing(true);
      else setLoading(true);

      const results = await Promise.allSettled([
        brandService.getProfile(),
        campaignService.getBrandCampaigns('all', 1, 5),
        dealService.getBrandDeals('all', 1, 5),
        paymentService.getBalance(),
        paymentService.getTransactions(1, 5),
        brandService.getAnalytics(dateRange)
      ]);

      if (results[0].status === 'fulfilled' && results[0].value?.success) setProfile(results[0].value.brand);
      if (results[1].status === 'fulfilled' && results[1].value?.success) setCampaigns(results[1].value.campaigns || []);
      if (results[2].status === 'fulfilled' && results[2].value?.success) setDeals(results[2].value.deals || []);
      if (results[3].status === 'fulfilled' && results[3].value?.success) {
        setBalance(results[3].value.balance || 0);
        setPendingBalance(results[3].value.pending || 0);
      }
      if (results[4].status === 'fulfilled' && results[4].value?.success) setTransactions(results[4].value.transactions || []);
      if (results[5].status === 'fulfilled' && results[5].value?.success) {
        setAnalytics({
          campaignPerformance: results[5].value.analytics?.campaignPerformance || [],
          platformDistribution: results[5].value.analytics?.platforms || [],
          topCreators: results[5].value.analytics?.topCreators || [],
          engagement: results[5].value.analytics?.engagement || {}
        });
      }

      // Recompute stats - use safe access to results
      const dealsData = results[2].value?.deals || [];
      const activeCampaignsCount = results[1].value?.campaigns?.filter(c => c.status === 'active')?.length || 0;
      const activeDealsCount = dealsData.filter(d => ['accepted', 'in-progress'].includes(d.status))?.length || 0;
      const completedDealsCount = dealsData.filter(d => d.status === 'completed')?.length || 0;
      const totalSpentAmount = dealsData.filter(d => d.status === 'completed').reduce((sum, d) => sum + (d.budget || 0), 0) || 0;

      setStats({
        totalCampaigns: results[1].value?.campaigns?.length || 0,
        activeCampaigns: activeCampaignsCount,
        totalDeals: dealsData.length,
        activeDeals: activeDealsCount,
        completedDeals: completedDealsCount,
        totalSpent: totalSpentAmount,
        avgROI: results[5].value?.analytics?.summary?.avgROI || 0
      });

      if (showToast) toast.success('Dashboard refreshed');
    } catch (error) {
      console.error('Dashboard error:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []); // Remove dateRange dependency to prevent infinite loop

  // Store the latest function in ref
  fetchDashboardDataRef.current = fetchDashboardData;

  useEffect(() => {
    // Delay API calls to prevent race condition with auth state
    const timer = setTimeout(() => {
      if (fetchDashboardDataRef.current) {
        fetchDashboardDataRef.current();
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [dateRange]); // Only depend on dateRange, not fetchDashboardData

  const handleRefresh = () => {
    if (fetchDashboardDataRef.current) {
      fetchDashboardDataRef.current(true);
    }
  };

  const activeDealsList = useMemo(() => (deals || []).filter(d => ['accepted', 'in-progress'].includes(d.status)), [deals]);
  const completedDealsList = useMemo(() => (deals || []).filter(d => d.status === 'completed'), [deals]);

  const processedAnalytics = analytics ? {
    campaignPerformance: analytics.campaignPerformance || [],
    platforms: analytics.platforms || [],
    topCreators: analytics.topCreators || [],
    engagement: analytics.engagement || {
      impressions: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      clicks: 0
    },
    summary: analytics.summary || {
      totalCampaigns: 0,
      activeCampaigns: 0,
      totalDeals: 0,
      completedDeals: 0,
      totalSpent: 0,
      avgROI: 0
    }
  } : null;

  const performanceData = processedAnalytics?.campaignPerformance?.map(item => ({
    date: item.month || 'Unknown',
    value: item.spent || 0,
    campaigns: item.campaigns || 0
  })) || [];

  const platformData = processedAnalytics?.platforms?.map(item => ({
    name: item._id || 'Unknown',
    value: item.spend || 0,
    count: item.count || 0
  })) || [];

  const topCreatorsData = processedAnalytics?.topCreators?.map(creator => ({
    name: creator.creator?.displayName || 'Unknown',
    value: creator.totalSpent || 0,
    deals: creator.deals || 0,
    avgDeal: creator.avgDealValue || 0,
    followers: creator.creator?.followers || 0
  })) || [];

  const engagementMetrics = [
    { label: 'Impressions', value: formatNumber(analytics?.engagement?.impressions || 0), icon: Eye },
    { label: 'Likes', value: formatNumber(analytics?.engagement?.likes || 0), icon: Heart },
    { label: 'Comments', value: formatNumber(analytics?.engagement?.comments || 0), icon: MessageSquare },
    { label: 'Shares', value: formatNumber(analytics?.engagement?.shares || 0), icon: Share2 },
  ];

  const summaryMetrics = [
    { title: 'Total Campaigns', value: stats?.totalCampaigns || 0, icon: Megaphone },
    { title: 'Active Campaigns', value: stats?.activeCampaigns || 0, icon: Target },
    { title: 'Total Spent', value: formatCurrency(stats?.totalSpent || 0), icon: DollarSign },
    { title: 'Avg ROI', value: `${(stats?.avgROI || 0).toFixed(1)}x`, icon: TrendingUp },
    { title: 'Total Deals', value: stats?.totalDeals || 0, icon: Handshake },
    { title: 'Completed Deals', value: stats?.completedDeals || 0, icon: Award },
  ];

  const metrics = [
    { title: 'Total Campaigns', value: stats.totalCampaigns.toString(), change: `${stats.activeCampaigns} active`, icon: Megaphone },
    { title: 'Active Deals', value: activeDealsList.length.toString(), change: `${completedDealsList.length} completed`, icon: Handshake },
    { title: 'Total Spent', value: formatCurrency(stats.totalSpent), change: `Avg ROI: ${stats.avgROI.toFixed(1)}x`, icon: DollarSign },
    { title: 'Available Balance', value: formatCurrency(balance), change: `${formatCurrency(pendingBalance)} pending`, icon: Wallet }
  ];

  if (loading && !refreshing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-zinc-500 mx-auto mb-4" />
          <p className="text-zinc-500 text-xs font-medium">Loading your dashboard...</p>
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
              Brand <span className=" font-bold">Dashboard</span>
            </h1>
            <p className={`text-sm mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Manage creator partnerships and track performance.
            </p>
          </div>
          
       <button
  onClick={handleRefresh}
  disabled={refreshing}
  className={`p-2 rounded-lg border transition-all duration-300 ease-in-out active:scale-95 disabled:opacity-50 ${
    isDark 
      ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800' 
      : 'bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800'
  }`}
>
  <RefreshCw 
    className={`w-4 h-4 transition-transform duration-500 ${
      refreshing ? 'animate-spin' : 'group-hover:rotate-180'
    }`} 
  />
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

        <div className="space-y-6">
          {activeTab === 'overview' && (
            <>
              
              {/* Stats Cards - Compact Version */}
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  {metrics.map((metric, idx) => (
    <div 
      key={idx} 
      className={`
        group p-6 rounded-[2rem] border transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
        cursor-default hover:scale-[1.02]
        ${isDark 
          ? 'bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-900 hover:border-zinc-600 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]' 
          : 'bg-white border-zinc-100 hover:border-zinc-300 hover:shadow-[0_20px_40px_rgba(0,0,0,0.05)]'}
      `}
    >
      <div className="flex justify-between items-start mb-4">
        {/* Icon Squircle with Spring Animation */}
        <div className={`
          p-2.5 rounded-2xl transition-all duration-500 transform group-hover:rotate-[-10deg] group-hover:scale-110
          ${isDark 
            ? 'bg-zinc-800 text-zinc-400 group-hover:bg-white group-hover:text-black' 
            : 'bg-zinc-50 text-zinc-600 group-hover:bg-black group-hover:text-white shadow-sm'}
        `}>
          <metric.icon size={18} strokeWidth={2.5} />
        </div>

        {/* Dynamic Change Badge */}
        <span className={`
          text-[9px] font-black uppercase tracking-[0.1em] px-2 py-1 rounded-md transition-colors
          ${metric.change.includes('+') 
            ? 'text-emerald-500 bg-emerald-500/5' 
            : 'text-zinc-400 bg-zinc-500/5'}
        `}>
          {metric.change}
        </span>
      </div>

      <div className="space-y-1">
        <h3 className={`
          text-[10px] font-black uppercase tracking-[0.15em] transition-colors
          ${isDark ? 'text-zinc-500 group-hover:text-zinc-300' : 'text-zinc-400 group-hover:text-zinc-600'}
        `}>
          {metric.title}
        </h3>
        
        <p className={`
          text-2xl font-mono font-bold tracking-tighter transition-all
          ${isDark ? 'text-white' : 'text-black'}
        `}>
          {metric.value}
        </p>
      </div>

      {/* Subtle Bottom Glow Line */}
      <div className={`
        h-[2px] w-0 group-hover:w-full transition-all duration-700 mt-4 rounded-full
        ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}
      `} />
    </div>
  ))}
</div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  {/* Campaign Performance Chart */}
  <div className={`p-5 rounded-xl border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} shadow-sm`}>
    <h3 className={`text-sm font-bold mb-4 ${isDark ? 'text-white' : 'text-black'}`}>Campaign Performance</h3>
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        {performanceData.length > 0 ? (
          <AreaChart data={performanceData}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isDark ? "#ffffff" : "#000000"} stopOpacity={0.1} />
                <stop offset="95%" stopColor={isDark ? "#ffffff" : "#000000"} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#27272a' : '#f4f4f5'} />
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#a1a1aa', fontSize: 10}} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{fill: '#a1a1aa', fontSize: 10}} tickFormatter={v => `$${v}`} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: isDark ? '#18181b' : '#fff', 
                border: isDark ? '1px solid #27272a' : 'none',
                borderRadius: '8px', 
                fontSize: '12px' 
              }}
              itemStyle={{ color: isDark ? '#fff' : '#000' }}
            />
            <Area type="monotone" dataKey="value" stroke={isDark ? "#fff" : "#000"} strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
          </AreaChart>
        ) : (
          <div className="h-full flex items-center justify-center text-zinc-400 text-xs italic">No data available</div>
        )}
      </ResponsiveContainer>
    </div>
  </div>

  {/* Platform Distribution Chart */}
<div className={`
  group relative p-8 rounded-[2.5rem] border transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]
  ${isDark 
    ? 'bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-900 hover:border-zinc-700 hover:shadow-[0_30px_60px_rgba(0,0,0,0.5)]' 
    : 'bg-white border-zinc-100 hover:border-zinc-200 hover:shadow-[0_30px_60px_rgba(0,0,0,0.05)]'}
`}>
  {/* Decorative Corner Accent */}
  <div className={`
    absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-tr-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity duration-700
  `} />

  <h3 className={`
    text-[11px] font-black uppercase tracking-[0.2em] mb-8 transition-colors
    ${isDark ? 'text-zinc-500 group-hover:text-zinc-300' : 'text-zinc-400 group-hover:text-zinc-900'}
  `}>
    Platform Distribution
  </h3>

  <div className="h-[240px] w-full relative group-hover:scale-105 transition-transform duration-700 ease-out">
    <ResponsiveContainer width="100%" height="100%">
      {platformData.length > 0 ? (
        <RePieChart>
          <Pie
            data={platformData}
            innerRadius={65} // Increased slightly for a more modern "thin" donut look
            outerRadius={85}
            paddingAngle={8}  // More space between segments looks more premium
            stroke="none"      // Removes the default white border on slices
            dataKey="value"
            animationBegin={0}
            animationDuration={1500}
            animationEasing="ease-out"
          >
            {platformData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={isDark && entry.color === '#000000' ? '#ffffff' : entry.color}
                className="hover:opacity-80 transition-opacity duration-300 cursor-pointer"
              />
            ))}
          </Pie>
          <Tooltip 
            cursor={false}
            contentStyle={{ 
              backgroundColor: isDark ? 'rgba(24, 24, 27, 0.95)' : 'rgba(255, 255, 255, 0.95)', 
              border: isDark ? '1px solid rgba(63, 63, 70, 0.4)' : '1px solid rgba(228, 228, 231, 0.4)',
              borderRadius: '16px', 
              fontSize: '10px',
              fontWeight: '900',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              padding: '12px'
            }} 
            itemStyle={{ padding: '2px 0' }}
          />
        </RePieChart>
      ) : (
        <div className="h-full flex flex-col items-center justify-center gap-3">
          <div className={`w-12 h-12 rounded-full border-2 border-dashed ${isDark ? 'border-zinc-800' : 'border-zinc-100'} animate-spin-slow`} />
          <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest opacity-40">Awaiting Data</span>
        </div>
      )}
    </ResponsiveContainer>

    {/* Center Label (Optional - adds that "High-End" feel) */}
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
      <span className={`text-[10px] font-black uppercase tracking-tighter opacity-40 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
        Channels
      </span>
    </div>
  </div>
</div>
</div>
              {/* Transactions - Compact rows */}
            {transactions.length > 0 && (
  <div className={`
    group relative rounded-[2.5rem] border transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]
    ${isDark 
      ? 'bg-zinc-900/40 border-zinc-800/60 hover:border-zinc-700 hover:bg-zinc-900 shadow-2xl shadow-black/50' 
      : 'bg-white border-zinc-100 hover:border-zinc-200 hover:shadow-[0_30px_60px_rgba(0,0,0,0.04)]'}
  `}>
    {/* Card Header */}
    <div className="px-10 py-6 flex justify-between items-center border-b border-inherit">
      <div>
        <h2 className={`text-[11px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
          Recent Ledger
        </h2>
        <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider mt-1 opacity-60">Latest Financial Cycles</p>
      </div>
      <button 
        className={`
          px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
          ${isDark 
            ? 'bg-zinc-800 text-zinc-400 hover:bg-white hover:text-black' 
            : 'bg-zinc-50 text-zinc-500 hover:bg-black hover:text-white'}
        `}
      >
        View Full History
      </button>
    </div>

    {/* Table Header Row (Hidden on mobile) */}
    <div className={`hidden md:grid grid-cols-12 px-10 py-4 text-[9px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
      <div className="col-span-5">Description</div>
      <div className="col-span-2">Timeline</div>
      <div className="col-span-3">Amount</div>
      <div className="col-span-2 text-right">Clearance</div>
    </div>

    {/* Transactions List */}
    <div className="pb-6">
      {transactions.slice(0, 5).map((transaction) => (
        <div 
          key={transaction._id} 
          className={`
            grid grid-cols-1 md:grid-cols-12 items-center px-10 py-4 transition-all duration-300
            hover:bg-zinc-500/5 cursor-default group/row
          `}
        >
          {/* Description */}
          <div className="col-span-5 flex items-center gap-3">
            <div className={`w-1.5 h-1.5 rounded-full ${transaction.status === 'completed' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-zinc-500 animate-pulse'}`} />
            <span className={`text-[13px] font-bold tracking-tight ${isDark ? 'text-zinc-300 group-hover/row:text-white' : 'text-zinc-700 group-hover/row:text-black'}`}>
              {transaction.description || 'Campaign Settlement'}
            </span>
          </div>

          {/* Date */}
          <div className="col-span-2 text-[11px] font-mono font-medium text-zinc-500 uppercase tracking-tighter">
            {timeAgo(transaction.createdAt)}
          </div>

          {/* Amount */}
          <div className="col-span-3">
            <span className={`text-[15px] font-mono font-bold tracking-tighter ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
              {formatCurrency(transaction.amount || 0)}
            </span>
          </div>

          {/* Status */}
          <div className="col-span-2 text-right">
            <span className={`
              inline-flex items-center px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border
              ${transaction.status === 'completed' 
                ? (isDark ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-500' : 'bg-emerald-50 border-emerald-100 text-emerald-600')
                : (isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-500' : 'bg-zinc-50 border-zinc-100 text-zinc-400')}
            `}>
              {transaction.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  </div>
)}
            </>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {summaryMetrics.map((metric, idx) => (
                 <div 
  key={idx} 
  className={`
    group relative p-4 rounded-2xl border transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
    cursor-default hover:scale-[1.05]
    ${isDark 
      ? 'bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-900 hover:border-zinc-500 hover:shadow-[0_15px_30px_rgba(0,0,0,0.4)]' 
      : 'bg-white border-zinc-100 hover:border-zinc-300 hover:shadow-[0_15px_30px_rgba(0,0,0,0.04)]'}
  `}
>
  {/* The Metric Title - Higher Tracking for "Monitor" vibe */}
  <p className={`
    text-[9px] font-black uppercase tracking-[0.2em] mb-1 transition-colors duration-500
    ${isDark ? 'text-zinc-600 group-hover:text-zinc-400' : 'text-zinc-400 group-hover:text-zinc-600'}
  `}>
    {metric.title}
  </p>
  
  {/* The Value - Mono font for precision */}
  <p className={`
    text-lg font-mono font-bold tracking-tighter transition-all duration-500
    ${isDark ? 'text-white' : 'text-black'}
  `}>
    {metric.value}
  </p>

  {/* Hidden Interaction Indicator (A small dot that appears on hover) */}
  <div className={`
    absolute top-3 right-3 w-1 h-1 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500
    ${isDark ? 'bg-white shadow-[0_0_8px_white]' : 'bg-black shadow-[0_0_8px_black]'}
  `} />
</div>
                ))}
              </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
       {/* Engagement Breakdown Card */}
     <div className={`
  group relative p-8 rounded-[2.5rem] border transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]
  ${isDark 
    ? 'bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-900 hover:border-zinc-700 hover:shadow-[0_30px_60px_rgba(0,0,0,0.5)]' 
    : 'bg-white border-zinc-100 hover:border-zinc-200 hover:shadow-[0_30px_60px_rgba(0,0,0,0.05)]'}
`}>
  {/* Header with Meta Info */}
  <div className="flex justify-between items-start mb-8">
    <h3 className={`
      text-[11px] font-black uppercase tracking-[0.2em] transition-colors
      ${isDark ? 'text-zinc-500 group-hover:text-zinc-300' : 'text-zinc-400 group-hover:text-zinc-900'}
    `}>
      Engagement Breakdown
    </h3>
    <div className={`
      px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity duration-500
      ${isDark ? 'bg-white text-black' : 'bg-black text-white'}
    `}>
      Live Metrics
    </div>
  </div>

  <div className="h-[240px] w-full group-hover:translate-x-1 transition-transform duration-700">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart 
        data={engagementMetrics} 
        layout="vertical"
        margin={{ left: -20, right: 20 }}
      >
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
            backgroundColor: isDark ? 'rgba(24, 24, 27, 0.95)' : 'rgba(255, 255, 255, 0.95)', 
            border: isDark ? '1px solid rgba(63, 63, 70, 0.4)' : '1px solid rgba(228, 228, 231, 0.4)',
            borderRadius: '12px',
            fontSize: '10px',
            fontWeight: '900',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
            padding: '10px 14px'
          }}
          itemStyle={{ color: isDark ? '#fff' : '#000' }}
        />
        <Bar 
          dataKey="value" 
          fill={isDark ? "#ffffff" : "#000000"} 
          radius={[0, 10, 10, 0]} 
          barSize={12}
          animationBegin={200}
          animationDuration={1200}
          animationEasing="ease-out"
        >
          {/* Subtle Glow effect on bars for Dark Mode */}
          {isDark && engagementMetrics.map((entry, index) => (
            <Cell key={`cell-${index}`} fill="url(#barGradient)" />
          ))}
        </Bar>
        
        {/* SVG Definition for Gradient (Optional but adds depth) */}
        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#71717a" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>
        </defs>
      </BarChart>
    </ResponsiveContainer>
  </div>
  
  {/* Footer Detail */}
  <div className={`mt-4 pt-4 border-t border-inherit flex items-center justify-between opacity-40`}>
    <span className="text-[9px] font-black uppercase tracking-widest">Aggregate Score</span>
    <span className="text-[12px] font-mono font-bold">8.42</span>
  </div>
</div>
       
       {/* Small Metric Grid */}
<div className="grid grid-cols-2 gap-4">
  {engagementMetrics.map((metric, idx) => (
    <div 
      key={idx} 
      className={`
        group relative p-6 rounded-[2rem] border transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
        cursor-default hover:scale-[1.03]
        ${isDark 
          ? 'bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-900 hover:border-zinc-500 hover:shadow-[0_20px_40px_rgba(0,0,0,0.6)]' 
          : 'bg-white border-zinc-100 hover:border-zinc-300 hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)]'}
      `}
    >
      {/* Icon with Floating Animation */}
      <div className={`
        mb-4 transition-all duration-500 transform group-hover:-translate-y-1
        ${isDark ? 'text-zinc-500 group-hover:text-white' : 'text-zinc-400 group-hover:text-black'}
      `}>
        <metric.icon className="w-5 h-5 stroke-[1.5px]" />
      </div>

      <div className="relative z-10">
        <p className={`
          text-2xl font-mono font-bold tracking-tighter transition-all duration-500
          ${isDark ? 'text-white' : 'text-black'}
        `}>
          {metric.value}
        </p>
        
        <p className={`
          text-[10px] font-black uppercase tracking-[0.15em] mt-1 transition-colors duration-500
          ${isDark ? 'text-zinc-600 group-hover:text-zinc-400' : 'text-zinc-400 group-hover:text-zinc-600'}
        `}>
          {metric.label}
        </p>
      </div>

      {/* Background Glow (Dark Mode Only) */}
      {isDark && (
        <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      )}
    </div>
  ))}
</div>
    </div>
            </div>
          )}
        </div>
        
        {/* Floating Alert - Smaller */}
        {deals.filter(d => d.status === 'revision').length > 0 && (
          <div className="fixed bottom-6 right-6 animate-in slide-in-from-bottom-5 duration-500">
            <div className="bg-black text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-zinc-800">
              <AlertCircle className="w-4 h-4 text-zinc-400" />
              <div>
                <p className="text-xs font-bold">Action Required</p>
                <p className="text-[10px] text-zinc-400">{deals.filter(d => d.status === 'revision').length} Revisions</p>
              </div>
              <Link to="/brand/deals?status=revision" className="ml-2 bg-white text-black text-[10px] font-bold px-3 py-1.5 rounded-md hover:bg-zinc-200 transition-colors">
                Review
              </Link>
            </div>
          </div>
        )}
      </div>
      <div className="h-16" />
    </div>
  );
};

export default BrandDashboard;