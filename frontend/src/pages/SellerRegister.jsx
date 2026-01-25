import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const SellerRegister = () => {
    const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'seller' });
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:5000/api/auth/register', formData);
            navigate('/seller/login');
        } catch (err) {
            alert('Registration failed: ' + (err.response?.data?.error || err.message));
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 py-20 border-b border-slate-800">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 transform hover:scale-[1.01] transition-all">
                <div className="text-center mb-10">
                    <span className="text-primary font-black uppercase tracking-[0.2em] text-[10px] bg-blue-50 px-3 py-1 rounded-full">Onboarding</span>
                    <h2 className="text-4xl font-black text-slate-800 mt-4">Scale with Us</h2>
                    <p className="text-slate-400 font-bold mt-2">Become a verified global supplier</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6 font-bold">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Company / Full Name</label>
                        <input type="text" required className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:border-primary font-bold text-slate-700 transition-all placeholder:text-slate-300"
                            placeholder="e.g. Acme Logistics"
                            value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Business Email</label>
                        <input type="email" required className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:border-primary font-bold text-slate-700 transition-all placeholder:text-slate-300"
                            placeholder="business@example.com"
                            value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Password</label>
                        <input type="password" required className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:border-primary font-bold text-slate-700 transition-all mb-4"
                            value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                    </div>
                    <button type="submit" className="w-full bg-primary text-white py-5 rounded-2xl font-black shadow-xl shadow-blue-500/30 hover:bg-blue-600 hover:-translate-y-1 transition-all uppercase tracking-widest text-xs">
                        Start Selling
                    </button>
                </form>
                <div className="mt-8 text-center font-bold">
                    <p className="text-slate-500 text-sm">
                        Existing partner? <Link to="/seller/login" className="text-primary hover:underline">Login here</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SellerRegister;
