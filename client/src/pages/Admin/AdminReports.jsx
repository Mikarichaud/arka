import { useEffect, useState } from 'react';
import Icon from '../../components/Icon/Icon';
import LoadingPlaceholder from '../../components/LoadingPlaceholder/LoadingPlaceholder';
import EmptyState from '../../components/EmptyState/EmptyState';
import api from '../../services/api';

const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const isVideo = (url) => /\/video\/upload\//.test(url || '');

export default function AdminReports() {
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [acting, setActing] = useState(null); // id en cours de traitement

  const load = async () => {
    try {
      const { data } = await api.get('/admin/reports');
      setReports(data.reports || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur de chargement des signalements.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get('/admin/reports');
        if (alive) { setReports(data.reports || []); setError(''); }
      } catch (err) {
        if (alive) setError(err.response?.data?.message || 'Erreur de chargement des signalements.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const resolve = async (id, action) => {
    setActing(id);
    try {
      await api.post(`/admin/reports/${id}/resolve`, { action });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Action impossible.');
    } finally {
      setActing(null);
    }
  };

  if (loading && !reports) {
    return (
      <div className="admin-grid">
        <LoadingPlaceholder variant="card" />
        <LoadingPlaceholder variant="card" />
      </div>
    );
  }

  if (error) return <div className="admin-error">{error}</div>;

  const pending = reports.filter((r) => r.status === 'pending');
  const treated = reports.filter((r) => r.status !== 'pending');

  return (
    <section className="admin-section">
      <h2 className="admin-section-title">
        <Icon name="cross" size={16} /> Signalements
        {pending.length > 0 && <span className="admin-users-count">{pending.length}</span>}
      </h2>

      {pending.length === 0 ? (
        <EmptyState icon="trophy" title="Rien à modérer, hé bé !" description="Aucun contenu signalé en attente. Tout est clean." />
      ) : (
        <div className="admin-reports-grid">
          {pending.map((r) => (
            <ReportCard key={r._id} report={r} acting={acting === r._id} onResolve={resolve} />
          ))}
        </div>
      )}

      {treated.length > 0 && (
        <details className="admin-reports-treated">
          <summary>Déjà traités ({treated.length})</summary>
          <ul className="admin-reports-treated-list">
            {treated.map((r) => (
              <li key={r._id}>
                <span className={`admin-report-pill admin-report-pill--${r.resolution === 'media-deleted' ? 'deleted' : 'dismissed'}`}>
                  {r.resolution === 'media-deleted' ? 'Média supprimé' : 'Rejeté'}
                </span>
                <span className="admin-reports-treated-meta">
                  salon {r.salonCode} · {r.targetPseudo || '—'} · signalé par {r.reporterPseudo || 'anonyme'}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function ReportCard({ report: r, acting, onResolve }) {
  return (
    <div className="admin-report-card">
      <div className="admin-report-media">
        {isVideo(r.mediaUrl) ? (
          <video src={r.mediaUrl} controls playsInline />
        ) : (
          <a href={r.mediaUrl} target="_blank" rel="noreferrer">
            <img src={r.mediaUrl} alt="contenu signalé" loading="lazy" />
          </a>
        )}
      </div>
      <div className="admin-report-info">
        <div className="admin-report-line">
          <strong>Salon</strong> <span className="admin-report-code">{r.salonCode}</span>
        </div>
        <div className="admin-report-line">
          <strong>Uploadeur présumé</strong> {r.targetPseudo || '—'}
        </div>
        <div className="admin-report-line">
          <strong>Signalé par</strong> {r.reporterPseudo || 'anonyme'}
        </div>
        {r.reason && <p className="admin-report-reason">« {r.reason} »</p>}
        <div className="admin-report-date">{dateFmt.format(new Date(r.createdAt))}</div>
      </div>
      <div className="admin-report-actions">
        <button className="btn btn-danger btn-sm" disabled={acting} onClick={() => onResolve(r._id, 'delete')}>
          {acting ? '...' : 'Supprimer le média'}
        </button>
        <button className="btn btn-ghost btn-sm" disabled={acting} onClick={() => onResolve(r._id, 'dismiss')}>
          Rejeter
        </button>
      </div>
    </div>
  );
}
