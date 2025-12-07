import { describe, it, expect } from 'vitest'
import { getUnitCost, getUnitLevel, getFacultyPrefix, isUnitCode, SCA_BAND_COSTS } from './index'

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

