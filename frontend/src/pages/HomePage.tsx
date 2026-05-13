import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import api from '../services/api';
import { useAuthStore } from '../store/useAuthStore';

const CATEGORIES = [
  { id: 'all', label: 'All Templates', icon: '✨' },
  { id: 'birthday', label: 'Birthday', icon: '🎂' },
  { id: 'anniversary', label: 'Anniversary', icon: '💑' },
  { id: 'festival', label: 'Festivals', icon: '🎊' },
  { id: 'general', label: 'General', icon: '🌟' },
];

interface Template {
  _id: string;
  title: string;
  category: string;
  thumbnailUrl: string;
  isPremium: boolean;
  overlayConfig: any;
}

// Stunning, high-quality Unsplash templates
const MOCK_TEMPLATES: Template[] = [
  { _id: '2', title: 'Golden Anniversary', category: 'anniversary', isPremium: true, thumbnailUrl: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80&w=800', overlayConfig: { profilePicture: { x: 35, y: 10, width: 30, height: 30, shape: 'circle' }, nameText: { x: 50, y: 55, fontSize: 26, color: '#f5c518' } } },
  { _id: '3', title: 'Festival of Lights', category: 'festival', isPremium: false, thumbnailUrl: 'https://images.unsplash.com/photo-1514222134-b57cbb8ce073?auto=format&fit=crop&q=80&w=800', overlayConfig: { profilePicture: { x: 35, y: 20, width: 30, height: 30, shape: 'circle' }, nameText: { x: 50, y: 65, fontSize: 26, color: '#ffeb3b' } } },
  { _id: '4', title: 'Minimalist Celebration', category: 'birthday', isPremium: false, thumbnailUrl: 'https://images.unsplash.com/photo-1558636508-e0db3814bd1d?auto=format&fit=crop&q=80&w=800', overlayConfig: { profilePicture: { x: 35, y: 15, width: 30, height: 30, shape: 'circle' }, nameText: { x: 50, y: 60, fontSize: 24, color: '#ffffff' } } },
  { _id: '5', title: 'Luxury Sparkle', category: 'anniversary', isPremium: true, thumbnailUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=800', overlayConfig: { profilePicture: { x: 35, y: 15, width: 30, height: 30, shape: 'circle' }, nameText: { x: 50, y: 60, fontSize: 24, color: '#ffffff' } } },
  { _id: '6', title: 'Colorful Holi', category: 'festival', isPremium: false, thumbnailUrl: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?auto=format&fit=crop&q=80&w=800', overlayConfig: { profilePicture: { x: 35, y: 20, width: 30, height: 30, shape: 'circle' }, nameText: { x: 50, y: 65, fontSize: 26, color: '#ffffff' } } },
  { _id: '8', title: 'Premium Night Sky', category: 'general', isPremium: true, thumbnailUrl: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&q=80&w=800', overlayConfig: { profilePicture: { x: 35, y: 20, width: 30, height: 30, shape: 'circle' }, nameText: { x: 50, y: 65, fontSize: 28, color: '#a855f7' } } },
];

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeCategory, setActiveCategory] = useState('all');
  const [templates, setTemplates] = useState<Template[]>(MOCK_TEMPLATES);
  const [loading, setLoading] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [selectedPremiumTemplate, setSelectedPremiumTemplate] = useState<Template | null>(null);

  // Fetch real templates from API (works once DB is populated)
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        const params = activeCategory !== 'all' ? `?category=${activeCategory}` : '';
        const { data } = await api.get(`/templates${params}`);
        if (data.data && data.data.length > 0) {
          setTemplates(data.data);
        } else {
          // Fallback to mock data while DB is empty
          const filtered = activeCategory === 'all'
            ? MOCK_TEMPLATES
            : MOCK_TEMPLATES.filter(t => t.category === activeCategory);
          setTemplates(filtered);
        }
      } catch {
        const filtered = activeCategory === 'all'
          ? MOCK_TEMPLATES
          : MOCK_TEMPLATES.filter(t => t.category === activeCategory);
        setTemplates(filtered);
      } finally {
        setLoading(false);
      }
    };
    fetchTemplates();
  }, [activeCategory]);

  const handleTemplateClick = (template: Template) => {
    if (template.isPremium && user?.subscriptionStatus !== 'premium') {
      setSelectedPremiumTemplate(template);
      setShowPremiumModal(true);
      return;
    }
    if (!user) {
      navigate('/login');
      return;
    }
    navigate(`/editor/${template._id}`, { state: { template } });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Hero */}
      <div className="py-12 px-4 text-center">
        <div className="max-w-3xl mx-auto">

          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Create Personalized Greetings
          </h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            Pick a template, add your photo & name — share a beautiful personalized greeting in seconds.
          </p>
        </div>
      </div>

      {/* Category Filter */}
      <div className="max-w-7xl mx-auto px-4 mb-8">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeCategory === cat.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <span>{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Template Grid */}
      <div className="max-w-7xl mx-auto px-4 pb-16">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square rounded bg-gray-200 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {templates.map(template => (
              <TemplateCard
                key={template._id}
                template={template}
                user={user}
                onClick={() => handleTemplateClick(template)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Premium Modal */}
      {showPremiumModal && (
        <PremiumModal
          template={selectedPremiumTemplate}
          onClose={() => setShowPremiumModal(false)}
          onUpgrade={() => navigate('/profile')}
        />
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────

function TemplateCard({ template, user, onClick }: { template: Template; user: any; onClick: () => void }) {
  return (
    <div
      className="relative group cursor-pointer rounded overflow-hidden border border-gray-200 bg-white hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="aspect-square relative overflow-hidden bg-black/40">
        <img
          src={template.thumbnailUrl}
          alt={template.title}
          className="w-full h-full object-cover"
        />



        {/* User Photo Overlay Simulation */}
        {user && (
          <div
            className="absolute rounded-full border-2 border-white shadow-lg overflow-hidden transition-all duration-300"
            style={{
              left: `${template.overlayConfig.profilePicture.x}%`,
              top: `${template.overlayConfig.profilePicture.y}%`,
              width: `${template.overlayConfig.profilePicture.width}%`,
              height: `${template.overlayConfig.profilePicture.height}%`,
            }}
          >
            {user.profilePicture ? (
              <img src={user.profilePicture} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                {user.name[0]?.toUpperCase()}
              </div>
            )}
          </div>
        )}

        {/* Name Overlay Simulation */}
        {user && (
          <p
            className="absolute font-bold text-shadow transition-all duration-300"
            style={{
              left: `${template.overlayConfig.nameText.x}%`,
              top: `${template.overlayConfig.nameText.y}%`,
              color: template.overlayConfig.nameText.color,
              fontSize: '14px',
              transform: 'translateX(-50%)',
              textShadow: '0 1px 4px rgba(0,0,0,0.8)',
            }}
          >
            {user.name}
          </p>
        )}

        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="bg-white text-gray-900 text-sm font-semibold px-4 py-2 rounded">
            {template.isPremium && user?.subscriptionStatus !== 'premium' ? '🔒 Unlock Pro' : 'Use Template'}
          </span>
        </div>
      </div>

      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-800 font-medium truncate pr-2">{template.title}</p>
            <p className="text-xs text-gray-500 uppercase mt-0.5">{template.category}</p>
          </div>
          {template.isPremium ? (
            <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded">
              PRO
            </span>
          ) : (
            <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded border border-gray-200">
              Free
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function PremiumModal({ template, onClose, onUpgrade }: { template: Template | null; onClose: () => void; onUpgrade: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative glass-card p-8 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Premium Template</h2>
          <p className="text-gray-600 text-sm">
            "{template?.title}" is a premium template.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="card p-4 text-center border border-gray-200">
            <p className="text-xl font-bold text-gray-900">₹99</p>
            <p className="text-gray-500 text-xs">/ month</p>
            <button onClick={onUpgrade} className="btn-primary w-full mt-3 text-sm py-2">Monthly</button>
          </div>
          <div className="card p-4 text-center border border-blue-500 relative">
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-blue-100 text-blue-800 px-1 text-xs font-bold rounded">SAVE</span>
            <p className="text-xl font-bold text-gray-900">₹999</p>
            <p className="text-gray-500 text-xs">/ year</p>
            <button onClick={onUpgrade} className="btn-primary w-full mt-3 text-sm py-2">Yearly</button>
          </div>
        </div>

        <button onClick={onClose} className="w-full text-gray-500 hover:text-gray-800 text-sm transition-colors">
          Maybe later
        </button>
      </div>
    </div>
  );
}
