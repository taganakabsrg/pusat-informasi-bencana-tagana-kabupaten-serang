export interface Address {
  jalan: string;
  rt: string;
  rw: string;
  desa: string;
  kecamatan: string;
}

export interface Location {
  lat: number;
  lng: number;
}

export type DisasterStatus = 'tinggi' | 'sedang' | 'rendah';

export interface GenderData {
  L: number;
  P: number;
}

export interface DataPilah {
  bayi: GenderData;       // 0-11 Bulan
  balita: GenderData;     // 1-5 Tahun
  usia_sd: GenderData;    // 6-12 Tahun
  usia_sltp: GenderData;  // 13-15 Tahun
  usia_slta: GenderData;  // 16-19 Tahun
  dewasa: GenderData;     // 20-59 Tahun
  lansia: GenderData;     // > 60 Tahun
}

export interface DisasterReport {
  id: string;
  reporter_name: string;
  address: Address;
  disaster_type: string;
  timestamp: any; // Firestore Timestamp
  disaster_date?: any; // The actual time of the disaster
  status_level: DisasterStatus;
  total_kk_affected: number;
  total_people_affected: number;
  location: Location;
  data_pilah?: DataPilah;
}

export interface AffectedCitizen {
  id: string;
  report_id: string;
  full_name: string;
  gender: 'Laki-laki' | 'Perempuan';
  family_status: 'KK' | 'Istri' | 'Anak' | 'Lainnya';
  age: number;
  kk_number: string;
  nik_number: string;
  address: Address;
  house_condition: 'RR' | 'RB' | 'Hancur';
  house_photo_url: string;
}
