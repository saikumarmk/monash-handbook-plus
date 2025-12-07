import { useParams, Link } from 'react-router-dom'
import { useUnit, useUnitsData } from '@/hooks/useData'
import { getUnitCost } from '@/types'
import { usePlannerStore } from '@/stores/plannerStore'

export function UnitPage() {
  const { code } = useParams<{ code: string }>()
  const { unit, unlocks, requires, loading, error } = useUnit(code)
  const { data: allUnits } = useUnitsData()
  const { addUnit, removeUnit, hasUnit } = usePlannerStore()
  
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="animate-pulse">
          <div className="h-8 bg-navy-800 rounded w-32 mb-4" />
          <div className="h-12 bg-navy-800 rounded w-96 mb-8" />
          <div className="h-64 bg-navy-800 rounded" />
        </div>
      </div>
    )
  }

  if (error || !unit) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h1 className="text-3xl font-display font-bold text-white mb-4">
          Unit Not Found
        </h1>
        <p className="text-gray-400 mb-8">
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Breadcrumb */}
      <nav className="mb-6">
        <Link to="/" className="text-gray-400 hover:text-electric transition-colors">
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
            <h2 className="text-2xl font-display text-white">
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
          <span className="px-3 py-1.5 bg-navy-800 rounded-lg text-white font-medium">
            {unit.credit_points} Credit Points
          </span>
          {cost > 0 && unit.sca_band && (
            <span className="px-3 py-1.5 bg-amber/20 text-amber-bright rounded-lg font-mono font-medium">
              ${cost} (Band {String(unit.sca_band).replace(/\D/g, '')})
            </span>
          )}
          <span className="px-3 py-1.5 bg-navy-800 rounded-lg text-gray-300">
            {unit.school}
          </span>
        </div>
      </header>

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
            <p className="text-gray-500">No prerequisites required</p>
          )}
          {unit.requisites?.cp_required > 0 && (
            <p className="mt-3 text-sm text-gray-400">
              Credit points required: {unit.requisites.cp_required}
            </p>
          )}
          {unit.requisites?.permission === true && (
            <div className="mt-3 p-3 bg-amber/10 border border-amber/30 rounded-lg">
              <p className="text-sm text-amber-bright font-medium">
                ⚠️ Permission Required
              </p>
              <p className="text-xs text-gray-400 mt-1">
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
            <p className="text-gray-500">No corequisites</p>
          )}
        </Section>

        {/* Unlocks */}
        <Section title="Unlocks" icon="🚀" count={unlocks.length} highlight>
          {unlocks.length > 0 ? (
            <UnitList codes={unlocks} allUnits={allUnits} />
          ) : (
            <p className="text-gray-500">This unit doesn't directly unlock any other units</p>
          )}
        </Section>

        {/* Prohibitions */}
        <Section title="Prohibitions" icon="⛔" count={prohibitions.length}>
          {prohibitions.length > 0 ? (
            <UnitList codes={prohibitions} allUnits={allUnits} />
          ) : (
            <p className="text-gray-500">No prohibitions</p>
          )}
        </Section>
      </div>

      {/* View in Graph */}
      <div className="mt-12 text-center">
        <Link
          to={`/graph?unit=${unit.code}`}
          className="inline-flex items-center gap-2 px-6 py-3 bg-navy-800 border border-navy-700 text-white font-semibold rounded-lg hover:border-electric transition-colors"
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
        : 'bg-navy-800/50 border-navy-700'
    }`}>
      <h3 className="flex items-center gap-2 text-lg font-display font-semibold text-white mb-4">
        <span>{icon}</span>
        {title}
        {count > 0 && (
          <span className={`text-sm px-2 py-0.5 rounded ${
            highlight ? 'bg-electric/20 text-electric-bright' : 'bg-navy-700 text-gray-400'
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
      <p className="text-sm text-gray-400 mb-2">{label}</p>
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



