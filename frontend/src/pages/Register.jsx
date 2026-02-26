import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../utils/auth';
import axios from 'axios';
import API_BASE_URL from '../config';

const Register = () => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', countryCode: '+91', password: '' });
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (step === 1) {
            // Validation
            if (formData.countryCode === '+91' && !/^\d{10}$/.test(formData.phone)) {
                setError('Please enter a valid 10-digit phone number for India');
                return;
            }

            if (formData.gstNumber && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(formData.gstNumber)) {
                setError('Please enter a valid GST number (e.g. 22AAAAA0000A1Z5)');
                return;
            }

            // Minimum 8 chars, 1 uppercase, 1 special char
            if (!/^(?=.*[A-Z])(?=.*[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]).{8,}$/.test(formData.password)) {
                setError('Password must be at least 8 characters long, contain at least 1 uppercase letter, and 1 symbol.');
                return;
            }

            try {
                const res = await register(formData);
                if (res.data.requireOtp) {
                    setStep(2);
                } else {
                    navigate('/login');
                }
            } catch (err) {
                if (err.response?.data?.requireVerification) {
                    // Start OTP flow if user exists but unverified
                    setStep(2);
                }
                setError(err.response?.data?.error || 'Registration failed');
            }
        } else {
            // Verify OTP
            try {
                const res = await axios.post(`${API_BASE_URL}/api/auth/verify-email-otp`, { email: formData.email, otp });
                // Similar to login success
                localStorage.setItem('user', JSON.stringify({ ...res.data.user, token: res.data.token }));
                window.dispatchEvent(new Event('cartUpdated')); // Update auth state
                navigate('/');
            } catch (err) {
                setError(err.response?.data?.message || 'Verification failed');
            }
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
                <div className="text-center mb-8">

                    <h2 className="text-3xl font-bold text-slate-800">{step === 1 ? 'Create Account' : 'Verify Email'}</h2>
                </div>

                {error && <div className="bg-red-100 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}

                {step === 1 ? (
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
                            <label className="block text-sm font-medium text-slate-700 mb-1">GST Number <span className="text-slate-400 font-normal">(Optional)</span></label>
                            <input type="text" className="w-full px-4 py-2 rounded-lg border border-slate-300 outline-none focus:border-primary focus:ring-2 transition uppercase placeholder-slate-400"
                                placeholder="FOR BUSINESS BUYERS" maxLength="15"
                                value={formData.gstNumber || ''} onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                            <div className="flex gap-2">
                                <select
                                    className="px-2 py-2 rounded-lg border border-slate-300 outline-none focus:border-primary bg-slate-50"
                                    value={formData.countryCode}
                                    onChange={(e) => setFormData({ ...formData, countryCode: e.target.value })}
                                >
                                    <option value="+91">+91 (IN)</option>
                                    <option value="+1">+1 (US)</option>
                                    <option value="+44">+44 (UK)</option>
                                </select>
                                <input type="tel" required className="flex-1 px-4 py-2 rounded-lg border border-slate-300 outline-none focus:border-primary focus:ring-2 transition"
                                    placeholder={formData.countryCode === '+91' ? '1234567890' : 'Phone Number'}
                                    value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                            <input type="password" required className="w-full px-4 py-2 rounded-lg border border-slate-300 outline-none focus:border-primary focus:ring-2 transition"
                                value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                        </div>
                        <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-lg font-semibold hover:bg-slate-800 transition shadow-lg shadow-slate-200">
                            Register & Verify
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="text-center text-sm text-slate-500 mb-4">
                            We have sent a verification code to <strong>{formData.email}</strong>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Enter OTP</label>
                            <input type="text" required className="w-full px-4 py-3 rounded-lg border border-slate-300 outline-none focus:border-primary focus:ring-2 transition text-center text-2xl tracking-widest"
                                placeholder="123456"
                                value={otp} onChange={(e) => setOtp(e.target.value)} />
                        </div>
                        <button type="submit" className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition shadow-lg shadow-green-200">
                            Verify Email
                        </button>
                        <button type="button" onClick={() => setStep(1)} className="w-full text-slate-500 py-2 text-sm hover:underline">
                            Back to Register
                        </button>
                    </form>
                )}

                <div className="mt-8 space-y-4 text-center">
                    <p className="text-slate-600">
                        Already have an account? <Link to="/login" className="text-primary font-medium hover:underline">Login</Link>
                    </p>

                </div>
            </div>
        </div>
    );
};

export default Register;
