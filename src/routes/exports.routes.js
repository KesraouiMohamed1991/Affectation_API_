const express = require('express');
const router = express.Router();
const ExportController = require('../controllers/export.controller');

/**
 * @route   GET /api/exports/stats
 * @desc    Récupérer les statistiques pour les exports
 * @access  Public
 */
router.get('/stats', ExportController.getExportStats);

/**
 * @route   GET /api/exports/chantiers-pdf
 * @desc    Exporter la liste des chantiers en PDF
 * @access  Public
 */
router.get('/chantiers-pdf', ExportController.exportChantiersPDF);

/**
 * @route   GET /api/exports/affectations-pdf
 * @desc    Exporter le rapport d'affectation en PDF
 * @access  Public
 */
router.get('/affectations-pdf', ExportController.exportAffectationsPDF);

/**
 * @route   GET /api/exports/planning-pdf
 * @desc    Exporter le planning en PDF (mensuel ou trimestriel)
 * @access  Public
 * @query   period - Période: 'mois' ou 'trimestre' (défaut: 'mois')
 */
router.get('/planning-pdf', ExportController.exportPlanningPDF);

module.exports = router; 