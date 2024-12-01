// components/eventHandlers.js

import { fetchOutages } from "../utils/apiUtils.js";
import { displayOutages } from "./outageDisplay.js";
import { clearMap } from "../utils/mapUtils.js";

export function setupEventHandlers(map) {
    document.getElementById("applyButton").addEventListener("click", async () => {
        const date = document.getElementById("datePicker").value;
        const time = document.getElementById("timePicker").value;

        if (date && time) {
            const timestamp = new Date(`${date}T${time}`).toISOString();
            const outages = await fetchOutages(timestamp);
            clearMap(map);
            displayOutages(outages, map);
        } else {
            alert("Please select both date and time.");
        }
    });
}

