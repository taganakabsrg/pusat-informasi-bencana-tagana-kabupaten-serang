import React, { useEffect, useState } from 'react';
import { AlertCircle, Zap } from 'lucide-react';
import { fetchLatestEarthquake } from '../lib/bmkg';
import { BMKGEarthquake } from '../types';

export function BMKGAlertBar() {
  const [earthquake, setEarthquake] = useState<BMKGEarthquake | null>(null);

  useEffect(() => {
    const updateEarthquake = async () => {
      const data = await fetchLatestEarthquake();
      setEarthquake(data);
    };

    updateEarthquake();
    const interval = setInterval(updateEarthquake, 1000 * 60 * 5); // 5 menit
    return () => clearInterval(interval);
  }, []);

  if (!earthquake) return null;

  // Anggap gempa signifikan jika Magnitude >= 5.0 atau dirasakan di Banten
  const isSignificant = parseFloat(earthquake.Magnitude) >= 5.0 || earthquake.Wilayah.toLowerCase().includes('banten');

  if (!isSignificant) return null;

  return (
    <div className="bg-red-600/90 backdrop-blur-sm text-white px-4 py-2 overflow-hidden flex items-center relative z-[1000]">
      <div className="flex items-center gap-2 mr-6 shrink-0">
        <Zap size={16} className="text-yellow-300 animate-pulse" />
        <span className="font-extrabold text-[12px] uppercase tracking-tighter">PERINGATAN DINI GEMPA:</span>
      </div>
      <div className="whitespace-nowrap animate-marquee flex items-center gap-10">
        <span className="text-[13px] font-medium">
          M {earthquake.Magnitude} - {earthquake.Wilayah} ({earthquake.Tanggal} {earthquake.Jam}) | Kedalaman: {earthquake.Kedalaman} | Potensi: {earthquake.Potensi}
        </span>
        <span className="text-[13px] font-medium">
          M {earthquake.Magnitude} - {earthquake.Wilayah} ({earthquake.Tanggal} {earthquake.Jam}) | Kedalaman: {earthquake.Kedalaman} | Potensi: {earthquake.Potensi}
        </span>
      </div>
    </div>
  );
}

export function BMKGEarthquakeCard() {
  const [earthquake, setEarthquake] = useState<BMKGEarthquake | null>(null);

  useEffect(() => {
    const updateEarthquake = async () => {
      const data = await fetchLatestEarthquake();
      setEarthquake(data);
    };
    updateEarthquake();
  }, []);

  if (!earthquake) return null;

  return (
    <div className="bg-slate-800/50 border border-slate-700 p-3 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <AlertCircle size={14} className="text-orange-500" />
        <span className="text-[11px] font-bold uppercase text-slate-400">Info Gempa Terakhir</span>
      </div>
      <div className="space-y-1">
        <div className="text-[13px] font-bold text-white line-clamp-2 leading-tight">
          {earthquake.Wilayah}
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex flex-col">
            <span className="text-[9px] uppercase text-slate-500 font-bold">Magnitudo</span>
            <span className="text-lg font-mono font-black text-orange-500">M {earthquake.Magnitude}</span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-[9px] uppercase text-slate-500 font-bold">Kedalaman</span>
            <span className="text-[13px] font-mono font-bold text-slate-200">{earthquake.Kedalaman}</span>
          </div>
        </div>
        <div className="text-[10px] text-slate-500 font-mono mt-1 pt-1 border-t border-slate-700">
          {earthquake.Tanggal} | {earthquake.Jam}
        </div>
      </div>
    </div>
  );
}
