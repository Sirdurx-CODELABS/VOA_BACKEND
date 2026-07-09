const Joi = require('joi');

const registerStaff = Joi.object({
  fullName: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  phone: Joi.string().required(),
  role: Joi.string().valid('doctor', 'nurse', 'pharmacist', 'lab_scientist', 'adherence_counselor', 'case_manager', 'receptionist', 'data_officer', 'hospital_admin').required(),
  gender: Joi.string().valid('male', 'female', 'other').optional(),
  hospitalId: Joi.string().optional(),
  department: Joi.string().optional(),
  specialization: Joi.string().optional(),
  staffId: Joi.string().optional(),
  medicalLicense: Joi.string().optional(),
  consultationFee: Joi.number().min(0).optional(),
  maxDailyPatients: Joi.number().integer().min(1).optional(),
});

const recordTriage = Joi.object({
  triageCategory: Joi.string().valid('emergency', 'urgent', 'non_urgent', 'stable').required(),
  triageNotes: Joi.string().max(500).optional().allow(''),
  chiefComplaint: Joi.string().max(200).required(),
  painLevel: Joi.number().integer().min(0).max(10).optional(),
});

const recordVitals = Joi.object({
  weight: Joi.number().min(0).max(500).optional(),
  height: Joi.number().min(0).max(300).optional(),
  temperature: Joi.number().min(30).max(45).optional(),
  bloodPressureSystolic: Joi.number().min(50).max(300).optional(),
  bloodPressureDiastolic: Joi.number().min(30).max(200).optional(),
  pulse: Joi.number().min(0).max(300).optional(),
  respiration: Joi.number().min(0).max(100).optional(),
  oxygenSaturation: Joi.number().min(0).max(100).optional(),
  notes: Joi.string().max(500).optional().allow(''),
});

const reviewPrescription = Joi.object({
  status: Joi.string().valid('active', 'cancelled').required(),
  notes: Joi.string().max(500).optional().allow(''),
});

const dispensePrescription = Joi.object({
  items: Joi.array().items(Joi.object({
    medication: Joi.string().required(),
    quantity: Joi.number().integer().min(1).required(),
    instructions: Joi.string().optional().allow(''),
  })).optional(),
  counselingNotes: Joi.string().max(1000).optional().allow(''),
});

const collectSample = Joi.object({
  sampleType: Joi.string().required(),
  notes: Joi.string().max(500).optional().allow(''),
});

const uploadLabResult = Joi.object({
  tests: Joi.array().items(Joi.object({
    testName: Joi.string().required(),
    result: Joi.string().required(),
    referenceRange: Joi.string().optional().allow(''),
    unit: Joi.string().optional().allow(''),
    isCritical: Joi.boolean().optional(),
    notes: Joi.string().optional().allow(''),
  })).required(),
  notes: Joi.string().max(500).optional().allow(''),
});

const createCounselingSession = Joi.object({
  patient: Joi.string().required(),
  type: Joi.string().valid('adherence', 'initial', 'follow_up', 'disclosure', 'mental_health', 'other').required(),
  sessionDate: Joi.date().optional(),
  notes: Joi.string().max(2000).optional().allow(''),
  outcome: Joi.string().max(500).optional().allow(''),
  nextSessionDate: Joi.date().optional(),
  patientName: Joi.string().optional().allow(''),
});

const openCaseRecord = Joi.object({
  patient: Joi.string().required(),
  category: Joi.string().valid('clinical', 'psychosocial', 'nutritional', 'economic', 'other').required(),
  riskLevel: Joi.string().valid('low', 'medium', 'high', 'critical').required(),
  description: Joi.string().max(2000).optional().allow(''),
  notes: Joi.string().max(1000).optional().allow(''),
});

const checkInPatient = Joi.object({
  patient: Joi.string().required(),
  hospital: Joi.string().required(),
  department: Joi.string().optional(),
  visitType: Joi.string().valid('general', 'hiv', 'tb', 'mental_health', 'maternal', 'child', 'emergency', 'other').optional(),
  source: Joi.string().valid('walk_in', 'appointment', 'referral', 'emergency').optional(),
});

const transitionVisit = Joi.object({
  status: Joi.string().valid('checked_in', 'triaged', 'in_consultation', 'with_lab', 'with_pharmacy', 'admitted', 'discharged').required(),
  notes: Joi.string().max(500).optional().allow(''),
});

const dischargePatient = Joi.object({
  dischargeNotes: Joi.string().max(2000).optional().allow(''),
  followUpDate: Joi.date().optional(),
});

const createAppointment = Joi.object({
  patient: Joi.string().required(),
  doctor: Joi.string().required(),
  hospital: Joi.string().optional(),
  type: Joi.string().valid('online', 'in-person').optional(),
  date: Joi.string().required(),
  time: Joi.string().required(),
  reason: Joi.string().max(500).optional().allow(''),
  isWalkIn: Joi.boolean().optional(),
});

const updateAppointmentStatus = Joi.object({
  status: Joi.string().valid('scheduled', 'checked_in', 'in_progress', 'completed', 'cancelled').required(),
  notes: Joi.string().max(500).optional().allow(''),
});

module.exports = {
  registerStaff, recordTriage, recordVitals,
  reviewPrescription, dispensePrescription,
  collectSample, uploadLabResult,
  createCounselingSession, openCaseRecord,
  checkInPatient, transitionVisit, dischargePatient,
  createAppointment, updateAppointmentStatus,
};
