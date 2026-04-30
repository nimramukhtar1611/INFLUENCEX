// components/UI/Button.js - COMPLETE FIXED VERSION
import React from 'react';
import { Loader } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon: Icon,
  iconPosition = 'left',
  onClick,
  type = 'button',
  className = '',
  ...props 
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  // ==================== VARIANTS ====================
  const variants = {
    primary: isDark 
      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 focus:ring-purple-500 active:from-purple-800 active:to-indigo-800 shadow-lg hover:shadow-xl transition-all duration-200'
      : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 focus:ring-blue-500 active:from-blue-800 active:to-indigo-800 shadow-lg hover:shadow-xl transition-all duration-200',
    secondary: isDark 
      ? 'bg-gray-800 text-gray-200 border border-gray-700 hover:bg-gray-700 focus:ring-purple-500 active:bg-gray-600' 
      : 'bg-white text-gray-800 border border-gray-200 hover:bg-gray-50 focus:ring-blue-500 active:bg-gray-100',
    danger: isDark 
      ? 'bg-red-700 text-white hover:bg-red-800 focus:ring-red-600 active:bg-red-900' 
      : 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 active:bg-red-800',
    success: isDark 
      ? 'bg-green-700 text-white hover:bg-green-800 focus:ring-green-600 active:bg-green-900' 
      : 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 active:bg-green-800',
    warning: isDark 
      ? 'bg-yellow-700 text-white hover:bg-yellow-800 focus:ring-yellow-600 active:bg-yellow-900' 
      : 'bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500 active:bg-yellow-800',
    outline: isDark 
      ? 'border-2 border-purple-500 text-purple-400 hover:bg-purple-500/10 focus:ring-purple-500 active:bg-purple-500/20' 
      : 'border-2 border-blue-500 text-blue-600 hover:bg-blue-500/10 focus:ring-blue-500 active:bg-blue-500/20',
    ghost: isDark 
      ? 'text-gray-300 hover:bg-gray-700/50 focus:ring-gray-500 active:bg-gray-700' 
      : 'text-gray-700 hover:bg-gray-100/50 focus:ring-gray-500 active:bg-gray-200',
    link: isDark 
      ? 'text-purple-400 hover:text-purple-300 underline-offset-2 hover:underline focus:ring-purple-500 p-0 transition-colors duration-200' 
      : 'text-blue-600 hover:text-blue-700 underline-offset-2 hover:underline focus:ring-blue-500 p-0 transition-colors duration-200'
  };

  // ==================== SIZES ====================
  const sizes = {
    xs: 'px-2 py-1 text-xs gap-1',
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-base gap-2',
    lg: 'px-6 py-3 text-lg gap-2',
    xl: 'px-8 py-4 text-xl gap-3'
  };

  // ==================== LOADER SIZES ====================
  const loaderSizes = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-7 h-7'
  };

  // ==================== DISABLED STYLES ====================
  const disabledStyles = 'opacity-50 cursor-not-allowed pointer-events-none';

  // ==================== RENDER LOADER ====================
  const renderLoader = () => (
    <Loader 
      className={`${loaderSizes[size]} animate-spin ${
        variant === 'primary' || variant === 'danger' || variant === 'success' || variant === 'warning'
          ? 'text-white'
          : 'text-current'
      }`} 
    />
  );

  // ==================== RENDER ICON ====================
  const renderIcon = () => {
    if (!Icon) return null;
    const iconSize = {
      xs: 'w-3 h-3',
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
      xl: 'w-7 h-7'
    }[size];
    
    return <Icon className={iconSize} />;
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${(disabled || loading) ? disabledStyles : ''}
        rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-offset-2
        transition-all duration-200 ease-in-out
        flex items-center justify-center
        ${className}
      `}
      {...props}
    >
      {loading && iconPosition === 'left' && renderLoader()}
      {!loading && iconPosition === 'left' && renderIcon()}
      
      <span className={`${loading && iconPosition === 'left' ? 'ml-2' : ''} ${
        loading && iconPosition === 'right' ? 'mr-2' : ''
      }`}>
        {children}
      </span>
      
      {loading && iconPosition === 'right' && renderLoader()}
      {!loading && iconPosition === 'right' && renderIcon()}
    </button>
  );
};

// ==================== ICON BUTTON COMPONENT ====================
export const IconButton = ({
  icon: Icon,
  variant = 'ghost',
  size = 'md',
  loading = false,
  disabled = false,
  onClick,
  type = 'button',
  className = '',
  label,
  ...props
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const sizes = {
    xs: 'p-1',
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-2.5',
    xl: 'p-3'
  };

  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-7 h-7'
  };

  const variants = {
    primary: isDark 
      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 focus:ring-purple-500 shadow-lg hover:shadow-xl transition-all duration-200'
      : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 focus:ring-blue-500 shadow-lg hover:shadow-xl transition-all duration-200',
    secondary: isDark 
      ? 'bg-gray-800 text-gray-200 border border-gray-700 hover:bg-gray-700 focus:ring-purple-500' 
      : 'bg-white text-gray-800 border border-gray-200 hover:bg-gray-50 focus:ring-blue-500',
    danger: isDark 
      ? 'bg-red-700 text-white hover:bg-red-800 focus:ring-red-600' 
      : 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    ghost: isDark 
      ? 'text-gray-300 hover:bg-gray-700/50 focus:ring-gray-500' 
      : 'text-gray-700 hover:bg-gray-100/50 focus:ring-gray-500',
    outline: isDark 
      ? 'border border-purple-500 hover:bg-purple-500/10 focus:ring-purple-500' 
      : 'border border-blue-500 hover:bg-blue-500/10 focus:ring-blue-500'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${variants[variant]}
        ${sizes[size]}
        rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2
        transition-all duration-200 ease-in-out
        ${(disabled || loading) ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
      aria-label={label}
      title={label}
      {...props}
    >
      {loading ? (
        <Loader className={`${iconSizes[size]} animate-spin`} />
      ) : (
        <Icon className={iconSizes[size]} />
      )}
    </button>
  );
};

// ==================== BUTTON GROUP COMPONENT ====================
export const ButtonGroup = ({
  children,
  orientation = 'horizontal',
  attached = false,
  className = ''
}) => {
  const baseClasses = attached ? 'flex' : 'flex gap-2';
  const orientationClasses = orientation === 'horizontal' ? 'flex-row' : 'flex-col';
  
  return (
    <div className={`${baseClasses} ${orientationClasses} ${className}`}>
      {React.Children.map(children, (child, index) => {
        if (!child) return null;
        
        if (attached) {
          let roundedClasses = '';
          const totalChildren = React.Children.count(children);
          
          if (orientation === 'horizontal') {
            if (index === 0) roundedClasses = 'rounded-r-none';
            else if (index === totalChildren - 1) roundedClasses = 'rounded-l-none';
            else roundedClasses = 'rounded-none';
          } else {
            if (index === 0) roundedClasses = 'rounded-b-none';
            else if (index === totalChildren - 1) roundedClasses = 'rounded-t-none';
            else roundedClasses = 'rounded-none';
          }
          
          return React.cloneElement(child, {
            className: `${child.props.className || ''} ${roundedClasses}`
          });
        }
        
        return child;
      })}
    </div>
  );
};

export default Button;