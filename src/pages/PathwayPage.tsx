import { useState, useMemo, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useUnitsData } from '@/hooks/useData'
import { getSemestersFromOfferings, getUnitLevel, getUnitCost } from '@/types'
import { usePlannerStore } from '@/stores/plannerStore'

interface PathNode {
  code: string
  title: string
  level: number
  semesters: string[]
  depth: number
  alternatives?: string[]  // Other valid options for this slot
}

interface Semester {
  year: number
  period: 'S1' | 'S2' | 'Summer' | 'Winter'
}

interface PlannedUnit {
  code: string
  title: string
  semester: Semester
}

export function PathwayPage() {
  const [searchParams] = useSearchParams()
  const targetCode = searchParams.get('target') || ''
  const [searchQuery, setSearchQuery] = useState(targetCode)
  const [selectedTarget, setSelectedTarget] = useState(targetCode)
  const [startYear, setStartYear] = useState(new Date().getFullYear())
  const [startSemester, setStartSemester] = useState<'S1' | 'S2'>('S1')
  
  const { data: unitsData, loading: unitsLoading } = useUnitsData()
  const { units: plannerUnits, addUnit, hasUnit } = usePlannerStore()
  
  const plannerCodes = useMemo(() => new Set(plannerUnits.map(u => u.code)), [plannerUnits])
  
  // Search suggestions
  const suggestions = useMemo(() => {
    if (!unitsData || searchQuery.length < 2) return []
    const q = searchQuery.toLowerCase()
    return Object.entries(unitsData)
      .filter(([code, unit]) => 
        code.toLowerCase().includes(q) || 
        unit.title.toLowerCase().includes(q)
      )
      .slice(0, 10)
      .map(([code, unit]) => ({ code, title: unit.title }))
  }, [unitsData, searchQuery])
  
  // Related prefixes for different disciplines
  const RELATED_PREFIXES: Record<string, string[]> = {
    'FIT': ['FIT', 'MAT', 'MTH', 'STA'],  // CS/IT prefers math units
    'MAT': ['MAT', 'MTH', 'FIT', 'STA'],
    'MTH': ['MTH', 'MAT', 'FIT', 'STA'],
    'ENG': ['ENG', 'MTH', 'MAT', 'MEC'],
    'SCI': ['SCI', 'CHE', 'PHY', 'BIO'],
  }
  
  // Build MINIMAL path to target - pick ONE from each prerequisite group
  const buildPath = useCallback((targetCode: string): PathNode[] => {
    if (!unitsData || !unitsData[targetCode]) return []
    
    const result: PathNode[] = []
    const visited = new Set<string>()
    
    // Get prefix from code (e.g., FIT from FIT1045)
    const getPrefix = (code: string) => code.match(/^[A-Z]+/)?.[0] || ''
    
    // Recursive function to count prereq depth (for choosing simpler options)
    const getPrereqDepth = (code: string, seen: Set<string> = new Set()): number => {
      if (seen.has(code)) return 0
      if (plannerCodes.has(code)) return 0
      
      const unit = unitsData[code]
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
    
    // Choose the best option from a group with smart heuristics
    const chooseBestOption = (options: string[], parentCode: string): string | null => {
      if (options.length === 0) return null
      if (options.length === 1) return options[0]
      
      // First, check if any option is already in planner
      for (const opt of options) {
        if (plannerCodes.has(opt)) return opt
      }
      
      const parentPrefix = getPrefix(parentCode)
      const relatedPrefixes = RELATED_PREFIXES[parentPrefix] || [parentPrefix]
      
      // Score each option
      const scored = options
        .filter(opt => unitsData[opt])
        .map(opt => {
          const optPrefix = getPrefix(opt)
          const depth = getPrereqDepth(opt)
          const level = getUnitLevel(opt)
          
          // Priority: related prefix > lower prereq depth > lower level
          let score = 0
          const prefixIndex = relatedPrefixes.indexOf(optPrefix)
          if (prefixIndex >= 0) {
            score += (10 - prefixIndex) * 100  // Higher score for more related prefix
          }
          score -= depth * 10  // Prefer fewer prereqs
          score -= level  // Prefer lower level units
          
          return { code: opt, score }
        })
        .sort((a, b) => b.score - a.score)
      
      return scored[0]?.code || options[0]
    }
    
    // Track which units have alternatives
    const alternativesMap = new Map<string, string[]>()
    
    // Build the path recursively
    const buildRecursive = (code: string, depth: number, groupOptions?: string[]): void => {
      if (visited.has(code)) return
      if (plannerCodes.has(code)) return
      
      const unit = unitsData[code]
      if (!unit) return
      
      visited.add(code)
      
      // Track alternatives (other options from the same group)
      if (groupOptions && groupOptions.length > 1) {
        alternativesMap.set(code, groupOptions.filter(opt => opt !== code && unitsData[opt]))
      }
      
      // Process prerequisite groups - pick ONE from each
      const prereqGroups = unit.requisites?.prerequisites || []
      
      for (const group of prereqGroups) {
        const bestOption = chooseBestOption(group.units, code)
        if (bestOption && !plannerCodes.has(bestOption)) {
          buildRecursive(bestOption, depth + 1, group.units)
        }
      }
      
      // Add this unit to results
      result.push({
        code,
        title: unit.title,
        level: getUnitLevel(code),
        semesters: getSemestersFromOfferings(unit.offerings),
        depth,
        alternatives: alternativesMap.get(code)
      })
    }
    
    buildRecursive(targetCode, 0)
    
    // Sort by depth descending (deepest prereqs first, target last)
    return result.sort((a, b) => b.depth - a.depth)
  }, [unitsData, plannerCodes])
  
  const pathNodes = useMemo(() => {
    if (!selectedTarget) return []
    return buildPath(selectedTarget)
  }, [selectedTarget, buildPath])
  
  // Get the selected prereqs for scheduling - derived from pathNodes
  const selectedPrereqs = useMemo(() => {
    if (!pathNodes.length) return new Map<string, string[]>()
    
    const prereqMap = new Map<string, string[]>()
    const pathCodes = new Set(pathNodes.map(n => n.code))
    
    // For each unit in the path, find which units it depends on (also in path)
    for (const node of pathNodes) {
      const unit = unitsData?.[node.code]
      if (!unit) continue
      
      const prereqs: string[] = []
      const prereqGroups = unit.requisites?.prerequisites || []
      
      for (const group of prereqGroups) {
        // Find which option from this group is in our path
        const selected = group.units.find(opt => pathCodes.has(opt) || plannerCodes.has(opt))
        if (selected && !plannerCodes.has(selected)) {
          prereqs.push(selected)
        }
      }
      
      prereqMap.set(node.code, prereqs)
    }
    
    return prereqMap
  }, [pathNodes, unitsData, plannerCodes])
  
  // Schedule units into semesters
  const scheduledPath = useMemo(() => {
    if (pathNodes.length === 0) return []
    
    const schedule: PlannedUnit[][] = []
    const scheduled = new Set<string>()
    const remaining = [...pathNodes]
    
    // Add planner units as already scheduled
    for (const u of plannerCodes) {
      scheduled.add(u)
    }
    
    let currentYear = startYear
    let currentPeriod: 'S1' | 'S2' = startSemester
    let iterations = 0
    const maxIterations = 20 // Safety limit
    
    while (remaining.length > 0 && iterations < maxIterations) {
      iterations++
      const semesterUnits: PlannedUnit[] = []
      
      // Find units that can be scheduled this semester
      const canSchedule = remaining.filter(node => {
        // All selected prereqs must be scheduled (use our minimal prereq map)
        const prereqs = selectedPrereqs.get(node.code) || []
        if (!prereqs.every(p => scheduled.has(p))) return false
        
        // Check if offered this semester
        if (node.semesters.length === 0) return true // Unknown, assume available
        return node.semesters.includes(currentPeriod)
      })
      
      // Schedule up to 4 units per semester
      for (const node of canSchedule.slice(0, 4)) {
        semesterUnits.push({
          code: node.code,
          title: node.title,
          semester: { year: currentYear, period: currentPeriod }
        })
        scheduled.add(node.code)
        
        // Remove from remaining
        const idx = remaining.findIndex(n => n.code === node.code)
        if (idx !== -1) remaining.splice(idx, 1)
      }
      
      if (semesterUnits.length > 0) {
        schedule.push(semesterUnits)
      }
      
      // Move to next semester
      if (currentPeriod === 'S1') {
        currentPeriod = 'S2'
      } else {
        currentPeriod = 'S1'
        currentYear++
      }
    }
    
    return schedule
  }, [pathNodes, selectedPrereqs, plannerCodes, startYear, startSemester])
  
  const targetUnit = unitsData?.[selectedTarget]
  const totalUnits = pathNodes.length
  const totalSemesters = scheduledPath.length
  const totalCost = pathNodes.reduce((sum, node) => {
    const unit = unitsData?.[node.code]
    return sum + (unit ? getUnitCost(unit.sca_band, parseInt(unit.credit_points) || 6) : 0)
  }, 0)
  
  const loading = unitsLoading
  
  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-theme-card rounded w-64" />
          <div className="h-12 bg-theme-card rounded w-full max-w-md" />
          <div className="h-96 bg-theme-card rounded" />
        </div>
      </div>
    )
  }
  
  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-display font-bold text-theme-primary mb-2">
          🛤️ Pathway Planner
        </h1>
        <p className="text-theme-tertiary">
          Find the fastest path to any unit, considering prerequisites and semester availability
        </p>
      </header>
      
      {/* Search */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-theme-tertiary mb-2">
          Target Unit
        </label>
        <div className="relative max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for a unit (e.g., FIT3155)..."
            className="w-full px-4 py-3 bg-theme-card border border-theme-primary rounded-xl text-theme-primary placeholder-gray-500 focus:outline-none focus:border-electric"
          />
          {suggestions.length > 0 && searchQuery !== selectedTarget && (
            <div className="absolute z-10 w-full mt-1 bg-theme-card border border-theme-primary rounded-xl shadow-lg max-h-64 overflow-y-auto">
              {suggestions.map(s => (
                <button
                  key={s.code}
                  onClick={() => {
                    setSelectedTarget(s.code)
                    setSearchQuery(s.code)
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-navy-700 transition-colors flex items-center gap-3"
                >
                  <span className="font-mono text-electric">{s.code}</span>
                  <span className="text-gray-300 truncate">{s.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Configuration */}
      {selectedTarget && (
        <div className="mb-8 p-4 bg-theme-card/50 border border-theme-primary rounded-xl">
          <h2 className="text-sm font-medium text-theme-tertiary mb-3">Starting Semester</h2>
          <div className="flex gap-4 items-center">
            <select
              value={startSemester}
              onChange={(e) => setStartSemester(e.target.value as 'S1' | 'S2')}
              className="px-4 py-2 bg-theme-card border border-theme-primary rounded-lg text-theme-primary focus:outline-none focus:border-electric"
            >
              <option value="S1">Semester 1</option>
              <option value="S2">Semester 2</option>
            </select>
            <select
              value={startYear}
              onChange={(e) => setStartYear(parseInt(e.target.value))}
              className="px-4 py-2 bg-theme-card border border-theme-primary rounded-lg text-theme-primary focus:outline-none focus:border-electric"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            {plannerCodes.size > 0 && (
              <span className="text-sm text-theme-tertiary">
                Using {plannerCodes.size} units from your planner as completed
              </span>
            )}
          </div>
        </div>
      )}
      
      {/* Target Info */}
      {selectedTarget && targetUnit && (
        <div className="mb-8 p-6 bg-electric/5 border border-electric/30 rounded-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">🎯</span>
                <h2 className="text-2xl font-mono font-bold text-electric">{selectedTarget}</h2>
              </div>
              <p className="text-xl text-theme-primary mb-4">{targetUnit.title}</p>
              
              <div className="flex flex-wrap gap-4 text-sm">
                <div>
                  <span className="text-theme-tertiary">Units Required:</span>
                  <span className="ml-2 font-bold text-theme-primary">{totalUnits}</span>
                </div>
                <div>
                  <span className="text-theme-tertiary">Semesters:</span>
                  <span className="ml-2 font-bold text-theme-primary">{totalSemesters}</span>
                </div>
                <div>
                  <span className="text-theme-tertiary">Estimated Cost:</span>
                  <span className="ml-2 font-bold text-amber font-mono">${totalCost.toLocaleString()}</span>
                </div>
              </div>
            </div>
            <Link
              to={`/unit/${selectedTarget}`}
              className="shrink-0 px-4 py-2 bg-electric text-navy-950 font-semibold rounded-lg hover:bg-electric-bright transition-colors"
            >
              View Unit
            </Link>
          </div>
        </div>
      )}
      
      {/* Scheduled Timeline */}
      {scheduledPath.length > 0 && (
        <section>
          <h2 className="text-xl font-display font-semibold text-theme-primary mb-4">
            📅 Suggested Schedule
          </h2>
          
          <div className="space-y-4">
            {scheduledPath.map((semesterUnits, idx) => {
              const sem = semesterUnits[0]?.semester
              const isLast = idx === scheduledPath.length - 1
              
              return (
                <div 
                  key={`${sem?.year}-${sem?.period}`}
                  className={`relative p-4 rounded-xl border ${
                    isLast 
                      ? 'bg-electric/10 border-electric/30' 
                      : 'bg-theme-card/50 border-theme-primary'
                  }`}
                >
                  {/* Timeline connector */}
                  {idx < scheduledPath.length - 1 && (
                    <div className="absolute left-8 top-full w-0.5 h-4 bg-navy-700" />
                  )}
                  
                  <div className="flex items-center gap-4 mb-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      isLast ? 'bg-electric text-navy-950' : 'bg-navy-700 text-theme-primary'
                    }`}>
                      {idx + 1}
                    </div>
                    <div>
                      <h3 className="font-semibold text-theme-primary">
                        {sem?.period === 'S1' ? 'Semester 1' : 'Semester 2'}, {sem?.year}
                      </h3>
                      <p className="text-sm text-theme-tertiary">{semesterUnits.length} units</p>
                    </div>
                  </div>
                  
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4 ml-14">
                    {semesterUnits.map(unit => {
                      const isTarget = unit.code === selectedTarget
                      const inPlanner = hasUnit(unit.code)
                      const unitData = unitsData?.[unit.code]
                      const pathNode = pathNodes.find(n => n.code === unit.code)
                      const alternatives = pathNode?.alternatives || []
                      
                      return (
                        <div
                          key={unit.code}
                          className={`p-3 rounded-lg border ${
                            isTarget 
                              ? 'bg-electric/20 border-electric/50' 
                              : inPlanner
                              ? 'bg-success/10 border-success/30'
                              : 'bg-theme-secondary/50 border-theme-primary'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <Link 
                              to={`/unit/${unit.code}`} 
                              className="flex-1 min-w-0 group"
                            >
                              <h4 className={`font-mono text-sm ${
                                isTarget ? 'text-electric' : 'text-electric-bright group-hover:text-electric'
                              }`}>
                                {unit.code}
                                {isTarget && ' 🎯'}
                              </h4>
                              <p className="text-xs text-gray-300 line-clamp-1">{unit.title}</p>
                            </Link>
                            {!inPlanner && unitData && (
                              <button
                                onClick={() => addUnit(unitData)}
                                className="shrink-0 p-1 text-theme-muted hover:text-electric transition-colors"
                                title="Add to planner"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                              </button>
                            )}
                            {inPlanner && (
                              <span className="shrink-0 text-success text-sm" title="In planner">✓</span>
                            )}
                          </div>
                          {alternatives.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-theme-primary/50">
                              <p className="text-xs text-theme-muted mb-1">
                                Or: {alternatives.slice(0, 3).map((alt, i) => (
                                  <Link 
                                    key={alt}
                                    to={`/unit/${alt}`}
                                    className="text-theme-tertiary hover:text-electric-bright"
                                  >
                                    {alt}{i < Math.min(2, alternatives.length - 1) ? ', ' : ''}
                                  </Link>
                                ))}
                                {alternatives.length > 3 && (
                                  <span className="text-theme-muted"> +{alternatives.length - 3} more</span>
                                )}
                              </p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
          
          <div className="mt-8 flex gap-4 justify-center">
            <button
              onClick={() => {
                for (const semester of scheduledPath) {
                  for (const unit of semester) {
                    const unitData = unitsData?.[unit.code]
                    if (unitData && !hasUnit(unit.code)) {
                      addUnit(unitData)
                    }
                  }
                }
              }}
              className="px-6 py-3 bg-electric text-navy-950 font-semibold rounded-lg hover:bg-electric-bright transition-colors"
            >
              Add All to Planner
            </button>
            <Link
              to="/planner"
              className="px-6 py-3 bg-theme-card border border-theme-primary text-theme-primary font-semibold rounded-lg hover:border-electric transition-colors"
            >
              View Planner
            </Link>
          </div>
        </section>
      )}
      
      {/* No Target Selected */}
      {!selectedTarget && (
        <div className="text-center py-16 bg-theme-card/50 border border-theme-primary rounded-xl">
          <div className="text-6xl mb-4">🎯</div>
          <h2 className="text-xl font-display font-semibold text-theme-primary mb-2">
            Select a Target Unit
          </h2>
          <p className="text-theme-tertiary mb-6">
            Search for the unit you want to take, and we'll show you the fastest path to get there
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {['FIT3155', 'FIT3171', 'MTH2132', 'CHE2163'].map(code => (
              <button
                key={code}
                onClick={() => {
                  setSelectedTarget(code)
                  setSearchQuery(code)
                }}
                className="px-4 py-2 bg-theme-card border border-theme-primary rounded-lg font-mono text-electric-bright hover:border-electric transition-colors"
              >
                {code}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* No Path Found */}
      {selectedTarget && pathNodes.length === 0 && !loading && (
        <div className="text-center py-16 bg-theme-card/50 border border-theme-primary rounded-xl">
          <div className="text-6xl mb-4">🤔</div>
          <h2 className="text-xl font-display font-semibold text-theme-primary mb-2">
            No Prerequisites Found
          </h2>
          <p className="text-theme-tertiary">
            This unit might have no prerequisites, or all prerequisites are already in your planner
          </p>
        </div>
      )}
    </div>
  )
}

