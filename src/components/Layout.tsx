import { Outlet, NavLink, Link } from 'react-router-dom'
import { usePlannerStore } from '@/stores/plannerStore'
import { useThemeStore } from '@/stores/themeStore'

export function Layout() {
  const { units, getTotalCredits, getTotalCost } = usePlannerStore()
  const { theme, toggleTheme } = useThemeStore()
  const totalCredits = getTotalCredits()
  const totalCost = getTotalCost()

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-theme-primary bg-theme-primary/80 backdrop-blur-md">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 sm:h-16 items-center justify-between gap-2">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 sm:gap-3 group shrink-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-electric rounded flex items-center justify-center font-display font-bold text-navy-950 text-sm sm:text-base">
                M
              </div>
              <span className="font-display font-semibold text-base sm:text-lg text-theme-primary group-hover:text-electric-bright transition-colors hidden xs:block">
                Handbook
              </span>
            </Link>

            {/* Main Nav */}
            <div className="hidden lg:flex items-center gap-1">
              <NavItem to="/">Search</NavItem>
              <NavItem to="/areas-of-study">Areas of Study</NavItem>
              <NavItem to="/courses">Courses</NavItem>
              <NavItem to="/graph">Graph</NavItem>
              <NavItem to="/pathway">Pathway</NavItem>
            </div>

            {/* Right side: Theme toggle + Planner */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg bg-theme-tertiary hover:bg-theme-secondary transition-colors border border-theme-primary"
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? (
                  <svg className="w-5 h-5 text-amber-bright" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-navy-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>

              {/* Planner Badge */}
              <Link 
                to="/planner"
                className="flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-theme-card hover:bg-theme-tertiary transition-colors border border-theme-primary group"
              >
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-electric" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span className="font-medium text-theme-primary text-sm sm:text-base hidden sm:block">Planner</span>
                </div>
                {units.length > 0 && (
                  <div className="flex items-center gap-1.5 sm:gap-2 pl-2 sm:pl-3 border-l border-theme-secondary">
                    <span className="text-xs sm:text-sm text-theme-tertiary hidden md:block">
                      {units.length}
                    </span>
                    <span className="px-1.5 sm:px-2 py-0.5 text-xs font-mono bg-electric/20 text-electric-bright rounded">
                      {totalCredits}CP
                    </span>
                    <span className="px-1.5 sm:px-2 py-0.5 text-xs font-mono bg-amber/20 text-amber-bright rounded hidden sm:block">
                      ${totalCost.toLocaleString()}
                    </span>
                  </div>
                )}
              </Link>
            </div>
          </div>
        </nav>

        {/* Mobile Nav */}
        <div className="lg:hidden border-t border-theme-primary px-2 sm:px-4 py-1.5 sm:py-2 flex gap-0.5 sm:gap-1 overflow-x-auto">
          <NavItem to="/" mobile>Search</NavItem>
          <NavItem to="/areas-of-study" mobile>AOS</NavItem>
          <NavItem to="/courses" mobile>Courses</NavItem>
          <NavItem to="/graph" mobile>Graph</NavItem>
          <NavItem to="/pathway" mobile>Path</NavItem>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-theme-primary py-4 sm:py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs sm:text-sm text-theme-muted">
          <p>
            A better way to explore the Monash University handbook.
            Data sourced from the official handbook.
          </p>
        </div>
      </footer>
    </div>
  )
}

function NavItem({ to, children, mobile }: { to: string; children: React.ReactNode; mobile?: boolean }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
          isActive
            ? 'bg-electric text-navy-950'
            : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-tertiary'
        } ${mobile ? 'shrink-0' : ''}`
      }
    >
      {children}
    </NavLink>
  )
}
