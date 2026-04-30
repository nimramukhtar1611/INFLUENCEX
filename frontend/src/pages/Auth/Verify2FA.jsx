import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Shield, Smartphone, ArrowRight, Loader, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useGlobalSettings } from '../../context/GlobalSettingsContext';
import authService from '../../services/authService';
import WireframeSphere from '../../components/WireframeSphere';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const Verify2FA = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { updateUser, completeLogin } = useAuth();
  const { getSetting } = useGlobalSettings();
  const userId = location.state?.userId;

  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) {
      navigate('/login');
    }
  }, [userId, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (token.length < 6) return;

    setLoading(true);
    setError('');
    try {
      const res = await authService.verify2FALogin(userId, token);
      if (res?.success) {
        // Complete the login flow via context helper
        completeLogin(res.user, res.token, res.refreshToken);
        
        // Wait for state to settle slightly (though navigate should work immediately)
        const userType = res.user.userType || res.user.role;
        
        // Redirect based on user type
        if (userType === 'brand') {
          navigate('/brand/dashboard', { replace: true });
        } else if (userType === 'creator') {
          navigate('/creator/dashboard', { replace: true });
        } else if (userType === 'admin') {
          navigate('/admin/dashboard', { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid verification code');
      setToken('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative px-4 sm:px-6"
      style={{
        background: '#000000',
      }}
    >
      {/* Wireframe Sphere Background Animation */}
      <div className="absolute inset-0 overflow-hidden">
        <WireframeSphere />
      </div>
      
      <motion.div 
        className="relative z-10 w-full max-w-md mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <motion.div 
          className="mb-8 text-center"
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
              className="w-16 h-16 rounded-full flex items-center justify-center bg-zinc-900 border border-slate-800"
            >
              <Shield className="text-white" size={32} />
            </div>
          </motion.div>
          <motion.h2
            className="font-['Playfair_Display'] text-white"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            style={{
              fontSize: 'clamp(24px, 5vw, 28px)', fontWeight: 700, letterSpacing: '-0.02em',
              marginBottom: 8,
            }}
          >
            Two-Factor Authentication
          </motion.h2>
          <motion.p 
            className="text-slate-400" 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            style={{ fontSize: 'clamp(14px, 3vw, 15px)', lineHeight: 1.5 }}
          >
            Please enter 6-digit code from your authenticator app to continue.
          </motion.p>
        </motion.div>
        <motion.form 
          onSubmit={handleSubmit} 
          style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <div>
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  position: 'absolute', left: 14, top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                }}
              >
                <Smartphone size={20} className="text-slate-400" />
              </div>
              <motion.input
                id="token"
                name="token"
                type="text"
                maxLength={6}
                required
                autoFocus
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.7 }}
                style={{
                  width: '100%',
                  padding: '14px 16px 14px 50px',
                  borderRadius: 10,
                  border: `1.5px solid ${error ? '#ef4444' : '#334155'}`,
                  background: '#0f172a',
                  color: '#f8fafc',
                  fontSize: 20,
                  fontWeight: 600,
                  textAlign: 'center',
                  letterSpacing: '1em',
                  outline: 'none',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxSizing: 'border-box',
                }}
                placeholder="000000"
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
                onFocus={(e) => { e.target.style.borderColor = '#475569'; }}
                onBlur={(e) => { e.target.style.borderColor = error ? '#ef4444' : '#334155'; }}
              />
            </div>
            {error && (
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={16} className="text-red-500" />
                <span className="text-red-500" style={{ fontSize: 14 }}>{error}</span>
              </div>
            )}
          </div>

          <motion.button
            type="submit"
            disabled={loading || token.length !== 6}
            whileHover={{ scale: (loading || token.length !== 6) ? 1 : 1.02 }}
            whileTap={{ scale: (loading || token.length !== 6) ? 1 : 0.98 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.8 }}
            style={{
              width: '100%',
              padding: '14px 20px',
              borderRadius: 10,
              border: '1px solid #334155',
              background: (loading || token.length !== 6) ? '#0f172a' : '#1e293b',
              color: '#f8fafc',
              fontSize: 15,
              fontWeight: 700,
              cursor: (loading || token.length !== 6) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              letterSpacing: '0.01em',
            }}
            onMouseEnter={(e) => { if (!loading && token.length === 6) e.target.style.background = '#334155'; }}
            onMouseLeave={(e) => { e.target.style.background = '#1e293b'; }}
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
                Verify & Login
                <ArrowRight size={17} />
              </>
            )}
          </motion.button>
        </motion.form>

        <motion.div 
          style={{ marginTop: 24 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.9 }}
        >
          <button
            onClick={() => navigate('/login')}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              fontSize: 14,
              cursor: 'pointer',
              display: 'block',
              width: '100%',
              textAlign: 'center',
              transition: 'color 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            onMouseEnter={(e) => { e.target.style.color = '#cbd5e1'; }}
            onMouseLeave={(e) => { e.target.style.color = '#94a3b8'; }}
          >
            Cancel and back to login
          </button>
        </motion.div>

        <motion.div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 6, paddingTop: 8,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.0 }}
        >
          <Shield size={11} className="text-slate-500" />
          <span className="text-slate-500" style={{ fontSize: 11 }}>
            Your information is secure and encrypted
          </span>
        </motion.div>

        {/* spin keyframe injected inline */}
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </motion.div>
    </div>
  );
};

export default Verify2FA;
