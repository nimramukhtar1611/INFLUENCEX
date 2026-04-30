import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import { 
  ArrowLeft, User, Instagram, Youtube, 
  MapPin, Star, TrendingUp, Users, DollarSign, 
  CheckCircle, ArrowUpRight, Heart, MessageCircle,
  Share2, Loader
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

  const handleCreateDeal = () => {
    navigate(`/brand/createdeal?creator=${creatorId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-zinc-500 mx-auto mb-4" />
          <p className="text-zinc-500 text-xs font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!creator) return null;

  return (
    <div className={`max-w-5xl mx-auto p-4 space-y-6 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-current transition-colors"
        >
          <ArrowLeft className="w-3 h-3" /> Back
        </button>
        <div className="text-right">
          <h1 className="text-3xl font-semibold tracking-tight">Creator <span className="font-bold">Profile</span></h1>
          <p className="text-xs text-zinc-500 italic">Influence Insight Engine</p>
        </div>
      </div>

      {/* Main Profile Card */}
      <div className={`rounded-xl border overflow-hidden transition-all duration-500 ${
        isDark ? 'bg-zinc-900 border-zinc-800 shadow-lg' : 'bg-white border-zinc-100 shadow-md'
      }`}>
        {/* Banner Area */}
        <div className="h-20 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black relative mb-3">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-200 via-transparent to-transparent"></div>
        </div>
        
        <div className="px-6 pb-6">
          <div className="flex flex-col md:flex-row items-end -mt-10 mb-6 gap-4">
            <div className="relative group">
              {creator.profilePicture ? (
                <img
                  src={creator.profilePicture}
                  alt={creator.displayName}
                  className="w-20 h-20 rounded-xl border-4 border-zinc-900 shadow-lg object-cover transform transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="w-20 h-20 bg-zinc-800 rounded-xl border-4 border-zinc-900 shadow-lg flex items-center justify-center">
                  <User className="w-8 h-8 text-zinc-600" />
                </div>
              )}
              {creator.isVerified && (
                <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full shadow-md">
                  <CheckCircle className="w-3 h-3 text-black" fill="currentColor" />
                </div>
              )}
            </div>
            
            <div className="flex-1 mb-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold tracking-tight">{creator.displayName}</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-tighter">
                  {creator.niches?.join(' • ') || 'Key Partner'}
                </p>
                {creator.location && (
                  <div className="flex items-center gap-1 py-0.5 px-2 rounded-full bg-zinc-500/10 border border-zinc-500/20">
                    <MapPin className="w-2 h-2 text-zinc-400" />
                    <span className="text-[8px] font-bold uppercase tracking-wider text-zinc-400">{creator.location}</span>
                  </div>
                )}
              </div>
            </div>

            <button 
              onClick={handleCreateDeal}
              className={`px-4 py-2 rounded-full text-[8px] font-bold uppercase tracking-[0.25em] transition-all duration-300 shadow-md hover:scale-105 active:scale-95 ${
                isDark ? 'bg-white text-white hover:bg-zinc-200' : 'bg-black text-white hover:bg-zinc-800'
              }`}
            >
              <span className="flex items-center gap-1">
                Launch <ArrowUpRight className="w-3 h-3" />
              </span>
            </button>
          </div>

          {/* Core Analytics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-6">
            {[
              { label: 'Followers', val: formatNumber(creator.totalFollowers || 0), icon: Users },
              { label: 'Engagement', val: `${creator.averageEngagement?.toFixed(1) || '0'}%`, icon: TrendingUp },
              { label: 'Trust Rating', val: creator.rating?.toFixed(1) || '0.0', icon: Star },
              { label: 'Est. Market Rate', val: formatCurrency(creator.averageRate || 0), icon: DollarSign }
            ].map((stat, i) => (
              <div key={i} className={`p-3 rounded-lg border transition-all hover:border-zinc-500 ${
                isDark ? 'bg-zinc-800/40 border-zinc-800' : 'bg-zinc-50 border-zinc-100'
              }`}>
                <div className="flex items-center gap-1 mb-2 opacity-60">
                  <stat.icon className="w-3 h-3" />
                  <span className="text-[8px] font-bold uppercase tracking-widest">{stat.label}</span>
                </div>
                <p className="text-lg font-bold tracking-tighter">{stat.val}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Bio & Socials */}
            <div className="lg:col-span-2 space-y-6">
              <section>
                <h3 className="text-[8px] font-bold uppercase tracking-[0.3em] text-zinc-500 mb-2 px-1">Biography</h3>
                <p className={`text-sm leading-relaxed font-light ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  {creator.bio || "No biography provided for this creator."}
                </p>
              </section>

              <section>
                <h3 className="text-[8px] font-bold uppercase tracking-[0.3em] text-zinc-500 mb-3 px-1">Network Channels</h3>
                <div className="flex flex-wrap gap-2">
                  {['instagram', 'youtube'].map((platform) => {
                    if (!creator.socialMedia?.[platform]?.handle) return null;
                    const Icon = platform === 'instagram' ? Instagram : Youtube;
                    const handle = creator.socialMedia[platform].handle;
                    return (
                      <a 
                        key={platform}
                        href={creator.socialMedia[platform].url || `https://${platform}.com/${handle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all group ${
                          isDark ? 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-500' : 'border-zinc-200 hover:border-black'
                        }`}
                      >
                        <Icon className="w-4 h-4 transition-transform group-hover:scale-110" />
                        <span className="text-xs font-medium">@{handle.replace('@', '')}</span>
                      </a>
                    );
                  })}
                </div>
              </section>
            </div>

            {/* Right Column: Mini Stats */}
            <div className={`p-4 rounded-xl border ${
              isDark ? 'bg-black/20 border-zinc-800' : 'bg-zinc-50 border-zinc-100'
            }`}>
              <h3 className="text-[8px] font-bold uppercase tracking-[0.3em] text-zinc-500 mb-4 text-center">Efficiency Metrics</h3>
              <div className="space-y-4">
                {[
                  { label: 'Avg Likes', val: formatNumber(creator.avgLikes || 0), icon: Heart, color: 'text-red-500' },
                  { label: 'Avg Comments', val: formatNumber(creator.avgComments || 0), icon: MessageCircle, color: 'text-blue-500' },
                  { label: 'Avg Shares', val: formatNumber(creator.avgShares || 0), icon: Share2, color: 'text-emerald-500' }
                ].map((metric, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <metric.icon className={`w-4 h-4 ${metric.color}`} />
                      <span className="text-[8px] font-bold uppercase tracking-wider text-zinc-500">{metric.label}</span>
                    </div>
                    <span className="text-sm font-bold">{metric.val}</span>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 pt-4 border-t border-zinc-800/50">
                 <h3 className="text-[8px] font-bold uppercase tracking-[0.3em] text-zinc-500 mb-2">Focus Areas</h3>
                 <div className="flex flex-wrap gap-1">
                    {creator.contentCategories?.map((cat, i) => (
                      <span key={i} className="px-2 py-1 rounded bg-zinc-500/10 text-[8px] font-bold uppercase tracking-widest text-zinc-400 border border-zinc-500/20">
                        {cat}
                      </span>
                    ))}
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatorProfile;