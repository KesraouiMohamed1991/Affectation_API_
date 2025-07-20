const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const Salarie = require('../src/models/salarie.model');
const Chantier = require('../src/models/chantier.model');

describe('Affectation API - tests simples', () => {
  beforeEach(async () => {
    await Salarie.deleteMany({});
    await Chantier.deleteMany({});
  });

  test('Affectation automatique avec 2 salariés compatibles', async () => {
    // Crée 2 salariés avec la compétence 'vitres' et coordonnées proches de Paris
    await request(app)
      .post('/api/salaries')
      .send({
        nom: 'Vitrier 1',
        competences: ['vitres'],
        adresse_domicile: '1 rue test, Paris',
        coordonnees: { lat: 48.8566, lng: 2.3522 },
        type_contrat: 'CDI'
      });
    await request(app)
      .post('/api/salaries')
      .send({
        nom: 'Vitrier 2',
        competences: ['vitres'],
        adresse_domicile: '2 rue test, Paris',
        coordonnees: { lat: 48.8570, lng: 2.3530 },
        type_contrat: 'CDI'
      });
    const resChantier = await request(app)
      .post('/api/chantiers')
      .send({
        nom: 'Chantier Test',
        adresse_chantier: '10 rue chantier, Paris',
        coordonnees: { lat: 48.8575, lng: 2.3535 },
        date_debut: '2025-07-01',
        date_fin: '2025-07-10',
        besoins_equipe: { vitres: 2 },
        nombre_heures_par_semaine: 35,
        jours_prestation: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi']
      });
    const resAffect = await request(app)
      .post(`/api/affectations/lancer-algorithme/${resChantier.body._id}`)
      .send();
    expect(resAffect.statusCode).toBe(200);
    expect(resAffect.body.chantier.statut).toBe('Planifié');
    expect(resAffect.body.chantier.equipe_affectee.length).toBeGreaterThanOrEqual(2);
  });

  test('Affectation échoue si aucune compétence ne correspond', async () => {
    await request(app)
      .post('/api/salaries')
      .send({
        nom: 'Inutile',
        competences: ['autre'],
        adresse_domicile: '3 rue test, Paris',
        coordonnees: { lat: 48.8580, lng: 2.3540 },
        type_contrat: 'CDI'
      });
    const resChantier = await request(app)
      .post('/api/chantiers')
      .send({
        nom: 'Chantier Impossible',
        adresse_chantier: '20 rue impossible, Paris',
        coordonnees: { lat: 48.8590, lng: 2.3550 },
        date_debut: '2025-08-01',
        date_fin: '2025-08-10',
        besoins_equipe: { vitres: 1 },
        nombre_heures_par_semaine: 35
      });
    expect(resChantier.statusCode).toBe(201);
    const resAffect = await request(app)
      .post(`/api/affectations/lancer-algorithme/${resChantier.body._id}`)
      .send();
    expect(resAffect.statusCode).toBe(500);
    expect(resAffect.body.error).toMatch(/Aucun salarié disponible/);
  });

  test('Affectation échoue si salarié trop loin', async () => {
    await request(app)
      .post('/api/salaries')
      .send({
        nom: 'Loin',
        competences: ['vitres'],
        adresse_domicile: 'Nice',
        coordonnees: { lat: 43.7102, lng: 7.2620 }, // Nice
        type_contrat: 'CDI'
      });
    const resChantier = await request(app)
      .post('/api/chantiers')
      .send({
        nom: 'Chantier Paris',
        adresse_chantier: '8 boulevard Montmartre, Paris',
        coordonnees: { lat: 48.8566, lng: 2.3522 },
        date_debut: '2025-09-01',
        date_fin: '2025-09-05',
        besoins_equipe: { vitres: 1 },
        nombre_heures_par_semaine: 35
      });
    expect(resChantier.statusCode).toBe(201);
    const resAffect = await request(app)
      .post(`/api/affectations/lancer-algorithme/${resChantier.body._id}`)
      .send();
    expect(resAffect.statusCode).toBe(500);
    expect(resAffect.body.error).toMatch(/Aucun salarié disponible/);
  });
}); 