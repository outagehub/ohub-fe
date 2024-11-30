function formatTimestamp(dateInput, powerCompany) {
    if (!dateInput || dateInput === "Unknown") return "N/A";

    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    let date;

    if (powerCompany === "BC Hydro" || powerCompany === "NB Power") {
        // Convert Unix epoch in milliseconds to a Date object
        const timestamp = parseInt(dateInput, 10);
        if (isNaN(timestamp)) {
            console.error(`Invalid timestamp for ${powerCompany}: ${dateInput}`);
            return "Invalid Date";
        }
        date = new Date(timestamp);
    } else if (
        powerCompany === "Quebec Hydro" || 
        powerCompany === "Manitoba Hydro" || 
        powerCompany === "Algoma Power" || 
        powerCompany === "EPCOR Ontario" ||
	powerCompany === "Equs Alberta" ||
	powerCompany === "FortisBC" ||
	powerCompany === "Hydro Ottawa" ||
	powerCompany === "ENMAX Calgary"
    ) {
        // Parse ISO 8601 date strings directly
        date = new Date(dateInput);
    } else {
        console.error(`Unsupported power company: ${powerCompany}`);
        return "Invalid Date";
    }

    if (isNaN(date.getTime())) {
        console.error(`Invalid parsed date for ${powerCompany}: ${dateInput}`);
        return "Invalid Date";
    }

    // Format the date for the user's local time zone
    return date.toLocaleString("en-US", {
        timeZone: userTimeZone,
        dateStyle: "medium",
        timeStyle: "short",
    });
}

function formatTimestampWithUserTimeZone(timestamp) {
    if (!timestamp) return "N/A";

    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const date = new Date(timestamp);

    if (isNaN(date.getTime())) return "Invalid Date";

    return date.toLocaleString("en-US", {
        timeZone: userTimeZone,
        dateStyle: "medium",
        timeStyle: "short",
    });
}

function initializeMap() {
    const map = L.map("map", {
        zoomControl: true,
    }).setView([62, -96.8], 4);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap contributors",
    }).addTo(map);

    return map;
}

function fetchOutages(timestamp = null) {
    const queryParam = timestamp ? `?timestamp=${encodeURIComponent(timestamp)}` : "";
    return fetch(`/outages${queryParam}`)
        .then((response) => response.json())
        .catch((error) => {
            console.error("Error fetching outage data:", error);
            return [];
        });
}

function clearMap(map) {
    map.eachLayer((layer) => {
        if (layer instanceof L.Marker || layer instanceof L.Polygon) {
            map.removeLayer(layer);
        }
    });
}

function displayOutages(outages, map) {
    const bluePinIcon = new L.Icon({
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        shadowSize: [41, 41],
        shadowAnchor: [12, 41],
    });

    // Determine the latest timestamp for each power provider
    const latestTimestamps = outages.reduce((acc, outage) => {
        const powerCompany = outage.power_company;
        const outageTime = new Date(outage.time_stamp).getTime();

        if (!acc[powerCompany] || outageTime > acc[powerCompany]) {
            acc[powerCompany] = outageTime;
        }
        return acc;
    }, {});

    // Filter outages for the latest timestamp of each power provider
    const latestOutages = outages.filter(
        (outage) =>
            new Date(outage.time_stamp).getTime() === latestTimestamps[outage.power_company]
    );

    // Display filtered outages on the map
    latestOutages.forEach((outage) => {
        const formattedDateOff = formatTimestamp(outage.date_off, outage.power_company);
        const formattedCrewEta = formatTimestamp(outage.crew_eta, outage.power_company);
        const formattedTimestampAdded = formatTimestampWithUserTimeZone(outage.time_stamp);

        const popupContent = `
            <div style="font-size: 14px; line-height: 1.5;">
                <strong>Outage ID:</strong> ${outage.id}<br>
                <strong>Municipality:</strong> ${outage.municipality || "N/A"}<br>
                <strong>Area:</strong> ${outage.area || "N/A"}<br>
                <strong>Cause:</strong> ${outage.cause || "Unknown"}<br>
                <strong>Customers Affected:</strong> ${outage.num_customers || "N/A"}<br>
                <strong>Crew Status:</strong> ${outage.crew_status || "N/A"}<br>
                <strong>Outage Start:</strong> ${formattedDateOff}<br>
                <strong>Estimated Restore:</strong> ${formattedCrewEta}<br>
                <strong>Timestamp Added:</strong> ${formattedTimestampAdded}<br>
                <em>Power Company: ${outage.power_company || "Unknown Company"}</em>
            </div>
        `;

        // Add marker to map
        const marker = L.marker([outage.latitude, outage.longitude], {
            icon: bluePinIcon,
        }).bindPopup(popupContent);

        marker.addTo(map);

	// Handle polygons
if (Array.isArray(outage.polygon) && outage.polygon.length > 0) {

    // Format the polygon coordinates
    const polygonCoords = formatPolygonCoords(outage.polygon);

    // Validate polygon coordinates
    const validCoords = polygonCoords.filter(
        (coord) =>
            Array.isArray(coord) &&
            coord.length === 2 &&
            typeof coord[0] === "number" &&
            typeof coord[1] === "number"
    );

    if (validCoords.length > 2) {
        const polygon = L.polygon(validCoords, {
            color: "red",
            weight: 2,
            fillOpacity: 0.3,
        }).bindPopup(popupContent);

        polygon.addTo(map);
    } else {
        console.warn(`Invalid or incomplete polygon data for outage ID: ${outage.id}`);
    }
}
    });
}

// Helper function to format polygon coordinates from flat array to Leaflet format
function formatPolygonCoords(flatCoords) {
    // Check if the input is already in the format [[lat, lng], [lat, lng], ...]
    if (
        Array.isArray(flatCoords) &&
        Array.isArray(flatCoords[0]) &&
        flatCoords[0].length === 2 &&
        typeof flatCoords[0][0] === "number" &&
        typeof flatCoords[0][1] === "number"
    ) {
        return flatCoords; // Return as is if already in the correct format
    }

    // Otherwise, process the flat array into the correct format
    const formattedCoords = [];
    for (let i = 0; i < flatCoords.length; i += 2) {
        formattedCoords.push([flatCoords[i + 1], flatCoords[i]]); // [latitude, longitude]
    }
    return formattedCoords;
}

function geocodeAddressNominatim(address) {
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;

    return fetch(nominatimUrl)
        .then((response) => response.json())
        .then((data) => {
            if (data.length > 0) {
                const location = data[0];
                return { lat: parseFloat(location.lat), lng: parseFloat(location.lon) };
            } else {
                throw new Error("Address not found");
            }
        })
        .catch((error) => {
            console.error("Geocoding error:", error);
            alert("Failed to find the location. Please try again.");
        });
}

function isPointInsidePolygon(point, polygonCoords) {
    const [lat, lng] = point;
    const polygon = L.polygon(polygonCoords);
    return polygon.getBounds().contains(L.latLng(lat, lng));
}

document.addEventListener("DOMContentLoaded", async () => {
    const map = initializeMap();

    // Fetch and display the latest outages on the map
    async function fetchLatestOutages() {
        try {
            const response = await fetch("/outages/latest");
            const outages = await response.json();

            if (!Array.isArray(outages)) {
                console.error("Outages data is not an array:", outages);
                return;
            }

            displayOutages(outages, map);
        } catch (error) {
            console.error("Error fetching latest outages:", error);
        }
    }

    // Fetch outages filtered by timestamp
    async function fetchOutages(timestamp) {
        try {
            const url = timestamp ? `/outages?timestamp=${timestamp}` : "/outages";
            const response = await fetch(url);
            const outages = await response.json();

            if (!Array.isArray(outages)) {
                console.error("Outages data is not an array:", outages);
                return [];
            }

            return outages;
        } catch (error) {
            console.error("Error fetching outages:", error);
            return [];
        }
    }

    // Clear all markers and polygons from the map
    function clearMap(map) {
        map.eachLayer((layer) => {
            if (layer instanceof L.Marker || layer instanceof L.Polygon) {
                map.removeLayer(layer);
            }
        });
    }

    // Handle the "Apply" button for date and time filtering
    document.getElementById("applyButton").addEventListener("click", async () => {
        const selectedDate = document.getElementById("datePicker").value;
        const selectedTime = document.getElementById("timePicker").value;

        if (selectedDate && selectedTime) {
            const timestamp = new Date(`${selectedDate}T${selectedTime}`).toISOString();
            const outages = await fetchOutages(timestamp);
            clearMap(map);
            displayOutages(outages, map);
        } else {
            alert("Please select both date and time.");
        }
    });

    // Add functionality to the search bar
    document.getElementById("searchButton").addEventListener("click", async () => {
        const address = document.getElementById("searchInput").value.trim();

        if (!address) {
            alert("Please enter an address.");
            return;
        }

        try {
            const location = await geocodeAddressNominatim(address);
            if (location) {
                map.setView([location.lat, location.lng], 14);
                L.marker([location.lat, location.lng], {
                    icon: new L.Icon({
                        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
                        iconSize: [25, 41],
                        iconAnchor: [12, 41],
                        popupAnchor: [1, -34],
                    }),
                })
                    .addTo(map)
                    .bindPopup(`<strong>Address:</strong> ${address}`)
                    .openPopup();
            } else {
                alert("Address not found.");
            }
        } catch (error) {
            console.error("Error searching for address:", error);
            alert("An error occurred while searching for the address.");
        }
    });

    // Auto-fill current date and time in date/time pickers
    const now = new Date();
    document.getElementById("datePicker").value = now.toISOString().split("T")[0];
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    document.getElementById("timePicker").value = `${hours}:${minutes}`;

    // Fetch and display the latest outages on page load
    fetchLatestOutages();
});

// Helper function to geocode an address using Nominatim
async function geocodeAddressNominatim(address) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Geocoding request failed: ${response.status}`);
    }

    const data = await response.json();

    if (data.length === 0) {
        return null;
    }

    // Return the first result's coordinates
    return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
    };
}

