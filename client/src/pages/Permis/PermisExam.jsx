import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from '../../components/Icon/Icon';
import SEO from '../../components/SEO/SEO';
import { useSound } from '../../hooks/useSound';
import usePermisStore from '../../store/permisStore';
import './Permis.css';

export default function PermisExam() {
  const navigate = useNavigate();
  const { play } = useSound();
  const { session, submit, result, reset } = usePermisStore();

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({}); // { questionId: choiceIndex }
  const [picked, setPicked] = useState(null); // choix en cours d'affichage avant transition
  const [timeLeft, setTimeLeft] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const lockRef = useRef(false);

  const questions = session?.questions || [];
  const total = questions.length;
  const current = questions[idx];
  const timed = session?.secondsPerQuestion != null;

  // Pas de session active → retour accueil.
  useEffect(() => {
    if (!session && !result) navigate('/permis', { replace: true });
  }, [session, result, navigate]);

  const finish = useCallback(async (finalAnswers) => {
    if (lockRef.current) return;
    lockRef.current = true;
    setSubmitting(true);
    const payload = Object.entries(finalAnswers).map(([questionId, choiceIndex]) => ({ questionId, choiceIndex }));
    const res = await submit(payload);
    setSubmitting(false);
    if (res) play(res.passed ? 'validate' : 'refuse');
  }, [submit, play]);

  const goNext = useCallback((nextAnswers) => {
    if (idx + 1 >= total) {
      finish(nextAnswers);
    } else {
      setPicked(null);
      setIdx((i) => i + 1);
    }
  }, [idx, total, finish]);

  const choose = useCallback((choiceIndex) => {
    if (picked !== null || !current) return;
    setPicked(choiceIndex);
    const nextAnswers = { ...answers, [current._id]: choiceIndex };
    setAnswers(nextAnswers);
    play('stop');
    setTimeout(() => goNext(nextAnswers), 280);
  }, [picked, current, answers, play, goNext]);

  // Chrono 13 s par question (examen uniquement).
  useEffect(() => {
    if (!timed || !current || picked !== null) return;
    setTimeLeft(session.secondsPerQuestion);
    const startedAt = Date.now();
    const id = setInterval(() => {
      const elapsed = (Date.now() - startedAt) / 1000;
      const left = Math.max(0, session.secondsPerQuestion - elapsed);
      setTimeLeft(left);
      if (left <= 0) {
        clearInterval(id);
        play('timer');
        const nextAnswers = { ...answers, [current._id]: -1 }; // temps écoulé = non répondu
        setAnswers(nextAnswers);
        setPicked(-2); // marqueur "timeout" pour bloquer
        setTimeout(() => goNext(nextAnswers), 200);
      }
    }, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, timed, current, picked]);

  const quit = () => {
    reset();
    navigate('/permis', { replace: true });
  };

  // ---------- ÉCRAN RÉSULTAT ----------
  if (result) {
    const isExam = !result.teaser;
    const qById = new Map((session?.questions || []).map((q) => [q._id, q]));
    const recap = (result.corrections || []).map((c) => ({ ...c, q: qById.get(c.questionId) }));

    return (
      <div className="permis-page permis-result-page">
        <SEO title="Résultat du Passeport" path="/permis/exam" noindex />
        <motion.div
          className={`permis-result-card ${result.passed ? 'is-pass' : 'is-fail'}`}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 16 }}
        >
          <span className="permis-result-score">{result.score}<span>/{result.total}</span></span>
          <strong className="permis-result-mention">{result.mention}</strong>
          {isExam && result.isRecord && <span className="permis-result-record">★ Nouveau record !</span>}
          {result.passed
            ? <p className="permis-result-msg">Homologué, té ! T'es des nôtres.</p>
            : <p className="permis-result-msg">Recalé… mais on t'aime quand même. Révise et reviens.</p>}

          {result.teaser ? (
            <>
              <p className="permis-result-teaser">C'était le test blanc. Le vrai examen t'attend pour décrocher ton Passeport officiel.</p>
              <button className="btn btn-gold" onClick={() => { reset(); navigate('/permis'); }}>Passer le vrai examen</button>
            </>
          ) : (
            <div className="permis-result-actions">
              {result.publicCode && (
                <button className="btn btn-gold" onClick={() => { reset(); navigate(`/certificat/${result.publicCode}`); }}>
                  Voir mon certificat
                </button>
              )}
              <button className="btn btn-ghost btn-sm" onClick={() => { reset(); navigate('/permis'); }}>Retour au Permis</button>
            </div>
          )}
        </motion.div>

        {recap.length > 0 && (
          <div className="permis-recap">
            <h3 className="permis-recap-title">La correction</h3>
            {recap.map((r, i) => (
              <div key={r.questionId} className={`permis-recap-item ${r.isCorrect ? 'ok' : 'ko'}`}>
                <div className="permis-recap-q">
                  <span className="permis-recap-badge">{r.isCorrect ? '✓' : '✗'}</span>
                  <span>{i + 1}. {r.q?.text}</span>
                </div>
                {r.q && (
                  <div className="permis-recap-opts">
                    {r.q.options.map((opt, oi) => (
                      <span
                        key={oi}
                        className={`permis-recap-opt ${oi === r.correctPos ? 'is-correct' : ''} ${oi === r.chosen && !r.isCorrect ? 'is-wrong' : ''}`}
                      >
                        {opt}
                      </span>
                    ))}
                  </div>
                )}
                {r.chosen === -1 && <span className="permis-recap-skipped">Pas de réponse (temps écoulé)</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (!current) return null;

  // ---------- ÉCRAN EXAMEN ----------
  const timePct = timed ? Math.max(0, (timeLeft / session.secondsPerQuestion) * 100) : 100;
  const urgent = timed && timeLeft != null && timeLeft <= 4;

  return (
    <div className="permis-page permis-exam">
      <SEO title={session.mode === 'trial' ? 'Test blanc' : 'Examen du Passeport'} path="/permis/exam" noindex />

      <div className="permis-exam-head">
        <button className="permis-exam-quit" onClick={quit} aria-label="Quitter">✕</button>
        <div className="permis-exam-progress">
          {questions.map((_, i) => (
            <span key={i} className={`permis-dot ${i < idx ? 'done' : ''} ${i === idx ? 'now' : ''}`} />
          ))}
        </div>
        <span className="permis-exam-count">{idx + 1}/{total}</span>
      </div>

      {timed && (
        <div className={`permis-timer ${urgent ? 'urgent' : ''}`}>
          <div className="permis-timer-bar" style={{ width: `${timePct}%` }} />
          <span className="permis-timer-num">{Math.ceil(timeLeft ?? 0)}</span>
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={current._id}
          className="permis-question"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.2 }}
        >
          <span className="permis-q-cat">{current.category}</span>
          <h2 className="permis-q-text">{current.text}</h2>
          <div className="permis-q-options">
            {current.options.map((opt, i) => (
              <button
                key={i}
                className={`permis-q-option ${picked === i ? 'picked' : ''}`}
                disabled={picked !== null}
                onClick={() => choose(i)}
              >
                <span className="permis-q-letter">{String.fromCharCode(65 + i)}</span>
                {opt}
              </button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      {submitting && <p className="permis-exam-submitting">On corrige ta copie…</p>}
    </div>
  );
}
