const fetch = require('node-fetch');

// Calcule la distance en kilomètres entre deux points GPS (Haversine)
function getDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Géocode une adresse en coordonnées GPS via Nominatim (OpenStreetMap, gratuit)
async function getCoordsFromAddress(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'AffectationsApp/1.0' }
  });
  if (!res.ok) throw new Error('Erreur lors de la requête Nominatim');
  const data = await res.json();
  if (!data || !data[0]) throw new Error('Adresse non trouvée');
  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon)
  };
}

module.exports = {
  getDistanceKm,
  getCoordsFromAddress
}; 