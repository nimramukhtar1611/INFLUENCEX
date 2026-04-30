// pages/TermsOfService.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
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

  useEffect(() => {
    const t = 0.1;
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
const TermsOfService = () => {
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
          <div className="flex justify-between items-start">
            <h1 className={`text-5xl font-bold tracking-tighter text-white mb-2`} style={{ fontFamily: 'Crimson Pro, serif' }}>
              Terms of Service
            </h1>
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
                    { id: 'welcome', label: 'Welcome' },
                    { id: 'account', label: 'Your Account' },
                    { id: 'services', label: 'Our Services' },
                    { id: 'abusive', label: 'Abusive Conduct' },
                    { id: 'copyright', label: 'Copyright & IP' },
                    { id: 'content', label: 'Restrictions' },
                    { id: 'payment', label: 'Payments' },
                    { id: 'cancellation', label: 'Cancellation' },
                    { id: 'disputes', label: 'Disputes' },
                    { id: 'liability', label: 'Liability' },
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
                  01. Welcome to InfluenceX!
                </h2>
                <div className="space-y-6 border-l-2 border-gray-100 pl-6">
                  <p className='text-gray-400'>These Terms of Service constitute a legally binding agreement made between you and InfluenceX, Inc. concerning your access to and use of the InfluenceX Platform.</p>
                  <p className='text-gray-400'>By accessing the Platform, you acknowledge that you have read, understood, and agree to be bound by these terms. If you do not agree, you must cease use immediately.</p>
                </div>
              </section>

              <section id="account" className="scroll-mt-12 group">
                <h2 className={`text-2xl font-bold text-white mb-6 transition-transform duration-500 group-hover:-translate-x-2`} style={{ fontFamily: 'Crimson Pro, serif' }}>
                  02. Your Account
                </h2>
                <div className="space-y-6 border-l-2 border-gray-100 pl-6">
                  <p className='text-gray-400'>Registration requires adherence to the following protocols:</p>
                  <ul className="space-y-4">
                    {['Provide accurate, complete information', 'Maintain account security and passwords', 'Notify us of unauthorized access', 'Prohibit use of third-party accounts'].map((text, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-black flex-shrink-0" />
                        <span className='text-gray-400'>{text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              <section id="services" className="scroll-mt-12 group">
                <h2 className={`text-2xl font-bold text-white mb-6`} style={{ fontFamily: 'Crimson Pro, serif' }}>
                  03. Our Services
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-l-2 border-gray-100 pl-6">
                  {[
                    'Campaign Management', 'Creator Matching', 'Contract Facilitation', 
                    'Performance Analytics', 'Payment Processing', 'Messaging Systems',
                    'Content Approval', 'Audience Insights'
                  ].map((service, i) => (
                    <div key={i} className="p-4 bg-gray-900 rounded-lg text-sm font-medium hover:bg-black hover:text-white transition-colors cursor-default">
                      {service}
                    </div>
                  ))}
                </div>
              </section>

              <section id="abusive" className="scroll-mt-12 group">
                <h2 className={`text-2xl font-bold text-white mb-6 transition-transform duration-500 group-hover:-translate-x-2`} style={{ fontFamily: 'Crimson Pro, serif' }}>
                  04. Abusive Conduct
                </h2>
                <div className="space-y-4 border-l-2 border-gray-100 pl-6">
                  <p className={`text-sm font-bold text-white uppercase tracking-widest`}>Strictly Prohibited:</p>
                  <div className={`space-y-2 text-gray-400 opacity-80`}>
                    <p>• Harassment, bullying, or threatening behavior</p>
                    <p>• Hate speech or discriminatory remarks</p>
                    <p>• Spam and unsolicited commercial messaging</p>
                    <p>• Fraudulent impersonation of entities</p>
                  </div>
                </div>
              </section>

              <section id="copyright" className="scroll-mt-12 group">
                <h2 className={`text-2xl font-bold text-white mb-6`} style={{ fontFamily: 'Crimson Pro, serif' }}>
                  05. Copyright and IP
                </h2>
                <div className="p-8 bg-black text-white rounded-2xl space-y-4">
                  <p>All Platform architectural elements, including software, graphics, and logos, remain the exclusive property of InfluenceX.</p>
                  <p className="text-gray-400 text-sm italic">You grant us a worldwide, royalty-free license to use content you post in connection with our services.</p>
                </div>
              </section>

              <section id="content" className="scroll-mt-12">
                <h2 className={`text-2xl font-bold text-white mb-6`} style={{ fontFamily: 'Crimson Pro, serif' }}>
                  06. Content Restrictions
                </h2>
                <div className="space-y-4 border-l-2 border-gray-100 pl-6">
                  <p className='text-gray-400'>We maintain a zero-tolerance policy for content involving illegal activities, explicit adult material, malware, or deceptive information. Violation results in immediate content removal and potential account termination.</p>
                </div>
              </section>

              <section id="payment" className="scroll-mt-12">
                <h2 className={`text-2xl font-bold text-white mb-6`} style={{ fontFamily: 'Crimson Pro, serif' }}>
                  07. Payment Services
                </h2>
                <div className="overflow-hidden border border-gray-200 rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <tbody className="divide-y divide-gray-100">
                      <tr><td className="p-4 text-sm font-bold bg-gray-900">Currency</td><td className="p-4 text-sm">USD (Global Standard)</td></tr>
                      <tr><td className="p-4 text-sm font-bold bg-gray-900">Billing</td><td className="p-4 text-sm">Monthly / Annual Advance</td></tr>
                      <tr><td className="p-4 text-sm font-bold bg-gray-900">Taxes</td><td className="p-4 text-sm">Location-dependent applied at checkout</td></tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section id="cancellation" className="scroll-mt-12">
                <h2 className={`text-2xl font-bold text-white mb-6`} style={{ fontFamily: 'Crimson Pro, serif' }}>
                  08. Cancellation
                </h2>
                <p className={`border-l-2 border-gray-100 pl-6 text-gray-400`}>Subscriptions remain active until the end of the current billing cycle. Data associated with deleted accounts is permanently purged after a 30-day grace period.</p>
              </section>

              <section id="disputes" className="scroll-mt-12">
                <h2 className={`text-2xl font-bold text-white mb-6`} style={{ fontFamily: 'Crimson Pro, serif' }}>
                  09. Disputes
                </h2>
                <p className={`bg-gray-900 p-6 rounded-lg text-sm text-gray-400`}>Governed by the laws of the State of California. All legal proceedings shall be conducted within the courts of San Francisco, California.</p>
              </section>

              <section id="liability" className="scroll-mt-12">
                <h2 className={`text-2xl font-bold text-white mb-6`} style={{ fontFamily: 'Crimson Pro, serif' }}>
                  10. Liability
                </h2>
                <p className={`border-l-2 border-gray-100 pl-6 italic text-gray-400`}>Total liability is capped at the amount paid to InfluenceX during the twelve (12) months preceding any claim.</p>
              </section>

              <section id="contact" className="scroll-mt-12 border-t border-gray-200 pt-16">
                <h2 className={`text-2xl font-bold text-white mb-8`} style={{ fontFamily: 'Crimson Pro, serif' }}>
                  Contact Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="flex items-center gap-4 group">
                      <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all">
                        <Mail size={20} />
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase text-gray-400">Email</p>
                        <p className="text-sm font-medium">legal@influencex.com</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 group">
                      <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all">
                        <Phone size={20} />
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase text-gray-400">Phone</p>
                        <p className="text-sm font-medium">+1 (555) 123-4567</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 group">
                    <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase text-gray-400">Address</p>
                      <p className="text-sm font-medium leading-relaxed">
                        123 Business Ave, Suite 100,<br />
                        San Francisco, CA 94105
                      </p>
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

export default TermsOfService;