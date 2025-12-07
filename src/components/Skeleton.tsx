import { ReactNode } from 'react'

interface SkeletonProps {
  className?: string
}

// Base skeleton with animation
export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div 
      className={`animate-pulse bg-theme-tertiary rounded ${className}`}
      style={{ 
        background: 'linear-gradient(90deg, var(--bg-tertiary) 25%, var(--bg-secondary) 50%, var(--bg-tertiary) 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite'
      }}
    />
  )
}

// Skeleton for text lines
export function SkeletonText({ lines = 1, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          className={`h-4 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`}
        />
      ))}
    </div>
  )
}

// Skeleton for unit cards
export function SkeletonCard() {
  return (
    <div className="bg-theme-card border border-theme-primary rounded-xl p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <Skeleton className="h-6 w-24 mb-2" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-3/4 mt-1" />
        </div>
        <Skeleton className="w-10 h-10 rounded-lg" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-6 w-14" />
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-12" />
      </div>
      <Skeleton className="h-3 w-1/2 mt-2" />
    </div>
  )
}

// Skeleton grid for search results
export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

// Skeleton for unit detail page
export function SkeletonUnitDetail() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-8">
        <Skeleton className="h-10 w-32 mb-4" />
        <Skeleton className="h-8 w-2/3 mb-4" />
        <div className="flex gap-3">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-28" />
        </div>
      </div>
      
      {/* Content sections */}
      <div className="space-y-8">
        <div className="bg-theme-card border border-theme-primary rounded-xl p-6">
          <Skeleton className="h-6 w-40 mb-4" />
          <SkeletonText lines={3} />
        </div>
        <div className="bg-theme-card border border-theme-primary rounded-xl p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <div className="grid gap-2 grid-cols-3">
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
          </div>
        </div>
      </div>
    </div>
  )
}

// Skeleton for AOS/Course list
export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-theme-card border border-theme-primary rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
      ))}
    </div>
  )
}

// Wrapper component to show skeleton while loading
interface LoadingWrapperProps {
  loading: boolean
  skeleton: ReactNode
  children: ReactNode
}

export function LoadingWrapper({ loading, skeleton, children }: LoadingWrapperProps) {
  if (loading) return <>{skeleton}</>
  return <>{children}</>
}

