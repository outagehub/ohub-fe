// utils/apiUtils.js

export async function fetchOutages(timestamp = null) {
    const queryParam = timestamp ? `?timestamp=${encodeURIComponent(timestamp)}` : "";
    try {
        const response = await fetch(`/outages${queryParam}`);
        return response.json();
    } catch (error) {
        console.error("Error fetching outage data:", error);
        return [];
    }
}

export async function geocodeAddressNominatim(address) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.length > 0) {
            return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        } else {
            throw new Error("Address not found");
        }
    } catch (error) {
        console.error("Geocoding error:", error);
        throw error;
    }
}

