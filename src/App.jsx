import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, Tooltip } from 'react-leaflet';
import axios from 'axios';
import { supabase } from './supabaseClient';
import Auth from './Auth';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { 
  MapPin, Navigation, Clock, Trash2, Plus, 
  AlertTriangle, CheckCircle, LogOut, Ambulance, Edit3, Search, X, Map as MapIcon ,LocateFixed
} from 'lucide-react';
import SOSButton from './SOSButton';

// Fix Leaflet icons for Vite/React 19
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

function AddPointHandler({ onMapClick }) {
  useMapEvents({ click(e) { onMapClick(e.latlng); } });
  return null;
}

function App() {
  const [session, setSession] = useState(null);
  const [activeTab, setActiveTab] = useState('daily');
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [locations, setLocations] = useState([]);
  const [newPoint, setNewPoint] = useState({ lat: null, lng: null });
  const [newName, setNewName] = useState("");
  const [newOpen, setNewOpen] = useState(8);
  const [newClose, setNewClose] = useState(20);
  const [relocateId, setRelocateId] = useState(null);
  const [route, setRoute] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  // --- HANDLERS ---
const handleMapClick = async (latlng) => {
  if (relocateId) {
    setLocations(locations.map(loc => loc.id === relocateId ? { ...loc, lat: latlng.lat, lng: latlng.lng } : loc));
    setRelocateId(null); 
    return;
  }

  setNewPoint(latlng);
  setNewName("Loading address...");

  try {
    // Point this to YOUR Python backend (Port 8000)
    const res = await axios.get(`${API_BASE_URL}/api/geocoder/reverse`, {
      params: {
        lat: latlng.lat,
        lon: latlng.lng
      }
    });

    if (res.data && res.data.address) {
      const addr = res.data.address;
      const smartName = addr.amenity || addr.shop || addr.tourism || addr.building || addr.road || addr.suburb || "New Stop";
      setNewName(smartName);
    } else {
      setNewName("New Stop");
    }
  } catch (error) {
    console.error("Geocoding failed via Proxy:", error);
    setNewName("New Stop"); 
  }
};

  useEffect(() => {
    if (searchQuery.length < 3) { setSearchResults([]); return; }
    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { data } = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${searchQuery}&countrycodes=lk&limit=5`);
        setSearchResults(data);
      } catch (error) { console.error(error); }
      setIsSearching(false);
    }, 600);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const selectSearchResult = (place) => {
    setNewPoint({ lat: parseFloat(place.lat), lng: parseFloat(place.lon) });
    setNewName(place.display_name.split(',')[0]);
    setSearchResults([]);
    setSearchQuery("");
  };

  const confirmAddPoint = () => {
    if (!newPoint.lat) return;
    const newLocation = {
      id: Date.now().toString(),
      name: newName, lat: newPoint.lat, lng: newPoint.lng,
      open_time: parseInt(newOpen), close_time: parseInt(newClose)
    };
    setLocations([...locations, newLocation]);
    setNewPoint({ lat: null, lng: null });
  };

  const handleOptimize = async () => {
    if (locations.length < 2) return alert("Add at least a start point and one destination!");
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/optimize`,  { mode: activeTab, locations });
      setRoute(res.data.route_shape); 
      setLocations(res.data.optimized_stops);
    } catch (err) { alert("Backend error!"); }
    setLoading(false);
  };

  if (!session) return <Auth />;

  return (
    <div className="flex flex-col-reverse md:flex-row h-screen w-full overflow-hidden bg-slate-50 font-sans">
      
      {/* --- SIDEBAR --- */}
      <aside className="w-full md:w-[420px] h-[65vh] md:h-screen bg-white shadow-2xl z-[1000] flex flex-col rounded-t-[32px] md:rounded-none">
        
        {/* Mobile Handle */}
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 mb-1 md:hidden" />

        <div className="p-6 flex flex-col h-full overflow-hidden">
          
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2 text-2xl font-black text-slate-800 italic">
              <Navigation className="text-blue-600" fill="currentColor" size={28} /> Pathfinder
            </div>
            <button onClick={() => supabase.auth.signOut()} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
              <LogOut size={20} />
            </button>
          </div>

          {/* Mode Switcher */}
          <div className="flex p-1 bg-slate-100 rounded-2xl mb-6">
            <button 
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === 'daily' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
              onClick={() => setActiveTab('daily')}
            >
              Daily Planner
            </button>
            <button 
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === 'tourist' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
              onClick={() => setActiveTab('tourist')}
            >
              Tourist Mode
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative mb-6">
            <div className="flex items-center bg-slate-100 rounded-2xl px-4 py-1 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
              <Search size={18} className="text-slate-400" />
              <input 
                type="text" 
                placeholder="Search Sri Lanka..." 
                className="w-full p-3 bg-transparent border-none outline-none text-sm font-medium"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {isSearching && <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />}
            </div>

            {/* Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-slate-100 rounded-2xl mt-2 shadow-xl z-[1001] max-h-60 overflow-y-auto overflow-x-hidden">
                {searchResults.map((result) => (
                  <div 
                    key={result.place_id} 
                    onClick={() => selectSearchResult(result)}
                    className="p-4 border-b border-slate-50 cursor-pointer hover:bg-blue-50 transition-colors"
                  >
                    <div className="text-sm font-bold text-slate-800 truncate">{result.display_name.split(',')[0]}</div>
                    <div className="text-[10px] text-slate-400 truncate">{result.display_name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form / Alerts Area */}
          <div className="overflow-y-auto flex-grow space-y-4 pr-1 custom-scrollbar">
            
            {/* Relocate UI */}
            {relocateId && (
              <div className="bg-amber-50 border border-amber-200 text-amber-700 p-4 rounded-2xl text-xs font-bold flex items-center gap-3 animate-pulse">
                <MapPin size={18} /> Click map to move Start point
              </div>
            )}

            {/* Add Form */}
            {newPoint.lat && (
              <div className="bg-blue-50 border border-blue-100 p-5 rounded-3xl space-y-4 shadow-sm">
                <h4 className="text-blue-800 text-xs font-black uppercase tracking-widest flex items-center gap-2">
                  {locations.length === 0 ? <LocateFixed size={16}/> : <Plus size={16}/>}
                  {locations.length === 0 ? "Set Start" : "Add Stop"}
                </h4>
                <input 
                  className="w-full p-3 rounded-xl border-none text-sm font-bold text-slate-700 shadow-inner"
                  value={newName} 
                  onChange={(e) => setNewName(e.target.value)} 
                />
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block ml-1">Open</label>
                    <input type="number" className="w-full p-2 rounded-lg border-none text-sm font-bold" value={newOpen} onChange={e=>setNewOpen(e.target.value)} />
                  </div>
                  <div className="flex-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block ml-1">Close</label>
                    <input type="number" className="w-full p-2 rounded-lg border-none text-sm font-bold" value={newClose} onChange={e=>setNewClose(e.target.value)} />
                  </div>
                </div>
                <button 
                  className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                  onClick={confirmAddPoint}
                >
                  <CheckCircle size={18}/> Confirm
                </button>
              </div>
            )}

            {/* Location List */}
            <div className="space-y-3">
              {locations.length === 0 && !newPoint.lat && (
                <div className="text-center py-10 opacity-30">
                  <MapIcon size={48} className="mx-auto mb-2 text-slate-400" />
                  <p className="text-xs font-bold uppercase tracking-widest">Map is empty</p>
                </div>
              )}

              {locations.map((loc, i) => (
                <div 
                  key={loc.id} 
                  className={`bg-white border p-4 rounded-2xl transition-all relative ${i === 0 ? 'border-l-4 border-l-blue-600 border-blue-100' : (loc.violation ? 'border-l-4 border-l-red-500 border-red-100' : 'border-slate-100 hover:shadow-md')}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-md h-fit ${i === 0 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                        {i === 0 ? 'START' : i + 1}
                      </span>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">{loc.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock size={12} className="text-slate-400" />
                          <span className="text-[10px] text-slate-500 font-bold uppercase">
                            {loc.arrival_time ? `Arrive: ${loc.arrival_time}` : `${loc.open_time}:00 - ${loc.close_time}:00`}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {i === 0 && (
                        <button onClick={() => setRelocateId(loc.id)} className="p-1.5 text-slate-300 hover:text-amber-500"><Edit3 size={16}/></button>
                      )}
                      {i > 0 && (
                        <button onClick={() => setAsStart(loc.id)} className="p-1.5 text-slate-300 hover:text-blue-500"><Navigation size={16}/></button>
                      )}
                      <button onClick={() => setLocations(locations.filter(l => l.id !== loc.id))} className="p-1.5 text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="mt-auto pt-6 space-y-3">
            <button 
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white font-bold py-4 rounded-2xl shadow-xl shadow-blue-100 flex items-center justify-center gap-2 transition-all active:scale-95"
              onClick={handleOptimize}
              disabled={loading || locations.length < 2}
            >
              {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Navigation size={20}/>}
              {loading ? 'Thinking...' : 'Optimize Smart Route'}
            </button>
            <SOSButton />
          </div>
        </div>
      </aside>

      {/* --- MAP SECTION --- */}
      <main className="flex-grow h-[35vh] md:h-screen relative z-0">
        <MapContainer center={[6.9271, 79.8612]} zoom={13} zoomControl={false} className="h-full w-full">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <AddPointHandler onMapClick={handleMapClick} />
          
          {locations.map((loc, i) => (
            <Marker key={loc.id} position={[loc.lat, loc.lng]}>
              <Tooltip direction="top" offset={[0, -20]} opacity={1} permanent className="bg-blue-600 text-white border-none rounded-lg font-bold text-[10px] px-2 py-0.5 shadow-lg">
                {i === 0 ? "Start" : i + 1}
              </Tooltip>
              <Popup className="font-bold">{loc.name}</Popup>
            </Marker>
          ))}

          {newPoint.lat && <Marker position={[newPoint.lat, newPoint.lng]} opacity={0.6} />}
          {route.length > 0 && <Polyline positions={route} color="#2563EB" weight={5} opacity={0.8} />}
        </MapContainer>

        {/* Global UI Overlays */}
        {relocateId && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-amber-500 text-white px-6 py-2 rounded-full font-black text-xs shadow-2xl z-[1002] flex items-center gap-3">
             <MapPin size={16} /> CLICK MAP TO RE-POSITION START
          </div>
        )}
      </main>
    </div>
  );
}

export default App;