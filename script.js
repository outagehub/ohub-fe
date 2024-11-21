// Initialize the map
const map = L.map('map').setView([48.4284, -123.3656], 11); // Victoria, BC as the center

// Add a tile layer (OpenStreetMap)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors',
}).addTo(map);

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
                <strong>Crew Status:</strong> ${outage.crew_status}
            `;

            // Add a marker
            L.marker([outage.latitude, outage.longitude])
                .addTo(map)
                .bindPopup(popupContent);
        });
    })
    .catch(error => console.error('Error fetching outage data:', error));

