import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useGlobalSettings } from '../context/GlobalSettingsContext';
import videoSrc from '../assets/vedio.mp4';
import image from '../assets/image.png';
import image1home from '../assets/image1home.jpg';
import image3home from '../assets/image3home.jpg';
import image4home from '../assets/image4home.jpg';
import homevedio1 from '../assets/homevedio1.mp4';
import homevedio2 from '../assets/homevedio2.mp4';
import homevedio3 from '../assets/homevedio3.mp4';
import img1 from '../assets/1.jpg';
import img2 from '../assets/2.jpg';
import img3 from '../assets/3.jpg';
import img4 from '../assets/4.jpg';
import img5 from '../assets/5.jpg';
import img6 from '../assets/6.jpg';
import img7 from '../assets/7.jpg';
import img8 from '../assets/8.jpg';
import img9 from '../assets/9.jpg';
import img10 from '../assets/10.jpg';
import img11 from '../assets/11.jpg';
import thirdsection from '../assets/third.jpg';
import image1 from '../assets/image1.png';
import image2 from '../assets/image2.png';
import image3 from '../assets/image3.png';
import image4 from '../assets/image4.png';
import logo from '../assets/logomark-animated.webp';
import bg from '../assets/lastimage.jpg';
import { motion } from 'framer-motion';
const mediaItems = [
  {
    type: 'image',
    src: image1home,
    alt: 'Creative professional working',
    text: 'Your Space Your Vision',
    subtext: 'build your way'
  },
  {
    type: 'video',
    src: homevedio1,
    alt: 'Creative process video',
    text: 'From You to Your Crew',
    subtext: 'every idea counts'
  },
  {
    type: 'video',
    src: homevedio2,
    alt: 'Motion graphics reel',
    text: 'Creative Reality Unleashed',
    subtext: 'redefined'
  },
  {
    type: 'image',
    src: image3home,
    alt: 'Digital art creation',
    text: 'Voice Driven Control',
    subtext: 'no limits'
  },
  {
    type: 'image',
    src: image4home,
    alt: 'Design workspace',
    text: 'Creators Build Careers',
    subtext: 'one frame at a time'
  },
  {
    type: 'video',
    src: homevedio3,
    alt: 'Final masterpiece',
    text: 'Podcasts into Stories',
    subtext: 'start today'
  }
];

const CreatorShowcase = () => {
  
 const showcaseImages = [
  { src: img1, name: "Emily Carter" },    
  { src: img2, name: "Kevin Woo" },
  { src: img3, name: "Olivia Brooks" },    
  { src: img4, name: "Tim Chantarangsu" },
  { src: img5, name: "Sophia Miller" }, 
  { src: img6, name: "Daniel Scott" },
  { src: img7, name: "Ava Johnson" },     
  { src: img8, name: "Lucas Bennett" },
  { src: img9, name: "Ethan Parker" },
  { src: img10, name: "Mia Thompson" },    
  { src: img11, name: "Ryan Collins" }

];

  return (
    <section className="relative w-full min-h-screen py-20 overflow-hidden flex flex-col justify-between bg-[#B6C9DF]">
      
      {/* Top Section: Creativity Powered */}
      <div className="pl-6 md:pl-16 lg:pl-24 pt-10">
     <motion.h2 
  initial={{ opacity: 0, y: -60 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: "-100px" }}
  transition={{ duration: 0.9, ease: [0.33, 1, 0.68, 1] }}
  className="text-3xl md:text-6xl lg:text-7xl font-light leading-none tracking-tighter uppercase text-[#6B4F3B]"
>
  creativity <br />
  <span className="ml-12 md:ml-24">powered</span>
</motion.h2>
      </div>

      {/* Auto-Scrolling Carousel Section */}
      <div className="relative w-full py-12">
        <div className="flex animate-slowScroll gap-8 px-4 w-max">
          {[...showcaseImages, ...showcaseImages].map((img, index) => (
            <div 
              key={index} 
              className={`flex-shrink-0 w-[70vw] md:w-[28vw] lg:w-[22vw] transition-transform duration-500
                ${index % 2 === 0 ? 'mt-0' : 'mt-16 md:mt-32'}
              `}
            >
              <div className="relative group overflow-hidden">
                <img 
                  src={img.src} 
                  alt="Creator" 
                  className="w-full aspect-[3/4] object-cover"
                />
                <div className="absolute bottom-4 left-4 text-white font-medium text-sm md:text-lg">
                  {img.name} →
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Section: Text and Fandom */}
      <div className="flex flex-col md:flex-row justify-between items-end px-6 md:px-16 lg:px-24 pb-10">
        <div className="max-w-md mb-12 md:mb-0">
          <p className="text-lg md:text-xl font-medium leading-tight text-[#6B4F3B]">
            Influence is the best place to build community with your biggest fans, 
            share exclusive work, and turn your passion into a lasting creative business.
          </p>
        </div>
        
        <div className="text-right">
          <h2 className="text-3xl md:text-6xl lg:text-7xl font-light leading-none uppercase text-[#6B4F3B]">
            by <br />
            <span className="tracking-tighter">fandom</span>
          </h2>
        </div>
      </div>

      <style>{`
        @keyframes slowScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-slowScroll {
          animation: slowScroll 40s linear infinite;
        }
        .animate-slowScroll:hover {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  );
};
const QuoteSection = () => {
  return (
    <section className="relative w-full h-screen overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img 
          src={thirdsection} 
          alt="KAMAUU" 
          className="w-full h-full object-cover"
        />
        {/* Subtle overlay */}
        <div className="absolute inset-0 bg-black/10" />
      </div>

      {/* Content Container - pb-4 (very bottom) aur max-w-3xl for smaller text width */}
      <div className="relative h-full flex flex-col justify-end px-6 md:px-16 lg:px-24 pb-6 md:pb-10">
        <div className="w-full max-w-6xl">
          
          {/* Quote Text - Size reduced to text-lg/text-2xl */}
          <h2 className="text-white text-lg md:text-xl lg:text-2xl font-normal leading-tight mb-2 max-w-2xl">
            Influence provides a space for artists to sustain ourselves 
            by connecting us directly to our own communities.
          </h2>
          
          {/* Name - Pushed to right, size adjusted */}
          <div className="flex justify-end">
       <motion.span 
  initial={{ opacity: 0, y: -50 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true }}
  transition={{ duration: 0.8, ease: "easeOut" }}
  className="text-white text-4xl md:text-6xl lg:text-7xl font-light tracking-tighter uppercase leading-none"
>
  KAMAUU
</motion.span>
          </div>
          
        </div>
      </div>
    </section>
  );
};
const CreativeControl = ({ user, getUserDashboardPath }) => {
  
  return (
    <section className="relative w-full min-h-screen md:min-h-[140vh] overflow-hidden font-sans px-6 py-20 md:p-0 bg-[#B2D1FF]">
      
      {/* --- Images Container (Desktop: Absolute | Mobile: Flex/Grid) --- */}
      {/* Mobile par images ko text se upar ya neeche dikhane ke liye hum hidden/block logic use kar sakte hain ya transform badal sakte hain */}
      
      {/* Image 1: Visual Odyssey */}
      <div className="hidden md:block absolute top-[60px] right-[30%] w-[230px] z-20 bg-white rounded-lg shadow-sm overflow-hidden">
        <img src={image1} alt="Visual Odyssey" className="w-full h-auto" />
      </div>

      {/* Image 2: VIP Pass */}
      <div className="hidden md:block absolute top-[380px] left-[20px] w-[260px] z-20 bg-white rounded-lg shadow-sm overflow-hidden">
        <img src={image3} alt="VIP Pass" className="w-full h-auto" />
      </div>

      {/* Image 3: Hip-Hop Journalist */}
      <div className="hidden md:block absolute top-[450px] right-[-10px] w-[280px] z-20 bg-white rounded-lg shadow-sm overflow-hidden">
        <img src={image2} alt="Hip-Hop" className="w-full h-auto" />
      </div>

      {/* Image 4: Chelsea */}
      <div className="hidden md:block absolute top-[40px] left-[-10px] w-[280px] z-20 bg-white rounded-lg shadow-sm overflow-hidden">
        <img src={image4} alt="Chelsea" className="w-full h-[250px] object-cover" />
      </div>

      {/* --- Mobile Only Images (Text ke upar ya niche stack karne ke liye) --- */}
      <div className="flex md:hidden justify-center gap-4 mb-10 overflow-x-auto pb-4">
         <img src={image1} className="w-[120px] h-auto rounded-lg shadow-sm flex-shrink-0" alt="v1" />
         <img src={image4} className="w-[120px] h-auto rounded-lg shadow-sm flex-shrink-0" alt="v4" />
      </div>

      {/* --- Main Text Content --- */}
      <div className="flex flex-col items-center md:mt-40 md:pt-20 relative z-30">
        
        {/* Large Heading */}
      <motion.h1 
  initial={{ opacity: 0, y: -100 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true }}
  transition={{ duration: 1, ease: "easeOut" }}
  className="text-[45px] sm:text-[60px] md:text-[100px] font-normal tracking-tight text-center leading-[1] md:leading-[0.9] text-black"
>
  Complete <br className="hidden md:block" /> creative <br /> control
</motion.h1>
        {/* Paragraph & Button Section */}
        <div className="mt-10 md:mt-40 max-w-[550px] w-full text-center md:text-left self-center md:ml-[-100px]">
          <p className="text-[17px] md:text-[20px] leading-[1.4] md:leading-[1.2] font-normal mb-8 md:mb-10 text-black">
            Influence is your space to create what excites you most, rough or polished,
            big or small. Hundreds of thousands of creators use Patreon to share
            videos, podcasts, writing, art, music, recipes, and more with their
            most passionate fans.
          </p>
          
          {user ? (
            <NavLink 
              to={getUserDashboardPath()}
              className="bg-black text-white mb-3 px-8 py-4 rounded-full text-[15px] font-medium hover:bg-zinc-800 transition-colors w-full md:w-auto inline-block text-center  transition-all duration-300 transform hover:scale-105 active:scale-95
                hover:shadow-[0_8px_25px_-5px_rgba(255,255,255,0.5)] inline-block"
            >
              Go to Dashboard
            </NavLink>
          ) : (
            <NavLink 
              to="/signup" 
              className="bg-black text-white mb-3 px-8 py-4 rounded-full text-[15px] font-medium hover:bg-zinc-800 transition-colors w-full md:w-auto inline-block text-center  transition-all duration-300 transform hover:scale-105 active:scale-95
                hover:shadow-[0_8px_25px_-5px_rgba(255,255,255,0.5)] inline-block"
            >
              Create on your terms
            </NavLink>
          )}
        </div>

        {/* Mobile Only: Baqi ki 2 images text ke niche */}
        <div className="flex md:hidden justify-center gap-4 mt-12">
           <img src={image2} className="w-[140px] h-auto rounded-lg shadow-sm" alt="v2" />
           <img src={image3} className="w-[140px] h-auto rounded-lg shadow-sm" alt="v3" />
        </div>
      </div>

    </section>
  );
};
const Vediosection = ({ user, getUserDashboardPath }) => {
  
  return (
    <div className="relative min-h-screen font-sans overflow-hidden bg-[#9bc1ff]">
      {/* Hero Content */}
      <div className="container mx-auto px-6 md:px-12 pt-16 pb-24 grid lg:grid-cols-2 gap-12 items-center">
        
        {/* Left Side: Text */}
        <div className="z-10 order-2 lg:order-1">
     <motion.h1 
  initial={{ opacity: 0, y: -80 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true }}
  transition={{ duration: 0.9, ease: "easeOut" }}
  className="text-5xl md:text-7xl lg:text-8xl leading-[0.9] font-light tracking-tight mb-8 text-black"
>
  Creators Fans <br />
  Nothing in <br />
  between.
</motion.h1>
          
          <div className="max-w-md space-y-6">
            <p className="text-sm md:text-medium font-medium leading-relaxed text-black">
              Influence gives you a direct line of access to your fan community, 
              with no ads or gatekeepers in the way.
            </p>
            <p className="text-sm md:text-medium font-medium leading-relaxed text-black">
              Through real-time group chats, comments, DMs, and even directly over email, 
              you can connect more deeply and directly with your community here than anywhere else.
            </p>
            
            {user ? (
  <NavLink 
    to={getUserDashboardPath()}
    className="bg-black text-white px-5 py-3 rounded-full text-sm font-bold hover:scale-105 transition-transform mt-4 inline-block text-center"
  >
    Go to Dashboard
  </NavLink>
) : (
  <NavLink 
    to="/signup" 
    className="bg-black text-white px-5 py-3 rounded-full text-sm font-bold hover:scale-105 transition-transform mt-4 inline-block text-center"
  >
    Build real community
  </NavLink>
)}
          </div>
        </div>

        {/* Right Side: Video/Chat UI UI Mockup */}
        <div className="relative order-1 lg:order-2 flex justify-center lg:justify-end">
          <div className="relative w-full max-w-[380px] aspect-[9/19] bg-white rounded-[3rem] shadow-2xl border-[8px] border-white overflow-hidden">
            {/* Video Background or Content */}
            <video 
              autoPlay 
              loop 
              muted 
              playsInline 
              className="absolute inset-0 w-full h-full object-cover"
            >
              <source src={videoSrc} type="video/mp4" />
              Your browser does not support the video tag.
            </video>

            {/* Chat Overlay Effect */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
            
            {/* Minimal Chat UI Mockup (Simulating the screenshot) */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-lg">
              <div className="flex gap-3 items-center">
                <div className="w-8 h-8 rounded-full bg-blue-400" />
                <div className="flex-1">
                  <div className="h-2 w-20 bg-gray-300 rounded mb-1" />
                  <div className="h-3 w-full bg-gray-200 rounded" />
                </div>
              </div>
            </div>
          </div>
          
          {/* Floating Element Decor */}
          <div className="absolute -top-10 -right-5 w-24 h-24 bg-yellow-300 rounded-full blur-3xl opacity-50 -z-10" />
        </div>
      </div>
    </div>
  );
};
const Secondlast = ({ user, getUserDashboardPath }) => {
  
  return (
    <section className="min-h-screen font-sans selection:bg-black selection:text-white bg-[#7fa9e6]">
      <div className="max-w-7xl mx-auto px-6 py-12 md:py-24">
        
        {/* Main Heading Section */}
     <div className="mb-16 md:mb-24 flex justify-center items-start text-center">
 <motion.h1 
  initial={{ opacity: 0, y: -70 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true }}
  transition={{ duration: 0.8, ease: "easeOut" }}
  className="text-[10vw] md:text-[7vw] leading-[0.95] tracking-tight font-medium text-black"
>
  Turning passions into <br className="hidden md:block" /> 
  <span className="italic">businesses</span>
</motion.h1>
</div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Left Side */}
         <div className="lg:col-span-5 flex justify-center lg:justify-end">
  <div className="relative w-full max-w-[280px] lg:mr-6">
    <img 
      src={image} 
      alt="Patreon Insights Mockup" 
      className="w-full h-auto rounded-[2.5rem] shadow-2xl"
    />
  </div>
</div>

          {/* Right Side */}
          <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-10 md:pt-10">
            
            {/* Feature 1 */}
            <div className="space-y-5">
              <h3 className="text-xl md:text-2xl font-medium text-black">
                More ways to earn
              </h3>
              <p className="text-base md:text-lg leading-relaxed text-black/80">
                On Influence, you can build a lasting business outside of ads, with memberships, shops, and digital products.
              </p>
              {user ? (
                <NavLink 
                  to={getUserDashboardPath()}
                  className="bg-black text-white px-7 py-3 rounded-full font-medium text-base hover:scale-105 transition-transform active:scale-95 inline-block text-center"
                >
                  Go to Dashboard
                </NavLink>
              ) : (
                <NavLink 
                  to="/signup" 
                  className="bg-black text-white px-7 py-3 rounded-full font-medium text-base hover:scale-105 transition-transform active:scale-95 inline-block text-center"
                >
                  Set up shop
                </NavLink>
              )}
            </div>

            {/* Feature 2 */}
            <div className="space-y-5">
              <h3 className="text-xl md:text-2xl font-medium text-black">
                Unlock growth
              </h3>
              <p className="text-base md:text-lg leading-relaxed text-black/80">
                Get analytics, manage your audience, and grow with creator tools and community support.
              </p>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};
const Lastsection = ({ user, getUserDashboardPath }) => {
  
  return (
    <section className="relative min-h-screen w-full flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src={bg}
          alt="Background"
          className="w-full h-full object-cover object-center"
        />
        {/* Dark Overlay to match the vibe if needed */}
        <div className="absolute inset-0 bg-black/10"></div>
      </div>

      {/* Main Card */}
   <div className="relative z-10 w-[75%] max-w-[320px] rounded-[32px] p-6 md:p-7 shadow-xl flex flex-col items-center text-center min-h-[420px] bg-white/50">
  
  {/* Logo */}
  <div className="mb-5">
    <img 
      src={logo}
      alt="Logo" 
      className="w-12 h-12 md:w-14 md:h-14 object-contain"
    />
  </div>

  {/* Heading */}
<motion.h1 
  initial={{ opacity: 0, y: -40 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true }}
  transition={{ duration: 0.7, ease: "easeOut" }}
  className="text-[24px] md:text-[28px] font-bold leading-tight mb-7 text-[#242424]"
>
  Your world to create
</motion.h1>

  {/* Button */}
  {user ? (
    <NavLink 
      to={getUserDashboardPath()}
      className="w-full bg-black text-white font-semibold py-3 px-5 rounded-full text-base hover:bg-gray-800 transition-colors mb-5 inline-block text-center  transition-all duration-300 transform hover:scale-105 active:scale-95 hover:shadow-[0_8px_25px_-5px_rgba(255,255,255,0.5)] inline-block"
    >
      Go to Dashboard
    </NavLink>
  ) : (
    <NavLink 
      to="/signup" 
      className="w-full bg-black text-white font-semibold py-3 px-5 rounded-full text-base hover:bg-gray-800 transition-colors mb-5 inline-block text-center  transition-all duration-300 transform hover:scale-105 active:scale-95  hover:shadow-[0_8px_25px_-5px_rgba(255,255,255,0.5)] inline-block"
    >
      Get started
    </NavLink>
  )}

  {/* Login */}
  {!user && (
    <p className="text-sm mb-8 text-gray-600">
      Already have an account?{' '}
      <NavLink to="/login" className="underline font-medium hover:text-black">
        Log in
      </NavLink>
    </p>
  )}

  {/* Store badges */}
  <div className="flex gap-3 justify-center mt-auto">
    <img 
      src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg"
      className="h-8"
      alt=""
    />
    <img 
      src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg"
      className="h-8"
      alt=""
    />
  </div>
</div>
    </section>
  );
};
const Home = () => {
  const { user, isAdmin, isBrand, isCreator } = useAuth();
  const { getPlatformName } = useGlobalSettings();

  // State variables
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Ref variables
  const videoRefs = useRef([]);
  const slideTimeout = useRef(null);
  const isVideoPlayingRef = useRef(false);

  const totalSlides = mediaItems.length;

  // Helper function to determine user type and dashboard path
  const getUserDashboardPath = () => {
    if (isAdmin) return '/admin/dashboard';
    if (isBrand) return '/brand/dashboard';
    if (isCreator) return '/creator/dashboard';
    return '/dashboard'; // fallback
  };


  // Handle scroll for navbar transparency
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on window resize (if screen becomes desktop)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Improved media styles - ensures full coverage without black bars or cutoff
  const getMediaStyles = () => {
    return {
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: '100vw',
      height: '100vh',
      transform: 'translate(-50%, -50%)',
      objectFit: 'cover',
      objectPosition: 'center center'
    };
  };

  const playVideo = useCallback((videoElement) => {
    if (videoElement && videoElement.paused) {
      const playPromise = videoElement.play();
      if (playPromise !== undefined) {
        playPromise.catch(e => {
          console.log('Video autoplay prevented:', e);
        });
      }
    }
  }, []);

  const pauseVideo = useCallback((videoElement) => {
    if (videoElement && !videoElement.paused) {
      videoElement.pause();
    }
  }, []);

  const goToSlide = useCallback((index) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    
    // Clear timeouts
    if (slideTimeout.current) clearTimeout(slideTimeout.current);
    
    let newIndex = index;
    if (newIndex < 0) newIndex = totalSlides - 1;
    if (newIndex >= totalSlides) newIndex = 0;
    
    // Pause all videos except the new one will be handled after transition
    Object.values(videoRefs.current).forEach((video, idx) => {
      if (video && idx !== newIndex) {
        pauseVideo(video);
      }
    });
    
    setCurrentIndex(newIndex);
    
    // Handle video playback after transition
    setTimeout(() => {
      const currentItem = mediaItems[newIndex];
      if (currentItem.type === 'video') {
        const currentVideo = videoRefs.current[newIndex];
        if (currentVideo) {
          currentVideo.currentTime = 0;
          playVideo(currentVideo);
          isVideoPlayingRef.current = true;
        }
      } else {
        isVideoPlayingRef.current = false;
      }
      setIsTransitioning(false);
    }, 700); // Match transition duration
  }, [isTransitioning, totalSlides, pauseVideo, playVideo]);

  const nextSlide = useCallback(() => {
    if (isTransitioning) return;
    goToSlide(currentIndex + 1);
  }, [currentIndex, goToSlide, isTransitioning]);

  const prevSlide = useCallback(() => {
    if (isTransitioning) return;
    goToSlide(currentIndex - 1);
  }, [currentIndex, goToSlide, isTransitioning]);

  // Handle video end event
  const handleVideoEnded = useCallback((index) => {
    if (index === currentIndex && !isTransitioning) {
      nextSlide();
    }
  }, [currentIndex, nextSlide, isTransitioning]);

  // Auto slide timer
  useEffect(() => {
    if (slideTimeout.current) clearTimeout(slideTimeout.current);
    
    const currentItem = mediaItems[currentIndex];
    let timing;
    
    if (currentItem.type === 'video') {
      timing = 10000; // 10 seconds for videos
    } else {
      timing = 6000; // 6 seconds for images
    }
    
    slideTimeout.current = setTimeout(() => {
      if (!isTransitioning) {
        nextSlide();
      }
    }, timing);
    
    return () => {
      if (slideTimeout.current) clearTimeout(slideTimeout.current);
    };
  }, [currentIndex, nextSlide, isTransitioning]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (slideTimeout.current) clearTimeout(slideTimeout.current);
      Object.values(videoRefs.current).forEach(video => {
        if (video) {
          pauseVideo(video);
        }
      });
    };
  }, [pauseVideo]);

  const handleMouseEnter = () => {
    if (slideTimeout.current) clearTimeout(slideTimeout.current);
  };
  
  const handleMouseLeave = () => {
    const currentItem = mediaItems[currentIndex];
    let timing = currentItem.type === 'video' ? 10000 : 6000;
    
    slideTimeout.current = setTimeout(() => {
      if (!isTransitioning) {
        nextSlide();
      }
    }, timing);
  };

  const currentItem = mediaItems[currentIndex];
  const textLines = currentItem.text.split(' ');
  const firstWord = textLines[0];
  const remainingText = textLines.slice(1).join(' ');

  return (
    <>
      {/* FIRST SECTION: Hero Carousel  */}
      <section 
        className="relative w-full h-screen overflow-hidden bg-black"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Background Media Carousel */}
        <div className="absolute inset-0 w-full h-full overflow-hidden">
          {mediaItems.map((item, idx) => (
            <div
              key={idx}
              className={`absolute inset-0 w-full h-full transition-opacity duration-700 ease-in-out ${
                idx === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
              }`}
            >
              {item.type === 'image' ? (
                <img 
                  src={item.src}
                  alt={item.alt}
                  style={getMediaStyles('image')}
                  className="select-none"
                  draggable="false"
                />
              ) : (
                <video
                  ref={el => {
                    if (el) videoRefs.current[idx] = el;
                  }}
                  src={item.src}
                  style={getMediaStyles('video')}
                  muted
                  playsInline
                  preload="auto"
                  onEnded={() => handleVideoEnded(idx)}
                  onPlay={() => {
                    if (idx === currentIndex) isVideoPlayingRef.current = true;
                  }}
                  onPause={() => {
                    if (idx === currentIndex) isVideoPlayingRef.current = false;
                  }}
                />
              )}
              {/* Gradient overlay for better text readability */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60" />
            </div>
          ))}
        </div>

        {/* Force video to play when it becomes current */}
        {mediaItems.map((item, idx) => (
          idx === currentIndex && item.type === 'video' && (
            <div key={`video-trigger-${idx}`} style={{ display: 'none' }}>
              {(() => {
                const video = videoRefs.current[idx];
                if (video && video.paused) {
                  setTimeout(() => playVideo(video), 100);
                }
                return null;
              })()}
            </div>
          )
        ))}

        {/* ========== FULLY RESPONSIVE NAVBAR ========== */}
       <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ${
    isScrolled ? 'bg-black/80 backdrop-blur-md py-1' : 'bg-transparent py-3'
}`}>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
            
            {/* Logo with Hover tracking-wider effect */}
            <div className="flex-shrink-0 group">
                <span className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-white transition-all duration-300 group-hover:tracking-widest cursor-pointer">
                    {getPlatformName().toUpperCase()}
                </span>
            </div>

            {/* Nav Links with Underline Animation */}
            <div className="hidden md:flex items-center justify-center space-x-6 lg:space-x-8 flex-1 mx-8">
            </div>

            {/* Right side - Buttons with Scale & Glow Effect */}
            <div className="hidden md:flex items-center gap-4">
                {user ? (
                    <NavLink 
                        to={getUserDashboardPath()}
                        className="text-slate-900 bg-white/90 backdrop-blur-sm text-sm md:text-base font-semibold px-6 py-2 rounded-full 
                                   transition-all duration-300 transform hover:scale-105 active:scale-95
                                   hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] border border-white/20"
                    >
                        Dashboard
                    </NavLink>
                ) : (
                    <>
                        <NavLink 
                            to="/login" 
                            className="text-white/90 hover:text-white text-sm md:text-base font-medium px-5 py-2 rounded-full 
                                       border border-white/30 hover:border-white transition-all duration-300 
                                       transform hover:-translate-y-0.5 active:translate-y-0"
                        >
                            Log in
                        </NavLink>
                        
                        <NavLink 
                            to="/signup" 
                            className="text-black bg-white/90 text-sm md:text-base font-bold px-6 py-2 rounded-full 
                                       transition-all duration-300 transform hover:scale-105 active:scale-95
                                       hover:shadow-[0_8px_25px_-5px_rgba(255,255,255,0.5)] inline-block"
                        >
                            Get Started
                        </NavLink>
                    </>
                )}
            </div>

            {/* Mobile Button with Rotate animation */}
            <div className="flex items-center gap-2 md:hidden">
                <button 
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="text-white p-2 focus:outline-none transition-transform duration-300 active:scale-75"
                    aria-label="Toggle mobile menu"
                >
                    <div className={`transition-all duration-300 ${mobileMenuOpen ? 'rotate-90' : 'rotate-0'}`}>
                        {mobileMenuOpen ? (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        ) : (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        )}
                    </div>
                </button>
            </div>
        </div>
    </div>
</nav>

        {/* Text Content */}
        <div className="absolute inset-0 z-20 flex items-start justify-start px-6 md:px-16 lg:px-24 pt-40 sm:pt-48 md:pt-56 lg:pt-64" style={{ fontFamily: "'Inter', sans-serif" }}>
          <div className="w-full max-w-[95vw]">
            <div key={currentIndex} className="animate-slideDown">
             {/* Added 'group' and transition properties to the parent */}
<h2 className="group flex flex-col text-white uppercase leading-[1.1] cursor-default transition-all duration-500">
  
  {firstWord && (
    <span className="block text-[7vw] md:text-[4vw] lg:text-[5.5rem] font-normal tracking-[0.15em] opacity-100 
                     transition-all duration-300 group-hover:text-white group-hover:drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]">
      {firstWord}
    </span>
  )}

  {remainingText && (
    <div className="flex mt-2 md:mt-4">
      <span className="inline-block ml-[10vw] md:ml-32 lg:ml-48 text-[7vw] md:text-[4vw] lg:text-[5rem] font-normal tracking-[0.1em] opacity-90 whitespace-nowrap 
                       transition-all duration-300 group-hover:opacity-100 group-hover:drop-shadow-[0_0_20px_rgba(255,255,255,0.6)]">
        {remainingText}
      </span>
    </div>
  )}
</h2>
              <p className="text-xs sm:text-sm md:text-base text-white/70 font-light ml-[10vw] md:ml-32 lg:ml-48 mt-6 tracking-[0.5em] uppercase">
                {currentItem.subtext}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Arrows */}
        <button
          onClick={prevSlide}
          className="absolute left-2 sm:left-4 md:left-8 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-3 md:p-4 transition-all duration-300 group"
          aria-label="Previous slide"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24" 
            strokeWidth={2} 
            stroke="currentColor" 
            className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 lg:w-12 lg:h-12 text-white group-hover:scale-110 transition-transform"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        
        <button
          onClick={nextSlide}
          className="absolute right-2 sm:right-4 md:right-8 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-3 md:p-4 transition-all duration-300 group"
          aria-label="Next slide"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24" 
            strokeWidth={2} 
            stroke="currentColor" 
            className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 lg:w-12 lg:h-12 text-white group-hover:scale-110 transition-transform"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </section>

      {/* OTHER SECTIONS */}
      <CreatorShowcase />
      <QuoteSection />
      <CreativeControl user={user} getUserDashboardPath={getUserDashboardPath} />
      <Vediosection user={user} getUserDashboardPath={getUserDashboardPath} />
      <Secondlast user={user} getUserDashboardPath={getUserDashboardPath} />
      <Lastsection user={user} getUserDashboardPath={getUserDashboardPath} />
    </>
  );
};

export default Home;