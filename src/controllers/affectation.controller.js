// Pour l'instant, ce contrôleur renvoie un message de succès.
// La logique sera déportée dans affectation.service.js

// @desc    Lancer l'algorithme d'affectation
// @route   POST /api/affectations/lancer-algorithme
const affectationService = require('../services/affectation.service');

// @desc    Lancer l'algorithme d'affectation pour un chantier spécifique
// @route   POST /api/affectations/lancer-algorithme/:chantierId
exports.lancerAlgorithmePourChantier = async (req, res) => {
  try {
    // const { chantierId } = req.params;
    // if (!chantierId) {
    //   return res.status(400).json({ message: "L'ID du chantier est requis" });
    // }

    // Appel global sur tous les chantiers, version fractionnée
    await affectationService.affectationFractionneeParHeure();
    res.status(200).json({ message: "Algorithme d'affectation fractionnée exécuté avec succès" });

  } catch (error) {
    if (error.message === 'Aucun salarié disponible') {
      return res.status(500).json({ error: error.message });
    }
    if (error.message === 'Chantier non trouvé') {
      return res.status(500).json({ error: error.message });
    }
    if (error.message === "Le chantier est déjà planifié ou en cours.") {
      return res.status(500).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

// @desc    Réinitialiser l'affectation d'un chantier
// @route   POST /api/affectations/reset/:chantierId
exports.resetAffectationPourChantier = async (req, res) => {
  try {
    const { chantierId } = req.params;
    if (!chantierId) {
      return res.status(400).json({ message: "L'ID du chantier est requis" });
    }
    const chantierReset = await affectationService.resetAffectationPourChantier(chantierId);
    res.status(200).json({ message: "Affectation réinitialisée", chantier: chantierReset });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la réinitialisation", error: error.message });
  }
};

// @desc    Lancer l'algorithme d'affectation global sur tous les chantiers non planifiés
// @route   POST /api/affectations/lancer-algorithme-global
exports.lancerAlgorithmeGlobal = async (req, res) => {
  try {
    const { success, failed } = await affectationService.affectationFractionneeParHeure();
    res.json({ success, failed });
  } catch (error) {
    res.status(500).json({ message: "Erreur globale", error: error.message });
  }
};
