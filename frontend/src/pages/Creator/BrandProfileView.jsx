import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Globe, Mail, Phone, MapPin, Users,
  DollarSign, TrendingUp, Award, Star,
  Instagram, Facebook, Youtube,
  ArrowLeft, ExternalLink, CheckCircle, AlertCircle,
  Eye, Loader, ShieldCheck
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1, 
      transition: { staggerChildren: 0.1, delayChildren: 0.2 } 
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        >
          <Loader className="w-10 h-10 text-zinc-500" />
        </motion.div>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6 text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500"
        >
          Mapping Brand Ecosystem
        </motion.p>
      </div>
    );
  }

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className={`max-w-6xl mx-auto p-6 space-y-8 ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}
    >
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <motion.button 
          whileHover={{ x: -5 }}
          onClick={() => navigate(-1)} 
          className="group flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-current transition-all"
        >
          <div className={`p-2 rounded-full border ${isDark ? 'border-zinc-800' : 'border-zinc-200'} group-hover:bg-zinc-500/10`}>
            <ArrowLeft className="w-3 h-3" />
          </div>
          Exit View
        </motion.button>
        
        <div className="text-right">
          <h1 className="text-2xl font-light tracking-tight italic">Brand <span className="font-bold not-italic">Identity</span></h1>
          <p className="text-[8px] font-bold uppercase tracking-[0.3em] text-zinc-500">Corporate Intelligence</p>
        </div>
      </div>

      {/* Hero Section */}
      <motion.div 
        variants={itemVariants}
        className={`relative rounded-3xl border overflow-hidden shadow-2xl transition-all duration-700 ${
          isDark ? 'bg-zinc-900/40 border-zinc-800 shadow-black/50' : 'bg-white border-zinc-200'
        }`}
      >
        {/* Aesthetic Banner */}
        <div className="h-40 bg-zinc-950 relative overflow-hidden">
            <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_50%_-20%,_#3f3f46_0%,_transparent_70%)]"></div>
            <motion.div 
              initial={{ scale: 1.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.1 }}
              transition={{ duration: 2 }}
              className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"
            />
        </div>
        
        <div className="px-8 pb-10">
          <div className="flex flex-col md:flex-row items-end -mt-16 mb-8 gap-8">
            <motion.div 
              whileHover={{ rotate: 2, scale: 1.05 }}
              className="relative group"
            >
              <div className="absolute -inset-1 bg-gradient-to-tr from-zinc-500 to-white rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
              {brand.logo ? (
                <img
                  src={brand.logo}
                  alt={brand.brandName}
                  className={`relative w-36 h-36 rounded-3xl border-8 object-cover shadow-2xl ${isDark ? 'border-zinc-900' : 'border-white'}`}
                />
              ) : (
                <div className={`relative w-36 h-36 rounded-3xl border-8 flex items-center justify-center shadow-2xl ${isDark ? 'bg-zinc-800 border-zinc-900' : 'bg-zinc-100 border-white'}`}>
                  <Building2 className="w-12 h-12 text-zinc-600" />
                </div>
              )}
            </motion.div>
            
            <div className="flex-1 pb-2">
              <div className="flex items-center gap-4 mb-3">
                <h2 className="text-4xl font-black tracking-tighter">{brand.brandName}</h2>
                {brand.averageRating > 4.5 && (
                  <div className="flex items-center gap-1 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full">
                    <Award className="w-3 h-3 text-amber-500" />
                    <span className="text-[8px] font-black uppercase text-amber-600 tracking-tighter">Elite Partner</span>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-xl bg-zinc-500/10 text-zinc-500 border border-zinc-500/20">
                  {brand.industry || 'Global Enterprise'}
                </span>
                {brand.address?.city && (
                  <div className="flex items-center gap-2 text-zinc-500">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{brand.address.city}, {brand.address.country}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="max-w-3xl border-l-2 border-zinc-500/20 pl-6 py-2">
            <h3 className="text-[9px] font-bold uppercase tracking-[0.4em] text-zinc-500 mb-4 flex items-center gap-2">
              Corporate Vision <div className="w-8 h-px bg-zinc-500/30"></div>
            </h3>
            <p className={`text-base leading-relaxed font-light italic ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              "{brand.description || 'Commitment to excellence and innovative collaboration within the creator economy.'}"
            </p>
          </div>
        </div>
      </motion.div>

      {/* Analytics Row */}
<div className="grid grid-cols-2 md:grid-cols-3 gap-3">
  {[
    { label: 'Campaigns', val: stats.totalCampaigns, icon: TrendingUp },
    { label: 'Active', val: stats.activeCampaigns, icon: Eye },
    { label: 'Talent', val: stats.totalCreators, icon: Users }
  ].map((stat, i) => (
    <motion.div 
      key={i} 
      whileHover={{ y: -2 }}
      className={`group p-4 rounded-2xl border transition-all duration-300 ${
        isDark 
          ? 'bg-zinc-900/40 border-zinc-800/50 hover:border-zinc-600' 
          : 'bg-white border-zinc-100 hover:shadow-md'
      }`}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-1.5 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-50'}`}>
          <stat.icon className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-200 transition-colors" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
          {stat.label}
        </span>
      </div>
      
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-semibold tracking-tighter italic">
          {stat.val}
        </span>
        <div className="h-1 w-1 rounded-full bg-zinc-500/40" />
      </div>
    </motion.div>
  ))}
</div>

      {/* Detail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Contact & Socials */}
        <div className="lg:col-span-2 space-y-8">
          <motion.section 
            variants={itemVariants}
            className={`p-8 rounded-3xl border shadow-sm ${isDark ? 'bg-zinc-900/20 border-zinc-800' : 'bg-white border-zinc-100'}`}
          >
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-10 flex items-center gap-4">
              Access Points <span className="h-px flex-1 bg-zinc-800/20"></span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
              {[
                { icon: Mail, label: 'Email Correspondence', value: brand.email },
                { icon: Phone, label: 'Voice Line', value: brand.phone },
                { icon: Globe, label: 'Web Portal', value: brand.website, isLink: true },
                { icon: MapPin, label: 'Headquarters', value: [brand.address?.city, brand.address?.country].filter(Boolean).join(', ') }
              ].map((item, idx) => item.value ? (
                <div key={idx} className="group flex items-start gap-4">
                  <div className={`p-2.5 rounded-xl border ${isDark ? 'border-zinc-800 bg-zinc-900' : 'bg-zinc-50 border-zinc-100'}`}>
                    <item.icon className="w-4 h-4 text-zinc-500" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500">{item.label}</span>
                    {item.isLink ? (
                      <a href={toSocialUrl('website', item.value)} target="_blank" rel="noopener noreferrer" 
                         className="text-sm font-semibold hover:text-zinc-400 flex items-center gap-2 transition-colors">
                        {item.value} <ExternalLink className="w-3 h-3 opacity-50" />
                      </a>
                    ) : (
                      <p className="text-sm font-semibold">{item.value}</p>
                    )}
                  </div>
                </div>
              ) : null)}
            </div>
          </motion.section>

          {brand.socialMedia && Object.values(brand.socialMedia).some(url => url) && (
            <motion.section variants={itemVariants}>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-6 px-1">Digital Ecosystem</h3>
              <div className="flex flex-wrap gap-4">
                {['instagram', 'youtube', 'facebook'].map((platform) => {
                  if (!brand.socialMedia?.[platform]) return null;
                  const Icon = platform === 'instagram' ? Instagram : platform === 'youtube' ? Youtube : Facebook;
                  return (
                    <motion.a 
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      key={platform}
                      href={toSocialUrl(platform, brand.socialMedia[platform])}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-4 px-6 py-4 rounded-2xl border transition-all shadow-sm ${
                        isDark ? 'border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800' : 'border-zinc-200 bg-white hover:border-black hover:text-white'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">{platform}</span>
                    </motion.a>
                  );
                })}
              </div>
            </motion.section>
          )}
        </div>

        {/* Sidebar Info */}
        <motion.div 
          variants={itemVariants}
          className="space-y-4"
        >
          <div className={`p-8 rounded-3xl border h-full shadow-xl ${
            isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50/50 border-zinc-200'
          }`}>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-500 mb-8 text-center">Entity Specs</h3>
            
            <div className="space-y-6">
              {[
                { label: 'Origin Year', val: brand.founded },
                { label: 'Workforce', val: brand.companySize },
                { label: 'Legal Form', val: brand.businessType },
                { label: 'Network Entry', val: stats.joinedDate ? formatDate(stats.joinedDate) : null }
              ].map((row, i) => row.val && (
                <div key={i} className="flex flex-col gap-1 border-b border-zinc-500/10 pb-4 last:border-0">
                  <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500">{row.label}</span>
                  <span className="text-sm font-bold tracking-tight">{row.val}</span>
                </div>
              ))}
            </div>

            {(stats.averageRating > 0 || stats.completedDeals > 0) && (
              <div className={`mt-10 p-6 rounded-2xl border ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-100 shadow-sm'}`}>
                <div className="grid grid-cols-2 gap-4">
                  {stats.averageRating > 0 && (
                    <div className="text-center">
                      <div className="flex justify-center mb-2">
                        <Star className="w-5 h-5 text-amber-500 fill-current" />
                      </div>
                      <p className="text-2xl font-black">{stats.averageRating.toFixed(1)}</p>
                      <p className="text-[8px] font-bold uppercase tracking-widest text-zinc-500 mt-1">Trust Score</p>
                    </div>
                  )}
                  {stats.completedDeals > 0 && (
                    <div className="text-center border-l border-zinc-500/10">
                      <div className="flex justify-center mb-2">
                        <CheckCircle className="w-5 h-5 text-zinc-400" />
                      </div>
                      <p className="text-2xl font-black">{stats.completedDeals}</p>
                      <p className="text-[8px] font-bold uppercase tracking-widest text-zinc-500 mt-1">Milestones</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="mt-10 flex flex-col items-center gap-2">
               <ShieldCheck className="w-6 h-6 text-zinc-500/40" />
               <p className="text-[7px] text-zinc-500 uppercase font-black tracking-[0.2em] text-center">
                 Verified Platform Partner
               </p>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default BrandProfileView;