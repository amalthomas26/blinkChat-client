import { useState, useEffect, useCallback } from "react";

export type PermissionState = "granted" | "denied" | "prompt" | "unknown";

interface DeviceInfo {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

interface MediaDevicesState {
  cameraPermission: PermissionState;
  micPermission: PermissionState;
  cameras: DeviceInfo[];
  microphones: DeviceInfo[];
  speakers: DeviceInfo[];
}

async function queryPermission(
  name: "camera" | "microphone",
): Promise<PermissionState> {
  try {
    // Safari doesn't support permissions.query for camera/mic yet.
    // In that case, we fall back to "unknown" — which means we just
    // try getUserMedia directly and handle errors.
    const result = await navigator.permissions.query({
      name: name as PermissionName,
    });
    return result.state as PermissionState;
  } catch {
    return "unknown";
  }
}

export function useMediaDevices(): MediaDevicesState & {
  refreshDevices: () => Promise<void>;
} {
  const [state, setState] = useState<MediaDevicesState>({
    cameraPermission: "unknown",
    micPermission: "unknown",
    cameras: [],
    microphones: [],
    speakers: [],
  });

  const refreshDevices = useCallback(async () => {
    const [camPerm, micPerm] = await Promise.all([
      queryPermission("camera"),
      queryPermission("microphone"),
    ]);

    let cameras: DeviceInfo[] = [];
    let microphones: DeviceInfo[] = [];
    let speakers: DeviceInfo[] = [];

    // Only enumerate if at least one permission is granted.
    // Otherwise labels will be empty strings.
    if (camPerm === "granted" || micPerm === "granted") {
      const devices = await navigator.mediaDevices.enumerateDevices();

      cameras = devices
        .filter((d) => d.kind === "videoinput")
        .map((d) => ({ deviceId: d.deviceId, label: d.label, kind: d.kind }));

      microphones = devices
        .filter((d) => d.kind === "audioinput")
        .map((d) => ({ deviceId: d.deviceId, label: d.label, kind: d.kind }));

      speakers = devices
        .filter((d) => d.kind === "audiooutput")
        .map((d) => ({ deviceId: d.deviceId, label: d.label, kind: d.kind }));
    }

    setState({
      cameraPermission: camPerm,
      micPermission: micPerm,
      cameras,
      microphones,
      speakers,
    });
  }, []);

  // Initial check on mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshDevices();
  }, [refreshDevices]);

  // Listen for device changes (plug/unplug)
  useEffect(() => {
    const handler = () => {
      refreshDevices();
    };
    navigator.mediaDevices.addEventListener("devicechange", handler);
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", handler);
    };
  }, [refreshDevices]);

  return { ...state, refreshDevices };
}

//useMediaDevices() is a React hook that manages media permissions, detects available cameras/microphones/speakers, listens for hardware changes, and exposes updated device information for a WebRTC calling application.
