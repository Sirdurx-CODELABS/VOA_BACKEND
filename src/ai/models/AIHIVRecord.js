const mongoose = require('mongoose');

const viralLoadEntrySchema = new mongoose.Schema({
  value: { type: Number, required: true },
  collectionDate: { type: Date, required: true },
  resultDate: { type: Date },
  status: { type: String, enum: ['suppressed', 'unsuppressed', 'unknown'], default: 'unknown' },
  notes: { type: String, trim: true },
}, { _id: false });

const cd4EntrySchema = new mongoose.Schema({
  value: { type: Number, required: true },
  date: { type: Date, required: true },
  percentage: { type: Number },
  notes: { type: String, trim: true },
}, { _id: false });

const artRegimenSchema = new mongoose.Schema({
  regimen: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  lineOfTreatment: { type: String, enum: ['first', 'second', 'third'], default: 'first' },
  reasonForChange: { type: String, trim: true },
  isCurrent: { type: Boolean, default: false },
  notes: { type: String, trim: true },
}, { _id: false });

const oiSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['current', 'past'], default: 'past' },
  diagnosisDate: { type: Date },
  resolvedDate: { type: Date },
  notes: { type: String, trim: true },
}, { _id: false });

const allergySchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['drug', 'food', 'other'], default: 'drug' },
  severity: { type: String, enum: ['mild', 'moderate', 'severe', 'critical'], default: 'mild' },
  reaction: { type: String, trim: true },
  notes: { type: String, trim: true },
}, { _id: false });

const labResultSchema = new mongoose.Schema({
  testType: { type: String, required: true },
  testName: { type: String, required: true },
  value: { type: String },
  unit: { type: String },
  referenceRange: { type: String },
  date: { type: Date, required: true },
  notes: { type: String, trim: true },
}, { _id: false });

const medicationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['art', 'tb', 'other', 'supplement'], default: 'other' },
  dosage: { type: String },
  frequency: { type: String },
  startDate: { type: Date },
  endDate: { type: Date },
  isActive: { type: Boolean, default: true },
  prescribedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AIDoctor' },
  notes: { type: String, trim: true },
}, { _id: false });

const admissionSchema = new mongoose.Schema({
  reason: { type: String, required: true },
  hospital: { type: String },
  admissionDate: { type: Date },
  dischargeDate: { type: Date },
  notes: { type: String, trim: true },
}, { _id: false });

const hivRecordSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'AIPatient', required: true, unique: true },

  // ART Information
  artNumber: { type: String, trim: true },
  artStartDate: { type: Date },
  currentRegimen: { type: String, trim: true },
  currentLineOfTreatment: { type: String, enum: ['first', 'second', 'third', ''], default: '' },
  previousRegimens: [artRegimenSchema],
  drugResistanceHistory: { type: String, trim: true },
  missedMedicationHistory: { type: String, trim: true },
  medicationAdherence: { type: Number, min: 0, max: 100, default: 0 },

  // Viral Load
  viralLoads: [viralLoadEntrySchema],
  latestViralLoad: { type: Number },
  latestViralLoadDate: { type: Date },
  latestViralLoadStatus: { type: String, enum: ['suppressed', 'unsuppressed', 'unknown'], default: 'unknown' },

  // CD4
  cd4History: [cd4EntrySchema],
  latestCD4: { type: Number },
  latestCD4Date: { type: Date },
  lowestCD4: { type: Number },
  highestCD4: { type: Number },

  // Adherence
  appointmentAdherence: { type: Number, min: 0, max: 100, default: 0 },
  missedRefills: { type: Number, default: 0 },
  missedAppointments: { type: Number, default: 0 },
  latePickups: { type: Number, default: 0 },
  adherenceScore: { type: Number, min: 0, max: 100, default: 0 },

  // OIs
  opportunisticInfections: [oiSchema],
  tbHistory: { type: String, trim: true },
  hepatitisB: { type: String, trim: true },
  stiHistory: { type: String, trim: true },
  hospitalAdmissions: [admissionSchema],

  // Allergies
  allergies: [allergySchema],

  // Current Medications
  currentMedications: [medicationSchema],

  // Lab Results
  labResults: [labResultSchema],

  // Status
  currentStatus: { type: String, trim: true },
  treatmentStatus: { type: String, trim: true },
  primaryDiagnosis: { type: String, trim: true },
  secondaryDiagnosis: { type: String, trim: true },

  // Audit
  lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AIDoctor' },
  lastUpdatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

hivRecordSchema.index({ artNumber: 1 });

module.exports = mongoose.model('AIHIVRecord', hivRecordSchema);
