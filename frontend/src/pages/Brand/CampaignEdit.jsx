// pages/Brand/CampaignEdit.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Save,
  Loader,
  AlertCircle,
  CheckCircle,
  X,
  Plus,
  Calendar,
  RefreshCw,
  DollarSign,
  Image,
  Users,
  Target,
  Instagram,
  Youtube,
  Facebook,
  Globe,
  Hash,
  MapPin,
  Users2,
  Info,
  FileText,
  Upload,
  Trash2,
  ChevronRight,
  Music
} from 'lucide-react';
import campaignService from '../../services/campaignService';
import { useTheme } from '../../hooks/useTheme';
import { formatCurrency, formatDate, timeAgo } from '../../utils/helpers';
import Button from '../../components/UI/Button';
import toast from 'react-hot-toast';
import Input from '../../components/UI/Input';

const CampaignEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [campaign, setCampaign] = useState(null);
  const [errors, setErrors] = useState({});
  const [activeTab, setActiveTab] = useState('basic');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    objectives: [],
    deliverables: [],
    startDate: '',
    endDate: '',
    submissionDeadline: '',
    budget: 0,
    budgetType: 'fixed',
    paymentTerms: 'escrow',
    targetAudience: {
      minFollowers: '',
      maxFollowers: '',
      minEngagement: '',
      locations: [],
      ages: [],
      genders: [],
      niches: [],
      platforms: ['instagram', 'youtube', 'tiktok', 'facebook']
    },
    requirements: []
  });

  // Temporary input states
  const [newObjective, setNewObjective] = useState('');
  const [newRequirement, setNewRequirement] = useState('');
  const [newLocation, setNewLocation] = useState('');

  // ==================== FETCH CAMPAIGN ====================
  useEffect(() => {
    if (id) {
      fetchCampaign();
    }
  }, [id]);

  const fetchCampaign = async () => {
    try {
      setLoading(true);
      console.log('Fetching campaign for edit:', id);

      const response = await campaignService.getCampaign(id);
      console.log('Edit campaign response:', response);

      if (response?.success) {
        const campaignData = response.campaign;
        setCampaign(campaignData);

        // Format dates for input fields
        setFormData({
          title: campaignData.title || '',
          description: campaignData.description || '',
          category: campaignData.category || '',
          objectives: campaignData.objectives || [],
          deliverables: campaignData.deliverables || [],
          startDate: campaignData.startDate ? new Date(campaignData.startDate).toISOString().split('T')[0] : '',
          endDate: campaignData.endDate ? new Date(campaignData.endDate).toISOString().split('T')[0] : '',
          submissionDeadline: campaignData.submissionDeadline ? new Date(campaignData.submissionDeadline).toISOString().split('T')[0] : '',
          budget: campaignData.budget || 0,
          budgetType: campaignData.budgetType || 'fixed',
          paymentTerms: campaignData.paymentTerms || 'escrow',
          targetAudience: {
            minFollowers: campaignData.targetAudience?.minFollowers || '',
            maxFollowers: campaignData.targetAudience?.maxFollowers || '',
            minEngagement: campaignData.targetAudience?.minEngagement || '',
            locations: campaignData.targetAudience?.locations || [],
            ages: campaignData.targetAudience?.ages || [],
            genders: campaignData.targetAudience?.genders || [],
            niches: campaignData.targetAudience?.niches || [],
            platforms: campaignData.targetAudience?.platforms || ['instagram', 'youtube', 'tiktok', 'facebook']
          },
          requirements: campaignData.requirements || []
        });
      } else {
        toast.error(response?.error || 'Failed to load campaign');
        navigate('/brand/campaigns');
      }
    } catch (error) {
      console.error('Fetch campaign error:', error);
      toast.error('Failed to load campaign');
      navigate('/brand/campaigns');
    } finally {
      setLoading(false);
    }
  };

  // ==================== VALIDATION ====================
  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Campaign title is required';
    } else if (formData.title.length < 5) {
      newErrors.title = 'Title must be at least 5 characters';
    } else if (formData.title.length > 100) {
      newErrors.title = 'Title cannot exceed 100 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Campaign description is required';
    } else if (formData.description.length < 20) {
      newErrors.description = 'Description must be at least 20 characters';
    } else if (formData.description.length > 2000) {
      newErrors.description = 'Description cannot exceed 2000 characters';
    }

    if (!formData.category) {
      newErrors.category = 'Please select a category';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    } else if (formData.startDate && new Date(formData.endDate) <= new Date(formData.startDate)) {
      newErrors.endDate = 'End date must be after start date';
    }

    if (!formData.budget || formData.budget < 10) {
      newErrors.budget = 'Budget must be at least $10';
    } else if (formData.budget > 1000000) {
      newErrors.budget = 'Budget cannot exceed $1,000,000';
    }

    if (formData.deliverables.length === 0) {
      newErrors.deliverables = 'At least one deliverable is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ==================== HANDLE SUBMIT ====================
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors before saving');
      return;
    }

    try {
      setSaving(true);

      // Prepare data for API
      const updateData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        objectives: formData.objectives,
        deliverables: formData.deliverables.map(d => ({
          type: d.type,
          platform: d.platform,
          quantity: parseInt(d.quantity),
          description: d.description || '',
          requirements: d.requirements || '',
          budget: parseFloat(d.budget || 0)
        })),
        startDate: formData.startDate,
        endDate: formData.endDate,
        submissionDeadline: formData.submissionDeadline || null,
        budget: parseFloat(formData.budget),
        budgetType: formData.budgetType,
        paymentTerms: formData.paymentTerms,
        targetAudience: {
          minFollowers: formData.targetAudience.minFollowers ? parseInt(formData.targetAudience.minFollowers) : null,
          maxFollowers: formData.targetAudience.maxFollowers ? parseInt(formData.targetAudience.maxFollowers) : null,
          minEngagement: formData.targetAudience.minEngagement ? parseFloat(formData.targetAudience.minEngagement) : null,
          locations: formData.targetAudience.locations,
          ages: formData.targetAudience.ages,
          genders: formData.targetAudience.genders,
          niches: formData.targetAudience.niches,
          platforms: formData.targetAudience.platforms
        },
        requirements: formData.requirements
      };

      console.log('Updating campaign:', updateData);

      const response = await campaignService.updateCampaign(id, updateData);

      if (response?.success) {
        toast.success('Campaign updated successfully');
        navigate(`/brand/campaigns/${id}`);
      } else {
        toast.error(response?.error || 'Failed to update campaign');
      }
    } catch (error) {
      console.error('Update error:', error);
      toast.error(error.message || 'Failed to update campaign');
    } finally {
      setSaving(false);
    }
  };

  // ==================== HANDLE CHANGE ====================
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  // ==================== DELIVERABLE MANAGEMENT ====================
  const addDeliverable = () => {
    setFormData(prev => ({
      ...prev,
      deliverables: [
        ...prev.deliverables,
        {
          type: 'post',
          platform: 'instagram',
          quantity: 1,
          description: '',
          requirements: '',
          budget: 0
        }
      ]
    }));
  };

  const removeDeliverable = (index) => {
    if (formData.deliverables.length > 1) {
      setFormData(prev => ({
        ...prev,
        deliverables: prev.deliverables.filter((_, i) => i !== index)
      }));
    } else {
      toast.error('At least one deliverable is required');
    }
  };

  const updateDeliverable = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      deliverables: prev.deliverables.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  // ==================== OBJECTIVE MANAGEMENT ====================
  const addObjective = () => {
    if (newObjective.trim()) {
      setFormData(prev => ({
        ...prev,
        objectives: [...prev.objectives, newObjective.trim()]
      }));
      setNewObjective('');
    }
  };

  const removeObjective = (index) => {
    setFormData(prev => ({
      ...prev,
      objectives: prev.objectives.filter((_, i) => i !== index)
    }));
  };

  // ==================== REQUIREMENT MANAGEMENT ====================
  const addRequirement = () => {
    if (newRequirement.trim()) {
      setFormData(prev => ({
        ...prev,
        requirements: [...prev.requirements, newRequirement.trim()]
      }));
      setNewRequirement('');
    }
  };

  const removeRequirement = (index) => {
    setFormData(prev => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== index)
    }));
  };

  // ==================== LOCATION MANAGEMENT ====================
  const addLocation = () => {
    if (newLocation.trim()) {
      setFormData(prev => ({
        ...prev,
        targetAudience: {
          ...prev.targetAudience,
          locations: [...prev.targetAudience.locations, newLocation.trim()]
        }
      }));
      setNewLocation('');
    }
  };

  const removeLocation = (index) => {
    setFormData(prev => ({
      ...prev,
      targetAudience: {
        ...prev.targetAudience,
        locations: prev.targetAudience.locations.filter((_, i) => i !== index)
      }
    }));
  };

  // ==================== NICHE MANAGEMENT ====================
  const toggleNiche = (niche) => {
    setFormData(prev => {
      const niches = prev.targetAudience.niches.includes(niche)
        ? prev.targetAudience.niches.filter(n => n !== niche)
        : [...prev.targetAudience.niches, niche];

      return {
        ...prev,
        targetAudience: {
          ...prev.targetAudience,
          niches
        }
      };
    });
  };

  // ==================== AGE GROUP MANAGEMENT ====================
  const toggleAgeGroup = (age) => {
    setFormData(prev => {
      const ages = prev.targetAudience.ages.includes(age)
        ? prev.targetAudience.ages.filter(a => a !== age)
        : [...prev.targetAudience.ages, age];

      return {
        ...prev,
        targetAudience: {
          ...prev.targetAudience,
          ages
        }
      };
    });
  };

  // ==================== GENDER MANAGEMENT ====================
  const toggleGender = (gender) => {
    setFormData(prev => {
      const genders = prev.targetAudience.genders.includes(gender)
        ? prev.targetAudience.genders.filter(g => g !== gender)
        : [...prev.targetAudience.genders, gender];

      return {
        ...prev,
        targetAudience: {
          ...prev.targetAudience,
          genders
        }
      };
    });
  };

  // ==================== PLATFORM MANAGEMENT ====================
  const togglePlatform = (platform) => {
    setFormData(prev => {
      const platforms = prev.targetAudience.platforms.includes(platform)
        ? prev.targetAudience.platforms.filter(p => p !== platform)
        : [...prev.targetAudience.platforms, platform];

      return {
        ...prev,
        targetAudience: {
          ...prev.targetAudience,
          platforms
        }
      };
    });
  };

  // ==================== CATEGORIES ====================
  const categories = [
    'Fashion', 'Beauty', 'Technology', 'Food & Beverage', 'Fitness',
    'Travel', 'Gaming', 'Lifestyle', 'Parenting', 'Finance',
    'Education', 'Entertainment', 'Sports', 'Other'
  ];

  const niches = [
    'Fashion', 'Beauty', 'Fitness', 'Travel', 'Food', 'Tech',
    'Gaming', 'Lifestyle', 'Parenting', 'Finance', 'Education',
    'Entertainment', 'Sports', 'Health', 'Wellness'
  ];

  const ageGroups = ['18-24', '25-34', '35-44', '45+'];
  const genders = ['male', 'female', 'all'];
  const platforms = ['instagram', 'youtube', 'tiktok', 'facebook'];

  const deliverableTypes = [
    { value: 'post', label: 'Post' },
    { value: 'story', label: 'Story' },
    { value: 'reel', label: 'Reel' },
    { value: 'video', label: 'Video' },
    { value: 'blog', label: 'Blog' },
    { value: 'review', label: 'Review' },
    { value: 'image', label: 'Image' }
  ];

  const platformIcons = {
    instagram: Instagram,
    youtube: Youtube,
    tiktok: Music,
    facebook: Facebook
  };

  // Tab configuration
  const tabs = [
    { id: 'basic', name: 'Basic Info', icon: FileText },
    { id: 'deliverables', name: 'Deliverables', icon: Target },
    { id: 'timeline', name: 'Timeline', icon: Calendar },
    { id: 'budget', name: 'Budget', icon: DollarSign },
    { id: 'audience', name: 'Target Audience', icon: Users },
    { id: 'requirements', name: 'Requirements', icon: Info }
  ];

  // ==================== LOADING STATE ====================
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-zinc-500 mx-auto mb-4" />
          <p className="text-zinc-500 text-xs font-medium">Loading campaign editor...</p>
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

  return (
    <div >
      <div className={`min-h-screen flex flex-col relative z-10 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 p-4 pb-2 flex-shrink-0">
      
        
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 overflow-hidden py-2">
  <div className="space-y-2">
    <div className="flex items-center gap-4">
      {/* Back Button: Slide + Spring */}
      <Link
        to="/brand/campaigns"
        className={`group p-2.5 rounded-xl transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] border ${
          isDark 
            ? 'hover:bg-zinc-800 text-zinc-400 border-zinc-800 hover:border-zinc-600' 
            : 'hover:bg-white text-zinc-500 border-zinc-100 hover:border-zinc-300 hover:shadow-xl hover:shadow-zinc-200/50'
        } animate-in fade-in slide-in-from-left-6 duration-700`}
      >
        <ChevronRight className="w-5 h-5 rotate-180 transition-transform duration-500 ease-out group-hover:-translate-x-1.5" />
      </Link>

      {/* Title: Smooth tracking + subtle lift */}
      <div className="animate-in fade-in slide-in-from-left-10 duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] delay-150">
        <h1 className={`text-3xl font-semibold tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>
          Edit <span className="font-extrabold relative">
            Campaign
            <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-blue-500 transition-all duration-700 group-hover:w-full delay-500" />
          </span>
        </h1>
      </div>
    </div>

    {/* Subtitle: Drift-up animation */}
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-1000 delay-300 ease-out">
      <p className={`text-sm max-w-2xl leading-relaxed ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
        <span className={`font-medium transition-colors duration-500 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          {campaign.name || 'Untitled Campaign'}
        </span>
        <span className="mx-2 opacity-30">•</span>
        <span className="inline-block hover:text-zinc-300 transition-colors duration-300">
 • Update your campaign details and requirements.        </span>
      </p>
    </div>
  </div>
  
  {/* Action Buttons: Staggered Floating Entrance */}
  <div className="flex items-center gap-3">
    {[
      { icon: RefreshCw, onClick: () => fetchCampaignDetails(true), label: 'Refresh', delay: 'delay-[400ms]' },
      { icon: Save, onClick: handleSubmit, label: 'Save', delay: 'delay-[500ms]' }
    ].map((btn, i) => (
      <button
        key={i}
        onClick={btn.onClick}
        className={`group relative p-3 rounded-2xl transition-all duration-500 border active:scale-90 animate-in fade-in zoom-in-75 ${btn.delay} ${
          isDark 
            ? 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-500 hover:bg-zinc-800/80' 
            : 'bg-white border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:border-zinc-400 hover:shadow-2xl hover:shadow-zinc-200/60'
        }`}
      >
        <btn.icon className={`w-4.5 h-4.5 transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          btn.label === 'Refresh' ? 'group-hover:rotate-180' : 'group-hover:scale-125 group-hover:-rotate-12'
        }`} />
        
        {/* Modern Floating Tooltip */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-zinc-900 text-white text-[10px] font-black tracking-widest uppercase opacity-0 group-hover:opacity-100 group-hover:-top-14 transition-all duration-300 pointer-events-none shadow-xl border border-zinc-800">
          {btn.label}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-900 rotate-45 border-r border-b border-zinc-800" />
        </div>
      </button>
    ))}
  </div>
</div>
      </div>

      {/* Tab Navigation */}
      <div className={`border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'} px-4 flex-shrink-0`}>
        <div className="flex space-x-1 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? isDark
                      ? 'border-gray-500  text-white'
                      : 'border-gray-500  text-gray-600'
                    : isDark
                    ? 'border-transparent text-zinc-400 hover:text-zinc-300 hover:border-zinc-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.name}</span>
                <span className="sm:hidden">{tab.name.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1">
        <form onSubmit={handleSubmit} className="h-full flex flex-col">
          <div className="p-4">
            
            {/* Basic Information Tab */}
            {activeTab === 'basic' && (
              <div className={`rounded-xl border p-4 transition-all ${
                isDark 
                  ? 'bg-zinc-900/50 border-zinc-800' 
                  : 'bg-white border-zinc-200'
              }`}>
                <h2 className={`text-sm font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'} mb-3`}>Basic Information</h2>

                <div className="space-y-4">
                  {/* Title */}
                  <div>
                    <label className={`block text-xs font-medium ${isDark ? 'text-zinc-200' : 'text-gray-700'} mb-1`}>
                      Campaign Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      className={`w-full px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                        errors.title ? 'border-red-500' : isDark ? 'border-zinc-700 bg-zinc-800/50 text-zinc-100' : 'border-zinc-200'
                      }`}
                      placeholder="e.g., Summer Collection Launch 2024"
                    />
                    {errors.title && (
                      <p className="mt-1 text-sm text-red-600">{errors.title}</p>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className={`block text-xs font-medium ${isDark ? 'text-zinc-200' : 'text-gray-700'} mb-1`}>
                      Campaign Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows="3"
                      className={`w-full px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                        errors.description ? 'border-red-500' : isDark ? 'border-zinc-700 bg-zinc-800/50 text-zinc-100' : 'border-zinc-200'
                      }`}
                      placeholder="Describe your campaign goals, requirements, and what you're looking for in creators..."
                    />
                    {errors.description && (
                      <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                    )}
                    <p className={`text-xs mt-1 ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                      {formData.description.length}/2000 characters
                    </p>
                  </div>

                  {/* Category */}
                  <div>
                    <label className={`block text-xs font-medium ${isDark ? 'text-zinc-200' : 'text-gray-700'} mb-1`}>
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      className={`w-full px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                        errors.category ? 'border-red-500' : isDark ? 'border-zinc-700 bg-zinc-800/50 text-zinc-100' : 'border-zinc-200'
                      }`}
                    >
                      <option className="!bg-black text-white" value="">Select a category</option>
                      {categories.map(cat => (
                        <option className="!bg-black text-white" key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    {errors.category && (
                      <p className="mt-1 text-sm text-red-600">{errors.category}</p>
                    )}
                  </div>

                  {/* Objectives */}
                  <div>
                    <label className={`block text-xs font-medium ${isDark ? 'text-zinc-200' : 'text-gray-700'} mb-1`}>
                      Campaign Objectives
                    </label>
                    <div className="space-y-2">
                      {formData.objectives.map((obj, index) => (
                        <div key={index} className={`flex items-center gap-2 p-1.5 rounded-lg ${
                          isDark ? 'bg-zinc-800/50' : 'bg-gray-50'
                        }`}>
                          <CheckCircle className="w-3 h-3 text-green-600" />
                          <span className={`flex-1 text-xs ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{obj}</span>
                          <button
                            type="button"
                            onClick={() => removeObjective(index)}
                            className={`transition-colors ${
                              isDark ? 'text-zinc-400 hover:text-zinc-300' : 'text-gray-400 hover:text-gray-600'
                            }`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Add an objective..."
                          className={`flex-1 px-3 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                            isDark ? 'border-zinc-700 bg-zinc-800/50 text-zinc-100' : 'border-zinc-200'
                          }`}
                          value={newObjective}
                          onChange={(e) => setNewObjective(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && addObjective()}
                        />
                        <Button type="button" variant="secondary" onClick={addObjective} icon={Plus} className="px-2 py-1.5 text-xs">
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

        {/* Deliverables Tab */}
            {activeTab === 'deliverables' && (
              <div className={`rounded-xl border p-4 transition-all ${
                isDark 
                  ? 'bg-zinc-900/50 border-zinc-800' 
                  : 'bg-white border-zinc-200'
              }`}>
                <h2 className={`text-sm font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'} mb-3`}>Deliverables</h2>

                {errors.deliverables && (
                  <p className="mb-4 text-sm text-red-600">{errors.deliverables}</p>
                )}

                <div className="space-y-4">
                  {formData.deliverables.map((deliverable, index) => (
                    <div key={index} className={`p-3 rounded-lg relative ${
                      isDark ? 'bg-zinc-800/50' : 'bg-gray-50'
                    }`}>
                      {formData.deliverables.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeDeliverable(index)}
                          className={`absolute top-3 right-3 transition-colors ${
                            isDark ? 'text-zinc-400 hover:text-zinc-300' : 'text-gray-400 hover:text-gray-600'
                          }`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className={`block text-xs font-medium ${isDark ? 'text-zinc-200' : 'text-gray-700'} mb-1`}>
                            Platform
                          </label>
                          <select
                            value={deliverable.platform}
                            onChange={(e) => updateDeliverable(index, 'platform', e.target.value)}
                            className={`w-full px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                              isDark ? 'border-zinc-700 bg-zinc-800/50 text-zinc-100' : 'border-zinc-200'
                            }`}
                          >
                            <option className="!bg-black text-white" value="instagram">Instagram</option>
                            <option className="!bg-black text-white" value="youtube">YouTube</option>
                            <option className="!bg-black text-white" value="tiktok">TikTok</option>
                            <option className="!bg-black text-white" value="facebook">Facebook</option>
                          </select>
                        </div>

                        <div>
                          <label className={`block text-xs font-medium ${isDark ? 'text-zinc-200' : 'text-gray-700'} mb-1`}>
                            Content Type
                          </label>
                          <select
                            value={deliverable.type}
                            onChange={(e) => updateDeliverable(index, 'type', e.target.value)}
                            className={`w-full px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                              isDark ? 'border-zinc-700 bg-zinc-800/50 text-zinc-100' : 'border-zinc-200'
                            }`}
                          >
                            {deliverableTypes.map(type => (
                              <option className="!bg-black text-white" key={type.value} value={type.value}>{type.label}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className={`block text-xs font-medium ${isDark ? 'text-zinc-200' : 'text-gray-700'} mb-1`}>
                            Quantity
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={deliverable.quantity}
                            onChange={(e) => updateDeliverable(index, 'quantity', parseInt(e.target.value))}
                            className={`w-full px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                              isDark ? 'border-zinc-700 bg-zinc-800/50 text-zinc-100' : 'border-zinc-200'
                            }`}
                          />
                        </div>

                        <div>
                          <label className={`block text-xs font-medium ${isDark ? 'text-zinc-200' : 'text-gray-700'} mb-1`}>
                            Budget per Item ($)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={deliverable.budget}
                            onChange={(e) => updateDeliverable(index, 'budget', parseFloat(e.target.value))}
                            className={`w-full px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                              isDark ? 'border-zinc-700 bg-zinc-800/50 text-zinc-100' : 'border-zinc-200'
                            }`}
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className={`block text-xs font-medium ${isDark ? 'text-zinc-200' : 'text-gray-700'} mb-1`}>
                            Description
                          </label>
                          <textarea
                            rows="2"
                            value={deliverable.description}
                            onChange={(e) => updateDeliverable(index, 'description', e.target.value)}
                            className={`w-full px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                              isDark ? 'border-zinc-700 bg-zinc-800/50 text-zinc-100' : 'border-zinc-200'
                            }`}
                            placeholder="Describe what you want in this deliverable..."
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className={`block text-xs font-medium ${isDark ? 'text-zinc-200' : 'text-gray-700'} mb-1`}>
                            Specific Requirements
                          </label>
                          <textarea
                            rows="2"
                            value={deliverable.requirements}
                            onChange={(e) => updateDeliverable(index, 'requirements', e.target.value)}
                            className={`w-full px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                              isDark ? 'border-zinc-700 bg-zinc-800/50 text-zinc-100' : 'border-zinc-200'
                            }`}
                            placeholder="e.g., Must include specific hashtags, mention our handle, etc."
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addDeliverable}
                    className={`flex items-center transition-colors ${
                      isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-700'
                    }`}
                  >
                    <Plus className="w-5 h-5 mr-1" />
                    Add Another Deliverable
                  </button>
                </div>
              </div>
            )}

        {/* Timeline Tab */}
            {activeTab === 'timeline' && (
              <div className={`rounded-xl border p-4 transition-all ${
                isDark 
                  ? 'bg-zinc-900/50 border-zinc-800' 
                  : 'bg-white border-zinc-200'
              }`}>
                <h2 className={`text-sm font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'} mb-3`}>Timeline</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className={`block text-xs font-medium ${isDark ? 'text-zinc-200' : 'text-gray-700'} mb-1`}>
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleChange}
                      className={`w-full px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                        errors.startDate ? 'border-red-500' : isDark ? 'border-zinc-700 bg-zinc-800/50 text-zinc-100' : 'border-zinc-200'
                      }`}
                    />
                    {errors.startDate && (
                      <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>
                    )}
                  </div>

                  <div>
                    <label className={`block text-xs font-medium ${isDark ? 'text-zinc-200' : 'text-gray-700'} mb-1`}>
                      End Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleChange}
                      className={`w-full px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                        errors.endDate ? 'border-red-500' : isDark ? 'border-zinc-700 bg-zinc-800/50 text-zinc-100' : 'border-zinc-200'
                      }`}
                    />
                    {errors.endDate && (
                      <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>
                    )}
                  </div>

                  <div>
                    <label className={`block text-xs font-medium ${isDark ? 'text-zinc-200' : 'text-gray-700'} mb-1`}>
                      Submission Deadline
                    </label>
                    <input
                      type="date"
                      name="submissionDeadline"
                      value={formData.submissionDeadline}
                      onChange={handleChange}
                      className={`w-full px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                        isDark ? 'border-zinc-700 bg-zinc-800/50 text-zinc-100' : 'border-zinc-200'
                      }`}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Budget Tab */}
            {activeTab === 'budget' && (
              <div className={`rounded-xl border p-4 transition-all ${
                isDark 
                  ? 'bg-zinc-900/50 border-zinc-800' 
                  : 'bg-white border-zinc-200'
              }`}>
                <h2 className={`text-sm font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'} mb-3`}>Budget</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-xs font-medium ${isDark ? 'text-zinc-200' : 'text-gray-700'} mb-1`}>
                      Total Budget ($) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="budget"
                      value={formData.budget}
                      onChange={handleChange}
                      min="10"
                      className={`w-full px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                        errors.budget ? 'border-red-500' : isDark ? 'border-zinc-700 bg-zinc-800/50 text-zinc-100' : 'border-zinc-200'
                      }`}
                      placeholder="e.g., 5000"
                    />
                    {errors.budget && (
                      <p className="mt-1 text-sm text-red-600">{errors.budget}</p>
                    )}
                  </div>

                  <div>
                    <label className={`block text-xs font-medium ${isDark ? 'text-zinc-200' : 'text-gray-700'} mb-1`}>
                      Budget Type
                    </label>
                    <select
                      name="budgetType"
                      value={formData.budgetType}
                      onChange={handleChange}
                      className={`w-full px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                        isDark ? 'border-zinc-700 bg-zinc-800/50 text-zinc-100' : 'border-zinc-200'
                      }`}
                    >
                      <option className="!bg-black text-white" value="fixed">Fixed Price</option>
                      <option className="!bg-black text-white" value="outcome-based">Outcome-based</option>
                    </select>
                  </div>
                </div>

                <div className={`mt-4 p-3 rounded-lg ${
                  isDark ? 'bg-zinc-800/50' : 'bg-blue-50'
                }`}>
                  <p className={`text-sm ${
                    isDark ? 'text-zinc-300' : 'text-blue-800'
                  }`}>
                    <strong>Platform Fee:</strong> 10% of campaign budget will be deducted upon completion.
                    You'll pay ${(formData.budget * 0.1).toFixed(2)} in fees.
                  </p>
                </div>
              </div>
            )}

            {/* Target Audience Tab */}
            {activeTab === 'audience' && (
              <div className={`rounded-xl border p-4 transition-all ${
                isDark 
                  ? 'bg-zinc-900/50 border-zinc-800' 
                  : 'bg-white border-zinc-200'
              }`}>
                <h2 className={`text-sm font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'} mb-3`}>Target Audience</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                  <div>
                    <label className={`block text-xs font-medium ${isDark ? 'text-zinc-200' : 'text-gray-700'} mb-1`}>
                      Min Followers
                    </label>
                    <select
                      value={formData.targetAudience.minFollowers}
                      onChange={(e) => setFormData({
                        ...formData,
                        targetAudience: {
                          ...formData.targetAudience,
                          minFollowers: e.target.value
                        }
                      })}
                      className={`w-full px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                        isDark ? 'border-zinc-700 bg-zinc-800/50 text-zinc-100' : 'border-zinc-200'
                      }`}
                    >
                      <option className="!bg-black text-white" value="">Any</option>
                      <option className="!bg-black text-white" value="1000">1,000+</option>
                      <option  className="!bg-black text-white"value="5000">5,000+</option>
                      <option className="!bg-black text-white" value="10000">10,000+</option>
                      <option className="!bg-black text-white" value="25000">25,000+</option>
                      <option className="!bg-black text-white" value="50000">50,000+</option>
                    </select>
                  </div>

                  <div>
                    <label className={`block text-xs font-medium ${isDark ? 'text-zinc-200' : 'text-gray-700'} mb-1`}>
                      Max Followers
                    </label>
                    <select
                      value={formData.targetAudience.maxFollowers}
                      onChange={(e) => setFormData({
                        ...formData,
                        targetAudience: {
                          ...formData.targetAudience,
                          maxFollowers: e.target.value
                        }
                      })}
                      className={`w-full px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                        isDark ? 'border-zinc-700 bg-zinc-800/50 text-zinc-100' : 'border-zinc-200'
                      }`}
                    >
                      <option className="!bg-black text-white" value="">Any</option>
                      <option className="!bg-black text-white" value="10000">Up to 10,000</option>
                      <option className="!bg-black text-white" value="25000">Up to 25,000</option>
                      <option className="!bg-black text-white" value="50000">Up to 50,000</option>
                      <option className="!bg-black text-white" value="100000">Up to 100,000</option>
                    </select>
                  </div>

                  <div>
                    <label className={`block text-xs font-medium ${isDark ? 'text-zinc-200' : 'text-gray-700'} mb-1`}>
                      Min Engagement (%)
                    </label>
                    <select
                      value={formData.targetAudience.minEngagement}
                      onChange={(e) => setFormData({
                        ...formData,
                        targetAudience: {
                          ...formData.targetAudience,
                          minEngagement: e.target.value
                        }
                      })}
                      className={`w-full px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                        isDark ? 'border-zinc-700 bg-zinc-800/50 text-zinc-100' : 'border-zinc-200'
                      }`}
                    >
                      <option className="!bg-black text-white" value="">Any</option>
                      <option className="!bg-black text-white" value="1">1%+</option>
                      <option className="!bg-black text-white" value="2">2%+</option>
                      <option className="!bg-black text-white" value="3">3%+</option>
                      <option className="!bg-black text-white" value="4">4%+</option>
                      <option className="!bg-black text-white" value="5">5%+</option>
                    </select>
                  </div>
                </div>

                {/* Niches */}
                <div className="mb-4">
                  <label className={`block text-sm font-medium ${isDark ? 'text-zinc-200' : 'text-gray-700'} mb-2`}>
                    Preferred Niches
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {niches.map(niche => (
                      <label key={niche} className={`flex items-center p-2 rounded-lg cursor-pointer transition-colors ${
                        isDark ? 'bg-zinc-800/50 hover:bg-zinc-700/50' : 'bg-gray-50 hover:bg-gray-100'
                      }`}>
                        <input
                          type="checkbox"
                          checked={formData.targetAudience.niches.includes(niche)}
                          onChange={() => toggleNiche(niche)}
                          className="mr-2 rounded border-gray-300 text-[#667eea] focus:ring-[#667eea]"
                        />
                        <Hash className={`w-3 h-3 mr-1 ${
                          isDark ? 'text-zinc-400' : 'text-gray-400'
                        }`} />
                        <span className={`text-sm ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{niche}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Platforms */}
                <div className="mb-4">
                  <label className={`block text-sm font-medium ${isDark ? 'text-zinc-200' : 'text-gray-700'} mb-2`}>
                    Platforms
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {platforms.map(platform => {
                      const Icon = platformIcons[platform] || Globe;
                      return (
                        <label key={platform} className={`flex items-center p-2 rounded-lg cursor-pointer transition-colors ${
                          isDark ? 'bg-zinc-800/50 hover:bg-zinc-700/50' : 'bg-gray-50 hover:bg-gray-100'
                        }`}>
                          <input
                            type="checkbox"
                            checked={formData.targetAudience.platforms.includes(platform)}
                            onChange={() => togglePlatform(platform)}
                            className="mr-2 rounded border-gray-300 text-[#667eea] focus:ring-[#667eea]"
                          />
                          <Icon className={`w-4 h-4 mr-1 ${
                            platform === 'instagram' ? 'text-pink-600' :
                            platform === 'youtube' ? 'text-red-600' :
                            platform === 'tiktok' ? 'text-black' :
                            'text-blue-600'
                          }`} />
                          <span className={`capitalize text-sm ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{platform}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Age Groups */}
                <div className="mb-4">
                  <label className={`block text-sm font-medium ${isDark ? 'text-zinc-200' : 'text-gray-700'} mb-2`}>
                    Age Groups
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {ageGroups.map(age => (
                      <label key={age} className={`flex items-center p-2 rounded-lg cursor-pointer transition-colors ${
                        isDark ? 'bg-zinc-800/50 hover:bg-zinc-700/50' : 'bg-gray-50 hover:bg-gray-100'
                      }`}>
                        <input
                          type="checkbox"
                          checked={formData.targetAudience.ages.includes(age)}
                          onChange={() => toggleAgeGroup(age)}
                          className="mr-2 rounded border-gray-300 text-[#667eea] focus:ring-[#667eea]"
                        />
                        <Users2 className={`w-3 h-3 mr-1 ${
                          isDark ? 'text-zinc-400' : 'text-gray-400'
                        }`} />
                        <span className={`text-sm ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{age}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Genders */}
                <div className="mb-4">
                  <label className={`block text-sm font-medium ${isDark ? 'text-zinc-200' : 'text-gray-700'} mb-2`}>
                    Genders
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {genders.map(gender => (
                      <label key={gender} className={`flex items-center p-2 rounded-lg cursor-pointer transition-colors ${
                        isDark ? 'bg-zinc-800/50 hover:bg-zinc-700/50' : 'bg-gray-50 hover:bg-gray-100'
                      }`}>
                        <input
                          type="checkbox"
                          checked={formData.targetAudience.genders.includes(gender)}
                          onChange={() => toggleGender(gender)}
                          className="mr-2 rounded border-gray-300 text-[#667eea] focus:ring-[#667eea]"
                        />
                        <span className={`capitalize text-sm ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{gender}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Locations */}
                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-zinc-200' : 'text-gray-700'} mb-2`}>
                    Target Locations
                  </label>
                  <div className="space-y-2">
                    {formData.targetAudience.locations.map((loc, index) => (
                      <div key={index} className={`flex items-center gap-2 p-2 rounded-lg ${
                        isDark ? 'bg-zinc-800/50' : 'bg-gray-50'
                      }`}>
                        <MapPin className={`w-4 h-4 ${
                          isDark ? 'text-zinc-400' : 'text-gray-400'
                        }`} />
                        <span className={`flex-1 text-sm ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{loc}</span>
                        <button
                          type="button"
                          onClick={() => removeLocation(index)}
                          className={`transition-colors ${
                            isDark ? 'text-zinc-400 hover:text-zinc-300' : 'text-gray-400 hover:text-gray-600'
                          }`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add a location (e.g., New York, USA)"
                        className={`flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          isDark ? 'border-zinc-600 bg-zinc-800/50 text-zinc-100' : 'border-gray-300'
                        }`}
                        value={newLocation}
                        onChange={(e) => setNewLocation(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addLocation()}
                      />
                      <Button type="button" variant="secondary" onClick={addLocation} icon={Plus}>
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Requirements Tab */}
            {activeTab === 'requirements' && (
              <div className={`rounded-xl border p-4 transition-all ${
                isDark 
                  ? 'bg-zinc-900/50 border-zinc-800' 
                  : 'bg-white border-zinc-200'
              }`}>
                <h2 className={`text-sm font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'} mb-3`}>Additional Requirements</h2>

                <div className="space-y-1.5">
                  {formData.requirements.map((req, index) => (
                    <div key={index} className={`flex items-center gap-2 p-1.5 rounded-lg ${
                      isDark ? 'bg-zinc-800/50' : 'bg-gray-50'
                    }`}>
                      <CheckCircle className="w-3 h-3 text-green-600" />
                      <span className={`flex-1 text-xs ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{req}</span>
                      <button
                        type="button"
                        onClick={() => removeRequirement(index)}
                        className={`transition-colors ${
                          isDark ? 'text-zinc-400 hover:text-zinc-300' : 'text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add a requirement..."
                      className={`flex-1 px-3 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                        isDark ? 'border-zinc-700 bg-zinc-800/50 text-zinc-100' : 'border-zinc-200'
                      }`}
                      value={newRequirement}
                      onChange={(e) => setNewRequirement(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addRequirement()}
                    />
                    <Button type="button" variant="secondary" onClick={addRequirement} icon={Plus} className="px-2 py-1.5 text-xs">
                      Add
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

                  </form>
      </div>
      </div>
    </div>
  );
};

export default CampaignEdit;