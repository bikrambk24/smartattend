import { checkGpsGeofence } from './gps.service';
import { calculateJaccardSimilarity, checkAnchorNode } from './wifi.service';
import { checkDeviceBinding } from './device.service';
import { validateCheckIn, validateCheckOut } from './session.service';
import {
  checkSharedDevice,
  checkMissingCheckout,
  checkImpossibleTiming,
} from './anomaly.service';

type VerificationOutcome = 'verified' | 'partial' | 'unverified';
type VerificationConfig = 'C0' | 'C1' | 'C2' | 'C3' | 'C4' | 'C5';

interface FingerprintEntry {
  bssid: string;
  avgRssi: number;
}

interface StudentScanEntry {
  bssid: string;
  rssi: number;
}

interface OrchestrateCheckInInput {
  verificationConfig: VerificationConfig;

  studentLat: number;
  studentLng: number;
  geofenceLat: number;
  geofenceLng: number;
  geofenceRadiusMetres: number;
  gpsAccuracyMetres?: number;

  roomFingerprint: FingerprintEntry[];
  studentScan: StudentScanEntry[];
  anchorBssid: string | null;

  incomingDeviceId: string | null;
  boundDeviceId: string | null;

  sessionOpen: boolean;
  hasOpenCheckInAlready: boolean;

  currentStudentId: string;
  deviceOwnerStudentId: string | null;
  roomName: string;
  checkInTimestamp: Date;
  mostRecentPriorCheckIn: { roomName: string; timestamp: Date } | null;
}

interface OrchestrateCheckInResult {
  allowed: boolean;
  verificationOutcome: VerificationOutcome | null;
  flagged: boolean;
  flagReasons: string[];
  newBoundDeviceId: string | null;
  snapshot: Record<string, unknown>;
}

const JACCARD_GOOD_THRESHOLD = 0.5;
const JACCARD_PARTIAL_THRESHOLD = 0.3;

type SignalQuality = 'good' | 'partial' | 'poor';
type GpsQuality = 'inside' | 'uncertain' | 'outside';

function classifyWifiQuality(jaccardScore: number): SignalQuality {
  if (jaccardScore >= JACCARD_GOOD_THRESHOLD) return 'good';
  if (jaccardScore >= JACCARD_PARTIAL_THRESHOLD) return 'partial';
  return 'poor';
}

function combineGpsAndWifi(
  gpsQuality: GpsQuality,
  wifiQuality: SignalQuality,
): VerificationOutcome {
  if (gpsQuality === 'outside') return 'unverified';

  if (wifiQuality === 'poor') return 'unverified';

  if (gpsQuality === 'inside' && wifiQuality === 'good') return 'verified';

  return 'partial';
}

export function orchestrateCheckIn(
  input: OrchestrateCheckInInput,
): OrchestrateCheckInResult {
  const flagReasons: string[] = [];
  const snapshot: Record<string, unknown> = {
    verificationConfig: input.verificationConfig,
  };

  const sessionResult = validateCheckIn(
    input.sessionOpen,
    input.hasOpenCheckInAlready,
  );

  if (!sessionResult.allowed) {
    return {
      allowed: false,
      verificationOutcome: null,
      flagged: false,
      flagReasons: [],
      newBoundDeviceId: null,
      snapshot: { ...snapshot, rejectionReason: sessionResult.outcome },
    };
  }

  let gpsQuality: GpsQuality | null = null;
  if (input.verificationConfig !== 'C1') {
    const gpsResult = checkGpsGeofence({
      studentLat: input.studentLat,
      studentLng: input.studentLng,
      geofenceLat: input.geofenceLat,
      geofenceLng: input.geofenceLng,
      geofenceRadiusMetres: input.geofenceRadiusMetres,
      gpsAccuracyMetres: input.gpsAccuracyMetres,
    });
    gpsQuality = gpsResult.geofenceResult as GpsQuality;
    snapshot.gpsDistanceMetres = gpsResult.distanceMetres;
    snapshot.geofenceResult = gpsResult.geofenceResult;
  }

  let wifiQuality: SignalQuality | null = null;
  if (input.verificationConfig !== 'C0') {
    const jaccardResult = calculateJaccardSimilarity(
      input.roomFingerprint,
      input.studentScan,
    );
    const anchorResult = checkAnchorNode(input.anchorBssid, input.studentScan);

    wifiQuality = classifyWifiQuality(jaccardResult.jaccardScore);
    snapshot.jaccardScore = jaccardResult.jaccardScore;
    snapshot.anchorMatch = anchorResult.anchorMatch;
    snapshot.anchorRssi = anchorResult.anchorRssiSeen;

    if (wifiQuality === 'good' && !anchorResult.anchorMatch) {
      wifiQuality = 'partial';
    }
  }

  let verificationOutcome: VerificationOutcome;

  if (input.verificationConfig === 'C0') {
    verificationOutcome =
      gpsQuality === 'inside'
        ? 'verified'
        : gpsQuality === 'uncertain'
          ? 'partial'
          : 'unverified';
  } else if (input.verificationConfig === 'C1') {
    verificationOutcome =
      wifiQuality === 'good'
        ? 'verified'
        : wifiQuality === 'partial'
          ? 'partial'
          : 'unverified';
  } else {
    verificationOutcome = combineGpsAndWifi(gpsQuality!, wifiQuality!);
  }

  let newBoundDeviceId: string | null = null;

  if (
    input.verificationConfig === 'C3' ||
    input.verificationConfig === 'C4' ||
    input.verificationConfig === 'C5'
  ) {
    const deviceResult = checkDeviceBinding(
      input.incomingDeviceId,
      input.boundDeviceId,
    );
    snapshot.deviceBound = deviceResult.deviceBound;

    if (deviceResult.outcome === 'bound_now') {
      newBoundDeviceId = deviceResult.boundDeviceId;
    }

    if (deviceResult.outcome === 'mismatch') {
      if (verificationOutcome === 'verified') {
        verificationOutcome = 'partial';
      }
      flagReasons.push('Device does not match the bound device for this student');
    }
  }

  if (input.verificationConfig === 'C5') {
    const sharedDeviceResult = checkSharedDevice(
      input.incomingDeviceId,
      input.currentStudentId,
      input.deviceOwnerStudentId,
    );
    if (sharedDeviceResult.flagged && sharedDeviceResult.flagReason) {
      flagReasons.push(sharedDeviceResult.flagReason);
    }

    const timingResult = checkImpossibleTiming(
      { roomName: input.roomName, timestamp: input.checkInTimestamp },
      input.mostRecentPriorCheckIn,
    );
    if (timingResult.flagged && timingResult.flagReason) {
      flagReasons.push(timingResult.flagReason);
    }
  }

  return {
    allowed: true,
    verificationOutcome,
    flagged: flagReasons.length > 0,
    flagReasons,
    newBoundDeviceId,
    snapshot,
  };
}

export function orchestrateCheckOut(
  sessionOpen: boolean,
  hasMatchingOpenCheckIn: boolean,
): {
  allowed: boolean;
  flagged: boolean;
  flagReasons: string[];
} {
  const result = validateCheckOut(sessionOpen, hasMatchingOpenCheckIn);

  return {
    allowed: result.allowed,
    flagged: result.flagged,
    flagReasons: result.flagReason ? [result.flagReason] : [],
  };
}