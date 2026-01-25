import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { ShoppingCart, Star, Zap, Filter, ChevronDown, ChevronRight, LayoutGrid, List, Heart, ShoppingBag, Minus, Plus } from 'lucide-react';

const CategoryPage = () => {
    const { category } = useParams();
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const searchQuery = searchParams.get('search');

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    const [wishlist, setWishlist] = useState([]);
    const [quantities, setQuantities] = useState({});
    const [showMobileFilters, setShowMobileFilters] = useState(false);

    const handleQuantityChange = (productId, newQty) => {
        if (newQty < 1) return;
        setQuantities(prev => ({
            ...prev,
            [productId]: newQty
        }));
    };

    useEffect(() => {
        const storedWishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
        setWishlist(storedWishlist.map(item => item._id));
    }, []);

    // Fetch products based on category and search
    useEffect(() => {
        setLoading(true);
        let url = `http://localhost:5000/api/products/buyer/list?category=${encodeURIComponent(category)}`;
        if (searchQuery) {
            url += `&search=${encodeURIComponent(searchQuery)}`;
        }

        axios.get(url)
            .then(res => {
                setProducts(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Error fetching products:", err);
                setLoading(false);
            });
    }, [category, searchQuery]);

    const toggleWishlist = (product) => {
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

    const handleAddToCart = (product) => {
        const quantity = quantities[product._id] || product.moq || 1;
        const existingCart = JSON.parse(localStorage.getItem('cart') || '[]');
        const existingItem = existingCart.find(item => item._id === product._id);

        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            existingCart.push({ ...product, quantity });
        }

        localStorage.setItem('cart', JSON.stringify(existingCart));
        window.dispatchEvent(new Event('cartUpdated'));
        alert(`Added ${product.title} to cart!`);
    };

    // Sidebar Categories
    const sidebarCategories = [
        'Gifting Products',
        'Electronic Gadgets',
        'Bottles and Tumblers',
        'Kitchen Ware',
        'Lamp & Projector',
        'Ceramic Mugs',
        'Tripod and Stands',
        'Toys and Games',
        'Clothing',
        'Statutes and Sculptures',
        'Sublimation Products',
        'Product Manufacturing'
    ];


    return (
        <div className="bg-slate-50 min-h-screen py-8">
            <div className="max-w-[1440px] mx-auto px-6">

                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-6 font-medium">
                    <Link to="/" className="hover:text-primary">Home</Link>
                    <ChevronRight size={14} />
                    <span className="text-slate-800 font-bold">{category}</span>
                    {searchQuery && (
                        <>
                            <ChevronRight size={14} />
                            <span className="text-slate-500">Search: "{searchQuery}"</span>
                        </>
                    )}
                </div>

                <div className="flex gap-8">
                    {/* Sidebar Filters */}
                    <div className="w-64 flex-shrink-0 hidden lg:block">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase text-xs tracking-wider">
                                <LayoutGrid size={16} className="text-primary" /> All Categories
                            </h3>
                            <ul className="space-y-3">
                                {sidebarCategories.map((cat, idx) => (
                                    <li key={idx}>
                                        <Link to={`/category/${cat}`} className={`text-sm cursor-pointer hover:text-primary transition-colors flex items-center gap-2 ${cat === category ? 'text-primary font-bold bg-blue-50 p-2 rounded-lg' : 'text-slate-600'}`}>
                                            {cat === category && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                                            {cat}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                    </div>

                    {/* Main Content */}
                    <div className="flex-1">
                        {/* Header */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 md:p-6 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight mb-1">{category === 'All Categories' && searchQuery ? `Search Results for "${searchQuery}"` : category}</h1>
                                <p className="text-sm text-slate-500 font-medium">Showing {products.length} products</p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 md:gap-4">
                                <button
                                    onClick={() => setShowMobileFilters(true)}
                                    className="lg:hidden flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-bold shadow-lg shadow-slate-800/20"
                                >
                                    <Filter size={14} /> Filters
                                </button>

                                <span className="hidden md:inline text-sm text-slate-500 font-semibold">Sort by:</span>
                                <div className="relative group">
                                    <button className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-sm font-bold text-slate-700 transition-colors">
                                        Relevance <ChevronDown size={14} />
                                    </button>
                                </div>
                                <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
                                    <button className="p-1.5 bg-white rounded shadow-sm text-primary"><LayoutGrid size={16} /></button>
                                    <button className="p-1.5 hover:bg-white rounded transition text-slate-400"><List size={16} /></button>
                                </div>
                            </div>
                        </div>

                        {/* Mobile Filters Overlay */}
                        {showMobileFilters && (
                            <div className="fixed inset-0 z-50 lg:hidden">
                                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowMobileFilters(false)}></div>
                                <div className="absolute inset-y-0 left-0 w-[280px] bg-white shadow-2xl overflow-y-auto p-6 animate-slide-in-left">
                                    <div className="flex items-center justify-between mb-8">
                                        <h3 className="font-black text-slate-800 text-lg uppercase tracking-wide flex items-center gap-2">
                                            <Filter size={18} /> Filters
                                        </h3>
                                        <button onClick={() => setShowMobileFilters(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                                            <ChevronRight size={20} className="rotate-180" />
                                        </button>
                                    </div>

                                    {/* Mobile Filter Content - Duplicated from Sidebar for clearer separation in this edit, ideally refator to component */}
                                    {/* Categories */}
                                    <div className="mb-8">
                                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase text-xs tracking-wider">
                                            <LayoutGrid size={16} className="text-primary" /> All Categories
                                        </h3>
                                        <ul className="space-y-3">
                                            {sidebarCategories.map((cat, idx) => (
                                                <li key={idx}>
                                                    <Link
                                                        to={`/category/${cat}`}
                                                        onClick={() => setShowMobileFilters(false)}
                                                        className={`text-sm cursor-pointer hover:text-primary transition-colors flex items-center gap-2 ${cat === category ? 'text-primary font-bold bg-blue-50 p-2 rounded-lg' : 'text-slate-600'}`}
                                                    >
                                                        {cat === category && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                                                        {cat}
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>



                                    <div className="pt-4 border-t border-slate-100">
                                        <button
                                            onClick={() => setShowMobileFilters(false)}
                                            className="w-full py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20"
                                        >
                                            Apply Filters
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Product Grid */}
                        {loading ? (
                            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="bg-white rounded-3xl p-4 shadow-sm animate-pulse h-80"></div>
                                ))}
                            </div>
                        ) : products.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
                                {products.map(product => (
                                    <div key={product._id} className="block relative group">
                                        <Link to={`/product/${product._id}`}>
                                            <div className="bg-white rounded-3xl p-4 shadow-sm hover:shadow-xl transition-all duration-300 border border-transparent hover:border-primary/20 h-full flex flex-col">

                                                {/* Image */}
                                                <div className="relative aspect-square rounded-2xl bg-slate-50 overflow-hidden mb-4 p-4">
                                                    {/* Badge */}
                                                    <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-green-100/80 backdrop-blur-sm text-green-700 text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-wide">
                                                        In Stock
                                                    </div>

                                                    <img
                                                        src={product.imageUrls?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=2070&auto=format&fit=crop'}
                                                        alt={product.title}
                                                        className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
                                                    />

                                                    {/* Rating Badge */}
                                                    <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-white/90 backdrop-blur-sm text-slate-700 text-[10px] font-bold px-2 py-1 rounded-lg shadow-sm">
                                                        <Star size={10} className="fill-yellow-400 text-yellow-400" /> 4.5
                                                    </div>
                                                </div>

                                                {/* Content */}
                                                <h3 className="text-sm font-bold text-slate-700 line-clamp-2 mb-2 flex-1 group-hover:text-primary transition-colors">
                                                    {product.title}
                                                </h3>

                                                <div className="flex flex-col mb-3">
                                                    <span className="text-[10px] text-slate-400 font-medium">₹{Math.round(product.adminPrice * (1 + (product.gstPercentage || 0) / 100)).toLocaleString()} (Incl. of all taxes)</span>
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="text-lg font-black text-slate-800">₹{product.adminPrice}</span>
                                                        <span className="text-[10px] font-bold text-slate-500">+ {product.gstPercentage}% GST</span>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col gap-3">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center bg-white border border-slate-200 rounded-full p-0.5" onClick={(e) => e.preventDefault()}>
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

                                        {/* Wishlist Button - Absolute positioned outside the Link but inside the relative container */}
                                        <button
                                            onClick={(e) => { e.preventDefault(); toggleWishlist(product); }}
                                            className="absolute top-6 right-6 z-10 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm hover:scale-110 transition-all"
                                        >
                                            <Heart size={18} className={wishlist.includes(product._id) ? "fill-red-500 text-red-500" : "text-slate-400"} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-200">
                                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <ShoppingBag size={32} className="text-slate-300" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-700 mb-1">No products found</h3>
                                <p className="text-slate-500 text-sm">We couldn't find any products in this category.</p>
                                <Link to="/" className="inline-block mt-6 px-6 py-2 bg-slate-800 text-white rounded-full text-sm font-bold hover:bg-slate-900 transition">
                                    Back to Home
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CategoryPage;
