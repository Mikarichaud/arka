const mongoose = require('mongoose');

// Une tentative archivée (test blanc OU examen), avec le détail question par question
// pour pouvoir la revoir plus tard dans l'historique du joueur.
const attemptItemSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'QuizQuestion' },
  category: String,
  text: String,
  options: [String],        // dans l'ordre mélangé qui a été présenté
  correctPos: Number,       // position de la bonne réponse dans cet ordre
  chosen: Number,           // ce que le joueur a répondu (-1 = pas de réponse / temps écoulé)
  isCorrect: Boolean,
}, { _id: false });

const quizAttemptSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mode: { type: String, enum: ['trial', 'exam'], required: true },
  score: Number,
  total: Number,
  mention: String,
  passed: Boolean,
  abandoned: { type: Boolean, default: false }, // examen quitté avant la fin → essai perdu
  items: [attemptItemSchema],
}, { timestamps: true });

quizAttemptSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('QuizAttempt', quizAttemptSchema);
