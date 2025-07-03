import { apiRequest } from "./queryClient";

export interface ESP32Data {
  gps: {
    latitude: number;
    longitude: number;
    accuracy: number | null;
  };
  accelerometer: {
    x: number;
    y: number;
    z: number;
  };
  timestamp: number;
}

export class ESP32Client {
  private ipAddress: string;

  constructor(ipAddress: string) {
    this.ipAddress = ipAddress;
  }

  updateIPAddress(ipAddress: string) {
    this.ipAddress = ipAddress;
  }

  async sendData(data: ESP32Data): Promise<{ success: boolean; error?: string }> {
    try {
      // First, try to send directly to ESP32
      const esp32Url = `http://${this.ipAddress}/sensor-data`;
      
      const response = await fetch(esp32Url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (response.ok) {
        return { success: true };
      } else {
        throw new Error(`ESP32 responded with status ${response.status}`);
      }
    } catch (error) {
      // If direct connection fails, try through our proxy
      try {
        const response = await apiRequest('POST', '/api/test-esp32', {
          ipAddress: this.ipAddress,
          data: data
        });

        const result = await response.json();
        return { success: result.success, error: result.error };
      } catch (proxyError) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to connect to ESP32';
        return { 
          success: false, 
          error: errorMessage.includes('CORS') 
            ? 'CORS error - ESP32 may not allow browser requests' 
            : errorMessage 
        };
      }
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    const testData: ESP32Data = {
      gps: { latitude: 0, longitude: 0, accuracy: null },
      accelerometer: { x: 0, y: 0, z: 0 },
      timestamp: Date.now()
    };

    return this.sendData(testData);
  }
}
