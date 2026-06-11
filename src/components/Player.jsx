import React, { useEffect, useRef, useState, useMemo } from 'react';
import Hls from 'hls.js';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  Tv, 
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import './Player.css';

export default function Player({ channel, onChannelPlayed, onClose, channels = [], onSelectChannel }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const hlsRef = useRef(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [showQuickList, setShowQuickList] = useState(false);
  const [quickSearch, setQuickSearch] = useState('');

  const filteredQuickChannels = useMemo(() => {
    if (!channels) return [];
    return channels.filter(c => 
      c.name.toLowerCase().includes(quickSearch.toLowerCase()) ||
      c.category.toLowerCase().includes(quickSearch.toLowerCase())
    ).slice(0, 100);
  }, [channels, quickSearch]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!onClose) return;

      // Make controls visible on any keypress and restart hide timer
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);

      if (e.key === 'ArrowLeft' && !showQuickList) {
        const active = document.activeElement;
        if (active && active.tagName === 'INPUT') return;
        
        e.preventDefault();
        setShowQuickList(true);
        setTimeout(() => {
          const searchInput = document.querySelector('.quick-list-search');
          if (searchInput) searchInput.focus();
        }, 100);
      }
      
      if (e.key === 'Escape' || (e.key === 'ArrowRight' && showQuickList)) {
        const active = document.activeElement;
        if (e.key === 'ArrowRight' && active && active.tagName === 'INPUT') return;
        
        if (showQuickList) {
          e.preventDefault();
          setShowQuickList(false);
          if (containerRef.current) containerRef.current.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showQuickList, onClose]);

  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const controlsTimeoutRef = useRef(null);

  // Restart loading state when channel changes
  useEffect(() => {
    if (!channel) return;
    
    setIsLoading(true);
    setHasError(false);
    setIsPlaying(false);
    
    if (onChannelPlayed) {
      onChannelPlayed(channel);
    }

    const video = videoRef.current;
    if (!video) return;

    // Destroy existing HLS instance if any
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Set initial volume
    video.volume = volume;
    video.muted = isMuted;

    // Check if URL is HLS (M3U8)
    const isHlsUrl = channel.url.includes('.m3u8') || channel.url.includes('m3u8') || channel.url.includes('stream');
    
    if (isHlsUrl) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90,
          maxMaxBufferLength: 10 // restrict buffer size to keep delay low
        });
        hlsRef.current = hls;
        
        hls.loadSource(channel.url);
        hls.attachMedia(video);
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play()
            .then(() => setIsPlaying(true))
            .catch(() => {
              // Autoplay might be blocked by browser policies
              setIsPlaying(false);
            });
          setIsLoading(false);
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.error('Fatal network error encountered, trying to recover...', data);
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.error('Fatal media error encountered, trying to recover...', data);
                hls.recoverMediaError();
                break;
              default:
                console.error('Fatal error cannot recover, setting error state', data);
                setHasError(true);
                setIsLoading(false);
                break;
            }
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS (Safari and iOS browsers)
        video.src = channel.url;
        video.addEventListener('loadedmetadata', () => {
          video.play()
            .then(() => setIsPlaying(true))
            .catch(() => setIsPlaying(false));
          setIsLoading(false);
        });
        
        const handleNativeError = (e) => {
          setHasError(true);
          setIsLoading(false);
        };
        video.addEventListener('error', handleNativeError);
        return () => {
          video.removeEventListener('error', handleNativeError);
        };
      } else {
        setHasError(true);
        setIsLoading(false);
        console.error('HLS is not supported in this browser.');
      }
    } else {
      // Direct stream play (MP4, WebM etc)
      video.src = channel.url;
      video.addEventListener('loadeddata', () => {
        video.play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
        setIsLoading(false);
      });
      
      const handleDirectError = () => {
        setHasError(true);
        setIsLoading(false);
      };
      video.addEventListener('error', handleDirectError);
      return () => {
        video.removeEventListener('error', handleDirectError);
      };
    }

    // Event listeners for video load states
    const handleWaiting = () => setIsLoading(true);
    const handlePlaying = () => {
      setIsLoading(false);
      setIsPlaying(true);
      setHasError(false);
    };
    const handlePause = () => setIsPlaying(false);
    
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('pause', handlePause);
      
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [channel]);

  // Handle auto-hiding controls on state changes
  useEffect(() => {
    if (isPlaying) {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    } else {
      setShowControls(true);
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying, channel]);

  const handleMouseMove = () => {
    if (!isPlaying) return;
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  // Toggle Actions
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video || hasError) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play()
        .then(() => setIsPlaying(true))
        .catch(err => console.error("Playback failed:", err));
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    const newMuted = !isMuted;
    video.muted = newMuted;
    setIsMuted(newMuted);
  };

  const handleVolumeChange = (e) => {
    const video = videoRef.current;
    if (!video) return;

    const val = parseFloat(e.target.value);
    video.volume = val;
    setVolume(val);
    if (val > 0) {
      video.muted = false;
      setIsMuted(false);
    } else {
      video.muted = true;
      setIsMuted(true);
    }
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(err => console.error("Fullscreen failed:", err));
    } else {
      document.exitFullscreen()
        .then(() => setIsFullscreen(false));
    }
  };

  // Monitor fullscreen change event (e.g. if exited via Escape key)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const togglePictureInPicture = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (video.requestPictureInPicture) {
        await video.requestPictureInPicture();
      }
    } catch (err) {
      console.error("Picture-in-Picture failed:", err);
    }
  };

  const retryPlayback = () => {
    // Re-trigger useEffect by hacking a reload
    const currentUrl = channel.url;
    setHasError(false);
    setIsLoading(true);
    
    // Quick rebuild HLS/src
    const video = videoRef.current;
    if (!video) return;
    
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    
    const isHlsUrl = currentUrl.includes('.m3u8') || currentUrl.includes('m3u8') || currentUrl.includes('stream');
    
    if (isHlsUrl && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hlsRef.current = hls;
      hls.loadSource(currentUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
        setIsLoading(false);
      });
    } else {
      video.src = currentUrl;
      video.load();
      video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      setIsLoading(false);
    }
  };

  if (!channel) {
    return (
      <div className="player-no-channel">
        <Tv size={64} className="player-no-channel-icon" />
        <h3>Nenhum Canal Selecionado</h3>
        <p>Selecione um canal da lista ao lado para sintonizar a transmissão.</p>
        <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
          <Sparkles size={16} style={{ color: 'var(--accent-secondary)' }} />
          <span>Design premium com suporte a transmissões HLS de baixa latência</span>
        </div>
      </div>
    );
  }

  // Get Fallback Initials for Logo
  const getFallbackInitials = (name) => {
    if (!name) return 'TV';
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div 
      className="player-container" 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        className="player-video"
        ref={videoRef}
        onClick={togglePlay}
        playsInline
      />

      {/* Middle State Overlay: Spinner or Error */}
      <div className="player-middle-overlay">
        {isLoading && !hasError && <div className="player-spinner"></div>}
        
        {hasError && (
          <div className="player-error-panel">
            <AlertTriangle className="player-error-icon" size={48} />
            <h4>Erro de Reprodução</h4>
            <p>
              Não foi possível carregar esta transmissão. Isso pode ocorrer devido a bloqueios CORS, canal offline ou URL expirada.
            </p>
            <button className="player-retry-btn" onClick={retryPlayback}>
              <RotateCcw size={16} style={{ marginRight: '8px', display: 'inline-block', verticalAlign: 'middle' }} />
              Tentar Novamente
            </button>
          </div>
        )}
      </div>

      {/* Controls Overlay */}
      <div className={`player-controls-overlay ${showControls ? 'visible' : ''}`}>
        {/* Header: Title and logo */}
        <div className="player-header">
          <div className="player-channel-info">
            {onClose && (
              <button 
                className="player-btn player-back-btn" 
                onClick={onClose} 
                title="Voltar" 
                style={{ marginRight: '12px', background: 'rgba(255,255,255,0.1)' }}
              >
                <ArrowLeft size={20} />
              </button>
            )}
            {channel.logo ? (
              <img 
                className="player-channel-logo" 
                src={channel.logo} 
                alt={channel.name} 
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div 
              className="player-channel-logo-fallback" 
              style={{ display: channel.logo ? 'none' : 'flex' }}
            >
              {getFallbackInitials(channel.name)}
            </div>
            <div className="player-channel-text">
              <h3>{channel.name}</h3>
              <span className="player-channel-category">{channel.category}</span>
            </div>
          </div>
          <div className="live-indicator">LIVE</div>
        </div>

        {/* Footer: Playback Controls */}
        <div className="player-footer">
          <div className="player-controls-row">
            {/* Left Controls */}
            <div className="player-controls-group">
              <button className="player-btn player-btn-primary" onClick={togglePlay}>
                {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" style={{ marginLeft: '2px' }} />}
              </button>
              
              <div className="player-volume-container">
                <button className="player-btn" onClick={toggleMute}>
                  {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="player-volume-slider"
                />
              </div>
            </div>

            {/* Right Controls */}
            <div className="player-controls-group">
              <button className="player-btn" onClick={togglePictureInPicture} title="Picture-in-Picture">
                <Tv size={20} />
              </button>
              <button className="player-btn" onClick={toggleFullscreen}>
                {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Channel Switcher Overlay (Mini EPG / Guide) */}
      {onClose && showQuickList && (
        <div className="player-quick-list">
          <div className="quick-list-header">
            <h4>Sintonizar Canal</h4>
            <span className="quick-list-desc">Use Seta Direita ou Voltar para fechar</span>
            <input 
              type="text" 
              placeholder="Buscar canal..." 
              value={quickSearch}
              onChange={(e) => setQuickSearch(e.target.value)}
              className="quick-list-search"
            />
          </div>
          <div className="quick-list-content">
            {filteredQuickChannels.map((chan) => {
              const isCurrent = chan.id === channel.id || chan.name === channel.name;
              return (
                <button
                  key={chan.id}
                  className={`quick-list-item ${isCurrent ? 'active' : ''}`}
                  onClick={() => {
                    onSelectChannel(chan);
                    setTimeout(() => setShowQuickList(false), 300);
                  }}
                >
                  <span className="quick-list-item-name">{chan.name}</span>
                  <span className="quick-list-item-category">{chan.category}</span>
                </button>
              );
            })}
            {filteredQuickChannels.length === 0 && (
              <div style={{ padding: '20px', textAlign: 'center', opacity: 0.5 }}>
                Nenhum canal encontrado
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
