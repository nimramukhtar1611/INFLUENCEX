import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  BellOff,
  CheckCheck,
  X,
  MessageSquare,
  DollarSign,
  Users,
  Clock,
  AlertCircle,
  Loader,
  Eye
} from 'lucide-react';

import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import Button from '../UI/Button';
import { timeAgo } from '../../utils/helpers';
import toast from 'react-hot-toast';
import { useTheme } from '../../hooks/useTheme';

const Notifications = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { user } = useAuth();
  const { socket } = useSocket();

  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [invitationActionId, setInvitationActionId] = useState(null);

  // FETCH
  const fetchNotifications = async (reset = false) => {
    try {
      if (reset) {
        setPage(1);
      } else if (page > 1) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const response = await api.get('/notifications', {
        params: {
          page: reset ? 1 : page,
          limit: 20,
          read: filter === 'unread' ? false : undefined
        }
      });

      if (response.data?.success) {
        const newNotifications = response.data.notifications || [];

        if (reset || page === 1) {
          setNotifications(newNotifications);
        } else {
          setNotifications(prev => [...prev, ...newNotifications]);
        }

        setUnreadCount(response.data.unreadCount || 0);
        setHasMore(newNotifications.length === 20);
      }
    } catch (error) {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchNotifications(true);
  }, [filter]);

  // SOCKET (FULL ORIGINAL LOGIC)
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);

      toast.success(notification.message);
    };

    const handleNotificationRead = ({ notificationId }) => {
      setNotifications(prev =>
        prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    };

    const handleAllRead = () => {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    };

    const handleNotificationDeleted = ({ notificationId }) => {
      const deleted = notifications.find(n => n._id === notificationId);

      setNotifications(prev => prev.filter(n => n._id !== notificationId));

      if (deleted && !deleted.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    };

    socket.on('notification:new', handleNewNotification);
    socket.on('notification:read', handleNotificationRead);
    socket.on('notifications:all-read', handleAllRead);
    socket.on('notification:deleted', handleNotificationDeleted);

    return () => {
      socket.off('notification:new');
      socket.off('notification:read');
      socket.off('notifications:all-read');
      socket.off('notification:deleted');
    };
  }, [socket, notifications]);

  // ICON
  const getIconComponent = (type) => {
    switch(type) {
      case 'deal': return DollarSign;
      case 'message': return MessageSquare;
      case 'team': return Users;
      case 'reminder': return Clock;
      case 'alert': return AlertCircle;
      default: return Bell;
    }
  };

  // ACTIONS
  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => n._id === id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {}
  };

  const deleteNotification = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch {
      toast.error('Failed to delete');
    }
  };

  const filteredNotifications =
    filter === 'all'
      ? notifications
      : filter === 'unread'
      ? notifications.filter(n => !n.read)
      : notifications.filter(n => n.type === filter);

  if (loading && notifications.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="relative z-10">
          <Loader className="w-8 h-8 animate-spin text-gray-600" />
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen`}>
      <div className="relative z-10 max-w-4xl mx-auto px-4 pt-10 pb-6">

        {/* HEADER */}
        <h1 className={`text-3xl font-bold mb-8 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Notifications
        </h1>

        {/* FILTERS */}
       <div className="flex flex-wrap gap-2 mb-8">
  {['all', 'unread', 'deal', 'message'].map((f) => (
    <button
      key={f}
      onClick={() => setFilter(f)}
      className={`px-4 py-2 rounded-full text-sm font-medium capitalize 
        transition-all duration-200 ease-in-out
        hover:scale-105 active:scale-95
        ${
          filter === f
            ? (isDark ? 'bg-white text-white' : 'bg-black text-white shadow-md')
            : (isDark 
                ? 'bg-zinc-900/50 text-gray-300 hover:bg-zinc-800' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200')
        }`}
    >
      {f}
      {f === 'unread' && unreadCount > 0 && (
        <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs font-bold ${
          filter === f ? (isDark ? 'bg-black text-white' : 'bg-white text-black') : 'bg-red-500 text-white'
        }`}>
          {unreadCount}
        </span>
      )}
    </button>
  ))}
</div>
        {/* CONTENT */}
        {filteredNotifications.length === 0 ? (
         <div className="flex flex-col items-center justify-center py-32 text-center">
  {/* The "Zen" Icon Container */}
  <div className="relative mb-10">
    {/* Animated Ripple Rings */}
    <div className={`absolute inset-0 rounded-[2.5rem] animate-ping opacity-20 duration-[3000ms] ${isDark ? 'bg-white' : 'bg-black'}`} />
    <div className={`absolute -inset-4 rounded-[3rem] border-2 border-dashed opacity-10 ${isDark ? 'border-white' : 'border-black'}`} />
    
    <div className={`
      relative w-24 h-24 rounded-[2rem] flex items-center justify-center transition-all duration-700
      ${isDark 
        ? 'bg-zinc-900 border border-zinc-800 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]' 
        : 'bg-white border border-zinc-100 shadow-[0_20px_40px_rgba(0,0,0,0.04)]'}
    `}>
      <BellOff className={`w-10 h-10 stroke-[1.5px] ${
          isDark ? 'text-zinc-500' : 'text-zinc-400'
      }`} />
      
      {/* Tiny "Status Clean" Indicator */}
      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-4 border-inherit shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
    </div>
  </div>

  {/* Typography Hierarchy */}
  <div className="space-y-2 max-w-[280px]">
    <h2 className={`text-xl font-black tracking-tight uppercase ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
      Inbox Zero
    </h2>
    <p className={`text-[12px] font-medium leading-relaxed tracking-wide opacity-50 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
      Your digital workspace is clear. New activity and system alerts will manifest here.
    </p>
  </div>

  {/* Subtle "Refresh" or Action suggestion */}
  <div className={`mt-8 px-4 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-[0.2em] ${
    isDark ? 'border-zinc-800 text-zinc-600' : 'border-zinc-100 text-zinc-400'
  }`}>
    System Status: Operational
  </div>
</div>
        ) : (
         <div className="space-y-4">
  {filteredNotifications.map((notification) => {
    const Icon = getIconComponent(notification.type);

    return (
      <div
        key={notification._id}
        className={`
          group relative p-5 rounded-[2rem] border transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
          ${isDark
            ? 'bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-900 hover:border-zinc-700'
            : 'bg-white border-zinc-100 hover:border-zinc-200 hover:shadow-[0_15px_30px_rgba(0,0,0,0.04)]'
          }
          ${!notification.read ? (isDark ? 'shadow-[inset_0_0_20px_rgba(99,102,241,0.05)]' : 'shadow-[inset_0_0_20px_rgba(99,102,241,0.03)]') : ''}
        `}
      >
        {/* Unread "Pulse" Indicator */}
        {!notification.read && (
          <div className="absolute top-6 left-2 w-1 h-8 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
        )}

        <div className="flex gap-5">
          {/* Icon Squircle */}
          <div className={`
            shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-500 group-hover:scale-110
            ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-50 text-zinc-500'}
          `}>
            <Icon size={20} strokeWidth={2} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-1">
              <h4 className={`font-bold text-[14px] tracking-tight truncate ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                {notification.title}
              </h4>
              <span className={`text-[10px] font-black uppercase tracking-widest opacity-40 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                {timeAgo(notification.createdAt)}
              </span>
            </div>

            <p className={`text-[12px] leading-relaxed mb-4 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {notification.message}
            </p>

            <div className="flex items-center justify-between">
              {/* View Deal Button for deal notifications */}
              {notification.type === 'deal' && notification.data?.dealId && (
                <Link
                  to={notification.data.url || `/${user?.userType === 'brand' ? 'brand' : 'creator'}/deals/${notification.data.dealId}`}
                  onClick={() => markAsRead(notification._id)}
                  className={`
                    px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all
                    ${isDark 
                      ? 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20' 
                      : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200'
                    }
                  `}
                >
                  View Deal
                </Link>
              )}

              {/* Row Actions */}
              <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                {!notification.read && (
                  <button
                    onClick={() => markAsRead(notification._id)}
                    className={`
                      p-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all
                      ${isDark ? 'text-indigo-400 hover:bg-indigo-500/10' : 'text-indigo-600 hover:bg-indigo-50'}
                    `}
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={() => deleteNotification(notification._id)}
                  className={`
                    p-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all
                    ${isDark ? 'text-zinc-600 hover:text-red-400' : 'text-zinc-400 hover:text-red-500'}
                  `}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  })}

  {hasMore && (
    <button
      onClick={() => setPage(p => p + 1)}
      className={`
        w-full py-6 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.3em] transition-all
        ${isDark 
          ? 'text-zinc-500 hover:text-white hover:bg-zinc-900/50' 
          : 'text-zinc-400 hover:text-black hover:bg-zinc-50'}
      `}
    >
      {loadingMore ? 'Syncing...' : 'Load History'}
    </button>
  )}
</div>
        )}
      </div>
    </div>
  );
};

export default Notifications; 