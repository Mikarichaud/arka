import { useEffect, useMemo, useState } from 'react';
import Icon from '../../components/Icon/Icon';
import ProvenanceBadge from '../../components/ProvenanceBadge/ProvenanceBadge';
import LoadingPlaceholder from '../../components/LoadingPlaceholder/LoadingPlaceholder';
import EmptyState from '../../components/EmptyState/EmptyState';
import api from '../../services/api';

const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' });

function fmtDate(iso) {
  if (!iso) return '—';
  return dateFmt.format(new Date(iso));
}

// Temps relatif court façon "il y a 3 min / 2 h / 5 j". "Jamais" si pas de trace.
function fmtAgo(iso) {
  if (!iso) return 'Jamais';
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "à l'instant";
  const m = Math.round(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  if (d < 30) return `il y a ${d} j`;
  return fmtDate(iso);
}

// En ligne maintenant ou vu il y a < 5 min = "frais".
function seenClass(u) {
  if (u.online) return 'is-online';
  if (!u.lastSeenAt) return 'is-never';
  return Date.now() - new Date(u.lastSeenAt).getTime() < 5 * 60 * 1000 ? 'is-fresh' : '';
}

// Classe couleur du taux de forme : vert costaud, rouge "mou comme une panisse".
function formClass(rate) {
  if (rate === null || rate === undefined) return 'is-na';
  if (rate >= 60) return 'is-good';
  if (rate >= 25) return 'is-mid';
  return 'is-bad';
}

function formLabel(rate) {
  if (rate === null || rate === undefined) return '—';
  return `${rate}%`;
}

// Pastille d'abonnement / statut du compte.
function aboBadge(u) {
  if (u.isOwner) return { label: 'Patron', cls: 'admin-player-badge--owner' };
  if (u.role === 'gate') return { label: 'Gaté', cls: 'admin-player-badge--gate' };
  if (u.subscription.status === 'past_due') return { label: 'Past due', cls: 'admin-player-badge--red' };
  if (u.tier === 'premium' && u.subscription.cancelAtPeriodEnd) return { label: 'Annulé ⚠', cls: 'admin-player-badge--red' };
  if (u.tier === 'premium') return { label: 'Premium', cls: 'admin-player-badge--premium' };
  return { label: 'Free', cls: 'admin-player-badge--anon' };
}

// Clés triables → accesseur de valeur (null = en bas).
const SORTERS = {
  pseudo: (u) => u.username?.toLowerCase() || '',
  forme: (u) => (u.counts.formRate === null ? -1 : u.counts.formRate),
  parties: (u) => u.counts.games,
  contrib: (u) => u.counts.customPacks + u.counts.salonsHosted + u.counts.sessionsSaved,
  vu: (u) => (u.online ? Infinity : new Date(u.lastSeenAt || 0).getTime()),
  inscrit: (u) => new Date(u.createdAt || 0).getTime(),
};

export default function AdminUsers() {
  const [users, setUsers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState('inscrit');
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const { data } = await api.get('/admin/users');
        if (alive) { setUsers(data.users || []); setError(''); }
      } catch (err) {
        if (alive) setError(err.response?.data?.message || 'Erreur de chargement du fichier des gatés.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir(key === 'pseudo' ? 'asc' : 'desc'); }
  };

  const rows = useMemo(() => {
    if (!users) return [];
    const q = query.trim().toLowerCase();
    const filtered = q
      ? users.filter((u) =>
          u.username?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          (u.postalCode || '').includes(q))
      : users;
    const sorter = SORTERS[sortKey] || SORTERS.inscrit;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const va = sorter(a); const vb = sorter(b);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
  }, [users, query, sortKey, sortDir]);

  const sortIcon = (key) => (sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '');

  if (loading && !users) {
    return (
      <div className="admin-grid">
        <LoadingPlaceholder variant="list" />
        <LoadingPlaceholder variant="list" />
        <LoadingPlaceholder variant="list" />
      </div>
    );
  }

  if (error) return <div className="admin-error">{error}</div>;

  return (
    <section className="admin-section">
      <div className="admin-users-toolbar">
        <h2 className="admin-section-title">
          <Icon name="wave" size={16} /> Le fichier des gatés
          <span className="admin-users-count">{users?.length || 0}</span>
        </h2>
        <div className="admin-users-search">
          <Icon name="lightning" size={14} />
          <input
            type="search"
            placeholder="Chercher un pseudo, un email, un CP…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon="wave" title="Personne ici, hé bé !" description="Aucun joueur ne correspond à ta recherche." />
      ) : (
        <div className="admin-users-table-wrap">
          <table className="admin-users-table">
            <thead>
              <tr>
                <th className="is-sortable" onClick={() => toggleSort('pseudo')}>Joueur{sortIcon('pseudo')}</th>
                <th>Provenance</th>
                <th className="is-sortable num" onClick={() => toggleSort('forme')}>Forme{sortIcon('forme')}</th>
                <th className="is-sortable num" onClick={() => toggleSort('parties')}>Parties{sortIcon('parties')}</th>
                <th className="num">Défis ✓/✗</th>
                <th>Abo</th>
                <th className="is-sortable" onClick={() => toggleSort('contrib')}>Crée{sortIcon('contrib')}</th>
                <th className="is-sortable num" onClick={() => toggleSort('vu')}>Dernière connexion{sortIcon('vu')}</th>
                <th className="is-sortable num" onClick={() => toggleSort('inscrit')}>Inscrit{sortIcon('inscrit')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => {
                const abo = aboBadge(u);
                return (
                  <tr key={u.id}>
                    <td>
                      <div className="admin-users-identity">
                        <span className={`admin-users-avatar ${u.online ? 'is-online' : ''}`}>
                          {u.avatar
                            ? <img src={u.avatar} alt="" />
                            : <span className="admin-users-initials">{(u.username || '?').slice(0, 2).toUpperCase()}</span>}
                          {u.online && <span className="admin-users-online-dot" title="En ligne" />}
                        </span>
                        <span className="admin-users-names">
                          <span className="admin-users-pseudo">{u.username}</span>
                          <span className="admin-users-email" title={u.email}>{u.email}</span>
                        </span>
                      </div>
                    </td>
                    <td>
                      {u.postalCode
                        ? <ProvenanceBadge postalCode={u.postalCode} variant="full" size={14} />
                        : <span className="admin-users-muted">—</span>}
                    </td>
                    <td className="num">
                      <span className={`admin-users-form ${formClass(u.counts.formRate)}`}>
                        {formLabel(u.counts.formRate)}
                      </span>
                    </td>
                    <td className="num">{u.counts.games}</td>
                    <td className="num">
                      <span className="admin-users-cr">
                        <span className="ok">{u.counts.completed}</span>
                        <span className="sep">/</span>
                        <span className="ko">{u.counts.refused}</span>
                      </span>
                    </td>
                    <td><span className={`admin-player-badge ${abo.cls}`}>{abo.label}</span></td>
                    <td>
                      <span className="admin-users-contrib" title="Packs créés · salons hébergés · parties locales sauvées">
                        <span title="Packs persos créés"><Icon name="trophy" size={12} /> {u.counts.customPacks}</span>
                        <span title="Salons hébergés"><Icon name="anchor" size={12} /> {u.counts.salonsHosted}</span>
                        <span title="Parties locales sauvées"><Icon name="football" size={12} /> {u.counts.sessionsSaved}</span>
                      </span>
                    </td>
                    <td className="num">
                      <span className={`admin-users-seen ${seenClass(u)}`}>
                        {u.online ? 'En ligne' : fmtAgo(u.lastSeenAt)}
                      </span>
                    </td>
                    <td className="num admin-users-muted">{fmtDate(u.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
