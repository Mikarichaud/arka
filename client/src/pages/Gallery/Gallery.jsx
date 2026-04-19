import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../../services/api';
import './Gallery.css';

export default function Gallery() {
  const { shareLink } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.get(`/sessions/gallery/${shareLink}`)
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [shareLink]);

  if (loading) {
    return (
      <div className="gallery-loading">
        <p>Chargement de la galerie...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="gallery-error">
        <p>Galerie introuvable.</p>
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/')}>Retour</button>
      </div>
    );
  }

  const hasMedia = data.media && data.media.length > 0;

  return (
    <div className="gallery-page">
      <div className="gallery-header">
        <button className="gallery-back" onClick={() => navigate(-1)}>← Retour</button>
        <div className="gallery-meta">
          <h1 className="gallery-title">📸 Galerie de soirée</h1>
          <p className="gallery-players">
            {data.players.map((p) => p.name).join(' · ')}
          </p>
          <p className="gallery-date">
            {new Date(data.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {!hasMedia ? (
        <div className="gallery-empty">
          <p>Aucune photo pour cette soirée.</p>
          <p className="gallery-empty-sub">La prochaine fois, appuyez sur 📸 après chaque défi !</p>
        </div>
      ) : (
        <div className="gallery-grid">
          {data.media.map((item, i) => (
            <motion.div
              key={i}
              className="gallery-item"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setSelected(item)}
            >
              {item.url.includes('/video/') || item.url.match(/\.(mp4|mov|webm)/) ? (
                <video src={item.url} className="gallery-thumb" muted playsInline />
              ) : (
                <img src={item.url} alt={item.challengeText} className="gallery-thumb" />
              )}
              <div className="gallery-item-overlay">
                <span className="gallery-item-player">{item.playerName}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {selected && (
        <div className="gallery-lightbox" onClick={() => setSelected(null)}>
          <div className="gallery-lightbox-inner" onClick={(e) => e.stopPropagation()}>
            {selected.url.includes('/video/') || selected.url.match(/\.(mp4|mov|webm)/) ? (
              <video src={selected.url} controls className="gallery-lightbox-media" />
            ) : (
              <img src={selected.url} alt="" className="gallery-lightbox-media" />
            )}
            {selected.challengeText && (
              <p className="gallery-lightbox-caption">
                <strong>{selected.playerName}</strong> — {selected.challengeText}
              </p>
            )}
            <button className="gallery-lightbox-close" onClick={() => setSelected(null)}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}
