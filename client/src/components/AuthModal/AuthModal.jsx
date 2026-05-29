import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from '../Icon/Icon';
import PasswordInput from '../PasswordInput/PasswordInput';
import useAuthStore from '../../store/authStore';
import useAuthModalStore from '../../store/authModalStore';
import { useEscapeClose } from '../../hooks/useEscapeClose';
import { fumigenesVariants } from '../../styles/motion';
import api from '../../services/api';
import './AuthModal.css';

export default function AuthModal() {
  const navigate = useNavigate();
  const mode = useAuthModalStore((s) => s.mode);
  const redirectTo = useAuthModalStore((s) => s.redirectTo);
  const payload = useAuthModalStore((s) => s.payload);
  const open = useAuthModalStore((s) => s.open);
  const close = useAuthModalStore((s) => s.close);

  const { login, register, logout, setUser, isLoading } = useAuthStore();

  const [form, setForm] = useState({ login: '', username: '', email: '', password: '', postalCode: '' });
  const [forgotEmail, setForgotEmail] = useState('');
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [emailPw, setEmailPw] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  const isOpen = Boolean(mode);
  useEscapeClose(isOpen, close);

  // Reset des champs/erreurs à chaque (ré)ouverture ou changement de mode
  useEffect(() => {
    setError('');
    setSuccess('');
    setBusy(false);
    setForm({ login: '', username: '', email: '', password: '', postalCode: '' });
    setForgotEmail('');
    setPw({ current: '', next: '', confirm: '' });
    setEmailPw('');
    setAcceptedTerms(false);
  }, [mode]);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(form.login, form.password);
      close();
      if (redirectTo) navigate(redirectTo);
    } catch (err) {
      setError(err.response?.data?.message || 'Identifiant ou mot de passe incorrect.');
    } finally { setBusy(false); }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!/^\d{5}$/.test(form.postalCode.trim())) {
      setError('Code postal : 5 chiffres (c\'est pour ton badge de quartier).');
      return;
    }
    if (!acceptedTerms) {
      setError('Tu dois accepter les CGU et la politique de confidentialité, té.');
      return;
    }
    setBusy(true);
    try {
      await register(form.username, form.email, form.password, form.postalCode.trim());
      close();
      if (redirectTo) navigate(redirectTo);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur inattendue, té !');
    } finally { setBusy(false); }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!forgotEmail.trim()) { setError('Mets ton email, té !'); return; }
    setBusy(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email: forgotEmail.trim() });
      setSuccess(data.message || 'Si t\'es bien chez nous, t\'as un mail dans la boîte. Va voir !');
    } catch (err) {
      setError(err.response?.data?.message || 'Oups, réessaie dans un moment.');
    } finally { setBusy(false); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    if (pw.next.length < 6) { setError('Nouveau mot de passe : 6 caractères minimum.'); return; }
    if (pw.next !== pw.confirm) { setError('Les deux mots de passe sont pas pareils, té !'); return; }
    setBusy(true);
    try {
      const { data } = await api.post('/auth/change-password', {
        currentPassword: pw.current,
        newPassword: pw.next,
      });
      setSuccess(data.message || 'Mot de passe changé, et voilà !');
      setTimeout(() => close(), 1600);
    } catch (err) {
      setError(err.response?.data?.message || 'Ça a pas marché, réessaie.');
    } finally { setBusy(false); }
  };

  const handleChangeEmail = async (e) => {
    e.preventDefault();
    setError('');
    if (!emailPw) { setError('Mets ton mot de passe pour confirmer.'); return; }
    setBusy(true);
    try {
      const { data } = await api.post('/auth/change-email', {
        newEmail: payload?.newEmail,
        currentPassword: emailPw,
      });
      if (data.user) setUser(data.user);
      setSuccess(data.message || 'Email changé, et voilà !');
      setTimeout(() => close(), 1600);
    } catch (err) {
      setError(err.response?.data?.message || 'Ça a pas marché, réessaie.');
    } finally { setBusy(false); }
  };

  const handleLogoutConfirm = () => {
    close();
    navigate('/', { replace: true });
    logout();
  };

  // ─── Rendu par mode ────────────────────────────────────────────
  const titles = {
    login: 'Connexion',
    register: 'Inscription',
    forgot: 'Mot de passe oublié',
    changePassword: 'Changer mon mot de passe',
    changeEmail: 'Confirmer le changement d\'email',
    logout: 'Tu nous quittes ?',
  };

  return (
    <AnimatePresence>
      <motion.div
        className="authmodal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={close}
      >
        <motion.div
          className="authmodal"
          variants={fumigenesVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          onClick={(e) => e.stopPropagation()}
        >
          <button className="authmodal-close" onClick={close} aria-label="Fermer">×</button>
          <h2 className="authmodal-title">{titles[mode]}</h2>

          {/* ── LOGIN / REGISTER ── */}
          {(mode === 'login' || mode === 'register') && (
            <>
              <div className="authmodal-tabs">
                <button
                  type="button"
                  className={mode === 'login' ? 'active' : ''}
                  onClick={() => open('login', { redirectTo })}
                >Se connecter</button>
                <button
                  type="button"
                  className={mode === 'register' ? 'active' : ''}
                  onClick={() => open('register', { redirectTo })}
                >S'inscrire</button>
              </div>

              {mode === 'login' ? (
                <form className="authmodal-form" onSubmit={handleLoginSubmit}>
                  <input
                    className="input" type="text" placeholder="Pseudo ou email" autoFocus
                    value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} required
                  />
                  <PasswordInput
                    placeholder="Mot de passe" autoComplete="current-password"
                    value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required
                  />
                  {error && <p className="authmodal-error">{error}</p>}
                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={busy || isLoading}>
                    {busy ? 'Chargement…' : 'Allez !'}
                  </button>
                  <button
                    type="button" className="authmodal-link"
                    onClick={() => open('forgot')}
                  >Mot de passe oublié, hé bé ?</button>
                </form>
              ) : (
                <form className="authmodal-form" onSubmit={handleRegisterSubmit}>
                  <input
                    className="input" type="text" placeholder="Pseudo" autoFocus
                    value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required
                  />
                  <input
                    className="input" type="email" placeholder="Email"
                    value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required
                  />
                  <input
                    className="input" type="text" inputMode="numeric" placeholder="Code postal"
                    value={form.postalCode}
                    onChange={(e) => setForm({ ...form, postalCode: e.target.value.replace(/\D/g, '').slice(0, 5) })}
                    maxLength={5} required
                  />
                  <span className="authmodal-hint">Pour ton badge de quartier 🐟</span>
                  <PasswordInput
                    placeholder="Mot de passe" autoComplete="new-password"
                    value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required
                  />
                  <label className="authmodal-terms">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                    />
                    <span>
                      J'accepte les{' '}
                      <a href="/terms" target="_blank" rel="noopener noreferrer">CGU</a>{' '}et la{' '}
                      <a href="/privacy" target="_blank" rel="noopener noreferrer">politique de confidentialité</a>.
                    </span>
                  </label>
                  {error && <p className="authmodal-error">{error}</p>}
                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={busy || isLoading}>
                    {busy ? 'Chargement…' : 'Créer mon compte'}
                  </button>
                </form>
              )}
            </>
          )}

          {/* ── FORGOT PASSWORD ── */}
          {mode === 'forgot' && (
            success ? (
              <div className="authmodal-form">
                <p className="authmodal-success">{success}</p>
                <p className="authmodal-subtitle">Pense à regarder dans les spams, parfois le mail se planque là-bas.</p>
                <button type="button" className="btn btn-ghost" style={{ width: '100%' }} onClick={() => open('login')}>
                  Revenir à la connexion
                </button>
              </div>
            ) : (
              <form className="authmodal-form" onSubmit={handleForgotSubmit}>
                <p className="authmodal-subtitle">Mets ton email, on te file un lien pour en remettre un neuf.</p>
                <input
                  className="input" type="email" placeholder="Ton email" autoFocus autoComplete="email"
                  value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} required
                />
                {error && <p className="authmodal-error">{error}</p>}
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={busy}>
                  {busy ? 'Envoi…' : 'Envoyer le mail'}
                </button>
                <button type="button" className="authmodal-link" onClick={() => open('login')}>
                  ← Revenir à la connexion
                </button>
              </form>
            )
          )}

          {/* ── CHANGE PASSWORD ── */}
          {mode === 'changePassword' && (
            success ? (
              <p className="authmodal-success">{success}</p>
            ) : (
              <form className="authmodal-form" onSubmit={handleChangePassword}>
                <PasswordInput
                  placeholder="Mot de passe actuel" autoFocus autoComplete="current-password"
                  value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required
                />
                <PasswordInput
                  placeholder="Nouveau mot de passe" autoComplete="new-password"
                  value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required
                />
                <PasswordInput
                  placeholder="Confirmer le nouveau" autoComplete="new-password"
                  value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} required
                />
                {error && <p className="authmodal-error">{error}</p>}
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={busy}>
                  {busy ? 'Sauvegarde…' : 'Changer le mot de passe'}
                </button>
              </form>
            )
          )}

          {/* ── CHANGE EMAIL (re-auth) ── */}
          {mode === 'changeEmail' && (
            success ? (
              <p className="authmodal-success">{success}</p>
            ) : (
              <form className="authmodal-form" onSubmit={handleChangeEmail}>
                <p className="authmodal-subtitle">
                  Nouvel email : <strong>{payload?.newEmail}</strong><br />
                  Confirme avec ton mot de passe actuel.
                </p>
                <PasswordInput
                  placeholder="Ton mot de passe actuel" autoFocus autoComplete="current-password"
                  value={emailPw} onChange={(e) => setEmailPw(e.target.value)} required
                />
                {error && <p className="authmodal-error">{error}</p>}
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={busy}>
                  {busy ? 'Confirmation…' : 'Confirmer le nouvel email'}
                </button>
              </form>
            )
          )}

          {/* ── LOGOUT CONFIRMATION ── */}
          {mode === 'logout' && (
            <div className="authmodal-form">
              <div className="authmodal-logout-icon"><Icon name="wave" size={36} /></div>
              <p className="authmodal-subtitle">
                Tu veux vraiment te déconnecter ? Allez, à la prochaine partie, té.
              </p>
              <button type="button" className="btn btn-danger" style={{ width: '100%' }} onClick={handleLogoutConfirm}>
                Oui, déconnexion
              </button>
              <button type="button" className="btn btn-ghost" style={{ width: '100%' }} onClick={close}>
                Non, je reste
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
