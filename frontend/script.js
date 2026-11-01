/**
 * CampusPath – Navigation Panel & C++ Backend Integration Module
 * 
 * Implements the confirmed C++ Backend API Contract:
 * 
 *   POST /api/shortest-path
 *   Request:
 *   {
 *     "source": "Main Gate",
 *     "destination": "Library"
 *   }
 * 
 *   Expected response:
 *   {
 *     "success": true,
 *     "route": ["Main Gate", "Canteen", "Library"],
 *     "distance": 250
 *   }
 * 
 * Features:
 * 1. JavaScript fetch() POST implementation with JSON payloads.
 * 2. Configurable backend API URL with localStorage persistence and UI controls.
 * 3. Handling of JSON responses and error states.
 * 4. Display of returned route and exact backend distance.
 * 5. Highlighting exact route on the SVG campus map.
 * 6. Detailed network error handling (offline server, timeout, 404, CORS).
 * 7. Validation for invalid/unrecognized locations returned by backend.
 * 8. Loading indicators (button spinner & radar scan animation).
 * 9. Strictly no fake successful responses.
 * 10. Strictly no Dijkstra in JavaScript.
 */

(function (window, document) {
  'use strict';

  // =========================================================================
  // 1. Backend Service Configuration
  // =========================================================================

  const DEFAULT_BACKEND_URL = 'http://localhost:8080/api/shortest-path';
  const STORAGE_KEY_BACKEND_URL = 'campuspath_backend_url';
  const REQUEST_TIMEOUT_MS = 5000;

  /**
   * Retrieves the configured C++ Backend URL from localStorage or fallback default
   */
  function getBackendUrl() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_BACKEND_URL);
      if (stored && stored.trim()) {
        return stored.trim();
      }
    } catch (e) {
      // LocalStorage access fallback
    }
    return DEFAULT_BACKEND_URL;
  }

  /**
   * Saves a new C++ Backend URL to localStorage
   */
  function setBackendUrl(newUrl) {
    const trimmed = (newUrl || '').trim();
    if (!trimmed || trimmed === DEFAULT_BACKEND_URL) {
      try {
        localStorage.removeItem(STORAGE_KEY_BACKEND_URL);
      } catch (e) {}
      return DEFAULT_BACKEND_URL;
    }
    try {
      localStorage.setItem(STORAGE_KEY_BACKEND_URL, trimmed);
    } catch (e) {}
    return trimmed;
  }

  // =========================================================================
  // 2. DOM Elements Cache
  // =========================================================================

  const elements = {
    // Dropdowns & Controls
    routingForm: document.getElementById('routing-form'),
    sourceSelect: document.getElementById('source-select'),
    destSelect: document.getElementById('dest-select'),
    srcCodeTag: document.getElementById('src-code-tag'),
    dstCodeTag: document.getElementById('dst-code-tag'),
    btnSwap: document.getElementById('btn-swap-locations'),
    btnFindPath: document.getElementById('btn-find-path'),
    btnFindLabel: document.getElementById('btn-find-label'),
    btnFindIcon: document.getElementById('btn-find-icon'),
    btnSpinner: document.getElementById('btn-spinner'),
    btnReset: document.getElementById('btn-reset'),
    clickGuideText: document.getElementById('click-guide-text'),
    navAlertBanner: document.getElementById('nav-alert-banner'),
    navAlertText: document.getElementById('nav-alert-text'),
    btnCloseAlert: document.getElementById('btn-close-alert'),

    // Route Result Panel
    routeStatusBadge: document.getElementById('route-status-badge'),
    routePlaceholder: document.getElementById('route-placeholder'),
    routeLoadingState: document.getElementById('route-loading-state'),
    loadingSubtitle: document.getElementById('loading-subtitle'),
    routeErrorState: document.getElementById('route-error-state'),
    errorTitle: document.getElementById('error-title'),
    errorDesc: document.getElementById('error-desc'),
    errorActionRow: document.getElementById('error-action-row'),
    routeContent: document.getElementById('route-content'),
    routeSrcLabel: document.getElementById('route-src-label'),
    routeDstLabel: document.getElementById('route-dst-label'),
    resDistance: document.getElementById('res-distance'),
    resTime: document.getElementById('res-time'),
    resHops: document.getElementById('res-hops'),
    pathTimeline: document.getElementById('path-timeline'),

    // Header & Meta
    backendStatusChip: document.getElementById('backend-status-chip'),
    liveClock: document.getElementById('live-clock'),
    toastContainer: document.getElementById('toast-container'),

    // Backend Config Drawer
    btnToggleBackendInfo: document.getElementById('btn-toggle-backend-info'),
    backendDetailsDrawer: document.getElementById('backend-details-drawer'),
    backendUrlInput: document.getElementById('backend-url-input'),
    btnSaveBackendUrl: document.getElementById('btn-save-backend-url'),
    btnResetBackendUrl: document.getElementById('btn-reset-backend-url'),
    btnSimulateBackend: document.getElementById('btn-simulate-backend-response')
  };

  // =========================================================================
  // 3. Application Initialization
  // =========================================================================

  function initApp() {
    startLiveClock();
    initBackendConfigUI();
    populateDropdowns();
    initMapIntegration();
    bindEvents();
    updateEndpointTags();

    // Default mobile view class
    if (!document.body.classList.contains('mobile-view-sidebar') && !document.body.classList.contains('mobile-view-map')) {
      document.body.classList.add('mobile-view-sidebar');
    }
  }

  /**
   * Initializes the Configurable Backend URL field in the UI
   */
  function initBackendConfigUI() {
    if (elements.backendUrlInput) {
      elements.backendUrlInput.value = getBackendUrl();
    }
  }

  /**
   * Live Clock Updater (HH:MM:SS)
   */
  function startLiveClock() {
    function tick() {
      const now = new Date();
      if (elements.liveClock) {
        elements.liveClock.textContent = now.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      }
    }
    tick();
    setInterval(tick, 1000);
  }

  /**
   * Populate Source & Destination dropdowns from centralized campus configuration
   */
  function populateDropdowns() {
    const locations = window.CampusMap.LOCATIONS;
    if (!locations) return;

    elements.sourceSelect.innerHTML = '<option value="" disabled selected>Select Starting Point...</option>';
    elements.destSelect.innerHTML = '<option value="" disabled selected>Select Target Destination...</option>';

    locations.forEach(loc => {
      // Source option
      const optSrc = document.createElement('option');
      optSrc.value = loc.id;
      optSrc.textContent = `${loc.name} (${loc.category})`;
      elements.sourceSelect.appendChild(optSrc);

      // Destination option
      const optDst = document.createElement('option');
      optDst.value = loc.id;
      optDst.textContent = `${loc.name} (${loc.category})`;
      elements.destSelect.appendChild(optDst);
    });

    updateDropdownOptionDisabling();
  }

  /**
   * Enforces mutual-exclusion: prevents selecting identical Source & Destination
   * by disabling the selected source in the destination dropdown and vice versa.
   */
  function updateDropdownOptionDisabling() {
    const currentSrc = elements.sourceSelect.value;
    const currentDst = elements.destSelect.value;

    // Update destination options
    Array.from(elements.destSelect.options).forEach(opt => {
      if (!opt.value) return; // Skip placeholder
      if (currentSrc && opt.value === currentSrc) {
        opt.disabled = true;
        opt.textContent = `${window.CampusMap.getLocation(opt.value).name} (Current Source)`;
      } else {
        opt.disabled = false;
        const loc = window.CampusMap.getLocation(opt.value);
        if (loc) opt.textContent = `${loc.name} (${loc.category})`;
      }
    });

    // Update source options
    Array.from(elements.sourceSelect.options).forEach(opt => {
      if (!opt.value) return; // Skip placeholder
      if (currentDst && opt.value === currentDst) {
        opt.disabled = true;
        opt.textContent = `${window.CampusMap.getLocation(opt.value).name} (Current Destination)`;
      } else {
        opt.disabled = false;
        const loc = window.CampusMap.getLocation(opt.value);
        if (loc) opt.textContent = `${loc.name} (${loc.category})`;
      }
    });
  }

  /**
   * Wires Map Event Callbacks
   */
  function initMapIntegration() {
    window.CampusMap.init({
      onLocationSelected: handleMapLocationClick
    });
  }

  // =========================================================================
  // 4. User Interaction Handlers
  // =========================================================================

  /**
   * Handle Click on Campus Map Building
   */
  function handleMapLocationClick(locationId, locationName) {
    clearAlertBanner();
    const srcId = elements.sourceSelect.value;
    const dstId = elements.destSelect.value;

    // Case 1: Source is empty -> Set Source
    if (!srcId) {
      setSource(locationId);
      showToast(`Selected "${locationName}" as Source`, 'info');
      updateClickGuide('Now click a building to select Destination');
      return;
    }

    // Case 2: Source is set, clicked the same building
    if (srcId === locationId) {
      showAlertBanner(`"${locationName}" is already your Starting Point. Please select a different Destination.`, 'warning');
      showToast('Source and Destination cannot be identical', 'warning');
      return;
    }

    // Case 3: Source is set, Destination is empty -> Set Destination
    if (!dstId) {
      setDestination(locationId);
      showToast(`Selected "${locationName}" as Destination`, 'info');
      updateClickGuide('Endpoints selected! Click "Find Shortest Path" to query backend');
      return;
    }

    // Case 4: Destination was clicked again -> confirm
    if (dstId === locationId) {
      showToast(`"${locationName}" is already your Destination`, 'info');
      return;
    }

    // Case 5: Both were already set -> Start fresh query with clicked building as new Source
    setSource(locationId);
    setDestination('');
    window.CampusMap.clearRoute();
    resetRouteDisplayState('Endpoints Updated');
    showToast(`Restarted selection: "${locationName}" set as Source`, 'info');
    updateClickGuide('Now click a building to select Destination');
  }

  /**
   * Updates Endpoint Code Tags [SRC] / [DST] in the Route Planner Card
   */
  function updateEndpointTags() {
    const srcVal = elements.sourceSelect.value;
    const dstVal = elements.destSelect.value;

    if (elements.srcCodeTag) {
      if (srcVal) {
        const loc = window.CampusMap.getLocation(srcVal);
        elements.srcCodeTag.textContent = loc ? `[${loc.code || 'A'}] ${loc.name.toUpperCase()}` : 'POINT A';
        elements.srcCodeTag.style.color = 'var(--neon-green)';
      } else {
        elements.srcCodeTag.textContent = 'POINT A';
        elements.srcCodeTag.style.color = '';
      }
    }

    if (elements.dstCodeTag) {
      if (dstVal) {
        const loc = window.CampusMap.getLocation(dstVal);
        elements.dstCodeTag.textContent = loc ? `[${loc.code || 'B'}] ${loc.name.toUpperCase()}` : 'POINT B';
        elements.dstCodeTag.style.color = 'var(--neon-coral)';
      } else {
        elements.dstCodeTag.textContent = 'POINT B';
        elements.dstCodeTag.style.color = '';
      }
    }
  }

  /**
   * Bind DOM Event Listeners
   */
  function bindEvents() {
    // Source dropdown change
    elements.sourceSelect.addEventListener('change', (e) => {
      clearAlertBanner();
      const val = e.target.value;
      window.CampusMap.selectSource(val);
      updateDropdownOptionDisabling();
      updateEndpointTags();

      // If user had somehow picked same destination, clear destination
      if (elements.destSelect.value === val) {
        setDestination('');
      }
    });

    // Destination dropdown change
    elements.destSelect.addEventListener('change', (e) => {
      clearAlertBanner();
      const val = e.target.value;
      window.CampusMap.selectDestination(val);
      updateDropdownOptionDisabling();
      updateEndpointTags();

      // If user had somehow picked same source, clear source
      if (elements.sourceSelect.value === val) {
        setSource('');
      }
    });

    // Swap button
    elements.btnSwap.addEventListener('click', handleSwapEndpoints);

    // Reset Route button
    elements.btnReset.addEventListener('click', handleResetRoute);

    // Find Shortest Path button
    elements.btnFindPath.addEventListener('click', handleFindShortestPath);

    // Alert Banner close button
    if (elements.btnCloseAlert) {
      elements.btnCloseAlert.addEventListener('click', clearAlertBanner);
    }

    // Preset Commute Pills
    const presetPills = document.querySelectorAll('.preset-pill');
    presetPills.forEach(pill => {
      pill.addEventListener('click', () => {
        const src = pill.getAttribute('data-src');
        const dst = pill.getAttribute('data-dst');
        if (src && dst) {
          clearAlertBanner();
          setSource(src);
          setDestination(dst);
          window.CampusMap.clearRoute();
          resetRouteDisplayState('Preset Loaded');
          updateClickGuide('Preset loaded! Click "Find Shortest Path" to query backend');
          const sLoc = window.CampusMap.getLocation(src);
          const dLoc = window.CampusMap.getLocation(dst);
          showToast(`Preset: ${sLoc ? sLoc.name : src} → ${dLoc ? dLoc.name : dst}`, 'info');
        }
      });
    });

    // Mobile View Segmented Tabs
    const tabBtns = document.querySelectorAll('.mobile-view-tabs .tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.getAttribute('data-view');
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        if (view === 'map') {
          document.body.classList.remove('mobile-view-sidebar');
          document.body.classList.add('mobile-view-map');
        } else {
          document.body.classList.remove('mobile-view-map');
          document.body.classList.add('mobile-view-sidebar');
        }
      });
    });

    // Toggle Backend Details Drawer
    if (elements.btnToggleBackendInfo) {
      elements.btnToggleBackendInfo.addEventListener('click', () => {
        const drawer = elements.backendDetailsDrawer;
        const isOpen = drawer.classList.toggle('is-open');
        elements.btnToggleBackendInfo.textContent = isOpen ? 'Hide ▴' : 'Configure ▾';
      });
    }

    // Save Configured Backend URL
    if (elements.btnSaveBackendUrl && elements.backendUrlInput) {
      elements.btnSaveBackendUrl.addEventListener('click', () => {
        const inputVal = elements.backendUrlInput.value;
        const saved = setBackendUrl(inputVal);
        elements.backendUrlInput.value = saved;
        showToast(`Backend API URL saved: ${saved}`, 'success');
      });
    }

    // Reset Backend URL to Default
    if (elements.btnResetBackendUrl && elements.backendUrlInput) {
      elements.btnResetBackendUrl.addEventListener('click', () => {
        const def = setBackendUrl(DEFAULT_BACKEND_URL);
        elements.backendUrlInput.value = def;
        showToast(`Reset Backend URL to default: ${def}`, 'info');
      });
    }

    // Sample C++ Payload Test Loader (Developer Verification Hook)
    if (elements.btnSimulateBackend) {
      elements.btnSimulateBackend.addEventListener('click', () => {
        feedSampleCppPayload();
      });
    }
  }

  /**
   * Swap Source and Destination Points
   */
  function handleSwapEndpoints() {
    clearAlertBanner();
    const currentSrc = elements.sourceSelect.value;
    const currentDst = elements.destSelect.value;

    if (!currentSrc && !currentDst) {
      showAlertBanner('Select at least one campus location before swapping.', 'warning');
      showToast('Select a location first', 'warning');
      return;
    }

    // Trigger visual rotation on button icon
    const svgIcon = elements.btnSwap.querySelector('svg');
    if (svgIcon) {
      svgIcon.style.transform = 'rotate(180deg)';
      setTimeout(() => { svgIcon.style.transform = ''; }, 350);
    }

    // Temporarily re-enable options so swapped values can be cleanly assigned
    Array.from(elements.sourceSelect.options).forEach(opt => opt.disabled = false);
    Array.from(elements.destSelect.options).forEach(opt => opt.disabled = false);

    // Swap values
    elements.sourceSelect.value = currentDst;
    elements.destSelect.value = currentSrc;

    // Update map marker styles
    window.CampusMap.selectSource(currentDst);
    window.CampusMap.selectDestination(currentSrc);
    updateDropdownOptionDisabling();
    updateEndpointTags();

    // Clear any previous active route path as endpoints inverted
    window.CampusMap.clearRoute();
    resetRouteDisplayState('Endpoints Swapped');

    showToast('Swapped Starting Point and Destination', 'info');
  }

  /**
   * Reset the entire navigation panel & map
   */
  function handleResetRoute() {
    clearAlertBanner();
    // Re-enable options so placeholder can be reset cleanly
    Array.from(elements.sourceSelect.options).forEach(opt => opt.disabled = false);
    Array.from(elements.destSelect.options).forEach(opt => opt.disabled = false);

    elements.sourceSelect.value = '';
    elements.destSelect.value = '';

    updateDropdownOptionDisabling();
    updateEndpointTags();
    window.CampusMap.clearSelection();
    window.CampusMap.clearRoute();

    setLoadingState(false);
    resetRouteDisplayState('Awaiting Query');
    updateClickGuide('Tip: Click any building pin on map to set Source or Destination');
    showToast('Navigation cleared', 'info');
  }

  /**
   * Programmatically set Source
   */
  function setSource(idOrName) {
    if (!idOrName) {
      elements.sourceSelect.value = '';
      window.CampusMap.selectSource('');
      updateDropdownOptionDisabling();
      updateEndpointTags();
      return;
    }
    const loc = window.CampusMap.getLocation(idOrName);
    if (loc) {
      // Re-enable in source dropdown in case it was disabled
      Array.from(elements.sourceSelect.options).forEach(opt => {
        if (opt.value === loc.id) opt.disabled = false;
      });
      elements.sourceSelect.value = loc.id;
      window.CampusMap.selectSource(loc.id);
      updateDropdownOptionDisabling();
      updateEndpointTags();
    }
  }

  /**
   * Programmatically set Destination
   */
  function setDestination(idOrName) {
    if (!idOrName) {
      elements.destSelect.value = '';
      window.CampusMap.selectDestination('');
      updateDropdownOptionDisabling();
      updateEndpointTags();
      return;
    }
    const loc = window.CampusMap.getLocation(idOrName);
    if (loc) {
      // Re-enable in dest dropdown in case it was disabled
      Array.from(elements.destSelect.options).forEach(opt => {
        if (opt.value === loc.id) opt.disabled = false;
      });
      elements.destSelect.value = loc.id;
      window.CampusMap.selectDestination(loc.id);
      updateDropdownOptionDisabling();
      updateEndpointTags();
    }
  }

  // =========================================================================
  // 5. Shortest Path Execution & C++ Backend Integration (POST Contract)
  // =========================================================================

  /**
   * Find Shortest Path Action
   * Sends POST /api/shortest-path with JSON:
   *   { "source": "<Source Name>", "destination": "<Destination Name>" }
   * 
   * Expects response:
   *   { "success": true, "route": [...], "distance": <number> }
   */
  async function handleFindShortestPath() {
    clearAlertBanner();

    const srcId = elements.sourceSelect.value;
    const dstId = elements.destSelect.value;

    // Validation 1: Both endpoints must be chosen
    if (!srcId && !dstId) {
      showAlertBanner('Please select both a Starting Location and a Destination.', 'warning');
      showToast('Select Source & Destination', 'warning');
      return;
    }
    if (!srcId) {
      showAlertBanner('Please select a Starting Location (Source).', 'warning');
      elements.sourceSelect.focus();
      return;
    }
    if (!dstId) {
      showAlertBanner('Please select a Target Destination.', 'warning');
      elements.destSelect.focus();
      return;
    }

    // Validation 2: Source and Destination cannot be identical
    if (srcId === dstId) {
      showAlertBanner('Starting Location and Destination cannot be the same building.', 'warning');
      showToast('Endpoints must be distinct', 'warning');
      return;
    }

    const srcLoc = window.CampusMap.getLocation(srcId);
    const dstLoc = window.CampusMap.getLocation(dstId);

    // Enter Loading State
    const targetUrl = getBackendUrl();
    setLoadingState(true, `Querying C++ Dijkstra Engine at ${targetUrl}...`);

    try {
      // 1. Prepare Request Payload adhering strictly to API Contract
      const requestPayload = {
        source: srcLoc.name,
        destination: dstLoc.name
      };

      // 2. Setup Timeout Controller
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      // 3. Send Request via fetch()
      let response;
      try {
        response = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(requestPayload),
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeoutId);
      }

      // 4. Parse JSON Response
      let responseData;
      try {
        responseData = await response.json();
      } catch (jsonErr) {
        throw new Error(`C++ server at ${targetUrl} returned non-JSON response (HTTP ${response.status}). Ensure the server returns application/json.`);
      }

      // 5. Check HTTP Error Status
      if (!response.ok) {
        const errorDetail = responseData && (responseData.error || responseData.message)
          ? (responseData.error || responseData.message)
          : `HTTP ${response.status} ${response.statusText}`;
        throw new Error(`Backend Error (${response.status}): ${errorDetail}`);
      }

      // 6. Check Business Success Flag
      const isSuccess = responseData.success === true || responseData.status === 'success';
      if (!isSuccess) {
        const failureReason = responseData.message || responseData.error || 'Backend reported that no route could be found.';
        throw new Error(failureReason);
      }

      // 7. Extract Route Array (support 'route' or fallback 'path')
      const routeArray = responseData.route || responseData.path;
      if (!routeArray || !Array.isArray(routeArray) || routeArray.length < 2) {
        throw new Error('Backend response must contain a "route" array with at least 2 locations.');
      }

      // 8. Requirement 7: Validate each location against campus map
      const unrecognized = [];
      routeArray.forEach(nameOrId => {
        if (!window.CampusMap.getLocation(nameOrNameClean(nameOrId))) {
          unrecognized.push(nameOrId);
        }
      });

      if (unrecognized.length > 0) {
        throw new Error(`Backend returned unrecognized location(s): ${unrecognized.map(u => `"${u}"`).join(', ')}. Ensure C++ graph vertex names match official campus locations.`);
      }

      // 9. Requirement 4 & 11: Validate distance
      if (responseData.distance === undefined || responseData.distance === null || typeof responseData.distance !== 'number') {
        throw new Error('Backend response must include a numeric "distance" value (in meters).');
      }

      // 10. Display Successful Result & Highlight Route
      displayRouteResult({
        source: srcLoc.name,
        destination: dstLoc.name,
        route: routeArray,
        distance: responseData.distance
      });

      showToast(`Optimal path received from C++ backend (${responseData.distance} m)!`, 'success');
      updateHeaderStatus(true);

    } catch (err) {
      // Handle Network, HTTP, or Contract Errors
      handleRouteCalculationError(srcLoc, dstLoc, err, targetUrl);
      updateHeaderStatus(false);
    } finally {
      setLoadingState(false);
    }
  }

  function nameOrNameClean(val) {
    return String(val || '').trim();
  }

  /**
   * Sets UI Loading State (Button spinner & Radar animation)
   */
  function setLoadingState(isLoading, subtitleText = '') {
    if (isLoading) {
      elements.btnFindPath.classList.add('is-loading');
      elements.btnFindPath.disabled = true;
      if (elements.btnSpinner) elements.btnSpinner.style.display = 'inline-block';
      if (elements.btnFindIcon) elements.btnFindIcon.style.display = 'none';
      if (elements.btnFindLabel) elements.btnFindLabel.textContent = 'Calculating Route...';

      elements.routeStatusBadge.textContent = 'Querying Backend...';
      elements.routeStatusBadge.className = 'badge badge-accent';

      elements.routePlaceholder.style.display = 'none';
      elements.routeContent.style.display = 'none';
      elements.routeErrorState.style.display = 'none';
      elements.routeLoadingState.style.display = 'block';

      if (elements.loadingSubtitle && subtitleText) {
        elements.loadingSubtitle.textContent = subtitleText;
      }
    } else {
      elements.btnFindPath.classList.remove('is-loading');
      elements.btnFindPath.disabled = false;
      if (elements.btnSpinner) elements.btnSpinner.style.display = 'none';
      if (elements.btnFindIcon) elements.btnFindIcon.style.display = 'inline-block';
      if (elements.btnFindLabel) elements.btnFindLabel.textContent = 'Find Shortest Path';

      elements.routeLoadingState.style.display = 'none';
    }
  }

  /**
   * Updates Header C++ Engine Status Indicator
   */
  function updateHeaderStatus(isOnline) {
    if (!elements.backendStatusChip) return;
    const label = elements.backendStatusChip.querySelector('.status-label');
    const dot = elements.backendStatusChip.querySelector('.status-dot');

    if (isOnline) {
      if (label) label.textContent = 'C++ Engine: Connected';
      if (dot) dot.style.backgroundColor = '#00e676';
    } else {
      if (label) label.textContent = 'C++ Engine: Offline';
      if (dot) dot.style.backgroundColor = '#ff5252';
    }
  }

  /**
   * Contextual Error Handler for C++ Backend Communication
   */
  function handleRouteCalculationError(srcLoc, dstLoc, error, endpointUrl) {
    elements.routeStatusBadge.textContent = 'Connection Error';
    elements.routeStatusBadge.className = 'badge';

    elements.routePlaceholder.style.display = 'none';
    elements.routeContent.style.display = 'none';
    elements.routeLoadingState.style.display = 'none';
    elements.routeErrorState.style.display = 'block';

    const isTimeout = error.name === 'AbortError';
    const isNetworkDown = error.name === 'TypeError' || error.message.includes('Failed to fetch') || error.message.includes('NetworkError');

    if (isTimeout) {
      elements.errorTitle.textContent = `Request Timed Out (${REQUEST_TIMEOUT_MS / 1000}s)`;
      elements.errorDesc.innerHTML = `
        The C++ server at <code>${endpointUrl}</code> took longer than ${REQUEST_TIMEOUT_MS / 1000} seconds to respond.<br>
        Check if the C++ Dijkstra calculation is hanging or blocked.
      `;
    } else if (isNetworkDown) {
      elements.errorTitle.textContent = 'C++ Graph Service Unreachable';
      elements.errorDesc.innerHTML = `
        Could not connect to <code>${endpointUrl}</code> via <code>POST /api/shortest-path</code>.<br>
        <strong>Request sent:</strong> <code>{"source": "${srcLoc.name}", "destination": "${dstLoc.name}"}</code>.<br><br>
        <span style="color: var(--text-dim); font-size: 0.72rem; display: block; line-height: 1.4;">
          • Make sure your C++ HTTP server is running.<br>
          • Ensure CORS headers (<code>Access-Control-Allow-Origin: *</code>) are sent.<br>
          • You can change the endpoint URL under <strong>Configure ▾</strong> above.
        </span>
      `;
    } else {
      elements.errorTitle.textContent = 'Backend Routing Error';
      elements.errorDesc.innerHTML = `
        <strong>Message from C++ Engine:</strong><br>
        <span style="color: #ff9e9e;">${escapeHtml(error.message)}</span>
      `;
    }

    elements.errorActionRow.innerHTML = `
      <button type="button" class="btn btn-secondary" id="btn-error-test-payload" style="font-size: 0.78rem; padding: 8px 14px;">
        Preview Sample C++ Response
      </button>
    `;

    const btnTest = document.getElementById('btn-error-test-payload');
    if (btnTest) {
      btnTest.addEventListener('click', () => {
        feedSampleCppPayload(srcLoc.id, dstLoc.id);
      });
    }

    showAlertBanner(`Backend Error: ${error.message}`, 'warning');
    showToast('C++ Engine communication failed', 'danger');
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // =========================================================================
  // 6. Route Result Card & Itinerary Timeline Rendering
  // =========================================================================

  /**
   * Renders Route Output Received from C++ Backend
   * @param {Object} data - Schema: { success: true, route: string[], distance: number }
   */
  function displayRouteResult(data) {
    const routeArray = data.route || data.path;
    if (!routeArray || !Array.isArray(routeArray) || routeArray.length < 2) {
      showAlertBanner('Invalid route sequence received from backend.', 'warning');
      return;
    }

    // Resolve location objects
    const resolvedNodes = routeArray.map(item => window.CampusMap.getLocation(item)).filter(Boolean);
    if (resolvedNodes.length < 2) {
      showAlertBanner('Route contains unknown campus buildings.', 'warning');
      return;
    }

    // Switch view
    elements.routePlaceholder.style.display = 'none';
    elements.routeLoadingState.style.display = 'none';
    elements.routeErrorState.style.display = 'none';
    elements.routeContent.style.display = 'block';

    // Badge
    elements.routeStatusBadge.textContent = 'Computed Optimal';
    elements.routeStatusBadge.className = 'badge badge-success';

    // Endpoints Banner
    const firstNode = resolvedNodes[0];
    const lastNode = resolvedNodes[resolvedNodes.length - 1];
    if (elements.routeSrcLabel) elements.routeSrcLabel.textContent = firstNode.name;
    if (elements.routeDstLabel) elements.routeDstLabel.textContent = lastNode.name;

    // Display Exact Distance returned by backend
    const exactBackendDistance = data.distance;
    elements.resDistance.textContent = `${exactBackendDistance} m`;

    // Compute Walking Time strictly based on returned distance (~80 meters/min)
    const walkingSpeedMps = 1.35;
    const estimatedMinutes = Math.max(1, Math.round(exactBackendDistance / (walkingSpeedMps * 60)));
    elements.resTime.textContent = `~${estimatedMinutes} min`;

    // Hops
    elements.resHops.textContent = `${resolvedNodes.length} blocks`;

    // Render Ordered Sequence Itinerary Timeline
    elements.pathTimeline.innerHTML = '';
    resolvedNodes.forEach((node, index) => {
      const li = document.createElement('li');
      li.className = 'timeline-step clickable';
      li.setAttribute('title', `Click to focus on ${node.name} on the map`);

      if (index === 0) {
        li.classList.add('step-source');
      } else if (index === resolvedNodes.length - 1) {
        li.classList.add('step-dest');
      }

      // Step text and category
      const infoWrap = document.createElement('div');
      infoWrap.className = 'step-info-wrap';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'step-name';
      nameSpan.textContent = `${index + 1}. ${node.name}`;

      const catSpan = document.createElement('span');
      catSpan.className = 'step-category';
      catSpan.textContent = node.category;

      infoWrap.appendChild(nameSpan);
      infoWrap.appendChild(catSpan);

      // Badge label
      const badgeSpan = document.createElement('span');
      badgeSpan.className = 'step-badge';
      if (index === 0) {
        badgeSpan.textContent = 'START';
      } else if (index === resolvedNodes.length - 1) {
        badgeSpan.textContent = 'DESTINATION';
      } else {
        badgeSpan.textContent = `Stop ${index}`;
      }

      li.appendChild(infoWrap);
      li.appendChild(badgeSpan);

      // Click to focus building on the SVG campus map
      li.addEventListener('click', () => {
        if (window.CampusMap.focusBuilding) {
          window.CampusMap.focusBuilding(node.id);
        }
        showToast(`Viewing ${node.name} on map`, 'info');
        if (window.innerWidth <= 992) {
          const mapTab = document.querySelector('.mobile-view-tabs .tab-btn[data-view="map"]');
          if (mapTab) mapTab.click();
        }
      });

      elements.pathTimeline.appendChild(li);
    });

    // Draw route line and walkway segment glows on SVG map
    window.CampusMap.highlightRoute(routeArray);
  }

  /**
   * Sample C++ Backend Output Payload Feeder (Developer Verification Hook)
   * Strictly for testing the display against the proposed API contract without running Dijkstra in JS.
   */
  function feedSampleCppPayload(preferredSrc = 'main-gate', preferredDst = 'library') {
    const sLoc = window.CampusMap.getLocation(preferredSrc) || window.CampusMap.getLocation('main-gate');
    const dLoc = window.CampusMap.getLocation(preferredDst) || window.CampusMap.getLocation('library');

    setSource(sLoc.id);
    setDestination(dLoc.id);

    // Contract Schema demonstration adhering to verified API specification
    const sampleContractPayload = {
      success: true,
      route: [sLoc.name, 'Canteen', dLoc.name].filter((v, i, a) => a.indexOf(v) === i),
      distance: 250
    };
    if (sampleContractPayload.route.length < 2) {
      sampleContractPayload.route = [sLoc.name, dLoc.name];
    }

    displayRouteResult(sampleContractPayload);
    showToast(`Loaded sample C++ output: ${sampleContractPayload.route.join(' → ')} (${sampleContractPayload.distance}m)`, 'success');
  }

  // =========================================================================
  // 7. Alert & State Helpers
  // =========================================================================

  function resetRouteDisplayState(badgeText = 'Awaiting Query') {
    elements.routeStatusBadge.textContent = badgeText;
    elements.routeStatusBadge.className = 'badge';
    elements.routePlaceholder.style.display = 'block';
    elements.routeContent.style.display = 'none';
    elements.routeLoadingState.style.display = 'none';
    elements.routeErrorState.style.display = 'none';
  }

  function showAlertBanner(message, type = 'danger') {
    if (!elements.navAlertBanner) return;
    elements.navAlertText.textContent = message;
    elements.navAlertBanner.className = `alert-banner alert-${type}`;
    elements.navAlertBanner.style.display = 'flex';
  }

  function clearAlertBanner() {
    if (elements.navAlertBanner) {
      elements.navAlertBanner.style.display = 'none';
    }
  }

  function updateClickGuide(message) {
    if (elements.clickGuideText) {
      elements.clickGuideText.textContent = message;
    }
  }

  /**
   * Toast Notification Utility
   */
  function showToast(message, type = 'info') {
    if (!elements.toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00e676" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else if (type === 'warning') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffa502" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
    } else if (type === 'danger') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff4757" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
    } else {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    toast.innerHTML = `${iconSvg}<span>${message}</span>`;
    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px) scale(0.9)';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // =========================================================================
  // 8. Public API Export
  // =========================================================================

  window.CampusPath = {
    init: initApp,
    getBackendUrl,
    setBackendUrl,
    setSource,
    setDestination,
    reset: handleResetRoute,
    displayRouteResult,
    feedSampleCppPayload,
    showAlertBanner,
    clearAlertBanner
  };

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

})(window, document);
