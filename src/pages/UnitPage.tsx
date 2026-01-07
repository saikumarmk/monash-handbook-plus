import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useUnit, useUnitsData } from '@/hooks/useData'
import { getUnitCost, getSemestersFromOfferings, hasExam } from '@/types'
import { usePlannerStore } from '@/stores/plannerStore'
import { SkeletonUnitDetail } from '@/components/Skeleton'

export function UnitPage() {
  const { code } = useParams<{ code: string }>()
  const { unit, unlocks, requires, loading, error } = useUnit(code)
  const { data: allUnits } = useUnitsData()
  const { addUnit, removeUnit, hasUnit } = usePlannerStore()
  
  if (loading) {
    return <SkeletonUnitDetail />
  }

  if (error || !unit) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h1 className="text-3xl font-display font-bold text-theme-primary mb-4">
          Unit Not Found
        </h1>
        <p className="text-theme-tertiary mb-8">
          The unit <span className="font-mono text-electric">{code}</span> could not be found.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-electric text-navy-950 font-semibold rounded-lg hover:bg-electric-bright transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Search
        </Link>
      </div>
    )
  }

  const cost = getUnitCost(unit.sca_band, parseInt(unit.credit_points) || 6)
  const isInPlanner = hasUnit(unit.code)
  const prereqs = unit.requisites?.prerequisites || []
  const coreqs = unit.requisites?.corequisites || []
  const prohibitions = unit.requisites?.prohibitions || []
  const semesters = getSemestersFromOfferings(unit.offerings)
  const hasExamAssessment = hasExam(unit.assessments)

  // Build meta description
  const metaDescription = [
    `${unit.code} - ${unit.title}`,
    `${unit.credit_points} Credit Points`,
    cost > 0 ? `$${cost} (Band ${String(unit.sca_band).replace(/\D/g, '')})` : null,
    unit.school,
    semesters.length > 0 ? `Offered: ${semesters.join(', ')}` : null,
    hasExamAssessment ? 'Has Exam' : unit.assessments?.length ? 'No Exam' : null,
    unlocks.length > 0 ? `Unlocks ${unlocks.length} unit${unlocks.length > 1 ? 's' : ''}` : null,
  ].filter(Boolean).join(' • ')

  const pageTitle = `${unit.code} - ${unit.title} | Monash Handbook+`
  const pageUrl = typeof window !== 'undefined' ? window.location.href : ''

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={metaDescription} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:title" content={`${unit.code} - ${unit.title}`} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:site_name" content="Monash Handbook+" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={`${unit.code} - ${unit.title}`} />
        <meta name="twitter:description" content={metaDescription} />
      </Helmet>

      {/* Breadcrumb */}
      <nav className="mb-6">
        <Link to="/" className="text-theme-tertiary hover:text-electric transition-colors">
          ← Back to search
        </Link>
      </nav>

      {/* Header */}
      <header className="mb-8">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-4xl font-mono font-bold text-electric mb-2">
              {unit.code}
            </h1>
            <h2 className="text-2xl font-display text-theme-primary">
              {unit.title}
            </h2>
          </div>
          <button
            onClick={() => isInPlanner ? removeUnit(unit.code) : addUnit(unit)}
            className={`shrink-0 flex items-center gap-2 px-5 py-3 rounded-lg font-semibold transition-all ${
              isInPlanner
                ? 'bg-success text-navy-950 hover:bg-success/80'
                : 'bg-electric text-navy-950 hover:bg-electric-bright'
            }`}
          >
            {isInPlanner ? (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                In Planner
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add to Planner
              </>
            )}
          </button>
        </div>

        {/* Meta info */}
        <div className="flex flex-wrap gap-3">
          <span className="px-3 py-1.5 bg-theme-card rounded-lg text-theme-primary font-medium">
            {unit.credit_points} Credit Points
          </span>
          {cost > 0 && unit.sca_band && (
            <span className="px-3 py-1.5 bg-amber/20 text-amber-bright rounded-lg font-mono font-medium">
              ${cost} (Band {String(unit.sca_band).replace(/\D/g, '')})
            </span>
          )}
          {semesters.length > 0 && (
            <span className="px-3 py-1.5 bg-electric/20 text-electric-bright rounded-lg font-medium">
              📅 {semesters.join(', ')}
            </span>
          )}
          {hasExamAssessment ? (
            <span className="px-3 py-1.5 bg-danger/20 text-danger rounded-lg font-medium">
              📝 Has Exam
            </span>
          ) : unit.assessments && unit.assessments.length > 0 && (
            <span className="px-3 py-1.5 bg-success/20 text-success rounded-lg font-medium">
              ✓ No Exam
            </span>
          )}
          <span className="px-3 py-1.5 bg-theme-card rounded-lg text-theme-secondary">
            {unit.school}
          </span>
        </div>
      </header>

      {/* Offerings & Assessment Info */}
      {(unit.offerings?.length || unit.assessments?.length) && (
        <div className="mb-8 grid gap-4 md:grid-cols-2">
          {/* Offerings */}
          {unit.offerings && unit.offerings.length > 0 && (
            <div className="p-4 bg-theme-card/50 border border-theme-primary rounded-xl">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-theme-secondary mb-3">
                <span>📍</span> Offerings
              </h3>
              <div className="space-y-2">
                {unit.offerings.map((offering, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <span className="px-2 py-0.5 bg-electric/10 text-electric rounded text-xs font-medium shrink-0">
                      {offering.period.replace(' teaching period, Malaysia campus', '').replace(/ intake/i, '')}
                    </span>
                    <span className="text-theme-tertiary">{offering.location}</span>
                    <span className="text-theme-muted text-xs">
                      {offering.mode.includes('FLEXIBLE') ? '🔄 Flexible' : 
                       offering.mode.includes('ONLINE') ? '💻 Online' : '🏫 On-campus'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assessments */}
          {unit.assessments && unit.assessments.length > 0 && (
            <div className="p-4 bg-theme-card/50 border border-theme-primary rounded-xl">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-theme-secondary mb-3">
                <span>📋</span> Assessment
              </h3>
              <div className="flex flex-wrap gap-2">
                {unit.assessments.map((assessment, i) => (
                  <span 
                    key={i} 
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      assessment.type?.toLowerCase().includes('exam') || assessment.name?.toLowerCase().includes('exam')
                        ? 'bg-danger/20 text-danger'
                        : assessment.type?.toLowerCase().includes('assignment')
                        ? 'bg-electric/10 text-electric-bright'
                        : 'bg-navy-700 text-theme-secondary'
                    }`}
                  >
                    {assessment.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Prerequisites */}
        <Section title="Prerequisites" icon="🔒" count={requires.length}>
          {prereqs.length > 0 ? (
            <div className="space-y-3">
              {prereqs.map((req, i) => (
                <RequisiteGroup key={i} requisite={req} allUnits={allUnits} />
              ))}
            </div>
          ) : requires.length > 0 ? (
            <UnitList codes={requires} allUnits={allUnits} />
          ) : (
            <p className="text-theme-muted">No prerequisites required</p>
          )}
          {unit.requisites?.cp_required && unit.requisites.cp_required > 0 && (
            <p className="mt-3 text-sm text-theme-tertiary">
              Credit points required: {unit.requisites.cp_required}
            </p>
          )}
          {unit.requisites?.permission === true && (
            <div className="mt-3 p-3 bg-amber/10 border border-amber/30 rounded-lg">
              <p className="text-sm text-amber-bright font-medium">
                ⚠️ Permission Required
              </p>
              <p className="text-xs text-theme-tertiary mt-1">
                This unit requires permission from the unit coordinator to enrol
              </p>
            </div>
          )}
        </Section>

        {/* Corequisites */}
        <Section title="Corequisites" icon="🔗" count={coreqs.reduce((n, r) => n + r.units.length, 0)}>
          {coreqs.length > 0 ? (
            <div className="space-y-3">
              {coreqs.map((req, i) => (
                <RequisiteGroup key={i} requisite={req} allUnits={allUnits} />
              ))}
            </div>
          ) : (
            <p className="text-theme-muted">No corequisites</p>
          )}
        </Section>

        {/* Unlocks */}
        <Section title="Unlocks" icon="🚀" count={unlocks.length} highlight>
          {unlocks.length > 0 ? (
            <UnitList codes={unlocks} allUnits={allUnits} />
          ) : (
            <p className="text-theme-muted">This unit doesn't directly unlock any other units</p>
          )}
        </Section>

        {/* Prohibitions */}
        <Section title="Prohibitions" icon="⛔" count={prohibitions.length}>
          {prohibitions.length > 0 ? (
            <UnitList codes={prohibitions} allUnits={allUnits} />
          ) : (
            <p className="text-theme-muted">No prohibitions</p>
          )}
        </Section>
      </div>

      {/* Actions */}
      <div className="mt-12 flex flex-wrap justify-center gap-4">
        <Link
          to={`/pathway?target=${unit.code}`}
          className="inline-flex items-center gap-2 px-6 py-3 bg-electric text-navy-950 font-semibold rounded-lg hover:bg-electric-bright transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          Find Path to This Unit
        </Link>
        <Link
          to={`/graph?unit=${unit.code}`}
          className="inline-flex items-center gap-2 px-6 py-3 bg-theme-card border border-theme-primary text-theme-primary font-semibold rounded-lg hover:border-electric transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          View in Graph
        </Link>
      </div>
    </div>
  )
}

function Section({ 
  title, 
  icon, 
  count, 
  highlight, 
  children 
}: { 
  title: string
  icon: string
  count: number
  highlight?: boolean
  children: React.ReactNode 
}) {
  return (
    <div className={`p-6 rounded-xl border ${
      highlight 
        ? 'bg-electric/5 border-electric/30' 
        : 'bg-theme-card/50 border-theme-primary'
    }`}>
      <h3 className="flex items-center gap-2 text-lg font-display font-semibold text-theme-primary mb-4">
        <span>{icon}</span>
        {title}
        {count > 0 && (
          <span className={`text-sm px-2 py-0.5 rounded ${
            highlight ? 'bg-electric/20 text-electric-bright' : 'bg-navy-700 text-theme-tertiary'
          }`}>
            {count}
          </span>
        )}
      </h3>
      {children}
    </div>
  )
}

function RequisiteGroup({ 
  requisite, 
  allUnits 
}: { 
  requisite: { NumReq: number; units: string[] }
  allUnits: Record<string, { title: string }> | null
}) {
  const label = requisite.NumReq === requisite.units.length 
    ? 'Complete all:'
    : `Complete ${requisite.NumReq} of:`

  return (
    <div className="pl-3 border-l-2 border-navy-600">
      <p className="text-sm text-theme-tertiary mb-2">{label}</p>
      <UnitList codes={requisite.units} allUnits={allUnits} />
    </div>
  )
}

function UnitList({ 
  codes, 
  allUnits 
}: { 
  codes: string[]
  allUnits: Record<string, { title: string }> | null
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {codes.map(code => {
        const title = allUnits?.[code]?.title
        return (
          <Link
            key={code}
            to={`/unit/${code}`}
            className="group flex items-center gap-2 px-3 py-1.5 bg-navy-700 hover:bg-navy-600 rounded-lg transition-colors"
            title={title}
          >
            <span className="font-mono text-sm text-electric-bright group-hover:text-electric">
              {code}
            </span>
          </Link>
        )
      })}
    </div>
  )
}



