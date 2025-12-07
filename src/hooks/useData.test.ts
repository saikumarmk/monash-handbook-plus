import { describe, it, expect } from 'vitest'

// Test the prerequisite checking logic directly
// This mirrors the checkPrerequisitesMet function

interface PrereqGroup {
  NumReq: number
  units: string[]
}

interface Requisites {
  prerequisites: PrereqGroup[]
}

function checkPrerequisitesMet(
  requisites: Requisites | null | undefined,
  plannerSet: Set<string>
): { met: boolean; missingGroups: Array<{ needed: number; options: string[] }> } {
  if (!requisites || !requisites.prerequisites || requisites.prerequisites.length === 0) {
    return { met: true, missingGroups: [] }
  }
  
  const missingGroups: Array<{ needed: number; options: string[] }> = []
  
  for (const group of requisites.prerequisites) {
    const unitsInPlanner = group.units.filter(u => plannerSet.has(u))
    const needed = group.NumReq
    
    if (unitsInPlanner.length < needed) {
      const stillNeeded = needed - unitsInPlanner.length
      const options = group.units.filter(u => !plannerSet.has(u))
      missingGroups.push({ needed: stillNeeded, options })
    }
  }
  
  return {
    met: missingGroups.length === 0,
    missingGroups
  }
}

describe('checkPrerequisitesMet', () => {
  describe('no prerequisites', () => {
    it('returns met for null requisites', () => {
      const result = checkPrerequisitesMet(null, new Set(['FIT1045']))
      expect(result.met).toBe(true)
      expect(result.missingGroups).toHaveLength(0)
    })

    it('returns met for empty prerequisites array', () => {
      const result = checkPrerequisitesMet({ prerequisites: [] }, new Set(['FIT1045']))
      expect(result.met).toBe(true)
    })
  })

  describe('single prerequisite group', () => {
    const singleGroupReq: Requisites = {
      prerequisites: [
        { NumReq: 1, units: ['FIT1045', 'FIT1008'] }
      ]
    }

    it('returns met when one unit from group is in planner', () => {
      const result = checkPrerequisitesMet(singleGroupReq, new Set(['FIT1045']))
      expect(result.met).toBe(true)
    })

    it('returns met when both units from group are in planner', () => {
      const result = checkPrerequisitesMet(singleGroupReq, new Set(['FIT1045', 'FIT1008']))
      expect(result.met).toBe(true)
    })

    it('returns not met when no units from group are in planner', () => {
      const result = checkPrerequisitesMet(singleGroupReq, new Set(['MTH1030']))
      expect(result.met).toBe(false)
      expect(result.missingGroups).toHaveLength(1)
      expect(result.missingGroups[0].needed).toBe(1)
      expect(result.missingGroups[0].options).toContain('FIT1045')
      expect(result.missingGroups[0].options).toContain('FIT1008')
    })
  })

  describe('multiple prerequisite groups (AND between groups)', () => {
    // FIT2014 style: need one from group1 AND one from group2
    const multiGroupReq: Requisites = {
      prerequisites: [
        { NumReq: 1, units: ['FIT1008', 'FIT1054', 'FIT2085'] },
        { NumReq: 1, units: ['MAT1830', 'MTH1035'] }
      ]
    }

    it('returns met when both groups satisfied', () => {
      const result = checkPrerequisitesMet(multiGroupReq, new Set(['FIT1008', 'MAT1830']))
      expect(result.met).toBe(true)
    })

    it('returns not met when only first group satisfied', () => {
      const result = checkPrerequisitesMet(multiGroupReq, new Set(['FIT1008']))
      expect(result.met).toBe(false)
      expect(result.missingGroups).toHaveLength(1)
      expect(result.missingGroups[0].options).toContain('MAT1830')
    })

    it('returns not met when only second group satisfied', () => {
      const result = checkPrerequisitesMet(multiGroupReq, new Set(['MAT1830']))
      expect(result.met).toBe(false)
      expect(result.missingGroups).toHaveLength(1)
      expect(result.missingGroups[0].options).toContain('FIT1008')
    })

    it('returns not met when neither group satisfied', () => {
      const result = checkPrerequisitesMet(multiGroupReq, new Set(['MTH2021']))
      expect(result.met).toBe(false)
      expect(result.missingGroups).toHaveLength(2)
    })
  })

  describe('group requiring multiple units', () => {
    const multiReqGroup: Requisites = {
      prerequisites: [
        { NumReq: 2, units: ['FIT1045', 'FIT1008', 'FIT2004'] }
      ]
    }

    it('returns met when 2 of 3 units in planner', () => {
      const result = checkPrerequisitesMet(multiReqGroup, new Set(['FIT1045', 'FIT1008']))
      expect(result.met).toBe(true)
    })

    it('returns met when all 3 units in planner', () => {
      const result = checkPrerequisitesMet(multiReqGroup, new Set(['FIT1045', 'FIT1008', 'FIT2004']))
      expect(result.met).toBe(true)
    })

    it('returns not met when only 1 of required 2', () => {
      const result = checkPrerequisitesMet(multiReqGroup, new Set(['FIT1045']))
      expect(result.met).toBe(false)
      expect(result.missingGroups[0].needed).toBe(1) // need 1 more
    })
  })

  describe('real-world FIT2014 scenario', () => {
    // Actual FIT2014 prerequisites
    const fit2014Req: Requisites = {
      prerequisites: [
        { 
          NumReq: 1, 
          units: ['FIT1008', 'FIT1054', 'FIT2085', 'MTH2021', 'MTH2140', 'MTH2141', 'MTH3140', 'MTH3141'] 
        },
        { 
          NumReq: 1, 
          units: ['ATS2866', 'MAT1830', 'MTH1035'] 
        }
      ]
    }

    it('returns met with FIT1008 and MAT1830', () => {
      const result = checkPrerequisitesMet(fit2014Req, new Set(['FIT1008', 'MAT1830']))
      expect(result.met).toBe(true)
    })

    it('returns met with MTH2021 and MAT1830', () => {
      const result = checkPrerequisitesMet(fit2014Req, new Set(['MTH2021', 'MAT1830']))
      expect(result.met).toBe(true)
    })

    it('returns not met with only FIT1008 (missing discrete maths)', () => {
      const result = checkPrerequisitesMet(fit2014Req, new Set(['FIT1008']))
      expect(result.met).toBe(false)
    })

    it('returns not met with only MAT1830 (missing programming)', () => {
      const result = checkPrerequisitesMet(fit2014Req, new Set(['MAT1830']))
      expect(result.met).toBe(false)
    })

    it('returns met with typical CS sequence', () => {
      // FIT1045, FIT1008, FIT2004, MTH1030, MAT1830, MTH2021, MTH2010, MTH2140
      const csSequence = new Set([
        'FIT1045', 'FIT1008', 'FIT2004', 
        'MTH1030', 'MAT1830', 
        'MTH2021', 'MTH2010', 'MTH2140'
      ])
      const result = checkPrerequisitesMet(fit2014Req, csSequence)
      expect(result.met).toBe(true)
    })
  })
})

