import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from '../../components/Icon/Icon';
import SEO from '../../components/SEO/SEO';
import LoadingPlaceholder from '../../components/LoadingPlaceholder/LoadingPlaceholder';
import EmptyState from '../../components/EmptyState/EmptyState';
import useAuthStore from '../../store/authStore';
import useAuthModalStore from '../../store/authModalStore';
import api from '../../services/api';
import './Permis.css';

const fmtDate = (d) => new Date(d).toLocaleDateString('fr-FR', {
  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

export default function PermisHistory() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const openAuthModal = useAuthModalStore((s) => s.open);
  const [attempts, setAttempts] = useState(null);
  const [open, setOpen] = useState(null); // id (createdAt) de la tentative dépliée

  useEffect(() => {
    if (!user) { openAuthModal('login', { redirectTo: '/passeportmarseillais/historique' }); return; }
    api.get('/permis/history')
      .then(({ data }) => setAttempts(data.attempts))
      .catch(() => setAttempts([]));
  }, [user, openAuthModal]);

  const goBack = () => (location.key !== 'default' ? navigate(-1) : navigate('/passeportmarseillais'));

  return (
    <div className="permis-page permis-history">
      <SEO title="Mon historique" path="/passeportmarseillais/historique" noindex />

      <div className="permis-hist-head">
        <button className="btn btn-ghost btn-sm" onClick={goBack}>← Retour</button>
        <h1 className="permis-hist-title">Mon historique</h1>
      </div>

      {attempts === null && <LoadingPlaceholder variant="list" />}

      {attempts && attempts.length === 0 && (
        <EmptyState
          icon="medal-gold"
          title="Pas encore de tentative"
          description="Passe un test blanc ou l'examen, et tu retrouveras ici toutes tes copies."
        />
      )}

      {attempts && attempts.length > 0 && (
        <div className="permis-hist-list">
          {attempts.map((a) => {
            const id = a._id || a.createdAt;
            const isOpen = open === id;
            return (
              <div key={id} className={`permis-hist-item ${a.passed ? 'ok' : 'ko'}`}>
                <button className="permis-hist-row" onClick={() => setOpen(isOpen ? null : id)}>
                  <span className={`permis-hist-mode ${a.abandoned ? 'abandon' : a.mode}`}>{a.abandoned ? 'Abandon' : (a.mode === 'exam' ? 'Examen' : 'Test blanc')}</span>
                  <span className="permis-hist-main">
                    <span className="permis-hist-mention">{a.mention}</span>
                    <span className="permis-hist-date">{fmtDate(a.createdAt)}</span>
                  </span>
                  <span className="permis-hist-score">{a.score}<span>/{a.total}</span></span>
                  <span className="permis-hist-chevron">{isOpen ? '▲' : '▼'}</span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      className="permis-hist-detail"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                    >
                      {a.items?.map((it, i) => (
                        <div key={i} className={`permis-recap-item ${it.isCorrect ? 'ok' : 'ko'}`}>
                          <div className="permis-recap-q">
                            <span className="permis-recap-badge">{it.isCorrect ? '✓' : '✗'}</span>
                            <span>{i + 1}. {it.text}</span>
                          </div>
                          <div className="permis-recap-opts">
                            {it.options.map((opt, oi) => (
                              <span
                                key={oi}
                                className={`permis-recap-opt ${oi === it.correctPos ? 'is-correct' : ''} ${oi === it.chosen && !it.isCorrect ? 'is-wrong' : ''}`}
                              >
                                {opt}
                              </span>
                            ))}
                          </div>
                          {it.chosen === -1 && <span className="permis-recap-skipped">Pas de réponse (temps écoulé)</span>}
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
