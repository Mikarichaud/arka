const mongoose = require('mongoose');

// Session d'examen/test en cours — anti-triche.
// Le serveur tire les questions, garde la liste, et score au submit.
// Index TTL sur expiresAt : une session abandonnée disparaît toute seule.
const examSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    mode: { type: String, enum: ['trial', 'exam'], required: true },
    questionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'QuizQuestion' }],
    // Ordre mélangé servi au client : contenu présenté + position de la bonne réponse.
    // Dénormalisé ici pour pouvoir archiver la tentative au submit (cf. QuizAttempt).
    served: [{
      questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'QuizQuestion' },
      category: String,
      text: String,
      options: [String],
      correctPos: Number,
    }],
    startedAt: { type: Date, default: Date.now },
    deadline: { type: Date },     // fin réelle de l'examen (chrono). Passé ça → abandon possible.
    expiresAt: { type: Date, required: true }, // TTL : suppression du doc (deadline + 24h de grâce)
    status: { type: String, enum: ['in-progress', 'submitted', 'expired', 'abandoned'], default: 'in-progress' },
    score: { type: Number, default: null },
  },
  { timestamps: true }
);

examSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('ExamSession', examSessionSchema);
