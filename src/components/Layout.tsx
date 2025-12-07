import { Outlet, NavLink, Link } from 'react-router-dom'
import { usePlannerStore } from '@/stores/plannerStore'

export function Layout() {
  const { units, getTotalCredits, getTotalCost } = usePlannerStore()
  const totalCredits = getTotalCredits()
  const totalCost = getTotalCost()

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-navy-700 bg-navy-950/80 backdrop-blur-md">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-electric rounded flex items-center justify-center font-display font-bold text-navy-950">
                M
              </div>
              <span className="font-display font-semibold text-lg text-white group-hover:text-electric-bright transition-colors">
                Handbook
              </span>
            </Link>

            {/* Main Nav */}
            <div className="hidden md:flex items-center gap-1">
              <NavItem to="/">Search</NavItem>
              <NavItem to="/areas-of-study">Areas of Study</NavItem>
              <NavItem to="/courses">Courses</NavItem>
              <NavItem to="/graph">Graph</NavItem>
            </div>

            {/* Planner Badge */}
            <Link 
              to="/planner"
              className="flex items-center gap-3 px-4 py-2 rounded-lg bg-navy-800 hover:bg-navy-700 transition-colors border border-navy-700 group"
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-electric" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span className="font-medium text-white">Planner</span>
              </div>
              {units.length > 0 && (
                <div className="flex items-center gap-2 pl-3 border-l border-navy-600">
                  <span className="text-sm text-gray-400">
                    {units.length} units
                  </span>
                  <span className="px-2 py-0.5 text-xs font-mono bg-electric/20 text-electric-bright rounded">
                    {totalCredits} CP
                  </span>
                  <span className="px-2 py-0.5 text-xs font-mono bg-amber/20 text-amber-bright rounded">
                    ${totalCost.toLocaleString()}
                  </span>
                </div>
              )}
            </Link>
          </div>
        </nav>

        {/* Mobile Nav */}
        <div className="md:hidden border-t border-navy-800 px-4 py-2 flex gap-1 overflow-x-auto">
          <NavItem to="/">Search</NavItem>
          <NavItem to="/areas-of-study">AOS</NavItem>
          <NavItem to="/courses">Courses</NavItem>
          <NavItem to="/graph">Graph</NavItem>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-navy-800 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
          <p>
            A better way to explore the Monash University handbook.
            Data sourced from the official handbook.
          </p>
        </div>
      </footer>
    </div>
  )
}

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-electric text-navy-950'
            : 'text-gray-300 hover:text-white hover:bg-navy-800'
        }`
      }
    >
      {children}
    </NavLink>
  )
}




