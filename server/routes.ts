import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSensorDataSchema, insertTransmissionLogSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Store sensor data
  app.post("/api/sensor-data", async (req, res) => {
    try {
      const validatedData = insertSensorDataSchema.parse(req.body);
      const sensorData = await storage.createSensorData(validatedData);
      res.json(sensorData);
    } catch (error) {
      res.status(400).json({ error: "Invalid sensor data" });
    }
  });

  // Get recent sensor data
  app.get("/api/sensor-data", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const data = await storage.getRecentSensorData(limit);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to retrieve sensor data" });
    }
  });

  // Log transmission attempts
  app.post("/api/transmission-logs", async (req, res) => {
    try {
      const validatedLog = insertTransmissionLogSchema.parse(req.body);
      const log = await storage.createTransmissionLog(validatedLog);
      res.json(log);
    } catch (error) {
      res.status(400).json({ error: "Invalid transmission log" });
    }
  });

  // Get transmission statistics
  app.get("/api/transmission-stats", async (req, res) => {
    try {
      const stats = await storage.getTransmissionStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to retrieve transmission stats" });
    }
  });

  // Test ESP32 connectivity (proxy endpoint)
  app.post("/api/test-esp32", async (req, res) => {
    try {
      const { ipAddress, data } = req.body;
      
      if (!ipAddress || !data) {
        return res.status(400).json({ error: "IP address and data are required" });
      }

      const esp32Url = `http://${ipAddress}/sensor-data`;
      
      const response = await fetch(esp32Url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (response.ok) {
        res.json({ success: true, message: "ESP32 communication successful" });
      } else {
        res.status(response.status).json({ 
          success: false, 
          error: `ESP32 responded with status ${response.status}` 
        });
      }
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to connect to ESP32" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
