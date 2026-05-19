import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Layout from '../../components/Layout/Layout';
import Icon from '../../components/Icon/Icon';
import HomeRoulette from '../../components/HomeRoulette/HomeRoulette';
import SEO, { SITE_URL, SITE_NAME } from '../../components/SEO/SEO';
import useAuthStore from '../../store/authStore';
import useSettingsStore from '../../store/settingsStore';
import { hasPremiumAccess } from '../../utils/permissions';

const HOME_JSON_LD = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: SITE_NAME,
    url: SITE_URL,
    applicationCategory: 'GameApplication',
    operatingSystem: 'Web, iOS, Android',
    description: 'Jeu de défis marseillais sur roulette. Mode local (tous sur un écran) ou multijoueur temps réel avec des amis sur leurs phones.',
    inLanguage: 'fr-FR',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'EUR',
    },
    creator: { '@type': 'Organization', name: 'ARKA' },
  },
];
import './Home.css';

export default function Home() {
  const navigate = useNavigate();
  const { theme, toggleTheme, soundEnabled, toggleSound } = useSettingsStore();
  const { user, logout } = useAuthStore();

  return (
    <Layout className="home-page">
      <SEO
        title=""
        titleAsIs
        description="Jeu de défis marseillais sur roulette. Joue en local entre amis sur un seul écran, ou en multijoueur temps réel avec ton groupe sur leurs phones. Gratuit, sans pub, ambiance pétanque sous les cigales."
        path="/"
        jsonLd={HOME_JSON_LD}
      />

      {/* ── Header : zone safe-area + toggles, dans le flow (jamais de fixed qui chevauche) ── */}
      <header className="home-header">
        <div className="home-header-toggles">
          <button className="theme-toggle" onClick={toggleSound} aria-label="Sons">
            <Icon name={soundEnabled ? 'sound-on' : 'sound-off'} size={18} />
          </button>
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Mode sombre">
            <Icon name={theme === 'light' ? 'moon' : 'sun'} size={18} />
          </button>
        </div>
      </header>

      {/* ── Colonne gauche desktop / flux mobile ── */}
      <div className="home-left">
        <motion.section
          className="home-brand"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <span className="home-by">by ARKA</span>
          <h1 className="home-title">La Roulade<br />Marseillaise</h1>
          <p className="home-tagline">Le jeu qui claque comme un carreau sur la place du village</p>
        </motion.section>

        <motion.section
          className="home-actions"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.18 }}
        >
          <button
            className="btn btn-gold home-btn-play"
            onClick={() => navigate('/session/setup')}
          >
            Lancer une partie
          </button>
          {/* Salons : logged-in = un seul CTA Mes salons (qui héberge Créer + Rejoindre + ses groupes).
              Anonyme = juste Rejoindre via code/QR. */}
          {user ? (
            <button
              className="btn btn-ghost home-ghost-btn home-salon-cta"
              onClick={() => navigate('/salons')}
            >
              <Icon name="trophy" size={16} style={{ marginRight: 6 }} />
              Mes salons
            </button>
          ) : (
            <button
              className="btn btn-ghost home-ghost-btn home-salon-cta"
              onClick={() => navigate('/salon/join')}
            >
              <Icon name="anchor" size={16} style={{ marginRight: 6 }} />
              Rejoindre un salon
            </button>
          )}
          <button
            className="btn btn-ghost home-ghost-btn"
            onClick={() => navigate('/packs')}
          >
            Packs & cosmétiques
          </button>

          {user ? (
            <div className="home-user-bar">
              <button
                className="home-user-info"
                onClick={() => navigate('/profile')}
              >
                <Icon name="wave" size={14} />
                <span className="home-user-name">{user.username}</span>
                {hasPremiumAccess(user) && <Icon name="star" size={13} />}
              </button>
              <div className="home-user-actions">
                {!hasPremiumAccess(user) && (
                  <button
                    className="home-user-btn home-user-btn--gold"
                    onClick={() => navigate('/premium')}
                  >
                    Premium
                  </button>
                )}
                <button className="home-user-btn" onClick={logout}>
                  Déconnexion
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                className="btn btn-ghost home-ghost-btn"
                onClick={() => navigate('/login')}
              >
                Se connecter
              </button>
              <button
                className="btn btn-ghost home-ghost-btn home-premium-cta"
                onClick={() => navigate('/premium')}
              >
                <Icon name="star" size={16} style={{ marginRight: 6 }} />
                Découvrir Premium
              </button>
            </>
          )}
        </motion.section>
      </div>

      {/* ── Roulette ── */}
      <motion.section
        className="home-roulette-area"
        initial={{ opacity: 0, scale: 0.88 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 160, damping: 20, delay: 0.1 }}
      >
        <HomeRoulette onClick={() => navigate('/session/setup')} />
      </motion.section>

      {/* ── À propos / Règles — section indexable SEO ──
          Visible en scrollant sous la roulette. Donne du texte avec mots-clés
          marseillais + comment-jouer pour Google. */}
      <section className="home-about" aria-label="Comment jouer à La Roulade Marseillaise">
        <h2>Le jeu qui sent la garrigue et le mistral</h2>
        <p>
          <strong>La Roulade Marseillaise</strong> est un jeu de défis entre amis sur le thème de Marseille, à jouer
          en apéro, soirée ou EVJF. Une <strong>roulette à 8 cases</strong> tourne, s'arrête sur un défi,
          et le joueur du tour doit le relever sous le regard du jury (les autres joueurs).
          Chaque défi a son niveau d'intensité (Facile / Moyen / Hard) et son temps imparti.
        </p>

        <h3>Deux modes pour ne jamais s'ennuyer</h3>
        <ul>
          <li>
            <strong>Mode local</strong> — Tout le monde dans la même pièce, un seul écran (PC, tablette, téléphone).
            Chacun joue à son tour, le suivant ramasse le device. Gratuit, illimité, pas besoin de compte.
          </li>
          <li>
            <strong>Mode Salon (multijoueur temps réel)</strong> — Chacun sur son propre phone, la roulette tourne
            simultanément sur tous les devices, le vote se fait à distance. Création réservée aux Premium, invitation
            par code à 8 caractères ou QR à scanner. Le salon survit aux soirées et garde l'historique des parties,
            les photos uploadées et les stats par joueur.
          </li>
        </ul>

        <h3>Des packs de défis pour toutes les occasions</h3>
        <p>
          Mireille pour la daronne qui fait du cinéma, Virage Sud pour les supporters OM, Mouloud le Pêcheur pour
          les rois de l'exagération. Et bientôt EVJF, Soirée Filles, Pack 18+, Noël en Famille, Après-Ski…
          Tu peux aussi créer ton propre pack depuis l'éditeur si tu as l'âme d'un Mouloud des défis.
        </p>

        <h3>Pourquoi marseillais ?</h3>
        <p>
          Parce que tout est plus drôle quand c'est dit avec l'accent. La Roulade emprunte au vocabulaire,
          aux clichés et à l'humour de la Cité Phocéenne : pétanque, cigales, mistral, sardines, Vélodrome, Calanques,
          bouillabaisse. C'est un hommage joyeux à une ville qui sait recevoir.
        </p>

        <h3>Comment commencer</h3>
        <p>
          Clique sur <em>Lancer une partie</em> pour démarrer en local. Pas besoin de compte. Si tu veux jouer
          à distance avec des potes éparpillés, crée un Salon (Premium) ou rejoins celui qu'un ami t'a envoyé
          par code/QR. Allez l'OM, et que le meilleur gagne.
        </p>
      </section>

    </Layout>
  );
}
