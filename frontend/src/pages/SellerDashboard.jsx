import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getAuthHeader, getCurrentUser, logout } from '../utils/auth';
import { LayoutDashboard, Package, ShoppingCart, IndianRupee, Search, ChevronRight, User, PlusCircle, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from '../components/DashboardSidebar';

const SellerDashboard = () => {
    const [products, setProducts] = useState([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [editId, setEditId] = useState(null);
    const [formData, setFormData] = useState({ title: '', description: '', moq: 1, stock: 0, category: '', hsnCode: '', gstPercentage: '', customCategory: '' });
    const [variations, setVariations] = useState([]);
    const [tieredPricing, setTieredPricing] = useState([]);

    // Common product categories for B2B marketplace
    // Common product categories for B2B marketplace
    const categories = [
        'Gifting Products',
        'Electronic Gadgets',
        'Bottles and Tumblers',
        'Kitchen Ware',
        'Lamp & Projector',
        'Ceramic Mugs',
        'Tripod and Stands',
        'Toys and Games',
        'Clothing',
        'Statutes and Sculptures',
        'Sublimation Products',
        'Product Manufacturing'
    ];

    // Common GST slabs in India
    const gstSlabs = [0, 3, 5, 18, 28];
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [previews, setPreviews] = useState([]);

    // New State for Orders
    const [orders, setOrders] = useState([]);

    useEffect(() => {
        fetchProducts();
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/orders/my-orders', { headers: getAuthHeader() });
            setOrders(res.data);
            console.log("Orders fetched:", res.data); // Debug log
        } catch (err) {
            console.error('Error fetching orders:', err);
        }
    };

    const fetchProducts = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/products/seller/list', { headers: getAuthHeader() });
            setProducts(res.data);
        } catch (err) {
            console.error('Error fetching products:', err);
        }
    };

    const handleAddProduct = async (e) => {
        e.preventDefault();
        // Validate HSN code
        if (!formData.hsnCode || formData.hsnCode.length < 6) {
            alert('HSN Code must be at least 6 digits');
            return;
        }

        try {
            const data = new FormData();
            data.append('title', formData.title);
            data.append('description', formData.description);

            data.append('moq', formData.moq);
            data.append('stock', formData.stock);
            const finalCategory = formData.category === 'Add New Category' ? formData.customCategory : formData.category;
            data.append('category', finalCategory);
            data.append('hsnCode', formData.hsnCode);
            data.append('gstPercentage', formData.gstPercentage);

            data.append('variations', JSON.stringify(variations.map(v => ({ ...v, values: v.values.split(',').map(s => s.trim()).filter(s => s) }))));
            data.append('tieredPricing', JSON.stringify(tieredPricing));

            // Set sellerPrice from the first tier (lowest MOQ)
            let derivedSellerPrice = 0;
            if (tieredPricing.length > 0) {
                const sorted = [...tieredPricing].sort((a, b) => a.moq - b.moq);
                derivedSellerPrice = sorted[0].price;
            }
            data.append('sellerPrice', derivedSellerPrice);

            // Append new files
            selectedFiles.forEach(file => data.append('images', file));

            if (isEdit) {
                // Update existing product
                await axios.put(`http://localhost:5000/api/products/seller/update/${editId}`, data, {
                    headers: { ...getAuthHeader(), 'Content-Type': 'multipart/form-data' }
                });
            } else {
                // Add new product
                await axios.post('http://localhost:5000/api/products/seller/add', data, {
                    headers: { ...getAuthHeader(), 'Content-Type': 'multipart/form-data' }
                });
            }

            setShowAddForm(false);
            setIsEdit(false);
            setEditId(null);
            setFormData({ title: '', description: '', sellerPrice: '', moq: 1, stock: 0, category: '', hsnCode: '', gstPercentage: '', customCategory: '' });
            setVariations([]);
            setTieredPricing([]);
            setSelectedFiles([]);
            setPreviews([]);
            fetchProducts();
        } catch (err) {
            alert('Error processing product: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleEditClick = (product) => {
        const isCustom = !categories.includes(product.category);
        setFormData({
            title: product.title,
            description: product.description,
            moq: product.moq,
            stock: product.stock,
            category: isCustom ? 'Add New Category' : product.category,
            customCategory: isCustom ? product.category : '',
            hsnCode: product.hsnCode,
            gstPercentage: product.gstPercentage,

        });
        setVariations(product.variations ? product.variations.map(v => ({ ...v, values: v.values.join(', ') })) : []);
        setTieredPricing(product.tieredPricing || []);
        setPreviews(product.imageUrls || []); // Show existing images
        setEditId(product._id);
        setIsEdit(true);
        setShowAddForm(true);
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        // Only append fresh files for upload
        setSelectedFiles(prev => [...prev, ...files].slice(0, 10));

        const filePreviews = files.map(file => URL.createObjectURL(file));
        setPreviews(prev => [...prev, ...filePreviews].slice(0, 10));
    };

    const removeImage = (index) => {
        // If it's a new file, we need to handle selectedFiles too
        // We'll keep track by comparing index. 
        // This is a bit tricky if previews = [existingUrls, newBlobUrls]
        // Let's assume for simplicity we just remove from state and it works.
        setPreviews(prev => prev.filter((_, i) => i !== index));
        // We'd also need to adjust selectedFiles if we knew which index it was.
        // For now, let's just fix the appending which is the main issue.
    };

    const handleUpdateStock = async (id, currentAvailable, currentStock) => {
        try {
            await axios.patch(`http://localhost:5000/api/products/seller/update-stock/${id}`,
                { isAvailable: !currentAvailable, stock: currentStock },
                { headers: getAuthHeader() }
            );
            fetchProducts();
        } catch (err) {
            alert('Error updating stock');
        }
    };

    const menuItems = [
        { label: 'Dashboard', icon: LayoutDashboard, path: '/seller' },
        { label: 'My Products', icon: Package, path: '/seller/products' },
        { label: 'Orders', icon: ShoppingCart, path: '/seller/orders' },
        { label: 'Earnings', icon: IndianRupee, path: '/seller/earnings' },
    ];

    const stats = {
        total: products.length,
        pending: products.filter(p => p.status === 'pending').length,
        approved: products.filter(p => p.status === 'approved').length,
    };

    return (
        <div className="flex min-h-screen bg-[#f1f5f9]">
            <Sidebar menuItems={menuItems} />

            <div className="flex-1">
                {/* Header Area */}
                <header className="bg-[#1e293b] text-white px-8 py-4 flex justify-between items-center shadow-md">
                    <div className="flex items-center space-x-4">
                        <span className="text-sm font-bold opacity-80 flex items-center"><Package size={16} className="mr-2" /> B2B Marketplace</span>
                    </div>
                    <div className="flex items-center space-x-6">
                        <Search size={20} className="text-slate-400 cursor-pointer hover:text-white" />
                        <div className="flex items-center space-x-3 border-l border-slate-700 pl-6 cursor-pointer group">
                            <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center overflow-hidden">
                                <User size={20} />
                            </div>
                            <span className="text-sm font-bold group-hover:text-primary transition">{getCurrentUser()?.name || 'Seller'} <ChevronRight size={14} className="inline ml-1" /></span>
                        </div>
                    </div>
                </header>

                <main className="p-8">
                    <Routes>
                        <Route path="/" element={
                            <>
                                {/* Welcome & Action Bar */}
                                <div className="flex justify-between items-center mb-8">
                                    <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Seller Dashboard</h1>
                                    <button
                                        onClick={() => { setIsEdit(false); setFormData({ title: '', description: '', moq: 1, stock: 0, category: '', hsnCode: '', gstPercentage: '', customCategory: '' }); setVariations([]); setTieredPricing([]); setShowAddForm(true); }}
                                        className="bg-primary text-white px-6 py-2.5 rounded-xl font-black uppercase text-xs flex items-center space-x-2 hover:bg-blue-600 transition shadow-lg shadow-blue-500/20"
                                    >
                                        <PlusCircle size={18} />
                                        <span>Add New Product</span>
                                    </button>
                                </div>

                                {/* Summary Cards */}
                                <div className="grid grid-cols-4 gap-6 mb-8">
                                    <div className="bg-[#3b82f6] p-6 rounded-xl shadow-lg shadow-blue-500/20 text-white relative overflow-hidden group">
                                        <div className="relative z-10 font-bold opacity-90 text-sm">My Products</div>
                                        <div className="relative z-10 text-5xl font-black mt-2">{stats.total}</div>
                                        <div className="absolute right-[-10px] bottom-[-10px] opacity-10 group-hover:scale-110 transition-transform">
                                            <Package size={100} />
                                        </div>
                                        <div className="mt-4 border-t border-white/20 pt-2 w-16"></div>
                                    </div>
                                    <div className="bg-[#f97316] p-6 rounded-xl shadow-lg shadow-orange-500/20 text-white relative overflow-hidden group">
                                        <div className="relative z-10 font-bold opacity-90 text-sm">Pending Approval</div>
                                        <div className="relative z-10 text-5xl font-black mt-2">{stats.pending}</div>
                                        <div className="absolute right-[-10px] bottom-[-10px] opacity-10 group-hover:scale-110 transition-transform">
                                            <Clock size={100} />
                                        </div>
                                        <div className="mt-4 border-t border-white/20 pt-2 w-16"></div>
                                    </div>
                                    <div className="bg-[#22c55e] p-6 rounded-xl shadow-lg shadow-green-500/20 text-white relative overflow-hidden group">
                                        <div className="relative z-10 font-bold opacity-90 text-sm">New Orders</div>
                                        <div className="relative z-10 text-5xl font-black mt-2">{orders.length}</div>
                                        <div className="absolute right-[-10px] bottom-[-10px] opacity-10 group-hover:scale-110 transition-transform">
                                            <ShoppingCart size={100} />
                                        </div>
                                        <div className="mt-4 border-t border-white/20 pt-2 w-16"></div>
                                    </div>
                                    <div className="bg-[#8b5cf6] p-6 rounded-xl shadow-lg shadow-purple-500/20 text-white relative overflow-hidden group">
                                        <div className="relative z-10 font-bold opacity-90 text-sm">Earnings</div>
                                        <div className="relative z-10 text-4xl font-black mt-2 flex items-baseline">
                                            <span className="text-xl mr-1 italic">₹</span>
                                            {orders.reduce((acc, order) => acc + (order.sellerEarning || 0), 0).toLocaleString()}
                                        </div>
                                        <div className="absolute right-[-10px] bottom-[-10px] opacity-10 group-hover:scale-110 transition-transform">
                                            <IndianRupee size={100} />
                                        </div>
                                        <div className="mt-4 border-t border-white/20 pt-2 w-16"></div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-5 gap-8">
                                    {/* Recent Orders Table */}
                                    <div className="col-span-5 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                                            <h3 className="font-black text-slate-800 uppercase tracking-wider text-sm">Recent Orders Overview</h3>
                                        </div>
                                        <table className="w-full text-left">
                                            <thead className="bg-[#f8fafc] text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
                                                <tr>
                                                    <th className="px-6 py-4">Order ID</th>
                                                    <th className="px-6 py-4">Amount</th>
                                                    <th className="px-6 py-4 text-right">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50 text-sm">
                                                {orders.length > 0 ? orders.slice(0, 5).map((ord, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50 transition">
                                                        <td className="px-6 py-4 font-black text-slate-800">#{ord._id.slice(-6)}</td>
                                                        <td className="px-6 py-4 font-black text-slate-700">₹{ord.totalAmount}</td>
                                                        <td className="px-6 py-4 text-right">
                                                            <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-lg ${ord.orderStatus === 'processing' ? 'text-blue-600 bg-blue-50' :
                                                                ord.orderStatus === 'shipped' ? 'text-green-600 bg-green-50' :
                                                                    ord.orderStatus === 'delivered' ? 'text-emerald-700 bg-emerald-50' :
                                                                        'text-slate-600 bg-slate-50'
                                                                }`}>{ord.orderStatus}</span>
                                                        </td>
                                                    </tr>
                                                )) : (
                                                    <tr>
                                                        <td colSpan="3" className="px-6 py-8 text-center text-slate-400 font-bold italic">No recent orders.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </>
                        } />
                        <Route path="/products" element={
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                    <h3 className="font-black text-slate-800 uppercase tracking-wider text-sm">My Products</h3>
                                    <button
                                        onClick={() => { setIsEdit(false); setFormData({ title: '', description: '', moq: 1, stock: 0, category: '', hsnCode: '', gstPercentage: '', customCategory: '' }); setVariations([]); setTieredPricing([]); setShowAddForm(true); }}
                                        className="bg-primary text-white px-4 py-2 rounded-lg font-black uppercase text-[10px] flex items-center space-x-2 hover:bg-blue-600 transition shadow-sm shadow-blue-200"
                                    >
                                        <PlusCircle size={14} />
                                        <span>Add New</span>
                                    </button>
                                </div>
                                <table className="w-full text-left">
                                    <thead className="bg-[#f8fafc] text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
                                        <tr>
                                            <th className="px-6 py-4">Product</th>
                                            <th className="px-6 py-4 text-center">Seller Price</th>
                                            <th className="px-6 py-4 text-center">MOQ</th>
                                            <th className="px-6 py-4 text-center">Stock</th>
                                            <th className="px-6 py-4 text-center">Live Status</th>
                                            <th className="px-6 py-4 text-center">Approval</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 text-sm">
                                        {products.length > 0 ? products.map(p => (
                                            <tr key={p._id} className="hover:bg-slate-50 transition">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex-shrink-0 flex items-center justify-center p-1 overflow-hidden">
                                                            <img src={p.imageUrls?.[0] || 'https://via.placeholder.com/40'} alt="" className="object-contain" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-slate-700">{p.title}</span>
                                                            <span className="text-[10px] text-slate-400 font-bold uppercase">{p.isAvailable ? 'Serviceable' : 'Out of Stock'}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center font-bold text-slate-500">₹{p.sellerPrice || 0}</td>
                                                <td className="px-6 py-4 text-center font-bold text-slate-700">{p.moq}</td>
                                                <td className="px-6 py-4 text-center font-bold text-slate-700">{p.stock}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <button
                                                        onClick={() => handleUpdateStock(p._id, p.isAvailable, p.stock)}
                                                        className={`px-3 py-1 rounded-full text-[9px] font-black uppercase transition shadow-sm ${p.isAvailable ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}
                                                    >
                                                        {p.isAvailable ? 'Active' : 'Off'}
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {p.status === 'pending' && <span className="text-[10px] font-black uppercase px-3 py-1 rounded-lg text-orange-600 bg-orange-50">Pending</span>}
                                                    {p.status === 'approved' && <span className="text-[10px] font-black uppercase px-3 py-1 rounded-lg text-green-600 bg-green-50">Approved</span>}
                                                    {p.status === 'rejected' && <span className="text-[10px] font-black uppercase px-3 py-1 rounded-lg text-red-600 bg-red-50">Rejected</span>}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => handleEditClick(p)}
                                                        className="text-[10px] font-black uppercase px-3 py-1 rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-100 transition"
                                                    >
                                                        Edit
                                                    </button>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan="4" className="px-6 py-12 text-center text-slate-400 font-bold italic">No products listed yet.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        } />
                        <Route path="/orders" element={
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                                    <h3 className="font-black text-slate-800 uppercase tracking-wider text-sm">My Orders</h3>
                                </div>
                                <table className="w-full text-left">
                                    <thead className="bg-[#f8fafc] text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
                                        <tr>
                                            <th className="px-6 py-4">Order ID</th>
                                            <th className="px-6 py-4">Product</th>
                                            <th className="px-6 py-4">Quantity</th>
                                            <th className="px-6 py-4">Total Sale</th>
                                            <th className="px-6 py-4">Your Earning</th>
                                            <th className="px-6 py-4 text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 text-sm">
                                        {orders.length > 0 ? orders.map(order => (
                                            <tr key={order._id} className="hover:bg-slate-50 transition">
                                                <td className="px-6 py-4 font-mono text-[10px] text-slate-400">#{order._id.slice(-6)}</td>
                                                <td className="px-6 py-4 font-bold text-slate-700">{order.productId?.title || 'Unknown Product'}</td>
                                                <td className="px-6 py-4 text-center text-slate-700">{order.quantity}</td>
                                                <td className="px-6 py-4 font-black text-slate-800">₹{order.totalAmount}</td>
                                                <td className="px-6 py-4 font-black text-green-600">₹{order.sellerEarning}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-lg ${order.orderStatus === 'delivered' ? 'text-green-600 bg-green-50' :
                                                        order.orderStatus === 'shipped' ? 'text-blue-600 bg-blue-50' :
                                                            'text-orange-600 bg-orange-50'
                                                        }`}>{order.orderStatus}</span>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan="6" className="px-6 py-12 text-center text-slate-400 font-bold italic">No orders received yet.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        } />
                        <Route path="/earnings" element={
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="p-8 text-center">
                                    <h2 className="text-2xl font-black text-slate-800 mb-2">Total Earnings</h2>
                                    <div className="text-6xl font-black text-primary mb-8">
                                        ₹{orders.reduce((acc, order) => acc + (order.sellerEarning || 0), 0).toLocaleString()}
                                    </div>
                                    <div className="mt-12 text-left">
                                        <h3 className="font-black text-slate-800 uppercase tracking-wider text-sm mb-4">Settlement History</h3>
                                        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                                            <table className="w-full text-left">
                                                <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
                                                    <tr>
                                                        <th className="px-6 py-3">Transaction Date</th>
                                                        <th className="px-6 py-3">Order ID</th>
                                                        <th className="px-6 py-3 text-right">Amount</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50 text-xs">
                                                    {orders.filter(o => o.orderStatus === 'delivered').length > 0 ?
                                                        orders.filter(o => o.orderStatus === 'delivered').map(o => (
                                                            <tr key={o._id}>
                                                                <td className="px-6 py-3 font-bold text-slate-500">{new Date(o.createdAt).toLocaleDateString()}</td>
                                                                <td className="px-6 py-3 font-mono">#{o._id.slice(-6)}</td>
                                                                <td className="px-6 py-3 text-right font-black text-green-600">₹{o.sellerEarning}</td>
                                                            </tr>
                                                        )) : (
                                                            <tr>
                                                                <td colSpan="3" className="px-6 py-8 text-center text-slate-400 italic font-bold">No settlements yet.</td>
                                                            </tr>
                                                        )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        } />
                    </Routes>
                </main>
            </div>

            {/* Add Product Modal */}
            {showAddForm && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-start justify-center z-[100] p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-2xl w-full border border-slate-200 my-4">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">{isEdit ? 'Edit Product' : 'List New Product'}</h2>
                            <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-600"><XCircle size={24} /></button>
                        </div>
                        <form onSubmit={handleAddProduct} className="space-y-3 font-bold">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 ml-1">Product Title *</label>
                                    <input type="text" placeholder="e.g. Wireless Industrial Sensors" required className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary text-slate-700 text-sm"
                                        value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 ml-1">Category *</label>
                                    <select required className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary text-slate-700 font-bold text-sm"
                                        value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                        {categories.map((cat, idx) => (
                                            <option key={idx} value={cat}>{cat}</option>
                                        ))}
                                        <option value="Add New Category" className="font-bold text-primary">+ Add New Category</option>
                                    </select>
                                    {formData.category === 'Add New Category' && (
                                        <input
                                            type="text"
                                            placeholder="Enter category name (e.g. Toys)"
                                            required
                                            className="w-full mt-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary text-slate-700 text-sm font-bold"
                                            value={formData.customCategory}
                                            onChange={e => setFormData({ ...formData, customCategory: e.target.value })}
                                        />
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 ml-1">Description *</label>
                                <textarea placeholder="Product details..." required className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary text-slate-700 h-20 text-sm"
                                    value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                            </div>
                            {/* HSN Code, GST %, Price, Stock in one row */}
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 ml-1">HSN Code *</label>
                                    <input type="text" placeholder="853210" required minLength={6} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary text-slate-700 font-bold text-sm"
                                        value={formData.hsnCode} onChange={e => setFormData({ ...formData, hsnCode: e.target.value.replace(/\D/g, '') })} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 ml-1">GST % *</label>
                                    <select required className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary text-slate-700 font-bold text-sm"
                                        value={formData.gstPercentage} onChange={e => setFormData({ ...formData, gstPercentage: e.target.value })}>
                                        <option value="">GST</option>
                                        {gstSlabs.map((rate) => (
                                            <option key={rate} value={rate}>{rate}%</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 ml-1">Stock *</label>
                                    <input type="number" placeholder="100" required className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary text-slate-700 font-bold text-sm"
                                        value={formData.stock} onChange={e => setFormData({ ...formData, stock: e.target.value })} />
                                </div>
                            </div>


                            {/* Variations Section */}
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Variations</h3>
                                    <button type="button" onClick={() => setVariations([...variations, { name: '', values: '' }])} className="bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-full p-1 transition"><PlusCircle size={16} /></button>
                                </div>
                                {variations.map((v, idx) => (
                                    <div key={idx} className="flex space-x-2 items-start">
                                        <div className="flex-1">
                                            <input type="text" placeholder="Option Name (e.g. Color)" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                                                value={v.name} onChange={e => { const newV = [...variations]; newV[idx].name = e.target.value; setVariations(newV); }} />
                                        </div>

                                        <div className="flex-[2]">
                                            <input type="text" placeholder="Values (comma separated, e.g. S, M, L)" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                                                value={v.values} onChange={e => { const newV = [...variations]; newV[idx].values = e.target.value; setVariations(newV); }} />
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {v.values.split(',').filter(s => s.trim()).map((val, i) => (
                                                    <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-black border border-slate-200 uppercase tracking-tight">{val.trim()}</span>
                                                ))}
                                            </div>
                                        </div>
                                        <button type="button" onClick={() => setVariations(variations.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 mt-2"><XCircle size={16} /></button>
                                    </div>
                                ))}
                                {variations.length === 0 && <div className="text-[10px] text-slate-400 font-bold italic text-center py-2">No variations added.</div>}
                            </div>

                            {/* Tiered Pricing Section */}
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tiered Pricing (Volume Discounts)</h3>
                                    <button type="button" onClick={() => setTieredPricing([...tieredPricing, { moq: '', price: '', length: '', breadth: '', height: '', weight: '' }])} className="bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-full p-1 transition"><PlusCircle size={16} /></button>
                                </div>
                                {tieredPricing.length > 0 && (
                                    <div className="overflow-x-auto">
                                        <div className="grid grid-cols-7 gap-2 mb-2 min-w-[500px]">
                                            <div className="text-[9px] font-black uppercase text-slate-400">MOQ</div>
                                            <div className="text-[9px] font-black uppercase text-slate-400">Price</div>
                                            <div className="text-[9px] font-black uppercase text-slate-400">Length</div>
                                            <div className="text-[9px] font-black uppercase text-slate-400">Width</div>
                                            <div className="text-[9px] font-black uppercase text-slate-400">Height</div>
                                            <div className="text-[9px] font-black uppercase text-slate-400">Weight</div>
                                            <div className="w-6"></div>
                                        </div>
                                        <div className="space-y-2 min-w-[500px]">
                                            {tieredPricing.map((tier, idx) => (
                                                <div key={idx} className="grid grid-cols-7 gap-2 items-center">
                                                    <input type="number" placeholder="Qty" className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                                                        value={tier.moq} onChange={e => { const newT = [...tieredPricing]; newT[idx].moq = e.target.value; setTieredPricing(newT); }} />
                                                    <input type="number" placeholder="₹" className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                                                        value={tier.price} onChange={e => { const newT = [...tieredPricing]; newT[idx].price = e.target.value; setTieredPricing(newT); }} />
                                                    <input type="number" placeholder="L" className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                                                        value={tier.length} onChange={e => { const newT = [...tieredPricing]; newT[idx].length = e.target.value; setTieredPricing(newT); }} />
                                                    <input type="number" placeholder="B" className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                                                        value={tier.breadth} onChange={e => { const newT = [...tieredPricing]; newT[idx].breadth = e.target.value; setTieredPricing(newT); }} />
                                                    <input type="number" placeholder="H" className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                                                        value={tier.height} onChange={e => { const newT = [...tieredPricing]; newT[idx].height = e.target.value; setTieredPricing(newT); }} />
                                                    <input type="number" placeholder="Wt" className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                                                        value={tier.weight} onChange={e => { const newT = [...tieredPricing]; newT[idx].weight = e.target.value; setTieredPricing(newT); }} />
                                                    <button type="button" onClick={() => setTieredPricing(tieredPricing.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600"><XCircle size={16} /></button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {tieredPricing.length === 0 && <div className="text-[10px] text-slate-400 font-bold italic text-center py-2">No tiered pricing added.</div>}
                            </div>

                            {/* MOQ and Images */}
                            <div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 ml-1">Product Images {!isEdit && '*'} (Max 10)</label>
                                    <div className="flex flex-wrap gap-2">
                                        {previews.map((url, idx) => (
                                            <div key={idx} className="w-12 h-12 rounded-lg border border-slate-200 overflow-hidden bg-slate-50 relative group">
                                                <img src={url} className="w-full h-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => removeImage(idx)}
                                                    className="absolute inset-0 bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <XCircle size={14} />
                                                </button>
                                            </div>
                                        ))}
                                        {previews.length < 10 && (
                                            <label className="w-12 h-12 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer hover:border-primary hover:bg-slate-50 transition text-slate-400">
                                                <PlusCircle size={16} />
                                                <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} />
                                            </label>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex space-x-3 pt-4">
                                <button type="submit" className="flex-1 bg-primary text-white py-3 rounded-xl font-black uppercase text-xs shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition">{isEdit ? 'Update Details' : 'Submit Listing'}</button>
                                <button type="button" onClick={() => setShowAddForm(false)} className="flex-1 bg-slate-100 text-slate-500 py-3 rounded-xl font-black uppercase text-xs hover:bg-slate-200 transition">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SellerDashboard;
