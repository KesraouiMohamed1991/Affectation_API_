// Helpers pour l'affectation (dates, calculs, disponibilité)
const Chantier = require('../models/chantier.model');

function datesOverlap(start1, end1, start2, end2) {
  return start1 < end2 && start2 < end1;
}

async function isSalarieDisponiblePourJours(salarie, chantier, joursDemandes) {
  if (!(salarie.affectations || []).length) return true;
  for (const affectation of salarie.affectations) {
    if (!datesOverlap(affectation.date_debut, affectation.date_fin, chantier.date_debut, chantier.date_fin)) {
      continue;
    }
    const joursA = new Set((affectation.jours || []));
    const joursB = new Set(joursDemandes);
    const intersection = [...joursA].some(j => joursB.has(j));
    if (intersection) return false;
  }
  return true;
}

async function getSalariesEligibles(competence, chantier) {
  const Salarie = require('../models/salarie.model');
  const salaries = await Salarie.find({ competences: competence });
  const filtered = [];
  for (const s of salaries) {
    if (
      await isSalarieDisponiblePourJours(s, chantier, [...(chantier.jours_prestation || [])]) &&
      s.coordonnees && chantier.coordonnees &&
      (s.type_contrat !== 'CDD' || !s.fin_contrat || new Date(s.fin_contrat) >= new Date(chantier.date_fin))
    ) {
      filtered.push(s);
    }
  }
  return filtered;
}

async function affecterSalarieAChantier(salarie, chantier) {
  salarie.affectations.push({
    chantierId: chantier._id,
    date_debut: chantier.date_debut,
    date_fin: chantier.date_fin
  });
  await salarie.save();
}

function getWeekNumber(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

async function heuresAffecteesSemaine(salarie, semaineCible, anneeCible) {
  let total = 0;
  for (const aff of salarie.affectations) {
    const chantier = await Chantier.findById(aff.chantierId);
    if (!chantier) continue;
    const nbJoursPrevus = chantier.jours_prestation?.length || 1;
    const hParJour = (chantier.nombre_heures_par_semaine || 0) / nbJoursPrevus;
    const affJoursNorm = (aff.jours || []).map(j => j.toLowerCase());
    let currentDate = new Date(aff.date_debut);
    const dateFin = new Date(aff.date_fin);
    while (currentDate <= dateFin) {
      const joursSemaine = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
      const jourStr = joursSemaine[currentDate.getDay()];
      const semaine = getWeekNumber(currentDate);
      const annee = currentDate.getFullYear();
      if (
        affJoursNorm.includes(jourStr) &&
        semaine === semaineCible &&
        annee === anneeCible
      ) {
        total += hParJour;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }
  return total;
}

async function heuresAffecteesJour(salarie, jour) {
  let total = 0;
  for (const aff of salarie.affectations) {
    const chantier = await Chantier.findById(aff.chantierId);
    if (!chantier) continue;
    if ((aff.jours || []).includes(jour)) {
      const hParJour = (chantier.nombre_heures_par_semaine || 0) / (chantier.jours_prestation.length || 1);
      total += hParJour;
    }
  }
  return total;
}

async function depassementSemaineAvecChantierJours(salarie, chantier, joursAffectes) {
  const joursSemaine = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
  const heuresParJour = {};
  for (const jour of joursSemaine) {
    heuresParJour[jour] = 0;
  }
  for (const aff of salarie.affectations) {
    const ch = await Chantier.findById(aff.chantierId);
    if (!ch || !aff.jours || !ch.nombre_heures_par_semaine) continue;
    const hParJour = ch.nombre_heures_par_semaine / (ch.jours_prestation.length || 1);
    for (const jour of aff.jours) {
      heuresParJour[jour] += hParJour;
    }
  }
  if (chantier && joursAffectes && chantier.nombre_heures_par_semaine) {
    const hParJour = chantier.nombre_heures_par_semaine / (chantier.jours_prestation.length || 1);
    for (const jour of joursAffectes) {
      heuresParJour[jour] += hParJour;
    }
  }
  let depassementTotal = 0;
  for (const jour of Object.keys(heuresParJour)) {
    if (heuresParJour[jour] > 7) {
      depassementTotal += (heuresParJour[jour] - 7);
    }
  }
  return depassementTotal;
}

const getAllMondaysBetween = (start, end, jourSemaine) => {
  const result = [];
  let current = new Date(start);
  current.setHours(0,0,0,0);
  while (current.getDay() !== jourSemaine) {
    current.setDate(current.getDate() + 1);
  }
  while (current <= end) {
    result.push(new Date(current));
    current.setDate(current.getDate() + 7);
  }
  return result;
};

module.exports = {
  datesOverlap,
  isSalarieDisponiblePourJours,
  getSalariesEligibles,
  affecterSalarieAChantier,
  getWeekNumber,
  heuresAffecteesSemaine,
  heuresAffecteesJour,
  depassementSemaineAvecChantierJours,
  getAllMondaysBetween
}; 