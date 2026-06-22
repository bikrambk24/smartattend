import { calculateJaccardSimilarity, checkAnchorNode } from './wifi.service';

describe('calculateJaccardSimilarity', () => {
  it('returns 1.0 when student sees exactly the same BSSIDs as the room', () => {
    const room = [
      { bssid: 'AA:AA:AA:AA:AA:AA', avgRssi: -50 },
      { bssid: 'BB:BB:BB:BB:BB:BB', avgRssi: -60 },
    ];
    const student = [
      { bssid: 'AA:AA:AA:AA:AA:AA', rssi: -52 },
      { bssid: 'BB:BB:BB:BB:BB:BB', rssi: -58 },
    ];

    const result = calculateJaccardSimilarity(room, student);

    expect(result.jaccardScore).toBe(1);
    expect(result.matchedBssids).toHaveLength(2);
  });

  it('returns 0 when student sees none of the room BSSIDs', () => {
    const room = [{ bssid: 'AA:AA:AA:AA:AA:AA', avgRssi: -50 }];
    const student = [{ bssid: 'ZZ:ZZ:ZZ:ZZ:ZZ:ZZ', rssi: -40 }];

    const result = calculateJaccardSimilarity(room, student);

    expect(result.jaccardScore).toBe(0);
    expect(result.matchedBssids).toHaveLength(0);
  });

  it('returns a partial score when student sees some but not all room BSSIDs (adjacent room scenario)', () => {
    const room = [
      { bssid: 'AA:AA:AA:AA:AA:AA', avgRssi: -50 },
      { bssid: 'BB:BB:BB:BB:BB:BB', avgRssi: -55 },
      { bssid: 'CC:CC:CC:CC:CC:CC', avgRssi: -60 },
      { bssid: 'DD:DD:DD:DD:DD:DD', avgRssi: -65 },
    ];
    const student = [
      { bssid: 'AA:AA:AA:AA:AA:AA', rssi: -80 },
      { bssid: 'BB:BB:BB:BB:BB:BB', rssi: -82 },
      { bssid: 'EE:EE:EE:EE:EE:EE', rssi: -40 },
      { bssid: 'FF:FF:FF:FF:FF:FF', rssi: -45 },
    ];

    const result = calculateJaccardSimilarity(room, student);

    expect(result.jaccardScore).toBeCloseTo(0.333, 2);
    expect(result.jaccardScore).toBeGreaterThan(0.3);
    expect(result.jaccardScore).toBeLessThan(0.5);
  });

  it('returns 0 when both room and student scans are empty', () => {
    const result = calculateJaccardSimilarity([], []);

    expect(result.jaccardScore).toBe(0);
    expect(result.matchedBssids).toHaveLength(0);
  });
});

describe('checkAnchorNode', () => {
  it('returns anchorMatch true when anchor is visible above the strength threshold', () => {
    const studentScan = [{ bssid: 'AA:AA:AA:AA:AA:AA', rssi: -60 }];

    const result = checkAnchorNode('AA:AA:AA:AA:AA:AA', studentScan);

    expect(result.anchorMatch).toBe(true);
    expect(result.anchorRssiSeen).toBe(-60);
  });

  it('returns anchorMatch false when anchor is visible but too weak (through-wall scenario)', () => {
    const studentScan = [{ bssid: 'AA:AA:AA:AA:AA:AA', rssi: -82 }];

    const result = checkAnchorNode('AA:AA:AA:AA:AA:AA', studentScan);

    expect(result.anchorMatch).toBe(false);
    expect(result.anchorRssiSeen).toBe(-82);
  });

  it('returns anchorMatch false and null rssi when anchor is not visible at all', () => {
    const studentScan = [{ bssid: 'ZZ:ZZ:ZZ:ZZ:ZZ:ZZ', rssi: -50 }];

    const result = checkAnchorNode('AA:AA:AA:AA:AA:AA', studentScan);

    expect(result.anchorMatch).toBe(false);
    expect(result.anchorRssiSeen).toBeNull();
  });

  it('returns anchorMatch false when the room has no anchor recorded', () => {
    const studentScan = [{ bssid: 'AA:AA:AA:AA:AA:AA', rssi: -50 }];

    const result = checkAnchorNode(null, studentScan);

    expect(result.anchorMatch).toBe(false);
    expect(result.anchorRssiSeen).toBeNull();
  });

  it('treats exactly -75 dBm as a match (boundary is inclusive)', () => {
    const studentScan = [{ bssid: 'AA:AA:AA:AA:AA:AA', rssi: -75 }];

    const result = checkAnchorNode('AA:AA:AA:AA:AA:AA', studentScan);

    expect(result.anchorMatch).toBe(true);
  });
});