// pages/Creator/Settings.jsx - UPDATED TO MATCH BRAND SETTINGS THEME
import React, { useState, useEffect, useRef } from 'react';
import {
  User, Bell, Shield, Eye, Lock, Globe, Save, Loader, ChevronRight,
  Mail, Phone, MapPin, Building2, Instagram, Youtube, Facebook,
  AlertCircle, CheckCircle, XCircle, DollarSign, CreditCard, Wallet,
  Key, Smartphone, Monitor, Moon, Sun, Languages, Clock, RefreshCw,
  Trash2, Edit, Plus, Download, Upload, HelpCircle, FileText, Camera, Settings as SettingsIcon
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import creatorService from '../../services/creatorService';
import authService from '../../services/authService';
import api from '../../services/api';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import Modal from '../../components/Common/Modal';
import toast from 'react-hot-toast';
import { formatNumber, formatCurrency, formatDate, timeAgo } from '../../utils/helpers';
import { getStatusColor } from '../../utils/colorScheme';

// ==================== SUB-COMPONENTS ====================

const ProfilePictureUpload = ({ currentImage, onUpload }) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentImage || '');
  const fileInputRef = useRef(null);

  useEffect(() => {
    setPreview(currentImage || '');
  }, [currentImage]);

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const previewReader = new FileReader();
    previewReader.onloadend = () => setPreview(previewReader.result);
    previewReader.readAsDataURL(file);

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('profilePicture', file);

      const response = await api.post('/upload/profile-picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Upload failed');
      }

      const uploadedUrl = response.data.profilePicture || response.data.file?.url;
      if (!uploadedUrl) {
        throw new Error('Upload succeeded but no image URL was returned');
      }

      onUpload(uploadedUrl);
      toast.success('Profile picture updated');
    } catch (error) {
      setPreview(currentImage || '');
      toast.error(error.response?.data?.error || error.message || 'Failed to upload profile picture');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  return (
    <div className="p-4 bg-black/90 rounded-2xl border border-gray-200">
      <div className="flex items-center gap-4">
        <div className="relative">
          <img
            src={preview || 'https://via.placeholder.com/96?text=Creator'}
            alt="Creator profile"
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
            icon={Camera}
                        variant="secondary"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="border-gray-200 !bg-zinc-900/50 text-white "
          >
            {uploading ? 'Uploading...' : 'Change Photo'}
          </Button>
          <p className="text-xs text-white mt-2">JPG, PNG, WEBP up to 5MB.</p>
        </div>
      </div>
    </div>
  );
};

const ProfileSettings = ({ settings, setSettings, profileImage, onProfileImageUpload }) => (
  <div className="space-y-6">
    <ProfilePictureUpload currentImage={profileImage} onUpload={onProfileImageUpload} />

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Input
        label="Display Name *"
        value={settings.displayName || ''}
        onChange={(e) => setSettings({ ...settings, displayName: e.target.value })}
        placeholder="Your public name"
      />
      <Input
        label="Handle"
        value={settings.handle || ''}
        onChange={(e) => setSettings({ ...settings, handle: e.target.value })}
        placeholder="username"
      />
      <Input
        label="Email"
        type="email"
        value={settings.email || ''}
        disabled
        icon={Mail}
      />
      <Input
        label="Phone"
        value={settings.phone || ''}
        onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
        icon={Phone}
      />
      <Input
        label="Age"
        type="number"
        value={settings.age || ''}
        onChange={(e) => setSettings({ ...settings, age: e.target.value })}
        placeholder="Enter your age"
        min="13"
        max="100"
      />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Gender
        </label>
        <select
          value={settings.gender || ''}
          onChange={(e) => setSettings({ ...settings, gender: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400"
        >
          <option value="">Prefer not to say</option>
          <option value="female">Female</option>
          <option value="male">Male</option>
          <option value="non-binary">Non-binary</option>
        </select>
      </div>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Bio
      </label>
      <textarea
        rows="4"
        value={settings.bio || ''}
        onChange={(e) => setSettings({ ...settings, bio: e.target.value })}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400"
        placeholder="Tell brands about yourself..."
      />
    </div>
  </div>
);

const SocialSettings = ({ settings, setSettings, onVerify }) => {
  const [verifying, setVerifying] = useState({});
  const formatStat = (value) => Number(value || 0).toLocaleString();

  const updateSocial = (platform, field, value) => {
    setSettings((prev) => ({
      ...prev,
      socialMedia: {
        ...prev.socialMedia,
        [platform]: {
          ...(prev.socialMedia?.[platform] || {}),
          [field]: value
        }
      }
    }));
  };

  const renderPlatformStats = (platform, socialStats) => {
    if (!socialStats) return null;

    if (platform === 'youtube') {
      const hasYoutubeStats =
        socialStats.subscribers !== undefined ||
        socialStats.views !== undefined ||
        socialStats.videos !== undefined;

      if (!hasYoutubeStats) return null;

      return (
        <div className="text-sm text-gray-600 flex gap-4 mt-2 flex-wrap">
          <span>Subscribers: {formatStat(socialStats.subscribers)}</span>
          <span>Views: {formatStat(socialStats.views)}</span>
          <span>Videos: {formatStat(socialStats.videos)}</span>
          {socialStats.engagement ? <span>Engagement: {socialStats.engagement}%</span> : null}
        </div>
      );
    }

    if (socialStats.followers === undefined) return null;

    return (
      <div className="text-sm text-gray-600 flex gap-4 mt-2 flex-wrap">
        <span>Followers: {formatStat(socialStats.followers)}</span>
        {platform === 'instagram' && socialStats.posts !== undefined ? (
          <span>Posts: {formatStat(socialStats.posts)}</span>
        ) : null}
        {platform === 'tiktok' && socialStats.likes !== undefined ? (
          <span>Likes: {formatStat(socialStats.likes)}</span>
        ) : null}
        {socialStats.engagement ? <span>Engagement: {socialStats.engagement}%</span> : null}
      </div>
    );
  };

  const handleVerify = async (platform) => {
    const handle = settings.socialMedia?.[platform]?.handle;
    if (!handle) {
      toast.error(`Please enter a ${platform} handle`);
      return;
    }
    setVerifying((prev) => ({ ...prev, [platform]: true }));
    const result = await onVerify(platform, handle);
    if (result?.success) {
      const payload = result.data || result.stats || {};
      const verified = Boolean(result.verified ?? payload.verified);

      setSettings((prev) => ({
        ...prev,
        socialMedia: {
          ...prev.socialMedia,
          [platform]: {
            ...(prev.socialMedia?.[platform] || {}),
            ...payload,
            verified
          }
        }
      }));

      if (verified) {
        toast.success(result.message || `${platform} verified successfully`);
      } else {
        toast(result.message || `${platform} connected, but full verification is unavailable right now`);
      }
    } else {
      toast.error(result?.error || `Failed to verify ${platform}`);
    }
    setVerifying((prev) => ({ ...prev, [platform]: false }));
  };

  return (
    <div className="space-y-6">
      {['instagram', 'youtube', 'tiktok'].map((platform) => (
        <div key={platform} className=" p-4 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {platform === 'instagram' && <Instagram className="w-5 h-5 text-pink-600" />}
              {platform === 'youtube' && <Youtube className="w-5 h-5 text-red-600" />}
              {platform === 'tiktok' && <Globe className="w-5 h-5 text-black" />}
              <span className="font-medium capitalize">{platform}</span>
            </div>
            {settings.socialMedia?.[platform]?.verified && (
              <span className="text-xs px-2 py-1 rounded-full flex items-center gap-1 bg-green-100 text-green-800">
                <CheckCircle className="w-3 h-3" />
                Verified
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <Input
              placeholder="Username"
              value={settings.socialMedia?.[platform]?.handle || ''}
              onChange={(e) => updateSocial(platform, 'handle', e.target.value)}
            />
            <Input
              placeholder="Profile URL"
              value={settings.socialMedia?.[platform]?.url || ''}
              onChange={(e) => updateSocial(platform, 'url', e.target.value)}
            />
          </div>

          {renderPlatformStats(platform, settings.socialMedia?.[platform])}

          {settings.socialMedia?.[platform]?.note ? (
            <p className="text-xs text-amber-700 mt-2">{settings.socialMedia[platform].note}</p>
          ) : null}

        <Button
  variant="secondary"
  onClick={() => handleVerify(platform)}
  disabled={verifying[platform]}
  className="mt-2 !bg-white !text-black transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 hover:!bg-zinc-100 disabled:opacity-50 disabled:hover:scale-100"
>
  {verifying[platform] ? <Loader className="w-4 h-4 animate-spin mr-2" /> : null}
  {settings.socialMedia?.[platform]?.verified ? 'Re-verify' : 'Verify & Fetch Stats'}
</Button>
        </div>
      ))}
    </div>
  );
};

const SecuritySettings = ({
  showPasswordModal, setShowPasswordModal,
  passwordData, setPasswordData,
  handleChangePassword,
  twoFactorStatus, handleStart2FASetup, handleDisable2FA, disabling2FA, saving
}) => {
  return (
    <div className="space-y-6">
      <div className=" p-4 rounded-lg flex justify-between items-center">
        <div>
          <h4 className="font-medium text-gray-900">Password</h4>
          <p className="text-sm text-gray-500">Update your account password</p>
        </div>
        <Button variant="secondary" onClick={() => setShowPasswordModal(true)} className="border-gray-600 text-gray-600 hover:border-gray-700 hover:text-gray-700">
          Change Password
        </Button>
      </div>

      <div className="pt-6 border-t border-gray-200">
        <h4 className="text-base font-medium text-gray-900 mb-4">Two-Factor Authentication</h4>
        <div className=" p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                twoFactorStatus?.enabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
              }`}>
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  Status: {twoFactorStatus?.enabled ? 'Enabled' : 'Disabled'}
                </p>
                <p className="text-sm text-gray-500">
                  {twoFactorStatus?.enabled 
                    ? 'Your account is protected with an additional layer of security.' 
                    : 'Add an extra layer of security to your account using an authenticator app.'}
                </p>
              </div>
            </div>
            {twoFactorStatus?.enabled ? (
             <Button 
  variant="danger" 
  onClick={handleDisable2FA} 
  loading={disabling2FA}
  className="transition-all duration-200 ease-in-out hover:bg-red-600 hover:shadow-[0_0_15px_rgba(220,38,38,0.4)] active:scale-95"
>
  Disable 2FA
</Button>
            ) : (
            <Button 
  variant="secondary" 
  onClick={handleStart2FASetup} 
  loading={saving}
  className="transition-all duration-200 ease-in-out hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 shadow-sm hover:shadow-md"
>
  Enable 2FA
</Button>
            )}
          </div>

          {twoFactorStatus?.enabled && (
            <div className="mt-6 bg-blue-50 p-4 rounded-xl flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800">2FA is active</p>
                <p className="text-xs text-blue-700 mt-1">
                  You have {twoFactorStatus.backupCodesCount} backup codes remaining. Keep them in a safe place.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const getDefaultSocialMedia = () => ({
  instagram: { handle: '', url: '', verified: false, followers: 0, engagement: 0 },
  youtube: { handle: '', url: '', verified: false, subscribers: 0, views: 0, videos: 0 },
  tiktok: { handle: '', url: '', verified: false, followers: 0, likes: 0, videos: 0 }
});

// ---------- Main Component ----------
const CreatorSettings = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { user, updateUser, refreshUser, changePassword } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [profileImage, setProfileImage] = useState('');

  // Modal states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Database mapped state
  const [settings, setSettings] = useState({
    displayName: '',
    handle: '',
    bio: '',
    email: '',
    phone: '',
    age: '',
    gender: '',
    profilePicture: '',
    socialMedia: getDefaultSocialMedia()
  });

  // 2FA State
  const [twoFactorStatus, setTwoFactorStatus] = useState(null);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFactorStep, setTwoFactorStep] = useState('initial');
  const [qrCodeData, setQrCodeData] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [disabling2FA, setDisabling2FA] = useState(false);

  const tabs = [
    { id: 'profile', label: 'Profile Info', icon: User },
    { id: 'social', label: 'Social Media', icon: Instagram },
    { id: 'security', label: 'Security', icon: Lock }
  ];

  useEffect(() => {
    if (activeTab === 'security') {
      fetch2FAStatus();
    }
  }, [activeTab]);

  const fetch2FAStatus = async () => {
    try {
      const res = await authService.get2FAStatus();
      if (res?.success) {
        setTwoFactorStatus(res.data);
      }
    } catch (error) {
      console.error('Error fetching 2FA status:', error);
    }
  };

  const handleStart2FASetup = async () => {
    try {
      setSaving(true);
      const res = await authService.generate2FA();
      if (res?.success) {
        setQrCodeData(res.data);
        setTwoFactorStep('setup');
        setShow2FAModal(true);
      }
    } catch (error) {
      toast.error('Failed to generate 2FA secret');
    } finally {
      setSaving(false);
    }
  };

  const handleVerify2FA = async () => {
    if (verificationCode.length !== 6) return;
    try {
      setSaving(true);
      const res = await authService.verifyAndEnable2FA(verificationCode);
      if (res?.success) {
        setBackupCodes(res.data.backupCodes || []);
        setTwoFactorStep('success');
        fetch2FAStatus();
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to verify 2FA code');
    } finally {
      setSaving(false);
    }
  };

  const handleDisable2FA = async () => {
    const code = prompt('Enter 2FA code to disable authentication:');
    if (!code) return;
    
    try {
      setDisabling2FA(true);
      const res = await authService.disable2FA(code);
      if (res?.success) {
        toast.success('Two-factor authentication disabled');
        fetch2FAStatus();
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to disable 2FA');
    } finally {
      setDisabling2FA(false);
    }
  };

  // ==================== FETCH FROM DATABASE ====================
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        const res = await creatorService.getProfile();
        if (res?.success) {
          const creator = res.creator || res;
          setProfileImage(creator.profilePicture || user?.profilePicture || '');
          
          // Ensure birthday is in YYYY-MM-DD format
          let formattedBirthday = creator.birthday || '';
          if (formattedBirthday && !formattedBirthday.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const date = new Date(formattedBirthday);
            if (!isNaN(date)) {
              formattedBirthday = date.toISOString().split('T')[0];
            }
          }

          const socialDefaults = getDefaultSocialMedia();
          const socialFromUser = creator.socialMedia || {};
          const verificationFromUser = creator.socialVerification || {};
          const mergedSocialMedia = {
            instagram: {
              ...socialDefaults.instagram,
              ...(socialFromUser.instagram || {}),
              verified: Boolean(socialFromUser.instagram?.verified || verificationFromUser.instagram)
            },
            youtube: {
              ...socialDefaults.youtube,
              ...(socialFromUser.youtube || {}),
              verified: Boolean(socialFromUser.youtube?.verified || verificationFromUser.youtube)
            },
            tiktok: {
              ...socialDefaults.tiktok,
              ...(socialFromUser.tiktok || {}),
              verified: Boolean(socialFromUser.tiktok?.verified || verificationFromUser.tiktok)
            }
          };

          setSettings({
            displayName: creator.displayName || user?.displayName || '',
            handle: creator.handle || user?.handle || '',
            bio: creator.bio || user?.bio || '',
            email: creator.email || user?.email || '',
            phone: creator.phone || user?.phone || '',
            age: creator.age || user?.age || '',
            gender: creator.gender || user?.gender || '',
            profilePicture: creator.profilePicture || user?.profilePicture || '',
            socialMedia: mergedSocialMedia
          });
        }
      } catch (error) {
        console.error('Fetch Profile Error:', error);
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    fetchProfileData();
  }, [user]);

  const handleProfileImageUpload = (imageUrl) => {
    setProfileImage(imageUrl);
    if (updateUser) {
      updateUser({ profilePicture: imageUrl });
    }
    if (refreshUser) {
      refreshUser();
    }
  };

  // ==================== SAVE TO DATABASE ====================
  const handleSaveSettings = async () => {
    try {
      setSaving(true);

      const sanitizePlatform = (platformData = {}) => ({
        handle: platformData.handle || '',
        url: platformData.url || '',
        verified: Boolean(platformData.verified),
        followers: Number(platformData.followers || 0),
        engagement: Number(platformData.engagement || 0),
        subscribers: Number(platformData.subscribers || 0),
        views: Number(platformData.views || 0),
        videos: Number(platformData.videos || 0),
        likes: Number(platformData.likes || 0),
        following: Number(platformData.following || 0),
        posts: Number(platformData.posts || 0),
        tweets: Number(platformData.tweets || 0),
      });

      const profileUpdate = {
        displayName: settings.displayName,
        handle: settings.handle,
        bio: settings.bio,
        phone: settings.phone,
        age: settings.age,
        gender: settings.gender,
        profilePicture: settings.profilePicture,
        socialMedia: {
          instagram: sanitizePlatform(settings.socialMedia?.instagram),
          youtube: sanitizePlatform(settings.socialMedia?.youtube),
          tiktok: sanitizePlatform(settings.socialMedia?.tiktok)
        }
      };

      const res = await creatorService.updateProfile(profileUpdate);

      if (res?.success) {
        toast.success('Settings updated successfully!');
        if (refreshUser) await refreshUser();
      } else {
        toast.error(res?.error || 'Failed to update settings');
      }
    } catch (error) {
      console.error('Backend Response Error:', error.response?.data);
      let errorMessage = 'Server error while saving settings';
      if (error.response?.data?.errors && error.response.data.errors.length > 0) {
        errorMessage = error.response.data.errors[0].message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  // ==================== CHANGE PASSWORD ====================
  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    try {
      const res = await changePassword(passwordData.currentPassword, passwordData.newPassword);
      if (res?.success) {
        setShowPasswordModal(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (error) {
      toast.error(error.message || 'Failed to change password');
    }
  };

  const handleVerifySocial = async (platform, handle) => {
    return await creatorService.verifySocialMedia(platform, handle);
  };

  // ==================== RENDER TAB CONTENT ====================
  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <ProfileSettings
            settings={settings}
            setSettings={setSettings}
            profileImage={profileImage || user?.profilePicture}
            onProfileImageUpload={handleProfileImageUpload}
          />
        );
      case 'social':
        return <SocialSettings settings={settings} setSettings={setSettings} onVerify={handleVerifySocial} />;
      case 'security':
        return (
          <SecuritySettings
            showPasswordModal={showPasswordModal}
            setShowPasswordModal={setShowPasswordModal}
            passwordData={passwordData}
            setPasswordData={setPasswordData}
            handleChangePassword={handleChangePassword}
            twoFactorStatus={twoFactorStatus}
            handleStart2FASetup={handleStart2FASetup}
            handleDisable2FA={handleDisable2FA}
            disabling2FA={disabling2FA}
            saving={saving}
          />
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-zinc-500 mx-auto mb-4" />
          <p className="text-zinc-500 text-xs font-medium">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-7xl mx-auto space-y-8 p-6 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-2xl font-light tracking-tight font-semibold">Creator <span className="font-bold">Settings</span></h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Manage your account preferences and creator information.</p>
        </div>
        
        <div className="flex items-center gap-3">
         <Button
  icon={Save}
  onClick={handleSaveSettings}
  variant='secondary'
  loading={saving}
  className="flex items-center gap-2 px-6 py-2.5 bg-black text-white text-xs font-bold uppercase tracking-widest rounded-full 
    transition-all duration-300 ease-out
    !bg-zinc-800 hover:shadow-[0_0_20px_rgba(0,0,0,0.3)] 
    hover:-translate-y-0.5 active:translate-y-0 active:scale-95
    disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
>
  {saving ? 'Saving...' : 'Save Changes'}
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
                    ? (isDark ? 'bg-white border-white text-gray-800' : 'bg-black border-black text-white')
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
      <div className={`rounded-2xl border transition-all ${
        isDark 
          ? 'bg-zinc-900/50 border-zinc-800' 
          : ' border-zinc-100 hover:shadow-xl shadow-zinc-200/50'
      }`}>
        <div className="p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 capitalize">
            {tabs.find((t) => t.id === activeTab)?.label}
          </h2>
          {renderTabContent()}
        </div>
      </div>

      {/* Change Password Modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title="Change Password"
      >
        <div className="space-y-4">
          <Input
            type="password"
            label="Current Password"
            value={passwordData.currentPassword}
            onChange={(e) =>
              setPasswordData({ ...passwordData, currentPassword: e.target.value })
            }
          />
          <Input
            type="password"
            label="New Password"
            value={passwordData.newPassword}
            onChange={(e) =>
              setPasswordData({ ...passwordData, newPassword: e.target.value })
            }
          />
          <Input
            type="password"
            label="Confirm New Password"
            value={passwordData.confirmPassword}
            onChange={(e) =>
              setPasswordData({ ...passwordData, confirmPassword: e.target.value })
            }
          />
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              Password must be at least 8 characters and include uppercase, lowercase, and numbers.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowPasswordModal(false)}>
            Cancel
          </Button>
          <Button variant="secondry" className="border-2" onClick={handleChangePassword}>
            Update Password
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
          twoFactorStep === 'setup' ? 'Setup Two-Factor Authentication' : 
          twoFactorStep === 'verify' ? 'Verify Code' : 
          '2FA Setup Complete'
        }
      >
        {/* Modal content would go here - similar to brand settings */}
        <div className="space-y-4">
          {twoFactorStep === 'setup' && qrCodeData && (
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">Scan this QR code with your authenticator app:</p>
              <div className="bg-white p-4 rounded-lg inline-block">
                <img src={qrCodeData.qrCode} alt="QR Code" className="w-48 h-48" />
              </div>
              <p className="text-xs text-gray-500 mt-4">Or enter this code manually: {qrCodeData.secret}</p>
            </div>
          )}
          
          {twoFactorStep === 'verify' && (
            <div>
              <Input
                label="Enter 6-digit code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="000000"
                maxLength={6}
              />
            </div>
          )}
          
          {twoFactorStep === 'success' && (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">2FA Enabled Successfully!</h3>
              <p className="text-sm text-gray-600 mb-4">Save your backup codes in a safe place.</p>
              <div className="bg-gray-50 p-4 rounded-lg max-w-sm mx-auto">
                <p className="text-xs font-medium text-gray-700 mb-2">Backup Codes:</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {backupCodes.slice(0, 6).map((code, index) => (
                    <code key={index} className="bg-white px-2 py-1 rounded border text-gray-800">
                      {code}
                    </code>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {twoFactorStep !== 'success' && (
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="secondary" onClick={() => setShow2FAModal(false)}>
              Cancel
            </Button>
            {twoFactorStep === 'verify' && (
              <Button onClick={handleVerify2FA} loading={saving}>
                Verify & Enable
              </Button>
            )}
            {twoFactorStep === 'setup' && (
              <Button onClick={() => setTwoFactorStep('verify')}>
                Next
              </Button>
            )}
          </div>
        )}
        
        {twoFactorStep === 'success' && (
          <div className="flex justify-end mt-6">
            <Button onClick={() => setShow2FAModal(false)}>
              Done
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CreatorSettings;