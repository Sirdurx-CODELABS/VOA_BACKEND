const RiskEngine = require('../services/RiskEngine');

describe('RiskEngine', () => {
  describe('quickAssess', () => {
    test('returns low for simple greeting', () => {
      const result = RiskEngine.quickAssess('Hello, how are you?');
      expect(result.level).toBe('low');
      expect(result.score).toBeLessThan(20);
    });

    test('returns emergency for critical symptoms', () => {
      const result = RiskEngine.quickAssess('I am coughing blood');
      expect(result.level).toBe('emergency');
      expect(result.score).toBeGreaterThanOrEqual(80);
    });

    test('returns high for stopped ART', () => {
      const result = RiskEngine.quickAssess('I stopped ART for two months');
      expect(result.level).toBe('high');
      expect(result.score).toBeGreaterThanOrEqual(60);
    });

    test('returns high for HIV+ missed doses', () => {
      const result = RiskEngine.quickAssess('I missed my medication for two weeks', { hivPositive: true });
      expect(result.level).toBe('high');
      expect(result.score).toBeGreaterThanOrEqual(70);
    });

    test('returns moderate for fever', () => {
      const result = RiskEngine.quickAssess('I have a fever and headache');
      expect(result.level).toBe('moderate');
    });

    test('amplifies score with duration', () => {
      const result = RiskEngine.quickAssess('I have had fever for 3 weeks');
      expect(result.score).toBeGreaterThanOrEqual(50);
    });

    test('returns 5 for no matching keywords', () => {
      const result = RiskEngine.quickAssess('I would like some information');
      expect(result.score).toBe(5);
    });

    test('detects triggers', () => {
      const result = RiskEngine.quickAssess('I have chest pain and difficulty breathing');
      expect(result.triggers.length).toBeGreaterThan(0);
      expect(result.triggers.some(t => t.level === 'emergency')).toBe(true);
    });
  });

  describe('getLevel', () => {
    test('emergency at 80+', () => expect(RiskEngine.getLevel(95)).toBe('emergency'));
    test('high at 60-79', () => expect(RiskEngine.getLevel(70)).toBe('high'));
    test('moderate at 20-59', () => expect(RiskEngine.getLevel(40)).toBe('moderate'));
    test('low under 20', () => expect(RiskEngine.getLevel(5)).toBe('low'));
  });
});
