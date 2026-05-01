import React from 'react';
import { Search, ArrowLeft } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

const BrandLayout = ({ 
  children, 
  title, 
  subtitle, 
  actionButton,
  tabs = [],
  activeTab,
  onTabChange,
  showSearch = false,
  searchValue,
  onSearchChange,
  onSearchSubmit,
  searchPlaceholder = "Search...",
  filters = [],
  activeFilter,
  onFilterChange,
  className = ""
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className={`max-w-7xl mx-auto space-y-8 p-6 ${isDark ? 'text-zinc-100' : 'text-zinc-900'} ${className}`}>
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-light tracking-tight font-semibold">
            Brand <span className="font-bold">{title}</span>
          </h1>
          {subtitle && (
            <p className={`text-sm mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {subtitle}
            </p>
          )}
        </div>
        
        {actionButton && (
          <div className="flex items-center gap-3">
            {actionButton}
          </div>
        )}
      </div>

      {/* Tabs */}
      {tabs.length > 0 && (
        <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 w-full lg:w-auto no-scrollbar">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange?.(tab.id)}
                  className={`flex items-center gap-2 px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border whitespace-nowrap ${
                    activeTab === tab.id 
                      ? (isDark ? 'bg-white border-white text-white' : 'bg-black border-black text-white')
                      : (isDark ? 'border-zinc-800 text-zinc-400 hover:border-zinc-600' : 'border-zinc-200 text-zinc-500 hover:border-zinc-400')
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.badge > 0 && (
                    <span className="ml-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      {filters.length > 0 && (
        <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 w-full lg:w-auto no-scrollbar">
            {filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => onFilterChange?.(filter.id)}
                className={`px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border whitespace-nowrap ${
                  activeFilter === filter.id 
                    ? (isDark ? 'bg-white border-white text-gray-400' : 'bg-black border-black text-white')
                    : (isDark ? 'border-zinc-800 text-zinc-400 hover:border-zinc-600' : 'border-zinc-200 text-zinc-500 hover:border-zinc-400')
                }`}
              >
                {filter.label}
                {filter.count > 0 && ` (${filter.count})`}
              </button>
            ))}
          </div>

       {showSearch && (
  <form onSubmit={onSearchSubmit} className="relative w-full lg:w-80">
    <Search 
      className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${
        isDark ? 'text-zinc-500' : 'text-zinc-400'
      }`} 
    />
    <input
      type="text"
      placeholder={searchPlaceholder}
      value={searchValue}
      onChange={onSearchChange}
      className={`w-full pl-11 pr-4 py-2.5 rounded-2xl text-xs transition-all outline-none border ${
        isDark 
          ? 'border-zinc-800 text-white focus:border-zinc-600' 
          : 'bg-white border-zinc-200 focus:border-zinc-400 text-zinc-900'
      }`}
      style={{ 
        backgroundColor: isDark ? '#18181b' : '#ffffff' 
      }} 
    />
  </form>
)}
        </div>
      )}

      {/* Content */}
      <div className={`rounded-2xl border transition-all ${
        isDark 
          ? 'bg-zinc-900/50 border-zinc-800' 
          : 'bg-white border-zinc-100 hover:shadow-xl shadow-zinc-200/50'
      }`}>
        {children}
      </div>
    </div>
  );
};

export default BrandLayout;
