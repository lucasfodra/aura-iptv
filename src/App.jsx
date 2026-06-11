import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Player from './components/Player';
import ChannelGrid from './components/ChannelGrid';
import PlaylistManager from './components/PlaylistManager';
import { getCategories } from './utils/m3uParser';
import { dbGet, dbSet, dbClear } from './utils/db';
import { initSpatialNavigation } from './utils/spatialNavigation';
import { 
  Tv, 
  Layers, 
  Star, 
  Play, 
  Sparkles,
  Settings as SettingsIcon,
  Trash2,
  ListVideo
} from 'lucide-react';
import './App.css';

export default function App() {
  // Navigation & View State
  const [activeTab, setActiveTab] = useState('home');
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);
  
  // Data State
  const [playlists, setPlaylists] = useState([]);
  const [activePlaylistId, setActivePlaylistId] = useState('');
  const [favorites, setFavorites] = useState([]);
  const [recentlyWatched, setRecentlyWatched] = useState([]);
  const [currentChannel, setCurrentChannel] = useState(null);

  // Settings State
  const [settings, setSettings] = useState({
    lowLatency: true,
    autoPlayNext: false,
    useCorsProxy: true
  });

  // Load Initial Data from storage (localStorage + IndexedDB)
  useEffect(() => {
    const loadAllData = async () => {
      try {
        const storedFavorites = localStorage.getItem('aura_iptv_favorites');
        const storedRecent = localStorage.getItem('aura_iptv_recent');
        const storedSettings = localStorage.getItem('aura_iptv_settings');
        const storedActiveId = localStorage.getItem('aura_iptv_active_id');

        if (storedFavorites) setFavorites(JSON.parse(storedFavorites));
        if (storedRecent) setRecentlyWatched(JSON.parse(storedRecent));
        if (storedSettings) {
          const parsed = JSON.parse(storedSettings);
          setSettings(prev => ({
            ...prev,
            ...parsed
          }));
        }

        // Load playlists from IndexedDB
        const storedPlaylists = await dbGet('aura_iptv_playlists');
        if (storedPlaylists) setPlaylists(storedPlaylists);
        if (storedActiveId) setActivePlaylistId(storedActiveId);
      } catch (err) {
        console.error('Error loading data from storage:', err);
      }
    };
    loadAllData();
  }, []);

  // Initialize Spatial Navigation for TV Remote / Keyboard D-Pad
  useEffect(() => {
    const cleanUp = initSpatialNavigation();
    return () => cleanUp();
  }, []);

  // Manage browser history to handle TV hardware Back button without closing the app
  useEffect(() => {
    if (isPlayerExpanded) {
      window.history.pushState({ playerExpanded: true }, '');
    }
  }, [isPlayerExpanded]);

  useEffect(() => {
    const handlePopState = (e) => {
      if (isPlayerExpanded) {
        setIsPlayerExpanded(false);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isPlayerExpanded]);

  // Handle Backspace/Escape keys to close the full-screen player
  useEffect(() => {
    const handleBackKey = (e) => {
      if (!isPlayerExpanded) return;
      
      if (e.key === 'Escape' || e.key === 'Backspace') {
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
          return;
        }
        e.preventDefault();
        
        // Use history back to trigger popstate listener and close player
        if (window.history.state && window.history.state.playerExpanded) {
          window.history.back();
        } else {
          setIsPlayerExpanded(false);
        }
      }
    };

    window.addEventListener('keydown', handleBackKey, true);
    return () => window.removeEventListener('keydown', handleBackKey, true);
  }, [isPlayerExpanded]);

  // Sync playlists to IndexedDB
  const savePlaylistsToStorage = async (newPlaylists) => {
    try {
      await dbSet('aura_iptv_playlists', newPlaylists);
    } catch (err) {
      console.error('Error saving playlists to IndexedDB:', err);
    }
  };

  // 1. Add Playlist
  const handleAddPlaylist = (name, channels, url) => {
    const newPlaylist = {
      id: `playlist-${Date.now()}`,
      name,
      url,
      channels
    };

    const updated = [...playlists, newPlaylist];
    setPlaylists(updated);
    savePlaylistsToStorage(updated);

    // If it's the first playlist, set it active automatically
    if (!activePlaylistId) {
      setActivePlaylistId(newPlaylist.id);
      localStorage.setItem('aura_iptv_active_id', newPlaylist.id);
    }
  };

  // 2. Delete Playlist
  const handleDeletePlaylist = (id) => {
    const updated = playlists.filter(p => p.id !== id);
    setPlaylists(updated);
    savePlaylistsToStorage(updated);

    if (activePlaylistId === id) {
      const nextActiveId = updated.length > 0 ? updated[0].id : '';
      setActivePlaylistId(nextActiveId);
      localStorage.setItem('aura_iptv_active_id', nextActiveId);
      setCurrentChannel(null); // Clear video player
    }
  };

  // 3. Select Playlist
  const handleSelectPlaylist = (id) => {
    setActivePlaylistId(id);
    localStorage.setItem('aura_iptv_active_id', id);
    setCurrentChannel(null); // Reset currently playing
    setActiveCategory('Todos'); // Reset category
  };

  // 4. Toggle Favorite
  const handleToggleFavorite = (channelId) => {
    let updated;
    if (favorites.includes(channelId)) {
      updated = favorites.filter(id => id !== channelId);
    } else {
      updated = [...favorites, channelId];
    }
    setFavorites(updated);
    localStorage.setItem('aura_iptv_favorites', JSON.stringify(updated));
  };

  // 4.5. Focus Channel (Preview)
  const handleFocusChannel = (channel) => {
    const originalChannel = {
      ...channel,
      id: channel.id.replace('merged-', '') // strip merged- prefix
    };
    setCurrentChannel(originalChannel);
  };

  // 5. Select Channel to Play
  const handleSelectChannel = (channel) => {
    const originalChannel = {
      ...channel,
      id: channel.id.replace('merged-', '') // strip merged- prefix
    };
    setCurrentChannel(originalChannel);
    setActiveTab('channels');
    setIsPlayerExpanded(true);
  };

  // 6. Handle channel playback tracking
  const handleChannelPlayed = (channel) => {
    const cleanChannel = {
      ...channel,
      id: channel.id.replace('merged-', '')
    };
    const filtered = recentlyWatched.filter(c => c.id !== cleanChannel.id && c.name !== cleanChannel.name);
    const updated = [cleanChannel, ...filtered].slice(0, 6);
    setRecentlyWatched(updated);
    localStorage.setItem('aura_iptv_recent', JSON.stringify(updated));
  };

  // Get merged virtual playlist if multiple lists exist
  const getMergedPlaylist = () => {
    if (playlists.length <= 1) return null;
    
    const seenUrls = new Set();
    const seenNames = new Set();
    const mergedChannels = [];
    
    playlists.forEach(pl => {
      pl.channels.forEach(ch => {
        const url = ch.url.trim();
        const nameNormalized = ch.name
          .trim()
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "") // remove accents
          .replace(/[\s\-_]+/g, '') // remove spaces/dashes
          .replace(/(fhd|hd|sd|4k|h265|hevc)/g, ''); // strip formats
        
        if (!seenUrls.has(url) && !seenNames.has(nameNormalized)) {
          seenUrls.add(url);
          seenNames.add(nameNormalized);
          mergedChannels.push({
            ...ch,
            id: `merged-${ch.id}`
          });
        }
      });
    });
    
    return {
      id: 'playlist-merged',
      name: '⚡ Todas as Listas (Mesclada)',
      url: 'Mesclagem Virtual',
      channels: mergedChannels
    };
  };

  const mergedPlaylist = getMergedPlaylist();
  const allPlaylists = mergedPlaylist ? [mergedPlaylist, ...playlists] : playlists;

  // Get active playlist and channels
  const activePlaylist = allPlaylists.find(p => p.id === activePlaylistId);
  const channels = activePlaylist ? activePlaylist.channels : [];
  const categories = activePlaylist ? getCategories(channels) : [];

  // Toggle individual settings
  const toggleSetting = (key) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    localStorage.setItem('aura_iptv_settings', JSON.stringify(updated));
  };

  // Clear data
  const handleClearApp = async () => {
    if (window.confirm('Tem certeza que deseja excluir todos os dados do aplicativo? Isso apagará todas as playlists e favoritos.')) {
      localStorage.clear();
      try {
        await dbClear();
      } catch (err) {
        console.error('Error clearing database:', err);
      }
      setPlaylists([]);
      setActivePlaylistId('');
      setFavorites([]);
      setRecentlyWatched([]);
      setCurrentChannel(null);
      setActiveTab('home');
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        categories={categories}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        channels={channels}
        favorites={favorites}
      />

      <div className="main-content">
        {/* Header Bar */}
        <header className="app-header">
          <div className="header-title-area">
            <h1>
              {activeTab === 'home' && 'Início'}
              {activeTab === 'playlists' && 'Gerenciar Playlists'}
              {activeTab === 'channels' && 'Canais de TV'}
              {activeTab === 'settings' && 'Configurações'}
            </h1>
            
            {activePlaylist && (
              <span className="active-playlist-badge" title={activePlaylist.url}>
                {activePlaylist.name}
              </span>
            )}
          </div>

          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={16} style={{ color: 'var(--accent-secondary)' }} />
            <span>Premium UI/UX</span>
          </div>
        </header>

        {/* Dynamic Tab Body rendering */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          
          {/* 1. HOME VIEW */}
          {activeTab === 'home' && (
            <div className="view-body">
              <div className="dashboard">
                {/* Hero Panel */}
                <div className="welcome-hero">
                  <div className="welcome-hero-content">
                    <h2>Olá, bem-vindo ao Aura IPTV!</h2>
                    <p>
                      Sintonize seus canais favoritos de TV, esportes, notícias e entretenimento com reprodução de baixa latência e layout responsivo. Adicione suas próprias listas na aba "Playlists" para começar.
                    </p>
                  </div>
                </div>

                {/* Quick stats */}
                <div className="dashboard-stats">
                  <div className="glass-panel stat-card">
                    <div className="stat-icon purple">
                      <ListVideo size={24} />
                    </div>
                    <div className="stat-details">
                      <span className="stat-value">{playlists.length}</span>
                      <span className="stat-label">Playlists</span>
                    </div>
                  </div>
                  
                  <div className="glass-panel stat-card">
                    <div className="stat-icon cyan">
                      <Tv size={24} />
                    </div>
                    <div className="stat-details">
                      <span className="stat-value">{channels.length}</span>
                      <span className="stat-label">Canais</span>
                    </div>
                  </div>

                  <div className="glass-panel stat-card">
                    <div className="stat-icon yellow">
                      <Star size={24} />
                    </div>
                    <div className="stat-details">
                      <span className="stat-value">{favorites.length}</span>
                      <span className="stat-label">Favoritos</span>
                    </div>
                  </div>
                </div>

                {/* Dashboard Split Sections */}
                <div className="dashboard-grid">
                  {/* Recently Played */}
                  <div className="glass-panel dashboard-panel">
                    <h3>Assistidos Recentemente</h3>
                    {recentlyWatched.length === 0 ? (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', padding: '20px 0' }}>
                        Nenhum canal sintonizado recentemente.
                      </div>
                    ) : (
                      <div className="recent-list">
                        {recentlyWatched.map((chan) => (
                          <div 
                            key={chan.id} 
                            className="recent-item"
                            onClick={() => handleSelectChannel(chan)}
                          >
                            <div className="recent-item-info">
                              {chan.logo ? (
                                <img 
                                  src={chan.logo} 
                                  alt={chan.name} 
                                  className="recent-item-logo"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div 
                                className="recent-item-logo-fallback"
                                style={{ display: chan.logo ? 'none' : 'flex' }}
                              >
                                {chan.name.substring(0, 2).toUpperCase()}
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span className="recent-item-name">{chan.name}</span>
                                <span className="recent-item-category">{chan.category}</span>
                              </div>
                            </div>
                            <Play size={14} style={{ color: 'var(--accent-secondary)' }} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Quick Favorites links */}
                  <div className="glass-panel dashboard-panel">
                    <h3>Seus Canais Favoritos</h3>
                    {favorites.length === 0 ? (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', padding: '20px 0' }}>
                        Adicione estrelas nos canais no menu "Canais" para exibi-los aqui.
                      </div>
                    ) : (
                      <div className="recent-list">
                        {channels
                          .filter(c => favorites.includes(c.id))
                          .slice(0, 6)
                          .map((chan) => (
                            <div 
                              key={chan.id} 
                              className="recent-item"
                              onClick={() => handleSelectChannel(chan)}
                            >
                              <div className="recent-item-info">
                                {chan.logo ? (
                                  <img 
                                    src={chan.logo} 
                                    alt={chan.name} 
                                    className="recent-item-logo"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      e.target.nextSibling.style.display = 'flex';
                                    }}
                                  />
                                ) : null}
                                <div 
                                  className="recent-item-logo-fallback"
                                  style={{ display: chan.logo ? 'none' : 'flex' }}
                                >
                                  {chan.name.substring(0, 2).toUpperCase()}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span className="recent-item-name">{chan.name}</span>
                                  <span className="recent-item-category">{chan.category}</span>
                                </div>
                              </div>
                              <Play size={14} style={{ color: 'var(--accent-secondary)' }} />
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. PLAYLIST MANAGER VIEW */}
          {activeTab === 'playlists' && (
            <div className="view-body" style={{ overflowY: 'auto' }}>
              <PlaylistManager 
                playlists={playlists}
                activePlaylistId={activePlaylistId}
                onSelectPlaylist={handleSelectPlaylist}
                onAddPlaylist={handleAddPlaylist}
                onDeletePlaylist={handleDeletePlaylist}
                mergedPlaylist={mergedPlaylist}
              />
            </div>
          )}

          {/* 3. DYNAMIC CHANNELS GRID & PLAYER VIEW */}
          {activeTab === 'channels' && (
            <div className="channels-view-layout">
              {/* Left/Middle pane: Playlist explorer list */}
              <div className="grid-pane">
                <ChannelGrid 
                  channels={channels}
                  favorites={favorites}
                  onToggleFavorite={handleToggleFavorite}
                  onSelectChannel={handleSelectChannel}
                  onFocusChannel={handleFocusChannel}
                  currentChannel={currentChannel}
                  activeCategory={activeCategory}
                />
              </div>

              {/* Right pane: Video player (Preview) */}
              <div className="player-pane">
                {!isPlayerExpanded && (
                  <Player 
                    channel={currentChannel} 
                    onChannelPlayed={handleChannelPlayed}
                  />
                )}
              </div>
            </div>
          )}

          {/* 4. SETTINGS VIEW */}
          {activeTab === 'settings' && (
            <div className="view-body">
              <div className="settings-panel">
                <div className="glass-panel settings-card">
                  <h3 style={{ marginBottom: '16px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <SettingsIcon size={20} />
                    Ajustes de Reprodução
                  </h3>
                  
                  <div className="settings-row">
                    <div className="settings-info">
                      <span className="settings-label">Modo Baixa Latência</span>
                      <span className="settings-desc">Otimiza buffer de vídeo HLS para transmissões ao vivo. (Recomendado)</span>
                    </div>
                    <label className="switch">
                      <input 
                        type="checkbox" 
                        checked={settings.lowLatency} 
                        onChange={() => toggleSetting('lowLatency')}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>

                  <div className="settings-row">
                    <div className="settings-info">
                      <span className="settings-label">Carregar via Proxy CORS</span>
                      <span className="settings-desc">Usa proxy secundário se a lista M3U for bloqueada pelo navegador.</span>
                    </div>
                    <label className="switch">
                      <input 
                        type="checkbox" 
                        checked={settings.useCorsProxy} 
                        onChange={() => toggleSetting('useCorsProxy')}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>

                <div className="glass-panel settings-card">
                  <h3 style={{ marginBottom: '16px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={20} style={{ color: 'var(--accent-secondary)' }} />
                    Atualizações do Sistema
                  </h3>
                  <div className="settings-row">
                    <div className="settings-info">
                      <span className="settings-label">Forçar Atualização</span>
                      <span className="settings-desc">Recarrega o aplicativo limpando o cache para buscar a última versão do site.</span>
                    </div>
                    <button 
                      className="btn-toolbar" 
                      onClick={(e) => {
                        e.target.innerText = "Buscando...";
                        setTimeout(() => {
                          window.location.reload(true);
                        }, 1000);
                      }}
                    >
                      Buscar Atualizações
                    </button>
                  </div>
                </div>

                <div className="glass-panel settings-card" style={{ borderColor: 'rgba(239, 35, 60, 0.2)' }}>
                  <h3 style={{ marginBottom: '16px', fontSize: '1.2rem', color: '#ef233c', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Trash2 size={20} />
                    Zona de Perigo
                  </h3>
                  <div className="settings-row">
                    <div className="settings-info">
                      <span className="settings-label">Redefinir Dados</span>
                      <span className="settings-desc">Limpar todos os dados do localStorage e playlists carregadas.</span>
                    </div>
                    <button className="btn-secondary" style={{ color: '#ef233c', borderColor: 'rgba(239,35,60,0.3)' }} onClick={handleClearApp}>
                      Limpar Tudo
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Fullscreen Player Overlay */}
      {isPlayerExpanded && currentChannel && (
        <div className="fullscreen-player-overlay">
          <Player 
            channel={currentChannel} 
            onChannelPlayed={handleChannelPlayed}
            onClose={() => {
              if (window.history.state && window.history.state.playerExpanded) {
                window.history.back();
              } else {
                setIsPlayerExpanded(false);
              }
            }}
            channels={channels}
            onSelectChannel={handleSelectChannel}
          />
        </div>
      )}
    </div>
  );
}
