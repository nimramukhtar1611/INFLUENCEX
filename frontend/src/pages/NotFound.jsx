import { Link } from 'react-router-dom';
import { Home, Search, ArrowLeft, MoveRight } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export default function NotFound() {
  const { isDark } = useTheme();

  return (
    <div className={`min-h-screen flex items-center justify-center selection:bg-indigo-500/30 ${isDark ? 'bg-[#09090b] text-zinc-100' : 'bg-[#fafafa] text-zinc-900'} py-12 px-6`}>
      <div className="max-w-3xl w-full">
        <div className="relative flex flex-col items-center text-center">
          
          {/* Subtle Background Glow */}
          <div className={`absolute -top-24 w-64 h-64 blur-[120px] rounded-full opacity-20 ${isDark ? 'bg-indigo-500' : 'bg-indigo-300'}`} />

          {/* Minimalist 404 Header */}
          <div className="relative group">
            <span className={`text-[12px] uppercase tracking-[0.4em] font-medium mb-4 block ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Error Code
            </span>
            <h1 className="text-[120px] md:text-[160px] font-extralight tracking-tighter leading-none mb-4 italic">
              404
            </h1>
          </div>

          {/* Main Content */}
          <div className="space-y-6 mb-12 relative">
            <h2 className="text-3xl md:text-4xl font-light tracking-tight">
              Lost in the <span className="italic font-serif">digital ether.</span>
            </h2>
            <p className={`text-base md:text-lg font-light max-w-md mx-auto leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              The page you are looking for has vanished or never existed. 
              Let us guide you back to familiar territory.
            </p>
          </div>

          {/* Action Buttons - Refined & Slim */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full mb-16">
            <Link 
              to="/" 
              className={`group flex items-center gap-3 px-8 py-3 rounded-full text-sm font-medium transition-all duration-300 ${
                isDark 
                  ? 'bg-zinc-100 text-black hover:bg-white' 
                  : 'bg-zinc-900 text-white hover:bg-black'
              }`}
            >
              <Home size={15} />
              Return Home
              <MoveRight size={15} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            
            <button 
              onClick={() => window.history.back()}
              className={`flex items-center gap-2 px-8 py-3 rounded-full text-sm font-medium transition-all duration-300 border ${
                isDark 
                  ? 'border-zinc-800 text-zinc-400 hover:border-zinc-500 hover:text-zinc-100' 
                  : 'border-zinc-200 text-zinc-500 hover:border-zinc-400 hover:text-zinc-900'
              }`}
            >
              <ArrowLeft size={15} />
              Go Back
            </button>
          </div>

          {/* Minimalist Footer Navigation */}
          <div className="w-full max-w-lg">
            <div className={`h-[1px] w-full mb-8 ${isDark ? 'bg-gradient-to-r from-transparent via-zinc-800 to-transparent' : 'bg-gradient-to-r from-transparent via-zinc-200 to-transparent'}`} />
            
            <div className="items-center justify-center gap-8 text-left px-4">
              <div>
                <h3 className={`text-[11px] uppercase tracking-widest font-bold mb-4 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  Quick Links
                </h3>
                <div className="flex flex-col gap-3">
                  <Link to="/brand/dashboard" className="text-sm hover:underline underline-offset-4 decoration-zinc-500 transition-all">Brand Dashboard</Link>
                  <Link to="/creator/dashboard" className="text-sm hover:underline underline-offset-4 decoration-zinc-500 transition-all">Creator Dashboard</Link>
                </div>
              </div>
              
              
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}