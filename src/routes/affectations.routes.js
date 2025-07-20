const express = require('express');
const router = express.Router();
const affectationController = require('../controllers/affectation.controller');
const affectationService = require('../services/affectation.service');

// Route pour lancer l'algorithme pour un chantier spécifique
router.post('/lancer-algorithme/:chantierId', affectationController.lancerAlgorithmePourChantier);

// Nouvelle fonction pour GET /api/affectations
router.get('/', async (req, res) => {
  try {
    // À adapter selon ta logique de stockage
    const affectations = await affectationService.getAllAffectations();
    res.status(200).json(affectations);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des affectations", error: error.message });
  }
});

// Route pour réinitialiser l'affectation d'un chantier
router.post('/reset/:chantierId', affectationController.resetAffectationPourChantier);
router.post('/lancer-algorithme-global', affectationController.lancerAlgorithmeGlobal);

module.exports = router;
