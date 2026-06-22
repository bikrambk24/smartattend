import { checkDeviceBinding } from './device.service';

describe('checkDeviceBinding', () => {
  it('binds the device on first check-in when no device is currently bound', () => {
    const result = checkDeviceBinding('device-123', null);

    expect(result.outcome).toBe('bound_now');
    expect(result.deviceBound).toBe(true);
    expect(result.boundDeviceId).toBe('device-123');
  });

  it('returns match when incoming device equals the bound device', () => {
    const result = checkDeviceBinding('device-123', 'device-123');

    expect(result.outcome).toBe('match');
    expect(result.deviceBound).toBe(true);
    expect(result.boundDeviceId).toBe('device-123');
  });

  it('returns mismatch when incoming device differs from the bound device', () => {
    const result = checkDeviceBinding('device-999', 'device-123');

    expect(result.outcome).toBe('mismatch');
    expect(result.deviceBound).toBe(false);
    expect(result.boundDeviceId).toBe('device-123');
  });

  it('returns mismatch when incoming deviceId is missing, even with no device bound yet', () => {
    const result = checkDeviceBinding(null, null);

    expect(result.outcome).toBe('mismatch');
    expect(result.deviceBound).toBe(false);
  });

  it('returns mismatch when incoming deviceId is missing and a device is already bound', () => {
    const result = checkDeviceBinding(null, 'device-123');

    expect(result.outcome).toBe('mismatch');
    expect(result.deviceBound).toBe(false);
    expect(result.boundDeviceId).toBe('device-123');
  });
});