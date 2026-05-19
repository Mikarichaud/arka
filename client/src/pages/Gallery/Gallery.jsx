import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Icon from '../../components/Icon/Icon';
import LoadingPlaceholder from '../../components/LoadingPlaceholder/LoadingPlaceholder';
import EmptyState from '../../components/EmptyState/EmptyState';
import SEO from '../../components/SEO/SEO';
import { useEscapeClose } from '../../hooks/useEscapeClose';
import api from '../../services/api';
import './Gallery.css';

export default function Gallery() {
  const { shareLink } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEscapeClose(Boolean(selected), () => setSelected(null));

  useEffect(() => {
    api.get(`/sessions/gallery/${shareLink}`)
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [shareLink]);

  if (loading) {
    return (
      <div className="gallery-page" style={{ padding: 24 }}>
        <LoadingPlaceholder variant="tall" count={4} label="Chargement de la galerie" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="gallery-page" style={{ padding: 24 }}>
        <EmptyState
          icon="cross"
          title="Galerie introuvable"
          description="Le lien est invalide ou la galerie a été supprimée."
        >
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/')}>Retour à l'accueil</button>
        </EmptyState>
      </div>
    );
  }

  const hasMedia = data.media && data.media.length > 0;

  const playerNames = data.players.map((p) => p.name).join(' · ');
  const sessionDate = new Date(data.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="gallery-page">
      <SEO
        title={`Galerie soirée — ${playerNames}`}
        description={`Photos et défis de la soirée du ${sessionDate} avec ${playerNames}. Reviens nous voir sur La Roulade Marseillaise.`}
        path={`/gallery/${shareLink}`}
        ogType="article"
        image={data.media?.[0] || undefined}
      />
      <div className="gallery-header">
        <button className="gallery-back" onClick={() => (location.key !== 'default' ? navigate(-1) : navigate('/'))}>← Retour</button>
        <div className="gallery-meta">
          <h1 className="gallery-title"><Icon name="photo" size={22} style={{ marginRight: 8 }} />Galerie de soirée</h1>
          <p className="gallery-players">
            {playerNames}
          </p>
          <p className="gallery-date">
            {sessionDate}
          </p>
        </div>
      </div>

      {!hasMedia ? (
        <EmptyState
          icon="photo"
          title="Aucune photo pour cette soirée"
          description="La prochaine fois, appuyez sur l'icône appareil photo après chaque défi !"
        />
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
