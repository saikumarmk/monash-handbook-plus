import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ProcessedUnit } from '@/types'
import { getUnitCost } from '@/types'

interface PlannerUnit {
  code: string
  title: string
  creditPoints: number
  scaBand: string | undefined
  school: string
}

interface PlannerState {
  units: PlannerUnit[]
  addUnit: (unit: ProcessedUnit) => void
  removeUnit: (code: string) => void
  clearAll: () => void
  hasUnit: (code: string) => boolean
  getTotalCredits: () => number
  getTotalCost: () => number
}

export const usePlannerStore = create<PlannerState>()(
  persist(
    (set, get) => ({
      units: [],
      
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
      
      clearAll: () => {
        set({ units: [] })
      },
      
      hasUnit: (code: string) => {
        return get().units.some(u => u.code === code)
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
    }
  )
)



