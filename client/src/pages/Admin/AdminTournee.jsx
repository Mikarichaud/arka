import { useEffect, useState } from 'react';
import LoadingPlaceholder from '../../components/LoadingPlaceholder/LoadingPlaceholder';
import api from '../../services/api';
import './AdminTournee.css';

const QR_BASE = 'roulademarseillaise.fr/tournee?spot=';

export default function AdminTournee() {
  const [spots, setSpots] = useState(null);
  const [labels, setLabels] = useState({});
  const [savingSpot, setSavingSpot] = useState(null);
  const [creating, setCreating] = useState(false);

  const load = () => {
    api.get('/admin/tournee')
      .then(({ data }) => {
        setSpots(data.spots);
        setLabels(Object.fromEntries(data.spots.map((s) => [s.spot, s.label || ''])));
      })
      .catch(() => setSpots([]));
  };
  useEffect(() => { load(); }, []);

  const save = async (spot) => {
    setSavingSpot(spot);
    try {
      await api.put(`/admin/tournee/${spot}`, { label: labels[spot] });
      load();
    } finally { setSavingSpot(null); }
  };

  const reset = async (spot) => {
    if (!window.confirm('Remettre les compteurs de ce spot à zéro ?')) return;
    setSavingSpot(spot);
    try { await api.put(`/admin/tournee/${spot}`, { reset: true }); load(); }
    finally { setSavingSpot(null); }
  };

  const create = async () => {
    setCreating(true);
    try { await api.post('/admin/tournee', {}); load(); }
    finally { setCreating(false); }
  };

  const remove = async (spot) => {
    if (!window.confirm(`Supprimer ${spot} ? Le QR de ce sticker ne marchera plus.`)) return;
    setSavingSpot(spot);
    try { await api.delete(`/admin/tournee/${spot}`); load(); }
    finally { setSavingSpot(null); }
  };

  if (spots === null) return <LoadingPlaceholder variant="list" count={4} />;

  const totals = spots.reduce((acc, s) => ({
    scans: acc.scans + s.scans, conv: acc.conv + s.conversions,
  }), { scans: 0, conv: 0 });
  const globalRate = totals.scans > 0 ? Math.round((totals.conv / totals.scans) * 100) : 0;

  return (
    <div className="adm-tournee">
      <div className="adm-tournee-intro">
        <p>Campagne stickers en bar. Chaque sticker porte un QR fixe (<code>spot1…4</code>) — mappe-le ici au quartier où tu l'as collé. <strong>Conversion = clic « Télécharger l'app » + inscription réelle.</strong></p>
        <div className="adm-tournee-global">
          <span><b>{totals.scans}</b> scans</span>
          <span><b>{totals.conv}</b> conversions</span>
          <span><b>{globalRate}%</b> de taux global</span>
        </div>
      </div>

      <button className="btn btn-primary btn-sm adm-tournee-new" disabled={creating} onClick={create}>
        {creating ? 'Création…' : '+ Nouveau spot'}
      </button>

      <div className="adm-tournee-list">
        {spots.map((s) => (
          <div key={s.spot} className="adm-spot">
            <div className="adm-spot-head">
              <span className="adm-spot-id">{s.spot}</span>
              <span className="adm-spot-qr">{QR_BASE}{s.spot}</span>
            </div>

            <div className="adm-spot-label">
              <input
                className="input"
                placeholder="Quartier (ex: Le Panier)"
                value={labels[s.spot] ?? ''}
                maxLength={60}
                onChange={(e) => setLabels((p) => ({ ...p, [s.spot]: e.target.value }))}
              />
              <button className="btn btn-primary btn-sm" disabled={savingSpot === s.spot} onClick={() => save(s.spot)}>
                {savingSpot === s.spot ? '…' : 'Enregistrer'}
              </button>
            </div>

            <div className="adm-spot-stats">
              <div className="adm-stat"><span className="adm-stat-n">{s.scans}</span><span className="adm-stat-l">scans</span></div>
              <div className="adm-stat"><span className="adm-stat-n">{s.appClicks}</span><span className="adm-stat-l">clics app</span></div>
              <div className="adm-stat"><span className="adm-stat-n">{s.signups}</span><span className="adm-stat-l">inscriptions</span></div>
              <div className="adm-stat adm-stat--rate"><span className="adm-stat-n">{s.rate}%</span><span className="adm-stat-l">conversion</span></div>
            </div>

            <div className="adm-spot-actions">
              <a className="btn btn-gold btn-sm" href={`/api/tournee/${s.spot}/qr.png?download=1`} download>⬇ QR fond blanc</a>
              <a className="btn btn-ghost btn-sm" href={`/api/tournee/${s.spot}/qr.png?transparent=1&download=1`} download>⬇ Transparent · fond clair</a>
              <a className="btn btn-ghost btn-sm" href={`/api/tournee/${s.spot}/qr.png?transparent=1&white=1&download=1`} download>⬇ Transparent · fond foncé</a>
              <button className="adm-spot-link" onClick={() => reset(s.spot)}>Réinitialiser</button>
              <button className="adm-spot-link adm-spot-del" onClick={() => remove(s.spot)}>Supprimer</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
