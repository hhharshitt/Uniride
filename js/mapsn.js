// Google Maps & Leaflet Hybrid Map & Simulation Engine for Uniride (India-focused)

window.GOOGLE_MAPS_API_KEY = window.GOOGLE_MAPS_API_KEY || "";

let googleMap = null;
let directionsService = null;
let directionsRenderer = null;
let driverMarker = null;
let passengerMarker = null;
let nearbyMarkers = [];
let activeRoutePolyline = null;
let simulationInterval = null;
let simulationPath = [];
let simulationIndex = 0;
let simulationSpeedMultiplier = 2; // Default speed multiplier

// Leaflet variables
let leafletMap = null;
let leafletDriverMarker = null;
let leafletPassengerMarker = null;
let leafletNearbyMarkers = [];
let leafletRoutePolyline = null;
let currentMapElementId = 'liveMap';
let googleMapsAuthFailed = false;
let currentTrackingBookingId = null;
let currentTrackingBookingStatus = null;
let activeTrackingUnsubscribe = null;

const DEFAULT_CENTER = { lat: 26.8439, lng: 75.5652 }; // Manipal University Jaipur (MUJ)

// Check if a valid Google Maps script is present
function isGoogleMapsAvailable() {
    if (googleMapsAuthFailed) return false;
    const key = window.GOOGLE_MAPS_API_KEY;
    if (!key || key.trim() === "") return false;
    if (typeof google === 'undefined' || typeof google.maps === 'undefined') return false;
    
    // Check if the script contains a blank key
    const script = document.querySelector('script[src*="maps.googleapis.com"]');
    if (script) {
        const src = script.getAttribute('src');
        if (src.includes('key=&') || src.endsWith('key=')) {
            return false; // key is empty
        }
    }
    return true;
}

// Global Google Maps Auth Failure Handler
window.gm_authFailure = function() {
    console.warn("Google Maps API authentication failed. Switching to Leaflet mapping.");
    googleMapsAuthFailed = true;
    triggerLeafletMapFallback();
};

function triggerLeafletMapFallback() {
    if (currentMapElementId) {
        initLeafletMap(currentMapElementId);
    }
    initCustomAutocomplete();
}

// Load Leaflet resources dynamically
function loadLeafletResources(callback) {
    if (window.L) {
        callback();
        return;
    }
    // Load Leaflet CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    // Load Leaflet JS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = callback;
    document.head.appendChild(script);
}

// Initialize Autocomplete for inputs
function initGoogleMapsAutocomplete() {
    if (!isGoogleMapsAvailable()) {
        initCustomAutocomplete();
        return;
    }

    const fromInput = document.getElementById('rideFrom');
    const toInput = document.getElementById('rideTo');
    const searchInput = document.getElementById('searchDestination');

    const jaipurBounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(26.0, 74.2),
        new google.maps.LatLng(27.5, 76.6)
    );
    const autocompleteOptions = {
        bounds: jaipurBounds,
        strictBounds: true,
        fields: ['formatted_address', 'geometry', 'name']
    };

    if (fromInput && typeof google !== 'undefined') {
        try {
            const fromAutocomplete = new google.maps.places.Autocomplete(fromInput, autocompleteOptions);
            fromAutocomplete.addListener('place_changed', () => {
                const place = fromAutocomplete.getPlace();
                if (place.geometry) {
                    fromInput.dataset.lat = place.geometry.location.lat();
                    fromInput.dataset.lng = place.geometry.location.lng();
                }
            });
        } catch (e) {
            console.error("Google maps autocomplete failed to initialize, using custom fallback:", e);
            initCustomAutocomplete();
            return;
        }
    }

    if (toInput && typeof google !== 'undefined') {
        try {
            const toAutocomplete = new google.maps.places.Autocomplete(toInput, autocompleteOptions);
            toAutocomplete.addListener('place_changed', () => {
                const place = toAutocomplete.getPlace();
                if (place.geometry) {
                    toInput.dataset.lat = place.geometry.location.lat();
                    toInput.dataset.lng = place.geometry.location.lng();
                }
            });
        } catch (e) {
            console.error(e);
        }
    }

    if (searchInput && typeof google !== 'undefined') {
        try {
            const searchAutocomplete = new google.maps.places.Autocomplete(searchInput, autocompleteOptions);
            searchAutocomplete.addListener('place_changed', () => {
                const place = searchAutocomplete.getPlace();
                if (place.geometry) {
                    searchInput.dataset.lat = place.geometry.location.lat();
                    searchInput.dataset.lng = place.geometry.location.lng();
                }
            });
        } catch (e) {
            console.error(e);
        }
    }
}

let customAutocompleteInitialized = false;

// Custom autocomplete fallback using Photon API (Komoot/OSM)
function initCustomAutocomplete() {
    if (customAutocompleteInitialized) return;
    
    const rideFromEl = document.getElementById('rideFrom');
    const rideToEl = document.getElementById('rideTo');
    const searchDestEl = document.getElementById('searchDestination');
    
    if (!rideFromEl && !rideToEl && !searchDestEl) return;
    
    customAutocompleteInitialized = true;
    setupCustomAutocomplete(rideFromEl);
    setupCustomAutocomplete(rideToEl);
    setupDestAutocomplete(searchDestEl);
}

function setupDestAutocomplete(input) {
    setupCustomAutocomplete(input);
}

function setupCustomAutocomplete(input) {
    if (!input) return;
    
    // Clone input to clear Google Maps listeners
    const clone = input.cloneNode(true);
    input.parentNode.replaceChild(clone, input);
    const activeInput = clone;
    
    // Ensure parent is wrapped in autocomplete-wrapper
    let wrapper = activeInput.parentElement;
    if (!wrapper.classList.contains('autocomplete-wrapper')) {
        wrapper = document.createElement('div');
        wrapper.className = 'autocomplete-wrapper';
        activeInput.parentNode.insertBefore(wrapper, activeInput);
        wrapper.appendChild(activeInput);
    }
    
    // Create autocomplete list
    let list = wrapper.querySelector('.autocomplete-suggestions');
    if (!list) {
        list = document.createElement('ul');
        list.className = 'autocomplete-suggestions';
        list.style.display = 'none';
        wrapper.appendChild(list);
    }
    
    let debounceTimer = null;
    let selectedIndex = -1;
    let currentSuggestions = [];
    
    // Input listener
    activeInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        const query = activeInput.value.trim();
        selectedIndex = -1;
        
        if (query.length < 3) {
            list.innerHTML = '';
            list.style.display = 'none';
            return;
        }
        
        debounceTimer = setTimeout(async () => {
            try {
                // Fetch from Photon API restricted to Jaipur and nearby areas
                const response = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&lat=26.8439&lon=75.5652&bbox=74.2,26.0,76.6,27.5&limit=6`);
                const data = await response.json();
                
                currentSuggestions = data.features || [];
                renderSuggestions(currentSuggestions);
            } catch (e) {
                console.error("Error fetching autocomplete suggestions:", e);
            }
        }, 300);
    });
    
    function renderSuggestions(suggestions) {
        list.innerHTML = '';
        if (suggestions.length === 0) {
            list.style.display = 'none';
            return;
        }
        
        suggestions.forEach((feature, index) => {
            const props = feature.properties;
            const item = document.createElement('li');
            item.className = 'autocomplete-suggestion';
            
            const titleText = props.name || '';
            const subtitleParts = [];
            if (props.street) subtitleParts.push(props.street);
            if (props.city || props.town) subtitleParts.push(props.city || props.town);
            if (props.state) subtitleParts.push(props.state);
            
            const subtitleText = subtitleParts.join(', ');
            
            item.innerHTML = `
                <div class="location-title">${titleText}</div>
                <div class="location-subtitle">${subtitleText || 'India'}</div>
            `;
            
            item.addEventListener('click', () => {
                selectSuggestion(feature);
            });
            
            list.appendChild(item);
        });
        
        list.style.display = 'block';
    }
    
    function selectSuggestion(feature) {
        const props = feature.properties;
        const coords = feature.geometry.coordinates; // [lng, lat]
        const lat = coords[1];
        const lng = coords[0];
        
        const titleText = props.name || '';
        const subtitleParts = [];
        if (props.city || props.town) subtitleParts.push(props.city || props.town);
        if (props.state) subtitleParts.push(props.state);
        const fullAddress = titleText + (subtitleParts.length ? ', ' + subtitleParts.join(', ') : '');
        
        activeInput.value = fullAddress;
        activeInput.dataset.lat = lat;
        activeInput.dataset.lng = lng;
        
        list.innerHTML = '';
        list.style.display = 'none';
        
        if (googleMap && isGoogleMapsAvailable()) {
            googleMap.panTo({ lat, lng });
        } else if (leafletMap) {
            leafletMap.panTo([lat, lng]);
        }
    }
    
    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
            list.style.display = 'none';
        }
    });
    
    activeInput.addEventListener('focus', () => {
        if (list.children.length > 0) {
            list.style.display = 'block';
        }
    });
    
    activeInput.addEventListener('keydown', (e) => {
        const items = list.querySelectorAll('.autocomplete-suggestion');
        if (items.length === 0) return;
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = (selectedIndex + 1) % items.length;
            highlightItem(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = (selectedIndex - 1 + items.length) % items.length;
            highlightItem(items);
        } else if (e.key === 'Enter') {
            if (selectedIndex > -1 && selectedIndex < items.length) {
                e.preventDefault();
                selectSuggestion(currentSuggestions[selectedIndex]);
            }
        }
    });
    
    function highlightItem(items) {
        items.forEach((item, idx) => {
            if (idx === selectedIndex) {
                item.classList.add('active');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('active');
            }
        });
    }
}

// Initialize Live Map
function initLiveTrackingMap(elementId) {
    currentMapElementId = elementId;
    
    if (!isGoogleMapsAvailable()) {
        initLeafletMap(elementId);
        initCustomAutocomplete();
        return null;
    }

    const mapOptions = {
        zoom: 15,
        center: DEFAULT_CENTER,
        mapId: 'uniride_map_style', // Custom clean style ID
        disableDefaultUI: true,
        zoomControl: true,
        restriction: {
            latLngBounds: {
                north: 27.5,
                south: 26.0,
                west: 74.2,
                east: 76.6
            },
            strictBounds: true
        },
        minZoom: 9
    };

    try {
        googleMap = new google.maps.Map(document.getElementById(elementId), mapOptions);
        directionsService = new google.maps.DirectionsService();
        directionsRenderer = new google.maps.DirectionsRenderer({
            map: googleMap,
            suppressMarkers: true,
            polylineOptions: {
                strokeColor: '#1976D2',
                strokeOpacity: 0.8,
                strokeWeight: 5
            }
        });

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const pos = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    // Ensure current location lies within restrictions
                    if (pos.lat >= 26.0 && pos.lat <= 27.5 && pos.lng >= 74.2 && pos.lng <= 76.6) {
                        googleMap.setCenter(pos);
                    } else {
                        googleMap.setCenter(DEFAULT_CENTER);
                    }
                },
                () => {
                    googleMap.setCenter(DEFAULT_CENTER);
                }
            );
        }
        return googleMap;
    } catch (e) {
        console.error("Google Maps initialization failed, switching to Leaflet:", e);
        initLeafletMap(elementId);
        return null;
    }
}

// Initialize Leaflet Map Fallback
function initLeafletMap(elementId) {
    const container = document.getElementById(elementId);
    if (!container) return;
    
    container.innerHTML = '';
    
    loadLeafletResources(() => {
        if (leafletMap) {
            try { leafletMap.remove(); } catch(e){}
            leafletMap = null;
        }
        
        const jaipurBounds = L.latLngBounds([26.0, 74.2], [27.5, 76.6]);
        leafletMap = L.map(elementId, {
            zoomControl: true,
            attributionControl: false,
            maxBounds: jaipurBounds,
            maxBoundsViscosity: 1.0,
            minZoom: 9
        }).setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], 14);
        
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            maxZoom: 19
        }).addTo(leafletMap);
        
        // Render nearby cabs
        renderNearbyCabsLeaflet(DEFAULT_CENTER);

        setTimeout(() => {
            if (leafletMap) {
                leafletMap.invalidateSize();
            }
        }, 200);
    });
}

// Render Cabs main switcher
function renderNearbyCabs(centerLatLng) {
    if (isGoogleMapsAvailable()) {
        renderNearbyCabsGoogle(centerLatLng);
    } else {
        renderNearbyCabsLeaflet(centerLatLng || DEFAULT_CENTER);
    }
}

function renderNearbyCabsGoogle(centerLatLng) {
    if (!googleMap || typeof google === 'undefined') return;

    // Clear previous nearby markers
    nearbyMarkers.forEach(marker => marker.setMap(null));
    nearbyMarkers = [];

    const center = centerLatLng || googleMap.getCenter() || DEFAULT_CENTER;
    const lat = typeof center.lat === 'function' ? center.lat() : center.lat;
    const lng = typeof center.lng === 'function' ? center.lng() : center.lng;

    const mockOffsets = [
        { lat: 0.003, lng: 0.002, type: 'Auto Rickshaw' },
        { lat: -0.002, lng: 0.004, type: 'Cab Sedan' },
        { lat: 0.005, lng: -0.003, type: 'Cab Hatchback' },
        { lat: -0.004, lng: -0.002, type: 'Auto Rickshaw' }
    ];

    mockOffsets.forEach((offset, index) => {
        const markerPos = {
            lat: lat + offset.lat,
            lng: lng + offset.lng
        };

        const iconUrl = offset.type.includes('Auto') 
            ? 'https://maps.google.com/mapfiles/ms/icons/yellow-dot.png' 
            : 'https://maps.google.com/mapfiles/ms/icons/cabs.png';

        const marker = new google.maps.Marker({
            position: markerPos,
            map: googleMap,
            title: `${offset.type} (Nearby)`,
            icon: {
                url: iconUrl,
                scaledSize: new google.maps.Size(32, 32)
            }
        });

        nearbyMarkers.push(marker);
    });
}

function renderNearbyCabsLeaflet(centerLatLng) {
    if (!leafletMap) return;

    leafletNearbyMarkers.forEach(m => m.remove());
    leafletNearbyMarkers = [];

    const lat = centerLatLng.lat;
    const lng = centerLatLng.lng;

    const mockOffsets = [
        { lat: 0.003, lng: 0.002, type: 'Auto Rickshaw' },
        { lat: -0.002, lng: 0.004, type: 'Cab Sedan' },
        { lat: 0.005, lng: -0.003, type: 'Cab Hatchback' },
        { lat: -0.004, lng: -0.002, type: 'Auto Rickshaw' }
    ];

    mockOffsets.forEach((offset) => {
        const pos = [lat + offset.lat, lng + offset.lng];
        const color = offset.type.includes('Auto') ? '#FFD600' : '#1976D2';

        const customMarker = L.divIcon({
            html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
            className: 'custom-leaflet-icon',
            iconSize: [12, 12],
            iconAnchor: [6, 6]
        });

        const marker = L.marker(pos, { icon: customMarker, title: offset.type }).addTo(leafletMap);
        leafletNearbyMarkers.push(marker);
    });
}

// Update Simulation Speed
function setSimulationSpeed(multiplier) {
    simulationSpeedMultiplier = multiplier;
    showToast(`Simulation speed set to ${multiplier}x`, 'info');
}

// Geocode addresses if coordinates are missing
async function getLatLngForAddress(address) {
    if (!isGoogleMapsAvailable()) {
        try {
            const response = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(address)}&lat=26.8439&lon=75.5652&bbox=74.2,26.0,76.6,27.5&limit=1`);
            const data = await response.json();
            if (data.features && data.features.length > 0) {
                const coords = data.features[0].geometry.coordinates;
                return { lat: coords[1], lng: coords[0] };
            }
        } catch (e) {
            console.error("OSM Geocoding failed:", e);
        }
        
        if (address.toLowerCase().includes('station')) {
            return { lat: 26.9196, lng: 75.7878 };
        } else if (address.toLowerCase().includes('airport')) {
            return { lat: 26.8242, lng: 75.8122 };
        }
        return DEFAULT_CENTER;
    }

    const geocoder = new google.maps.Geocoder();
    return new Promise((resolve) => {
        geocoder.geocode({
            address: address,
            componentRestrictions: { country: 'IN' },
            bounds: {
                north: 27.5,
                south: 26.0,
                west: 74.2,
                east: 76.6
            }
        }, (results, status) => {
            if (status === 'OK' && results[0]) {
                const loc = results[0].geometry.location;
                resolve({ lat: loc.lat(), lng: loc.lng() });
            } else {
                resolve(DEFAULT_CENTER);
            }
        });
    });
}

// Start Simulated Trip/En-route Tracking
async function startRideTracking(booking, isDriverSide) {
    if (currentTrackingBookingId === booking.id && currentTrackingBookingStatus === booking.status) {
        return;
    }

    currentTrackingBookingId = booking.id;
    currentTrackingBookingStatus = booking.status;

    if (simulationInterval) {
        clearInterval(simulationInterval);
        simulationInterval = null;
    }

    if (activeTrackingUnsubscribe) {
        activeTrackingUnsubscribe();
        activeTrackingUnsubscribe = null;
    }

    // Switch to Home section so that the activeRideMapCard (which is inside homeSection) is visible
    if (typeof switchSection === 'function') {
        switchSection('home');
    }

    const activeRideCard = document.getElementById('activeRideMapCard');
    if (activeRideCard) activeRideCard.style.display = 'block';

    if (isGoogleMapsAvailable() && !googleMap) {
        initLiveTrackingMap('liveMap');
    } else if (!isGoogleMapsAvailable() && !leafletMap) {
        initLiveTrackingMap('liveMap');
    } else if (!isGoogleMapsAvailable() && leafletMap) {
        setTimeout(() => {
            leafletMap.invalidateSize();
        }, 100);
    }

    const overlayContent = document.getElementById('rideInfoContent');
    const rideDoc = await db.collection('rides').doc(booking.rideId).get();
    const ride = rideDoc.data();

    const pickupLoc = ride.fromLatLng || await getLatLngForAddress(ride.from);
    const destLoc = ride.toLatLng || await getLatLngForAddress(ride.to);

    let driverLoc = booking.driverLocation || {
        lat: pickupLoc.lat + 0.012,
        lng: pickupLoc.lng - 0.008
    };

    // Render Markers
    if (isGoogleMapsAvailable()) {
        if (driverMarker) driverMarker.setMap(null);
        if (passengerMarker) passengerMarker.setMap(null);

        if (googleMap) {
            passengerMarker = new google.maps.Marker({
                position: pickupLoc,
                map: googleMap,
                title: 'Passenger Pickup',
                icon: {
                    url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                    scaledSize: new google.maps.Size(36, 36)
                }
            });

            driverMarker = new google.maps.Marker({
                position: driverLoc,
                map: googleMap,
                title: 'Driver Location',
                icon: {
                    url: 'https://maps.google.com/mapfiles/ms/icons/sportscar.png',
                    scaledSize: new google.maps.Size(36, 36)
                }
            });
        }
    } else {
        loadLeafletResources(() => {
            if (leafletDriverMarker) leafletDriverMarker.remove();
            if (leafletPassengerMarker) leafletPassengerMarker.remove();

            const passengerIcon = L.divIcon({
                html: `<div style="background-color: #2196F3; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.4);"></div>`,
                className: 'custom-passenger-icon',
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            });

            const driverIcon = L.divIcon({
                html: `<div style="background-color: #4CAF50; width: 18px; height: 18px; border-radius: 4px; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.4); transform: rotate(45deg);"></div>`,
                className: 'custom-driver-icon',
                iconSize: [18, 18],
                iconAnchor: [9, 9]
            });

            if (leafletMap) {
                leafletPassengerMarker = L.marker([pickupLoc.lat, pickupLoc.lng], { icon: passengerIcon, title: 'Passenger Pickup' }).addTo(leafletMap);
                leafletDriverMarker = L.marker([driverLoc.lat, driverLoc.lng], { icon: driverIcon, title: 'Driver Location' }).addTo(leafletMap);
            }
        });
    }

    activeTrackingUnsubscribe = db.collection('bookings').doc(booking.id).onSnapshot(async (doc) => {
        const updatedBooking = doc.data();
        if (!updatedBooking) return;

        if (updatedBooking.status === 'CANCELLED' || updatedBooking.status === 'REJECTED') {
            if (simulationInterval) {
                clearInterval(simulationInterval);
                simulationInterval = null;
            }
            if (activeRideCard) activeRideCard.style.display = 'none';
            if (activeTrackingUnsubscribe) {
                activeTrackingUnsubscribe();
                activeTrackingUnsubscribe = null;
            }
            currentTrackingBookingId = null;
            currentTrackingBookingStatus = null;
            return;
        }

        if (!isDriverSide && updatedBooking.driverLocation) {
            if (isGoogleMapsAvailable()) {
                const newPos = new google.maps.LatLng(updatedBooking.driverLocation.lat, updatedBooking.driverLocation.lng);
                if (driverMarker) driverMarker.setPosition(newPos);
                if (googleMap) googleMap.panTo(newPos);
            } else {
                if (leafletDriverMarker && leafletMap) {
                    leafletDriverMarker.setLatLng([updatedBooking.driverLocation.lat, updatedBooking.driverLocation.lng]);
                    leafletMap.panTo([updatedBooking.driverLocation.lat, updatedBooking.driverLocation.lng]);
                }
            }
        }

        if (updatedBooking.status === 'ACCEPTED') {
            overlayContent.innerHTML = `
                <div class="ride-status-badge status-accepted">Driver Confirmed</div>
                <div class="ride-detail-row"><strong>Driver:</strong> ${ride.driverName}</div>
                <div class="ride-detail-row"><strong>Vehicle:</strong> ${ride.vehicleInfo || 'Auto / Cab'}</div>
                <div class="ride-detail-row" id="etaTime">Calculating ETA...</div>
            `;
            drawRoute(driverLoc, pickupLoc);
            
            if (isDriverSide && !simulationInterval) {
                runSimulation(booking.id, driverLoc, pickupLoc, 'ARRIVED', async () => {
                    await db.collection('bookings').doc(booking.id).update({
                        status: 'ARRIVED'
                    });
                    showToast('You have arrived at the pickup location!', 'success');
                });
            }
        } 
        else if (updatedBooking.status === 'ARRIVED') {
            overlayContent.innerHTML = `
                <div class="ride-status-badge status-requested" style="background:#4CAF50;">Driver Arrived</div>
                <div class="ride-detail-row">Your ride is here!</div>
                ${!isDriverSide ? `
                    <div style="margin-top:0.8rem;">
                        <button class="btn-success" id="passengerStartJourneyBtn" onclick="startPassengerJourney('${booking.id}')">Start Journey</button>
                    </div>
                ` : `
                    <div class="ride-detail-row">Waiting for passenger to start journey...</div>
                `}
            `;
            if (isGoogleMapsAvailable()) {
                if (googleMap) {
                    googleMap.setZoom(16);
                    googleMap.panTo(pickupLoc);
                }
            } else {
                if (leafletMap) {
                    leafletMap.setZoom(16);
                    leafletMap.panTo([pickupLoc.lat, pickupLoc.lng]);
                }
            }
            if (simulationInterval) {
                clearInterval(simulationInterval);
                simulationInterval = null;
            }
        } 
        else if (updatedBooking.status === 'IN_PROGRESS') {
            overlayContent.innerHTML = `
                <div class="ride-status-badge status-accepted" style="background:#2196F3;">Journey Started</div>
                <div class="ride-detail-row">Heading to: <strong>${ride.to}</strong></div>
                <div class="ride-detail-row" id="etaTime">Calculating Trip Duration...</div>
            `;

            drawRoute(pickupLoc, destLoc);
            if (isGoogleMapsAvailable()) {
                if (passengerMarker) passengerMarker.setPosition(destLoc);
            } else {
                if (leafletPassengerMarker) leafletPassengerMarker.setLatLng([destLoc.lat, destLoc.lng]);
            }

            if (isDriverSide && !simulationInterval) {
                runSimulation(booking.id, pickupLoc, destLoc, 'COMPLETED', async () => {
                    await db.collection('bookings').doc(booking.id).update({
                        status: 'COMPLETED',
                        completedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    const activeBookings = await db.collection('bookings')
                        .where('rideId', '==', ride.id)
                        .where('status', 'in', ['REQUESTED', 'ACCEPTED', 'ARRIVED', 'IN_PROGRESS'])
                        .get();
                    
                    if (activeBookings.empty) {
                        await db.collection('rides').doc(ride.id).update({
                            status: 'COMPLETED',
                            completedAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    }

                    const batch = db.batch();
                    batch.update(db.collection('users').doc(ride.driverId), {
                        ridesCompleted: firebase.firestore.FieldValue.increment(1)
                    });
                    batch.update(db.collection('users').doc(booking.passengerId), {
                        ridesCompleted: firebase.firestore.FieldValue.increment(1)
                    });
                    await batch.commit();

                    showToast('Journey completed successfully!', 'success');
                    
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                });
            }
        } 
        else if (updatedBooking.status === 'COMPLETED') {
            overlayContent.innerHTML = `
                <div class="ride-status-badge status-accepted" style="background:#4CAF50;">✓ Completed</div>
                <div class="ride-detail-row">Thank you for riding with Uniride!</div>
            `;
            if (simulationInterval) {
                clearInterval(simulationInterval);
                simulationInterval = null;
            }
            setTimeout(() => {
                if (activeRideCard) activeRideCard.style.display = 'none';
            }, 5000);
            if (activeTrackingUnsubscribe) {
                activeTrackingUnsubscribe();
                activeTrackingUnsubscribe = null;
            }
            currentTrackingBookingId = null;
            currentTrackingBookingStatus = null;
        }
    });
}

window.startPassengerJourney = async function(bookingId) {
    try {
        await db.collection('bookings').doc(bookingId).update({
            status: 'IN_PROGRESS'
        });
        showToast('Journey started!', 'success');
    } catch (e) {
        console.error('Error starting journey:', e);
    }
};

function drawRoute(origin, destination) {
    if (isGoogleMapsAvailable()) {
        drawRouteGoogle(origin, destination);
    } else {
        drawRouteLeaflet(origin, destination);
    }
}

function drawRouteGoogle(origin, destination) {
    if (!directionsService || !googleMap) return;

    directionsService.route(
        {
            origin: origin,
            destination: destination,
            travelMode: google.maps.TravelMode.DRIVING
        },
        (response, status) => {
            if (status === 'OK') {
                directionsRenderer.setDirections(response);
                
                const leg = response.routes[0].legs[0];
                const durationText = leg.duration.text;
                const distanceText = leg.distance.text;
                const etaElement = document.getElementById('etaTime');
                if (etaElement) {
                    etaElement.innerHTML = `<strong>ETA:</strong> ${durationText} (${distanceText})`;
                }

                if (!simulationInterval) {
                    simulationPath = [];
                    leg.steps.forEach(step => {
                        step.path.forEach(latLng => {
                            simulationPath.push({
                                lat: latLng.lat(),
                                lng: latLng.lng()
                            });
                        });
                    });
                    simulationIndex = 0;
                }
            } else {
                console.error('Directions request failed due to ' + status);
            }
        }
    );
}

async function drawRouteLeaflet(origin, destination) {
    if (!leafletMap) return;
    
    if (leafletRoutePolyline) {
        leafletRoutePolyline.remove();
        leafletRoutePolyline = null;
    }
    
    try {
        const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?geometries=geojson&overview=full`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            const coordinates = route.geometry.coordinates; // Array of [lng, lat]
            
            if (!simulationInterval) {
                simulationPath = coordinates.map(coord => ({
                    lat: coord[1],
                    lng: coord[0]
                }));
                simulationIndex = 0;
            }
            
            const latlngs = coordinates.map(coord => [coord[1], coord[0]]);
            leafletRoutePolyline = L.polyline(latlngs, {
                color: '#1976D2',
                weight: 5,
                opacity: 0.8
            }).addTo(leafletMap);
            
            leafletMap.fitBounds(leafletRoutePolyline.getBounds(), { padding: [30, 30] });
            
            const durationMin = Math.round(route.duration / 60);
            const distanceKm = (route.distance / 1000).toFixed(1);
            
            const etaElement = document.getElementById('etaTime');
            if (etaElement) {
                etaElement.innerHTML = `<strong>ETA:</strong> ${durationMin} mins (${distanceKm} km)`;
            }
        } else {
            throw new Error("No OSRM routes");
        }
    } catch (e) {
        console.error("OSRM route request failed, falling back to linear path:", e);
        
        if (!simulationInterval) {
            simulationPath = [];
            for (let i = 0; i <= 20; i++) {
                const t = i / 20;
                simulationPath.push({
                    lat: origin.lat + t * (destination.lat - origin.lat),
                    lng: origin.lng + t * (destination.lng - origin.lng)
                });
            }
            simulationIndex = 0;
        }
        
        const fallbackPath = simulationPath.length > 0 ? simulationPath : (() => {
            const path = [];
            for (let i = 0; i <= 20; i++) {
                const t = i / 20;
                path.push({
                    lat: origin.lat + t * (destination.lat - origin.lat),
                    lng: origin.lng + t * (destination.lng - origin.lng)
                });
            }
            return path;
        })();
        const latlngs = fallbackPath.map(p => [p.lat, p.lng]);
        leafletRoutePolyline = L.polyline(latlngs, {
            color: '#1976D2',
            weight: 5,
            opacity: 0.8
        }).addTo(leafletMap);
        
        leafletMap.fitBounds(leafletRoutePolyline.getBounds(), { padding: [30, 30] });
        
        const etaElement = document.getElementById('etaTime');
        if (etaElement) {
            etaElement.innerHTML = `<strong>ETA:</strong> 15 mins (Fallback Route)`;
        }
    }
}

// Run simulation step-by-step
function runSimulation(bookingId, start, end, nextStatus, onCompleteCallback) {
    if (simulationInterval) {
        clearInterval(simulationInterval);
        simulationInterval = null;
    }

    if (simulationPath.length === 0) {
        for (let i = 0; i <= 20; i++) {
            const t = i / 20;
            simulationPath.push({
                lat: start.lat + t * (end.lat - start.lat),
                lng: start.lng + t * (end.lng - start.lng)
            });
        }
    }

    simulationIndex = 0;

    simulationInterval = setInterval(async () => {
        if (simulationIndex >= simulationPath.length) {
            clearInterval(simulationInterval);
            simulationInterval = null;
            if (onCompleteCallback) onCompleteCallback();
            return;
        }

        const currentPos = simulationPath[simulationIndex];

        if (isGoogleMapsAvailable()) {
            if (driverMarker) {
                driverMarker.setPosition(currentPos);
                googleMap.panTo(currentPos);
            }
        } else {
            if (leafletDriverMarker && leafletMap) {
                leafletDriverMarker.setLatLng([currentPos.lat, currentPos.lng]);
                leafletMap.panTo([currentPos.lat, currentPos.lng]);
            }
        }

        try {
            await db.collection('bookings').doc(bookingId).update({
                driverLocation: currentPos
            });
        } catch (e) {
            console.error('Error updating driver location:', e);
        }

        simulationIndex += simulationSpeedMultiplier;
    }, 1000);
}

// Self-invoking function to load Google Maps dynamically if API key is present
(function loadGoogleMapsScript() {
    const key = window.GOOGLE_MAPS_API_KEY;
    if (key && key.trim() !== "") {
        console.log("Loading Google Maps dynamically...");
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places,geometry&callback=initGoogleMapsAutocomplete`;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
    } else {
        console.log("No Google Maps API key provided. Using Leaflet fallback.");
        // Initialize custom autocomplete when DOM is ready or immediately
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initCustomAutocomplete);
        } else {
            setTimeout(initCustomAutocomplete, 100);
        }
    }
})();
