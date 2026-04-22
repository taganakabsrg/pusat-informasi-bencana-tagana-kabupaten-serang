import { BMKGEarthquake } from '../types';

export async function fetchLatestEarthquake(): Promise<BMKGEarthquake | null> {
  try {
    const response = await fetch('https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json');
    if (!response.ok) throw new Error('Failed to fetch earthquake data');
    const data = await response.json();
    return data.Infogempa.gempa;
  } catch (error) {
    console.error('Error fetching earthquake data:', error);
    return null;
  }
}
