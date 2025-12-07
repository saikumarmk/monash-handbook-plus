import { useState } from 'react'
import { Link } from 'react-router-dom'
import { usePlannerStore } from '@/stores/plannerStore'
import { useUnlockedUnits } from '@/hooks/useData'
import { getUnitCost, getUnitLevel, getFacultyPrefix } from '@/types'

export function PlannerPage() {
  const { units, removeUnit, clearAll, getTotalCredits, getTotalCost } = usePlannerStore()
  
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

  const handleShare = async () => {
    const unitCodes = units.map(u => u.code).join(',')
    const url = `${window.location.origin}/planner?units=${encodeURIComponent(unitCodes)}`
    
    try {
      await navigator.clipboard.writeText(url)
      alert('Link copied to clipboard!')
    } catch {
      prompt('Copy this link:', url)
    }
  }

  if (units.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <header className="mb-8">
          <h1 className="text-3xl font-display font-bold text-white mb-4">
            Your Planner
          </h1>
        </header>

        <div className="text-center py-16 bg-navy-800/50 rounded-xl border border-navy-700">
          <div className="text-6xl mb-4">📋</div>
          <h2 className="text-xl font-display font-semibold text-white mb-2">
            No units added yet
          </h2>
          <p className="text-gray-400 mb-6">
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
            <h1 className="text-3xl font-display font-bold text-white mb-2">
              Your Planner
            </h1>
            <p className="text-gray-400">
              {units.length} unit{units.length !== 1 ? 's' : ''} selected
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleShare}
              className="px-4 py-2 bg-navy-800 border border-navy-700 text-white rounded-lg hover:border-electric transition-colors"
            >
              Share
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-navy-800 border border-navy-700 text-white rounded-lg hover:border-electric transition-colors"
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

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <div className="p-6 bg-navy-800/50 border border-navy-700 rounded-xl">
          <div className="text-sm text-gray-400 mb-1">Total Units</div>
          <div className="text-3xl font-display font-bold text-white">
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
          <div className="text-xs text-gray-500 mt-1">Based on 2024 rates</div>
        </div>
        <div className="p-6 bg-success/10 border border-success/30 rounded-xl">
          <div className="text-sm text-success mb-1">Units Unlocked</div>
          <div className="text-3xl font-display font-bold text-success">
            {availableUnits.length}
          </div>
          <div className="text-xs text-gray-500 mt-1">Ready to take</div>
        </div>
      </div>

      {/* Units You Can Now Take */}
      {availableUnits.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-display font-semibold text-white">
                🎓 Units You Can Now Take
              </h2>
              <p className="text-sm text-gray-400">
                {availableUnits.length} units with prerequisites satisfied
              </p>
            </div>
            <div className="relative">
              <input
                type="text"
                value={unlockedSearch}
                onChange={(e) => setUnlockedSearch(e.target.value)}
                placeholder="Search unlocked..."
                className="w-48 px-3 py-1.5 pl-8 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-success"
              />
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                  className="group p-3 bg-navy-900/50 border border-success/10 rounded-lg hover:border-success/40 hover:bg-navy-900 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-mono text-sm text-success group-hover:text-success transition-colors">
                        {unit.code}
                      </h4>
                      <p className="text-white text-xs line-clamp-1">{unit.title}</p>
                    </div>
                    <span className="shrink-0 text-success text-sm">→</span>
                  </div>
                </Link>
              ))}
              {filteredAvailable.length === 0 && unlockedSearch && (
                <div className="col-span-full text-center py-4 text-gray-400 text-sm">
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
          <h2 className="text-xl font-display font-semibold text-white mb-2">
            🔓 Almost Unlocked ({partiallyUnlockedUnits.length})
          </h2>
          <p className="text-sm text-gray-400 mb-4">
            Add one of the missing prerequisites to unlock these units
          </p>
          <div className="max-h-64 overflow-y-auto rounded-xl border border-navy-700 bg-navy-800/30">
            <div className="grid gap-2 p-3 md:grid-cols-2 lg:grid-cols-3">
              {partiallyUnlockedUnits.map(unit => (
                <div
                  key={unit.code}
                  className="p-3 bg-navy-900/50 border border-navy-700 rounded-lg"
                >
                  <Link to={`/unit/${unit.code}`} className="group">
                    <h4 className="font-mono text-sm text-electric-bright group-hover:text-electric transition-colors">
                      {unit.code}
                    </h4>
                    <p className="text-white text-xs line-clamp-1">{unit.title}</p>
                  </Link>
                  {unit.missingGroups && unit.missingGroups.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {unit.missingGroups.slice(0, 2).map((group, idx) => (
                        <div key={idx} className="flex flex-wrap items-center gap-1">
                          <span className="text-xs text-gray-500">
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
                            <span className="text-xs text-gray-500">
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
        <h2 className="text-xl font-display font-semibold text-white mb-4">
          By Level
        </h2>
        <div className="space-y-4">
          {Object.entries(unitsByLevel)
            .sort(([a], [b]) => parseInt(a) - parseInt(b))
            .map(([level, levelUnits]) => (
              <div key={level}>
                <h3 className="text-sm font-medium text-gray-400 mb-2">
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
        <h2 className="text-xl font-display font-semibold text-white mb-4">
          By Faculty
        </h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(unitsByFaculty)
            .sort((a, b) => b[1].length - a[1].length)
            .map(([faculty, facultyUnits]) => (
              <div 
                key={faculty}
                className="px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg"
              >
                <span className="font-mono text-electric-bright">{faculty}</span>
                <span className="text-gray-400 ml-2">{facultyUnits.length}</span>
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
          className="inline-flex items-center gap-2 px-6 py-3 bg-navy-800 border border-navy-700 text-white font-semibold rounded-lg hover:border-electric transition-colors"
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
    <div className="group p-4 bg-navy-800/50 border border-navy-700 rounded-xl hover:border-navy-600 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <Link to={`/unit/${unit.code}`} className="flex-1 min-w-0">
          <h4 className="font-mono text-electric-bright group-hover:text-electric transition-colors">
            {unit.code}
          </h4>
          <p className="text-white text-sm line-clamp-1">{unit.title}</p>
        </Link>
        <button
          onClick={() => onRemove(unit.code)}
          className="shrink-0 p-1 text-gray-500 hover:text-danger transition-colors"
          title="Remove from planner"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex items-center gap-2 mt-2 text-xs">
        <span className="text-gray-400">{unit.creditPoints} CP</span>
        {cost > 0 && (
          <span className="font-mono text-amber-bright">${cost}</span>
        )}
      </div>
    </div>
  )
}



