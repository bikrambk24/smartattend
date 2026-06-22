type DeviceCheckOutcome = 'bound_now' | 'match' | 'mismatch';

interface DeviceCheckResult {
  outcome: DeviceCheckOutcome;
  deviceBound: boolean;
  boundDeviceId: string | null;
}

// Trust-on-first-use: if the student has no deviceId bound yet, the
// device used for THIS check-in becomes their bound device. Any
// future check-in from a different device will then be flagged.
//
export function checkDeviceBinding(
  incomingDeviceId: string | null,
  boundDeviceId: string | null,
): DeviceCheckResult {
  if (!incomingDeviceId) {
    return {
      outcome: 'mismatch',
      deviceBound: false,
      boundDeviceId,
    };
  }

  if (!boundDeviceId) {
    return {
      outcome: 'bound_now',
      deviceBound: true,
      boundDeviceId: incomingDeviceId,
    };
  }

  if (incomingDeviceId === boundDeviceId) {
    return {
      outcome: 'match',
      deviceBound: true,
      boundDeviceId,
    };
  }

  return {
    outcome: 'mismatch',
    deviceBound: false,
    boundDeviceId,
  };
}