// components/Layout/Sidebar.js

import React, { useState, useEffect } from 'react';

import { NavLink, Link, useLocation } from 'react-router-dom';

import {

  LayoutDashboard, Users, Megaphone, Handshake,

  BarChart3, Wallet, Settings, Bell, MessageSquare,

  Search, UserCircle, Home, LogOut, FileText,

  Shield, Award, Lightbulb, Star, AlertCircle,

  DollarSign, Menu, X, Moon, Sun

} from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';

import { useTheme } from '../../hooks/useTheme';

import { useSubscription } from '../../context/SubscriptionContext';



const normalizePlanId = (value) => {

  if (!value) return '';

  if (typeof value === 'string') return value.trim().toLowerCase();

  if (typeof value.planId === 'string') return value.planId.trim().toLowerCase();

  if (typeof value.id === 'string') return value.id.trim().toLowerCase();

  return '';

};



const Sidebar = ({ userType: propUserType }) => {

  const { user, logout } = useAuth();

  const { theme, toggleTheme } = useTheme();

  const { currentSubscription } = useSubscription();

  const isDark = theme === 'dark';

  const location = useLocation();

  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const [showUserMenu, setShowUserMenu] = useState(false);

useEffect(() => {
  const handleOpen = () => setIsMobileOpen(true);
  document.addEventListener('open-mobile-menu', handleOpen);
  return () => document.removeEventListener('open-mobile-menu', handleOpen);
}, []);

  const currentPlanId = normalizePlanId(currentSubscription?.planId || currentSubscription?.plan || currentSubscription);

  const canAccessGrowthOS = ['professional', 'enterprise'].includes(currentPlanId);



  const currentUserType = propUserType || user?.userType ||

    (location.pathname.startsWith('/admin') ? 'admin' :

      location.pathname.startsWith('/brand') ? 'brand' :

        location.pathname.startsWith('/creator') ? 'creator' : null);



  const getNavItems = () => {

    const commonItems = [
      { to: '/', icon: Home, label: 'Home', exact: true },
    ];

    const brandItems = [

      { to: '/brand/dashboard', icon: LayoutDashboard, label: 'Dashboard' },

      { to: '/brand/campaigns', icon: Megaphone, label: 'Campaigns' },

      { to: '/brand/search', icon: Search, label: 'Find Creators' },

      { to: '/brand/deals', icon: Handshake, label: 'Deals' },

      { to: '/brand/payments', icon: Wallet, label: 'Payments' },

      { to: '/brand/subscription', icon: DollarSign, label: 'Subscription' },

      { to: '/brand/inbox', icon: MessageSquare, label: 'Inbox' },

      { to: '/brand/notifications', icon: Bell, label: 'Notifications' },

      { to: '/brand/settings', icon: Settings, label: 'Settings' }

    ];

    const creatorItems = [

      { to: '/creator/dashboard', icon: LayoutDashboard, label: 'Dashboard' },

      { to: '/creator/available-deals', icon: Search, label: 'Find Deals' },

      { to: '/creator/deals', icon: Handshake, label: 'My Deals' },

      ...(canAccessGrowthOS ? [{ to: '/creator/growth-os', icon: Lightbulb, label: 'Growth OS' }] : []),

      { to: '/creator/earnings', icon: Wallet, label: 'Earnings' },

      { to: '/creator/subscription', icon: DollarSign, label: 'Subscription' },

      { to: '/creator/inbox', icon: MessageSquare, label: 'Inbox' },

      { to: '/creator/notifications', icon: Bell, label: 'Notifications' },

      { to: '/creator/settings', icon: Settings, label: 'Settings' }

    ];

    const adminItems = [

      { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },

      { to: '/admin/users', icon: Users, label: 'Users' },

      { to: '/admin/brands', icon: Award, label: 'Brands' },

      { to: '/admin/creators', icon: Star, label: 'Creators' },

      { to: '/admin/campaigns', icon: Megaphone, label: 'Campaigns' },

      { to: '/admin/deals', icon: Handshake, label: 'Deals' },

      { to: '/admin/payments', icon: Wallet, label: 'Payments' },

      { to: '/admin/reports', icon: BarChart3, label: 'Reports' },

      { to: '/admin/fraud-review', icon: Shield, label: 'Fraud Review' },

      { to: '/admin/disputes', icon: AlertCircle, label: 'Disputes' },

      { to: '/admin/settings', icon: Settings, label: 'Settings' }

    ];



    if (currentUserType === 'brand') return [...commonItems, ...brandItems];

    if (currentUserType === 'creator') return [...commonItems, ...creatorItems];

    if (currentUserType === 'admin') return [...commonItems, ...adminItems];

    return commonItems;

  };



  const navItems = getNavItems();



  const sidebarBg = isDark ? '#000000' : '#FFFFFF';

  const borderColor = isDark ? '#262626' : '#E5E5E5';

  const textColor = isDark ? '#FFFFFF' : '#0F0F0F';

  const subTextColor = isDark ? '#A3A3A3' : '#737373';

  const hoverBg = isDark ? '#1A1A1A' : '#F5F5F5';



  const SidebarContent = () => (

    <div className="h-full flex flex-col overflow-hidden">

      {/* Logo Section */}

      <div className="p-6 h-[72px] flex items-center flex-shrink-0">

        <Link to="/" className="flex items-center gap-3">

          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? 'bg-white' : 'bg-black'}`}>

            <span className={`font-black text-medium  text-white`}>IX</span>

          </div>

      

        </Link>

      </div>



      {/* Navigation */}

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar">

        {navItems.map((item) => (

          <NavLink

            key={item.to}

            to={item.to}

            end={item.exact}

            onClick={() => setIsMobileOpen(false)}

            className={({ isActive }) => `

              flex items-center px-4 py-2.5 rounded-xl transition-all duration-200 group

              ${isActive ? '' : 'hover:bg-opacity-100'}

            `}

            style={({ isActive }) => ({

              background: isActive ? hoverBg : 'transparent',

              color: isActive ? textColor : subTextColor,

            })}

          >

            <item.icon className={`w-5 h-5 mr-3 flex-shrink-0 ${isDark ? 'group-hover:text-white' : 'group-hover:text-black'}`} />

            <span className="text-[15px] font-semibold">{item.label}</span>

          </NavLink>

        ))}

      </nav>



      {/* User Info Section */}

      <div className="p-4 flex-shrink-0 border-t" style={{ borderColor }}>

        <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-opacity-80 transition-all cursor-pointer relative" 

             onClick={() => setShowUserMenu(!showUserMenu)}

             style={{ background: showUserMenu ? hoverBg : 'transparent' }}>

          

          {user?.profilePicture ? (

            <img src={user.profilePicture} alt="Profile" className="w-10 h-10 rounded-full object-cover" />

          ) : (

            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: hoverBg }}>

              <UserCircle className="w-6 h-6" style={{ color: subTextColor }} />

            </div>

          )}

          

          <div className="flex-1 min-w-0">

            <p className="text-sm font-bold truncate" style={{ color: textColor }}>

              {user?.displayName || user?.name || 'User'}

            </p>

            <p className="text-xs font-medium truncate capitalize" style={{ color: subTextColor }}>

              {currentUserType || 'Member'}

            </p>

          </div>

          <button className="p-1" style={{ color: subTextColor }}>

            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">

              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />

            </svg>

          </button>



          {/* User Menu Dropdown */}

          {showUserMenu && (

            <div className="absolute bottom-full left-0 w-full mb-2 rounded-2xl shadow-2xl border overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2"

                 style={{ background: sidebarBg, borderColor }}>

              <button onClick={() => { toggleTheme(); setShowUserMenu(false); }}

                className="w-full px-4 py-3 text-left flex items-center gap-3 transition-colors text-sm font-medium"

                style={{ color: textColor, borderBottom: `1px solid ${borderColor}` }}>

                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}

                {isDark ? 'Light Mode' : 'Dark Mode'}

              </button>

     

              <Link to="/privacy"  className="px-4 py-3 flex items-center gap-3 text-sm font-medium  " style={{ color: textColor }}>

                <Shield className="w-4 h-4" /> Privacy Policy

              </Link>

              

              <Link to="/terms" className="px-4 py-3 flex items-center gap-3 text-sm font-medium" style={{ color: textColor }}>

                <FileText className="w-4 h-4" /> Terms

              </Link>



              <button onClick={() => logout()}

                className="w-full px-4 py-3 text-left flex items-center gap-3 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20">

                <LogOut className="w-4 h-4" /> Logout

              </button>

            </div>

          )}

        </div>

      </div>

    </div>

  );



  return (

    <>




      {/* Mobile Sidebar */}

      {isMobileOpen && (

        <div className="fixed inset-0 z-50 lg:hidden">

          <div 

            className="absolute inset-0 bg-black/50 backdrop-blur-sm" 

            onClick={() => {

              console.log('Backdrop clicked');

              setIsMobileOpen(false);

            }} 

          />

          <div 

            className="absolute top-0 left-0 h-full w-72 shadow-2xl transform transition-transform duration-300 ease-out flex flex-col"

            style={{ 

              background: sidebarBg,

              transform: isMobileOpen ? 'translateX(0)' : 'translateX(-100%)'

            }}>

            <div className="flex justify-between items-center p-4 flex-shrink-0" style={{ borderColor }}>

              

              <button 

                onClick={() => {

                  console.log('Close button clicked');

                  setIsMobileOpen(false);

                }}

                className="p-2 rounded-lg hover:bg-opacity-80 transition-colors flex items-center justify-center"

                style={{ color: textColor }}>

                <X className="w-5 h-5" />

              </button>

            </div>

            <div className="flex-1 overflow-hidden">

              <SidebarContent />

            </div>

          </div>

        </div>

      )}



      {/* Desktop Sidebar */}

      <aside className="hidden lg:block fixed top-0 left-0 h-screen w-64 z-30 transition-all border-r overflow-hidden"

             style={{ background: sidebarBg, borderColor }}>

        <SidebarContent />

      </aside>

    </>

  );

};



export default Sidebar;
