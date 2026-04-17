import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db, auth } from '../lib/firebase';
import { doc, getDoc, collection, query, where, onSnapshot, deleteDoc } from 'firebase/firestore';
import { DisasterReport, AffectedCitizen, DataPilah } from '../types';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useNavigate } from 'react-router-dom';
import { Users, MapPin, AlertCircle, Plus, ChevronLeft, Home, User, UserCheck, Printer, Clock, Trash2 } from 'lucide-react';

function StatusBadge({ level }: { level: string }) {
  const colors = {
    tinggi: 'bg-red-500/20 text-red-400 border-red-500/30 border',
    sedang: 'bg-amber-500/20 text-amber-400 border-amber-500/30 border',
    rendah: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 border',
  };
  return (
    <span className={`px-2 py-1 rounded text-[11px] font-semibold uppercase tracking-wider ${colors[level as keyof typeof colors]}`}>
      {level}
    </span>
  );
}

export default function ReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user] = useAuthState(auth);
  const [report, setReport] = useState<DisasterReport | null>(null);
  const [citizens, setCitizens] = useState<AffectedCitizen[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: 'report' | 'citizen' } | null>(null);

  const isAdmin = user?.email === 'taganakabsrg@gmail.com';

  const handleDelete = async () => {
    if (!itemToDelete) return;

    try {
      if (itemToDelete.type === 'report') {
        await deleteDoc(doc(db, 'reports', itemToDelete.id));
        navigate('/reports');
      } else {
        await deleteDoc(doc(db, 'affected_citizens', itemToDelete.id));
        setItemToDelete(null);
      }
    } catch (error) {
      console.error("Gagal menghapus:", error);
      alert("Gagal menghapus data. Periksa hak akses anda.");
    }
  };

  useEffect(() => {
    if (!id) return;

    const fetchReport = async () => {
      const docRef = doc(db, 'reports', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setReport({ id: docSnap.id, ...docSnap.data() } as DisasterReport);
      }
      setLoading(false);
    };

    const q = query(collection(db, 'affected_citizens'), where('report_id', '==', id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AffectedCitizen));
      setCitizens(data);
    });

    fetchReport();
    return () => unsubscribe();
  }, [id]);

  if (loading) return <div className="p-8 text-center text-slate-400">Memuat detail laporan...</div>;
  if (!report) return <div className="p-8 text-center text-slate-400">Laporan tidak ditemukan.</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8 px-4 sm:px-6 md:px-8 py-6 md:py-8 print:p-0 print:m-0 print:space-y-4">
      {itemToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-slate-100 mb-2">Hapus {itemToDelete.type === 'report' ? 'Laporan' : 'Data Warga'}?</h3>
            <p className="text-sm text-slate-400 mb-6">Tindakan ini tidak dapat dibatalkan.</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-[12px] font-bold uppercase tracking-wider transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={handleDelete}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-500 border border-red-500/50 rounded text-[12px] font-bold uppercase tracking-wider transition-colors"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between print:hidden">
        <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors text-[12px] font-bold uppercase tracking-wider">
          <ChevronLeft size={16} /> Kembali ke Peta
        </Link>
        <div className="flex items-center gap-3 print:hidden">
          {isAdmin && (
            <button
              onClick={() => setItemToDelete({ id: id!, type: 'report' })}
              className="inline-flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 px-4 py-2 rounded text-[11px] font-bold uppercase transition-colors"
            >
              <Trash2 size={14} /> Hapus Laporan
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 hover:border-slate-600 px-4 py-2 rounded text-[11px] font-bold uppercase transition-colors"
          >
            <Printer size={14} /> Cetak Laporan (PDF)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:gap-4 print:grid-cols-1">
        {/* Report Info Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden shadow-sm print:shadow-none print:border-none print:bg-transparent">
            <div className="p-6 space-y-6 print:p-0">
              <div className="flex justify-between items-start border-b border-slate-700 pb-4 print:border-slate-300">
                <h1 className="text-[16px] font-bold text-slate-100 print:text-black leading-tight uppercase tracking-wide">
                  {report.disaster_type}
                </h1>
                <StatusBadge level={report.status_level} />
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Clock className="text-slate-500 print:text-black mt-0.5 shrink-0" size={16} />
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400 print:text-black uppercase tracking-wider mb-1">Waktu Kejadian</p>
                    <p className="text-[13px] text-slate-300 print:text-black">
                      {report.disaster_date ? 
                        new Date(report.disaster_date.toDate()).toLocaleString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 
                        '-'
                      }
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="text-slate-500 print:text-black mt-0.5 shrink-0" size={16} />
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400 print:text-black uppercase tracking-wider mb-1">Lokasi Kejadian</p>
                    <p className="text-[13px] text-slate-300 print:text-black">
                      {report.address.jalan}, RT {report.address.rt}/RW {report.address.rw}<br />
                      Desa {report.address.desa}, Kec. {report.address.kecamatan}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <AlertCircle className="text-slate-500 print:text-black mt-0.5 shrink-0" size={16} />
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400 print:text-black uppercase tracking-wider mb-1">Total Terdampak</p>
                    <p className="font-mono text-[13px] text-blue-400 print:text-black font-bold">
                      {report.total_kk_affected} KK / {report.total_people_affected} Jiwa
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <UserCheck className="text-slate-500 print:text-black mt-0.5 shrink-0" size={16} />
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400 print:text-black uppercase tracking-wider mb-1">Pelapor</p>
                    <p className="text-[13px] text-slate-300 print:text-black">{report.reporter_name}</p>
                  </div>
                </div>
              </div>

              {report.data_pilah && (
                <div className="pt-4 border-t border-slate-700 print:border-slate-300">
                  <h3 className="text-[11px] font-semibold text-slate-400 print:text-slate-600 uppercase tracking-wider mb-3">Rekap Data Pilah Usia & Jenis Kelamin</h3>
                  <div className="bg-[#0f172a] print:bg-white rounded border border-slate-700 print:border-slate-300 overflow-hidden">
                    <table className="w-full text-left text-[11px] print:text-black">
                      <thead className="bg-slate-800 print:bg-slate-100 text-slate-400 print:text-slate-700 border-b border-slate-700 print:border-slate-300">
                        <tr>
                          <th className="px-3 py-2 font-semibold">Golongan</th>
                          <th className="px-3 py-2 font-semibold text-center">L</th>
                          <th className="px-3 py-2 font-semibold text-center">P</th>
                          <th className="px-3 py-2 font-semibold text-right">Jml</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/50 print:divide-slate-300 text-slate-300 print:text-black">
                        {(Object.keys(report.data_pilah!) as Array<keyof DataPilah>).map((k) => {
                          const item = report.data_pilah![k];
                          const total = item.L + item.P;
                          const labels: Record<string, string> = {
                            bayi: 'Bayi (0-11 Bln)',
                            balita: 'Balita (1-5)',
                            usia_sd: 'SD (6-12)',
                            usia_sltp: 'SLTP (13-15)',
                            usia_slta: 'SLTA (16-19)',
                            dewasa: 'Dewasa (20-59)',
                            lansia: 'Lansia (>60)',
                          };
                          return (
                            <tr key={k}>
                              <td className="px-3 py-1.5">{labels[k as string]}</td>
                              <td className="px-3 py-1.5 text-center">{item.L}</td>
                              <td className="px-3 py-1.5 text-center">{item.P}</td>
                              <td className="px-3 py-1.5 text-right font-medium">{total}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {user && (
                <Link
                  to={`/report/${id}/add-citizen`}
                  className="flex items-center justify-center gap-2 w-full py-2 bg-blue-500 text-white rounded text-[12px] font-bold uppercase tracking-wider hover:bg-blue-600 transition-all border border-blue-400/50 mt-4 print:hidden"
                >
                  <Plus size={16} />
                  Tambah Pendataan
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Affected Citizens List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-700 pb-2 print:border-slate-300">
            <h2 className="text-[14px] font-bold text-slate-100 print:text-black flex items-center gap-2 uppercase tracking-wide">
              <Users size={18} className="text-blue-500" />
              Daftar Warga Terdampak <span className="bg-slate-800 print:bg-slate-100 print:border-slate-300 border border-slate-700 text-blue-400 px-2 py-0.5 rounded text-[11px] font-mono ml-2">{citizens.length}</span>
            </h2>
            {user && (
              <Link
                to={`/report/${id}/add-citizen`}
                className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded text-[11px] font-bold uppercase transition-colors print:hidden"
              >
                <Plus size={14} />
                Tambah Pendataan
              </Link>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {citizens.length === 0 ? (
              <div className="col-span-2 py-12 text-center bg-slate-800 print:bg-white print:border-slate-300 print:text-black border border-slate-700 rounded-lg text-slate-500 text-[12px] italic">
                Belum ada data warga terpilah yang ditambahkan.
              </div>
            ) : (
              citizens.map((citizen) => (
                <div key={citizen.id} className="bg-slate-800 print:bg-white print:border-slate-300 border border-slate-700 rounded-lg p-4 transition-all flex gap-4 hover:border-slate-500">
                  {citizen.house_photo_url ? (
                    <img 
                      src={citizen.house_photo_url} 
                      alt="Rumah" 
                      className="w-[72px] h-[72px] rounded object-cover shrink-0 border border-slate-600"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-[72px] h-[72px] bg-[#0f172a] rounded flex items-center justify-center text-slate-600 shrink-0 border border-slate-700">
                      <Home size={24} />
                    </div>
                  )}
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between items-start">
                      <h4 className="font-semibold text-[13px] text-slate-200 print:text-black line-clamp-1">{citizen.full_name}</h4>
                      <div className="flex items-center gap-2">
                        {isAdmin && (
                          <button 
                            onClick={() => setItemToDelete({ id: citizen.id, type: 'citizen' })}
                            className="text-slate-500 hover:text-red-400 transition-colors p-1"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                          citizen.house_condition === 'Hancur' ? 'bg-red-500/20 text-red-400 border border-red-500/30 print:border-red-500 print:text-red-700' : 
                          citizen.house_condition === 'RB' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 print:border-amber-500 print:text-amber-700' : 
                          'bg-blue-500/20 text-blue-400 border border-blue-500/30 print:border-blue-500 print:text-blue-700'
                        }`}>
                          {citizen.house_condition}
                        </span>
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-400 print:text-slate-600 font-medium flex flex-wrap gap-x-3 gap-y-1">
                      <span className="flex items-center gap-1"><User size={12}/> {citizen.gender}</span>
                      <span className="font-mono">{citizen.age} THN</span>
                      <span className="font-mono">NIK: {citizen.nik_number}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 print:text-slate-600">
                       {citizen.address.jalan}, Desa {citizen.address.desa}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
