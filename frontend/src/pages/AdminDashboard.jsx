import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getAuthHeader, getCurrentUser } from '../utils/auth';
import { LayoutDashboard, Package, ShoppingCart, Users, BadgePercent, Search, ChevronRight, User, TrendingUp, TrendingDown, DollarSign, UserCheck, Video, UserPlus, FileText, CheckCircle, XCircle, Menu, Wallet, Clock, Truck, Edit2, PlusCircle, Trash2, Globe } from 'lucide-react';
import AdminInfluencerVideos from './AdminInfluencerVideos';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../components/DashboardSidebar';
import ShippingCalculator from '../components/ShippingCalculator';

import API_BASE_URL from '../config';
import { categories as CATEGORIES_LIST } from '../utils/categories';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [pendingProducts, setPendingProducts] = useState([]);
    const [approvedProducts, setApprovedProducts] = useState([]);
    const [editingProduct, setEditingProduct] = useState(null);
    const [approvalData, setApprovalData] = useState({
        adminPrice: '',
        commission: '', shipFromChina: false,
        title: '',
        description: '',
        moq: '',
        hsnCode: '',
        gstPercentage: '',
        variations: [],
        tieredPricing: [],
        category: '',
        stock: '',
        imageUrls: [],
        prices: {
            IN: '',
            US: '',
            UK: '',
            CA: '',
            AU: '',
            UAE: '',
            INTL: ''
        }
    });

    // --- State for editing an already-approved product ---
    const [editingApprovedProduct, setEditingApprovedProduct] = useState(null); // holds the full product object
    const [approvedEditData, setApprovedEditData] = useState(null); // holds the edit form data
    const [approvedEditSaving, setApprovedEditSaving] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Dashboard Analytics State
    const [dashboardStats, setDashboardStats] = useState(null);
    const [loading, setLoading] = useState(true);

    // Filters and Search
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [sellerFilter, setSellerFilter] = useState('');

    const [sellers, setSellers] = useState([]);
    const [sellerRequests, setSellerRequests] = useState([]);
    const [buyers, setBuyers] = useState([]);
    const [commission, setCommission] = useState('');
    const [commissionInput, setCommissionInput] = useState('');
    const [orders, setOrders] = useState([]);
    const [isChinaCreating, setIsChinaCreating] = useState(false);
    const [isChinaSubmitting, setIsChinaSubmitting] = useState(false);
    const [chinaImages, setChinaImages] = useState([]);
    const [chinaFormData, setChinaFormData] = useState({
        title: '', description: '', category: '', subCategory: '',
        moq: 1, stock: 1000, adminPrice: { IN: '', US: '', UK: '', CA: '', AU: '', UAE: '', INTL: '' },
        imageUrls: [], variations: [], tieredPricing: [], shipFromChina: true
    });

    const location = useLocation();

    useEffect(() => {
        fetchAllData();
        // Auto-refresh every 30 seconds
        const interval = setInterval(() => {
            fetchAllData();
        }, 30000);
        return () => clearInterval(interval);
    }, [location.pathname]);

    const fetchAllData = async () => {
        await Promise.all([
            fetchDashboardStats(),
            fetchPending(),
            fetchSellers(),
            fetchSellerRequests(),
            fetchBuyers(),
            fetchCommission(),
            fetchOrders(),
            fetchApproved()
        ]);
        setLoading(false);
    };

    const fetchDashboardStats = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/analytics/dashboard-stats`, { headers: getAuthHeader() });
            setDashboardStats(res.data);
        } catch (err) {
            console.error('Error fetching dashboard stats:', err);
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


    const fetchSellers = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/auth/sellers`, { headers: getAuthHeader() });
            setSellers(res.data);
        } catch (err) {
            console.error('Error fetching sellers:', err);
        }
    };

    const fetchSellerRequests = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/auth/admin/pending-sellers`, { headers: getAuthHeader() });
            setSellerRequests(res.data);
        } catch (err) {
            console.error('Error fetching seller requests:', err);
        }
    };

    const handleApproveSeller = async (id) => {
        try {
            await axios.patch(`${API_BASE_URL}/api/auth/admin/approve-seller/${id}`, {}, { headers: getAuthHeader() });
            alert('Seller Approved Successfully');
            fetchSellerRequests();
            fetchSellers();
        } catch (err) {
            alert('Failed to approve seller');
        }
    };

    const handleRejectSeller = async (id, sellerName) => {
        if (!window.confirm(`Are you sure you want to reject ${sellerName}'s seller registration? This action cannot be undone and the seller will be notified via email.`)) {
            return;
        }
        try {
            await axios.delete(`${API_BASE_URL}/api/auth/admin/reject-seller/${id}`, { headers: getAuthHeader() });
            alert('Seller Rejected Successfully. Notification email has been sent.');
            fetchSellerRequests();
        } catch (err) {
            alert('Failed to reject seller');
        }
    };

    const fetchBuyers = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/analytics/buyers`, { headers: getAuthHeader() });
            setBuyers(res.data);
        } catch (err) {
            console.error('Error fetching buyers:', err);
        }
    };

    const fetchCommission = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/settings/default_commission`);
            setCommission(res.data.value);
            setCommissionInput(res.data.value);
        } catch (err) {
            setCommission(10);
            setCommissionInput(10);
        }
    };

    const handleUpdateCommission = async () => {
        try {
            await axios.put(`${API_BASE_URL}/api/settings`,
                { key: 'default_commission', value: commissionInput, description: ' Default platform commission in %' },
                { headers: getAuthHeader() }
            );
            setCommission(commissionInput);
            alert('Commission rate updated!');
        } catch (err) {
            alert('Failed to update commission');
        }
    };

    const fetchPending = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/products/admin/pending`, { headers: getAuthHeader() });
            setPendingProducts(res.data);
        } catch (err) {
            console.error('Error fetching pending products:', err);
        }
    };

    const fetchApproved = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/products/admin/approved`, { headers: getAuthHeader() });
            setApprovedProducts(res.data);
        } catch (err) {
            console.error('Error fetching approved products:', err);
        }
    };

    const handleApprove = async (id, status = 'approved') => {
        try {
            let payload = { ...approvalData, status, shipFromChina: approvalData.shipFromChina };

            // Ensure numeric fields are correctly typed
            payload.stock = parseInt(payload.stock) || 0;
            payload.commission = parseFloat(payload.commission) || 0;
            if (payload.hsnCode) payload.hsnCode = String(payload.hsnCode);

            // Process Tiered Pricing
            if (payload.tieredPricing && payload.tieredPricing.length > 0) {
                // Parse strings to numbers for all tiers
                payload.tieredPricing = payload.tieredPricing.map(t => ({
                    ...t,
                    moq: parseInt(t.moq) || 1,
                    price: parseFloat(t.price) || 0,
                    length: parseFloat(t.length) || 0,
                    breadth: parseFloat(t.breadth || t.width) || 0,
                    height: parseFloat(t.height) || 0,
                    weight: parseFloat(t.weight) || 0
                }));

                // Sort by MOQ to find base tier
                const sortedTiers = [...payload.tieredPricing].sort((a, b) => a.moq - b.moq);

                // Set main price/moq from base tier
                payload.adminPrice = sortedTiers[0].price;
                payload.moq = sortedTiers[0].moq;
            } else {
                // Fallback for non-tiered products if adminPrice became string/invalid
                payload.adminPrice = parseFloat(payload.adminPrice) || 0;
            }

            // Build country-wise adminPrice object from the prices form fields
            const basePrice = typeof payload.adminPrice === 'number' ? payload.adminPrice : 0;
            payload.adminPrice = {
                IN: parseFloat(payload.prices?.IN) || basePrice,
                US: parseFloat(payload.prices?.US) || 0,
                UK: parseFloat(payload.prices?.UK) || 0,
                CA: parseFloat(payload.prices?.CA) || 0,
                AU: parseFloat(payload.prices?.AU) || 0,
                UAE: parseFloat(payload.prices?.UAE) || 0,
                INTL: parseFloat(payload.prices?.INTL) || 0,
            };

            await axios.patch(`${API_BASE_URL}/api/products/admin/approve/${id}`,
                payload,
                { headers: getAuthHeader() }
            );
            setEditingProduct(null);
            fetchPending();
            fetchDashboardStats();
        } catch (err) {
            alert(`${status === 'approved' ? 'Approval' : 'Rejection'} failed`);
        }
    };


    const handleCreateChinaProduct = async () => {
        if (!chinaFormData.title || !chinaFormData.description || !chinaFormData.category) {
            alert('Title, Description and Category are required!');
            return;
        }
        if (!chinaFormData.adminPrice.IN && chinaImages.length === 0 && chinaFormData.imageUrls.length === 0) {
            alert('Please provide at least a base price and one image.');
            return;
        }

        const totalSize = chinaImages.reduce((acc, file) => acc + file.size, 0);
        if (totalSize > 4.5 * 1024 * 1024) {
            alert('Image files are too large! Combined size must be less than 4.5MB.');
            return;
        }

        if (isChinaSubmitting) return;
        setIsChinaSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('title', chinaFormData.title);
            formData.append('description', chinaFormData.description);
            formData.append('category', chinaFormData.category || '');
            formData.append('subCategory', chinaFormData.subCategory || '');
            formData.append('moq', chinaFormData.moq || 1);
            formData.append('stock', chinaFormData.stock || 1000);
            formData.append('shipFromChina', 'true');
            formData.append('adminPrice', JSON.stringify(chinaFormData.adminPrice));
            formData.append('imageUrls', JSON.stringify(chinaFormData.imageUrls || []));
            formData.append('variations', JSON.stringify(chinaFormData.variations || []));
            formData.append('tieredPricing', JSON.stringify(chinaFormData.tieredPricing || []));
            chinaImages.forEach(file => formData.append('images', file));
            const headers = getAuthHeader();
            delete headers['Content-Type'];
            await axios.post(`${API_BASE_URL}/api/products/admin/add`, formData, { headers });
            setIsChinaCreating(false); setChinaImages([]);
            setChinaFormData({ title: '', description: '', category: '', subCategory: '', moq: 1, stock: 1000, adminPrice: { IN: '', US: '', UK: '', CA: '', AU: '', UAE: '', INTL: '' }, imageUrls: [], variations: [], tieredPricing: [], shipFromChina: true });
            fetchApproved(); alert('Product listed successfully!');
        } catch (err) { alert('Listing failed: ' + (err.response?.data?.error || err.message)); }
        finally { setIsChinaSubmitting(false); }
    };

    const handleDeleteProduct = async (productId) => {
        if (!window.confirm('Are you sure you want to delete this product?')) return;
        try {
            await axios.delete(`${API_BASE_URL}/api/products/admin/delete/${productId}`, { headers: getAuthHeader() });
            alert('Product deleted successfully');
            fetchApproved();
            fetchPending();
            fetchDashboardStats();
        } catch (err) {
            alert('Deletion failed: ' + (err.response?.data?.error || err.message));
        }
    };

    // --- Handler: open edit modal for an approved product ---
    const handleOpenApprovedEdit = (product) => {
        setEditingApprovedProduct(product);
        setApprovedEditData({
            shipFromChina: product.shipFromChina || false,
            title: product.title || '',
            description: product.description || '',
            category: product.category || '',
            subCategory: product.subCategory || '',
            moq: product.moq || 1,
            stock: product.stock || 0,
            hsnCode: product.hsnCode || '',
            gstPercentage: product.gstPercentage || 0,
            commission: product.commission || 0,
            weight: product.weight || '',
            length: product.dimensions?.length || '',
            breadth: product.dimensions?.breadth || '',
            height: product.dimensions?.height || '',
            imageUrls: product.imageUrls || [],
            variations: product.variations || [],
            tieredPricing: (product.tieredPricing || []).map(t => ({ ...t })),
            prices: {
                IN: (typeof product.adminPrice === 'object' ? product.adminPrice?.IN : typeof product.adminPrice === 'number' ? product.adminPrice : '') || '',
                US: product.adminPrice?.US || '',
                UK: product.adminPrice?.UK || '',
                CA: product.adminPrice?.CA || '',
                AU: product.adminPrice?.AU || '',
                UAE: product.adminPrice?.UAE || '',
                INTL: product.adminPrice?.INTL || '',
            }
        });
    };

    // --- Handler: save edits for an approved product ---
    const handleSaveApprovedEdit = async () => {
        if (!editingApprovedProduct || !approvedEditData) return;
        setApprovedEditSaving(true);
        try {
            const payload = {
                shipFromChina: approvedEditData.shipFromChina, title: approvedEditData.title,
                description: approvedEditData.description,
                category: approvedEditData.category,
                subCategory: approvedEditData.subCategory,
                moq: approvedEditData.moq,
                stock: approvedEditData.stock,
                hsnCode: approvedEditData.hsnCode,
                gstPercentage: approvedEditData.gstPercentage,
                commission: approvedEditData.commission,
                weight: approvedEditData.weight,
                length: approvedEditData.length,
                breadth: approvedEditData.breadth,
                height: approvedEditData.height,
                imageUrls: approvedEditData.imageUrls,
                variations: approvedEditData.variations,
                tieredPricing: approvedEditData.tieredPricing,
                adminPrice: {
                    IN: parseFloat(approvedEditData.prices.IN) || 0,
                    US: parseFloat(approvedEditData.prices.US) || 0,
                    UK: parseFloat(approvedEditData.prices.UK) || 0,
                    CA: parseFloat(approvedEditData.prices.CA) || 0,
                    AU: parseFloat(approvedEditData.prices.AU) || 0,
                    UAE: parseFloat(approvedEditData.prices.UAE) || 0,
                    INTL: parseFloat(approvedEditData.prices.INTL) || 0,
                }
            };
            const res = await axios.put(
                `${API_BASE_URL}/api/products/admin/update/${editingApprovedProduct._id}`,
                payload,
                { headers: getAuthHeader() }
            );
            // Update local approvedProducts state optimistically
            setApprovedProducts(prev => prev.map(p => p._id === editingApprovedProduct._id ? res.data : p));
            setEditingApprovedProduct(null);
            setApprovedEditData(null);
            alert('Product updated successfully!');
        } catch (err) {
            alert('Failed to update product: ' + (err.response?.data?.error || err.message));
        } finally {
            setApprovedEditSaving(false);
        }
    };

    const handleToggleBlock = async (id) => {
        try {
            await axios.patch(`${API_BASE_URL}/api/auth/sellers/toggle-block/${id}`, {}, { headers: getAuthHeader() });
            fetchSellers();
        } catch (err) {
            alert('Failed to update seller status');
        }
    };

    // Filter pending products
    const filteredPendingProducts = pendingProducts.filter(p => {
        const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = !categoryFilter || p.category === categoryFilter;
        const matchesSeller = !sellerFilter || p.sellerId?._id === sellerFilter;
        return matchesSearch && matchesCategory && matchesSeller;
    });

    const menuItems = [
        { label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
        { label: 'Product Approvals', icon: Package, path: '/admin/approvals' },
        { label: 'Trending Products', icon: TrendingUp, path: '/admin/approved-products' },
        { label: 'Orders', icon: ShoppingCart, path: '/admin/orders' },
        { label: 'Seller Payouts', icon: Wallet, path: '/admin/payouts' },
        { label: 'Seller Requests', icon: UserPlus, path: '/admin/seller-requests' },
        { label: 'Sellers', icon: Users, path: '/admin/sellers' },
        { label: 'Buyers', icon: UserCheck, path: '/admin/buyers' },
        { label: 'Influencer Videos', icon: Video, path: '/admin/videos' },
        { label: 'Ship from China', icon: Globe, path: '/admin/china' },
    ];

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#f1f5f9]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-slate-600 font-semibold">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-[#f1f5f9]">
            <Sidebar menuItems={menuItems} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <div className="flex-1 min-w-0">
                {/* Header Area */}
                <header className="bg-[#1e293b] text-white px-4 md:px-8 py-4 flex justify-between items-center shadow-md sticky top-0 z-30">
                    <div className="flex items-center space-x-4">
                        <button onClick={() => setSidebarOpen(true)} className="md:hidden p-1 hover:bg-slate-700 rounded-lg transition">
                            <Menu size={20} />
                        </button>
                        <span className="text-sm font-bold opacity-80 flex items-center"><Package size={16} className="mr-2" /> B2B Marketplace</span>
                    </div>
                    <div className="flex items-center space-x-4 md:space-x-6">
                        <Search size={20} className="text-slate-400 cursor-pointer hover:text-white" />
                        <div className="flex items-center space-x-3 border-l border-slate-700 pl-4 md:pl-6 cursor-pointer group">
                            <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center overflow-hidden">
                                <User size={20} />
                            </div>
                            <span className="text-sm font-bold group-hover:text-primary transition hidden md:flex items-center">
                                {getCurrentUser()?.name || 'Admin'} <ChevronRight size={14} className="inline ml-1" />
                            </span>
                        </div>
                    </div>
                </header>

                <main className="p-4 md:p-8">
                    <Routes>
                        <Route path="/" element={
                            <>
                                {/* Enhanced Summary Cards */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                                    <div className="bg-[#f97316] p-6 rounded-xl shadow-lg shadow-orange-500/20 text-white relative overflow-hidden group hover:scale-[1.02] transition cursor-pointer" onClick={() => navigate('/admin/approvals')}>
                                        <div className="relative z-10 font-bold opacity-90 text-sm">Pending Products</div>
                                        <div className="relative z-10 text-5xl font-black mt-2">{dashboardStats?.pendingProducts || 0}</div>
                                        <div className="absolute right-[-10px] bottom-[-10px] opacity-10 group-hover:scale-110 transition-transform">
                                            <Package size={100} />
                                        </div>
                                        <div className="mt-4 border-t border-white/20 pt-2 w-16"></div>
                                    </div>
                                    <div className="bg-[#3b82f6] p-6 rounded-xl shadow-lg shadow-blue-500/20 text-white relative overflow-hidden group hover:scale-[1.02] transition cursor-pointer" onClick={() => navigate('/admin/sellers')}>
                                        <div className="relative z-10 font-bold opacity-90 text-sm">Total Sellers</div>
                                        <div className="relative z-10 text-5xl font-black mt-2">{dashboardStats?.totalSellers || 0}</div>
                                        {dashboardStats?.monthlyGrowth?.sellers !== undefined && (
                                            <div className={`relative z-10 text-xs mt-2 flex items-center ${dashboardStats.monthlyGrowth.sellers >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                                                {dashboardStats.monthlyGrowth.sellers >= 0 ? <TrendingUp size={14} className="mr-1" /> : <TrendingDown size={14} className="mr-1" />}
                                                {Math.abs(dashboardStats.monthlyGrowth.sellers)}% this month
                                            </div>
                                        )}
                                        <div className="absolute right-[-10px] bottom-[-10px] opacity-10 group-hover:scale-110 transition-transform">
                                            <Users size={100} />
                                        </div>
                                    </div>
                                    <div className="bg-[#22c55e] p-6 rounded-xl shadow-lg shadow-green-500/20 text-white relative overflow-hidden group hover:scale-[1.02] transition cursor-pointer" onClick={() => navigate('/admin/orders')}>
                                        <div className="relative z-10 font-bold opacity-90 text-sm">Total Orders</div>
                                        <div className="relative z-10 text-5xl font-black mt-2">{dashboardStats?.totalOrders || 0}</div>
                                        {dashboardStats?.monthlyGrowth?.orders !== undefined && (
                                            <div className={`relative z-10 text-xs mt-2 flex items-center ${dashboardStats.monthlyGrowth.orders >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                                                {dashboardStats.monthlyGrowth.orders >= 0 ? <TrendingUp size={14} className="mr-1" /> : <TrendingDown size={14} className="mr-1" />}
                                                {Math.abs(dashboardStats.monthlyGrowth.orders)}% this month
                                            </div>
                                        )}
                                        <div className="absolute right-[-10px] bottom-[-10px] opacity-10 group-hover:scale-110 transition-transform">
                                            <ShoppingCart size={100} />
                                        </div>
                                    </div>
                                    <div className="bg-[#8b5cf6] p-6 rounded-xl shadow-lg shadow-purple-500/20 text-white relative overflow-hidden group hover:scale-[1.02] transition cursor-pointer" onClick={() => navigate('/admin/settings')}>
                                        <div className="relative z-10 font-bold opacity-90 text-sm">Commission Rate</div>
                                        <div className="relative z-10 text-5xl font-black mt-2">{commission}<span className="text-2xl">%</span></div>
                                        <div className="absolute right-[-10px] bottom-[-10px] opacity-10 group-hover:scale-110 transition-transform">
                                            <BadgePercent size={100} />
                                        </div>
                                        <div className="mt-4 border-t border-white/20 pt-2 w-16"></div>
                                    </div>
                                </div>

                                {/* New Revenue & Stats Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total Revenue</h3>
                                            <DollarSign className="text-green-600" size={24} />
                                        </div>
                                        <div className="text-3xl font-black text-slate-800">&#8377;{dashboardStats?.totalRevenue?.toLocaleString() || 0}</div>
                                        {dashboardStats?.monthlyGrowth?.revenue !== undefined && (
                                            <div className={`text-xs mt-2 flex items-center ${dashboardStats.monthlyGrowth.revenue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {dashboardStats.monthlyGrowth.revenue >= 0 ? <TrendingUp size={14} className="mr-1" /> : <TrendingDown size={14} className="mr-1" />}
                                                {Math.abs(dashboardStats.monthlyGrowth.revenue)}% from last month
                                            </div>
                                        )}
                                    </div>
                                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Admin Commission</h3>
                                            <BadgePercent className="text-purple-600" size={24} />
                                        </div>
                                        <div className="text-3xl font-black text-slate-800">&#8377;{dashboardStats?.totalCommission?.toLocaleString() || 0}</div>
                                        <div className="text-xs mt-2 text-slate-500">From all completed orders</div>
                                    </div>
                                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:scale-[1.02] transition" onClick={() => navigate('/admin/approved-products')}>
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Approved Products</h3>
                                            <Package className="text-blue-600" size={24} />
                                        </div>
                                        <div className="text-3xl font-black text-slate-800">{dashboardStats?.approvedProducts || 0}</div>
                                        <div className="text-xs mt-2 text-slate-500">Live in marketplace</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
                                    {/* Recent Orders Table */}
                                    <div className="xl:col-span-3 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                                            <h3 className="font-black text-slate-800 uppercase tracking-wider text-sm">Recent Orders Overview</h3>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead className="bg-[#f8fafc] text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
                                                    <tr>
                                                        <th className="px-6 py-4">Order ID</th>
                                                        <th className="px-6 py-4">Customer</th>
                                                        <th className="px-6 py-4">Amount</th>
                                                        <th className="px-6 py-4 text-right">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50 text-sm">
                                                    {orders.length > 0 ? orders.slice(0, 5).map((ord, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-50 transition">
                                                            <td className="px-6 py-4 font-black text-slate-800">#{ord._id.slice(-6)}</td>
                                                            <td className="px-6 py-4 text-slate-500 font-bold whitespace-nowrap">{ord.buyerId?.name || 'Customer'}</td>
                                                            <td className="px-6 py-4 font-black text-slate-700">&#8377;{ord.totalAmount}</td>
                                                            <td className="px-6 py-4 text-right">
                                                                <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-lg ${ord.logisticsStatus === 'delivered' ? 'text-green-600 bg-green-50' :
                                                                    ord.logisticsStatus === 'dispatched' ? 'text-blue-600 bg-blue-50' :
                                                                        'text-orange-600 bg-orange-50'
                                                                    }`}>{ord.logisticsStatus}</span>
                                                            </td>
                                                        </tr>
                                                    )) : (
                                                        <tr>
                                                            <td colSpan="4" className="px-6 py-8 text-center text-slate-400 font-bold">No recent orders.</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Recent Activity Feed */}
                                    <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                                            <h3 className="font-black text-slate-800 uppercase tracking-wider text-sm">Recent Activity</h3>
                                        </div>
                                        <div className="p-6 max-h-96 overflow-y-auto">
                                            {dashboardStats?.recentActivity?.length > 0 ? (
                                                <div className="space-y-4">
                                                    {dashboardStats.recentActivity.map((activity, idx) => (
                                                        <div key={idx} className="flex items-start space-x-3 text-sm">
                                                            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${activity.type === 'order' ? 'bg-green-500' :
                                                                activity.type === 'approval' ? 'bg-blue-500' : 'bg-purple-500'
                                                                }`}></div>
                                                            <div className="flex-1">
                                                                <p className="text-slate-700 font-medium">{activity.message}</p>
                                                                <p className="text-xs text-slate-400 mt-0.5">
                                                                    {new Date(activity.time).toLocaleString()}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-center text-slate-400 py-8">No recent activity</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </>
                        } />
                        <Route path="/approvals" element={
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                    <h3 className="font-black text-slate-800 uppercase tracking-wider text-sm">Pending Product Approvals</h3>
                                    <div className="flex items-center space-x-3">
                                        <input
                                            type="text"
                                            placeholder="Search products..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-primary"
                                        />
                                        <select
                                            value={sellerFilter}
                                            onChange={(e) => setSellerFilter(e.target.value)}
                                            className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-primary"
                                        >
                                            <option value="">All Sellers</option>
                                            {sellers.map(s => (
                                                <option key={s._id} value={s._id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left min-w-[700px]">
                                        <thead className="bg-[#f8fafc] text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
                                            <tr>
                                                <th className="px-6 py-4">Product</th>
                                                <th className="px-6 py-4 text-center">Seller</th>
                                                <th className="px-6 py-4 text-center">Seller Price</th>
                                                <th className="px-6 py-4 text-center">MOQ</th>
                                                <th className="px-6 py-4 text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 text-sm">
                                            {filteredPendingProducts.length > 0 ? filteredPendingProducts.map(p => (
                                                <tr key={p._id} className="hover:bg-slate-50 transition">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center space-x-3">
                                                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex-shrink-0 flex items-center justify-center p-1 overflow-hidden">
                                                                <img src={p.imageUrls?.[0] || 'https://via.placeholder.com/40'} alt="" className="object-contain" />
                                                            </div>
                                                            <span className="font-bold text-slate-700">{p.title}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="font-semibold text-slate-500">{p.sellerId?.name || 'Unknown'}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center font-bold text-slate-700">&#8377;{p.sellerPrice}</td>
                                                    <td className="px-6 py-4 text-center font-bold text-slate-700">{p.moq}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            onClick={() => {
                                                                setEditingProduct(p._id);
                                                                setApprovalData({
                                                                    shipFromChina: p.shipFromChina || false,
                                                                    adminPrice: p.sellerPrice + (p.sellerPrice * (commission / 100)),
                                                                    commission: commission,
                                                                    title: p.title,
                                                                    description: p.description,
                                                                    moq: p.moq,
                                                                    hsnCode: p.hsnCode,
                                                                    gstPercentage: p.gstPercentage,
                                                                    category: p.category,
                                                                    stock: p.stock,
                                                                    imageUrls: p.imageUrls || [],

                                                                    variations: p.variations || [],
                                                                    tieredPricing: p.tieredPricing || [],

                                                                    prices: {
                                                                        IN: p.sellerPrice, // 🇮🇳 Default from seller price
                                                                        US: '',
                                                                        UK: '',
                                                                        CA: '',
                                                                        AU: '',
                                                                        UAE: '',
                                                                        INTL: ''
                                                                    }
                                                                });
                                                            }}
                                                            className="bg-primary text-white text-[10px] font-black uppercase px-4 py-2 rounded-lg hover:bg-blue-600 transition shadow-sm shadow-blue-200 flex items-center ml-auto"
                                                        >
                                                            Review & Approve <ChevronRight size={12} className="ml-1" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-400 font-bold italic">No pending items found.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        } />
                        <Route path="/orders" element={<AdminOrdersView orders={orders} />} />
                        <Route path="/seller-requests" element={
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
                                    <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Pending Seller Registrations</h2>
                                </div>
                                {sellerRequests.length > 0 ? (
                                    <div className="divide-y divide-slate-100">
                                        {sellerRequests.map(s => (
                                            <div key={s._id} className="p-6 hover:bg-slate-50 transition">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <h3 className="font-black text-lg text-slate-800">{s.name}</h3>
                                                        <p className="text-sm text-slate-500">{s.email} | {s.countryCode}{s.phone}</p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleApproveSeller(s._id)}
                                                            className="bg-green-600 text-white text-xs font-black uppercase px-5 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-1 shadow-lg shadow-green-500/20"
                                                        >
                                                            <CheckCircle size={14} /> Approve
                                                        </button>
                                                        <button
                                                            onClick={() => handleRejectSeller(s._id, s.name)}
                                                            className="bg-red-600 text-white text-xs font-black uppercase px-5 py-2 rounded-lg hover:bg-red-700 transition flex items-center gap-1 shadow-lg shadow-red-500/20"
                                                        >
                                                            <XCircle size={14} /> Reject
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-3 gap-4 text-sm">
                                                    <div className="bg-slate-50 p-3 rounded-lg">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">GST Number</p>
                                                        <p className="font-bold text-slate-700">{s.gstNumber || 'N/A'}</p>
                                                    </div>
                                                    <div className="bg-slate-50 p-3 rounded-lg">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Bank A/C</p>
                                                        <p className="font-bold text-slate-700">{s.bankDetails?.accountNumber || 'N/A'}</p>
                                                        <p className="text-xs text-slate-500">{s.bankDetails?.accountName} | {s.bankDetails?.ifscCode}</p>
                                                    </div>
                                                    <div className="bg-slate-50 p-3 rounded-lg">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Registered On</p>
                                                        <p className="font-bold text-slate-700">{new Date(s.createdAt).toLocaleDateString()}</p>
                                                    </div>
                                                    <div className="bg-blue-50 p-3 rounded-lg col-span-3">
                                                        <p className="text-[10px] font-bold text-blue-400 uppercase mb-1">Pickup Address</p>
                                                        <p className="font-medium text-slate-600 text-xs">{s.pickupAddress || 'N/A'}</p>
                                                    </div>
                                                </div>
                                                <div className="mt-4 flex gap-3 flex-wrap">
                                                    {s.gstDocument && <a href={s.gstDocument} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-primary flex items-center gap-1 hover:underline"><FileText size={14} /> View GST Doc</a>}
                                                    {s.panDocument && <a href={s.panDocument} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-primary flex items-center gap-1 hover:underline"><FileText size={14} /> View PAN</a>}
                                                    {s.aadharDocument && <a href={s.aadharDocument} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-primary flex items-center gap-1 hover:underline"><FileText size={14} /> View Aadhar</a>}
                                                    {s.cancelledCheck && <a href={s.cancelledCheck} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-green-600 flex items-center gap-1 hover:underline"><FileText size={14} /> View Cancelled Check</a>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-12 text-center text-slate-400 font-bold italic">No pending seller registrations.</div>
                                )}
                            </div>
                        } />
                        <Route path="/sellers" element={<SellersView sellers={sellers} handleToggleBlock={handleToggleBlock} />} />
                        <Route path="/buyers" element={<BuyersView buyers={buyers} />} />
                        <Route path="/approved-products" element={<ApprovedProductsView products={approvedProducts} onEdit={handleOpenApprovedEdit} onToggleTrending={async (id) => {
                            // Optimistic Update
                            const previousProducts = [...approvedProducts];
                            setApprovedProducts(prev => prev.map(p =>
                                p._id === id ? { ...p, isTrending: !p.isTrending } : p
                            ));

                            try {
                                await axios.patch(`${API_BASE_URL}/api/products/admin/toggle-trending/${id}`, {}, { headers: getAuthHeader() });
                            } catch (err) {
                                // Revert on failure
                                setApprovedProducts(previousProducts);
                                alert('Failed to toggle trending status');
                            }
                        }} />} />
                        <Route path="/payouts" element={<PayoutsView />} />
                        <Route path="/orders" element={<OrdersView orders={orders} />} />
                        <Route path="/videos" element={<AdminInfluencerVideos />} />
                        <Route path="/china" element={<AdminChinaView products={approvedProducts.filter(p => p.shipFromChina)} onEdit={handleOpenApprovedEdit} onAddNew={() => setIsChinaCreating(true)} />} />
                    </Routes>
                </main>
            </div>

            {/* Approval Modal */}
            {editingProduct && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 lg:p-8 max-w-lg w-full border border-slate-200 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-black text-slate-800 mb-6 uppercase tracking-tight flex items-center">
                            <BadgePercent className="mr-2 text-primary" /> Product Approval & Pricing
                        </h2>
                        <div className="space-y-10">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Edit Title (Marketplace Display)</label>
                                <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary font-bold text-slate-700"
                                    value={approvalData.title} onChange={e => setApprovalData({ ...approvalData, title: e.target.value })} /></div><div className='flex items-center space-x-2 bg-blue-50 p-4 rounded-xl border border-blue-100 mt-4'><input type='checkbox' id='shipFromChina' className='w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500' checked={approvalData.shipFromChina} onChange={e => setApprovalData({ ...approvalData, shipFromChina: e.target.checked })} /><label htmlFor='shipFromChina' className='text-sm font-bold text-blue-700'>Ship from China (Global Import Portal only)</label>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Category</label>
                                    <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary font-bold text-slate-700 text-xs"
                                        value={chinaFormData.category} onChange={e => setChinaFormData({ ...chinaFormData, category: e.target.value, subCategory: '' })}>
                                        <option value="">Select Category</option>
                                        {CATEGORIES_LIST.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Sub Category</label>
                                    <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary font-bold text-slate-700 text-xs"
                                        value={chinaFormData.subCategory} onChange={e => setChinaFormData({ ...chinaFormData, subCategory: e.target.value })}>
                                        <option value="">Select Sub Category</option>
                                        {CATEGORIES_LIST.find(c => c.name === chinaFormData.category)?.subCategories.map(sc => (
                                            <option key={sc.name} value={sc.name}>{sc.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Stock</label>
                                    <input type="number" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary font-bold text-slate-700"
                                        value={chinaFormData.stock} onChange={e => setChinaFormData({ ...chinaFormData, stock: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1 custom-space">Edit Description</label>
                                <textarea className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary font-bold text-slate-700 h-24"
                                    value={approvalData.description} onChange={e => setApprovalData({ ...approvalData, description: e.target.value })} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">HSN Code</label>
                                    <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary font-bold text-slate-700"
                                        value={approvalData.hsnCode} onChange={e => setApprovalData({ ...approvalData, hsnCode: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">GST (%)</label>
                                    <input type="number" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary font-bold text-slate-700"
                                        value={approvalData.gstPercentage} onChange={e => setApprovalData({ ...approvalData, gstPercentage: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Admin Commission (%)</label>
                                <div className="relative">
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">%</span>
                                    <input type="number" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary font-bold text-slate-700"
                                        value={approvalData.commission} onChange={e => setApprovalData({ ...approvalData, commission: e.target.value })} />
                                </div>
                            </div>

                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">
                                    Country Prices
                                </label>

                                {[
                                    { code: "IN", symbol: "?" },
                                    { code: "US", symbol: "$" },
                                    { code: "UK", symbol: "£" },
                                    { code: "CA", symbol: "C$" },
                                    { code: "AU", symbol: "A$" },
                                    { code: "UAE", symbol: "AD " },
                                    { code: "INTL", symbol: "$" }
                                ].map((country) => (
                                    <div key={country.code} className="flex items-center mb-2">

                                        <span className="w-12 text-xs font-bold text-slate-500">
                                            {country.code}
                                        </span>

                                        <div className="relative w-full">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                                                {country.symbol}
                                            </span>

                                            <input
                                                type="number"
                                                inputMode="decimal"
                                                value={approvalData.prices[country.code]}
                                                onChange={(e) =>
                                                    setApprovalData({
                                                        ...approvalData,
                                                        prices: {
                                                            ...approvalData.prices,
                                                            [country.code]: e.target.value
                                                        }
                                                    })
                                                }
                                                className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-primary font-bold text-sm text-slate-700"
                                            />
                                        </div>

                                    </div>
                                ))}
                            </div>

                            {/* Image Preview Section */}
                            {approvalData.imageUrls && approvalData.imageUrls.length > 0 && (
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Product Images</label>
                                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                                        {approvalData.imageUrls.map((img, idx) => (
                                            <div key={idx} className="w-16 h-16 rounded-lg bg-slate-100 flex-shrink-0 border border-slate-200 overflow-hidden p-1">
                                                <img src={img} alt="" className="w-full h-full object-contain" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Variations Review Section */}
                            {approvalData.variations && approvalData.variations.length > 0 && (
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Variations</h4>
                                    <div className="space-y-2">
                                        {approvalData.variations.map((v, idx) => (
                                            <div key={idx} className="flex justify-between text-xs">
                                                <span className="font-bold text-slate-600">{v.name}:</span>
                                                <span className="text-slate-500 font-medium">{Array.isArray(v.values) ? v.values.join(', ') : v.values}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}



                            {/* Tiered Pricing Review Section */}
                            {approvalData.tieredPricing && approvalData.tieredPricing.length > 0 && (
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Volume Discounts</h4>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="text-[9px] font-black uppercase text-slate-400">
                                                <tr>
                                                    <th className="pb-1 pr-2">MOQ</th>
                                                    <th className="pb-1">Price</th>
                                                    <th className="pb-1">Length</th>
                                                    <th className="pb-1">Width</th>
                                                    <th className="pb-1">Height</th>
                                                    <th className="pb-1">Weight</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200/50 font-medium text-slate-600">
                                                {approvalData.tieredPricing.map((tp, idx) => (
                                                    <tr key={idx}>
                                                        <td className="py-2 text-sm font-black text-slate-700">{tp.moq}</td>
                                                        <td className="py-1">
                                                            <div className="relative max-w-[80px]">
                                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">&#8377;</span>
                                                                <input
                                                                    type="number"
                                                                    className="w-full pl-5 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-primary text-slate-700 font-bold text-xs"
                                                                    value={tp.price}
                                                                    onChange={(e) => {
                                                                        const newTiers = [...approvalData.tieredPricing];
                                                                        newTiers[idx].price = e.target.value;
                                                                        setApprovalData({ ...approvalData, tieredPricing: newTiers });
                                                                    }}
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className="py-1">
                                                            <input type="number" placeholder="L" className="w-[60px] px-2 py-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-primary text-slate-700 font-bold text-xs"
                                                                value={tp.length} onChange={e => {
                                                                    const newTiers = [...approvalData.tieredPricing];
                                                                    newTiers[idx].length = e.target.value;
                                                                    setApprovalData({ ...approvalData, tieredPricing: newTiers });
                                                                }} />
                                                        </td>
                                                        <td className="py-1">
                                                            <input type="number" placeholder="B" className="w-[60px] px-2 py-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-primary text-slate-700 font-bold text-xs"
                                                                value={tp.breadth || tp.width} onChange={e => {
                                                                    const newTiers = [...approvalData.tieredPricing];
                                                                    newTiers[idx].breadth = e.target.value;
                                                                    setApprovalData({ ...approvalData, tieredPricing: newTiers });
                                                                }} />
                                                        </td>
                                                        <td className="py-1">
                                                            <input type="number" placeholder="H" className="w-[60px] px-2 py-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-primary text-slate-700 font-bold text-xs"
                                                                value={tp.height} onChange={e => {
                                                                    const newTiers = [...approvalData.tieredPricing];
                                                                    newTiers[idx].height = e.target.value;
                                                                    setApprovalData({ ...approvalData, tieredPricing: newTiers });
                                                                }} />
                                                        </td>
                                                        <td className="py-1">
                                                            <input type="number" placeholder="Wt" className="w-[60px] px-2 py-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-primary text-slate-700 font-bold text-xs"
                                                                value={tp.weight} onChange={e => {
                                                                    const newTiers = [...approvalData.tieredPricing];
                                                                    newTiers[idx].weight = e.target.value;
                                                                    setApprovalData({ ...approvalData, tieredPricing: newTiers });
                                                                }} />
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                            <div className="flex space-x-3 pt-6">
                                <button onClick={() => handleApprove(editingProduct, 'approved')} className="flex-1 bg-primary text-white py-3 rounded-xl font-black uppercase text-xs shadow-lg shadow-blue-500/30 hover:bg-blue-600">Approve & Go Live</button>
                                <button onClick={() => handleApprove(editingProduct, 'rejected')} className="flex-1 bg-red-500 text-white py-3 rounded-xl font-black uppercase text-xs shadow-lg shadow-red-500/30 hover:bg-red-600">Reject Product</button>
                                <button onClick={() => setEditingProduct(null)} className="flex-1 bg-slate-100 text-slate-500 py-3 rounded-xl font-black uppercase text-xs hover:bg-slate-200 transition">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ========== EDIT APPROVED PRODUCT MODAL ========== */}
            {editingApprovedProduct && approvedEditData && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[110] p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 max-h-[92vh] overflow-y-auto my-4">
                        {/* Header */}
                        <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-slate-200 flex items-center justify-between rounded-t-2xl">
                            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                                <Edit2 size={18} className="text-primary" /> Edit Product
                            </h2>
                            <button onClick={() => { setEditingApprovedProduct(null); setApprovedEditData(null); }} className="text-slate-400 hover:text-slate-600 transition">
                                <XCircle size={22} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Image Preview + URL Management */}
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Product Images</label>
                                <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
                                    {approvedEditData.imageUrls.map((img, idx) => (
                                        <div key={idx} className="relative flex-shrink-0 w-16 h-16 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden group">
                                            <img src={img} alt="" className="w-full h-full object-contain p-1" />
                                            <button
                                                onClick={() => setApprovedEditData(prev => ({ ...prev, imageUrls: prev.imageUrls.filter((_, i) => i !== idx) }))}
                                                className="absolute inset-0 bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        id="new-image-url-input"
                                        placeholder="Paste image URL and press Add"
                                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium outline-none focus:border-primary"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && e.target.value.trim()) {
                                                setApprovedEditData(prev => ({ ...prev, imageUrls: [...prev.imageUrls, e.target.value.trim()] }));
                                                e.target.value = '';
                                            }
                                        }}
                                    />
                                    <button
                                        onClick={() => {
                                            const inp = document.getElementById('new-image-url-input');
                                            if (inp && inp.value.trim()) {
                                                setApprovedEditData(prev => ({ ...prev, imageUrls: [...prev.imageUrls, inp.value.trim()] }));
                                                inp.value = '';
                                            }
                                        }}
                                        className="bg-primary text-white px-3 py-2 rounded-lg text-xs font-black uppercase flex items-center gap-1 hover:bg-blue-600 transition"
                                    >
                                        <PlusCircle size={14} /> Add
                                    </button>
                                </div>
                            </div>

                            {/* Title */}
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Title</label>
                                <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary font-bold text-slate-700"
                                    value={approvedEditData.title} onChange={e => setApprovedEditData({ ...approvedEditData, title: e.target.value })} /></div><div className='flex items-center space-x-2 bg-blue-50 p-4 rounded-xl border border-blue-100 mt-4'><input type='checkbox' id='editShipFromChina' className='w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500' checked={approvedEditData.shipFromChina} onChange={e => setApprovedEditData({ ...approvedEditData, shipFromChina: e.target.checked })} /><label htmlFor='editShipFromChina' className='text-sm font-bold text-blue-700'>Ship from China (Global Import Portal only)</label>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Description</label>
                                <textarea className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary font-medium text-slate-700 h-24 resize-y"
                                    value={approvedEditData.description} onChange={e => setApprovedEditData({ ...approvedEditData, description: e.target.value })} />
                            </div>

                            {/* Category & Sub-Category */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Category</label>
                                    <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary font-bold text-slate-700"
                                        value={approvedEditData.category} onChange={e => setApprovedEditData({ ...approvedEditData, category: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Sub-Category</label>
                                    <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary font-bold text-slate-700"
                                        value={approvedEditData.subCategory} onChange={e => setApprovedEditData({ ...approvedEditData, subCategory: e.target.value })} />
                                </div>
                            </div>

                            {/* HSN / GST / MOQ / Stock */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">HSN Code</label>
                                    <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary font-bold text-slate-700"
                                        value={approvedEditData.hsnCode} onChange={e => setApprovedEditData({ ...approvedEditData, hsnCode: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">GST (%)</label>
                                    <input type="number" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary font-bold text-slate-700"
                                        value={approvedEditData.gstPercentage} onChange={e => setApprovedEditData({ ...approvedEditData, gstPercentage: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">MOQ</label>
                                    <input type="number" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary font-bold text-slate-700"
                                        value={approvedEditData.moq} onChange={e => setApprovedEditData({ ...approvedEditData, moq: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Stock</label>
                                    <input type="number" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary font-bold text-slate-700"
                                        value={approvedEditData.stock} onChange={e => setApprovedEditData({ ...approvedEditData, stock: e.target.value })} />
                                </div>
                            </div>

                            {/* Commission */}
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Admin Commission (%)</label>
                                <div className="relative">
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">%</span>
                                    <input type="number" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary font-bold text-slate-700"
                                        value={approvedEditData.commission} onChange={e => setApprovedEditData({ ...approvedEditData, commission: e.target.value })} />
                                </div>
                            </div>

                            {/* Shipping Dimensions */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Shipping Dimensions</label>
                                <div className="grid grid-cols-4 gap-3">
                                    {[['weight', 'Weight (kg)'], ['length', 'Length (cm)'], ['breadth', 'Breadth (cm)'], ['height', 'Height (cm)']].map(([field, label]) => (
                                        <div key={field}>
                                            <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">{label}</label>
                                            <input type="number" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-primary font-bold text-sm text-slate-700"
                                                value={approvedEditData[field]} onChange={e => setApprovedEditData({ ...approvedEditData, [field]: e.target.value })} />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Country-Wise Prices */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Country Prices</label>
                                {[{ code: 'IN', symbol: '\u20B9' }, { code: 'US', symbol: '$' }, { code: 'UK', symbol: '\u00A3' }, { code: 'CA', symbol: 'C$' }, { code: 'AU', symbol: 'A$' }, { code: 'UAE', symbol: 'AED' }, { code: 'INTL', symbol: '$' }].map(country => (
                                    <div key={country.code} className="flex items-center mb-2">
                                        <span className="w-10 text-xs font-bold text-slate-500">{country.code}</span>
                                        <div className="relative flex-1">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">{country.symbol}</span>
                                            <input type="number" inputMode="decimal"
                                                value={approvedEditData.prices[country.code]}
                                                onChange={e => setApprovedEditData({ ...approvedEditData, prices: { ...approvedEditData.prices, [country.code]: e.target.value } })}
                                                className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-primary font-bold text-sm text-slate-700" />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Variations */}
                            {approvedEditData.variations && approvedEditData.variations.length > 0 && (
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Variations</h4>
                                    {approvedEditData.variations.map((v, idx) => (
                                        <div key={idx} className="flex items-center gap-3 mb-2">
                                            <input type="text" placeholder="Name"
                                                className="w-28 px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-primary font-bold text-xs text-slate-700"
                                                value={v.name}
                                                onChange={e => { const nv = [...approvedEditData.variations]; nv[idx] = { ...nv[idx], name: e.target.value }; setApprovedEditData({ ...approvedEditData, variations: nv }); }} />
                                            <input type="text" placeholder="Values (comma separated)"
                                                className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-primary font-medium text-xs text-slate-700"
                                                value={Array.isArray(v.values) ? v.values.join(', ') : v.values}
                                                onChange={e => { const nv = [...approvedEditData.variations]; nv[idx] = { ...nv[idx], values: e.target.value.split(',').map(s => s.trim()) }; setApprovedEditData({ ...approvedEditData, variations: nv }); }} />
                                            <button onClick={() => setApprovedEditData(prev => ({ ...prev, variations: prev.variations.filter((_, i) => i !== idx) }))} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Tiered Pricing */}
                            {approvedEditData.tieredPricing && approvedEditData.tieredPricing.length > 0 && (
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Volume / Tiered Pricing</h4>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="text-[9px] font-black uppercase text-slate-400">
                                                <tr>
                                                    <th className="pb-1 pr-2">MOQ</th>
                                                    <th className="pb-1">Price (&#8377;)</th>
                                                    <th className="pb-1">L</th>
                                                    <th className="pb-1">B</th>
                                                    <th className="pb-1">H</th>
                                                    <th className="pb-1">Wt</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200/50 font-medium text-slate-600">
                                                {approvedEditData.tieredPricing.map((tp, idx) => (
                                                    <tr key={idx}>
                                                        {['moq', 'price', 'length', 'breadth', 'height', 'weight'].map(field => (
                                                            <td key={field} className="py-1 pr-1">
                                                                <input type="number"
                                                                    className="w-[60px] px-2 py-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-primary text-slate-700 font-bold text-xs"
                                                                    value={field === 'breadth' ? (tp.breadth ?? tp.width ?? '') : (tp[field] ?? '')}
                                                                    onChange={e => {
                                                                        const nt = [...approvedEditData.tieredPricing];
                                                                        nt[idx] = { ...nt[idx], [field]: e.target.value };
                                                                        setApprovedEditData({ ...approvedEditData, tieredPricing: nt });
                                                                    }} />
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={handleSaveApprovedEdit}
                                    disabled={approvedEditSaving}
                                    className="flex-1 bg-primary text-white py-3 rounded-xl font-black uppercase text-xs shadow-lg shadow-blue-500/30 hover:bg-blue-600 transition disabled:opacity-60"
                                >
                                    {approvedEditSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                                <button
                                    onClick={() => { setEditingApprovedProduct(null); setApprovedEditData(null); }}
                                    className="flex-1 bg-slate-100 text-slate-500 py-3 rounded-xl font-black uppercase text-xs hover:bg-slate-200 transition"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {isChinaCreating && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[110] p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 max-h-[92vh] overflow-y-auto my-4">
                        <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-slate-200 flex items-center justify-between rounded-t-2xl">
                            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                                <PlusCircle size={18} className="text-primary" /> New China Product
                            </h2>
                            <button onClick={() => setIsChinaCreating(false)} className="text-slate-400 hover:text-slate-600 transition">
                                <XCircle size={22} />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Product Title</label>
                                <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary font-bold text-slate-700"
                                    value={chinaFormData.title} onChange={e => setChinaFormData({ ...chinaFormData, title: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Description</label>
                                <textarea className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary font-medium text-slate-700 h-24"
                                    value={chinaFormData.description} onChange={e => setChinaFormData({ ...chinaFormData, description: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Category</label>
                                    <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary font-bold text-slate-700"
                                        value={chinaFormData.category} onChange={e => setChinaFormData({ ...chinaFormData, category: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Stock</label>
                                    <input type="number" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary font-bold text-slate-700"
                                        value={chinaFormData.stock} onChange={e => setChinaFormData({ ...chinaFormData, stock: e.target.value })} />
                                </div>
                            </div>
                            <div className="bg-slate-50/50 p-4 rounded-xl border border-dashed border-slate-300 relative group">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 text-center">Upload New Images</label>
                                <input type="file" multiple accept="image/*" onChange={e => setChinaImages(Array.from(e.target.files))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                <div className="flex flex-col items-center justify-center p-2 text-slate-500 group-hover:text-primary transition">
                                    <PlusCircle size={24} className="mb-1" />
                                    <p className="text-[10px] font-bold">{chinaImages.length > 0 ? `${chinaImages.length} images selected` : 'Click or Drag to Upload'}</p>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Product Image URLs (Alternative)</label>
                                <textarea className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary font-medium text-slate-700 h-20 resize-none"
                                    placeholder="Example: https://img.com/1.jpg, https://img.com/2.jpg"
                                    value={chinaFormData.imageUrls.join(', ')}
                                    onChange={e => setChinaFormData({ ...chinaFormData, imageUrls: e.target.value.split(',').map(s => s.trim()).filter(s => s) })} />
                                {chinaFormData.imageUrls.length > 0 && (
                                    <div className="flex gap-2 mt-2 overflow-x-auto pb-2 no-scrollbar">
                                        {chinaFormData.imageUrls.map((img, idx) => (
                                            <div key={idx} className="w-12 h-12 rounded-lg bg-slate-100 flex-shrink-0 border border-slate-200 overflow-hidden p-1">
                                                <img src={img} alt="" className="w-full h-full object-contain" />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Country Prices (Admin View)</label>
                                <div className="grid grid-cols-2 gap-4">
                                    {['IN', 'US', 'UK', 'CA', 'AU', 'UAE', 'INTL'].map(c => (
                                        <div key={c} className="flex flex-col">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase mb-1">{c}</span>
                                            <input type="number" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-primary font-bold text-xs"
                                                value={chinaFormData.adminPrice[c]} onChange={e => setChinaFormData({ ...chinaFormData, adminPrice: { ...chinaFormData.adminPrice, [c]: e.target.value } })} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <button onClick={handleCreateChinaProduct} disabled={isChinaSubmitting} className={`w-full ${isChinaSubmitting ? 'bg-slate-400' : 'bg-primary hover:bg-blue-600'} text-white py-4 rounded-xl font-black uppercase text-xs shadow-lg shadow-blue-500/30 transition`}>
                                {isChinaSubmitting ? 'Creating Product...' : 'Submit Product'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const AdminOrdersView = ({ orders }) => {
    const handleUpdateLogistics = async (id, status) => {
        try {
            await axios.patch(`${API_BASE_URL}/api/orders/admin/update-logistics/${id}`,
                { logisticsStatus: status },
                { headers: getAuthHeader() }
            );
            window.location.reload();
        } catch (err) {
            alert('Logistics update failed');
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Order Logs & Logistics</h2>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                            <th className="px-6 py-4">Order ID</th>
                            <th className="px-6 py-4 text-center">Product</th>
                            <th className="px-6 py-4 text-center">Amount</th>
                            <th className="px-6 py-4 text-center">Logistics</th>
                            <th className="px-6 py-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-sm">
                        {orders.length > 0 ? orders.map(o => (
                            <tr key={o._id} className="hover:bg-slate-50 transition">
                                <td className="px-6 py-4 font-mono text-[10px] text-slate-400">#{o._id.substring(o._id.length - 8)}</td>
                                <td className="px-6 py-4 text-center font-bold text-slate-700">{o.productId?.title || 'Unknown'}</td>
                                <td className="px-6 py-4 text-center font-bold text-slate-700">&#8377;{o.totalAmount}</td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${o.logisticsStatus === 'delivered' ? 'bg-green-100 text-green-600' :
                                        o.logisticsStatus === 'dispatched' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'
                                        }`}>
                                        {o.logisticsStatus}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <select
                                        onChange={(e) => handleUpdateLogistics(o._id, e.target.value)}
                                        className="bg-slate-100 border-none text-[10px] font-bold rounded-lg px-2 py-1 outline-none cursor-pointer"
                                        value={o.logisticsStatus}
                                    >
                                        <option value="pending">Mark Pending</option>
                                        <option value="dispatched">Mark Dispatched</option>
                                        <option value="delivered">Mark Delivered</option>
                                    </select>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="5" className="px-6 py-12 text-center text-slate-400 font-bold italic">No orders found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const SellersView = ({ sellers, handleToggleBlock }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSeller, setSelectedSeller] = useState(null);

    const filteredSellers = sellers.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Verified Sellers</h2>
                <input
                    type="text"
                    placeholder="Search sellers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-primary"
                />
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[700px]">
                    <thead className="bg-[#f8fafc] text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4">Seller Name</th>
                            <th className="px-6 py-4">Email</th>
                            <th className="px-6 py-4 text-center">Products</th>
                            <th className="px-6 py-4 text-center">Earnings</th>
                            <th className="px-6 py-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-sm">
                        {filteredSellers.length > 0 ? filteredSellers.map(seller => (
                            <tr key={seller._id} className="hover:bg-slate-50 transition">
                                <td className="px-6 py-4 font-bold text-slate-700">{seller.name}</td>
                                <td className="px-6 py-4 text-slate-500">{seller.email}</td>
                                <td className="px-6 py-4 text-center font-bold text-slate-700">{seller.productCount || 0}</td>
                                <td className="px-6 py-4 text-center font-black text-green-600">&#8377;{seller.totalEarnings || 0}</td>
                                <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                    <button
                                        onClick={() => setSelectedSeller(seller)}
                                        className="text-[10px] font-black uppercase px-3 py-1 rounded-lg text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
                                    >
                                        Details
                                    </button>
                                    <button
                                        onClick={() => handleToggleBlock(seller._id)}
                                        className={`text-[10px] font-black uppercase px-3 py-1 rounded-lg transition ${seller.isBlocked ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' : 'text-red-600 bg-red-50 hover:bg-red-100'
                                            }`}
                                    >
                                        {seller.isBlocked ? 'Unblock' : 'Block'}
                                    </button>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="5" className="px-6 py-12 text-center text-slate-400 font-bold italic">No sellers found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Seller Details Modal */}
            {selectedSeller && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 lg:p-8 max-w-2xl w-full border border-slate-200 relative max-h-[90vh] overflow-y-auto">
                        <button
                            onClick={() => setSelectedSeller(null)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition"
                        >
                            <XCircle size={24} />
                        </button>

                        <h2 className="text-xl font-black text-slate-800 mb-6 uppercase tracking-tight flex items-center border-b border-slate-100 pb-4">
                            <User className="mr-2 text-primary" /> Seller Profile
                        </h2>

                        <div className="space-y-6">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Full Name</p>
                                    <p className="font-bold text-slate-800 text-lg">{selectedSeller.name}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded ${selectedSeller.isBlocked ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                        {selectedSeller.isBlocked ? 'Blocked' : 'Active'}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Email</p>
                                    <p className="font-medium text-slate-700">{selectedSeller.email}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Phone</p>
                                    <p className="font-medium text-slate-700">{selectedSeller.countryCode} {selectedSeller.phone}</p>
                                </div>
                            </div>

                            {/* Business & Bank Info */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <h3 className="font-bold text-slate-700 mb-3 flex items-center text-sm uppercase">Business Details</h3>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">GST Number</p>
                                        <p className="font-bold text-slate-700">{selectedSeller.gstNumber || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Pickup Address</p>
                                        <p className="font-medium text-slate-600 text-xs">{selectedSeller.pickupAddress || 'N/A'}</p>
                                    </div>
                                </div>

                                <div className="border-t border-slate-200 pt-3">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Bank Information</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div>
                                            <p className="text-[9px] text-slate-400 uppercase">Account No.</p>
                                            <p className="font-mono font-bold text-slate-700 text-sm">{selectedSeller.bankDetails?.accountNumber || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] text-slate-400 uppercase">IFSC Code</p>
                                            <p className="font-mono font-bold text-slate-700 text-sm">{selectedSeller.bankDetails?.ifscCode || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] text-slate-400 uppercase">Account Name</p>
                                            <p className="font-bold text-slate-700 text-sm">{selectedSeller.bankDetails?.accountName || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Documents */}
                            <div>
                                <h3 className="font-bold text-slate-700 mb-3 flex items-center text-sm uppercase">Documents</h3>
                                <div className="flex gap-3 flex-wrap">
                                    {selectedSeller.gstDocument ?
                                        <a href={selectedSeller.gstDocument} target="_blank" rel="noopener noreferrer" className="px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold flex items-center hover:bg-blue-100 transition">
                                            <FileText size={14} className="mr-1" /> GST Certificate
                                        </a> : <span className="text-xs text-slate-400">No GST Doc</span>
                                    }
                                    {selectedSeller.panDocument ?
                                        <a href={selectedSeller.panDocument} target="_blank" rel="noopener noreferrer" className="px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold flex items-center hover:bg-blue-100 transition">
                                            <FileText size={14} className="mr-1" /> PAN Card
                                        </a> : <span className="text-xs text-slate-400">No PAN Doc</span>
                                    }
                                    {selectedSeller.aadharDocument ?
                                        <a href={selectedSeller.aadharDocument} target="_blank" rel="noopener noreferrer" className="px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold flex items-center hover:bg-blue-100 transition">
                                            <FileText size={14} className="mr-1" /> Aadhar Card
                                        </a> : <span className="text-xs text-slate-400">No Aadhar Doc</span>
                                    }
                                    {selectedSeller.cancelledCheck ?
                                        <a href={selectedSeller.cancelledCheck} target="_blank" rel="noopener noreferrer" className="px-3 py-2 bg-green-50 text-green-600 rounded-lg text-xs font-bold flex items-center hover:bg-green-100 transition">
                                            <FileText size={14} className="mr-1" /> Cancelled Cheque
                                        </a> : <span className="text-xs text-slate-400">No Cheque Doc</span>
                                    }
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                <button
                                    onClick={() => setSelectedSeller(null)}
                                    className="bg-slate-100 text-slate-600 px-6 py-2 rounded-lg font-bold uppercase text-xs hover:bg-slate-200 transition"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const BuyersView = ({ buyers }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredBuyers = buyers.filter(b =>
        b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Registered Buyers</h2>
                <input
                    type="text"
                    placeholder="Search buyers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-primary"
                />
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[700px]">
                    <thead className="bg-[#f8fafc] text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4">Buyer Name</th>
                            <th className="px-6 py-4">Email</th>
                            <th className="px-6 py-4 text-center">Total Orders</th>
                            <th className="px-6 py-4 text-center">Total Spent</th>
                            <th className="px-6 py-4 text-center">Joined Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-sm">
                        {filteredBuyers.length > 0 ? filteredBuyers.map(buyer => (
                            <tr key={buyer._id} className="hover:bg-slate-50 transition">
                                <td className="px-6 py-4 font-bold text-slate-700">{buyer.name}</td>
                                <td className="px-6 py-4 text-slate-500">{buyer.email}</td>
                                <td className="px-6 py-4 text-center font-bold text-slate-700">{buyer.totalOrders || 0}</td>
                                <td className="px-6 py-4 text-center font-black text-green-600">&#8377;{buyer.totalSpent?.toLocaleString() || 0}</td>
                                <td className="px-6 py-4 text-center text-slate-500 text-xs">
                                    {new Date(buyer.createdAt).toLocaleDateString()}
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="5" className="px-6 py-12 text-center text-slate-400 font-bold italic">No buyers found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const ApprovedProductsView = ({ products, onToggleTrending, onEdit }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredProducts = products.filter(p =>
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.sellerId?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Approved &amp; Trending Products</h2>
                <input
                    type="text"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-primary"
                />
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[800px]">
                    <thead className="bg-[#f8fafc] text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4">Product</th>
                            <th className="px-6 py-4 text-center">Seller</th>
                            <th className="px-6 py-4 text-center">Price (IN)</th>
                            <th className="px-6 py-4 text-center">Stock</th>
                            <th className="px-6 py-4 text-center">Trending</th>
                            <th className="px-6 py-4 text-center">Status</th>
                            <th className="px-6 py-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-sm">
                        {filteredProducts.length > 0 ? filteredProducts.map(p => (
                            <tr key={p._id} className="hover:bg-slate-50 transition">
                                <td className="px-6 py-4">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex-shrink-0 flex items-center justify-center p-1 overflow-hidden">
                                            <img src={p.imageUrls?.[0] || 'https://via.placeholder.com/40'} alt="" className="object-contain" />
                                        </div>
                                        <div>
                                            <span className="font-bold text-slate-700 block">{p.title}</span>
                                            {p.subCategory && <span className="text-[10px] text-slate-400">{p.subCategory}</span>}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className="font-semibold text-slate-500">{p.sellerId?.name || 'Unknown'}</span>
                                </td>
                                <td className="px-6 py-4 text-center font-bold text-slate-700">&#8377;{p.adminPrice?.IN || 0}</td>
                                <td className="px-6 py-4 text-center font-bold text-slate-700">{p.stock}</td>
                                <td className="px-6 py-4 text-center">
                                    <button
                                        onClick={() => onToggleTrending(p._id)}
                                        className={`p-2 rounded-full transition-colors ${p.isTrending ? 'bg-yellow-100 text-yellow-500' : 'bg-slate-100 text-slate-300 hover:text-yellow-400'}`}
                                    >
                                        <TrendingUp size={16} className={p.isTrending ? 'fill-current' : ''} />
                                    </button>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className="text-[10px] font-black uppercase px-3 py-1 rounded-lg text-green-600 bg-green-50">Live</span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => onEdit(p)}
                                        className="flex items-center gap-1.5 bg-blue-50 text-blue-600 border border-blue-200 text-[10px] font-black uppercase px-3 py-2 rounded-lg hover:bg-blue-100 transition ml-auto"
                                    >
                                        <Edit2 size={12} /> Edit
                                    </button>
                                    <button onClick={() => { if (window.confirm("Delete product permanently?")) { axios.delete(`${API_BASE_URL}/api/products/admin/delete/${p._id || p.id}`, { headers: getAuthHeader() }).then(() => window.location.reload()); } }} className="flex items-center gap-1 bg-red-50 text-red-600 px-2 py-1 rounded text-[10px] font-black uppercase mt-1 ml-auto"><Trash2 size={12} /> Delete</button>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="7" className="px-6 py-12 text-center text-slate-400 font-bold italic">No approved products found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
const OrdersView = ({ orders }) => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">All Orders</h2>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
                        <tr>
                            <th className="px-6 py-3">Order ID</th>
                            <th className="px-6 py-3">Product</th>
                            <th className="px-6 py-3">Buyer</th>
                            <th className="px-6 py-3 text-right">Amount</th>
                            <th className="px-6 py-3 text-center">Status</th>
                            <th className="px-6 py-3 text-center">Logistics</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-xs">
                        {orders.length > 0 ? orders.map(order => (
                            <tr key={order._id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 font-mono font-bold text-slate-500">#{order._id.slice(-6)}</td>
                                <td className="px-6 py-4 font-bold text-slate-700">
                                    {order.productId?.title || <span className="text-red-400">Deleted Product</span>}
                                    <div className="text-[10px] text-slate-400">Qty: {order.quantity}</div>
                                </td>
                                <td className="px-6 py-4 font-bold text-slate-600">{order.buyerId?.name || 'Unknown'}</td>
                                <td className="px-6 py-4 text-right font-black text-slate-700">&#8377;{order.totalAmount}</td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${order.orderStatus === 'delivered' ? 'bg-green-100 text-green-600' :
                                        order.orderStatus === 'cancelled' ? 'bg-red-100 text-red-600' :
                                            'bg-blue-50 text-blue-600'
                                        }`}>{order.orderStatus}</span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded text-[10px] font-black uppercase">{order.logisticsStatus}</span>
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-400 font-bold italic">No orders found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const PayoutsView = () => {
    const [payouts, setPayouts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSeller, setSelectedSeller] = useState(null);

    useEffect(() => {
        fetchPayouts();
    }, []);

    const fetchPayouts = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/orders/admin/payouts`, { headers: getAuthHeader() });
            setPayouts(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePayoutStatus = async (id, status) => {
        if (!window.confirm(`Mark this payout as ${status.toUpperCase()}?`)) return;
        try {
            await axios.patch(`${API_BASE_URL}/api/orders/admin/payouts/${id}/status`, { status }, { headers: getAuthHeader() });
            setPayouts(prev => prev.map(o => o._id === id ? { ...o, sellerPayoutStatus: status } : o));
        } catch (err) {
            alert('Error updating status');
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Seller Payouts</h2>
                <button onClick={fetchPayouts} className="text-slate-400 hover:text-primary"><Clock size={18} /></button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
                        <tr>
                            <th className="px-6 py-3">ID</th>
                            <th className="px-6 py-3">Seller</th>
                            <th className="px-6 py-3 text-right">Order Amt</th>
                            <th className="px-6 py-3 text-right">Seller Price</th>
                            <th className="px-6 py-3 text-right">Profit</th>
                            <th className="px-6 py-3 text-center">Status</th>
                            <th className="px-6 py-3 text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-xs">
                        {payouts.map(order => {
                            const seller = order.productId?.sellerId || {};
                            const profit = (order.totalAmount - order.sellerEarning).toFixed(2);

                            return (
                                <tr key={order._id} className="hover:bg-slate-50/50">
                                    <td className="px-6 py-4 font-mono font-bold text-slate-500">#{order._id.slice(-6)}</td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-700">{seller.name || 'Unknown'}</div>
                                        <button onClick={() => setSelectedSeller(seller)} className="text-[10px] text-blue-500 font-bold hover:underline">View Account</button>
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-slate-700">&#8377;{order.totalAmount}</td>
                                    <td className="px-6 py-4 text-right font-bold text-blue-600">&#8377;{order.sellerEarning}</td>
                                    <td className="px-6 py-4 text-right font-bold text-green-600">&#8377;{profit}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${order.sellerPayoutStatus === 'paid' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                            {order.sellerPayoutStatus}
                                        </span>
                                    </td>

                                    <td className="px-6 py-4 text-center">
                                        {order.sellerPayoutStatus === 'pending' ? (
                                            <button onClick={() => handleUpdatePayoutStatus(order._id, 'paid')} className="bg-slate-800 text-white px-3 py-1 rounded font-bold text-[10px] hover:bg-slate-700 uppercase">
                                                Mark Paid
                                            </button>
                                        ) : (
                                            <button onClick={() => handleUpdatePayoutStatus(order._id, 'pending')} className="bg-slate-100 text-slate-500 border border-slate-200 px-3 py-1 rounded font-bold text-[10px] hover:bg-slate-200 uppercase">
                                                Revert
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                        {payouts.length === 0 && <tr><td colSpan="7" className="px-6 py-8 text-center text-slate-400 font-bold">No payouts found.</td></tr>}
                    </tbody>
                </table>
            </div>
            {selectedSeller && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 relative">
                        <button onClick={() => setSelectedSeller(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><XCircle size={20} /></button>
                        <h3 className="text-lg font-black text-slate-800 mb-4 uppercase">Account Details</h3>
                        <div className="space-y-4">
                            <div className="bg-slate-50 p-4 rounded-lg">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Account Name</p>
                                <p className="font-bold text-slate-800">{selectedSeller.bankDetails?.accountName || 'N/A'}</p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-lg">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Account Number</p>
                                <p className="font-mono font-bold text-slate-800 text-lg">{selectedSeller.bankDetails?.accountNumber || 'N/A'}</p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-lg">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">IFSC Code</p>
                                <p className="font-mono font-bold text-slate-800">{selectedSeller.bankDetails?.ifscCode || 'N/A'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const AdminChinaView = ({ products, onEdit, onAddNew }) => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center space-x-3">
                    <Globe className="text-primary" size={24} />
                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Ship from China Portal</h2>
                </div>
                <button
                    onClick={onAddNew}
                    className="bg-primary text-white text-xs font-black uppercase px-6 py-2.5 rounded-xl hover:bg-blue-600 transition flex items-center gap-2 shadow-lg shadow-blue-500/20"
                >
                    <PlusCircle size={18} /> Add China Product
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
                        <tr>
                            <th className="px-6 py-3">Product</th>
                            <th className="px-6 py-3">Category</th>
                            <th className="px-6 py-3 text-right">Base Price (IN)</th>
                            <th className="px-6 py-3 text-center">Stock</th>
                            <th className="px-6 py-3 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-xs">
                        {products.length > 0 ? products.map(p => (
                            <tr key={p._id} className="hover:bg-slate-50">
                                <td className="px-6 py-4">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 rounded bg-slate-100 p-1 flex-shrink-0">
                                            <img src={p.imageUrls?.[0]} alt="" className="w-full h-full object-contain" />
                                        </div>
                                        <span className="font-bold text-slate-700">{p.title}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-slate-500 font-bold">{p.category}</td>
                                <td className="px-6 py-4 text-right font-black text-slate-700">&#8377;{typeof p.adminPrice === 'object' ? p.adminPrice?.IN : p.adminPrice}</td>
                                <td className="px-6 py-4 text-center font-bold text-slate-600">{p.stock}</td>
                                <td className="px-6 py-4 text-right">
                                    <button onClick={() => onEdit(p)} className="p-2 text-slate-400 hover:text-primary transition">
                                        <Edit2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400 font-bold italic">No China products found. Add your first listing now.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminDashboard;








