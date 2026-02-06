const express = require("express");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();
app.use(express.json({ limit: "5mb" }));

// Create pdfs directory if it doesn't exist
const PDF_DIR = path.join(__dirname, "pdfs");
if (!fs.existsSync(PDF_DIR)) {
    fs.mkdirSync(PDF_DIR, { recursive: true });
}

// Base URL for generating PDF links - change this to your deployed URL
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

app.get("/", (req, res) => {
    res.send("HTML → PDF service running");
});

// Serve PDFs directly
app.get("/pdf/:filename", (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(PDF_DIR, filename);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "PDF not found" });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    fs.createReadStream(filePath).pipe(res);
});

app.post("/html-to-pdf", async (req, res) => {
    const { html } = req.body;

    if (!html) {
        return res.status(400).json({ error: "HTML is required" });
    }

    try {
        const browser = await puppeteer.launch({
            headless: "new",
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });

        const page = await browser.newPage();

        await page.setContent(html, {
            waitUntil: "networkidle0",
            timeout: 30000,
        });

        const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true,
        });

        await browser.close();

        // Save PDF locally
        const filename = `pdf-${Date.now()}.pdf`;
        const filePath = path.join(PDF_DIR, filename);
        fs.writeFileSync(filePath, pdfBuffer);

        // Return URL to your server's PDF endpoint
        const pdfUrl = `${BASE_URL}/pdf/${filename}`;

        res.json({
            success: true,
            url: pdfUrl,
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "PDF generation failed" });
    }
});

app.listen(3000, () => console.log("Server running on port 3000"));
