import React, { useState, useEffect, useMemo } from 'react';
import { Search, Star, Play, Tv, ChevronDown } from 'lucide-react';
import './ChannelGrid.css';

export default function ChannelGrid({
  channels = [],
  favorites = [],
  onToggleFavorite,
  onSelectChannel,
  currentChannel = null,
  activeCategory = 'Todos'
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleLimit, setVisibleLimit] = useState(120);

  // Reset pagination limit on search or category change
  useEffect(() => {
    setVisibleLimit(120);
  }, [activeCategory, searchQuery]);

  // Memoize filtered channels for maximum performance on huge lists
  const filteredChannels = useMemo(() => {
    return channels.filter(channel => {
      // 1. Filter by category
      if (activeCategory === 'Favoritos') {
        if (!favorites.includes(channel.id)) return false;
      } else if (activeCategory !== 'Todos' && channel.category !== activeCategory) {
        return false;
      }

      // 2. Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const nameMatch = channel.name.toLowerCase().includes(query);
        const catMatch = channel.category.toLowerCase().includes(query);
        if (!nameMatch && !catMatch) return false;
      }

      return true;
    });
  }, [channels, activeCategory, searchQuery, favorites]);

  const handleToggleFav = (e, channelId) => {
    e.stopPropagation(); // Prevent card click
    onToggleFavorite(channelId);
  };

  const loadMore = () => {
    setVisibleLimit(prev => prev + 120);
  };

  // Get initials for fallback channel logos
  const getFallbackInitials = (name) => {
    if (!name) return 'TV';
    const cleanName = name.replace(/[^a-zA-Z0-9\s]/g, '').trim();
    if (!cleanName) return 'TV';
    
    const parts = cleanName.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  const displayedChannels = filteredChannels.slice(0, visibleLimit);

  return (
    <div className="channel-grid-container">
      {/* Header Search Area */}
      <div className="channel-grid-header">
        <div className="search-box-container">
          <Search className="search-icon" size={18} />
          <input
            type="text"
            placeholder="Buscar por canal..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="channels-info-badge">
          Canais: <span>{filteredChannels.length}</span>
        </div>
      </div>

      {/* Main Grid Area */}
      <div className="channels-grid-scroll">
        {filteredChannels.length === 0 ? (
          <div className="glass-panel grid-empty-state">
            <Tv size={48} style={{ color: 'var(--text-muted)' }} />
            <h3>Nenhum Canal Encontrado</h3>
            <p>
              {activeCategory === 'Favoritos' 
                ? 'Você ainda não adicionou nenhum canal aos favoritos.' 
                : 'Tente ajustar sua busca ou verifique se carregou as playlists corretas.'}
            </p>
          </div>
        ) : (
          <>
            <div className="channels-grid">
              {displayedChannels.map((channel) => {
                const isFav = favorites.includes(channel.id);
                const isActive = currentChannel && currentChannel.id === channel.id;

                return (
                  <div
                    key={channel.id}
                    className={`channel-card ${isActive ? 'active' : ''}`}
                    onClick={() => onSelectChannel(channel)}
                    tabIndex="0"
                  >
                    {/* Favorite Button (Top Right) */}
                    <button
                      className={`channel-card-fav-btn ${isFav ? 'is-fav' : ''}`}
                      onClick={(e) => handleToggleFav(e, channel.id)}
                      title={isFav ? "Remover dos Favoritos" : "Adicionar aos Favoritos"}
                    >
                      <Star size={14} fill={isFav ? "currentColor" : "none"} />
                    </button>

                    {/* Logo Wrapper */}
                    <div className="channel-card-logo-wrapper">
                      {channel.logo ? (
                        <img
                          src={channel.logo}
                          alt={channel.name}
                          className="channel-card-logo"
                          loading="lazy"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div
                        className="channel-card-logo-fallback"
                        style={{ display: channel.logo ? 'none' : 'flex' }}
                      >
                        {getFallbackInitials(channel.name)}
                      </div>

                      {/* Play overlay on hover */}
                      <div className="channel-card-hover-play">
                        <Play size={28} fill="currentColor" />
                      </div>
                    </div>

                    {/* Details */}
                    <div className="channel-card-details">
                      <span className="channel-card-name" title={channel.name}>
                        {channel.name}
                      </span>
                      <span className="channel-card-category" title={channel.category}>
                        {channel.category}
                      </span>
                    </div>

                    {/* Active pulse dot */}
                    {isActive && <div className="channel-card-active-dot"></div>}
                  </div>
                );
              })}
            </div>

            {/* Load More Button */}
            {filteredChannels.length > visibleLimit && (
              <div className="load-more-container">
                <button className="btn-load-more" onClick={loadMore}>
                  <ChevronDown size={18} />
                  Carregar Mais Canais
                  <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                    ({filteredChannels.length - visibleLimit} restantes)
                  </span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
