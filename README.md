<div align="center">

# 🗺️ Smart Nairobi Delivery Routing

**An interactive GIS simulation platform demonstrating how spatial algorithms power real-world delivery logistics**

*Built to show how companies like Uber Eats, Bolt Food, and Glovo optimise thousands of daily deliveries across Nairobi*

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Visit%20Site-00E5CC?style=for-the-badge&logo=vercel&logoColor=white)](https://your-demo-url.vercel.app)
[![Backend API](https://img.shields.io/badge/Backend%20API-FastAPI%20Docs-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://your-api-url.com/docs)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

![React](https://img.shields.io/badge/React_18-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)
![Mapbox](https://img.shields.io/badge/Mapbox_GL_JS-000000?style=flat-square&logo=mapbox&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python_3.11-3776AB?style=flat-square&logo=python&logoColor=white)

</div>

---

## What This Project Does

Most GIS portfolios are Jupyter notebooks or static maps. This is neither.

This is a **live, interactive simulation platform** that lets you watch delivery route optimisation happen in real time across the actual streets of Nairobi. You configure the number of orders and drivers, hit **Start Simulation**, and the platform:

1. Generates realistic delivery orders weighted across real Nairobi neighbourhoods (CBD, Westlands, Kilimani, Karen, Rongai…)
2. Clusters nearby orders using **DBSCAN** spatial clustering — the same algorithm used in production logistics
3. Assigns drivers to clusters using a greedy nearest-neighbour heuristic
4. Computes optimal routes using one of three methods: Euclidean, Haversine, or real **OSRM street-network routing**
5. Animates drivers moving along their routes on the actual Nairobi road network
6. Calculates and displays live savings — kilometres saved, fuel cost saved in KES, CO₂ avoided — compared to naive one-order-per-trip routing

Switch routing methods and watch the map change. Open the **Learning Drawer** on any algorithm to see its formula, complexity, pros/cons, and why it matters specifically for Nairobi logistics.

---

## Demo

> 📸 *Screenshots / GIF coming soon — deploy your own instance in minutes using the setup guide below*

| Feature | What You'll See |
|---|---|
| Order generation | Animated pins dropping across Nairobi neighbourhoods |
| DBSCAN clustering | Colour-coded cluster circles forming around nearby orders |
| Route computation | Animated lines drawing along real Nairobi streets |
| Driver movement | Scooter icons moving in real time along computed routes |
| Savings dashboard | Live KES / km / CO₂ metrics updating with each delivery |
| Learning drawer | Algorithm formulas and Nairobi-specific context on demand |

---

## The Core Problem: Why Delivery Routing Is Hard

A naive delivery system sends one driver per order — a separate round trip every time. With 30 orders across Nairobi on a Friday evening, that's roughly **210 km** of driving.

Smart routing clusters nearby orders so one driver handles multiple deliveries in a single run. The result with the same 30 orders: **~130 km** — a **38% reduction** in distance, directly translating to fuel cost and driver time savings.

The algorithms that make this work are what this project teaches.

---

## Architecture

This repository contains the **React frontend**. The Python/FastAPI backend lives at [`nairobi-routing-backend`](https://github.com/your-username/nairobi-routing-backend).

```
┌─────────────────────────────┐       ┌─────────────────────────────────────┐
│        React Frontend        │       │          FastAPI Backend              │
│         (Vercel)            │       │              (VPS)                    │
│                             │       │                                       │
│  NairobiMap (Mapbox GL JS)  │◄─────►│  POST /api/simulate                  │
│  Sidebar + MetricsPanel     │  REST │  GET  /api/algorithms/{id}            │
│  LearningDrawer             │       │  GET  /api/concepts/{id}              │
│  Zustand state stores       │◄─────►│  WS   /ws/simulation/{session_id}    │
│                             │  WS   │                                       │
└─────────────────────────────┘       │  OSMnx → Nairobi road graph          │
                                      │  DBSCAN / KMeans / HDBSCAN           │
                                      │  OSRM → real street routing          │
                                      │  OR-Tools → VRP optimisation         │
                                      └─────────────────────────────────────┘
```

### WebSocket Event Stream

Every simulation event streams from the backend in real time. The frontend maps each event to a specific UI action:

```
ORDER_CREATED      →  Animated pin drops on map, pending counter increments
CLUSTER_FORMED     →  Colour circle forms around cluster, pins recolour
DRIVER_ASSIGNED    →  Scooter icon appears on map, driver list updates
ROUTE_COMPUTED     →  Animated route line draws from driver to all stops
DRIVER_MOVED       →  Scooter icon moves along route (smooth interpolation)
DELIVERY_COMPLETED →  Pin turns green, completed counter increments
METRICS_UPDATED    →  All savings numbers update live in sidebar
SIMULATION_COMPLETED → Summary HUD appears with final statistics
```

---

## Spatial Algorithms Implemented

| Algorithm | Category | What It Does |
|---|---|---|
| **Euclidean Distance** | Distance | Straight-line baseline — demonstrates why naive routing fails |
| **Haversine Formula** | Distance | Great-circle distance accounting for Earth's curvature |
| **OSRM Routing** | Distance | Real road distances via OpenStreetMap — what production systems use |
| **DBSCAN** | Clustering | Density-based spatial clustering — no k required, handles noise |
| **K-Means** | Clustering | Partition-based clustering when driver count is fixed |
| **HDBSCAN** | Clustering | Hierarchical DBSCAN — robust to varying density across city zones |
| **Dijkstra's Algorithm** | Routing | Classic shortest path on the road graph — NetworkX fallback |
| **A\* Algorithm** | Routing | Heuristic shortest path — 4–10× faster than Dijkstra |
| **VRP (OR-Tools)** | Routing | Google OR-Tools Vehicle Routing Problem solver — joint optimisation |

Every algorithm has a dedicated Learning Drawer entry explaining the formula, time complexity, pros/cons, and Nairobi-specific context.

---

## Tech Stack

### Frontend (this repository)

| Layer | Technology | Rationale |
|---|---|---|
| Framework | React 18 + Vite | Fast HMR, clean SPA — no SSR needed for a client-side dashboard |
| Map engine | Mapbox GL JS v3 | GPU-rendered animated maps; native GL layers for route lines and driver movement |
| State management | Zustand | Shared state between map, sidebar, and drawer with minimal boilerplate |
| Charts | Recharts | Sparkline in metrics savings card |
| Styling | Tailwind CSS v3 | Utility-first dark theme with custom design tokens |
| Typography | Syne + DM Sans + JetBrains Mono | Display / body / monospace — deliberately non-generic font stack |

### Backend (separate repository)

| Layer | Technology | Rationale |
|---|---|---|
| API framework | Python FastAPI | Async-native, perfect for WebSocket streaming |
| Road network | OSMnx + NetworkX | Downloads Nairobi road graph from OpenStreetMap |
| Spatial ops | GeoPandas + Shapely + PyProj | UTM Zone 37S projection, polygon operations |
| Clustering | scikit-learn (DBSCAN/KMeans) + hdbscan | GPS coordinate clustering |
| Routing API | OSRM public API | Real Nairobi street routing — free, no key required |
| VRP solver | Google OR-Tools | Near-optimal multi-driver route assignment |
| Streaming | FastAPI WebSockets | Live event broadcasting to all connected clients |

---

## Project Structure

```
nairobi-routing-frontend/
│
├── src/
│   ├── main.jsx                       # React entry point
│   ├── App.jsx                        # Root layout — map + panels + HUD
│   │
│   ├── components/
│   │   ├── map/
│   │   │   └── NairobiMap.jsx         # Mapbox GL canvas, all layer management
│   │   │
│   │   ├── sidebar/
│   │   │   ├── Sidebar.jsx            # Left panel container
│   │   │   ├── ScenarioHeader.jsx     # Brand header + simulation phase status
│   │   │   ├── MethodSelector.jsx     # Euclidean / Haversine / Street Network tabs
│   │   │   ├── MetricsPanel.jsx       # Live savings dashboard with sparkline
│   │   │   ├── DriverList.jsx         # Active drivers with status + progress
│   │   │   └── SimulateButton.jsx     # Main trigger + collapsible config panel
│   │   │
│   │   ├── learning/
│   │   │   ├── LearningDrawer.jsx     # Slides in from right — educational panel
│   │   │   ├── AlgorithmCard.jsx      # Formula + complexity + pros/cons display
│   │   │   └── ConceptCard.jsx        # High-level GIS concept explanation
│   │   │
│   │   └── ui/
│   │       ├── Badge.jsx              # Animated status badges
│   │       ├── MetricCard.jsx         # Metric tile with number animation
│   │       └── LoadingOverlay.jsx     # Graph loading screen (first run ~30s)
│   │
│   ├── hooks/
│   │   ├── useSimulation.js           # WebSocket lifecycle + event dispatching
│   │   └── useAlgorithmInfo.js        # Algorithm content fetcher with cache
│   │
│   ├── store/
│   │   ├── simulationStore.js         # Orders, drivers, routes, clusters, metrics
│   │   ├── mapStore.js                # Map ref, layer visibility, flyTo
│   │   └── uiStore.js                 # Drawer state, method selection, config
│   │
│   ├── services/
│   │   ├── api.js                     # REST client (simulate, algorithms, health)
│   │   └── websocket.js               # WebSocket class with exponential backoff
│   │
│   ├── constants/
│   │   └── mapConfig.js               # Viewport, colours, route styles, labels
│   │
│   └── styles/
│       └── index.css                  # Tailwind directives + custom animations
│
├── index.html                         # Entry HTML with font + Mapbox CSS imports
├── vite.config.js                     # Vite + dev proxy to backend
├── tailwind.config.js                 # Custom colour tokens and animations
├── postcss.config.js
├── package.json
├── .env.local.example                 # Environment variable template
└── .gitignore
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A free [Mapbox account](https://account.mapbox.com/) for the map token
- The [backend](https://github.com/your-username/nairobi-routing-backend) running locally or on a server

### 1. Clone the repository

```bash
git clone https://github.com/your-username/nairobi-routing-frontend.git
cd nairobi-routing-frontend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in your values:

```env
# Get your free token at https://account.mapbox.com/
VITE_MAPBOX_TOKEN=pk.eyJ1IjoieW91cnVzZXJuYW1lIiwiYSI6InlvdXJ0b2tlbiJ9.your_token_here

# Point to wherever your backend is running
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

> **Mapbox token:** Sign up at [mapbox.com](https://mapbox.com) → Account → Tokens → Create token. The free tier covers 50,000 map loads/month.

### 4. Start the backend

```bash
# Clone and set up the backend first
# https://github.com/your-username/nairobi-routing-backend

cd ../nairobi-routing-backend
uvicorn app.main:app --reload --port 8000
```

> **Note:** On first run, the backend downloads the Nairobi road graph from OpenStreetMap (~30 seconds). Subsequent starts load from cache in ~3 seconds.

### 5. Start the frontend

```bash
npm run dev
# → http://localhost:3000
```

The Vite dev server proxies `/api` and `/ws` requests to `localhost:8000` automatically — no CORS configuration needed during development.

---

## Production Deployment

### Frontend → Vercel

```bash
npm run build
```

Deploy the `/dist` folder to Vercel. Set these environment variables in the Vercel project dashboard:

```
VITE_MAPBOX_TOKEN    =  pk.eyJ...
VITE_API_URL         =  https://your-vps-domain.com
VITE_WS_URL          =  wss://your-vps-domain.com
```

> Use `wss://` (WebSocket Secure) in production — required for sites served over HTTPS.

### Backend → VPS

See the [backend repository](https://github.com/your-username/nairobi-routing-backend) for full deployment instructions including systemd service setup, Nginx reverse proxy configuration, and SSL with Certbot.

---

## Design Decisions

**Why Mapbox GL JS over Leaflet or Google Maps?**
Mapbox GL renders entirely on the GPU using WebGL. Animating 30+ driver icons moving simultaneously, route lines drawing in, and cluster circles appearing — all at 60fps — requires GPU rendering. Leaflet's SVG/Canvas approach would drop frames. Google Maps doesn't expose the level of layer control needed for this kind of dynamic animation.

**Why Zustand over Redux?**
This app has three decoupled consumers of shared state: the map layers, the sidebar metrics, and the learning drawer. Zustand handles this with three focused stores and zero boilerplate. Redux would add significant ceremony for the same result.

**Why WebSockets over polling?**
The simulation streams up to 10 events per second during driver animation phases. Polling at that frequency would be expensive and laggy. WebSocket gives sub-10ms latency for each event, which is what makes the map animation feel live rather than jerky.

**Why DBSCAN over K-Means for clustering?**
K-Means requires specifying `k` upfront — but the right number of clusters depends on where orders actually are, not just how many drivers you have. DBSCAN discovers cluster boundaries from the data, naturally handles isolated orders as solo trips, and doesn't assume spherical clusters. Nairobi's road corridors (Waiyaki Way, Ngong Road, Thika Road) produce elongated order distributions that DBSCAN handles and K-Means distorts.

---

## Key GIS Concepts Demonstrated

**UTM Projection for accurate clustering.** DBSCAN measures distance in metres. Running it on raw WGS84 lat/lon coordinates produces incorrect clusters because 1° of longitude ≠ 1° of latitude in metres near the equator. The backend projects all coordinates to UTM Zone 37S (EPSG:32737) — the correct coordinate system for Nairobi — before clustering.

**Road circuity.** Nairobi's average circuity factor (road distance ÷ straight-line distance) is ~1.4×, reaching 1.8× in the CBD due to one-way streets and the Uhuru Highway interchange. This is why Haversine distance is insufficient for real dispatch decisions — a delivery that looks 3 km away might be 5 km by road, flipping the optimal driver assignment.

**The VRP.** The Vehicle Routing Problem asks: given N orders and K drivers, find the minimum-cost assignment and route ordering. It's NP-hard in the general case. Google OR-Tools uses metaheuristic search (Guided Local Search + Simulated Annealing) to find near-optimal solutions in under 5 seconds. This is the same solver used by logistics platforms worldwide.

---

## What's Next

- [ ] Real-time traffic layer using Mapbox Traffic API
- [ ] Time-window constraints (order must be delivered within X minutes of placement)
- [ ] Driver capacity differentiation (bikes vs cars vs vans)
- [ ] Historical heatmap of delivery density by zone and hour
- [ ] Side-by-side comparison mode: run all three routing methods simultaneously
- [ ] Mobile-responsive layout

---

## Related Repository

The backend (FastAPI, OSMnx, DBSCAN, OSRM, OR-Tools) lives here:
**[nairobi-routing-backend](https://github.com/your-username/nairobi-routing-backend)**

---

## Author

**Your Name**
GIS Developer · Nairobi, Kenya

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0A66C2?style=flat-square&logo=linkedin)](https://linkedin.com/in/your-profile)
[![GitHub](https://img.shields.io/badge/GitHub-Follow-181717?style=flat-square&logo=github)](https://github.com/your-username)

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">
  <sub>Built with real OpenStreetMap data · Nairobi road network © OpenStreetMap contributors</sub>
</div>