const PDFService = require('../services/pdf.service');
const Chantier = require('../models/chantier.model');
const Salarie = require('../models/salarie.model');

class ExportController {
  /**
   * Export PDF de la liste des chantiers
   */
  static async exportChantiersPDF(req, res) {
    try {
      const chantiers = await Chantier.find({}).sort({ date_debut: -1 });
      
      if (!chantiers || chantiers.length === 0) {
        return res.status(404).json({ 
          message: 'Aucun chantier trouvé' 
        });
      }

      const pdfBuffer = await PDFService.generateChantiersPDF(chantiers);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="chantiers-${new Date().toISOString().split('T')[0]}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Erreur lors de l\'export PDF des chantiers:', error);
      res.status(500).json({ 
        message: 'Erreur lors de la génération du PDF',
        error: error.message 
      });
    }
  }

  /**
   * Export PDF du rapport d'affectation
   */
  static async exportAffectationsPDF(req, res) {
    try {
      const [chantiers, salaries] = await Promise.all([
        Chantier.find({}).sort({ date_debut: -1 }),
        Salarie.find({})
      ]);
      
      if (!chantiers || chantiers.length === 0) {
        return res.status(404).json({ 
          message: 'Aucun chantier trouvé' 
        });
      }

      const pdfBuffer = await PDFService.generateAffectationsPDF(chantiers, salaries);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="affectations-${new Date().toISOString().split('T')[0]}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Erreur lors de l\'export PDF des affectations:', error);
      res.status(500).json({ 
        message: 'Erreur lors de la génération du PDF',
        error: error.message 
      });
    }
  }

  /**
   * Export PDF du planning (mensuel ou trimestriel)
   */
  static async exportPlanningPDF(req, res) {
    try {
      const { period = 'mois' } = req.query;
      
      if (!['mois', 'trimestre'].includes(period)) {
        return res.status(400).json({ 
          message: 'Période invalide. Utilisez "mois" ou "trimestre"' 
        });
      }

      const chantiers = await Chantier.find({}).sort({ date_debut: -1 });
      
      if (!chantiers || chantiers.length === 0) {
        return res.status(404).json({ 
          message: 'Aucun chantier trouvé' 
        });
      }

      const pdfBuffer = await PDFService.generatePlanningPDF(chantiers, period);
      
      const periodName = period === 'mois' ? 'mensuel' : 'trimestriel';
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="planning-${periodName}-${new Date().toISOString().split('T')[0]}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Erreur lors de l\'export PDF du planning:', error);
      res.status(500).json({ 
        message: 'Erreur lors de la génération du PDF',
        error: error.message 
      });
    }
  }

  /**
   * Récupérer les statistiques pour les exports
   */
  static async getExportStats(req, res) {
    try {
      const [chantiers, salaries] = await Promise.all([
        Chantier.find({}),
        Salarie.find({})
      ]);

      const stats = {
        totalChantiers: chantiers.length,
        chantiersAffectes: chantiers.filter(c => c.equipe_affectee?.length > 0).length,
        totalSalaries: salaries.length,
        affectationsActives: chantiers.filter(c => c.equipe_affectee?.length > 0).length,
        totalPersonnesAffectees: chantiers.reduce((acc, c) => acc + (c.equipe_affectee?.length || 0), 0),
        chantiersEnCours: chantiers.filter(c => {
          const now = new Date();
          const debut = new Date(c.date_debut);
          const fin = new Date(c.date_fin);
          return debut <= now && fin >= now;
        }).length
      };

      res.json(stats);
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      res.status(500).json({ 
        message: 'Erreur lors de la récupération des statistiques',
        error: error.message 
      });
    }
  }
}

module.exports = ExportController; 