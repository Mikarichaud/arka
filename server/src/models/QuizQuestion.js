const mongoose = require('mongoose');

// Une question du Permis Marseillais.
// scope='trial' → fait partie du test blanc gratuit (20 q dédiées).
// scope='exam'  → banque de l'examen payant (80 q), tirage aléatoire de 20 par essai.
// correctIndex n'est JAMAIS renvoyé au client pendant un examen (scoring serveur).
const quizQuestionSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: ['parler', 'bouffe', 'om', 'geo', 'culture'],
      required: true,
    },
    text: { type: String, required: true, trim: true },
    options: {
      type: [String],
      required: true,
      validate: { validator: (v) => Array.isArray(v) && v.length === 4, message: 'Il faut exactement 4 propositions.' },
    },
    correctIndex: { type: Number, required: true, min: 0, max: 3 },
    difficulty: { type: String, enum: ['facile', 'moyen', 'difficile'], default: 'moyen' },
    scope: { type: String, enum: ['trial', 'exam'], required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('QuizQuestion', quizQuestionSchema);
