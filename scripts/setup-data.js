// Setup script to copy data files from monash_hbpp to public/data
import { copyFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const sourceDir = join(__dirname, '../../monash_hbpp/data')
const destDir = join(__dirname, '../public/data')

// Ensure destination directory exists
if (!existsSync(destDir)) {
  mkdirSync(destDir, { recursive: true })
}

const files = [
  'processed_units.json',
  'parsed_aos_full.json',
  'parsed_courses_full.json'
]

console.log('Copying data files...')

for (const file of files) {
  const src = join(sourceDir, file)
  const dest = join(destDir, file)
  
  if (existsSync(src)) {
    copyFileSync(src, dest)
    console.log(`✓ Copied ${file}`)
  } else {
    console.log(`✗ Source file not found: ${src}`)
  }
}

// Generate network.json from processed_units.json
console.log('Generating network.json...')

import { readFileSync, writeFileSync } from 'fs'

const unitsPath = join(destDir, 'processed_units.json')
if (existsSync(unitsPath)) {
  const data = JSON.parse(readFileSync(unitsPath, 'utf-8'))
  
  const nodesMap = {}
  for (const unit of Object.values(data)) {
    nodesMap[unit.code] = {
      id: unit.code,
      unit_name: unit.title,
      school: unit.school,
      unlocks: [],
      requires: [],
    }
  }
  
  const links = []
  
  for (const unit of Object.values(data)) {
    if (unit.requisites) {
      const prerequisites = unit.requisites.prerequisites || []
      for (const req of prerequisites) {
        for (const reqCode of req.units) {
          if (data[reqCode]) {
            links.push({ source: reqCode, target: unit.code })
            nodesMap[unit.code].requires.push(reqCode)
            nodesMap[reqCode].unlocks.push(unit.code)
          }
        }
      }
      
      const corequisites = unit.requisites.corequisites || []
      for (const req of corequisites) {
        for (const reqCode of req.units) {
          if (data[reqCode]) {
            links.push({ source: reqCode, target: unit.code })
            nodesMap[unit.code].requires.push(reqCode)
            nodesMap[reqCode].unlocks.push(unit.code)
          }
        }
      }
    }
  }
  
  const nodes = Object.values(nodesMap)
  const indexMap = {}
  nodes.forEach((node, idx) => {
    indexMap[node.id] = idx
  })
  
  const networkData = {
    nodes,
    links,
    index_map: indexMap,
    general_info: data
  }
  
  writeFileSync(join(destDir, 'network.json'), JSON.stringify(networkData))
  console.log('✓ Generated network.json')
}

console.log('Done!')





