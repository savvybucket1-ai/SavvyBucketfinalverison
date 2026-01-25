import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getAuthHeader, getCurrentUser } from '../utils/auth';
import { Trash2, CreditCard, ShieldCheck, Plus, Minus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const Cart = () => {
    const [cart, setCart] = useState([]);
    const navigate = useNavigate();
    const user = getCurrentUser();

    useEffect(() => {
        const savedCart = JSON.parse(localStorage.getItem('cart') || '[]');
        setCart(savedCart);
    }, []);

    const removeFromCart = (id) => {
        const newCart = cart.filter(item => item._id !== id);
        setCart(newCart);
        localStorage.setItem('cart', JSON.stringify(newCart));

        // Dispatch event to update cart count in Navbar
        window.dispatchEvent(new Event('cartUpdated'));
    };

    const updateQuantity = (id, newQuantity) => {
        const item = cart.find(i => i._id === id);
        const minQty = item?.moq || 1;

        if (newQuantity < minQty) return;

        const newCart = cart.map(item =>
            item._id === id ? { ...item, quantity: newQuantity } : item
        );
        setCart(newCart);
        localStorage.setItem('cart', JSON.stringify(newCart));

        // Dispatch event to update cart count in Navbar
        window.dispatchEvent(new Event('cartUpdated'));
    };

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

    const handleCheckout = async () => {
        if (!user) return navigate('/login');

        try {
            const item = cart[0];
            const res = await axios.post('http://localhost:5000/api/orders/create-checkout-session',
                { productId: item._id, quantity: item.quantity },
                { headers: getAuthHeader() }
            );

            const { id, url } = res.data;
            // Stripe Redirect
            window.location.href = url;

        } catch (err) {
            alert('Checkout failed: ' + (err.response?.data?.message || err.message));
        }
    };

    if (cart.length === 0) return <div className="text-center py-20 font-medium text-slate-400">Your cart is empty</div>;

    return (
        <div className="max-w-4xl mx-auto px-4 py-12">
            <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                    {cart.map(item => (
                        <div key={item._id} className="bg-white p-4 rounded-xl border flex items-center gap-4">
                            <div className="w-24 h-24 bg-slate-100 rounded-lg flex-shrink-0 overflow-hidden">
                                <img
                                    src={item.imageUrls?.[0] || 'https://via.placeholder.com/100'}
                                    alt={item.title}
                                    className="w-full h-full object-contain p-2"
                                />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-slate-800">{item.title}</h3>
                                <p className="text-sm text-slate-500 line-clamp-1">{item.description}</p>
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
                                            onChange={(e) => updateQuantity(item._id, parseInt(e.target.value))}
                                        >
                                            {[item.moq, ...(item.tieredPricing || []).map(t => t.moq), item.quantity]
                                                .filter((v, i, a) => a.indexOf(v) === i)
                                                .sort((a, b) => a - b)
                                                .map(q => (
                                                    <option key={q} value={q}>{q}</option>
                                                ))
                                            }
                                        </select>
                                        <button
                                            onClick={() => updateQuantity(item._id, item.quantity * 2)}
                                            className="bg-primary/10 text-primary font-black px-2 py-1 rounded-lg border-2 border-primary/10 hover:bg-primary hover:text-white transition-all text-xs"
                                        >
                                            x2
                                        </button>
                                    </div>

                                    <div className="flex flex-col text-xs text-slate-500">
                                        <span>Min Order: <span className="font-bold text-slate-700">{item.moq || 1}</span></span>
                                        <span>Total: <span className="font-bold text-slate-700">₹{getItemSubtotal(item).toLocaleString()}</span></span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => removeFromCart(item._id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition">
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
                    <button onClick={handleCheckout} className="w-full bg-primary text-white py-4 rounded-xl font-bold flex items-center justify-center space-x-2 hover:bg-blue-700 transition">
                        <CreditCard size={20} />
                        <span>Pay with Stripe</span>
                    </button>
                    <div className="mt-4 flex items-center justify-center space-x-2 text-slate-400 text-xs text-center">
                        <ShieldCheck size={14} />
                        <span>SSL Encrypted Transactions</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Cart;
