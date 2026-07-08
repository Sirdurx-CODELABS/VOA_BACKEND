const states = require('../data/nigeria-locations');
const refHospitals = require('../data/nigeria-hospitals');
const { success, error } = require('../utils/apiResponse');
const AIHospital = require('../ai/models/AIHospital');
const logger = require('../utils/logger');

exports.getStates = (req, res) => {
  const result = states.map(s => ({ name: s.name, code: s.code }));
  return success(res, result);
};

exports.getLGAs = (req, res) => {
  const stateName = req.params.state?.trim();
  if (!stateName) return error(res, 'State name is required', 400);

  const state = states.find(s =>
    s.name.toLowerCase() === stateName.toLowerCase() ||
    s.code.toLowerCase() === stateName.toLowerCase()
  );
  if (!state) return error(res, 'State not found', 404);

  return success(res, state.lgas);
};

exports.searchHospitalsByLocation = async (req, res, next) => {
  try {
    const { state, lga, service } = req.query;

    const filter = { isActive: true };
    if (state) filter.state = new RegExp(state, 'i');
    if (lga) filter.lga = new RegExp(lga, 'i');
    if (service) filter.services = { $in: [new RegExp(service, 'i')] };

    let hospitals = await AIHospital.find(filter)
      .select('name address state lga phone email services hasEmergency hasHivServices hasTbServices hasArtServices')
      .sort({ name: 1 })
      .lean();

    if (hospitals.length === 0) {
      hospitals = refHospitals.filter(h => {
        const matchState = !state || h.state.toLowerCase() === state.toLowerCase();
        const matchLga = !lga || h.lga.toLowerCase() === lga.toLowerCase();
        const matchService = !service || (
          (service === 'hiv' && h.hasHivServices) ||
          (service === 'tb' && h.hasTbServices) ||
          (service === 'art' && h.hasArtServices) ||
          (service === 'emergency' && h.hasEmergency)
        );
        return matchState && matchLga && matchService;
      });
    }

    const enriched = hospitals.map(h => ({
      _id: h._id || `ref_${h.name.replace(/\s+/g, '_').toLowerCase()}`,
      name: h.name,
      address: h.address || '',
      state: h.state,
      lga: h.lga,
      phone: h.phone || '',
      hasEmergency: h.hasEmergency || false,
      hasHivServices: h.hasHivServices || false,
      hasTbServices: h.hasTbServices || false,
      hasArtServices: h.hasArtServices || false,
      actions: {
        call: h.phone ? `tel:${h.phone}` : null,
        directions: `https://www.google.com/maps/search/${encodeURIComponent(h.name + ', ' + h.lga + ', ' + h.state)}`,
      },
    }));

    return success(res, enriched, 'Success', 200, {
      total: enriched.length,
      state: state || null,
      lga: lga || null,
      source: hospitals.length > 0 && !hospitals[0]._id?.toString().startsWith('ref_') ? 'database' : 'reference',
    });
  } catch (err) {
    logger.error(`Hospital search error: ${err.message}`);
    next(err);
  }
};
