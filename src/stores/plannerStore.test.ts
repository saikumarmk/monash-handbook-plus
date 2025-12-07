import { describe, it, expect, beforeEach } from 'vitest'
import { usePlannerStore } from './plannerStore'
import type { ProcessedUnit, AreaOfStudy, Course } from '@/types'

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
      const { addUnit } = usePlannerStore.getState()
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

  describe('program tracking', () => {
    const mockAOS: AreaOfStudy = {
      course_code: 'COMPSCI01',
      course_title: 'Computer Science Major',
      total_credit_points: 48,
      requirement_groups: [],
      all_units: { 'FIT1045': 'Programming', 'FIT1008': 'Data Structures' },
      statistics: { total_requirements: 2, total_units: 2, max_depth: 1 }
    }

    const mockCourse: Course = {
      course_code: 'C2001',
      course_title: 'Bachelor of Computer Science',
      total_credit_points: 144,
      requirement_groups: [],
      all_units: { 'FIT1045': 'Programming' },
      statistics: { total_requirements: 1, total_units: 1, max_depth: 1 }
    }

    it('adds an AOS to tracked programs', () => {
      const { addProgram } = usePlannerStore.getState()
      addProgram(mockAOS, 'aos')
      
      const state = usePlannerStore.getState()
      expect(state.trackedPrograms).toHaveLength(1)
      expect(state.trackedPrograms[0].code).toBe('COMPSCI01')
      expect(state.trackedPrograms[0].type).toBe('aos')
    })

    it('adds a course to tracked programs', () => {
      const { addProgram } = usePlannerStore.getState()
      addProgram(mockCourse, 'course')
      
      const state = usePlannerStore.getState()
      expect(state.trackedPrograms).toHaveLength(1)
      expect(state.trackedPrograms[0].code).toBe('C2001')
      expect(state.trackedPrograms[0].type).toBe('course')
    })

    it('does not add duplicate programs', () => {
      const { addProgram } = usePlannerStore.getState()
      addProgram(mockAOS, 'aos')
      addProgram(mockAOS, 'aos')
      
      const state = usePlannerStore.getState()
      expect(state.trackedPrograms).toHaveLength(1)
    })

    it('removes a program', () => {
      const { addProgram, removeProgram } = usePlannerStore.getState()
      addProgram(mockAOS, 'aos')
      removeProgram('COMPSCI01')
      
      const state = usePlannerStore.getState()
      expect(state.trackedPrograms).toHaveLength(0)
    })

    it('hasProgram returns true when program exists', () => {
      const { addProgram } = usePlannerStore.getState()
      addProgram(mockAOS, 'aos')
      
      const state = usePlannerStore.getState()
      expect(state.hasProgram('COMPSCI01')).toBe(true)
    })

    it('hasProgram returns false when program does not exist', () => {
      const state = usePlannerStore.getState()
      expect(state.hasProgram('NONEXISTENT')).toBe(false)
    })

    it('clearPrograms removes all programs but keeps units', () => {
      const { addUnit, addProgram, clearPrograms } = usePlannerStore.getState()
      addUnit(mockUnit)
      addProgram(mockAOS, 'aos')
      clearPrograms()
      
      const state = usePlannerStore.getState()
      expect(state.trackedPrograms).toHaveLength(0)
      expect(state.units).toHaveLength(1)
    })

    it('clearAll removes both units and programs', () => {
      const { addUnit, addProgram, clearAll } = usePlannerStore.getState()
      addUnit(mockUnit)
      addProgram(mockAOS, 'aos')
      clearAll()
      
      const state = usePlannerStore.getState()
      expect(state.trackedPrograms).toHaveLength(0)
      expect(state.units).toHaveLength(0)
    })
  })
})


