import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Gemini Briefing Endpoint
app.post("/api/briefing", async (req, res) => {
  try {
    const { gameState } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
    }

    const ai = new GoogleGenAI({ 
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const prompt = `
      You are a Senior Combat Systems Engineer and Simulation Architect. 
      Analyze the following medieval military simulation state and provide a tactical briefing.
      
      State:
      ${JSON.stringify(gameState, null, 2)}
      
      Output strictly in JSON format with these exact fields:
      - analysis: A high-level overview string of the conflict.
      - resourceDistribution: A string analyzing which factions are wealthy vs poor.
      - tacticalAdvice: A string with concrete advice for the general.
      
      Do not use nested objects for these fields; provide descriptive strings.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    const responseText = response.text || "";
    
    // Clean JSON response (handled carefully in case model adds markdown blocks)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    let briefing = jsonMatch ? JSON.parse(jsonMatch[0]) : { analysis: responseText };

    // Standardize fields to strings if the model ignored instructions
    if (typeof briefing.analysis === 'object') briefing.analysis = JSON.stringify(briefing.analysis);
    if (typeof briefing.resourceDistribution === 'object') briefing.resourceDistribution = JSON.stringify(briefing.resourceDistribution);
    if (typeof briefing.tacticalAdvice === 'object') briefing.tacticalAdvice = JSON.stringify(briefing.tacticalAdvice);
    
    // Fallbacks for missing fields
    briefing.analysis = briefing.analysis || "No analysis available.";
    briefing.resourceDistribution = briefing.resourceDistribution || "No logistics data.";
    briefing.tacticalAdvice = briefing.tacticalAdvice || "No tactical advice.";

    res.json(briefing);
  } catch (error: any) {
    console.error("Gemini Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Google Drive Export Endpoint
app.post("/api/drive/export", async (req, res) => {
  try {
    const { data, filename, mimeType, accessToken } = req.body;
    
    if (!accessToken) {
      return res.status(401).json({ error: "OAuth Access Token missing" });
    }

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    const drive = google.drive({ version: "v3", auth });

    const fileMetadata = {
      name: filename,
    };
    const media = {
      mimeType: mimeType,
      body: typeof data === "string" ? data : JSON.stringify(data, null, 2),
    };

    const file = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: "id",
    });

    res.json({ fileId: file.data.id });
  } catch (error: any) {
    console.error("Drive Error:", error);
    res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
