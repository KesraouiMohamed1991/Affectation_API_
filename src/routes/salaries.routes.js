const express = require('express');
const router = express.Router();
const salarieController = require('../controllers/salarie.controller');

// Routes CRUD pour les salariés
router.post('/', salarieController.createSalarie);
router.get('/', salarieController.getAllSalaries);
router.get('/:id', salarieController.getSalarieById);
router.put('/:id', salarieController.updateSalarie);
router.delete('/:id', salarieController.deleteSalarie);

module.exports = router;
