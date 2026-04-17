import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { DISASTER_TYPES, SERANG_CENTER } from '../constants';
import { AlertTriangle, MapPin, Navigation, Send, Loader2, Users, Clock } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { DataPilah, GenderData } from '../types';

export default function ReportForm() {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // Locations Data
  const [districts, setDistricts] = useState<{id: string, name: string}[]>([]);
  const [villages, setVillages] = useState<{id: string, name: string}[]>([]);
  
  const [dataPilah, setDataPilah] = useState<DataPilah>({
    bayi: { L: 0, P: 0 },
    balita: { L: 0, P: 0 },
    usia_sd: { L: 0, P: 0 },
    usia_sltp: { L: 0, P: 0 },
    usia_slta: { L: 0, P: 0 },
    dewasa: { L: 0, P: 0 },
    lansia: { L: 0, P: 0 }
  });

  const [formData, setFormData] = useState<{
    reporter_name: string;
    disaster_type: string;
    status_level: string;
    total_kk_affected: number | '';
    jalan: string;
    rt: string;
    rw: string;
    desa: string;
    kecamatan: string;
    disaster_date: string;
  }>({
    reporter_name: '',
    disaster_type: '',
    status_level: 'sedang',
    total_kk_affected: 0,
    jalan: '',
    rt: '',
    rw: '',
    desa: '',
    kecamatan: '',
    disaster_date: new Date().toISOString().slice(0, 16) // Default to current time
  });

  // Set default reporter name when user is loaded
  useEffect(() => {
    if (user && !formData.reporter_name) {
      setFormData(prev => ({
        ...prev,
        reporter_name: user.isAnonymous ? 'Petugas Tamu' : (user.displayName || '')
      }));
    }
  }, [user]);

  // Calculate total people from dataPilah
  const getTotalPeople = () => {
    return (Object.values(dataPilah) as GenderData[]).reduce((total, group) => total + group.L + group.P, 0);
  };


  // Fetch Districts (Kecamatan in Serang, ID: 3604) on mount
  useEffect(() => {
    fetch('https://www.emsifa.com/api-wilayah-indonesia/api/districts/3604.json')
      .then(res => res.json())
      .then(data => {
        data.sort((a: any, b: any) => a.name.localeCompare(b.name));
        setDistricts(data);
      })
      .catch(err => console.error("Gagal load kecamatan:", err));
  }, []);

  // Fetch Villages (Desa) when Kecamatan changes
  useEffect(() => {
    setVillages([]);
    
    if (formData.kecamatan) {
      const selectedDistrict = districts.find(d => d.name === formData.kecamatan);
      if (selectedDistrict) {
        fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/villages/${selectedDistrict.id}.json`)
          .then(res => res.json())
          .then(data => {
            data.sort((a: any, b: any) => a.name.localeCompare(b.name));
            setVillages(data);
          })
          .catch(err => console.error("Gagal load desa:", err));
      }
    }
  }, [formData.kecamatan, districts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert('Silahkan login terlebih dahulu');
    
    setLoading(true);
    try {
      let finalLat = SERANG_CENTER[0];
      let finalLng = SERANG_CENTER[1];

      try {
        const queries = [
          `${formData.desa}, ${formData.kecamatan}, Serang, Banten, Indonesia`,
          `${formData.desa}, Serang, Banten, Indonesia`,
          `${formData.kecamatan}, Serang, Banten, Indonesia`
        ];

        for (const queryStr of queries) {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryStr)}&countrycodes=id&limit=1`);
          if (res.ok) {
            const data = await res.json();
            if (data && data.length > 0) {
              finalLat = parseFloat(data[0].lat);
              finalLng = parseFloat(data[0].lon);
              break; // Stop querying if a result is found
            }
          }
        }
      } catch (err) {
        console.error("Gagal mendapatkan koordinat otomatis:", err);
      }

      await addDoc(collection(db, 'reports'), {
        reporter_name: formData.reporter_name,
        disaster_type: formData.disaster_type,
        status_level: formData.status_level,
        total_kk_affected: Number(formData.total_kk_affected),
        total_people_affected: getTotalPeople(),
        disaster_date: new Date(formData.disaster_date),
        data_pilah: dataPilah,
        address: {
          jalan: formData.jalan,
          rt: formData.rt,
          rw: formData.rw,
          desa: formData.desa,
          kecamatan: formData.kecamatan,
        },
        location: {
          lat: finalLat,
          lng: finalLng
        },
        timestamp: serverTimestamp()
      });
      navigate('/');
    } catch (error) {
      console.error("Error adding report:", error);
      alert('Gagal mengirim laporan. Periksa koneksi internet atau hak akses anda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 px-4 sm:px-6 md:px-8 py-6 md:py-8">
      <div className="border-b border-slate-700 pb-4">
        <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Buat Laporan Bencana</h1>
        <p className="text-[13px] text-slate-400 mt-1">Isi form di bawah ini untuk melaporkan kejadian bencana secara akurat.</p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column: General Info */}
        <div className="space-y-6">
          <section className="space-y-4">
            <h2 className="text-[12px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle size={16} /> Informasi Utama
            </h2>
            
            <div className="space-y-4 bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-sm">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400 uppercase">Waktu Kejadian Bencana</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Clock size={14} />
                  </div>
                  <input
                    required
                    type="datetime-local"
                    value={formData.disaster_date}
                    onChange={e => setFormData({ ...formData, disaster_date: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 bg-[#0f172a] border border-slate-700 text-slate-100 rounded text-[13px] focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400 uppercase">Nama Pelapor</label>
                <input
                  required
                  type="text"
                  value={formData.reporter_name}
                  onChange={e => setFormData({ ...formData, reporter_name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0f172a] border border-slate-700 text-slate-100 rounded text-[13px] focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder-slate-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-400 uppercase">Jenis Bencana</label>
                  <select
                    required
                    value={formData.disaster_type}
                    onChange={e => setFormData({ ...formData, disaster_type: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0f172a] border border-slate-700 text-slate-100 rounded text-[13px] outline-none cursor-pointer focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Pilih Jenis...</option>
                    {DISASTER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-400 uppercase">Level Status</label>
                  <select
                    required
                    value={formData.status_level}
                    onChange={e => setFormData({ ...formData, status_level: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0f172a] border border-slate-700 text-slate-100 rounded text-[13px] outline-none cursor-pointer focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="rendah">Rendah (Hijau)</option>
                    <option value="sedang">Sedang (Kuning)</option>
                    <option value="tinggi">Tinggi (Merah)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-400 uppercase">Jumlah KK Terdampak</label>
                  <input
                    required
                    type="number"
                    min="0"
                    value={formData.total_kk_affected}
                    onChange={e => setFormData({ ...formData, total_kk_affected: e.target.value === '' ? '' : parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 bg-[#0f172a] border border-slate-700 text-slate-100 rounded text-[13px] outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-400 uppercase">Jumlah Jiwa Terdampak (Otomatis)</label>
                  <div className="w-full px-3 py-2 bg-[#0f172a] border border-slate-700/50 text-slate-400 rounded text-[13px] flex items-center bg-opacity-50">
                    {getTotalPeople()}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Address Info */}
        <div className="space-y-6">
          <section className="space-y-4">
            <h2 className="text-[12px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <MapPin size={16} /> Alamat Lokasi Bencana
            </h2>
            
            <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-sm space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400 uppercase">Nama Jalan / Kp</label>
                <input
                  required
                  type="text"
                  placeholder="Contoh: Kp. Pasir Gadung"
                  value={formData.jalan}
                  onChange={e => setFormData({ ...formData, jalan: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0f172a] border border-slate-700 text-slate-100 rounded text-[13px] focus:ring-1 focus:ring-blue-500 outline-none placeholder-slate-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-400 uppercase">RT</label>
                  <input
                    required
                    type="text" placeholder="001"
                    value={formData.rt}
                    onChange={e => setFormData({ ...formData, rt: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0f172a] border border-slate-700 text-slate-100 rounded text-[13px] focus:ring-1 focus:ring-blue-500 outline-none placeholder-slate-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-400 uppercase">RW</label>
                  <input
                    required
                    type="text" placeholder="002"
                    value={formData.rw}
                    onChange={e => setFormData({ ...formData, rw: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0f172a] border border-slate-700 text-slate-100 rounded text-[13px] focus:ring-1 focus:ring-blue-500 outline-none placeholder-slate-600"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400 uppercase">Kecamatan</label>
                <select
                  required
                  value={formData.kecamatan}
                  onChange={e => setFormData({ ...formData, kecamatan: e.target.value, desa: '' })}
                  className="w-full px-3 py-2 bg-[#0f172a] border border-slate-700 text-slate-100 rounded text-[13px] focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer"
                >
                  <option value="">Pilih Kecamatan...</option>
                  {districts.map(k => <option key={k.id} value={k.name}>{k.name}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400 uppercase">Desa/Kelurahan</label>
                <select
                  required
                  disabled={!formData.kecamatan || villages.length === 0}
                  value={formData.desa}
                  onChange={e => setFormData({ ...formData, desa: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0f172a] border border-slate-700 text-slate-100 rounded text-[13px] focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer disabled:opacity-50"
                >
                  <option value="">Pilih Desa...</option>
                  {villages.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                </select>
              </div>
            </div>
          </section>
        </div>

        {/* Full Width: Data Pilah Info */}
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-[12px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Users size={16} /> Data Pilah Warga Terdampak
          </h2>
          <div className="bg-slate-800 rounded-lg border border-slate-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[13px]">
                <thead>
                  <tr className="bg-slate-900/50 text-slate-400 uppercase text-[11px] font-semibold tracking-wider">
                    <th className="px-4 py-3 border-b border-slate-700 w-1/4">Golongan Usia</th>
                    <th className="px-4 py-3 border-b border-slate-700 w-1/4">Rentang Usia</th>
                    <th className="px-4 py-3 border-b border-slate-700 text-center w-[15%]">Laki-laki (L)</th>
                    <th className="px-4 py-3 border-b border-slate-700 text-center w-[15%]">Perempuan (P)</th>
                    <th className="px-4 py-3 border-b border-slate-700 text-right">Jumlah</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {(Object.keys(dataPilah) as Array<keyof DataPilah>).map(group => {
                    const labels: Record<string, [string, string]> = {
                      bayi: ['Bayi', '0-11 Bulan'],
                      balita: ['Balita', '1-5 Tahun'],
                      usia_sd: ['Usia SD', '6-12 Tahun'],
                      usia_sltp: ['Usia SLTP', '13-15 Tahun'],
                      usia_slta: ['Usia SLTA', '16-19 Tahun'],
                      dewasa: ['Dewasa', '20-59 Tahun'],
                      lansia: ['Lansia', '> 60 Tahun'],
                    };

                    const handlePilahChange = (groupKey: keyof DataPilah, gender: 'L' | 'P', val: string) => {
                      const numVal = parseInt(val, 10);
                      setDataPilah(prev => ({
                        ...prev,
                        [groupKey]: {
                          ...prev[groupKey],
                          [gender]: isNaN(numVal) ? 0 : Math.max(0, numVal)
                        }
                      }));
                    };

                    return (
                      <tr key={group} className="hover:bg-slate-700/20 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-300">{labels[group][0]}</td>
                        <td className="px-4 py-3 text-slate-400 font-mono text-[11px] bg-slate-900/20">{labels[group][1]}</td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            min="0"
                            value={dataPilah[group].L || ''}
                            onChange={(e) => handlePilahChange(group, 'L', e.target.value)}
                            placeholder="0"
                            className="w-full px-3 py-1.5 bg-[#0f172a] border border-slate-600 rounded text-slate-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-[13px] text-center"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            min="0"
                            value={dataPilah[group].P || ''}
                            onChange={(e) => handlePilahChange(group, 'P', e.target.value)}
                            placeholder="0"
                            className="w-full px-3 py-1.5 bg-[#0f172a] border border-slate-600 rounded text-slate-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-[13px] text-center"
                          />
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-300 text-right bg-slate-900/40">
                          {dataPilah[group].L + dataPilah[group].P}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-blue-500/10 font-bold border-t border-slate-700">
                    <td colSpan={2} className="px-4 py-4 text-slate-300 uppercase tracking-widest text-[12px] text-right">Total Keseluruhan</td>
                    <td className="px-4 py-4 text-blue-400 text-center text-[15px]">
                      {(Object.values(dataPilah) as GenderData[]).reduce((acc, curr) => acc + curr.L, 0)}
                    </td>
                    <td className="px-4 py-4 text-blue-400 text-center text-[15px]">
                      {(Object.values(dataPilah) as GenderData[]).reduce((acc, curr) => acc + curr.P, 0)}
                    </td>
                    <td className="px-4 py-4 text-blue-400 text-right text-[15px]">
                      {getTotalPeople()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
        
        <div className="md:col-span-2 mt-4">
          <button
            disabled={loading}
            type="submit"
            className="w-full py-3 bg-blue-500 text-white rounded font-bold text-[13px] uppercase tracking-wider hover:bg-blue-600 transition-all border border-blue-400/50 flex items-center justify-center gap-3 disabled:opacity-50 mt-8"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Send size={18} />}
            Kirim Laporan Bencana
          </button>
        </div>
      </form>
    </div>
  );
}
