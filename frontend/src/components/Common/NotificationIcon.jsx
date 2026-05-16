import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bell, BellOff, X, Check, Trash2 } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { timeAgo } from '../../utils/helpers';
import toast from 'react-hot-toast';

const NotificationIcon = ({ className = "" }) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotification();
  const isDark = theme === 'dark';
  const location = useLocation();
  
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    switch(type) {
      case 'deal': return '💰';
      case 'message': return '💬';
      case 'payment': return '💵';
      case 'campaign': return '📢';
      case 'reminder': return '⏰';
      case 'alert': return '⚠️';
      default: return '🔔';
    }
  };

  // Get notification link based on user type and notification data
  const getNotificationLink = (notification) => {
    if (notification.data?.url) {
      return notification.data.url;
    }
    
    const userType = user?.userType;
    if (notification.type === 'deal' && notification.data?.dealId) {
      return `/${userType}/deals/${notification.data.dealId}`;
    }
    
    return `/${userType}/notifications`;
  };

  // Handle notification click
  const handleNotificationClick = async (notification, e) => {
    e.preventDefault();
    if (!notification.read) {
      await markAsRead(notification._id);
    }
    window.location.href = getNotificationLink(notification);
  };

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    const success = await markAllAsRead();
    if (success) {
      setIsOpen(false);
    }
  };

  // Handle delete notification
  const handleDeleteNotification = async (notificationId, e) => {
    e.stopPropagation();
    e.preventDefault();
    await deleteNotification(notificationId);
  };

  // Get recent notifications (max 5)
  const recentNotifications = notifications.slice(0, 5);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          relative p-2 rounded-xl transition-all duration-200 group
          ${isDark 
            ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white' 
            : 'hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900'
          }
          ${className}
        `}
      >
        <Bell className="w-5 h-5 transition-transform group-hover:scale-110" />
        
        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className={`
          absolute right-0 mt-2 w-96 rounded-2xl shadow-2xl border overflow-hidden z-50
          ${isDark 
            ? 'bg-zinc-900 border-zinc-800' 
            : 'bg-white border-zinc-200'
          }
        `}>
          {/* Header */}
          <div className={`
            px-4 py-3 border-b flex justify-between items-center
            ${isDark ? 'border-zinc-800' : 'border-zinc-200'}
          `}>
            <div>
              <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                Notifications
              </h3>
              <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
              </p>
            </div>
            
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className={`
                  text-xs font-medium px-2 py-1 rounded-lg transition-colors
                  ${isDark 
                    ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' 
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                  }
                `}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {recentNotifications.length > 0 ? (
              <div className="py-2">
                {recentNotifications.map((notification) => (
                  <Link
                    key={notification._id}
                    to={getNotificationLink(notification)}
                    onClick={(e) => handleNotificationClick(notification, e)}
                    className={`
                      block px-4 py-3 hover:bg-opacity-50 transition-all duration-200 relative
                      ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'}
                      ${!notification.read ? (
                        isDark ? 'bg-zinc-800/30' : 'bg-zinc-50'
                      ) : ''}
                    `}
                  >
                    {/* Unread Indicator */}
                    {!notification.read && (
                      <div className="absolute left-2 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full" />
                    )}

                    <div className="flex gap-3">
                      {/* Icon */}
                      <div className={`
                        w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0
                        ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}
                      `}>
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <p className={`
                            text-sm font-medium truncate
                            ${isDark ? 'text-white' : 'text-zinc-900'}
                          `}>
                            {notification.title}
                          </p>
                          <button
                            onClick={(e) => handleDeleteNotification(notification._id, e)}
                            className={`
                              opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-500/10
                              ${isDark ? 'text-zinc-500 hover:text-red-400' : 'text-zinc-400 hover:text-red-500'}
                            `}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        
                        <p className={`
                          text-xs mt-1 line-clamp-2
                          ${isDark ? 'text-zinc-400' : 'text-zinc-600'}
                        `}>
                          {notification.message}
                        </p>
                        
                        <p className={`
                          text-xs mt-1
                          ${isDark ? 'text-zinc-500' : 'text-zinc-400'}
                        `}>
                          {timeAgo(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <BellOff className={`
                  w-8 h-8 mx-auto mb-3
                  ${isDark ? 'text-zinc-600' : 'text-zinc-400'}
                `} />
                <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  No notifications yet
                </p>
                <p className={`text-xs mt-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  We'll notify you when something important happens
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className={`
              px-4 py-3 border-t
              ${isDark ? 'border-zinc-800' : 'border-zinc-200'}
            `}>
              <Link
                to={`/${user?.userType}/notifications`}
                onClick={() => setIsOpen(false)}
                className={`
                  block text-center text-sm font-medium transition-colors
                  ${isDark 
                    ? 'text-zinc-400 hover:text-white' 
                    : 'text-zinc-600 hover:text-zinc-900'
                  }
                `}
              >
                View all notifications
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationIcon;
