import { describe, it, expect } from 'vitest'
import { getUnitCost, getUnitLevel, getFacultyPrefix, isUnitCode, SCA_BAND_COSTS, getPrereqDepth, ProcessedUnit } from './index'

describe('getUnitCost', () => {
  it('returns correct cost for Band 1 (6CP)', () => {
    const cost = getUnitCost('1', 6)
    expect(cost).toBe(SCA_BAND_COSTS['1']) // $578 per 6CP
  })

  it('returns correct cost for Band 2 (6CP)', () => {
    const cost = getUnitCost('2', 6)
    expect(cost).toBe(SCA_BAND_COSTS['2']) // $1062 per 6CP
  })

  it('returns correct cost for Band 3 (6CP)', () => {
    const cost = getUnitCost('Band 3', 6)
    expect(cost).toBe(SCA_BAND_COSTS['3']) // $1687 per 6CP
  })

  it('returns correct cost for Band 4 (6CP)', () => {
    const cost = getUnitCost('4', 6)
    expect(cost).toBe(SCA_BAND_COSTS['4']) // $2124 per 6CP
  })

  it('handles 12 credit point units (doubles cost)', () => {
    const cost = getUnitCost('1', 12)
    expect(cost).toBe(Math.round(SCA_BAND_COSTS['1'] * 2)) // Double for 12CP
  })

  it('returns 0 for undefined scaBand', () => {
    const cost = getUnitCost(undefined, 6)
    expect(cost).toBe(0)
  })

  it('returns 0 for null scaBand', () => {
    const cost = getUnitCost(null, 6)
    expect(cost).toBe(0)
  })

  it('returns 0 for empty string scaBand', () => {
    const cost = getUnitCost('', 6)
    expect(cost).toBe(0)
  })

  it('returns 0 for invalid band number', () => {
    const cost = getUnitCost('Band 99', 6)
    expect(cost).toBe(0)
  })

  it('extracts band number from text like "Band 2"', () => {
    const cost = getUnitCost('Band 2', 6)
    expect(cost).toBe(SCA_BAND_COSTS['2']) // $1062 for 6CP
  })
})

describe('getUnitLevel', () => {
  it('extracts level 1 from FIT1045', () => {
    expect(getUnitLevel('FIT1045')).toBe(1)
  })

  it('extracts level 2 from FIT2004', () => {
    expect(getUnitLevel('FIT2004')).toBe(2)
  })

  it('extracts level 3 from MTH3051', () => {
    expect(getUnitLevel('MTH3051')).toBe(3)
  })

  it('extracts level 4 from ENG4000', () => {
    expect(getUnitLevel('ENG4000')).toBe(4)
  })

  it('handles lowercase codes', () => {
    expect(getUnitLevel('fit1045')).toBe(1)
  })

  it('returns 0 for invalid codes', () => {
    expect(getUnitLevel('INVALID')).toBe(0)
  })

  it('returns 0 for empty string', () => {
    expect(getUnitLevel('')).toBe(0)
  })
})

describe('getFacultyPrefix', () => {
  it('extracts FIT from FIT1045', () => {
    expect(getFacultyPrefix('FIT1045')).toBe('FIT')
  })

  it('extracts MTH from MTH3051', () => {
    expect(getFacultyPrefix('MTH3051')).toBe('MTH')
  })

  it('extracts ENG from ENG4000', () => {
    expect(getFacultyPrefix('ENG4000')).toBe('ENG')
  })

  it('handles 2-letter prefixes like EC', () => {
    expect(getFacultyPrefix('EC1000')).toBe('EC')
  })

  it('handles 4-letter prefixes like COMP', () => {
    expect(getFacultyPrefix('COMP2521')).toBe('COMP')
  })

  it('handles lowercase codes', () => {
    expect(getFacultyPrefix('fit1045')).toBe('FIT')
  })

  it('returns empty string for invalid codes', () => {
    expect(getFacultyPrefix('1234')).toBe('')
  })

  it('returns empty string for empty string', () => {
    expect(getFacultyPrefix('')).toBe('')
  })
})

describe('isUnitCode', () => {
  it('returns true for valid unit codes', () => {
    expect(isUnitCode('FIT1045')).toBe(true)
    expect(isUnitCode('MTH3051')).toBe(true)
    expect(isUnitCode('ENG4000')).toBe(true)
    expect(isUnitCode('ACB2120')).toBe(true)
  })

  it('returns true for lowercase codes', () => {
    expect(isUnitCode('fit1045')).toBe(true)
  })

  it('returns false for AOS codes', () => {
    expect(isUnitCode('ALGSFTWR01')).toBe(false)
    expect(isUnitCode('ACCNTCY05')).toBe(false)
    expect(isUnitCode('3DMODANI03')).toBe(false)
  })

  it('returns false for course codes', () => {
    expect(isUnitCode('C2001')).toBe(false)
    expect(isUnitCode('0020')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isUnitCode('')).toBe(false)
  })

  it('returns false for random strings', () => {
    expect(isUnitCode('hello')).toBe(false)
    expect(isUnitCode('12345')).toBe(false)
  })

  it('handles whitespace', () => {
    expect(isUnitCode(' FIT1045 ')).toBe(true)
  })
})

describe('getPrereqDepth', () => {
  const mockUnit = (code: string, prereqs: string[][] = []): ProcessedUnit => ({
    code,
    title: `Test ${code}`,
    credit_points: '6',
    sca_band: '2',
    school: 'Test School',
    academic_org: 'Test Org',
    requisites: prereqs.length > 0 ? {
      permission: false,
      prohibitions: [],
      corequisites: [],
      prerequisites: prereqs.map(units => ({ NumReq: 1, units })),
      cp_required: 0
    } : undefined
  })

  it('returns 0 for unit with no prerequisites', () => {
    const unitsData: Record<string, ProcessedUnit> = {
      'FIT1045': mockUnit('FIT1045')
    }
    expect(getPrereqDepth('FIT1045', unitsData)).toBe(0)
  })

  it('returns 1 for unit with one level of prerequisites', () => {
    const unitsData: Record<string, ProcessedUnit> = {
      'FIT1045': mockUnit('FIT1045'),
      'FIT1008': mockUnit('FIT1008', [['FIT1045']])
    }
    expect(getPrereqDepth('FIT1008', unitsData)).toBe(1)
  })

  it('returns 2 for unit with two levels of prerequisites', () => {
    const unitsData: Record<string, ProcessedUnit> = {
      'FIT1045': mockUnit('FIT1045'),
      'FIT1008': mockUnit('FIT1008', [['FIT1045']]),
      'FIT2004': mockUnit('FIT2004', [['FIT1008']])
    }
    expect(getPrereqDepth('FIT2004', unitsData)).toBe(2)
  })

  it('returns minimum depth when OR options exist', () => {
    const unitsData: Record<string, ProcessedUnit> = {
      'FIT1045': mockUnit('FIT1045'),
      'CSE1303': mockUnit('CSE1303'),
      'FIT1008': mockUnit('FIT1008', [['FIT1045']]),
      'FIT2085': mockUnit('FIT2085', [['CSE1303']]),
      // FIT2004 requires either FIT1008 (depth 1) or FIT2085 (depth 1)
      'FIT2004': mockUnit('FIT2004', [['FIT1008', 'FIT2085']])
    }
    // The minimum depth path is 2 (either FIT1045->FIT1008->FIT2004 or CSE1303->FIT2085->FIT2004)
    expect(getPrereqDepth('FIT2004', unitsData)).toBe(2)
  })

  it('handles multiple AND groups', () => {
    const unitsData: Record<string, ProcessedUnit> = {
      'FIT1045': mockUnit('FIT1045'),
      'MAT1830': mockUnit('MAT1830'),
      'FIT1008': mockUnit('FIT1008', [['FIT1045']]),
      // FIT2014 requires FIT1008 AND MAT1830
      'FIT2014': mockUnit('FIT2014', [['FIT1008'], ['MAT1830']])
    }
    // The max depth is 2 (FIT1045->FIT1008->FIT2014)
    expect(getPrereqDepth('FIT2014', unitsData)).toBe(2)
  })

  it('handles missing prerequisite data gracefully', () => {
    const unitsData: Record<string, ProcessedUnit> = {
      'FIT2004': mockUnit('FIT2004', [['FIT1008']]) // FIT1008 not in data
    }
    expect(getPrereqDepth('FIT2004', unitsData)).toBe(0)
  })

  it('returns 0 for unit not in data', () => {
    const unitsData: Record<string, ProcessedUnit> = {}
    expect(getPrereqDepth('FIT9999', unitsData)).toBe(0)
  })

  it('handles circular references gracefully', () => {
    const unitsData: Record<string, ProcessedUnit> = {
      'FIT1001': mockUnit('FIT1001', [['FIT1002']]),
      'FIT1002': mockUnit('FIT1002', [['FIT1001']])
    }
    // Should not infinite loop; circular refs return 2 as visited units contribute 0
    const result = getPrereqDepth('FIT1001', unitsData)
    expect(result).toBeGreaterThanOrEqual(0) // Just verify it doesn't infinite loop
    expect(result).toBeLessThanOrEqual(10) // Sanity check
  })
})

