import { useState, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useCoursesData } from '@/hooks/useData'
import { usePlannerStore } from '@/stores/plannerStore'
import type { Course, RequirementGroup } from '@/types'
import { isUnitCode } from '@/types'

export function CoursesPage() {
  const { code } = useParams<{ code: string }>()
  const { data, loading, error } = useCoursesData()
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const coursesList = useMemo(() => {
    if (!data) return []
    const entries = Object.entries(data)
    const q = query.toLowerCase().trim()
    
    return entries
      .filter(([courseCode, course]) => {
        if (!q) return true
        return (
          courseCode.toLowerCase().includes(q) ||
          course.course_title.toLowerCase().includes(q)
        )
      })
      .filter(([, course]) => course.total_credit_points > 0) // Filter out empty courses
      .slice(0, 100)
      .map(([courseCode, course]) => ({ code: courseCode, ...course }))
  }, [data, query])

  const selectedCourse = useMemo(() => {
    if (!data || !code) return null
    return data[code] || null
  }, [data, code])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="animate-pulse">
          <div className="h-10 bg-theme-card rounded w-64 mb-8" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-theme-card rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

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

  // Detail view
  if (selectedCourse) {
    return <CourseDetail course={selectedCourse} onBack={() => navigate('/courses')} />
  }

  // List view
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-display font-bold text-theme-primary mb-4">
          Courses
        </h1>
        <p className="text-theme-tertiary mb-6">
          Browse degrees, diplomas, and certificates
        </p>
        
        {/* Search */}
        <div className="relative max-w-xl">
          <svg 
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-theme-muted"
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search courses..."
            className="w-full pl-12 pr-4 py-3 bg-theme-card border border-theme-primary rounded-lg text-theme-primary placeholder-gray-500 focus:outline-none focus:border-electric"
          />
        </div>
      </header>

      {/* Results count */}
      <p className="text-sm text-theme-tertiary mb-4">
        {coursesList.length} courses
      </p>

      {/* Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {coursesList.map((course) => (
          <Link
            key={course.code}
            to={`/courses/${course.code}`}
            className="group p-5 bg-theme-card/50 border border-theme-primary rounded-xl hover:border-electric/50 hover:bg-theme-card transition-all"
          >
            <h3 className="font-mono text-electric-bright group-hover:text-electric text-sm mb-1">
              {course.code}
            </h3>
            <p className="text-theme-primary font-medium mb-3 line-clamp-2">
              {course.course_title}
            </p>
            <div className="flex items-center gap-3 text-sm text-theme-tertiary">
              <span>{course.total_credit_points} CP</span>
              {course.statistics.total_units > 0 && (
                <>
                  <span>•</span>
                  <span>{course.statistics.total_units} units</span>
                </>
              )}
            </div>
          </Link>
        ))}
      </div>

      {coursesList.length === 0 && query && (
        <div className="text-center py-16">
          <p className="text-theme-tertiary">No courses found matching "{query}"</p>
        </div>
      )}
    </div>
  )
}

function CourseDetail({ course, onBack }: { course: Course; onBack: () => void }) {
  const { hasUnit, hasProgram, addProgram, removeProgram, units } = usePlannerStore()
  
  // Build tree structure from flat requirement groups
  const rootGroups = course.requirement_groups.filter(g => g.parent_id === null)
  
  // Calculate progress by credit points, not unit count
  // all_units contains all POSSIBLE units, not required count
  const completedUnits = Object.keys(course.all_units).filter(code => hasUnit(code))
  const completedCP = completedUnits.reduce((sum, code) => {
    const unit = units.find(u => u.code === code)
    return sum + (unit?.creditPoints || 6)
  }, 0)
  const totalCP = course.total_credit_points
  const isTracked = hasProgram(course.course_code)
  const percentage = totalCP > 0 ? Math.min(100, Math.round((completedCP / totalCP) * 100)) : 0

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <nav className="mb-6">
        <button onClick={onBack} className="text-theme-tertiary hover:text-electric transition-colors">
          ← Back to Courses
        </button>
      </nav>

      <header className="mb-8">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="font-mono text-2xl text-electric mb-2">{course.course_code}</h1>
            <h2 className="text-3xl font-display font-bold text-theme-primary">
              {course.course_title}
            </h2>
          </div>
          <button
            onClick={() => isTracked ? removeProgram(course.course_code) : addProgram(course, 'course')}
            className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              isTracked
                ? 'bg-success/20 text-success border border-success/30 hover:bg-success/30'
                : 'bg-electric text-navy-950 hover:bg-electric-bright'
            }`}
          >
            {isTracked ? (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Tracking
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Track Progress
              </>
            )}
          </button>
        </div>
        
        <div className="flex flex-wrap gap-3 mb-6">
          <span className="px-3 py-1.5 bg-theme-card rounded-lg text-theme-primary">
            {course.total_credit_points} Credit Points
          </span>
          {course.statistics.total_units > 0 && (
            <span className="px-3 py-1.5 bg-theme-card rounded-lg text-theme-secondary">
              {course.statistics.total_units} Units
            </span>
          )}
          {isTracked && (
            <span className={`px-3 py-1.5 rounded-lg font-mono ${
              percentage === 100 
                ? 'bg-success/20 text-success' 
                : 'bg-electric/20 text-electric-bright'
            }`}>
              {percentage}% Complete
            </span>
          )}
        </div>

        {/* Progress bar */}
        {totalCP > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-theme-tertiary">Progress</span>
              <span className="text-theme-primary font-mono">
                {completedCP}/{totalCP} CP ({completedUnits.length} units)
              </span>
            </div>
            <div className="h-2 bg-theme-card rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${
                  percentage >= 100 ? 'bg-success' : 'bg-electric'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        )}
      </header>

      {/* Requirements Tree */}
      <section className="space-y-4">
        <h3 className="text-lg font-display font-semibold text-theme-primary">Requirements</h3>
        {rootGroups.length > 0 ? (
          rootGroups.map(group => (
            <RequirementNode 
              key={group.id} 
              group={group} 
              allGroups={course.requirement_groups}
              allUnits={course.all_units}
            />
          ))
        ) : (
          <p className="text-theme-tertiary">No structured requirements available for this course.</p>
        )}
      </section>
    </div>
  )
}

function RequirementNode({ 
  group, 
  allGroups,
  allUnits 
}: { 
  group: RequirementGroup
  allGroups: RequirementGroup[]
  allUnits: Record<string, string>
}) {
  const [expanded, setExpanded] = useState(true)
  const { hasUnit } = usePlannerStore()
  
  const children = allGroups.filter(g => g.parent_id === group.id)
  const hasChildren = children.length > 0 || group.units.length > 0
  
  // Calculate completion for this group
  const groupUnits = group.units
  const completedCount = groupUnits.filter(code => hasUnit(code)).length

  return (
    <div className={`border-l-2 ${group.type === 'AND' ? 'border-electric/50' : 'border-amber/50'} pl-4`}>
      <div 
        className="flex items-start gap-3 cursor-pointer group"
        onClick={() => setExpanded(!expanded)}
      >
        <button className="shrink-0 mt-1 text-theme-muted group-hover:text-theme-primary transition-colors">
          <svg 
            className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
            fill="currentColor" viewBox="0 0 20 20"
          >
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </button>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 text-xs font-mono rounded ${
              group.type === 'AND' 
                ? 'bg-electric/20 text-electric-bright' 
                : 'bg-amber/20 text-amber-bright'
            }`}>
              {group.type}
            </span>
            <span className="text-theme-primary font-medium">{group.title}</span>
            {group.credit_points > 0 && (
              <span className="text-sm text-theme-tertiary">({group.credit_points} CP)</span>
            )}
            {groupUnits.length > 0 && (
              <span className="text-sm text-theme-muted">
                {completedCount}/{groupUnits.length}
              </span>
            )}
          </div>
          {group.description && (
            <p className="text-sm text-theme-tertiary line-clamp-2" 
               dangerouslySetInnerHTML={{ __html: group.description }} />
          )}
        </div>
      </div>

      {expanded && hasChildren && (
        <div className="mt-3 space-y-3">
          {/* Child groups */}
          {children.map(child => (
            <RequirementNode 
              key={child.id} 
              group={child} 
              allGroups={allGroups}
              allUnits={allUnits}
            />
          ))}
          
          {/* Units/AOS in this group */}
          {group.units.length > 0 && (
            <div className="flex flex-wrap gap-2 ml-7">
              {group.units.map(code => {
                const isUnit = isUnitCode(code)
                const inPlanner = isUnit && hasUnit(code)
                const linkPath = isUnit ? `/unit/${code}` : `/areas-of-study/${code}`
                
                return (
                  <Link
                    key={code}
                    to={linkPath}
                    className={`px-3 py-1.5 rounded-lg text-sm font-mono transition-colors ${
                      inPlanner
                        ? 'bg-success/20 text-success border border-success/30'
                        : isUnit 
                          ? 'bg-navy-700 text-electric-bright hover:bg-navy-600'
                          : 'bg-purple-900/30 text-purple-300 hover:bg-purple-900/50 border border-purple-700/50'
                    }`}
                    title={allUnits[code] || (isUnit ? 'Unit' : 'Area of Study')}
                  >
                    {code}
                    {!isUnit && ' (AOS)'}
                    {inPlanner && ' ✓'}
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}



