import { useNavigate, useLocation } from 'react-router-dom';
import Layout from '../../components/Layout/Layout';
import SEO from '../../components/SEO/SEO';
import './Legal.css';

const CONTACT_EMAIL = 'postmaster@roulademarseillaise.fr';

export default function Privacy() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Layout className="legal-page">
      <SEO
        title="Politique de confidentialité"
        description="Comment La Roulade Marseillaise collecte, utilise et protège tes données personnelles."
        path="/privacy"
      />

      <div className="legal-header">
        <button
          className="btn-back"
          onClick={() => (location.key !== 'default' ? navigate(-1) : navigate('/'))}
        >← Retour</button>
        <h1 className="legal-title">Politique de confidentialité</h1>
        <p className="legal-updated">Dernière mise à jour : mai 2026</p>
      </div>

      <div className="legal-content">
        <p>
          La présente politique explique quelles données personnelles sont collectées par
          l'application <strong>La Roulade Marseillaise</strong> (« l'Application »), pourquoi,
          et quels sont tes droits. Nous limitons la collecte au strict nécessaire au
          fonctionnement du service.
        </p>

        <h2>1. Responsable du traitement</h2>
        <p>
          L'Application est éditée à titre personnel par <strong>Michael Richaud</strong>
          {' '}(particulier), joignable à l'adresse{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> pour toute question relative
          à tes données. Hébergement : OVH (Union européenne).
        </p>

        <h2>2. Données collectées</h2>
        <ul>
          <li><strong>Compte</strong> : pseudo, adresse email, mot de passe (stocké chiffré, jamais en clair), code postal (pour le « badge de quartier »).</li>
          <li><strong>Profil</strong> : photo de profil si tu en ajoutes une.</li>
          <li><strong>Contenu de jeu</strong> : scores, historique des parties, et photos/vidéos que tu choisis d'uploader pendant les parties en salon.</li>
          <li><strong>Données techniques</strong> : informations de connexion strictement nécessaires (jeton d'authentification stocké localement sur ton appareil).</li>
        </ul>

        <h2>3. Finalités</h2>
        <ul>
          <li>Créer et gérer ton compte et tes parties.</li>
          <li>Afficher l'historique, les galeries et les classements des salons.</li>
          <li>Assurer la sécurité et la modération des contenus signalés.</li>
        </ul>

        <h2>4. Sous-traitants et hébergement</h2>
        <ul>
          <li><strong>OVH</strong> : hébergement du serveur (Union européenne).</li>
        </ul>
        <p>Aucune donnée n'est vendue à des tiers à des fins publicitaires.</p>

        <h2>5. Durée de conservation</h2>
        <p>
          Tes données sont conservées tant que ton compte est actif. Lorsque tu supprimes
          ton compte (voir ci-dessous), elles sont effacées ; les pseudos déjà figés dans
          l'historique des parties d'autres joueurs peuvent subsister sous forme de simple
          texte, sans lien avec ton identité.
        </p>

        <h2>6. Suppression de compte</h2>
        <p>
          Tu peux supprimer ton compte à tout moment depuis <strong>Profil → Mon compte →
          Supprimer mon compte</strong>. Cette action est définitive : ton profil, tes packs
          persos, tes parties et galeries, et tes salons hébergés sont supprimés.
        </p>

        <h2>7. Tes droits (RGPD)</h2>
        <p>
          Tu disposes d'un droit d'accès, de rectification, d'effacement, de portabilité et
          d'opposition sur tes données. La plupart s'exercent directement dans l'app (édition
          du profil, suppression de compte). Pour toute autre demande, écris-nous à{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>

        <h2>8. Cookies & stockage local</h2>
        <p>
          L'Application n'utilise pas de cookies publicitaires. Elle stocke localement sur
          ton appareil un jeton d'authentification et tes préférences (thème, sons), nécessaires
          à son fonctionnement.
        </p>

        <h2>9. Contact</h2>
        <p>
          Pour toute question : <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </div>
    </Layout>
  );
}
