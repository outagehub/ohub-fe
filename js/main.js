// main.js

import { setupMap } from "./components/mapInitialization.js";
import { setupEventHandlers } from "./components/eventHandlers.js";
import { setDateTimePickers } from "./utils/domUtils.js";

document.addEventListener("DOMContentLoaded", () => {
    const map = setupMap();
    setDateTimePickers();
    setupEventHandlers(map);
});

