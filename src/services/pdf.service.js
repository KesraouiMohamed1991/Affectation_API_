const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { getDistanceKm } = require('./geolocation.service');

class PDFService {
  /**
   * Génère un PDF de la liste des chantiers
   */
  static async generateChantiersPDF(chantiers) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const chunks = [];
        
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        
        // En-tête
        doc.fontSize(24).text('Rapport des Chantiers', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, { align: 'center' });
        doc.moveDown(2);
        
        // Statistiques
        const totalChantiers = chantiers.length;
        const chantiersAffectes = chantiers.filter(c => c.equipe_affectee?.length > 0).length;
        
        doc.fontSize(14).text('Statistiques', { underline: true });
        doc.fontSize(12).text(`Total chantiers: ${totalChantiers}`);
        doc.text(`Chantiers affectés: ${chantiersAffectes}`);
        doc.text(`Chantiers non affectés: ${totalChantiers - chantiersAffectes}`);
        doc.moveDown(2);
        
        // Liste des chantiers
        doc.fontSize(14).text('Détail des chantiers', { underline: true });
        doc.moveDown();
        
        chantiers.forEach((chantier, index) => {
          doc.fontSize(12).font('Helvetica-Bold').text(`${index + 1}. ${chantier.nom}`);
          doc.fontSize(10).font('Helvetica');
          doc.text(`   Adresse: ${chantier.adresse_chantier}`);
          doc.text(`   Date début: ${new Date(chantier.date_debut).toLocaleDateString('fr-FR')}`);
          if (chantier.date_fin) {
            doc.text(`   Date fin: ${new Date(chantier.date_fin).toLocaleDateString('fr-FR')}`);
          }
          doc.text(`   Statut: ${chantier.statut || 'Non défini'}`);
          doc.text(`   Équipe affectée: ${chantier.equipe_affectee?.length || 0} personne(s)`);
          
          if (chantier.besoins_equipe && Object.keys(chantier.besoins_equipe).length > 0) {
            doc.text(`   Besoins: ${Object.entries(chantier.besoins_equipe).map(([comp, nb]) => `${comp}: ${nb}`).join(', ')}`);
          }
          
          if (chantier.jours_prestation && chantier.jours_prestation.length > 0) {
            doc.text(`   Jours d'intervention : ${chantier.jours_prestation.join(', ')}`);
          }
          
          doc.moveDown();
        });
        
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Génère un PDF du rapport d'affectation
   */
  static async generateAffectationsPDF(chantiers, salaries) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const chunks = [];
        
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        
        // En-tête
        doc.fontSize(24).text('Rapport d\'Affectation', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, { align: 'center' });
        doc.moveDown(2);
        
        // Filtrer les chantiers avec affectations
        const chantiersAvecAffectation = chantiers.filter(c => c.equipe_affectee?.length > 0);
        
        // Statistiques
        const totalAffectations = chantiersAvecAffectation.length;
        const totalPersonnes = chantiersAvecAffectation.reduce((acc, c) => acc + c.equipe_affectee.length, 0);
        
        doc.fontSize(14).text('Statistiques', { underline: true });
        doc.fontSize(12).text(`Chantiers avec affectation: ${totalAffectations}`);
        doc.text(`Total personnes affectées: ${totalPersonnes}`);
        doc.moveDown(2);
        
        // Détail des affectations
        doc.fontSize(14).text('Détail des affectations', { underline: true });
        doc.moveDown();
        
        chantiersAvecAffectation.forEach((chantier, index) => {
          doc.fontSize(12).font('Helvetica-Bold').text(`${index + 1}. ${chantier.nom}`);
          doc.fontSize(10).font('Helvetica');
          doc.text(`   Adresse: ${chantier.adresse_chantier}`);
          doc.text(`   Période: ${new Date(chantier.date_debut).toLocaleDateString('fr-FR')} - ${new Date(chantier.date_fin).toLocaleDateString('fr-FR')}`);

          // Détail de l'équipe
          // Correction : comparaison robuste des IDs
          console.log('Chantier:', chantier.nom, 'Equipe affectée:', chantier.equipe_affectee);
          console.log('Salaries:', salaries.map(s => ({ _id: s._id, nom: s.nom })));
          const equipeDetails = salaries.filter(s => 
            Array.isArray(chantier.equipe_affectee) && chantier.equipe_affectee.map(id => String(id)).includes(String(s._id))
          );
          doc.text(`   Équipe (${equipeDetails.length} personne(s)) :`);

          // --- Tableau PDF ---
          if (equipeDetails.length > 0) {
            doc.moveDown(0.2);
            // Affichage aligné avec pad comme avant
            function pad(str, len) {
              return (str + ' '.repeat(len)).slice(0, len);
            }
            doc.font('Courier-Bold').text(
              pad('Nom du salarié', 22) +
              pad('Max h/semaine', 16) +
              pad('Heures chantier', 16) +
              pad("Jours d'intervention", 35) +
              pad('Distance (km)', 15)
            );
            doc.font('Courier');
            equipeDetails.forEach(salarie => {
              let distance = '-';
              if (
                salarie.coordonnees && chantier.coordonnees &&
                typeof salarie.coordonnees.lat === 'number' && typeof salarie.coordonnees.lng === 'number' &&
                typeof chantier.coordonnees.lat === 'number' && typeof chantier.coordonnees.lng === 'number'
              ) {
                distance = getDistanceKm(
                  salarie.coordonnees.lat,
                  salarie.coordonnees.lng,
                  chantier.coordonnees.lat,
                  chantier.coordonnees.lng
                ).toFixed(1);
              }
              // Calcul du max d'heures/semaine civile pour ce salarié
              let semaines = {};
              (salarie.affectations || []).forEach(aff => {
                if (String(aff.chantierId) !== String(chantier._id)) return;
                const nbJoursPrevus = chantier.jours_prestation?.length || 1;
                const hParJour = (chantier.nombre_heures_par_semaine || 0) / nbJoursPrevus;
                let currentDate = new Date(aff.date_debut);
                const dateFin = new Date(aff.date_fin);
                const joursNorm = (aff.jours || []).map(j => j.toLowerCase());
                while (currentDate <= dateFin) {
                  const joursSemaine = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
                  const jourStr = joursSemaine[currentDate.getDay()];
                  if (joursNorm.includes(jourStr)) {
                    // Calcule la semaine ISO
                    const d = new Date(currentDate);
                    d.setHours(0,0,0,0);
                    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
                    const yearStart = new Date(d.getFullYear(), 0, 1);
                    const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
                    const key = `${d.getFullYear()}-S${week}`;
                    semaines[key] = (semaines[key] || 0) + hParJour;
                  }
                  currentDate.setDate(currentDate.getDate() + 1);
                }
              });
              const maxHeuresSemaine = Object.values(semaines).length > 0 ? Math.max(...Object.values(semaines)) : 0;
              doc.text(
                pad(salarie.nom, 22) +
                pad(`${maxHeuresSemaine} h`, 16) +
                pad(`${chantier.nombre_heures_par_semaine} h`, 16) +
                pad(
                  chantier.jours_prestation && chantier.jours_prestation.length > 0
                    ? chantier.jours_prestation.join(', ')
                    : '-', 35
                ) +
                pad(`${distance}`, 15)
              );
            });
            doc.font('Courier-Bold').text(
              pad('Total chantier', 22) +
              pad(`${chantier.nombre_heures_par_semaine * equipeDetails.length} h`, 16)
            );
            doc.font('Helvetica');
            doc.moveDown(0.2);
            doc.fontSize(9).fillColor('gray').text("* Max h/semaine = maximum d'heures affectées sur une même semaine civile pour ce salarié sur ce chantier (règle légale : 35h)");
            doc.fillColor('black').fontSize(10);
          }
          if (chantier.jours_prestation && chantier.jours_prestation.length > 0) {
            doc.text(`   Jours d'intervention : ${chantier.jours_prestation.join(', ')}`);
          }
          doc.moveDown();
        });
        
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Génère un PDF du planning (mensuel ou trimestriel)
   */
  static async generatePlanningPDF(chantiers, period = 'mois') {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const chunks = [];
        
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        
        // En-tête
        const titre = period === 'mois' ? 'Planning Mensuel' : 'Planning Trimestriel';
        doc.fontSize(24).text(titre, { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, { align: 'center' });
        doc.moveDown(2);
        
        // Calcul de la période
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        let startDate, endDate;
        if (period === 'mois') {
          startDate = new Date(currentYear, currentMonth, 1);
          endDate = new Date(currentYear, currentMonth + 1, 0);
        } else {
          const quarter = Math.floor(currentMonth / 3);
          startDate = new Date(currentYear, quarter * 3, 1);
          endDate = new Date(currentYear, (quarter + 1) * 3, 0);
        }
        
        // Filtrer les chantiers de la période
        const chantiersPeriode = chantiers.filter(c => {
          const chantierDebut = new Date(c.date_debut);
          const chantierFin = new Date(c.date_fin);
          return chantierDebut <= endDate && chantierFin >= startDate;
        });
        
        // Statistiques
        doc.fontSize(14).text('Statistiques de la période', { underline: true });
        doc.fontSize(12).text(`Période: ${startDate.toLocaleDateString('fr-FR')} - ${endDate.toLocaleDateString('fr-FR')}`);
        doc.text(`Chantiers planifiés: ${chantiersPeriode.length}`);
        doc.text(`Chantiers en cours: ${chantiersPeriode.filter(c => {
          const now = new Date();
          const debut = new Date(c.date_debut);
          const fin = new Date(c.date_fin);
          return debut <= now && fin >= now;
        }).length}`);
        doc.moveDown(2);
        
        // Planning détaillé
        doc.fontSize(14).text('Planning détaillé', { underline: true });
        doc.moveDown();
        
        // Trier par date de début
        chantiersPeriode.sort((a, b) => new Date(a.date_debut) - new Date(b.date_debut));
        
        chantiersPeriode.forEach((chantier, index) => {
          doc.fontSize(12).font('Helvetica-Bold').text(`${index + 1}. ${chantier.nom}`);
          doc.fontSize(10).font('Helvetica');
          doc.text(`   Adresse: ${chantier.adresse_chantier}`);
          doc.text(`   Début: ${new Date(chantier.date_debut).toLocaleDateString('fr-FR')}`);
          doc.text(`   Fin: ${new Date(chantier.date_fin).toLocaleDateString('fr-FR')}`);
          doc.text(`   Statut: ${chantier.statut || 'Non défini'}`);
          doc.text(`   Équipe: ${chantier.equipe_affectee?.length || 0} personne(s) affectée(s)`);
          
          if (chantier.jours_prestation && chantier.jours_prestation.length > 0) {
            doc.text(`   Jours d'intervention : ${chantier.jours_prestation.join(', ')}`);
          }
          
          // Indicateur visuel du statut
          const now = new Date();
          const debut = new Date(chantier.date_debut);
          const fin = new Date(chantier.date_fin);
          let statut = '';
          if (debut > now) statut = 'À venir';
          else if (fin < now) statut = 'Terminé';
          else statut = 'En cours';
          
          doc.text(`   État: ${statut}`);
          doc.moveDown();
        });
        
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = PDFService; 