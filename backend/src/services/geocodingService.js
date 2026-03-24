'use strict';
const axios = require('axios');

/**
 * Geocoding service using Nominatim (OpenStreetMap) - Free, no API key required
 */
class GeocodingService {
  constructor() {
    this.baseURL = 'https://nominatim.openstreetmap.org';
    this.userAgent = 'JanSamadhan/1.0 (civic-complaints-app)';
  }

  /**
   * Convert address to GPS coordinates
   * @param {string} address - The address to geocode
   * @param {string} country - Country code (default: 'IN' for India)
   * @returns {Promise<{latitude: number, longitude: number, formatted_address: string} | null>}
   */
  async geocodeAddress(address, country = 'IN') {
    if (!address || address.trim().length < 3) {
      return null;
    }

    try {
      // Clean and format the address
      const cleanAddress = address.trim();
      
      const response = await axios.get(`${this.baseURL}/search`, {
        params: {
          q: cleanAddress,
          format: 'json',
          countrycodes: country.toLowerCase(),
          limit: 1,
          addressdetails: 1
        },
        headers: {
          'User-Agent': this.userAgent
        },
        timeout: 5000 // 5 second timeout
      });

      if (response.data && response.data.length > 0) {
        const result = response.data[0];
        return {
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
          formatted_address: result.display_name,
          confidence: result.importance || 0.5
        };
      }

      return null;
    } catch (error) {
      console.error('Geocoding error:', error.message);
      return null;
    }
  }

  /**
   * Enhanced geocoding with fallback strategies
   * @param {Object} locationData - Location information from complaint
   * @returns {Promise<{latitude: number, longitude: number, formatted_address: string} | null>}
   */
  async geocodeComplaintLocation(locationData) {
    const { address, landmark, pincode, state_id, district_id, mandal_id } = locationData;

    // Strategy 1: Try full address first
    if (address) {
      const result = await this.geocodeAddress(address);
      if (result) return result;
    }

    // Strategy 2: Try address with landmark
    if (address && landmark) {
      const combinedAddress = `${address}, ${landmark}`;
      const result = await this.geocodeAddress(combinedAddress);
      if (result) return result;
    }

    // Strategy 3: Try address with pincode
    if (address && pincode) {
      const addressWithPin = `${address}, ${pincode}`;
      const result = await this.geocodeAddress(addressWithPin);
      if (result) return result;
    }

    // Strategy 4: Try just pincode
    if (pincode) {
      const result = await this.geocodeAddress(pincode);
      if (result) return result;
    }

    // Strategy 5: Try landmark only
    if (landmark) {
      const result = await this.geocodeAddress(landmark);
      if (result) return result;
    }

    return null;
  }

  /**
   * Reverse geocode GPS coordinates to state/district info
   * @param {number} latitude
   * @param {number} longitude
   * @returns {Promise<{state: string, district: string, formatted_address: string} | null>}
   */
  async reverseGeocode(latitude, longitude) {
    try {
      const response = await axios.get(`${this.baseURL}/reverse`, {
        params: { lat: latitude, lon: longitude, format: 'json', addressdetails: 1 },
        headers: { 'User-Agent': this.userAgent },
        timeout: 5000
      });
      if (!response.data?.address) return null;
      const addr = response.data.address;
      return {
        state: addr.state || null,
        district: addr.county || addr.state_district || addr.city_district || addr.suburb || null,
        city: addr.city || addr.town || addr.village || null,
        formatted_address: response.data.display_name || null
      };
    } catch (error) {
      console.error('Reverse geocoding error:', error.message);
      return null;
    }
  }

  /**
   * Validate GPS coordinates
   * @param {number} latitude 
   * @param {number} longitude 
   * @returns {boolean}
   */
  isValidCoordinates(latitude, longitude) {
    return (
      typeof latitude === 'number' && 
      typeof longitude === 'number' &&
      latitude >= -90 && latitude <= 90 &&
      longitude >= -180 && longitude <= 180 &&
      !isNaN(latitude) && !isNaN(longitude)
    );
  }
}

module.exports = new GeocodingService();