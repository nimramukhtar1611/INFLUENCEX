import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader, Mail, ArrowLeft, Phone } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useGlobalSettings } from '../../context/GlobalSettingsContext';
import { motion } from 'framer-motion';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { verifyEmail, sendVerificationEmail } = useAuth();
  const { getVerificationFlow } = useGlobalSettings();
  
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const [resendDisabled, setResendDisabled] = useState(false);
  const [timer, setTimer] = useState(60);

  useEffect(() => {
    if (token) {
      verifyEmailToken();
    }
  }, [token]);

  useEffect(() => {
    if (resendDisabled && timer > 0) {
      const interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else if (timer === 0) {
      setResendDisabled(false);
    }
  }, [resendDisabled, timer, setInterval]);

  const verifyEmailToken = async () => {
    const result = await verifyEmail(token);
    if (result.success) {
      setStatus('success');
      setMessage('Your email has been verified successfully!');
      
      // Get verification flow settings
      const verificationFlow = getVerificationFlow();
      
      setTimeout(() => {
        if (verificationFlow.phoneRequired) {
          // Phone verification also required, redirect to signup with phone verification step
          navigate('/signup?step=phone');
        } else {
          // Email verification complete, redirect to login
          navigate('/login');
        }
      }, 3000);
    } else {
      setStatus('error');
      setMessage(result.error || 'Failed to verify email. The link may be expired.');
    }
  };

  const handleResend = async () => {
    setResendDisabled(true);
    setTimer(60);
    const result = await sendVerificationEmail();
    if (result.success) {
      setStatus('info');
      setMessage('Verification email sent! Please check your inbox.');
    } else {
      setStatus('error');
      setMessage(result.error || 'Failed to send verification email.');
    }
  };

  const renderContent = () => {
    switch(status) {
      case 'loading':
        return (
          <div className="text-center">
            <motion.div 
              className="flex justify-center mb-8"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Loader className="w-16 h-16 text-white animate-spin" />
            </motion.div>
            <motion.h2 
              className="font-['Playfair_Display'] text-white" 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              style={{ fontSize: 'clamp(24px, 5vw, 28px)', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 16 }}
            >Verifying Email...</motion.h2>
            <motion.p 
              className="text-slate-400" 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              style={{ fontSize: 'clamp(14px, 3vw, 15px)' }}
            >Please wait while we verify your email address.</motion.p>
          </div>
        );

      case 'success':
        return (
          <div className="text-center">
            <motion.div 
              className="flex justify-center mb-8"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="w-20 h-20 rounded-full flex items-center justify-center bg-zinc-900 border border-slate-800">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.4 }}
                >
                  <CheckCircle className="w-10 h-10 text-white" />
                </motion.div>
              </div>
            </motion.div>
            <motion.h2 
              className="font-['Playfair_Display'] text-white" 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              style={{ fontSize: 'clamp(24px, 5vw, 28px)', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 16 }}
            >Email Verified!</motion.h2>
            <motion.p 
              className="text-slate-400" 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              style={{ fontSize: 'clamp(14px, 3vw, 15px)', marginBottom: 32 }}
            >{message}</motion.p>
            <motion.p 
              className="text-slate-500" 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              style={{ fontSize: 13 }}
            >
              {getVerificationFlow().phoneRequired ? 'Redirecting to phone verification...' : 'Redirecting to login...'}
            </motion.p>
          </div>
        );

      case 'error':
        return (
          <div className="text-center">
            <motion.div 
              className="flex justify-center mb-8"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="w-20 h-20 rounded-full flex items-center justify-center bg-zinc-900 border border-slate-800">
                <XCircle className="w-10 h-10 text-white" />
              </div>
            </motion.div>
            <motion.h2 
              className="font-['Playfair_Display'] text-white" 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              style={{ fontSize: 'clamp(24px, 5vw, 28px)', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 16 }}
            >Verification Failed</motion.h2>
            <motion.p 
              className="text-slate-400" 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              style={{ fontSize: 'clamp(14px, 3vw, 15px)', marginBottom: 32 }}
            >{message}</motion.p>
            <motion.div 
              style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <motion.button
                onClick={handleResend}
                disabled={resendDisabled}
                whileHover={{ scale: resendDisabled ? 1 : 1.02 }}
                whileTap={{ scale: resendDisabled ? 1 : 0.98 }}
                style={{
                  width: '100%',
                  padding: '12px 24px',
                  borderRadius: 8,
                  border: '1px solid #334155',
                  background: resendDisabled ? '#18181b' : '#1e293b',
                  color: '#f8fafc',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: resendDisabled ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                {resendDisabled ? `Resend in ${timer}s` : 'Resend email'}
              </motion.button>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link
                  to="/"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    color: '#f8fafc',
                    fontSize: 14,
                    fontWeight: 600,
                    textDecoration: 'none',
                    transition: 'color 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Return to Site
                </Link>
              </motion.div>
            </motion.div>
          </div>
        );

      case 'info':
        return (
          <div className="text-center">
            <motion.div 
              className="flex justify-center mb-8"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="w-20 h-20 rounded-full flex items-center justify-center bg-zinc-900 border border-slate-800">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
            </motion.div>
            <motion.h2 
              className="font-['Playfair_Display'] text-white" 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              style={{ fontSize: 'clamp(24px, 5vw, 28px)', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 16 }}
            >Email Sent!</motion.h2>
            <motion.p 
              className="text-slate-400" 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              style={{ fontSize: 'clamp(14px, 3vw, 15px)', marginBottom: 32 }}
            >{message}</motion.p>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <Link
                to="/"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  color: '#f8fafc',
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: 'none',
                  transition: 'color 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Return to Site
              </Link>
            </motion.div>
          </div>
        );

      default:
        return (
          <div className="text-center">
            <motion.div 
              className="flex justify-center mb-8"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="w-20 h-20 rounded-full flex items-center justify-center bg-zinc-900 border border-slate-800">
                <Mail className="w-10 h-10 text-white" />
              </div>
            </motion.div>
            <motion.h2 
              className="font-['Playfair_Display'] text-white" 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              style={{ fontSize: 'clamp(24px, 5vw, 28px)', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 16 }}
            >Verify your email address</motion.h2>
            <motion.p 
              className="text-slate-400" 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              style={{ fontSize: 'clamp(14px, 3vw, 15px)', marginBottom: 8 }}
            >
              We have sent a verification link to <span className="text-white font-semibold">[[user.email_to_verify]]</span>
            </motion.p>
            <motion.p 
              className="text-slate-500" 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              style={{ fontSize: 13, marginBottom: 32 }}
            >
              If you do not see the email, check your spam folder.
            </motion.p>
            <motion.div 
              style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <motion.button
                onClick={handleResend}
                disabled={resendDisabled}
                whileHover={{ scale: resendDisabled ? 1 : 1.02 }}
                whileTap={{ scale: resendDisabled ? 1 : 0.98 }}
                style={{
                  width: '100%',
                  padding: '12px 24px',
                  borderRadius: 8,
                  border: '1px solid #334155',
                  background: resendDisabled ? '#18181b' : '#1e293b',
                  color: '#f8fafc',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: resendDisabled ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                {resendDisabled ? `Resend in ${timer}s` : 'Resend email'}
              </motion.button>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link
                  to="/"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    color: '#f8fafc',
                    fontSize: 14,
                    fontWeight: 600,
                    textDecoration: 'none',
                    transition: 'color 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Return to Site
                </Link>
              </motion.div>
            </motion.div>
            <motion.p 
              className="text-slate-600" 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.7 }}
              style={{ fontSize: 11, marginTop: 32 }}
            >
              You can reach us at if you have any questions
            </motion.p>
          </div>
        );
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative px-4 sm:px-6"
      style={{
        background: '#000000',
      }}
    >
      <motion.div 
        className="relative z-10 w-full max-w-md mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {renderContent()}
      </motion.div>
    </div>
  );
};

export default VerifyEmail;
