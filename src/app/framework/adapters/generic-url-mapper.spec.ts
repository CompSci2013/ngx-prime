/**
 * GenericUrlMapper Tests
 *
 * Verifies that GenericUrlMapper produces identical output to AutomobileUrlMapper.
 * This is critical for the refactoring effort - we must have 100% parity before
 * replacing the legacy mapper.
 */

import { GenericUrlMapper } from './generic-url-mapper';
import { AutomobileUrlMapper } from '../../domain-config/automobile/adapters/automobile-url-mapper';
import { AUTOMOBILE_RESOURCE } from '../../domain-config/automobile/automobile.resource';
import { AutoSearchFilters } from '../../domain-config/automobile/models/automobile.filters';

describe('GenericUrlMapper', () => {
  let genericMapper: GenericUrlMapper<AutoSearchFilters>;
  let legacyMapper: AutomobileUrlMapper;

  beforeEach(() => {
    genericMapper = new GenericUrlMapper(AUTOMOBILE_RESOURCE);
    legacyMapper = new AutomobileUrlMapper();
  });

  describe('toUrlParams parity', () => {
    it('should handle empty filters', () => {
      const filters = new AutoSearchFilters();
      const genericResult = genericMapper.toUrlParams(filters);
      const legacyResult = legacyMapper.toUrlParams(filters);
      expect(genericResult).toEqual(legacyResult);
    });

    it('should handle manufacturer filter', () => {
      const filters = new AutoSearchFilters({ manufacturer: 'Ford' });
      const genericResult = genericMapper.toUrlParams(filters);
      const legacyResult = legacyMapper.toUrlParams(filters);
      expect(genericResult).toEqual(legacyResult);
    });

    it('should handle numeric yearMin', () => {
      const filters = new AutoSearchFilters({ yearMin: 2020 });
      const genericResult = genericMapper.toUrlParams(filters);
      const legacyResult = legacyMapper.toUrlParams(filters);
      expect(genericResult).toEqual(legacyResult);
    });

    it('should handle year range', () => {
      const filters = new AutoSearchFilters({ yearMin: 2020, yearMax: 2024 });
      const genericResult = genericMapper.toUrlParams(filters);
      const legacyResult = legacyMapper.toUrlParams(filters);
      expect(genericResult).toEqual(legacyResult);
    });

    it('should handle bodyClass array', () => {
      const filters = new AutoSearchFilters({ bodyClass: ['SUV', 'Truck'] });
      const genericResult = genericMapper.toUrlParams(filters);
      const legacyResult = legacyMapper.toUrlParams(filters);
      expect(genericResult).toEqual(legacyResult);
    });

    it('should handle bodyClass single value', () => {
      const filters = new AutoSearchFilters({ bodyClass: 'SUV' });
      const genericResult = genericMapper.toUrlParams(filters);
      const legacyResult = legacyMapper.toUrlParams(filters);
      expect(genericResult).toEqual(legacyResult);
    });

    it('should handle pagination', () => {
      const filters = new AutoSearchFilters({ page: 3, size: 25 });
      const genericResult = genericMapper.toUrlParams(filters);
      const legacyResult = legacyMapper.toUrlParams(filters);
      expect(genericResult).toEqual(legacyResult);
    });

    it('should handle sorting', () => {
      const filters = new AutoSearchFilters({ sort: 'year', sortDirection: 'desc' });
      const genericResult = genericMapper.toUrlParams(filters);
      const legacyResult = legacyMapper.toUrlParams(filters);
      expect(genericResult).toEqual(legacyResult);
    });

    it('should handle complex filters', () => {
      const filters = new AutoSearchFilters({
        manufacturer: 'Ford',
        model: 'F-150',
        yearMin: 2020,
        yearMax: 2024,
        bodyClass: ['Truck', 'SUV'],
        instanceCountMin: 10,
        instanceCountMax: 1000,
        search: 'extended cab',
        page: 2,
        size: 50,
        sort: 'year',
        sortDirection: 'desc'
      });
      const genericResult = genericMapper.toUrlParams(filters);
      const legacyResult = legacyMapper.toUrlParams(filters);
      expect(genericResult).toEqual(legacyResult);
    });

    it('should handle modelCombos', () => {
      const filters = new AutoSearchFilters({ modelCombos: 'Ford:F-150,Toyota:Camry' });
      const genericResult = genericMapper.toUrlParams(filters);
      const legacyResult = legacyMapper.toUrlParams(filters);
      expect(genericResult).toEqual(legacyResult);
    });

    it('should skip null values', () => {
      const filters = new AutoSearchFilters({ manufacturer: null as any, yearMin: 2020 });
      const genericResult = genericMapper.toUrlParams(filters);
      const legacyResult = legacyMapper.toUrlParams(filters);
      expect(genericResult).toEqual(legacyResult);
    });

    it('should skip undefined values', () => {
      const filters = new AutoSearchFilters({ manufacturer: undefined, yearMin: 2020 });
      const genericResult = genericMapper.toUrlParams(filters);
      const legacyResult = legacyMapper.toUrlParams(filters);
      expect(genericResult).toEqual(legacyResult);
    });
  });

  describe('fromUrlParams parity', () => {
    it('should handle empty params', () => {
      const params = {};
      const genericResult = genericMapper.fromUrlParams(params);
      const legacyResult = legacyMapper.fromUrlParams(params);
      expect(genericResult).toEqual(legacyResult);
    });

    it('should parse manufacturer', () => {
      const params = { manufacturer: 'Ford' };
      const genericResult = genericMapper.fromUrlParams(params);
      const legacyResult = legacyMapper.fromUrlParams(params);
      expect(genericResult.manufacturer).toEqual(legacyResult.manufacturer);
    });

    it('should parse yearMin as number', () => {
      const params = { yearMin: '2020' };
      const genericResult = genericMapper.fromUrlParams(params);
      const legacyResult = legacyMapper.fromUrlParams(params);
      expect(genericResult.yearMin).toEqual(legacyResult.yearMin);
      expect(typeof genericResult.yearMin).toBe('number');
    });

    it('should parse bodyClass comma-separated', () => {
      const params = { bodyClass: 'SUV,Truck' };
      const genericResult = genericMapper.fromUrlParams(params);
      const legacyResult = legacyMapper.fromUrlParams(params);
      expect(genericResult.bodyClass).toEqual(legacyResult.bodyClass);
    });

    it('should parse bodyClass single value as array', () => {
      const params = { bodyClass: 'SUV' };
      const genericResult = genericMapper.fromUrlParams(params);
      const legacyResult = legacyMapper.fromUrlParams(params);
      expect(genericResult.bodyClass).toEqual(legacyResult.bodyClass);
    });

    it('should parse sorting with URL param names', () => {
      const params = { sortBy: 'year', sortOrder: 'desc' };
      const genericResult = genericMapper.fromUrlParams(params);
      const legacyResult = legacyMapper.fromUrlParams(params);
      expect(genericResult.sort).toEqual(legacyResult.sort);
      expect(genericResult.sortDirection).toEqual(legacyResult.sortDirection);
    });

    it('should ignore invalid numeric values', () => {
      const params = { yearMin: 'abc' };
      const genericResult = genericMapper.fromUrlParams(params);
      const legacyResult = legacyMapper.fromUrlParams(params);
      expect(genericResult.yearMin).toEqual(legacyResult.yearMin);
    });

    it('should validate sortDirection', () => {
      const params = { sortBy: 'year', sortOrder: 'invalid' };
      const genericResult = genericMapper.fromUrlParams(params);
      const legacyResult = legacyMapper.fromUrlParams(params);
      expect(genericResult.sortDirection).toEqual(legacyResult.sortDirection);
    });
  });

  describe('extractHighlights parity', () => {
    it('should extract h_manufacturer', () => {
      const params = { h_manufacturer: 'Tesla' };
      const genericResult = genericMapper.extractHighlights(params);
      const legacyResult = legacyMapper.extractHighlights(params);
      expect(genericResult).toEqual(legacyResult);
    });

    it('should extract multiple highlight params', () => {
      const params = { h_manufacturer: 'Ford', h_yearMin: '2020', h_yearMax: '2024' };
      const genericResult = genericMapper.extractHighlights(params);
      const legacyResult = legacyMapper.extractHighlights(params);
      expect(genericResult).toEqual(legacyResult);
    });

    it('should normalize pipes to commas', () => {
      const params = { h_manufacturer: 'Ford|Chevrolet' };
      const genericResult = genericMapper.extractHighlights(params);
      const legacyResult = legacyMapper.extractHighlights(params);
      expect(genericResult).toEqual(legacyResult);
    });

    it('should not include non-highlight params', () => {
      const params = { manufacturer: 'Ford', h_manufacturer: 'Tesla' };
      const genericResult = genericMapper.extractHighlights(params);
      const legacyResult = legacyMapper.extractHighlights(params);
      expect(genericResult).toEqual(legacyResult);
      expect(genericResult['manufacturer']).toBeUndefined();
    });
  });

  describe('validateUrlParams parity', () => {
    it('should validate valid params', () => {
      const params = { manufacturer: 'Ford', yearMin: '2020' };
      const genericResult = genericMapper.validateUrlParams(params);
      const legacyResult = legacyMapper.validateUrlParams(params);
      expect(genericResult.valid).toEqual(legacyResult.valid);
    });

    it('should catch invalid numeric', () => {
      const params = { yearMin: 'abc' };
      const genericResult = genericMapper.validateUrlParams(params);
      const legacyResult = legacyMapper.validateUrlParams(params);
      expect(genericResult.valid).toEqual(legacyResult.valid);
    });

    it('should catch invalid year range', () => {
      const params = { yearMin: '2024', yearMax: '2020' };
      const genericResult = genericMapper.validateUrlParams(params);
      const legacyResult = legacyMapper.validateUrlParams(params);
      expect(genericResult.valid).toEqual(legacyResult.valid);
    });

    it('should catch invalid sortOrder', () => {
      const params = { sortBy: 'year', sortOrder: 'invalid' };
      const genericResult = genericMapper.validateUrlParams(params);
      const legacyResult = legacyMapper.validateUrlParams(params);
      expect(genericResult.valid).toEqual(legacyResult.valid);
    });
  });

  describe('round-trip consistency', () => {
    it('should round-trip simple filters', () => {
      const original = new AutoSearchFilters({ manufacturer: 'Ford', yearMin: 2020 });
      const params = genericMapper.toUrlParams(original);
      const roundTrip = genericMapper.fromUrlParams(params);
      expect(roundTrip.manufacturer).toEqual(original.manufacturer);
      expect(roundTrip.yearMin).toEqual(original.yearMin);
    });

    it('should round-trip complex filters', () => {
      const original = new AutoSearchFilters({
        manufacturer: 'Ford',
        yearMin: 2020,
        yearMax: 2024,
        bodyClass: ['SUV', 'Truck'],
        page: 2,
        sort: 'year',
        sortDirection: 'desc'
      });
      const params = genericMapper.toUrlParams(original);
      const roundTrip = genericMapper.fromUrlParams(params);
      expect(roundTrip.manufacturer).toEqual(original.manufacturer);
      expect(roundTrip.yearMin).toEqual(original.yearMin);
      expect(roundTrip.yearMax).toEqual(original.yearMax);
      expect(roundTrip.bodyClass).toEqual(original.bodyClass);
      expect(roundTrip.page).toEqual(original.page);
      expect(roundTrip.sort).toEqual(original.sort);
      expect(roundTrip.sortDirection).toEqual(original.sortDirection);
    });
  });
});
