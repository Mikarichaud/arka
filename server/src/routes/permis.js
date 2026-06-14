const express = require('express');
const router = express.Router();
const stripe = require('../services/stripe');
const QuizQuestion = require('../models/QuizQuestion');
const Certificate = require('../models/Certificate');
const ExamSession = require('../models/ExamSession');
const { protect } = require('../middlewares/auth');
const { getProvenance } = require('../utils/provenance');

const EXAM_QUESTIONS = 20;
const TRIAL_QUESTIONS = 20;
const SECONDS_PER_Q = 13;
const ATTEMPTS_PER_PURCHASE = 3;
const PERMIS_PRICE_CENTS = 1300; // 13 € — clin d'œil au département 13

// Les gatés (admin) testent sans payer : essais illimités.
const isUnlimited = (user) => user?.role === 'gate';

const isSameDay = (a, b) =>
  a && b && new Date(a).toDateString() === new Date(b).toDateString();

// Calcule la mention + le statut homologué selon le score et la provenance.
function computeMention(score, postalCode) {
  const zone = getProvenance(postalCode)?.zone || null;
  const passed = score >= 10;

  let mention;
  if (score <= 4) mention = 'Estranger / Touriste égaré';
  else if (score <= 9) mention = "En stage d'intégration";
  else if (score <= 13) mention = "Marseillais d'adoption";
  else if (score <= 16) mention = 'Bon petit Marseillais';
  else if (score <= 18) mention = 'Vrai de vrai';
  else mention = 'Patron du Vieux-Port';

  // Twist provenance : le Parisien a son traitement spécial.
  if (zone === 'paris') {
    mention = passed ? 'Parisien Repenti, toléré' : 'Parisien démasqué';
  }

  return { mention, passed, zone };
}

// Permutation Fisher–Yates de [0..n-1].
function shuffledOrder(n) {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Sert les questions au client avec les options MÉLANGÉES (sinon la bonne réponse
// est toujours au même endroit → triche). On retient la position correcte mélangée
// côté serveur pour le scoring. La bonne réponse ne part jamais en clair.
function serveQuestions(rawQuestions) {
  const clientQs = [];
  const served = [];
  for (const q of rawQuestions) {
    const order = shuffledOrder(q.options.length);
    const options = order.map((i) => q.options[i]);
    const correctPos = order.indexOf(q.correctIndex);
    clientQs.push({ _id: q._id, category: q.category, text: q.text, options, difficulty: q.difficulty });
    served.push({ questionId: q._id, correctPos });
  }
  return { clientQs, served };
}

// Statut du Permis pour l'utilisateur connecté.
router.get('/status', protect, async (req, res, next) => {
  try {
    const cert = await Certificate.getOrCreateForUser(req.user);
    res.json({
      attemptsRemaining: cert.attemptsRemaining,
      unlimited: isUnlimited(req.user),
      bestScore: cert.bestScore,
      mention: cert.mention,
      passed: cert.passed,
      publicCode: cert.publicCode || null,
      canTrialToday: !isSameDay(cert.lastTrialAt, new Date()),
      secondsPerQuestion: SECONDS_PER_Q,
      priceCents: PERMIS_PRICE_CENTS,
    });
  } catch (err) { next(err); }
});

// --- TEST BLANC (gratuit, 1×/jour, pas de chrono, pas de certificat) ---
router.post('/trial/start', protect, async (req, res, next) => {
  try {
    const cert = await Certificate.getOrCreateForUser(req.user);
    if (isSameDay(cert.lastTrialAt, new Date())) {
      return res.status(403).json({ message: 'Tu as déjà fait ton test blanc aujourd\'hui. Reviens demain, té !', code: 'TRIAL_COOLDOWN' });
    }
    const questions = await QuizQuestion.aggregate([
      { $match: { scope: 'trial', isActive: { $ne: false } } },
      { $sample: { size: TRIAL_QUESTIONS } },
    ]);
    if (!questions.length) {
      return res.status(503).json({ message: 'Pas encore de questions pour le test blanc.' });
    }
    cert.lastTrialAt = new Date();
    await cert.save();

    const { clientQs, served } = serveQuestions(questions);
    const session = await ExamSession.create({
      userId: req.user._id,
      mode: 'trial',
      questionIds: questions.map((q) => q._id),
      served,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    });

    res.json({
      sessionId: session._id,
      mode: 'trial',
      secondsPerQuestion: null, // pas de chrono sur le test blanc
      questions: clientQs,
    });
  } catch (err) { next(err); }
});

router.post('/trial/submit', protect, async (req, res, next) => {
  try {
    const result = await scoreSession(req, 'trial');
    if (result.error) return res.status(result.status).json({ message: result.error });
    const { score, total } = result;
    const { mention, passed } = computeMention(score, req.user.postalCode);
    res.json({ score, total, mention, passed, teaser: true, corrections: result.corrections });
  } catch (err) { next(err); }
});

// --- EXAMEN (payant, 20 q tirées sur 80, chrono 13s) ---
router.post('/exam/start', protect, async (req, res, next) => {
  try {
    const cert = await Certificate.getOrCreateForUser(req.user);
    const unlimited = isUnlimited(req.user);
    if (!unlimited && cert.attemptsRemaining <= 0) {
      return res.status(402).json({ message: 'Plus d\'essais. Prends le Passeport pour 3 nouvelles tentatives.', code: 'NO_ATTEMPTS' });
    }
    const questions = await QuizQuestion.aggregate([
      { $match: { scope: 'exam', isActive: { $ne: false } } },
      { $sample: { size: EXAM_QUESTIONS } },
    ]);
    if (!questions.length) {
      return res.status(503).json({ message: 'L\'examen n\'est pas encore prêt (pas de questions).' });
    }

    if (!unlimited) cert.attemptsRemaining -= 1;
    cert.attemptsTaken += 1;
    await cert.save();

    const durationMs = questions.length * SECONDS_PER_Q * 1000 + 5000; // marge réseau
    const { clientQs, served } = serveQuestions(questions);
    const session = await ExamSession.create({
      userId: req.user._id,
      mode: 'exam',
      questionIds: questions.map((q) => q._id),
      served,
      expiresAt: new Date(Date.now() + durationMs + 60 * 1000), // TTL un peu après la deadline
    });

    res.json({
      sessionId: session._id,
      mode: 'exam',
      secondsPerQuestion: SECONDS_PER_Q,
      serverDeadline: Date.now() + durationMs,
      attemptsRemaining: cert.attemptsRemaining,
      unlimited,
      questions: clientQs,
    });
  } catch (err) { next(err); }
});

router.post('/exam/submit', protect, async (req, res, next) => {
  try {
    const result = await scoreSession(req, 'exam');
    if (result.error) return res.status(result.status).json({ message: result.error });
    const { score, total } = result;
    const { mention, passed, zone } = computeMention(score, req.user.postalCode);

    const cert = await Certificate.getOrCreateForUser(req.user);
    cert.history.push({ score, mode: 'exam', takenAt: new Date() });

    let isRecord = false;
    if (cert.bestScore === null || score > cert.bestScore) {
      isRecord = true;
      cert.bestScore = score;
      cert.mention = mention;
      cert.passed = passed;
      cert.recordAt = new Date();
      cert.pseudo = req.user.username;
      cert.postalCode = req.user.postalCode || cert.postalCode;
      cert.provenanceZone = zone || cert.provenanceZone;
    }
    if (!cert.issuedAt) cert.issuedAt = new Date();
    cert.ensurePublicCode();
    await cert.save();

    res.json({
      score,
      total,
      mention,
      passed,
      isRecord,
      bestScore: cert.bestScore,
      publicCode: cert.publicCode,
      attemptsRemaining: cert.attemptsRemaining,
      corrections: result.corrections,
    });
  } catch (err) { next(err); }
});

// Scoring serveur partagé trial/exam. Retourne { score, total } ou { error, status }.
async function scoreSession(req, expectedMode) {
  const { sessionId, answers } = req.body || {};
  if (!sessionId || !Array.isArray(answers)) {
    return { error: 'Requête invalide (sessionId + answers attendus).', status: 400 };
  }
  const session = await ExamSession.findOne({ _id: sessionId, userId: req.user._id, mode: expectedMode });
  if (!session) return { error: 'Session introuvable.', status: 404 };
  if (session.status !== 'in-progress') return { error: 'Session déjà terminée.', status: 409 };

  // Réponses du client : choiceIndex relatif à l'ordre MÉLANGÉ qui lui a été servi.
  const chosenByQ = new Map();
  for (const a of answers) {
    const qid = String(a?.questionId);
    if (!chosenByQ.has(qid)) chosenByQ.set(qid, Number(a?.choiceIndex));
  }

  let score = 0;
  const corrections = [];
  for (const s of session.served) {
    const qid = s.questionId.toString();
    const chosen = chosenByQ.has(qid) ? chosenByQ.get(qid) : -1;
    const isCorrect = chosen === s.correctPos;
    if (isCorrect) score += 1;
    corrections.push({ questionId: qid, correctPos: s.correctPos, chosen, isCorrect });
  }

  session.status = 'submitted';
  session.score = score;
  await session.save();

  return { score, total: session.served.length, corrections };
}

// --- PAIEMENT WEB (Stripe one-shot) — crédite 3 essais via webhook ---
router.post('/checkout', protect, async (req, res, next) => {
  try {
    let customerId = req.user.subscription?.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        name: req.user.username,
        metadata: { userId: req.user._id.toString() },
      });
      customerId = customer.id;
      const User = require('../models/User');
      await User.findByIdAndUpdate(req.user._id, { 'subscription.stripeCustomerId': customerId });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'eur',
          unit_amount: PERMIS_PRICE_CENTS,
          product_data: { name: 'Le Passeport Marseillais — 3 essais' },
        },
        quantity: 1,
      }],
      success_url: `${process.env.CLIENT_URL}/permis?purchased=1`,
      cancel_url: `${process.env.CLIENT_URL}/permis`,
      metadata: { userId: req.user._id.toString(), kind: 'permis', attempts: String(ATTEMPTS_PER_PURCHASE) },
      locale: 'fr',
    });

    res.json({ url: session.url });
  } catch (err) { next(err); }
});

// --- IMAGE DU CERTIFICAT (PNG serveur) — téléchargement + image OG ---
router.get('/certificate/:code/image.png', async (req, res, next) => {
  try {
    const cert = await Certificate.findOne({ publicCode: req.params.code });
    if (!cert || !cert.issuedAt) return res.status(404).json({ message: 'Certificat introuvable.' });
    const format = req.query.format === 'portrait' ? 'portrait' : 'paysage';
    const { renderCertificateImage } = require('../services/certificateImage');
    const png = await renderCertificateImage(cert, format);
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=3600');
    if (req.query.download) {
      res.set('Content-Disposition', `attachment; filename="passeport-marseillais-${cert.publicCode}.png"`);
    }
    res.send(png);
  } catch (err) { next(err); }
});

// --- PAGE PUBLIQUE — données du certificat (SEO, partage) ---
router.get('/certificate/:code', async (req, res, next) => {
  try {
    const cert = await Certificate.findOne({ publicCode: req.params.code });
    if (!cert || !cert.issuedAt) return res.status(404).json({ message: 'Certificat introuvable.' });
    res.json({
      pseudo: cert.pseudo,
      postalCode: cert.postalCode,
      provenanceZone: cert.provenanceZone,
      score: cert.bestScore,
      mention: cert.mention,
      passed: cert.passed,
      recordAt: cert.recordAt,
      publicCode: cert.publicCode,
    });
  } catch (err) { next(err); }
});

module.exports = router;
