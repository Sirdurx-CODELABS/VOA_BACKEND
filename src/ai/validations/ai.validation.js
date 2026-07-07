const Joi = require('joi');

const chat = Joi.object({
  patientId: Joi.string().optional(),
  phone: Joi.string().optional(),
  message: Joi.string().required().min(1).max(2000),
  channel: Joi.string().valid('whatsapp', 'web', 'mobile').optional(),
  stream: Joi.boolean().optional(),
});

const summary = Joi.object({
  chatId: Joi.string().required(),
});

const risk = Joi.object({
  message: Joi.string().required(),
  patientContext: Joi.object().optional(),
});

const translate = Joi.object({
  text: Joi.string().required().min(1).max(5000),
  targetLang: Joi.string().required().min(2).max(10),
  options: Joi.object().optional(),
});

const switchProvider = Joi.object({
  provider: Joi.string().valid('groq', 'gemini', 'openai', 'claude', 'huggingface').required(),
  patientId: Joi.string().optional(),
});

const patientRegister = Joi.object({
  userId: Joi.string().optional(),
  name: Joi.string().min(2).max(100).required(),
  phone: Joi.string().required(),
  age: Joi.number().integer().min(0).max(150).optional(),
  gender: Joi.string().valid('male', 'female', 'other').optional(),
  state: Joi.string().optional(),
  lga: Joi.string().optional(),
  hospital: Joi.string().optional(),
  diagnosis: Joi.object({
    hiv: Joi.boolean().optional(),
    tb: Joi.boolean().optional(),
    oi: Joi.boolean().optional(),
  }).optional(),
  artNumber: Joi.string().optional(),
  fileNumber: Joi.string().optional(),
  currentDrugs: Joi.string().optional(),
  preferredHospital: Joi.string().optional(),
  preferredDoctor: Joi.string().optional(),
  preferredConsultation: Joi.string().valid('online', 'in-person', '').optional(),
  emergencyContact: Joi.string().optional(),
  source: Joi.string().valid('whatsapp', 'web', 'mobile').optional(),
});

const doctorRegister = Joi.object({
  userId: Joi.string().optional(),
  name: Joi.string().min(2).max(100).required(),
  medicalLicense: Joi.string().required(),
  hospital: Joi.string().optional(),
  specialization: Joi.string().optional(),
  phone: Joi.string().required(),
  email: Joi.string().email().optional(),
  state: Joi.string().optional(),
  lga: Joi.string().optional(),
  languages: Joi.array().items(Joi.string()).optional(),
  consultationType: Joi.string().valid('online', 'physical', 'both').optional(),
  maxDailyPatients: Joi.number().integer().min(1).optional(),
  consultationFee: Joi.number().min(0).optional(),
  yearsOfExperience: Joi.number().integer().min(0).optional(),
  schedule: Joi.array().items(Joi.object({
    day: Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday').required(),
    isAvailable: Joi.boolean().required(),
    startTime: Joi.string().optional(),
    endTime: Joi.string().optional(),
    type: Joi.string().valid('online', 'physical', 'both', '').optional(),
  })).optional(),
});

const consultationRequest = Joi.object({
  patientId: Joi.string().required(),
  chatId: Joi.string().optional(),
  type: Joi.string().valid('online', 'in-person').required(),
  hospitalId: Joi.string().optional(),
  doctorId: Joi.string().optional(),
});

const consultationAction = Joi.object({
  consultationId: Joi.string().required(),
  notes: Joi.string().optional(),
  prescription: Joi.string().optional(),
  labRequests: Joi.string().optional(),
});

const consentUpdate = Joi.object({
  consultationId: Joi.string().required(),
  patientId: Joi.string().required(),
  consentType: Joi.string().valid('data_sharing', 'summary_sharing').required(),
  granted: Joi.boolean().required(),
  source: Joi.string().valid('whatsapp', 'web', 'mobile', 'api').optional(),
});

const hospitalSearch = Joi.object({
  state: Joi.string().optional(),
  lga: Joi.string().optional(),
  service: Joi.string().optional(),
  lat: Joi.number().optional(),
  lng: Joi.number().optional(),
  maxDistance: Joi.number().optional(),
});

module.exports = {
  chat, summary, risk, translate, switchProvider,
  patientRegister, doctorRegister,
  consultationRequest, consultationAction, consentUpdate,
  hospitalSearch,
};
