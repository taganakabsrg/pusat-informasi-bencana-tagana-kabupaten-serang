import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { DisasterReport } from '../types';
import { Link } from 'react-router-dom';
import { FileText, MapPin, Users, ChevronRight, Trash2 } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';

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

export default function ReportsList() {
  const [reports, setReports] = useState<DisasterReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [user] = useAuthState(auth);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);
  const [filterMonth, setFilterMonth] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    const q = query(collection(db, 'reports'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DisasterReport)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleConfirmDelete = async () => {
    if (reportToDelete && user?.email === 'taganakabsrg@gmail.com') {
      try {
        await deleteDoc(doc(db, 'reports', reportToDelete));
        setReportToDelete(null);
      } catch (error) {
        console.error("Gagal menghapus:", error);
      }
    }
  };

  if (loading) return <div className="p-12 text-center text-slate-400">Memuat data laporan...</div>;

  const filteredReports = reports.filter(r => {
    if (!filterMonth) return true;
    try {
      let rDate: Date | null = null;
      if (r.disaster_date && typeof r.disaster_date.toDate === 'function') {
        rDate = r.disaster_date.toDate();
      } else if (r.timestamp && typeof r.timestamp.toDate === 'function') {
        rDate = r.timestamp.toDate();
      }
      if (!rDate) return false;
      const rMonth = `${rDate.getFullYear()}-${String(rDate.getMonth() + 1).padStart(2, '0')}`;
      return rMonth === filterMonth;
    } catch (e) {
      return false;
    }
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-8 relative">
      {reportToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-slate-100 mb-2">Hapus Laporan?</h3>
            <p className="text-sm text-slate-400 mb-6">Tindakan ini tidak dapat dibatalkan. Laporan dan semua data warga yang terhubung akan terpengaruh.</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setReportToDelete(null)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-[12px] font-bold uppercase tracking-wider transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-500 border border-red-500/50 rounded text-[12px] font-bold uppercase tracking-wider transition-colors"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Data Laporan Bencana</h1>
            <p className="text-[13px] text-slate-400 mt-1">Daftar rekapan kejadian bencana di Kabupaten Serang.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Periode:</span>
              <input 
                type="month" 
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="bg-transparent text-[13px] text-slate-200 outline-none cursor-pointer"
              />
              {filterMonth && (
                <button 
                  onClick={() => setFilterMonth('')} 
                  className="text-[11px] text-red-400 hover:text-red-300 ml-2 font-semibold uppercase"
                >
                  Clear
                </button>
              )}
            </div>
            {user && (
              <Link
                to="/input-report"
                className="bg-blue-500 text-white px-4 py-2 rounded text-[12px] font-bold uppercase tracking-wider hover:bg-blue-600 transition-all border border-blue-400/50"
              >
                + Laporan Baru
              </Link>
            )}
          </div>
        </div>

      <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#111827] border-b border-slate-700 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Tipe & Tanggal</th>
                <th className="px-5 py-3">Lokasi</th>
                <th className="px-5 py-3">Terdampak</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-500 italic text-[12px]">
                    Belum ada data laporan bencana.
                  </td>
                </tr>
              ) : (
                filteredReports.map((report) => (
                  <tr key={report.id} className="group hover:bg-blue-500/5 transition-all">
                    <td className="px-5 py-3">
                      <div className="flex flex-col">
                        <span className="font-semibold text-[13px] text-slate-200">{report.disaster_type}</span>
                        <span className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {report.disaster_date?.seconds 
                            ? new Date(report.disaster_date.seconds * 1000).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                            : report.timestamp?.seconds
                            ? new Date(report.timestamp.seconds * 1000).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                            : 'Menyimpan...'}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="text-[12px] text-slate-300">
                        Desa {report.address.desa}, {report.address.kecamatan}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-mono text-[12px] text-slate-300">
                        {report.total_people_affected} Jiwa
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge level={report.status_level} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-4">
                        {user?.email === 'taganakabsrg@gmail.com' && (
                          <button
                            onClick={() => setReportToDelete(report.id)}
                            className="text-slate-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                        <Link
                          to={`/report/${report.id}`}
                          className="flex items-center gap-1 text-blue-400 font-bold text-[11px] uppercase tracking-wider hover:text-blue-300 transition-all"
                        >
                          DETAIL <ChevronRight size={14} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
