import React, { useState, useRef, useEffect } from 'react';
import { Mail, Phone, Smartphone, ArrowLeft, ArrowRight, RefreshCw, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import WireframeSphere from '../WireframeSphere';

const OTPVerification = ({ 
  type = 'email',
  destination, 
  onVerify, 
  onResend,
  onBack,
  loading = false,
  showNextButton = false,
  nextButtonText = 'Verify',
  onNextStep = null
}) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCanResend(true);
    }
  }, [timer]);

  const handleChange = (index, value) => {
    if (value.length > 1) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').slice(0, 6);
    if (/^\d+$/.test(pastedData)) {
      const digits = pastedData.split('');
      const newOtp = [...otp];
      digits.forEach((digit, index) => {
        if (index < 6) newOtp[index] = digit;
      });
      setOtp(newOtp);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const otpString = otp.join('');
    if (otpString.length === 6) {
      if (showNextButton && onNextStep) {
        onNextStep(otpString);
      } else {
        onVerify(otpString);
      }
    }
  };

  const handleResend = () => {
    onResend();
    setTimer(60);
    setCanResend(false);
  };

  const getIcon = () => {
    switch(type) {
      case 'email':
        return <Mail className="w-12 h-12 text-white" />;
      case 'phone':
        return <Phone className="w-12 h-12 text-white" />;
      default:
        return <Smartphone className="w-12 h-12 text-white" />;
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative px-4 sm:px-6"
      style={{
        background: '#18181b',
      }}
    >
      {/* Wireframe Sphere Background Animation */}
      <div className="absolute inset-0 overflow-hidden">
        <WireframeSphere />
      </div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full p-4 sm:p-6 md:p-8 relative z-10" 
        style={{ 
          maxWidth: 480, 
           }}
      >
        {/* mobile logo */}
        <motion.div 
          className="flex lg:hidden items-center gap-2 mb-8"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <div
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: '#18181b',
              border: '1px solid #27272a',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Shield className="text-white" size={18} />
          </div>
          <span
            style={{
              fontSize: 18, fontWeight: 700,
              color: '#f4f4f5',
            }}
          >
            InfluenceX
          </span>
        </motion.div>

        {/* heading */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <motion.div 
            className="flex justify-center mb-6"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{
                background: '#18181b',
                border: '1px solid #27272a'
              }}
            >
              {getIcon()}
            </div>
          </motion.div>
          
          <motion.h2
            className="font-['Playfair_Display']"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            style={{
              fontSize: 'clamp(24px, 5vw, 28px)', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 16, textAlign: 'center',
              color: '#f4f4f5'
            }}
          >
            Verify Your {type === 'email' ? 'Email' : 'Phone'}
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            style={{ fontSize: 'clamp(14px, 3vw, 15px)', textAlign: 'center', lineHeight: 1.6, color: '#a1a1aa' }}
          >
            We've sent a verification code to<br />
            <span style={{ color: '#f4f4f5', fontWeight: 600 }}>{destination}</span>
          </motion.p>
        </motion.div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* OTP Inputs */}
            <motion.div 
              className="flex justify-center gap-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              {otp.map((digit, index) => (
                <motion.input
                  key={index}
                  ref={el => inputRefs.current[index] = el}
                  type="text"
                  maxLength="1"
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  disabled={loading}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2, delay: 0.6 + (index * 0.1) }}
                  style={{
                    width: 48,
                    height: 48,
                    textAlign: 'center',
                    fontSize: 20,
                    fontWeight: 600,
                    border: '1.5px solid #27272a',
                    borderRadius: 10,
                    background: '#0f172a',
                    color: '#f4f4f5',
                    outline: 'none',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3f3f46';
                    e.target.style.background = '#0f172a';
                    e.target.style.boxShadow = '0 0 0 3px rgba(63, 63, 70, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#27272a';
                    e.target.style.background = '#0f172a';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              ))}
            </motion.div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={otp.join('').length !== 6 || loading}
              whileHover={{ scale: (otp.join('').length === 6 && !loading) ? 1.02 : 1 }}
              whileTap={{ scale: (otp.join('').length === 6 && !loading) ? 0.98 : 1 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.8 }}
              style={{
                width: '100%',
                padding: '13px 20px',
                borderRadius: 10,
                border: '1px solid #27272a',
                background: (otp.join('').length !== 6 || loading) ? '#0f172a' : '#18181b',
                color: '#f4f4f5',
                fontSize: 15,
                fontWeight: 700,
                cursor: (otp.join('').length !== 6 || loading) ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                letterSpacing: '0.01em',
              }}
              onMouseEnter={(e) => { 
                if (otp.join('').length === 6 && !loading) e.target.style.background = '#27272a'; 
              }}
              onMouseLeave={(e) => { e.target.style.background = '#18181b'; }}
            >
              {loading ? (
                <div
                  style={{
                    width: 20, height: 20, borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.4)',
                    borderTopColor: '#fff',
                    animation: 'spin 0.7s linear infinite',
                  }}
                />
              ) : (
                <>
                  {nextButtonText}
                  <ArrowRight size={17} />
                </>
              )}
            </motion.button>
          </form>

          {/* Resend Code */}
          <motion.div 
            className="mt-6 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.9 }}
          >
            {!canResend ? (
              <p style={{ fontSize: 14, color: '#71717a' }}>
                Resend code in <span style={{ color: '#f4f4f5', fontWeight: 600 }}>{timer}s</span>
              </p>
            ) : (
              <motion.button
                onClick={handleResend}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#f4f4f5',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  margin: '0 auto',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={(e) => { e.target.style.color = '#a1a1aa'; }}
                onMouseLeave={(e) => { e.target.style.color = '#f4f4f5'; }}
              >
                <RefreshCw size={14} />
                Resend Code
              </motion.button>
            )}
          </motion.div>

          {onBack && (
            <motion.button
              onClick={onBack}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 1.0 }}
              style={{
                background: 'none',
                border: 'none',
                color: '#71717a',
                fontSize: 14,
                cursor: 'pointer',
                display: 'block',
                width: '100%',
                textAlign: 'center',
                marginTop: 16,
                transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => { e.target.style.color = '#f4f4f5'; }}
              onMouseLeave={(e) => { e.target.style.color = '#71717a'; }}
            >
              <ArrowLeft size={14} className="inline mr-2" />
              Back to Sign Up
            </motion.button>
          )}

          {/* Security Note */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.1 }}
            style={{
              marginTop: 24,
              padding: '14px 16px',
              borderRadius: 10,
              background: '#0f172a22',
              border: '1.5px solid #27272a',
            }}
          >
            <div className="flex items-start gap-3 ">
              <Shield size={16} style={{ color: '#3b82f6', marginTop: 2 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#f4f4f5', marginBottom: 4 }}>
                  Secure Verification
                </p>
                <p style={{ fontSize: 11, color: '#71717a', lineHeight: 1.5 }}>
                  Your code expires in 10 minutes. Never share this code with anyone.
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 6, paddingTop: 8,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 1.2 }}
          >
            <Shield size={11} style={{ color: '#64748b' }} />
            <span style={{ fontSize: 11, color: '#64748b' }}>
              Your information is secure and encrypted
            </span>
          </motion.div>
      </motion.div>
    </div>
  );
};

export default OTPVerification;