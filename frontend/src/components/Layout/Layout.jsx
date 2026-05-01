// components/Layout/Layout.js - COMPLETE FIXED VERSION

import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import Loader from '../Common/Loader';
import ProfessionalBackground from '../ProfessionalBackground';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { Menu } from 'lucide-react';

const Layout = ({ userType: propUserType }) => {
  const { user, loading } = useAuth();
  const { theme, sidebarCollapsed } = useTheme();
  const isDark = theme === 'dark';
  const location = useLocation();
  const [currentUserType, setCurrentUserType] = useState(null);
const columns = 30; 
const rows = 30;
const spacing = 0.8;
  // Pages where sidebar should not be displayed
  const noSidebarPages = ['/login', '/register', '/pricing', '/forgot-password', '/reset-password'];
  const shouldShowSidebar = !noSidebarPages.some(path => location.pathname.startsWith(path));

  useEffect(() => {
    console.log('📊 Layout State:', {
      userFromAuth: user,
      userFromStorage: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null,
      token: !!localStorage.getItem('token'),
      currentUserType,
      shouldShowSidebar,
      currentPath: location.pathname
    });
  }, [user, currentUserType, shouldShowSidebar, location.pathname]);

  useEffect(() => {
    // Determine user type from props, auth context, or URL path
    if (propUserType) {
      setCurrentUserType(propUserType);
    } else if (user?.userType) {
      setCurrentUserType(user.userType);
    } else {
      // Fallback to URL path
      const path = location.pathname;
      if (path.startsWith('/admin')) {
        setCurrentUserType('admin');
      } else if (path.startsWith('/brand')) {
        setCurrentUserType('brand');
      } else if (path.startsWith('/creator')) {
        setCurrentUserType('creator');
      }
    }
  }, [propUserType, user, location]);

  

  // Debug log to check what user type is being used
  console.log('Layout - Current User Type:', currentUserType);
  console.log('Layout - User from auth:', user);

  return (
    <div className={`flex h-screen ${isDark ? 'bg-zinc-950': 'bg-zinc-50'} relative overflow-hidden`}>
      {shouldShowSidebar && <Sidebar userType={currentUserType} />}
      
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${shouldShowSidebar ? (sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64') : 'ml-0'} relative`} id="main-content">
        
        {/* ADD THIS: Mobile Header */}
        {shouldShowSidebar && (
          <div className="lg:hidden flex items-center p-4 border-b sticky top-0 z-40 bg-inherit" 
               style={{ borderColor: isDark ? '#262626' : '#E5E5E5' }}>
            <button 
              onClick={() => document.dispatchEvent(new CustomEvent('open-mobile-menu'))}
              className="p-2 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
            >
              <Menu className="w-6 h-6" style={{ color: isDark ? '#FFFFFF' : '#0F0F0F' }} />
            </button>
            <span className="ml-3 font-bold text-sm tracking-tight" style={{ color: isDark ? '#FFFFFF' : '#0F0F0F' }}>
              IX PANEL
            </span>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 relative">
          {/* Neural Network Background */}
          <div className="absolute inset-0 pointer-events-none z-0">
            <Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
              <ProfessionalBackground isDarkMode={isDark} />
            </Canvas>
          </div>
          
          <div className="relative z-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
