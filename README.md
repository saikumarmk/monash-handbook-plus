# Monash Handbook Visualizer

A better way to explore the Monash University handbook - with proper requisite visualization, "what does this unit unlock" views, cost calculation, and degree planning tools.

## Features

- 🔍 **Unit Search** - Filter by school, level, semester, location, cost band, and exam status
- 📖 **Unit Details** - Prerequisites, corequisites, prohibitions, offerings, and assessments
- 🔓 **Unlocks View** - See what units become available after completing a unit
- 💰 **Cost Calculator** - Estimated costs based on SCA bands (2024 rates)
- 📚 **Areas of Study** - Browse majors/minors with hierarchical requirement trees
- 🎓 **Courses** - Explore full degrees and their requirements
- 🕸️ **Graph View** - Interactive force-directed graph of unit relationships
- 📋 **Planner** - Build study plans with running totals and progress tracking
- 🛤️ **Pathway Finder** - Find the shortest path to any unit
- 📅 **Auto-Schedule** - Generate optimal semester-by-semester schedules
- 💾 **Save Plans** - Save and compare multiple degree plans
- 🌓 **Dark/Light Theme** - Toggle between themes (persisted)
- 🔗 **Shareable URLs** - Share your planner via URL

## Quick Start

### 1. Install dependencies
```bash
pnpm install
```

### 2. Add data files

Copy the JSON data files to `public/data/`:
```bash
mkdir -p public/data
cp ../monash_hbpp/data/processed_units.json public/data/
cp ../monash_hbpp/data/parsed_aos_full.json public/data/
cp ../monash_hbpp/data/parsed_courses_full.json public/data/
```

### 3. Generate network data
```bash
pnpm setup
```

### 4. Start development server
```bash
pnpm dev
```

Open http://localhost:5173

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm preview` | Preview production build |
| `pnpm test` | Run tests in watch mode |
| `pnpm test:run` | Run tests once |
| `pnpm setup` | Generate network.json from unit data |
| `pnpm generate-icons` | Generate PWA icons from logo.png |

## Deployment

The app auto-deploys to GitHub Pages on push to `main`.

### Manual Deployment
```bash
pnpm build
# Deploy the `dist` folder
```

### GitHub Pages Setup
1. Push to GitHub
2. Go to Settings → Pages → Source: **GitHub Actions**
3. Site will be at `https://<username>.github.io/monash-handbook/`

## Data Files

Place these in `public/data/`:

| File | Description |
|------|-------------|
| `processed_units.json` | Unit info with requisites, offerings, assessments |
| `parsed_aos_full.json` | Areas of Study (majors/minors) |
| `parsed_courses_full.json` | Full course/degree structures |
| `network.json` | Generated graph data (run `pnpm setup`) |

## Tech Stack

- **React 19** + TypeScript
- **Vite** - Build tool
- **TailwindCSS v4** - Styling
- **React Router** - Navigation
- **Zustand** - State management (with localStorage persistence)
- **react-force-graph** - Graph visualization
- **Vitest** - Testing

## Testing

```bash
# Run all tests
pnpm test:run

# Watch mode
pnpm test

# With coverage
pnpm test:coverage
```

**85 tests** covering:
- Type utilities (`src/types/index.test.ts`)
- Planner store (`src/stores/plannerStore.test.ts`)
- Data hooks (`src/hooks/useData.test.ts`)
- Pathway logic (`src/pages/PathwayPage.test.ts`)

## Project Structure

```
src/
├── components/     # Reusable UI (Layout, ErrorBoundary, Skeleton)
├── pages/          # Route pages
├── stores/         # Zustand stores (planner, theme)
├── hooks/          # Data fetching hooks
├── types/          # TypeScript interfaces & utilities
└── test/           # Test setup
```

## License

MIT
