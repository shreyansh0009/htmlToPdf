const express = require("express");
const puppeteer = require("puppeteer");
const cloudinary = require("cloudinary").v2;
require("dotenv").config();

const app = express();
app.use(express.json({ limit: "5mb" }));

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

app.get("/", (req, res) => {
  res.send("HTML → PDF service running");
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

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: "raw",
          folder: "generated-pdfs",
          public_id: `pdf-${Date.now()}`,
          format: "pdf",
          content_type: "application/pdf"
        },
        (err, result) => {
          if (err) reject(err);
          else resolve(result);
        }
      );
      stream.end(pdfBuffer);
    });

    res.json({
      success: true,
      url: result.secure_url,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "PDF generation failed" });
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));
