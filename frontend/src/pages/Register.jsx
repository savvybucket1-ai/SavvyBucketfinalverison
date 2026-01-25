import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../utils/auth';

const Register = () => {
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await register(formData);
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
                <div className="text-center mb-8">
                    <span className="inline-block py-1 px-3 rounded-full bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-wider mb-2">
                        For Buyers
                    </span>
                    <h2 className="text-3xl font-bold text-slate-800">Create Account</h2>
                </div>

                {error && <div className="bg-red-100 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                        <input type="text" required className="w-full px-4 py-2 rounded-lg border border-slate-300 outline-none focus:border-primary focus:ring-2 transition"
                            value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                        <input type="email" required className="w-full px-4 py-2 rounded-lg border border-slate-300 outline-none focus:border-primary focus:ring-2 transition"
                            value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                        <input type="password" required className="w-full px-4 py-2 rounded-lg border border-slate-300 outline-none focus:border-primary focus:ring-2 transition"
                            value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                    </div>
                    <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-lg font-semibold hover:bg-slate-800 transition shadow-lg shadow-slate-200">
                        Register as Buyer
                    </button>
                </form>

                <div className="mt-8 space-y-4 text-center">
                    <p className="text-slate-600">
                        Already have an account? <Link to="/login" className="text-primary font-medium hover:underline">Login</Link>
                    </p>
                    <div className="pt-4 border-t border-slate-100">
                        <p className="text-sm text-slate-500">
                            Want to become a supplier? <Link to="/seller/register" className="text-blue-600 font-bold hover:underline">Register as Seller</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
