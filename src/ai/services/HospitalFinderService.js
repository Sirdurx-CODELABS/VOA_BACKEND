/**
 * HospitalFinderService — Searches for hospitals by location, service type,
 * and returns nearest hospitals with actions (book, maps, call, WhatsApp).
 */

const AIHospital = require('../models/AIHospital');
const AIDoctor = require('../models/AIDoctor');

class HospitalFinderService {
  async findByLocation({ state, lga, service, page = 1, limit = 20 }) {
    const filter = { isActive: true };
    if (state) filter.state = new RegExp(`^${state}$`, 'i');
    if (lga) filter.lga = new RegExp(`^${lga}$`, 'i');
    if (service) {
      filter.services = { $in: [new RegExp(service, 'i')] };
    }

    const [hospitals, total] = await Promise.all([
      AIHospital.find(filter)
        .sort({ name: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AIHospital.countDocuments(filter),
    ]);

    return {
      hospitals: this.enrichWithActions(hospitals),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async findNearest({ lat, lng, maxDistance = 10000, limit = 20 }) {
    if (!lat || !lng) return { hospitals: [], pagination: null };

    const results = await AIHospital.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [lng, lat] },
          distanceField: 'distance',
          maxDistance,
          spherical: true,
          query: { isActive: true },
        },
      },
      { $sort: { distance: 1 } },
      { $limit: limit },
    ]);

    return {
      hospitals: this.enrichWithActions(results),
    };
  }

  async getById(id) {
    const hospital = await AIHospital.findById(id).lean();
    if (!hospital) return null;

    const doctors = await AIDoctor.find({
      hospital: id,
      isAvailable: true,
    }).select('name specialization phone consultationType yearsOfExperience consultationFee').lean();

    return {
      ...this.enrichWithActions([hospital])[0],
      doctors,
    };
  }

  async getDoctors(hospitalId) {
    return AIDoctor.find({ hospital: hospitalId, isAvailable: true })
      .select('name specialization phone consultationType yearsOfExperience consultationFee email')
      .lean();
  }

  enrichWithActions(hospitals) {
    return hospitals.map(h => ({
      ...h,
      actions: {
        bookConsultation: `/api/ai/consultation/request`,
        openGoogleMaps: h.location?.coordinates
          ? `https://www.google.com/maps?q=${h.location.coordinates[1]},${h.location.coordinates[0]}`
          : null,
        openAppleMaps: h.location?.coordinates
          ? `https://maps.apple.com/?ll=${h.location.coordinates[1]},${h.location.coordinates[0]}`
          : null,
        openWaze: h.location?.coordinates
          ? `https://waze.com/ul?ll=${h.location.coordinates[1]},${h.location.coordinates[0]}&navigate=yes`
          : null,
        callHospital: h.phone ? `tel:${h.phone}` : null,
        whatsAppHospital: h.phone
          ? `https://wa.me/${h.phone.replace(/[^0-9]/g, '')}`
          : null,
        shareLocation: h.location?.coordinates
          ? `${h.location.coordinates[1]},${h.location.coordinates[0]}`
          : null,
      },
    }));
  }
}

module.exports = new HospitalFinderService();
