import { useState, useEffect, useMemo } from 'react'
import type { 
  ProcessedUnitsData, 
  AreasOfStudyData, 
  CoursesData, 
  NetworkData,
  ProcessedUnit
} from '@/types'

// Cache for loaded data
const dataCache: {
  units?: ProcessedUnitsData
  aos?: AreasOfStudyData
  courses?: CoursesData
  network?: NetworkData
} = {}

async function fetchData<T>(path: string, cacheKey: keyof typeof dataCache): Promise<T> {
  if (dataCache[cacheKey]) {
    return dataCache[cacheKey] as T
  }
  
  const response = await fetch(path)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.statusText}`)
  }
  
  const data = await response.json()
  dataCache[cacheKey] = data
  return data as T
}

export function useUnitsData() {
  const [data, setData] = useState<ProcessedUnitsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    fetchData<ProcessedUnitsData>('/data/processed_units.json', 'units')
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [])

  return { data, loading, error }
}

export function useAreasOfStudyData() {
  const [data, setData] = useState<AreasOfStudyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    fetchData<AreasOfStudyData>('/data/parsed_aos_full.json', 'aos')
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [])

  return { data, loading, error }
}

export function useCoursesData() {
  const [data, setData] = useState<CoursesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    fetchData<CoursesData>('/data/parsed_courses_full.json', 'courses')
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [])

  return { data, loading, error }
}

export function useNetworkData() {
  const [data, setData] = useState<NetworkData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    fetchData<NetworkData>('/data/network.json', 'network')
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [])

  return { data, loading, error }
}

// Hook to get a single unit with its unlocks
export function useUnit(code: string | undefined) {
  const { data: unitsData, loading: unitsLoading, error: unitsError } = useUnitsData()
  const { data: networkData, loading: networkLoading } = useNetworkData()
  
  const unit = useMemo(() => {
    if (!code || !unitsData) return null
    return unitsData[code.toUpperCase()] || null
  }, [code, unitsData])

  const unlocks = useMemo(() => {
    if (!code || !networkData) return []
    const node = networkData.nodes.find(n => n.id === code.toUpperCase())
    return node?.unlocks || []
  }, [code, networkData])

  const requires = useMemo(() => {
    if (!code || !networkData) return []
    const node = networkData.nodes.find(n => n.id === code.toUpperCase())
    return node?.requires || []
  }, [code, networkData])

  return {
    unit,
    unlocks,
    requires,
    loading: unitsLoading || networkLoading,
    error: unitsError,
  }
}

// Hook for searching units
export function useUnitSearch(query: string, filters?: {
  school?: string
  level?: number
  scaBand?: string
}) {
  const { data, loading, error } = useUnitsData()
  
  const results = useMemo(() => {
    if (!data || !query.trim()) return []
    
    const q = query.toLowerCase().trim()
    const entries = Object.entries(data)
    
    return entries
      .filter(([code, unit]) => {
        // Search in code and title
        const matchesQuery = 
          code.toLowerCase().includes(q) ||
          unit.title.toLowerCase().includes(q)
        
        if (!matchesQuery) return false
        
        // Apply filters
        if (filters?.school && unit.school !== filters.school) return false
        if (filters?.level) {
          const unitLevel = parseInt(code.match(/[A-Z]{3}(\d)/)?.[1] || '0')
          if (unitLevel !== filters.level) return false
        }
        if (filters?.scaBand && unit.sca_band !== filters.scaBand) return false
        
        return true
      })
      .slice(0, 50) // Limit results
      .map(([unitCode, unit]) => ({ ...unit, code: unitCode }))
  }, [data, query, filters?.school, filters?.level, filters?.scaBand])

  return { results, loading, error }
}

// Get all unique schools from the data
export function useSchools() {
  const { data, loading } = useUnitsData()
  
  const schools = useMemo(() => {
    if (!data) return []
    const schoolSet = new Set<string>()
    Object.values(data).forEach(unit => {
      if (unit.school) schoolSet.add(unit.school)
    })
    return Array.from(schoolSet).sort()
  }, [data])

  return { schools, loading }
}

// Helper to check if prerequisite groups are satisfied
// Each group requires NumReq units from its list (OR within group, AND between groups)
function checkPrerequisitesMet(
  requisites: ProcessedUnit['requisites'],
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
      // This group is not satisfied
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

// Hook to get units that are unlocked by the given unit codes
export function useUnlockedUnits(plannerUnitCodes: string[]) {
  const { data: networkData, loading: networkLoading } = useNetworkData()
  const { data: unitsData, loading: unitsLoading } = useUnitsData()
  
  const unlockedUnits = useMemo(() => {
    if (!networkData || !unitsData || plannerUnitCodes.length === 0) {
      return []
    }
    
    const plannerSet = new Set(plannerUnitCodes.map(c => c.toUpperCase()))
    const unlocked = new Set<string>()
    
    // For each unit in the planner, add what it unlocks
    for (const code of plannerSet) {
      const node = networkData.nodes.find(n => n.id === code)
      if (node) {
        node.unlocks.forEach(u => {
          // Only add if not already in planner
          if (!plannerSet.has(u)) {
            unlocked.add(u)
          }
        })
      }
    }
    
    // Return unit details for each unlocked unit
    return Array.from(unlocked)
      .map(code => {
        const unit = unitsData[code]
        const node = networkData.nodes.find(n => n.id === code)
        if (!unit || !node) return null
        
        // Check prerequisites using the actual group structure
        const { met: allPrereqsMet, missingGroups } = checkPrerequisitesMet(
          unit.requisites,
          plannerSet
        )
        
        // Flatten missing options for display
        const missingPrereqs = missingGroups.flatMap(g => g.options.slice(0, 3))
        
        return {
          code,
          title: unit.title,
          school: unit.school,
          requires: node.requires,
          allPrereqsMet,
          missingPrereqs,
          missingGroups,
        }
      })
      .filter((u): u is NonNullable<typeof u> => u !== null)
      .sort((a, b) => {
        // Sort by: all prereqs met first, then alphabetically
        if (a.allPrereqsMet !== b.allPrereqsMet) {
          return a.allPrereqsMet ? -1 : 1
        }
        return a.code.localeCompare(b.code)
      })
  }, [networkData, unitsData, plannerUnitCodes])
  
  return { unlockedUnits, loading: networkLoading || unitsLoading }
}



