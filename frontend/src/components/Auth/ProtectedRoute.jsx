import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Enhanced loading state with timeout to prevent infinite loading
  const [isLoading, setIsLoading] = useState(true);
  const [hasTimedOut, setHasTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        console.warn('Auth loading timed out after 5 seconds');
        setHasTimedOut(true);
      }
    }, 5000); // 5 second timeout

    if (!loading) {
      setIsLoading(false);
      clearTimeout(timer);
    }

    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log('Not authenticated, redirecting...');
    }
  }, [isLoading, isAuthenticated]);

  // Show loading state while auth is being determined (unless timed out)
  if (isLoading && !hasTimedOut) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If timed out and still loading, check localStorage for fallback
  if (hasTimedOut && loading) {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
      // Fallback to localStorage data if API is slow
      try {
        const parsedUser = JSON.parse(user);
        return children;
      } catch (error) {
        console.error('Failed to parse user from localStorage:', error);
      }
    }
  }

  if (!isAuthenticated || !user) {
    const isAdminPath = location.pathname.startsWith('/admin');
    return <Navigate to={isAdminPath ? '/admin/login' : '/login'} state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0) {
    const userRole = user.userType || user.role;
    const hasAccess = allowedRoles.some(role => {
      if (role === 'admin') return userRole === 'admin' || userRole === 'super_admin';
      return role === userRole;
    });
    if (!hasAccess) {
      if (userRole === 'admin' || userRole === 'super_admin') return <Navigate to="/admin/dashboard" replace />;
      if (userRole === 'brand') return <Navigate to="/brand/dashboard" replace />;
      if (userRole === 'creator') return <Navigate to="/creator/dashboard" replace />;
      return <Navigate to="/" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;