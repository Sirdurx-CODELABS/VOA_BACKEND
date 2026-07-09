/**
 * ConversationMemoryService — Extracts and tracks structured information
 * from conversations: symptoms, medications, concerns, durations.
 */
class ConversationMemoryService {
  constructor() {
    this.symptomKeywords = [
      'fever', 'headache', 'cough', 'pain', 'fatigue', 'weakness', 'dizziness',
      'nausea', 'vomiting', 'diarrhea', 'constipation', 'rash', 'itching',
      'swelling', 'weight loss', 'weight gain', 'chills', 'sweating', 'night sweat',
      'sore throat', 'runny nose', 'congestion', 'shortness of breath', 'wheezing',
      'chest pain', 'back pain', 'joint pain', 'muscle pain', 'abdominal pain',
      'stomach ache', 'bloating', 'loss of appetite', 'increased appetite',
      'frequent urination', 'burning urination', 'blood in urine', 'blood in stool',
      'numbness', 'tingling', 'blurred vision', 'hearing loss', 'ear pain',
      'eye pain', 'tooth pain', 'mouth sore', 'difficulty swallowing',
      'palpitations', 'rapid heart rate', 'confusion', 'seizure', 'fainting',
      'anxiety', 'depression', 'insomnia', 'suicidal', 'mood swing',
    ];

    this.medicationKeywords = [
      'art', 'arv', 'tenofovir', 'lamivudine', 'dolutegravir', 'efavirenz',
      'nevirapine', 'zidovudine', 'abacavir', 'emtricitabine', 'rilpivirine',
      'coartem', 'artemether', 'lumefantrine', 'artesunate', 'amodiaquine',
      'metformin', 'glibenclamide', 'glimepiride', 'insulin',
      'amlodipine', 'lisinopril', 'losartan', 'hydrochlorothiazide',
      'salbutamol', 'albuterol', 'budesonide', 'beclomethasone',
      'paracetamol', 'acetaminophen', 'ibuprofen', 'aspirin',
      'amoxicillin', 'ciprofloxacin', 'azithromycin', 'doxycycline',
      'septrin', 'cotrimoxazole', 'fluconazole', 'clotrimazole',
      'vitamin', 'iron', 'zinc', 'folic acid', 'multivitamin',
      'prednisolone', 'dexamethasone',
    ];

    this.durationPatterns = [
      /(\d+)\s*(day|days|week|weeks|month|months|year|years)/i,
      /since\s+(.+)/i,
      /for\s+(\d+)/i,
    ];
  }

  extractFromMessage(message) {
    const lower = message.toLowerCase();
    const result = {
      symptoms: new Set(),
      medications: new Set(),
      durations: [],
      concerns: [],
    };

    for (const kw of this.symptomKeywords) {
      if (lower.includes(kw)) {
        result.symptoms.add(kw);
      }
    }

    for (const kw of this.medicationKeywords) {
      if (lower.includes(kw)) {
        result.medications.add(kw);
      }
    }

    for (const pattern of this.durationPatterns) {
      const match = lower.match(pattern);
      if (match) {
        result.durations.push(match[0]);
      }
    }

    if (/\b(worried|concerned|scared|afraid|nervous|anxious|stress)\b/.test(lower)) {
      result.concerns.push('emotional_distress');
    }

    return {
      symptoms: [...result.symptoms],
      medications: [...result.medications],
      durations: result.durations,
      concerns: result.concerns,
    };
  }

  merge(current, existing) {
    const symptoms = new Set([...(current.symptoms || []), ...(existing.symptoms || [])]);
    const medications = new Set([...(current.medications || []), ...(existing.medications || [])]);
    const durations = [...new Set([...(current.durations || []), ...(existing.durations || [])])];
    const concerns = [...new Set([...(current.concerns || []), ...(existing.concerns || [])])];

    return {
      symptoms: [...symptoms],
      medications: [...medications],
      durations,
      concerns,
      updatedAt: new Date().toISOString(),
    };
  }

  summarize(memory) {
    if (!memory || (!memory.symptoms?.length && !memory.medications?.length)) return '';

    const parts = [];
    if (memory.symptoms?.length) {
      parts.push(`Mentioned symptoms: ${memory.symptoms.join(', ')}`);
    }
    if (memory.medications?.length) {
      parts.push(`Mentioned medications: ${memory.medications.join(', ')}`);
    }
    if (memory.durations?.length) {
      parts.push(`Timeframes: ${memory.durations.join(', ')}`);
    }
    if (memory.concerns?.length) {
      parts.push('Patient has expressed emotional distress');
    }

    return parts.join('. ') + '.';
  }
}

module.exports = ConversationMemoryService;
