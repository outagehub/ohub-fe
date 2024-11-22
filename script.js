// Initialize the map
const map = L.map('map', {
    zoomControl: true
}).setView([62, -96.8], 4); // Centered slightly lower to show more of Ontario

// Add a tile layer (OpenStreetMap)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors',
}).addTo(map);

// Add buttons for planned and unplanned outages
const controlContainer = document.createElement('div');
controlContainer.id = 'control-container';
controlContainer.innerHTML = `
    <button id="planned-btn" class="control-btn planned-btn active">Planned</button>
    <button id="unplanned-btn" class="control-btn unplanned-btn active">Unplanned</button>
`;
document.querySelector('.container').insertBefore(controlContainer, document.getElementById('map'));

// Set up layer groups for planned and unplanned outages
const plannedLayer = L.layerGroup().addTo(map);
const unplannedLayer = L.layerGroup().addTo(map);

// Leaflet's built-in blue marker icon
const bluePinIcon = new L.Icon({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    shadowSize: [41, 41],
    shadowAnchor: [12, 41],
});

// Fetch outage data and add markers to the map
fetch('/outages')
    .then(response => response.json())
    .then(outages => {
        outages.forEach(outage => {
            // Popup content
            const popupContent = `
                <strong>Outage ID:</strong> ${outage.id}<br>
                <strong>Municipality:</strong> ${outage.municipality}<br>
                <strong>Area:</strong> ${outage.area}<br>
                <strong>Cause:</strong> ${outage.cause}<br>
                <strong>Customers Affected:</strong> ${outage.num_customers}<br>
                <strong>Crew Status:</strong> ${outage.crew_status}<br>
                <strong>Power Company:</strong> ${outage.power_company}<br>
                <strong>Planned Outage:</strong> ${outage.planned === 1 ? 'Yes' : 'No'}
            `;

            // Add a marker
            const marker = L.marker([outage.latitude, outage.longitude], { icon: bluePinIcon })
                .bindPopup(popupContent);

            // Add to appropriate layer group
            if (outage.planned === 1) {
                plannedLayer.addLayer(marker);
            } else {
                unplannedLayer.addLayer(marker);
            }
        });
    })
    .catch(error => console.error('Error fetching outage data:', error));

// Button functionality
let showPlanned = true;
let showUnplanned = true;

document.getElementById('planned-btn').addEventListener('click', () => {
    showPlanned = !showPlanned;
    if (showPlanned) {
        map.addLayer(plannedLayer);
        document.getElementById('planned-btn').classList.add('active');
    } else {
        map.removeLayer(plannedLayer);
        document.getElementById('planned-btn').classList.remove('active');
    }
});

document.getElementById('unplanned-btn').addEventListener('click', () => {
    showUnplanned = !showUnplanned;
    if (showUnplanned) {
        map.addLayer(unplannedLayer);
        document.getElementById('unplanned-btn').classList.add('active');
    } else {
        map.removeLayer(unplannedLayer);
        document.getElementById('unplanned-btn').classList.remove('active');
    }
});

