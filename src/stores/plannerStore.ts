import { create } from 'zustand'
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware'
import type { ProcessedUnit, AreaOfStudy, Course, RequirementGroup } from '@/types'
import { getUnitCost } from '@/types'

interface PlannerUnit {
  code: string
  title: string
  creditPoints: number
  scaBand: string | undefined
  school: string
}

interface TrackedProgram {
  code: string
  title: string
  type: 'aos' | 'course'
  totalCreditPoints: number
}

// Compressed format for storage (stores only essential data)
interface CompressedPlannerUnit {
  c: string  // code
  t: string  // title
  p: number  // creditPoints
  b?: string // scaBand
  s: string  // school
}

interface CompressedProgram {
  c: string  // code
  t: string  // title
  y: 'a' | 'c'  // type: aos or course
  p: number  // totalCreditPoints
}

interface CompressedSavedPlan {
  i: string  // id
  n: string  // name
  c: number  // createdAt
  u: number  // updatedAt
  us: CompressedPlannerUnit[]  // units
  ps: CompressedProgram[]  // programs
}

interface SavedPlan {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  units: PlannerUnit[]
  trackedPrograms: TrackedProgram[]
}

interface PlannerState {
  units: PlannerUnit[]
  trackedPrograms: TrackedProgram[]
  savedPlans: SavedPlan[]
  currentPlanId: string | null
  
  // Unit actions
  addUnit: (unit: ProcessedUnit) => void
  removeUnit: (code: string) => void
  hasUnit: (code: string) => boolean
  
  // Program tracking actions
  addProgram: (program: AreaOfStudy | Course, type: 'aos' | 'course') => void
  removeProgram: (code: string) => void
  hasProgram: (code: string) => boolean
  
  // Saved plans actions
  savePlan: (name: string) => string
  loadPlan: (planId: string) => void
  deletePlan: (planId: string) => void
  renamePlan: (planId: string, newName: string) => void
  updateCurrentPlan: () => void
  newPlan: () => void
  
  // Utility
  clearAll: () => void
  clearUnits: () => void
  clearPrograms: () => void
  getTotalCredits: () => number
  getTotalCost: () => number
}

// Compression helpers
function compressUnit(u: PlannerUnit): CompressedPlannerUnit {
  return { c: u.code, t: u.title, p: u.creditPoints, b: u.scaBand, s: u.school }
}

function decompressUnit(u: CompressedPlannerUnit): PlannerUnit {
  return { code: u.c, title: u.t, creditPoints: u.p, scaBand: u.b, school: u.s }
}

function compressProgram(p: TrackedProgram): CompressedProgram {
  return { c: p.code, t: p.title, y: p.type === 'aos' ? 'a' : 'c', p: p.totalCreditPoints }
}

function decompressProgram(p: CompressedProgram): TrackedProgram {
  return { code: p.c, title: p.t, type: p.y === 'a' ? 'aos' : 'course', totalCreditPoints: p.p }
}

function compressPlan(plan: SavedPlan): CompressedSavedPlan {
  return {
    i: plan.id,
    n: plan.name,
    c: plan.createdAt,
    u: plan.updatedAt,
    us: plan.units.map(compressUnit),
    ps: plan.trackedPrograms.map(compressProgram),
  }
}

function decompressPlan(plan: CompressedSavedPlan): SavedPlan {
  return {
    id: plan.i,
    name: plan.n,
    createdAt: plan.c,
    updatedAt: plan.u,
    units: plan.us.map(decompressUnit),
    trackedPrograms: plan.ps.map(decompressProgram),
  }
}

// Custom storage with compression
const compressedStorage: StateStorage = {
  getItem: (name) => {
    const value = localStorage.getItem(name)
    if (!value) return null
    
    try {
      const parsed = JSON.parse(value)
      // Decompress saved plans if in compressed format
      if (parsed.state?.savedPlans) {
        parsed.state.savedPlans = parsed.state.savedPlans.map((p: CompressedSavedPlan | SavedPlan) => {
          // Check if already decompressed (has 'id' field vs 'i' field)
          if ('id' in p) return p
          return decompressPlan(p as CompressedSavedPlan)
        })
      }
      // Decompress current units
      if (parsed.state?.units && parsed.state.units[0]?.c !== undefined) {
        parsed.state.units = parsed.state.units.map(decompressUnit)
      }
      // Decompress current programs
      if (parsed.state?.trackedPrograms && parsed.state.trackedPrograms[0]?.y !== undefined) {
        parsed.state.trackedPrograms = parsed.state.trackedPrograms.map(decompressProgram)
      }
      return JSON.stringify(parsed)
    } catch {
      return value
    }
  },
  setItem: (name, value) => {
    try {
      const parsed = JSON.parse(value)
      // Compress saved plans
      if (parsed.state?.savedPlans) {
        parsed.state.savedPlans = parsed.state.savedPlans.map(compressPlan)
      }
      // Compress current units
      if (parsed.state?.units) {
        parsed.state.units = parsed.state.units.map(compressUnit)
      }
      // Compress current programs
      if (parsed.state?.trackedPrograms) {
        parsed.state.trackedPrograms = parsed.state.trackedPrograms.map(compressProgram)
      }
      localStorage.setItem(name, JSON.stringify(parsed))
    } catch {
      localStorage.setItem(name, value)
    }
  },
  removeItem: (name) => localStorage.removeItem(name),
}

// Helper to calculate completion status for a requirement group
export function calculateGroupCompletion(
  group: RequirementGroup,
  allGroups: RequirementGroup[],
  completedUnits: Set<string>
): { completed: number; required: number; isComplete: boolean } {
  // Count units directly in this group
  const unitsCompleted = group.units.filter(u => completedUnits.has(u)).length
  const unitsRequired = group.type === 'AND' 
    ? group.units.length 
    : Math.min(group.num_required || 1, group.units.length)
  
  // Recursively check children
  const children = allGroups.filter(g => g.parent_id === group.id)
  let childrenComplete = 0
  let childrenRequired = 0
  
  for (const child of children) {
    const childResult = calculateGroupCompletion(child, allGroups, completedUnits)
    if (childResult.isComplete) childrenComplete++
    childrenRequired++
  }
  
  // For AND groups, all must be complete
  // For OR groups, num_required must be complete
  const isComplete = group.type === 'AND'
    ? (unitsCompleted >= unitsRequired && childrenComplete >= childrenRequired)
    : (unitsCompleted >= unitsRequired || childrenComplete >= (group.num_required || 1))
  
  return {
    completed: unitsCompleted + childrenComplete,
    required: unitsRequired + childrenRequired,
    isComplete
  }
}

// Calculate overall program completion
export function calculateProgramCompletion(
  requirementGroups: RequirementGroup[],
  allUnits: Record<string, string>,
  completedUnits: Set<string>
): { completedUnits: number; totalUnits: number; percentage: number } {
  const totalUnits = Object.keys(allUnits).length
  const completedCount = Object.keys(allUnits).filter(u => completedUnits.has(u)).length
  
  return {
    completedUnits: completedCount,
    totalUnits,
    percentage: totalUnits > 0 ? Math.round((completedCount / totalUnits) * 100) : 0
  }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

export const usePlannerStore = create<PlannerState>()(
  persist(
    (set, get) => ({
      units: [],
      trackedPrograms: [],
      savedPlans: [],
      currentPlanId: null,
      
      addUnit: (unit: ProcessedUnit) => {
        const { units } = get()
        if (units.some(u => u.code === unit.code)) return
        
        set({
          units: [...units, {
            code: unit.code,
            title: unit.title,
            creditPoints: parseInt(unit.credit_points) || 6,
            scaBand: unit.sca_band,
            school: unit.school,
          }]
        })
      },
      
      removeUnit: (code: string) => {
        set({ units: get().units.filter(u => u.code !== code) })
      },
      
      hasUnit: (code: string) => {
        return get().units.some(u => u.code === code)
      },
      
      addProgram: (program: AreaOfStudy | Course, type: 'aos' | 'course') => {
        const { trackedPrograms } = get()
        if (trackedPrograms.some(p => p.code === program.course_code)) return
        
        set({
          trackedPrograms: [...trackedPrograms, {
            code: program.course_code,
            title: program.course_title,
            type,
            totalCreditPoints: program.total_credit_points,
          }]
        })
      },
      
      removeProgram: (code: string) => {
        set({ trackedPrograms: get().trackedPrograms.filter(p => p.code !== code) })
      },
      
      hasProgram: (code: string) => {
        return get().trackedPrograms.some(p => p.code === code)
      },
      
      // Save current state as a new plan
      savePlan: (name: string) => {
        const { units, trackedPrograms, savedPlans } = get()
        const id = generateId()
        const now = Date.now()
        
        const newPlan: SavedPlan = {
          id,
          name,
          createdAt: now,
          updatedAt: now,
          units: [...units],
          trackedPrograms: [...trackedPrograms],
        }
        
        set({
          savedPlans: [...savedPlans, newPlan],
          currentPlanId: id,
        })
        
        return id
      },
      
      // Load a saved plan
      loadPlan: (planId: string) => {
        const { savedPlans } = get()
        const plan = savedPlans.find(p => p.id === planId)
        if (!plan) return
        
        set({
          units: [...plan.units],
          trackedPrograms: [...plan.trackedPrograms],
          currentPlanId: planId,
        })
      },
      
      // Delete a saved plan
      deletePlan: (planId: string) => {
        const { savedPlans, currentPlanId } = get()
        set({
          savedPlans: savedPlans.filter(p => p.id !== planId),
          currentPlanId: currentPlanId === planId ? null : currentPlanId,
        })
      },
      
      // Rename a plan
      renamePlan: (planId: string, newName: string) => {
        const { savedPlans } = get()
        set({
          savedPlans: savedPlans.map(p => 
            p.id === planId 
              ? { ...p, name: newName, updatedAt: Date.now() }
              : p
          ),
        })
      },
      
      // Update the current plan with current state
      updateCurrentPlan: () => {
        const { units, trackedPrograms, savedPlans, currentPlanId } = get()
        if (!currentPlanId) return
        
        set({
          savedPlans: savedPlans.map(p => 
            p.id === currentPlanId
              ? { ...p, units: [...units], trackedPrograms: [...trackedPrograms], updatedAt: Date.now() }
              : p
          ),
        })
      },
      
      // Start a new unsaved plan
      newPlan: () => {
        set({
          units: [],
          trackedPrograms: [],
          currentPlanId: null,
        })
      },
      
      clearAll: () => {
        set({ units: [], trackedPrograms: [], currentPlanId: null })
      },
      
      clearUnits: () => {
        set({ units: [] })
      },
      
      clearPrograms: () => {
        set({ trackedPrograms: [] })
      },
      
      getTotalCredits: () => {
        return get().units.reduce((sum, u) => sum + u.creditPoints, 0)
      },
      
      getTotalCost: () => {
        return get().units.reduce((sum, u) => {
          return sum + getUnitCost(u.scaBand, u.creditPoints)
        }, 0)
      },
    }),
    {
      name: 'monash-planner-storage',
      storage: createJSONStorage(() => compressedStorage),
    }
  )
)
