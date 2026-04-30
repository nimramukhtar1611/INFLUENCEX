// AdminLogin.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Eye, EyeOff, Shield, Settings, Database, BarChart } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useGlobalSettings } from '../../context/GlobalSettingsContext';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import WireframeSphere from '../../components/WireframeSphere';

const AdminLogin = () => {
  const { getPlatformName } = useGlobalSettings();
  const { loginAdmin, isAuthenticated, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already authenticated as admin
    const role = user?.userType || user?.role;
    const isAdmin = role === 'admin' || role === 'super_admin';

    if (!authLoading && isAuthenticated && isAdmin) {
      console.log('Admin already authenticated, redirecting to dashboard');
      navigate('/admin/dashboard', { replace: true });
    }
  }, [isAuthenticated, user, authLoading, navigate]);

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email';
    if (!formData.password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    const result = await loginAdmin(formData.email, formData.password);
    
    if (result?.require2FA) {
      setShow2FA(true);
    } else if (result?.success) {
      // Navigation will be handled by the useEffect above
      console.log('Login successful, waiting for redirect...');
    }
    setLoading(false);
  };

  const handle2FASubmit = async (e) => {
    e.preventDefault();
    if (twoFactorCode.length !== 6) {
      toast.error('Enter a valid 6-digit code');
      return;
    }
    setLoading(true);

    const result = await loginAdmin(formData.email, formData.password, twoFactorCode);
    if (result?.success) {
      // Navigation will be handled by the useEffect above
      console.log('2FA verification successful, waiting for redirect...');
      toast.success('2FA verification successful!');
    }
    setLoading(false);
  };

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
              Admin Sign In
            </h2>
            <p style={{ color: '#cccccc', fontSize: 15, lineHeight: 1.5 }}>
              Enter your admin credentials to access the control panel
            </p>
          </div>

          {!show2FA ? (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

              {/* ── Email ── */}
              <div>
                <label
                  style={{
                    display: 'block', fontSize: 13, fontWeight: 600,
                    color: '#ffffff', marginBottom: 8,
                  }}
                >
                  Admin email address
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
                    placeholder="admin@influencex.com"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value });
                      if (errors.email) setErrors({ ...errors, email: null });
                    }}
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

              {/* ── Password ── */}
              <div>
                <label
                  style={{
                    display: 'block', fontSize: 13, fontWeight: 600,
                    color: '#ffffff', marginBottom: 8,
                  }}
                >
                  Admin password
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
                    placeholder="Enter admin password"
                    value={formData.password}
                    onChange={(e) => {
                      setFormData({ ...formData, password: e.target.value });
                      if (errors.password) setErrors({ ...errors, password: null });
                    }}
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

              {/* ── Submit ── */}
              <button
                type="submit"
                disabled={loading || authLoading}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  borderRadius: 12,
                  border: '1.5px solid #333333',
                  background: (loading || authLoading)
                    ? '#1a1a1a'
                    : '#333333',
                  color: '#ffffff',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: (loading || authLoading) ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'all 0.2s ease',
                  letterSpacing: '0.01em',
                }}
                onMouseEnter={(e) => { if (!loading && !authLoading) e.target.style.background = '#404040'; e.target.style.borderColor = '#ffffff'; }}
                onMouseLeave={(e) => { e.target.style.background = '#333333'; e.target.style.borderColor = '#333333'; }}
              >
                {loading || authLoading ? (
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
                    Sign In as Admin
                    <ArrowRight size={17} />
                  </>
                )}
              </button>

              {/* ── Footer links ── */}
              <div style={{ textAlign: 'center' }}>
                <Link
                  to="/login"
                  style={{
                    fontSize: 12, color: '#cccccc',
                    textDecoration: 'none', transition: 'color 0.15s',
                  }}
                  onMouseEnter={(e) => { e.target.style.color = '#ffffff'; }}
                  onMouseLeave={(e) => { e.target.style.color = '#cccccc'; }}
                >
                  ← Back to User Login
                </Link>
              </div>

              <div
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 6, paddingTop: 4,
                }}
              >
                <Shield size={11} style={{ color: '#cccccc' }} />
                <span style={{ fontSize: 11, color: '#cccccc' }}>
                  Administrative access is monitored and logged
                </span>
              </div>

            </form>
          ) : (
            <form onSubmit={handle2FASubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div
                style={{
                  padding: '16px 20px',
                  borderRadius: 12,
                  border: '1.5px solid #333333',
                  background: '#1a1a1a',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <Shield size={15} style={{ color: '#ffffff' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#ffffff' }}>
                    2FA Verification Required
                  </span>
                </div>
                <p style={{ fontSize: 12, color: '#cccccc', lineHeight: 1.5 }}>
                  Enter the 6-digit code from your authenticator app to complete admin authentication.
                </p>
              </div>

              <div>
                <label
                  style={{
                    display: 'block', fontSize: 14, fontWeight: 600,
                    color: '#ffffff', marginBottom: 8,
                  }}
                >
                  Authentication Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: 12,
                    border: '1.5px solid #333333',
                    background: '#1a1a1a',
                    color: '#ffffff',
                    fontSize: 20,
                    fontWeight: 600,
                    textAlign: 'center',
                    letterSpacing: '0.1em',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#ffffff'; e.target.style.background = '#000000'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#333333'; e.target.style.background = '#1a1a1a'; }}
                />
              </div>

              <button
                type="submit"
                disabled={loading || authLoading || twoFactorCode.length !== 6}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  borderRadius: 12,
                  border: '1.5px solid #333333',
                  background: (loading || authLoading || twoFactorCode.length !== 6)
                    ? '#1a1a1a'
                    : '#333333',
                  color: '#ffffff',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: (loading || authLoading || twoFactorCode.length !== 6) ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'all 0.2s ease',
                  letterSpacing: '0.01em',
                }}
                onMouseEnter={(e) => { if (!loading && !authLoading && twoFactorCode.length === 6) e.target.style.background = '#404040'; e.target.style.borderColor = '#ffffff'; }}
                onMouseLeave={(e) => { e.target.style.background = '#333333'; e.target.style.borderColor = '#333333'; }}
              >
                {loading || authLoading ? (
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
                    Verify & Login
                    <ArrowRight size={17} />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShow2FA(false);
                  setTwoFactorCode('');
                }}
                style={{
                  padding: '10px',
                  background: 'none',
                  border: 'none',
                  color: '#cccccc',
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={(e) => { e.target.style.color = '#ffffff'; }}
                onMouseLeave={(e) => { e.target.style.color = '#cccccc'; }}
              >
                ← Back to Login
              </button>
            </form>
          )}
      </motion.div>
      </div>
    </>
  );
};

export default AdminLogin;