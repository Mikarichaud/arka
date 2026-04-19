import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Layout from '../../components/Layout/Layout';
import api from '../../services/api';
import './History.css';

export default function History() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/sessions/user/me')
      .then((res) => setSessions(res.data.sessions))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout className="history-page">
      <div className="history-header">
        <button className="history-back" onClick={() => navigate(-1)}>← Retour</button>
        <h1 className="history-title">Mes parties</h1>
      </div>

      {loading && <p className="history-empty">Chargement...</p>}

      {!loading && sessions.length === 0 && (
        <div className="history-empty">
          <p>Aucune partie sauvegardée.</p>
          <p className="history-empty-sub">Joue une partie et connecte-toi pour garder un historique !</p>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/session/setup')}>
            Jouer maintenant
          </button>
        </div>
      )}

      {!loading && sessions.length > 0 && (
        <div className="history-list">
          {sessions.map((s, i) => {
            const mediaCount = s.history?.reduce((acc, h) => acc + (h.media?.length || 0), 0) || 0;
            return (
              <motion.div
                key={s._id}
                className="history-card"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <div className="history-card-top">
                  <div>
                    <p className="history-card-pack">{s.pack?.name || 'Pack inconnu'}</p>
                    <p className="history-card-players">
                      {s.players.map((p) => p.name).join(' · ')}
                    </p>
                  </div>
                  <div className="history-card-right">
                    <p className="history-card-date">
                      {new Date(s.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </p>
                    {mediaCount > 0 && (
                      <span className="history-media-badge">📸 {mediaCount}</span>
                    )}
                  </div>
                </div>

                <div className="history-card-scores">
                  {[...s.players].sort((a, b) => b.score - a.score).slice(0, 3).map((p, rank) => (
                    <span key={p.name} className={`history-player-score ${rank === 0 ? 'winner' : ''}`}>
                      {rank === 0 ? '🥇' : rank === 1 ? '🥈' : '🥉'} {p.name} {p.score}pts
                    </span>
                  ))}
                </div>

                {s.shareLink && (
                  <button
                    className="btn btn-ghost btn-sm history-gallery-btn"
                    onClick={() => navigate(`/gallery/${s.shareLink}`)}
                  >
                    Voir la galerie →
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
