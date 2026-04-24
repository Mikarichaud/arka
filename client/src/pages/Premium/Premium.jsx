import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Icon from '../../components/Icon/Icon';
import useAuthStore from '../../store/authStore';
import api from '../../services/api';
import './Premium.css';

const FEATURES = [
  { icon: 'anchor',  label: 'Tous les packs de défis',       free: '3 packs',        premium: 'Illimité' },
  { icon: 'camera',  label: 'Photos & vidéos de soirée',     free: false,            premium: true },
  { icon: 'photo',   label: 'Galerie partageable (QR code)', free: false,            premium: true },
  { icon: 'trophy',  label: 'Historique des parties',        free: false,            premium: true },
  { icon: 'pencil',  label: 'Packs personnalisés',           free: '1 pack / 8 défis', premium: 'Illimité / jusqu’à 24 défis (8 tirés par partie)' },
  { icon: 'wave',    label: 'Joueurs par partie',            free: '2 – 6',          premium: '2 – 10' },
  { icon: 'star',    label: 'Nouveaux packs chaque mois',    free: false,            premium: true },
  { icon: 'wheel',   label: 'Roulettes custom (cosmétiques)',free: false,            premium: 'Achat séparé' },
];

const PACKS_COMING = [
  { name: 'EVJF à Marseille',    price: '€3,99', emoji: '💍', target: 'Futures mariées' },
  { name: 'Soirée 18+',          price: '€4,99', emoji: '🔥', target: 'Couples & adultes' },
  { name: 'EVG',                  price: '€3,99', emoji: '🍺', target: 'Enterrement de vie' },
  { name: 'Noël en Famille',     price: '€2,99', emoji: '🎄', target: 'Familles' },
  { name: 'La Tournée du Pastis', price: '€2,99', emoji: '🥃', target: 'Soirées bar' },
];

export default function Premium() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const [billing, setBilling] = useState('annual');
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    if (!user) {
      navigate('/login', { state: { redirect: '/premium' } });
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/payments/create-checkout-session', { billing });
      window.location.href = data.url;
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.45, delay },
  });

  return (
    <div className="premium-page">

      {/* ── Nav ── */}
      <div className="premium-nav">
        <button
          className="premium-back"
          onClick={() => (location.key !== 'default' ? navigate(-1) : navigate('/'))}
        >← Retour</button>
        {user && <span className="premium-user">{user.username}</span>}
      </div>

      {/* ── Hero ── */}
      <motion.section className="premium-hero" {...fadeUp(0)}>
        <div className="premium-hero-badge">
          <Icon name="star" size={16} />
          <span>La Roulade Marseillaise Premium</span>
        </div>
        <h1 className="premium-hero-title">Fais péter<br />la soirée</h1>
        <p className="premium-hero-sub">
          Photos, vidéos, galerie partagée, tous les packs de défis.
          L'expérience complète pour une soirée dont tout le monde se souviendra.
        </p>
      </motion.section>

      {/* ── Toggle billing ── */}
      <motion.div className="premium-billing-toggle" {...fadeUp(0.1)}>
        <button
          className={`billing-btn ${billing === 'monthly' ? 'active' : ''}`}
          onClick={() => setBilling('monthly')}
        >
          Mensuel
        </button>
        <button
          className={`billing-btn ${billing === 'annual' ? 'active' : ''}`}
          onClick={() => setBilling('annual')}
        >
          Annuel
          <span className="billing-save">−40%</span>
        </button>
      </motion.div>

      {/* ── Pricing cards ── */}
      <motion.div className="premium-plans" {...fadeUp(0.15)}>

        {/* Free */}
        <div className="premium-plan premium-plan--free">
          <div className="plan-header">
            <span className="plan-name">Gratuit</span>
            <div className="plan-price">
              <span className="plan-amount">€0</span>
            </div>
            <span className="plan-desc">Pour découvrir</span>
          </div>
          <button className="btn btn-ghost plan-cta" disabled={true}>
            Ton plan actuel
          </button>
        </div>

        {/* Premium */}
        <div className="premium-plan premium-plan--premium">
          <div className="plan-glow" />
          <div className="plan-badge-top">Recommandé</div>
          <div className="plan-header">
            <span className="plan-name">Premium</span>
            <div className="plan-price">
              {billing === 'annual' ? (
                <>
                  <span className="plan-amount">€2,92</span>
                  <span className="plan-period">/mois</span>
                  <span className="plan-billed">facturé €34,99/an</span>
                </>
              ) : (
                <>
                  <span className="plan-amount">€4,99</span>
                  <span className="plan-period">/mois</span>
                </>
              )}
            </div>
            <span className="plan-desc">Accès illimité à tout</span>
          </div>
          <button
            className="btn btn-gold plan-cta"
            onClick={handleCheckout} disabled={loading}
          >
            {loading ? 'Redirection...' : billing === 'annual' ? 'Commencer — €34,99/an' : 'Commencer — €4,99/mois'}
          </button>
          {billing === 'annual' && (
            <p className="plan-saving">Tu économises €24,89 par an vs mensuel</p>
          )}
        </div>

      </motion.div>

      {/* ── Tableau comparatif ── */}
      <motion.section className="premium-comparison" {...fadeUp(0.2)}>
        <h2 className="premium-section-title">Ce que tu débloque</h2>
        <div className="comparison-table">
          <div className="comparison-header">
            <span />
            <span className="comparison-col-label">Gratuit</span>
            <span className="comparison-col-label comparison-col-premium">Premium</span>
          </div>
          {FEATURES.map((f, i) => (
            <motion.div
              key={i}
              className="comparison-row"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 + i * 0.04 }}
            >
              <div className="comparison-feature">
                <Icon name={f.icon} size={18} />
                <span>{f.label}</span>
              </div>
              <div className="comparison-free">
                {f.free === false
                  ? <Icon name="cross" size={18} />
                  : typeof f.free === 'string'
                    ? <span className="comparison-text">{f.free}</span>
                    : <Icon name="check" size={18} />
                }
              </div>
              <div className="comparison-premium">
                {f.premium === true
                  ? <Icon name="check" size={18} />
                  : typeof f.premium === 'string'
                    ? <span className="comparison-text comparison-text--gold">{f.premium}</span>
                    : <Icon name="cross" size={18} />
                }
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ── Packs à venir ── */}
      <motion.section className="premium-coming" {...fadeUp(0.3)}>
        <h2 className="premium-section-title">Packs qui arrivent</h2>
        <p className="premium-coming-sub">Nouveaux défis chaque mois, inclus dans ton abonnement</p>
        <div className="coming-grid">
          {PACKS_COMING.map((p, i) => (
            <motion.div
              key={i}
              className="coming-card"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.35 + i * 0.06 }}
            >
              <span className="coming-emoji">{p.emoji}</span>
              <span className="coming-name">{p.name}</span>
              <span className="coming-target">{p.target}</span>
              <span className="coming-price">{p.price}</span>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ── CTA final ── */}
      <motion.section className="premium-final-cta" {...fadeUp(0.4)}>
        <div className="final-cta-card">
          <Icon name="trophy" size={40} />
          <h2 className="final-cta-title">Prêt à claquer la soirée ?</h2>
          <p className="final-cta-sub">Sans engagement. Annule quand tu veux.</p>
          <button
            className="btn btn-gold final-cta-btn"
            onClick={handleCheckout} disabled={loading}
          >
            {loading ? 'Redirection...' : billing === 'annual' ? 'Démarrer pour €34,99/an' : 'Démarrer pour €4,99/mois'}
          </button>
          <p className="final-cta-secure">
            <Icon name="lock" size={14} style={{ marginRight: 4 }} />
            Paiement sécurisé via Stripe · Résiliable à tout moment
          </p>
        </div>
      </motion.section>

    </div>
  );
}
