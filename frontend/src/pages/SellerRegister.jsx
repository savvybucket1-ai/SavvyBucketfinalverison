import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { ChevronRight, Upload, CheckCircle, Building, CreditCard, User, MapPin } from 'lucide-react';
import API_BASE_URL from '../config';

const SellerRegister = () => {
    const [step, setStep] = useState(1); // 1: Contact, 2: Documents, 3: Bank/Address, 4: OTP
    const navigate = useNavigate();

    // Form Data
    const [formData, setFormData] = useState({
        name: '', email: '', phone: '', countryCode: '+91', password: '', role: 'seller',
        gstNumber: '', pickupAddress: '',
        bankAccountNumber: '', bankAccountName: '', bankIfscCode: ''
    });

    // File States
    const [files, setFiles] = useState({
        gstDocument: null,
        panDocument: null,
        aadharDocument: null,
        cancelledCheck: null
    });

    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleGstChange = (e) => {
        // GST number is exactly 15 alphanumeric characters
        const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15);
        setFormData(prev => ({ ...prev, gstNumber: value }));
    };

    const handleFileChange = (e) => {
        const { name, files } = e.target;
        setFiles(prev => ({ ...prev, [name]: files[0] }));
    };

    const handleNext = (e) => {
        e.preventDefault();

        if (step === 1) {
            // Minimum 8 chars, 1 uppercase, 1 special char
            if (!/^(?=.*[A-Z])(?=.*[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]).{8,}$/.test(formData.password)) {
                alert('Password must be at least 8 characters long, contain at least 1 uppercase letter, and 1 symbol.');
                return;
            }
        }

        setStep(prev => prev + 1);
    };

    const handleBack = () => {
        setStep(prev => prev - 1);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const data = new FormData();
        // Append text fields
        Object.keys(formData).forEach(key => data.append(key, formData[key]));

        // Append files
        if (files.gstDocument) data.append('gstDocument', files.gstDocument);
        if (files.panDocument) data.append('panDocument', files.panDocument);
        if (files.aadharDocument) data.append('aadharDocument', files.aadharDocument);
        if (files.cancelledCheck) data.append('cancelledCheck', files.cancelledCheck);
        try {
            const res = await axios.post(`${API_BASE_URL}/api/auth/register`, data, {
                headers: { 'Content-Type': 'multipart/form-data' } // Browser sets boundary automatically
            });

            if (res.data.requireOtp) {
                setStep(4); // Move to OTP step
            } else {
                // Should not happen for new registers usually, but safe fallback
                navigate('/seller/login');
            }
        } catch (err) {
            console.error('Registration Error:', err);
            const status = err.response ? err.response.status : 'No Status';
            const msg = err.response?.data?.error || err.response?.data?.message || err.message;
            alert(`Registration Failed!\nStatus: ${status}\nError: ${msg}\n\nHint: If Status is 413, files are too large (Max 4.5MB total).`);
        } finally {
            setLoading(false);
        }
    };

    const [timer, setTimer] = useState(30);
    const [canResend, setCanResend] = useState(false);

    React.useEffect(() => {
        let interval;
        if (step === 4 && timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        } else if (timer === 0) {
            setCanResend(true);
        }
        return () => clearInterval(interval);
    }, [step, timer]);

    const handleResendOtp = async () => {
        setCanResend(false);
        setTimer(30);
        try {
            await axios.post(`${API_BASE_URL}/api/auth/resend-verification-otp`, { email: formData.email });
            alert('New OTP sent to your email.');
        } catch (err) {
            setCanResend(true);
            setTimer(0);
            alert('Failed to resend OTP: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post(`${API_BASE_URL}/api/auth/verify-email-otp`, { email: formData.email, otp });

            if (res.data.requireApproval) {
                // Determine success state
                alert('Registration Successful! Your account is pending Admin Approval. You will be notified via email.');
                navigate('/seller/login'); // Or a specific 'pending' page
            } else {
                navigate('/seller/login');
            }
        } catch (err) {
            alert('Verification failed: ' + (err.response?.data?.message || err.message));
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">

                {/* Left Side: Progress & Branding */}
                <div className="bg-primary p-8 md:w-1/3 flex flex-col justify-between text-white relative overflow-hidden">
                    <div className="relative z-10">
                        <h1 className="text-3xl font-black uppercase tracking-tight mb-2">Join SavvyBucket</h1>
                        <p className="text-blue-100 font-medium">Become a verified seller and reach millions.</p>
                    </div>

                    <div className="relative z-10 space-y-6 my-8">
                        {/* Step Indicators */}
                        {[
                            { step: 1, label: "Account Info", icon: User },
                            { step: 2, label: "Business Docs", icon: Building },
                            { step: 3, label: "Bank & Address", icon: MapPin },
                            { step: 4, label: "Verification", icon: CheckCircle }
                        ].map((item) => (
                            <div key={item.step} className={`flex items-center gap-3 transition-opacity ${step >= item.step ? 'opacity-100' : 'opacity-40'}`}>
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 ${step >= item.step ? 'bg-white text-primary border-white' : 'border-white/50 text-white'}`}>
                                    {step > item.step ? <CheckCircle size={20} /> : <item.icon size={18} />}
                                </div>
                                <span className="font-bold text-sm uppercase tracking-wider">{item.label}</span>
                            </div>
                        ))}
                    </div>

                    <div className="relative z-10 text-xs text-blue-200">
                        © 2024 SavvyBucket Inc.
                    </div>
                </div>

                {/* Right Side: Forms */}
                <div className="p-8 md:w-2/3 bg-slate-50 overflow-y-auto">

                    {step === 1 && (
                        <form onSubmit={handleNext} className="space-y-4 animate-fadeIn">
                            <h2 className="text-2xl font-black text-slate-800 mb-6">Create Account</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Company / Full Name</label>
                                    <input name="name" type="text" required value={formData.name} onChange={handleInputChange} className="w-full mt-1 p-3 rounded-xl border border-slate-200 focus:border-primary outline-none font-semibold text-slate-900 bg-white" placeholder="e.g. Acme Traders" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Business Email</label>
                                    <input name="email" type="email" required value={formData.email} onChange={handleInputChange} className="w-full mt-1 p-3 rounded-xl border border-slate-200 focus:border-primary outline-none font-semibold text-slate-900 bg-white" placeholder="partner@savvy.com" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Phone Number</label>
                                    <div className="flex gap-2">
                                        <select name="countryCode" value={formData.countryCode} onChange={handleInputChange} className="mt-1 p-3 rounded-xl border border-slate-200 bg-white font-bold text-slate-700">
                                            <option value="+91">+91</option>
                                        </select>
                                        <input name="phone" type="tel" required value={formData.phone} onChange={handleInputChange} className="w-full mt-1 p-3 rounded-xl border border-slate-200 focus:border-primary outline-none font-semibold text-slate-900 bg-white" placeholder="9876543210" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Password</label>
                                    <input name="password" type="password" required value={formData.password} onChange={handleInputChange} className="w-full mt-1 p-3 rounded-xl border border-slate-200 focus:border-primary outline-none font-semibold text-slate-900 bg-white" placeholder="••••••" />
                                </div>
                            </div>
                            <div className="pt-6 flex justify-between items-center">
                                <Link to="/seller/login" className="text-sm font-bold text-slate-400 hover:text-slate-600">Already have an account?</Link>
                                <button type="submit" className="bg-primary text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-600 transition">Next Step <ChevronRight size={18} /></button>
                            </div>
                        </form>
                    )}

                    {step === 2 && (
                        <form onSubmit={handleNext} className="space-y-4 animate-fadeIn">
                            <h2 className="text-2xl font-black text-slate-800 mb-6">Business Documents</h2>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">GST Number <span className="text-slate-400 font-medium">(15 digits)</span></label>
                                <input
                                    name="gstNumber"
                                    type="text"
                                    required
                                    value={formData.gstNumber}
                                    onChange={handleGstChange}
                                    maxLength={15}
                                    minLength={15}
                                    pattern="[A-Z0-9]{15}"
                                    title="GST number must be exactly 15 alphanumeric characters"
                                    className="w-full mt-1 p-3 rounded-xl border border-slate-200 focus:border-primary outline-none font-bold text-slate-700 uppercase tracking-wider"
                                    placeholder="22AAAAA0000A1Z5"
                                />
                                <p className="text-[10px] text-slate-400 mt-1 ml-1">{formData.gstNumber.length}/15 characters</p>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 hover:bg-white transition cursor-pointer relative">
                                    <label className="block cursor-pointer">
                                        <span className="text-xs font-bold text-slate-500 uppercase mb-2 block">Upload GST Certificate *</span>
                                        <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
                                            <Upload size={20} className="text-primary" />
                                            {files.gstDocument ? <span className="text-green-600">{files.gstDocument.name}</span> : <span>Click to upload (PDF/JPG)</span>}
                                        </div>
                                        <input name="gstDocument" type="file" accept=".pdf,.jpg,.jpeg,.png" required={!files.gstDocument} onChange={handleFileChange} className="hidden" />
                                    </label>
                                </div>

                                <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 hover:bg-white transition cursor-pointer relative">
                                    <label className="block cursor-pointer">
                                        <span className="text-xs font-bold text-slate-500 uppercase mb-2 block">Upload PAN Card *</span>
                                        <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
                                            <Upload size={20} className="text-primary" />
                                            {files.panDocument ? <span className="text-green-600">{files.panDocument.name}</span> : <span>Click to upload (PDF/JPG)</span>}
                                        </div>
                                        <input name="panDocument" type="file" accept=".pdf,.jpg,.jpeg,.png" required={!files.panDocument} onChange={handleFileChange} className="hidden" />
                                    </label>
                                </div>

                                <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 hover:bg-white transition cursor-pointer relative">
                                    <label className="block cursor-pointer">
                                        <span className="text-xs font-bold text-slate-500 uppercase mb-2 block">Upload Aadhar Card (Optional)</span>
                                        <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
                                            <Upload size={20} className="text-slate-400" />
                                            {files.aadharDocument ? <span className="text-green-600">{files.aadharDocument.name}</span> : <span>Click to upload (PDF/JPG)</span>}
                                        </div>
                                        <input name="aadharDocument" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} className="hidden" />
                                    </label>
                                </div>
                            </div>

                            <div className="pt-6 flex justify-between">
                                <button type="button" onClick={handleBack} className="text-slate-500 font-bold hover:text-slate-800">Back</button>
                                <button type="submit" className="bg-primary text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-600 transition">Next Step <ChevronRight size={18} /></button>
                            </div>
                        </form>
                    )}

                    {step === 3 && (
                        <form onSubmit={handleSubmit} className="space-y-4 animate-fadeIn">
                            <h2 className="text-2xl font-black text-slate-800 mb-6">Address & Bank Details</h2>

                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Product Pickup Address *</label>
                                    <textarea name="pickupAddress" required value={formData.pickupAddress} onChange={handleInputChange} className="w-full mt-1 p-3 rounded-xl border border-slate-200 focus:border-primary outline-none font-medium text-slate-700 h-24" placeholder="Full address for product pickup..." />
                                </div>
                            </div>

                            <div className="bg-blue-50 p-4 rounded-xl space-y-4 border border-blue-100 mt-4">
                                <div className="flex items-center gap-2 text-primary font-black uppercase text-xs">
                                    <CreditCard size={16} /> Bank Details
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="text-[10px] font-bold text-blue-400 uppercase">Account Holder Name</label>
                                        <input name="bankAccountName" type="text" required value={formData.bankAccountName} onChange={handleInputChange} className="w-full mt-1 p-2 rounded-lg border border-blue-200 focus:border-primary outline-none font-bold text-slate-700" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-blue-400 uppercase">Account Number</label>
                                        <input name="bankAccountNumber" type="text" required value={formData.bankAccountNumber} onChange={handleInputChange} className="w-full mt-1 p-2 rounded-lg border border-blue-200 focus:border-primary outline-none font-bold text-slate-700" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-blue-400 uppercase">IFSC Code</label>
                                        <input name="bankIfscCode" type="text" required value={formData.bankIfscCode} onChange={handleInputChange} className="w-full mt-1 p-2 rounded-lg border border-blue-200 focus:border-primary outline-none font-bold text-slate-700 uppercase" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <div className="border-2 border-dashed border-blue-200 rounded-xl p-4 hover:bg-white transition cursor-pointer">
                                            <label className="block cursor-pointer">
                                                <span className="text-[10px] font-bold text-blue-400 uppercase mb-2 block">Upload Cancelled Check *</span>
                                                <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
                                                    <Upload size={20} className="text-primary" />
                                                    {files.cancelledCheck ? <span className="text-green-600">{files.cancelledCheck.name}</span> : <span>Click to upload (PDF/JPG)</span>}
                                                </div>
                                                <input name="cancelledCheck" type="file" accept=".pdf,.jpg,.jpeg,.png" required={!files.cancelledCheck} onChange={handleFileChange} className="hidden" />
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 flex justify-between items-center">
                                <button type="button" onClick={handleBack} className="text-slate-500 font-bold hover:text-slate-800">Back</button>
                                <button type="submit" disabled={loading} className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-green-700 transition shadow-lg shadow-green-500/20">
                                    {loading ? 'Submitting...' : 'Submit & Verify'} <CheckCircle size={18} />
                                </button>
                            </div>
                        </form>
                    )}

                    {step === 4 && (
                        <form onSubmit={handleVerifyOtp} className="space-y-6 animate-fadeIn text-center py-10">
                            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle size={40} />
                            </div>
                            <h2 className="text-2xl font-black text-slate-800">Verify Email</h2>
                            <p className="text-slate-500 font-medium">We've sent a 6-digit OTP to <span className="text-slate-800 font-bold">{formData.email}</span></p>

                            <div>
                                <input name="otp" type="text" required value={otp} onChange={(e) => setOtp(e.target.value)}
                                    className="w-full max-w-xs mx-auto text-center text-3xl tracking-[0.5em] p-4 rounded-xl border-2 border-slate-200 focus:border-primary outline-none font-black text-slate-800" placeholder="000000" maxLength={6} />
                            </div>

                            <button type="submit" className="w-full max-w-xs mx-auto bg-primary text-white py-4 rounded-xl font-bold uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-600 transition">
                                Verify & Finish
                            </button>

                            <div className="mt-4">
                                <button
                                    type="button"
                                    onClick={handleResendOtp}
                                    disabled={!canResend}
                                    className={`text-sm font-bold ${canResend ? 'text-primary hover:underline cursor-pointer' : 'text-slate-400 cursor-not-allowed'}`}
                                >
                                    {canResend ? "Resend OTP" : `Resend OTP in ${timer}s`}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SellerRegister;
