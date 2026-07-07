/**
 * RiskEngine — Evaluates medical risk based on symptoms and patient context.
 * Provides both keyword-based and AI-assisted risk assessment.
 */

const EMERGENCY_KEYWORDS = [
  'coughing blood', 'unconscious', 'not breathing', 'severe bleeding',
  'chest pain', 'difficulty breathing', 'suicidal', 'overdose',
  'severe allergic reaction', 'head injury', 'poisoning',
  'stroke', 'cannot wake', 'blue lips', 'choking', 'drowning',
];

const HIGH_RISK_KEYWORDS = [
  'stopped art', 'missed dose', 'weight loss', 'night sweats',
  'persistent cough', 'blood in stool', 'severe pain',
  'high fever', 'confusion', 'seizure', 'vomiting blood',
  'severe headache', 'stiff neck', 'dehydration',
];

const MODERATE_RISK_KEYWORDS = [
  'fever', 'headache', 'diarrhea', 'rash', 'fatigue',
  'swollen glands', 'sore throat', 'muscle pain', 'joint pain',
  'loss of appetite', 'nausea', 'vomiting', 'abdominal pain',
  'cough', 'runny nose', 'body ache',
];

class RiskEngine {
  /**
   * Quick keyword-based risk assessment (always runs, no API call needed)
   */
  static quickAssess(message, patientContext = {}) {
    const lower = message.toLowerCase();
    let score = 0;
    const triggers = [];

    // Check emergency keywords (score 80-100)
    for (const kw of EMERGENCY_KEYWORDS) {
      if (lower.includes(kw)) {
        score = Math.max(score, 95);
        triggers.push({ keyword: kw, level: 'emergency' });
      }
    }

    // Check high risk keywords (score 60-79)
    if (score < 80) {
      for (const kw of HIGH_RISK_KEYWORDS) {
        if (lower.includes(kw)) {
          score = Math.max(score, 70);
          triggers.push({ keyword: kw, level: 'high' });
        }
      }
    }

    // Check moderate risk keywords (score 20-59)
    if (score < 60) {
      for (const kw of MODERATE_RISK_KEYWORDS) {
        if (lower.includes(kw)) {
          score = Math.max(score, 40);
          triggers.push({ keyword: kw, level: 'moderate' });
        }
      }
    }

    // HIV positive + missed doses → high risk
    if (patientContext.hivPositive && /\b(miss\w*|stop\w*|skip\w*|forgot\w*)\b/.test(lower) &&
        /\b(dose|drug|medication|art|medicine|pill|treatment)\b/.test(lower)) {
      score = Math.max(score, 75);
      triggers.push({ keyword: 'hiv_adherence_issue', level: 'high' });
    }

    // Duration amplification (only when a number precedes the duration word)
    if (score >= 20 && /\d+\s*(week|month|year)s?\b/.test(lower)) {
      score = Math.min(score + 10, 100);
    }

    if (score === 0) score = 5;

    const level = score >= 80 ? 'emergency' : score >= 60 ? 'high' : score >= 20 ? 'moderate' : 'low';

    return { score, level, triggers };
  }

  /**
   * Full risk assessment using AI provider (async, richer analysis)
   */
  static async fullAssess(aiRouter, message, patientContext = {}) {
    const quick = this.quickAssess(message, patientContext);

    // For low risk, no need to call AI
    if (quick.level === 'low' && !patientContext.diagnosis) {
      return {
        ...quick,
        explanation: 'Low risk symptoms detected.',
        recommendation: 'Provide health education and monitor symptoms.',
        source: 'keyword',
      };
    }

    try {
      const providerNames = quick.level === 'emergency' || quick.level === 'high'
        ? ['openai', 'claude', 'gemini']
        : ['groq', 'gemini'];

      const provider = aiRouter.getAvailable(providerNames);
      if (!provider) throw new Error('No suitable provider available');

      const contextStr = Object.entries(patientContext)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');

      const prompt = `You are a medical triage risk assessment system. Analyze these symptoms and patient context.

Return a JSON object with these fields (ONLY valid JSON, no markdown):
{
  "riskLevel": "low|moderate|high|emergency",
  "riskScore": <number 0-100>,
  "explanation": "<brief explanation of risk factors>",
  "recommendation": "<what the patient should do>",
  "triggers": ["<key risk factors identified>"]
}

Symptoms: ${message}
${contextStr ? `Patient Context: ${contextStr}` : ''}`;

      const result = await provider.generateResponse(
        [{ role: 'user', content: prompt }],
        { temperature: 0.1, maxTokens: 500 }
      );

      let parsed;
      try {
        // Extract JSON from response
        const jsonMatch = result.content.match(/\{[\s\S]*\}/);
        parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      } catch {
        parsed = null;
      }

      if (parsed && parsed.riskLevel && parsed.riskScore !== undefined) {
        return {
          score: parsed.riskScore,
          level: parsed.riskLevel,
          triggers: parsed.triggers || [],
          explanation: parsed.explanation || '',
          recommendation: parsed.recommendation || '',
          source: 'ai',
          aiProvider: provider.name,
        };
      }

      // Fallback to quick assessment if AI parsing fails
      return {
        ...quick,
        explanation: 'Based on symptom keywords identified.',
        recommendation: quick.level === 'low'
          ? 'Monitor symptoms. Consult doctor if they persist.'
          : quick.level === 'moderate'
            ? 'Schedule a clinic visit.'
            : 'Seek immediate medical attention.',
        source: 'keyword_fallback',
      };
    } catch {
      // Fallback to quick assessment on any error
      return {
        ...quick,
        explanation: 'Based on symptom keywords identified.',
        recommendation: 'Please consult a healthcare professional for proper evaluation.',
        source: 'keyword_fallback',
      };
    }
  }

  static getLevel(score) {
    if (score >= 80) return 'emergency';
    if (score >= 60) return 'high';
    if (score >= 20) return 'moderate';
    return 'low';
  }
}

module.exports = RiskEngine;
