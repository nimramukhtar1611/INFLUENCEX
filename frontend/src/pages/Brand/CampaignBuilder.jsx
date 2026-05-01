import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Target,
  DollarSign,
  Image,
  Users,
  Globe,
  ChevronRight,
  ChevronLeft,
  Plus,
  X,
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Info,
  Loader,
  Instagram,
  Youtube,
  Facebook,
  Globe2,
  Hash,
  MapPin,
  Users2,
  Music,
} from 'lucide-react';
import { useCampaign } from '../../hooks/useCampaign';
import { useTheme } from '../../hooks/useTheme';
import { useGlobalSettings } from '../../context/GlobalSettingsContext';
import campaignService from '../../services/campaignService';
import { formatCurrency, formatDate, timeAgo } from '../../utils/helpers';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import toast from 'react-hot-toast';
import api from '../../services/api';

const CampaignBuilder = () => {
  const navigate = useNavigate();
  const { createCampaign, loading } = useCampaign();
  const { theme, isDark } = useTheme();
  const { getSetting, isFeatureEnabled, formatCurrency: formatCurrencyWithSettings } = useGlobalSettings();
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    // Basic Info
    title: '',
    description: '',
    category: '',
    objectives: [],

    // Deliverables
    deliverables: [
      {
        type: 'post',
        platform: 'instagram',
        quantity: 1,
        description: '',
        requirements: '',
        budget: 0,
      },
    ],

    // Timeline
    startDate: '',
    endDate: '',
    submissionDeadline: '',

    // Budget
    budget: 0,
    budgetType: 'fixed',
    paymentTerms: 'escrow',

    // Target Audience
    targetAudience: {
      minFollowers: '',
      maxFollowers: '',
      minEngagement: '',
      locations: [],
      ages: [],
      genders: [],
      niches: [],
      platforms: ['instagram', 'youtube', 'tiktok', 'facebook'],
    },

    // Additional
    requirements: [],
    brandAssets: [],
  });

  const [newObjective, setNewObjective] = useState('');
  const [newRequirement, setNewRequirement] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [assets, setAssets] = useState([]);
  const [uploadingAssets, setUploadingAssets] = useState(false);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [balanceLoading, setBalanceLoading] = useState(true);

  // ==================== FETCH BALANCE ====================
  React.useEffect(() => {
    const fetchBalance = async () => {
      try {
        const response = await api.get('/payments/balance');
        if (response.data?.success) {
          setAvailableBalance(response.data.available);
        }
      } catch (error) {
        console.error('Error fetching balance:', error);
      } finally {
        setBalanceLoading(false);
      }
    };
    fetchBalance();
  }, []);

  // ==================== VALID CATEGORIES ====================
  const categories = [
    'Fashion', 'Beauty', 'Technology', 'Food & Beverage',
    'Fitness', 'Travel', 'Gaming', 'Lifestyle', 'Parenting',
    'Finance', 'Education', 'Entertainment', 'Sports', 'Other',
  ];

  const niches = [
    'Fashion', 'Beauty', 'Fitness', 'Travel', 'Food',
    'Tech', 'Gaming', 'Lifestyle', 'Parenting', 'Finance',
    'Education', 'Entertainment', 'Sports', 'Health', 'Wellness',
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
    { value: 'image', label: 'Image' },
  ];

  const platformIcons = {
    instagram: Instagram,
    youtube: Youtube,
    tiktok: Music,
    facebook: Facebook,
  };

  // ==================== VALIDATION FUNCTIONS ====================
  const validateStep1 = () => {
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};

    formData.deliverables.forEach((del, index) => {
      if (del.quantity < 1) {
        newErrors[`deliverable_${index}_quantity`] = 'Quantity must be at least 1';
      }
      if (del.quantity > 100) {
        newErrors[`deliverable_${index}_quantity`] = 'Quantity cannot exceed 100';
      }
      if (del.budget < 0) {
        newErrors[`deliverable_${index}_budget`] = 'Budget cannot be negative';
      }
    });

    // Check if total deliverables budget exceeds campaign budget
    const totalDeliverablesBudget = formData.deliverables.reduce(
      (sum, d) => sum + (d.budget * d.quantity),
      0
    );

    if (totalDeliverablesBudget > formData.budget && formData.budget > 0) {
      newErrors.budget = 'Total deliverables budget exceeds campaign budget';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    } else if (startDate < today) {
      newErrors.startDate = 'Start date must be in the future';
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    } else if (formData.startDate && endDate <= startDate) {
      newErrors.endDate = 'End date must be after start date';
    }

    if (formData.submissionDeadline) {
      const submissionDate = new Date(formData.submissionDeadline);
      if (submissionDate >= endDate) {
        newErrors.submissionDeadline = 'Submission deadline must be before end date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep4 = () => {
    const newErrors = {};

    if (!formData.budget || formData.budget < 10) {
      newErrors.budget = 'Budget must be at least $10';
    } else if (formData.budget > 1000000) {
      newErrors.budget = 'Budget cannot exceed $1,000,000';
    } else if (formData.budget > availableBalance) {
      newErrors.budget = `Insufficient balance. Available: $${availableBalance.toFixed(2)}`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep5 = () => {
    // Target audience is optional, so always valid
    return true;
  };

  // ==================== STEP VALIDATION DISPATCH ====================
  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return validateStep1();
      case 2:
        return validateStep2();
      case 3:
        return validateStep3();
      case 4:
        return validateStep4();
      case 5:
        return validateStep5();
      default:
        return true;
    }
  };

  // ==================== STEP NAVIGATION ====================
  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep(currentStep + 1);
      window.scrollTo(0, 0);
    } else {
      toast.error('Please fix the errors before continuing');
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    }
  };

  // ==================== FORM SUBMISSION ====================
  const handleSubmit = async () => {
    if (!validateCurrentStep()) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    try {
      setSubmitting(true);

      // Check campaign limits from global settings
      const maxCampaignsPerBrand = getSetting('customLimits.maxCampaignsPerBrand', 50);
      const minCampaignBudget = getSetting('payments.minPayoutAmount', 50);
      const maxCampaignBudget = getSetting('customLimits.maxCampaignBudget', 100000);

      // Validate budget limits
      if (parseFloat(formData.budget) < minCampaignBudget) {
        toast.error(`Minimum campaign budget is ${formatCurrencyWithSettings(minCampaignBudget)}`);
        setSubmitting(false);
        return;
      }

      if (parseFloat(formData.budget) > maxCampaignBudget) {
        toast.error(`Maximum campaign budget is ${formatCurrencyWithSettings(maxCampaignBudget)}`);
        setSubmitting(false);
        return;
      }

      // Check if campaigns feature is enabled
      if (!isFeatureEnabled('campaigns')) {
        toast.error('Campaign creation is currently disabled');
        setSubmitting(false);
        return;
      }

      // Check brand's current campaign count (optional - would need API call)
      // This could be implemented as a separate validation step

      // Prepare data for API
      const campaignData = {
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
          budget: parseFloat(d.budget || 0),
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
          platforms: formData.targetAudience.platforms,
        },
        requirements: formData.requirements,
      };

      const result = await createCampaign(campaignData);

      if (result) {
        toast.success('Campaign created successfully!');
        navigate(`/brand/campaigns/${result._id}`);
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error(error.message || 'Failed to create campaign');
    } finally {
      setSubmitting(false);
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
          budget: 0,
        },
      ],
    }));
  };

  const removeDeliverable = (index) => {
    if (formData.deliverables.length > 1) {
      setFormData(prev => ({
        ...prev,
        deliverables: prev.deliverables.filter((_, i) => i !== index),
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
      ),
    }));

    // Clear error for this field
    if (errors[`deliverable_${index}_${field}`]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`deliverable_${index}_${field}`];
        return newErrors;
      });
    }
  };

  // ==================== OBJECTIVE MANAGEMENT ====================
  const addObjective = () => {
    if (newObjective.trim()) {
      setFormData(prev => ({
        ...prev,
        objectives: [...prev.objectives, newObjective.trim()],
      }));
      setNewObjective('');
    }
  };

  const removeObjective = (index) => {
    setFormData(prev => ({
      ...prev,
      objectives: prev.objectives.filter((_, i) => i !== index),
    }));
  };

  // ==================== REQUIREMENT MANAGEMENT ====================
  const addRequirement = () => {
    if (newRequirement.trim()) {
      setFormData(prev => ({
        ...prev,
        requirements: [...prev.requirements, newRequirement.trim()],
      }));
      setNewRequirement('');
    }
  };

  const removeRequirement = (index) => {
    setFormData(prev => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== index),
    }));
  };

  // ==================== LOCATION MANAGEMENT ====================
  const addLocation = () => {
    if (newLocation.trim()) {
      setFormData(prev => ({
        ...prev,
        targetAudience: {
          ...prev.targetAudience,
          locations: [...prev.targetAudience.locations, newLocation.trim()],
        },
      }));
      setNewLocation('');
    }
  };

  const removeLocation = (index) => {
    setFormData(prev => ({
      ...prev,
      targetAudience: {
        ...prev.targetAudience,
        locations: prev.targetAudience.locations.filter((_, i) => i !== index),
      },
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
          niches,
        },
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
          ages,
        },
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
          genders,
        },
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
          platforms,
        },
      };
    });
  };

  // ==================== FILE UPLOAD (FIXED) ====================
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    setUploadingAssets(true);

    try {
      const uploadedAssets = [];

      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);

        // Use the correct upload endpoint: /api/upload/single
        const response = await api.post('/upload/single', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        if (response.data?.success) {
          uploadedAssets.push({
            name: file.name,
            fileUrl: response.data.file.url,
            fileType: file.type.split('/')[0],
            fileSize: file.size,
          });
        } else {
          throw new Error(response.data?.error || 'Upload failed');
        }
      }

      setFormData(prev => ({
        ...prev,
        brandAssets: [...prev.brandAssets, ...uploadedAssets],
      }));

      setAssets([...assets, ...files]);
      toast.success(`${files.length} file(s) uploaded`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload files');
    } finally {
      setUploadingAssets(false);
    }
  };

  const removeAsset = (index) => {
    setFormData(prev => ({
      ...prev,
      brandAssets: prev.brandAssets.filter((_, i) => i !== index),
    }));
    setAssets(prev => prev.filter((_, i) => i !== index));
  };

  // ==================== STEPS CONFIGURATION ====================
  const steps = [
    { number: 1, name: 'Basics', icon: Target },
    { number: 2, name: 'Deliverables', icon: Image },
    { number: 3, name: 'Timeline', icon: Calendar },
    { number: 4, name: 'Budget', icon: DollarSign },
    { number: 5, name: 'Audience', icon: Users },
    { number: 6, name: 'Review', icon: Globe },
  ];

  // ==================== RENDER STEP CONTENT ====================
  const renderStepContent = () => {
    switch (currentStep) {
   case 1:
  return (
    <div className="space-y-4">
      <div>
        {/* Label text color updated to white in dark mode */}
        <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-white' : 'text-zinc-700'}`}>
          Campaign Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-zinc-500 transition-colors appearance-none ${
            errors.title 
              ? 'border-red-500 bg-red-50' 
              : isDark 
                ? '!bg-zinc-900 !border-zinc-700 !text-white placeholder-zinc-500' 
                : 'bg-zinc-50 border-zinc-200 text-zinc-900'
          }`}
          placeholder="e.g., Summer Collection Launch 2024"
          value={formData.title}
          onChange={(e) => {
            setFormData({ ...formData, title: e.target.value });
            if (errors.title) {
              setErrors({ ...errors, title: null });
            }
          }}
        />
        {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title}</p>}
      </div>

      <div>
        <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-white' : 'text-zinc-700'}`}>
          Campaign Description <span className="text-red-500">*</span>
        </label>
        <textarea
          required
          rows="3"
          className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-zinc-500 transition-colors appearance-none ${
            errors.description
              ? 'border-red-500 bg-red-50'
              : isDark
                ? '!bg-zinc-900 !border-zinc-700 !text-white placeholder-zinc-500'
                : 'bg-zinc-50 border-zinc-200 text-zinc-900'
          }`}
          placeholder="Describe your campaign goals..."
          value={formData.description}
          onChange={(e) => {
            setFormData({ ...formData, description: e.target.value });
            if (errors.description) {
              setErrors({ ...errors, description: null });
            }
          }}
        />
        {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description}</p>}
        <p className={`text-[10px] mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
          {formData.description.length}/2000 characters
        </p>
      </div>

      <div>
        <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-white' : 'text-zinc-700'}`}>
          Category <span className="text-red-500">*</span>
        </label>
        <select
          required
          className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-zinc-500 transition-colors ${
            errors.category 
              ? 'border-red-500 bg-red-50' 
              : isDark 
                ? '!bg-zinc-900 !border-zinc-700 !text-white' 
                : 'bg-zinc-50 border-zinc-200 text-zinc-900'
          }`}
          value={formData.category}
          onChange={(e) => {
            setFormData({ ...formData, category: e.target.value });
            if (errors.category) {
              setErrors({ ...errors, category: null });
            }
          }}
        >
          <option value="" className={isDark ? 'bg-zinc-900' : ''}>Select a category</option>
          {categories.map(cat => (
            <option key={cat} value={cat} className={isDark ? 'bg-zinc-900' : ''}>
              {cat}
            </option>
          ))}
        </select>
        {errors.category && <p className="mt-1 text-xs text-red-600">{errors.category}</p>}
      </div>

      <div>
        <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-white' : 'text-zinc-700'}`}>
          Campaign Objectives
        </label>
        <div className="space-y-2">
          {formData.objectives.map((obj, index) => (
            <div key={index} className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${
              isDark ? 'bg-zinc-900/50 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900'
            }`}>
              <CheckCircle className="w-3 h-3 text-green-600" />
              <span className="flex-1 text-xs">{obj}</span>
              <button
                onClick={() => removeObjective(index)}
                className="text-zinc-400 hover:text-red-400 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add an objective..."
              className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-zinc-500 transition-colors appearance-none ${
                isDark 
                  ? '!bg-zinc-900 !border-zinc-700 !text-white placeholder-zinc-500' 
                  : 'bg-zinc-50 border-zinc-200 text-zinc-900'
              }`}
              value={newObjective}
              onChange={(e) => setNewObjective(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addObjective()}
            />
            <Button 
              variant="secondry" 
              onClick={addObjective} 
              icon={Plus}
              className="px-4 py-2 text-xs rounded-xl"
            >
              Add
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

    case 2:
  return (
    <div className="space-y-4">
      {formData.deliverables.map((deliverable, index) => (
        <div 
          key={index} 
          className={`p-4 rounded-xl border relative transition-all ${
            isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-zinc-50 border-zinc-200'
          }`}
        >
          {formData.deliverables.length > 1 && (
            <button
              onClick={() => removeDeliverable(index)}
              className="absolute top-3 right-3 text-zinc-400 hover:text-red-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Platform Select */}
            <div>
              <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-white' : 'text-zinc-700'}`}>
                Platform
              </label>
              <select
                className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all appearance-none cursor-pointer ${
                  isDark 
                    ? '!bg-zinc-900 border-zinc-700 text-white' 
                    : 'bg-white border-zinc-200 text-zinc-900'
                }`}
                value={deliverable.platform}
                onChange={(e) => updateDeliverable(index, 'platform', e.target.value)}
              >
                <option value="instagram">Instagram</option>
                <option value="youtube">YouTube</option>
                <option value="tiktok">TikTok</option>
                <option value="facebook">Facebook</option>
              </select>
            </div>

            {/* Content Type Select */}
            <div>
              <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-white' : 'text-zinc-700'}`}>
                Content Type
              </label>
              <select
                className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all appearance-none cursor-pointer ${
                  isDark 
                    ? '!bg-zinc-900 border-zinc-700 text-white' 
                    : 'bg-white border-zinc-200 text-zinc-900'
                }`}
                value={deliverable.type}
                onChange={(e) => updateDeliverable(index, 'type', e.target.value)}
              >
                {deliverableTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity Input */}
            <div>
              <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-white' : 'text-zinc-700'}`}>
                Quantity
              </label>
              <input
                type="number"
                min="1"
                className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all ${
                  errors[`deliverable_${index}_quantity`] 
                    ? 'border-red-500 bg-red-50'
                    : isDark
                      ? '!bg-zinc-900 border-zinc-700 text-white'
                      : 'bg-white border-zinc-200 text-zinc-900'
                }`}
                value={deliverable.quantity}
                onChange={(e) => updateDeliverable(index, 'quantity', parseInt(e.target.value))}
              />
              {errors[`deliverable_${index}_quantity`] && (
                <p className="mt-1 text-xs text-red-500 font-medium">{errors[`deliverable_${index}_quantity`]}</p>
              )}
            </div>

            {/* Budget Input */}
            <div>
              <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-white' : 'text-zinc-700'}`}>
                Budget per Item ($)
              </label>
              <input
                type="number"
                min="0"
                className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all ${
                  errors[`deliverable_${index}_budget`] 
                    ? 'border-red-500 bg-red-50' 
                    : isDark 
                      ? '!bg-zinc-900 border-zinc-700 text-white' 
                      : 'bg-white border-zinc-200 text-zinc-900'
                }`}
                value={deliverable.budget}
                onChange={(e) => updateDeliverable(index, 'budget', parseFloat(e.target.value))}
              />
              {errors[`deliverable_${index}_budget`] && (
                <p className="mt-1 text-xs text-red-500 font-medium">{errors[`deliverable_${index}_budget`]}</p>
              )}
            </div>

            {/* Textareas */}
            <div className="md:col-span-2">
              <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-white' : 'text-zinc-700'}`}>
                Description
              </label>
              <textarea
                rows="2"
                className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all resize-none ${
                  isDark 
                    ? '!bg-zinc-900 border-zinc-700 text-white !placeholder-white' 
                    : 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400'
                }`}
                placeholder="Describe what you want in this deliverable..."
                value={deliverable.description}
                onChange={(e) => updateDeliverable(index, 'description', e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-white' : 'text-zinc-700'}`}>
                Specific Requirements
              </label>
              <textarea
                rows="2"
                className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all resize-none ${
                  isDark 
                    ? '!bg-zinc-900 border-zinc-700 text-white !placeholder-white' 
                    : 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400'
                }`}
                placeholder="e.g., Must include specific hashtags, mention our handle, etc."
                value={deliverable.requirements}
                onChange={(e) => updateDeliverable(index, 'requirements', e.target.value)}
              />
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addDeliverable}
        className={`flex items-center text-xs font-semibold ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-zinc-600 hover:text-zinc-900'} transition-colors`}
      >
        <Plus className="w-4 h-4 mr-1" />
        Add Another Deliverable
      </button>

      {/* Brand Assets Upload */}
      <div className="mt-4">
        <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-white' : 'text-zinc-700'}`}>
          Brand Assets (Optional)
        </label>
        <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
          isDark ? 'border-zinc-700 bg-zinc-900/50 hover:border-zinc-500' : 'border-zinc-200 bg-zinc-50 hover:border-zinc-300'
        }`}>
          <input
            type="file"
            multiple
            onChange={handleFileUpload}
            className="hidden"
            id="asset-upload"
            disabled={uploadingAssets}
            accept="image/*,video/*,.pdf,.doc,.docx,.zip"
          />
          <label htmlFor="asset-upload" className="cursor-pointer block">
            {uploadingAssets ? (
              <Loader className={`w-8 h-8 ${isDark ? 'text-blue-400' : 'text-zinc-600'} animate-spin mx-auto mb-2`} />
            ) : (
              <Upload className={`w-8 h-8 ${isDark ? 'text-zinc-500' : 'text-zinc-400'} mx-auto mb-2`} />
            )}
            <p className={`text-xs ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
              Drag and drop files here, or{' '}
              <span className="text-gray-300 font-bold">browse</span>
            </p>
            <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider">
              Max 100MB (Logos, Images, Guidelines)
            </p>
          </label>
        </div>

        {/* File List */}
        {formData.brandAssets.length > 0 && (
          <div className="mt-3 space-y-2">
            {formData.brandAssets.map((asset, index) => (
              <div key={index} className={`flex items-center justify-between p-3 rounded-lg border ${
                isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'
              }`}>
                <div className="flex items-center">
                  <FileText className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-zinc-400'} mr-2`} />
                  <span className={`text-xs font-medium ${isDark ? 'text-white' : 'text-zinc-700'}`}>{asset.name}</span>
                  <span className="text-[10px] text-zinc-500 ml-2 font-mono">
                    ({(asset.fileSize / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
                <button
                  onClick={() => removeAsset(index)}
                  className="text-zinc-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

   case 3:
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Campaign Start Date */}
        <div>
          <label className={`block text-xs font-medium mb-1 ${isDark ? '!text-white' : 'text-zinc-700'}`}>
            Campaign Start Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            required
            className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 transition-colors 
              ${errors.startDate 
                ? 'border-red-500 bg-red-50' 
                : isDark 
                  ? '!bg-zinc-900 !text-white !border-zinc-700 focus:!ring-zinc-500 accent-zinc-500' 
                  : 'bg-white border-zinc-200 text-zinc-900 focus:ring-blue-500'}`}
            value={formData.startDate}
            onChange={(e) => {
              setFormData({ ...formData, startDate: e.target.value });
              if (errors.startDate) {
                setErrors({ ...errors, startDate: null });
              }
            }}
          />
          {errors.startDate && <p className="mt-1 text-xs text-red-600">{errors.startDate}</p>}
        </div>

        {/* Campaign End Date */}
        <div>
          <label className={`block text-xs font-medium mb-1 ${isDark ? '!text-white' : 'text-zinc-700'}`}>
            Campaign End Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            required
            className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 transition-colors 
              ${errors.endDate 
                ? 'border-red-500 bg-red-50' 
                : isDark 
                  ? '!bg-zinc-900 !text-white !border-zinc-700 focus:!ring-zinc-500 accent-zinc-500' 
                  : 'bg-white border-zinc-200 text-zinc-900 focus:ring-blue-500'}`}
            value={formData.endDate}
            onChange={(e) => {
              setFormData({ ...formData, endDate: e.target.value });
              if (errors.endDate) {
                setErrors({ ...errors, endDate: null });
              }
            }}
          />
          {errors.endDate && <p className="mt-1 text-xs text-red-600">{errors.endDate}</p>}
        </div>

        {/* Submission Deadline */}
        <div className="md:col-span-2">
          <label className={`block text-xs font-medium mb-1 ${isDark ? '!text-white' : 'text-zinc-700'}`}>
            Content Submission Deadline
          </label>
          <input
            type="date"
            className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 transition-colors 
              ${errors.submissionDeadline 
                ? 'border-red-500 bg-red-50' 
                : isDark 
                  ? '!bg-zinc-900 !text-white !border-zinc-700 focus:!ring-zinc-500 accent-zinc-500' 
                  : 'bg-white border-zinc-200 text-zinc-900 focus:ring-blue-500'}`}
            value={formData.submissionDeadline}
            onChange={(e) => {
              setFormData({ ...formData, submissionDeadline: e.target.value });
              if (errors.submissionDeadline) {
                setErrors({ ...errors, submissionDeadline: null });
              }
            }}
          />
          {errors.submissionDeadline && <p className="mt-1 text-xs text-red-600">{errors.submissionDeadline}</p>}
        </div>
      </div>

      {/* Info Box */}
      <div className={`p-3 rounded-xl border ${
        isDark ? '!bg-zinc-900 !border-zinc-800' : 'bg-blue-50 border-blue-100'
      }`}>
        <div className="flex items-start gap-2">
          <Info className={`w-4 h-4 mt-0.5 ${isDark ? 'text-zinc-400' : 'text-blue-500'}`} />
          <p className={`text-xs ${isDark ? '!text-zinc-300' : 'text-blue-700'}`}>
            <strong className={`${isDark ? '!text-white' : 'text-blue-900'}`}>Note:</strong> Submission deadline should be at least 3-5 days before campaign end date to allow for revisions.
          </p>
        </div>
      </div>
    </div>
  );

 case 4:
  return (
    <div className="space-y-4">
      <div>
        <label className={`block text-xs font-medium mb-1 ${isDark ? '!text-white' : 'text-zinc-700'}`}>
          Total Campaign Budget ($) <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          required
          min="10"
          className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 transition-colors ${
            errors.budget 
              ? 'border-red-500 bg-red-50' 
              : isDark 
              ? '!bg-zinc-900 !border-zinc-700 !text-white !placeholder-white/60 focus:!ring-zinc-500' 
              : 'bg-zinc-50 border-zinc-200 text-zinc-900'
          }`}
          placeholder="e.g., 5000"
          value={formData.budget}
          onChange={(e) => {
            setFormData({ ...formData, budget: e.target.value });
            if (errors.budget) {
              setErrors({ ...errors, budget: null });
            }
          }}
        />
        {errors.budget && (
          <p className="mt-1 text-xs text-red-600 font-medium flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errors.budget}
          </p>
        )}
        <div className="flex justify-between mt-1">
          <p className={`text-[10px] ${isDark ? '!text-zinc-400' : 'text-zinc-500'}`}>
            This is the total budget for all deliverables combined
          </p>
          <p className={`text-xs font-medium ${availableBalance < formData.budget ? 'text-red-600' : isDark ? '!text-green-400' : 'text-green-600'}`}>
            Available Balance: ${availableBalance.toFixed(2)}
          </p>
        </div>
      </div>

      <div>
        <label className={`block text-xs font-medium mb-1 ${isDark ? '!text-white' : 'text-zinc-700'}`}>
          Budget Type
        </label>
        <div className="space-y-2">
          {['fixed', 'outcome-based'].map((type) => (
            <label 
              key={type}
              className={`flex items-center p-3 rounded-xl border cursor-pointer transition-colors ${
                isDark 
                  ? `!bg-zinc-900 !border-zinc-700 hover:!bg-zinc-800 ${formData.budgetType === type ? '!ring-1 !ring-zinc-500 !border-zinc-500' : ''}` 
                  : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100'
              }`}
            >
              <input
                type="radio"
                name="budgetType"
                value={type}
                checked={formData.budgetType === type}
                onChange={(e) => setFormData({ ...formData, budgetType: e.target.value })}
                className={`mr-3 ${isDark ? 'accent-zinc-500' : ''}`}
              />
              <div>
                <span className={`text-xs font-medium ${isDark ? '!text-white' : ''}`}>
                  {type === 'fixed' ? 'Fixed Price' : 'Outcome-based'}
                </span>
                <p className={`text-[10px] ${isDark ? '!text-zinc-400' : 'text-zinc-500'}`}>
                  {type === 'fixed' ? 'Set a fixed price for each creator' : 'Pay based on performance (CPE/CPA)'}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className={`p-3 rounded-xl border ${
        isDark ? '!bg-zinc-900 !border-zinc-800' : 'bg-blue-50 border-blue-200'
      }`}>
        <div className="flex items-start gap-2">
          <Info className={`w-4 h-4 mt-0.5 ${isDark ? '!text-zinc-400' : 'text-blue-600'}`} />
          <div>
            <p className={`text-xs ${isDark ? '!text-zinc-300' : 'text-blue-800'}`}>
              <strong className={`${isDark ? '!text-white' : ''}`}>Platform Fee:</strong> 10% of campaign budget will be deducted upon completion.
            </p>
            <p className={`text-xs mt-1 ${isDark ? '!text-zinc-300' : 'text-blue-800'}`}>
              You'll pay <span className={isDark ? '!text-white font-bold' : ''}>${(formData.budget * 0.1).toFixed(2)}</span> in fees.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
case 5:
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Min Followers */}
        <div>
          <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-white !important' : 'text-zinc-700'}`}>
            Min Followers
          </label>
          <select
            className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-zinc-500 transition-colors appearance-none ${
              isDark 
                ? '!bg-zinc-900 !border-zinc-700 !text-white' 
                : 'bg-zinc-50 border-zinc-200 text-zinc-900'
            }`}
            value={formData.targetAudience.minFollowers}
            onChange={(e) => setFormData({ ...formData, targetAudience: { ...formData.targetAudience, minFollowers: e.target.value } })}
          >
            <option value="" className={isDark ? "bg-zinc-900" : ""}>Any</option>
            <option value="1000" className={isDark ? "bg-zinc-900" : ""}>1,000+</option>
            <option value="5000" className={isDark ? "bg-zinc-900" : ""}>5,000+</option>
            <option value="10000" className={isDark ? "bg-zinc-900" : ""}>10,000+</option>
            <option value="25000" className={isDark ? "bg-zinc-900" : ""}>25,000+</option>
            <option value="50000" className={isDark ? "bg-zinc-900" : ""}>50,000+</option>
            <option value="100000" className={isDark ? "bg-zinc-900" : ""}>100,000+</option>
          </select>
        </div>

        {/* Max Followers */}
        <div>
          <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-white !important' : 'text-zinc-700'}`}>
            Max Followers
          </label>
          <select
            className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-zinc-500 transition-colors appearance-none ${
              isDark 
                ? '!bg-zinc-900 !border-zinc-700 !text-white' 
                : 'bg-zinc-50 border-zinc-200 text-zinc-900'
            }`}
            value={formData.targetAudience.maxFollowers}
            onChange={(e) => setFormData({ ...formData, targetAudience: { ...formData.targetAudience, maxFollowers: e.target.value } })}
          >
            <option value="" className={isDark ? "bg-zinc-900" : ""}>Any</option>
            <option value="10000" className={isDark ? "bg-zinc-900" : ""}>Up to 10,000</option>
            <option value="25000" className={isDark ? "bg-zinc-900" : ""}>Up to 25,000</option>
            <option value="50000" className={isDark ? "bg-zinc-900" : ""}>Up to 50,000</option>
            <option value="100000" className={isDark ? "bg-zinc-900" : ""}>Up to 100,000</option>
          </select>
        </div>

        {/* Min Engagement */}
        <div>
          <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-white !important' : 'text-zinc-700'}`}>
            Min Engagement Rate (%)
          </label>
          <select
            className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-zinc-500 transition-colors appearance-none ${
              isDark 
                ? '!bg-zinc-900 !border-zinc-700 !text-white' 
                : 'bg-zinc-50 border-zinc-200 text-zinc-900'
            }`}
            value={formData.targetAudience.minEngagement}
            onChange={(e) => setFormData({ ...formData, targetAudience: { ...formData.targetAudience, minEngagement: e.target.value } })}
          >
            <option value="" className={isDark ? "bg-zinc-900" : ""}>Any</option>
            <option value="1" className={isDark ? "bg-zinc-900" : ""}>1%+</option>
            <option value="2" className={isDark ? "bg-zinc-900" : ""}>2%+</option>
            <option value="3" className={isDark ? "bg-zinc-900" : ""}>3%+</option>
            <option value="4" className={isDark ? "bg-zinc-900" : ""}>4%+</option>
            <option value="5" className={isDark ? "bg-zinc-900" : ""}>5%+</option>
          </select>
        </div>

        {/* Platforms */}
        <div>
          <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-white !important' : 'text-zinc-700'}`}>
            Platforms
          </label>
          <div className="space-y-1 mt-1">
            {platforms.map(platform => {
              const Icon = platformIcons[platform] || Globe2;
              return (
                <label
                  key={platform}
                  className={`flex items-center p-2 rounded-lg cursor-pointer transition-colors ${
                    isDark ? '!bg-zinc-900 !border !border-zinc-800 hover:!bg-zinc-800' : 'bg-zinc-50 hover:bg-zinc-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    className={`mr-2 rounded ${isDark ? '!bg-zinc-800 !border-zinc-700 !text-zinc-400' : 'text-zinc-700'}`}
                    checked={formData.targetAudience.platforms.includes(platform)}
                    onChange={() => togglePlatform(platform)}
                  />
                  <Icon className={`w-3 h-3 mr-2 ${platform === 'instagram' ? 'text-pink-500' : platform === 'youtube' ? 'text-red-500' : isDark ? 'text-white' : 'text-zinc-900'}`} />
                  <span className={`text-xs capitalize ${isDark ? 'text-white' : ''}`}>{platform}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {/* Target Locations */}
      <div>
        <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-white !important' : 'text-zinc-700'}`}>
          Target Locations
        </label>
        <div className="space-y-2">
          {formData.targetAudience.locations.map((loc, index) => (
            <div key={index} className={`flex items-center gap-2 p-2 rounded-lg border ${
              isDark ? '!bg-zinc-900 !border-zinc-700 !text-white' : 'bg-zinc-50 border-zinc-200'
            }`}>
              <MapPin className="w-3 h-3 text-zinc-400" />
              <span className="flex-1 text-xs">{loc}</span>
              <button onClick={() => removeLocation(index)} className="text-zinc-400 hover:text-red-400 transition-colors">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add a location (e.g., New York, USA)"
              className={`flex-1 px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-zinc-500 transition-colors ${
                isDark 
                  ? '!bg-zinc-900 !border-zinc-700 !text-white !placeholder-zinc-500' 
                  : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400'
              }`}
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addLocation()}
            />
            <Button 
              variant="secondry" 
              onClick={addLocation} 
              icon={Plus}
              className={`px-4 py-2 text-xs rounded-xl ${isDark ? '!bg-zinc-100 !text-zinc-900 hover:!bg-white' : ''}`}
            >
              Add
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  case 6:
  return (
    <div className={`space-y-4 ${isDark ? 'dark' : ''}`}>
      <h3 className="text-base font-semibold text-zinc-900 dark:!text-white">
        Review Your Campaign
      </h3>

      <div className={`p-4 rounded-xl border space-y-3 ${
        isDark 
          ? '!bg-zinc-900 !border-zinc-700' 
          : 'bg-zinc-50 border-zinc-200'
      }`}>
        {/* Basic Info */}
        <div>
          <p className="text-xs text-zinc-500 dark:!text-zinc-400">Campaign Title</p>
          <p className="text-sm font-medium text-zinc-900 dark:!text-white">
            {formData.title || 'Not specified'}
          </p>
        </div>

        <div>
          <p className="text-xs text-zinc-500 dark:!text-zinc-400">Description</p>
          <p className="text-xs text-zinc-700 dark:!text-zinc-300">
            {formData.description || 'Not specified'}
          </p>
        </div>

        <div>
          <p className="text-xs text-zinc-500 dark:!text-zinc-400">Category</p>
          <p className="text-sm font-medium text-zinc-900 dark:!text-white">
            {formData.category || 'Not specified'}
          </p>
        </div>

        {formData.objectives.length > 0 && (
          <div>
            <p className="text-xs text-zinc-500 dark:!text-zinc-400">Objectives</p>
            <ul className="list-disc list-inside text-xs text-zinc-700 dark:!text-zinc-300">
              {formData.objectives.map((obj, i) => (
                <li key={i}>{obj}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Deliverables */}
        <div>
          <p className="text-xs text-zinc-500 dark:!text-zinc-400 mb-2">Deliverables</p>
          {formData.deliverables.map((d, i) => (
            <div key={i} className={`mb-2 p-2 rounded-lg border ${
              isDark 
                ? '!bg-zinc-900 !border-zinc-700' 
                : 'bg-white border-zinc-200'
            }`}>
              <p className="text-xs font-medium dark:!text-white">
                {d.quantity}x {d.type} on {d.platform}
              </p>
              {d.description && (
                <p className="text-[10px] text-zinc-500 dark:!text-zinc-400 mt-1">
                  {d.description}
                </p>
              )}
              <p className={`text-[10px] font-medium mt-1 ${
                isDark ? '!text-zinc-300' : 'text-zinc-700'
              }`}>
                ${d.budget || 0} each
              </p>
            </div>
          ))}
        </div>

        {/* Timeline */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-zinc-500 dark:!text-zinc-400">Start Date</p>
            <p className="text-sm font-medium text-zinc-900 dark:!text-white">
              {formData.startDate ? new Date(formData.startDate).toLocaleDateString() : 'Not set'}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 dark:!text-zinc-400">End Date</p>
            <p className="text-sm font-medium text-zinc-900 dark:!text-white">
              {formData.endDate ? new Date(formData.endDate).toLocaleDateString() : 'Not set'}
            </p>
          </div>
        </div>

        {/* Budget */}
        <div>
          <p className="text-xs text-zinc-500 dark:!text-zinc-400">Total Budget</p>
          <p className={`text-lg font-bold ${isDark ? '!text-white' : 'text-zinc-700'}`}>
            ${formData.budget.toLocaleString()}
          </p>
        </div>

        {/* Target Audience - Using Slate/Gray for Tags in Dark Mode */}
        <div>
          <p className="text-xs text-zinc-500 dark:!text-zinc-400 mb-2">Target Niches</p>
          <div className="flex flex-wrap gap-1">
            {formData.targetAudience.niches.map(niche => (
              <span key={niche} className={`px-2 py-1 rounded-full text-[10px] ${
                isDark 
                  ? '!bg-zinc-800 !text-zinc-200 !border !border-zinc-700' 
                  : 'bg-indigo-100 text-indigo-800'
              }`}>
                {niche}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Warnings & Fees Section */}
      <div className={`p-3 rounded-xl border ${
        isDark ? '!bg-zinc-900 !border-amber-900/50' : 'bg-amber-50 border-amber-200'
      }`}>
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
          <div>
            <p className={`text-xs ${isDark ? '!text-amber-200' : 'text-amber-800'}`}>
              <strong>Note:</strong> You'll need to fund the escrow account before launching.
            </p>
          </div>
        </div>
      </div>

      <div className={`p-3 rounded-xl border ${
        isDark ? '!bg-zinc-900 !border-zinc-700' : 'bg-blue-50 border-blue-200'
      }`}>
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-500 mt-0.5" />
          <div className="text-xs">
            <p className={isDark ? '!text-zinc-300' : 'text-blue-800'}>
              <strong className="dark:!text-white">Platform Fee:</strong> ${(formData.budget * 0.1).toFixed(2)} (10%)
            </p>
            <p className={`mt-1 font-bold ${isDark ? '!text-white' : 'text-blue-700'}`}>
              Total to Fund: ${formData.budget.toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

      default:
        return null;
    }
  };

  return (
    <div className={`min-h-screen`}>
      <div className="max-w-7xl mx-auto px-4 pt-6 pb-8">
         <div>
            <h1 className="text-3xl font-light tracking-tight font-semibold">Brand <span className="font-bold">Campaign Builder</span></h1>
            <p className={`text-sm mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Create a new marketing campaign step by step.</p>
          </div>

      <div className="max-w-4xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-6 mt-3">
        {/* Mobile Grid Layout */}
<div className="grid grid-cols-2 gap-2 md:hidden">
  {steps.map((step) => (
    <div key={step.number} className="flex flex-col items-center">
      <div
        className={`flex items-center justify-center w-full h-8 rounded-lg border-2 transition-colors text-xs font-medium px-2
        ${
          currentStep === step.number
            ? `${isDark ? 'border-zinc-300 bg-white text-zinc-300' : 'border-zinc-700 text-zinc-700'}`
            : 'border-zinc-300 text-zinc-400'
        }`}
      >
        <span className="text-xs font-bold truncate">{step.name}</span>
      </div>
    </div>
  ))}
</div>
        
       {/* Desktop Layout */}
{/* Desktop Layout */}
<div className="hidden md:flex justify-between gap-0">
  {steps.map((step) => (
    <div key={step.number} className="flex flex-col items-center">
      <div
        className={`flex items-center justify-center w-28 h-6 rounded-lg border-2 transition-colors text-xs font-medium px-2
        ${
          currentStep === step.number
            ? `${isDark ? 'border-zinc-300 bg-white text-zinc-300' : 'border-zinc-700 bg-black text-white'}`
            : 'border-zinc-300 text-zinc-400'
        }`}
      >
        <span className="text-xs font-bold truncate">{step.name}</span>
      </div>
    </div>
  ))}
</div>
      </div>

      {/* Step Content */}
      <div className={`p-6 rounded-xl shadow-sm mb-5 ${isDark ? 'bg-zinc-900/50 border border-zinc-800' : 'bg-white border border-zinc-300'}`}>{renderStepContent()}</div>

      {/* Navigation Buttons */}
     <div className="flex justify-between items-center mt-6">
  {/* PREVIOUS BUTTON */}
  <button
    onClick={handlePrev}
    disabled={currentStep === 1}
    className={`
      px-4 py-2 rounded-xl flex items-center text-xs font-medium
      transition-all duration-200 ease-in-out
      active:scale-[0.98]
      ${
        currentStep === 1
          ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed opacity-50'
          : isDark
            ? 'bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white hover:scale-[1.02] hover:shadow-lg hover:shadow-black/20'
            : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:scale-[1.02] hover:shadow-md'
      }
    `}
  >
    <ChevronLeft className="w-4 h-4 mr-2" />
    Previous
  </button>

  {/* NEXT / SUBMIT BUTTON */}
  <button
    onClick={currentStep === steps.length ? handleSubmit : handleNext}
    disabled={submitting || loading}
    className={`
      px-6 py-2 rounded-xl text-xs font-medium flex items-center 
      transition-all duration-200 ease-in-out
      active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed
      ${
        isDark 
          ? 'bg-zinc-100 text-zinc-900 hover:bg-zinc-900/50 hover:text-white hover:scale-[1.02] hover:shadow-lg hover:shadow-white/10' 
          : 'bg-zinc-900 text-white hover:bg-zinc-800  hover:scale-[1.02] hover:shadow-lg'
      }
    `}
  >
    {currentStep === steps.length ? (
      submitting || loading ? (
        <>
          <Loader className="w-4 h-4 animate-spin mr-2" />
          Creating...
        </>
      ) : (
        <>
          Launch Campaign
          <ChevronRight className="w-4 h-4 ml-2" />
        </>
      )
    ) : (
      <>
        Next
        <ChevronRight className="w-4 h-4 ml-2" />
      </>
    )}
  </button>
</div>

      {/* Help Text */}
      <div className="mt-4 text-center text-[10px] text-zinc-500">
        <p>All fields marked with <span className="text-red-500">*</span> are required</p>
        <p className="mt-1">You can save as draft and complete later</p>
      </div>
      </div>
      </div>
    </div>
  );
};

export default CampaignBuilder; 