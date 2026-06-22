interface SharedDeviceCheckResult {
  flagged: boolean;
  flagReason: string | null;
}

interface MissingCheckoutCheckResult {
  flagged: boolean;
  flagReason: string | null;
}

interface ImpossibleTimingCheckResult {
  flagged: boolean;
  flagReason: string | null;
}

interface PriorCheckIn {
  roomName: string;
  timestamp: Date;
}

const IMPOSSIBLE_TIMING_WINDOW_MINUTES = 5;

export function checkSharedDevice(
  incomingDeviceId: string | null,
  currentStudentId: string,
  deviceOwnerStudentId: string | null,
): SharedDeviceCheckResult {
  if (!incomingDeviceId || !deviceOwnerStudentId) {
    return { flagged: false, flagReason: null };
  }

  if (deviceOwnerStudentId !== currentStudentId) {
    return {
      flagged: true,
      flagReason: `Device is bound to a different student account (${deviceOwnerStudentId})`,
    };
  }

  return { flagged: false, flagReason: null };
}

export function checkMissingCheckout(
  sessionClosed: boolean,
  hasOpenCheckInForClosedSession: boolean,
): MissingCheckoutCheckResult {
  if (sessionClosed && hasOpenCheckInForClosedSession) {
    return {
      flagged: true,
      flagReason: 'Session ended with no matching check-out',
    };
  }

  return { flagged: false, flagReason: null };
}

export function checkImpossibleTiming(
  newCheckIn: PriorCheckIn,
  mostRecentPriorCheckIn: PriorCheckIn | null,
): ImpossibleTimingCheckResult {
  if (!mostRecentPriorCheckIn) {
    return { flagged: false, flagReason: null };
  }

  if (newCheckIn.roomName === mostRecentPriorCheckIn.roomName) {
    return { flagged: false, flagReason: null };
  }

  const minutesElapsed =
    (newCheckIn.timestamp.getTime() -
      mostRecentPriorCheckIn.timestamp.getTime()) /
    (1000 * 60);

  if (minutesElapsed < IMPOSSIBLE_TIMING_WINDOW_MINUTES) {
    return {
      flagged: true,
      flagReason: `Checked into ${newCheckIn.roomName} only ${minutesElapsed.toFixed(
        1,
      )} minutes after checking into ${mostRecentPriorCheckIn.roomName}`,
    };
  }

  return { flagged: false, flagReason: null };
}