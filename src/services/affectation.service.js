const Chantier = require('../models/chantier.model');
const Salarie = require('../models/salarie.model');
const {
  getWeekNumber,
  heuresAffecteesSemaine,
  heuresAffecteesJour,
  depassementSemaineAvecChantierJours,
  getAllMondaysBetween,
  datesOverlap,
  isSalarieDisponiblePourJours,
  getSalariesEligibles
} = require('../utils/affectationUtils');
const { getDistanceKm } = require('./geolocation.service');
const {
  affectationFractionneeParHeure,
  affectationGlobaleOptimisee,
  affectationParPasses,
  affectationOptimiseeParJour,
  affectationMatchingGlobal,
  affectationMatchingParfait
} = require('./affectation.algos');

// --- Fonctions de service (API) ---

const affectationService = {
  /**
   * Algorithme d'affectation stricte corrigé :
   * Pour chaque jour d'intervention et chaque semaine de la période, affecte n'importe quel salarié dispo.
   * Vérifie la limite de 35h/semaine pour chaque semaine réelle d'affectation.
   * Si un seul jour/semaine n'est pas couvert, l'affectation échoue pour ce chantier.
   */
  async affecterEquipePourChantier(chantierId) {
    const chantier = await Chantier.findById(chantierId);
    if (!chantier) throw new Error("Chantier non trouvé");
    if (chantier.statut !== 'Nouveau') throw new Error("Le chantier est déjà planifié ou en cours.");

    let besoins;
    if (chantier.besoins_equipe instanceof Map) {
      besoins = chantier.besoins_equipe;
    } else {
      besoins = new Map(Object.entries(chantier.besoins_equipe));
    }

    const totalBesoins = Array.from(besoins.values()).reduce((a, b) => a + b, 0);
    if (totalBesoins === 0) {
      chantier.equipe_affectee = [];
      chantier.statut = 'Planifié';
      await chantier.save();
      return chantier;
    }

    const equipeAffectee = new Set();
    const hParJour = (chantier.nombre_heures_par_semaine || 0) / (chantier.jours_prestation.length || 1);
    const dateDebut = new Date(chantier.date_debut);
    const dateFin = new Date(chantier.date_fin);
    let notes = [];

    // 1. Mutualisation maximale : chercher un salarié qui a toutes les compétences requises
    const allCompetences = Array.from(besoins.keys());
    const candidatsAll = await Salarie.find({ competences: { $all: allCompetences } });
    let trouveUnique = false;
    for (const salarie of candidatsAll) {
      // Vérifier disponibilité sur tous les jours
      let peutToutFaire = true;
      let heuresSemaineMap = {};
      let heuresJourMap = {};
      let totalHeures = 0;
      for (const jour of chantier.jours_prestation) {
        let current = new Date(dateDebut);
        current.setHours(0,0,0,0);
        const idxJour = joursSemaine.indexOf(jour.toLowerCase());
        while (current.getDay() !== idxJour) {
          current.setDate(current.getDate() + 1);
        }
        while (current <= dateFin) {
          const semaine = getWeekNumber(current);
          const annee = current.getFullYear();
          const semaineKey = `${annee}-${semaine}`;
          const jourKey = current.toISOString().slice(0,10) + '-' + jour.toLowerCase();
          let heuresJour = await heuresAffecteesJour(salarie, jour.toLowerCase());
          let heuresSemaine = await heuresAffecteesSemaine(salarie, semaine, annee);
          // Vérifier qu'il n'a pas déjà un autre chantier ce jour
          const dejaChantierCeJour = salarie.affectations.some(a => {
            if (!a.jours) return false;
            if (a.date_debut > current || a.date_fin < current) return false;
            return a.jours.includes(jour.toLowerCase());
          });
          if (dejaChantierCeJour) {
            peutToutFaire = false;
            break;
          }
          // Vérifier fin de contrat CDD
          if (salarie.type_contrat === 'CDD' && salarie.fin_contrat && new Date(salarie.fin_contrat) < current) {
            peutToutFaire = false;
            break;
          }
          // Ajouter la simulation d'affectation
          heuresJour += (heuresJourMap[jourKey] || 0);
          heuresSemaine += (heuresSemaineMap[semaineKey] || 0);
          if (heuresJour + hParJour > 7 || heuresSemaine + hParJour > 35) {
            peutToutFaire = false;
            break;
          }
          const dispo = await isSalarieDisponiblePourJours(salarie, chantier, [jour.toLowerCase()]);
          if (!dispo) {
            peutToutFaire = false;
            break;
          }
          // Simuler l'ajout
          heuresJourMap[jourKey] = (heuresJourMap[jourKey] || 0) + hParJour;
          heuresSemaineMap[semaineKey] = (heuresSemaineMap[semaineKey] || 0) + hParJour;
          totalHeures += hParJour;
          current.setDate(current.getDate() + 7);
        }
        if (!peutToutFaire) break;
      }
      if (peutToutFaire && totalHeures <= 35) {
        // Affecter ce salarié à tous les jours du chantier pour toutes les compétences
        let affectationExistante = salarie.affectations.find(a => String(a.chantierId) === String(chantier._id) && a.date_debut.getTime() === dateDebut.getTime() && a.date_fin.getTime() === dateFin.getTime());
        if (affectationExistante) {
          for (const jour of chantier.jours_prestation) {
            if (!affectationExistante.jours.includes(jour.toLowerCase())) {
              affectationExistante.jours.push(jour.toLowerCase());
            }
          }
        } else {
          salarie.affectations.push({
            chantierId: chantier._id,
            date_debut: chantier.date_debut,
            date_fin: chantier.date_fin,
            jours: chantier.jours_prestation.map(j => j.toLowerCase())
          });
        }
        await salarie.save();
        equipeAffectee.add(salarie._id);
        trouveUnique = true;
        break;
      }
    }
    if (trouveUnique) {
      chantier.equipe_affectee = Array.from(equipeAffectee);
      chantier.statut = 'Planifié';
      chantier.note = notes.length > 0 ? notes.join(' | ') : undefined;
      await chantier.save();
      await logHeuresParSemaine();
      return chantier;
    }

    // 2. Pour chaque compétence, pour chaque jour demandé, chercher un salarié dispo ce jour-là
    const dejaAffectes = new Set();
    let joursNonCouverts = [];
    for (const [competence, nombreRequis] of besoins.entries()) {
      for (const jour of chantier.jours_prestation) {
        let postesPourvus = 0;
        let candidats = await Salarie.find({
          competences: competence
        });
        // TRI PAR DISTANCE
        if (chantier.coordonnees) {
          candidats = candidats.filter(s => s.coordonnees);
          candidats.sort((a, b) => {
            const dA = getDistanceKm(a.coordonnees, chantier.coordonnees);
            const dB = getDistanceKm(b.coordonnees, chantier.coordonnees);
            return dA - dB;
          });
        }
        let current = new Date(dateDebut);
        current.setHours(0,0,0,0);
        const idxJour = joursSemaine.indexOf(jour.toLowerCase());
        // Avance jusqu'au premier jour voulu
        while (current.getDay() !== idxJour) {
          current.setDate(current.getDate() + 1);
        }
        while (current <= dateFin) {
          let pourvuCeJour = 0;
          for (const salarie of candidats) {
            // Vérifier qu'il n'a pas déjà une affectation ce jour-là sur ce chantier
            const dejaAffecteCeJour = salarie.affectations.some(a => {
              if (!a.jours) return false;
              if (a.date_debut > current || a.date_fin < current) return false;
              return a.jours.includes(jour.toLowerCase()) && String(a.chantierId) === String(chantier._id);
            });
            if (dejaAffecteCeJour) continue;
            // Vérifier qu'il n'a pas déjà une autre affectation ce jour-là
            const dejaChantierCeJour = salarie.affectations.some(a => {
              if (!a.jours) return false;
              if (a.date_debut > current || a.date_fin < current) return false;
              return a.jours.includes(jour.toLowerCase());
            });
            if (dejaChantierCeJour) continue;
            // Vérifier fin de contrat CDD
            if (salarie.type_contrat === 'CDD' && salarie.fin_contrat && new Date(salarie.fin_contrat) < current) continue;
            // Vérifier heures/jour et semaine
            const semaine = getWeekNumber(current);
            const annee = current.getFullYear();
            let heuresJour = await heuresAffecteesJour(salarie, jour.toLowerCase());
            let heuresSemaine = await heuresAffecteesSemaine(salarie, semaine, annee);
            if (heuresJour + hParJour > 7 || heuresSemaine + hParJour > 35) continue;
            // Affecter ce salarié pour ce jour
            let affectationExistante = salarie.affectations.find(a => String(a.chantierId) === String(chantier._id) && a.date_debut.getTime() === dateDebut.getTime() && a.date_fin.getTime() === dateFin.getTime());
            if (affectationExistante) {
              if (!affectationExistante.jours.includes(jour.toLowerCase())) {
                affectationExistante.jours.push(jour.toLowerCase());
              }
            } else {
              salarie.affectations.push({
                chantierId: chantier._id,
                date_debut: chantier.date_debut,
                date_fin: chantier.date_fin,
                jours: [jour.toLowerCase()]
              });
            }
            await salarie.save();
            equipeAffectee.add(salarie._id);
            pourvuCeJour++;
            if (pourvuCeJour >= nombreRequis) break;
          }
          if (pourvuCeJour < nombreRequis) {
            joursNonCouverts.push(`${jour} (${current.toISOString().slice(0,10)}) [${competence}]`);
          }
          current.setDate(current.getDate() + 7);
        }
      }
    }
    if (joursNonCouverts.length > 0) {
      notes.push(`Jours non couverts : ${joursNonCouverts.join(', ')}`);
      chantier.statut = 'Nouveau';
      chantier.note = notes.join(' | ');
      await chantier.save();
      throw new Error('Tous les jours n\'ont pas pu être couverts');
    }
    chantier.equipe_affectee = Array.from(equipeAffectee);
    chantier.statut = 'Planifié';
    chantier.note = notes.length > 0 ? notes.join(' | ') : undefined;
    await chantier.save();
    await logHeuresParSemaine();
    return chantier;
  },

  async getAllAffectations() {
    const chantiers = await Chantier.find({}).populate('equipe_affectee');
    return chantiers.map(chantier => ({
      chantierId: chantier._id,
      nom: chantier.nom,
      adresse_chantier: chantier.adresse_chantier,
      coordonnees: chantier.coordonnees,
      equipe_affectee: chantier.equipe_affectee.map(salarie => ({
        _id: salarie._id,
        nom: salarie.nom,
        competences: salarie.competences,
        adresse_domicile: salarie.adresse_domicile,
        coordonnees: salarie.coordonnees,
        distance_km: (salarie.coordonnees && chantier.coordonnees)
          ? getDistanceKm(salarie.coordonnees, chantier.coordonnees)
          : null
      })),
      date_debut: chantier.date_debut,
      date_fin: chantier.date_fin,
      statut: chantier.statut
    }));
  },

  async resetAffectationPourChantier(chantierId) {
    const chantier = await Chantier.findById(chantierId);
    if (!chantier) throw new Error("Chantier non trouvé");
    if (chantier.equipe_affectee && chantier.equipe_affectee.length > 0) {
      await Promise.all(
        chantier.equipe_affectee.map(async (salarieId) => {
          await Salarie.updateOne(
            { _id: salarieId },
            { $pull: { affectations: { chantierId: chantier._id } } }
          );
        })
      );
    }
    chantier.equipe_affectee = [];
    chantier.statut = 'Nouveau';
    await chantier.save();
    return chantier;
  }
};

// Affiche le total d'heures par semaine pour chaque salarié
async function logHeuresParSemaine() {
  const salaries = await Salarie.find({});
  for (const salarie of salaries) {
    // Map { 'annee-semaine': { total: number, details: [ { chantier, heures, jours } ] } }
    const semaines = {};
    for (const aff of salarie.affectations) {
      const chantier = await Chantier.findById(aff.chantierId);
      if (!chantier) continue;
      const nbJoursPrevus = chantier.jours_prestation?.length || 1;
      const hParJour = (chantier.nombre_heures_par_semaine || 0) / nbJoursPrevus;
      let currentDate = new Date(aff.date_debut);
      const dateFin = new Date(aff.date_fin);
      while (currentDate <= dateFin) {
        const jourStr = joursSemaine[currentDate.getDay()];
        const semaine = getWeekNumber(currentDate);
        const annee = currentDate.getFullYear();
        if ((aff.jours || []).map(j => j.toLowerCase()).includes(jourStr)) {
          const key = `${annee}-S${semaine}`;
          if (!semaines[key]) semaines[key] = { total: 0, details: [] };
          semaines[key].total += hParJour;
          semaines[key].details.push({ chantier: chantier.nom, heures: hParJour, jour: jourStr });
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
    console.log(`\n${salarie.nom}`);
    for (const [key, val] of Object.entries(semaines)) {
      console.log(`  ${key}: ${val.total}h`);
      for (const d of val.details) {
        console.log(`    - ${d.chantier} : ${d.heures}h (${d.jour})`);
      }
    }
  }
}

module.exports = {
  ...affectationService,
  getWeekNumber,
  heuresAffecteesSemaine,
  heuresAffecteesJour,
  depassementSemaineAvecChantierJours,
  getAllMondaysBetween,
  datesOverlap,
  isSalarieDisponiblePourJours,
  getSalariesEligibles,
  affectationFractionneeParHeure,
  affectationGlobaleOptimisee,
  affectationParPasses,
  affectationOptimiseeParJour,
  affectationMatchingGlobal,
  affectationMatchingParfait
};
