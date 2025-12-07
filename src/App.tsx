import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'
import { UnitPage } from './pages/UnitPage'
import { AreasOfStudyPage } from './pages/AreasOfStudyPage'
import { CoursesPage } from './pages/CoursesPage'
import { GraphPage } from './pages/GraphPage'
import { PlannerPage } from './pages/PlannerPage'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/unit/:code" element={<UnitPage />} />
        <Route path="/areas-of-study" element={<AreasOfStudyPage />} />
        <Route path="/areas-of-study/:code" element={<AreasOfStudyPage />} />
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/courses/:code" element={<CoursesPage />} />
        <Route path="/graph" element={<GraphPage />} />
        <Route path="/planner" element={<PlannerPage />} />
      </Route>
    </Routes>
  )
}

export default App




