// utils/geometryUtils.js

export function formatPolygonCoords(flatCoords) {
    if (
        Array.isArray(flatCoords) &&
        Array.isArray(flatCoords[0]) &&
        flatCoords[0].length === 2 &&
        typeof flatCoords[0][0] === "number" &&
        typeof flatCoords[0][1] === "number"
    ) {
        return flatCoords;
    }

    const formattedCoords = [];
    for (let i = 0; i < flatCoords.length; i += 2) {
        formattedCoords.push([flatCoords[i + 1], flatCoords[i]]);
    }
    return formattedCoords;
}

