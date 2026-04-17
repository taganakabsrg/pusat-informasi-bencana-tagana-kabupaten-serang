import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth, storage } from '../lib/firebase';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { KECAMATAN_SERANG } from '../constants';
// Add Lucide icon
import { User, Home, Camera, Send, Loader2, ChevronLeft, MapPin } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';

export default function CitizenForm() {
  const { id } = useParams(); // Report ID
  const [user] = useAuthState(auth);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [report, setReport] = useState<any>(null);
  
  const [districts, setDistricts] = useState<any[]>([]);
  const [villages, setVillages] = useState<any[]>([]);

  const [formData, setFormData] = useState<{
    full_name: string;
    gender: string;
    family_status: string;
    age: number | '';
    kk_number: string;
    nik_number: string;
    jalan: string;
    rt: string;
    rw: string;
    desa: string;
    kecamatan: string;
    house_condition: string;
  }>({
    full_name: '',
    gender: 'Laki-laki',
    family_status: 'Anak',
    age: 0,
    kk_number: '',
    nik_number: '',
    jalan: '',
    rt: '',
    rw: '',
    desa: '',
    kecamatan: '',
    house_condition: 'RR'
  });

  useEffect(() => {
    if (id) {
      getDoc(doc(db, 'reports', id)).then(snap => {
        if (snap.exists()) {
          const reportData = snap.data();
          setReport(reportData);
          setFormData(prev => ({
            ...prev,
            jalan: reportData.address.jalan,
            desa: reportData.address.desa,
            kecamatan: reportData.address.kecamatan,
            rt: reportData.address.rt,
            rw: reportData.address.rw
          }));
        }
      });
    }
  }, [id]);

  useEffect(() => {
    fetch('https://www.emsifa.com/api-wilayah-indonesia/api/districts/3604.json')
      .then(res => res.json())
      .then(data => {
        data.sort((a: any, b: any) => a.name.localeCompare(b.name));
        setDistricts(data);
      })
      .catch(err => console.error("Gagal load kecamatan:", err));
  }, []);

  useEffect(() => {
    if (formData.kecamatan && districts.length > 0) {
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id) return;
    
    setLoading(true);
    let photoUrl = '';

    try {
      if (imageFile) {
        const storageRef = ref(storage, `houses/${Date.now()}_${imageFile.name}`);
        const snapshot = await uploadBytes(storageRef, imageFile);
        photoUrl = await getDownloadURL(snapshot.ref);
      }

      await addDoc(collection(db, 'affected_citizens'), {
        report_id: id,
        full_name: formData.full_name,
        gender: formData.gender,
        family_status: formData.family_status,
        age: Number(formData.age),
        kk_number: formData.kk_number,
        nik_number: formData.nik_number,
        address: {
          jalan: formData.jalan,
          rt: formData.rt,
          rw: formData.rw,
          desa: formData.desa,
          kecamatan: formData.kecamatan
        },
        house_condition: formData.house_condition,
        house_photo_url: photoUrl
      });
      navigate(`/report/${id}`);
    } catch (error) {
      console.error("Error adding citizen:", error);
      alert('Gagal menyimpan data warga.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-12 px-4 sm:px-6 md:px-8 py-6 md:py-8">
      <button 
        onClick={() => navigate(-1)} 
        className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors text-[12px] font-bold uppercase tracking-wider border-none bg-transparent cursor-pointer"
      >
        <ChevronLeft size={16} /> Kembali
      </button>

      <div className="border-b border-slate-700 pb-4">
        <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Data Pilah Warga Terdampak</h1>
        <p className="text-[13px] text-slate-400 mt-1">Tambahkan informasi individu yang terdampak untuk laporan ini.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Personal Details */}
        <section className="space-y-4">
          <h2 className="text-[12px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <User size={16} /> Identitas Diri
          </h2>
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-sm space-y-4">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400 uppercase">Nama Lengkap</label>
              <input
                required type="text"
                value={formData.full_name}
                onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-3 py-2 bg-[#0f172a] border border-slate-700 text-slate-100 rounded text-[13px] focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400 uppercase">Jenis Kelamin</label>
                <select
                  required
                  value={formData.gender}
                  onChange={e => setFormData({ ...formData, gender: e.target.value as any })}
                  className="w-full px-3 py-2 bg-[#0f172a] border border-slate-700 text-slate-100 rounded text-[13px] focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer"
                >
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400 uppercase">Usia</label>
                <input
                  required type="number"
                  value={formData.age}
                  onChange={e => setFormData({ ...formData, age: e.target.value === '' ? '' : parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2 bg-[#0f172a] border border-slate-700 text-slate-100 rounded text-[13px] focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400 uppercase">Status Keluarga</label>
                <select
                  required
                  value={formData.family_status}
                  onChange={e => setFormData({ ...formData, family_status: e.target.value as any })}
                  className="w-full px-3 py-2 bg-[#0f172a] border border-slate-700 text-slate-100 rounded text-[13px] focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer"
                >
                  <option value="KK">Kepala Keluarga (KK)</option>
                  <option value="Istri">Istri</option>
                  <option value="Anak">Anak</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400 uppercase">NIK (16 Digit)</label>
                <input
                  required type="text" maxLength={16} pattern="\d{16}"
                  value={formData.nik_number}
                  onChange={e => setFormData({ ...formData, nik_number: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0f172a] border border-slate-700 text-slate-100 rounded text-[13px] focus:ring-1 focus:ring-blue-500 outline-none placeholder-slate-600"
                  placeholder="3604..."
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400 uppercase">Nomor KK</label>
              <input
                required type="text" maxLength={16}
                value={formData.kk_number}
                onChange={e => setFormData({ ...formData, kk_number: e.target.value })}
                className="w-full px-3 py-2 bg-[#0f172a] border border-slate-700 text-slate-100 rounded font-mono text-[13px] focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </section>

        {/* Address Details */}
        <section className="space-y-4">
          <h2 className="text-[12px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <MapPin size={16} /> Alamat Lengkap
          </h2>
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-sm space-y-4">
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400 uppercase">Kecamatan</label>
                <select
                  required
                  value={formData.kecamatan}
                  onChange={e => setFormData({ ...formData, kecamatan: e.target.value, desa: '' })}
                  className="w-full px-3 py-2 bg-[#0f172a] border border-slate-700 text-slate-100 rounded text-[13px] focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer"
                >
                  <option value="" disabled>Pilih Kecamatan</option>
                  {districts.map(d => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
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
                  <option value="" disabled>Pilih Desa</option>
                  {villages.map(v => (
                    <option key={v.id} value={v.name}>{v.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400 uppercase">Kp/Jalan/Gang</label>
              <input
                required type="text"
                value={formData.jalan}
                onChange={e => setFormData({ ...formData, jalan: e.target.value })}
                className="w-full px-3 py-2 bg-[#0f172a] border border-slate-700 text-slate-100 rounded text-[13px] focus:ring-1 focus:ring-blue-500 outline-none placeholder-slate-600"
                placeholder="cth: Kp. Durian Runtuh"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400 uppercase">RT</label>
                <input
                  required type="text"
                  value={formData.rt}
                  onChange={e => setFormData({ ...formData, rt: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0f172a] border border-slate-700 text-slate-100 rounded font-mono text-[13px] focus:ring-1 focus:ring-blue-500 outline-none placeholder-slate-600"
                  placeholder="001"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400 uppercase">RW</label>
                <input
                  required type="text"
                  value={formData.rw}
                  onChange={e => setFormData({ ...formData, rw: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0f172a] border border-slate-700 text-slate-100 rounded font-mono text-[13px] focus:ring-1 focus:ring-blue-500 outline-none placeholder-slate-600"
                  placeholder="002"
                />
              </div>
            </div>

          </div>
        </section>

        {/* House Condition & Photo */}
        <section className="space-y-4">
          <h2 className="text-[12px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Home size={16} /> Kondisi Rumah & Lampiran
          </h2>
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-sm space-y-6">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400 uppercase">Kondisi Bangunan</label>
              <div className="grid grid-cols-3 gap-3">
                {['RR', 'RB', 'Hancur'].map(cond => (
                  <button
                    key={cond} type="button"
                    onClick={() => setFormData({ ...formData, house_condition: cond })}
                    className={`py-2 px-3 rounded text-[12px] font-bold uppercase transition-all border ${
                      formData.house_condition === cond 
                        ? 'bg-blue-500 text-white border-blue-500 shadow-none' 
                        : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    {cond === 'RR' ? 'Rusak Ringan' : cond === 'RB' ? 'Rusak Berat' : 'Hancur'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-medium text-slate-400 uppercase flex items-center gap-2">
                <Camera size={14} /> Foto Dokumentasi
              </label>
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 bg-slate-900 rounded border border-dashed border-slate-600 flex items-center justify-center overflow-hidden shrink-0 relative">
                  {preview ? (
                    <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="text-slate-600" size={24} />
                  )}
                </div>
                <div className="space-y-2">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageChange}
                    className="hidden" 
                    id="house-photo" 
                  />
                  <label 
                    htmlFor="house-photo"
                    className="px-3 py-1.5 bg-slate-700 text-slate-200 border border-slate-600 rounded text-[11px] font-bold uppercase hover:bg-slate-600 cursor-pointer inline-block"
                  >
                    Pilih Gambar
                  </label>
                  <p className="text-[11px] text-slate-500">Max 2MB. Format: JPG, PNG.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <button
          disabled={loading}
          type="submit"
          className="w-full py-3 bg-blue-500 text-white rounded font-bold text-[13px] uppercase tracking-wider hover:bg-blue-600 transition-all border border-blue-400/50 flex items-center justify-center gap-3 disabled:opacity-50 mt-8"
        >
          {loading ? <Loader2 className="animate-spin" /> : <Send size={18} />}
          Simpan Data Warga
        </button>
      </form>
    </div>
  );
}
