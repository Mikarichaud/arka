import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Icon from '../../components/Icon/Icon';
import SEO from '../../components/SEO/SEO';
import useAuthStore from '../../store/authStore';
import useAuthModalStore from '../../store/authModalStore';
import usePermisStore from '../../store/permisStore';
import { STORE_BUILD } from '../../utils/permissions';
import api from '../../services/api';
import './Permis.css';

const CATEGORIES = [
  { icon: 'wave', label: 'Le parler', desc: 'dégun, esquiché, cagole…' },
  { icon: 'anchor', label: 'La bouffe', desc: 'panisse, navettes, le bon pastis' },
  { icon: 'trophy', label: "L'OM", desc: 'Virage Sud, 1993, les légendes' },
  { icon: 'wheel', label: 'La géo', desc: 'quartiers, calanques, arrondissements' },
  { icon: 'star', label: 'Culture & traditions', desc: 'santons, Bonne Mère, mistral' },
];

export default function PermisHome() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const openAuthModal = useAuthModalStore((s) => s.open);
  const { status, fetchStatus, start, starting, error } = usePermisStore();
  const [buying, setBuying] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (user) fetchStatus();
  }, [user, fetchStatus]);

  // Retour de paiement Stripe (web) : ?purchased=1 → on rafraîchit + petit toast.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('purchased') === '1') {
      setToast('Té, 3 essais crédités ! En route pour le Passeport.');
      fetchStatus();
      navigate('/permis', { replace: true });
    }
  }, [location.search, fetchStatus, navigate]);

  const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, delay },
  });

  const launch = async (mode) => {
    if (!user) return openAuthModal('login', { redirectTo: '/permis' });
    const res = await start(mode);
    if (res.ok) navigate('/permis/exam');
  };

  const buy = async () => {
    if (!user) return openAuthModal('login', { redirectTo: '/permis' });
    setBuying(true);
    try {
      const { data } = await api.post('/permis/checkout');
      window.location.href = data.url;
    } catch {
      setBuying(false);
      setToast('Le paiement n\'a pas pu démarrer, réessaie.');
    }
  };

  const attempts = status?.unlimited ? '∞' : (status?.attemptsRemaining ?? 0);
  const hasAttempts = status?.unlimited || (status?.attemptsRemaining ?? 0) > 0;
  const hasCert = status?.bestScore != null;

  return (
    <div className="permis-page">
      <SEO
        title="Le Passeport Marseillais"
        description="Passe l'examen officiel de marseillaisitude et décroche ton Passeport Marseillais. 100 questions sur le parler, la bouffe, l'OM, la géo et les traditions. Es-tu un vrai de vrai ?"
        path="/permis"
      />

      {toast && (
        <motion.div className="permis-toast" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} onClick={() => setToast(null)}>
          {toast}
        </motion.div>
      )}

      <motion.header className="permis-hero" {...fadeUp(0)}>
        <div className="permis-hero-badge"><Icon name="medal-gold" size={44} /></div>
        <h1 className="permis-title">Le Passeport Marseillais</h1>
        <p className="permis-subtitle">
          L'examen officiel de marseillaisitude. Décroche ton certificat, ou démasque-toi en parisien.
        </p>
      </motion.header>

      {/* Statut du joueur */}
      {user && hasCert && (
        <motion.div className={`permis-status-card ${status.passed ? 'is-pass' : 'is-fail'}`} {...fadeUp(0.05)}>
          <div className="permis-status-mention">
            <span className="permis-status-label">Ta mention actuelle</span>
            <strong>{status.mention}</strong>
            <span className="permis-status-score">{status.bestScore}/20</span>
          </div>
          {status.publicCode && (
            <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/certificat/${status.publicCode}`)}>
              Voir mon certificat
            </button>
          )}
        </motion.div>
      )}

      {/* Les épreuves */}
      <motion.section className="permis-cats" {...fadeUp(0.1)}>
        <h2 className="permis-section-title">5 épreuves, 20 questions tirées au sort</h2>
        <div className="permis-cats-grid">
          {CATEGORIES.map((c) => (
            <div key={c.label} className="permis-cat">
              <span className="permis-cat-icon"><Icon name={c.icon} size={22} /></span>
              <span className="permis-cat-label">{c.label}</span>
              <span className="permis-cat-desc">{c.desc}</span>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Actions */}
      <motion.section className="permis-actions" {...fadeUp(0.15)}>
        <div className="permis-action-card permis-action-card--free">
          <h3>Le test blanc</h3>
          <p>20 questions, gratuit, une fois par jour. Pour t'échauffer.</p>
          <button
            className="btn btn-primary"
            disabled={starting || (user && status && !status.canTrialToday)}
            onClick={() => launch('trial')}
          >
            {user && status && !status.canTrialToday ? 'Déjà fait aujourd\'hui — reviens demain' : 'Tenter le test blanc'}
          </button>
        </div>

        <div className="permis-action-card permis-action-card--exam">
          <span className="permis-action-tag">Le vrai Passeport</span>
          <h3>L'examen officiel</h3>
          <p>20 questions chronométrées (13 s chacune). Ton meilleur score fait foi.</p>
          <div className="permis-attempts">
            Essais restants : <strong>{user ? attempts : '—'}</strong>
          </div>
          {hasAttempts ? (
            <button className="btn btn-gold" disabled={starting} onClick={() => launch('exam')}>
              {starting ? 'On prépare l\'examen…' : 'Passer l\'examen'}
            </button>
          ) : STORE_BUILD ? (
            <button className="btn btn-gold" disabled>Achat bientôt disponible</button>
          ) : (
            <button className="btn btn-gold" disabled={buying} onClick={buy}>
              {buying ? 'Redirection…' : 'Acheter 3 essais — 13 €'}
            </button>
          )}
        </div>
      </motion.section>

      {error && <p className="permis-error">{error}</p>}

      {!user && (
        <p className="permis-login-hint">
          <button className="btn btn-ghost btn-sm" onClick={() => openAuthModal('login', { redirectTo: '/permis' })}>
            Connecte-toi pour passer l'examen
          </button>
        </p>
      )}
    </div>
  );
}
