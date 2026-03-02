import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getAuthHeader } from '../utils/auth';
import { Package, Truck, FileText, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';
import API_BASE_URL from '../config';

const ShipmentManager = ({ orderId, onClose, onUpdate }) => {
    const [loading, setLoading] = useState(true);
    const [shipment, setShipment] = useState(null);
    const [dims, setDims] = useState({ weight: 0.5, length: 10, breadth: 10, height: 10 });
    const [pickupLocation, setPickupLocation] = useState('Primary');
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchData();
    }, [orderId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            // 1. Fetch existing shipment for this order
            const shipmentRes = await axios.get(`${API_BASE_URL}/api/shipments/order/${orderId}`, {
                headers: getAuthHeader()
            });

            if (shipmentRes.data && shipmentRes.data.length > 0) {
                setShipment(shipmentRes.data[0]);
            } else {
                // 2. No shipment yet – fetch the order to pre-fill dims from product tier pricing
                const orderRes = await axios.get(`${API_BASE_URL}/api/orders/${orderId}`, {
                    headers: getAuthHeader()
                });
                const order = orderRes.data;

                // Pre-fill pickup location from seller profile
                try {
                    const profileRes = await axios.get(`${API_BASE_URL}/api/auth/profile`, { headers: getAuthHeader() });
                    if (profileRes.data?.shiprocketNickname) {
                        setPickupLocation(profileRes.data.shiprocketNickname);
                    }
                } catch (_) { /* use default 'Primary' */ }

                if (order && order.productId) {
                    const qty = order.quantity;
                    let weight = order.productId.weight || 0.5;
                    let length = order.productId.dimensions?.length || 10;
                    let breadth = order.productId.dimensions?.breadth || 10;
                    let height = order.productId.dimensions?.height || 10;

                    if (order.productId.tieredPricing && order.productId.tieredPricing.length > 0) {
                        const sortedTiers = [...order.productId.tieredPricing].sort((a, b) => b.moq - a.moq);
                        const tier = sortedTiers.find(t => qty >= t.moq);
                        if (tier) {
                            const multiplier = Math.max(1, qty / tier.moq);
                            weight = (tier.weight || weight) * multiplier;
                            length = tier.length || length;
                            breadth = tier.breadth || breadth;
                            height = tier.height || height;
                        }
                    }

                    setDims({
                        weight: parseFloat(weight.toFixed(2)),
                        length: parseFloat(length) || 10,
                        breadth: parseFloat(breadth) || 10,
                        height: parseFloat(height) || 10
                    });
                }
            }
        } catch (err) {
            console.error('ShipmentManager fetchData error:', err);
            setError(err.response?.data?.error || err.message || 'Failed to load shipment data');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateOrder = async () => {
        if (!pickupLocation.trim()) {
            setError('Please enter your ShipRocket Pickup Location Nickname.');
            return;
        }
        try {
            setProcessing(true);
            setError(null);
            const res = await axios.post(`${API_BASE_URL}/api/shipments/create-order`, {
                orderId,
                ...dims,
                pickupLocation: pickupLocation.trim()
            }, { headers: getAuthHeader() });
            setShipment(res.data.shipment);
            if (onUpdate) onUpdate();
            alert('✅ Shipment created on ShipRocket!');
        } catch (err) {
            const msg = err.response?.data?.error || err.response?.data?.message || err.message;
            setError(msg);
        } finally {
            setProcessing(false);
        }
    };

    const handleGenerateAWB = async () => {
        try {
            setProcessing(true);
            setError(null);
            const res = await axios.post(`${API_BASE_URL}/api/shipments/generate-awb`, {
                shipmentId: shipment._id  // Our DB shipment ID – backend looks up shipmentId
            }, { headers: getAuthHeader() });
            const awb = res.data?.data?.response?.data?.awb_code;
            if (awb) {
                alert('✅ AWB Assigned: ' + awb);
            } else {
                alert('✅ AWB generation initiated. Refresh to see AWB code.');
            }
            fetchData();
            if (onUpdate) onUpdate();
        } catch (err) {
            const msg = err.response?.data?.error || err.response?.data?.message || err.message;
            setError(msg);
        } finally {
            setProcessing(false);
        }
    };

    const handleRequestPickup = async () => {
        try {
            setProcessing(true);
            setError(null);
            await axios.post(`${API_BASE_URL}/api/shipments/request-pickup`, {
                shipmentId: shipment._id
            }, { headers: getAuthHeader() });
            alert('✅ Pickup Scheduled with courier!');
            fetchData();
            if (onUpdate) onUpdate();
        } catch (err) {
            const msg = err.response?.data?.error || err.response?.data?.message || err.message;
            setError(msg);
        } finally {
            setProcessing(false);
        }
    };

    const handleGenerateLabel = async () => {
        try {
            setProcessing(true);
            setError(null);
            const res = await axios.post(`${API_BASE_URL}/api/shipments/generate-label`, {
                shipmentId: shipment._id
            }, { headers: getAuthHeader() });
            if (res.data.labelUrl) {
                window.open(res.data.labelUrl, '_blank');
            } else {
                alert('Label generated but URL not available yet. Check ShipRocket dashboard.');
            }
            fetchData();
        } catch (err) {
            const msg = err.response?.data?.error || err.response?.data?.message || err.message;
            setError(msg);
        } finally {
            setProcessing(false);
        }
    };

    const handleGenerateManifest = async () => {
        try {
            setProcessing(true);
            setError(null);
            const res = await axios.post(`${API_BASE_URL}/api/shipments/generate-manifest`, {
                shipmentId: shipment._id
            }, { headers: getAuthHeader() });
            if (res.data.manifestUrl) {
                window.open(res.data.manifestUrl, '_blank');
            } else {
                alert('Manifest generated. Check ShipRocket dashboard.');
            }
            fetchData();
        } catch (err) {
            const msg = err.response?.data?.error || err.response?.data?.message || err.message;
            setError(msg);
        } finally {
            setProcessing(false);
        }
    };

    // Helper: status badge color
    const statusColor = (status) => {
        const s = (status || '').toLowerCase();
        if (s.includes('delivered')) return 'bg-green-100 text-green-700';
        if (s.includes('transit') || s.includes('shipped')) return 'bg-indigo-100 text-indigo-700';
        if (s.includes('pickup')) return 'bg-yellow-100 text-yellow-700';
        if (s.includes('awb')) return 'bg-purple-100 text-purple-700';
        if (s.includes('placed')) return 'bg-blue-100 text-blue-700';
        return 'bg-slate-100 text-slate-600';
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
                >
                    <X size={20} />
                </button>

                <h2 className="text-xl font-black text-slate-800 mb-1 flex items-center gap-2">
                    <Truck className="text-primary" size={22} />
                    Shipment Manager
                </h2>
                <p className="text-xs text-slate-400 font-semibold mb-6">Order #{orderId.slice(-8).toUpperCase()}</p>

                {error && (
                    <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-4 flex items-start gap-3">
                        <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-sm font-bold text-red-700">Error</p>
                            <p className="text-xs text-red-500 mt-0.5">{error}</p>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <Loader2 className="animate-spin text-primary" size={32} />
                        <p className="text-sm text-slate-400 font-semibold">Loading shipment data...</p>
                    </div>
                ) : !shipment ? (
                    /* ── Create Shipment ── */
                    <div className="space-y-4">
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                            <p className="text-sm text-blue-800 font-bold">📦 No shipment created yet</p>
                            <p className="text-xs text-blue-600 mt-1">Confirm the pickup address and package dimensions to create a ShipRocket order.</p>
                        </div>

                        {/* Pickup Location — auto from profile */}
                        {pickupLocation && pickupLocation !== 'Primary' ? (
                            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
                                <span className="text-green-600 mt-0.5">✅</span>
                                <div>
                                    <p className="text-[10px] font-black uppercase text-green-700 mb-0.5">📍 Pickup Location</p>
                                    <p className="text-sm font-black text-green-800">{pickupLocation}</p>
                                    <p className="text-[10px] text-green-600 mt-0.5">Registered address from your profile · used automatically</p>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                                <p className="text-[10px] font-black uppercase text-amber-700 mb-1">⚠️ No Pickup Address Configured</p>
                                <p className="text-xs text-amber-700 leading-relaxed">
                                    You haven't registered a pickup address yet. Go to your{' '}
                                    <button onClick={onClose} className="underline font-black hover:text-amber-900">
                                        Seller Profile → Pickup Address tab
                                    </button>{' '}
                                    to add your address and register it with ShipRocket. This is a one-time setup.
                                </p>
                                <p className="text-[10px] text-amber-600 mt-2">Orders will fallback to "Primary" if no address is set.</p>
                            </div>
                        )}

                        {/* Package Dimensions */}
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Package Dimensions</p>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: 'Weight (kg)', key: 'weight', step: 0.1 },
                                    { label: 'Length (cm)', key: 'length', step: 1 },
                                    { label: 'Breadth (cm)', key: 'breadth', step: 1 },
                                    { label: 'Height (cm)', key: 'height', step: 1 },
                                ].map(({ label, key, step }) => (
                                    <div key={key}>
                                        <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">{label}</label>
                                        <input
                                            type="number"
                                            step={step}
                                            min={0.1}
                                            value={dims[key]}
                                            onChange={e => setDims({ ...dims, [key]: parseFloat(e.target.value) || 0 })}
                                            className="w-full p-2.5 border border-slate-200 rounded-lg font-bold text-slate-700 text-sm focus:outline-none focus:border-primary"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={handleCreateOrder}
                            disabled={processing}
                            className="w-full bg-primary text-white py-3 rounded-xl font-black uppercase tracking-widest hover:bg-blue-600 transition flex items-center justify-center gap-2 disabled:opacity-60"
                        >
                            {processing ? <Loader2 className="animate-spin" size={18} /> : <><Package size={16} /> Create ShipRocket Order</>}
                        </button>
                    </div>

                ) : (
                    /* ── Shipment Details & Actions ── */
                    <div className="space-y-5">
                        {/* Shipment Info */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div className="grid grid-cols-2 gap-y-4 text-sm">
                                <div>
                                    <span className="text-[10px] uppercase font-black text-slate-400 block mb-0.5">Status</span>
                                    <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${statusColor(shipment.status)}`}>
                                        {shipment.status}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] uppercase font-black text-slate-400 block mb-0.5">Courier</span>
                                    <span className="font-bold text-slate-800 text-xs">{shipment.courierName || '—'}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] uppercase font-black text-slate-400 block mb-0.5">AWB Code</span>
                                    <span className="font-bold text-slate-800 font-mono text-xs">{shipment.awbCode || '—'}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] uppercase font-black text-slate-400 block mb-0.5">SR Shipment ID</span>
                                    <span className="font-bold text-slate-800 font-mono text-xs">{shipment.shipmentId || '—'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-3">
                            {!shipment.awbCode && (
                                <button
                                    onClick={handleGenerateAWB}
                                    disabled={processing}
                                    className="bg-purple-600 text-white p-3 rounded-xl font-bold text-xs uppercase hover:bg-purple-700 flex items-center justify-center gap-2 col-span-2 disabled:opacity-60"
                                >
                                    {processing ? <Loader2 size={14} className="animate-spin" /> : <><Package size={14} /> Generate AWB (Assign Courier)</>}
                                </button>
                            )}

                            {shipment.awbCode && !shipment.status?.toLowerCase().includes('pickup') && !shipment.status?.toLowerCase().includes('shipped') && (
                                <button
                                    onClick={handleRequestPickup}
                                    disabled={processing}
                                    className="bg-orange-500 text-white p-3 rounded-xl font-bold text-xs uppercase hover:bg-orange-600 flex items-center justify-center gap-2 col-span-2 disabled:opacity-60"
                                >
                                    {processing ? <Loader2 size={14} className="animate-spin" /> : <><Truck size={14} /> Request Courier Pickup</>}
                                </button>
                            )}

                            {shipment.awbCode && (
                                <button
                                    onClick={handleGenerateLabel}
                                    disabled={processing}
                                    className="bg-slate-700 text-white p-3 rounded-xl font-bold text-xs uppercase hover:bg-slate-800 flex items-center justify-center gap-2 disabled:opacity-60"
                                >
                                    {processing ? <Loader2 size={14} className="animate-spin" /> : <><FileText size={14} /> Download Label</>}
                                </button>
                            )}

                            {shipment.awbCode && (
                                <button
                                    onClick={handleGenerateManifest}
                                    disabled={processing}
                                    className="bg-slate-600 text-white p-3 rounded-xl font-bold text-xs uppercase hover:bg-slate-700 flex items-center justify-center gap-2 disabled:opacity-60"
                                >
                                    {processing ? <Loader2 size={14} className="animate-spin" /> : <><FileText size={14} /> Download Manifest</>}
                                </button>
                            )}

                            {shipment.awbCode && (
                                <a
                                    href={`https://shiprocket.co/tracking/${shipment.awbCode}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-green-600 text-white p-3 rounded-xl font-bold text-xs uppercase hover:bg-green-700 flex items-center justify-center gap-2 col-span-2"
                                >
                                    <CheckCircle size={14} /> Track on ShipRocket
                                </a>
                            )}
                        </div>

                        {/* Tracking History */}
                        {shipment.trackingHistory && shipment.trackingHistory.length > 0 && (
                            <div>
                                <h4 className="text-[10px] font-black uppercase text-slate-400 mb-3">Tracking History</h4>
                                <div className="space-y-2">
                                    {shipment.trackingHistory.map((evt, i) => (
                                        <div key={i} className="flex items-start gap-3 text-xs">
                                            <div className="w-2 h-2 rounded-full bg-primary mt-1 flex-shrink-0" />
                                            <div>
                                                <p className="font-bold text-slate-700">{evt.status}</p>
                                                {evt.activity && <p className="text-slate-400">{evt.activity}</p>}
                                                {evt.location && <p className="text-slate-400">📍 {evt.location}</p>}
                                                <p className="text-slate-300">{evt.date ? new Date(evt.date).toLocaleString() : ''}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ShipmentManager;
