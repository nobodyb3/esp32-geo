import { useState, useEffect, useCallback } from "react";

export interface GPSData {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
}

export interface AccelerometerData {
  x: number;
  y: number;
  z: number;
  timestamp: number;
}

export interface SensorPermissions {
  gps: 'granted' | 'denied' | 'prompt' | 'unknown';
  motion: 'granted' | 'denied' | 'prompt' | 'unknown';
}

export function useSensors() {
  const [gpsData, setGpsData] = useState<GPSData | null>(null);
  const [accelerometerData, setAccelerometerData] = useState<AccelerometerData | null>(null);
  const [permissions, setPermissions] = useState<SensorPermissions>({
    gps: 'unknown',
    motion: 'unknown'
  });
  const [errors, setErrors] = useState<{ gps?: string; motion?: string }>({});

  const requestGPSPermission = useCallback(async () => {
    try {
      if (!navigator.geolocation) {
        setErrors(prev => ({ ...prev, gps: 'Geolocation not supported' }));
        setPermissions(prev => ({ ...prev, gps: 'denied' }));
        return;
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        });
      });

      setPermissions(prev => ({ ...prev, gps: 'granted' }));
      setErrors(prev => ({ ...prev, gps: undefined }));
      
      return position;
    } catch (error) {
      const errorMessage = error instanceof GeolocationPositionError 
        ? getGeolocationErrorMessage(error.code)
        : 'Failed to get location';
      
      setErrors(prev => ({ ...prev, gps: errorMessage }));
      setPermissions(prev => ({ ...prev, gps: 'denied' }));
    }
  }, []);

  const requestMotionPermission = useCallback(async () => {
    try {
      if (!window.DeviceMotionEvent) {
        setErrors(prev => ({ ...prev, motion: 'Device motion not supported' }));
        setPermissions(prev => ({ ...prev, motion: 'denied' }));
        return;
      }

      // For iOS 13+ devices, request permission
      if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        const permission = await (DeviceMotionEvent as any).requestPermission();
        if (permission === 'granted') {
          setPermissions(prev => ({ ...prev, motion: 'granted' }));
          setErrors(prev => ({ ...prev, motion: undefined }));
        } else {
          setPermissions(prev => ({ ...prev, motion: 'denied' }));
          setErrors(prev => ({ ...prev, motion: 'Motion permission denied' }));
        }
      } else {
        // For other devices, assume permission is granted
        setPermissions(prev => ({ ...prev, motion: 'granted' }));
        setErrors(prev => ({ ...prev, motion: undefined }));
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, motion: 'Failed to request motion permission' }));
      setPermissions(prev => ({ ...prev, motion: 'denied' }));
    }
  }, []);

  const startGPSTracking = useCallback(() => {
    if (permissions.gps !== 'granted') return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setGpsData({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now()
        });
      },
      (error) => {
        setErrors(prev => ({ ...prev, gps: getGeolocationErrorMessage(error.code) }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [permissions.gps]);

  const startAccelerometerTracking = useCallback(() => {
    if (permissions.motion !== 'granted') return;

    const handleMotion = (event: DeviceMotionEvent) => {
      if (event.accelerationIncludingGravity) {
        setAccelerometerData({
          x: event.accelerationIncludingGravity.x || 0,
          y: event.accelerationIncludingGravity.y || 0,
          z: event.accelerationIncludingGravity.z || 0,
          timestamp: Date.now()
        });
      }
    };

    window.addEventListener('devicemotion', handleMotion);
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, [permissions.motion]);

  useEffect(() => {
    // Check initial permissions
    requestGPSPermission();
    requestMotionPermission();
  }, [requestGPSPermission, requestMotionPermission]);

  return {
    gpsData,
    accelerometerData,
    permissions,
    errors,
    requestGPSPermission,
    requestMotionPermission,
    startGPSTracking,
    startAccelerometerTracking
  };
}

function getGeolocationErrorMessage(code: number): string {
  switch (code) {
    case 1:
      return 'Location access denied';
    case 2:
      return 'Location unavailable';
    case 3:
      return 'Location request timeout';
    default:
      return 'Unknown location error';
  }
}
