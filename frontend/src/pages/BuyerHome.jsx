import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ShoppingCart, ExternalLink, ChevronRight, Zap, Truck, ShieldCheck, CreditCard, Mail, Star, Minus, Plus, BadgePercent } from 'lucide-react';
import { getCurrentUser } from '../utils/auth';

const BuyerHome = () => {
    const [products, setProducts] = useState([]);
    const [influencerVideos, setInfluencerVideos] = useState([]);
    const user = getCurrentUser();
    const navigate = useNavigate();

    const [quantities, setQuantities] = useState({});

    useEffect(() => {
        axios.get('http://localhost:5000/api/products/buyer/list')
            .then(res => {
                if (Array.isArray(res.data)) {
                    setProducts(res.data);
                } else {
                    console.error("API returned non-array:", res.data);
                    setProducts([]);
                }
            })
            .catch(err => console.error("Error fetching products:", err));

        axios.get('http://localhost:5000/api/influencer-videos/list')
            .then(res => setInfluencerVideos(res.data))
            .catch(err => console.error("Error fetching videos:", err));
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

    const handleRFQ = (product) => {
        alert(`Bulk Quote Request Sent for ${product.title}!\nOur B2B team will contact you within 24 hours.`);
    };

    const categoryIcons = [
        { name: 'Gifting Products', img: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=200&auto=format&fit=crop' },
        { name: 'Electronic Gadgets', img: '/electronic_gadgets.jpg' },
        { name: 'Bottles and Tumblers', img: '/bottles_and_tumblers.png' },
        { name: 'Kitchen Ware', img: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=200&auto=format&fit=crop' },
        { name: 'Lamp & Projector', img: '/lamp_projector.png' },
        { name: 'Ceramic Mugs', img: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?q=80&w=200&auto=format&fit=crop' },
        { name: 'Tripod and Stands', img: 'https://images.unsplash.com/photo-1527011046414-4781f1f94f8c?q=80&w=200&auto=format&fit=crop' },
        { name: 'Toys and Games', img: 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?q=80&w=200&auto=format&fit=crop' },
        { name: 'Clothing', img: '/clothing.jpg' },
        { name: 'Statutes and Sculptures', img: 'https://images.unsplash.com/photo-1544531586-fde5298cdd40?q=80&w=200&auto=format&fit=crop' },
        { name: 'Sublimation Products', img: '/sublimation_products.png' },
        { name: 'Product Manufacturing', img: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=200&auto=format&fit=crop' },
    ];

    const watchAndBuyItems = [
        { id: 1, title: 'Multi Compartment Lunch Box', price: 235, originalPrice: 399, discount: 41, img: 'https://images.unsplash.com/photo-1588619461336-d48e8913b7a5?q=80&w=400&auto=format&fit=crop' },
        { id: 2, title: 'Window Cleaning Brush', price: 23, originalPrice: 99, discount: 77, img: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?q=80&w=400&auto=format&fit=crop' },
        { id: 3, title: 'Solar Power Car Scent Diffuser', price: 98, originalPrice: 199, discount: 51, img: 'https://images.unsplash.com/photo-1605218457332-901b0f15c488?q=80&w=400&auto=format&fit=crop' },
        { id: 4, title: 'Silicone Baby Teething Toys', price: 65, originalPrice: 249, discount: 74, img: 'https://images.unsplash.com/photo-1533038590840-1cde6e668a91?q=80&w=400&auto=format&fit=crop' },
        { id: 5, title: 'Apple Design Soft Paper Soap', price: 29, originalPrice: 99, discount: 71, img: 'https://images.unsplash.com/photo-1610434460010-3843f55c5dfb?q=80&w=400&auto=format&fit=crop' },
        { id: 6, title: 'Iki Portable Fan', price: 400, originalPrice: 999, discount: 60, img: 'https://images.unsplash.com/photo-1618941716939-553df3c6c278?q=80&w=400&auto=format&fit=crop' },
    ];

    return (
        <div className="bg-slate-50 min-h-screen">
            <div className="max-w-[1440px] mx-auto px-6 py-8">
                {/* Top Categories Header */}
                <div className="flex justify-center mb-8">
                    <div className="relative bg-gradient-to-r from-red-800 to-red-900 text-white px-12 py-3 rounded-tr-[30px] rounded-bl-[30px] shadow-lg transform -skew-x-6 border-b-4 border-red-950">
                        <h2 className="text-2xl font-black uppercase tracking-wider transform skew-x-6 drop-shadow-md font-serif">Top Categories</h2>
                    </div>
                </div>

                {/* Category Grid */}
                <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-6 lg:flex lg:overflow-x-auto lg:gap-6 lg:no-scrollbar lg:pb-4 mb-12">
                    {categoryIcons.map((cat, idx) => (
                        <Link to={`/category/${cat.name}`} key={idx} className="flex flex-col items-center gap-2 group cursor-pointer lg:min-w-[120px] lg:block">
                            <div className="w-full aspect-square rounded-2xl bg-white shadow-sm border border-slate-100 p-2 group-hover:shadow-md group-hover:border-primary/30 transition-all">
                                <img src={cat.img} alt={cat.name} className="w-full h-full object-cover rounded-xl" />
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
                                            <Zap size={10} className="fill-red-600" /> DISH OF THE DAY
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
                                            <div className="flex flex-col mb-3">
                                                <span className="text-[10px] text-slate-400 font-medium">₹{priceWithGST.toLocaleString()} (Incl. of all taxes)</span>
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
