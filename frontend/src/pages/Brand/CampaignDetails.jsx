import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Edit,
  Archive,
  Users,
  DollarSign,
  Calendar,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle,
  MessageSquare,
  FileText,
  Eye,
  Send,
  Plus,
  Star,
  ThumbsUp,
  XCircle,
  BarChart2,
  BarChart3,
  Target,
  Image,
  Video,
  Trash2,
  ChevronRight,
  Pause,
  Play,
  RefreshCw,
  Loader,
  Award,
  Activity,
  Instagram,
  Youtube,
  Facebook,
  Globe,
  X,
  Music,
  Settings,
  Quote
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import campaignService from '../../services/campaignService';
import dealService from '../../services/dealService';
import api from '../../services/api';
import { formatCurrency, formatNumber, timeAgo, formatDate } from '../../utils/helpers';
import { getStatusColor } from '../../utils/colorScheme';
import Button from '../../components/UI/Button';
import StatsCard from '../../components/Common/StatsCard';
import ChartCard from '../../components/Common/ChartCard';
import Modal from '../../components/Common/Modal';
import Input from '../../components/UI/Input';
import toast from 'react-hot-toast';

const CampaignDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [campaign, setCampaign] = useState(null);
  const [deals, setDeals] = useState([]);
  const [applications, setApplications] = useState([]);
  const [invitedCreators, setInvitedCreators] = useState([]);
  const [selectedCreators, setSelectedCreators] = useState([]);
  const [messages, setMessages] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [newMessage, setNewMessage] = useState('');

  // Modals
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddCreatorModal, setShowAddCreatorModal] = useState(false);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [applicationFeedback, setApplicationFeedback] = useState('');

  const toFixedSafe = (value, digits = 1) => {
    const num = Number(value);
    return Number.isFinite(num) ? num.toFixed(digits) : '0';
  };

  // Fetch campaign details
  useEffect(() => {
    if (id) {
      fetchCampaignDetails();
    }
  }, [id]);

  const fetchCampaignDetails = async (showToast = false) => {
    try {
      if (showToast) setRefreshing(true);
      else setLoading(true);

      const response = await campaignService.getCampaign(id);

      if (response?.success) {
        const campaignData = response.campaign;
        setCampaign(campaignData);
        setDeals(response.deals || []);
        setApplications(Array.isArray(campaignData.applications) ? campaignData.applications : []);
        setInvitedCreators(Array.isArray(campaignData.invitedCreators) ? campaignData.invitedCreators : []);
        setSelectedCreators(Array.isArray(campaignData.selectedCreators) ? campaignData.selectedCreators : []);

        fetchCampaignAnalytics();

        if (showToast) toast.success('Campaign refreshed');
      } else {
        toast.error(response?.error || 'Failed to load campaign');
        navigate('/brand/campaigns');
      }
    } catch (error) {
      console.error('Fetch campaign error:', error);
      toast.error('Failed to load campaign details');
      navigate('/brand/campaigns');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchCampaignAnalytics = async () => {
    try {
      const response = await campaignService.getCampaignAnalytics(id);
      if (response?.success) {
        setAnalytics(response.metrics || {});
      }
    } catch (error) {
      console.error('Analytics error:', error);
    }
  };

  // Handle archive
  const handleArchive = async () => {
    try {
      setShowArchiveModal(false);
      const response = await campaignService.archiveCampaign(id);
      if (response?.success) {
        toast.success('Campaign archived');
        navigate('/brand/campaigns');
      } else {
        toast.error(response?.error || 'Failed to archive campaign');
      }
    } catch (error) {
      console.error('Archive error:', error);
      toast.error('Failed to archive campaign');
    }
  };

  // Handle unarchive
  const handleUnarchive = async () => {
    try {
      const response = await campaignService.updateCampaign(id, { status: 'draft' });
      if (response?.success) {
        toast.success('Campaign unarchived');
        fetchCampaignDetails();
      } else {
        toast.error(response?.error || 'Failed to unarchive campaign');
      }
    } catch (error) {
      console.error('Unarchive error:', error);
      toast.error('Failed to unarchive campaign');
    }
  };

  // Handle delete
  const handleDelete = async () => {
    try {
      setShowDeleteModal(false);
      const response = await campaignService.deleteCampaign(id);
      if (response?.success) {
        toast.success('Campaign deleted successfully');
        navigate('/brand/campaigns');
      } else {
        toast.error(response?.error || 'Failed to delete campaign');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error.response?.data?.message || 'Failed to delete campaign');
    }
  };

  // Handle edit
  const handleEdit = () => {
    navigate(`/brand/campaigns/${id}/edit`);
  };

  // Handle application review
  const handleReviewApplication = async (applicationId, status) => {
    try {
      const response = await campaignService.reviewApplication(id, applicationId, status, applicationFeedback);
      if (response?.success) {
        toast.success(`Application ${status}`);
        setShowApplicationModal(false);
        setSelectedApplication(null);
        setApplicationFeedback('');
        fetchCampaignDetails();
      } else {
        toast.error(response?.error || `Failed to ${status} application`);
      }
    } catch (error) {
      console.error('Review error:', error);
      toast.error('Failed to review application');
    }
  };

  // Status helpers
  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-blue-100 text-blue-800',
      draft: 'bg-gray-100 text-gray-800',
      paused: 'bg-orange-100 text-orange-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      accepted: 'bg-green-100 text-green-800',
      declined: 'bg-red-100 text-red-800',
      archived: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status) => {
    const icons = {
      active: <CheckCircle className="w-4 h-4" />,
      pending: <Clock className="w-4 h-4" />,
      completed: <CheckCircle className="w-4 h-4" />,
      draft: <FileText className="w-4 h-4" />,
      paused: <Pause className="w-4 h-4" />,
      accepted: <CheckCircle className="w-4 h-4" />,
      declined: <XCircle className="w-4 h-4" />,
    };
    return icons[status] || <AlertCircle className="w-4 h-4" />;
  };

  const getPlatformIcon = (platform) => {
    const icons = {
      instagram: Instagram,
      youtube: Youtube,
      tiktok: Music,
      facebook: Facebook,
    };
    const Icon = icons[platform] || Globe;
    return <Icon className="w-4 h-4" />;
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-zinc-500 mx-auto mb-4" />
          <p className="text-zinc-500 text-xs font-medium">Loading campaign details...</p>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Campaign Not Found</h2>
        <Link to="/brand/campaigns" className="text-indigo-600 hover:text-indigo-700">
          Back to Campaigns
        </Link>
      </div>
    );
  }

  // Computed values
  const totalBudget = campaign.budget || 0;
  const spentBudget = campaign.spent || 0;
  const remaining = totalBudget - spentBudget;
  const totalDeliverables = campaign.deliverables?.reduce((sum, d) => sum + (d?.quantity || 1), 0) || 0;
  const completedDeliverables = deals.reduce(
    (sum, d) => sum + (d?.deliverables?.filter(del => del?.status === 'approved').length || 0),
    0
  );
  const progress = totalDeliverables > 0 ? Math.round((completedDeliverables / totalDeliverables) * 100) : 0;
  const pendingApps = applications.filter(a => a?.status === 'pending').length;

  return (
    <div className={`max-w-7xl mx-auto space-y-8 p-6 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
      
      {/* Header Section */}
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 overflow-hidden">
  <div className="space-y-1">
    <div className="flex items-center gap-4">
      {/* Back Button with hover slide effect */}
      <Link
        to="/brand/campaigns"
        className={`group p-2 rounded-xl transition-all duration-300 border ${
          isDark 
            ? 'hover:bg-zinc-800 text-zinc-400 border-transparent hover:border-zinc-700' 
            : 'hover:bg-white text-zinc-500 border-transparent hover:border-zinc-200 hover:shadow-sm'
        } animate-in fade-in slide-in-from-left-4 duration-500`}
      >
        <ChevronRight className="w-5 h-5 rotate-180 transition-transform group-hover:-translate-x-1" />
      </Link>

      {/* Title with tracking-in animation */}
      <div className="animate-in fade-in slide-in-from-left-8 duration-700 delay-75">
        <h1 className={`text-3xl font-semibold tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>
          Campaign <span className="font-extrabold ">Details</span>
        </h1>
      </div>
    </div>

    {/* Subtitle with a slower fade */}
    <p className={`text-sm max-w-2xl animate-in fade-in slide-in-from-top-2 duration-1000 delay-150 ${
      isDark ? 'text-zinc-500' : 'text-zinc-400'
    }`}>
      <span className={`font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
        {campaign.name || 'Untitled Campaign'}
      </span>
      <span className="mx-2">•</span>
      Manage performance and creator relationships in real-time.
    </p>
  </div>
  
  {/* Action Buttons with staggered pop-in */}
  <div className="flex items-center gap-3 animate-in fade-in zoom-in-95 duration-700 delay-300">
    {[
      { icon: RefreshCw, onClick: () => fetchCampaignDetails(true), label: 'Refresh' },
      { icon: Edit, onClick: handleEdit, label: 'Edit' }
    ].map((btn, i) => (
      <button
        key={i}
        onClick={btn.onClick}
        className={`group relative p-2.5 rounded-xl transition-all duration-300 border active:scale-90 ${
          isDark 
            ? 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 hover:bg-zinc-800' 
            : 'bg-white border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:border-zinc-300 hover:shadow-md'
        }`}
      >
        <btn.icon className={`w-4 h-4 transition-transform duration-500 ${
          btn.label === 'Refresh' ? 'group-hover:rotate-180' : 'group-hover:scale-110'
        }`} />
        
        {/* Tooltip on hover */}
        <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-zinc-900 text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          {btn.label}
        </span>
      </button>
    ))}
  </div>
</div>

      {/* Status Types */}
      <div className={`
  relative overflow-hidden rounded-2xl border p-1 transition-all duration-500 group
  ${isDark 
    ? 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 shadow-2xl shadow-black/40' 
    : 'bg-zinc-50/50 border-zinc-200 hover:border-zinc-300 shadow-sm'}
`}>
  {/* Hover Spot Light (Background glow that follows the card) */}
  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-[radial-gradient(circle_at_var(--mouse-x)_var(--mouse-y),rgba(255,255,255,0.03),transparent_40%)] pointer-events-none" />

  <div className="flex flex-wrap items-center gap-2 p-3">
    
    {/* Status Pill with Ping Animation */}
    <div className={`
      flex items-center gap-2.5 px-3 py-1.5 rounded-full border transition-all duration-300
      ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'}
    `}>
      <div className="relative flex h-2 w-2">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${getStatusColor(campaign.status, 'status', isDark).split(' ')[0]}`}></span>
        <span className={`relative inline-flex rounded-full h-2 w-2 ${getStatusColor(campaign.status, 'status', isDark).split(' ')[0]}`}></span>
      </div>
      <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
        {campaign.status}
      </span>
    </div>

    {/* Vertical Divider (Visible on Desktop) */}
    <div className="hidden lg:block w-[1px] h-4 bg-zinc-800/50 mx-1" />

    {/* Metric Items */}
    {[
      { icon: DollarSign, label: formatCurrency(totalBudget), color: 'text-blue-500', bg: 'hover:bg-blue-500/10' },
      { icon: Users, label: `${selectedCreators.length} creators`, color: 'text-emerald-500', bg: 'hover:bg-emerald-500/10' },
      { icon: TrendingUp, label: `${progress}% complete`, color: 'text-purple-500', bg: 'hover:bg-purple-500/10' },
      { icon: Award, label: `${applications.length} apps`, color: 'text-orange-500', bg: 'hover:bg-orange-500/10' },
    ].map((item, idx) => (
      <div 
        key={idx}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-300 cursor-default
          ${item.bg} group/item
        `}
      >
        <item.icon className={`w-3.5 h-3.5 ${item.color} transition-transform duration-300 group-hover/item:scale-110`} />
        <span className={`text-sm font-medium transition-colors duration-300 ${
          isDark ? 'text-zinc-400 group-hover/item:text-zinc-200' : 'text-zinc-600 group-hover/item:text-zinc-900'
        }`}>
          {item.label}
        </span>
      </div>
    ))}
  </div>
</div>

      {/* Progress bar */}
<div className={`
  relative overflow-hidden rounded-xl border transition-all duration-500 group
  max-w-[340px] p-4
  ${isDark 
    ? 'bg-zinc-950/60 border-zinc-800/40 hover:border-zinc-700/60 backdrop-blur-md shadow-2xl' 
    : 'bg-white border-zinc-100 hover:border-zinc-200 backdrop-blur-sm shadow-sm'}
`}>
  {/* Subtler Radial Glow */}
  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-[radial-gradient(300px_at_50%_0%,rgba(59,130,246,0.05),transparent)] pointer-events-none" />

  <div className="relative z-10">
    <div className="flex items-start justify-between mb-3">
      <div>
        <div className="flex items-center gap-1.5 mb-0.5">
          <div className="h-1 w-1 rounded-full bg-blue-500 animate-pulse" />
          <p className={`text-[9px] uppercase tracking-[0.2em] font-medium ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            Live
          </p>
        </div>
        <h3 className={`text-sm font-semibold tracking-tight ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
          Campaign Progress
        </h3>
      </div>
      <div className="text-right">
        <span className={`text-sm font-bold font-mono ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
          {progress}<span className="text-[9px] ml-0.5 opacity-60">%</span>
        </span>
      </div>
    </div>

    {/* Slimmer Progress Bar */}
    <div className={`relative w-full rounded-full h-1.5 overflow-hidden ${isDark ? 'bg-zinc-900' : 'bg-zinc-100'}`}>
      <div
        className="relative h-full rounded-full transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)]"
        style={{ 
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
        }}
      >
        {/* Minimal Leading Edge */}
        <div className="absolute right-0 top-0 h-full w-4 bg-white/20 blur-sm" />
      </div>
    </div>

    {/* Compact Stats Grid */}
    <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-zinc-800/10">
      {[
        { label: 'Budget', value: totalBudget, color: isDark ? 'text-zinc-400' : 'text-zinc-500' },
        { label: 'Spent', value: spentBudget, color: 'text-blue-500' },
        { label: 'Left', value: remaining, color: 'text-emerald-500' }
      ].map((stat, idx) => (
        <div key={stat.label} className="flex flex-col">
          <span className={`text-[8px] uppercase tracking-wider mb-0.5 font-semibold ${stat.color} opacity-80`}>
            {stat.label}
          </span>
          <span className={`text-[11px] font-bold ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
            {formatCurrency(stat.value)}
          </span>
        </div>
      ))}
    </div>
  </div>
</div>
      {/* Tab Navigation - Matching Other Brand Pages Style */}
  <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
  <div className="flex items-center gap-2 overflow-x-auto pb-1 w-full lg:w-auto no-scrollbar scroll-smooth">
    {[
      { id: 'overview', label: 'Overview', icon: Eye },
      { id: 'creators', label: 'Creators', icon: Users, badge: selectedCreators.length },
      { id: 'applications', label: 'Applications', icon: FileText, badge: pendingApps },
      { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    ].map(({ id: tabId, label, icon: Icon, badge }) => {
      const isActive = activeTab === tabId;
      
      return (
        <button
          key={tabId}
          onClick={() => setActiveTab(tabId)}
          className={`
            relative flex items-center gap-2 px-4 py-2 rounded-full 
            text-[9px] font-bold uppercase tracking-[0.12em]
            transition-all duration-300 ease-out
            border whitespace-nowrap active:scale-95 group
            ${isActive 
              ? (isDark 
                  ? 'bg-black  text-white border-white text-zinc-950 shadow-lg' 
                  : 'bg-zinc-950 border-zinc-950 text-white shadow-md shadow-zinc-950/20')
              : (isDark 
                  ? 'border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300' 
                  : 'border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:text-zinc-800')
            }
          `}
        >
          <Icon className={`
            w-3 h-3 transition-transform duration-500
            ${isActive ? 'opacity-100 scale-110' : 'opacity-50 group-hover:opacity-100'}
          `} />
          
          <span className="relative z-10">{label}</span>

          {badge > 0 && (
            <span className={`
              ml-1 text-[8px] rounded-full min-w-[16px] h-[16px] flex items-center justify-center font-black
              transition-all duration-300
              ${isActive 
                ? (isDark ? 'bg-zinc-100 text-zinc-950' : 'bg-zinc-800 text-white') 
                : 'bg-blue-500 text-white'}
            `}>
              {badge}
            </span>
          )}
        </button>
      );
    })}
  </div>
</div>

      {/* ==================== OVERVIEW TAB ==================== */}
   {activeTab === 'overview' && (
  <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
    <div className={`rounded-2xl border transition-all duration-500 ${
      isDark 
        ? 'bg-zinc-900/40 border-zinc-800/50 backdrop-blur-xl' 
        : 'bg-white border-zinc-200 shadow-sm'
    }`}>
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Description Section */}
            <section className="group">
              <div className="flex items-center gap-3 mb-4">
                <div className={`h-8 w-1 rounded-full ${isDark ? 'bg-blue-500/50' : 'bg-blue-600'}`} />
                <h2 className={`text-lg font-bold tracking-tight ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                  Campaign Description
                </h2>
              </div>
              <p className={`text-sm leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                {campaign.description || 'No description provided'}
              </p>

              {campaign.objectives?.length > 0 && (
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {campaign.objectives.map((obj, i) => (
                    <div 
                      key={i} 
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 hover:scale-[1.02] ${
                        isDark ? 'bg-zinc-800/30 border-zinc-800' : 'bg-zinc-50 border-zinc-100'
                      }`}
                    >
                      <div className="flex-shrink-0 h-5 w-5 rounded-full bg-emerald-500/10 flex items-center justify-center">
                        <CheckCircle className="w-3 h-3 text-emerald-500" />
                      </div>
                      <span className={`text-xs font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>{obj}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Deliverables Section */}
            <section>
              <h2 className={`text-lg font-bold tracking-tight mb-4 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                Deliverables
              </h2>
              <div className="grid gap-3">
                {campaign.deliverables?.length > 0 ? (
                  campaign.deliverables.map((del, i) => (
                    <div
                      key={i}
                      className={`group flex items-center justify-between p-4 rounded-xl border transition-all duration-300 hover:shadow-lg ${
                        isDark 
                          ? 'bg-zinc-900/50 border-zinc-800/50 hover:border-zinc-700 hover:bg-zinc-800/50' 
                          : 'bg-white border-zinc-100 hover:border-zinc-300 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2.5 rounded-xl transition-transform duration-300 group-hover:scale-110 ${
                          isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-600'
                        }`}>
                          {getPlatformIcon(del.platform)}
                        </div>
                        <div>
                          <p className={`text-sm font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                            {del.quantity || 1}x {del.type}
                          </p>
                          <p className={`text-[10px] uppercase tracking-widest font-semibold ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            {del.platform}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        {del.budget > 0 && (
                          <span className={`text-sm font-mono font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                            {formatCurrency(del.budget)}
                          </span>
                        )}
                        <span className={`px-3 py-1 text-[10px] rounded-full font-black uppercase tracking-tighter transition-colors ${
                          getStatusColor(del.status || 'pending', 'status', isDark)
                        }`}>
                          {del.status || 'pending'}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 border-2 border-dashed border-zinc-800 rounded-2xl">
                    <p className="text-sm text-zinc-500">No deliverables defined yet.</p>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Sidebar Area */}
          <div className="space-y-6">
            {/* Quick Actions Card */}
            <div className={`p-5 rounded-2xl border ${isDark ? 'bg-zinc-950/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
              <h3 className={`text-xs font-black uppercase tracking-[0.2em] mb-4 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                Orchestrate
              </h3>
              <div className="space-y-2">
                {[
                  { label: 'Find Creators', sub: 'Expand reach', icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-500/10', action: () => setShowAddCreatorModal(true) },
                  { label: 'Edit Campaign', sub: 'Modify details', icon: Edit, color: 'text-orange-500', bg: 'bg-orange-500/10', action: handleEdit },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    onClick={item.action}
                    className={`w-full group p-3 rounded-xl transition-all duration-300 flex items-center justify-between border ${
                      isDark 
                        ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800' 
                        : 'bg-white border-zinc-200 hover:border-zinc-300 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg transition-colors ${item.bg}`}>
                        <item.icon className={`w-4 h-4 ${item.color}`} />
                      </div>
                      <div className="text-left">
                        <p className={`text-sm font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{item.label}</p>
                        <p className="text-[10px] text-zinc-500">{item.sub}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:translate-x-1 transition-transform" />
                  </button>
                ))}
              </div>
            </div>

            {/* Campaign Metadata List */}
            <div className={`overflow-hidden rounded-2xl border ${isDark ? 'bg-zinc-950/50 border-zinc-800' : 'bg-white border-zinc-200'}`}>
               <div className="p-4 border-b border-zinc-800/50 bg-zinc-800/20">
                 <h3 className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                   Metadata
                 </h3>
               </div>
               <div className="divide-y divide-zinc-800/30">
                 {[
                   { label: 'Status', value: campaign.status, isStatus: true },
                   { label: 'Start Date', value: campaign.startDate ? new Date(campaign.startDate).toLocaleDateString() : 'N/A' },
                   { label: 'End Date', value: campaign.endDate ? new Date(campaign.endDate).toLocaleDateString() : 'N/A' },
                   { label: 'Category', value: campaign.category || 'N/A' },
                 ].map((meta, i) => (
                   <div key={i} className="flex items-center justify-between p-4 hover:bg-zinc-800/10 transition-colors">
                     <span className="text-xs text-zinc-500 font-medium">{meta.label}</span>
                     {meta.isStatus ? (
                       <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${getStatusColor(campaign.status, 'status', isDark)}`}>
                         {meta.value}
                       </span>
                     ) : (
                       <span className={`text-xs font-bold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>{meta.value}</span>
                     )}
                   </div>
                 ))}
               </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
)}

      {/* ==================== CREATORS TAB ==================== */}
   {activeTab === 'creators' && (
  <div className="animate-in fade-in zoom-in-95 duration-500 ease-out">
    <div className={`rounded-2xl border overflow-hidden transition-all duration-500 ${
      isDark ? 'bg-zinc-900/40 border-zinc-800 backdrop-blur-xl' : 'bg-white border-zinc-200 shadow-sm'
    }`}>
      <div className="p-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h2 className={`text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              Campaign Roster
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <p className={`text-xs font-medium tracking-wide ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                {selectedCreators.filter(c => c?.status === 'active').length} Active Partners •{' '}
                {selectedCreators.filter(c => c?.status === 'completed').length} Completed
              </p>
            </div>
          </div>
          
          <button 
            onClick={() => setShowAddCreatorModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            Invite Creator
          </button>
        </div>

        {/* Creators Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {selectedCreators.length > 0 ? (
            selectedCreators.filter(Boolean).map((creator, idx) => (
              <div 
                key={creator._id} 
                className={`group relative rounded-2xl border p-5 transition-all duration-500 hover:shadow-2xl ${
                  isDark 
                    ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-600 hover:-translate-y-1 shadow-black/40' 
                    : 'bg-white border-zinc-100 hover:border-zinc-300 hover:-translate-y-1 shadow-zinc-200/50'
                }`}
              >
                {/* Status Badge */}
                <div className="absolute top-4 right-4">
                  <span className={`px-2.5 py-1 text-[10px] rounded-full font-black uppercase tracking-tighter shadow-sm transition-colors ${
                    getStatusColor(creator.status || 'pending', 'status', isDark)
                  }`}>
                    {creator.status || 'pending'}
                  </span>
                </div>

                {/* Profile Section */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative">
                    {creator.creatorId?.profilePicture ? (
                      <img
                        src={creator.creatorId.profilePicture}
                        alt={creator.creatorId.displayName}
                        className="w-14 h-14 rounded-2xl object-cover ring-2 ring-offset-2 ring-offset-transparent ring-blue-500/20 group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 border-dashed ${
                        isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-100 border-zinc-200'
                      }`}>
                        <Users className={`w-6 h-6 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`} />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className={`font-bold text-base leading-tight ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                      {creator.creatorId?.displayName || 'Creator'}
                    </h3>
                    <p className={`text-xs font-medium mt-0.5 ${isDark ? 'text-blue-400/80' : 'text-blue-600'}`}>
                      @{creator.creatorId?.handle}
                    </p>
                  </div>
                </div>

                {/* Data Grid */}
                <div className="grid grid-cols-3 gap-px bg-zinc-800/20 rounded-xl overflow-hidden border border-zinc-800/20 mb-5">
                  {[
                    { label: 'Followers', val: formatNumber(creator.creatorId?.totalFollowers || 0), color: 'text-zinc-100' },
                    { label: 'Eng Rate', val: `${toFixedSafe(creator.creatorId?.averageEngagement, 1)}%`, color: 'text-emerald-500' },
                    { label: 'Budget', val: formatCurrency(creator.deal?.budget || 0), color: 'text-zinc-100' }
                  ].map((stat, i) => (
                    <div key={i} className={`p-3 flex flex-col items-center justify-center ${isDark ? 'bg-zinc-800/30' : 'bg-zinc-50'}`}>
                      <p className="text-[9px] uppercase font-black tracking-widest text-zinc-500 mb-1">{stat.label}</p>
                      <p className={`text-xs font-bold ${isDark ? stat.color : 'text-zinc-900'}`}>{stat.val}</p>
                    </div>
                  ))}
                </div>

                {/* Action Link */}
                <Link
                  to={`/brand/deals/${creator.deal?._id}`}
                  className={`group/btn relative flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold transition-all duration-300 overflow-hidden ${
                    isDark 
                      ? 'bg-zinc-800 text-zinc-200 hover:bg-white hover:text-zinc-950' 
                      : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-950 hover:text-white'
                  }`}
                >
                  <span className="relative z-10">Manage Partnership</span>
                  <ArrowRight className="w-3 h-3 relative z-10 transition-transform group-hover/btn:translate-x-1" />
                </Link>
              </div>
            ))
          ) : (
            /* Empty State */
            <div className="col-span-full flex flex-col items-center justify-center py-16 border-2 border-dashed border-zinc-800/50 rounded-3xl">
              <div className="p-4 rounded-full bg-zinc-800/30 mb-4 animate-bounce">
                <Users className="w-10 h-10 text-zinc-600" />
              </div>
              <h3 className="text-lg font-bold text-zinc-300">No active roster</h3>
              <p className="text-sm text-zinc-500 mb-6">Start building your team for this campaign.</p>
              <button 
                onClick={() => setShowAddCreatorModal(true)}
                className="px-6 py-2 bg-white text-black rounded-full font-bold text-xs hover:scale-105 transition-transform"
              >
                Find Creators
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
)}

      {/* ==================== APPLICATIONS TAB ==================== */}
   {activeTab === 'applications' && (
  <div className="animate-in fade-in slide-in-from-right-4 duration-500 ease-out">
    <div className={`rounded-2xl border transition-all duration-500 ${
      isDark 
        ? 'bg-zinc-900/40 border-zinc-800 backdrop-blur-xl' 
        : 'bg-white border-zinc-200 shadow-sm'
    }`}>
      <div className="p-6">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className={`text-xl font-bold tracking-tight ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
              Inbound Proposals
            </h2>
            <p className={`text-xs font-medium mt-1 tracking-wide ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              <span className={isDark ? 'text-blue-400' : 'text-blue-600'}>{applications.length}</span> Total Applications • 
              <span className="text-orange-500"> {pendingApps} Review Needed</span>
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {applications.length > 0 ? (
            applications.filter(Boolean).map((app, idx) => {
              const creator = app.creatorId;
              return (
                <div 
                  key={app._id} 
                  style={{ animationDelay: `${idx * 50}ms` }}
                  className={`group relative rounded-2xl border p-5 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${
                    isDark 
                      ? 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/80' 
                      : 'bg-white border-zinc-100 hover:border-zinc-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Left Side: Creator Profile & Metrics */}
                    <div className="flex lg:flex-col items-start gap-4 min-w-[200px]">
                      <div className="relative">
                        {creator?.profilePicture ? (
                          <img
                            src={creator.profilePicture}
                            alt={creator.displayName}
                            className="w-14 h-14 rounded-2xl object-cover ring-2 ring-zinc-800/50 group-hover:ring-blue-500/50 transition-all"
                          />
                        ) : (
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                            <Users className="w-6 h-6 text-zinc-500" />
                          </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-blue-500 border-2 border-zinc-900 flex items-center justify-center">
                           <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                        </div>
                      </div>

                      <div>
                        <h3 className={`font-bold text-sm ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                          {creator?.displayName || 'Creator'}
                        </h3>
                        <p className={`text-xs font-medium ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                          @{creator?.handle}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                           <Users className="w-3 h-3 text-zinc-500" />
                           <span className={`text-[11px] font-bold ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
                             {formatNumber(creator?.totalFollowers || 0)}
                           </span>
                        </div>
                      </div>
                    </div>

                    {/* Middle: Proposal Content */}
                    <div className="flex-1 lg:border-l lg:border-zinc-800/50 lg:pl-6">
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${getStatusColor(app.status, 'status', isDark)}`}>
                          {app.status}
                        </span>
                        {app.appliedAt && (
                          <span className="text-[10px] font-medium text-zinc-500">
                            Applied {timeAgo(app.appliedAt)}
                          </span>
                        )}
                      </div>

                      <div className={`relative p-4 rounded-xl mb-4 border transition-colors ${
                        isDark ? 'bg-zinc-950/40 border-zinc-800 group-hover:border-zinc-700' : 'bg-zinc-50/50 border-zinc-200'
                      }`}>
                        <Quote className="absolute top-2 right-2 w-4 h-4 text-zinc-800/50" />
                        <p className={`text-sm leading-relaxed ${isDark ? 'text-zinc-300' : 'text-zinc-600'} line-clamp-3 italic`}>
                          "{app.proposal}"
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                          <span className="text-[9px] uppercase font-black tracking-widest text-zinc-500">Proposed Rate</span>
                          <span className={`text-sm font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                            {formatCurrency(app.rate || 0)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Side: Actions */}
                    {app.status === 'pending' && (
                      <div className="flex lg:flex-col justify-end gap-2 min-w-[120px]">
                        <button
                          onClick={() => {
                            setSelectedApplication(app);
                            setShowApplicationModal(true);
                          }}
                          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                            isDark 
                              ? 'bg-zinc-100 text-zinc-900 hover:bg-white' 
                              : 'bg-zinc-900 text-white hover:bg-zinc-800'
                          }`}
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Review
                        </button>
                        <button
                          onClick={() => handleReviewApplication(app._id, 'rejected')}
                          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                            isDark 
                              ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-red-500/50 hover:text-red-500' 
                              : 'bg-white border-zinc-200 text-zinc-600 hover:border-red-200 hover:text-red-600'
                          }`}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-20">
              <div className={`p-6 rounded-full mb-4 ${isDark ? 'bg-zinc-800/30' : 'bg-zinc-50'}`}>
                <FileText className={`w-12 h-12 ${isDark ? 'text-zinc-600' : 'text-zinc-300'}`} />
              </div>
              <h3 className={`text-lg font-bold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>No Inbound Proposals</h3>
              <p className="text-sm text-zinc-500 mt-1 max-w-[240px] text-center">
                When creators apply to your campaign, their proposals will appear here for review.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
)}

      {/* ==================== ANALYTICS TAB ==================== */}
     {activeTab === 'analytics' && (
  <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
    <div className={`rounded-2xl border transition-all duration-500 overflow-hidden ${
      isDark 
        ? 'bg-zinc-900/40 border-zinc-800 backdrop-blur-xl' 
        : 'bg-white border-zinc-200 shadow-sm'
    }`}>
      <div className="p-6">
        
        {/* Top-tier Summary Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[
            { label: 'Impressions', value: formatNumber(analytics?.totalImpressions || 0), icon: Eye, color: 'text-blue-500' },
            { label: 'Engagements', value: formatNumber(analytics?.totalEngagements || 0), icon: Activity, color: 'text-emerald-500' },
            { label: 'Reach', value: formatNumber(analytics?.totalReach || 0), icon: Users, color: 'text-purple-500' }
          ].map((stat, i) => (
            <div 
              key={i} 
              className={`group rounded-2xl border p-4 transition-all duration-500 ease-out 
                hover:-translate-y-1 active:scale-[0.98]
                ${isDark 
                  ? 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-500 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.7)]' 
                  : 'bg-white border-zinc-100 hover:border-zinc-300 hover:shadow-[0_20px_30px_-10px_rgba(0,0,0,0.05)]'
                }`}
            >
              <div className={`p-2 rounded-xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 ${
                isDark ? 'bg-zinc-800' : 'bg-zinc-50 shadow-sm'
              }`}>
                <stat.icon className={`w-4 h-4 transition-colors ${stat.color}`} />
              </div>
              <div className="mt-3">
                <p className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  {stat.label}
                </p>
                <p className={`text-lg font-black mt-1 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                  {stat.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Performance Chart */}
          <div className={`lg:col-span-2 rounded-2xl border p-5 ${
            isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-100'
          }`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-sm font-bold tracking-tight ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                Growth Trajectory
              </h3>
            
            </div>
            
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics?.dailyPerformance || []}>
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#27272a' : '#f4f4f5'} />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#71717a' }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#71717a' }}
                  />
                  <Tooltip 
                    cursor={{ stroke: '#3b82f6', strokeWidth: 2 }}
                    contentStyle={{
                      backgroundColor: isDark ? '#09090b' : '#ffffff',
                      border: `1px solid ${isDark ? '#27272a' : '#e4e4e7'}`,
                      borderRadius: '12px',
                      fontSize: '12px',
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="impressions"
                    stroke="#3B82F6"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#chartGradient)"
                    animationDuration={2000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ROI & Efficiency Column */}
          <div className="space-y-4">
            <div className={`rounded-2xl border p-5 h-full ${
              isDark ? 'bg-zinc-950/50 border-zinc-800' : 'bg-zinc-50 border-zinc-100'
            }`}>
              <h3 className={`text-xs font-black uppercase tracking-[0.2em] mb-6 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                Efficiency
              </h3>
              
              <div className="space-y-3">
                {[
                  { label: 'Return on Investment', val: `${toFixedSafe(analytics?.roi, 1)}x`, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                  { label: 'Cost Per Engagement', val: formatCurrency(analytics?.cpe || 0), sub: 'Lower is better' },
                  { label: 'CPM (Avg)', val: formatCurrency(analytics?.cpm || 0), sub: 'Cost per 1k' },
                  { label: 'Conversion Rate', val: `${toFixedSafe(analytics?.conversionRate, 1)}%`, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                ].map((item, i) => (
                  <div key={i} className={`flex items-center justify-between p-3 rounded-xl border ${
                    isDark ? 'bg-zinc-900 border-zinc-800/50' : 'bg-white border-zinc-200'
                  }`}>
                    <div>
                      <p className={`text-[10px] font-bold ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>{item.label}</p>
                      {item.sub && <p className="text-[8px] text-zinc-600 font-medium">{item.sub}</p>}
                    </div>
                    <span className={`text-sm font-black ${item.color || (isDark ? 'text-zinc-100' : 'text-zinc-900')} ${item.bg ? item.bg + ' px-2 py-0.5 rounded-lg' : ''}`}>
                      {item.val}
                    </span>
                  </div>
                ))}
              </div>

              <div className={`mt-6 p-4 rounded-xl border-t-2 border-blue-500/20 ${isDark ? 'bg-blue-500/5' : 'bg-blue-50'}`}>
                <p className={`text-[10px] leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  <span className="font-bold text-blue-500">Insights:</span> Your conversion rate is <span className="text-emerald-500 font-bold">12% higher</span> than last month. Consider increasing budget for this creator segment.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
)}

      {/* ==================== MODALS ==================== */}

      {/* Archive Modal */}
      <Modal isOpen={showArchiveModal} onClose={() => setShowArchiveModal(false)} title="Archive Campaign">
        <div className="space-y-4">
          <div className="bg-yellow-50 p-4 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800">Archive this campaign?</p>
              <p className="text-sm text-yellow-700 mt-1">
                Archived campaigns are hidden from active lists but can be unarchived later. All data including deals
                and applications will be preserved.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Campaign:</strong> {campaign?.title}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowArchiveModal(false)}>
            Cancel
          </Button>
          <Button variant="warning" onClick={handleArchive}>
            Archive Campaign
          </Button>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Campaign">
        <div className="space-y-4">
          <div className="bg-red-50 p-4 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Delete this campaign permanently?</p>
              <p className="text-sm text-red-700 mt-1">
                This action cannot be undone. All associated deals and applications will also be deleted.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Campaign:</strong> {campaign?.title}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete Permanently
          </Button>
        </div>
      </Modal>

      {/* Application Review Modal */}
      <Modal
        isOpen={showApplicationModal}
        onClose={() => {
          setShowApplicationModal(false);
          setSelectedApplication(null);
          setApplicationFeedback('');
        }}
        title="Review Application"
      >
        {selectedApplication && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                {selectedApplication.creatorId?.profilePicture ? (
                  <img
                    src={selectedApplication.creatorId.profilePicture}
                    alt={selectedApplication.creatorId.displayName}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-indigo-600" />
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {selectedApplication.creatorId?.displayName || 'Creator'}
                  </h3>
                  <p className="text-xs text-gray-500">@{selectedApplication.creatorId?.handle}</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Proposal</h4>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700">{selectedApplication.proposal}</p>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Rate</h4>
              <p className="text-lg font-bold text-indigo-600">{formatCurrency(selectedApplication.rate || 0)}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Feedback (Optional)</label>
              <textarea
                rows="3"
                value={applicationFeedback}
                onChange={(e) => setApplicationFeedback(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Add feedback for the creator..."
              />
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowApplicationModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => handleReviewApplication(selectedApplication?._id, 'rejected')}>
            Reject
          </Button>
          <Button variant="success" onClick={() => handleReviewApplication(selectedApplication?._id, 'accepted')}>
            Accept
          </Button>
        </div>
      </Modal>

      {/* Add Creator Modal */}
        <Modal isOpen={showAddCreatorModal} onClose={() => setShowAddCreatorModal(false)} title="Invite Creators">
          <div className="space-y-4">
            <p className="text-gray-600">
              This feature allows you to search and invite creators to your campaign. The creator discovery system is being
              enhanced for better recommendations.
            </p>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                Coming soon: Advanced creator search with filters for niche, follower count, engagement rate, and more.
              </p>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <Button variant="secondary" onClick={() => setShowAddCreatorModal(false)}>
              Close
            </Button>
          </div>
      </Modal>
    </div>
  );
};

export default CampaignDetails;