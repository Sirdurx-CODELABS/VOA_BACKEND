const ConsentService = require('../services/ConsentService');

describe('ConsentService', () => {
  describe('getDataSharingPrompt', () => {
    test('returns prompt with patient name and age', () => {
      const patient = { name: 'John', age: 25, artNumber: 'ART123', diagnosis: { hiv: true } };
      const prompt = ConsentService.getDataSharingPrompt(patient);
      expect(prompt.type).toBe('data_sharing');
      expect(prompt.details).toContain('Name');
      expect(prompt.details).toContain('ART Number');
      expect(prompt.options).toEqual(['YES', 'NO']);
    });
  });

  describe('getSummarySharingPrompt', () => {
    test('returns summary sharing consent', () => {
      const prompt = ConsentService.getSummarySharingPrompt();
      expect(prompt.type).toBe('summary_sharing');
      expect(prompt.details).toContain('summary of our conversation');
    });
  });

  describe('getShareableData', () => {
    test('includes ART number only for HIV patients', () => {
      const hivPatient = { name: 'John', age: 25, diagnosis: { hiv: true }, artNumber: 'ART123' };
      const data = ConsentService.getShareableData(hivPatient);
      expect(data.artNumber).toBe('ART123');
    });

    test('excludes ART number for non-HIV patients', () => {
      const nonHiv = { name: 'John', age: 25, diagnosis: {}, artNumber: '' };
      const data = ConsentService.getShareableData(nonHiv);
      expect(data.artNumber).toBeUndefined();
    });
  });

  describe('getFilteredPatientData', () => {
    test('returns consented fields for data_sharing', () => {
      const patient = { name: 'John', age: 25, gender: 'male', state: 'Lagos', lga: 'Ikeja', hospital: 'GH', artNumber: 'ART123', diagnosis: { hiv: true } };
      const data = ConsentService.getFilteredPatientData(patient, 'data_sharing');
      expect(data.name).toBe('John');
      expect(data.age).toBe(25);
      expect(data.state).toBe('Lagos');
      expect(data.lga).toBe('Ikeja');
    });
  });
});
