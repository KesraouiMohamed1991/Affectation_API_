const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const Salarie = require('../src/models/salarie.model');
const Chantier = require('../src/models/chantier.model');

describe('Logique métier d\'affectation', () => {
  beforeEach(async () => {
    await Salarie.deleteMany({});
    await Chantier.deleteMany({});
  });

  test('Affectation réussie si salarié disponible, bonne compétence, bonne distance', async () => {
    const resSalarie = await request(app)
      .post('/api/salaries')
      .send({
        nom: 'Affectable',
        competences: ['bureaux'],
        adresse_domicile: '2 Rue de la République, 13001 Marseille',
        coordonnees: { lat: 43.2992, lng: 5.3748 },
        type_contrat: 'CDI'
      });
    expect(resSalarie.statusCode).toBe(201);

    const resChantier = await request(app)
      .post('/api/chantiers')
      .send({
        nom: 'Chantier Test',
        adresse_chantier: 'Quai du Port, 13002 Marseille',
        coordonnees: { lat: 43.2976, lng: 5.3735 },
        date_debut: '2025-09-01',
        date_fin: '2025-09-07',
        besoins_equipe: { vitres: 1 },
        nombre_heures_par_semaine: 21
      });
    expect(resChantier.statusCode).toBe(201);

    const resAffect = await request(app)
      .post(`/api/affectations/lancer-algorithme/${resChantier.body._id}`)
      .send();
    expect(resAffect.statusCode).toBe(200);
    expect(resAffect.body.chantier.statut).toBe('Planifié');
  });

  test('Affectation refusée si aucun salarié n’a la compétence requise', async () => {
    await request(app)
      .post('/api/salaries')
      .send({
        nom: 'SansCompétence',
        competences: ['vitres'],
        adresse_domicile: '2 Rue de la République, 13001 Marseille',
        coordonnees: { lat: 43.2992, lng: 5.3748 },
        type_contrat: 'CDI'
      });
    const resChantier = await request(app)
      .post('/api/chantiers')
      .send({
        nom: 'Chantier Moquette',
        adresse_chantier: 'Quai du Port, 13002 Marseille',
        coordonnees: { lat: 43.2976, lng: 5.3735 },
        date_debut: '2025-09-01',
        date_fin: '2025-09-07',
        besoins_equipe: { vitres: 1 },
        nombre_heures_par_semaine: 21
      });
    const resAffect = await request(app)
      .post(`/api/affectations/lancer-algorithme/${resChantier.body._id}`)
      .send();
    expect(resAffect.statusCode).toBe(500);
    expect(resAffect.body.error).toMatch(/Aucun salarié disponible/);
  });

  test('Affectation refusée si tous les salariés sont à plus de 30km', async () => {
    await request(app)
      .post('/api/salaries')
      .send({
        nom: 'Loin',
        competences: ['bureaux'],
        adresse_domicile: 'Nice',
        coordonnees: { lat: 43.7102, lng: 7.2620 }, // Nice
        type_contrat: 'CDI'
      });
    const resChantier = await request(app)
      .post('/api/chantiers')
      .send({
        nom: 'Chantier Marseille',
        adresse_chantier: 'Quai du Port, 13002 Marseille',
        coordonnees: { lat: 43.2976, lng: 5.3735 },
        date_debut: '2025-09-01',
        date_fin: '2025-09-07',
        besoins_equipe: { vitres: 1 },
        nombre_heures_par_semaine: 21
      });
    const resAffect = await request(app)
      .post(`/api/affectations/lancer-algorithme/${resChantier.body._id}`)
      .send();
    expect(resAffect.statusCode).toBe(500);
    expect(resAffect.body.error).toMatch(/Aucun salarié disponible/);
  });

  test('Affectation refusée si salarié dépasse 35h/semaine', async () => {
    // Affectation existante de 35h sur la même semaine
    const salarie = await Salarie.create({
      nom: 'DéjàPlein',
      competences: ['bureaux'],
      adresse_domicile: '2 Rue de la République, 13001 Marseille',
      coordonnees: { lat: 43.2992, lng: 5.3748 },
      type_contrat: 'CDI',
      affectations: [{
        chantierId: new mongoose.Types.ObjectId(),
        date_debut: '2025-09-01',
        date_fin: '2025-09-07',
        jours: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'],
      }]
    });
    const resChantier = await request(app)
      .post('/api/chantiers')
      .send({
        nom: 'Chantier Surcharge',
        adresse_chantier: 'Quai du Port, 13002 Marseille',
        coordonnees: { lat: 43.2976, lng: 5.3735 },
        date_debut: '2025-09-01',
        date_fin: '2025-09-07',
        besoins_equipe: { vitres: 1 },
        nombre_heures_par_semaine: 7
      });
    const resAffect = await request(app)
      .post(`/api/affectations/lancer-algorithme/${resChantier.body._id}`)
      .send();
    expect(resAffect.statusCode).toBe(500);
    expect(resAffect.body.error).toMatch(/Aucun salarié disponible/);
  });

  test('Refus si salarié déjà affecté ce jour-là, même s’il a encore des heures disponibles', async () => {
    // Crée un chantier sur lundi
    const chantier1 = await Chantier.create({
      nom: 'Chantier Lundi',
      adresse_chantier: 'Quai du Port, 13002 Marseille',
      coordonnees: { lat: 43.2976, lng: 5.3735 },
      date_debut: '2025-09-01',
      date_fin: '2025-09-07',
      besoins_equipe: { vitres: 1 },
      nombre_heures_par_semaine: 7,
      jours_prestation: ['lundi']
    });
    // Crée un salarié déjà affecté à ce chantier le lundi (7h)
    const salarie = await Salarie.create({
      nom: 'OccupéLundi',
      competences: ['bureaux'],
      adresse_domicile: '2 Rue de la République, 13001 Marseille',
      coordonnees: { lat: 43.2992, lng: 5.3748 },
      type_contrat: 'CDI',
      affectations: [{
        chantierId: chantier1._id,
        date_debut: '2025-09-01',
        date_fin: '2025-09-07',
        jours: ['lundi']
      }]
    });
    // Crée un deuxième chantier aussi le lundi
    const resChantier2 = await request(app)
      .post('/api/chantiers')
      .send({
        nom: 'Chantier Lundi Bis',
        adresse_chantier: '25 rue de la Joliette, 13002 Marseille',
        coordonnees: { lat: 43.3081, lng: 5.3675 },
        date_debut: '2025-09-01',
        date_fin: '2025-09-07',
        besoins_equipe: { vitres: 1 },
        nombre_heures_par_semaine: 7,
        jours_prestation: ['lundi']
      });
    // Tente l'affectation sur le deuxième chantier
    const resAffect = await request(app)
      .post(`/api/affectations/lancer-algorithme/${resChantier2.body._id}`)
      .send();
    expect(resAffect.statusCode).toBe(500);
    expect(resAffect.body.error).toMatch(/Aucun salarié disponible/);
  });

  test('Affectation refusée si salarié CDD expiré', async () => {
    await request(app)
      .post('/api/salaries')
      .send({
        nom: 'CDD Expiré',
        competences: ['bureaux'],
        adresse_domicile: '2 Rue de la République, 13001 Marseille',
        coordonnees: { lat: 43.2992, lng: 5.3748 },
        type_contrat: 'CDD',
        fin_contrat: '2020-01-01'
      });
    const resChantier = await request(app)
      .post('/api/chantiers')
      .send({
        nom: 'Chantier Futur',
        adresse_chantier: 'Quai du Port, 13002 Marseille',
        coordonnees: { lat: 43.2976, lng: 5.3735 },
        date_debut: '2025-09-01',
        date_fin: '2025-09-07',
        besoins_equipe: { vitres: 1 },
        nombre_heures_par_semaine: 21
      });
    const resAffect = await request(app)
      .post(`/api/affectations/lancer-algorithme/${resChantier.body._id}`)
      .send();
    expect(resAffect.statusCode).toBe(500);
    expect(resAffect.body.error).toMatch(/Aucun salarié disponible/);
  });
}); 