import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useUnitsData, useSchools } from '@/hooks/useData'
import { getUnitCost, getUnitLevel, getSemestersFromOfferings, getLocationsFromOfferings, hasExam, getPrereqDepth } from '@/types'
import { usePlannerStore } from '@/stores/plannerStore'
import { SkeletonGrid } from '@/components/Skeleton'

export function HomePage() {
  const [query, setQuery] = useState('')
  const [selectedSchool, setSelectedSchool] = useState<string>('')
  const [selectedLevel, setSelectedLevel] = useState<number | ''>('')
  const [selectedBand, setSelectedBand] = useState<string>('')
  const [selectedSemester, setSelectedSemester] = useState<string>('')
  const [selectedLocation, setSelectedLocation] = useState<string>('')
  const [noExamOnly, setNoExamOnly] = useState(false)
  
  const { data: unitsData, loading, error } = useUnitsData()
  const { schools } = useSchools()
  const { addUnit, removeUnit, hasUnit } = usePlannerStore()

  // Get all unique locations from data
  const allLocations = useMemo(() => {
    if (!unitsData) return []
    const locations = new Set<string>()
    for (const unit of Object.values(unitsData)) {
      for (const loc of getLocationsFromOfferings(unit.offerings)) {
        locations.add(loc)
      }
    }
    return Array.from(locations).sort()
  }, [unitsData])

  const results = useMemo(() => {
    if (!unitsData) return []
    
    const entries = Object.entries(unitsData)
    const q = query.toLowerCase().trim()
    
    return entries
      .filter(([code, unit]) => {
        // If no query and no filters, show nothing (or show featured)
        if (!q && !selectedSchool && !selectedLevel && !selectedBand && !selectedSemester && !selectedLocation && !noExamOnly) {
          return false
        }
        
        // Search in code and title
        if (q) {
          const matchesQuery = 
            code.toLowerCase().includes(q) ||
            unit.title.toLowerCase().includes(q)
          if (!matchesQuery) return false
        }
        
        // Apply filters
        if (selectedSchool && unit.school !== selectedSchool) return false
        if (selectedLevel) {
          const unitLevel = getUnitLevel(code)
          if (unitLevel !== selectedLevel) return false
        }
        if (selectedBand && (!unit.sca_band || !String(unit.sca_band).includes(selectedBand))) return false
        
        // Semester filter
        if (selectedSemester) {
          const semesters = getSemestersFromOfferings(unit.offerings)
          if (!semesters.includes(selectedSemester)) return false
        }
        
        // Location filter
        if (selectedLocation) {
          const locations = getLocationsFromOfferings(unit.offerings)
          if (!locations.includes(selectedLocation)) return false
        }
        
        // No exam filter
        if (noExamOnly && hasExam(unit.assessments)) return false
        
        return true
      })
      .slice(0, 100)
      .map(([code, unit]) => ({ code, ...unit }))
  }, [unitsData, query, selectedSchool, selectedLevel, selectedBand, selectedSemester, selectedLocation, noExamOnly])

  if (error) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-display font-bold text-danger mb-2">Failed to load data</h2>
          <p className="text-theme-tertiary">{error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-display font-bold text-theme-primary mb-4">
          Explore <span className="text-electric">Monash</span> Units
        </h1>
        <p className="text-lg text-theme-tertiary max-w-2xl mx-auto">
          Search thousands of units, see prerequisites and what they unlock, 
          calculate costs, and plan your degree.
        </p>
      </div>

      {/* Search Box */}
      <div className="max-w-3xl mx-auto mb-8">
        <div className="relative">
          <svg 
            className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-theme-muted"
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by unit code or name (e.g., FIT1045, programming)..."
            className="w-full pl-14 pr-4 py-4 bg-theme-card border border-theme-primary rounded-xl text-theme-primary placeholder-theme-muted text-lg focus:outline-none focus:border-electric focus:ring-2 focus:ring-electric/20 transition-all"
            autoFocus
          />
          {loading && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-electric border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-4xl mx-auto mb-8 flex flex-wrap gap-3 items-center">
        <select
          value={selectedSchool}
          onChange={(e) => setSelectedSchool(e.target.value)}
          className="px-4 py-2 bg-theme-card border border-theme-primary rounded-lg text-theme-primary text-sm focus:outline-none focus:border-electric"
        >
          <option value="">All Schools</option>
          {schools.map(school => (
            <option key={school} value={school}>{school}</option>
          ))}
        </select>

        <select
          value={selectedLevel}
          onChange={(e) => setSelectedLevel(e.target.value ? parseInt(e.target.value) : '')}
          className="px-4 py-2 bg-theme-card border border-theme-primary rounded-lg text-theme-primary text-sm focus:outline-none focus:border-electric"
        >
          <option value="">All Levels</option>
          <option value="1">Level 1</option>
          <option value="2">Level 2</option>
          <option value="3">Level 3</option>
          <option value="4">Level 4+</option>
        </select>

        <select
          value={selectedSemester}
          onChange={(e) => setSelectedSemester(e.target.value)}
          className="px-4 py-2 bg-theme-card border border-theme-primary rounded-lg text-theme-primary text-sm focus:outline-none focus:border-electric"
        >
          <option value="">All Semesters</option>
          <option value="S1">Semester 1</option>
          <option value="S2">Semester 2</option>
          <option value="Summer">Summer</option>
          <option value="Winter">Winter</option>
        </select>

        <select
          value={selectedLocation}
          onChange={(e) => setSelectedLocation(e.target.value)}
          className="px-4 py-2 bg-theme-card border border-theme-primary rounded-lg text-theme-primary text-sm focus:outline-none focus:border-electric"
        >
          <option value="">All Locations</option>
          {allLocations.map(loc => (
            <option key={loc} value={loc}>{loc}</option>
          ))}
        </select>

        <select
          value={selectedBand}
          onChange={(e) => setSelectedBand(e.target.value)}
          className="px-4 py-2 bg-theme-card border border-theme-primary rounded-lg text-theme-primary text-sm focus:outline-none focus:border-electric"
        >
          <option value="">All Cost Bands</option>
          <option value="1">Band 1 (Lowest)</option>
          <option value="2">Band 2</option>
          <option value="3">Band 3</option>
          <option value="4">Band 4 (Highest)</option>
        </select>

        <label className="flex items-center gap-2 px-4 py-2 bg-theme-card border border-theme-primary rounded-lg text-theme-primary text-sm cursor-pointer hover:border-electric transition-colors">
          <input
            type="checkbox"
            checked={noExamOnly}
            onChange={(e) => setNoExamOnly(e.target.checked)}
            className="w-4 h-4 rounded bg-theme-tertiary border-theme-secondary text-electric focus:ring-electric"
          />
          <span>No Exams</span>
        </label>

        {(selectedSchool || selectedLevel || selectedBand || selectedSemester || selectedLocation || noExamOnly) && (
          <button
            onClick={() => {
              setSelectedSchool('')
              setSelectedLevel('')
              setSelectedBand('')
              setSelectedSemester('')
              setSelectedLocation('')
              setNoExamOnly(false)
            }}
            className="px-4 py-2 text-sm text-theme-tertiary hover:text-theme-primary transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Loading State */}
      {loading && query && (
        <>
          <div className="mb-4 text-sm text-theme-tertiary">Loading...</div>
          <SkeletonGrid count={6} />
        </>
      )}

      {/* Results */}
      {!loading && results.length > 0 && (
        <div className="mb-4 text-sm text-theme-tertiary">
          Showing {results.length} result{results.length !== 1 ? 's' : ''}
        </div>
      )}

      {!loading && <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {results.map((unit) => {
          const cost = getUnitCost(unit.sca_band, parseInt(unit.credit_points) || 6)
          const isInPlanner = hasUnit(unit.code)
          const semesters = getSemestersFromOfferings(unit.offerings)
          const hasExamAssessment = hasExam(unit.assessments)
          const prereqDepth = unitsData ? getPrereqDepth(unit.code, unitsData) : 0
          
          return (
            <div
              key={unit.code}
              className="group bg-theme-card border border-theme-primary rounded-xl p-5 hover:border-electric/50 transition-all"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <Link to={`/unit/${unit.code}`} className="flex-1 min-w-0">
                  <h3 className="font-mono text-lg font-semibold text-electric-bright group-hover:text-electric transition-colors">
                    {unit.code}
                  </h3>
                  <p className="text-theme-primary font-medium mt-1 line-clamp-2">
                    {unit.title}
                  </p>
                </Link>
                <button
                  onClick={() => isInPlanner ? removeUnit(unit.code) : addUnit(unit)}
                  className={`shrink-0 p-2 rounded-lg transition-colors ${
                    isInPlanner
                      ? 'bg-success/20 text-success hover:bg-success/30'
                      : 'bg-theme-tertiary text-theme-tertiary hover:text-electric hover:bg-theme-secondary'
                  }`}
                  title={isInPlanner ? 'Remove from planner' : 'Add to planner'}
                >
                  {isInPlanner ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  )}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="px-2 py-0.5 bg-theme-tertiary rounded text-theme-secondary">
                  {unit.credit_points} CP
                </span>
                {cost > 0 && (
                  <span className="px-2 py-0.5 bg-amber/20 text-amber-bright rounded font-mono">
                    ${cost}
                  </span>
                )}
                {semesters.length > 0 && (
                  <span className="px-2 py-0.5 bg-electric/10 text-electric-bright rounded">
                    {semesters.join('/')}
                  </span>
                )}
                {hasExamAssessment !== undefined && (
                  <span className={`px-2 py-0.5 rounded ${
                    hasExamAssessment 
                      ? 'bg-danger/20 text-danger' 
                      : 'bg-success/20 text-success'
                  }`}>
                    {hasExamAssessment ? '📝' : '✓'}
                  </span>
                )}
                {prereqDepth > 0 && (
                  <span 
                    className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded"
                    title={`Requires ${prereqDepth} prerequisite unit${prereqDepth > 1 ? 's' : ''} chain`}
                  >
                    🔗{prereqDepth}
                  </span>
                )}
              </div>
              <div className="mt-2">
                <span className="text-theme-muted text-xs truncate block" title={unit.school}>
                  {unit.school}
                </span>
              </div>
            </div>
          )
        })}
      </div>}

      {/* Empty State */}
      {query && results.length === 0 && !loading && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-display font-semibold text-theme-primary mb-2">
            No units found
          </h3>
          <p className="text-theme-tertiary">
            Try a different search term or adjust your filters
          </p>
        </div>
      )}

      {/* Initial State */}
      {!query && !selectedSchool && !selectedLevel && !selectedBand && !selectedSemester && !selectedLocation && !noExamOnly && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-xl font-display font-semibold text-theme-primary mb-2">
            Start searching
          </h3>
          <p className="text-theme-tertiary mb-6">
            Enter a unit code or keyword to explore the handbook
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => setQuery('FIT')}
              className="px-4 py-2 bg-theme-card border border-theme-primary rounded-lg text-sm text-theme-primary hover:border-electric transition-colors"
            >
              FIT (IT)
            </button>
            <button
              onClick={() => setQuery('MTH')}
              className="px-4 py-2 bg-theme-card border border-theme-primary rounded-lg text-sm text-theme-primary hover:border-electric transition-colors"
            >
              MTH (Maths)
            </button>
            <button
              onClick={() => setQuery('ENG')}
              className="px-4 py-2 bg-theme-card border border-theme-primary rounded-lg text-sm text-theme-primary hover:border-electric transition-colors"
            >
              ENG (Engineering)
            </button>
            <button
              onClick={() => setQuery('programming')}
              className="px-4 py-2 bg-theme-card border border-theme-primary rounded-lg text-sm text-theme-primary hover:border-electric transition-colors"
            >
              programming
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
