import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ShoppingCart, ExternalLink, ChevronRight, Zap, Truck, ShieldCheck, CreditCard, Mail, Star, Minus, Plus, BadgePercent, Heart } from 'lucide-react';
import { getCurrentUser } from '../utils/auth';
import { categories } from '../utils/categories';
import { detectCountry, getGeoPrice, getCurrencySymbol, getPriceForQuantity } from '../utils/geoPrice';
import API_BASE_URL from '../config';

const BuyerHome = () => {
    const [products, setProducts] = useState([]);
    const [trendingProducts, setTrendingProducts] = useState([]);
    const [influencerVideos, setInfluencerVideos] = useState([]);
    const user = getCurrentUser();
    const navigate = useNavigate();

    const [quantities, setQuantities] = useState({});
    const [countryKey, setCountryKey] = useState('IN');
    const [currencySymbol, setCurrencySymbol] = useState('₹');

    useEffect(() => {
        detectCountry().then(key => {
            setCountryKey(key);
            setCurrencySymbol(getCurrencySymbol(key));
        });

        axios.get(`${API_BASE_URL}/api/products/buyer/list`)
            .then(res => {
                if (Array.isArray(res.data)) {
                    setProducts(res.data);
                } else {
                    console.error("API returned non-array:", res.data);
                    setProducts([]);
                }
            })
            .catch(err => console.error("Error fetching products:", err));

        axios.get(`${API_BASE_URL}/api/products/buyer/trending`)
            .then(res => setTrendingProducts(res.data))
            .catch(err => console.error("Error fetching trending products:", err));

        axios.get(`${API_BASE_URL}/api/influencer-videos/list`)
            .then(res => setInfluencerVideos(res.data))
            .catch(err => console.error("Error fetching videos:", err));
    }, []);

    const handleAddToCart = (product) => {
        const qty = quantities[product._id] || product.moq || 1;
        const currentPrice = getPriceForQuantity(product, qty, countryKey);
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

    const handleRFQ = (product) => {
        alert(`Bulk Quote Request Sent for ${product.title}!\nOur B2B team will contact you within 24 hours.`);
    };


    const [wishlist, setWishlist] = useState([]);

    useEffect(() => {
        const storedWishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
        setWishlist(storedWishlist.map(item => item._id));

        const handleWishlistUpdate = () => {
            const updated = JSON.parse(localStorage.getItem('wishlist') || '[]');
            setWishlist(updated.map(item => item._id));
        };

        window.addEventListener('wishlistUpdated', handleWishlistUpdate);
        return () => window.removeEventListener('wishlistUpdated', handleWishlistUpdate);
    }, []);

    const toggleWishlist = (e, product) => {
        e.preventDefault(); // Prevent navigation
        const storedWishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
        const exists = storedWishlist.find(item => item._id === product._id);

        let newWishlist;
        if (exists) {
            newWishlist = storedWishlist.filter(item => item._id !== product._id);
            setWishlist(prev => prev.filter(id => id !== product._id));
        } else {
            newWishlist = [...storedWishlist, product];
            setWishlist(prev => [...prev, product._id]);
        }

        localStorage.setItem('wishlist', JSON.stringify(newWishlist));
        window.dispatchEvent(new Event('wishlistUpdated'));
    };

    return (
        <div className="bg-slate-50 min-h-screen">
            <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-8">
                {/* Top Categories Header */}
                <div className="flex justify-center mb-8">
                    <div className="relative bg-gradient-to-r from-red-800 to-red-900 text-white px-12 py-3 rounded-tr-[30px] rounded-bl-[30px] shadow-lg transform -skew-x-6 border-b-4 border-red-950">
                        <h2 className="text-2xl font-black uppercase tracking-wider transform skew-x-6 drop-shadow-md font-serif">Top Categories</h2>
                    </div>
                </div>

                {/* Category Grid */}
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:flex lg:overflow-x-auto lg:gap-6 lg:no-scrollbar lg:pb-4 mb-12 gap-3 sm:gap-4">
                    {categories.map((cat, idx) => (
                        <Link to={`/category/${cat.name}`} key={idx} className="flex flex-col items-center gap-2 group cursor-pointer lg:min-w-[120px] lg:block">
                            <div className="w-full aspect-square rounded-2xl bg-white shadow-sm border border-slate-100 p-2 group-hover:shadow-md group-hover:border-primary/30 transition-all">
                                <img src={cat.image} alt={cat.name} className="w-full h-full object-cover rounded-xl" />
                            </div>
                            <span className="text-[10px] md:text-xs font-bold text-slate-700 text-center leading-tight group-hover:text-primary transition-colors line-clamp-2 mt-2">{cat.name}</span>
                        </Link>
                    ))}
                </div>

                {/* Watch and Buy Section */}
                <div className="mb-12">
                    <h2 className="text-3xl font-black text-slate-800 text-center mb-6 tracking-tight">Top Pick by Influencers</h2>
                    <div className="flex overflow-x-auto gap-4 no-scrollbar pb-4 px-2">
                        {influencerVideos.length > 0 ? influencerVideos.map((item) => (
                            <div key={item._id} onClick={() => navigate(`/product/${item.productId._id}`)} className="min-w-[180px] w-[180px] md:min-w-[220px] md:w-[220px] flex-shrink-0 group cursor-pointer">
                                <div className="relative aspect-[9/16] rounded-2xl overflow-hidden mb-3 bg-slate-100 shadow-md border border-slate-200">
                                    {/* Video Player (Muted/Autoplay or Poster) */}
                                    <video
                                        src={item.videoUrl}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        muted
                                        loop
                                        playsInline
                                        onMouseOver={e => e.target.play()}
                                        onMouseOut={e => { e.target.pause(); e.target.currentTime = 0; }}
                                    />
                                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors pointer-events-none"></div>
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="w-12 h-12 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center border border-white/50">
                                            <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[14px] border-l-white border-b-[8px] border-b-transparent ml-1"></div>
                                        </div>
                                    </div>
                                    <div className="absolute top-2 right-2 pointer-events-none">
                                        <div className="bg-white/20 backdrop-blur-md p-1.5 rounded-lg">
                                            <ExternalLink size={16} className="text-white" />
                                        </div>
                                    </div>
                                </div>
                                <div className="px-1">
                                    <h3 className="text-sm font-bold text-slate-800 line-clamp-1 mb-1">{item.title}</h3>
                                    <p className="text-xs text-slate-500 font-medium line-clamp-1">
                                        Linked: {item.productId?.title}
                                    </p>
                                </div>
                            </div>
                        )) : (
                            <div className="w-full text-center py-8 text-slate-400 font-bold italic">
                                No trending videos right now. Stay tuned!
                            </div>
                        )}
                    </div>
                </div>

                {/* Trending Products Section */}
                <div className="mb-12">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                                <span className="w-2 h-8 bg-yellow-500 rounded-full"></span>
                                TRENDING PRODUCTS
                            </h2>
                            <p className="text-slate-500 text-sm font-semibold mt-1">Hottest picks of the season</p>
                        </div>
                    </div>
                    {trendingProducts.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {trendingProducts.map(product => (
                                <Link key={product._id} to={`/product/${product._id}`} className="block relative group">
                                    <div className="bg-white rounded-2xl p-3 shadow-md border hover:shadow-lg transition-all border-slate-100 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-[9px] font-black px-2 py-1 rounded-bl-xl z-10">TRENDING</div>
                                        <div className="aspect-square bg-slate-50 rounded-xl mb-3 p-2 overflow-hidden">
                                            <img
                                                src={product.imageUrls?.[0] || 'https://via.placeholder.com/150'}
                                                alt={product.title}
                                                className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                                            />
                                        </div>
                                        <h3 className="text-xs font-bold text-slate-800 line-clamp-2 mb-1 h-8">{product.title}</h3>
                                        <div className="flex flex-col">
                                            {(() => {
                                                const qty = product.moq || 1;
                                                const currentUnitPrice = getPriceForQuantity(product, qty, countryKey);
                                                const priceWithGST = Math.round(currentUnitPrice * (1 + (product.gstPercentage || 0) / 100));
                                                return (
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-baseline gap-1">
                                                                <span className="font-black text-slate-900">{currencySymbol}{priceWithGST.toLocaleString()}</span>
                                                                <span className="text-[8px] font-bold text-slate-500">(Incl. Tax)</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={(e) => toggleWishlist(e, product)}
                                                                    className={`p-2 rounded-lg transition-colors ${wishlist.includes(product._id) ? 'bg-red-50 text-red-500' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                                                                >
                                                                    <Heart size={14} className={wishlist.includes(product._id) ? "fill-red-500" : ""} />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.preventDefault(); handleAddToCart(product); }}
                                                                    className="bg-slate-900 text-white p-2 rounded-lg hover:bg-primary transition"
                                                                >
                                                                    <ShoppingCart size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <span className="text-[9px] text-slate-400 font-medium mt-1">{currencySymbol}{currentUnitPrice} + {product.gstPercentage}% GST</span>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="w-full text-center py-8 text-slate-400 font-bold italic bg-slate-100 rounded-2xl">
                            No trending products curated yet.
                        </div>
                    )}
                </div>

                {/* Deal of the Day Section */}
                <div className="mb-12">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                                <span className="w-2 h-8 bg-primary rounded-full"></span>
                                DEAL OF THE DAY
                            </h2>
                            <p className="text-slate-500 text-sm font-semibold mt-1">Grab the best deals before they're gone!</p>
                        </div>
                        <div className="flex gap-2">
                            <button className="px-6 py-2 bg-white border border-slate-200 rounded-full text-sm font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition">View All</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-6">
                        {products.length > 0 ? products.map(product => (
                            <Link key={product._id} to={`/product/${product._id}`} className="block">
                                <div className="bg-white rounded-3xl p-4 shadow-sm hover:shadow-xl transition-all duration-300 group cursor-pointer border border-white hover:border-primary/20">
                                    <div className="relative aspect-square rounded-2xl bg-slate-50 overflow-hidden mb-4 p-4">
                                        <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-red-100/80 backdrop-blur-sm text-red-600 text-[9px] font-black px-2 py-1 rounded-lg">
                                            <Zap size={10} className="fill-red-600" /> DEAL OF THE DAY
                                        </div>
                                        <img
                                            src={product.imageUrls?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=2070&auto=format&fit=crop'}
                                            alt={product.title}
                                            className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
                                        />
                                        <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-white/90 backdrop-blur-sm text-slate-700 text-[10px] font-bold px-2 py-1 rounded-lg shadow-sm">
                                            <Star size={10} className="fill-yellow-400 text-yellow-400" /> 4.5
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row justify-between items-start mb-1 gap-1">
                                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-tight line-clamp-2 sm:line-clamp-1">{product.title}</h3>
                                        <span className="text-[9px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded uppercase self-start sm:self-auto">{product.category}</span>
                                    </div>
                                    {product.tieredPricing?.length > 0 && (
                                        <div className="flex items-center gap-1 text-[9px] font-black text-green-600 mb-2">
                                            <BadgePercent size={10} /> BULK DISCOUNTS AVAILABLE
                                        </div>
                                    )}

                                    {(() => {
                                        const qty = quantities[product._id] || product.moq || 1;
                                        const currentUnitPrice = getPriceForQuantity(product, qty, countryKey);
                                        const priceWithGST = Math.round(currentUnitPrice * (1 + (product.gstPercentage || 0) / 100));
                                        return (
                                            <div className="flex flex-col mb-3">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex flex-col mb-1">
                                                        <div className="flex items-baseline flex-wrap gap-1">
                                                            <span className="text-lg font-black text-slate-800">{currencySymbol}{priceWithGST.toLocaleString()}</span>
                                                            <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap">(Incl. of all taxes)</span>
                                                        </div>
                                                        <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">{currencySymbol}{currentUnitPrice} + {product.gstPercentage}% GST</span>
                                                    </div>
                                                    <button
                                                        onClick={(e) => toggleWishlist(e, product)}
                                                        className={`p-2 rounded-full transition-colors ${wishlist.includes(product._id) ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                                                    >
                                                        <Heart size={16} className={wishlist.includes(product._id) ? "fill-red-500" : ""} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })()}


                                    <div className="flex flex-col gap-3">
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                            <div className="flex items-center bg-white border border-slate-200 rounded-full p-0.5 w-full sm:w-auto">
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
                                            <span className="text-[10px] font-medium text-slate-500 whitespace-nowrap">
                                                Min Order: {product.moq}
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
                        )) : (
                            [1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="bg-white rounded-3xl p-4 shadow-sm animate-pulse">
                                    <div className="bg-slate-100 aspect-square rounded-2xl mb-4"></div>
                                    <div className="h-3 bg-slate-100 rounded-full w-2/3 mb-2"></div>
                                    <div className="h-4 bg-slate-100 rounded-full w-1/3"></div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BuyerHome;
