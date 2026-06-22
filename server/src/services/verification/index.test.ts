import { orchestrateCheckIn, orchestrateCheckOut } from './index';

function baseInput(overrides: Partial<Parameters<typeof orchestrateCheckIn>[0]> = {}) {
  return {
    verificationConfig: 'C2' as const,
    studentLat: 53.4808,
    studentLng: -2.2426,
    geofenceLat: 53.4808,
    geofenceLng: -2.2426,
    geofenceRadiusMetres: 50,
    gpsAccuracyMetres: 10,
    roomFingerprint: [
      { bssid: 'AA:AA:AA:AA:AA:AA', avgRssi: -50 },
      { bssid: 'BB:BB:BB:BB:BB:BB', avgRssi: -55 },
    ],
    studentScan: [
      { bssid: 'AA:AA:AA:AA:AA:AA', rssi: -52 },
      { bssid: 'BB:BB:BB:BB:BB:BB', rssi: -58 },
    ],
    anchorBssid: 'AA:AA:AA:AA:AA:AA',
    incomingDeviceId: 'device-1',
    boundDeviceId: 'device-1',
    sessionOpen: true,
    hasOpenCheckInAlready: false,
    currentStudentId: 'student-A',
    deviceOwnerStudentId: 'student-A',
    roomName: 'Room A',
    checkInTimestamp: new Date('2026-06-22T09:00:00Z'),
    mostRecentPriorCheckIn: null,
    ...overrides,
  };
}

describe('orchestrateCheckIn — session gate', () => {
  it('rejects outright when the session is closed, before running any verification', () => {
    const result = orchestrateCheckIn(baseInput({ sessionOpen: false }));

    expect(result.allowed).toBe(false);
    expect(result.verificationOutcome).toBeNull();
  });
});

describe('orchestrateCheckIn — C0 (GPS only)', () => {
  it('returns verified when GPS is inside, ignoring Wi-Fi entirely', () => {
    const result = orchestrateCheckIn(
      baseInput({
        verificationConfig: 'C0',
        studentScan: [],
      }),
    );

    expect(result.allowed).toBe(true);
    expect(result.verificationOutcome).toBe('verified');
  });

  it('returns unverified when GPS is outside', () => {
    const result = orchestrateCheckIn(
      baseInput({
        verificationConfig: 'C0',
        studentLat: 53.49,
      }),
    );

    expect(result.verificationOutcome).toBe('unverified');
  });
});

describe('orchestrateCheckIn — C1 (Wi-Fi only)', () => {
  it('returns verified when Wi-Fi match is good and anchor matches, ignoring GPS entirely', () => {
    const result = orchestrateCheckIn(
      baseInput({
        verificationConfig: 'C1',
        studentLat: 53.49,
      }),
    );

    expect(result.verificationOutcome).toBe('verified');
  });

  it('returns unverified when Wi-Fi match is poor', () => {
    const result = orchestrateCheckIn(
      baseInput({
        verificationConfig: 'C1',
        studentScan: [{ bssid: 'ZZ:ZZ:ZZ:ZZ:ZZ:ZZ', rssi: -40 }],
      }),
    );

    expect(result.verificationOutcome).toBe('unverified');
  });
});

describe('orchestrateCheckIn — C2 (GPS + Wi-Fi combined)', () => {
  it('returns verified when both GPS and Wi-Fi are strong', () => {
    const result = orchestrateCheckIn(baseInput({ verificationConfig: 'C2' }));

    expect(result.verificationOutcome).toBe('verified');
  });

  it('returns unverified when GPS is outside, even with a perfect Wi-Fi match', () => {
    const result = orchestrateCheckIn(
      baseInput({ verificationConfig: 'C2', studentLat: 53.49 }),
    );

    expect(result.verificationOutcome).toBe('unverified');
  });

  it('downgrades to partial when Wi-Fi match is only partial but GPS is inside', () => {
    const result = orchestrateCheckIn(
      baseInput({
        verificationConfig: 'C2',
        roomFingerprint: [
          { bssid: 'AA:AA:AA:AA:AA:AA', avgRssi: -50 },
          { bssid: 'BB:BB:BB:BB:BB:BB', avgRssi: -55 },
          { bssid: 'CC:CC:CC:CC:CC:CC', avgRssi: -60 },
          { bssid: 'DD:DD:DD:DD:DD:DD', avgRssi: -65 },
        ],
        studentScan: [
          { bssid: 'AA:AA:AA:AA:AA:AA', rssi: -52 },
          { bssid: 'BB:BB:BB:BB:BB:BB', rssi: -58 },
          { bssid: 'EE:EE:EE:EE:EE:EE', rssi: -40 },
          { bssid: 'FF:FF:FF:FF:FF:FF', rssi: -45 },
        ],
      }),
    );

    expect(result.verificationOutcome).toBe('partial');
  });

  it('downgrades good Jaccard score to partial when the anchor node does not match', () => {
    const result = orchestrateCheckIn(
      baseInput({
        verificationConfig: 'C2',
        anchorBssid: 'ZZ:ZZ:ZZ:ZZ:ZZ:ZZ',
      }),
    );

    expect(result.verificationOutcome).toBe('partial');
  });
});

describe('orchestrateCheckIn — C3 (adds device binding)', () => {
  it('binds the device on first-ever check-in and still returns verified', () => {
    const result = orchestrateCheckIn(
      baseInput({ verificationConfig: 'C3', boundDeviceId: null }),
    );

    expect(result.verificationOutcome).toBe('verified');
    expect(result.newBoundDeviceId).toBe('device-1');
  });

  it('downgrades verified to partial and flags when the device does not match the bound device', () => {
    const result = orchestrateCheckIn(
      baseInput({
        verificationConfig: 'C3',
        incomingDeviceId: 'device-999',
        boundDeviceId: 'device-1',
      }),
    );

    expect(result.verificationOutcome).toBe('partial');
    expect(result.flagged).toBe(true);
    expect(result.flagReasons.length).toBeGreaterThan(0);
  });
});

describe('orchestrateCheckIn — C5 (adds anomaly detection)', () => {
  it('flags when the device is bound to a different student account', () => {
    const result = orchestrateCheckIn(
      baseInput({
        verificationConfig: 'C5',
        currentStudentId: 'student-B',
        deviceOwnerStudentId: 'student-A',
        boundDeviceId: null,
      }),
    );

    expect(result.flagged).toBe(true);
    expect(
      result.flagReasons.some((reason) => reason.includes('different student')),
    ).toBe(true);
  });

  it('flags impossible timing when checking into a different room too soon after a prior check-in', () => {
    const result = orchestrateCheckIn(
      baseInput({
        verificationConfig: 'C5',
        roomName: 'Room B',
        checkInTimestamp: new Date('2026-06-22T09:02:00Z'),
        mostRecentPriorCheckIn: {
          roomName: 'Room A',
          timestamp: new Date('2026-06-22T09:00:00Z'),
        },
      }),
    );

    expect(result.flagged).toBe(true);
    expect(
      result.flagReasons.some((reason) => reason.includes('Room B')),
    ).toBe(true);
  });

  it('does not flag for anomalies when everything is normal', () => {
    const result = orchestrateCheckIn(baseInput({ verificationConfig: 'C5' }));

    expect(result.flagged).toBe(false);
    expect(result.verificationOutcome).toBe('verified');
  });
});

describe('orchestrateCheckOut', () => {
  it('allows check-out when session is open and a matching check-in exists', () => {
    const result = orchestrateCheckOut(true, true);

    expect(result.allowed).toBe(true);
    expect(result.flagged).toBe(false);
  });

  it('flags but allows check-out when there is no matching check-in', () => {
    const result = orchestrateCheckOut(true, false);

    expect(result.allowed).toBe(true);
    expect(result.flagged).toBe(true);
  });

  it('rejects check-out when the session is closed', () => {
    const result = orchestrateCheckOut(false, true);

    expect(result.allowed).toBe(false);
  });
});