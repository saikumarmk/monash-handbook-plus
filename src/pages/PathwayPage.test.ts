import { describe, it, expect } from 'vitest'
import { getUnitLevel } from '@/types'

// Test data mimicking actual unit structures
const mockUnitsData = {
  'FIT3155': {
    code: 'FIT3155',
    title: 'Advanced data structures and algorithms',
    credit_points: '6',
    sca_band: '2',
    school: 'Faculty of Information Technology',
    requisites: {
      permission: false,
      prohibitions: [],
      corequisites: [],
      prerequisites: [{ NumReq: 1, units: ['FIT2004'] }],
      cp_required: 0
    }
  },
  'FIT2004': {
    code: 'FIT2004',
    title: 'Algorithms and data structures',
    credit_points: '6',
    sca_band: '2',
    school: 'Faculty of Information Technology',
    requisites: {
      permission: false,
      prohibitions: [],
      corequisites: [],
      prerequisites: [
        { NumReq: 1, units: ['FIT1008', 'FIT1054', 'FIT2085'] },
        { NumReq: 1, units: ['MAT1830', 'ENG1005', 'MTH1030'] }
      ],
      cp_required: 0
    }
  },
  'FIT1008': {
    code: 'FIT1008',
    title: 'Fundamentals of algorithms',
    credit_points: '6',
    sca_band: '2',
    school: 'Faculty of Information Technology',
    requisites: {
      permission: false,
      prohibitions: [],
      corequisites: [],
      prerequisites: [{ NumReq: 1, units: ['FIT1045', 'FIT1053'] }],
      cp_required: 0
    }
  },
  'FIT1045': {
    code: 'FIT1045',
    title: 'Introduction to programming',
    credit_points: '6',
    sca_band: '2',
    school: 'Faculty of Information Technology',
    requisites: null
  },
  'FIT1053': {
    code: 'FIT1053',
    title: 'Introduction to programming (Advanced)',
    credit_points: '6',
    sca_band: '2',
    school: 'Faculty of Information Technology',
    requisites: null
  },
  'ENG1005': {
    code: 'ENG1005',
    title: 'Engineering mathematics',
    credit_points: '6',
    sca_band: '1',
    school: 'Faculty of Engineering',
    requisites: null
  },
  'MAT1830': {
    code: 'MAT1830',
    title: 'Discrete mathematics for computer science',
    credit_points: '6',
    sca_band: '1',
    school: 'Faculty of Science',
    requisites: null
  },
  'MTH1030': {
    code: 'MTH1030',
    title: 'Techniques for modelling',
    credit_points: '6',
    sca_band: '1',
    school: 'Faculty of Science',
    requisites: null
  },
  'FIT1054': {
    code: 'FIT1054',
    title: 'Fundamentals of algorithms (Advanced)',
    credit_points: '6',
    sca_band: '2',
    school: 'Faculty of Information Technology',
    requisites: {
      permission: false,
      prohibitions: [],
      corequisites: [],
      prerequisites: [{ NumReq: 1, units: ['FIT1053'] }],
      cp_required: 0
    }
  },
  'FIT2085': {
    code: 'FIT2085',
    title: 'Fundamentals of algorithms for engineers',
    credit_points: '6',
    sca_band: '2',
    school: 'Faculty of Information Technology',
    requisites: null
  }
}

// Related prefixes for different disciplines
const RELATED_PREFIXES: Record<string, string[]> = {
  'FIT': ['FIT', 'MAT', 'MTH', 'STA'],
  'MAT': ['MAT', 'MTH', 'FIT', 'STA'],
  'MTH': ['MTH', 'MAT', 'FIT', 'STA'],
}

// Simplified version of the buildPath logic for testing (with smart heuristics)
function buildMinimalPath(
  targetCode: string, 
  unitsData: typeof mockUnitsData,
  plannerCodes: Set<string> = new Set()
): string[] {
  const result: string[] = []
  const visited = new Set<string>()
  
  const getPrefix = (code: string) => code.match(/^[A-Z]+/)?.[0] || ''
  
  const getPrereqDepth = (code: string, seen: Set<string> = new Set()): number => {
    if (seen.has(code)) return 0
    if (plannerCodes.has(code)) return 0
    
    const unit = unitsData[code as keyof typeof unitsData]
    if (!unit?.requisites?.prerequisites?.length) return 0
    
    seen.add(code)
    let maxDepth = 0
    
    for (const group of unit.requisites.prerequisites) {
      let minGroupDepth = Infinity
      for (const opt of group.units) {
        if (plannerCodes.has(opt)) {
          minGroupDepth = 0
          break
        }
        const optDepth = 1 + getPrereqDepth(opt, new Set(seen))
        minGroupDepth = Math.min(minGroupDepth, optDepth)
      }
      maxDepth = Math.max(maxDepth, minGroupDepth === Infinity ? 0 : minGroupDepth)
    }
    
    return maxDepth
  }
  
  const chooseBestOption = (options: string[], parentCode: string): string | null => {
    if (options.length === 0) return null
    if (options.length === 1) return options[0]
    
    for (const opt of options) {
      if (plannerCodes.has(opt)) return opt
    }
    
    const parentPrefix = getPrefix(parentCode)
    const relatedPrefixes = RELATED_PREFIXES[parentPrefix] || [parentPrefix]
    
    const scored = options
      .filter(opt => unitsData[opt as keyof typeof unitsData])
      .map(opt => {
        const optPrefix = getPrefix(opt)
        const depth = getPrereqDepth(opt)
        const level = getUnitLevel(opt)
        
        let score = 0
        const prefixIndex = relatedPrefixes.indexOf(optPrefix)
        if (prefixIndex >= 0) {
          score += (10 - prefixIndex) * 100
        }
        score -= depth * 10
        score -= level
        
        return { code: opt, score }
      })
      .sort((a, b) => b.score - a.score)
    
    return scored[0]?.code || options[0]
  }
  
  const buildRecursive = (code: string): void => {
    if (visited.has(code)) return
    if (plannerCodes.has(code)) return
    
    const unit = unitsData[code as keyof typeof unitsData]
    if (!unit) return
    
    visited.add(code)
    
    const prereqGroups = unit.requisites?.prerequisites || []
    
    for (const group of prereqGroups) {
      const bestOption = chooseBestOption(group.units, code)
      if (bestOption && !plannerCodes.has(bestOption)) {
        buildRecursive(bestOption)
      }
    }
    
    result.push(code)
  }
  
  buildRecursive(targetCode)
  return result
}

describe('Pathway Builder', () => {
  it('builds minimal path for FIT3155 with canonical choices', () => {
    const path = buildMinimalPath('FIT3155', mockUnitsData)
    
    // Should have 4-5 units depending on which programming prereq is chosen
    // Path could be: FIT2085 + MAT1830 + FIT2004 + FIT3155 (4 units, FIT2085 has no prereqs)
    // Or: FIT1045 + FIT1008 + MAT1830 + FIT2004 + FIT3155 (5 units)
    expect(path.length).toBeGreaterThanOrEqual(4)
    expect(path.length).toBeLessThanOrEqual(5)
    
    // Must include the target
    expect(path).toContain('FIT3155')
    
    // Must include FIT2004 (only prereq for FIT3155)
    expect(path).toContain('FIT2004')
    
    // Must have ONE valid programming prereq for FIT2004
    const hasProgPrereq = path.some(code => 
      ['FIT1008', 'FIT1054', 'FIT2085'].includes(code)
    )
    expect(hasProgPrereq).toBe(true)
    
    // Should only have ONE programming prereq (not multiple)
    const progCount = path.filter(code => 
      ['FIT1008', 'FIT1054', 'FIT2085'].includes(code)
    ).length
    expect(progCount).toBe(1)
    
    // Should prefer MAT1830 (MAT prefix is in RELATED_PREFIXES for FIT) over ENG1005
    expect(path).toContain('MAT1830')
    expect(path).not.toContain('ENG1005')
  })
  
  it('respects planner units as completed', () => {
    // If FIT1008 is already in planner, we don't need FIT1045
    const plannerCodes = new Set(['FIT1008'])
    const path = buildMinimalPath('FIT2004', mockUnitsData, plannerCodes)
    
    // Should NOT include FIT1008 or its prereqs
    expect(path).not.toContain('FIT1008')
    expect(path).not.toContain('FIT1045')
    
    // Should have: MAT1830 + FIT2004 = 2 units
    expect(path.length).toBe(2)
  })
  
  it('handles units with no prerequisites', () => {
    const path = buildMinimalPath('FIT1045', mockUnitsData)
    
    expect(path).toEqual(['FIT1045'])
  })
  
  it('picks from OR groups correctly', () => {
    // For FIT1008, should pick ONE of FIT1045 or FIT1053
    const path = buildMinimalPath('FIT1008', mockUnitsData)
    
    expect(path.length).toBe(2) // FIT1045/FIT1053 + FIT1008
    expect(path).toContain('FIT1008')
    
    // Should prefer FIT1045 (lower level than FIT1053)
    expect(path).toContain('FIT1045')
    expect(path).not.toContain('FIT1053')
  })
  
  it('uses smart heuristics for prefix matching', () => {
    // For FIT2004's math prereq, should prefer MAT/MTH over ENG
    const path = buildMinimalPath('FIT2004', mockUnitsData)
    
    // Should pick MAT1830 (MAT prefix) over ENG1005 (unrelated prefix)
    expect(path).toContain('MAT1830')
    expect(path).not.toContain('ENG1005')
  })
})

