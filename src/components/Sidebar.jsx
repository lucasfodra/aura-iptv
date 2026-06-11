import React from 'react';
import { 
  Home, 
  ListVideo, 
  Tv, 
  Star, 
  Sparkles,
  Heart,
  Settings as SettingsIcon
} from 'lucide-react';
import './Sidebar.css';

export default function Sidebar({
  activeTab,
  setActiveTab,
  categories = [],
  activeCategory,
  setActiveCategory,
  channels = [],
  favorites = []
}) {
  const getCleanCategoryName = (name) => {
    if (!name) return '';
    const cleaned = name
      .replace(/^([\[(🟢🔵🔴⚫🟣🟡🟠🔴⚜️⚠️⚡🔥🎬🍿🎥📺🎞️🎵📻⚽🏆🎮👾].*?[\])]|\|.*?\||[^a-zA-Z0-9\sÁ-Úá-ú])+\s*/g, '')
      .trim();
    return cleaned || name;
  };

  // Calculate counts for categories
  const getCategoryCounts = () => {
    const counts = {
      Todos: channels.length,
      Favoritos: favorites.length
    };
    
    channels.forEach(channel => {
      if (channel.category) {
        counts[channel.category] = (counts[channel.category] || 0) + 1;
      }
    });
    
    return counts;
  };

  const counts = getCategoryCounts();

  return (
    <div className="sidebar">
      {/* Branding Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <Tv size={20} style={{ fill: '#000' }} />
        </div>
        <div className="sidebar-title-wrapper">
          <span className="sidebar-title">Aura IPTV</span>
          <span className="sidebar-subtitle">Premium Edition</span>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <nav className="sidebar-nav">
        <button 
          className={`sidebar-nav-item ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => setActiveTab('home')}
        >
          <Home size={18} />
          <span>Início</span>
        </button>
        
        <button 
          className={`sidebar-nav-item ${activeTab === 'playlists' ? 'active' : ''}`}
          onClick={() => setActiveTab('playlists')}
        >
          <ListVideo size={18} />
          <span>Playlists</span>
        </button>

        <button 
          className={`sidebar-nav-item ${activeTab === 'channels' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('channels');
            // Default to 'Todos' category when clicking Channels tab
            if (activeCategory === 'Favoritos' && favorites.length === 0) {
              setActiveCategory('Todos');
            }
          }}
        >
          <Tv size={18} />
          <span>Canais</span>
        </button>

        <button 
          className={`sidebar-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <SettingsIcon size={18} />
          <span>Configurações</span>
        </button>
      </nav>

      {/* Categories section - only visible on Channels tab */}
      {activeTab === 'channels' && (
        <div className="sidebar-categories-section">
          <div className="sidebar-section-title">Categorias</div>
          <div className="sidebar-categories-list">
            
            {/* All Channels Category */}
            <button 
              className={`category-item ${activeCategory === 'Todos' ? 'active' : ''}`}
              onClick={() => setActiveCategory('Todos')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} className="category-name">
                <LayersIcon size={14} />
                <span>Todos os Canais</span>
              </div>
              <span className="category-count">{counts.Todos || 0}</span>
            </button>

            {/* Favorites Category */}
            <button 
              className={`category-item ${activeCategory === 'Favoritos' ? 'active' : ''}`}
              onClick={() => setActiveCategory('Favoritos')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ffd166' }} className="category-name">
                <Star size={14} fill={favorites.length > 0 ? '#ffd166' : 'none'} />
                <span>Favoritos</span>
              </div>
              <span className="category-count" style={{ color: favorites.length > 0 ? '#ffd166' : 'inherit' }}>
                {counts.Favoritos || 0}
              </span>
            </button>

            {/* Dynamic M3U Categories */}
            {categories.map((cat, idx) => (
              <button 
                key={idx}
                className={`category-item ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                <span className="category-name">{getCleanCategoryName(cat)}</span>
                <span className="category-count">{counts[cat] || 0}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="sidebar-footer" style={{ flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <span>Aura IPTV v1.0.0</span>
          <button 
            className="update-btn-sidebar" 
            onClick={(e) => {
              e.target.innerText = "Buscando...";
              setTimeout(() => {
                window.location.reload(true);
              }, 1000);
            }}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '4px',
              color: 'var(--accent-secondary)',
              fontSize: '0.7rem',
              padding: '4px 8px',
              cursor: 'pointer'
            }}
          >
            Atualizar
          </button>
        </div>
      </div>
    </div>
  );
}

// Inline fallback icon for Layers if lucide doesn't load it
function LayersIcon({ size = 14 }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="m12 3-10 9h18Z" />
      <path d="m2 17 10 9 10-9" />
      <path d="m2 12 10 9 10-9" />
    </svg>
  );
}
