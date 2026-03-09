import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getAuthHeader, getCurrentUser, logout } from '../utils/auth';
import { LayoutDashboard, Package, ShoppingCart, IndianRupee, Search, ChevronRight, User, PlusCircle, Clock, CheckCircle, XCircle, Truck, FileText, Menu, Download, Loader2, RefreshCw } from 'lucide-react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from '../components/DashboardSidebar';
import { categories } from '../utils/categories';
import ShipmentManager from '../components/ShipmentManager';
import ShippingCalculator from '../components/ShippingCalculator';

import API_BASE_URL from '../config';

const SellerDashboard = () => {
    const [products, setProducts] = useState([]);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [editId, setEditId] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false); // New state to prevent double clicks
    const [formData, setFormData] = useState({ title: '', description: '', moq: 1, stock: 0, category: '', subCategory: '', hsnCode: '', gstPercentage: '', customCategory: '' });
    const [variations, setVariations] = useState([]);
    const [tieredPricing, setTieredPricing] = useState([]);

    // Common GST slabs in India
    const gstSlabs = [0, 3, 5, 18, 28];
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [previews, setPreviews] = useState([]);

    // New State for Orders
    const [orders, setOrders] = useState([]);
    const [managedOrder, setManagedOrder] = useState(null);
    const [activeTab, setActiveTab] = useState('New');

    const tabs = [
        { name: 'New', count: orders.filter(o => o.logisticsStatus === 'pending').length },
        { name: 'Ready To Ship', count: orders.filter(o => ['ready-to-ship', 'awb-assigned'].includes(o.logisticsStatus)).length },
        { name: 'Pickups & Manifests', count: orders.filter(o => ['pickup-scheduled', 'manifest-generated'].includes(o.logisticsStatus)).length },
        { name: 'In Transit', count: orders.filter(o => ['shipped', 'in-transit'].includes(o.logisticsStatus)).length },
        { name: 'Delivered', count: orders.filter(o => o.logisticsStatus === 'delivered').length },
        { name: 'Cancelled', count: orders.filter(o => ['cancelled', 'canceled', 'rto'].includes(o.logisticsStatus)).length },
        { name: 'All', count: orders.length }
    ];

    const getFilteredOrders = () => {
        switch (activeTab) {
            case 'New': return orders.filter(o => o.logisticsStatus === 'pending');
            case 'Ready To Ship': return orders.filter(o => ['ready-to-ship', 'awb-assigned'].includes(o.logisticsStatus));
            case 'Pickups & Manifests': return orders.filter(o => ['pickup-scheduled', 'manifest-generated'].includes(o.logisticsStatus));
            case 'In Transit': return orders.filter(o => ['shipped', 'in-transit'].includes(o.logisticsStatus));
            case 'Delivered': return orders.filter(o => o.logisticsStatus === 'delivered');
            case 'Cancelled': return orders.filter(o => ['cancelled', 'canceled', 'rto'].includes(o.logisticsStatus));
            default: return orders;
        }
    };

    useEffect(() => {
        fetchProducts();
        fetchOrders();
        fetchProfileSilently();
    }, []);

    const fetchProfileSilently = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/auth/profile`, { headers: getAuthHeader() });
            setProfile(res.data);
            if (res.data.pickupAddressDetails?.locationName) {
                setPickupForm({
                    locationName: res.data.pickupAddressDetails.locationName || '',
                    name: res.data.pickupAddressDetails.name || '',
                    phone: res.data.pickupAddressDetails.phone || '',
                    address: res.data.pickupAddressDetails.address || '',
                    address2: res.data.pickupAddressDetails.address2 || '',
                    city: res.data.pickupAddressDetails.city || '',
                    state: res.data.pickupAddressDetails.state || '',
                    pincode: res.data.pickupAddressDetails.pincode || ''
                });
            } else {
                setPickupForm({
                    locationName: 'Primary',
                    name: res.data.name || '',
                    phone: res.data.phone || '',
                    address: res.data.pickupAddress || '', // Linked from seller registration
                    address2: '',
                    city: '',
                    state: '',
                    pincode: '' // Prompt user explicitly for pincode
                });
            }
        } catch (err) {
            console.error('Error fetching profile silently:', err);
        }
    };

const fetchOrders = async () => {
    try {
        const res = await axios.get(
            `${API_BASE_URL}/api/orders/my-orders`,
            { headers: getAuthHeader() }
        );

        // Show only payment pending orders
        const pendingOrders = res.data.filter(
            order => order.paymentStatus == 'completed'
        );

        setOrders(pendingOrders);

        console.log("Pending Orders:", pendingOrders);
    } catch (err) {
        console.error('Error fetching orders:', err);
    }
};

    const [syncing, setSyncing] = useState(false);
    const syncWithShiprocket = async () => {
        try {
            setSyncing(true);
            await axios.post(`${API_BASE_URL}/api/shipments/sync-seller-orders`, {}, { headers: getAuthHeader() });
            await fetchOrders();
        } catch (err) {
            console.error("Sync error:", err);
            alert("Failed to sync with Shiprocket");
        } finally {
            setSyncing(false);
        }
    };

    const fetchProducts = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/products/seller/list`, { headers: getAuthHeader() });
            setProducts(res.data);
        } catch (err) {
            console.error('Error fetching products:', err);
        }
    };

    const handleAddProduct = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        // Validate HSN code
        if (!formData.hsnCode || formData.hsnCode.length < 6) {
            alert('HSN Code must be at least 6 digits');
            return;
        }
        if (!formData.gstPercentage) {
            alert('Please select a GST Percentage');
            return;
        }

        // Validate Pricing
        if (tieredPricing.length === 0) {
            alert('Please add at least one pricing tier (MOQ & Price).');
            return;
        }

        // Validate Images
        if ( previews.length <3) {
            alert('Please upload at least three product image.');
            return;
        }

        setIsSubmitting(true);

        try {
            const data = new FormData();
            data.append('title', formData.title);
            data.append('description', formData.description);

            data.append('moq', formData.moq);
            data.append('stock', formData.stock);
            const finalCategory = formData.category === 'Add New Category' ? formData.customCategory : formData.category;
            data.append('category', finalCategory);
            // Append subCategory if distinct from custom/new category
            data.append('subCategory', formData.category === 'Add New Category' ? '' : formData.subCategory);

            data.append('hsnCode', formData.hsnCode);
            data.append('gstPercentage', formData.gstPercentage);

            data.append('variations', JSON.stringify(variations.map(v => ({ ...v, values: v.values.split(',').map(s => s.trim()).filter(s => s) }))));
            data.append('tieredPricing', JSON.stringify(tieredPricing));

            // Set sellerPrice from the first tier (lowest MOQ)
            let derivedSellerPrice = 0;
            if (tieredPricing.length > 0) {
                const sorted = [...tieredPricing].sort((a, b) => a.moq - b.moq);
                derivedSellerPrice = sorted[0].price;

                // Also set base dimensions/weight from the first tier
                if (sorted[0].weight) data.append('weight', sorted[0].weight);
                if (sorted[0].length) data.append('length', sorted[0].length);
                if (sorted[0].breadth) data.append('breadth', sorted[0].breadth);
                if (sorted[0].height) data.append('height', sorted[0].height);
            }
            data.append('sellerPrice', derivedSellerPrice);

            // Append new files
            selectedFiles.forEach(file => data.append('images', file));

            const isFirstProduct = products.length === 0 && !isEdit;

            if (isEdit) {
                // Update existing product
                await axios.put(`${API_BASE_URL}/api/products/seller/update/${editId}`, data, {
                    headers: { ...getAuthHeader(), 'Content-Type': 'multipart/form-data' }
                });
            } else {
                // Add new product
                await axios.post(`${API_BASE_URL}/api/products/seller/add`, data, {
                    headers: { ...getAuthHeader(), 'Content-Type': 'multipart/form-data' }
                });
            }

            setShowAddForm(false);
            setIsEdit(false);
            setEditId(null);
            setFormData({ title: '', description: '', sellerPrice: '', moq: 1, stock: 0, category: '', subCategory: '', hsnCode: '', gstPercentage: '', customCategory: '' });
            setVariations([]);
            setTieredPricing([]);
            setSelectedFiles([]);
            setPreviews([]);
            fetchProducts();

            if (isFirstProduct || !profile?.pickupAddressDetails?.pincode) {
                setProfileTab('pickup');
                setShowProfileModal(true);
            }
        } catch (err) {
            alert('Error processing product: ' + (err.response?.data?.error || err.message));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditClick = (product) => {
        const isCustom = !categories.find(c => c.name === product.category);
        setFormData({
            title: product.title,
            description: product.description,
            moq: product.moq,
            stock: product.stock,
            category: isCustom ? 'Add New Category' : product.category,
            subCategory: product.subCategory || '',
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
        setPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const handleUpdateStock = async (id, currentAvailable, currentStock) => {
        try {
            await axios.patch(`${API_BASE_URL}/api/products/seller/update-stock/${id}`,
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
        { label: 'Shipping Calculator', icon: Truck, path: '/seller/shipping-calculator' },
        { label: 'Earnings', icon: IndianRupee, path: '/seller/earnings' },
    ];

    const stats = {
        total: products.length,
        pending: products.filter(p => p.status === 'pending').length,
        approved: products.filter(p => p.status === 'approved').length,
    };

    const [profile, setProfile] = useState(null);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [profileFormData, setProfileFormData] = useState({ name: '', phone: '', pickupAddress: '', shiprocketNickname: '', gstNumber: '' });
    const [loading, setLoading] = useState(false);

    const handleUpdateProfile = async () => {
        try {
            setLoading(true);
            const res = await axios.put(`${API_BASE_URL}/api/auth/profile`, profileFormData, {
                headers: getAuthHeader()
            });
            setProfile(res.data.user);
            setEditMode(false);
            alert('Profile updated successfully!');
        } catch (err) {
            console.error(err);
            alert('Failed to update profile: ' + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleProfileClick = async () => {
        await fetchProfileSilently();
        setShowProfileModal(true);
    };

    const [profileTab, setProfileTab] = useState('profile');
    const [pickupForm, setPickupForm] = useState({ locationName: '', name: '', phone: '', address: '', address2: '', city: '', state: '', pincode: '' });
    const [pickupLoading, setPickupLoading] = useState(false);
    const [pickupError, setPickupError] = useState('');

    const handleRegisterPickup = async () => {
        setPickupError('');
        const { locationName, name, phone, address, city, state, pincode } = pickupForm;
        if (!locationName || !name || !phone || !address || !city || !state || !pincode) {
            setPickupError('Please fill all required fields (*)');
            return;
        }
        if (pincode.length !== 6) {
            setPickupError('Pincode must be exactly 6 digits');
            return;
        }
        try {
            setPickupLoading(true);
            await axios.post(`${API_BASE_URL}/api/shipments/register-pickup`, pickupForm, { headers: getAuthHeader() });
            // Refresh profile to show updated status
            const res = await axios.get(`${API_BASE_URL}/api/auth/profile`, { headers: getAuthHeader() });
            setProfile(res.data);
            alert('✅ Pickup address registered successfully with ShipRocket! Future orders will use this address automatically.');
        } catch (err) {
            const msg = err.response?.data?.error || err.response?.data?.message || err.message;
            setPickupError(msg);
        } finally {
            setPickupLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-[#f1f5f9]">
            <Sidebar menuItems={menuItems} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <div className="flex-1 min-w-0">
                {/* Header Area */}
                <header className="bg-[#1e293b] text-white px-4 md:px-8 py-4 flex justify-between items-center shadow-md sticky top-0 z-30">
                    <div className="flex items-center space-x-4">
                        <button onClick={() => setSidebarOpen(true)} className="md:hidden p-1.5 hover:bg-slate-700 rounded-lg transition">
                            <Menu size={20} />
                        </button>
                        <span className="text-sm font-bold opacity-80 flex items-center"><Package size={16} className="mr-2" /> B2B Marketplace</span>
                    </div>
                    <div className="flex items-center space-x-6">
                        <Search size={20} className="text-slate-400 cursor-pointer hover:text-white" />
                        <div onClick={handleProfileClick} className="flex items-center space-x-3 border-l border-slate-700 pl-4 md:pl-6 cursor-pointer group">
                            <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center overflow-hidden">
                                <User size={20} />
                            </div>
                            <span className="hidden md:flex text-sm font-bold group-hover:text-primary transition items-center">{getCurrentUser()?.name || 'Seller'} <ChevronRight size={14} className="inline ml-1" /></span>
                        </div>
                    </div>
                </header>

                <main className="p-4 md:p-8">
                    <Routes>
                        <Route path="/" element={
                            <>
                                {/* Welcome & Action Bar */}
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                                    <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Seller Dashboard</h1>
                                    <button
                                        onClick={() => { setIsEdit(false); setFormData({ title: '', description: '', moq: 1, stock: 0, category: '', subCategory: '', hsnCode: '', gstPercentage: '', customCategory: '' }); setVariations([]); setTieredPricing([]); setShowAddForm(true); }}
                                        className="bg-primary text-white px-6 py-2.5 rounded-xl font-black uppercase text-xs flex items-center space-x-2 hover:bg-blue-600 transition shadow-lg shadow-blue-500/20 w-full md:w-auto justify-center"
                                    >
                                        <PlusCircle size={18} />
                                        <span>Add New Product</span>
                                    </button>
                                </div>

                                {/* Summary Cards */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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

                                <div className="grid grid-cols-1 gap-8">
                                    {/* Recent Orders Table */}
                                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                                            <h3 className="font-black text-slate-800 uppercase tracking-wider text-sm">Recent Orders Overview</h3>
                                        </div>
                                        <div className="overflow-x-auto">
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
                                </div>
                            </>
                        } />
                        <Route path="/products" element={
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                    <h3 className="font-black text-slate-800 uppercase tracking-wider text-sm">My Products</h3>
                                    <button
                                        onClick={() => { setIsEdit(false); setFormData({ title: '', description: '', moq: 1, stock: 0, category: '', subCategory: '', hsnCode: '', gstPercentage: '', customCategory: '' }); setVariations([]); setTieredPricing([]); setShowAddForm(true); }}
                                        className="bg-primary text-white px-4 py-2 rounded-lg font-black uppercase text-[10px] flex items-center space-x-2 hover:bg-blue-600 transition shadow-sm shadow-blue-200"
                                    >
                                        <PlusCircle size={14} />
                                        <span>Add New</span>
                                    </button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left min-w-[700px]">
                                        <thead className="bg-[#f8fafc] text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
                                            <tr>
                                                <th className="px-6 py-4">Product</th>
                                                <th className="px-6 py-4 text-center">Seller Price</th>
                                                <th className="px-6 py-4 text-center">MOQ</th>
                                                <th className="px-6 py-4 text-center">Stock</th>

                                                <th className="px-6 py-4 text-center">Approval</th>
                                                <th className="px-6 py-4 text-center">Action</th>
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
                                                        {p.status === 'pending' && <span className="text-[10px] font-black uppercase px-3 py-1 rounded-lg text-orange-600 bg-orange-50">Pending</span>}
                                                        {p.status === 'approved' && <span className="text-[10px] font-black uppercase px-3 py-1 rounded-lg text-green-600 bg-green-50">Approved</span>}
                                                        {p.status === 'rejected' && <span className="text-[10px] font-black uppercase px-3 py-1 rounded-lg text-red-600 bg-red-50">Rejected</span>}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <button
                                                            onClick={() => handleUpdateStock(p._id, p.isAvailable, p.stock)}
                                                            className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition shadow-sm border ${p.isAvailable ? 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100' : 'bg-green-50 text-green-600 border-green-100 hover:bg-green-100'}`}
                                                        >
                                                            {p.isAvailable ? 'Out of Stock' : 'In Stock'}
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
                            </div>
                        } />
                        <Route path="/orders" element={
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[calc(100vh-140px)]">
                                {/* Tabs */}
                                <div className="flex justify-between items-center border-b border-slate-200">
                                    <div className="flex overflow-x-auto flex-1">
                                        {tabs.map(tab => (
                                            <button
                                                key={tab.name}
                                                onClick={() => setActiveTab(tab.name)}
                                                className={`px-4 sm:px-6 py-4 text-[10px] sm:text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition border-b-2 ${activeTab === tab.name ? 'border-primary text-primary bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                                            >
                                                {tab.name} <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] ${activeTab === tab.name ? 'bg-primary text-white' : 'bg-slate-200 text-slate-500'}`}>{tab.count}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="pr-4 pl-2">
                                        <button
                                            onClick={syncWithShiprocket}
                                            disabled={syncing}
                                            className="whitespace-nowrap bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 flex items-center px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition disabled:opacity-50"
                                        >
                                            {syncing ? <Loader2 size={12} className="animate-spin mr-1.5" /> : <RefreshCw size={12} className="mr-1.5" />}
                                            Sync Status
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-auto">
                                    <div className="min-w-[800px]">
                                        {/* Table Header */}
                                        <div className="grid grid-cols-10 gap-4 px-6 py-3 bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400">
                                            <div className="col-span-2">Order Details</div>

                                            <div className="col-span-3">Product Details</div>
                                            <div className="col-span-1">Payment</div>
                                            <div className="col-span-2">Status</div>
                                            <div className="col-span-2 text-right">Action</div>
                                        </div>

                                        {/* Scrollable Table Body */}
                                        <div>
                                            {getFilteredOrders().length > 0 ? getFilteredOrders().map(order => (
                                                <div key={order._id} className="grid grid-cols-10 gap-4 px-6 py-4 border-b border-slate-50 hover:bg-slate-50 transition items-center text-xs">
                                                    {/* Order Details */}
                                                    <div className="col-span-2">
                                                        <div className="font-bold text-primary cursor-pointer hover:underline">#{order._id.slice(-6)}</div>
                                                        <div className="text-[10px] text-slate-400 font-bold mt-1">
                                                            {new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 font-semibold">
                                                            {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </div>



                                                    {/* Product Details */}
                                                    <div className="col-span-3 flex items-start gap-3">
                                                        <div className="w-12 h-12 flex-shrink-0 bg-slate-100 rounded-lg border border-slate-200 overflow-hidden">
                                                            <img
                                                                src={order.productId?.imageUrls?.[0] || 'https://via.placeholder.com/48'}
                                                                alt={order.productId?.title}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-bold text-slate-700 truncate" title={order.productId?.title}>{order.productId?.title || 'Unknown Product'}</div>
                                                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                                                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold border border-slate-200">Qty: {order.quantity}</span>
                                                                {order.productId?.sku && <span className="text-[10px] text-slate-400 font-mono">SKU: {order.productId.sku}</span>}
                                                            </div>
                                                            <div className="mt-1">
                                                                {order.selectedVariation && Object.keys(order.selectedVariation).length > 0 ? (
                                                                    <span className="text-[10px] font-bold bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded text-slate-600 inline-block">
                                                                        {Object.entries(order.selectedVariation).map(([key, val]) => `${key}: ${val}`).join(' | ')}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-[10px] font-bold text-slate-300">Variation: N/A</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Payment */}
                                                    <div className="col-span-1">
                                                        <div className="font-black text-slate-800">₹{order.sellerEarning}</div>
                                                        <div className="text-[9px] font-bold uppercase text-green-600 bg-green-50 px-1.5 py-0.5 rounded inline-block mt-1"></div>
                                                    </div>

                                                    {/* Status */}
                                                    <div
  className={`text-[9px] font-black uppercase px-2 py-1 rounded-md inline-flex items-center gap-1 border ${
    order.paymentStatus !== 'completed'
      ? 'bg-amber-50 text-amber-600 border-amber-100'
      : order.logisticsStatus === 'pending'
      ? 'bg-orange-50 text-orange-600 border-orange-100'
      : order.logisticsStatus === 'ready-to-ship'
      ? 'bg-blue-50 text-blue-600 border-blue-100'
      : order.logisticsStatus === 'awb-assigned'
      ? 'bg-purple-50 text-purple-600 border-purple-100'
      : order.logisticsStatus === 'pickup-scheduled'
      ? 'bg-yellow-50 text-yellow-600 border-yellow-100'
      : order.logisticsStatus === 'in-transit'
      ? 'bg-indigo-50 text-indigo-600 border-indigo-100'
      : order.logisticsStatus === 'delivered'
      ? 'bg-green-50 text-green-600 border-green-100'
      : ['cancelled', 'canceled', 'rto'].includes(order.logisticsStatus)
      ? 'bg-red-50 text-red-600 border-red-100'
      : 'bg-slate-50 text-slate-600 border-slate-100'
  }`}
>
  {order.paymentStatus !== 'completed' ? (
    <>
      <Clock size={10} />
      <span>Payment Pending</span>
    </>
  ) : (
    <>
      <span>{order.logisticsStatus.replace(/-/g, ' ')}</span>
    </>
  )}
</div>

                                                    {/* Action */}
                                                    <div className="col-span-2 text-right">
                                                        {['pending', 'ready-to-ship', 'awb-assigned', 'pickup-scheduled', 'manifest-generated'].includes(order.logisticsStatus) ? (
                                                            <button
                                                                onClick={() => setManagedOrder(order._id)}
                                                                className="bg-primary text-white pl-3 pr-4 py-1.5 rounded-lg text-[10px] font-black uppercase hover:bg-blue-600 transition shadow-sm shadow-blue-200 flex items-center justify-center gap-1 ml-auto"
                                                            >
                                                                {['awb-assigned', 'pickup-scheduled', 'manifest-generated'].includes(order.logisticsStatus) ? (
                                                                    <>
                                                                        <Download size={12} /> Download
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Truck size={12} /> Ship Now
                                                                    </>
                                                                )}
                                                            </button>
                                                        ) : (
                                                            <button className="bg-slate-100 text-slate-400 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase cursor-not-allowed ml-auto">
                                                                Track
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            )) : (
                                                <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                                                    <Package size={48} className="opacity-20 mb-4" />
                                                    <div className="font-bold text-sm">No orders found in '{activeTab}'</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
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
                        <Route path="/shipping-calculator" element={<ShippingCalculator />} />
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 ml-1">Product Title *</label>
                                    <input type="text" placeholder="e.g. Wireless Industrial Sensors" required className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary text-slate-700 text-sm"
                                        value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                                </div>
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 ml-1">Category *</label>
                                        <select required className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary text-slate-700 font-bold text-sm"
                                            value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value, subCategory: '' })}>
                                            <option value="">Select Category</option>
                                            {categories.map((cat, idx) => (
                                                <option key={idx} value={cat.name}>{cat.name}</option>
                                            ))}
                                            <option value="Add New Category" className="font-bold text-primary">+ Add New Category</option>
                                        </select>
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 ml-1">Sub Category</label>
                                        <select
                                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary text-slate-700 font-bold text-sm disabled:opacity-50"
                                            value={formData.subCategory}
                                            onChange={e => setFormData({ ...formData, subCategory: e.target.value })}
                                            disabled={!formData.category || formData.category === 'Add New Category'}
                                        >
                                            <option value="">Select Sub Category</option>
                                            {formData.category && categories.find(c => c.name === formData.category)?.subCategories?.map((sub, idx) => (
                                                <option key={idx} value={sub.name}>{sub.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                {formData.category === 'Add New Category' && (
                                    <div className="md:col-span-2">
                                        <input
                                            type="text"
                                            placeholder="Enter category name (e.g. Toys)"
                                            required
                                            className="w-full mt-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary text-slate-700 text-sm font-bold"
                                            value={formData.customCategory}
                                            onChange={e => setFormData({ ...formData, customCategory: e.target.value })}
                                        />
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 ml-1">Description *</label>
                                <textarea placeholder="Product details..." required className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary text-slate-700 h-20 text-sm"
                                    value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                            </div>
                            {/* HSN Code, GST %, Price, Stock in one row */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 ml-1">HSN Code *</label>
                                    <input type="text" placeholder="853210" required minLength={6} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary text-slate-700 font-bold text-sm"
                                        value={formData.hsnCode} onChange={e => setFormData({ ...formData, hsnCode: e.target.value.replace(/\D/g, '') })} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 ml-1">GST % *</label>
                                    <select required className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary text-slate-700 font-bold text-sm"
                                        value={formData.gstPercentage} onChange={e => setFormData({ ...formData, gstPercentage: e.target.value })}>
                                        <option value="">Select GST %</option>
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
                                    <button type="button" onClick={() => setTieredPricing([...tieredPricing, { moq: '', price: '', length: '', breadth: '', height: '', weight: '' }])} className="bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg px-2 py-1 flex items-center gap-1 transition text-[10px] font-bold uppercase"><PlusCircle size={14} /> Add Tier</button>
                                </div>
                                {tieredPricing.length > 0 && (
                                    <div className="overflow-x-auto">
                                        <div className="grid grid-cols-7 gap-2 mb-2 min-w-[500px]">
                                            <div className="text-[9px] font-black uppercase text-slate-400">MOQ</div>
                                            <div className="text-[9px] font-black uppercase text-slate-400">Price</div>
                                            <div className="text-[9px] font-black uppercase text-slate-400">Length (cm)</div>
                                            <div className="text-[9px] font-black uppercase text-slate-400">Width (cm)</div>
                                            <div className="text-[9px] font-black uppercase text-slate-400">Height (cm)</div>
                                            <div className="text-[9px] font-black uppercase text-slate-400">Weight (kg)</div>
                                            <div className="w-6"></div>
                                        </div>
                                        <div className="space-y-2 min-w-[500px]">
                                            {tieredPricing.map((tier, idx) => (
                                                <div key={idx} className="grid grid-cols-7 gap-2 items-center">
                                                    <input type="number" placeholder="Qty" className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                                                        value={tier.moq} onChange={e => { const newT = [...tieredPricing]; newT[idx].moq = e.target.value; setTieredPricing(newT); }} />
                                                    <input type="number" placeholder="₹" className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                                                        value={tier.price} onChange={e => { const newT = [...tieredPricing]; newT[idx].price = e.target.value; setTieredPricing(newT); }} />
                                                    <input type="number" placeholder="L (cm)" className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                                                        value={tier.length} onChange={e => { const newT = [...tieredPricing]; newT[idx].length = e.target.value; setTieredPricing(newT); }} />
                                                    <input type="number" placeholder="B (cm)" className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                                                        value={tier.breadth} onChange={e => { const newT = [...tieredPricing]; newT[idx].breadth = e.target.value; setTieredPricing(newT); }} />
                                                    <input type="number" placeholder="H (cm)" className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                                                        value={tier.height} onChange={e => { const newT = [...tieredPricing]; newT[idx].height = e.target.value; setTieredPricing(newT); }} />
                                                    <input type="number" placeholder="Wt (kg)" className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
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
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 ml-1">Product Images {!isEdit && '*'} (Max 10) & (Min 3)</label>
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
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className={`flex-1 bg-primary text-white py-3 rounded-xl font-black uppercase text-xs shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {isSubmitting ? 'Processing...' : (isEdit ? 'Update Details' : 'Submit Listing')}
                                </button>
                                <button type="button" onClick={() => setShowAddForm(false)} className="flex-1 bg-slate-100 text-slate-500 py-3 rounded-xl font-black uppercase text-xs hover:bg-slate-200 transition">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Shipment Manager Modal */}
            {managedOrder && (
                <ShipmentManager
                    orderId={managedOrder}
                    onClose={() => setManagedOrder(null)}
                    onUpdate={() => { fetchOrders(); }}
                />
            )}
            {/* Profile Modal */}
            {showProfileModal && profile && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full relative overflow-hidden max-h-[90vh] flex flex-col">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-8 pt-6 pb-16 relative flex-shrink-0">
                            <button
                                onClick={() => { setShowProfileModal(false); setEditMode(false); setProfileTab('profile'); }}
                                className="absolute top-4 right-4 text-white/70 hover:text-white transition"
                            >
                                <XCircle size={24} />
                            </button>
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20">
                                    <User size={32} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-white">{profile.name}</h2>
                                    <p className="text-white/60 text-xs font-semibold">{profile.email}</p>
                                </div>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-slate-100 flex-shrink-0 -mt-8 mx-6 bg-white rounded-xl shadow-md z-10 relative overflow-hidden">
                            {['profile', 'pickup'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setProfileTab(tab)}
                                    className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition border-b-2 ${profileTab === tab ? 'border-primary text-primary bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                >
                                    {tab === 'profile' ? '👤 Profile' : '📍 Pickup Address'}
                                </button>
                            ))}
                        </div>

                        {/* Body */}
                        <div className="overflow-y-auto flex-1 px-6 py-4">
                            {profileTab === 'profile' && (
                                <div className="space-y-4">
                                    {!editMode ? (
                                        <>
                                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Business Details</h3>
                                                <div className="space-y-2 text-sm font-bold text-slate-700">
                                                    {[
                                                        { label: 'GST Number', val: profile.gstNumber || 'N/A' },
                                                        { label: 'Phone', val: `${profile.countryCode || ''} ${profile.phone || 'N/A'}` },
                                                        { label: 'SR Pickup Nickname', val: profile.shiprocketNickname || 'Not set' }
                                                    ].map(({ label, val }) => (
                                                        <div key={label} className="flex justify-between">
                                                            <span className="text-slate-500">{label}</span>
                                                            <span className={label === 'SR Pickup Nickname' ? 'text-primary' : ''}>{val}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Bank Details</h3>
                                                <div className="space-y-2 text-sm font-bold text-slate-700">
                                                    {[
                                                        { label: 'Account Name', val: profile.bankDetails?.accountName || 'N/A' },
                                                        { label: 'Account No.', val: profile.bankDetails?.accountNumber || 'N/A', mono: true },
                                                        { label: 'IFSC Code', val: profile.bankDetails?.ifscCode || 'N/A', mono: true }
                                                    ].map(({ label, val, mono }) => (
                                                        <div key={label} className="flex justify-between">
                                                            <span className="text-slate-500">{label}</span>
                                                            <span className={mono ? 'font-mono' : ''}>{val}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <button onClick={() => { setProfileFormData({ name: profile.name, phone: profile.phone, pickupAddress: profile.pickupAddress, shiprocketNickname: profile.shiprocketNickname || 'Primary', gstNumber: profile.gstNumber || '' }); setEditMode(true); }}
                                                className="w-full bg-slate-100 text-slate-700 py-3 rounded-xl font-bold uppercase text-xs hover:bg-slate-200 transition">
                                                Edit Profile
                                            </button>
                                        </>
                                    ) : (
                                        <div className="space-y-3">
                                            {[
                                                { label: 'Full Name', key: 'name', type: 'text' },
                                                { label: 'Phone', key: 'phone', type: 'text' },
                                                { label: 'GST Number', key: 'gstNumber', type: 'text' },
                                            ].map(({ label, key, type }) => (
                                                <div key={key}>
                                                    <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">{label}</label>
                                                    <input type={type} value={profileFormData[key] || ''} onChange={e => setProfileFormData({ ...profileFormData, [key]: e.target.value })}
                                                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:border-primary" />
                                                </div>
                                            ))}
                                            <div className="flex gap-2 pt-2">
                                                <button onClick={() => setEditMode(false)} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-black uppercase text-xs">Cancel</button>
                                                <button onClick={handleUpdateProfile} disabled={loading} className="flex-1 bg-primary text-white py-3 rounded-xl font-black uppercase text-xs flex items-center justify-center">
                                                    {loading ? <Loader2 className="animate-spin" size={16} /> : 'Save Changes'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {profileTab === 'pickup' && (
                                <div className="space-y-4">
                                    {/* Status badge */}
                                    {profile.pickupAddressDetails?.locationName ? (
                                        <div className={`flex items-center gap-3 p-3 rounded-xl border text-sm font-bold ${profile.pickupAddressDetails.isRegisteredWithShiprocket ? 'bg-green-50 border-green-200 text-green-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                                            <span>{profile.pickupAddressDetails.isRegisteredWithShiprocket ? '✅' : '⚠️'}</span>
                                            <div>
                                                <div className="font-black">{profile.pickupAddressDetails.locationName}</div>
                                                <div className="text-xs font-medium">{profile.pickupAddressDetails.isRegisteredWithShiprocket ? 'Registered with ShipRocket — ready to use' : 'Saved but NOT yet registered with ShipRocket'}</div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700 font-bold">
                                            📍 Is this Pickup Address correct? Please complete specific details like pincode, city and state to enable automatic ShipRocket pickup!
                                        </div>
                                    )}

                                    <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 space-y-3">
                                        <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Pickup Address Details</h3>

                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Location Nickname <span className="text-red-500">*</span></label>
                                            <input type="text" placeholder="e.g. Delhi Warehouse, Store Mumbai"
                                                value={pickupForm.locationName || ''}
                                                onChange={e => setPickupForm({ ...pickupForm, locationName: e.target.value })}
                                                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:border-primary" />
                                            <p className="text-[9px] text-slate-400 mt-1">This becomes your ShipRocket pickup location nickname. Must be unique.</p>
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Contact Person Name <span className="text-red-500">*</span></label>
                                            <input type="text" placeholder="e.g. Ramesh Kumar"
                                                value={pickupForm.name || ''}
                                                onChange={e => setPickupForm({ ...pickupForm, name: e.target.value })}
                                                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:border-primary" />
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Phone <span className="text-red-500">*</span></label>
                                            <input type="tel" placeholder="10-digit mobile number"
                                                value={pickupForm.phone || ''}
                                                onChange={e => setPickupForm({ ...pickupForm, phone: e.target.value })}
                                                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:border-primary" />
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Address Line 1 <span className="text-red-500">*</span></label>
                                            <input type="text" placeholder="House/Shop No., Street"
                                                value={pickupForm.address || ''}
                                                onChange={e => setPickupForm({ ...pickupForm, address: e.target.value })}
                                                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:border-primary" />
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Address Line 2</label>
                                            <input type="text" placeholder="Landmark, Area (optional)"
                                                value={pickupForm.address2 || ''}
                                                onChange={e => setPickupForm({ ...pickupForm, address2: e.target.value })}
                                                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:border-primary" />
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">City <span className="text-red-500">*</span></label>
                                                <input type="text" placeholder="New Delhi"
                                                    value={pickupForm.city || ''}
                                                    onChange={e => setPickupForm({ ...pickupForm, city: e.target.value })}
                                                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:border-primary" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">State <span className="text-red-500">*</span></label>
                                                <input type="text" placeholder="Delhi"
                                                    value={pickupForm.state || ''}
                                                    onChange={e => setPickupForm({ ...pickupForm, state: e.target.value })}
                                                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:border-primary" />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Pincode <span className="text-red-500">*</span></label>
                                            <input type="text" placeholder="110001" maxLength={6}
                                                value={pickupForm.pincode || ''}
                                                onChange={e => setPickupForm({ ...pickupForm, pincode: e.target.value.replace(/\D/g, '') })}
                                                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:border-primary" />
                                        </div>
                                    </div>

                                    {pickupError && (
                                        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 font-bold">{pickupError}</div>
                                    )}

                                    <button
                                        onClick={handleRegisterPickup}
                                        disabled={pickupLoading}
                                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3.5 rounded-xl font-black uppercase text-xs shadow-lg shadow-green-200 flex items-center justify-center gap-2 hover:from-green-700 hover:to-emerald-700 transition disabled:opacity-60"
                                    >
                                        {pickupLoading ? <Loader2 className="animate-spin" size={16} /> : '🚀 Save & Register with ShipRocket'}
                                    </button>
                                    <p className="text-[9px] text-slate-400 text-center leading-relaxed">
                                        This registers your pickup location in ShipRocket. Future orders will use this address automatically for courier pickup.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Footer close */}
                        <div className="px-6 pb-5 flex-shrink-0">
                            <button onClick={() => { setShowProfileModal(false); setEditMode(false); setProfileTab('profile'); }} className="w-full text-slate-400 py-2 font-bold text-xs hover:text-slate-600 transition">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SellerDashboard;
