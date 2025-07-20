const mongoose = require('mongoose');
const Chantier = require('./src/models/chantier.model');
const Salarie = require('./src/models/salarie.model');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/affectations';

function intersect(a, b) {
  return a.filter(x => b.includes(x));
}

async function main() {
  await mongoose.connect(MONGO_URI);
  const chantiers = await Chantier.find({});
  const salaries = await Salarie.find({});

  // 1. Chantiers non totalement affectés + détail du partage + raisons
  console.log('=== Diagnostic détaillé des chantiers ===\n');
  for (const chantier of chantiers) {
    const besoins = chantier.besoins_equipe instanceof Map ? Object.fromEntries(chantier.besoins_equipe) : chantier.besoins_equipe;
    let complet = true;
    for (const [comp, nb] of Object.entries(besoins)) {
      let totalPourvus = 0;
      for (const jour of chantier.jours_prestation || []) {
        let details = [];
        for (const sal of salaries) {
          for (const aff of sal.affectations || []) {
            if (String(aff.chantierId) === String(chantier._id) && (aff.heures_par_jour && aff.heures_par_jour[jour]) && sal.competences.includes(comp)) {
              details.push(`${sal.nom} (${aff.heures_par_jour[jour]}h)`);
              totalPourvus += aff.heures_par_jour[jour];
            }
          }
        }
        if (details.length > 0) {
          console.log(`Chantier: ${chantier.nom} (${chantier.adresse_chantier})`);
          console.log(`  ${comp} - ${jour} : ${details.join(', ')}`);
        } else {
          // Diagnostic des raisons d'absence d'affectation
          let candidats = salaries.filter(sal => sal.competences.includes(comp));
          if (candidats.length === 0) {
            console.log(`  >> Aucun salarié compétent pour ${comp} le ${jour}`);
            continue;
          }
          let candidatsDispo = candidats.filter(sal => {
            // Contrat CDD fini ?
            if (sal.type_contrat === 'CDD' && sal.fin_contrat && chantier.date_fin > sal.fin_contrat) return false;
            // Déjà à 35h ?
            let heuresSemaine = 0;
            for (const aff of sal.affectations || []) {
              for (const h of Object.values(aff.heures_par_jour || {})) heuresSemaine += h;
            }
            if (heuresSemaine >= 35) return false;
            // Pas dispo ce jour ?
            if (sal.jours_dispo && !sal.jours_dispo.includes(jour)) return false;
            // Distance (si coordonnées)
            if (chantier.coordonnees && sal.coordonnees) {
              const dist = Math.sqrt(Math.pow(chantier.coordonnees.lat - sal.coordonnees.lat, 2) + Math.pow(chantier.coordonnees.lng - sal.coordonnees.lng, 2));
              if (dist > 0.3) return false; // ~30km
            }
            return true;
          });
          if (candidatsDispo.length === 0) {
            // Afficher la raison principale pour chaque candidat non dispo
            for (const sal of candidats) {
              let raison = [];
              if (sal.type_contrat === 'CDD' && sal.fin_contrat && chantier.date_fin > sal.fin_contrat) raison.push('contrat fini');
              let heuresSemaine = 0;
              for (const aff of sal.affectations || []) {
                for (const h of Object.values(aff.heures_par_jour || {})) heuresSemaine += h;
              }
              if (heuresSemaine >= 35) raison.push('déjà à 35h');
              if (sal.jours_dispo && !sal.jours_dispo.includes(jour)) raison.push('pas dispo ce jour');
              if (chantier.coordonnees && sal.coordonnees) {
                const dist = Math.sqrt(Math.pow(chantier.coordonnees.lat - sal.coordonnees.lat, 2) + Math.pow(chantier.coordonnees.lng - sal.coordonnees.lng, 2));
                if (dist > 0.3) raison.push('trop loin');
              }
              if (raison.length > 0) {
                console.log(`    ${sal.nom} : ${raison.join(', ')}`);
              }
            }
          } else {
            // Afficher les salariés qui auraient pu être partiellement affectés
            for (const sal of candidatsDispo) {
              let heuresJour = 0;
              for (const aff of sal.affectations || []) {
                if (aff.heures_par_jour && aff.heures_par_jour[jour]) heuresJour += aff.heures_par_jour[jour];
              }
              if (heuresJour < 7) {
                console.log(`    ${sal.nom} aurait pu être affecté pour ${7 - heuresJour}h (reste dispo ce jour)`);
              }
            }
          }
        }
      }
      const nbJours = (chantier.jours_prestation || []).length;
      const besoinTotal = nb * nbJours * 7;
      if (totalPourvus < besoinTotal) {
        complet = false;
        console.log(`  >> Besoin non totalement couvert pour ${comp} : ${totalPourvus}/${besoinTotal}h`);
      }
    }
    if (!complet) console.log('');
  }

  // 2. Salariés non affectés
  console.log('\n=== Salariés non affectés ===\n');
  for (const sal of salaries) {
    if (!sal.affectations || sal.affectations.length === 0) {
      let raisons = [];
      // Contrat fini ?
      if (sal.type_contrat === 'CDD' && sal.fin_contrat && sal.fin_contrat < new Date()) {
        raisons.push('Contrat terminé');
      }
      // Pas de créneau dispo ?
      else {
        raisons.push('Pas de créneau compatible avec les chantiers restants (ou tous les besoins déjà couverts)');
      }
      console.log(`${sal.nom} : ${raisons.join(', ')}`);
    }
  }

  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}); 