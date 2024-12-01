// utils/domUtils.js

export function setDateTimePickers() {
    const now = new Date();
    document.getElementById("datePicker").value = now.toISOString().split("T")[0];
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    document.getElementById("timePicker").value = `${hours}:${minutes}`;
}

