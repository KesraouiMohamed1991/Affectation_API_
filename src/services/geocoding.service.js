const axios = require('axios');
const { getCoordsFromAddress } = require('./geolocation.service');

async function geocodeAddress(address) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
    const response = await axios.get(url);
    if (response.data && response.data.length > 0) {
      const { lat, lon } = response.data[0];
      return { latitude: parseFloat(lat), longitude: parseFloat(lon) };
    } else {
      return null; // Address not found
    }
  } catch (error) {
    console.error('Error geocoding address:', error);
    throw error;
  }
}

module.exports = { geocodeAddress, getCoordsFromAddress };
