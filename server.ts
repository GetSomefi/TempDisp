//käynnistä npx ts-node server.ts

import express from "express";
import fetch from "node-fetch";
import { parseStringPromise } from "xml2js";
import path from "path";

const app = express();
const PORT = 3000;

// Palvellaan staattiset tiedostot
app.use(express.static("public"));

interface Weather {
  time?: string;
  temperature?: number;
  windSpeed?: number;
}




function parseWeather(raw: any): Weather {
  const members =
    raw["wfs:FeatureCollection"]?.["wfs:member"] ?? [];

  const weather: Weather = {};

  for (const item of members) {
    const el = item["BsWfs:BsWfsElement"];
    if (!el) continue;

    const name = el["BsWfs:ParameterName"];
    const value = Number(el["BsWfs:ParameterValue"]);
    const time = el["BsWfs:Time"];

    if (!weather.time) {
      weather.time = time;
    }

    // Lämpötila (keskiarvo)
    if (name === "TA_PT1H_AVG") {
      weather.temperature = value;
    }

    // Tuulen nopeus (keskinopeus)
    if (name === "WS_PT10M_AVG") {
      weather.windSpeed = value;
    }
  }

  return weather;
}

async function haeSaa(place: string) {
  const baseUrl = "https://opendata.fmi.fi/wfs?";
  const params = new URLSearchParams({
    service: "WFS",
    version: "2.0.0",
    request: "getFeature",
    storedquery_id: "fmi::observations::weather::hourly::simple",
    place,
  });

  const url = baseUrl + params.toString();
  const response = await fetch(url);
  const xml = await response.text();

  const json = await parseStringPromise(xml, {
    explicitArray: false,
    mergeAttrs: true,
  });

  return json;
}

// API endpoint frontendille
app.get("/api/weather", async (req, res) => {
  try {
    const place = (req.query.place as string) || "Turku";
    const raw = await haeSaa(place);
    const weather = parseWeather(raw);

    res.json(weather);
  } catch {
    res.status(500).json({ error: "Sään haku epäonnistui" });
  }
});

app.listen(PORT, () => {
  console.log(`🌐 Avaa selaimessa: http://localhost:${PORT}`);
});
