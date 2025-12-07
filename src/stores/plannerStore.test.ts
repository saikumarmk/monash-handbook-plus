import { describe, it, expect, beforeEach } from 'vitest'
import { usePlannerStore } from './plannerStore'
import type { ProcessedUnit } from '@/types'

const mockUnit: ProcessedUnit = {
  code: 'FIT1045',
  title: 'Algorithms and programming fundamentals in python',
  credit_points: '6',
  sca_band: '2',
  school: 'Faculty of Information Technology',
  academic_org: 'Faculty of IT',
}

const mockUnit2: ProcessedUnit = {
  code: 'FIT2004',
  title: 'Algorithms and data structures',
  credit_points: '6',
  sca_band: '2',
  school: 'Faculty of Information Technology',
  academic_org: 'Faculty of IT',
}

const mockUnitNoSca: ProcessedUnit = {
  code: 'TEST1000',
  title: 'Test Unit',
  credit_points: '6',
  sca_band: undefined as unknown as string,
  school: 'Test School',
  academic_org: 'Test Org',
}

describe('usePlannerStore', () => {
  beforeEach(() => {
    // Reset store before each test
    usePlannerStore.getState().clearAll()
  })

  describe('addUnit', () => {
    it('adds a unit to the planner', () => {
      const { addUnit, units } = usePlannerStore.getState()
      addUnit(mockUnit)
      
      const state = usePlannerStore.getState()
      expect(state.units).toHaveLength(1)
      expect(state.units[0].code).toBe('FIT1045')
    })

    it('does not add duplicate units', () => {
      const { addUnit } = usePlannerStore.getState()
      addUnit(mockUnit)
      addUnit(mockUnit)
      
      const state = usePlannerStore.getState()
      expect(state.units).toHaveLength(1)
    })

    it('can add multiple different units', () => {
      const { addUnit } = usePlannerStore.getState()
      addUnit(mockUnit)
      addUnit(mockUnit2)
      
      const state = usePlannerStore.getState()
      expect(state.units).toHaveLength(2)
    })

    it('handles units without sca_band', () => {
      const { addUnit } = usePlannerStore.getState()
      addUnit(mockUnitNoSca)
      
      const state = usePlannerStore.getState()
      expect(state.units).toHaveLength(1)
      expect(state.units[0].scaBand).toBeUndefined()
    })
  })

  describe('removeUnit', () => {
    it('removes a unit from the planner', () => {
      const { addUnit, removeUnit } = usePlannerStore.getState()
      addUnit(mockUnit)
      removeUnit('FIT1045')
      
      const state = usePlannerStore.getState()
      expect(state.units).toHaveLength(0)
    })

    it('does nothing when removing non-existent unit', () => {
      const { addUnit, removeUnit } = usePlannerStore.getState()
      addUnit(mockUnit)
      removeUnit('NONEXISTENT')
      
      const state = usePlannerStore.getState()
      expect(state.units).toHaveLength(1)
    })
  })

  describe('hasUnit', () => {
    it('returns true when unit exists', () => {
      const { addUnit } = usePlannerStore.getState()
      addUnit(mockUnit)
      
      const state = usePlannerStore.getState()
      expect(state.hasUnit('FIT1045')).toBe(true)
    })

    it('returns false when unit does not exist', () => {
      const state = usePlannerStore.getState()
      expect(state.hasUnit('FIT1045')).toBe(false)
    })
  })

  describe('clearAll', () => {
    it('removes all units', () => {
      const { addUnit, clearAll } = usePlannerStore.getState()
      addUnit(mockUnit)
      addUnit(mockUnit2)
      clearAll()
      
      const state = usePlannerStore.getState()
      expect(state.units).toHaveLength(0)
    })
  })

  describe('getTotalCredits', () => {
    it('returns 0 when no units', () => {
      const state = usePlannerStore.getState()
      expect(state.getTotalCredits()).toBe(0)
    })

    it('returns correct total for one unit', () => {
      const { addUnit } = usePlannerStore.getState()
      addUnit(mockUnit)
      
      const state = usePlannerStore.getState()
      expect(state.getTotalCredits()).toBe(6)
    })

    it('returns correct total for multiple units', () => {
      const { addUnit } = usePlannerStore.getState()
      addUnit(mockUnit)
      addUnit(mockUnit2)
      
      const state = usePlannerStore.getState()
      expect(state.getTotalCredits()).toBe(12)
    })
  })

  describe('getTotalCost', () => {
    it('returns 0 when no units', () => {
      const state = usePlannerStore.getState()
      expect(state.getTotalCost()).toBe(0)
    })

    it('returns correct cost for units with sca_band', () => {
      const { addUnit } = usePlannerStore.getState()
      addUnit(mockUnit)
      
      const state = usePlannerStore.getState()
      expect(state.getTotalCost()).toBeGreaterThan(0)
    })

    it('returns 0 for units without sca_band', () => {
      const { addUnit } = usePlannerStore.getState()
      addUnit(mockUnitNoSca)
      
      const state = usePlannerStore.getState()
      expect(state.getTotalCost()).toBe(0)
    })
  })
})


