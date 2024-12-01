// components/outageDisplay.js

import { createMarker, clearMap } from "../utils/mapUtils.js";
import { formatTimestamp, formatTimestampWithUserTimeZone } from "../utils/dateUtils.js";

export function displayOutages(outages, map) {
    clearMap(map);

    outages.forEach((outage) => {
        const formattedDateOff = formatTimestamp(outage.date_off, outage.power_company);
        const popupContent = `
            <div>
                <strong>Outage ID:</strong> ${outage.id}<br>
                <strong>Outage Start:</strong> ${formattedDateOff}<br>
            </div>
        `;
        createMarker(outage.latitude, outage.longitude, popupContent, map);
    });
}

