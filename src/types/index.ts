// Unit types
export interface Requisite {
  NumReq: number
  units: string[]
}

export interface UnitRequisites {
  permission: boolean
  prohibitions: string[]
  corequisites: Requisite[]
  prerequisites: Requisite[]
  cp_required: number
}

export interface ProcessedUnit {
  code: string
  title: string
  credit_points: string
  sca_band: string
  school: string
  academic_org: string
  requisites?: UnitRequisites
}

export type ProcessedUnitsData = Record<string, ProcessedUnit>

// Graph types for network data
export interface UnitNode {
  id: string
  unit_name: string
  school: string
  unlocks: string[]
  requires: string[]
  x?: number
  y?: number
  z?: number
}

export interface UnitLink {
  source: string | UnitNode
  target: string | UnitNode
}

export interface NetworkData {
  nodes: UnitNode[]
  links: UnitLink[]
  general_info: Record<string, ProcessedUnit>
  index_map: Record<string, number>
}

// Area of Study / Course types
export interface RequirementGroup {
  id: string
  parent_id: string | null
  type: 'AND' | 'OR'
  title: string
  description: string
  credit_points: number
  num_required: number | null
  units: string[]
  children: string[]
  level: number
}

export interface AreaOfStudy {
  course_code: string
  course_title: string
  total_credit_points: number
  requirement_groups: RequirementGroup[]
  all_units: Record<string, string>
  statistics: {
    total_requirements: number
    total_units: number
    max_depth: number
  }
}

export type AreasOfStudyData = Record<string, AreaOfStudy>

export interface Course {
  course_code: string
  course_title: string
  total_credit_points: number
  requirement_groups: RequirementGroup[]
  all_units: Record<string, string>
  statistics: {
    total_requirements: number
    total_units: number
    max_depth: number
  }
}

export type CoursesData = Record<string, Course>

// SCA Band cost mapping (2024 rates per 6CP)
export const SCA_BAND_COSTS: Record<string, number> = {
  '1': 578,   // Maths, education, etc
  '2': 1062,  // Comp sci, etc
  '3': 1687,  // Medicine, etc
  '4': 2124,  // Law, accounting, etc
}

export function getUnitCost(scaBand: string | undefined | null, creditPoints: number = 6): number {
  if (!scaBand) return 0
  const bandNumber = String(scaBand).replace(/\D/g, '')
  const costPer6CP = SCA_BAND_COSTS[bandNumber] || 0
  // Scale cost based on credit points (base is 6CP)
  return Math.round((costPer6CP / 6) * creditPoints)
}

// Helper to check if a code is a unit (3 letters + 4 numbers) vs AOS/course
export function isUnitCode(code: string): boolean {
  return /^[A-Z]{3}\d{4}$/i.test(code.trim())
}

// Helper to extract unit level from code (e.g., FIT1045 -> 1)
export function getUnitLevel(code: string): number {
  const match = code.match(/[A-Z]{3}(\d)/i)
  return match ? parseInt(match[1]) : 0
}

// Helper to extract faculty prefix from code (e.g., FIT1045 -> FIT)
export function getFacultyPrefix(code: string): string {
  const match = code.match(/^([A-Z]{2,4})/i)
  return match ? match[1].toUpperCase() : ''
}



