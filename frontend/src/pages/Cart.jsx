import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getAuthHeader, getCurrentUser } from '../utils/auth';
import { Trash2, CreditCard, ShieldCheck, Plus, Minus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config';


const Cart = () => {
    const [cart, setCart] = useState([]);
    const navigate = useNavigate();
    const user = getCurrentUser();

    const [showAddressForm, setShowAddressForm] = useState(false);
    const [shippingAddress, setShippingAddress] = useState({
        fullName: user?.name || '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        pinCode: '',
        phone: '',
        alternatePhone: '',
        addressType: 'Home',
        landmark: ''
    });

    useEffect(() => {
        const savedCart = JSON.parse(localStorage.getItem('cart') || '[]');
        setCart(savedCart);
    }, []);

    const removeFromCart = (id) => {
        const newCart = cart.filter(item => (item.cartItemId || item._id) !== id);
        setCart(newCart);
        localStorage.setItem('cart', JSON.stringify(newCart));

        // Dispatch event to update cart count in Navbar
        window.dispatchEvent(new Event('cartUpdated'));
    };

    const updateQuantity = (id, newQuantity) => {
        const item = cart.find(i => (i.cartItemId || i._id) === id);
        const minQty = item?.moq || 1;

        if (newQuantity < minQty) return;

        const newCart = cart.map(item =>
            (item.cartItemId || item._id) === id ? { ...item, quantity: newQuantity } : item
        );
        setCart(newCart);
        localStorage.setItem('cart', JSON.stringify(newCart));

        // Dispatch event to update cart count in Navbar
        window.dispatchEvent(new Event('cartUpdated'));
    };

    // ... (helper functions unchanged)

    const getPriceForQuantity = (item, qty) => {
        let price = item.adminPrice;
        if (item.tieredPricing && item.tieredPricing.length > 0) {
            const sortedTiers = [...item.tieredPricing].sort((a, b) => b.moq - a.moq);
            const applicableTier = sortedTiers.find(tier => qty >= tier.moq);
            if (applicableTier) price = applicableTier.price;
        }
        return price;
    };

    const getItemSubtotal = (item) => {
        const unitPrice = getPriceForQuantity(item, item.quantity);
        const priceWithGST = Math.round(unitPrice * (1 + (item.gstPercentage || 0) / 100));
        return priceWithGST * item.quantity;
    };

    const total = cart.reduce((acc, item) => acc + getItemSubtotal(item), 0);



    if (cart.length === 0) return <div className="text-center py-20 font-medium text-slate-400">Your cart is empty</div>;

    return (
        <div className="max-w-4xl mx-auto px-4 py-12">
            <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                    {cart.map((item, idx) => (
                        <div key={item.cartItemId || item._id + idx} className="bg-white p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            <div className="w-full sm:w-24 h-40 sm:h-24 bg-slate-100 rounded-lg flex-shrink-0 overflow-hidden relative">
                                <img
                                    src={item.imageUrls?.[0] || 'https://via.placeholder.com/100'}
                                    alt={item.title}
                                    className="w-full h-full object-contain p-2 absolute inset-0"
                                />
                            </div>
                            <div className="flex-1 w-full">
                                <div className="flex justify-between items-start gap-2">
                                    <h3 className="font-bold text-slate-800 line-clamp-2">{item.title}</h3>
                                    <button onClick={() => removeFromCart(item.cartItemId || item._id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition sm:hidden flex-shrink-0 -mt-2 -mr-2">
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                                <p className="text-sm text-slate-500 line-clamp-1">{item.description}</p>
                                {item.selectedVariation && Object.keys(item.selectedVariation).length > 0 && (
                                    <div className="mt-1 text-xs text-slate-500 font-bold">
                                        {Object.entries(item.selectedVariation).map(([k, v]) => `${k}: ${v}`).join(', ')}
                                    </div>
                                )}
                                <div className="mt-2 flex flex-wrap items-center gap-4">
                                    <div className="flex flex-col">
                                        <span className="text-primary font-bold text-lg">
                                            ₹{Math.round(getPriceForQuantity(item, item.quantity) * (1 + (item.gstPercentage || 0) / 100)).toLocaleString()}
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-medium">(Incl. {item.gstPercentage || 0}% GST)</span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <select
                                            className="bg-slate-50 border-2 border-slate-100 rounded-lg px-2 py-1 font-bold text-slate-700 outline-none focus:border-primary"
                                            value={item.quantity}
                                            onChange={(e) => updateQuantity(item.cartItemId || item._id, parseInt(e.target.value))}
                                        >
                                            {[item.moq, ...(item.tieredPricing || []).map(t => t.moq), item.quantity]
                                                .filter((v, i, a) => a.indexOf(v) === i)
                                                .sort((a, b) => a - b)
                                                .map(q => (
                                                    <option key={q} value={q}>{q}</option>
                                                ))
                                            }
                                        </select>

                                    </div>

                                    <div className="flex flex-col text-xs text-slate-500 whitespace-nowrap">
                                        <span>Min Order: <span className="font-bold text-slate-700">{item.moq || 1}</span></span>
                                        <span>Total: <span className="font-bold text-slate-700">₹{getItemSubtotal(item).toLocaleString()}</span></span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => removeFromCart(item.cartItemId || item._id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition hidden sm:block flex-shrink-0 ml-2">
                                <Trash2 size={20} />
                            </button>
                        </div>
                    ))}
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border h-fit">
                    <h2 className="text-xl font-bold mb-4">Summary</h2>
                    <div className="space-y-2 mb-6">
                        <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>₹{total.toLocaleString()}</span></div>
                        <div className="flex justify-between text-slate-600"><span>Service Fee</span><span>₹0</span></div>
                        <div className="pt-2 border-t flex justify-between font-bold text-xl"><span>Total</span><span>₹{total.toLocaleString()}</span></div>
                    </div>


                    <button
                        onClick={() => {
                            if (!user) return navigate('/login');
                            setShowAddressForm(true);
                        }}
                        className="w-full bg-slate-800 text-white py-4 rounded-xl font-bold flex items-center justify-center space-x-2 hover:bg-slate-900 transition mt-3"
                    >
                        <CreditCard size={20} />
                        <span>Checkout</span>
                    </button>
                    <div className="mt-4 flex items-center justify-center space-x-2 text-slate-400 text-xs text-center">
                        <ShieldCheck size={14} />
                        <span>SSL Encrypted Transactions</span>
                    </div>
                </div>
            </div>

            {/* Address Modal */}
            {showAddressForm && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full border border-slate-200 max-h-[90vh] overflow-y-auto scrollbar-hide">
                        <h2 className="text-xl font-bold mb-4 text-slate-800">Shipping Details</h2>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            try {
                                const items = cart.map(item => ({
                                    productId: item._id,
                                    quantity: item.quantity,
                                    selectedVariation: item.selectedVariation // Include variations
                                }));
                                const res = await axios.post(`${API_BASE_URL}/api/orders/create-easebuzz-session`,
                                    { items, shippingAddress },
                                    { headers: getAuthHeader() }
                                );
                                if (res.data.url) {
                                    window.location.href = res.data.url;
                                }
                            } catch (err) {
                                if (err.response?.status === 401) {
                                    alert('Session expired or invalid token. Please log in again.');
                                    localStorage.removeItem('user');
                                    navigate('/login');
                                } else {
                                    alert('Checkout failed: ' + (err.response?.data?.message || err.message));
                                }
                            }
                        }} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Full Name</label>
                                <input type="text" required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                                    value={shippingAddress.fullName} onChange={e => setShippingAddress({ ...shippingAddress, fullName: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Address Line 1</label>
                                <input type="text" required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                                    value={shippingAddress.addressLine1} onChange={e => setShippingAddress({ ...shippingAddress, addressLine1: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Address Line 2 (Optional)</label>
                                <input type="text" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                                    value={shippingAddress.addressLine2} onChange={e => setShippingAddress({ ...shippingAddress, addressLine2: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Landmark (Optional)</label>
                                <input type="text" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                                    value={shippingAddress.landmark} onChange={e => setShippingAddress({ ...shippingAddress, landmark: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">City</label>
                                    <input type="text" required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                                        value={shippingAddress.city} onChange={e => setShippingAddress({ ...shippingAddress, city: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">State</label>
                                    <input type="text" required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                                        value={shippingAddress.state} onChange={e => setShippingAddress({ ...shippingAddress, state: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">PIN Code</label>
                                    <input type="text" required pattern="[0-9]{6}" title="6 digit PIN code" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                                        value={shippingAddress.pinCode} onChange={e => setShippingAddress({ ...shippingAddress, pinCode: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Phone Number</label>
                                    <input type="tel" required pattern="[0-9]{10}" title="10 digit mobile number" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                                        value={shippingAddress.phone} onChange={e => setShippingAddress({ ...shippingAddress, phone: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Alternate Phone (Optional)</label>
                                <input type="tel" pattern="[0-9]{10}" title="10 digit mobile number" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                                    value={shippingAddress.alternatePhone} onChange={e => setShippingAddress({ ...shippingAddress, alternatePhone: e.target.value })} />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Address Type</label>
                                <div className="flex gap-4">
                                    {['Home', 'Work', 'Other'].map(type => (
                                        <label key={type} className={`flex-1 cursor-pointer py-2 rounded-lg border-2 text-center text-sm font-bold transition ${shippingAddress.addressType === type ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
                                            <input type="radio" name="addressType" value={type} className="hidden"
                                                checked={shippingAddress.addressType === type}
                                                onChange={() => setShippingAddress({ ...shippingAddress, addressType: type })}
                                            />
                                            {type}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button type="button" onClick={() => setShowAddressForm(false)} className="flex-1 py-3 bg-slate-100 text-slate-500 font-bold rounded-xl hover:bg-slate-200 transition">Cancel</button>
                                <button type="submit" className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:bg-blue-600 transition flex items-center justify-center gap-2">
                                    <span>Proceed to Pay</span>
                                    <CreditCard size={18} />
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Cart;
