/**
 * CampusPath – Interactive Campus Map Module (Enhanced UI/UX)
 * 
 * Provides an architectural, precision SVG-based schematic campus map with:
 * - Centralized location configuration for 10 campus blocks & facilities
 * - Sleek, modern CAD-inspired building footprints with chamfered structural bays
 * - High-visibility pedestrian avenue network with edge-level identification
 * - Precision GPS-style telemetry beacons for Source (Cyan) & Destination (Emerald)
 * - Prepared route visualization function accepting an ordered array from the C++ backend
 * - Smooth viewport pan & zoom controls and focusBuilding animation
 * 
 * NOTE: As per project requirements:
 * - Dijkstra's algorithm is strictly computed by the C++ backend.
 * - No fake routes or invented distances.
 */

(function (window) {
  'use strict';

  // =========================================================================
  // 1. Centralized Campus Configuration
  // =========================================================================

  const CAMPUS_CONFIG = {
    viewBox: { width: 1200, height: 800 },
    zoom: { min: 0.75, max: 2.5, step: 0.2 },
    scaleRatio: '1:500 Topographic'
  };

  /**
   * The 10 Official Campus Locations
   * Spaced cleanly across the 1200x800 coordinate plane.
   */
  const CAMPUS_LOCATIONS = [
    {
      id: 'main-gate',
      name: 'Main Gate',
      x: 140,
      y: 660,
      width: 140,
      height: 70,
      pinY: 620,
      category: 'Access & Security',
      icon: 'gate',
      code: 'MG',
      description: 'Primary security portal, visitor verification checkpoint & transit hub.'
    },
    {
      id: 'parking-area',
      name: 'Parking Area',
      x: 150,
      y: 280,
      width: 150,
      height: 90,
      pinY: 230,
      category: 'Transit & Utility',
      icon: 'parking',
      code: 'PK',
      description: 'Multi-bay vehicle parking facility equipped with EV charging stations.'
    },
    {
      id: 'admin-block',
      name: 'Admin Block',
      x: 390,
      y: 540,
      width: 140,
      height: 85,
      pinY: 490,
      category: 'Administration',
      icon: 'admin',
      code: 'AD',
      description: 'Central Directorate, Registrar, Academic Dean & Student Affairs headquarters.'
    },
    {
      id: 'auditorium',
      name: 'Auditorium',
      x: 390,
      y: 210,
      width: 140,
      height: 85,
      pinY: 160,
      category: 'Conferences & Events',
      icon: 'auditorium',
      code: 'AU',
      description: '1,500-seat acoustic auditorium for convocation, symposia & cultural fests.'
    },
    {
      id: 'library',
      name: 'Library',
      x: 630,
      y: 380,
      width: 150,
      height: 95,
      pinY: 325,
      category: 'Central Resource',
      icon: 'library',
      code: 'LB',
      description: 'Central Knowledge Resource Centre, digital archives & quiet study pods.'
    },
    {
      id: 'academic-block',
      name: 'Academic Block',
      x: 640,
      y: 650,
      width: 160,
      height: 90,
      pinY: 600,
      category: 'Academics & Lecture',
      icon: 'academic',
      code: 'AC',
      description: 'Core lecture complex, tiered theaters & multidisciplinary faculty suites.'
    },
    {
      id: 'canteen',
      name: 'Canteen',
      x: 880,
      y: 210,
      width: 140,
      height: 80,
      pinY: 165,
      category: 'Dining & Social',
      icon: 'canteen',
      code: 'CN',
      description: 'Central dining commons, food court, juice bar & shaded terrace.'
    },
    {
      id: 'cs-block',
      name: 'Computer Science Block',
      x: 900,
      y: 470,
      width: 150,
      height: 90,
      pinY: 420,
      category: 'Engineering & Labs',
      icon: 'cs',
      code: 'CS',
      description: 'Supercomputing cluster, Artificial Intelligence suite & departmental data core.'
    },
    {
      id: 'hostel',
      name: 'Hostel',
      x: 1080,
      y: 220,
      width: 130,
      height: 95,
      pinY: 165,
      category: 'Residential',
      icon: 'hostel',
      code: 'HS',
      description: 'Student residential complexes, common lounges and dining facilities.'
    },
    {
      id: 'sports-ground',
      name: 'Sports Ground',
      x: 1070,
      y: 590,
      width: 170,
      height: 120,
      pinY: 520,
      category: 'Athletics & Fitness',
      icon: 'sports',
      code: 'SG',
      description: 'Synthetic running tracks, grass soccer pitch, basketball court & bleachers.'
    }
  ];

  /**
   * Interconnected Walkway Network (Graph Edges)
   */
  const CAMPUS_PATHWAYS = [
    { from: 'main-gate', to: 'parking-area' },
    { from: 'main-gate', to: 'admin-block' },
    { from: 'parking-area', to: 'auditorium' },
    { from: 'admin-block', to: 'auditorium' },
    { from: 'admin-block', to: 'library' },
    { from: 'admin-block', to: 'academic-block' },
    { from: 'auditorium', to: 'library' },
    { from: 'library', to: 'academic-block' },
    { from: 'library', to: 'canteen' },
    { from: 'library', to: 'cs-block' },
    { from: 'academic-block', to: 'cs-block' },
    { from: 'academic-block', to: 'sports-ground' },
    { from: 'canteen', to: 'hostel' },
    { from: 'canteen', to: 'cs-block' },
    { from: 'cs-block', to: 'hostel' },
    { from: 'cs-block', to: 'sports-ground' },
    { from: 'hostel', to: 'sports-ground' }
  ];

  // Helper Maps
  const LOCATIONS_BY_ID = new Map();
  const LOCATIONS_BY_NAME = new Map();
  CAMPUS_LOCATIONS.forEach(loc => {
    LOCATIONS_BY_ID.set(loc.id, loc);
    LOCATIONS_BY_NAME.set(loc.name.toLowerCase(), loc);
    if (loc.code) {
      LOCATIONS_BY_NAME.set(loc.code.toLowerCase(), loc);
    }
    if (loc.id === 'cs-block') {
      LOCATIONS_BY_NAME.set('cs block', loc);
    }
  });

  // Vector Glyphs for Navigation Markers
  const SVG_ICONS = {
    gate: `<path d="M4 21V7l8-4 8 4v14M9 21v-8h6v8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/><line x1="2" y1="21" x2="22" y2="21" stroke="currentColor" stroke-width="2"/>`,
    parking: `<path d="M7 5h6a4 4 0 0 1 0 8H7v7" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"/><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.6" fill="none"/>`,
    admin: `<path d="M3 21h18M5 21V9l7-5 7 5v12M9 13h2M9 17h2M13 13h2M13 17h2" stroke="currentColor" stroke-width="2" fill="none" stroke-linejoin="round"/>`,
    auditorium: `<path d="M2 17a10 10 0 0 1 20 0M6 17a6 6 0 0 1 12 0M10 17a2 2 0 0 1 4 0" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>`,
    library: `<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z" stroke="currentColor" stroke-width="2" fill="none"/>`,
    academic: `<path d="M22 10v6M2 10l10-5 10 5-10 5zM6 12v5c3 3 9 3 12 0v-5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>`,
    canteen: `<path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>`,
    cs: `<rect x="2" y="4" width="20" height="13" rx="2" stroke="currentColor" stroke-width="2" fill="none"/><path d="M8 20h8M12 17v3M7 9l-2 2 2 2M17 9l2 2-2 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,
    hostel: `<path d="M3 10V20M21 10V20M2 14h20M2 17h20M4 14V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>`,
    sports: `<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" fill="none"/><path d="M12 3a13 13 0 0 1 0 18M12 3a13 13 0 0 0 0 18M3 12h18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`
  };

  // State
  let currentSourceId = null;
  let currentDestId = null;
  let activeRouteIds = [];
  let mapCallbacks = { onLocationSelected: null };

  // Pan & Zoom
  let zoomLevel = 1.0;
  let panX = 0;
  let panY = 0;
  let isPanning = false;
  let panStartX = 0;
  let panStartY = 0;
  let panMovedDistance = 0;

  // =========================================================================
  // 2. Initialization & Viewport Setup
  // =========================================================================

  function init(callbacks) {
    if (callbacks) {
      mapCallbacks = Object.assign(mapCallbacks, callbacks);
    }

    renderDecorativeLandscape();
    renderWalkways();
    renderBuildings();
    setupPanAndZoom();
    bindTooltipEvents();
  }

  function getLocation(idOrName) {
    if (!idOrName) return null;
    const clean = String(idOrName).trim();
    if (LOCATIONS_BY_ID.has(clean)) return LOCATIONS_BY_ID.get(clean);
    const lower = clean.toLowerCase();
    if (LOCATIONS_BY_NAME.has(lower)) return LOCATIONS_BY_NAME.get(lower);
    return null;
  }

  // =========================================================================
  // 3. Precision Landscape & Architectural Ground Layer
  // =========================================================================

  function renderDecorativeLandscape() {
    const landscapeGroup = document.getElementById('campus-landscape');
    if (!landscapeGroup) return;

    landscapeGroup.innerHTML = `
      <!-- Precision Campus Boundary Frame -->
      <rect x="25" y="25" width="1150" height="750" rx="20" fill="none" stroke="rgba(0, 240, 255, 0.12)" stroke-width="1.5" stroke-dasharray="12 8"/>
      
      <!-- Coordinate Origin Markers -->
      <g stroke="rgba(0, 240, 255, 0.25)" stroke-width="1">
        <line x1="20" y1="25" x2="35" y2="25" />
        <line x1="25" y1="20" x2="25" y2="35" />
        <line x1="1165" y1="25" x2="1180" y2="25" />
        <line x1="1175" y1="20" x2="1175" y2="35" />
        <line x1="20" y1="775" x2="35" y2="775" />
        <line x1="25" y1="765" x2="25" y2="780" />
        <line x1="1165" y1="775" x2="1180" y2="775" />
        <line x1="1175" y1="765" x2="1175" y2="780" />
      </g>

      <!-- Central Plaza Quadrangle Ground Plane -->
      <rect x="510" y="260" width="240" height="250" rx="24" fill="rgba(0, 240, 255, 0.018)" stroke="rgba(0, 240, 255, 0.08)" stroke-dasharray="4 6" />

      <!-- Minimalist Architectural Water Basin & Geothermal Aerator -->
      <g id="central-water-plaza">
        <ellipse cx="630" cy="220" rx="68" ry="38" fill="url(#lake-grad)" stroke="rgba(0, 240, 255, 0.3)" stroke-width="1.5"/>
        <ellipse cx="630" cy="220" rx="42" ry="22" fill="none" stroke="rgba(0, 240, 255, 0.25)" stroke-dasharray="4 4"/>
        <circle cx="630" cy="220" r="5" fill="#00f0ff" opacity="0.85"/>
        <circle cx="630" cy="220" r="16" fill="none" stroke="#00f0ff" stroke-width="1" opacity="0.35" class="water-ripple"/>
      </g>

      <!-- Precision Compass Rose -->
      <g transform="translate(1120, 85)" class="compass-rose" opacity="0.75">
        <circle cx="0" cy="0" r="22" fill="rgba(6, 12, 30, 0.85)" stroke="rgba(0, 240, 255, 0.3)" stroke-width="1.2"/>
        <polygon points="0,-18 4,-4 0,0 -4,-4" fill="#00f0ff" />
        <polygon points="0,18 4,4 0,0 -4,4" fill="rgba(255,255,255,0.25)" />
        <polygon points="-18,0 -4,4 0,0 -4,-4" fill="rgba(255,255,255,0.25)" />
        <polygon points="18,0 4,4 0,0 4,-4" fill="rgba(255,255,255,0.25)" />
        <text x="0" y="-21" text-anchor="middle" fill="#00f0ff" font-size="9" font-family="'JetBrains Mono', monospace" font-weight="700">N</text>
      </g>
    `;
  }

  // =========================================================================
  // 4. Pedestrian Avenue Network (Graph Edges)
  // =========================================================================

  function renderWalkways() {
    const pathwaysGroup = document.getElementById('campus-pathways-group');
    if (!pathwaysGroup) return;

    pathwaysGroup.innerHTML = '';

    CAMPUS_PATHWAYS.forEach(edge => {
      const fromLoc = getLocation(edge.from);
      const toLoc = getLocation(edge.to);
      if (!fromLoc || !toLoc) return;

      const edgeId = `edge-${fromLoc.id}_${toLoc.id}`;

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'pathway-segment');
      g.setAttribute('id', edgeId);
      g.setAttribute('data-from', fromLoc.id);
      g.setAttribute('data-to', toLoc.id);

      // Paved transit foundation
      const outerRoad = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      outerRoad.setAttribute('x1', fromLoc.x);
      outerRoad.setAttribute('y1', fromLoc.y);
      outerRoad.setAttribute('x2', toLoc.x);
      outerRoad.setAttribute('y2', toLoc.y);
      outerRoad.setAttribute('class', 'pathway-road');

      // Illuminated centerline guide
      const centerLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      centerLine.setAttribute('x1', fromLoc.x);
      centerLine.setAttribute('y1', fromLoc.y);
      centerLine.setAttribute('x2', toLoc.x);
      centerLine.setAttribute('y2', toLoc.y);
      centerLine.setAttribute('class', 'pathway-centerline');

      // Structural waypoint nodes
      const circleStart = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circleStart.setAttribute('cx', fromLoc.x);
      circleStart.setAttribute('cy', fromLoc.y);
      circleStart.setAttribute('r', '7');
      circleStart.setAttribute('class', 'pathway-junction');

      const circleEnd = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circleEnd.setAttribute('cx', toLoc.x);
      circleEnd.setAttribute('cy', toLoc.y);
      circleEnd.setAttribute('r', '7');
      circleEnd.setAttribute('class', 'pathway-junction');

      g.appendChild(outerRoad);
      g.appendChild(centerLine);
      g.appendChild(circleStart);
      g.appendChild(circleEnd);

      pathwaysGroup.appendChild(g);
    });
  }

  // =========================================================================
  // 5. Architectural Building Blueprints & Navigation Beacons
  // =========================================================================

  function renderBuildings() {
    const nodesGroup = document.getElementById('campus-nodes-group');
    if (!nodesGroup) return;

    nodesGroup.innerHTML = '';

    CAMPUS_LOCATIONS.forEach(loc => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'campus-building');
      g.setAttribute('id', `building-${loc.id}`);
      g.setAttribute('data-id', loc.id);
      g.setAttribute('data-name', loc.name);
      g.setAttribute('tabindex', '0');
      g.setAttribute('role', 'button');
      g.setAttribute('aria-label', `${loc.name}, ${loc.category}`);

      // 1. Architectural Blueprint Footprint
      const footprintG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      footprintG.setAttribute('class', 'building-footprint');
      footprintG.innerHTML = createArchitecturalFootprint(loc);

      // 2. Precision Telemetry Beacon
      const pinG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      pinG.setAttribute('class', 'building-marker-pin');
      pinG.setAttribute('transform', `translate(${loc.x}, ${loc.pinY})`);
      pinG.innerHTML = createBeaconMarkup(loc);

      // 3. Assemble
      g.appendChild(footprintG);
      g.appendChild(pinG);

      // Click Event
      g.addEventListener('click', (e) => {
        e.stopPropagation();
        // If user was actively dragging or panning the canvas, suppress accidental selection
        if (panMovedDistance > 8) return;
        if (mapCallbacks.onLocationSelected) {
          mapCallbacks.onLocationSelected(loc.id, loc.name);
        }
      });

      // Keyboard Accessibility
      g.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (mapCallbacks.onLocationSelected) {
            mapCallbacks.onLocationSelected(loc.id, loc.name);
          }
        }
      });

      nodesGroup.appendChild(g);
    });
  }

  /**
   * Generates clean, modern architectural CAD footprints for each building
   */
  function createArchitecturalFootprint(loc) {
    const bx = loc.x - loc.width / 2;
    const by = loc.y - loc.height / 2;
    const w = loc.width;
    const h = loc.height;

    switch (loc.id) {
      case 'main-gate':
        return `
          <!-- Main Gate Access Point -->
          <rect x="${bx}" y="${by + 10}" width="${w}" height="${h - 20}" rx="6" class="bldg-base" />
          <rect x="${bx + 12}" y="${by + 6}" width="24" height="${h - 12}" rx="3" class="bldg-substructure" />
          <rect x="${bx + w - 36}" y="${by + 6}" width="24" height="${h - 12}" rx="3" class="bldg-substructure" />
          <rect x="${bx + 8}" y="${by + 18}" width="${w - 16}" height="14" rx="3" fill="rgba(0, 240, 255, 0.15)" stroke="#00f0ff" stroke-width="1.2" />
          <!-- Transit Barrier & Pedestrian Lines -->
          <line x1="${bx + 42}" y1="${by + 25}" x2="${bx + w - 42}" y2="${by + 25}" stroke="#00f0ff" stroke-width="2.5" stroke-dasharray="5 3"/>
          <line x1="${bx + 44}" y1="${by + 38}" x2="${bx + w - 44}" y2="${by + 38}" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" stroke-dasharray="4 4"/>
        `;

      case 'parking-area':
        return `
          <!-- Multi-bay Vehicle Transit Surface -->
          <rect x="${bx}" y="${by}" width="${w}" height="${h}" rx="8" class="bldg-base" fill="#070e20" stroke="rgba(0, 240, 255, 0.28)"/>
          <g stroke="rgba(0, 240, 255, 0.22)" stroke-width="1.2">
            <line x1="${bx + 20}" y1="${by + 14}" x2="${bx + 20}" y2="${by + 38}" />
            <line x1="${bx + 48}" y1="${by + 14}" x2="${bx + 48}" y2="${by + 38}" />
            <line x1="${bx + 76}" y1="${by + 14}" x2="${bx + 76}" y2="${by + 38}" />
            <line x1="${bx + 104}" y1="${by + 14}" x2="${bx + 104}" y2="${by + 38}" />
            <line x1="${bx + 130}" y1="${by + 14}" x2="${bx + 130}" y2="${by + 38}" />

            <line x1="${bx + 20}" y1="${by + 52}" x2="${bx + 20}" y2="${by + 76}" />
            <line x1="${bx + 48}" y1="${by + 52}" x2="${bx + 48}" y2="${by + 76}" />
            <line x1="${bx + 76}" y1="${by + 52}" x2="${bx + 76}" y2="${by + 76}" />
            <line x1="${bx + 104}" y1="${by + 52}" x2="${bx + 104}" y2="${by + 76}" />
            <line x1="${bx + 130}" y1="${by + 52}" x2="${bx + 130}" y2="${by + 76}" />
          </g>
          <!-- Transit Guide -->
          <path d="M ${bx + 30} ${by + 45} L ${bx + w - 30} ${by + 45}" stroke="rgba(0, 240, 255, 0.4)" stroke-width="1.5" stroke-dasharray="6 4"/>
        `;

      case 'admin-block':
        return `
          <!-- Directorate Administrative Wings -->
          <rect x="${bx}" y="${by}" width="${w}" height="${h}" rx="6" class="bldg-base" />
          <rect x="${bx + 28}" y="${by - 6}" width="${w - 56}" height="${h + 12}" rx="4" class="bldg-substructure" />
          <!-- Symmetrical Colonnade Portico -->
          <line x1="${bx + 38}" y1="${by + h - 10}" x2="${bx + w - 38}" y2="${by + h - 10}" stroke="#00f0ff" stroke-width="2" />
          <circle cx="${bx + 44}" cy="${by + h - 10}" r="3" fill="#00f0ff" />
          <circle cx="${bx + 64}" cy="${by + h - 10}" r="3" fill="#00f0ff" />
          <circle cx="${bx + w - 64}" cy="${by + h - 10}" r="3" fill="#00f0ff" />
          <circle cx="${bx + w - 44}" cy="${by + h - 10}" r="3" fill="#00f0ff" />
        `;

      case 'auditorium':
        return `
          <!-- Semi-circular Acoustic Amphitheater -->
          <path d="M ${bx + 14} ${by + h} L ${bx + 14} ${by + 32} A ${w/2 - 14} 32 0 0 1 ${bx + w - 14} ${by + 32} L ${bx + w - 14} ${by + h} Z" class="bldg-base" />
          <!-- Concentric Acoustic Shells -->
          <path d="M ${bx + 28} ${by + 36} A ${w/2 - 28} 24 0 0 1 ${bx + w - 28} ${by + 36}" fill="none" stroke="#00f0ff" stroke-width="1.5" opacity="0.6"/>
          <path d="M ${bx + 44} ${by + 48} A ${w/2 - 44} 16 0 0 1 ${bx + w - 44} ${by + 48}" fill="none" stroke="#00f0ff" stroke-width="1.5" opacity="0.4"/>
          <rect x="${bx + 35}" y="${by + h - 16}" width="${w - 70}" height="12" rx="2" class="bldg-substructure"/>
        `;

      case 'library':
        return `
          <!-- Knowledge Repository Complex -->
          <rect x="${bx}" y="${by + 14}" width="${w}" height="${h - 28}" rx="6" class="bldg-base" />
          <!-- Central Hexagonal Glass Rotunda -->
          <polygon points="${loc.x},${loc.y - 32} ${loc.x + 36},${loc.y - 16} ${loc.x + 36},${loc.y + 16} ${loc.x},${loc.y + 32} ${loc.x - 36},${loc.y + 16} ${loc.x - 36},${loc.y - 16}" class="bldg-substructure" stroke="#00f0ff" stroke-width="1.8"/>
          <circle cx="${loc.x}" cy="${loc.y}" r="12" fill="rgba(0, 240, 255, 0.2)" stroke="#00f0ff" stroke-width="1.5"/>
          <circle cx="${loc.x}" cy="${loc.y}" r="4" fill="#00f0ff" opacity="0.9"/>
        `;

      case 'academic-block':
        return `
          <!-- Quadrangle Lecture Complex -->
          <rect x="${bx}" y="${by}" width="${w}" height="${h}" rx="8" class="bldg-base" />
          <!-- Inner Landscape Quadrangle Courtyard -->
          <rect x="${bx + 24}" y="${by + 18}" width="${w - 48}" height="${h - 36}" rx="5" fill="#060f26" stroke="rgba(0, 240, 255, 0.3)" stroke-width="1.5" />
          <line x1="${bx + 24}" y1="${loc.y}" x2="${bx + w - 24}" y2="${loc.y}" stroke="rgba(0, 240, 255, 0.25)" stroke-width="1" stroke-dasharray="3 3"/>
          <line x1="${loc.x}" y1="${by + 18}" x2="${loc.x}" y2="${by + h - 18}" stroke="rgba(0, 240, 255, 0.25)" stroke-width="1" stroke-dasharray="3 3"/>
        `;

      case 'canteen':
        return `
          <!-- Dining Hall Pavilion & Pergola -->
          <rect x="${bx}" y="${by}" width="${w}" height="${h}" rx="6" class="bldg-base" />
          <rect x="${bx + 14}" y="${by + 10}" width="${w - 28}" height="24" rx="4" fill="rgba(0, 240, 255, 0.08)" stroke="rgba(0, 240, 255, 0.35)" stroke-width="1.2"/>
          <line x1="${bx + 20}" y1="${by + 22}" x2="${bx + w - 20}" y2="${by + 22}" stroke="#00f0ff" stroke-width="1.5" stroke-dasharray="6 4"/>
        `;

      case 'cs-block':
        return `
          <!-- Engineering & Cyber Infrastructure -->
          <rect x="${bx}" y="${by}" width="${w}" height="${h}" rx="6" class="bldg-base" />
          <rect x="${bx + 14}" y="${by + 14}" width="${w - 28}" height="${h - 28}" rx="4" class="bldg-substructure" />
          <!-- Cyber Circuit Paths -->
          <path d="M ${bx + 24} ${loc.y} L ${bx + 48} ${loc.y} L ${bx + 58} ${loc.y - 12} L ${bx + 90} ${loc.y - 12}" stroke="#00f0ff" stroke-width="1.5" fill="none"/>
          <circle cx="${bx + 90}" cy="${loc.y - 12}" r="3" fill="#00f0ff"/>
          <path d="M ${bx + 24} ${loc.y + 12} L ${bx + 60} ${loc.y + 12} L ${bx + 72} ${loc.y + 22} L ${bx + 115} ${loc.y + 22}" stroke="#00f0ff" stroke-width="1.5" fill="none"/>
          <circle cx="${bx + 115}" cy="${loc.y + 22}" r="3" fill="#00f0ff"/>
        `;

      case 'hostel':
        return `
          <!-- Twin Residence Towers & Skybridge -->
          <rect x="${bx + 6}" y="${by}" width="46" height="${h}" rx="6" class="bldg-base" />
          <rect x="${bx + w - 52}" y="${by}" width="46" height="${h}" rx="6" class="bldg-base" />
          <!-- Glazed Connecting Skybridge -->
          <rect x="${bx + 46}" y="${loc.y - 14}" width="${w - 92}" height="28" rx="3" fill="rgba(0, 240, 255, 0.18)" stroke="#00f0ff" stroke-width="1.5"/>
        `;

      case 'sports-ground':
        return `
          <!-- Athletics Stadium Oval & Turf Pitch -->
          <rect x="${bx}" y="${by}" width="${w}" height="${h}" rx="44" class="bldg-base" fill="#051914" stroke="rgba(0, 230, 118, 0.45)"/>
          <rect x="${bx + 10}" y="${by + 10}" width="${w - 20}" height="${h - 20}" rx="36" fill="none" stroke="rgba(0, 230, 118, 0.3)" stroke-width="1.5"/>
          <rect x="${bx + 30}" y="${by + 20}" width="${w - 60}" height="${h - 40}" rx="6" fill="#082b22" stroke="rgba(255, 255, 255, 0.25)" stroke-width="1.2"/>
          <circle cx="${loc.x}" cy="${loc.y}" r="14" fill="none" stroke="rgba(255, 255, 255, 0.25)" stroke-width="1.2"/>
          <line x1="${loc.x}" y1="${by + 20}" x2="${loc.x}" y2="${by + h - 20}" stroke="rgba(255, 255, 255, 0.25)" stroke-width="1.2"/>
        `;

      default:
        return `<rect x="${bx}" y="${by}" width="${w}" height="${h}" rx="6" class="bldg-base" />`;
    }
  }

  /**
   * Generates precision navigation beacon and floating label badge
   */
  function createBeaconMarkup(loc) {
    const iconSvg = SVG_ICONS[loc.icon] || SVG_ICONS.academic;

    return `
      <!-- Concentric animated pulse ring for active selection -->
      <circle cx="0" cy="0" r="22" class="marker-pulse-ring" />

      <!-- GPS Telemetry Pin Stem -->
      <path d="M 0 0 L -10 -26 A 14 14 0 1 1 10 -26 Z" class="marker-pin-stem" />

      <!-- Beacon Disc & Icon -->
      <circle cx="0" cy="-26" r="10" class="marker-pin-head" />
      <g transform="translate(-6, -32) scale(0.52)" class="marker-pin-icon">
        ${iconSvg}
      </g>

      <!-- Precision Pill Label Badge -->
      <g class="building-label-badge" transform="translate(0, 14)">
        <rect x="-64" y="-10" width="128" height="24" rx="5" class="label-badge-bg" />
        <text x="0" y="2" class="label-badge-title">${loc.code} • ${loc.name}</text>
        <text x="0" y="9.5" class="label-badge-sub">${loc.category}</text>
      </g>

      <!-- Selection Tag (SOURCE / DESTINATION / WAYPOINT) -->
      <g class="selection-status-tag" transform="translate(0, -46)">
        <rect x="-42" y="-10" width="84" height="18" rx="4" class="status-tag-bg" />
        <text x="0" y="3" class="status-tag-text"></text>
      </g>
    `;
  }

  // =========================================================================
  // 6. Selection & Visual State Management
  // =========================================================================

  function selectSource(idOrName) {
    const loc = getLocation(idOrName);
    currentSourceId = loc ? loc.id : null;
    refreshMarkerStyles();
  }

  function selectDestination(idOrName) {
    const loc = getLocation(idOrName);
    currentDestId = loc ? loc.id : null;
    refreshMarkerStyles();
  }

  function clearSelection() {
    currentSourceId = null;
    currentDestId = null;
    refreshMarkerStyles();
  }

  function refreshMarkerStyles() {
    CAMPUS_LOCATIONS.forEach(loc => {
      const el = document.getElementById(`building-${loc.id}`);
      if (!el) return;

      const tagText = el.querySelector('.status-tag-text');
      el.classList.remove('is-source', 'is-destination');

      if (tagText) tagText.textContent = '';

      if (currentSourceId && loc.id === currentSourceId) {
        el.classList.add('is-source');
        if (tagText) tagText.textContent = '● SOURCE (A)';
      }

      if (currentDestId && loc.id === currentDestId) {
        el.classList.add('is-destination');
        if (tagText) tagText.textContent = '★ TARGET (B)';
      }
    });
  }

  // =========================================================================
  // 7. C++ Backend Route Highlighting (Exact Path Activation)
  // =========================================================================

  function highlightRoute(orderedRoute) {
    clearRoute();

    if (!orderedRoute || !Array.isArray(orderedRoute) || orderedRoute.length < 2) {
      return;
    }

    const resolvedNodes = [];
    orderedRoute.forEach(item => {
      const loc = getLocation(item);
      if (loc) resolvedNodes.push(loc);
    });

    if (resolvedNodes.length < 2) return;

    activeRouteIds = resolvedNodes.map(n => n.id);

    // 1. Highlight individual connecting walkway segments
    for (let i = 0; i < resolvedNodes.length - 1; i++) {
      const u = resolvedNodes[i].id;
      const v = resolvedNodes[i + 1].id;

      const seg1 = document.getElementById(`edge-${u}_${v}`);
      const seg2 = document.getElementById(`edge-${v}_${u}`);

      if (seg1) seg1.classList.add('is-route-active');
      if (seg2) seg2.classList.add('is-route-active');
    }

    // 2. Build continuous glowing SVG route polyline overlay
    const routeLine = document.getElementById('route-path-line');
    const routeGlow = document.getElementById('route-path-glow');

    let d = '';
    resolvedNodes.forEach((node, idx) => {
      d += (idx === 0 ? `M ${node.x} ${node.y} ` : `L ${node.x} ${node.y} `);
    });

    if (routeLine && routeGlow) {
      routeGlow.setAttribute('d', d);
      routeLine.setAttribute('d', d);
      routeGlow.style.opacity = '0.9';
      routeLine.style.opacity = '1';
    }

    // 3. Mark intermediate stops with sequence badges
    resolvedNodes.forEach((node, idx) => {
      const el = document.getElementById(`building-${node.id}`);
      if (!el) return;

      el.classList.add('is-on-route');

      if (idx > 0 && idx < resolvedNodes.length - 1) {
        const tagText = el.querySelector('.status-tag-text');
        if (tagText) {
          tagText.textContent = `WAYPOINT ${idx}`;
        }
      }
    });
  }

  function clearRoute() {
    activeRouteIds = [];

    const routeLine = document.getElementById('route-path-line');
    const routeGlow = document.getElementById('route-path-glow');
    if (routeLine) {
      routeLine.setAttribute('d', '');
      routeLine.style.opacity = '0';
    }
    if (routeGlow) {
      routeGlow.setAttribute('d', '');
      routeGlow.style.opacity = '0';
    }

    document.querySelectorAll('.pathway-segment.is-route-active').forEach(seg => {
      seg.classList.remove('is-route-active');
    });

    document.querySelectorAll('.campus-building.is-on-route').forEach(bldg => {
      bldg.classList.remove('is-on-route');
      const tagText = bldg.querySelector('.status-tag-text');
      if (tagText && !bldg.classList.contains('is-source') && !bldg.classList.contains('is-destination')) {
        tagText.textContent = '';
      }
    });
  }

  /**
   * Smoothly pans and focuses visual attention on a specific building
   */
  function focusBuilding(idOrName) {
    const loc = getLocation(idOrName);
    if (!loc) return;

    const el = document.getElementById(`building-${loc.id}`);
    if (el) {
      el.classList.add('is-focused');
      setTimeout(() => el.classList.remove('is-focused'), 1600);
    }
  }

  // =========================================================================
  // 8. Pan, Zoom & Viewport Controls
  // =========================================================================

  function setupPanAndZoom() {
    const svg = document.getElementById('campus-svg');
    const container = document.getElementById('map-scroll-container');
    const btnIn = document.getElementById('btn-zoom-in');
    const btnOut = document.getElementById('btn-zoom-out');
    const btnReset = document.getElementById('btn-reset-view');

    if (!svg || !container) return;

    function updateTransform() {
      svg.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomLevel})`;
    }

    if (btnIn) {
      btnIn.addEventListener('click', () => {
        zoomLevel = Math.min(CAMPUS_CONFIG.zoom.max, parseFloat((zoomLevel + CAMPUS_CONFIG.zoom.step).toFixed(2)));
        updateTransform();
      });
    }

    if (btnOut) {
      btnOut.addEventListener('click', () => {
        zoomLevel = Math.max(CAMPUS_CONFIG.zoom.min, parseFloat((zoomLevel - CAMPUS_CONFIG.zoom.step).toFixed(2)));
        updateTransform();
      });
    }

    if (btnReset) {
      btnReset.addEventListener('click', () => {
        zoomLevel = 1.0;
        panX = 0;
        panY = 0;
        updateTransform();
      });
    }

    // Mouse wheel zoom
    container.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.12 : -0.12;
      const newZoom = Math.min(CAMPUS_CONFIG.zoom.max, Math.max(CAMPUS_CONFIG.zoom.min, zoomLevel + delta));
      zoomLevel = parseFloat(newZoom.toFixed(2));
      updateTransform();
    }, { passive: false });

    // Drag-to-pan
    container.addEventListener('mousedown', (e) => {
      if (e.target.closest('.campus-building')) return;
      isPanning = true;
      panMovedDistance = 0;
      panStartX = e.clientX - panX;
      panStartY = e.clientY - panY;
      svg.classList.add('is-dragging');
      container.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (!isPanning) return;
      const curX = e.clientX - panStartX;
      const curY = e.clientY - panStartY;
      panMovedDistance += Math.abs(curX - panX) + Math.abs(curY - panY);
      panX = curX;
      panY = curY;
      updateTransform();
    });

    window.addEventListener('mouseup', () => {
      if (isPanning) {
        isPanning = false;
        svg.classList.remove('is-dragging');
        container.style.cursor = '';
      }
    });

    // Touch support for mobile devices
    let touchStartX = 0;
    let touchStartY = 0;
    container.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        panMovedDistance = 0;
        touchStartX = e.touches[0].clientX - panX;
        touchStartY = e.touches[0].clientY - panY;
        svg.classList.add('is-dragging');
      }
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1) {
        const curX = e.touches[0].clientX - touchStartX;
        const curY = e.touches[0].clientY - touchStartY;
        panMovedDistance += Math.abs(curX - panX) + Math.abs(curY - panY);
        panX = curX;
        panY = curY;
        updateTransform();
      }
    }, { passive: true });

    container.addEventListener('touchend', () => {
      svg.classList.remove('is-dragging');
    }, { passive: true });

    container.addEventListener('touchcancel', () => {
      svg.classList.remove('is-dragging');
    }, { passive: true });
  }

  // =========================================================================
  // 9. Tooltip Hover Integration
  // =========================================================================

  function bindTooltipEvents() {
    const tooltip = document.getElementById('map-tooltip');
    const container = document.getElementById('map-scroll-container');
    const svg = document.getElementById('campus-svg');

    if (!tooltip || !container || !svg) return;

    svg.addEventListener('mousemove', (e) => {
      const bldg = e.target.closest('.campus-building');
      if (bldg) {
        const id = bldg.getAttribute('data-id');
        const loc = getLocation(id);
        if (loc) {
          const rect = container.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;

          document.getElementById('tooltip-title').textContent = `${loc.code} • ${loc.name}`;
          document.getElementById('tooltip-category').textContent = loc.category.toUpperCase();
          document.getElementById('tooltip-desc').textContent = loc.description;

          tooltip.style.left = `${x}px`;
          tooltip.style.top = `${y}px`;
          tooltip.classList.add('visible');
        }
      } else {
        tooltip.classList.remove('visible');
      }
    });

    svg.addEventListener('mouseleave', () => {
      tooltip.classList.remove('visible');
    });
  }

  // =========================================================================
  // 10. Public API Export
  // =========================================================================

  window.CampusMap = {
    CONFIG: CAMPUS_CONFIG,
    LOCATIONS: CAMPUS_LOCATIONS,
    PATHWAYS: CAMPUS_PATHWAYS,
    init,
    getLocation,
    selectSource,
    selectDestination,
    clearSelection,
    highlightRoute,
    clearRoute,
    focusBuilding,
    // Aliases
    setSourceHighlight: selectSource,
    setDestHighlight: selectDestination,
    clearHighlights: clearSelection,
    drawRoutePath: highlightRoute,
    clearRoutePath: clearRoute,
    getLocationByName: getLocation
  };

})(window);
