interface FingerprintEntry {
  bssid: string;
  avgRssi: number;
}

interface StudentScanEntry {
  bssid: string;
  rssi: number;
}

interface JaccardResult {
  jaccardScore: number;
  matchedBssids: string[];
}

interface AnchorCheckResult {
  anchorMatch: boolean;
  anchorRssiSeen: number | null;
}

const ANCHOR_MIN_STRENGTH_DBM = -75;

// Jaccard Similarity Index: overlap of student's scanned BSSIDs vs
// the room's saved fingerprint, as a fraction of the union of both sets.
// 1.0 = identical sets, 0.0 = no overlap at all.
export function calculateJaccardSimilarity(
  roomFingerprint: FingerprintEntry[],
  studentScan: StudentScanEntry[],
): JaccardResult {
  const roomBssids = new Set(roomFingerprint.map((entry) => entry.bssid));
  const studentBssids = new Set(studentScan.map((entry) => entry.bssid));

  const matchedBssids = [...roomBssids].filter((bssid) =>
    studentBssids.has(bssid),
  );

  const unionSize = new Set([...roomBssids, ...studentBssids]).size;

  if (unionSize === 0) {
    return { jaccardScore: 0, matchedBssids: [] };
  }

  const jaccardScore = matchedBssids.length / unionSize;

  return { jaccardScore, matchedBssids };
}

// Anchor node check: is the room's strongest-signal BSSID visible in the
// student's scan, and at sufficient strength? Adjacent rooms may share
// some BSSIDs from mesh networks, but the anchor will read much weaker
// through walls than it does inside the actual room.
export function checkAnchorNode(
  anchorBssid: string | null,
  studentScan: StudentScanEntry[],
): AnchorCheckResult {
  if (!anchorBssid) {
    return { anchorMatch: false, anchorRssiSeen: null };
  }

  const seenEntry = studentScan.find((entry) => entry.bssid === anchorBssid);

  if (!seenEntry) {
    return { anchorMatch: false, anchorRssiSeen: null };
  }

  const anchorMatch = seenEntry.rssi >= ANCHOR_MIN_STRENGTH_DBM;

  return { anchorMatch, anchorRssiSeen: seenEntry.rssi };
}