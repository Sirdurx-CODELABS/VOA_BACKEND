const EscalationEngine = require('../services/EscalationEngine');

describe('EscalationEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new EscalationEngine(null);
  });

  describe('evaluate', () => {
    test('does not escalate low risk', () => {
      const result = engine.evaluate('I have a mild headache', {}, { level: 'low', score: 5 });
      expect(result.shouldEscalate).toBe(false);
    });

    test('auto-escalates emergency risk', () => {
      const result = engine.evaluate('Chest pain', {}, { level: 'emergency', score: 95 });
      expect(result.shouldEscalate).toBe(true);
      expect(result.action).toBe('call_emergency_services');
    });

    test('auto-escalates high risk', () => {
      const result = engine.evaluate('Stopped ART', {}, { level: 'high', score: 75 });
      expect(result.shouldEscalate).toBe(true);
      expect(result.action).toBe('recommend_doctor_urgent');
    });

    test('detects explicit escalation request', () => {
      const result = engine.evaluate('I need to talk to a doctor', {}, { level: 'low', score: 5 });
      expect(result.shouldEscalate).toBe(true);
      expect(result.explicitRequest).toBe(true);
    });

    test('moderate risk does not auto-escalate', () => {
      const result = engine.evaluate('Fever for 2 days', {}, { level: 'moderate', score: 40 });
      expect(result.autoEscalate).toBe(false);
    });

    test('tracks multiple escalation reasons', () => {
      const result = engine.evaluate(
        'I need to see a doctor immediately',
        {},
        { level: 'emergency', score: 90, triggers: ['chest_pain'] }
      );
      expect(result.reasons.length).toBeGreaterThanOrEqual(2);
    });
  });
});
