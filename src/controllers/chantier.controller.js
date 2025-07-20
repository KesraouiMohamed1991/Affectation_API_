const Chantier = require('../models/chantier.model');
const { geocodeAddress } = require('../services/geocoding.service');
const { getCoordsFromAddress } = require('../services/geolocation.service');

// @desc    Créer un nouveau chantier
// @route   POST /api/chantiers
exports.createChantier = async (req, res) => {
  try {
    console.log('POST /api/chantiers - body reçu :', req.body);
    const { nom, adresse_chantier, date_debut, date_fin, besoins_equipe, nombre_heures_par_jour, nombre_heures_par_semaine, jours_prestation, coordonnees } = req.body;

    // Validation métier : max 8h/jour
    if (nombre_heures_par_semaine && jours_prestation && jours_prestation.length > 0) {
      const ratio = Number(nombre_heures_par_semaine) / jours_prestation.length;
      if (ratio > 8) {
        return res.status(400).json({ message: "Impossible d'affecter plus de 8h par jour sur ce chantier." });
      }
    }

    let coords = coordonnees;
    if (!coords) {
      try {
        coords = await getCoordsFromAddress(req.body.adresse_chantier);
      } catch (error) {
        console.warn('Adresse non géocodable:', req.body.adresse_chantier);
        // On continue, coordonnees reste null
      }
    }

    // Prendre la valeur envoyée si présente, sinon calculer
    let heuresParSemaine = Number(nombre_heures_par_semaine);
    if (!heuresParSemaine || isNaN(heuresParSemaine)) {
      if (typeof nombre_heures_par_jour === 'number' && date_debut && date_fin) {
        const d1 = new Date(date_debut);
        const d2 = new Date(date_fin);
        const nbJours = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24) + 1);
        heuresParSemaine = nombre_heures_par_jour * Math.min(nbJours, 7);
      } else {
        heuresParSemaine = 0;
      }
    }

    const newChantier = new Chantier({
      nom,
      adresse_chantier,
      coordonnees: coords,
      date_debut,
      date_fin,
      besoins_equipe,
      nombre_heures_par_semaine: heuresParSemaine,
      jours_prestation: (heuresParSemaine < 35 && heuresParSemaine > 0)
        ? (heuresParSemaine === 21 ? ['lundi', 'mercredi', 'vendredi']
          : heuresParSemaine === 14 ? ['lundi', 'jeudi']
          : heuresParSemaine === 7 ? ['mercredi']
          : [])
        : undefined
    });

    const chantier = await newChantier.save();
    const response = chantier.toObject();
    if (!coords) {
      response.warning = "Adresse non géocodable, coordonnées absentes";
    }
    res.status(201).json(response);
  } catch (error) {
    console.error('Erreur lors de la création du chantier :', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Récupérer tous les chantiers
// @route   GET /api/chantiers
exports.getAllChantiers = async (req, res) => {
  try {
    const chantiers = await Chantier.find();
    res.status(200).json(chantiers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Récupérer un chantier par son ID
// @route   GET /api/chantiers/:id
exports.getChantierById = async (req, res) => {
  try {
    const chantier = await Chantier.findById(req.params.id);
    if (!chantier) {
      return res.status(404).json({ message: 'Chantier non trouvé' });
    }
    res.status(200).json(chantier);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mettre à jour un chantier
// @route   PUT /api/chantiers/:id
exports.updateChantier = async (req, res) => {
  try {
    const { nom, adresse_chantier, date_debut, date_fin, besoins_equipe, statut, equipe_affectee } = req.body;
    let coordonnees;

    if (adresse_chantier) {
      coordonnees = await getCoordsFromAddress(adresse_chantier);
    }

    const updatedChantier = await Chantier.findByIdAndUpdate(
      req.params.id,
      {
        nom,
        adresse_chantier,
        coordonnees,
        date_debut,
        date_fin,
        besoins_equipe,
        statut,
        equipe_affectee
      },
      { new: true }
    );

    if (!updatedChantier) {
      return res.status(404).json({ message: 'Chantier non trouvé' });
    }
    res.status(200).json(updatedChantier);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Supprimer un chantier
// @route   DELETE /api/chantiers/:id
exports.deleteChantier = async (req, res) => {
  try {
    const deletedChantier = await Chantier.findByIdAndDelete(req.params.id);
    if (!deletedChantier) {
      return res.status(404).json({ message: 'Chantier non trouvé' });
    }
    res.status(200).json({ message: 'Chantier supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
