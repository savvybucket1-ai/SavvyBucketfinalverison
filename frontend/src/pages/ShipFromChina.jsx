import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Ship, Mail, Phone, User, Building, Package, Globe, ChevronRight, CheckCircle2, AlertCircle, X } from 'lucide-react';
import API_BASE_URL from '../config';

const ShipFromChina = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        company: '',
        quantity: '',
        message: ''
    });

    useEffect(() => {
        fetchChinaProducts();
    }, []);

    const fetchChinaProducts = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/products/buyer/china-list`);
            setProducts(res.data);
        } catch (err) {
            console.error('Error fetching china products:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleInquirySubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await axios.post(`${API_BASE_URL}/api/china-inquiry/inquiry`, {
                ...formData,
                productId: selectedProduct._id,
                productTitle: selectedProduct.title
            });
            setSuccess(true);
            setTimeout(() => {
                setShowModal(false);
                setSuccess(false);
                setFormData({ name: '', email: '', phone: '', company: '', quantity: '', message: '' });
            }, 3000);
        } catch (err) {
            alert('Failed to send inquiry. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            {/* Hero Section */}
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white py-16 px-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 opacity-10 -translate-y-1/2 translate-x-1/3">
                    <Globe size={600} />
                </div>
                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="flex items-center gap-3 mb-4 text-blue-400">
                        <Ship size={24} />
                        <span className="uppercase tracking-widest font-black text-sm">SavvyBucket Global</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
                        Import Directly <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">Ship from China</span>
                    </h1>
                    <p className="text-lg text-slate-300 max-w-2xl mb-8 font-medium">
                        Access millions of premium products directly from Chinese manufacturers. 
                        We handle the logistics while you focus on growing your business. 
                        Enquire now for bulk pricing and safe shipping.
                    </p>
                    <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
                            <CheckCircle2 size={16} className="text-blue-400" />
                            <span className="text-sm font-bold">Verified Factories</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
                            <CheckCircle2 size={16} className="text-blue-400" />
                            <span className="text-sm font-bold">Quality Inspection</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
                            <CheckCircle2 size={16} className="text-blue-400" />
                            <span className="text-sm font-bold">Safe Logistics</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Product Grid */}
            <div className="max-w-7xl mx-auto px-6 py-12">
                <div className="flex items-center justify-between mb-10">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Available for Global Import</h2>
                        <p className="text-slate-500 text-sm mt-1">Select a product to request a dynamic quote and shipping timeline.</p>
                    </div>
                    <div className="hidden md:flex items-center gap-2 text-primary font-bold text-sm bg-primary/5 px-4 py-2 rounded-xl">
                        <AlertCircle size={18} />
                        Note: Bulk Inquiries Only
                    </div>
                </div>

                {products.length === 0 ? (
                    <div className="bg-white rounded-3xl p-16 text-center shadow-xl border border-slate-100 italic">
                        <Package size={64} className="mx-auto text-slate-200 mb-4" />
                        <p className="text-slate-400 font-bold">No global products listed currently. Check back soon!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
                        {products.map(p => (
                            <div key={p._id} className="group bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 flex flex-col h-full">
                                <div className="relative aspect-square overflow-hidden bg-slate-50">
                                    <img 
                                        src={p.imageUrls?.[0] || 'https://via.placeholder.com/400'} 
                                        alt={p.title} 
                                        className="w-full h-full object-contain p-6 group-hover:scale-110 transition-transform duration-700"
                                    />
                                    <div className="absolute top-4 left-4">
                                        <span className="bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-widest shadow-lg">Ship from China</span>
                                    </div>
                                </div>
                                <div className="p-6 flex-1 flex flex-col">
                                    <div className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2 px-2 py-0.5 bg-primary/5 rounded-md inline-block self-start">{p.category}</div>
                                    <h3 className="text-lg font-black text-slate-800 mb-3 line-clamp-2 leading-snug group-hover:text-primary transition-colors">{p.title}</h3>
                                    
                                    <div className="mt-auto space-y-4">
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-2xl font-black text-slate-800">₹{p.adminPrice?.IN?.toLocaleString() || 'Quote Price'}</span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">per unit</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-2 text-center">
                                                <div className="text-[9px] text-slate-400 uppercase font-black mb-0.5">Min Order</div>
                                                <div className="text-xs font-black text-slate-700">{p.moq} Units</div>
                                            </div>
                                            <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-2 text-center">
                                                <div className="text-[9px] text-slate-400 uppercase font-black mb-0.5">Shipping</div>
                                                <div className="text-xs font-black text-slate-700">15-25 Days</div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                setSelectedProduct(p);
                                                setShowModal(true);
                                            }}
                                            className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 group-hover:gap-3"
                                        >
                                            Inquire Bulk Price <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Inquiry Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
                    <div className="relative bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden border border-white/20 animate-in fade-in zoom-in duration-300">
                        {success ? (
                            <div className="p-16 text-center">
                                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <CheckCircle2 size={40} />
                                </div>
                                <h2 className="text-3xl font-black text-slate-800 mb-2">Inquiry Sent!</h2>
                                <p className="text-slate-500 font-medium">Our global trade team will contact you within 24 hours.</p>
                            </div>
                        ) : (
                            <>
                                <div className="bg-primary p-8 text-white relative">
                                    <button 
                                        onClick={() => setShowModal(false)}
                                        className="absolute top-6 right-6 text-white/60 hover:text-white transition"
                                    >
                                        <X size={24} />
                                    </button>
                                    <div className="flex items-center gap-4 mb-2">
                                        <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                                            <Mail size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black uppercase tracking-tight">Global Inquiry Form</h3>
                                            <p className="text-white/70 text-sm font-medium">Requesting quote for bulk order</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-8">
                                    <div className="flex items-center gap-4 mb-8 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <div className="w-12 h-12 bg-white rounded-xl flex-shrink-0 border border-slate-100 overflow-hidden">
                                            <img src={selectedProduct?.imageUrls?.[0]} alt="" className="w-full h-full object-contain p-1" />
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selected Product</div>
                                            <div className="text-slate-800 font-bold truncate text-sm">{selectedProduct?.title}</div>
                                        </div>
                                    </div>

                                    <form onSubmit={handleInquirySubmit} className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="relative">
                                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                                <input 
                                                    type="text" required placeholder="Full Name *" 
                                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-primary font-bold text-sm text-slate-700 transition"
                                                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                                                />
                                            </div>
                                            <div className="relative">
                                                <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                                <input 
                                                    type="text" placeholder="Company Name" 
                                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-primary font-bold text-sm text-slate-700 transition"
                                                    value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})}
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="relative">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                                <input 
                                                    type="email" required placeholder="Email Address *" 
                                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-primary font-bold text-sm text-slate-700 transition"
                                                    value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                                                />
                                            </div>
                                            <div className="relative">
                                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                                <input 
                                                    type="tel" required placeholder="Phone Number *" 
                                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-primary font-bold text-sm text-slate-700 transition"
                                                    value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                                                />
                                            </div>
                                        </div>
                                        <div className="relative">
                                            <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <input 
                                                type="number" required placeholder="Required Quantity *" 
                                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-primary font-bold text-sm text-slate-700 transition"
                                                value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})}
                                            />
                                        </div>
                                        <textarea 
                                            placeholder="Specify requirements (Custom branding, specific colors, etc.)" 
                                            className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-primary font-bold text-sm text-slate-700 transition h-24 resize-none"
                                            value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})}
                                        ></textarea>
                                        
                                        <button 
                                            type="submit" 
                                            disabled={submitting}
                                            className="w-full bg-primary text-white py-5 rounded-[20px] font-black uppercase text-sm tracking-widest shadow-xl shadow-primary/30 hover:bg-blue-600 transition-all flex items-center justify-center gap-2"
                                        >
                                            {submitting ? 'Sending Request...' : 'Send Inquiry Now'}
                                        </button>
                                        <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest">Secure Global Trade via SavvyBucket</p>
                                    </form>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShipFromChina;
