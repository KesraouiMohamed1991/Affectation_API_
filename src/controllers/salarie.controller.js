const Salarie = require('../models/salarie.model');
const { geocodeAddress } = require('../services/geocoding.service');
const { getCoordsFromAddress } = require('../services/geolocation.service');

// @desc    Créer un nouveau salarié
// @route   POST /api/salaries
exports.createSalarie = async (req, res) => {
  try {
    const { nom, competences, adresse_domicile, type_contrat, fin_contrat, date_debut, duree, coordonnees } = req.body;

    // Validation manuelle
    if (!nom || !Array.isArray(competences) || competences.length === 0 || !adresse_domicile || !type_contrat) {
      return res.status(400).json({ message: "Champs obligatoires manquants ou invalides." });
    }
    if (type_contrat === "CDD" && !fin_contrat) {
      return res.status(400).json({ message: "fin_contrat est obligatoire pour un CDD." });
    }

    let coords = coordonnees;
    if (!coords) {
      try {
        coords = await getCoordsFromAddress(req.body.adresse_domicile);
      } catch (error) {
        console.warn('Adresse non géocodable:', req.body.adresse_domicile);
        // On continue, coordonnees reste null
      }
    }

    const nouveauSalarie = new Salarie({
      nom,
      competences,
      adresse_domicile,
      type_contrat,
      fin_contrat,
      date_debut,
      duree,
      coordonnees: coords,
      affectations: []
    });
    await nouveauSalarie.save();
    console.log('[DEBUG] Salarié créé:', nouveauSalarie.nom, nouveauSalarie.coordonnees);
    const response = nouveauSalarie.toObject();
    if (!coords) {
      response.warning = "Adresse non géocodable, coordonnées absentes";
    }
    res.status(201).json(response);
  } catch (error) {
    console.error("Erreur création salarié:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Récupérer tous les salariés
// @route   GET /api/salaries
exports.getAllSalaries = async (req, res) => {
  try {
    const salaries = await Salarie.find();
    res.status(200).json(salaries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Récupérer un salarié par son ID
// @route   GET /api/salaries/:id
exports.getSalarieById = async (req, res) => {
  try {
    const salarie = await Salarie.findById(req.params.id);
    if (!salarie) {
      return res.status(404).json({ message: 'Salarie non trouvé' });
    }
    res.status(200).json(salarie);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mettre à jour un salarié
// @route   PUT /api/salaries/:id
exports.updateSalarie = async (req, res) => {
  try {
    const { nom, competences, adresse_domicile, type_contrat, fin_contrat, affectations } = req.body;
    let coordonnees;

    if (adresse_domicile) {
      coordonnees = await getCoordsFromAddress(adresse_domicile);
    }

    const updatedSalarie = await Salarie.findByIdAndUpdate(
      req.params.id,
      {
        nom,
        competences,
        adresse_domicile,
        coordonnees,
        type_contrat,
        fin_contrat,
        affectations
      },
      { new: true }
    );

    if (!updatedSalarie) {
      return res.status(404).json({ message: 'Salarie non trouvé' });
    }
    res.status(200).json(updatedSalarie);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Supprimer un salarié
// @route   DELETE /api/salaries/:id
exports.deleteSalarie = async (req, res) => {
  try {
    const deletedSalarie = await Salarie.findByIdAndDelete(req.params.id);
    if (!deletedSalarie) {
      return res.status(404).json({ message: 'Salarie non trouvé' });
    }
    res.status(200).json({ message: 'Salarie supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
