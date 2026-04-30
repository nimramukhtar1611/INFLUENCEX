import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import ReCAPTCHA from "react-google-recaptcha";
import {
  Mail, Lock, User, Phone, Globe,
  ArrowRight, Eye, EyeOff, Shield, CheckCircle, Building2, Sparkles
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useGlobalSettings } from '../../context/GlobalSettingsContext';
import OTPVerification from '../../components/Auth/OTPVerification';
import WireframeSphere from '../../components/WireframeSphere';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const Signup = () => {
  const { 
    getPlatformName, 
    getVerificationFlow, 
    getEmailVerificationRequired, 
    // getPhoneVerificationRequired removed - phone verification is now optional
    getPasswordRequirements,
    securitySettings,
    loading: settingsLoading
  } = useGlobalSettings();
  const [searchParams] = useSearchParams();
  const defaultType = searchParams.get('type') || 'brand';
  const [userType, setUserType] = useState(defaultType);
  const [step, setStep] = useState(1);
  const [showOTP, setShowOTP] = useState(false);
  const [otpDestination, setOtpDestination] = useState('');
  const [otpType, setOtpType] = useState('email');
  const [verificationSteps, setVerificationSteps] = useState([]);
  const [currentVerificationStep, setCurrentVerificationStep] = useState(0);
  const navigate = useNavigate();

  const [captchaToken, setCaptchaToken] = useState(null);
  const captchaRef = React.useRef();

  const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

  const {
    signup,
    sendEmailOTP,
    sendPhoneOTP,
    verifyEmailOTP,
    verifyPhoneOTP,
    loading: authLoading
  } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phone: '',
    brandName: '',
    industry: '',
    website: '',
    displayName: '',
    handle: '',
    niche: '',
  });

  // Helper function to format phone numbers
  const formatPhoneNumber = (phone) => {
    if (!phone) return '';
    let cleaned = phone.replace(/[^\d+]/g, '');
    if (!cleaned.startsWith('+')) {
      if (cleaned.startsWith('1')) {
        cleaned = cleaned.substring(1);
      }
      cleaned = '+1' + cleaned;
    }
    return cleaned;
  };

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const brandIndustries = [
    { value: 'Fashion', label: 'Fashion & Apparel' },
    { value: 'Beauty', label: 'Beauty & Cosmetics' },
    { value: 'Technology', label: 'Technology' },
    { value: 'Food & Beverage', label: 'Food & Beverage' },
    { value: 'Fitness', label: 'Fitness & Wellness' },
    { value: 'Travel', label: 'Travel & Tourism' },
    { value: 'Gaming', label: 'Gaming' },
    { value: 'Lifestyle', label: 'Lifestyle' },
    { value: 'Other', label: 'Other' }
  ];

  const creatorNiches = [
    { value: 'Fashion', label: 'Fashion' },
    { value: 'Beauty', label: 'Beauty' },
    { value: 'Fitness', label: 'Fitness' },
    { value: 'Travel', label: 'Travel' },
    { value: 'Food', label: 'Food' },
    { value: 'Tech', label: 'Tech' },
    { value: 'Gaming', label: 'Gaming' },
    { value: 'Lifestyle', label: 'Lifestyle' },
    { value: 'Parenting', label: 'Parenting' },
    { value: 'Finance', label: 'Finance' }
  ];

  const validateStep1 = () => {
    const newErrors = {};
    const passwordReq = getPasswordRequirements();
    
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    
    if (!formData.password) newErrors.password = 'Password is required';
    else {
      const passwordErrors = [];
      if (formData.password.length < passwordReq.minLength) {
        passwordErrors.push(`at least ${passwordReq.minLength} characters`);
      }
      if (passwordReq.requireUppercase && !/[A-Z]/.test(formData.password)) {
        passwordErrors.push('uppercase letter');
      }
      if (passwordReq.requireLowercase && !/[a-z]/.test(formData.password)) {
        passwordErrors.push('lowercase letter');
      }
      if (passwordReq.requireNumbers && !/[0-9]/.test(formData.password)) {
        passwordErrors.push('number');
      }
      if (passwordReq.requireSymbols && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password)) {
        passwordErrors.push('special character');
      }
      
      if (passwordErrors.length > 0) {
        newErrors.password = `Password must contain ${passwordErrors.join(', ')}`;
      }
    }
    
    if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
    else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (!formData.fullName) newErrors.fullName = 'Full name is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};
    // Phone verification is now optional - don't require phone
    
    if (userType === 'brand') {
      if (!formData.brandName) newErrors.brandName = 'Brand name is required';
      if (!formData.industry) newErrors.industry = 'Industry is required';
    } else {
      if (!formData.displayName) newErrors.displayName = 'Display name is required';
      if (!formData.handle) newErrors.handle = 'Handle is required';
      if (!formData.niche) newErrors.niche = 'Please select a niche';
    }
    
    // Phone validation removed - phone verification is now optional
    // Phone field is always shown but verification is optional
    
    if (!captchaToken) newErrors.captcha = 'Please verify reCAPTCHA';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEmailOTP = async () => {
    if (!formData.email) { toast.error('Email is required'); return; }
    const result = await sendEmailOTP(formData.email);
    if (result.success) {
      setOtpDestination(formData.email);
      setOtpType('email');
      setShowOTP(true);
    }
  };

  const handlePhoneOTP = async () => {
    if (!formData.phone) { toast.error('Please enter phone number'); return; }
    
    const formattedPhone = formatPhoneNumber(formData.phone);
    
    // Basic validation for international format
    if (!/^\+?[1-9]\d{1,14}$/.test(formattedPhone.replace(/[\s-]/g, ''))) {
      toast.error('Please enter a valid phone number');
      return;
    }
    
    const result = await sendPhoneOTP(formattedPhone);
    if (result.success) {
      setOtpDestination(formattedPhone);
      setOtpType('phone');
      setShowOTP(true);
    }
  };

  const handleVerifyOTP = async (code) => {
    let result;
    if (otpType === 'email') result = await verifyEmailOTP(otpDestination, code);
    else result = await verifyPhoneOTP(otpDestination, code);
    
    if (result.success) { 
      setShowOTP(false); 
      
      // Check if there are more verification steps
      const emailRequired = getEmailVerificationRequired();
      // Phone verification is now optional - no additional steps
      const nextStepIndex = currentVerificationStep + 1;
      
      if (nextStepIndex < verificationSteps.length) {
        setCurrentVerificationStep(nextStepIndex);
        const nextStep = verificationSteps[nextStepIndex];
        
        if (nextStep === 'phone') {
          handlePhoneOTP();
        } else {
          setStep(3); // Move to completion
        }
      } else {
        setStep(3); // All verifications complete
      }
    }
  };

  const handleResendOTP = async () => {
    if (otpType === 'email') await sendEmailOTP(otpDestination);
    else await sendPhoneOTP(otpDestination);
  };

  const handleCaptchaChange = (token) => {
    setCaptchaToken(token);
    if (errors.captcha) setErrors(prev => ({ ...prev, captcha: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step === 1) {
      if (validateStep1()) setStep(2);
    } else if (step === 2) {
      if (validateStep2()) {
        // Wait for settings to load before proceeding
        if (settingsLoading) {
          toast.error('Loading security settings, please wait...');
          return;
        }
        
        // Start verification flow based on admin settings (phone now optional)
        const emailRequired = getEmailVerificationRequired();
        // Phone verification is now optional - proceed with email only
        
        if (!emailRequired) {
          // No verification required, proceed directly to signup
          performSignup();
        } else {
          // Email verification required (phone is optional)
          handleEmailOTP();
        }
      }
    } else {
      // Step 3 - Complete signup
      performSignup();
    }
  };

  const performSignup = async () => {
    setLoading(true);
    
    const signupData = {
      email: formData.email,
      password: formData.password,
      fullName: formData.fullName,
      userType,
      phone: formatPhoneNumber(formData.phone),
      captchaToken,
    };
    if (userType === 'brand') {
      signupData.brandName = formData.brandName;
      signupData.industry = formData.industry;
      signupData.website = formData.website || '';
    } else {
      signupData.displayName = formData.displayName;
      const cleanHandle = formData.handle.startsWith('@') ? formData.handle.substring(1) : formData.handle;
      signupData.handle = cleanHandle;
      signupData.niches = formData.niche ? [formData.niche] : [];
    }
    try {
      const result = await signup(signupData);
      if (result.success) {
        navigate(userType === 'brand' ? '/brand/dashboard' : '/creator/dashboard');
      }
    } catch (error) {
      console.error('Signup error:', error);
      if (captchaRef.current) { captchaRef.current.reset(); setCaptchaToken(null); }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  // Initialize verification steps based on admin settings (phone verification now optional)
  useEffect(() => {
    if (!settingsLoading) {
      const emailRequired = getEmailVerificationRequired();
      // Phone verification is now optional - always include as optional step
      const phoneOptional = true;
      const steps = [];
      
      if (emailRequired) steps.push('email');
      // Phone verification is optional - user can choose to add it
      // Don't automatically add to verification steps
      
      setVerificationSteps(steps);
      setCurrentVerificationStep(0);
      
      console.log('Verification flow initialized:', {
        emailRequired,
        phoneOptional,
        steps,
        securitySettings
      });
    }
  }, [getEmailVerificationRequired, settingsLoading]);

  if (showOTP) {
    const emailRequired = getEmailVerificationRequired();
    const isLastStep = currentVerificationStep >= verificationSteps.length - 1;
    // Phone verification is optional - don't show next button
    const showNextButton = false;
    const nextButtonText = 'Verify';

    return (
      <OTPVerification
        type={otpType}
        destination={otpDestination}
        onVerify={handleVerifyOTP}
        onResend={handleResendOTP}
        onBack={() => setShowOTP(false)}
        loading={authLoading}
        showNextButton={showNextButton}
        nextButtonText={nextButtonText}
        onNextStep={handleVerifyOTP}
      />
    );
  }

  const getSubmitButtonText = () => {
    const emailRequired = getEmailVerificationRequired();
    // Phone verification is now optional - don't check it
    
    if (step === 1) return 'Continue';
    if (step === 2) {
      if (!emailRequired) return 'Go to Dashboard';
      return 'Create Account';
    }
    // Step 3 or any final step should always be "Go to Dashboard"
    return 'Go to Dashboard';
  };

  const getStepLabels = () => {
    const emailRequired = getEmailVerificationRequired();
    // Phone verification is now optional - don't check it
    const baseLabels = ['Account Info', 'Profile Details'];
    
    if (!emailRequired) {
      return baseLabels;
    }
    
    return [...baseLabels, 'Email Verification'];
  };

  const stepLabels = getStepLabels();
  const totalSteps = stepLabels.length;
  const currentStep = showOTP ? step + currentVerificationStep : step;

  return (
    <>
      <div
        className="min-h-screen flex items-center justify-center relative"
        style={{
          background: '#000000',
        }}
      >
        {/* Wireframe Sphere Background Animation */}
        <div className="absolute inset-0 overflow-hidden">
          <WireframeSphere />
        </div>
        
        <motion.div 
          className="relative z-10"
          style={{ maxWidth: '480px', width: '100%', margin: '0 24px' }}
        >
        {/* mobile logo */}
        <div className="flex lg:hidden items-center gap-2 mb-8">
          <div
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: '#1a1a1a',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Shield className="text-white" size={18} />
          </div>
          <span
            style={{
              fontSize: 18, fontWeight: 700,
              color: '#111827',
            }}
          >
            {getPlatformName()}
          </span>
        </div>

        {/* heading */}
        <div className="mb-8">
          <h2
            style={{
              fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px',
              color: '#ffffff', marginBottom: 8,
            }}
          >
            Create Account
          </h2>
          <p style={{ color: '#cccccc', fontSize: 15, lineHeight: 1.5 }}>
            Already have an account?{' '}
            <Link
              to="/login"
              style={{ fontWeight: 700, color: '#ffffff', textDecoration: 'none' }}
              onMouseEnter={(e) => { e.target.style.color = '#cccccc'; }}
              onMouseLeave={(e) => { e.target.style.color = '#ffffff'; }}
            >
              Sign in
            </Link>
          </p>
        </div>

        {/* Step progress bar */}
        <div className="mb-8">
          <div style={{ display: 'flex', gap: 0, marginBottom: 8 }}>
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: 4,
                  background: currentStep >= i + 1 ? '#ffffff' : '#333333',
                  borderRadius: i === 0 ? '10px 0 0 10px' : i === totalSteps - 1 ? '0 10px 10px 0' : '0',
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {stepLabels.map((lbl, i) => (
              <span
                key={lbl}
                style={{
                  fontSize: 11,
                  color: currentStep >= i + 1 ? '#ffffff' : '#cccccc',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.4px',
                }}
              >
                {lbl}
              </span>
            ))}
          </div>
        </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Step 1: Basic Account Information */}
            {step === 1 && (
              <>
                {/* ── Full Name (Full width) ── */}
                <div className="lg:col-span-2">
                  <label
                    style={{
                      display: 'block', fontSize: 13, fontWeight: 600,
                      color: '#ffffff', marginBottom: 8,
                    }}
                  >
                    Full Name
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User
                      size={16}
                      style={{
                        position: 'absolute', left: 14, top: '50%',
                        transform: 'translateY(-50%)',
                        color: errors.fullName ? '#ef4444' : '#9ca3af',
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Enter your full name"
                      value={formData.fullName}
                      name="fullName"
                      onChange={handleChange}
                      style={{
                        width: '100%',
                        padding: '14px 16px 14px 44px',
                        borderRadius: 12,
                        border: `1.5px solid ${errors.fullName ? '#ef4444' : '#333333'}`,
                        background: '#1a1a1a',
                        color: '#ffffff',
                        fontSize: 15,
                        outline: 'none',
                        transition: 'all 0.2s ease',
                        boxSizing: 'border-box',
                      }}
                      onFocus={(e) => { e.target.style.borderColor = '#ffffff'; e.target.style.background = '#000000'; }}
                      onBlur={(e) => { e.target.style.borderColor = errors.fullName ? '#ef4444' : '#333333'; e.target.style.background = '#1a1a1a'; }}
                    />
                  </div>
                  {errors.fullName && (
                    <p style={{ marginTop: 6, fontSize: 12, color: '#ef4444' }}>{errors.fullName}</p>
                  )}
                </div>

                {/* ── Email and Phone (Side by side on desktop) ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Email */}
                  <div>
                    <label
                      style={{
                        display: 'block', fontSize: 13, fontWeight: 600,
                        color: '#ffffff', marginBottom: 8,
                      }}
                    >
                      Email address
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Mail
                        size={16}
                        style={{
                          position: 'absolute', left: 14, top: '50%',
                          transform: 'translateY(-50%)',
                          color: errors.email ? '#ef4444' : '#9ca3af',
                        }}
                      />
                      <input
                        type="email"
                        placeholder="you@example.com"
                        value={formData.email}
                        name="email"
                        onChange={handleChange}
                        style={{
                          width: '100%',
                          padding: '14px 16px 14px 44px',
                          borderRadius: 12,
                          border: `1.5px solid ${errors.email ? '#ef4444' : '#333333'}`,
                          background: '#1a1a1a',
                          color: '#ffffff',
                          fontSize: 15,
                          outline: 'none',
                          transition: 'all 0.2s ease',
                          boxSizing: 'border-box',
                        }}
                        onFocus={(e) => { e.target.style.borderColor = '#ffffff'; e.target.style.background = '#000000'; }}
                        onBlur={(e) => { e.target.style.borderColor = errors.email ? '#ef4444' : '#333333'; e.target.style.background = '#1a1a1a'; }}
                      />
                    </div>
                    {errors.email && (
                      <p style={{ marginTop: 6, fontSize: 12, color: '#ef4444' }}>{errors.email}</p>
                    )}
                  </div>

                  {/* Phone - Always show since phone verification is now optional */}
                  <div>
                    <label
                      style={{
                        display: 'block', fontSize: 13, fontWeight: 600,
                        color: '#ffffff', marginBottom: 8,
                      }}
                    >
                      Phone Number
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Phone
                        size={16}
                        style={{
                          position: 'absolute', left: 14, top: '50%',
                          transform: 'translateY(-50%)',
                          color: '#9ca3af',
                        }}
                      />
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+1 (555) 000-0000"
                        style={{
                          width: '100%',
                          padding: '12px 12px 12px 42px',
                          borderRadius: 12,
                          border: `2px solid ${errors.phone ? '#ef4444' : '#333333'}`,
                          backgroundColor: '#1a1a1a',
                          color: '#ffffff',
                          fontSize: 14,
                          outline: 'none',
                          transition: 'all 0.3s ease',
                          boxSizing: 'border-box',
                        }}
                        onFocus={(e) => { e.target.style.borderColor = '#ffffff'; e.target.style.background = '#000000'; }}
                        onBlur={(e) => { e.target.style.borderColor = '#333333'; e.target.style.background = '#1a1a1a'; }}
                      />
                    </div>
                    {errors.phone && (
                      <p style={{ marginTop: 6, fontSize: 12, color: '#ef4444' }}>{errors.phone}</p>
                    )}
                  </div>
                </div>

                {/* ── Password and Confirm Password (Side by side on desktop) ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Password */}
                  <div>
                    <label
                      style={{
                        display: 'block', fontSize: 13, fontWeight: 600,
                        color: '#ffffff', marginBottom: 8,
                      }}
                    >
                      Password
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Lock
                        size={16}
                        style={{
                          position: 'absolute', left: 14, top: '50%',
                          transform: 'translateY(-50%)',
                          color: errors.password ? '#ef4444' : '#9ca3af',
                        }}
                      />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Create a password"
                        value={formData.password}
                        name="password"
                        onChange={handleChange}
                        style={{
                          width: '100%',
                          padding: '14px 48px 14px 44px',
                          borderRadius: 12,
                          border: `1.5px solid ${errors.password ? '#ef4444' : '#333333'}`,
                          background: '#1a1a1a',
                          color: '#ffffff',
                          fontSize: 15,
                          outline: 'none',
                          transition: 'all 0.2s ease',
                          boxSizing: 'border-box',
                        }}
                        onFocus={(e) => { e.target.style.borderColor = '#ffffff'; e.target.style.background = '#000000'; }}
                        onBlur={(e) => { e.target.style.borderColor = errors.password ? '#ef4444' : '#333333'; e.target.style.background = '#1a1a1a'; }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: 'absolute', right: 16, top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                          color: '#9ca3af',
                        }}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {errors.password && (
                      <p style={{ marginTop: 6, fontSize: 12, color: '#ef4444' }}>{errors.password}</p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label
                      style={{
                        display: 'block', fontSize: 13, fontWeight: 600,
                        color: '#ffffff', marginBottom: 8,
                      }}
                    >
                      Confirm Password
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Lock
                        size={16}
                        style={{
                          position: 'absolute', left: 14, top: '50%',
                          transform: 'translateY(-50%)',
                          color: errors.confirmPassword ? '#ef4444' : '#9ca3af',
                        }}
                      />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm your password"
                        value={formData.confirmPassword}
                        name="confirmPassword"
                        onChange={handleChange}
                        style={{
                          width: '100%',
                          padding: '14px 48px 14px 44px',
                          borderRadius: 12,
                          border: `1.5px solid ${errors.confirmPassword ? '#ef4444' : '#333333'}`,
                          background: '#1a1a1a',
                          color: '#ffffff',
                          fontSize: 15,
                          outline: 'none',
                          transition: 'all 0.2s ease',
                          boxSizing: 'border-box',
                        }}
                        onFocus={(e) => { e.target.style.borderColor = '#ffffff'; e.target.style.background = '#000000'; }}
                        onBlur={(e) => { e.target.style.borderColor = errors.confirmPassword ? '#ef4444' : '#333333'; e.target.style.background = '#1a1a1a'; }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        style={{
                          position: 'absolute', right: 16, top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                          color: '#9ca3af',
                        }}
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p style={{ marginTop: 6, fontSize: 12, color: '#ef4444' }}>{errors.confirmPassword}</p>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Step 2: Profile Details */}
            {step === 2 && (
              <>
                <div>
                  <label
                    style={{
                      display: 'block', fontSize: 12, fontWeight: 700,
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                      color: '#ffffff', marginBottom: 12,
                    }}
                  >
                    Sign up as
                  </label>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {/* Brand */}
                    <button
                      type="button"
                      onClick={() => setUserType('brand')}
                      style={{
                        padding: '20px 16px',
                        borderRadius: 12,
                        border: userType === 'brand'
                          ? '2px solid #ffffff'
                          : '2px solid #333333',
                        background: userType === 'brand'
                          ? '#1a1a1a'
                          : '#000000',
                        cursor: 'pointer',
                        transition: 'all 0.18s ease',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', gap: 10,
                      }}
                    >
                      <div
                        style={{
                          width: 32, height: 32, borderRadius: 10,
                          background: userType === 'brand'
                            ? '#ffffff'
                            : '#333333',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.18s ease',
                        }}
                      >
                        <Building2
                          size={16}
                          style={{ color: userType === 'brand' ? '#000000' : '#ffffff' }}
                        />
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p
                          style={{
                            fontSize: 14, fontWeight: 600,
                            color: userType === 'brand'
                              ? '#ffffff'
                              : '#ffffff',
                          }}
                        >
                          Brand
                        </p>
                        <p style={{ fontSize: 11, color: '#cccccc', marginTop: 2 }}>
                          Find creators
                        </p>
                      </div>
                    </button>

                    {/* Creator */}
                    <button
                      type="button"
                      onClick={() => setUserType('creator')}
                      style={{
                        padding: '20px 16px',
                        borderRadius: 12,
                        border: userType === 'creator'
                          ? '2px solid #ffffff'
                          : '2px solid #333333',
                        background: userType === 'creator'
                          ? '#1a1a1a'
                          : '#000000',
                        cursor: 'pointer',
                        transition: 'all 0.18s ease',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', gap: 10,
                      }}
                    >
                      <div
                        style={{
                          width: 32, height: 32, borderRadius: 10,
                          background: userType === 'creator'
                            ? '#ffffff'
                            : '#333333',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.18s ease',
                        }}
                      >
                        <Sparkles
                          size={18}
                          style={{ color: userType === 'creator' ? '#000000' : '#ffffff' }}
                        />
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p
                          style={{
                            fontSize: 14, fontWeight: 600,
                            color: userType === 'creator'
                              ? '#ffffff'
                              : '#ffffff',
                          }}
                        >
                          Creator
                        </p>
                        <p style={{ fontSize: 11, color: '#cccccc', marginTop: 2 }}>
                          Monetize audience
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

            {/* Brand specific fields */}
                {userType === 'brand' && (
                  <>
                    {/* ── Brand Name and Industry (Side by side on desktop) ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Brand Name */}
                      <div>
                        <label
                          style={{
                            display: 'block', fontSize: 13, fontWeight: 600,
                            color: '#ffffff', marginBottom: 8,
                          }}
                        >
                          Brand Name
                        </label>
                        <input
                          type="text"
                          placeholder="Enter your brand name"
                          value={formData.brandName}
                          name="brandName"
                          onChange={handleChange}
                          style={{
                            width: '100%',
                            padding: '14px 16px',
                            borderRadius: 12,
                            border: `1.5px solid ${errors.brandName ? '#ef4444' : '#333333'}`,
                            background: '#1a1a1a',
                            color: '#ffffff',
                            fontSize: 15,
                            outline: 'none',
                            transition: 'all 0.2s ease',
                            boxSizing: 'border-box',
                          }}
                          onFocus={(e) => { e.target.style.borderColor = '#ffffff'; e.target.style.background = '#000000'; }}
                          onBlur={(e) => { e.target.style.borderColor = errors.brandName ? '#ef4444' : '#333333'; e.target.style.background = '#1a1a1a'; }}
                        />
                        {errors.brandName && (
                          <p style={{ marginTop: 6, fontSize: 12, color: '#ef4444' }}>{errors.brandName}</p>
                        )}
                      </div>

                      {/* Industry */}
         <div style={{ position: 'relative', width: '100%' }}>
  <label
    style={{
      display: 'block',
      fontSize: 13,
      fontWeight: 600,
      color: '#ffffff',
      marginBottom: 8,
    }}
  >
    Industry
  </label>
  
  <div style={{ position: 'relative' }}>
    <select
      value={formData.industry}
      name="industry"
      onChange={handleChange}
      style={{
        width: '100%',
        padding: '14px 16px',
        borderRadius: 12,
        border: `1.5px solid ${errors.industry ? '#ef4444' : '#333333'}`,
        background: '#1a1a1a',
        color: '#ffffff',
        fontSize: 15,
        outline: 'none',
        cursor: 'pointer',
        appearance: 'none',
        WebkitAppearance: 'none',
        MozAppearance: 'none',
        transition: 'all 0.2s ease',
        boxSizing: 'border-box',
      }}
      onFocus={(e) => {
        e.target.style.borderColor = '#ffffff';
        e.target.style.background = '#000000';
      }}
      onBlur={(e) => {
        e.target.style.borderColor = errors.industry ? '#ef4444' : '#333333';
        e.target.style.background = '#1a1a1a';
      }}
    >
      <option value="" style={{ background: '#1a1a1a', color: '#ffffff' }}>Select industry</option>
      {brandIndustries.map((i) => (
        <option key={i.value} value={i.value} style={{ background: '#1a1a1a', color: '#ffffff' }}>
          {i.label}
        </option>
      ))}
    </select>
    <div style={{
      position: 'absolute',
      right: '16px',
      top: '50%',
      transform: 'translateY(-50%)',
      pointerEvents: 'none',
      color: '#9ca3af'
    }}>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2 4L6 8L10 4" />
      </svg>
    </div>
  </div>

  {errors.industry && (
    <p style={{ marginTop: 6, fontSize: 12, color: '#ef4444' }}>{errors.industry}</p>
  )}

</div>
                    </div>

                    {/* ── Website (Full width) ── */}
                    <div>
                      <label
                        style={{
                          display: 'block', fontSize: 13, fontWeight: 600,
                          color: '#ffffff', marginBottom: 8,
                        }}
                      >
                        Website
                      </label>
                      <div style={{ position: 'relative' }}>
                        <Globe
                          size={16}
                          style={{
                            position: 'absolute', left: 14, top: '50%',
                            transform: 'translateY(-50%)',
                            color: '#9ca3af',
                          }}
                        />
                        <input
                          type="url"
                          placeholder="https://www.yourbrand.com"
                          value={formData.website}
                          name="website"
                          onChange={handleChange}
                          style={{
                            width: '100%',
                            padding: '14px 16px 14px 44px',
                            borderRadius: 12,
                            border: '1.5px solid #333333',
                            background: '#1a1a1a',
                            color: '#ffffff',
                            fontSize: 15,
                            outline: 'none',
                            transition: 'all 0.2s ease',
                            boxSizing: 'border-box',
                          }}
                          onFocus={(e) => { e.target.style.borderColor = '#ffffff'; e.target.style.background = '#000000'; }}
                          onBlur={(e) => { e.target.style.borderColor = '#333333'; e.target.style.background = '#1a1a1a'; }}
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Creator specific fields */}
                {userType === 'creator' && (
                  <>
                    {/* ── Display Name and Handle (Side by side on desktop) ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Display Name */}
                      <div>
                        <label
                          style={{
                            display: 'block', fontSize: 13, fontWeight: 600,
                            color: '#ffffff', marginBottom: 8,
                          }}
                        >
                          Display Name
                        </label>
                        <input
                          type="text"
                          placeholder="How should brands address you?"
                          value={formData.displayName}
                          name="displayName"
                          onChange={handleChange}
                          style={{
                            width: '100%',
                            padding: '14px 16px',
                            borderRadius: 12,
                            border: `1.5px solid ${errors.displayName ? '#ef4444' : '#333333'}`,
                            background: '#1a1a1a',
                            color: '#ffffff',
                            fontSize: 15,
                            outline: 'none',
                            transition: 'all 0.2s ease',
                            boxSizing: 'border-box',
                          }}
                          onFocus={(e) => { e.target.style.borderColor = '#ffffff'; e.target.style.background = '#000000'; }}
                          onBlur={(e) => { e.target.style.borderColor = errors.displayName ? '#ef4444' : '#333333'; e.target.style.background = '#1a1a1a'; }}
                        />
                        {errors.displayName && (
                          <p style={{ marginTop: 6, fontSize: 12, color: '#ef4444' }}>{errors.displayName}</p>
                        )}
                      </div>

                      {/* Handle */}
                      <div>
                        <label
                          style={{
                            display: 'block', fontSize: 13, fontWeight: 600,
                            color: '#ffffff', marginBottom: 8,
                          }}
                        >
                          Handle
                        </label>
                        <input
                          type="text"
                          placeholder="username (without @)"
                          value={formData.handle}
                          name="handle"
                          onChange={handleChange}
                          style={{
                            width: '100%',
                            padding: '14px 16px',
                            borderRadius: 12,
                            border: `1.5px solid ${errors.handle ? '#ef4444' : '#333333'}`,
                            background: '#1a1a1a',
                            color: '#ffffff',
                            fontSize: 15,
                            outline: 'none',
                            transition: 'all 0.2s ease',
                            boxSizing: 'border-box',
                          }}
                          onFocus={(e) => { e.target.style.borderColor = '#ffffff'; e.target.style.background = '#000000'; }}
                          onBlur={(e) => { e.target.style.borderColor = errors.handle ? '#ef4444' : '#333333'; e.target.style.background = '#1a1a1a'; }}
                        />
                        {errors.handle && (
                          <p style={{ marginTop: 6, fontSize: 12, color: '#ef4444' }}>{errors.handle}</p>
                        )}
                      </div>
                    </div>

                    {/* ── Primary Niche (Full width) ── */}
                    <div>
                      <label
                        style={{
                          display: 'block', fontSize: 13, fontWeight: 600,
                          color: '#ffffff', marginBottom: 8,
                        }}
                      >
                        Primary Niche
                      </label>
                      <div style={{ position: 'relative' }}>
                        <select
                          value={formData.niche}
                          name="niche"
                          onChange={handleChange}
                          style={{
                            width: '100%',
                            padding: '14px 16px',
                            borderRadius: 12,
                            border: `1.5px solid ${errors.niche ? '#ef4444' : '#333333'}`,
                            background: '#1a1a1a',
                            color: '#ffffff',
                            fontSize: 15,
                            outline: 'none',
                            cursor: 'pointer',
                            appearance: 'none',
                            WebkitAppearance: 'none',
                            MozAppearance: 'none',
                            transition: 'all 0.2s ease',
                            boxSizing: 'border-box',
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = '#ffffff';
                            e.target.style.background = '#000000';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = errors.niche ? '#ef4444' : '#333333';
                            e.target.style.background = '#1a1a1a';
                          }}
                        >
                          <option value="" style={{ background: '#1a1a1a', color: '#ffffff' }}>Select your niche</option>
                          {creatorNiches.map(n => (
                            <option key={n.value} value={n.value} style={{ background: '#1a1a1a', color: '#ffffff' }}>{n.label}</option>
                          ))}
                        </select>
                        <div style={{
                          position: 'absolute',
                          right: '16px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          pointerEvents: 'none',
                          color: '#9ca3af'
                        }}>
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M2 4L6 8L10 4" />
                          </svg>
                        </div>
                      </div>
                      {errors.niche && (
                        <p style={{ marginTop: 6, fontSize: 12, color: '#ef4444' }}>{errors.niche}</p>
                      )}
                    </div>
                  </>
                )}

                {/* ── reCAPTCHA ── */}
                {RECAPTCHA_SITE_KEY ? (
                  <div
                    className="recaptcha-container"
                    style={{
                      padding: '16px 18px',
                      borderRadius: 12,
                      border: `1.5px solid ${errors.captcha ? '#ef4444' : '#333333'}`,
                      background: '#1a1a1a',
                    }}
                  >
                    <ReCAPTCHA
                      ref={captchaRef}
                      sitekey={RECAPTCHA_SITE_KEY}
                      onChange={handleCaptchaChange}
                      theme="dark"
                      size="normal"
                    />
                    {errors.captcha && (
                      <p style={{ marginTop: 8, fontSize: 12, color: '#ef4444' }}>{errors.captcha}</p>
                    )}
                  </div>
                ) : (
                  <div style={{ padding: '12px 16px', background: '#1a1a1a', border: '1.5px solid #333333', borderRadius: 12 }}>
                    <p style={{ fontSize: 12, color: '#9ca3af' }}>⚠️ reCAPTCHA not configured. Set VITE_RECAPTCHA_SITE_KEY in .env</p>
                  </div>
                )}
              </>
            )}

            {step === 3 && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div
                  style={{
                    width: 80, height: 80, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #ffffff, #cccccc)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 18px',
                    boxShadow: '0 8px 24px rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <CheckCircle size={38} color="#ffffff" />
                </div>
                <div
                  style={{
                    fontSize: 20, fontWeight: 700,
                    color: '#ffffff', marginBottom: 10,
                  }}
                >
                  Almost there!
                </div>
                <p style={{ fontSize: 14, color: '#ffffff', lineHeight: 1.6, marginBottom: 14 }}>
                  We've sent a verification code to your email.<br />
                  Please check your inbox and verify your email address.
                </p>
                {formData.phone && (
                  <button
                    type="button"
                    onClick={handlePhoneOTP}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    Also verify phone number (optional)
                  </button>
                )}
              </div>
            )}

           {/* Terms and Conditions */}
           {step === 2 && (
             <div style={{ marginBottom: 16 }}>
               <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
                 <input
                   type="checkbox"
                   required
                   style={{
                     marginTop: 2,
                     width: 16,
                     height: 16,
                     accentColor: '#ffffff',
                     cursor: 'pointer'
                   }}
                 />
                 <span style={{ fontSize: 13, color: '#cccccc', lineHeight: 1.4 }}>
                   I agree to the{' '}
                   <Link 
                     to="/terms" 
                     target="_blank"
                     rel="noopener noreferrer"
                     style={{ color: '#ffffff', textDecoration: 'none', fontWeight: 600 }}
                     onMouseEnter={(e) => { e.target.style.textDecoration = 'underline'; }}
                     onMouseLeave={(e) => { e.target.style.textDecoration = 'none'; }}
                   >
                     Terms of Service
                   </Link>
                   {' '}and{' '}
                   <Link 
                     to="/privacypolicy" 
                     target="_blank"
                     rel="noopener noreferrer"
                     style={{ color: '#ffffff', textDecoration: 'none', fontWeight: 600 }}
                     onMouseEnter={(e) => { e.target.style.textDecoration = 'underline'; }}
                     onMouseLeave={(e) => { e.target.style.textDecoration = 'none'; }}
                   >
                     Privacy Policy
                   </Link>
                 </span>
               </label>
             </div>
           )}

           {/* ── Submit Button ── */}
<button
  type="submit"
  disabled={loading || authLoading || (step === 2 && !captchaToken)}
  style={{
    width: '100%',
    padding: '16px 24px',
    borderRadius: 12,
    border: 'none',
    outline: 'none',
    position: 'relative',
    overflow: 'hidden', // Shimmer effect ke liye zaroori hai
    
    // Background logic
    background: (loading || authLoading || (step === 2 && !captchaToken))
      ? '#333333'
      : 'linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%)',
    
    color: '#000000',
    fontSize: 16,
    fontWeight: 700,
    cursor: (loading || authLoading || (step === 2 && !captchaToken)) ? 'not-allowed' : 'pointer',
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 10,
    
    // Smooth Transitions
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: (loading || authLoading || (step === 2 && !captchaToken)) 
      ? 'none' 
      : '0 4px 12px rgba(0,0,0,0.1)',
    marginTop: 8,
    transform: 'scale(1)',
  }}
  
  // Interactive Animations
  onMouseEnter={(e) => { 
    if (!loading && !authLoading && !(step === 2 && !captchaToken)) {
      e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
      e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)';
      e.currentTarget.style.filter = 'brightness(1.1)';
    }
  }}
  onMouseLeave={(e) => { 
    e.currentTarget.style.transform = 'translateY(0px) scale(1)';
    e.currentTarget.style.boxShadow = (loading || authLoading || (step === 2 && !captchaToken)) 
      ? 'none' 
      : '0 4px 12px rgba(0,0,0,0.1)';
    e.currentTarget.style.filter = 'brightness(1)';
  }}
  onMouseDown={(e) => {
    if (!loading && !authLoading) {
      e.currentTarget.style.transform = 'translateY(0px) scale(0.98)';
    }
  }}
  onMouseUp={(e) => {
    if (!loading && !authLoading) {
      e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
    }
  }}
>
  {loading || authLoading ? (
    <div
      style={{
        width: 22,
        height: 22,
        borderRadius: '50%',
        border: '3px solid rgba(0,0,0,0.1)',
        borderTopColor: '#000',
        animation: 'spin 0.8s cubic-bezier(0.6, 0.2, 0.4, 1) infinite',
      }}
    />
  ) : (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, animation: 'fadeIn 0.3s ease' }}>
      <span>
        {getSubmitButtonText()}
      </span>
      <ArrowRight 
        size={18} 
        style={{ 
          transition: 'transform 0.3s ease',
          transform: 'translateX(0px)' 
        }} 
      />
    </div>
  )}
</button>
            {/* ── Footer links ── */}
            <p style={{ textAlign: 'center', fontSize: 14, color: '#cccccc', marginTop: 16 }}>
              Already have an account?{' '}
              <Link
                to="/login"
                style={{ fontWeight: 700, color: '#ffffff', textDecoration: 'none' }}
                onMouseEnter={(e) => { e.target.style.color = '#cccccc'; }}
                onMouseLeave={(e) => { e.target.style.color = '#ffffff'; }}
              >
                Sign in
              </Link>
            </p>

            <div
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 8, paddingTop: 8,
              }}
            >
              <Shield size={12} style={{ color: '#9ca3af' }} />
              <span style={{ fontSize: 12, color: '#9ca3af' }}>
                Your information is secure and encrypted
              </span>
            </div>

          </form>

        </motion.div>
      </div>
    </>
  );
};

export default Signup;