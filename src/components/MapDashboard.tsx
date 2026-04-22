import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DisasterReport } from '../types';
import { SERANG_CENTER } from '../constants';
import { Link } from 'react-router-dom';
import { Download, Waves, Flame, Wind, Mountain, Activity, TreeDeciduous, Droplets, AlertTriangle } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BMKGAlertBar, BMKGEarthquakeCard } from './BMKGMonitoring';

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

const getDisasterIcon = (type: string, level: string) => {
  const t = type.toLowerCase();
  let IconComponent = AlertTriangle;
  
  if (t.includes('banjir')) IconComponent = Waves;
  else if (t.includes('kebakaran')) IconComponent = Flame;
  else if (t.includes('angin') || t.includes('puting')) IconComponent = Wind;
  else if (t.includes('longsor')) IconComponent = Mountain;
  else if (t.includes('gempa')) IconComponent = Activity;
  else if (t.includes('pohon')) IconComponent = TreeDeciduous;
  else if (t.includes('kering')) IconComponent = Droplets;

  const color = level === 'tinggi' ? '#ef4444' : level === 'sedang' ? '#f59e0b' : '#10b981';
  
  const iconHtml = renderToStaticMarkup(
    <div style={{ 
      color, 
      backgroundColor: 'rgba(15, 23, 42, 0.9)', 
      padding: '6px', 
      borderRadius: '50%', 
      border: `2px solid ${color}`,
      boxShadow: `0 0 15px ${color}44`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <IconComponent size={20} strokeWidth={2.5} />
    </div>
  );

  return L.divIcon({
    html: iconHtml,
    className: 'custom-disaster-icon',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18]
  });
};

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
  const [activeView, setActiveView] = useState<'map' | 'stats'>('map');
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

  // Aggregation for Sub-district (Kecamatan) Stats
  const statsByKecamatan = filteredReports.reduce((acc, r) => {
    const kec = r.address.kecamatan?.trim() || 'Tidak Diketahui';
    const type = r.disaster_type || 'Lainnya';
    
    if (!acc[kec]) {
      acc[kec] = { total: 0, types: {} as Record<string, number> };
    }
    
    acc[kec].total += 1;
    acc[kec].types[type] = (acc[kec].types[type] || 0) + 1;
    
    return acc;
  }, {} as Record<string, { total: number, types: Record<string, number> }>);

  const sortedKecamatans = Object.keys(statsByKecamatan).sort();

  // Global Aggregation (Overall Stats)
  const globalStats = filteredReports.reduce((acc, r) => {
    const type = r.disaster_type || 'Lainnya';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Identify Hotspots (Kecamatan with most reports)
  const hotspots = Object.entries(statsByKecamatan)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 3);

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

        <BMKGEarthquakeCard />

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
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full border-2 border-red-500 bg-slate-900 flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
              </div> 
              <span>Bahaya Tinggi (Merah)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full border-2 border-amber-500 bg-slate-900 flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
              </div> 
              <span>Bahaya Sedang (Kuning)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full border-2 border-emerald-500 bg-slate-900 flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
              </div> 
              <span>Bahaya Rendah (Hijau)</span>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-800 text-[10px] text-slate-500 italic">
              * Ikon akan berubah otomatis sesuai jenis bencana (Api, Banjir, dll)
            </div>
          </div>
        </div>
      </aside>

      {/* Map Area */}
      <section className="flex-1 min-h-[350px] relative bg-[#0c111d] overflow-hidden flex flex-col">
        <BMKGAlertBar />
        
        {/* View Toggle */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[2000] flex bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-full p-1 shadow-2xl">
          <button 
            onClick={() => setActiveView('map')}
            className={`px-5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all ${activeView === 'map' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Peta Visual
          </button>
          <button 
            onClick={() => setActiveView('stats')}
            className={`px-5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all ${activeView === 'stats' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Statistik Wilayah
          </button>
        </div>

        <div className="flex-1 relative">
          {activeView === 'map' ? (
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
                    icon={getDisasterIcon(report.disaster_type, report.status_level)}
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
          ) : (
            <div className="absolute inset-0 bg-slate-900 overflow-y-auto p-4 md:p-8 pt-20 custom-scrollbar">
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex justify-between items-end border-b border-slate-800 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white uppercase tracking-tight">Statistik Bencana Per Kecamatan</h2>
                    <p className="text-slate-400 text-sm mt-1">Rekapitulasi jumlah kejadian berdasarkan laporan yang masuk</p>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-500 uppercase font-black">Periode</div>
                    <div className="text-blue-400 font-mono font-bold">{filterMonth || 'SEMUA WAKTU'}</div>
                  </div>
                </div>

                {/* Global Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg">
                    <h3 className="text-blue-400 text-[10px] font-black uppercase mb-4 tracking-[0.2em] flex items-center gap-2">
                      <Activity size={12} /> Rekapitulasi Jenis Bencana
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.keys(globalStats).length === 0 ? (
                        <div className="text-slate-500 text-xs italic">Belum ada data</div>
                      ) : (
                        Object.entries(globalStats).map(([type, count]) => (
                          <div key={type} className="bg-slate-900 border border-slate-700/50 p-3 rounded-lg flex justify-between items-center group hover:border-blue-500/30 transition-all">
                            <span className="text-[11px] font-bold text-slate-300 uppercase leading-none">{type}</span>
                            <span className="text-lg font-mono font-black text-white leading-none">{count}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg">
                    <h3 className="text-red-400 text-[10px] font-black uppercase mb-4 tracking-[0.2em] flex items-center gap-2">
                      <AlertTriangle size={12} /> Titik Rawan (Hotspot) Wilayah
                    </h3>
                    <div className="space-y-3">
                      {hotspots.length === 0 ? (
                        <div className="text-slate-500 text-xs italic">Belum ada data</div>
                      ) : (
                        hotspots.map(([kec, data], idx) => (
                          <div key={kec} className="bg-slate-900 border border-slate-700/50 p-3 rounded-lg flex items-center gap-4 group hover:border-red-500/30 transition-all">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono font-black text-xs ${idx === 0 ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                              #{idx + 1}
                            </div>
                            <div className="flex-1">
                              <div className="text-[12px] font-black text-white uppercase">{kec}</div>
                              <div className="text-[10px] text-slate-500 font-bold uppercase">{data.total} Kejadian Dilaporkan</div>
                            </div>
                            <div className="flex gap-1">
                              {Object.keys(data.types).slice(0, 2).map(t => (
                                <span key={t} className="px-1.5 py-0.5 bg-slate-800 rounded text-[9px] text-slate-400 uppercase font-bold border border-slate-700">{t}</span>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex items-center gap-2">
                  <div className="h-px bg-slate-800 flex-1"></div>
                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest whitespace-nowrap">Rincian Per Kecamatan</span>
                  <div className="h-px bg-slate-800 flex-1"></div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {sortedKecamatans.length === 0 ? (
                    <div className="py-20 text-center text-slate-500 italic">Tidak ada data untuk periode ini</div>
                  ) : (
                    sortedKecamatans.map(kec => (
                      <div key={kec} className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden shadow-lg group hover:border-blue-500/50 transition-all">
                        <div className="p-4 bg-slate-800/80 flex justify-between items-center border-b border-slate-700/50">
                          <h3 className="font-extrabold text-white text-lg tracking-tight uppercase">Kec. {kec}</h3>
                          <div className="flex items-center gap-2">
                             <span className="text-[10px] uppercase font-bold text-slate-500">Total Kejadian</span>
                             <span className="bg-blue-600 text-white text-xs font-black px-2.5 py-1 rounded-lg min-w-[30px] text-center">{statsByKecamatan[kec].total}</span>
                          </div>
                        </div>
                        <div className="p-4">
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(statsByKecamatan[kec].types).map(([type, count]) => (
                              <div key={type} className="bg-[#0f172a] border border-slate-700 px-3 py-2 rounded-lg flex items-center gap-3">
                                <span className="text-[12px] font-bold text-slate-300 uppercase tracking-tight">{type}</span>
                                <span className="w-[1px] h-3 bg-slate-700 mx-0.5 opacity-20"></span>
                                <span className="text-blue-400 font-mono font-bold">{count}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
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
