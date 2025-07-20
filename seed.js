const mongoose = require('mongoose');
const Chantier = require('./src/models/chantier.model');
const Salarie = require('./src/models/salarie.model');
const { getCoordsFromAddress } = require('./src/services/geolocation.service');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/affectations';

// === SEED ADAPTÉE : 20 salariés, 40 chantiers diversifiés ===
const ALL_COMPETENCES = ['vitres', 'sols', 'moquette', 'industriel', 'entretien', 'desinfection'];
const SALARIES = [
  { nom: 'Alice Martin', competences: ['vitres', 'sols'], type_contrat: 'CDI', adresse: '1 Quai du Port, 13002 Marseille', max_heures_semaine: 35 },
  { nom: 'Bob Dupont', competences: ['vitres', 'sols'], type_contrat: 'CDI', adresse: '12 Rue de la République, 13001 Marseille', max_heures_semaine: 35 },
  { nom: 'Claire Petit', competences: ['vitres', 'sols'], type_contrat: 'CDI', adresse: '20 Rue de la Joliette, 13002 Marseille', max_heures_semaine: 35 },
  { nom: 'David Leroy', competences: ['vitres', 'sols'], type_contrat: 'CDD', fin_contrat: new Date('2024-08-15'), adresse: '8 Avenue du Prado, 13006 Marseille', max_heures_semaine: 35 },
  { nom: 'Emma Blanc', competences: ['vitres', 'sols'], type_contrat: 'CDI', adresse: '15 Rue Saint-Ferréol, 13001 Marseille', max_heures_semaine: 21 },
  { nom: 'Farid Benali', competences: ['vitres', 'sols'], type_contrat: 'CDI', adresse: '5 Rue Paradis, 13001 Marseille', max_heures_semaine: 21 },
  { nom: 'Gisèle Morel', competences: ['vitres', 'sols'], type_contrat: 'CDI', adresse: '18 Rue Saint-Saëns, 13001 Marseille', max_heures_semaine: 35 },
  { nom: 'Hugo Lambert', competences: ['vitres', 'sols'], type_contrat: 'CDD', fin_contrat: new Date('2024-12-20'), adresse: '25 Rue de la Joliette, 13002 Marseille', max_heures_semaine: 35 },
  { nom: 'moha Lambert', competences: ['vitres', 'sols'], type_contrat: 'CDI', adresse: '100 Rue de la Joliette, 13002 Marseille', max_heures_semaine: 35 },
];

// 14 chantiers à venir (modèle seed.md) + 16 supplémentaires
const CHANTIERS = [
  { nom: 'Chantier Vitres A', adresse: '10 Rue de Rome, 13001 Marseille', besoins_equipe: { vitres: 1 }, jours_prestation: ['lundi', 'mardi'], date_debut: new Date('2024-07-15'), date_fin: new Date('2026-07-16'), nombre_heures_par_semaine: 14 },
  { nom: 'Chantier Vitres B', adresse: '11 Rue de Rome, 13001 Marseille', besoins_equipe: { vitres: 1 }, jours_prestation: ['mercredi', 'jeudi'], date_debut: new Date('2024-07-17'), date_fin: new Date('2026-07-18'), nombre_heures_par_semaine: 14 },
  { nom: 'Chantier Sols A', adresse: '12 Rue de Rome, 13001 Marseille', besoins_equipe: { sols: 1 }, jours_prestation: ['vendredi'], date_debut: new Date('2024-07-19'), date_fin: new Date('2026-07-19'), nombre_heures_par_semaine: 7 },
  { nom: 'Chantier Vitres C', adresse: '13 Rue de Rome, 13001 Marseille', besoins_equipe: { vitres: 1 }, jours_prestation: ['lundi', 'mardi', 'mercredi'], date_debut: new Date('2024-07-22'), date_fin: new Date('2026-07-24'), nombre_heures_par_semaine: 21 },
  { nom: 'Chantier Sols B', adresse: '14 Rue de Rome, 13001 Marseille', besoins_equipe: { sols: 1 }, jours_prestation: ['jeudi', 'vendredi'], date_debut: new Date('2024-07-25'), date_fin: new Date('2026-07-26'), nombre_heures_par_semaine: 14 },
  { nom: 'Chantier Vitres D', adresse: '15 Rue de Rome, 13001 Marseille', besoins_equipe: { vitres: 1 }, jours_prestation: ['lundi'], date_debut: new Date('2024-07-29'), date_fin: new Date('2026-07-29'), nombre_heures_par_semaine: 7 },
  { nom: 'Chantier Sols C', adresse: '16 Rue de Rome, 13001 Marseille', besoins_equipe: { sols: 1 }, jours_prestation: ['mardi'], date_debut: new Date('2024-07-30'), date_fin: new Date('2026-07-30'), nombre_heures_par_semaine: 7 },
  { nom: 'Chantier Vitres E', adresse: '17 Rue de Rome, 13001 Marseille', besoins_equipe: { vitres: 1 }, jours_prestation: ['mercredi', 'jeudi'], date_debut: new Date('2024-07-31'), date_fin: new Date('2026-08-01'), nombre_heures_par_semaine: 14 },
  { nom: 'Chantier Sols D', adresse: '18 Rue de Rome, 13001 Marseille', besoins_equipe: { sols: 1 }, jours_prestation: ['vendredi'], date_debut: new Date('2024-08-02'), date_fin: new Date('2026-08-02'), nombre_heures_par_semaine: 7 },
  { nom: 'Chantier Vitres F', adresse: '19 Rue de Rome, 13001 Marseille', besoins_equipe: { vitres: 1 }, jours_prestation: ['lundi', 'mardi'], date_debut: new Date('2024-08-05'), date_fin: new Date('2025-08-06'), nombre_heures_par_semaine: 14 },
  { nom: 'Chantier Sols E', adresse: '20 Rue de Rome, 13001 Marseille', besoins_equipe: { sols: 1 }, jours_prestation: ['mercredi', 'jeudi'], date_debut: new Date('2024-08-07'), date_fin: new Date('2026-08-08'), nombre_heures_par_semaine: 14 },
  { nom: 'Chantier Vitres G', adresse: '21 Rue de Rome, 13001 Marseille', besoins_equipe: { vitres: 1 }, jours_prestation: ['vendredi'], date_debut: new Date('2024-08-09'), date_fin: new Date('2026-08-09'), nombre_heures_par_semaine: 7 },
  { nom: 'Chantier Sols F', adresse: '22 Rue de Rome, 13001 Marseille', besoins_equipe: { sols: 1 }, jours_prestation: ['lundi', 'mardi', 'mercredi'], date_debut: new Date('2024-08-12'), date_fin: new Date('2026-08-14'), nombre_heures_par_semaine: 21 },
  { nom: 'Chantier Vitres H', adresse: '23 Rue de Rome, 13001 Marseille', besoins_equipe: { vitres: 1 }, jours_prestation: ['jeudi', 'vendredi'], date_debut: new Date('2024-08-15'), date_fin: new Date('2026-08-16'), nombre_heures_par_semaine: 14 },
  { nom: 'Chantier Sols G', adresse: '24 Rue de Rome, 13001 Marseille', besoins_equipe: { sols: 1 }, jours_prestation: ['lundi'], date_debut: new Date('2024-08-19'), date_fin: new Date('2026-08-19'), nombre_heures_par_semaine: 7 },
  { nom: 'Chantier Vitres I', adresse: '25 Rue de Rome, 13001 Marseille', besoins_equipe: { vitres: 1 }, jours_prestation: ['mardi', 'mercredi'], date_debut: new Date('2024-08-20'), date_fin: new Date('2025-08-21'), nombre_heures_par_semaine: 14 },
  { nom: 'Chantier Sols H', adresse: '26 Rue de Rome, 13001 Marseille', besoins_equipe: { sols: 1 }, jours_prestation: ['jeudi', 'vendredi'], date_debut: new Date('2024-08-22'), date_fin: new Date('2025-08-23'), nombre_heures_par_semaine: 14 },
  { nom: 'Chantier Vitres J', adresse: '27 Rue de Rome, 13001 Marseille', besoins_equipe: { vitres: 1 }, jours_prestation: ['lundi', 'mardi', 'mercredi'], date_debut: new Date('2024-08-26'), date_fin: new Date('2026-08-28'), nombre_heures_par_semaine: 21 },
];
// Ajout de 16 chantiers supplémentaires à venir
for (let i = 28; i <= 43; i++) {
  const isVitres = i % 2 === 0;
  const comp = isVitres ? 'vitres' : 'sols';
  const jours = isVitres ? ['lundi', 'mardi'] : ['jeudi', 'vendredi'];
  const h = isVitres ? 14 : 14;
  const dateDebut = new Date(2024, 6, 15 + (i - 28) * 2); // juillet/août 2024
  const dateFin = new Date(2024, 6, 16 + (i - 28) * 2);
  CHANTIERS.push({
    nom: `Chantier ${comp.charAt(0).toUpperCase() + comp.slice(1)} ${String.fromCharCode(65 + i)}`,
    adresse: `${9 + i} Rue de Rome, 13001 Marseille`,
    besoins_equipe: { [comp]: 1 },
    jours_prestation: jours,
    date_debut: dateDebut,
    date_fin: dateFin,
    nombre_heures_par_semaine: h
  });
}

async function seed() {
  await mongoose.connect(MONGO_URI);
  await Chantier.deleteMany({});
  await Salarie.deleteMany({});

  // --- Création des salariés ---
  for (const s of SALARIES) {
    try {
      const coords = await getCoordsFromAddress(s.adresse);
      const salarie = new Salarie({
        nom: s.nom,
        competences: s.competences,
        type_contrat: s.type_contrat,
        fin_contrat: s.fin_contrat,
        adresse_domicile: s.adresse,
        max_heures_semaine: s.max_heures_semaine,
        coordonnees: coords
      });
      await salarie.save();
      console.log(`Salarié créé : ${salarie.nom}`);
    } catch (error) {
      console.error(`Erreur lors de la création de ${s.nom} :`, error);
    }
  }

  console.log('seed');
  

  // --- Création des chantiers ---
  for (const c of CHANTIERS) {
    try {
      const coords = await getCoordsFromAddress(c.adresse);
      const chantier = new Chantier({
        nom: c.nom,
        adresse_chantier: c.adresse,
        besoins_equipe: c.besoins_equipe,
        jours_prestation: c.jours_prestation,
        date_debut: c.date_debut,
        date_fin: c.date_fin,
        nombre_heures_par_semaine: c.nombre_heures_par_semaine,
        coordonnees: coords
      });
      await chantier.save();
      console.log(`Chantier créé : ${chantier.nom}`);
    } catch (error) {
      console.error(`Erreur lors de la création de ${c.nom} :`, error);
    }
  }

  console.log('Seed mixte terminée avec succès !');
  process.exit(0);
}

seed();
