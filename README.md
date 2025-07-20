# Projet Affectations API

API RESTful pour la gestion des chantiers, salariés et affectations, avec génération de rapports PDF. Basée sur Node.js, Express et MongoDB (utilisation directe de Mongoose, pas de Prisma).

## Sommaire
- [Fonctionnalités](#fonctionnalités)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Configuration](#configuration)
- [Démarrage](#démarrage)
- [Structure du projet](#structure-du-projet)
- [Endpoints principaux](#endpoints-principaux)
- [Seed de la base](#seed-de-la-base)
- [Tests](#tests)
- [Contribution](#contribution)

---

## Fonctionnalités
- CRUD Salariés et Chantiers
- Affectation automatique d'équipes aux chantiers (algorithme métier)
- Export PDF (chantiers, affectations, planning)
- Statistiques globales
- Géolocalisation et calculs de distance (services dédiés)

## Prérequis
- Node.js >= 18
- MongoDB (local ou cloud)

## Installation
```bash
# Cloner le repo
$ git clone <repo-url>
$ cd projet-affectations-api

# Installer les dépendances
$ npm install
```

## Configuration
Créer un fichier `.env` à la racine avec :
```env
MONGODB_URI=mongodb://localhost:27017/affectations
PORT=3000
```

## Démarrage
- **Développement** (avec hot reload) :
  ```bash
  npm start
  ```
- **Production** :
  ```bash
  node server.js
  ```

## Structure du projet
```
projet-affectations-api/
├── server.js                # Point d'entrée Express
├── seed.js                  # Script de seed MongoDB
├── src/
│   ├── config/              # Connexion DB, variables d'env
│   ├── controllers/         # Logique des routes (REST)
│   ├── models/              # Schémas Mongoose
│   ├── routes/              # Définition des endpoints
│   ├── services/            # Logique métier (affectation, PDF, géoloc, etc.)
│   └── utils/               # Fonctions utilitaires
└── test/                    # Tests API et logique métier
```

## Endpoints principaux

### Salariés (`/api/salaries`)
- `POST /` : Créer un salarié
- `GET /` : Lister tous les salariés
- `GET /:id` : Détail d'un salarié
- `PUT /:id` : Modifier un salarié
- `DELETE /:id` : Supprimer un salarié

### Chantiers (`/api/chantiers`)
- `POST /` : Créer un chantier
- `GET /` : Lister tous les chantiers
- `GET /:id` : Détail d'un chantier
- `PUT /:id` : Modifier un chantier
- `DELETE /:id` : Supprimer un chantier

### Affectations (`/api/affectations`)
- `GET /` : Lister toutes les affectations
- `POST /lancer-algorithme/:chantierId` : Lancer l'affectation automatique pour un chantier
- `POST /reset/:chantierId` : Réinitialiser l'affectation d'un chantier

### Exports (`/api/exports`)
- `GET /stats` : Statistiques globales
- `GET /chantiers-pdf` : Export PDF des chantiers
- `GET /affectations-pdf` : Export PDF des affectations
- `GET /planning-pdf?period=mois|trimestre` : Export PDF du planning

## Seed de la base
Pour remplir la base avec des données de test :
```bash
node seed.js
```

## Tests
- Lancer les tests avec :
  ```bash
  npm test
  ```
- Les tests utilisent Jest et Supertest.
- Les adresses utilisées dans les tests sont réelles (pas de données fictives).

## Contribution
Les contributions sont les bienvenues !
- Forkez le repo
- Créez une branche
- Proposez une PR

Pour toute question, ouvrez une issue ou contactez l'auteur. 