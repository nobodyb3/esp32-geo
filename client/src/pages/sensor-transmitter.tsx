import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useSensors } from "@/hooks/use-sensors";
import { ESP32Client, type ESP32Data } from "@/lib/esp32-client";
import { apiRequest } from "@/lib/queryClient";
import { 
  MapPin, 
  Compass, 
  Wifi, 
  WifiOff, 
  Play, 
  Square, 
  Settings,
  Clock,
  AlertTriangle,
  CheckCircle,
  Network
} from "lucide-react";

export default function SensorTransmitter() {
  const [esp32IpAddress, setEsp32IpAddress] = useState("192.168.1.50");
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [esp32Client, setEsp32Client] = useState<ESP32Client | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [lastTransmission, setLastTransmission] = useState<Date | null>(null);
  const [transmissionStats, setTransmissionStats] = useState({
    totalTransmissions: 0,
    successfulTransmissions: 0,
    successRate: 0
  });
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [nextTransmission, setNextTransmission] = useState<Date | null>(null);

  const {
    gpsData,
    accelerometerData,
    permissions,
    errors,
    requestGPSPermission,
    requestMotionPermission,
    startGPSTracking,
    startAccelerometerTracking
  } = useSensors();

  useEffect(() => {
    setEsp32Client(new ESP32Client(esp32IpAddress));
  }, [esp32IpAddress]);

  useEffect(() => {
    let gpsCleanup: (() => void) | undefined;
    let motionCleanup: (() => void) | undefined;

    if (isTransmitting) {
      gpsCleanup = startGPSTracking();
      motionCleanup = startAccelerometerTracking();
    }

    return () => {
      if (gpsCleanup) gpsCleanup();
      if (motionCleanup) motionCleanup();
    };
  }, [isTransmitting, startGPSTracking, startAccelerometerTracking]);

  const showStatusMessage = useCallback((type: 'success' | 'error', message: string) => {
    setStatusMessage({ type, message });
    setTimeout(() => setStatusMessage(null), 5000);
  }, []);

  const sendDataToESP32 = useCallback(async () => {
    if (!esp32Client || !gpsData || !accelerometerData) return;

    const data: ESP32Data = {
      gps: {
        latitude: gpsData.latitude,
        longitude: gpsData.longitude,
        accuracy: gpsData.accuracy
      },
      accelerometer: {
        x: accelerometerData.x,
        y: accelerometerData.y,
        z: accelerometerData.z
      },
      timestamp: Date.now()
    };

    try {
      setConnectionStatus('connecting');
      const result = await esp32Client.sendData(data);
      
      if (result.success) {
        setConnectionStatus('connected');
        setLastTransmission(new Date());
        showStatusMessage('success', 'Data transmitted successfully');
      } else {
        setConnectionStatus('disconnected');
        showStatusMessage('error', result.error || 'Failed to transmit data');
      }

      // Store sensor data and log transmission
      try {
        await apiRequest('POST', '/api/sensor-data', {
          latitude: gpsData.latitude,
          longitude: gpsData.longitude,
          accuracy: gpsData.accuracy,
          accelerometerX: accelerometerData.x,
          accelerometerY: accelerometerData.y,
          accelerometerZ: accelerometerData.z
        });

        await apiRequest('POST', '/api/transmission-logs', {
          esp32IpAddress,
          success: result.success,
          errorMessage: result.error
        });
      } catch (error) {
        console.error('Failed to log transmission:', error);
      }

      // Update transmission stats
      setTransmissionStats(prev => ({
        totalTransmissions: prev.totalTransmissions + 1,
        successfulTransmissions: prev.successfulTransmissions + (result.success ? 1 : 0),
        successRate: ((prev.successfulTransmissions + (result.success ? 1 : 0)) / (prev.totalTransmissions + 1)) * 100
      }));

    } catch (error) {
      setConnectionStatus('disconnected');
      showStatusMessage('error', 'Network error occurred');
    }
  }, [esp32Client, gpsData, accelerometerData, esp32IpAddress, showStatusMessage]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isTransmitting && gpsData && accelerometerData) {
      // Send immediately
      sendDataToESP32();
      
      // Set up interval for every 2 seconds
      interval = setInterval(() => {
        sendDataToESP32();
        setNextTransmission(new Date(Date.now() + 2000));
      }, 2000);

      // Update next transmission time
      setNextTransmission(new Date(Date.now() + 2000));
    }

    return () => {
      if (interval) clearInterval(interval);
      setNextTransmission(null);
    };
  }, [isTransmitting, gpsData, accelerometerData, sendDataToESP32]);

  const toggleTransmission = async () => {
    if (!isTransmitting) {
      // Check permissions before starting
      if (permissions.gps !== 'granted') {
        await requestGPSPermission();
      }
      if (permissions.motion !== 'granted') {
        await requestMotionPermission();
      }
      
      if (permissions.gps === 'granted' && permissions.motion === 'granted') {
        setIsTransmitting(true);
        showStatusMessage('success', 'Transmission started');
      } else {
        showStatusMessage('error', 'Sensor permissions required');
      }
    } else {
      setIsTransmitting(false);
      setConnectionStatus('disconnected');
      showStatusMessage('success', 'Transmission stopped');
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500 animate-pulse';
      case 'disconnected': return 'bg-red-500 animate-pulse';
      default: return 'bg-gray-500';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting';
      case 'disconnected': return 'Disconnected';
      default: return 'Unknown';
    }
  };

  return (
    <div className="max-w-sm mx-auto bg-surface min-h-screen shadow-2xl relative overflow-hidden">
      {/* Status Bar */}
      <div className="bg-gray-900 text-white text-xs px-4 py-1 flex justify-between items-center">
        <span>{new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
        <div className="flex items-center space-x-1">
          <Wifi className="h-3 w-3" />
        </div>
      </div>

      {/* Header */}
      <div className="bg-primary text-white px-4 py-6 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-medium">Sensor Transmitter</h1>
            <p className="text-blue-100 text-sm opacity-90">ESP32 Data Logger</p>
          </div>
          <div className="text-right">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${getConnectionStatusColor()}`} />
              <span className="text-sm">{getConnectionStatusText()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* IP Configuration */}
      <div className="p-4 bg-surface border-b border-gray-200">
        <div className="bg-gray-50 rounded-lg p-4">
          <Label htmlFor="esp32-ip" className="text-sm font-medium text-secondary mb-2 flex items-center">
            <Network className="h-4 w-4 mr-2" />
            ESP32 IP Address
          </Label>
          <Input
            id="esp32-ip"
            type="text"
            value={esp32IpAddress}
            onChange={(e) => setEsp32IpAddress(e.target.value)}
            placeholder="192.168.1.50"
            className="text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">Enter the IP address of your ESP32 device</p>
        </div>
      </div>

      {/* Control Section */}
      <div className="p-4 bg-surface border-b border-gray-200">
        <div className="flex justify-center">
          <Button 
            onClick={toggleTransmission}
            className={`${isTransmitting ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white font-medium py-3 px-8 rounded-full shadow-lg flex items-center space-x-2 transition-colors duration-200`}
          >
            {isTransmitting ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            <span>{isTransmitting ? 'Stop' : 'Start'} Transmission</span>
          </Button>
        </div>
        <div className="text-center mt-2">
          <p className="text-xs text-gray-500">
            Data will be sent every 2 seconds
          </p>
        </div>
      </div>

      {/* Status Messages */}
      {statusMessage && (
        <div className="p-4">
          <Alert className={statusMessage.type === 'error' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}>
            <div className="flex items-center">
              {statusMessage.type === 'error' ? (
                <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
              )}
              <AlertDescription className={statusMessage.type === 'error' ? 'text-red-700' : 'text-green-700'}>
                {statusMessage.message}
              </AlertDescription>
            </div>
          </Alert>
        </div>
      )}

      {/* Permission Errors */}
      {(errors.gps || errors.motion) && (
        <div className="p-4">
          <Alert className="bg-red-50 border-red-200">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <AlertDescription className="text-red-700">
              {errors.gps && <div>GPS: {errors.gps}</div>}
              {errors.motion && <div>Motion: {errors.motion}</div>}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Sensor Data Display */}
      <div className="p-4 space-y-4">
        {/* GPS Data */}
        <Card className="bg-surface border border-gray-200 shadow-sm">
          <CardHeader className="bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2 text-secondary">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="font-medium">GPS Location</span>
              </CardTitle>
              <div className="text-xs text-gray-500 flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                <span>{gpsData ? 'Just now' : 'No data'}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium text-gray-500 mb-1">Latitude</Label>
                <div className="bg-gray-50 rounded px-3 py-2">
                  <span className="text-sm font-mono">
                    {gpsData ? gpsData.latitude.toFixed(6) : '--'}
                  </span>
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-500 mb-1">Longitude</Label>
                <div className="bg-gray-50 rounded px-3 py-2">
                  <span className="text-sm font-mono">
                    {gpsData ? gpsData.longitude.toFixed(6) : '--'}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-3">
              <Label className="text-xs font-medium text-gray-500 mb-1">Accuracy</Label>
              <div className="bg-gray-50 rounded px-3 py-2">
                <span className="text-sm font-mono">
                  {gpsData?.accuracy ? `±${gpsData.accuracy.toFixed(1)} meters` : '--'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Accelerometer Data */}
        <Card className="bg-surface border border-gray-200 shadow-sm">
          <CardHeader className="bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2 text-secondary">
                <Compass className="h-4 w-4 text-primary" />
                <span className="font-medium">Accelerometer</span>
              </CardTitle>
              <div className="text-xs text-gray-500 flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                <span>{accelerometerData ? 'Just now' : 'No data'}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <Label className="text-xs font-medium text-gray-500 mb-2">X-Axis</Label>
                <div className="bg-red-50 rounded-lg py-3">
                  <span className="text-lg font-mono font-medium text-red-600">
                    {accelerometerData ? accelerometerData.x.toFixed(2) : '--'}
                  </span>
                  <div className="text-xs text-gray-500 mt-1">m/s²</div>
                </div>
              </div>
              <div className="text-center">
                <Label className="text-xs font-medium text-gray-500 mb-2">Y-Axis</Label>
                <div className="bg-green-50 rounded-lg py-3">
                  <span className="text-lg font-mono font-medium text-green-600">
                    {accelerometerData ? accelerometerData.y.toFixed(2) : '--'}
                  </span>
                  <div className="text-xs text-gray-500 mt-1">m/s²</div>
                </div>
              </div>
              <div className="text-center">
                <Label className="text-xs font-medium text-gray-500 mb-2">Z-Axis</Label>
                <div className="bg-blue-50 rounded-lg py-3">
                  <span className="text-lg font-mono font-medium text-blue-600">
                    {accelerometerData ? accelerometerData.z.toFixed(2) : '--'}
                  </span>
                  <div className="text-xs text-gray-500 mt-1">m/s²</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transmission Status */}
        <Card className="bg-surface border border-gray-200 shadow-sm">
          <CardHeader className="bg-gray-50 border-b border-gray-200">
            <CardTitle className="flex items-center space-x-2 text-secondary">
              <Settings className="h-4 w-4 text-primary" />
              <span className="font-medium">Transmission Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Last Transmission</span>
                <span className="text-sm font-mono text-gray-500">
                  {lastTransmission ? lastTransmission.toLocaleTimeString() : '--:--:--'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Success Rate</span>
                <span className="text-sm font-mono text-gray-500">
                  {transmissionStats.successfulTransmissions}/{transmissionStats.totalTransmissions} ({transmissionStats.successRate.toFixed(1)}%)
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Next Transmission</span>
                <span className="text-sm font-mono text-gray-500">
                  {nextTransmission && isTransmitting ? 
                    `${Math.max(0, Math.ceil((nextTransmission.getTime() - Date.now()) / 1000))}s` : 
                    'Not scheduled'
                  }
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Safe Area */}
      <div className="h-6 bg-surface"></div>
    </div>
  );
}
