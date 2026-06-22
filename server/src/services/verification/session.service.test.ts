import { validateCheckIn, validateCheckOut } from './session.service';

describe('validateCheckIn', () => {
  it('allows check-in when session is open and no prior open check-in exists', () => {
    const result = validateCheckIn(true, false);

    expect(result.outcome).toBe('ok');
    expect(result.allowed).toBe(true);
    expect(result.flagged).toBe(false);
  });

  it('rejects check-in when the session is not open', () => {
    const result = validateCheckIn(false, false);

    expect(result.outcome).toBe('rejected_session_closed');
    expect(result.allowed).toBe(false);
  });

  it('rejects check-in when student already has an open check-in (duplicate tap)', () => {
    const result = validateCheckIn(true, true);

    expect(result.outcome).toBe('rejected_duplicate_checkin');
    expect(result.allowed).toBe(false);
  });

  it('prioritises session-closed rejection over duplicate check-in when both are true', () => {
    const result = validateCheckIn(false, true);

    expect(result.outcome).toBe('rejected_session_closed');
    expect(result.allowed).toBe(false);
  });
});

describe('validateCheckOut', () => {
  it('allows check-out when session is open and a matching open check-in exists', () => {
    const result = validateCheckOut(true, true);

    expect(result.outcome).toBe('ok');
    expect(result.allowed).toBe(true);
    expect(result.flagged).toBe(false);
  });

  it('rejects check-out when the session is not open', () => {
    const result = validateCheckOut(false, true);

    expect(result.outcome).toBe('rejected_session_closed');
    expect(result.allowed).toBe(false);
  });

  it('flags (but allows) check-out when there is no matching open check-in', () => {
    const result = validateCheckOut(true, false);

    expect(result.outcome).toBe('flagged_missing_checkin');
    expect(result.allowed).toBe(true);
    expect(result.flagged).toBe(true);
    expect(result.flagReason).toBe('Check-out with no matching open check-in');
  });

  it('prioritises session-closed rejection over the missing check-in flag when both apply', () => {
    const result = validateCheckOut(false, false);

    expect(result.outcome).toBe('rejected_session_closed');
    expect(result.allowed).toBe(false);
    expect(result.flagged).toBe(false);
  });
});