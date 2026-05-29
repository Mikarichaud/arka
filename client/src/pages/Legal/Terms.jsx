import { useNavigate, useLocation } from 'react-router-dom';
import Layout from '../../components/Layout/Layout';
import SEO from '../../components/SEO/SEO';
import './Legal.css';

const CONTACT_EMAIL = 'postmaster@roulademarseillaise.fr';

export default function Terms() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Layout className="legal-page">
      <SEO
        title="Conditions générales d'utilisation"
        description="Les règles d'utilisation de La Roulade Marseillaise, dont la charte de contenu."
        path="/terms"
      />

      <div className="legal-header">
        <button
          className="btn-back"
          onClick={() => (location.key !== 'default' ? navigate(-1) : navigate('/'))}
        >← Retour</button>
        <h1 className="legal-title">Conditions générales d'utilisation</h1>
        <p className="legal-updated">Dernière mise à jour : mai 2026</p>
      </div>

      <div className="legal-content">
        <p>
          En utilisant <strong>La Roulade Marseillaise</strong> (« l'Application »), tu acceptes
          les présentes conditions. Si tu n'es pas d'accord, n'utilise pas l'Application.
        </p>

        <h2>1. Éditeur</h2>
        <p>
          L'Application est éditée à titre personnel par <strong>Michael Richaud</strong>
          {' '}(particulier), directeur de la publication. Contact :{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Hébergement : OVH (Union européenne).
        </p>

        <h2>2. Objet du service</h2>
        <p>
          L'Application propose un jeu de défis en tour par tour, en local sur un appareil
          ou en salon multijoueur temps réel. Certaines fonctionnalités peuvent être réservées
          aux comptes Premium.
        </p>

        <h2>3. Compte</h2>
        <p>
          La création d'un compte nécessite un pseudo, un email et un mot de passe. Tu es
          responsable de la confidentialité de tes identifiants et des activités sur ton compte.
          Tu dois avoir l'âge requis par les stores et la loi de ton pays.
        </p>

        <h2>4. Contenu généré par les utilisateurs &amp; charte de conduite</h2>
        <p>
          L'Application permet d'envoyer des photos/vidéos et d'interagir avec d'autres joueurs
          dans des salons privés. En publiant du contenu, tu garantis en détenir les droits et
          tu acceptes une <strong>politique de tolérance zéro envers les contenus et comportements
          répréhensibles</strong>.
        </p>
        <p>Sont strictement interdits, notamment :</p>
        <ul>
          <li>contenu illégal, haineux, harcelant, violent, ou à caractère sexuel impliquant des mineurs ;</li>
          <li>contenu d'une autre personne sans son consentement ;</li>
          <li>spam, usurpation d'identité, atteinte à la vie privée d'autrui.</li>
        </ul>
        <p>
          <strong>Signalement &amp; modération.</strong> Tout membre d'un salon peut signaler un
          contenu via le bouton « Signaler ». Les signalements sont traités par l'éditeur, qui
          s'engage à examiner et, le cas échéant, retirer le contenu répréhensible et sanctionner
          l'auteur <strong>dans un délai de 24 heures</strong>. Toute violation peut entraîner la
          suppression du contenu et/ou du compte sans préavis.
        </p>

        <h2>5. Propriété intellectuelle</h2>
        <p>
          L'Application, son design, ses textes et ses packs officiels sont protégés. Tu conserves
          les droits sur le contenu que tu publies, mais accordes à l'éditeur une licence non
          exclusive pour l'héberger et l'afficher dans le cadre du service.
        </p>

        <h2>6. Abonnement &amp; paiements</h2>
        <p>
          Le cas échéant, les abonnements et achats sont gérés via les moyens de paiement proposés
          dans l'Application. Les conditions de prix, de renouvellement et de résiliation sont
          indiquées au moment de l'achat.
        </p>

        <h2>7. Suppression de compte</h2>
        <p>
          Tu peux supprimer ton compte à tout moment depuis <strong>Profil → Mon compte</strong>.
          La suppression est définitive (voir la <a href="/privacy" onClick={(e) => { e.preventDefault(); navigate('/privacy'); }}>politique de confidentialité</a>).
        </p>

        <h2>8. Responsabilité</h2>
        <p>
          L'Application est fournie « en l'état ». L'éditeur ne saurait être tenu responsable des
          contenus publiés par les utilisateurs ni de l'usage qui est fait du jeu. Joue avec
          modération et bon esprit.
        </p>

        <h2>9. Droit applicable</h2>
        <p>
          Les présentes conditions sont régies par le droit français. Tout litige sera soumis aux
          tribunaux compétents, sous réserve des dispositions légales applicables aux consommateurs.
        </p>

        <h2>10. Contact</h2>
        <p>
          Pour toute question : <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </div>
    </Layout>
  );
}
