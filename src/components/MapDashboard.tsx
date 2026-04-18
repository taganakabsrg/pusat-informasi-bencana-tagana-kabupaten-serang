import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DisasterReport } from '../types';
import { SERANG_CENTER } from '../constants';
import { Link } from 'react-router-dom';
import { Download } from 'lucide-react';

// Fix Leaflet icon issue
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

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

export default function MapDashboard() {
  const [reports, setReports] = useState<DisasterReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [filterMonth, setFilterMonth] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'reports'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DisasterReport));
      setReports(data);
      setLoading(false);
    }, (error) => {
      console.error("Firestore Error:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-slate-900 absolute inset-0">
        <div className="text-slate-400 animate-pulse text-[13px] font-semibold uppercase tracking-widest">
          Memuat Peta SIM Bencana...
        </div>
      </div>
    );
  }

  const filteredReports = reports.filter(r => {
    if (!filterMonth) return true; // Show all
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

  const reportsWithValidLocations = filteredReports.filter(r => 
    r.location && 
    typeof r.location.lat === 'number' && typeof r.location.lng === 'number' && 
    !isNaN(r.location.lat) && !isNaN(r.location.lng)
  );

  const downloadCSV = () => {
    // Define CSV Headers
    const headers = [
      'Waktu Input',
      'Waktu Kejadian',
      'Pelapor',
      'Kategori',
      'Status',
      'Jalan/Kp',
      'RT',
      'RW',
      'Desa/Kelurahan',
      'Kecamatan',
      'Total KK',
      'Total Jiwa',
      'Lat',
      'Lng'
    ];

    // Escape CSV cell to handle commas and newlines
    const escapeCsv = (str: string | number) => `"${String(str).replace(/"/g, '""')}"`;

    // Map reports to CSV rows
    const rows = filteredReports.map(r => {
      const inputDate = r.timestamp ? new Date(r.timestamp.toDate()).toLocaleString('id-ID') : '-';
      const disasterDate = r.disaster_date ? new Date(r.disaster_date.toDate()).toLocaleString('id-ID') : '-';
      return [
        inputDate,
        disasterDate,
        r.reporter_name,
        r.disaster_type,
        r.status_level,
        r.address?.jalan || '-',
        r.address?.rt || '-',
        r.address?.rw || '-',
        r.address?.desa || '-',
        r.address?.kecamatan || '-',
        r.total_kk_affected,
        r.total_people_affected,
        r.location?.lat || '-',
        r.location?.lng || '-'
      ].map(escapeCsv).join(',');
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `laporan_bencana_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-60px)] w-full">
      {/* Sidebar Left: Stats */}
      <aside className="w-full md:w-[260px] border-b md:border-b-0 md:border-r border-slate-700 bg-slate-950 p-4 flex flex-row md:flex-col gap-4 overflow-x-auto md:overflow-y-auto custom-scrollbar shrink-0 z-10">
        <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex-1 md:flex-none">
          <div className="text-[11px] uppercase text-slate-400 font-semibold mb-2">Periode Data</div>
          <input 
            type="month" 
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="w-full bg-[#0f172a] border border-slate-700 text-slate-200 text-[13px] rounded px-2 py-1.5 outline-none focus:border-blue-500 cursor-pointer"
          />
          <button 
            onClick={() => setFilterMonth('')}
            className="w-full mt-2 text-[10px] text-slate-500 hover:text-slate-300 font-semibold uppercase tracking-wider text-right"
          >
            Tampilkan Semua Waktu
          </button>
        </div>

        <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex-1 md:flex-none">
          <div className="text-[11px] uppercase text-slate-400 font-semibold mb-1">Total Kejadian</div>
          <div className="font-mono text-2xl font-bold text-blue-500">{filteredReports.length.toString().padStart(2, '0')}</div>
        </div>
        <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex-1 md:flex-none">
          <div className="text-[11px] uppercase text-slate-400 font-semibold mb-1">Jiwa Terdampak</div>
          <div className="font-mono text-2xl font-bold text-blue-500">
            {filteredReports.reduce((acc, r) => acc + r.total_people_affected, 0).toLocaleString()}
          </div>
        </div>

        <button
          onClick={downloadCSV}
          className="w-full mt-2 hidden md:flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 hover:border-slate-600 px-3 py-2 rounded text-[11px] font-bold uppercase transition-colors"
        >
          <Download size={14} /> Download CSV
        </button>

        <div className="hidden md:block mt-2 pt-4 border-t border-slate-700">
          <div className="px-0 py-2 border-none bg-transparent text-[12px] font-semibold text-slate-200 uppercase flex justify-between mb-2">
            Legenda Peta
          </div>
          <div className="flex flex-col gap-2 text-[11px] text-slate-300">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div> Bahaya Tinggi
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div> Bahaya Sedang
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div> Bahaya Rendah
            </div>
          </div>
        </div>
      </aside>

      {/* Map Area */}
      <section className="flex-1 min-h-[350px] relative bg-[#0c111d] overflow-hidden">
        <MapContainer
          center={SERANG_CENTER}
          zoom={10}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef as any}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          {reportsWithValidLocations.map((report) => (
            <React.Fragment key={report.id}>
              {activeReportId === report.id && (
                <Circle
                  center={[report.location.lat, report.location.lng]}
                  radius={1500}
                  pathOptions={{
                    color: report.status_level === 'tinggi' ? '#ef4444' : report.status_level === 'sedang' ? '#f59e0b' : '#10b981',
                    fillColor: report.status_level === 'tinggi' ? '#ef4444' : report.status_level === 'sedang' ? '#f59e0b' : '#10b981',
                    fillOpacity: 0.15,
                    weight: 2,
                    dashArray: '5, 5'
                  }}
                />
              )}
              <Marker 
                position={[report.location.lat, report.location.lng]}
                eventHandlers={{
                  click: () => setActiveReportId(report.id),
                }}
              >
                <Popup 
                  maxWidth={220} 
                  className="rounded-lg shadow-xl overflow-hidden p-0 bg-slate-800 border border-blue-500 text-slate-200"
                  eventHandlers={{
                    remove: () => setActiveReportId(null)
                  }}
                >
                <style>{`
                  .leaflet-popup-content-wrapper { background: #1e293b; color: #f1f5f9; border-radius: 8px; border: 1px solid #3b82f6; padding:0; }
                  .leaflet-popup-tip { background: #3b82f6; border-color: #3b82f6; }
                  .leaflet-popup-content { margin: 0; }
                `}</style>
                <div className="p-3 font-sans w-[200px]">
                  <div className="text-[12px] font-bold text-blue-500 uppercase border-b border-slate-700 pb-1 mb-2">
                    KEC. {report.address.kecamatan}
                  </div>
                  <div className="text-[11px] leading-relaxed space-y-1">
                    <div><strong>Desa:</strong> {report.address.desa}</div>
                    <div><strong>Status:</strong> <span className={report.status_level === 'tinggi' ? 'text-red-500' : report.status_level === 'sedang' ? 'text-amber-500' : 'text-emerald-500'}>{report.status_level.toUpperCase()}</span></div>
                    <div><strong>Jenis:</strong> {report.disaster_type}</div>
                    <div><strong>Terdampak:</strong> {report.total_people_affected} Jiwa</div>
                  </div>
                  <Link
                    to={`/report/${report.id}`}
                    className="block w-full text-center bg-blue-500 text-white py-1.5 rounded text-[11px] font-bold hover:bg-blue-600 transition-all mt-3"
                  >
                    DETAIL LAPORAN
                  </Link>
                </div>
              </Popup>
            </Marker>
            </React.Fragment>
          ))}
        </MapContainer>
      </section>

      {/* Sidebar Right: Report List */}
      <aside className="w-full md:w-[300px] border-t md:border-t-0 md:border-l border-slate-700 bg-slate-950 flex flex-col shrink-0 overflow-hidden h-[300px] md:h-auto z-10">
        <div className="px-4 py-3 bg-white/5 border-b border-slate-700 text-[12px] font-semibold text-slate-200 uppercase flex justify-between shrink-0">
          Antrean Laporan <span className="text-blue-500">Terbaru</span>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredReports.length === 0 ? (
            <div className="p-6 text-center text-[12px] text-slate-500 italic">
              Belum ada laporan bencana.
            </div>
          ) : (
            filteredReports.map((report) => (
              <div
                key={report.id}
                className="p-3 border-b border-slate-700 hover:bg-blue-500/5 transition-colors cursor-pointer"
                onClick={() => {
                  if (report.location?.lat && report.location?.lng) {
                    mapRef.current?.flyTo([report.location.lat, report.location.lng], 14);
                  }
                }}
              >
                <div className="font-semibold text-[13px] text-slate-100 mb-1">
                  {report.disaster_type} - Desa {report.address.desa}
                </div>
                <div className="text-[11px] text-slate-400 flex justify-between items-center">
                  <span className="font-mono">
                    {report.timestamp?.seconds 
                      ? new Date(report.timestamp.seconds * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
                      : 'Menyimpan...'}
                  </span>
                  <StatusBadge level={report.status_level} />
                </div>
              </div>
            ))
          )}
        </div>
        <div className="p-3 border-t border-slate-700 text-[11px] text-slate-400 shrink-0">
          Pilih laporan aktif untuk melihat detail pendataan warga terdampak.
        </div>
      </aside>
    </div>
  );
}
