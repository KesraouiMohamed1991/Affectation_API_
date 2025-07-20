const mongoose = require('mongoose');

const chantierSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  adresse_chantier: { type: String, required: true },
  coordonnees: { lat: Number, lng: Number },
  date_debut: { type: Date, required: true },
  date_fin: { type: Date, required: true },
  // Pour stocker { vitres: 1, sols: 2 }, une Map est parfaite
  besoins_equipe: {
    type: Map,
    of: Number,
    required: true
  },
  note: { type: String },
  statut: {
    type: String,
    enum: ['Nouveau', 'Planifié', 'En cours', 'Terminé'],
    default: 'Nouveau'
  },
  equipe_affectee: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Salarie' }],
  nombre_heures_par_semaine: { type: Number, required: true },
  jours_prestation: [{ type: String }], // ex: ['lundi', 'mercredi', 'vendredi']
}, { timestamps: true });

chantierSchema.virtual('type_prestation').get(function() {
  if (this.nombre_heures_par_semaine === 35) return 'pleine semaine';
  if (this.nombre_heures_par_semaine < 35) return 'espacée';
  return 'inconnue';
});

chantierSchema.set('toJSON', { virtuals: true });
chantierSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Chantier', chantierSchema);
