import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ShoppingCart, Star, Minus, Plus, BadgePercent, Clock } from 'lucide-react';
import API_BASE_URL from '../config';

const JustArrived = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const [quantities, setQuantities] = useState({});

    useEffect(() => {
        axios.get(`${API_BASE_URL}/api/products/buyer/latest`)
            .then(res => {
                if (Array.isArray(res.data)) {
                    setProducts(res.data);
                } else {
                    console.error("API returned non-array:", res.data);
                    setProducts([]);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error("Error fetching latest products:", err);
                setLoading(false);
            });
    }, []);

    const getPriceForQuantity = (product, qty) => {
        if (!product) return 0;
        let price = product.adminPrice;
        if (product.tieredPricing && product.tieredPricing.length > 0) {
            const sortedTiers = [...product.tieredPricing].sort((a, b) => b.moq - a.moq);
            const applicableTier = sortedTiers.find(tier => qty >= tier.moq);
            if (applicableTier) {
                price = applicableTier.price;
            }
        }
        return price;
    };

    const handleAddToCart = (product) => {
        const qty = quantities[product._id] || product.moq || 1;
        const currentPrice = getPriceForQuantity(product, qty);
        const existingCart = JSON.parse(localStorage.getItem('cart') || '[]');
        const existingItem = existingCart.find(item => item._id === product._id);

        if (existingItem) {
            existingItem.quantity += parseInt(qty);
        } else {
            existingCart.push({ ...product, quantity: parseInt(qty), adminPrice: currentPrice });
        }

        localStorage.setItem('cart', JSON.stringify(existingCart));
        window.dispatchEvent(new Event('cartUpdated'));
        alert(`Added ${qty} x ${product.title} to cart!`);
    };

    const handleQuantityChange = (productId, value) => {
        setQuantities(prev => ({
            ...prev,
            [productId]: value
        }));
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-slate-600 font-semibold">Loading new arrivals...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-50 min-h-screen pb-16">
            <div className="max-w-[1440px] mx-auto px-6 py-12">
                {/* Header */}
                <div className="text-center mb-12">
                    <h2 className="text-4xl font-black text-slate-800 uppercase tracking-tight flex items-center justify-center gap-4 mb-2">
                        <Clock size={32} className="text-primary" />
                        Just Arrived
                    </h2>
                    <p className="text-slate-500 font-medium">Explore the latest 20 additions to our wholesale catalog.</p>
                </div>

                {products.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {products.map(product => (
                            <Link key={product._id} to={`/product/${product._id}`} className="block">
                                <div className="bg-white rounded-3xl p-4 shadow-sm hover:shadow-xl transition-all duration-300 group cursor-pointer border border-white hover:border-primary/20 h-full flex flex-col">
                                    <div className="relative aspect-square rounded-2xl bg-slate-50 overflow-hidden mb-4 p-4">
                                        <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-blue-100/80 backdrop-blur-sm text-blue-600 text-[9px] font-black px-2 py-1 rounded-lg">
                                            NEW
                                        </div>
                                        <img
                                            src={product.imageUrls?.[0] || 'https://via.placeholder.com/150'}
                                            alt={product.title}
                                            className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
                                        />
                                        <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-white/90 backdrop-blur-sm text-slate-700 text-[10px] font-bold px-2 py-1 rounded-lg shadow-sm">
                                            <Star size={10} className="fill-yellow-400 text-yellow-400" /> 4.5
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-tight line-clamp-1">{product.title}</h3>
                                        <span className="text-[9px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded uppercase">{product.category}</span>
                                    </div>
                                    {product.tieredPricing?.length > 0 && (
                                        <div className="flex items-center gap-1 text-[9px] font-black text-green-600 mb-2">
                                            <BadgePercent size={10} /> BULK DISCOUNTS AVAILABLE
                                        </div>
                                    )}

                                    {(() => {
                                        const qty = quantities[product._id] || product.moq || 1;
                                        const currentUnitPrice = getPriceForQuantity(product, qty);
                                        const priceWithGST = Math.round(currentUnitPrice * (1 + (product.gstPercentage || 0) / 100));
                                        return (
                                            <div className="flex flex-col mb-3 mt-auto">
                                                <span className="text-[10px] text-slate-400 font-medium">₹{priceWithGST.toLocaleString()} (Incl. taxes)</span>
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-lg font-black text-slate-800">₹{currentUnitPrice}</span>
                                                    <span className="text-[10px] font-bold text-slate-500">+ {product.gstPercentage}% GST</span>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center bg-white border border-slate-200 rounded-full p-0.5">
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        const currentQty = quantities[product._id] || product.moq || 1;
                                                        if (currentQty > (product.moq || 1)) {
                                                            handleQuantityChange(product._id, parseInt(currentQty) - 1);
                                                        }
                                                    }}
                                                    className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors text-slate-600"
                                                >
                                                    <Minus size={12} />
                                                </button>
                                                <span className="w-8 text-center text-xs font-bold text-slate-800">{quantities[product._id] || product.moq || 1}</span>
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        const currentQty = quantities[product._id] || product.moq || 1;
                                                        handleQuantityChange(product._id, parseInt(currentQty) + 1);
                                                    }}
                                                    className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors text-slate-600"
                                                >
                                                    <Plus size={12} />
                                                </button>
                                            </div>
                                            <span className="text-[10px] font-medium text-slate-500">
                                                Min: {product.moq}
                                            </span>
                                        </div>

                                        <button
                                            onClick={(e) => { e.preventDefault(); handleAddToCart(product); }}
                                            className="w-full py-2.5 bg-primary text-white rounded-xl text-[10px] font-black uppercase hover:bg-blue-600 transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-1"
                                        >
                                            <ShoppingCart size={12} /> Add to Cart
                                        </button>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white rounded-3xl shadow-sm">
                        <p className="text-xl font-bold text-slate-400">No new arrivals at the moment.</p>
                        <Link to="/" className="inline-block mt-4 text-primary font-bold hover:underline">Browse all categories</Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default JustArrived;
