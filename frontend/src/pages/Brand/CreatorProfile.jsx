import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../hooks/useTheme';
import { 
  ArrowLeft, User, Instagram, Youtube, Globe,
  MapPin, Star, TrendingUp, Users, DollarSign, 
  CheckCircle, ArrowUpRight, Heart, MessageCircle,
  Share2, Loader, ShieldCheck, Mail, Phone, Calendar,
  UserCheck, Camera, Verified, Video, Eye
} from 'lucide-react';
import brandService from '../../services/brandService';
import { formatNumber, formatCurrency } from '../../utils/helpers';
import toast from 'react-hot-toast';

const CreatorProfile = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { id: creatorId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [creator, setCreator] = useState(null);

  useEffect(() => {
    if (!creatorId) {
      toast.error('Invalid creator ID');
      navigate('/brand/search');
      return;
    }
    fetchCreatorDetails();
  }, [creatorId]);

  const fetchCreatorDetails = async () => {
    try {
      setLoading(true);
      const response = await brandService.getCreatorDetails(creatorId);
      if (response?.success) {
        setCreator(response.creator);
      } else {
        toast.error('Failed to load creator profile');
        navigate('/brand/search');
      }
    } catch (error) {
      toast.error('Failed to load creator profile');
      navigate('/brand/search');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader className="w-10 h-10 text-zinc-500" />
        </motion.div>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 text-zinc-500 font-medium tracking-widest text-[10px] uppercase"
        >
          Synthesizing Intelligence...
        </motion.p>
      </div>
    );
  }

  if (!creator) return null;

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className={`max-w-6xl mx-auto p-6 space-y-8 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}
    >
      
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <motion.button 
          whileHover={{ x: -5 }}
          onClick={() => navigate(-1)} 
          className="group flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-current transition-colors"
        >
          <div className={`p-2 rounded-full border ${isDark ? 'border-zinc-800' : 'border-zinc-200'} group-hover:bg-zinc-500/10`}>
            <ArrowLeft className="w-3 h-3" />
          </div>
          Back to Search
        </motion.button>
        
        <div className="text-right hidden sm:block">
          <div className="flex items-center justify-end gap-2">
             <div className="h-[1px] w-8 bg-zinc-500/30"></div>
             <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Profile Analytics</span>
          </div>
          <h1 className="text-2xl font-light">Digital <span className="font-bold uppercase italic">Persona</span></h1>
        </div>
      </div>

      {/* Hero Section */}
      <div className={`relative rounded-3xl border overflow-hidden transition-all duration-700 ${
        isDark ? 'bg-zinc-900/40 border-zinc-800 shadow-2xl' : 'bg-white border-zinc-200 shadow-xl'
      }`}>
        {/* Animated Background Decor */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-zinc-500/5 via-zinc-500/10 to-transparent"></div>
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-zinc-500/5 rounded-full blur-3xl"></div>

        <div className="relative p-8">
          <div className="flex flex-col lg:flex-row gap-8 items-start lg:items-center">
            {/* Avatar Section */}
            <div className="relative">
              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="relative z-10"
              >
                {creator.profilePicture ? (
                  <img
                    src={creator.profilePicture}
                    alt={creator.displayName}
                    className={`w-32 h-32 rounded-2xl object-cover border-4 ${isDark ? 'border-zinc-800' : 'border-zinc-100'} shadow-2xl`}
                  />
                ) : (
                  <div className={`w-32 h-32 rounded-2xl border-2 border-dashed flex items-center justify-center ${isDark ? 'border-zinc-700 bg-zinc-800' : 'border-zinc-300 bg-zinc-50'}`}>
                    <User className="w-12 h-12 text-zinc-500" />
                  </div>
                )}
                {creator.isVerified && (
                  <div className="absolute -bottom-2 -right-2 bg-black text-white p-1.5 rounded-xl shadow-lg border border-zinc-800">
                    <ShieldCheck className="w-4 h-4 fill-white text-black" />
                  </div>
                )}
              </motion.div>
            </div>

            {/* Info Section */}
            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-4xl font-black tracking-tighter mb-1">{creator.displayName}</h2>
                <div className="flex flex-wrap items-center gap-3">
                  {creator.handle && (
                    <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 bg-zinc-500/10 rounded-full text-zinc-500">
                      @{creator.handle}
                    </span>
                  )}
                  <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 bg-zinc-500/10 rounded-full text-zinc-500">
                    {creator.niches?.[0] || 'Premium Partner'}
                  </span>
                  {creator.age && (
                    <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 bg-zinc-500/10 rounded-full text-zinc-500">
                      {creator.age} years
                    </span>
                  )}
                  {creator.gender && (
                    <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 bg-zinc-500/10 rounded-full text-zinc-500">
                      {creator.gender}
                    </span>
                  )}
                </div>
              </div>
              <p className={`max-w-xl text-sm leading-relaxed font-normal ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                {creator.bio || "Crafting digital experiences and building authentic community connections through curated content."}
              </p>
            </div>

            {/* Action Button */}
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(`/brand/createdeal?creator=${creatorId}`)}
              className={`w-full lg:w-auto px-8 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${
                isDark ? 'bg-white text-black hover:bg-zinc-200' : 'bg-black text-white hover:bg-zinc-800'
              }`}
            >
              Initiate Partnership <ArrowUpRight className="w-4 h-4" />
            </motion.button>
          </div>

          {/* Stats Grid */}
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-8">
  {[
    { label: 'Network Reach', val: formatNumber(creator.totalFollowers || 0), icon: Users },
    { label: 'Interaction', val: `${creator.averageEngagement?.toFixed(1) || '0'}%`, icon: TrendingUp },
    { label: 'Reputation', val: creator.stats?.averageRating?.toFixed(1) || '0.0', icon: Star },
  ].map((stat, i) => (
    <motion.div
      key={i}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.1, duration: 0.5, ease: "easeOut" }}
      whileHover={{ scale: 1.02 }}
      className={`relative flex items-center gap-4 p-3.5 rounded-xl border transition-colors ${
        isDark 
          ? 'bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-800/50' 
          : 'bg-white border-zinc-100 hover:border-zinc-200 shadow-sm shadow-zinc-200/50'
      }`}
    >
      {/* Slim Icon Box */}
      <div className={`flex-shrink-0 p-2 rounded-lg ${
        isDark ? 'bg-zinc-800/50 text-zinc-400' : 'bg-zinc-50 text-zinc-500'
      }`}>
        <stat.icon className="w-4 h-4" />
      </div>

      {/* Content */}
      <div className="flex flex-col">
        <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 leading-none mb-1.5">
          {stat.label}
        </p>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold tracking-tight">
            {stat.val}
          </span>
          {/* Subtle accent dot */}
          <span className="w-1 h-1 rounded-full bg-zinc-400/30 mb-1" />
        </div>
      </div>

      {/* Modern thin accent line on the left */}
      <div className="absolute left-0 top-1/4 bottom-1/4 w-[1px] bg-zinc-700/30" />
    </motion.div>
  ))}
</div>

          {/* Contact Information */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            {creator.email && (
              <motion.div variants={itemVariants} className={`p-4 rounded-2xl border transition-all ${
                isDark ? 'bg-zinc-800/30 border-zinc-800' : 'bg-zinc-50 border-zinc-100'
              }`}>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-zinc-500" />
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Email</p>
                    <p className="text-sm font-semibold">{creator.email}</p>
                  </div>
                </div>
              </motion.div>
            )}
            {creator.phone && (
              <motion.div variants={itemVariants} className={`p-4 rounded-2xl border transition-all ${
                isDark ? 'bg-zinc-800/30 border-zinc-800' : 'bg-zinc-50 border-zinc-100'
              }`}>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-zinc-500" />
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Phone</p>
                    <p className="text-sm font-semibold">{creator.phone}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Social Links & Categories */}
        <div className="lg:col-span-2 space-y-6">
          <motion.section variants={itemVariants} className={`p-6 rounded-3xl border ${isDark ? 'border-zinc-800' : 'border-zinc-100'}`}>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500 mb-6 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-500"></div>
              Verified Channels
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {['instagram', 'youtube', 'tiktok'].map((platform) => {
                if (!creator.socialMedia?.[platform]?.handle) return null;
                const Icon = platform === 'instagram' ? Instagram : platform === 'youtube' ? Youtube : Globe;
                const socialData = creator.socialMedia[platform];
                const handle = socialData.handle;
                return (
                  <motion.a 
                    whileHover={{ y: -2 }}
                    key={platform}
                    href={socialData.url || `https://${platform}.com/${handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex flex-col p-4 rounded-2xl border transition-all ${
                      isDark ? 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800' : 'bg-white border-zinc-100 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${isDark ? 'bg-zinc-800' : 'bg-zinc-50'}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase text-zinc-500">{platform}</p>
                          <p className="text-sm font-semibold">@{handle.replace('@', '')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {socialData.verified && (
                          <Verified className="w-4 h-4 text-blue-500" />
                        )}
                        <ArrowUpRight className="w-4 h-4 text-zinc-600" />
                      </div>
                    </div>
                    
                    {/* Platform-specific stats */}
                    <div className="space-y-2 text-xs">
                      {platform === 'instagram' && (
                        <>
                          {socialData.followers && (
                            <div className="flex justify-between">
                              <span className="text-zinc-500">Followers:</span>
                              <span className="font-semibold">{formatNumber(socialData.followers)}</span>
                            </div>
                          )}
                          {socialData.posts && (
                            <div className="flex justify-between">
                              <span className="text-zinc-500">Posts:</span>
                              <span className="font-semibold">{formatNumber(socialData.posts)}</span>
                            </div>
                          )}
                        </>
                      )}
                      {platform === 'youtube' && (
                        <>
                          {socialData.subscribers && (
                            <div className="flex justify-between">
                              <span className="text-zinc-500">Subscribers:</span>
                              <span className="font-semibold">{formatNumber(socialData.subscribers)}</span>
                            </div>
                          )}
                          {socialData.views && (
                            <div className="flex justify-between">
                              <span className="text-zinc-500">Views:</span>
                              <span className="font-semibold">{formatNumber(socialData.views)}</span>
                            </div>
                          )}
                          {socialData.videos && (
                            <div className="flex justify-between">
                              <span className="text-zinc-500">Videos:</span>
                              <span className="font-semibold">{formatNumber(socialData.videos)}</span>
                            </div>
                          )}
                        </>
                      )}
                      {platform === 'tiktok' && (
                        <>
                          {socialData.followers && (
                            <div className="flex justify-between">
                              <span className="text-zinc-500">Followers:</span>
                              <span className="font-semibold">{formatNumber(socialData.followers)}</span>
                            </div>
                          )}
                          {socialData.likes && (
                            <div className="flex justify-between">
                              <span className="text-zinc-500">Likes:</span>
                              <span className="font-semibold">{formatNumber(socialData.likes)}</span>
                            </div>
                          )}
                          {socialData.videos && (
                            <div className="flex justify-between">
                              <span className="text-zinc-500">Videos:</span>
                              <span className="font-semibold">{formatNumber(socialData.videos)}</span>
                            </div>
                          )}
                        </>
                      )}
                      {socialData.engagement && (
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Engagement:</span>
                          <span className="font-semibold">{socialData.engagement}%</span>
                        </div>
                      )}
                    </div>
                  </motion.a>
                );
              })}
            </div>
          </motion.section>

          <motion.section variants={itemVariants} className={`p-6 rounded-3xl border ${isDark ? 'border-zinc-800' : 'border-zinc-100'}`}>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500 mb-4">Content Expertise</h3>
            <div className="flex flex-wrap gap-2">
              {creator.contentCategories?.map((cat, i) => (
                <span key={i} className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border ${
                  isDark ? 'bg-zinc-800/50 border-zinc-700 text-zinc-300' : 'bg-zinc-50 border-zinc-200 text-zinc-600'
                }`}>
                  {cat}
                </span>
              ))}
            </div>
          </motion.section>

          {/* Additional Details Section */}
          <motion.section variants={itemVariants} className={`p-6 rounded-3xl border ${isDark ? 'border-zinc-800' : 'border-zinc-100'}`}>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500 mb-6 flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              Creator Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {creator.handle && (
                <div className="space-y-2">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Username</p>
                  <p className="text-sm font-semibold">@{creator.handle}</p>
                </div>
              )}
              {creator.age && (
                <div className="space-y-2">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Age</p>
                  <p className="text-sm font-semibold">{creator.age} years</p>
                </div>
              )}
              {creator.gender && (
                <div className="space-y-2">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Gender</p>
                  <p className="text-sm font-semibold capitalize">{creator.gender}</p>
                </div>
              )}
              {creator.email && (
                <div className="space-y-2">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Email</p>
                  <p className="text-sm font-semibold">{creator.email}</p>
                </div>
              )}
              {creator.phone && (
                <div className="space-y-2">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Phone</p>
                  <p className="text-sm font-semibold">{creator.phone}</p>
                </div>
              )}
            </div>
          </motion.section>
        </div>

              </div>
    </motion.div>
  );
};

export default CreatorProfile;