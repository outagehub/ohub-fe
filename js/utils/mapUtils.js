// utils/mapUtils.js

export function initializeMap() {
    const map = L.map("map", {
        zoomControl: true,
    }).setView([62, -96.8], 4);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap contributors",
    }).addTo(map);

    return map;
}

export function clearMap(map) {
    map.eachLayer((layer) => {
        if (layer instanceof L.Marker || layer instanceof L.Polygon) {
            map.removeLayer(layer);
        }
    });
}

export function createMarker(lat, lng, popupContent, map, icon = null) {
    const marker = L.marker([lat, lng], { icon });
    marker.bindPopup(popupContent);
    marker.addTo(map);
    return marker;
}

