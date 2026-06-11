import React, { useState } from 'react';
import { parseM3U } from '../utils/m3uParser';
import { 
  Link2, 
  FileUp, 
  Trash2, 
  Layers, 
  Plus, 
  Loader2, 
  CheckCircle2, 
  AlertCircle
} from 'lucide-react';
import './PlaylistManager.css';

const PRESETS = [
  {
    name: 'Lista Ramys IPTV Brasil 2026',
    url: 'https://raw.githubusercontent.com/Ramys/Iptv-Brasil-2026/master/CanaisBR02.m3u8',
    desc: '⭐ [Mais Completa] Canais brasileiros premium, esportes, filmes e novelas atualizados.',
    badge: 'Excelente'
  },
  {
    name: 'Lista Brasil & Portugal (Oficial)',
    url: 'https://iptv-org.github.io/iptv/languages/por.m3u',
    desc: '🇧🇷 [Canais Abertos] Lista oficial da comunidade focada em canais de língua portuguesa.',
    badge: 'Estável'
  },
  {
    name: 'Canais de Esportes Globais',
    url: 'https://iptv-org.github.io/iptv/categories/sports.m3u',
    desc: '⚽ [Esportes] Transmissões esportivas e canais de futebol de todo o mundo.',
    badge: 'Futebol'
  },
  {
    name: 'Filmes e Séries (Mundial)',
    url: 'https://iptv-org.github.io/iptv/categories/movies.m3u',
    desc: '🎬 [Cinema] Canais dedicados a longa-metragens, séries e curta-metragens.',
    badge: 'Filmes'
  },
  {
    name: 'Canais de Entretenimento Geral',
    url: 'https://iptv-org.github.io/iptv/categories/general.m3u',
    desc: '📺 [Geral] Variedades, programas de auditório e entretenimento global.',
    badge: 'Variedades'
  },
  {
    name: 'Lista IPTV Global Completa',
    url: 'https://iptv-org.github.io/iptv/index.m3u',
    desc: '🌍 [Global] Mais de 8.000 canais agregados. (Carregamento lento devido ao tamanho).',
    badge: 'Gigante'
  }
];

export default function PlaylistManager({ 
  playlists, 
  activePlaylistId, 
  onSelectPlaylist, 
  onAddPlaylist, 
  onDeletePlaylist,
  mergedPlaylist = null
}) {
  const [playlistName, setPlaylistName] = useState('');
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Handle URL Form Submission
  const handleUrlSubmit = async (e) => {
    e.preventDefault();
    if (!playlistUrl.trim() || !playlistName.trim()) return;

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      let content = '';
      let targetUrl = playlistUrl.trim();

      // Auto-convert GitHub blob links to raw user content
      if (targetUrl.includes('github.com') && targetUrl.includes('/blob/')) {
        targetUrl = targetUrl
          .replace('github.com', 'raw.githubusercontent.com')
          .replace('/blob/', '/');
      }
      
      // Try direct fetch first
      try {
        const response = await fetch(targetUrl);
        if (!response.ok) throw new Error('Não foi possível baixar o arquivo.');
        content = await response.text();
      } catch (directFetchErr) {
        console.warn("Direct fetch failed, trying CORS proxy...", directFetchErr);
        // CORS Proxy fallback
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error('Falha ao obter lista através do proxy.');
        content = await response.text();
      }

      if (!content || !content.includes('#EXTM3U')) {
        throw new Error('O arquivo não parece ser uma lista M3U válida.');
      }

      const channels = parseM3U(content);
      if (channels.length === 0) {
        throw new Error('Nenhum canal foi encontrado na lista.');
      }

      onAddPlaylist(playlistName, channels, targetUrl);
      setSuccessMsg(`Lista "${playlistName}" carregada com sucesso! (${channels.length} canais)`);
      setPlaylistName('');
      setPlaylistUrl('');
    } catch (err) {
      setErrorMsg(err.message || 'Erro ao carregar a playlist. Verifique o link.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Preset Load
  const handleLoadPreset = async (preset) => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    setPlaylistName(preset.name);
    setPlaylistUrl(preset.url);

    try {
      let content = '';
      
      try {
        const response = await fetch(preset.url);
        if (!response.ok) throw new Error('Não foi possível baixar.');
        content = await response.text();
      } catch (directErr) {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(preset.url)}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error('Falha no CORS proxy.');
        content = await response.text();
      }

      const channels = parseM3U(content);
      if (channels.length === 0) throw new Error('Nenhum canal encontrado.');

      onAddPlaylist(preset.name, channels, preset.url);
      setSuccessMsg(`Lista "${preset.name}" carregada com sucesso! (${channels.length} canais)`);
      setPlaylistName('');
      setPlaylistUrl('');
    } catch (err) {
      setErrorMsg(`Erro ao carregar preset "${preset.name}": ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle Local File Upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target.result;
        if (!content.includes('#EXTM3U')) {
          throw new Error('O arquivo carregado não é uma lista M3U válida.');
        }

        const channels = parseM3U(content);
        if (channels.length === 0) {
          throw new Error('Nenhum canal encontrado no arquivo.');
        }

        const name = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
        onAddPlaylist(name, channels, 'Arquivo Local');
        setSuccessMsg(`Lista "${name}" carregada do arquivo! (${channels.length} canais)`);
      } catch (err) {
        setErrorMsg(err.message);
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = () => {
      setErrorMsg('Erro ao ler o arquivo local.');
      setLoading(false);
    };

    reader.readAsText(file);
  };

  return (
    <div className="playlist-manager">
      {/* Alert Messages */}
      {errorMsg && (
        <div className="glass-panel" style={{ display: 'flex', gap: '10px', padding: '16px', borderColor: 'rgba(239, 35, 60, 0.4)', background: 'rgba(239, 35, 60, 0.05)', color: '#ef233c' }}>
          <AlertCircle size={20} />
          <div>{errorMsg}</div>
        </div>
      )}

      {successMsg && (
        <div className="glass-panel" style={{ display: 'flex', gap: '10px', padding: '16px', borderColor: 'rgba(0, 245, 212, 0.4)', background: 'rgba(0, 245, 212, 0.05)', color: 'var(--accent-secondary)' }}>
          <CheckCircle2 size={20} />
          <div>{successMsg}</div>
        </div>
      )}

      {/* Main Import Form */}
      <div className="glass-panel playlist-card">
        <h2>
          <Link2 size={22} style={{ color: 'var(--accent-primary)' }} />
          Adicionar Playlist via Link
        </h2>
        <form onSubmit={handleUrlSubmit} className="playlist-form">
          <div className="form-group">
            <label htmlFor="name-input">Nome da Playlist</label>
            <input 
              id="name-input"
              type="text" 
              placeholder="Ex: Minha Playlist, IPTV Premium..." 
              value={playlistName}
              onChange={(e) => setPlaylistName(e.target.value)}
              className="input-glow"
              required
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label htmlFor="url-input">URL da Playlist (M3U / M3U8)</label>
            <input 
              id="url-input"
              type="url" 
              placeholder="https://exemplo.com/lista.m3u" 
              value={playlistUrl}
              onChange={(e) => setPlaylistUrl(e.target.value)}
              className="input-glow"
              required
              disabled={loading}
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={18} className="player-spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} />
                Carregando...
              </>
            ) : (
              <>
                <Plus size={18} />
                Adicionar Lista
              </>
            )}
          </button>
        </form>
      </div>

      {/* File Upload Zone */}
      <div className="glass-panel playlist-card">
        <h2>
          <FileUp size={22} style={{ color: 'var(--accent-secondary)' }} />
          Carregar Arquivo Local
        </h2>
        <label className="file-upload-zone">
          <input 
            type="file" 
            accept=".m3u,.m3u8,.txt" 
            onChange={handleFileUpload}
            disabled={loading}
          />
          <FileUp size={36} className="file-upload-icon" />
          <span style={{ fontWeight: 600 }}>Clique para selecionar arquivo .m3u</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Arraste seu arquivo M3U para cá ou explore seu PC</span>
        </label>
      </div>

      {/* Presets Grid */}
      <div className="playlist-card" style={{ padding: 0 }}>
        <h2 style={{ marginBottom: '12px', fontSize: '1.2rem' }}>Playlists Sugeridas (Oficiais)</h2>
        <div className="presets-grid">
          {PRESETS.map((preset, idx) => (
            <button 
              key={idx}
              className="preset-btn"
              onClick={() => handleLoadPreset(preset)}
              disabled={loading}
              style={{ position: 'relative' }}
            >
              {preset.badge && (
                <span style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  backgroundColor: preset.badge === 'Excelente' ? 'rgba(0, 245, 212, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  color: preset.badge === 'Excelente' ? 'var(--accent-secondary)' : 'var(--text-muted)',
                  border: `1px solid ${preset.badge === 'Excelente' ? 'rgba(0, 245, 212, 0.3)' : 'var(--border-color)'}`,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  textTransform: 'uppercase'
                }}>
                  {preset.badge}
                </span>
              )}
              <span className="preset-title" style={{ paddingRight: '70px' }}>{preset.name}</span>
              <span className="preset-desc">{preset.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Saved Playlists list */}
      {playlists.length > 0 && (
        <div className="glass-panel playlist-card">
          <h2>
            <Layers size={22} style={{ color: 'var(--accent-primary)' }} />
            Suas Playlists ({playlists.length})
          </h2>
          <div className="saved-playlists-list">
            {/* Render merged virtual playlist first if it exists */}
            {mergedPlaylist && (
              <div 
                className={`playlist-item virtual-merged ${activePlaylistId === 'playlist-merged' ? 'active' : ''}`}
                style={{ borderColor: 'rgba(157, 78, 221, 0.25)', background: 'rgba(157, 78, 221, 0.03)' }}
              >
                <div className="playlist-item-info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="playlist-item-name" style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{mergedPlaylist.name}</span>
                    <span style={{ fontSize: '0.65rem', backgroundColor: 'var(--accent-primary)', color: '#000', padding: '1px 6px', borderRadius: '10px', fontWeight: 700 }}>SUPER LISTA</span>
                  </div>
                  <span className="playlist-item-meta" style={{ marginBottom: '6px' }}>
                    {mergedPlaylist.channels.length} canais unificados (Deduplicados por URL e Nome)
                  </span>
                </div>
                <div className="playlist-item-actions">
                  {activePlaylistId !== 'playlist-merged' ? (
                    <button 
                      className="btn-secondary" 
                      onClick={() => onSelectPlaylist('playlist-merged')}
                    >
                      Ativar
                    </button>
                  ) : (
                    <span className="active-badge-tag">Ativa</span>
                  )}
                </div>
              </div>
            )}

            {/* Standard Playlists */}
            {playlists.map((pl) => {
              return (
                <div 
                  key={pl.id} 
                  className={`playlist-item ${pl.id === activePlaylistId ? 'active' : ''}`}
                >
                  <div className="playlist-item-info">
                    <span className="playlist-item-name">{pl.name}</span>
                    <span className="playlist-item-meta" style={{ marginBottom: '6px' }}>
                      {pl.channels.length} canais • {pl.url === 'Arquivo Local' ? 'Arquivo Local' : 'Link Remoto'}
                    </span>
                  </div>
                  <div className="playlist-item-actions">
                    {pl.id !== activePlaylistId ? (
                      <button 
                        className="btn-secondary" 
                        onClick={() => onSelectPlaylist(pl.id)}
                      >
                        Ativar
                      </button>
                    ) : (
                      <span className="active-badge-tag">Ativa</span>
                    )}
                    <button 
                      className="btn-danger" 
                      onClick={() => onDeletePlaylist(pl.id)}
                      title="Excluir Playlist"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
