import React, { useState } from 'react';
import axios from 'axios';
import { Truck, MapPin, Package, Ruler, IndianRupee, Search, Info, CheckCircle2, AlertCircle } from 'lucide-react';
import { getAuthHeader } from '../utils/auth';
import API_BASE_URL from '../config';

const ShippingCalculator = () => {
    const [calcData, setCalcData] = useState({
        pickupPincode: '',
        deliveryPincode: '',
        weight: '',
        length: '',
        breadth: '',
        height: '',
        cod: 0
    });

    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleCalculate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setResults(null);

        try {
            const res = await axios.post(
                `${API_BASE_URL}/api/shipments/calculate-rates`,
                calcData,
                { headers: getAuthHeader() }
            );
            setResults(res.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to calculate rates. Please check pincodes and try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto">
            <div className="mb-8">
                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center">
                    <Truck className="mr-3 text-primary" size={28} /> Shiprocket Shipping Calculator
                </h2>
                <p className="text-slate-500 font-medium">Get accurate shipping quotes by entering shipment details.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form Section */}
                <div className="lg:col-span-1">
                    <form onSubmit={handleCalculate} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5">
                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center">
                                <MapPin size={14} className="mr-2" /> Route Information
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-1.5 block ml-1">Pickup PIN</label>
                                    <input 
                                        type="text" 
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary font-bold text-slate-700 text-sm"
                                        placeholder="Ex: 110001"
                                        value={calcData.pickupPincode}
                                        onChange={e => setCalcData({...calcData, pickupPincode: e.target.value.replace(/\D/g, '').slice(0, 6)})}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-1.5 block ml-1">Delivery PIN</label>
                                    <input 
                                        type="text" 
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary font-bold text-slate-700 text-sm"
                                        placeholder="Ex: 400001"
                                        value={calcData.deliveryPincode}
                                        onChange={e => setCalcData({...calcData, deliveryPincode: e.target.value.replace(/\D/g, '').slice(0, 6)})}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 pt-2">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center">
                                <Package size={14} className="mr-2" /> Package Details
                            </h3>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1.5 block ml-1">Weight (kg)</label>
                                <input 
                                    type="number" 
                                    step="0.01"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary font-bold text-slate-700 text-sm"
                                    placeholder="Ex: 0.5"
                                    value={calcData.weight}
                                    onChange={e => setCalcData({...calcData, weight: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-1.5 block ml-1">Length (cm)</label>
                                    <input 
                                        type="number" 
                                        className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary font-bold text-slate-700 text-sm"
                                        placeholder="L"
                                        value={calcData.length}
                                        onChange={e => setCalcData({...calcData, length: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-1.5 block ml-1">Width (cm)</label>
                                    <input 
                                        type="number" 
                                        className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary font-bold text-slate-700 text-sm"
                                        placeholder="W"
                                        value={calcData.breadth}
                                        onChange={e => setCalcData({...calcData, breadth: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-1.5 block ml-1">Height (cm)</label>
                                    <input 
                                        type="number" 
                                        className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary font-bold text-slate-700 text-sm"
                                        placeholder="H"
                                        value={calcData.height}
                                        onChange={e => setCalcData({...calcData, height: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4">
                            <button 
                                type="submit"
                                disabled={loading}
                                className="w-full bg-slate-800 text-white py-4 rounded-xl font-black uppercase text-xs shadow-lg hover:bg-slate-900 transition flex items-center justify-center space-x-2 disabled:bg-slate-400"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                                        Calculating...
                                    </>
                                ) : (
                                    <>
                                        <Search size={16} />
                                        <span>Get Shipping Quote</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Results Section */}
                <div className="lg:col-span-2">
                    {!results && !loading && !error && (
                        <div className="bg-slate-100/50 border-2 border-dashed border-slate-200 rounded-2xl h-full flex flex-col items-center justify-center p-12 text-center">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                                <Truck className="text-slate-300" size={32} />
                            </div>
                            <h3 className="font-bold text-slate-500">No Calculation Yet</h3>
                            <p className="text-slate-400 text-sm max-w-xs mt-2">Enter the shipment details and click calculate to see available courier options and rates.</p>
                        </div>
                    )}

                    {loading && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 h-full p-8 flex flex-col items-center justify-center text-center">
                            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
                            <h3 className="font-bold text-slate-700">Fetching Best Rates</h3>
                            <p className="text-slate-400 text-sm mt-2 font-medium">We're checking serviceability with multiple courier partners...</p>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 border border-red-100 rounded-2xl p-8 flex flex-col items-center justify-center text-center text-red-600">
                            <AlertCircle size={48} className="mb-4 opacity-50" />
                            <h3 className="font-bold">Calculation Failed</h3>
                            <p className="text-sm mt-2">{error}</p>
                            <button 
                                onClick={() => setError(null)}
                                className="mt-6 text-xs font-bold uppercase tracking-widest bg-white border border-red-200 px-6 py-2 rounded-lg hover:bg-red-50 transition"
                            >
                                Try Again
                            </button>
                        </div>
                    )}

                    {results && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-[#eff6ff] p-6 rounded-2xl border border-blue-100 relative overflow-hidden group">
                                    <div className="relative z-10 flex justify-between items-start mb-4">
                                        <div className="bg-blue-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded">Cheapest</div>
                                        <IndianRupee size={20} className="text-blue-500" />
                                    </div>
                                    <h4 className="relative z-10 text-2xl font-black text-slate-800">₹{results.cheapest.rate}</h4>
                                    <p className="relative z-10 text-xs font-bold text-slate-500 mt-1">{results.cheapest.name}</p>
                                    <div className="relative z-10 text-[10px] font-bold text-blue-600 mt-3 flex items-center">
                                        <CheckCircle2 size={12} className="mr-1" /> ETD: {results.cheapest.etd}
                                    </div>
                                    <Truck size={80} className="absolute right-[-20px] bottom-[-20px] text-blue-200 opacity-20 group-hover:scale-110 transition-transform" />
                                </div>

                                <div className="bg-[#f0fdf4] p-6 rounded-2xl border border-green-100 relative overflow-hidden group">
                                    <div className="relative z-10 flex justify-between items-start mb-4">
                                        <div className="bg-green-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded">Fastest</div>
                                        <Truck size={20} className="text-green-500" />
                                    </div>
                                    <h4 className="relative z-10 text-2xl font-black text-slate-800">₹{results.fastest.rate}</h4>
                                    <p className="relative z-10 text-xs font-bold text-slate-500 mt-1">{results.fastest.name}</p>
                                    <div className="relative z-10 text-[10px] font-bold text-green-600 mt-3 flex items-center">
                                        <CheckCircle2 size={12} className="mr-1" /> ETD: {results.fastest.etd}
                                    </div>
                                    <Truck size={80} className="absolute right-[-20px] bottom-[-20px] text-green-200 opacity-20 group-hover:scale-110 transition-transform" />
                                </div>
                            </div>

                            {/* Detailed List */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                    <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">Available Couriers</h3>
                                    <span className="text-[10px] font-bold text-slate-400">{results.total_couriers} PARTNERS FOUND</span>
                                </div>
                                <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto custom-scrollbar">
                                    {results.all_couriers.map((courier, idx) => (
                                        <div key={idx} className="p-4 hover:bg-slate-50/50 transition flex items-center justify-between">
                                            <div className="flex items-center space-x-4">
                                                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                                                    <Truck size={20} />
                                                </div>
                                                <div>
                                                    <h5 className="font-black text-slate-700 text-sm">{courier.name}</h5>
                                                    <div className="flex items-center mt-0.5">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-3">ETD: {courier.etd}</span>
                                                        <div className="flex items-center">
                                                            <div className="flex text-yellow-400 mr-1">
                                                                <IndianRupee size={8} />
                                                            </div>
                                                            <span className="text-[10px] font-black text-slate-500">{courier.rating || 'N/A'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right text-lg font-black text-slate-800">
                                                ₹{courier.rate}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center text-slate-400">
                                    <Info size={14} className="mr-2" />
                                    <p className="text-[10px] font-bold uppercase tracking-widest">Rates include base weight and fuel surcharge. Regional taxes extra.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ShippingCalculator;
