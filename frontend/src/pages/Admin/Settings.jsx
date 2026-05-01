import React, { useState, useEffect, useRef } from 'react';
import {
  Globe,
  Shield,
  Mail,
  DollarSign,
  Bell,
  Lock,
  Users,
  Settings as SettingsIcon,
  Save,
  CreditCard,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Moon,
  Sun,
  Camera,
  Loader,
  Smartphone,
  Monitor,
  HelpCircle,
  Zap,
  Database,
  Key,
  Clock,
  FileText,
  ShieldCheck,
  UserCheck,
  Ban,
  AlertCircle,
  Settings2,
  MessageSquare
} from 'lucide-react';
import { useAdminData } from '../../hooks/useAdminData';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useGlobalSettings } from '../../context/GlobalSettingsContext';
import { useFees } from '../../context/FeeContext';
import adminService from '../../services/adminService';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import Modal from '../../components/Common/Modal';
import toast from 'react-hot-toast';

const ProfilePictureUpload = ({ currentImage, onUpload, fullName, isDark }) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentImage || '');
  const fileInputRef = useRef(null);

  useEffect(() => {
    setPreview(currentImage || '');
  }, [currentImage]);

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Enhanced file validation
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload JPG, PNG, or WEBP images only.');
      event.target.value = '';
      return;
    }

    if (file.size > maxSize) {
      toast.error('File too large. Please upload an image smaller than 5MB.');
      event.target.value = '';
      return;
    }

    // Validate image dimensions
    const img = new Image();
    const validateImage = new Promise((resolve, reject) => {
      img.onload = () => {
        if (img.width < 100 || img.height < 100) {
          reject(new Error('Image too small. Minimum size is 100x100 pixels.'));
        } else if (img.width > 4000 || img.height > 4000) {
          reject(new Error('Image too large. Maximum size is 4000x4000 pixels.'));
        } else {
          resolve();
        }
      };
      img.onerror = () => reject(new Error('Invalid image file.'));
      img.src = URL.createObjectURL(file);
    });

    try {
      await validateImage;
      URL.revokeObjectURL(img.src); // Clean up object URL
    } catch (validationError) {
      toast.error(validationError.message);
      event.target.value = '';
      return;
    }

    // Show preview
    const previewReader = new FileReader();
    previewReader.onloadend = () => setPreview(previewReader.result);
    previewReader.readAsDataURL(file);

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('profilePicture', file);

      const response = await adminService.uploadProfilePicture(formData);

      if (!response?.success) {
        throw new Error(response?.error || 'Upload failed');
      }

      const uploadedUrl = response?.profilePicture || response?.profileImage || response?.file?.url;
      
      // Enhanced URL validation
      console.log('🔍 Frontend upload debug:', {
        response: response,
        profilePicture: response?.profilePicture,
        profileImage: response?.profileImage,
        fileUrl: response?.file?.url,
        finalUrl: uploadedUrl,
        debug: response?.debug
      });
      
      if (!uploadedUrl) {
        console.error('❌ No URL found in response:', response);
        throw new Error('Upload succeeded but no image URL was returned. Check server logs for details.');
      }
      
      // Validate URL format
      if (typeof uploadedUrl !== 'string' || uploadedUrl.trim() === '') {
        console.error('❌ Invalid URL format:', uploadedUrl);
        throw new Error('Invalid image URL format received from server');
      }

      onUpload(uploadedUrl);
      toast.success('Profile picture updated successfully!');
    } catch (error) {
      console.error('Profile picture upload error:', error);
      setPreview(currentImage || '');
      const errorMessage = error.response?.data?.error || error.message || 'Failed to upload profile picture';
      toast.error(errorMessage);
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  return (
    <div className={`p-4 ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-100'} rounded-2xl border`}>
      <div className="flex items-center gap-4">
        <div className="relative">
          <img
            src={preview || 'https://via.placeholder.com/96?text=Admin'}
            alt={fullName || 'Admin'}
            className="w-24 h-24 rounded-full object-cover border-2 border-white shadow"
          />
          {uploading && (
            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
              <Loader className="w-5 h-5 text-white animate-spin" />
            </div>
          )}
        </div>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            type="button"
            variant="secondary"
            icon={Camera}
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className={`border-zinc-600 !bg-black text-white ${isDark ? '!bg-zinc-800' : ''}`}
          >
            {uploading ? 'Uploading...' : 'Change Photo'}
          </Button>
          <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'} mt-2`}>JPG, PNG, WEBP up to 5MB.</p>
        </div>
      </div>
    </div>
  );
};

const AdminSettings = () => {
  const { user, refreshUser, updateUser } = useAuth();
  const { theme } = useTheme();
  const { refreshSecuritySettings, refreshSettings } = useGlobalSettings();
  const { refreshFees } = useFees();
  const isDark = theme === 'dark';
  const {
    settings,
    updateSettings,
  } = useAdminData();

  const [activeTab, setActiveTab] = useState('general');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [validationErrors, setValidationErrors] = useState({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  // 2FA State
  const [twoFactorStatus, setTwoFactorStatus] = useState(null);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFactorStep, setTwoFactorStep] = useState('initial'); // initial, setup, verify, success
  const [qrCodeData, setQrCodeData] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [disabling2FA, setDisabling2FA] = useState(false);
  const [profileImage, setProfileImage] = useState('');
  const [formData, setFormData] = useState({
    // General
    platformName: 'InfluenceX',
    platformDescription: 'Influencer Deal Marketplace',
    supportEmail: 'snimramukhtar321@gmail.com',
    supportHours: 'Mon-Fri, 9am-5pm EST',
    timezone: 'America/New_York',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    currency: 'USD',
    language: 'en',

    // Profile Picture
    profilePicture: '',
    profileImage: '',

    // Platform Fees
    commissionRate: null,
    creatorPayoutMin: 50,
    brandEscrowMin: 100,
    escrowFee: 0,
    featuredListingFee: 50,
    taxRate: 0,
    taxInclusive: false,
    withdrawalFeeType: 'fixed',
    withdrawalFee: 0,

    // Security - Email verification toggle removed from admin settings
    twoFactorRequired: false,
    // emailVerification removed - now optional in signup flow
    // phoneVerification removed - now optional in signup flow
    maxLoginAttempts: 5,
        lockoutDuration: 30,
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireLowercase: true,
    passwordRequireNumbers: true,
    passwordRequireSymbols: false,
    passwordExpiryDays: 90,
    passwordHistoryCount: 5,
    jwtExpiry: '7d',
    refreshTokenExpiry: '30d',

    // OTP and verification expiry times
    otpExpiryMinutes: 10,
    emailVerificationExpiryHours: 24,
    passwordResetExpiryHours: 1,
    twoFactorCodeExpiryMinutes: 5,

    // Email Settings
    senderEmail: 'noreply@influencex.com',
    senderName: 'InfluenceX',
    emailFooter: ' 2024 InfluenceX. All rights reserved.',

    // Message templates
    messageTemplates: {
      otpSms: 'Your {platformName} verification code: {otp}. Valid for {expiryMinutes} minutes. Do not share this code.',
      otpEmail: 'Your verification code is: {otp}. This code will expire in {expiryMinutes} minutes.',
      passwordResetSms: '{platformName}: Use this link to reset your password: {resetLink}. Valid for {expiryHours} hour.',
      twoFactorSms: '{platformName}: Your 2FA code is {code}. Valid for {expiryMinutes} minutes. Do not share.',
      dealOfferSms: '{platformName}: New deal offer from {brandName} for ${budget}. View: {dealUrl}',
      paymentReceivedSms: '{platformName}: Payment of ${amount} received. View details in your dashboard.',
      deadlineReminderSms: '{platformName}: Deal deadline in {days} days. Submit deliverables in your dashboard.',
      accountLockedSms: '{platformName}: Account locked due to failed attempts. Reset your password to continue.'
    },

    // Notification Settings
    emailNotifications: {
      newUser: true,
      newCampaign: true,
      paymentReceived: true,
      disputeRaised: true,
      reportGenerated: true
    },
    smsNotifications: {
      enabled: false,
      provider: 'twilio',
      accountSid: '',
      authToken: '',
      phoneNumber: ''
    },
    pushNotifications: {
      enabled: true,
      vapidPublicKey: '',
      vapidPrivateKey: '',
      vapidEmail: ''
    },
    inAppNotifications: {
      enabled: true,
      types: {
        newMessage: true,
        dealUpdate: true,
        paymentReceived: true,
        deadlineReminder: true
      }
    },

    // Content Moderation
    autoModeration: {
      enabled: true,
      profanityFilter: true,
      spamFilter: true,
      duplicateContentFilter: true
    },

    // User Approval
    autoApproveBrands: true,
    autoApproveCreators: true,
    requireVerification: false,

    // Usage Limits
    maxCampaignsPerBrand: 50,
    maxActiveDealsPerCreator: 20,
    maxFileSize: 100,
    maxFilesPerUpload: 10,
    dailyUploadLimit: 100,
    storageQuotaPerUser: 1000,

    // File Upload Settings
    allowedFileTypes: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'mp4', 'mov', 'avi', 'pdf', 'doc', 'docx', 'txt', 'csv', 'xlsx', 'xls', 'zip'],
    imageOptimization: {
      enabled: true,
      maxWidth: 1920,
      maxHeight: 1080,
      quality: 80
    },
    videoOptimization: {
      enabled: true,
      maxDuration: 300,
      maxBitrate: 5000
    },
    storage: {
      provider: 'local'
    },
    apiRateLimit: 100,
    apiRateWindow: 15,
    authRateLimit: 10,
    authRateWindow: 60,
    maxImageWidth: 1920,
    maxImageHeight: 1080,
    imageQuality: 80,
    maxVideoDuration: 300,
    maxVideoBitrate: 5000,
    storageProvider: 'local',
    s3Bucket: '',
    s3Region: '',
    s3AccessKey: '',
    s3SecretKey: '',


    // Advanced
    maintenanceMode: false,
    maintenanceMessage: 'We are currently undergoing maintenance. Please check back soon.',
    maintenanceAllowedIPs: '',
    maintenanceAllowedPaths: '',
    dataRetentionNotifications: 90,
    dataRetentionAuditLogs: 90,
    dataRetentionTempData: 24,
    dataRetentionCache: 1,
    gdprCookieConsent: true,
    gdprCookieLifetime: 365,
    gdprDataRetentionDays: 2555,
    gdprAnonymizeData: true,
    gdprExportFormat: 'zip',
    apiRateLimitEnabled: true,
    apiRateLimitMaxRequests: 100,
    apiRateLimitWindowMs: 900000,
    corsEnabled: true,
    corsAllowedOrigins: ['*'],
    corsAllowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
    corsAllowedHeaders: ['Content-Type', 'Authorization'],
    corsExposedHeaders: ['X-Total-Count'],
    corsMaxAge: 86400,
    cacheEnabled: true,
    cacheTtl: 3600,
    redisHost: '',
    redisPort: 6379,
    redisPassword: '',

    // Admin Account Settings
    newEmail: '',
    confirmNewEmail: '',
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });

  // Use settings from useAdminData hook as single source of truth
  useEffect(() => {
    if (settings) {
      console.log('=== FRONTEND SETTINGS DEBUG ===');
      console.log('Settings from useAdminData:', settings);

      // Update formData with settings from useAdminData hook
      setFormData(prev => {
        const merged = { ...prev, ...settings };

        // Ensure nested objects are properly merged
        if (settings.messageTemplates) {
          merged.messageTemplates = { ...prev.messageTemplates, ...settings.messageTemplates };
        }

        console.log('FormData updated with useAdminData settings:', merged);
        return merged;
      });

      setLoading(false);
    }
  }, [settings]);

  // Load usage limits and file upload settings separately
  useEffect(() => {
    const loadUsageAndFileSettings = async () => {
      try {
        // Load usage limits
        const usageLimitsResponse = await adminService.getUsageLimits();
        if (usageLimitsResponse.success) {
          const usageLimits = usageLimitsResponse.data;
          setFormData(prev => ({
            ...prev,
            ...usageLimits
          }));
        }

        // Load file upload settings
        const fileUploadResponse = await adminService.getFileUploadSettings();
        if (fileUploadResponse.success) {
          const fileSettings = fileUploadResponse.data;
          setFormData(prev => ({
            ...prev,
            allowedFileTypes: fileSettings.allowedFileTypes,
            imageOptimization: fileSettings.imageOptimization,
            videoOptimization: fileSettings.videoOptimization,
            storage: fileSettings.storage
          }));
        }
      } catch (error) {
        console.error('Failed to load usage/file settings:', error);
      }
    };

    // Add delay to ensure main settings are loaded first
    setTimeout(loadUsageAndFileSettings, 1000);
  }, []);

  // Real-time settings update listener
  useEffect(() => {
    // Listen for real-time settings updates via WebSocket if available
    const socket = window.socket; // Assuming socket is available globally

    if (socket) {
      const handleSettingsUpdate = (data) => {
        console.log('Real-time settings update received:', data);

        if (data.type === 'SETTINGS_UPDATED' && data.settings) {
          setFormData(prev => ({
            ...prev,
            ...data.settings
          }));

          toast.success('Settings updated in real-time!');
        }
      };

      socket.on('settings_updated', handleSettingsUpdate);
      socket.on('current_settings', (data) => {
        if (data.settings) {
          setFormData(prev => ({
            ...prev,
            ...data.settings
          }));
        }
      });

      return () => {
        socket.off('settings_updated', handleSettingsUpdate);
      };
    }
  }, []);

  useEffect(() => {
    // First try to get from current user context
    if (user?.profilePicture || user?.profileImage) {
      const imageUrl = user?.profilePicture || user?.profileImage;
      console.log('🔍 Setting profile image from user context:', imageUrl);
      setProfileImage(imageUrl);
      return;
    }

    // Fallback to localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        const imageUrl = parsedUser?.profilePicture || parsedUser?.profileImage;
        console.log('🔍 Setting profile image from localStorage:', imageUrl);
        setProfileImage(imageUrl || '');
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        setProfileImage('');
      }
    } else {
      console.log('🔍 No user data found, setting empty profile image');
      setProfileImage('');
    }
  }, [user]); // Depend on entire user object, not just profilePicture

  // Add separate useEffect to handle profile image updates from localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          const imageUrl = parsedUser?.profilePicture || parsedUser?.profileImage;
          if (imageUrl && imageUrl !== profileImage) {
            console.log('🔍 Profile image updated in localStorage, refreshing UI:', imageUrl);
            setProfileImage(imageUrl);
          }
        } catch (error) {
          console.error('Error parsing stored user data in storage change:', error);
        }
      }
    };

    // Check localStorage immediately
    handleStorageChange();

    // Set up interval to check for localStorage changes (fallback)
    const interval = setInterval(handleStorageChange, 1000);
    
    return () => clearInterval(interval);
  }, [profileImage]); // Include profileImage to prevent infinite loops

  useEffect(() => {
    if (activeTab === 'security') {
      fetch2FAStatus();
    }
  }, [activeTab]);

  const fetch2FAStatus = async () => {
    try {
      const status = await adminService.get2FAStatus();
      if (status?.success) {
        setTwoFactorStatus(status.data);
      }
    } catch (error) {
      console.error('Failed to fetch 2FA status:', error);
    }
  };

  const handleStart2FASetup = async () => {
    setLoading(true);
    try {
      const result = await adminService.generate2FA();
      if (result?.success) {
        setQrCodeData(result.data);
        setTwoFactorStep('setup');
      }
    } catch (error) {
      console.error('Failed to generate 2FA:', error);
    }
    setLoading(false);
  };

  const handleVerify2FA = async () => {
    if (verificationCode.length !== 6) return;
    setSaving(true);
    try {
      const result = await adminService.verify2FA(verificationCode);
      if (result?.success) {
        setBackupCodes(result.data.backupCodes || []);
        setTwoFactorStep('success');
        fetch2FAStatus();
      }
    } catch (error) {
      console.error('Failed to verify 2FA:', error);
    }
    setSaving(false);
  };

  const handleDisable2FA = async () => {
    const code = prompt('Enter 2FA code to disable:');
    if (!code) return;

    setDisabling2FA(true);
    try {
      const success = await adminService.disable2FA(code);
      if (success) {
        fetch2FAStatus();
      }
    } catch (error) {
      console.error('Failed to disable 2FA:', error);
    }
    setDisabling2FA(false);
  };

  const handleEmailChange = async () => {
    if (!formData.newEmail || formData.newEmail !== formData.confirmNewEmail) {
      toast.error('Email addresses do not match');
      return;
    }

    if (!validateEmail(formData.newEmail)) {
      toast.error('Invalid email format');
      return;
    }

    setSaving(true);
    try {
      const response = await adminService.updateAdminEmail({
        newEmail: formData.newEmail,
        confirmNewEmail: formData.confirmNewEmail
      });

      if (response?.success) {
        toast.success('Email updated successfully! Please check your new email for verification.');
        setFormData(prev => ({
          ...prev,
          newEmail: '',
          confirmNewEmail: ''
        }));
        
        // Refresh user data to get updated email
        if (refreshUser) {
          await refreshUser();
        }
      } else {
        toast.error(response?.error || 'Failed to update email');
      }
    } catch (error) {
      console.error('Email change error:', error);
      toast.error(error.response?.data?.error || error.message || 'Failed to update email');
    }
    setSaving(false);
  };

  const handlePasswordChange = async () => {
    if (!formData.currentPassword || !formData.newPassword || formData.newPassword !== formData.confirmNewPassword) {
      toast.error('Passwords do not match or missing required fields');
      return;
    }

    if (formData.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long');
      return;
    }

    setSaving(true);
    try {
      const response = await adminService.updateAdminPassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
        confirmNewPassword: formData.confirmNewPassword
      });

      if (response?.success) {
        toast.success('Password updated successfully!');
        setFormData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmNewPassword: ''
        }));
      } else {
        toast.error(response?.error || 'Failed to update password');
      }
    } catch (error) {
      console.error('Password change error:', error);
      toast.error(error.response?.data?.error || error.message || 'Failed to update password');
    }
    setSaving(false);
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Globe },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell }
  ];

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateField = (name, value) => {
    const errors = { ...validationErrors };

    switch (name) {
      case 'platformName':
        if (!value || value.trim().length === 0) {
          errors.platformName = 'Platform Name is required';
        } else if (value.length > 100) {
          errors.platformName = 'Platform Name must be less than 100 characters';
        } else {
          delete errors.platformName;
        }
        break;
      
      case 'supportEmail':
        if (value && !validateEmail(value)) {
          errors.supportEmail = 'Invalid email format';
        } else {
          delete errors.supportEmail;
        }
        break;
      
      // Fee validation - more permissive ranges
      case 'commissionRate': {
        const commissionRate = parseFloat(value);
        if (isNaN(commissionRate) || commissionRate < 0 || commissionRate > 100) {
          errors.commissionRate = 'Commission Rate must be between 0 and 100%';
        } else {
          delete errors.commissionRate;
        }
        break;
      }
      
      case 'withdrawalFee': {
        const withdrawalFee = parseFloat(value);
        if (isNaN(withdrawalFee) || withdrawalFee < 0 || withdrawalFee > 1000) {
          errors.withdrawalFee = 'Withdrawal Fee must be between $0 and $1000';
        } else {
          delete errors.withdrawalFee;
        }
        break;
      }
      
      case 'escrowFee': {
        const escrowFee = parseFloat(value);
        if (isNaN(escrowFee) || escrowFee < 0 || escrowFee > 100) {
          errors.escrowFee = 'Escrow Fee must be between 0 and 100%';
        } else {
          delete errors.escrowFee;
        }
        break;
      }
      
      case 'featuredListingFee': {
        const featuredListingFee = parseFloat(value);
        if (isNaN(featuredListingFee) || featuredListingFee < 0 || featuredListingFee > 10000) {
          errors.featuredListingFee = 'Featured Listing Fee must be between $0 and $10,000';
        } else {
          delete errors.featuredListingFee;
        }
        break;
      }
      
      case 'taxRate': {
        const taxRate = parseFloat(value);
        if (isNaN(taxRate) || taxRate < 0 || taxRate > 100) {
          errors.taxRate = 'Tax Rate must be between 0 and 100%';
        } else {
          delete errors.taxRate;
        }
        break;
      }
      
      case 'creatorPayoutMin': {
        const creatorPayoutMin = parseFloat(value);
        if (isNaN(creatorPayoutMin) || creatorPayoutMin < 0.01) {
          errors.creatorPayoutMin = 'Minimum Creator Payout must be at least $0.01';
        } else {
          delete errors.creatorPayoutMin;
        }
        break;
      }
      
      case 'brandEscrowMin': {
        const brandEscrowMin = parseFloat(value);
        if (isNaN(brandEscrowMin) || brandEscrowMin < 0.01) {
          errors.brandEscrowMin = 'Minimum Brand Escrow must be at least $0.01';
        } else {
          delete errors.brandEscrowMin;
        }
        break;
      }
      
      // Security settings validation
      case 'maxLoginAttempts': {
        const maxAttempts = parseInt(value);
        if (isNaN(maxAttempts) || maxAttempts < 1 || maxAttempts > 20) {
          errors.maxLoginAttempts = 'Max login attempts must be between 1 and 20';
        } else {
          delete errors.maxLoginAttempts;
        }
        break;
      }
      
            
      case 'passwordMinLength': {
        const passwordMinLength = parseInt(value);
        if (isNaN(passwordMinLength) || passwordMinLength < 4 || passwordMinLength > 128) {
          errors.passwordMinLength = 'Password length must be between 4 and 128 characters';
        } else {
          delete errors.passwordMinLength;
        }
        break;
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    // Clear any existing validation errors first
    setValidationErrors({});
    
    // Only validate critical required fields
    let isValid = true;
    
    // Only validate platform name as it's truly required
    if (!formData.platformName || formData.platformName.trim().length === 0) {
      setValidationErrors(prev => ({ ...prev, platformName: 'Platform Name is required' }));
      isValid = false;
    }
    
    // Validate email format if provided
    if (formData.supportEmail && !validateEmail(formData.supportEmail)) {
      setValidationErrors(prev => ({ ...prev, supportEmail: 'Invalid email format' }));
      isValid = false;
    }
    
    // Only validate numeric fields if they have values and are clearly invalid
    const numericFields = ['commissionRate', 'withdrawalFee', 'escrowFee', 'featuredListingFee', 'taxRate', 'creatorPayoutMin', 'brandEscrowMin'];
    for (const field of numericFields) {
      const value = formData[field];
      if (value !== undefined && value !== '' && value !== null) {
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue < 0) {
          setValidationErrors(prev => ({ ...prev, [field]: 'Must be a valid positive number' }));
          isValid = false;
        }
      }
    }
    
    if (!isValid) {
      toast.error('Please fix validation errors before saving');
      return;
    }
    
    setSaving(true);
    try {
      // DEBUG: Log what's being sent
      console.log('=== FRONTEND SAVE DEBUG ===');
      console.log('Form data being sent:', formData);
      console.log('Profile picture in form data:', formData.profilePicture || formData.profileImage);
      
      // Handle usage limits and file upload settings separately
      if (activeTab === 'limits') {
        // Save usage limits
        const usageLimitsData = {
          maxCampaignsPerBrand: parseInt(formData.maxCampaignsPerBrand) || 50,
          maxActiveDealsPerCreator: parseInt(formData.maxActiveDealsPerCreator) || 20,
          maxFileSize: parseInt(formData.maxFileSize) || 100,
          maxFilesPerUpload: parseInt(formData.maxFilesPerUpload) || 10,
          dailyUploadLimit: parseInt(formData.dailyUploadLimit) || 100,
          storageQuotaPerUser: parseInt(formData.storageQuotaPerUser) || 1000
        };
        
        console.log('Saving usage limits:', usageLimitsData);
        await adminService.updateUsageLimits(usageLimitsData);
        
        // Save file upload settings
        const fileUploadData = {
          allowedFileTypes: formData.allowedFileTypes || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
          imageOptimization: {
            enabled: formData.imageOptimization?.enabled ?? true,
            maxWidth: parseInt(formData.imageOptimization?.maxWidth) || 1920,
            maxHeight: parseInt(formData.imageOptimization?.maxHeight) || 1080,
            quality: parseInt(formData.imageOptimization?.quality) || 80
          },
          videoOptimization: {
            enabled: formData.videoOptimization?.enabled ?? true,
            maxDuration: parseInt(formData.videoOptimization?.maxDuration) || 300,
            maxBitrate: parseInt(formData.videoOptimization?.maxBitrate) || 5000
          },
          storage: {
            provider: formData.storage?.provider || 'local'
          }
        };
        
                await adminService.updateFileUploadSettings(fileUploadData);
        
        // Refresh both usage limits and file upload settings after successful update
        setTimeout(async () => {
          try {
            // Refresh usage limits
            const usageLimitsResponse = await adminService.getUsageLimits();
            if (usageLimitsResponse.success) {
              setFormData(prev => ({
                ...prev,
                ...usageLimitsResponse.data
              }));
            }

            // Refresh file upload settings
            const fileUploadResponse = await adminService.getFileUploadSettings();
            if (fileUploadResponse.success) {
              const fileSettings = fileUploadResponse.data;
              setFormData(prev => ({
                ...prev,
                allowedFileTypes: fileSettings.allowedFileTypes,
                imageOptimization: fileSettings.imageOptimization,
                videoOptimization: fileSettings.videoOptimization,
                storage: fileSettings.storage
              }));
            }
            
            toast.success('Settings updated successfully!');
          } catch (error) {
            console.error('Failed to refresh settings:', error);
            toast.error('Settings saved but failed to refresh. Please refresh the page.');
          }
        }, 500);
      } else {
        // Create clean payload for other settings - only send fields that have values
        const cleanFormData = {
          ...formData,
          // Only include notification credentials if they have values
          notifications: {
            ...(formData.notifications?.email?.smtp?.host || formData.notifications?.email?.smtp?.auth?.user || formData.notifications?.email?.smtp?.auth?.pass ? {
              email: {
                smtp: {
                  host: formData.notifications?.email?.smtp?.host || '',
                  port: formData.notifications?.email?.smtp?.port || 587,
                  secure: formData.notifications?.email?.smtp?.secure || false,
                  auth: {
                    user: formData.notifications?.email?.smtp?.auth?.user || '',
                    pass: formData.notifications?.email?.smtp?.auth?.pass || ''
                  }
                }
              }
            } : {}),
            ...(formData.notifications?.sms?.twilio?.accountSid || formData.notifications?.sms?.twilio?.authToken || formData.notifications?.sms?.twilio?.phoneNumber ? {
              sms: {
                twilio: {
                  accountSid: formData.notifications?.sms?.twilio?.accountSid || '',
                  authToken: formData.notifications?.sms?.twilio?.authToken || '',
                  phoneNumber: formData.notifications?.sms?.twilio?.phoneNumber || ''
                }
              }
            } : {})
          }
        };
        
        // Remove empty notification objects if no credentials provided
        if (!cleanFormData.notifications.email || !cleanFormData.notifications.email.smtp.host) {
          delete cleanFormData.notifications.email;
        }
        if (!cleanFormData.notifications.sms || !cleanFormData.notifications.sms.twilio.accountSid) {
          delete cleanFormData.notifications.sms;
        }
        if (Object.keys(cleanFormData.notifications).length === 0) {
          delete cleanFormData.notifications;
        }
        
        console.log('Clean form data being sent:', cleanFormData);
        const response = await updateSettings(cleanFormData);
      
        // DEBUG: Log response
        console.log('=== FRONTEND RESPONSE DEBUG ===');
        console.log('Response from server:', response);
        console.log('Response withdrawalFee:', response.settings?.withdrawalFee);
        console.log('Current formData withdrawalFee before update:', formData.withdrawalFee);
        console.log('=== END FRONTEND RESPONSE DEBUG ===');
        
        // Enhanced response validation with comprehensive checking
        if (response && response.success === true && response.settings) {
          // Success case - all required fields present
          toast.success('Settings saved successfully!');
          setShowConfirmModal(false);
          
          // Update local form data with server response to ensure sync
          // Update all fee-related, security-related, notification-related, moderation, and payment fields to ensure they're in sync
          const updatedFormData = { ...formData };
          Object.keys(response.settings).forEach(key => {
            // Always update fee-related fields to ensure they're in sync
            const feeFields = ['commissionRate', 'creatorPayoutMin', 'brandEscrowMin', 'withdrawalFee', 'withdrawalFeeType', 'escrowFee', 'featuredListingFee', 'taxRate', 'taxInclusive'];
            // Always update security-related fields to ensure they're in sync
            const securityFields = ['maxLoginAttempts', 'lockoutDuration', 'passwordMinLength', 'passwordRequireUppercase', 'passwordRequireLowercase', 'passwordRequireNumbers', 'passwordRequireSymbols', 'twoFactorRequired', 'emailVerification'];
            // Always update notification-related fields to ensure they're in sync
            const notificationFields = ['emailNotifications', 'smsNotifications', 'pushNotifications', 'inAppNotifications'];
            // Always update moderation-related fields to ensure they're in sync
            const moderationFields = ['contentModeration', 'autoApproveContent', 'autoFlagContent', 'flagThreshold', 'manualReviewRequired', 'profanityFilter', 'spamFilter', 'duplicateContentFilter', 'bannedWords', 'bannedPhrases', 'allowedDomains', 'blockedDomains'];
            // Always update usage limits fields to ensure they're in sync
            const limitsFields = ['maxCampaignsPerBrand', 'maxActiveDealsPerCreator', 'maxFileSize', 'allowedFileTypes'];
            if (feeFields.includes(key) || securityFields.includes(key) || notificationFields.includes(key) || moderationFields.includes(key) || limitsFields.includes(key) || key === 'platformName' || key === 'supportEmail') {
              updatedFormData[key] = response.settings[key];
            }
          });
          setFormData(updatedFormData);
          
          // Force refresh admin data to get updated profile picture
          if (refreshUser) {
            try {
              await refreshUser();
              console.log('Admin data refreshed after settings save');
            } catch (refreshError) {
              console.error('Failed to refresh admin data:', refreshError);
            }
          }
          
          // Refresh global fee context to update all components
          try {
            await refreshFees();
            console.log('Global fees refreshed after settings save');
          } catch (feeRefreshError) {
            console.error('Failed to refresh global fees:', feeRefreshError);
          }
          
          // Refresh security settings to update signup flow
          try {
            await refreshSecuritySettings();
            console.log('Security settings refreshed after settings save');
          } catch (securityRefreshError) {
            console.error('Failed to refresh security settings:', securityRefreshError);
          }

          // Refresh global settings context to ensure real-time reflection
          try {
            await refreshSettings();
            console.log('Global settings refreshed after settings save');
          } catch (settingsRefreshError) {
            console.error('Failed to refresh global settings:', settingsRefreshError);
          }
          
          // Verify settings were actually saved by re-fetching after a short delay
          setTimeout(async () => {
            try {
              // Force refresh settings from server
              await settings;
              console.log('Settings verification: Save confirmed and synced');
            } catch (verifyError) {
              console.error('Settings verification failed:', verifyError);
              toast.warning('Settings saved but verification failed. Please refresh to confirm.');
            }
          }, 1500);
        } else if (response && response.success === false) {
          // API explicitly returned failure with proper error message
          const errorMessage = response.error || 'Failed to save settings';
          toast.error(errorMessage);
          console.error('API returned failure:', response);
        } else if (response && typeof response === 'object' && Object.keys(response).length === 1 && response.success === true) {
          // Handle case where only { success: true } is returned
          toast.success('Settings saved successfully!');
          setShowConfirmModal(false);
          
          // Re-fetch settings to get updated values
          setTimeout(async () => {
            try {
              await settings;
              console.log('Settings verification: Save confirmed');
            } catch (verifyError) {
              console.error('Settings verification failed:', verifyError);
            }
          }, 1500);
        } else if (response === true || response === 'true') {
          // Handle case where response is literally true (string or boolean)
          toast.success('Settings saved successfully!');
          setShowConfirmModal(false);
          
          // Re-fetch settings to get updated values
          setTimeout(async () => {
            try {
              await settings;
              console.log('Settings verification: Save confirmed');
            } catch (verifyError) {
              console.error('Settings verification failed:', verifyError);
            }
          }, 1500);
        } else {
          // Log detailed response information for debugging
          console.error('Unexpected response format:', {
            response,
            responseType: typeof response,
            responseKeys: response ? Object.keys(response) : 'null/undefined',
            hasSuccess: response ? 'success' in response : false,
            successValue: response ? response.success : 'N/A'
          });
          
          // Show user-friendly error
          toast.error('Invalid response from server. Please try again.');
        }
      }
    } catch (error) {
      console.error('Settings save error:', error);
      
      // Enhanced error handling with specific status code handling
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to save settings. Please try again.';
      const statusCode = error?.response?.status;
      
      if (!error?.response) {
        toast.error('Network error. Please check your connection.');
      } else if (statusCode >= 500) {
        toast.error('Server error. Please try again later.');
      } else if (statusCode === 400) {
        toast.error(errorMessage || 'Invalid settings data provided.');
      } else if (statusCode === 503) {
        toast.error('Database temporarily unavailable. Please try again.');
      } else if (statusCode === 401) {
        toast.error('Authorization expired. Please login again.');
      } else if (statusCode === 403) {
        toast.error('Insufficient permissions to update settings.');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAddFileType = async () => {
    const newType = prompt('Enter file extension (e.g., mp4)');
    if (newType && !formData.allowedFileTypes.includes(newType)) {
      try {
        await adminService.addFileType(newType);
        setFormData({
          ...formData,
          allowedFileTypes: [...formData.allowedFileTypes, newType]
        });
        toast.success('File type added successfully');
      } catch (error) {
        toast.error(error.message || 'Failed to add file type');
      }
    }
  };

  const handleRemoveFileType = async (type) => {
    try {
      await adminService.removeFileType(type);
      setFormData({
        ...formData,
        allowedFileTypes: formData.allowedFileTypes.filter(t => t !== type)
      });
      toast.success('File type removed successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to remove file type');
    }
  };

  // Missing handler functions that were causing undefined errors
  const handleClearCache = async () => {
    try {
      setLoading(true);
      const response = await adminService.clearCache();
      if (response?.success) {
        toast.success('Cache cleared successfully!');
        setShowConfirmModal(false);
        setConfirmAction(null);
      } else {
        toast.error(response?.error || 'Failed to clear cache');
      }
    } catch (error) {
      console.error('Clear cache error:', error);
      toast.error('Failed to clear cache. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRotateLogs = async () => {
    try {
      setLoading(true);
      const response = await adminService.rotateLogs();
      if (response?.success) {
        toast.success('Logs rotated successfully!');
        setShowConfirmModal(false);
        setConfirmAction(null);
      } else {
        toast.error(response?.error || 'Failed to rotate logs');
      }
    } catch (error) {
      console.error('Rotate logs error:', error);
      toast.error('Failed to rotate logs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setLoading(true);
      const response = await adminService.createBackup();
      if (response?.success) {
        toast.success('Backup created successfully!');
        setShowConfirmModal(false);
        setConfirmAction(null);
      } else {
        toast.error(response?.error || 'Failed to create backup');
      }
    } catch (error) {
      console.error('Create backup error:', error);
      toast.error('Failed to create backup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEnableMaintenance = async () => {
    try {
      setLoading(true);
      const response = await adminService.setMaintenanceMode(true);
      if (response?.success) {
        toast.success('Maintenance mode enabled!');
        setFormData({ ...formData, maintenanceMode: true });
        setShowConfirmModal(false);
        setConfirmAction(null);
      } else {
        toast.error(response?.error || 'Failed to enable maintenance mode');
      }
    } catch (error) {
      console.error('Enable maintenance error:', error);
      toast.error('Failed to enable maintenance mode. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !settings) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-zinc-950 text-white' : 'bg-white text-zinc-900'}`}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-zinc-200 border-t-black rounded-full animate-spin"></div>
          <p className="text-sm font-medium animate-pulse uppercase tracking-widest">Loading Settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-7xl mx-auto space-y-8 p-6 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-light tracking-tight" style={{ fontFamily: 'Playfair Display, serif' }}>
            Admin <span className="font-semibold">Settings</span>
          </h1>
          <p className={`text-sm mt-2 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Manage platform configuration and administrative preferences.</p>
        </div>
        
        <div className="flex items-center gap-3">
         <Button
  onClick={handleSave}
  variant="secondary"
  loading={saving}
  disabled={Object.keys(validationErrors).length > 0}
  className={`
    flex items-center gap-2 px-6 py-2.5 
    bg-black text-white text-xs font-bold uppercase tracking-widest rounded-full 
    transition-all duration-300 ease-out shadow-lg
    
    /* Hover & Active States */
    hover:bg-zinc-800 hover:shadow-xl hover:-translate-y-0.5
    active:scale-95 active:translate-y-0
    disabled:opacity-70 disabled:cursor-not-allowed
    
    /* Shine Effect (Optional) */
    relative overflow-hidden group
 ${isDark ? 'bg-zinc-900' : 'bg-zinc-700'} ${
    Object.keys(validationErrors).length > 0 ? 'opacity-50 cursor-not-allowed' : ''
  }`}
>
  {/* Icon Animation */}
  <Save 
    className={`w-4 h-4 transition-all duration-500 ${
      saving ? 'opacity-0 scale-50' : 'opacity-100 scale-100 group-hover:rotate-12'
    }`} 
  />

  {/* Text Transition */}
  <span className="relative">
    {saving ? (
      <span className="flex items-center gap-2">
        <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        Saving...
      </span>
    ) : Object.keys(validationErrors).length > 0 ? (
      'Fix Errors to Save'
    ) : (
      'Save Changes'
    )}
  </span>

  {/* Background Shine (Premium Touch) */}
  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] transition-transform" />
</Button>
        </div>
      </div>

      {/* Tab Filters - Matching Brand Settings Style */}
      <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 w-full lg:w-auto no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border whitespace-nowrap ${
                  activeTab === tab.id 
                    ? (isDark ? 'bg-black border-white text-gray-800' : 'bg-black border-black text-white')
                    : (isDark ? 'border-zinc-800 text-zinc-400 hover:border-zinc-600' : 'border-zinc-200 text-zinc-500 hover:border-zinc-400')
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div >
        <div className="p-6 md:p-8">
      <h2 
  className="text-2xl md:text-3xl italic font-semibold mb-6 capitalize transition-all duration-300 tracking-normal hover:tracking-widest" 
  style={{ fontFamily: 'Playfair Display, serif' }}
>
  {tabs.find(t => t.id === activeTab)?.label}
</h2>

          {activeTab === 'general' && (
            <div className="space-y-6">
              {/* Profile Section */}
              <div className={`p-6 rounded-xl border ${isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}>
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2" style={{ fontFamily: 'Playfair Display, serif' }}>
                  <UserCheck className="w-5 h-5" />
                  Administrator Profile
                </h3>
                <ProfilePictureUpload
                  currentImage={profileImage}
                  fullName={user?.fullName}
                  isDark={isDark}
                  onUpload={async (imageUrl) => {
                    console.log('🔍 Profile picture uploaded successfully:', imageUrl);
                    
                    // Immediately update local state
                    setProfileImage(imageUrl);
                    
                    // Update formData to include the new profile picture
                    setFormData(prev => ({
                      ...prev,
                      profilePicture: imageUrl,
                      profileImage: imageUrl
                    }));
                    
                    // Immediately update localStorage to ensure persistence
                    try {
                      const storedUser = localStorage.getItem('user');
                      if (storedUser) {
                        const parsedUser = JSON.parse(storedUser);
                        parsedUser.profilePicture = imageUrl;
                        parsedUser.profileImage = imageUrl;
                        localStorage.setItem('user', JSON.stringify(parsedUser));
                        console.log('🔍 Profile picture updated in localStorage immediately:', imageUrl);
                        
                        // Force a storage event to trigger the useEffect
                        window.dispatchEvent(new StorageEvent('storage', {
                          key: 'user',
                          newValue: JSON.stringify(parsedUser)
                        }));
                      }
                    } catch (error) {
                      console.error('Error updating localStorage:', error);
                    }
                    
                    // Update both profilePicture and profileImage fields for consistency
                    if (updateUser) {
                      console.log('🔍 Updating user context with new profile picture');
                      updateUser({ 
                        profilePicture: imageUrl, 
                        profileImage: imageUrl 
                      });
                    }
                    
                    // Small delay to ensure state updates, then refresh
                    setTimeout(async () => {
                      // Refresh user data from server to ensure consistency
                      if (refreshUser) {
                        try {
                          await refreshUser();
                          console.log('🔍 User data refreshed from server');
                        } catch (error) {
                          console.error('Error refreshing user data:', error);
                        }
                      }
                    }, 500);
                  }}
                />
              </div>

              {/* Platform Configuration */}
              <div className={`p-6 rounded-xl border ${isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}>
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2" style={{ fontFamily: 'Playfair Display, serif' }}>
                  <Globe className="w-5 h-5" />
                  Platform Configuration
                </h3>
                
                <div className="space-y-4">
                  <Input
                    label="Platform Name"
                    value={formData.platformName}
                    onChange={(e) => {
                      setFormData({...formData, platformName: e.target.value});
                      validateField('platformName', e.target.value);
                    }}
                    className={isDark ? 'bg-zinc-900/50 border-zinc-600' : 'bg-white border-zinc-300'}
                    error={validationErrors.platformName}
                    required
                  />
                  
                  {validationErrors.platformName && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.platformName}</p>
                  )}
                  
                  <Input
                    label="Support Email"
                    type="email"
                    value={formData.supportEmail || ''}
                    onChange={(e) => {
                      setFormData({...formData, supportEmail: e.target.value});
                      validateField('supportEmail', e.target.value);
                    }}
                    placeholder="support@influencex.com"
                    className={isDark ? 'bg-zinc-900/50 border-zinc-600' : 'bg-white border-zinc-300'}
                    error={validationErrors.supportEmail}
                  />
                  
                  {validationErrors.supportEmail && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.supportEmail}</p>
                  )}
                </div>
              </div>

              {/* Email Configuration */}
              <div className={`p-6 rounded-xl border ${isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}>
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2" style={{ fontFamily: 'Playfair Display, serif' }}>
                  <MessageSquare className="w-5 h-5" />
                  Email Configuration
                </h3>
                
                <div className="space-y-6">
                  {/* SMTP Email Settings */}
                  <div>
                    <h4 className={`text-md font-medium mb-3 ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>SMTP Email Settings</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="SMTP Host"
                        value={formData.notifications?.email?.smtp?.host || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          notifications: {
                            ...formData.notifications,
                            email: {
                              ...formData.notifications?.email,
                              smtp: {
                                ...formData.notifications?.email?.smtp,
                                host: e.target.value
                              }
                            }
                          }
                        })}
                        placeholder="smtp.gmail.com"
                        className={isDark ? 'bg-zinc-900/50 border-zinc-600' : 'bg-white border-zinc-300'}
                      />
                      
                      <Input
                        label="SMTP Port"
                        type="number"
                        value={formData.notifications?.email?.smtp?.port || 587}
                        onChange={(e) => setFormData({
                          ...formData,
                          notifications: {
                            ...formData.notifications,
                            email: {
                              ...formData.notifications?.email,
                              smtp: {
                                ...formData.notifications?.email?.smtp,
                                port: parseInt(e.target.value) || 587
                              }
                            }
                          }
                        })}
                        placeholder="587"
                        className={isDark ? 'bg-zinc-900/50 border-zinc-600' : 'bg-white border-zinc-300'}
                      />
                      
                      <Input
                        label="SMTP Email"
                        type="email"
                        value={formData.notifications?.email?.smtp?.auth?.user || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          notifications: {
                            ...formData.notifications,
                            email: {
                              ...formData.notifications?.email,
                              smtp: {
                                ...formData.notifications?.email?.smtp,
                                auth: {
                                  ...formData.notifications?.email?.smtp?.auth,
                                  user: e.target.value
                                }
                              }
                            }
                          }
                        })}
                        placeholder="your-email@gmail.com"
                        className={isDark ? 'bg-zinc-900/50 border-zinc-600' : 'bg-white border-zinc-300'}
                      />
                      
                      <Input
                        label="App Password"
                        type="password"
                        value={formData.notifications?.email?.smtp?.auth?.pass || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          notifications: {
                            ...formData.notifications,
                            email: {
                              ...formData.notifications?.email,
                              smtp: {
                                ...formData.notifications?.email?.smtp,
                                auth: {
                                  ...formData.notifications?.email?.smtp?.auth,
                                  pass: e.target.value
                                }
                              }
                            }
                          }
                        })}
                        placeholder="••••••••••••••••"
                        className={isDark ? 'bg-zinc-900/50 border-zinc-600' : 'bg-white border-zinc-300'}
                      />
                    </div>
                    
                    <div className="mt-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.notifications?.email?.smtp?.secure || false}
                          onChange={(e) => setFormData({
                            ...formData,
                            notifications: {
                              ...formData.notifications,
                              email: {
                                ...formData.notifications?.email,
                                smtp: {
                                  ...formData.notifications?.email?.smtp,
                                  secure: e.target.checked
                                }
                              }
                            }
                          })}
                          className={`mr-2 ${isDark ? 'bg-zinc-700 border-zinc-600' : 'bg-white border-zinc-300'}`}
                        />
                        <span className={`text-sm ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>Use SSL/TLS</span>
                      </label>
                    </div>
                  </div>

                  {/* Email Sender Details */}
                  <div>
                    <h4 className={`text-md font-medium mb-3 ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>Email Sender Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Sender Name"
                        value={formData.senderName || ''}
                        onChange={(e) => setFormData({...formData, senderName: e.target.value})}
                        placeholder="Your Platform Name"
                        className={isDark ? 'bg-zinc-900/50 border-zinc-600' : 'bg-white border-zinc-300'}
                      />
                      
                      <Input
                        label="Email Footer"
                        value={formData.emailFooter || ''}
                        onChange={(e) => setFormData({...formData, emailFooter: e.target.value})}
                        placeholder="© 2024 Your Platform. All rights reserved."
                        className={isDark ? 'bg-zinc-900/50 border-zinc-600' : 'bg-white border-zinc-300'}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Commission Settings */}
              <div className={`p-6 rounded-xl border ${isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}>
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2" style={{ fontFamily: 'Playfair Display, serif' }}>
                  <DollarSign className="w-5 h-5" />
                  Commission Settings
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Commission Rate (%)"
                    type="number"
                    value={formData.commissionRate}
                    onChange={(e) => {
                      setFormData({...formData, commissionRate: parseFloat(e.target.value) || 0});
                      validateField('commissionRate', e.target.value);
                    }}
                    min="0"
                    max="100"
                    step="0.1"
                    className={isDark ? 'bg-zinc-900/50 border-zinc-600' : 'bg-white border-zinc-300'}
                    error={validationErrors.commissionRate}
                  />
                </div>
                
                <div className={`mt-4 p-4 ${isDark ? 'bg-zinc-900/50' : 'bg-zinc-100'} rounded-lg`}>
                  <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    This commission rate will be applied when Brands create campaigns. 
                    Changes take effect immediately for new campaigns.
                  </p>
                </div>
              </div>
            </div>
            )}


          {activeTab === 'security' && (
            <div className="space-y-6">
              {/* Admin Account Settings */}
              <div className={`p-6 rounded-xl border ${isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}>
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2" style={{ fontFamily: 'Playfair Display, serif' }}>
                  <UserCheck className="w-5 h-5" />
                  Admin Account Settings
                </h3>
                
                <div className="space-y-4">
                  {/* Email Change */}
                  <div className={`p-4 ${isDark ? 'bg-zinc-900/50' : 'bg-zinc-100'} rounded-lg`}>
                    <div className="mb-4">
                      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                        Current Email
                      </label>
                      <input
                        type="email"
                        value={user?.email || ''}
                        disabled
                        className={`w-full px-4 py-2 border rounded-lg bg-opacity-50 ${
                          isDark ? 'bg-zinc-800 border-zinc-600 text-zinc-400' : 'bg-gray-100 border-gray-300 text-gray-500'
                        }`}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                          New Email
                        </label>
                        <input
                          type="email"
                          value={formData.newEmail || ''}
                          onChange={(e) => setFormData({...formData, newEmail: e.target.value})}
                          placeholder="Enter new email"
                          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-400 ${
                            isDark ? 'bg-zinc-900/50 border-zinc-600 text-zinc-100' : 'bg-white border-zinc-300 text-zinc-900'
                          }`}
                        />
                      </div>
                      
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                          Confirm New Email
                        </label>
                        <input
                          type="email"
                          value={formData.confirmNewEmail || ''}
                          onChange={(e) => setFormData({...formData, confirmNewEmail: e.target.value})}
                          placeholder="Confirm new email"
                          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-400 ${
                            isDark ? 'bg-zinc-900/50 border-zinc-600 text-zinc-100' : 'bg-white border-zinc-300 text-zinc-900'
                          }`}
                        />
                      </div>
                    </div>
                    
                 <div className="mt-4">
  <Button
    variant="secondry" 
    onClick={handleEmailChange}
    loading={saving}
    disabled={!formData.newEmail || formData.newEmail !== formData.confirmNewEmail}
    className="
      relative overflow-hidden
      bg-blue-600 text-white
      px-8 py-2.5 rounded-lg
      font-medium tracking-wide
      transition-all duration-300 ease-in-out
      
      /* Hover: Lift effect and soft blue glow */
      hover:bg-blue-500 
      hover:-translate-y-0.5 
      hover:shadow-[0_10px_20px_-10px_rgba(37,99,235,0.5)]
      
      /* Active: Physical press sensation */
      active:scale-95 active:translate-y-0
      
      /* Disabled state: Clean and muted */
      disabled:opacity-40 disabled:grayscale-[0.5] 
      disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none
    "
  >
    <span className="relative z-10 flex items-center gap-2">
      Update Email
    </span>
    
    {/* Subtle Inner Highlight for a 'Glass' feel */}
    <div className="absolute inset-0 bg-gradient-to-t from-white/0 to-white/10 opacity-0 hover:opacity-100 transition-opacity duration-300" />
  </Button>
</div>
                  </div>

                  {/* Password Change */}
                  <div className={`p-4 ${isDark ? 'bg-zinc-900/50' : 'bg-zinc-100'} rounded-lg`}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                          Current Password
                        </label>
                        <input
                          type="password"
                          value={formData.currentPassword || ''}
                          onChange={(e) => setFormData({...formData, currentPassword: e.target.value})}
                          placeholder="Enter current password"
                          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-400 ${
                            isDark ? 'bg-zinc-900/50 border-zinc-600 text-zinc-100' : 'bg-white border-zinc-300 text-zinc-900'
                          }`}
                        />
                      </div>
                      
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                          New Password
                        </label>
                        <input
                          type="password"
                          value={formData.newPassword || ''}
                          onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
                          placeholder="Enter new password"
                          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-400 ${
                            isDark ? 'bg-zinc-900/50 border-zinc-600 text-zinc-100' : 'bg-white border-zinc-300 text-zinc-900'
                          }`}
                        />
                      </div>
                      
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          value={formData.confirmNewPassword || ''}
                          onChange={(e) => setFormData({...formData, confirmNewPassword: e.target.value})}
                          placeholder="Confirm new password"
                          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-400 ${
                            isDark ? 'bg-zinc-900/50 border-zinc-600 text-zinc-100' : 'bg-white border-zinc-300 text-zinc-900'
                          }`}
                        />
                      </div>
                    </div>
                    
                  <div className="mt-4">
  <Button
    variant="secondry"
    onClick={handlePasswordChange}
    loading={saving}
    disabled={!formData.currentPassword || !formData.newPassword || formData.newPassword !== formData.confirmNewPassword}
    // Added: smooth transitions, scale on tap, and refined shadows
    className="
      relative overflow-hidden
      bg-green-600 hover:bg-green-500 
      text-white font-medium
      px-6 py-2 rounded-lg
      transition-all duration-300 ease-out
      hover:shadow-[0_0_20px_rgba(22,163,74,0.4)]
      active:scale-95
      disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none
    "
  >
    <span className="relative z-10">Update Password</span>
  </Button>
</div>
                  </div>
                </div>
              </div>

              {/* Two-Factor Authentication */}
              <div className={`p-6 rounded-xl border ${isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}>
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2" style={{ fontFamily: 'Playfair Display, serif' }}>
                  <ShieldCheck className="w-5 h-5" />
                  Two-Factor Authentication
                </h3>
                
                <div className="space-y-4">
                  <div className={`p-4 ${isDark ? 'bg-zinc-900/50' : 'bg-zinc-100'} rounded-lg`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`font-medium ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>Status: {twoFactorStatus?.enabled ? 'Enabled' : 'Disabled'}</p>
                        <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                          {twoFactorStatus?.enabled ? '2FA is active on your account' : 'Enable 2FA for enhanced security'}
                        </p>
                      </div>
                      {twoFactorStatus?.enabled ? (
                        <Button
                          variant="secondary"
                          onClick={handleDisable2FA}
                          loading={disabling2FA}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          Disable
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          onClick={handleStart2FASetup}
                          loading={loading}
                        >
                          Enable
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              {/* Email Notifications */}
              <div className={`p-6 rounded-xl border ${isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}>
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2" style={{ fontFamily: 'Playfair Display, serif' }}>
                  <Mail className="w-5 h-5" />
                  Email Notifications
                </h3>
                
                <div className="space-y-4">
                  {Object.entries(formData.emailNotifications || {}).map(([key, value]) => (
                    <div key={key} className={`flex items-center justify-between p-4 ${isDark ? 'bg-zinc-900/50 border-zinc-600' : 'bg-white border-zinc-200'} rounded-lg`}>
                      <div>
                        <span className={`font-medium ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</span>
                        <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'} mt-1`}>
                          {key === 'newUser' && 'Send email when new user registers'}
                          {key === 'newCampaign' && 'Send email when new campaign is created'}
                          {key === 'paymentReceived' && 'Send email when payment is received'}
                          {key === 'disputeRaised' && 'Send email when dispute is raised'}
                          {key === 'reportGenerated' && 'Send email when report is generated'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData({
                          ...formData,
                          emailNotifications: {
                            ...formData.emailNotifications,
                            [key]: !value
                          }
                        })}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 ${
                          value ? 'bg-zinc-600' : 'bg-zinc-200'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-zinc-100 shadow ring-0 transition duration-200 ease-in-out ${
                            value ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            )}



        </div>
      </div>

      {/* Confirm Action Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setConfirmAction(null);
        }}
        title="Confirm Action"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to {confirmAction === 'cache' ? 'clear the cache' : 
              confirmAction === 'logs' ? 'rotate logs' :
              confirmAction === 'backup' ? 'create a backup' :
              'enable maintenance mode'}?
          </p>
          {confirmAction === 'maintenance' && (
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Warning:</strong> Users will not be able to access the platform during maintenance.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="secondary"
            onClick={
              confirmAction === 'cache' ? handleClearCache :
              confirmAction === 'logs' ? handleRotateLogs :
              confirmAction === 'backup' ? handleCreateBackup :
              confirmAction === 'maintenance' ? handleEnableMaintenance :
              () => setShowConfirmModal(false)
            }
            loading={loading}
            className=''
          >
            Confirm
          </Button>
        </div>
      </Modal>

      {/* 2FA Setup Modal */}
      <Modal
        isOpen={show2FAModal}
        onClose={() => {
          if (twoFactorStep !== 'success') {
            setShow2FAModal(false);
          }
        }}
        title={
          twoFactorStep === 'setup' ? 'Setup 2FA' : 
          twoFactorStep === 'verify' ? 'Verify Code' : 
          '2FA Enabled Successfully'
        }
      >
        <div className="space-y-6">
          {twoFactorStep === 'setup' && (
            <div className="text-center space-y-4">
              <p className="text-gray-600 text-sm">
                Scan this QR code with your authenticator app (e.g., Google Authenticator, Authy).
              </p>
              <div className="flex justify-center p-4 bg-white border rounded-lg">
                {qrCodeData?.qrCode ? (
                  <img src={qrCodeData.qrCode} alt="QR Code" className="w-48 h-48" />
                ) : (
                  <div className="w-48 h-48 bg-gray-100 animate-pulse" />
                )}
              </div>
              <div className="text-left bg-gray-50 p-3 rounded-lg border">
                <p className="text-xs text-gray-500 font-medium uppercase mb-1">Manual Entry Key</p>
                <code className="text-sm font-mono break-all text-indigo-500">
                  {qrCodeData?.secret}
                </code>
              </div>
<Button 
  variant="secondary" 
  className="w-full" 
  onClick={() => setTwoFactorStep('verify')}
>
  I've scanned it, continue
</Button>
            </div>
          )}

          {twoFactorStep === 'verify' && (
            <div className="space-y-4">
              <p className="text-center text-gray-600 text-sm">
                Enter the 6-digit code from your app to verify the setup.
              </p>
              <input
                type="text"
                maxLength={6}
                autoFocus
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-3xl tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
              />
              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={() => setTwoFactorStep('setup')}>
                  Back
                </Button>
                <Button 
                  variant="secondary" 
                  className="flex-1" 
                  onClick={handleVerify2FA} 
                  loading={saving}
                  disabled={verificationCode.length !== 6}
                >
                  Verify & Enable
                </Button>
              </div>
            </div>
          )}

          {twoFactorStep === 'success' && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-10 h-10" />
                </div>
              </div>
              <p className="text-center text-gray-600">
                Two-factor authentication is now active on your account.
              </p>
              
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100">
                <h4 className="text-yellow-800 font-semibold mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Save Your Backup Codes
                </h4>
                <p className="text-xs text-yellow-700 mb-3">
                  If you lose your phone, you can use these codes to log in. Each code can only be used once.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((code, idx) => (
                    <code key={idx} className="bg-white px-2 py-1 rounded border text-xs text-center font-mono">
                      {code}
                    </code>
                  ))}
                </div>
              </div>

              <Button 
                variant="secondary" 
                className="w-full" 
                onClick={() => {
                  setShow2FAModal(false);
                  setTwoFactorStep('initial');
                  setVerificationCode('');
                }}
              >
                Close & Finish
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default AdminSettings;