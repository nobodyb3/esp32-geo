import { users, sensorData, transmissionLogs, type User, type InsertUser, type SensorData, type InsertSensorData, type TransmissionLog, type InsertTransmissionLog } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createSensorData(data: InsertSensorData): Promise<SensorData>;
  getRecentSensorData(limit: number): Promise<SensorData[]>;
  createTransmissionLog(log: InsertTransmissionLog): Promise<TransmissionLog>;
  getTransmissionStats(): Promise<{
    totalTransmissions: number;
    successfulTransmissions: number;
    successRate: number;
    lastTransmission?: Date;
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private sensorData: Map<number, SensorData>;
  private transmissionLogs: Map<number, TransmissionLog>;
  private currentUserId: number;
  private currentSensorDataId: number;
  private currentTransmissionLogId: number;

  constructor() {
    this.users = new Map();
    this.sensorData = new Map();
    this.transmissionLogs = new Map();
    this.currentUserId = 1;
    this.currentSensorDataId = 1;
    this.currentTransmissionLogId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createSensorData(insertData: InsertSensorData): Promise<SensorData> {
    const id = this.currentSensorDataId++;
    const data: SensorData = { 
      ...insertData, 
      id,
      timestamp: new Date()
    };
    this.sensorData.set(id, data);
    return data;
  }

  async getRecentSensorData(limit: number): Promise<SensorData[]> {
    const allData = Array.from(this.sensorData.values());
    return allData
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async createTransmissionLog(insertLog: InsertTransmissionLog): Promise<TransmissionLog> {
    const id = this.currentTransmissionLogId++;
    const log: TransmissionLog = {
      ...insertLog,
      id,
      timestamp: new Date()
    };
    this.transmissionLogs.set(id, log);
    return log;
  }

  async getTransmissionStats(): Promise<{
    totalTransmissions: number;
    successfulTransmissions: number;
    successRate: number;
    lastTransmission?: Date;
  }> {
    const logs = Array.from(this.transmissionLogs.values());
    const totalTransmissions = logs.length;
    const successfulTransmissions = logs.filter(log => log.success).length;
    const successRate = totalTransmissions > 0 ? (successfulTransmissions / totalTransmissions) * 100 : 0;
    
    const lastTransmission = logs.length > 0 
      ? logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0].timestamp
      : undefined;

    return {
      totalTransmissions,
      successfulTransmissions,
      successRate,
      lastTransmission
    };
  }
}

export const storage = new MemStorage();
