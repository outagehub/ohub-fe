const express = require("express");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

// Function to pre-render the HTML and save it to a file
async function preRender() {
    try {
        console.log("Starting pre-rendering...");
        const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
        const page = await browser.newPage();

        // Point Puppeteer to your raw HTML
        await page.goto("http://localhost:3000/raw", { waitUntil: "networkidle0" });

        // Get the fully rendered HTML
        const content = await page.content();

        // Save the rendered HTML to a file in the "dist" folder
        const outputPath = path.join(__dirname, "dist", "index.html");
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        fs.writeFileSync(outputPath, content);

        console.log("Pre-rendering completed. Output saved to:", outputPath);
        await browser.close();
    } catch (error) {
        console.error("Error during pre-rendering:", error);
        process.exit(1);
    }
}

// Start the server to serve the pre-rendered static files
async function startServer() {
    // Ensure pre-rendering is complete before starting the server
    await preRender();

    // Serve the pre-rendered static files
    app.use(express.static(path.join(__dirname, "dist")));

    // Start the Express server
    app.listen(PORT, () => {
        console.log(`Static server running at http://localhost:${PORT}`);
    });
}

// Run the server
startServer();

