const express = require('express');
const env = require('./src/config/env');
const connectDB = require('./src/config/database');

// Initialise l'application Express
const app = express();
const cors = require('cors');
const morgan = require('morgan');
app.use(morgan('dev'));
app.use(cors());
// Connexion à la base de données
connectDB();

// Middleware pour parser le JSON
app.use(express.json());

// Importation des routes
const salariesRoutes = require('./src/routes/salaries.routes');
const chantiersRoutes = require('./src/routes/chantiers.routes');
const affectationsRoutes = require('./src/routes/affectations.routes');
const exportsRoutes = require('./src/routes/exports.routes');

// Utilisation des routes
app.use('/api/salaries', salariesRoutes);
app.use('/api/chantiers', chantiersRoutes);
app.use('/api/affectations', affectationsRoutes);
app.use('/api/exports', exportsRoutes);

// Route de test
app.get('/', (req, res) => {
  res.send('API Affectations - Bienvenue !');
});

// Middleware de gestion d'erreur global (à placer ici)
app.use((err, req, res, next) => {
  console.error("Erreur Express:", err);
  res.status(err.status || 500).json({
    message: err.message || "Erreur serveur"
  });
});

if (require.main === module) {
  app.listen(env.PORT, () => {
    console.log(`Serveur démarré sur le port ${env.PORT}`);
  });
} else {
  module.exports = app;
}
