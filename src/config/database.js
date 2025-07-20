const mongoose = require('mongoose');
const env = require('./env');

const connectDB = async () => {
  try {
    await mongoose.connect(env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connexion à MongoDB réussie !');
  } catch (error) {
    console.error('Erreur de connexion à MongoDB :', error);
    process.exit(1); // Quitte l'application en cas d'échec de la connexion
  }
};

module.exports = connectDB;
