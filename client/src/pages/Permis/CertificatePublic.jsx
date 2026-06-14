import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import SEO from '../../components/SEO/SEO';
import LoadingPlaceholder from '../../components/LoadingPlaceholder/LoadingPlaceholder';
import { getProvenance } from '../../utils/provenance';
import api from '../../services/api';
import './Permis.css';

const SITE = 'https://roulademarseillaise.fr';

export default function CertificatePublic() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [cert, setCert] = useState(null);
  const [state, setState] = useState('loading'); // loading | ok | notfound
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    api.get(`/permis/certificate/${code}`)
      .then(({ data }) => { if (alive) { setCert(data); setState('ok'); } })
      .catch(() => { if (alive) setState('notfound'); });
    return () => { alive = false; };
  }, [code]);

  const share = async () => {
    const url = `${SITE}/certificat/${code}`;
    try {
      if (navigator.share) await navigator.share({ title: 'Mon Passeport Marseillais', url });
      else { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    } catch { /* annulé */ }
  };

  if (state === 'loading') {
    return <div className="permis-page"><LoadingPlaceholder variant="tall" /></div>;
  }
  if (state === 'notfound') {
    return (
      <div className="permis-page permis-cert-404">
        <SEO title="Certificat introuvable" path={`/certificat/${code}`} noindex />
        <h1>Ce certificat n'existe pas (ou plus)</h1>
        <button className="btn btn-gold" onClick={() => navigate('/permis')}>Obtenir mon Passeport</button>
      </div>
    );
  }

  const prov = getProvenance(cert.postalCode);
  const provLabel = prov?.zone === 'marseille'
    ? '⚓ Marseille'
    : prov?.zone === 'paris' ? '🚇 Parisien démasqué'
    : prov?.zone === 'pays' ? '☀️ Du Pays'
    : prov?.zone === 'nord' ? '❄️ Le Nord' : '🏴‍☠️ Sans papiers';
  const dateStr = cert.recordAt
    ? new Date(cert.recordAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  return (
    <div className="permis-page permis-cert-public">
      <SEO
        title={`Passeport Marseillais de ${cert.pseudo}`}
        description={`${cert.pseudo} a obtenu la mention « ${cert.mention} » (${cert.score}/20) au Passeport Marseillais. Et toi, t'es un vrai de vrai ?`}
        path={`/certificat/${code}`}
        image={`${SITE}/api/permis/certificate/${code}/image.png`}
        titleAsIs
      />

      {/* ---------- LE DIPLÔME (paysage) ---------- */}
      <div className="certificat">
        <div className="cert-frame" />
        <div className="cert-watermark">
          <svg viewBox="0 0 100 100" fill="currentColor"><path d="M50 6a8 8 0 0 0-3 15v6h-8v8h8v34c-12-2-21-11-23-22l7 2-11-13-11 13 7-2c3 16 16 28 35 30 19-2 32-14 35-30l7 2-11-13-11 13 7-2c-2 11-11 20-23 22V35h8v-8h-8v-6A8 8 0 0 0 50 6z" /></svg>
        </div>

        <div className="cert-inner">
          <div className="cert-authority"><span className="cert-line" />République Marseillaise · Préfecture de la Bonne Mère<span className="cert-line" /></div>

          <svg className="cert-crest" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="46" fill="none" stroke="#C9A84C" strokeWidth="2.5" />
            <circle cx="50" cy="50" r="40" fill="#0057A8" />
            <g fill="#e0c070"><circle cx="50" cy="50" r="3" /><g stroke="#e0c070" strokeWidth="2"><path d="M50 14v10M50 76v10M14 50h10M76 50h10M25 25l7 7M68 68l7 7M75 25l-7 7M32 68l-7 7" /></g></g>
            <path d="M50 32a5 5 0 0 0-2 9.5V46h-5v5h5v18c-7-1-12-6-13-13l4 1-6-7-6 7 4-1c2 9 9 16 19 17 10-1 17-8 19-17l4 1-6-7-6 7 4-1c-1 7-6 12-13 13V51h5v-5h-5v-4.5A5 5 0 0 0 50 32z" fill="#F5F5F0" />
          </svg>

          <div className="cert-main-title">Passeport Marseillais</div>
          <div className="cert-sub">Certificat officiel d'authenticité marseillaise</div>
          <div className="cert-rule" />

          <div className="cert-body">
            Il est solennellement certifié que
            <span className="cert-name">{cert.pseudo}</span>
            <span className="cert-prov">{provLabel}</span>
            {cert.passed
              ? <> a passé l'épreuve du Passeport Marseillais et a obtenu la mention</>
              : <> s'est présenté à l'épreuve du Passeport Marseillais avec la mention</>}
            <span className={`cert-mention ${cert.passed ? 'ok' : 'ko'}`}>{cert.mention}</span>
            <span className="cert-scoreline">avec la note de <b>{cert.score}</b>/20.</span>
          </div>

          <div className="cert-footer">
            <div className="cert-foot-left">
              <div><span className="cert-flabel">Matricule</span> <span className="cert-matricule">{code}</span></div>
              {dateStr && <div><span className="cert-flabel">Délivré le</span> {dateStr}, sous le mistral</div>}
            </div>
            <div className="cert-foot-mid">
              <div className={`cert-stamp ${cert.passed ? 'ok' : 'ko'}`}>
                <span className="cert-ring" />
                <span className="cert-stamp-big">{cert.passed ? 'Homo-\nlogué' : 'Recalé'}</span>
                <span className="cert-stamp-small">★ MASSALIA ★</span>
              </div>
            </div>
            <div className="cert-foot-right">
              <QRCodeSVG value={`${SITE}/certificat/${code}`} size={56} bgColor="transparent" fgColor="#0D1117" level="M" />
              <div className="cert-signature">le Préfet</div>
              <div className="cert-sign-label">Le Préfet de la Bonne Mère</div>
            </div>
          </div>
        </div>
      </div>

      <div className="permis-cert-actions">
        <button className="btn btn-gold" onClick={share}>{copied ? 'Lien copié !' : 'Partager mon Passeport'}</button>
        <a className="btn btn-primary" href={`/api/permis/certificate/${code}/image.png?format=paysage&download=1`}>Télécharger · paysage</a>
        <a className="btn btn-primary" href={`/api/permis/certificate/${code}/image.png?format=portrait&download=1`}>Télécharger · portrait</a>
        <button className="btn btn-ghost" onClick={() => navigate('/permis')}>Passer / repasser l'examen</button>
      </div>
    </div>
  );
}
