const mongoose = require('mongoose');

const affectationSchema = new mongoose.Schema({
  chantierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chantier' },
  date_debut: Date,
  date_fin: Date,
  jours: [{ type: String }], // ex: ['lundi', 'mercredi']
  heures_par_jour: { type: Object, default: {} } // ex: { lundi: 3, mardi: 4 }
});

const salarieSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  competences: [{ type: String, required: true }],
  adresse_domicile: { type: String, required: true },
  coordonnees: { lat: Number, lng: Number }, // Sera rempli par le service de géocodage
  type_contrat: { type: String, enum: ['CDI', 'CDD'], required: true },
  fin_contrat: { type: Date, required: function() { return this.type_contrat === 'CDD'; } }, // Pertinent seulement pour les CDD
  date_debut: { type: Date, required: false }, // Date de début de contrat, pertinent pour les CDD
  duree: { type: Number, required: false }, // Durée en mois, pertinent pour les CDD
  affectations: [affectationSchema] // Le calendrier de ses chantiers
}, { timestamps: true });

module.exports = mongoose.model('Salarie', salarieSchema);
