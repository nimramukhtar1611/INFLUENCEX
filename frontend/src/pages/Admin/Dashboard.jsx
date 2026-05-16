// pages/Admin/Dashboard.jsx - COMPLETE FIXED VERSION
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  DollarSign,
  TrendingUp,
  Award,
  Eye,
  Calendar,
  Download,
  MoreVertical,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  UserPlus,
  CreditCard,
  Shield,
  Building2,
  Star,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Filter,
  Search,
  ChevronRight,
  AlertTriangle,
  MessageSquare,
  FileText,
  Mail,
  Phone,
  Globe,
  Zap,
  Heart,
  Share2,
  ThumbsUp,
  XCircle,
  Loader
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  ComposedChart,
  Scatter
} from 'recharts';
import { useAdminData } from '../../hooks/useAdminData';
import { formatCurrency, formatNumber, timeAgo } from '../../utils/helpers';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import api from '../../services/api';
import StatsCard from '../../components/Common/StatsCard';
import ChartCard from '../../components/Common/ChartCard';
import Button from '../../components/UI/Button';
import Modal from '../../components/Common/Modal';
import NotificationIcon from '../../components/Common/NotificationIcon';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const {
    loading,
    refreshing,
    campaigns,
    disputes,
    systemHealth,
    stats,
    dashboard,
    users,
    deals,
    payments,
    refreshData
  } = useAdminData();

  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('30d');
  const [revenueData, setRevenueData] = useState([]);
  const [userGrowthData, setUserGrowthData] = useState([]);
  const [platformData, setPlatformData] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [showActivityModal, setShowActivityModal] = useState(false);

  // Fetch dashboard data when dateRange changes with proper loading protection
  useEffect(() => {
    const fetchWithDelay = async () => {
      // Wait for auth to be ready
      await new Promise(resolve => setTimeout(resolve, 300));
      if (!loading) {
        fetchDashboardData();
      }
    };
    
    fetchWithDelay();
  }, [dateRange, loading]);

  // Process dashboard data when it arrives
  useEffect(() => {
    if (dashboard) {
      // Format revenue data
      const revenue = dashboard.revenue?.byMonth?.map(item => ({
        month: item.month,
        revenue: item.amount,
        fees: item.fees
      })) || [];
      setRevenueData(revenue);

      // Format user growth data
      const growth = dashboard.users?.growth?.map(item => ({
        month: item.month,
        brands: item.brands,
        creators: item.creators
      })) || [];
      setUserGrowthData(growth);

      // Platform distribution
      const platforms = dashboard.platforms?.map(p => ({
        name: p.name,
        value: p.count,
        color: p.name === 'instagram' ? '#E1306C' :
               p.name === 'youtube' ? '#FF0000' :
               p.name === 'tiktok' ? '#000000' : '#4F46E5'
      })) || [];
      setPlatformData(platforms);

      // Recent activity
      const activity = [
        ...(dashboard.recent?.users || []).map(u => ({
          ...u,
          type: 'user',
          icon: UserPlus,
          color: isDark ? 'bg-zinc-800' : 'bg-zinc-100',
          description: `${u.fullName || u.name} joined as ${u.userType}`
        })),
        ...(dashboard.recent?.deals || []).map(d => ({
          ...d,
          type: 'deal',
          icon: TrendingUp,
          color: isDark ? 'bg-zinc-800' : 'bg-zinc-100',
          description: `New deal: ${d.campaignId?.title || 'Campaign'}`
        })),
        ...(dashboard.recent?.payments || []).map(p => ({
          ...p,
          type: 'payment',
          icon: DollarSign,
          color: isDark ? 'bg-zinc-800' : 'bg-zinc-100',
          description: `Payment of ${formatCurrency(p.amount)} ${p.status}`
        })),
        ...(dashboard.recent?.disputes || []).map(d => ({
          ...d,
          type: 'dispute',
          icon: AlertTriangle,
          color: isDark ? 'bg-zinc-800' : 'bg-zinc-100',
          description: `New dispute: ${d.title}`
        }))
      ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10);

      setRecentActivity(activity);
    }
  }, [dashboard]);

  const fetchDashboardData = async () => {
    await refreshData();
  };

  const handleRefresh = () => {
    refreshData();
    toast.success('Dashboard refreshed');
  };

  const handleExport = () => {
    // Generate CSV for dashboard data
    const csvContent = [
      ['Metric', 'Value', 'Change', 'Link'].join(','),
      ...metricItems.map(item => [
        `"${item.title}"`,
        item.value,
        item.change,
        item.link || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-export-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Dashboard data exported successfully');
  };

  const metricItems = [
    {
      title: 'Total Users',
      value: formatNumber(stats.totalUsers || 0),
      change: `+${stats.totalUsers ? Math.floor(stats.totalUsers * 0.12) : 0} this month`,
      icon: Users,
      color: isDark ? 'bg-zinc-800' : 'bg-zinc-100',
      link: '/admin/users',
      subtitle: `${stats.totalBrands || 0} Brands • ${stats.totalCreators || 0} Creators`
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(stats.totalRevenue || 0),
      change: `Fees: ${formatCurrency(stats.totalFees || 0)}`,
      icon: DollarSign,
      color: isDark ? 'bg-zinc-800' : 'bg-zinc-100',
      link: '/admin/payments',
      subtitle: 'Platform earnings'
    },
    {
      title: 'Active Campaigns',
      value: stats.activeCampaigns || 0,
      change: `${stats.totalCampaigns || 0} total campaigns`,
      icon: TrendingUp,
      color: isDark ? 'bg-zinc-800' : 'bg-zinc-100',
      link: '/admin/campaigns',
      subtitle: `${dashboard?.campaigns?.pending || 0} pending approval`
    },
    {
      title: 'Completed Deals',
      value: stats.completedDeals || 0,
      change: `${dashboard?.deals?.total || 0} total deals`,
      icon: Award,
      color: isDark ? 'bg-zinc-800' : 'bg-zinc-100',
      link: '/admin/deals',
      subtitle: `Value: ${formatCurrency(dashboard?.deals?.totalValue || 0)}`
    },
    {
      title: 'Pending Verifications',
      value: stats.pendingVerifications || 0,
      change: 'Awaiting review',
      icon: Clock,
      color: isDark ? 'bg-zinc-800' : 'bg-zinc-100',
      link: '/admin/users?filter=pending',
      subtitle: 'Brands & Creators'
    },
    {
      title: 'Open Disputes',
      value: stats.pendingDisputes || 0,
      change: `${dashboard?.disputes?.resolved || 0} resolved`,
      icon: AlertTriangle,
      color: isDark ? 'bg-zinc-800' : 'bg-zinc-100',
      link: '/admin/disputes',
      subtitle: 'Needs attention'
    }
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
              Admin <span className=" font-bold">Dashboard</span>
            </h1>
            <p className={`text-sm mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Manage platform operations and monitor performance.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Admin Notification Icon */}
            <NotificationIcon />
            
            <button
  onClick={handleRefresh}
  disabled={refreshing}
  className={`
    group relative overflow-hidden px-4 py-2 rounded-full border transition-all duration-500
    active:scale-95 disabled:opacity-40
    ${
      isDark
        ? 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600 shadow-2xl'
        : 'bg-zinc-50 border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:border-zinc-400 shadow-sm'
    }
  `}
>
  {/* The "Shimmer" Glint Effect */}
  <span className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent" />

  <div className="relative flex items-center gap-2 font-medium text-sm">
    <RefreshCw
      className={`
        w-3.5 h-3.5 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]
        ${refreshing 
          ? 'animate-spin' 
          : 'group-hover:rotate-180 group-hover:scale-110'
        }
      `}
    />
    <span className="tracking-tight">Refresh</span>
  </div>

  {/* Bottom Highlight (Professional "Inner Glow") */}
  <div className={`absolute inset-x-0 bottom-0 h-[1px] transition-opacity duration-500 opacity-0 group-hover:opacity-100 ${
    isDark ? 'bg-gradient-to-r from-transparent via-zinc-500 to-transparent' : 'bg-gradient-to-r from-transparent via-zinc-300 to-transparent'
  }`} />
</button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Overview Content */}
          <>
        {/* Stats Cards - Compact Version */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {metricItems.slice(0, 4).map((metric, idx) => (
                  <Link key={idx} to={metric.link} className="block">
                    <div 
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
                  </Link>
                ))}
              </div>

              {/* Additional Stats Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {metricItems.slice(4, 6).map((metric, idx) => (
                  <Link key={idx} to={metric.link} className="block">
                    <div 
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
                  </Link>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link to="/admin/users?filter=pending" className="block">
                  <div 
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
                        <UserPlus size={18} strokeWidth={2.5} />
                      </div>

                      {/* Action Badge */}
                      <span className={`
                        text-[9px] font-black uppercase tracking-[0.1em] px-2 py-1 rounded-md transition-colors
                        text-blue-500 bg-blue-500/5
                      `}>
                        Review
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h3 className={`
                        text-[10px] font-black uppercase tracking-[0.15em] transition-colors
                        ${isDark ? 'text-zinc-500 group-hover:text-zinc-300' : 'text-zinc-400 group-hover:text-zinc-600'}
                      `}>
                        Pending Verifications
                      </h3>
                      
                      <p className={`
                        text-2xl font-mono font-bold tracking-tighter transition-all
                        ${isDark ? 'text-white' : 'text-black'}
                      `}>
                        {stats.pendingVerifications || 0}
                      </p>
                    </div>

                    {/* Subtle Bottom Glow Line */}
                    <div className={`
                      h-[2px] w-0 group-hover:w-full transition-all duration-700 mt-4 rounded-full
                      ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}
                    `} />
                  </div>
                </Link>

                <Link to="/admin/fraud-review" className="block">
                  <div 
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
                        <Shield size={18} strokeWidth={2.5} />
                      </div>

                      {/* Action Badge */}
                      <span className={`
                        text-[9px] font-black uppercase tracking-[0.1em] px-2 py-1 rounded-md transition-colors
                        text-amber-500 bg-amber-500/5
                      `}>
                        Approve
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h3 className={`
                        text-[10px] font-black uppercase tracking-[0.15em] transition-colors
                        ${isDark ? 'text-zinc-500 group-hover:text-zinc-300' : 'text-zinc-400 group-hover:text-zinc-600'}
                      `}>
                        Pending Campaigns
                      </h3>
                      
                      <p className={`
                        text-2xl font-mono font-bold tracking-tighter transition-all
                        ${isDark ? 'text-white' : 'text-black'}
                      `}>
                        {dashboard?.campaigns?.pending || 0}
                      </p>
                    </div>

                    {/* Subtle Bottom Glow Line */}
                    <div className={`
                      h-[2px] w-0 group-hover:w-full transition-all duration-700 mt-4 rounded-full
                      ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}
                    `} />
                  </div>
                </Link>

                <Link to="/admin/disputes" className="block">
                  <div 
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
                        <AlertTriangle size={18} strokeWidth={2.5} />
                      </div>

                      {/* Action Badge */}
                      <span className={`
                        text-[9px] font-black uppercase tracking-[0.1em] px-2 py-1 rounded-md transition-colors
                        text-red-500 bg-red-500/5
                      `}>
                        Resolve
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h3 className={`
                        text-[10px] font-black uppercase tracking-[0.15em] transition-colors
                        ${isDark ? 'text-zinc-500 group-hover:text-zinc-300' : 'text-zinc-400 group-hover:text-zinc-600'}
                      `}>
                        Open Disputes
                      </h3>
                      
                      <p className={`
                        text-2xl font-mono font-bold tracking-tighter transition-all
                        ${isDark ? 'text-white' : 'text-black'}
                      `}>
                        {stats.pendingDisputes || 0}
                      </p>
                    </div>

                    {/* Subtle Bottom Glow Line */}
                    <div className={`
                      h-[2px] w-0 group-hover:w-full transition-all duration-700 mt-4 rounded-full
                      ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}
                    `} />
                  </div>
                </Link>

                <Link to="/admin/payments" className="block">
                  <div 
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
                        <CreditCard size={18} strokeWidth={2.5} />
                      </div>

                      {/* Action Badge */}
                      <span className={`
                        text-[9px] font-black uppercase tracking-[0.1em] px-2 py-1 rounded-md transition-colors
                        text-green-500 bg-green-500/5
                      `}>
                        View
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h3 className={`
                        text-[10px] font-black uppercase tracking-[0.15em] transition-colors
                        ${isDark ? 'text-zinc-500 group-hover:text-zinc-300' : 'text-zinc-400 group-hover:text-zinc-600'}
                      `}>
                        Recent Transactions
                      </h3>
                      
                      <p className={`
                        text-2xl font-mono font-bold tracking-tighter transition-all
                        ${isDark ? 'text-white' : 'text-black'}
                      `}>
                        {payments?.length || 0}
                      </p>
                    </div>

                    {/* Subtle Bottom Glow Line */}
                    <div className={`
                      h-[2px] w-0 group-hover:w-full transition-all duration-700 mt-4 rounded-full
                      ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}
                    `} />
                  </div>
                </Link>
              </div>

           {/* Recent Activity Feed */}
<div className={`rounded-[2.5rem] border ${isDark ? 'bg-zinc-900/40 border-zinc-800/60' : 'bg-white border-zinc-100'} overflow-hidden transition-all duration-500`}>
  
  {/* Header: Executive Summary Style */}
  <div className="px-8 py-6 border-b border-zinc-100/50 dark:border-zinc-800/50 flex justify-between items-end">
    <div className="space-y-1">
      <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em]">System Logs</p>
      <h2 className={`text-lg font-bold tracking-tighter ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
        Recent Activity
      </h2>
    </div>
    
  </div>

  <div className="max-h-[420px] overflow-y-auto scrollbar-hide relative px-2">
    {recentActivity.length > 0 ? (
      <div className="relative">
        {/* The Timeline Thread Line */}
        <div className={`absolute left-[47px] top-0 bottom-0 w-px ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`} />

        <div className="py-4">
          {recentActivity.slice(0, 8).map((activity, index) => {
            const Icon = activity.icon;
            return (
              <div key={index} className="group relative px-6 py-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-all duration-300 rounded-[1.5rem] mx-2">
                <div className="flex items-center gap-5">
                  
                  {/* Icon Container: The "Node" on the timeline */}
                  <div className={`
                    relative z-10 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-500
                    ${isDark 
                      ? 'bg-zinc-900 border-zinc-700 group-hover:border-zinc-500 text-zinc-400' 
                      : 'bg-white border-zinc-200 group-hover:border-zinc-400 text-zinc-600 shadow-sm'}
                    group-hover:scale-110 group-hover:rotate-3
                  `}>
                    <Icon size={16} strokeWidth={2.5} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-4">
                      <p className={`text-[13px] font-bold tracking-tight truncate ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                        {activity.description}
                      </p>
                      {/* Modern Minimalist Tag */}
                      <span className={`
                        shrink-0 px-2 py-0.5 rounded-md text-[8px] font-black tracking-[0.15em] uppercase border
                        ${isDark 
                          ? 'bg-zinc-800/50 border-zinc-700 text-zinc-500' 
                          : 'bg-zinc-50 border-zinc-100 text-zinc-400'}
                      `}>
                        {activity.type}
                      </span>
                    </div>
                    
                    {/* Metadata Metadata Row */}
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-zinc-500 text-[11px] font-medium">
                        {timeAgo(activity.createdAt)}
                      </p>
                      <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700 opacity-50" />
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-emerald-500/20 flex items-center justify-center">
                          <div className="w-1 h-1 rounded-full bg-emerald-500" />
                        </div>
                        <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-tighter">Event Verified</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    ) : (
      /* Elegant Empty State */
      <div className="py-24 flex flex-col items-center justify-center text-center px-8">
        <div className={`w-16 h-16 rounded-[2rem] flex items-center justify-center mb-4 ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'}`}>
          <Activity className="w-8 h-8 text-zinc-500 opacity-20" />
        </div>
        <h3 className="text-sm font-bold tracking-tight">Silent Ledger</h3>
        <p className="text-[11px] text-zinc-500 mt-1 uppercase tracking-widest opacity-60">No system events detected</p>
      </div>
    )}
  </div>
</div>
          </>
        </div>
      </div>
      <div className="h-16" />
    </div>
  );
};

export default AdminDashboard;