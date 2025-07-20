const express = require('express');
const router = express.Router();
const chantierController = require('../controllers/chantier.controller');

// Routes CRUD pour les chantiers
router.post('/', chantierController.createChantier);
router.get('/', chantierController.getAllChantiers);
router.get('/:id', chantierController.getChantierById);
router.put('/:id', chantierController.updateChantier);
router.delete('/:id', chantierController.deleteChantier);

module.exports = router;
