import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getAuthHeader, getCurrentUser } from '../utils/auth';
import { Trash2, CreditCard, ShieldCheck, Plus, Minus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { detectCountry, getGeoPrice, getCurrencySymbol, getPriceForQuantity } from '../utils/geoPrice';
import API_BASE_URL from '../config';


const Cart = () => {
    const [cart, setCart] = useState([]);
    const navigate = useNavigate();
    const user = getCurrentUser();
    const [countryKey, setCountryKey] = useState('IN');
    const [currencySymbol, setCurrencySymbol] = useState('₹');

    const [shippingFee, setShippingFee] = useState(0);
    const [calculatingShipping, setCalculatingShipping] = useState(false);
    const [shippingBreakdown, setShippingBreakdown] = useState([]);
    const [isInternationalShipping, setIsInternationalShipping] = useState(false);

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
        landmark: '',
        country: 'India'
    });
    const [isAddressVerified, setIsAddressVerified] = useState(false);

    useEffect(() => {
        detectCountry().then(key => {
            setCountryKey(key);
            setCurrencySymbol(getCurrencySymbol(key));
        });

        const fetchFreshCart = async () => {
            const savedCart = JSON.parse(localStorage.getItem('cart') || '[]');
            if (savedCart.length === 0) {
                setCart([]);
                return;
            }

            try {
                // Fetch up-to-date product details from API to ensure prices strictly match the DB
                const freshCartPromises = savedCart.map(async (item) => {
                    try {
                        const res = await axios.get(`${API_BASE_URL}/api/products/${item._id}`);
                        const freshProduct = res.data;
                        return {
                            ...freshProduct,
                            quantity: item.quantity || freshProduct.moq || 1,
                            selectedVariation: item.selectedVariation,
                            cartItemId: item.cartItemId || item._id
                        };
                    } catch (err) {
                        console.error(`Failed to fetch fresh data for product ${item._id}`, err);
                        return item; // Fallback to stale item if fetch fails or product is deleted
                    }
                });

                const freshCart = await Promise.all(freshCartPromises);
                setCart(freshCart);

                // Update local storage with fresh prices and product details behind the scenes
                localStorage.setItem('cart', JSON.stringify(freshCart));
            } catch (err) {
                console.error("Error refreshing cart data:", err);
                setCart(savedCart);
            }
        };

        const fetchUserAddress = async () => {
            if (!user) return;
            try {
                const res = await axios.get(`${API_BASE_URL}/api/auth/profile`, { headers: getAuthHeader() });
                if (res.data.shippingAddress) {
                    setShippingAddress(prev => ({ ...prev, ...res.data.shippingAddress }));
                    setIsAddressVerified(false); // They still need to click confirm to calculate shipping for the current cart
                }
            } catch (err) {
                console.error("Failed to fetch user address", err);
            }
        };

        fetchFreshCart();
        fetchUserAddress();
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



    const getItemSubtotal = (item) => {
        const unitPrice = getPriceForQuantity(item, item.quantity, countryKey);
        const priceWithGST = unitPrice * (1 + (item.gstPercentage || 0) / 100);
        return priceWithGST * item.quantity;
    };

    const total = cart.reduce((acc, item) => acc + getItemSubtotal(item), 0);

    const calculateShipping = async () => {
        // Basic validation for mandatory fields
        const { addressLine1, city, state, pinCode, phone } = shippingAddress;
        if (!addressLine1 || !city || !state || !pinCode || !phone) {
            alert('Please fill all mandatory address fields to calculate shipping');
            return;
        }

        setCalculatingShipping(true);
        try {
            const items = cart.map(item => {

                const tier = (item.tieredPricing || [])
                    .sort((a, b) => b.moq - a.moq)
                    .find(t => item.quantity >= t.moq);

                return {
                    productId: item._id,
                    quantity: item.quantity,

                    weight: tier?.weight || item.weight || 0.5,

                    length: tier?.length || item.dimensions?.length || 10,
                    breadth: tier?.breadth || item.dimensions?.breadth || 10,
                    height: tier?.height || item.dimensions?.height || 10
                };
            });
            const res = await axios.post(`${API_BASE_URL}/api/orders/calculate-shipping`,
                { items, deliveryPincode: shippingAddress.pinCode, shippingAddress },
                { headers: getAuthHeader() }
            );

            const isIntl = res.data.is_international || false;
            setIsInternationalShipping(isIntl);
            setShippingBreakdown(res.data.breakdowns || []);

            // Fee is always returned in INR — convert to local currency
            const EXCHANGE_RATES_TO_INR = { 'IN': 1, 'US': 84.50, 'UK': 105.00, 'CA': 61.00, 'AU': 54.50, 'UAE': 23.00 };
            const conversionRate = EXCHANGE_RATES_TO_INR[countryKey] || 84.50;
            const feeInLocal = parseFloat((res.data.totalShippingFees / conversionRate).toFixed(2));

            setShippingFee(feeInLocal);
            setIsAddressVerified(true);

            // Save this address to user profile if logged in
            if (user) {
                try {
                    await axios.put(`${API_BASE_URL}/api/auth/profile`, 
                        { shippingAddress }, 
                        { headers: getAuthHeader() }
                    );
                } catch (saveErr) {
                    console.error("Failed to save address to profile automatically", saveErr);
                }
            }
        } catch (err) {
            console.error('Shipping calculation failed', err);
            const serverMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Unknown error';
            console.error('Server error detail:', serverMsg, err.response?.data);
            alert(`Failed to calculate shipping: ${serverMsg}\n\nPlease check your address details and ensure the pincode is valid.`);
            setIsAddressVerified(false);
        } finally {
            setCalculatingShipping(false);
        }
    };

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
                                            {currencySymbol}{Math.round(getPriceForQuantity(item, item.quantity, countryKey) * (1 + (item.gstPercentage || 0) / 100)).toLocaleString()}
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
                                        <span>Total: <span className="font-bold text-slate-700">{currencySymbol}{getItemSubtotal(item).toLocaleString()}</span></span>
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
                    <div className="space-y-4 mb-6">
                        <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{currencySymbol}{total.toLocaleString()}</span></div>
                        <div className="flex justify-between text-slate-600"><span>Service Fee</span><span>{currencySymbol}0</span></div>

                        <div className="border-t pt-4">
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center justify-between">
                                <span>Shipping Address</span>
                                {isAddressVerified && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Verified</span>}
                            </h3>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Country</label>
                                    <select
                                        className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-primary"
                                        value={shippingAddress.country}
                                        onChange={e => { setShippingAddress({ ...shippingAddress, country: e.target.value }); setIsAddressVerified(false); }}
                                    >
                                        <option value="India">India</option>
                                        <option value="Canada">Canada</option>
                                        <option value="USA">USA</option>
                                        <option value="UK">UK</option>
                                        <option value="Australia">Australia</option>
                                        <option value="UAE">UAE</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Full Name</label>
                                        <input type="text" placeholder="John Doe" className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-primary"
                                            value={shippingAddress.fullName} onChange={e => { setShippingAddress({ ...shippingAddress, fullName: e.target.value }); setIsAddressVerified(false); }} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Phone</label>
                                        <input type="tel" placeholder="10-digit number" className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-primary"
                                            value={shippingAddress.phone} onChange={e => { setShippingAddress({ ...shippingAddress, phone: e.target.value }); setIsAddressVerified(false); }} />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Address Line 1</label>
                                    <input type="text" placeholder="Street/House No" className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-primary"
                                        value={shippingAddress.addressLine1} onChange={e => { setShippingAddress({ ...shippingAddress, addressLine1: e.target.value }); setIsAddressVerified(false); }} />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">{shippingAddress.country === 'India' ? 'PIN Code' : 'Postal Code'}</label>
                                        <input type="text" placeholder="110001" className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-primary"
                                            value={shippingAddress.pinCode} onChange={e => { setShippingAddress({ ...shippingAddress, pinCode: e.target.value }); setIsAddressVerified(false); }} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">City</label>
                                        <input type="text" placeholder="e.g. Mumbai" className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-primary"
                                            value={shippingAddress.city} onChange={e => { setShippingAddress({ ...shippingAddress, city: e.target.value }); setIsAddressVerified(false); }} />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">State / Province</label>
                                    <input type="text" placeholder="e.g. Maharashtra" className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-primary"
                                        value={shippingAddress.state} onChange={e => { setShippingAddress({ ...shippingAddress, state: e.target.value }); setIsAddressVerified(false); }} />
                                </div>

                                <button
                                    onClick={calculateShipping}
                                    disabled={calculatingShipping}
                                    className="w-full h-11 bg-slate-100 text-slate-700 rounded-xl text-xs font-black uppercase hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                                >
                                    {calculatingShipping ? <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div> : 'Confirm Address & Calculate'}
                                </button>
                            </div>
                        </div>

                        {shippingFee > 0 && (
                            <div className="space-y-2">
                                <div className="flex justify-between text-primary font-bold">
                                    <span className="flex items-center gap-1">
                                        Shipping Fee
                                        {isInternationalShipping && (
                                            <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-black">INTL</span>
                                        )}
                                    </span>
                                    <span>{currencySymbol}{shippingFee.toLocaleString()}</span>
                                </div>
                            </div>
                        )}


                        <div className="pt-2 border-t flex justify-between font-black text-xl text-slate-800 uppercase tracking-tighter"><span>Total</span><span>{currencySymbol}{(total + shippingFee).toLocaleString()}</span></div>
                    </div>


                    <button
                        onClick={async () => {
                            if (!user) return navigate('/login');
                            if (!isAddressVerified) {
                                alert('Please confirm your shipping address first');
                                return;
                            }

                            // Direct checkout logic since address is already collected
                            try {
                                const items = cart.map(item => ({
                                    productId: item._id,
                                    quantity: item.quantity,
                                    selectedVariation: item.selectedVariation
                                }));
                                const res = await axios.post(`${API_BASE_URL}/api/orders/create-easebuzz-session`,
                                    { items, shippingAddress, countryKey },
                                    { headers: getAuthHeader() }
                                );
                                if (res.data.url) {
                                    window.location.href = res.data.url;
                                }
                            } catch (err) {
                                alert('Checkout failed: ' + (err.response?.data?.message || err.message));
                            }
                        }}
                        className={`w-full py-4 rounded-xl font-black uppercase text-sm tracking-widest flex items-center justify-center space-x-2 transition mt-3 shadow-lg ${isAddressVerified ? 'bg-primary text-white hover:bg-blue-600 shadow-blue-200' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                    >
                        <CreditCard size={18} />
                        <span>Proceed to Payment</span>
                    </button>
                    <div className="mt-4 flex items-center justify-center space-x-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                        <ShieldCheck size={14} />
                        <span>SSL Encrypted Transactions</span>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default Cart;
