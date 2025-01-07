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
        ["Quebec Hydro", "Hydro Ottawa", "Manitoba Hydro", "Algoma Power", "EPCOR Ontario", 
        "Equs Alberta", "FortisBC", "Hydro Ottawa", "ENMAX Calgary", "Hydro One", "Elexicon Energy", "Toronto Hydro"].includes(powerCompany)
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
        zoomControl: false, // Disable default zoom control position
    }).setView([62, -96.8], 4);

    // Add the tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap contributors",
    }).addTo(map);

    // Add zoom control on the top-right
    L.control.zoom({
        position: "topright", // Position the zoom controls in the top-right
    }).addTo(map);

    // Adjust zoom control placement (CSS for margin)
    const zoomControl = document.querySelector(".leaflet-control-zoom");
    zoomControl.style.marginTop = "80px"; // Add spacing to move below the Donate button

    const currentRightMargin = parseInt(window.getComputedStyle(zoomControl).marginRight) || 0;
    zoomControl.style.marginRight = `${currentRightMargin * 2}px`; // Double the current right margin

    return map;
}

function clearMap(map) {
    // Remove all layers except the base tile layer
    map.eachLayer((layer) => {
        if (!(layer instanceof L.TileLayer)) {
            map.removeLayer(layer);
        }
    });
}

function displayOutages(outages, map) {
    // Clear all existing layers
    clearMap(map);

    const bluePinIcon = new L.Icon({
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        shadowSize: [41, 41],
        shadowAnchor: [12, 41],
    });

    // Create a MarkerClusterGroup for efficient marker management
    const markers = L.markerClusterGroup();

    // Loop through all outages and add markers and polygons to the map
    outages.forEach((outage) => {
        // Debug: Check if Hydro One data is present
        if (outage.power_company === "Hydro One") {
            console.log("Hydro One Outage Data:", outage);
        }

        // Handle coordinate swapping for Hydro One
        if (outage.power_company === "Hydro One" || outage.power_company === "Hydro Ottawa") {
            const temp = outage.latitude;
            outage.latitude = outage.longitude;
            outage.longitude = temp;
            console.log(`Hydro One Coordinates After Swap: Lat=${outage.latitude}, Lng=${outage.longitude}`);
        }

        // Ensure valid coordinates
        if (
            !outage.latitude ||
            !outage.longitude ||
            typeof outage.latitude !== "number" ||
            typeof outage.longitude !== "number"
        ) {
            console.warn(`Invalid coordinates for outage ID ${outage.id}`);
            return;
        }

        const popupContent = `
            <div style="font-size: 14px; line-height: 1.5;">
                <strong>Outage ID:</strong> ${outage.id}<br>
                <strong>Municipality:</strong> ${outage.municipality || "N/A"}<br>
                <strong>Area:</strong> ${outage.area || "N/A"}<br>
                <strong>Cause:</strong> ${outage.cause || "Unknown"}<br>
                <strong>Customers Affected:</strong> ${outage.num_customers || "N/A"}<br>
                <strong>Crew Status:</strong> ${outage.crew_status || "N/A"}<br>
                <strong>Outage Start:</strong> ${formatTimestamp(outage.date_off, outage.power_company)}<br>
                <strong>Estimated Restore:</strong> ${formatTimestamp(outage.crew_eta, outage.power_company)}<br>
                <strong>Timestamp Added:</strong> ${formatTimestampWithUserTimeZone(outage.time_stamp)}<br>
                <em>Power Company: ${outage.power_company || "Unknown Company"}</em>
            </div>
        `;

        const marker = L.marker([outage.latitude, outage.longitude], { icon: bluePinIcon })
            .bindPopup(popupContent);

        markers.addLayer(marker);

        // Add polygons if they exist
        if (
            outage.power_company !== "Hydro One" && outage.power_company !== "Hydro Ottawa" &&
            Array.isArray(outage.polygon) &&
            outage.polygon.length > 0
        ) {
            const polygonCoords = formatPolygonCoords(outage.polygon);

            if (polygonCoords.length > 2) {
                const polygon = L.polygon(polygonCoords, {
                    color: "red",
                    weight: 2,
                    fillOpacity: 0.3,
                }).bindPopup(popupContent);

                polygon.addTo(map);
            }
        }
    });

    // Add the MarkerClusterGroup to the map
    map.addLayer(markers);

    console.log(`Displayed ${outages.length} outages on the map.`);
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

function displayOutages(outages, map) {
    // Clear all existing layers
    clearMap(map);

    const bluePinIcon = new L.Icon({
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        shadowSize: [41, 41],
        shadowAnchor: [12, 41],
    });

    // Create a MarkerClusterGroup for efficient marker management
    const markers = L.markerClusterGroup();

    // Loop through all outages and add markers and polygons to the map
    outages.forEach((outage) => {
        // Debug: Check if Hydro One data is present
        if (outage.power_company === "Hydro One") {
            console.log("Hydro One Outage Data:", outage);
        }

        // Handle coordinate swapping for Hydro One
        if (outage.power_company === "Hydro One" || outage.power_company === "Hydro Ottawa") {
            const temp = outage.latitude;
            outage.latitude = outage.longitude;
            outage.longitude = temp;
            console.log(`Hydro One Coordinates After Swap: Lat=${outage.latitude}, Lng=${outage.longitude}`);
        }

        // Ensure valid coordinates
        if (
            !outage.latitude ||
            !outage.longitude ||
            typeof outage.latitude !== "number" ||
            typeof outage.longitude !== "number"
        ) {
            console.warn(`Invalid coordinates for outage ID ${outage.id}`);
            return;
        }

        const popupContent = `
            <div style="font-size: 14px; line-height: 1.5;">
                <strong>Outage ID:</strong> ${outage.id}<br>
                <strong>Municipality:</strong> ${outage.municipality || "N/A"}<br>
                <strong>Area:</strong> ${outage.area || "N/A"}<br>
                <strong>Cause:</strong> ${outage.cause || "Unknown"}<br>
                <strong>Customers Affected:</strong> ${outage.num_customers || "N/A"}<br>
                <strong>Crew Status:</strong> ${outage.crew_status || "N/A"}<br>
                <strong>Outage Start:</strong> ${formatTimestamp(outage.date_off, outage.power_company)}<br>
                <strong>Estimated Restore:</strong> ${formatTimestamp(outage.crew_eta, outage.power_company)}<br>
                <strong>Timestamp Added:</strong> ${formatTimestampWithUserTimeZone(outage.time_stamp)}<br>
                <em>Power Company: ${outage.power_company || "Unknown Company"}</em>
            </div>
        `;

        const marker = L.marker([outage.latitude, outage.longitude], { icon: bluePinIcon })
            .bindPopup(popupContent);

        markers.addLayer(marker);

        // Add polygons if they exist
        if (
            outage.power_company !== "Hydro One" && outage.power_company !== "Hydro Ottawa" &&
            Array.isArray(outage.polygon) &&
            outage.polygon.length > 0
        ) {
            const polygonCoords = formatPolygonCoords(outage.polygon);

            if (polygonCoords.length > 2) {
                const polygon = L.polygon(polygonCoords, {
                    color: "red",
                    weight: 2,
                    fillOpacity: 0.3,
                }).bindPopup(popupContent);

                polygon.addTo(map);
            }
        }
    });

    // Add the MarkerClusterGroup to the map
    map.addLayer(markers);

    console.log(`Displayed ${outages.length} outages on the map.`);
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
        color: "#FFD700",
        weight: 2,
        fillOpacity: 0.3,
    };

    // Array to store the added layers
    const weatherAlertLayers = [];

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

                        // Add the polygon layer to the array
                        weatherAlertLayers.push(polygonLayer);

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

    // Return the array of layers
    return weatherAlertLayers;
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

console.log("JavaScript file loaded");

document.addEventListener("DOMContentLoaded", async () => {
    console.log("DOMContentLoaded triggered");

    // Map initialization
    let map;
    try {
        map = initializeMap();
        console.log("Map initialized:", map);
    } catch (error) {
        console.error("Error initializing map:", error);
        return; // Stop execution if map fails to initialize
    }

    // Fetch and display outages immediately on page load
    (async () => {
        try {
            const outages = await fetchPreloadedOutages();
            displayOutages(outages, map);
        } catch (error) {
            console.error("Error loading preloaded outages:", error);
        }
    })();

const searchForm = document.getElementById("searchForm"); // Add form wrapper

const handleSearch = async () => {
    console.log("Search initiated");
    const address = document.getElementById("searchInput").value.trim();
    console.log("Entered address:", address);

    if (!address) {
        alert("Please enter an address.");
        return;
    }

    try {
        const location = await geocodeAddressNominatim(address);
        console.log("Geocoded location:", location);

        if (location) {
            // Center the map on the found location
            map.setView([location.lat, location.lng], 14);
            console.log("Map centered on:", location);

            console.log("Marker added to map");
        } else {
            alert("Address not found. Please try a different query.");
            console.warn("Address not found for:", address);
        }
    } catch (error) {
        console.error("Error in search functionality:", error);
        alert("An error occurred while searching. Please try again.");
    }
};

// Add event listener for form submission (Enter key)
searchForm.addEventListener("submit", (event) => {
    event.preventDefault(); // Prevent form submission
    handleSearch();
});

    // Apply button functionality
    /*
	const applyButton = document.getElementById("applyButton");
    if (!applyButton) {
        console.error("Apply Button not found in DOM.");
    } else {
        console.log("Apply Button found:", applyButton);

        applyButton.addEventListener("click", async () => {
            console.log("Apply button clicked");
            const selectedDate = document.getElementById("datePicker").value;
            const selectedTime = document.getElementById("timePicker").value;
            console.log("Selected Date:", selectedDate, "Selected Time:", selectedTime);

            if (!selectedDate || !selectedTime) {
                alert("Please select both date and time.");
                return;
            }

            applyButton.disabled = true;
            applyButton.textContent = "Loading...";
            console.log("Apply button disabled");

            try {
                const timestamp = new Date(`${selectedDate}T${selectedTime}`).toISOString();
                console.log("Formatted timestamp:", timestamp);

                const filteredOutages = await getOutages(timestamp);
                console.log("Filtered outages:", filteredOutages);

                clearMap(map); // Clear existing markers/polygons
                displayOutages(filteredOutages, map); // Display new data
                console.log("Filtered outages displayed on map");
            } catch (error) {
                console.error("Error fetching or displaying outages:", error);
                alert("An error occurred while fetching outages. Please try again.");
            } finally {
                applyButton.disabled = false;
                applyButton.textContent = "Apply";
                console.log("Apply button re-enabled");
            }
        });
    }
    */
console.log("JavaScript file loaded");
  console.log("DOMContentLoaded triggered");

// Get the button and spinner elements
const pikadayButton = document.getElementById("pikadayButton");
const spinner = document.getElementById("loadingSpinner");

// Ensure the elements exist
if (!pikadayButton || !spinner) {
  console.error("Required elements are missing in the HTML.");
  throw new Error("Initialization failed: Missing elements in the HTML.");
}

console.log("Elements found:", pikadayButton, spinner);

// Calculate current time and time 24 hours ago
const currentDateTime = new Date(); // Current date and time
const oneDayAgo = new Date(currentDateTime.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
let date = currentDateTime; // Initialize `date` with the current time

console.log("Current Date:", currentDateTime);
console.log("One Day Ago:", oneDayAgo);

// Format date for display
const formatForDisplay = (date) => {
  console.log("Formatting date:", date);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

// Update the button text and data-timestamp attribute
const updateButtonDisplay = (date) => {
  pikadayButton.textContent = formatForDisplay(date); // Update displayed text
  pikadayButton.setAttribute("data-timestamp", date.toISOString()); // Store ISO timestamp
  console.log("Button updated with date:", date);
};

window.picker = new Pikaday({
  field: pikadayButton, // Attach directly to the button
  format: "MMM D, YYYY h:mm A", // Custom display format
  minDate: oneDayAgo, // Minimum selectable date
  maxDate: currentDateTime, // Maximum selectable date
  showTime: true, // Enable time selection (requires Pikaday-Time plugin)
  use24hour: false, // Use AM/PM time format
  incrementHourBy: 1, // Increment hours by 1
  incrementMinuteBy: 5, // Increment minutes by 5
  defaultDate: currentDateTime, // Default to current time
  setDefaultDate: true, // Preload default date
    autoClose: false, // Close picker automatically after selection

	onDraw: function () {
    // Ensure the time picker is displayed properly
    const timePickerElement = document.querySelector(".pika-timepicker");
    if (timePickerElement) {
      timePickerElement.style.display = "block";
      timePickerElement.style.visibility = "visible";
    }
  },
  onSelect: async function (selectedDate) {
    console.log("Selected Date/Time:", selectedDate);

    // Update the global `date` variable
    date = selectedDate;

    // Validate the selected time
    if (date > currentDateTime || date < oneDayAgo) {
      alert("Please select a time within the last 24 hours.");
      return;
    }

    // Update the button display
    updateButtonDisplay(date);
picker.hide();
    // Show spinner during fetch
    spinner.style.display = "inline-block";

try {
  const response = await fetch(
    `/slide_outages?timestamp=${encodeURIComponent(date.toISOString())}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch outages: ${response.statusText}`);
  }

  const data = await response.json();

  // Log the raw response from the backend
  console.log("Raw data fetched from backend:", data);

  if (data.error) {
    console.error(`API Error: ${data.error}`);
    return;
  }

	const outages = Array.isArray(data) ? data : data.outages || [];

  console.log(`Parsed outages array:`, outages);
  console.log(`Fetched ${outages.length} outages for ${date}`);

  // Clear and update the map
  clearMap(map);
  displayOutages(outages, map);
} catch (error) {
  console.error(`Error fetching outages: ${error}`);
} finally {
  // Hide spinner after fetch completes
  spinner.style.display = "none";
}
},
});

// Ensure the picker works on button click
pikadayButton.addEventListener("click", () => {
  picker.show(); // Manually show the picker
  console.log("Pikaday picker shown.");
});

// Set the initial display to the current date/time
updateButtonDisplay(currentDateTime);

console.log("Pikaday initialized and button updated");

// Button and Loading Elements
    const weatherAlertButton = document.getElementById("weatherAlertButton");
    let weatherAlertsVisible = false;
    let weatherAlertLayers = []; // Store the layers for weather alerts
    // Handle weather alerts button click
    weatherAlertButton.addEventListener("click", async () => {
        // If weather alerts are visible, remove them and toggle state
        if (weatherAlertsVisible) {
            weatherAlertLayers.forEach(layer => map.removeLayer(layer)); // Remove layers from map
            weatherAlertLayers = []; // Clear layers array
            weatherAlertsVisible = false; // Set visibility to false
            return; // Exit early
        }

        // Show loading message

        try {
            // Simulate lag effect before displaying weather alerts

            // Fetch and display weather alerts
            const layers = await displayWeatherAlerts(map);
            weatherAlertLayers = layers; // Store displayed layers
            weatherAlertsVisible = true; // Set visibility to true
        } catch (error) {
            console.error("Error loading weather alerts:", error);
        } finally {
            // Hide loading message and re-enable button
            weatherAlertButton.disabled = false;
        }
    });

    // Fetch preloaded outages
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
});

