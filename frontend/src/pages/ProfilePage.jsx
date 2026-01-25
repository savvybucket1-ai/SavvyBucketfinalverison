import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getCurrentUser, getAuthHeader } from '../utils/auth';
import { User, Package, MapPin, LogOut, ChevronRight, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ProfilePage = () => {
    const user = getCurrentUser();
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [activeTab, setActiveTab] = useState('orders'); // 'orders' or 'details'
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }

        if (activeTab === 'orders') {
            setLoading(true);
            axios.get('http://localhost:5000/api/orders/my-orders', { headers: getAuthHeader() })
                .then(res => {
                    setOrders(res.data);
                    setLoading(false);
                })
                .catch(err => {
                    console.error('Error fetching orders:', err);
                    setLoading(false);
                });
        }
    }, [user, navigate, activeTab]);

    if (!user) return null;

    return (
        <div className="min-h-screen bg-slate-50 py-8">
            <div className="max-w-[1440px] mx-auto px-6">
                <div className="flex flex-col md:flex-row gap-8">
                    {/* Sidebar */}
                    <div className="w-full md:w-64 flex-shrink-0">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                            <div className="flex flex-col items-center mb-6">
                                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                                    <User size={32} className="text-primary" />
                                </div>
                                <h2 className="text-lg font-bold text-slate-800">{user.name}</h2>
                                <p className="text-xs text-slate-500">{user.email}</p>
                            </div>

                            <nav className="space-y-2">
                                <button
                                    onClick={() => setActiveTab('orders')}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${activeTab === 'orders' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-600 hover:bg-slate-50'}`}
                                >
                                    <Package size={18} /> My Orders
                                </button>
                                <button
                                    onClick={() => setActiveTab('details')}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${activeTab === 'details' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-600 hover:bg-slate-50'}`}
                                >
                                    <User size={18} /> Profile Details
                                </button>
                                <button
                                    onClick={() => navigate('/login')} // Assuming login handles logout or clear storage
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors"
                                >
                                    <LogOut size={18} /> Logout
                                </button>
                            </nav>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1">
                        {activeTab === 'orders' && (
                            <div>
                                <h1 className="text-2xl font-black text-slate-800 mb-6">My Orders</h1>
                                {loading ? (
                                    <div className="flex justify-center py-12">
                                        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                                    </div>
                                ) : orders.length > 0 ? (
                                    <div className="space-y-4">
                                        {orders.map(order => (
                                            <div key={order._id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                                                <div className="flex flex-col md:flex-row justify-between gap-4 mb-4 border-b border-slate-50 pb-4">
                                                    <div>
                                                        <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Order ID</div>
                                                        <div className="font-mono text-sm font-semibold text-slate-700">#{order._id.slice(-8).toUpperCase()}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Date</div>
                                                        <div className="text-sm font-semibold text-slate-700">{new Date(order.createdAt).toLocaleDateString()}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Total Amount</div>
                                                        <div className="text-lg font-black text-slate-800">₹{order.totalAmount}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Status</div>
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${order.logisticsStatus === 'Delivered' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                                            <Truck size={12} /> {order.logisticsStatus || 'Processing'}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    {/* Start: Fallback Image Logic */}
                                                    <div className="w-16 h-16 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                                                        {order.productId && order.productId.imageUrls && order.productId.imageUrls[0] ? (
                                                            <img src={order.productId.imageUrls[0]} alt={order.productId.title} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                                <Package size={24} />
                                                            </div>
                                                        )}
                                                    </div>
                                                    {/* End: Fallback Image Logic */}
                                                    <div className="flex-1">
                                                        <h3 className="font-bold text-slate-800 mb-1">{order.productId ? order.productId.title : 'Product Unavailable'}</h3>
                                                        <p className="text-sm text-slate-500">Qty: {order.quantity}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-200">
                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Package size={24} className="text-slate-300" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-700 mb-1">No orders yet</h3>
                                        <p className="text-slate-500 text-sm mb-6">When you place an order, it will appear here.</p>
                                        <button onClick={() => navigate('/')} className="px-6 py-2 bg-primary text-white rounded-xl font-bold text-sm">Start Shopping</button>
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
                                            <textarea placeholder="No address saved." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none h-32 resize-none"></textarea>
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
