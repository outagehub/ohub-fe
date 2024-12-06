function formatTimestamp(dateInput, powerCompany) {
    if (!dateInput || dateInput === "Unknown") return "N/A";

    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    let date;

    if (powerCompany === "BC Hydro" || powerCompany === "NB Power") {
        const timestamp = parseInt(dateInput, 10);
        if (isNaN(timestamp)) {
            console.error(`Invalid timestamp for ${powerCompany}: ${dateInput}`);
            return "Invalid Date";
        }
        date = new Date(timestamp);
    } else if (
        ["Quebec Hydro", "Manitoba Hydro", "Algoma Power", "EPCOR Ontario", 
        "Equs Alberta", "FortisBC", "Hydro Ottawa", "ENMAX Calgary", "Hydro One"].includes(powerCompany)
    ) {
        date = new Date(dateInput);
    } else {
        console.error(`Unsupported power company: ${powerCompany}`);
        return "Invalid Date";
    }

    if (isNaN(date.getTime())) {
        console.error(`Invalid parsed date for ${powerCompany}: ${dateInput}`);
        return "Invalid Date";
    }

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

    // Create a MarkerClusterGroup
    const markers = L.markerClusterGroup();

    // Loop through outages and add markers to the cluster group
    outages.forEach((outage) => {
	if (outage.power_company === "Hydro One") {
    		console.log(`Power Company: ${outage.power_company}`);
    		console.log(`Outage: ${JSON.stringify(outage)}`);
		
		const temp = outage.latitude;
    		outage.latitude = outage.longitude;
    		outage.longitude = temp;
	}

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

        const marker = L.marker([outage.latitude, outage.longitude], { icon: bluePinIcon })
            .bindPopup(popupContent);

        markers.addLayer(marker);

        // Handle polygons if needed
        if (outage.power_company !== "Hydro One" && Array.isArray(outage.polygon) && outage.polygon.length > 0) {

	    const polygonCoords = formatPolygonCoords(outage.polygon);

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
                if (outage.power_company === "Quebec Hydro") {
                    console.warn("Quebec Hydro: Invalid or incomplete polygon data for outage ID:", outage.id);
                }
            }
        }
    });

    // Add markers to the map
    map.addLayer(markers);
}

function formatPolygonCoords(flatCoords) {
    if (
        Array.isArray(flatCoords) &&
        Array.isArray(flatCoords[0]) &&
        flatCoords[0].length === 2 &&
        typeof flatCoords[0][0] === "number" &&
        typeof flatCoords[0][1] === "number"
    ) {
        return flatCoords; // Return as-is if already in the correct format
    }

    const formattedCoords = [];
    for (let i = 0; i < flatCoords.length; i += 2) {
        if (flatCoords[i + 1] !== undefined && flatCoords[i] !== undefined) {
            formattedCoords.push([flatCoords[i + 1], flatCoords[i]]); // Swap latitude and longitude
        } else {
            console.warn("Invalid coordinate pair found:", flatCoords[i], flatCoords[i + 1]);
        }
    }
    return formattedCoords;
}

function displayWeatherAlerts(map) {
    const grayPolygonStyle = {
        color: "gray",
        weight: 2,
        fillOpacity: 0.3,
    };

    // Fetch the weather alerts data
    fetch('/weather-alerts')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(alerts => {
            console.log(`Alerts data fetched successfully: ${alerts.length} alerts.`);

            alerts.forEach(alert => {
                const { id, polygon, text, issue_time, expiry } = alert;

                console.log(`Processing alert ID: ${id}`);
                if (!Array.isArray(polygon) || polygon.length === 0) {
                    console.warn(`No valid polygon data for alert ID: ${id}. Skipping...`);
                    return;
                }

                // Process each polygon
                polygon.forEach((subPolygon, subPolygonIndex) => {
                    console.log(`Processing polygon #${subPolygonIndex} for alert ID: ${id}`);

                    // Swap coordinates and round them
                    const swappedCoords = subPolygon.map(coord => {
                        if (Array.isArray(coord) && coord.length === 2) {
                            return [
                                parseFloat(coord[1].toFixed(6)), // Latitude
                                parseFloat(coord[0].toFixed(6))  // Longitude
                            ];
                        }
                        return null; // Mark invalid coordinates for filtering
                    }).filter(coord => coord !== null);

                    // Add polygon to the map
                    if (swappedCoords.length > 2) {
                        const popupContent = `
                            <b>Alert:</b> ${text}<br>
                            <b>Issue Time:</b> ${new Date(issue_time).toLocaleString()}<br>
                            <b>Expiry:</b> ${new Date(expiry).toLocaleString()}
                        `;
                        const polygonLayer = L.polygon(swappedCoords, grayPolygonStyle).bindPopup(popupContent);
                        polygonLayer.addTo(map);
                        console.log(`Polygon layer added for alert ID: ${id}, polygon #${subPolygonIndex}`);
                    } else {
                        console.warn(`Not enough valid coordinates for polygon layer for alert ID: ${id}, polygon #${subPolygonIndex}`);
                    }
                });
            });
        })
        .catch(error => {
            console.error(`Error fetching weather alerts: ${error.message}`);
        });
}

function formatPolygonCoords(flatCoords) {
    if (
        Array.isArray(flatCoords) &&
        Array.isArray(flatCoords[0]) &&
        flatCoords[0].length === 2 &&
        typeof flatCoords[0][0] === "number" &&
        typeof flatCoords[0][1] === "number"
    ) {
        return flatCoords; // Return as-is if already in the correct format
    }

    const formattedCoords = [];
    for (let i = 0; i < flatCoords.length; i += 2) {
        if (flatCoords[i + 1] !== undefined && flatCoords[i] !== undefined) {
            formattedCoords.push([flatCoords[i + 1], flatCoords[i]]); // Swap latitude and longitude
        } else {
            console.warn("Invalid coordinate pair found:", flatCoords[i], flatCoords[i + 1]);
        }
    }
    return formattedCoords;
}

async function geocodeAddressNominatim(address) {
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;

    try {
        const response = await fetch(nominatimUrl);

        if (!response.ok) {
            throw new Error(`Geocoding request failed with status ${response.status}`);
        }

        const data = await response.json();

        if (data.length === 0) {
            return null; // Address not found
        }

        // Return the first result's coordinates
        return {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
        };
    } catch (error) {
        console.error("Error during geocoding:", error);
        alert("Failed to find the location. Please try again.");
        return null;
    }
}

async function getOutages(timestamp) {
    try {
        const url = timestamp ? `/outages?timestamp=${encodeURIComponent(timestamp)}` : "/outages";
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Error fetching outages: ${response.status}`);
        }

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

document.addEventListener("DOMContentLoaded", async () => {
    // Initialize the map
    const map = initializeMap();
    
    // Fetch preloaded outages and display them
    async function fetchPreloadedOutages() {
        try {
            const response = await fetch("/preloaded-outages");
            const outages = await response.json();

            if (!Array.isArray(outages)) {
                console.error("Outages data is not an array:", outages);
                return [];
            }

            return outages;
        } catch (error) {
            console.error("Error fetching preloaded outages:", error);
            return [];
        }
    }

    const outages = await fetchPreloadedOutages();
    displayOutages(outages, map);
    displayWeatherAlerts(map);

    // Apply filter for date and time
document.getElementById("applyButton").addEventListener("click", async () => {
    const applyButton = document.getElementById("applyButton");
    const selectedDate = document.getElementById("datePicker").value;
    const selectedTime = document.getElementById("timePicker").value;

    if (!selectedDate || !selectedTime) {
        alert("Please select both date and time.");
        return;
    }

    // Disable the button to prevent multiple clicks
    applyButton.disabled = true;
    applyButton.textContent = "Loading...";

    try {
        const timestamp = new Date(`${selectedDate}T${selectedTime}`).toISOString();
        const filteredOutages = await getOutages(timestamp);

        clearMap(map); // Clear existing markers/polygons
        displayOutages(filteredOutages, map); // Display new data
    } catch (error) {
        console.error("Error fetching or displaying outages:", error);
        alert("An error occurred while fetching outages. Please try again.");
    } finally {
        // Re-enable the button after processing
        applyButton.disabled = false;
        applyButton.textContent = "Apply";
    }
});

    // Handle search bar functionality
    document.getElementById("searchButton").addEventListener("click", async () => {
        const address = document.getElementById("searchInput").value.trim();

        if (!address) {
            alert("Please enter an address.");
            return;
        }

        try {
            const location = await geocodeAddressNominatim(address);
            if (location) {
                // Center the map on the found location
                map.setView([location.lat, location.lng], 14);

                // Add a marker at the searched location
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
                alert("Address not found. Please try a different query.");
            }
        } catch (error) {
            console.error("Error in search functionality:", error);
            alert("An error occurred while searching. Please try again.");
        }
    });
});

