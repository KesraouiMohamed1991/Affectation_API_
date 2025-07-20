const Chantier = require('../models/chantier.model');
const Salarie = require('../models/salarie.model');
const {
  getWeekNumber,
  heuresAffecteesSemaine,
  heuresAffecteesJour,
  isSalarieDisponiblePourJours
} = require('../utils/affectationUtils');
const { getDistanceKm } = require('./geolocation.service');

async function affectationFractionneeParHeure() {
  const joursSemaine = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
  const chantiers = await Chantier.find({ statut: 'Nouveau' });
  let success = 0;
  let failed = 0;
  for (const chantier of chantiers) {
    let besoins = chantier.besoins_equipe instanceof Map
      ? chantier.besoins_equipe
      : new Map(Object.entries(chantier.besoins_equipe));
    const hParJour = (chantier.nombre_heures_par_semaine || 0) / (chantier.jours_prestation.length || 1);
    const dateDebut = new Date(chantier.date_debut);
    const dateFin = new Date(chantier.date_fin);
    const equipeAffectee = new Set();
    let joursNonCouverts = [];
    let affecte = false;
    // 1. Cas chantier >= 35h/semaine : un seul salarié sur tout le chantier
    if (chantier.nombre_heures_par_semaine >= 35) {
      // Chercher un CDI (sinon CDD) ayant toutes les compétences, dispo sur toute la période
      const allCompetences = Array.from(besoins.keys());
      let candidats = await Salarie.find({
        competences: { $all: allCompetences },
        type_contrat: 'CDI'
      });
      if (candidats.length === 0) {
        candidats = await Salarie.find({
          competences: { $all: allCompetences },
          type_contrat: 'CDD'
        });
      }
      // Trier par proximité
      if (chantier.coordonnees) {
        candidats = candidats.filter(s => s.coordonnees);
        candidats.sort((a, b) => {
          const dA = getDistanceKm(a.coordonnees, chantier.coordonnees);
          const dB = getDistanceKm(b.coordonnees, chantier.coordonnees);
          return dA - dB;
        });
      }
      for (const salarie of candidats) {
        // Vérifier dispo sur toute la période et toutes les compétences/jours
        let dispo = true;
        for (const jour of chantier.jours_prestation) {
          let current = new Date(dateDebut);
          current.setHours(0,0,0,0);
          const idxJour = joursSemaine.indexOf(jour.toLowerCase());
          while (current.getDay() !== idxJour) {
            current.setDate(current.getDate() + 1);
          }
          while (current <= dateFin) {
            // Pas d'autre chantier ce jour
            const dejaAffecte = salarie.affectations.some(a => {
              if (!a.jours) return false;
              if (a.date_debut > current || a.date_fin < current) return false;
              return a.jours.includes(jour.toLowerCase());
            });
            if (dejaAffecte) { dispo = false; break; }
            // Pas de dépassement d'heures
            const semaine = getWeekNumber(current);
            const annee = current.getFullYear();
            let heuresJour = await heuresAffecteesJour(salarie, jour.toLowerCase());
            let heuresSemaine = await heuresAffecteesSemaine(salarie, semaine, annee);
            if (heuresJour + hParJour > 7 || heuresSemaine + hParJour > 35) { dispo = false; break; }
            // Fin de contrat CDD
            if (salarie.type_contrat === 'CDD' && salarie.fin_contrat && new Date(salarie.fin_contrat) < current) { dispo = false; break; }
            current.setDate(current.getDate() + 7);
          }
          if (!dispo) break;
        }
        if (dispo) {
          // Affecter le salarié à tout le chantier
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
          affecte = true;
          break;
        }
      }
      if (!affecte) {
        joursNonCouverts.push('Aucun salarié dispo pour tout le chantier');
      }
    } else {
      // 2. Cas chantier < 35h/semaine : essayer un seul salarié, sinon découper
      const allCompetences = Array.from(besoins.keys());
      let candidats = await Salarie.find({
        competences: { $all: allCompetences },
        type_contrat: 'CDI'
      });
      if (candidats.length === 0) {
        candidats = await Salarie.find({
          competences: { $all: allCompetences },
          type_contrat: 'CDD'
        });
      }
      // Trier par proximité
      if (chantier.coordonnees) {
        candidats = candidats.filter(s => s.coordonnees);
        candidats.sort((a, b) => {
          const dA = getDistanceKm(a.coordonnees, chantier.coordonnees);
          const dB = getDistanceKm(b.coordonnees, chantier.coordonnees);
          return dA - dB;
        });
      }
      let trouveUnique = false;
      for (const salarie of candidats) {
        let dispo = true;
        for (const jour of chantier.jours_prestation) {
          let current = new Date(dateDebut);
          current.setHours(0,0,0,0);
          const idxJour = joursSemaine.indexOf(jour.toLowerCase());
          while (current.getDay() !== idxJour) {
            current.setDate(current.getDate() + 1);
          }
          while (current <= dateFin) {
            const dejaAffecte = salarie.affectations.some(a => {
              if (!a.jours) return false;
              if (a.date_debut > current || a.date_fin < current) return false;
              return a.jours.includes(jour.toLowerCase());
            });
            if (dejaAffecte) { dispo = false; break; }
            const semaine = getWeekNumber(current);
            const annee = current.getFullYear();
            let heuresJour = await heuresAffecteesJour(salarie, jour.toLowerCase());
            let heuresSemaine = await heuresAffecteesSemaine(salarie, semaine, annee);
            if (heuresJour + hParJour > 7 || heuresSemaine + hParJour > 35) { dispo = false; break; }
            if (salarie.type_contrat === 'CDD' && salarie.fin_contrat && new Date(salarie.fin_contrat) < current) { dispo = false; break; }
            current.setDate(current.getDate() + 7);
          }
          if (!dispo) break;
        }
        if (dispo) {
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
          affecte = true;
          break;
        }
      }
      // Si pas de salarié unique, découper par jour/compétence
      if (!trouveUnique) {
        for (const [competence, nombreRequis] of besoins.entries()) {
          for (const jour of chantier.jours_prestation) {
            for (let poste = 0; poste < nombreRequis; poste++) {
              let candidats = await Salarie.find({ competences: competence });
              // Priorité CDI puis CDD, tri par proximité
              candidats = candidats.filter(s => s.coordonnees);
              candidats.sort((a, b) => {
                if (a.type_contrat !== b.type_contrat) return a.type_contrat === 'CDI' ? -1 : 1;
                const dA = getDistanceKm(a.coordonnees, chantier.coordonnees);
                const dB = getDistanceKm(b.coordonnees, chantier.coordonnees);
                return dA - dB;
              });
              let trouve = false;
              for (const salarie of candidats) {
                let current = new Date(dateDebut);
                current.setHours(0,0,0,0);
                const idxJour = joursSemaine.indexOf(jour.toLowerCase());
                while (current.getDay() !== idxJour) {
                  current.setDate(current.getDate() + 1);
                }
                while (current <= dateFin) {
                  const dejaAffecte = salarie.affectations.some(a => {
                    if (!a.jours) return false;
                    if (a.date_debut > current || a.date_fin < current) return false;
                    return a.jours.includes(jour.toLowerCase());
                  });
                  if (dejaAffecte) { current.setDate(current.getDate() + 7); continue; }
                  const semaine = getWeekNumber(current);
                  const annee = current.getFullYear();
                  let heuresJour = await heuresAffecteesJour(salarie, jour.toLowerCase());
                  let heuresSemaine = await heuresAffecteesSemaine(salarie, semaine, annee);
                  if (heuresJour + hParJour > 7 || heuresSemaine + hParJour > 35) { current.setDate(current.getDate() + 7); continue; }
                  if (salarie.type_contrat === 'CDD' && salarie.fin_contrat && new Date(salarie.fin_contrat) < current) { current.setDate(current.getDate() + 7); continue; }
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
                  trouve = true;
                  break;
                }
                if (trouve) break;
              }
              if (!trouve) {
                joursNonCouverts.push(`${jour} [${competence}]`);
              }
            }
          }
        }
      }
    }
    chantier.equipe_affectee = Array.from(equipeAffectee);
    chantier.statut = (affecte && joursNonCouverts.length === 0) ? 'Planifié' : 'Nouveau';
    chantier.note = joursNonCouverts.length > 0 ? `Jours non couverts : ${joursNonCouverts.join(', ')}` : undefined;
    await chantier.save();
    if (chantier.statut === 'Planifié') success++;
    else failed++;
  }
  return { success, failed };
}

function affectationGlobaleOptimisee() {
  return Promise.resolve("Affectation globale optimisée (stub)");
}

function affectationParPasses() {
  return Promise.resolve("Affectation par passes (stub)");
}

function affectationOptimiseeParJour() {
  return Promise.resolve("Affectation optimisée par jour (stub)");
}

function affectationMatchingGlobal() {
  return Promise.resolve("Affectation matching global (stub)");
}

function affectationMatchingParfait() {
  return Promise.resolve("Affectation matching parfait (stub)");
}

// Exports
module.exports = {
  affectationFractionneeParHeure,
  affectationGlobaleOptimisee,
  affectationParPasses,
  affectationOptimiseeParJour,
  affectationMatchingGlobal,
  affectationMatchingParfait
}; 