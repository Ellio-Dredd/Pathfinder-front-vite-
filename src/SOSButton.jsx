import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { Ambulance, X, MapPin, Star, Award, Phone, AlertCircle } from 'lucide-react';

export default function SOSButton() {
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [providers, setProviders] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSOS = () => {
    if (!navigator.geolocation) {
      showError("Geolocation is not supported by your browser.");
      return;
    }
    setLoading(true);
    setProviders([]);
    setErrorMsg("");

    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        // Calling your Python Microservice
        const res = await axios.get(`http://localhost:8001/api/sos/nearby?lat=${position.coords.latitude}&lng=${position.coords.longitude}`);
        
        if (res.data.providers.length === 0) {
          showError("No service stations found within a 5km radius.");
          return;
        }
        
        setProviders(res.data.providers.slice(0, 3));
        setIsModalOpen(true);
      } catch (err) { 
        showError("SOS Service Offline. Please check if Port 8001 is running.");
      }
      setLoading(false);
    }, () => {
      showError("Please allow location access in your browser to use the SOS feature.");
      setLoading(false);
    });
  };

  const showError = (msg) => {
    setErrorMsg(msg);
    setIsModalOpen(true);
    setLoading(false);
  };

  const modalContent = (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[99999] p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-200 bg-gray-50">
          <h2 className="m-0 text-xl font-bold text-gray-800 flex items-center gap-2">
            {errorMsg ? <AlertCircle className="text-red-600" /> : <Ambulance className="text-red-600" />}
            {errorMsg ? "Error" : "Emergency Assistance"}
          </h2>
          <button 
            onClick={() => setIsModalOpen(false)} 
            className="text-gray-500 hover:bg-gray-200 p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X size={24} />
          </button>
        </div>

        {/* Error State */}
        {errorMsg && (
          <div className="p-4 m-6 text-red-700 bg-red-50 rounded-lg border border-red-200 font-medium text-sm">
            {errorMsg}
          </div>
        )}

        {/* Success State (TOPSIS Results) */}
        {!errorMsg && providers.length > 0 && (
          <div className="p-6 overflow-y-auto">
            <p className="text-sm text-gray-500 mb-5 leading-relaxed font-medium">
              Our intelligent system found the best matches nearby based on distance, ratings, and reliability.
            </p>
            
            {providers.map((p, index) => {
              const matchPercentage = (p.topsis_score * 100).toFixed(1);
              const isTopMatch = index === 0;

              return (
                <div 
                  key={index} 
                  className={`bg-white rounded-xl p-4 mb-4 relative transition-all ${
                    isTopMatch ? 'border-2 border-blue-600 shadow-md ring-4 ring-blue-50' : 'border border-gray-200'
                  }`}
                >
                  {isTopMatch && (
                    <div className="absolute -top-3 left-4 bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-full flex items-center gap-1 uppercase tracking-tighter">
                      <Award size={12}/> Best Match
                    </div>
                  )}
                  
                  <div className="flex justify-between items-start mb-3 mt-1">
                    <h3 className="m-0 text-lg font-bold text-gray-800 pr-2 leading-tight">{p.name}</h3>
                    <div className="flex flex-col items-end bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 min-w-[80px]">
                      <span className="text-lg font-black text-blue-700 leading-none">{matchPercentage}%</span>
                      <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest mt-0.5">Match</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-4 mb-3">
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 font-bold">
                      <MapPin size={14} className="text-gray-400"/>
                      <span>{p.distance_km} km away</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 font-bold">
                      <Star size={14} className="text-amber-500 fill-amber-500"/>
                      <span>{p.rating} ({p.user_ratings_total})</span>
                    </div>
                  </div>
                  
                  <div className="text-[11px] text-gray-400 mt-3 border-t border-dashed border-gray-200 pt-3 italic">
                    {p.address}
                  </div>

                  {isTopMatch && (
                    <button className="w-full mt-4 bg-blue-600 hover:bg-blue-700 transition-all text-white border-none py-3 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-100 active:scale-95">
                      <Phone size={18} /> Contact Provider
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <button 
        onClick={handleSOS} 
        disabled={loading}
        className="w-full mt-4 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white font-black py-4 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-red-100 cursor-pointer active:scale-95 text-sm uppercase tracking-wider"
      >
        {loading ? (
          <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
        ) : (
          <Ambulance size={22}/>
        )}
        {loading ? ' Locating...' : ' Roadside Assistance'}
      </button>

      {/* Portal keeps the modal at the top level of the DOM to avoid CSS stacking issues */}
      {isModalOpen && createPortal(modalContent, document.body)}
    </>
  );
}