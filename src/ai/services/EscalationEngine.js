/**
 * EscalationEngine — Determines when to escalate conversations to doctors.
 * Triggers on high risk, emergency symptoms, low AI confidence, or explicit patient request.
 */

const ESCALATION_TRIGGERS = {
  emergency: {
    autoEscalate: true,
    action: 'call_emergency_services',
    message: '🚨 This appears to be a medical emergency. Please call emergency services immediately or go to the nearest hospital.',
    notifyDoctor: true,
    priority: 1,
  },
  high: {
    autoEscalate: true,
    action: 'recommend_doctor_urgent',
    message: 'Based on what you have described, I strongly recommend speaking with a healthcare professional as soon as possible.',
    notifyDoctor: true,
    priority: 2,
  },
  moderate: {
    autoEscalate: false,
    action: 'recommend_clinic_visit',
    message: 'I recommend visiting a clinic for a check-up. Would you like me to find a nearby hospital?',
    notifyDoctor: false,
    priority: 3,
  },
  low: {
    autoEscalate: false,
    action: 'provide_education',
    message: null,
    notifyDoctor: false,
    priority: 4,
  },
};

const EXPLICIT_ESCALATION_PHRASES = [
  'talk to a doctor', 'speak to a doctor', 'see a doctor', 'need a doctor',
  'talk to a nurse', 'speak to a nurse',
  'i need help', 'emergency', 'help me please',
  'book appointment', 'schedule consultation',
  'transfer to human', 'talk to human', 'speak to human',
  'connect me to', 'i want to see',
];

class EscalationEngine {
  constructor(aiRouter) {
    this.aiRouter = aiRouter;
  }

  evaluate(message, patientContext = {}, riskResult = {}) {
    const lower = message.toLowerCase();
    const shouldEscalate = {
      autoEscalate: false,
      explicitRequest: false,
      riskBased: false,
      reasons: [],
    };

    // Explicit patient request to speak to a doctor
    for (const phrase of EXPLICIT_ESCALATION_PHRASES) {
      if (lower.includes(phrase)) {
        shouldEscalate.explicitRequest = true;
        shouldEscalate.reasons.push(`Patient explicitly requested: "${phrase}"`);
        break;
      }
    }

    // Risk-based escalation
    const level = riskResult.level || 'low';
    const trigger = ESCALATION_TRIGGERS[level] || ESCALATION_TRIGGERS.low;

    if (trigger.autoEscalate) {
      shouldEscalate.autoEscalate = true;
      shouldEscalate.riskBased = true;
      shouldEscalate.reasons.push(`Risk level '${level}' triggered auto-escalation`);
    }

    // Adherence issues (HIV/TB medication)
    if (riskResult.triggers?.some(t => t === 'hiv_adherence_issue')) {
      shouldEscalate.reasons.push('Medication adherence concern detected');
    }

    // History amplification: if patient keeps reporting same symptoms
    if (patientContext.repeatedComplaint) {
      shouldEscalate.reasons.push('Repeated complaint of same symptoms');
      shouldEscalate.autoEscalate = true;
    }

    const shouldEscalateFinal = shouldEscalate.autoEscalate || shouldEscalate.explicitRequest;

    return {
      shouldEscalate: shouldEscalateFinal,
      ...shouldEscalate,
      action: trigger.action,
      escalationMessage: trigger.escalationMessage,
      notifyDoctor: trigger.notifyDoctor && shouldEscalateFinal,
      level,
      priority: trigger.priority,
      riskScore: riskResult.score || 0,
    };
  }

  async generateEscalationSummary(patient, chat, riskResult) {
    const patientMsgs = chat.messages
      .filter(m => m.sender === 'patient')
      .map(m => m.message)
      .join(' | ');

    return {
      patientId: patient._id,
      patientName: patient.name,
      age: patient.age || 'N/A',
      gender: patient.gender || 'N/A',
      diagnosis: patient.diagnosis || {},
      riskScore: riskResult.score || 0,
      riskLevel: riskResult.level || 'low',
      keySymptoms: patientMsgs.substring(0, 300),
      escalationReasons: riskResult.triggers || [],
      timestamp: new Date(),
    };
  }
}

module.exports = EscalationEngine;
