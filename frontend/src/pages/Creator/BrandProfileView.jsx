// pages/Creator/BrandProfileView.jsx - Brand Profile View for Creators
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Building2, Globe, Mail, Phone, MapPin, Users,
  Calendar, DollarSign, TrendingUp, Award, Star,
  Instagram, Facebook, Youtube,
  ArrowLeft, ExternalLink, CheckCircle, AlertCircle,
  Eye, Loader
} from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { formatNumber, formatCurrency, formatDate } from '../../utils/helpers';
import Button from '../../components/UI/Button';
import creatorService from '../../services/creatorService';
import toast from 'react-hot-toast';

const toSocialUrl = (platform, value) => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const clean = trimmed.replace(/^@+/, '');
  const map = {
    instagram: `https://instagram.com/${clean}`,
    facebook: `https://facebook.com/${clean}`,
    youtube: `https://youtube.com/@${clean}`
  };

  return map[platform] || trimmed;
};

const BrandProfileView = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { id: brandId } = useParams();
  const isDark = theme === 'dark';
  
  const [loading, setLoading] = useState(true);
  const [brand, setBrand] = useState(null);
  const [stats, setStats] = useState({
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalSpent: 0,
    totalCreators: 0,
    averageRating: 0,
    completedDeals: 0,
    joinedDate: null
  });

  useEffect(() => {
    if (!brandId) {
      toast.error('Invalid brand ID');
      navigate('/creator/deals');
      return;
    }
    fetchBrandDetails();
  }, [brandId]);

  const fetchBrandDetails = async () => {
    try {
      setLoading(true);
      const response = await creatorService.getBrandDetails(brandId);
      if (response?.success) {
        setBrand(response.brand);
        setStats(response.stats || {
          totalCampaigns: 0,
          activeCampaigns: 0,
          totalSpent: 0,
          totalCreators: 0,
          averageRating: 0,
          completedDeals: 0,
          joinedDate: response.brand?.createdAt || null
        });
      } else {
        toast.error('Failed to load brand profile');
        navigate('/creator/deals');
      }
    } catch (error) {
      toast.error('Failed to load brand profile');
      navigate('/creator/deals');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader className="w-6 h-6 animate-spin text-zinc-400" />
          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold">Synchronizing Profile</p>
        </div>
      </div>
    );
  }

  // Common Header Component to keep it DRY
  const Header = () => (
    <div className="flex items-center justify-between mb-8">
      <button 
        onClick={() => navigate(-1)} 
        className="group flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-current transition-all"
      >
        <ArrowLeft className="w-3 h-3 transition-transform group-hover:-translate-x-1" /> 
        Back
      </button>
      <div className="text-right">
        <h1 className="text-2xl font-light tracking-tight italic">Brand <span className="font-bold not-italic">Identity</span></h1>
        <p className={`text-[8px] font-bold uppercase tracking-[0.3em] ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>Insight Engine v2.0</p>
      </div>
    </div>
  );

  if (!brand) {
    return (
      <div className={`max-w-4xl mx-auto p-6 animate-in fade-in duration-700 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
        <Header />
        <div className={`rounded-2xl border p-12 text-center ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50/50 border-zinc-100'}`}>
          <AlertCircle className="w-10 h-10 text-amber-500/50 mx-auto mb-4" />
          <h2 className="text-lg font-bold mb-2">Limited Profile Access</h2>
          <p className="text-sm text-zinc-500 max-w-xs mx-auto mb-8">Detailed information is restricted. Communication remains open via deal threads.</p>
          <Button onClick={() => navigate('/creator/deals')} variant="outline" size="sm">Return to Hub</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-5xl mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
      
      <Header />

      {/* Hero Section */}
      <div className={`relative rounded-3xl border overflow-hidden transition-all shadow-2xl ${
        isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'
      }`}>
        {/* Aesthetic Banner */}
        <div className="h-32 bg-zinc-900 relative">
            <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_30%_50%,_#27272a_0%,_transparent_50%)]"></div>
            <div className={`absolute bottom-0 left-0 w-full h-px ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`}></div>
        </div>
        
        <div className="px-8 pb-8">
          <div className="flex flex-col md:flex-row items-end -mt-12 mb-8 gap-6">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-tr from-zinc-500 to-zinc-800 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
              {brand.logo ? (
                <img
                  src={brand.logo}
                  alt={brand.brandName}
                  className="relative w-28 h-28 rounded-2xl border-4 border-black shadow-2xl object-cover"
                />
              ) : (
                <div className="relative w-28 h-28 bg-zinc-900 rounded-2xl border-4 border-black shadow-2xl flex items-center justify-center">
                  <Building2 className="w-10 h-10 text-zinc-700" />
                </div>
              )}
            </div>
            
            <div className="flex-1 pb-2">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-3xl font-bold tracking-tighter">{brand.brandName}</h2>
                {brand.averageRating > 4.5 && <Award className="w-5 h-5 text-amber-500" />}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-zinc-500/10 text-zinc-500 border border-zinc-500/20">
                  {brand.industry || 'General'}
                </span>
                {brand.address?.city && (
                  <div className="flex items-center gap-1 text-zinc-500">
                    <MapPin className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">{brand.address.city}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="max-w-2xl">
            <h3 className="text-[9px] font-bold uppercase tracking-[0.4em] text-zinc-600 mb-3">Manifesto</h3>
            <p className={`text-sm leading-relaxed font-light italic ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              "{brand.description || 'No description provided by the brand.'}"
            </p>
          </div>
        </div>
      </div>

      {/* Analytics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Campaigns', val: stats.totalCampaigns, icon: TrendingUp },
          { label: 'Live Now', val: stats.activeCampaigns, icon: Eye },
          { label: 'Investment', val: formatCurrency(stats.totalSpent), icon: DollarSign },
          { label: 'Network', val: stats.totalCreators, icon: Users }
        ].map((stat, i) => (
          <div key={i} className={`group p-5 rounded-2xl border transition-all duration-500 ${
            isDark ? 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-600' : 'bg-zinc-50/50 border-zinc-100 hover:border-zinc-300'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <stat.icon className="w-4 h-4 text-zinc-500 group-hover:text-current transition-colors" />
              <div className="w-1 h-1 rounded-full bg-zinc-800"></div>
            </div>
            <p className="text-xl font-bold tracking-tighter mb-1">{stat.val}</p>
            <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-zinc-500">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Detail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Contact & Socials */}
        <div className="lg:col-span-2 space-y-8">
          <section className={`p-8 rounded-3xl border ${isDark ? 'bg-zinc-900/20 border-zinc-800' : 'bg-white border-zinc-100'}`}>
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-8 flex items-center gap-4">
              Direct Channels <span className="h-px flex-1 bg-zinc-800/50"></span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
              {[
                { icon: Mail, label: 'Email', value: brand.email },
                { icon: Phone, label: 'Phone', value: brand.phone },
                { icon: Globe, label: 'Portal', value: brand.website, isLink: true },
                { icon: MapPin, label: 'Base', value: [brand.address?.city, brand.address?.country].filter(Boolean).join(', ') }
              ].map((item, idx) => item.value ? (
                <div key={idx} className="group">
                  <div className="flex items-center gap-3 mb-1">
                    <item.icon className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="text-[8px] font-bold uppercase tracking-widest text-zinc-600">{item.label}</span>
                  </div>
                  {item.isLink ? (
                    <a href={toSocialUrl('website', item.value)} target="_blank" rel="noopener noreferrer" 
                       className="text-sm font-medium hover:underline flex items-center gap-1 decoration-zinc-500">
                      {item.value} <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  ) : (
                    <p className="text-sm font-medium">{item.value}</p>
                  )}
                </div>
              ) : null)}
            </div>
          </section>

          {brand.socialMedia && Object.values(brand.socialMedia).some(url => url) && (
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-4 px-1">Social Ecosystem</h3>
              <div className="flex flex-wrap gap-3">
                {['instagram', 'youtube', 'facebook'].map((platform) => {
                  if (!brand.socialMedia?.[platform]) return null;
                  const Icon = platform === 'instagram' ? Instagram : platform === 'youtube' ? Youtube : Facebook;
                  return (
                    <a 
                      key={platform}
                      href={toSocialUrl(platform, brand.socialMedia[platform])}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-3 px-5 py-3 rounded-xl border transition-all duration-300 ${
                        isDark ? 'border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800' : 'border-zinc-200 bg-white hover:border-zinc-900'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">{platform}</span>
                    </a>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar Info */}
        <div className="space-y-4">
          <div className={`p-6 rounded-3xl border ${isDark ? 'bg-zinc-900/40 border-zinc-800 shadow-xl' : 'bg-zinc-50 border-zinc-100'}`}>
            <h3 className="text-[9px] font-bold uppercase tracking-[0.4em] text-zinc-500 mb-6 text-center">Specifications</h3>
            
            <div className="space-y-5">
              {[
                { label: 'Founded', val: brand.founded },
                { label: 'Scale', val: brand.companySize },
                { label: 'Structure', val: brand.businessType },
                { label: 'Member Since', val: stats.joinedDate ? formatDate(stats.joinedDate) : null }
              ].map((row, i) => row.val && (
                <div key={i} className="flex justify-between items-end border-b border-zinc-800/10 pb-2">
                  <span className="text-[8px] font-bold uppercase tracking-tighter text-zinc-500">{row.label}</span>
                  <span className="text-xs font-bold tracking-tight uppercase">{row.val}</span>
                </div>
              ))}
            </div>

            {(stats.averageRating > 0 || stats.completedDeals > 0) && (
              <div className="mt-10 pt-6 border-t border-zinc-800/30">
                <div className="grid grid-cols-2 gap-4">
                  {stats.averageRating > 0 && (
                    <div className="text-center">
                      <div className="flex justify-center mb-1">
                        <Star className="w-4 h-4 text-amber-500 fill-current" />
                      </div>
                      <p className="text-xl font-black">{stats.averageRating.toFixed(1)}</p>
                      <p className="text-[7px] font-bold uppercase tracking-widest text-zinc-500">Rating</p>
                    </div>
                  )}
                  {stats.completedDeals > 0 && (
                    <div className="text-center border-l border-zinc-800/20">
                      <div className="flex justify-center mb-1">
                        <CheckCircle className="w-4 h-4 text-zinc-400" />
                      </div>
                      <p className="text-xl font-black">{stats.completedDeals}</p>
                      <p className="text-[7px] font-bold uppercase tracking-widest text-zinc-500">Milestones</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandProfileView;