type SessionCheckOutcome =
  | 'ok'
  | 'rejected_session_closed'
  | 'rejected_duplicate_checkin'
  | 'flagged_missing_checkin';

interface SessionCheckResult {
  outcome: SessionCheckOutcome;
  allowed: boolean;
  flagged: boolean;
  flagReason: string | null;
}

export function validateCheckIn(
  sessionOpen: boolean,
  hasOpenCheckInAlready: boolean,
): SessionCheckResult {
  if (!sessionOpen) {
    return {
      outcome: 'rejected_session_closed',
      allowed: false,
      flagged: false,
      flagReason: null,
    };
  }

  if (hasOpenCheckInAlready) {
    return {
      outcome: 'rejected_duplicate_checkin',
      allowed: false,
      flagged: false,
      flagReason: null,
    };
  }

  return {
    outcome: 'ok',
    allowed: true,
    flagged: false,
    flagReason: null,
  };
}

export function validateCheckOut(
  sessionOpen: boolean,
  hasMatchingOpenCheckIn: boolean,
): SessionCheckResult {
  if (!sessionOpen) {
    return {
      outcome: 'rejected_session_closed',
      allowed: false,
      flagged: false,
      flagReason: null,
    };
  }

  if (!hasMatchingOpenCheckIn) {
    return {
      outcome: 'flagged_missing_checkin',
      allowed: true,
      flagged: true,
      flagReason: 'Check-out with no matching open check-in',
    };
  }

  return {
    outcome: 'ok',
    allowed: true,
    flagged: false,
    flagReason: null,
  };
}