import { useState, useEffect, useMemo, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { usePlannerStore } from '@/stores/plannerStore'
import { useUnlockedUnits, useAreasOfStudyData, useCoursesData, useUnitsData } from '@/hooks/useData'
import { getUnitCost, getUnitLevel, getFacultyPrefix, getSemestersFromOfferings } from '@/types'

interface ScheduledSemester {
  year: number
  period: 'S1' | 'S2'
  units: {
    code: string
    title: string
    creditPoints: number
    cost: number
  }[]
}

export function PlannerPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { 
    units, addUnit, removeUnit, clearAll, getTotalCredits, getTotalCost, 
    trackedPrograms, removeProgram, addProgram,
    savedPlans, currentPlanId, savePlan, loadPlan, deletePlan, renamePlan, updateCurrentPlan, newPlan
  } = usePlannerStore()
  const { data: aosData } = useAreasOfStudyData()
  const { data: coursesData } = useCoursesData()
  const { data: unitsData } = useUnitsData()
  const [importMessage, setImportMessage] = useState<string | null>(null)
  
  // Saved plans UI state
  const [showSavedPlans, setShowSavedPlans] = useState(false)
  const [newPlanName, setNewPlanName] = useState('')
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null)
  const [editingPlanName, setEditingPlanName] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)
  
  const currentPlan = savedPlans.find(p => p.id === currentPlanId)
  
  // Handle URL import
  useEffect(() => {
    const sharedUnits = searchParams.get('units')
    const sharedPrograms = searchParams.get('programs')
    
    if ((sharedUnits || sharedPrograms) && unitsData) {
      const codes = sharedUnits?.split(',').filter(Boolean) || []
      const programs = sharedPrograms?.split(',').filter(Boolean) || []
      
      let importedCount = 0
      
      // Import units
      for (const code of codes) {
        const unit = unitsData[code.trim()]
        if (unit && !units.some(u => u.code === unit.code)) {
          addUnit(unit)
          importedCount++
        }
      }
      
      // Import programs
      for (const prog of programs) {
        const [type, code] = prog.split(':')
        if (type === 'aos' && aosData?.[code]) {
          addProgram(aosData[code], 'aos')
        } else if (type === 'course' && coursesData?.[code]) {
          addProgram(coursesData[code], 'course')
        }
      }
      
      if (importedCount > 0 || programs.length > 0) {
        setImportMessage(`Imported ${importedCount} units${programs.length > 0 ? ` and ${programs.length} programs` : ''} from shared link`)
      }
      
      // Clear URL params after import
      setSearchParams({})
    }
  }, [searchParams, unitsData, aosData, coursesData, addUnit, addProgram, setSearchParams, units])
  
  const totalCredits = getTotalCredits()
  const totalCost = getTotalCost()
  
  // Get units unlocked by current planner
  const plannerCodes = units.map(u => u.code)
  const { unlockedUnits, loading: unlockedLoading } = useUnlockedUnits(plannerCodes)
  
  // Filter to only show units where all prereqs are met
  const availableUnits = unlockedUnits.filter(u => u.allPrereqsMet)
  const partiallyUnlockedUnits = unlockedUnits.filter(u => !u.allPrereqsMet)
  
  // Search state for unlocked units
  const [unlockedSearch, setUnlockedSearch] = useState('')
  const filteredAvailable = availableUnits.filter(u => 
    !unlockedSearch || 
    u.code.toLowerCase().includes(unlockedSearch.toLowerCase()) ||
    u.title.toLowerCase().includes(unlockedSearch.toLowerCase())
  )
  
  // Auto-schedule state
  const [showSchedule, setShowSchedule] = useState(false)
  const [scheduleStartYear, setScheduleStartYear] = useState(new Date().getFullYear())
  const [scheduleStartSemester, setScheduleStartSemester] = useState<'S1' | 'S2'>('S1')
  const [unitsPerSemester, setUnitsPerSemester] = useState(4) // Configurable load
  
  // Auto-schedule: organize units into optimal semester order
  const scheduledSemesters = useMemo((): ScheduledSemester[] => {
    if (!unitsData || units.length === 0) return []
    
    const plannerCodeSet = new Set(units.map(u => u.code))
    const schedule: ScheduledSemester[] = []
    const scheduled = new Set<string>()
    const remaining = [...units]
    
    // Build prereq map for planner units
    const getPrereqs = (code: string): string[] => {
      const unit = unitsData[code]
      if (!unit?.requisites?.prerequisites) return []
      
      const prereqs: string[] = []
      for (const group of unit.requisites.prerequisites) {
        // Find which option from this group is in our planner
        const inPlanner = group.units.find(opt => plannerCodeSet.has(opt))
        if (inPlanner) {
          prereqs.push(inPlanner)
        }
      }
      return prereqs
    }
    
    let currentYear = scheduleStartYear
    let currentPeriod: 'S1' | 'S2' = scheduleStartSemester
    let iterations = 0
    const maxIterations = 30
    
    while (remaining.length > 0 && iterations < maxIterations) {
      iterations++
      const semesterUnits: ScheduledSemester['units'] = []
      
      // Find units that can be scheduled this semester
      const canSchedule = remaining.filter(unit => {
        const prereqs = getPrereqs(unit.code)
        // All prereqs must be scheduled (or not in planner at all)
        if (!prereqs.every(p => scheduled.has(p) || !plannerCodeSet.has(p))) return false
        
        // Check if offered this semester
        const fullUnit = unitsData[unit.code]
        const semesters = getSemestersFromOfferings(fullUnit?.offerings)
        if (semesters.length === 0) return true // Unknown, assume available
        return semesters.includes(currentPeriod)
      })
      
      // Schedule up to N units per semester (configurable load)
      for (const unit of canSchedule.slice(0, unitsPerSemester)) {
        const fullUnit = unitsData[unit.code]
        semesterUnits.push({
          code: unit.code,
          title: unit.title,
          creditPoints: unit.creditPoints,
          cost: getUnitCost(fullUnit?.sca_band, unit.creditPoints)
        })
        scheduled.add(unit.code)
        
        // Remove from remaining
        const idx = remaining.findIndex(u => u.code === unit.code)
        if (idx !== -1) remaining.splice(idx, 1)
      }
      
      if (semesterUnits.length > 0) {
        schedule.push({
          year: currentYear,
          period: currentPeriod,
          units: semesterUnits
        })
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
  }, [units, unitsData, scheduleStartYear, scheduleStartSemester, unitsPerSemester])
  
  // Group units by level
  const unitsByLevel = units.reduce((acc, unit) => {
    const level = getUnitLevel(unit.code)
    if (!acc[level]) acc[level] = []
    acc[level].push(unit)
    return acc
  }, {} as Record<number, typeof units>)

  // Group units by faculty
  const unitsByFaculty = units.reduce((acc, unit) => {
    const faculty = getFacultyPrefix(unit.code)
    if (!acc[faculty]) acc[faculty] = []
    acc[faculty].push(unit)
    return acc
  }, {} as Record<string, typeof units>)

  const handleExport = () => {
    const exportData = {
      units: units.map(u => ({ code: u.code, title: u.title })),
      totalCredits,
      totalCost,
      exportedAt: new Date().toISOString()
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `monash-planner-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const [shareStatus, setShareStatus] = useState<'idle' | 'copied'>('idle')
  
  const handleShare = async () => {
    const params = new URLSearchParams()
    
    // Add unit codes
    if (units.length > 0) {
      params.set('units', units.map(u => u.code).join(','))
    }
    
    // Add tracked programs
    if (trackedPrograms.length > 0) {
      params.set('programs', trackedPrograms.map(p => `${p.type}:${p.code}`).join(','))
    }
    
    const url = `${window.location.origin}/planner?${params.toString()}`
    
    try {
      await navigator.clipboard.writeText(url)
      setShareStatus('copied')
      setTimeout(() => setShareStatus('idle'), 2000)
    } catch {
      prompt('Copy this link:', url)
    }
  }
  
  const handleSavePlan = () => {
    if (!newPlanName.trim()) return
    savePlan(newPlanName.trim())
    setNewPlanName('')
    setShowSavedPlans(false)
  }
  
  const handleRenamePlan = (planId: string) => {
    if (!editingPlanName.trim()) return
    renamePlan(planId, editingPlanName.trim())
    setEditingPlanId(null)
    setEditingPlanName('')
  }
  
  const handleLoadPlan = (planId: string) => {
    loadPlan(planId)
    setShowSavedPlans(false)
  }
  
  const handleStartEdit = (plan: { id: string; name: string }) => {
    setEditingPlanId(plan.id)
    setEditingPlanName(plan.name)
    setTimeout(() => editInputRef.current?.focus(), 0)
  }

  if (units.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <header className="mb-8">
          <h1 className="text-3xl font-display font-bold text-theme-primary mb-4">
            Your Planner
          </h1>
        </header>

        <div className="text-center py-16 bg-theme-card/50 rounded-xl border border-theme-primary">
          <div className="text-6xl mb-4">📋</div>
          <h2 className="text-xl font-display font-semibold text-theme-primary mb-2">
            No units added yet
          </h2>
          <p className="text-theme-tertiary mb-6">
            Start by searching for units and adding them to your planner
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-electric text-navy-950 font-semibold rounded-lg hover:bg-electric-bright transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Search Units
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <header className="mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-display font-bold text-theme-primary">
                {currentPlan ? currentPlan.name : 'Your Planner'}
              </h1>
              {currentPlan && (
                <span className="px-2 py-0.5 text-xs bg-electric/20 text-electric-bright rounded">
                  Saved
                </span>
              )}
            </div>
            <p className="text-theme-tertiary">
              {units.length} unit{units.length !== 1 ? 's' : ''} selected
              {savedPlans.length > 0 && (
                <span className="ml-2">• {savedPlans.length} saved plan{savedPlans.length !== 1 ? 's' : ''}</span>
              )}
            </p>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setShowSavedPlans(!showSavedPlans)}
              className={`px-4 py-2 border rounded-lg transition-colors ${
                showSavedPlans
                  ? 'bg-purple-600 text-theme-primary border-purple-500'
                  : 'bg-theme-card border-theme-primary text-theme-primary hover:border-purple-500'
              }`}
            >
              💾 Plans
            </button>
            <button
              onClick={() => setShowSchedule(!showSchedule)}
              className={`px-4 py-2 border rounded-lg transition-colors ${
                showSchedule
                  ? 'bg-electric text-navy-950 border-electric'
                  : 'bg-theme-card border-theme-primary text-theme-primary hover:border-electric'
              }`}
            >
              📅 {showSchedule ? 'Hide Schedule' : 'Auto-Schedule'}
            </button>
            <button
              onClick={handleShare}
              className={`px-4 py-2 border rounded-lg transition-colors ${
                shareStatus === 'copied'
                  ? 'bg-success/20 border-success/50 text-success'
                  : 'bg-theme-card border-theme-primary text-theme-primary hover:border-electric'
              }`}
            >
              {shareStatus === 'copied' ? '✓ Copied!' : 'Share'}
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-theme-card border border-theme-primary text-theme-primary rounded-lg hover:border-electric transition-colors"
            >
              Export
            </button>
            <button
              onClick={clearAll}
              className="px-4 py-2 bg-danger/20 border border-danger/30 text-danger rounded-lg hover:bg-danger/30 transition-colors"
            >
              Clear All
            </button>
          </div>
        </div>
      </header>
      
      {/* Saved Plans Panel */}
      {showSavedPlans && (
        <section className="mb-8 p-6 bg-theme-card/50 border border-purple-500/30 rounded-xl">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="text-xl font-display font-semibold text-theme-primary">
              💾 Saved Plans
            </h2>
            <button
              onClick={() => setShowSavedPlans(false)}
              className="p-1.5 text-theme-tertiary hover:text-theme-primary transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* New Plan Input */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newPlanName}
              onChange={(e) => setNewPlanName(e.target.value)}
              placeholder="Enter plan name..."
              className="flex-1 px-4 py-2 bg-theme-secondary border border-theme-primary rounded-lg text-theme-primary placeholder-gray-500 focus:outline-none focus:border-purple-500"
              onKeyDown={(e) => e.key === 'Enter' && handleSavePlan()}
            />
            <button
              onClick={handleSavePlan}
              disabled={!newPlanName.trim()}
              className="px-4 py-2 bg-purple-600 text-theme-primary rounded-lg hover:bg-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Current
            </button>
            {currentPlanId && (
              <button
                onClick={updateCurrentPlan}
                className="px-4 py-2 bg-theme-tertiary text-theme-primary rounded-lg hover:bg-theme-secondary transition-colors"
                title="Update the current saved plan with your changes"
              >
                Update
              </button>
            )}
            <button
              onClick={newPlan}
              className="px-4 py-2 bg-theme-tertiary text-theme-primary rounded-lg hover:bg-theme-secondary transition-colors"
              title="Start a new unsaved plan"
            >
              New
            </button>
          </div>
          
          {/* Saved Plans List */}
          {savedPlans.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {savedPlans
                .sort((a, b) => b.updatedAt - a.updatedAt)
                .map(plan => (
                <div 
                  key={plan.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    plan.id === currentPlanId
                      ? 'bg-purple-900/30 border-purple-500/50'
                      : 'bg-theme-secondary/50 border-theme-primary hover:border-theme-secondary'
                  }`}
                >
                  {editingPlanId === plan.id ? (
                    <input
                      ref={editInputRef}
                      type="text"
                      value={editingPlanName}
                      onChange={(e) => setEditingPlanName(e.target.value)}
                      className="flex-1 px-2 py-1 bg-theme-card border border-purple-500 rounded text-theme-primary text-sm focus:outline-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenamePlan(plan.id)
                        if (e.key === 'Escape') setEditingPlanId(null)
                      }}
                      onBlur={() => handleRenamePlan(plan.id)}
                    />
                  ) : (
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-theme-primary truncate">{plan.name}</h3>
                      <p className="text-xs text-theme-tertiary">
                        {plan.units.length} units • {plan.units.reduce((s, u) => s + u.creditPoints, 0)} CP
                        <span className="mx-1">•</span>
                        {new Date(plan.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1">
                    {plan.id === currentPlanId ? (
                      <span className="px-2 py-1 text-xs bg-purple-600/50 text-purple-200 rounded">
                        Active
                      </span>
                    ) : (
                      <button
                        onClick={() => handleLoadPlan(plan.id)}
                        className="px-3 py-1 text-sm bg-electric/20 text-electric-bright rounded hover:bg-electric/30 transition-colors"
                      >
                        Load
                      </button>
                    )}
                    <button
                      onClick={() => handleStartEdit(plan)}
                      className="p-1.5 text-theme-tertiary hover:text-theme-primary transition-colors"
                      title="Rename"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => deletePlan(plan.id)}
                      className="p-1.5 text-theme-tertiary hover:text-danger transition-colors"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-theme-tertiary py-4">
              No saved plans yet. Enter a name above to save your current plan.
            </p>
          )}
        </section>
      )}

      {/* Import Message */}
      {importMessage && (
        <div className="mb-6 p-4 bg-success/10 border border-success/30 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-success text-lg">✓</span>
            <span className="text-success">{importMessage}</span>
          </div>
          <button
            onClick={() => setImportMessage(null)}
            className="text-success hover:text-success/80 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <div className="p-6 bg-theme-card/50 border border-theme-primary rounded-xl">
          <div className="text-sm text-theme-tertiary mb-1">Total Units</div>
          <div className="text-3xl font-display font-bold text-theme-primary">
            {units.length}
          </div>
        </div>
        <div className="p-6 bg-electric/10 border border-electric/30 rounded-xl">
          <div className="text-sm text-electric-bright mb-1">Total Credit Points</div>
          <div className="text-3xl font-display font-bold text-electric">
            {totalCredits} <span className="text-lg text-electric-bright">CP</span>
          </div>
        </div>
        <div className="p-6 bg-amber/10 border border-amber/30 rounded-xl">
          <div className="text-sm text-amber-bright mb-1">Estimated Cost</div>
          <div className="text-3xl font-display font-bold text-amber font-mono">
            ${totalCost.toLocaleString()}
          </div>
          <div className="text-xs text-theme-muted mt-1">Based on 2024 rates</div>
        </div>
        <div className="p-6 bg-success/10 border border-success/30 rounded-xl">
          <div className="text-sm text-success mb-1">Units Unlocked</div>
          <div className="text-3xl font-display font-bold text-success">
            {availableUnits.length}
          </div>
          <div className="text-xs text-theme-muted mt-1">Ready to take</div>
        </div>
      </div>

      {/* Auto-Schedule View */}
      {showSchedule && scheduledSemesters.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-display font-semibold text-theme-primary">
                📅 Suggested Schedule
              </h2>
              <p className="text-sm text-theme-tertiary">
                {scheduledSemesters.length} semesters • Prerequisites and availability considered
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={unitsPerSemester}
                onChange={(e) => setUnitsPerSemester(parseInt(e.target.value))}
                className="px-3 py-1.5 bg-theme-card border border-theme-primary rounded-lg text-theme-primary text-sm focus:outline-none focus:border-electric"
              >
                <option value="2">2 units/sem (Part-time)</option>
                <option value="3">3 units/sem (Reduced)</option>
                <option value="4">4 units/sem (Full-time)</option>
                <option value="5">5 units/sem (Overload)</option>
                <option value="6">6 units/sem (Heavy)</option>
              </select>
              <select
                value={scheduleStartSemester}
                onChange={(e) => setScheduleStartSemester(e.target.value as 'S1' | 'S2')}
                className="px-3 py-1.5 bg-theme-card border border-theme-primary rounded-lg text-theme-primary text-sm focus:outline-none focus:border-electric"
              >
                <option value="S1">Start S1</option>
                <option value="S2">Start S2</option>
              </select>
              <select
                value={scheduleStartYear}
                onChange={(e) => setScheduleStartYear(parseInt(e.target.value))}
                className="px-3 py-1.5 bg-theme-card border border-theme-primary rounded-lg text-theme-primary text-sm focus:outline-none focus:border-electric"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="space-y-4">
            {scheduledSemesters.map((semester, idx) => {
              const semesterCredits = semester.units.reduce((sum, u) => sum + u.creditPoints, 0)
              const semesterCost = semester.units.reduce((sum, u) => sum + u.cost, 0)
              const isOverload = semester.units.length > unitsPerSemester || semesterCredits > unitsPerSemester * 6
              
              return (
                <div 
                  key={`${semester.year}-${semester.period}`}
                  className={`p-4 rounded-xl border ${
                    isOverload 
                      ? 'bg-amber/10 border-amber/30' 
                      : 'bg-theme-card/50 border-theme-primary'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-electric/20 text-electric flex items-center justify-center font-bold">
                        {idx + 1}
                      </div>
                      <div>
                        <h3 className="font-semibold text-theme-primary">
                          {semester.period === 'S1' ? 'Semester 1' : 'Semester 2'}, {semester.year}
                        </h3>
                        <p className="text-sm text-theme-tertiary">
                          {semester.units.length} units • {semesterCredits} CP
                          {isOverload && <span className="text-amber ml-2">⚠️ Overload</span>}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono text-amber">${semesterCost.toLocaleString()}</div>
                    </div>
                  </div>
                  
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
                    {semester.units.map(unit => (
                      <Link
                        key={unit.code}
                        to={`/unit/${unit.code}`}
                        className="group p-3 bg-theme-secondary/50 border border-theme-primary rounded-lg hover:border-electric/50 transition-colors"
                      >
                        <h4 className="font-mono text-sm text-electric-bright group-hover:text-electric transition-colors">
                          {unit.code}
                        </h4>
                        <p className="text-xs text-theme-secondary line-clamp-1">{unit.title}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-theme-muted">
                          <span>{unit.creditPoints} CP</span>
                          <span>•</span>
                          <span className="font-mono text-amber-bright">${unit.cost}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
          
          {/* Schedule Summary */}
          <div className="mt-4 p-4 bg-theme-card/50 border border-theme-primary rounded-xl">
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <span className="text-theme-tertiary">Total Duration:</span>
                <span className="ml-2 font-semibold text-theme-primary">
                  {scheduledSemesters.length} semesters ({Math.ceil(scheduledSemesters.length / 2)} years)
                </span>
              </div>
              <div>
                <span className="text-theme-tertiary">Completion:</span>
                <span className="ml-2 font-semibold text-theme-primary">
                  {scheduledSemesters[scheduledSemesters.length - 1]?.period === 'S1' ? 'Mid' : 'End'} {scheduledSemesters[scheduledSemesters.length - 1]?.year}
                </span>
              </div>
              <div>
                <span className="text-theme-tertiary">Avg per semester:</span>
                <span className="ml-2 font-semibold text-theme-primary">
                  {Math.round(units.length / scheduledSemesters.length * 10) / 10} units
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Tracked Programs */}
      {trackedPrograms.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-display font-semibold text-theme-primary mb-4">
            📚 Tracked Programs
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {trackedPrograms.map(program => {
              const programData = program.type === 'aos' 
                ? aosData?.[program.code]
                : coursesData?.[program.code]
              
              // Calculate by credit points, not unit count
              const completedUnitCodes = programData 
                ? Object.keys(programData.all_units).filter(u => units.some(pu => pu.code === u))
                : []
              const completedCP = completedUnitCodes.reduce((sum, code) => {
                const unit = units.find(u => u.code === code)
                return sum + (unit?.creditPoints || 6)
              }, 0)
              const totalCP = program.totalCreditPoints
              const percentage = totalCP > 0 ? Math.min(100, Math.round((completedCP / totalCP) * 100)) : 0
              const isComplete = percentage >= 100
              
              return (
                <div 
                  key={program.code}
                  className={`p-5 rounded-xl border ${
                    isComplete 
                      ? 'bg-success/10 border-success/30' 
                      : 'bg-theme-card/50 border-theme-primary'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <Link 
                      to={program.type === 'aos' ? `/areas-of-study/${program.code}` : `/courses/${program.code}`}
                      className="flex-1 min-w-0 group"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          program.type === 'aos' 
                            ? 'bg-purple-900/50 text-purple-300' 
                            : 'bg-electric/20 text-electric-bright'
                        }`}>
                          {program.type === 'aos' ? 'Area of Study' : 'Course'}
                        </span>
                        <span className="font-mono text-sm text-theme-tertiary">{program.code}</span>
                      </div>
                      <h3 className="font-medium text-theme-primary group-hover:text-electric-bright transition-colors line-clamp-1">
                        {program.title}
                      </h3>
                    </Link>
                    <button
                      onClick={() => removeProgram(program.code)}
                      className="shrink-0 p-1.5 text-theme-muted hover:text-danger transition-colors"
                      title="Stop tracking"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-sm font-mono ${isComplete ? 'text-success' : 'text-theme-primary'}`}>
                      {completedCP}/{totalCP} CP
                    </span>
                    <span className="text-sm text-theme-tertiary">•</span>
                    <span className="text-sm text-theme-tertiary">
                      {completedUnitCodes.length} units
                    </span>
                  </div>
                  
                  <div className="h-2 bg-theme-secondary rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        isComplete ? 'bg-success' : 'bg-electric'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="text-right mt-1">
                    <span className={`text-xs font-mono ${isComplete ? 'text-success' : 'text-theme-tertiary'}`}>
                      {percentage}%{isComplete && ' ✓ Complete!'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Units You Can Now Take */}
      {availableUnits.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-display font-semibold text-theme-primary">
                🎓 Units You Can Now Take
              </h2>
              <p className="text-sm text-theme-tertiary">
                {availableUnits.length} units with prerequisites satisfied
              </p>
            </div>
            <div className="relative">
              <input
                type="text"
                value={unlockedSearch}
                onChange={(e) => setUnlockedSearch(e.target.value)}
                placeholder="Search unlocked..."
                className="w-48 px-3 py-1.5 pl-8 bg-theme-card border border-theme-primary rounded-lg text-theme-primary text-sm placeholder-gray-500 focus:outline-none focus:border-success"
              />
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto rounded-xl border border-success/20 bg-success/5">
            <div className="grid gap-2 p-3 md:grid-cols-2 lg:grid-cols-3">
              {filteredAvailable.map(unit => (
                <Link
                  key={unit.code}
                  to={`/unit/${unit.code}`}
                  className="group p-3 bg-theme-secondary/50 border border-success/10 rounded-lg hover:border-success/40 hover:bg-theme-secondary transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-mono text-sm text-success group-hover:text-success transition-colors">
                        {unit.code}
                      </h4>
                      <p className="text-theme-primary text-xs line-clamp-1">{unit.title}</p>
                    </div>
                    <span className="shrink-0 text-success text-sm">→</span>
                  </div>
                </Link>
              ))}
              {filteredAvailable.length === 0 && unlockedSearch && (
                <div className="col-span-full text-center py-4 text-theme-tertiary text-sm">
                  No units match "{unlockedSearch}"
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Partially Unlocked */}
      {partiallyUnlockedUnits.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-display font-semibold text-theme-primary mb-2">
            🔓 Almost Unlocked ({partiallyUnlockedUnits.length})
          </h2>
          <p className="text-sm text-theme-tertiary mb-4">
            Add one of the missing prerequisites to unlock these units
          </p>
          <div className="max-h-64 overflow-y-auto rounded-xl border border-theme-primary bg-theme-card/30">
            <div className="grid gap-2 p-3 md:grid-cols-2 lg:grid-cols-3">
              {partiallyUnlockedUnits.map(unit => (
                <div
                  key={unit.code}
                  className="p-3 bg-theme-secondary/50 border border-theme-primary rounded-lg"
                >
                  <Link to={`/unit/${unit.code}`} className="group">
                    <h4 className="font-mono text-sm text-electric-bright group-hover:text-electric transition-colors">
                      {unit.code}
                    </h4>
                    <p className="text-theme-primary text-xs line-clamp-1">{unit.title}</p>
                  </Link>
                  {unit.missingGroups && unit.missingGroups.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {unit.missingGroups.slice(0, 2).map((group, idx) => (
                        <div key={idx} className="flex flex-wrap items-center gap-1">
                          <span className="text-xs text-theme-muted">
                            Need {group.needed}:
                          </span>
                          {group.options.slice(0, 2).map(prereq => (
                            <Link
                              key={prereq}
                              to={`/unit/${prereq}`}
                              className="text-xs px-1.5 py-0.5 bg-amber/20 text-amber-bright rounded hover:bg-amber/30"
                            >
                              {prereq}
                            </Link>
                          ))}
                          {group.options.length > 2 && (
                            <span className="text-xs text-theme-muted">
                              +{group.options.length - 2}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Units by Level */}
      <section className="mb-8">
        <h2 className="text-xl font-display font-semibold text-theme-primary mb-4">
          By Level
        </h2>
        <div className="space-y-4">
          {Object.entries(unitsByLevel)
            .sort(([a], [b]) => parseInt(a) - parseInt(b))
            .map(([level, levelUnits]) => (
              <div key={level}>
                <h3 className="text-sm font-medium text-theme-tertiary mb-2">
                  Level {level} ({levelUnits.length} units)
                </h3>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {levelUnits.map(unit => (
                    <UnitCard key={unit.code} unit={unit} onRemove={removeUnit} />
                  ))}
                </div>
              </div>
            ))}
        </div>
      </section>

      {/* Units by Faculty */}
      <section>
        <h2 className="text-xl font-display font-semibold text-theme-primary mb-4">
          By Faculty
        </h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(unitsByFaculty)
            .sort((a, b) => b[1].length - a[1].length)
            .map(([faculty, facultyUnits]) => (
              <div 
                key={faculty}
                className="px-3 py-2 bg-theme-card border border-theme-primary rounded-lg"
              >
                <span className="font-mono text-electric-bright">{faculty}</span>
                <span className="text-theme-tertiary ml-2">{facultyUnits.length}</span>
              </div>
            ))}
        </div>
      </section>

      {/* Actions */}
      <div className="mt-12 flex justify-center gap-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-electric text-navy-950 font-semibold rounded-lg hover:bg-electric-bright transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add More Units
        </Link>
        <Link
          to="/graph?planner=true"
          className="inline-flex items-center gap-2 px-6 py-3 bg-theme-card border border-theme-primary text-theme-primary font-semibold rounded-lg hover:border-electric transition-colors"
        >
          View in Graph
        </Link>
      </div>
    </div>
  )
}

function UnitCard({ 
  unit, 
  onRemove 
}: { 
  unit: { code: string; title: string; creditPoints: number; scaBand: string | undefined; school: string }
  onRemove: (code: string) => void 
}) {
  const cost = getUnitCost(unit.scaBand, unit.creditPoints)
  
  return (
    <div className="group p-4 bg-theme-card/50 border border-theme-primary rounded-xl hover:border-theme-secondary transition-colors">
      <div className="flex items-start justify-between gap-2">
        <Link to={`/unit/${unit.code}`} className="flex-1 min-w-0">
          <h4 className="font-mono text-electric-bright group-hover:text-electric transition-colors">
            {unit.code}
          </h4>
          <p className="text-theme-primary text-sm line-clamp-1">{unit.title}</p>
        </Link>
        <button
          onClick={() => onRemove(unit.code)}
          className="shrink-0 p-1 text-theme-muted hover:text-danger transition-colors"
          title="Remove from planner"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex items-center gap-2 mt-2 text-xs">
        <span className="text-theme-tertiary">{unit.creditPoints} CP</span>
        {cost > 0 && (
          <span className="font-mono text-amber-bright">${cost}</span>
        )}
      </div>
    </div>
  )
}



