import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getCurrentUser, getAuthHeader } from '../utils/auth';
import { User, Package, LogOut, Truck, CheckCircle, Clock, MapPin, ExternalLink, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { generateInvoice } from '../utils/generateInvoice';
import { useNavigate, Link } from 'react-router-dom';
import API_BASE_URL from '../config';

// Logistics status config
const LOGISTICS_STATUS_CONFIG = {
    'pending': { label: 'Order Placed', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: Clock, step: 1 },
    'ready-to-ship': { label: 'Ready to Ship', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Package, step: 2 },
    'awb-assigned': { label: 'Courier Assigned', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: Truck, step: 2 },
    'pickup-scheduled': { label: 'Pickup Scheduled', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Truck, step: 3 },
    'manifest-generated': { label: 'Manifested', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Package, step: 3 },
    'shipped': { label: 'Shipped', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: Truck, step: 4 },
    'in-transit': { label: 'In Transit', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: Truck, step: 4 },
    'delivered': { label: 'Delivered', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle, step: 5 },
    'rto': { label: 'Returned (RTO)', color: 'bg-red-100 text-red-700 border-red-200', icon: Package, step: 3 },
    'cancelled': { label: 'Cancelled', color: 'bg-slate-100 text-slate-500 border-slate-200', icon: Package, step: 0 },
};

// Track steps for order progress bar
const TRACK_STEPS = ['Order Placed', 'Ready to Ship', 'Picked Up', 'In Transit', 'Delivered'];

const TrackingTimeline = ({ awbCode, shipmentData }) => {
    const activities = shipmentData?.trackingHistory || [];
    const currentStatus = shipmentData?.status || '';

    if (!awbCode) return null;

    return (
        <div className="mt-4 pl-1">
            <div className="flex items-center gap-2 mb-3">
                <Truck size={14} className="text-indigo-600" />
                <span className="text-xs font-black text-slate-600 uppercase tracking-wider">Tracking</span>
                <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">{awbCode}</span>
                <a
                    href={`https://shiprocket.co/tracking/${awbCode}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto text-xs text-primary font-bold flex items-center gap-1 hover:underline"
                >
                    Track Live <ExternalLink size={11} />
                </a>
            </div>

            {activities.length > 0 ? (
                <div className="space-y-2 border-l-2 border-slate-100 pl-4">
                    {activities.map((evt, i) => (
                        <div key={i} className="relative">
                            <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-primary border-2 border-white" />
                            <p className="text-xs font-bold text-slate-700">{evt.status || evt.activity}</p>
                            {evt.location && <p className="text-[10px] text-slate-400">📍 {evt.location}</p>}
                            {evt.date && <p className="text-[10px] text-slate-300">{new Date(evt.date).toLocaleString('en-IN')}</p>}
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-xs text-slate-400 italic">Tracking details will appear once the shipment is picked up.</p>
            )}
        </div>
    );
};

const OrderCard = ({ order }) => {
    const [showTracking, setShowTracking] = useState(false);
    const [shipment, setShipment] = useState(null);
    const [loadingShipment, setLoadingShipment] = useState(false);
    const [generatingBill, setGeneratingBill] = useState(false);

    const isDelivered = order.logisticsStatus === 'delivered' || order.orderStatus === 'delivered';

    const handleDownloadBill = async () => {
        setGeneratingBill(true);
        try {
            await generateInvoice(order);
        } catch (err) {
            console.error('Bill generation failed:', err);
            alert('Could not generate bill. Please try again.');
        } finally {
            setGeneratingBill(false);
        }
    };

    const statusCfg = LOGISTICS_STATUS_CONFIG[order.logisticsStatus] || LOGISTICS_STATUS_CONFIG['pending'];
    const StatusIcon = statusCfg.icon;
    const currentStep = statusCfg.step;

    const isShipped = ['shipped', 'in-transit', 'delivered'].includes(order.logisticsStatus);

    const fetchShipment = async () => {
        if (shipment) return; // already loaded
        try {
            setLoadingShipment(true);
            const res = await axios.get(`${API_BASE_URL}/api/shipments/order/${order._id}`, {
                headers: getAuthHeader()
            });
            if (res.data && res.data.length > 0) {
                setShipment(res.data[0]);
            }
        } catch (err) {
            console.error('Error fetching shipment:', err);
        } finally {
            setLoadingShipment(false);
        }
    };

    const handleToggleTracking = () => {
        if (!showTracking && !shipment) fetchShipment();
        setShowTracking(prev => !prev);
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {/* Order Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 px-6 py-4 border-b border-slate-50 bg-slate-50/50">
                <div className="flex items-center gap-4">
                    <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Order ID</div>
                        <div className="font-mono text-sm font-black text-slate-700">#{order._id.slice(-8).toUpperCase()}</div>
                    </div>
                    <div className="hidden sm:block w-px h-8 bg-slate-200" />
                    <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Date</div>
                        <div className="text-sm font-semibold text-slate-600">
                            {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                    </div>
                    <div className="hidden sm:block w-px h-8 bg-slate-200" />
                    <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Amount</div>
                        <div className="text-sm font-black text-slate-800">₹{order.totalAmount?.toLocaleString()}</div>
                    </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black border ${statusCfg.color}`}>
                    <StatusIcon size={12} />
                    {statusCfg.label}
                </span>
            </div>

            {/* Progress Bar */}
            {order.logisticsStatus !== 'cancelled' && (
                <div className="px-6 py-3 border-b border-slate-50">
                    <div className="flex items-center justify-between relative">
                        <div className="absolute left-0 right-0 top-2.5 h-0.5 bg-slate-100 z-0" />
                        <div
                            className="absolute left-0 top-2.5 h-0.5 bg-primary z-0 transition-all duration-700"
                            style={{ width: `${Math.min(((currentStep - 1) / 4) * 100, 100)}%` }}
                        />
                        {TRACK_STEPS.map((step, i) => {
                            const done = currentStep > i + 1;
                            const active = currentStep === i + 1;
                            return (
                                <div key={step} className="flex flex-col items-center z-10">
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${done ? 'bg-primary border-primary' : active ? 'bg-white border-primary' : 'bg-white border-slate-200'}`}>
                                        {done && <CheckCircle size={10} className="text-white fill-white" />}
                                        {active && <div className="w-2 h-2 bg-primary rounded-full" />}
                                    </div>
                                    <span className={`text-[8px] font-black uppercase mt-1.5 hidden sm:block ${done || active ? 'text-primary' : 'text-slate-300'}`}>
                                        {step}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Product Info */}
            <div className="px-6 py-4">
                {order.productId ? (
                    <Link to={`/product/${order.productId._id}`} className="flex items-center gap-4 group">
                        <div className="w-14 h-14 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0 border border-slate-200 group-hover:opacity-80 transition-opacity">
                            {order.productId.imageUrls?.[0] ? (
                                <img src={order.productId.imageUrls[0]} alt={order.productId.title} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300"><Package size={24} /></div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-slate-800 mb-0.5 group-hover:text-primary transition-colors text-sm">{order.productId.title}</h3>
                            <p className="text-xs text-slate-400 font-semibold">Qty: {order.quantity}</p>
                            {order.selectedVariation && Object.keys(order.selectedVariation).length > 0 && (
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {Object.entries(order.selectedVariation).map(([k, v]) => `${k}: ${v}`).join(' • ')}
                                </p>
                            )}
                        </div>
                    </Link>
                ) : (
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center border border-slate-200">
                            <Package size={24} className="text-slate-300" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-500">Product Unavailable</h3>
                            <p className="text-xs text-slate-400">Qty: {order.quantity}</p>
                        </div>
                    </div>
                )}

                {/* Shipping address snippet */}
                {order.shippingAddress && (
                    <div className="mt-3 flex items-start gap-2 text-xs text-slate-400">
                        <MapPin size={12} className="flex-shrink-0 mt-0.5 text-slate-300" />
                        <span className="font-semibold">
                            {[
                                order.shippingAddress.addressLine1,
                                order.shippingAddress.city,
                                order.shippingAddress.state,
                                order.shippingAddress.pinCode
                            ].filter(Boolean).join(', ')}
                        </span>
                    </div>
                )}

                {/* Tracking toggle - show for shipped+ or when AWB exists */}
                {(isShipped || ['awb-assigned', 'pickup-scheduled', 'manifest-generated'].includes(order.logisticsStatus)) && (
                    <button
                        onClick={handleToggleTracking}
                        className="mt-4 flex items-center gap-2 text-xs font-black text-primary hover:underline"
                    >
                        <Truck size={13} />
                        {showTracking ? 'Hide Tracking' : 'Track Shipment'}
                        {showTracking ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                )}

                {showTracking && (
                    <div className="mt-2">
                        {loadingShipment ? (
                            <p className="text-xs text-slate-400 animate-pulse mt-2">Loading tracking info...</p>
                        ) : shipment ? (
                            <TrackingTimeline awbCode={shipment.awbCode} shipmentData={shipment} />
                        ) : (
                            <p className="text-xs text-slate-400 mt-2 italic">Tracking information not available yet.</p>
                        )}
                    </div>
                )}

                {/* ── Download Bill Button (shown only after delivery) ── */}
                {isDelivered && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                        <button
                            onClick={handleDownloadBill}
                            disabled={generatingBill}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black
                                       bg-gradient-to-r from-green-700 to-green-600 text-white
                                       shadow-md shadow-green-700/25 hover:from-green-800 hover:to-green-700
                                       active:scale-95 transition-all duration-150
                                       disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {generatingBill ? (
                                <>
                                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Download size={13} />
                                    Download Tax Invoice
                                </>
                            )}
                        </button>
                        <p className="text-[10px] text-slate-400 mt-1.5">
                            Order delivered · PDF bill ready
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

const ProfilePage = () => {
    const user = getCurrentUser();
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [activeTab, setActiveTab] = useState('orders');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }

        if (activeTab === 'orders') {
            setLoading(true);
            axios.get(`${API_BASE_URL}/api/orders/my-orders`, { headers: getAuthHeader() })
                .then(res => {
                    setOrders(res.data);
                    setLoading(false);
                })
                .catch(err => {
                    console.error('Error fetching orders:', err);
                    setLoading(false);
                });
        }
    }, [user?.email, navigate, activeTab]);

    if (!user) return null;

    return (
        <div className="min-h-screen bg-slate-50 py-8">
            <div className="max-w-[1440px] mx-auto px-4 md:px-6">
                <div className="flex flex-col md:flex-row gap-6">
                    {/* Sidebar */}
                    <div className="w-full md:w-64 flex-shrink-0">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sticky top-20">
                            <div className="flex flex-col items-center mb-6">
                                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                                    <User size={32} className="text-primary" />
                                </div>
                                <h2 className="text-lg font-bold text-slate-800">{user.name}</h2>
                                <p className="text-xs text-slate-500 text-center">{user.email}</p>
                            </div>

                            <nav className="space-y-2">
                                <button
                                    onClick={() => setActiveTab('orders')}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${activeTab === 'orders' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-600 hover:bg-slate-50'}`}
                                >
                                    <Package size={18} /> My Orders
                                    {orders.length > 0 && (
                                        <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-black ${activeTab === 'orders' ? 'bg-white/20' : 'bg-slate-200 text-slate-500'}`}>
                                            {orders.length}
                                        </span>
                                    )}
                                </button>
                                <button
                                    onClick={() => setActiveTab('details')}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${activeTab === 'details' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-600 hover:bg-slate-50'}`}
                                >
                                    <User size={18} /> Profile Details
                                </button>
                                <button
                                    onClick={() => { localStorage.clear(); navigate('/login'); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors"
                                >
                                    <LogOut size={18} /> Logout
                                </button>
                            </nav>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 min-w-0">
                        {activeTab === 'orders' && (
                            <div>
                                <div className="flex items-center justify-between mb-6">
                                    <h1 className="text-2xl font-black text-slate-800">My Orders</h1>
                                    {orders.length > 0 && (
                                        <span className="text-xs font-bold text-slate-400">{orders.length} order{orders.length !== 1 ? 's' : ''}</span>
                                    )}
                                </div>

                                {loading ? (
                                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                                        <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full" />
                                        <p className="text-sm text-slate-400 font-semibold">Loading your orders...</p>
                                    </div>
                                ) : orders.length > 0 ? (
                                    <div className="space-y-4">
                                        {orders.map(order => (
                                            <OrderCard key={order._id} order={order} />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-200">
                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Package size={24} className="text-slate-300" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-700 mb-1">No orders yet</h3>
                                        <p className="text-slate-500 text-sm mb-6">When you place an order, it will appear here.</p>
                                        <button onClick={() => navigate('/')} className="px-6 py-2 bg-primary text-white rounded-xl font-bold text-sm hover:bg-blue-600 transition-colors">
                                            Start Shopping
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'details' && (
                            <div>
                                <h1 className="text-2xl font-black text-slate-800 mb-6">Profile Details</h1>
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
                                            <input type="text" value={user.name} readOnly className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                                            <input type="email" value={user.email} readOnly className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Shipping Address</label>
                                            <textarea placeholder="No address saved." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none h-32 resize-none" />
                                        </div>
                                        <div className="md:col-span-2 flex justify-end">
                                            <button className="px-6 py-3 bg-slate-800 text-white rounded-xl font-bold text-sm hover:bg-slate-900 transition-colors">
                                                Save Changes
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
