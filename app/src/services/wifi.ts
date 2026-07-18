import WifiManager from 'react-native-wifi-reborn';

export interface WifiReading {
  bssid: string;
  rssi: number;
}

export async function scanWifi(): Promise<WifiReading[]> {
  const list = await WifiManager.loadWifiList();

  return list.map((entry) => ({
    bssid: entry.BSSID,
    rssi: entry.level,
  }));
}