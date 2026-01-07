declare module 'react-force-graph-2d' {
  import { FC } from 'react'
  
  interface ForceGraphProps {
    ref?: React.Ref<any>
    graphData: { nodes: any[]; links: any[] }
    width?: number
    height?: number
    nodeId?: string
    nodeLabel?: string | ((node: any) => string)
    nodeColor?: string | ((node: any) => string)
    nodeRelSize?: number
    nodeVal?: number | ((node: any) => number)
    linkColor?: string | ((link: any) => string)
    linkWidth?: number | ((link: any) => number)
    linkDirectionalArrowLength?: number
    linkDirectionalArrowRelPos?: number
    onNodeClick?: (node: any, event: MouseEvent) => void
    onNodeHover?: (node: any | null, prevNode: any | null) => void
    cooldownTicks?: number
    onEngineStop?: () => void
    enableNodeDrag?: boolean
    backgroundColor?: string
  }
  
  const ForceGraph2D: FC<ForceGraphProps>
  export default ForceGraph2D
}

declare module 'react-force-graph-3d' {
  import { FC } from 'react'
  
  interface ForceGraph3DProps {
    ref?: React.Ref<any>
    graphData: { nodes: any[]; links: any[] }
    width?: number
    height?: number
    nodeId?: string
    nodeLabel?: string | ((node: any) => string)
    nodeColor?: string | ((node: any) => string)
    nodeRelSize?: number
    nodeVal?: number | ((node: any) => number)
    linkColor?: string | ((link: any) => string)
    linkWidth?: number | ((link: any) => number)
    linkDirectionalArrowLength?: number
    linkDirectionalArrowRelPos?: number
    onNodeClick?: (node: any, event: MouseEvent) => void
    cooldownTicks?: number
    onEngineStop?: () => void
    enableNodeDrag?: boolean
    backgroundColor?: string
  }
  
  const ForceGraph3D: FC<ForceGraph3DProps>
  export default ForceGraph3D
}






