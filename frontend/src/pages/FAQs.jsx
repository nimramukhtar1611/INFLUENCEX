// pages/FAQs.jsx
import React, { useState,useEffect, useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import { Mail, Phone, MapPin } from 'lucide-react';
import WireframeSphere from '../components/WireframeSphere';

// Load Professional Typography
const link = document.createElement('link');
link.href = 'https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap';
link.rel = 'stylesheet';
document.head.appendChild(link);

// Background Animation Component (Three.js)
function ParticleNetwork() {
  const ref = useRef();
  
  // Create static positions for dots
  const [positions] = useState(() => {
    const pos = new Float32Array(2000 * 3);
    for (let i = 0; i < 2000; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 15;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 15;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 15;
    }
    return pos;
  });

  useFrame((state) => {
    const t = state.clock.getElapsedTime() * 0.1;
    ref.current.rotation.y = t;
    ref.current.rotation.x = t * 0.5;
  });

  return (
    <group rotation={[0, 0, Math.PI / 4]}>
      <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
        <PointMaterial
          transparent
          color="#a1a1aa"
          size={0.035}
          sizeAttenuation={true}
          depthWrite={false}
          opacity={0.4}
        />
      </Points>
    </group>
  );
}

const FAQs = () => {
  const [activeTopic, setActiveTopic] = React.useState('welcome');

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash) {
        const sectionId = hash.replace('#', '');
        setActiveTopic(sectionId);
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
      }
    };
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const scrollToSection = (sectionId) => {
    setActiveTopic(sectionId);
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const getTopicClassName = (topicId) => {
    const isActive = activeTopic === topicId;
    return `group relative flex items-center w-full text-left px-4 py-3 text-sm font-medium transition-all duration-300 rounded-lg ${
      isActive 
        ? 'bg-black text-white shadow-lg translate-x-2' 
        : 'text-gray-500 hover:bg-gray-900 hover:text-white'
    }`;
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative"
      style={{
        background: '#000000',
      }}
    >
      {/* Wireframe Sphere Background Animation */}
      <div className="absolute inset-0 overflow-hidden">
        <WireframeSphere />
      </div>
      
      {/* Content Layer */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <header className="mb-16 border-b border-gray-100 pb-8">
          <h1 className={`text-5xl font-bold tracking-tighter text-white mb-2`} style={{ fontFamily: 'Crimson Pro, serif' }}>
            Frequently Asked Questions
          </h1>
        </header>

        <div className="flex flex-col md:flex-row gap-16">
          
          {/* Sidebar Navigation */}
          <aside className="w-full md:w-64 flex-shrink-0">
            <div className="sticky top-12 space-y-8">
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-400 mb-6">
                  Navigation
                </h3>
                <nav className="space-y-2">
                  {[
                    { id: 'welcome', label: 'Getting Started' },
                    { id: 'creator', label: 'For Creators' },
                    { id: 'brand', label: 'For Brands' },
                    { id: 'payments', label: 'Payments' },
                    { id: 'campaigns', label: 'Campaigns' },
                    { id: 'technical', label: 'Technical Support' },
                    { id: 'contact', label: 'Contact Us' }
                  ].map((item) => (
                    <button 
                      key={item.id}
                      onClick={() => scrollToSection(item.id)}
                      className={getTopicClassName(item.id)}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full mr-3 transition-transform ${activeTopic === item.id ? 'bg-white scale-100' : 'bg-gray-300 scale-0'}`} />
                      {item.label}
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 max-w-3xl pb-32">
            <div className={`space-y-24 text-gray-300 leading-relaxed`}>
              
              <section id="welcome" className="scroll-mt-12 group">
                <h2 className={`text-2xl font-bold text-white mb-6 transition-transform duration-500 group-hover:-translate-x-2`} style={{ fontFamily: 'Crimson Pro, serif' }}>
                  01. Getting Started
                </h2>
                <div className="space-y-8 border-l-2 border-gray-100 pl-6">
                  <div className="space-y-4">
                    <h3 className={`text-lg font-semibold text-white`}>Q: How do I create an account on InfluenceX?</h3>
                    <p className='text-gray-400'>A: Simply click the "Sign Up" button, choose your account type (Creator or Brand), fill in your basic information, verify your email, and complete your profile. The entire process takes less than 5 minutes.</p>
                  </div>
                  <div className="space-y-4">
                    <h3 className={`text-lg font-semibold text-white`}>Q: What are the different account types available?</h3>
                    <p className='text-gray-400'>A: We offer Creator accounts for influencers and content creators, Brand accounts for businesses and agencies, and Admin accounts for platform management. Each type has tailored features and dashboard interfaces.</p>
                  </div>
                  <div className="space-y-4">
                    <h3 className={`text-lg font-semibold text-white`}>Q: How long does account verification take?</h3>
                    <p className='text-gray-400'>A: Account verification typically takes 24-48 hours. Our team reviews your profile to ensure authenticity and quality. You'll receive an email notification once your account is verified.</p>
                  </div>
                  <div className="space-y-4">
                    <h3 className={`text-lg font-semibold text-white`}>Q: What information do I need to get started?</h3>
                    <p className='text-gray-400'>A: You'll need your name, email address, phone number, and links to your social media profiles. For creators, we recommend adding your portfolio and audience demographics for better campaign matching.</p>
                  </div>
                </div>
              </section>

              <section id="creator" className="scroll-mt-12 group">
                <h2 className={`text-2xl font-bold text-white mb-6 transition-transform duration-500 group-hover:-translate-x-2`} style={{ fontFamily: 'Crimson Pro, serif' }}>
                  02. For Creators
                </h2>
                <div className="space-y-8 border-l-2 border-gray-100 pl-6">
                  <div className="space-y-4">
                    <h3 className={`text-lg font-semibold text-white`}>Q: How do I find and apply for campaigns?</h3>
                    <p className='text-gray-400'>A: Once verified, you'll see available campaigns on your dashboard. Filter by niche, payment type, and deadline. Click on any campaign to view details and submit your proposal with your creative approach and pricing.</p>
                  </div>
                  <div className="space-y-4">
                    <h3 className={`text-lg font-semibold text-white`}>Q: What makes a good creator profile?</h3>
                    <p className='text-gray-400'>A: A great profile includes professional photos, detailed bio, links to all active social media accounts, audience demographics, engagement rates, previous brand collaborations, and specific niches you specialize in.</p>
                  </div>
                  <div className="space-y-4">
                    <h3 className={`text-lg font-semibold text-white`}>Q: How and when do I get paid for campaigns?</h3>
                    <p className='text-gray-400'>A: Payments are typically released within 7-14 days after campaign completion and brand approval. We support bank transfers, PayPal, Payoneer, and cryptocurrency for international creators.</p>
                  </div>
                  <div className="space-y-4">
                    <h3 className={`text-lg font-semibold text-white`}>Q: Can I collaborate with other creators?</h3>
                    <p className='text-gray-400'>A: Yes! Our platform supports creator collaborations. You can team up with complementary creators for larger campaigns and split payments according to your agreement.</p>
                  </div>
                </div>
              </section>

              <section id="brand" className="scroll-mt-12 group">
                <h2 className={`text-2xl font-bold text-white mb-6 transition-transform duration-500 group-hover:-translate-x-2`} style={{ fontFamily: 'Crimson Pro, serif' }}>
                  03. For Brands
                </h2>
                <div className="space-y-8 border-l-2 border-gray-100 pl-6">
                  <div className="space-y-4">
                    <h3 className={`text-lg font-semibold text-white`}>Q: How do I create an effective campaign?</h3>
                    <p className='text-gray-400'>A: Start with clear objectives, define your target audience, set realistic budgets, and provide detailed creative briefs. Include specific deliverables, timeline, and brand guidelines for best results.</p>
                  </div>
                  <div className="space-y-4">
                    <h3 className={`text-lg font-semibold text-white`}>Q: How do I find the right creators for my brand?</h3>
                    <p className='text-gray-400'>A: Use our advanced filters for niche, demographics, engagement rates, and audience size. You can also use our AI-powered matching system or manually search and invite creators directly.</p>
                  </div>
                  <div className="space-y-4">
                    <h3 className={`text-lg font-semibold text-white`}>Q: What types of campaigns can I run?</h3>
                    <p className='text-gray-400'>A: You can create various campaign types including social media posts, product reviews, unboxing videos, tutorials, testimonials, brand ambassadorships, and event coverage.</p>
                  </div>
                  <div className="space-y-4">
                    <h3 className={`text-lg font-semibold text-white`}>Q: How do I track campaign performance?</h3>
                    <p className='text-gray-400'>A: Our dashboard provides real-time analytics including reach, engagement, clicks, conversions, and ROI. You can track individual creator performance and overall campaign metrics.</p>
                  </div>
                </div>
              </section>

              <section id="payments" className="scroll-mt-12 group">
                <h2 className={`text-2xl font-bold text-white mb-6 transition-transform duration-500 group-hover:-translate-x-2`} style={{ fontFamily: 'Crimson Pro, serif' }}>
                  04. Payments & Pricing
                </h2>
                <div className="space-y-8 border-l-2 border-gray-100 pl-6">
                  <div className="space-y-4">
                    <h3 className={`text-lg font-semibold text-white`}>Q: What payment methods are supported?</h3>
                    <p className='text-gray-400'>A: We support all major credit cards, bank transfers (ACH, wire), PayPal, Payoneer, and select cryptocurrencies for international transactions.</p>
                  </div>
                  <div className="space-y-4">
                    <h3 className={`text-lg font-semibold text-white`}>Q: What are the platform fees?</h3>
                    <p className='text-gray-400'>A: Platform fees vary by account type: Free accounts have 20% fees, Creator Pro accounts have 10% fees, and Creator Elite accounts have 5% fees. Brand accounts have custom pricing based on features.</p>
                  </div>
                  <div className="space-y-4">
                    <h3 className={`text-lg font-semibold text-white`}>Q: How are payments processed?</h3>
                    <p className='text-gray-400'>A: Brands fund campaigns upfront, and we hold payments in escrow until deliverables are approved. Once approved, payments are released to creators within 7-14 days.</p>
                  </div>
                  <div className="space-y-4">
                    <h3 className={`text-lg font-semibold text-white`}>Q: Are there refund options?</h3>
                    <p className='text-gray-400'>A: Yes, we offer a 14-day money-back guarantee for brand subscriptions. For campaigns, refunds are handled through our dispute resolution process based on deliverable completion.</p>
                  </div>
                </div>
              </section>

              <section id="campaigns" className="scroll-mt-12 group">
                <h2 className={`text-2xl font-bold text-white mb-6 transition-transform duration-500 group-hover:-translate-x-2`} style={{ fontFamily: 'Crimson Pro, serif' }}>
                  05. Campaign Management
                </h2>
                <div className="space-y-8 border-l-2 border-gray-100 pl-6">
                  <div className="space-y-4">
                    <h3 className={`text-lg font-semibold text-white`}>Q: How do I manage multiple campaigns simultaneously?</h3>
                    <p className='text-gray-400'>A: Our dashboard is designed to handle multiple campaigns at different stages. You can track progress, communicate with creators, and manage deadlines all from one central interface.</p>
                  </div>
                  <div className="space-y-4">
                    <h3 className={`text-lg font-semibold text-white`}>Q: What if a creator doesn't meet deadlines?</h3>
                    <p className='text-gray-400'>A: We have built-in deadline tracking and automated reminders. If issues persist, you can request extensions or escalate to our dispute resolution team for mediation.</p>
                  </div>
                  <div className="space-y-4">
                    <h3 className={`text-lg font-semibold text-white`}>Q: Can I reuse content from campaigns?</h3>
                    <p className='text-gray-400'>A: Usage rights are specified in each campaign contract. Standard campaigns typically include 30-90 day usage rights, while premium campaigns can include perpetual usage and exclusivity options.</p>
                  </div>
                  <div className="space-y-4">
                    <h3 className={`text-lg font-semibold text-white`}>Q: How do I handle content approvals?</h3>
                    <p className='text-gray-400'>A: Our platform includes a content approval workflow where creators submit content for review before publishing. You can request revisions, approve, or reject content with specific feedback.</p>
                  </div>
                </div>
              </section>

              <section id="technical" className="scroll-mt-12 group">
                              <h2 className={`text-2xl font-bold text-white mb-6 transition-transform duration-500 group-hover:-translate-x-2`} style={{ fontFamily: 'Crimson Pro, serif' }}>

                  06. Technical Support
                </h2>
                <div className="space-y-8 border-l-2 border-gray-100 pl-6">
                  <div className="space-y-4">
                    <h3 className={`text-lg font-semibold text-white`}>Q: What technical support is available?</h3>
                    <p className='text-gray-400'>A: We offer 24/7 email support for all users, live chat during business hours for Pro and Elite accounts, and priority phone support for Enterprise customers.</p>
                  </div>
                  <div className="space-y-4">
                    <h3 className={`text-lg font-semibold text-white`}>Q: What are the system requirements?</h3>
                    <p className='text-gray-400'>A: InfluenceX works on all modern browsers (Chrome, Firefox, Safari, Edge) updated within the last 2 years. Mobile apps are available for iOS 12+ and Android 8+.</p>
                  </div>
                  <div className="space-y-4">
                    <h3 className={`text-lg font-semibold text-white`}>Q: Is my data secure on the platform?</h3>
                    <p className='text-gray-400'>A: Yes, we use enterprise-grade encryption, regular security audits, and are SOC2 Type II compliant. All data is encrypted in transit and at rest, and we follow GDPR and CCPA compliance standards.</p>
                  </div>
                  <div className="space-y-4">
                    <h3 className={`text-lg font-semibold text-white`}>Q: How do I report bugs or technical issues?</h3>
                    <p className='text-gray-400'>A: You can report issues through the in-app feedback form, email support@influencex.com, or use the bug report feature in your account settings. Critical issues are prioritized and typically resolved within 24 hours.</p>
                  </div>
                </div>
              </section>

        

            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default FAQs;
