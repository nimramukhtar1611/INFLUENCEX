import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Send, Shield } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import WireframeSphere from '../../components/WireframeSphere';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const { forgotPassword, loading } = useAuth();
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Invalid email';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    const result = await forgotPassword(email);
    if (result.success) {
      setSubmitted(true);
      toast.success('Reset link sent successfully!');
    }
  };

  if (submitted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center relative"
        style={{
          background: '#18181b',
        }}
      >
        {/* Wireframe Sphere Background Animation */}
        <div className="absolute inset-0 overflow-hidden">
          <WireframeSphere />
        </div>
        
        <motion.div 
          className="relative z-10"
        >
            {/* success content */}
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{
                  background: '#27272a',
                  border: '1px solid #3f3f46'
                }}
              >
                <Send className="text-white" size={24} />
              </div>
              
              <h2
                className="font-['Playfair_Display']"
                style={{
                  fontSize: 'clamp(24px, 5vw, 28px)', fontWeight: 700, letterSpacing: '-0.02em',
                  color: '#f4f4f5', marginBottom: 12,
                }}
              >
                Check Your Email
              </h2>
              
              <p style={{ color: '#a1a1aa', fontSize: 'clamp(14px, 3vw, 15px)', marginBottom: 24, lineHeight: 1.6 }}>
                We've sent a password reset link to<br />
                <strong style={{ color: '#f4f4f5' }}>{email}</strong>
              </p>

              <p style={{ color: '#71717a', fontSize: 'clamp(12px, 2.5vw, 13px)', marginBottom: 32 }}>
                Didn't receive email? Check your spam folder or{' '}
                <button 
                  onClick={() => setSubmitted(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#f4f4f5',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  try again
                </button>
              </p>

              <Link
                to="/login"
                className="inline-flex items-center justify-center w-full py-3 px-4 rounded-lg font-medium transition-all"
                style={{
                  background: '#27272a',
                  color: '#f4f4f5',
                  textDecoration: 'none',
                  border: '1px solid #3f3f46'
                }}
                onMouseEnter={(e) => { e.target.style.background = '#3f3f46'; }}
                onMouseLeave={(e) => { e.target.style.background = '#27272a'; }}
              >
                <ArrowLeft size={16} className="mr-2" />
                Back to Login
              </Link>
            </div>
      </motion.div>
    </div>
    );
  }

  return (
    <>
      <div
        className="min-h-screen flex items-center justify-center relative"
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
            {/* heading */}
            <div className="mb-8">
              <h2
                className="font-['Playfair_Display']"
                style={{
                  fontSize: 'clamp(24px, 5vw, 28px)', fontWeight: 700, letterSpacing: '-0.02em',
                  color: '#f4f4f5', marginBottom: 8,
                }}
              >
                Forgot password?
              </h2>
              <p style={{ color: '#a1a1aa', fontSize: 'clamp(14px, 3vw, 15px)', lineHeight: 1.5 }}>
                Enter your email address and we'll send you a link to reset your password.
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Email */}
              <div>
                <label
                  style={{
                    display: 'block', fontSize: 14, fontWeight: 600,
                    color: '#f4f4f5', marginBottom: 8,
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
                      color: errors.email ? '#ef4444' : '#71717a',
                    }}
                  />
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors({ ...errors, email: null });
                    }}
                    style={{
                      width: '100%',
                      padding: '14px 16px 14px 42px',
                      borderRadius: 10,
                      border: `1.5px solid ${errors.email ? '#ef4444' : '#27272a'}`,
                      background: '#0f172a',
                      color: '#f4f4f5',
                      fontSize: 14,
                      outline: 'none',
                      transition: 'all 0.15s',
                      boxSizing: 'border-box',
                    }}
                    onFocus={(e) => { e.target.style.borderColor = '#3f3f46'; e.target.style.background = '#0f172a'; }}
                    onBlur={(e) => { e.target.style.borderColor = errors.email ? '#ef4444' : '#27272a'; e.target.style.background = '#0f172a'; }}
                  />
                </div>
                {errors.email && (
                  <p style={{ marginTop: 5, fontSize: 12, color: '#ef4444' }}>{errors.email}</p>
                )}
              </div>

              {/* Submit */}
            <button
  type="submit"
  disabled={loading}
  style={{
    width: '100%',
    padding: '14px 20px',
    borderRadius: 10,
    border: '1px solid #27272a',
    
    // Background & Text
    background: loading ? '#0f172a' : '#18181b',
    color: '#f4f4f5',
    fontSize: 15,
    fontWeight: 700,
    cursor: loading ? 'not-allowed' : 'pointer',
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 8,
    
    // Smooth Transitions
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    letterSpacing: '0.01em',
    outline: 'none',
    boxShadow: loading ? 'none' : '0 4px 6px rgba(0,0,0,0.3)',
    transform: 'translateY(0)',
  }}
  onMouseEnter={(e) => { 
    if (!loading) {
      e.currentTarget.style.background = '#27272a';
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = '0 6px 15px rgba(0,0,0,0.4)';
    }
  }}
  onMouseLeave={(e) => { 
    if (!loading) {
      e.currentTarget.style.background = '#18181b';
      e.currentTarget.style.transform = 'translateY(0px)';
      e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';
    }
  }}
  onMouseDown={(e) => {
    if (!loading) {
      e.currentTarget.style.transform = 'scale(0.96) translateY(0px)'; // Click par niche dabega
    }
  }}
  onMouseUp={(e) => {
    if (!loading) {
      e.currentTarget.style.transform = 'scale(1) translateY(-2px)';
    }
  }}
>
  {loading ? (
    <div
      style={{
        width: 20, height: 20, borderRadius: '50%',
        border: '2px solid rgba(255,255,255,0.2)',
        borderTopColor: '#fff',
        animation: 'spin 0.7s linear infinite',
      }}
    />
  ) : (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: 10, 
      animation: 'fadeIn 0.3s ease-out' 
    }}>
      Send Reset Link
      <Send 
        size={17} 
        style={{ 
          transition: 'transform 0.3s ease',
        }} 
      />
    </div>
  )}
</button>
            </form>

            {/* Footer links */}
            <div className="mt-6 text-center">
              <div style={{ textAlign: 'center', marginTop: 24 }}>
                <span style={{ fontSize: 13, color: '#71717a' }}>
                  Remember your password?{' '}
                </span>
                <Link
                  to="/login"
                  style={{
                    fontSize: 13, fontWeight: 600,
                    color: '#f4f4f5', textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => { e.target.style.color = '#a1a1aa'; }}
                  onMouseLeave={(e) => { e.target.style.color = '#f4f4f5'; }}
                >
                  Sign in
                </Link>
              </div>
              
              <Link
                to="/login"
                className="inline-flex items-center"
                style={{
                  fontSize: 12, color: '#71717a', fontWeight: 600,
                  textDecoration: 'none', transition: 'color 0.15s',
                }}
                onMouseEnter={(e) => { e.target.style.color = '#f4f4f5'; }}
                onMouseLeave={(e) => { e.target.style.color = '#71717a'; }}
              >
                <ArrowLeft size={16} className="mr-2" />
                Back to Login
              </Link>
            </div>

            <div
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 6, paddingTop: 8,
              }}
            >
              <Shield size={11} style={{ color: '#64748b' }} />
              <span style={{ fontSize: 11, color: '#64748b' }}>
                Your information is secure and encrypted
              </span>
            </div>
      </motion.div>

        {/* spin keyframe injected inline */}
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          input::placeholder { color: #9ca3af; }
        `}</style>
      </div>
    </>
    );
};

export default ForgotPassword;