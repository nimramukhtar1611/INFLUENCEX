import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { Mail, Phone, MapPin } from 'lucide-react';
import WireframeSphere from '../components/WireframeSphere';

// --- Animated Background Component (Three.js) ---
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

// --- Main Page Component ---
const PrivacyPolicy = () => {
  const [activeTopic, setActiveTopic] = useState('welcome');

  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=Poppins:wght@300;400;500;600&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

  const scrollToSection = (sectionId) => {
    setActiveTopic(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 80;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const topics = [
    { id: 'welcome', label: 'Privacy Policy Overview' },
    { id: 'information', label: 'Information We Collect' },
    { id: 'usage', label: 'How We Use Your Information' },
    { id: 'sharing', label: 'Information Sharing' },
    { id: 'cookies', label: 'Cookies and Tracking' },
    { id: 'security', label: 'Data Security' },
    { id: 'rights', label: 'Your Privacy Rights' },
    { id: 'children', label: "Children's Privacy" },
    { id: 'international', label: 'International Transfers' },
    { id: 'changes', label: 'Policy Changes' },
    { id: 'contact', label: 'Contact Us' },
  ];

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
      
      {/* Main Content Layer */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-20 py-12">
        
        {/* Page Title */}
        <header className="mb-16 animate-in fade-in slide-in-from-top-4 duration-1000">
          <div className="flex justify-between items-start">
            <div>
              <h1 className={`text-3xl md:text-5xl font-bold tracking-tight text-white mb-2`} style={{ fontFamily: 'Crimson Pro, serif' }}>
                Privacy Policy
              </h1>
              <div className={`h-1 w-20 bg-white`}></div>
            </div>
           <p className="text-sm text-gray-400 hover:text-white transition-colors duration-300 flex items-center gap-2 bg-gray-900 px-4 py-2 rounded-lg hover:bg-gray-800">
  <Link 
    to="/faqs" 
    target="_blank" 
    rel="noopener noreferrer"
  >
    Do you have any question? FAQs
  </Link>
</p>
          </div>
        </header>

        <div className="flex flex-col lg:flex-row gap-16">
          
          {/* Sticky Sidebar Navigation */}
          <aside className="lg:w-72 flex-shrink-0">
            <div className="sticky top-12 space-y-8">
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-6 px-3">
                  Navigation
                </h3>
                <nav className="flex flex-col space-y-1">
                  {topics.map((topic) => (
                    <button
                      key={topic.id}
                      onClick={() => scrollToSection(topic.id)}
                      className={`group relative text-left px-4 py-3 text-sm transition-all duration-300 rounded-lg ${
                        activeTopic === topic.id 
                          ? 'bg-black text-white translate-x-2' 
                          : 'text-gray-500 hover:text-white hover:bg-gray-900'
                      }`}
                    >
                      {topic.label}
                      {activeTopic === topic.id && (
                        <span className="absolute left-[-8px] top-1/2 -translate-y-1/2 w-1 h-4 bg-black rounded-full" />
                      )}
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          </aside>

          {/* Document Content */}
          <main className="flex-1 max-w-3xl pb-32">
            <div className={`space-y-24 text-gray-300 leading-relaxed`}>
              
              <section id="welcome" className="scroll-mt-20 group">
                <h2 className={`text-3xl font-bold text-white mb-6 transition-transform group-hover:translate-x-2 duration-500`} style={{ fontFamily: 'Crimson Pro, serif' }}>
                  01. Overview
                </h2>
                <div className="space-y-6 text-[15px] font-light">
                  <p className='text-gray-400'>InfluenceX, Inc. ("InfluenceX," "we," "us," or "our") is committed to protecting your privacy. This policy governs your access to and use of the InfluenceX Platform.</p>
                  <p className='text-gray-400'>By using the Platform, you acknowledge the collection and use of information in accordance with this document. If you do not agree, please cease use immediately.</p>
                </div>
              </section>

              <section id="information" className="scroll-mt-20 group">
                <h2 className={`text-3xl font-bold text-white mb-6 transition-transform group-hover:translate-x-2 duration-500`} style={{ fontFamily: 'Crimson Pro, serif' }}>
                  02. Information We Collect
                </h2>
                <div className="grid gap-8">
                  <div className="border-l border-gray-100 pl-6 py-2 hover:border-black transition-colors duration-500">
                    <h3 className={`text-lg font-semibold mb-3 text-white`}>Personal Identity</h3>
                    <ul className={`space-y-2 text-sm list-none text-gray-400`}>
                      <li>• Legal Name and Contact Credentials</li>
                      <li>• Biometric & Authentication Data</li>
                      <li>• Financial Metadata & Billing Records</li>
                    </ul>
                  </div>
                  <div className="border-l border-gray-100 pl-6 py-2 hover:border-black transition-colors duration-500">
                    <h3 className={`text-lg font-semibold mb-3 text-white`}>Technical Footprint</h3>
                    <ul className={`space-y-2 text-sm list-none text-gray-400`}>
                      <li>• IP Protocols and Device Identifiers</li>
                      <li>• Browser Engine and OS Architecture</li>
                      <li>• Network Latency and Access Logs</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section id="usage" className="scroll-mt-20 group">
                <h2 className={`text-3xl font-bold text-white mb-6 transition-transform group-hover:translate-x-2 duration-500`} style={{ fontFamily: 'Crimson Pro, serif' }}>
                  03. Utilization Protocols
                </h2>
                <div className="bg-gray-900/50 backdrop-blur-sm p-8 rounded-2xl border border-gray-700">
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {['Platform Optimization', 'Transaction Processing', 'Security Analysis', 'Custom UX Delivery', 'Legal Compliance', 'R&D Innovation'].map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-black rounded-full" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              <section id="sharing" className="scroll-mt-20 group">
                <h2 className={`text-3xl font-bold text-white mb-6 transition-transform group-hover:translate-x-2 duration-500`} style={{ fontFamily: 'Crimson Pro, serif' }}>
                  04. Data Dissemination
                </h2>
                <p className={`text-[15px] font-light mb-6 text-gray-400`}>We share information only under strict operational frameworks:</p>
                <div className="space-y-4">
                  <div className="p-4 border border-gray-700 rounded-xl hover:bg-gray-800 hover:shadow-xl hover:shadow-gray-600/50 transition-all duration-500">
                    <h4 className={`font-semibold mb-1 text-white`}>Service Ecosystem</h4>
                    <p className={`text-xs text-gray-400`}>Cloud infrastructure and financial processing partners.</p>
                  </div>
                  <div className="p-4 border border-gray-700 rounded-xl hover:bg-gray-800 hover:shadow-xl hover:shadow-gray-600/50 transition-all duration-500">
                    <h4 className={`font-semibold mb-1 text-white`}>Peer Interaction</h4>
                    <p className={`text-xs text-gray-400`}>Visibility settings controlled by your account preferences.</p>
                  </div>
                </div>
              </section>

              {/* Continuing Sections with identical premium styling */}
              <section id="cookies" className="scroll-mt-20 group">
                <h2 className={`text-3xl font-bold text-white mb-6 transition-transform group-hover:translate-x-2 duration-500`} style={{ fontFamily: 'Crimson Pro, serif' }}>
                  05. Tracking Technologies
                </h2>
                <div className="flex flex-wrap gap-3">
                  {['Essential', 'Performance', 'Functional', 'Targeting'].map(tag => (
                    <span key={tag} className="px-4 py-2 border border-black text-[10px] font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-all cursor-default">
                      {tag}
                    </span>
                  ))}
                </div>
              </section>

              <section id="security" className="scroll-mt-20 group">
                <h2 className={`text-3xl font-bold text-white mb-6 transition-transform group-hover:translate-x-2 duration-500`} style={{ fontFamily: 'Crimson Pro, serif' }}>
                  06. Encryption & Security
                </h2>
                <p className="text-[15px] font-light italic text-gray-500 border-l-4 border-black pl-4">
                  "We utilize TLS 1.3 encryption and SOC2 Type II compliant storage to ensure data integrity at every node."
                </p>
              </section>

              <section id="rights" className="scroll-mt-20 group">
                <h2 className={`text-3xl font-bold text-white mb-6 transition-transform group-hover:translate-x-2 duration-500`} style={{ fontFamily: 'Crimson Pro, serif' }}>
                  07. Sovereignty Rights
                </h2>
                <ul className="space-y-4 text-sm">
                  <li className="flex justify-between border-b border-gray-100 pb-2"><span>Right to Access</span><span className="text-gray-400">Available</span></li>
                  <li className="flex justify-between border-b border-gray-100 pb-2"><span>Right to Erasure</span><span className="text-gray-400">Available</span></li>
                  <li className="flex justify-between border-b border-gray-100 pb-2"><span>Portability</span><span className="text-gray-400">Available</span></li>
                </ul>
              </section>

              <section id="children" className="scroll-mt-20 group">
                <h2 className={`text-3xl font-bold text-white mb-6 transition-transform group-hover:translate-x-2 duration-500`} style={{ fontFamily: 'Crimson Pro, serif' }}>
                  08. Minor Safeguards
                </h2>
                <p className={`text-[15px] font-light text-gray-400`}>The Platform is restricted to individuals aged 18+. We do not knowingly index data from minors.</p>
              </section>

              <section id="international" className="scroll-mt-20 group">
                <h2 className={`text-3xl font-bold text-white mb-6 transition-transform group-hover:translate-x-2 duration-500`} style={{ fontFamily: 'Crimson Pro, serif' }}>
                  09. Global Transfers
                </h2>
                <p className={`text-[15px] font-light text-gray-400`}>Data is routed through Standard Contractual Clauses (SCCs) for cross-border protection.</p>
              </section>

              <section id="changes" className="scroll-mt-20 group">
                <h2 className={`text-3xl font-bold text-white mb-6 transition-transform group-hover:translate-x-2 duration-500`} style={{ fontFamily: 'Crimson Pro, serif' }}>
                  10. Amendments
                </h2>
                <p className={`text-[15px] font-light text-gray-400`}>Updates are effective upon posting. Significant shifts will be broadcasted via secure email dispatch.</p>
              </section>

             <section id="contact" className="scroll-mt-20 max-w-md group bg-black text-white p-6 rounded-2xl transition-transform hover:scale-[1.02] duration-700">
  <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: 'Crimson Pro, serif' }}>
    Contact Registry
  </h2>
  
  <div className="space-y-5">
    {/* Email Item */}
    <div className="flex items-center gap-4 group/item">
      <div className="w-10 h-10 rounded-full border border-gray-800 flex items-center justify-center group-hover/item:bg-white group-hover/item:text-black transition-all">
        <Mail size={16} />
      </div>
      <div>
        <p className="text-[9px] uppercase tracking-[0.2em] text-gray-500 mb-0.5">Legal Inquiry</p>
        <p className="text-base font-medium">privacy@influencex.com</p>
      </div>
    </div>

    {/* Location Item */}
    <div className="flex items-center gap-4 group/item">
      <div className="w-10 h-10 rounded-full border border-gray-800 flex items-center justify-center group-hover/item:bg-white group-hover/item:text-black transition-all">
        <MapPin size={16} />
      </div>
      <div>
        <p className="text-[9px] uppercase tracking-[0.2em] text-gray-500 mb-0.5">Global HQ</p>
        <p className="text-base font-medium">San Francisco, CA 94105</p>
      </div>
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

export default PrivacyPolicy;