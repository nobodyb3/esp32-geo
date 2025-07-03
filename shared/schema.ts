import { pgTable, text, serial, integer, boolean, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const sensorData = pgTable("sensor_data", {
  id: serial("id").primaryKey(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  accuracy: real("accuracy"),
  accelerometerX: real("accelerometer_x").notNull(),
  accelerometerY: real("accelerometer_y").notNull(),
  accelerometerZ: real("accelerometer_z").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const transmissionLogs = pgTable("transmission_logs", {
  id: serial("id").primaryKey(),
  esp32IpAddress: text("esp32_ip_address").notNull(),
  sensorDataId: integer("sensor_data_id").references(() => sensorData.id),
  success: boolean("success").notNull(),
  errorMessage: text("error_message"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertSensorDataSchema = createInsertSchema(sensorData).omit({
  id: true,
  timestamp: true,
});

export const insertTransmissionLogSchema = createInsertSchema(transmissionLogs).omit({
  id: true,
  timestamp: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type SensorData = typeof sensorData.$inferSelect;
export type InsertSensorData = z.infer<typeof insertSensorDataSchema>;
export type TransmissionLog = typeof transmissionLogs.$inferSelect;
export type InsertTransmissionLog = z.infer<typeof insertTransmissionLogSchema>;
