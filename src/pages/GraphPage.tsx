import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useNetworkData, useSchools } from '@/hooks/useData'
import { usePlannerStore } from '@/stores/plannerStore'
import type { UnitNode } from '@/types'

// Dynamic import for force graph (SSR-safe)
import ForceGraph2D from 'react-force-graph-2d'

export function GraphPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialUnit = searchParams.get('unit') || ''
  const showPlanner = searchParams.get('planner') === 'true'
  
  const { data: networkData, loading, error } = useNetworkData()
  const { schools } = useSchools()
  const { units: plannerUnits } = usePlannerStore()
  
  const [searchQuery, setSearchQuery] = useState(initialUnit)
  const [selectedSchool, setSelectedSchool] = useState('')
  const [showUnlocks, setShowUnlocks] = useState(true)
  const [showRequires, setShowRequires] = useState(true)
  const [selectedNode, setSelectedNode] = useState<UnitNode | null>(null)
  const [plannerMode, setPlannerMode] = useState(showPlanner)
  
  const graphRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

  // Handle resize with ResizeObserver for accurate container sizing
  useEffect(() => {
    if (!containerRef.current) return
    
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setDimensions({
          width: rect.width || containerRef.current.offsetWidth,
          height: rect.height || containerRef.current.offsetHeight
        })
      }
    }
    
    // Initial update after a small delay to ensure layout is complete
    const timeoutId = setTimeout(updateDimensions, 100)
    
    // Use ResizeObserver for responsive updates
    const resizeObserver = new ResizeObserver(updateDimensions)
    resizeObserver.observe(containerRef.current)
    
    return () => {
      clearTimeout(timeoutId)
      resizeObserver.disconnect()
    }
  }, [loading])

  // Filter graph data
  const filteredData = useMemo(() => {
    if (!networkData) return { nodes: [], links: [] }
    
    let nodes = networkData.nodes
    let links = networkData.links
    
    // Planner mode - show only planner units and their connections
    if (plannerMode && plannerUnits.length > 0) {
      const plannerCodes = new Set(plannerUnits.map(u => u.code.toUpperCase()))
      const relatedNodes = new Set<string>()
      
      // Add planner units
      plannerCodes.forEach(code => relatedNodes.add(code))
      
      // Add unlocks and requires for planner units
      for (const code of plannerCodes) {
        const node = nodes.find(n => n.id === code)
        if (node) {
          if (showUnlocks) {
            node.unlocks.forEach(id => relatedNodes.add(id))
          }
          if (showRequires) {
            node.requires.forEach(id => relatedNodes.add(id))
          }
        }
      }
      
      nodes = nodes.filter(n => relatedNodes.has(n.id))
      links = links.filter(l => {
        const sourceId = typeof l.source === 'string' ? l.source : l.source.id
        const targetId = typeof l.target === 'string' ? l.target : l.target.id
        return relatedNodes.has(sourceId) && relatedNodes.has(targetId)
      })
      
      return { nodes, links }
    }
    
    // Filter by school
    if (selectedSchool) {
      const schoolNodes = new Set(
        nodes.filter(n => n.school === selectedSchool).map(n => n.id)
      )
      nodes = nodes.filter(n => schoolNodes.has(n.id))
      links = links.filter(l => {
        const sourceId = typeof l.source === 'string' ? l.source : l.source.id
        const targetId = typeof l.target === 'string' ? l.target : l.target.id
        return schoolNodes.has(sourceId) && schoolNodes.has(targetId)
      })
    }
    
    // Filter by search query - show the node and its neighbors
    if (searchQuery.trim()) {
      const q = searchQuery.toUpperCase().trim()
      const matchingNode = nodes.find(n => n.id === q)
      
      if (matchingNode) {
        const relatedNodes = new Set([matchingNode.id])
        
        if (showUnlocks) {
          matchingNode.unlocks.forEach(id => relatedNodes.add(id))
        }
        if (showRequires) {
          matchingNode.requires.forEach(id => relatedNodes.add(id))
        }
        
        nodes = nodes.filter(n => relatedNodes.has(n.id))
        links = links.filter(l => {
          const sourceId = typeof l.source === 'string' ? l.source : l.source.id
          const targetId = typeof l.target === 'string' ? l.target : l.target.id
          return relatedNodes.has(sourceId) && relatedNodes.has(targetId)
        })
      }
    }
    
    return { nodes, links }
  }, [networkData, selectedSchool, searchQuery, showUnlocks, showRequires, plannerMode, plannerUnits])

  // Center on node when search changes
  useEffect(() => {
    if (graphRef.current && searchQuery) {
      const node = filteredData.nodes.find(n => n.id === searchQuery.toUpperCase())
      if (node) {
        graphRef.current.centerAt(node.x, node.y, 1000)
        graphRef.current.zoom(3, 1000)
        setSelectedNode(node)
      }
    }
  }, [searchQuery, filteredData.nodes])

  const handleNodeClick = useCallback((node: UnitNode) => {
    setSelectedNode(node)
    setSearchParams(prev => {
      prev.set('unit', node.id)
      return prev
    })
    
    if (graphRef.current) {
      graphRef.current.centerAt(node.x, node.y, 500)
      graphRef.current.zoom(3, 500)
    }
  }, [setSearchParams])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // Search is already reactive
  }
  
  const plannerCodes = new Set(plannerUnits.map(u => u.code.toUpperCase()))

  if (loading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-electric border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-theme-tertiary">Loading graph data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-display font-bold text-danger mb-2">Failed to load graph</h2>
          <p className="text-theme-tertiary">{error.message}</p>
        </div>
      </div>
    )
  }

  const totalNodes = networkData?.nodes.length || 0

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Sidebar Controls */}
      <div className="w-80 bg-navy-900 border-r border-theme-primary p-4 flex flex-col overflow-hidden shrink-0">
        <h2 className="text-lg font-display font-bold text-theme-primary mb-4">Graph Controls</h2>
        
        {/* Planner Mode Toggle */}
        {plannerUnits.length > 0 && (
          <div className="mb-4 p-3 bg-theme-card rounded-lg border border-theme-primary">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={plannerMode}
                onChange={(e) => setPlannerMode(e.target.checked)}
                className="w-4 h-4 rounded border-navy-600 bg-theme-card text-electric focus:ring-electric focus:ring-offset-0"
              />
              <div>
                <span className="text-theme-primary font-medium">Show Planner Units</span>
                <p className="text-xs text-theme-tertiary">{plannerUnits.length} units in planner</p>
              </div>
            </label>
          </div>
        )}
        
        {/* Search */}
        <form onSubmit={handleSearch} className="mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Unit code (e.g., FIT1045)"
            className="w-full px-4 py-2 bg-theme-card border border-theme-primary rounded-lg text-theme-primary placeholder-gray-500 focus:outline-none focus:border-electric"
            disabled={plannerMode}
          />
        </form>

        {/* School filter */}
        <div className="mb-4">
          <label className="block text-sm text-theme-tertiary mb-2">Filter by School</label>
          <select
            value={selectedSchool}
            onChange={(e) => setSelectedSchool(e.target.value)}
            className="w-full px-4 py-2 bg-theme-card border border-theme-primary rounded-lg text-theme-primary focus:outline-none focus:border-electric"
            disabled={plannerMode}
          >
            <option value="">All Schools</option>
            {schools.map(school => (
              <option key={school} value={school}>{school}</option>
            ))}
          </select>
        </div>

        {/* Toggle options */}
        <div className="mb-4 space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={showUnlocks}
              onChange={(e) => setShowUnlocks(e.target.checked)}
              className="w-4 h-4 rounded border-navy-600 bg-theme-card text-electric focus:ring-electric focus:ring-offset-0"
            />
            <span className="text-gray-300">Show Unlocks</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={showRequires}
              onChange={(e) => setShowRequires(e.target.checked)}
              className="w-4 h-4 rounded border-navy-600 bg-theme-card text-electric focus:ring-electric focus:ring-offset-0"
            />
            <span className="text-gray-300">Show Prerequisites</span>
          </label>
        </div>

        {/* Stats */}
        <div className="text-sm text-theme-tertiary mb-4">
          <p>{filteredData.nodes.length} nodes, {filteredData.links.length} links</p>
          <p className="text-xs text-theme-muted">Total in database: {totalNodes}</p>
        </div>
        
        {/* Warning for large graphs */}
        {filteredData.nodes.length > 1000 && (
          <div className="mb-4 p-3 bg-amber/10 border border-amber/30 rounded-lg">
            <p className="text-xs text-amber-bright">
              ⚠️ Large graph may be slow. Use filters to narrow down.
            </p>
          </div>
        )}

        {/* Selected Node Info */}
        {selectedNode && (
          <div className="mt-auto p-4 bg-theme-card rounded-xl border border-theme-primary">
            <h3 className="font-mono text-lg text-electric-bright mb-1">
              {selectedNode.id}
            </h3>
            <p className="text-theme-primary font-medium mb-3">
              {selectedNode.unit_name}
            </p>
            <p className="text-sm text-theme-tertiary mb-3 line-clamp-1">
              {selectedNode.school}
            </p>
            <div className="flex gap-2 text-sm mb-3">
              <span className="px-2 py-0.5 bg-electric/20 text-electric-bright rounded">
                Unlocks: {selectedNode.unlocks.length}
              </span>
              <span className="px-2 py-0.5 bg-amber/20 text-amber-bright rounded">
                Requires: {selectedNode.requires.length}
              </span>
            </div>
            <Link
              to={`/unit/${selectedNode.id}`}
              className="block w-full py-2 bg-electric text-navy-950 font-semibold text-center rounded-lg hover:bg-electric-bright transition-colors"
            >
              View Details
            </Link>
          </div>
        )}
      </div>

      {/* Graph Canvas */}
      <div ref={containerRef} className="flex-1 bg-theme-primary min-w-0">
        {filteredData.nodes.length > 0 ? (
          <ForceGraph2D
            ref={graphRef}
            width={dimensions.width}
            height={dimensions.height}
            graphData={filteredData}
            nodeId="id"
            nodeLabel={(node: UnitNode) => `${node.id}: ${node.unit_name}`}
            nodeColor={(node: UnitNode) => {
              // Highlight planner units
              if (plannerCodes.has(node.id)) return '#10b981' // success green
              if (selectedNode?.id === node.id) return '#3b82f6'
              if (searchQuery && node.id === searchQuery.toUpperCase()) return '#3b82f6'
              return '#60a5fa40'
            }}
            nodeRelSize={6}
            nodeVal={(node: UnitNode) => plannerCodes.has(node.id) ? 2 : 1}
            linkColor={() => '#3d528040'}
            linkDirectionalArrowLength={3}
            linkDirectionalArrowRelPos={1}
            onNodeClick={handleNodeClick}
            cooldownTicks={100}
            onEngineStop={() => graphRef.current?.zoomToFit(400)}
            enableNodeDrag={true}
            backgroundColor="#0a0f1a"
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-theme-tertiary">
              <p className="mb-2">No nodes to display</p>
              <p className="text-sm">Try adjusting your filters or search for a unit</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
