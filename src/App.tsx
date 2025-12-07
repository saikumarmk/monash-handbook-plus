import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ErrorBoundary } from './components/ErrorBoundary'
import { HomePage } from './pages/HomePage'
import { UnitPage } from './pages/UnitPage'
import { AreasOfStudyPage } from './pages/AreasOfStudyPage'
import { CoursesPage } from './pages/CoursesPage'
import { GraphPage } from './pages/GraphPage'
import { PlannerPage } from './pages/PlannerPage'
import { PathwayPage } from './pages/PathwayPage'

function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<ErrorBoundary><HomePage /></ErrorBoundary>} />
          <Route path="/unit/:code" element={<ErrorBoundary><UnitPage /></ErrorBoundary>} />
          <Route path="/areas-of-study" element={<ErrorBoundary><AreasOfStudyPage /></ErrorBoundary>} />
          <Route path="/areas-of-study/:code" element={<ErrorBoundary><AreasOfStudyPage /></ErrorBoundary>} />
          <Route path="/courses" element={<ErrorBoundary><CoursesPage /></ErrorBoundary>} />
          <Route path="/courses/:code" element={<ErrorBoundary><CoursesPage /></ErrorBoundary>} />
          <Route path="/graph" element={<ErrorBoundary><GraphPage /></ErrorBoundary>} />
          <Route path="/planner" element={<ErrorBoundary><PlannerPage /></ErrorBoundary>} />
          <Route path="/pathway" element={<ErrorBoundary><PathwayPage /></ErrorBoundary>} />
        </Route>
      </Routes>
    </ErrorBoundary>
  )
}

export default App




