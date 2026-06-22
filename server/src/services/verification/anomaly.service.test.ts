import {
  checkSharedDevice,
  checkMissingCheckout,
  checkImpossibleTiming,
} from './anomaly.service';

describe('checkSharedDevice', () => {
  it('does not flag when the device is bound to the same student checking in', () => {
    const result = checkSharedDevice('device-1', 'student-A', 'student-A');

    expect(result.flagged).toBe(false);
  });

  it('flags when the device is bound to a different student', () => {
    const result = checkSharedDevice('device-1', 'student-B', 'student-A');

    expect(result.flagged).toBe(true);
    expect(result.flagReason).toContain('student-A');
  });

  it('does not flag when there is no incoming deviceId', () => {
    const result = checkSharedDevice(null, 'student-B', 'student-A');

    expect(result.flagged).toBe(false);
  });

  it('does not flag when the device has no known owner yet', () => {
    const result = checkSharedDevice('device-1', 'student-B', null);

    expect(result.flagged).toBe(false);
  });
});

describe('checkMissingCheckout', () => {
  it('flags when the session is closed and the check-in was never closed out', () => {
    const result = checkMissingCheckout(true, true);

    expect(result.flagged).toBe(true);
    expect(result.flagReason).toBe('Session ended with no matching check-out');
  });

  it('does not flag when the session is closed but check-out happened normally', () => {
    const result = checkMissingCheckout(true, false);

    expect(result.flagged).toBe(false);
  });

  it('does not flag while the session is still open, even with no check-out yet', () => {
    const result = checkMissingCheckout(false, true);

    expect(result.flagged).toBe(false);
  });
});

describe('checkImpossibleTiming', () => {
  it('does not flag when there is no prior check-in to compare against', () => {
    const result = checkImpossibleTiming(
      { roomName: 'Room A', timestamp: new Date('2026-06-22T09:00:00Z') },
      null,
    );

    expect(result.flagged).toBe(false);
  });

  it('does not flag when the new check-in is in the same room as the prior one', () => {
    const result = checkImpossibleTiming(
      { roomName: 'Room A', timestamp: new Date('2026-06-22T09:01:00Z') },
      { roomName: 'Room A', timestamp: new Date('2026-06-22T09:00:00Z') },
    );

    expect(result.flagged).toBe(false);
  });

  it('flags when checking into a different room less than 5 minutes after the prior check-in', () => {
    const result = checkImpossibleTiming(
      { roomName: 'Room B', timestamp: new Date('2026-06-22T09:03:00Z') },
      { roomName: 'Room A', timestamp: new Date('2026-06-22T09:00:00Z') },
    );

    expect(result.flagged).toBe(true);
    expect(result.flagReason).toContain('Room B');
    expect(result.flagReason).toContain('Room A');
  });

  it('does not flag when checking into a different room 5 or more minutes later', () => {
    const result = checkImpossibleTiming(
      { roomName: 'Room B', timestamp: new Date('2026-06-22T09:05:00Z') },
      { roomName: 'Room A', timestamp: new Date('2026-06-22T09:00:00Z') },
    );

    expect(result.flagged).toBe(false);
  });
});