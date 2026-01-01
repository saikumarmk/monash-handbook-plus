import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useNetworkData, useSchools } from '@/hooks/useData'
import { usePlannerStore } from '@/stores/plannerStore'
import { useThemeStore } from '@/stores/themeStore'
import type { UnitNode } from '@/types'

// Dynamic import for force graphs
import ForceGraph2D from 'react-force-graph-2d'
import ForceGraph3D from 'react-force-graph-3d'

// Color palette for schools (vibrant, distinguishable colors)
const SCHOOL_COLORS: Record<string, string> = {
  'Faculty of Information Technology': '#3b82f6', // blue
  'Faculty of Engineering': '#f97316', // orange
  'Faculty of Science': '#22c55e', // green
  'Faculty of Arts': '#a855f7', // purple
  'Faculty of Business and Economics': '#eab308', // yellow
  'Faculty of Medicine, Nursing and Health Sciences': '#ef4444', // red
  'Faculty of Education': '#06b6d4', // cyan
  'Faculty of Law': '#ec4899', // pink
  'Faculty of Art, Design and Architecture': '#f472b6', // rose
  'Faculty of Pharmacy and Pharmaceutical Sciences': '#14b8a6', // teal
}

// Generate a color from school name if not in palette
function getSchoolColor(school: string): string {
  if (SCHOOL_COLORS[school]) return SCHOOL_COLORS[school]
  
  // Hash the school name to get a consistent color
  let hash = 0
  for (let i = 0; i < school.length; i++) {
    hash = school.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 70%, 50%)`
}

export function GraphPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialUnit = searchParams.get('unit') || ''
  const showPlanner = searchParams.get('planner') === 'true'
  
  const { data: networkData, loading, error } = useNetworkData()
  const { schools } = useSchools()
  const { units: plannerUnits } = usePlannerStore()
  const { theme } = useThemeStore()
  
  const [searchQuery, setSearchQuery] = useState(initialUnit)
  const [selectedSchool, setSelectedSchool] = useState('')
  const [showUnlocks, setShowUnlocks] = useState(true)
  const [showRequires, setShowRequires] = useState(true)
  const [selectedNode, setSelectedNode] = useState<UnitNode | null>(null)
  const [plannerMode, setPlannerMode] = useState(showPlanner)
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d')
  const [colorBySchool, setColorBySchool] = useState(true)
  const [hoverNode, setHoverNode] = useState<UnitNode | null>(null)
  
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

  // Compute highlighted nodes (connected to hover node)
  const highlightedNodes = useMemo(() => {
    const highlighted = new Set<string>()
    if (!hoverNode) return highlighted
    
    highlighted.add(hoverNode.id)
    if (showUnlocks) {
      hoverNode.unlocks.forEach(id => highlighted.add(id))
    }
    if (showRequires) {
      hoverNode.requires.forEach(id => highlighted.add(id))
    }
    return highlighted
  }, [hoverNode, showUnlocks, showRequires])

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
        if (viewMode === '2d') {
          graphRef.current.centerAt(node.x, node.y, 1000)
          graphRef.current.zoom(3, 1000)
        } else {
          graphRef.current.cameraPosition(
            { x: (node.x || 0) + 100, y: (node.y || 0) + 100, z: (node.z || 0) + 100 },
            node,
            1000
          )
        }
        setSelectedNode(node)
      }
    }
  }, [searchQuery, filteredData.nodes, viewMode])

  const handleNodeClick = useCallback((node: UnitNode) => {
    setSelectedNode(node)
    setSearchParams(prev => {
      prev.set('unit', node.id)
      return prev
    })
    
    if (graphRef.current) {
      if (viewMode === '2d') {
        graphRef.current.centerAt(node.x, node.y, 500)
        graphRef.current.zoom(3, 500)
      } else {
        graphRef.current.cameraPosition(
          { x: (node.x || 0) + 100, y: (node.y || 0) + 100, z: (node.z || 0) + 100 },
          node,
          1000
        )
      }
    }
  }, [setSearchParams, viewMode])

  const handleNodeHover = useCallback((node: UnitNode | null) => {
    setHoverNode(node)
    // Change cursor style
    if (containerRef.current) {
      containerRef.current.style.cursor = node ? 'pointer' : 'default'
    }
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // Search is already reactive
  }
  
  const plannerCodes = new Set(plannerUnits.map(u => u.code.toUpperCase()))

  // Get node color based on settings
  const getNodeColor = useCallback((node: UnitNode) => {
    // Highlighted nodes (connected to hover)
    if (hoverNode && highlightedNodes.has(node.id)) {
      if (node.id === hoverNode.id) return '#ff6b6b' // hover node itself
      return '#ffd93d' // connected nodes
    }
    // Planner units
    if (plannerCodes.has(node.id)) return '#10b981'
    // Selected node
    if (selectedNode?.id === node.id) return '#3b82f6'
    // Search match
    if (searchQuery && node.id === searchQuery.toUpperCase()) return '#3b82f6'
    // Color by school
    if (colorBySchool && node.school) {
      return getSchoolColor(node.school)
    }
    return '#60a5fa'
  }, [hoverNode, highlightedNodes, plannerCodes, selectedNode, searchQuery, colorBySchool])

  // Get link color based on hover state
  const getLinkColor = useCallback((link: any) => {
    if (!hoverNode) return '#3d528040'
    
    const sourceId = typeof link.source === 'string' ? link.source : link.source.id
    const targetId = typeof link.target === 'string' ? link.target : link.target.id
    
    if (highlightedNodes.has(sourceId) && highlightedNodes.has(targetId)) {
      return '#ffd93d80' // highlighted link
    }
    return '#3d528020' // dimmed
  }, [hoverNode, highlightedNodes])

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

  // Common graph props
  const graphProps = {
    ref: graphRef,
    graphData: filteredData,
    nodeId: "id" as const,
    nodeLabel: (node: UnitNode) => `${node.id}: ${node.unit_name}`,
    nodeColor: getNodeColor,
    nodeRelSize: 6,
    nodeVal: (node: UnitNode) => {
      if (hoverNode && highlightedNodes.has(node.id)) return 2
      if (plannerCodes.has(node.id)) return 2
      return 1
    },
    linkColor: getLinkColor,
    linkDirectionalArrowLength: 3,
    linkDirectionalArrowRelPos: 1,
    onNodeClick: handleNodeClick,
    onNodeHover: handleNodeHover,
    cooldownTicks: 100,
    enableNodeDrag: true,
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Sidebar Controls */}
      <div className="w-80 bg-theme-secondary border-r border-theme-primary p-4 flex flex-col overflow-hidden shrink-0">
        <h2 className="text-lg font-display font-bold text-theme-primary mb-4">Graph Controls</h2>
        
        {/* View Mode Toggle */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setViewMode('2d')}
            className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors ${
              viewMode === '2d' 
                ? 'bg-electric text-navy-950' 
                : 'bg-theme-card text-theme-tertiary hover:text-theme-primary'
            }`}
          >
            2D
          </button>
          <button
            onClick={() => setViewMode('3d')}
            className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors ${
              viewMode === '3d' 
                ? 'bg-electric text-navy-950' 
                : 'bg-theme-card text-theme-tertiary hover:text-theme-primary'
            }`}
          >
            3D
          </button>
        </div>
        
        {/* Planner Mode Toggle */}
        {plannerUnits.length > 0 && (
          <div className="mb-4 p-3 bg-theme-card rounded-lg border border-theme-primary">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={plannerMode}
                onChange={(e) => setPlannerMode(e.target.checked)}
                className="w-4 h-4 rounded border-theme-primary bg-theme-card text-electric focus:ring-electric focus:ring-offset-0"
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
              checked={colorBySchool}
              onChange={(e) => setColorBySchool(e.target.checked)}
              className="w-4 h-4 rounded border-theme-primary bg-theme-card text-electric focus:ring-electric focus:ring-offset-0"
            />
            <span className="text-theme-secondary">Color by School</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={showUnlocks}
              onChange={(e) => setShowUnlocks(e.target.checked)}
              className="w-4 h-4 rounded border-theme-primary bg-theme-card text-electric focus:ring-electric focus:ring-offset-0"
            />
            <span className="text-theme-secondary">Show Unlocks</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={showRequires}
              onChange={(e) => setShowRequires(e.target.checked)}
              className="w-4 h-4 rounded border-theme-primary bg-theme-card text-electric focus:ring-electric focus:ring-offset-0"
            />
            <span className="text-theme-secondary">Show Prerequisites</span>
          </label>
        </div>

        {/* Stats */}
        <div className="text-sm text-theme-tertiary mb-4">
          <p>{filteredData.nodes.length} nodes, {filteredData.links.length} links</p>
          <p className="text-xs text-theme-muted">Total in database: {totalNodes}</p>
        </div>
        
        {/* Warning for large graphs */}
        {filteredData.nodes.length > 1000 && (
          <div className="mb-4 p-3 bg-amber-100 dark:bg-amber/10 border border-amber-300 dark:border-amber/30 rounded-lg">
            <p className="text-xs text-amber-700 dark:text-amber-bright">
              ⚠️ Large graph may be slow. Use filters to narrow down.
            </p>
          </div>
        )}

        {/* Selected Node Info */}
        {selectedNode && (
          <div className="mt-auto p-4 bg-theme-card rounded-xl border border-theme-primary">
            <div className="flex items-start justify-between mb-1">
              <h3 className="font-mono text-lg text-electric-bright">
                {selectedNode.id}
              </h3>
              <a
                href={`https://handbook.monash.edu/current/units/${selectedNode.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-theme-tertiary hover:text-electric transition-colors"
                title="Open in Monash Handbook"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
            <p className="text-theme-primary font-medium mb-2">
              {selectedNode.unit_name}
            </p>
            <p className="text-sm text-theme-tertiary mb-3 line-clamp-1">
              {selectedNode.school}
            </p>
            <div className="flex gap-2 text-sm mb-3">
              <span className="px-2 py-0.5 bg-electric/20 text-electric-bright rounded">
                Unlocks: {selectedNode.unlocks.length}
              </span>
              <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber/20 text-amber-700 dark:text-amber-bright rounded">
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
          viewMode === '2d' ? (
            <ForceGraph2D
              {...graphProps}
              width={dimensions.width}
              height={dimensions.height}
              onEngineStop={() => graphRef.current?.zoomToFit(400)}
              backgroundColor={theme === 'dark' ? '#0a0f1a' : '#f8fafc'}
            />
          ) : (
            <ForceGraph3D
              {...graphProps}
              width={dimensions.width}
              height={dimensions.height}
              backgroundColor={theme === 'dark' ? '#0a0f1a' : '#f8fafc'}
            />
          )
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
