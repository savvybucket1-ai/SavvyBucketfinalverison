import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { ShoppingCart, Star, Filter, ChevronDown, ChevronRight, LayoutGrid, List, Heart, ShoppingBag, Minus, Plus } from 'lucide-react';
import { categories } from '../utils/categories';
import API_BASE_URL from '../config';

const CategoryPage = () => {
    const { category } = useParams();
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const searchQuery = searchParams.get('search');
    const subCategoryParam = searchParams.get('subCategory');

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    const [wishlist, setWishlist] = useState([]);
    const [quantities, setQuantities] = useState({});
    const [showMobileFilters, setShowMobileFilters] = useState(false);
    const [activeSubCategory, setActiveSubCategory] = useState(subCategoryParam || '');

    // New State for Sorting and View Mode
    const [sortBy, setSortBy] = useState('relevance');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

    // Update activeSubCategory when URL param changes
    useEffect(() => {
        setActiveSubCategory(subCategoryParam || '');
    }, [subCategoryParam]);

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

    // Get current category details including subcategories
    const currentCategoryDetails = categories.find(c => c.name === category);

    // Fetch products based on category, subCategory, search, and sort
    useEffect(() => {
        setLoading(true);
        let url = `${API_BASE_URL}/api/products/buyer/list?category=${encodeURIComponent(category)}`;

        if (searchQuery) {
            url += `&search=${encodeURIComponent(searchQuery)}`;
        }

        if (activeSubCategory) {
            url += `&subCategory=${encodeURIComponent(activeSubCategory)}`;
        }

        if (sortBy && sortBy !== 'relevance') {
            url += `&sort=${encodeURIComponent(sortBy)}`;
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
    }, [category, searchQuery, activeSubCategory, sortBy]);

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

    return (
        <div className="bg-slate-50 min-h-screen py-8">
            <div className="max-w-[1440px] mx-auto px-6">

                {/* Breadcrumb */}
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 mb-6 font-medium">
                    <Link to="/" className="hover:text-primary">Home</Link>
                    <ChevronRight size={14} />
                    <span className="text-slate-800 font-bold">{category}</span>
                    {activeSubCategory && (
                        <>
                            <ChevronRight size={14} />
                            <span className="text-slate-800 font-bold">{activeSubCategory}</span>
                        </>
                    )}
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
                                {categories.map((cat, idx) => (
                                    <li key={idx}>
                                        <Link to={`/category/${cat.name}`} className={`text-sm cursor-pointer hover:text-primary transition-colors flex items-center gap-2 ${cat.name === category ? 'text-primary font-bold bg-blue-50 p-2 rounded-lg' : 'text-slate-600'}`}>
                                            {cat.name === category && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                                            {cat.name}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1">

                        {/* Subcategories Grid */}
                        {currentCategoryDetails?.subCategories && currentCategoryDetails.subCategories.length > 0 && (
                            <div className="mb-8">
                                <h2 className="text-xl font-black text-slate-800 mb-4">{currentCategoryDetails.name}</h2>
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                                    {currentCategoryDetails.subCategories.map((sub, idx) => (
                                        <Link
                                            key={idx}
                                            to={`/category/${category}?subCategory=${encodeURIComponent(sub.name)}`}
                                            className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all ${activeSubCategory === sub.name ? 'bg-primary text-white shadow-lg shadow-blue-500/20 scale-105' : 'bg-white hover:bg-slate-100 text-slate-700'}`}
                                        >
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center overflow-hidden ${activeSubCategory === sub.name ? 'bg-white/20' : 'bg-slate-100'}`}>
                                                <img src={sub.image || 'https://via.placeholder.com/50'} alt={sub.name} className="w-full h-full object-cover" />
                                            </div>
                                            <span className="text-xs font-bold text-center leading-tight">{sub.name}</span>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Control Bar: Sorting and View Toggle */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 md:p-6 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight mb-1">
                                    {activeSubCategory ? `${activeSubCategory}` : (category === 'All Categories' && searchQuery ? `Search Results for "${searchQuery}"` : (activeSubCategory || 'All Products'))}
                                </h1>
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

                                {/* Dynamic Sort Dropdown */}
                                <div className="relative group">
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value)}
                                        className="appearance-none pl-4 pr-10 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-sm font-bold text-slate-700 transition-colors outline-none cursor-pointer border border-transparent focus:border-primary/20"
                                    >
                                        <option value="relevance">Relevance</option>
                                        <option value="price_low">Price: Low to High</option>
                                        <option value="price_high">Price: High to Low</option>
                                        <option value="newest">Newest First</option>
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                                </div>

                                {/* Dynamic View Toggle */}
                                <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
                                    <button
                                        onClick={() => setViewMode('grid')}
                                        className={`p-1.5 rounded shadow-sm transition ${viewMode === 'grid' ? 'bg-white text-primary' : 'hover:bg-white text-slate-400'}`}
                                        title="Grid View"
                                    >
                                        <LayoutGrid size={16} />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('list')}
                                        className={`p-1.5 rounded transition ${viewMode === 'list' ? 'bg-white text-primary shadow-sm' : 'hover:bg-white text-slate-400'}`}
                                        title="List View"
                                    >
                                        <List size={16} />
                                    </button>
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

                                    <div className="mb-8">
                                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase text-xs tracking-wider">
                                            <LayoutGrid size={16} className="text-primary" /> All Categories
                                        </h3>
                                        <ul className="space-y-3">
                                            {categories.map((cat, idx) => (
                                                <li key={idx}>
                                                    <Link
                                                        to={`/category/${cat.name}`}
                                                        onClick={() => setShowMobileFilters(false)}
                                                        className={`text-sm cursor-pointer hover:text-primary transition-colors flex items-center gap-2 ${cat.name === category ? 'text-primary font-bold bg-blue-50 p-2 rounded-lg' : 'text-slate-600'}`}
                                                    >
                                                        {cat.name === category && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                                                        {cat.name}
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

                        {/* Product Grid / List */}
                        {loading ? (
                            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="bg-white rounded-3xl p-4 shadow-sm animate-pulse h-80"></div>
                                ))}
                            </div>
                        ) : products.length > 0 ? (
                            <div className={viewMode === 'grid'
                                ? "grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6"
                                : "space-y-4"
                            }>
                                {products.map(product => {
                                    const qty = quantities[product._id] || product.moq || 1;
                                    const priceWithGST = Math.round(product.adminPrice * (1 + (product.gstPercentage || 0) / 100));

                                    return (
                                        <div key={product._id} className="block relative group">
                                            {viewMode === 'grid' ? (
                                                <Link to={`/product/${product._id}`}>
                                                    <div className="bg-white rounded-3xl p-4 shadow-sm hover:shadow-xl transition-all duration-300 border border-transparent hover:border-primary/20 h-full flex flex-col">
                                                        <div className="relative aspect-square rounded-2xl bg-slate-50 overflow-hidden mb-4 p-4">
                                                            <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-green-100/80 backdrop-blur-sm text-green-700 text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-wide">
                                                                In Stock
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

                                                        <h3 className="text-sm font-bold text-slate-700 line-clamp-2 mb-2 flex-1 group-hover:text-primary transition-colors">
                                                            {product.title}
                                                        </h3>

                                                        <div className="flex flex-col mb-3">
                                                            <div className="flex items-baseline gap-1">
                                                                <span className="text-lg font-black text-slate-800">₹{priceWithGST.toLocaleString()}</span>
                                                                <span className="text-[10px] font-bold text-slate-500">(Incl. of all taxes)</span>
                                                            </div>
                                                            <span className="text-[10px] text-slate-400 font-medium">₹{product.adminPrice} + {product.gstPercentage}% GST</span>
                                                        </div>

                                                        <div className="flex flex-col gap-3">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center bg-white border border-slate-200 rounded-full p-0.5" onClick={(e) => e.preventDefault()}>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            if (qty > (product.moq || 1)) {
                                                                                handleQuantityChange(product._id, parseInt(qty) - 1);
                                                                            }
                                                                        }}
                                                                        className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors text-slate-600"
                                                                    >
                                                                        <Minus size={12} />
                                                                    </button>
                                                                    <span className="w-8 text-center text-xs font-bold text-slate-800">{qty}</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            handleQuantityChange(product._id, parseInt(qty) + 1);
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
                                            ) : (
                                                <div className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-lg transition-all border border-transparent hover:border-primary/20 flex gap-6 items-center">
                                                    <Link to={`/product/${product._id}`} className="flex-shrink-0 w-32 h-32 md:w-48 md:h-48 bg-slate-50 rounded-xl p-4 relative group-hover:scale-105 transition-transform">
                                                        <img
                                                            src={product.imageUrls?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=2070&auto=format&fit=crop'}
                                                            alt={product.title}
                                                            className="w-full h-full object-contain"
                                                        />
                                                        <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-green-100/80 backdrop-blur-sm text-green-700 text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-wide">
                                                            In Stock
                                                        </div>
                                                    </Link>

                                                    <div className="flex-1 flex flex-col md:flex-row justify-between gap-4">
                                                        <div className="flex-1">
                                                            <Link to={`/product/${product._id}`}>
                                                                <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-primary transition-colors">{product.title}</h3>
                                                            </Link>
                                                            <p className="text-xs text-slate-500 line-clamp-2 mb-3">{product.description}</p>
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-md text-slate-600 text-xs font-bold">
                                                                    <Star size={12} className="fill-yellow-400 text-yellow-400" /> 4.5
                                                                </div>
                                                                <span className="text-[10px] text-slate-400 font-bold">• {product.stock} items left</span>
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-col items-end gap-4 min-w-[140px]">
                                                            <div className="text-right">
                                                                <div className="flex items-baseline justify-end gap-1">
                                                                    <span className="text-xl font-black text-slate-800">₹{priceWithGST.toLocaleString()}</span>
                                                                    <span className="text-[10px] font-bold text-slate-500">(Incl. Tax)</span>
                                                                </div>
                                                                <span className="text-xs text-slate-400 font-medium block">₹{product.adminPrice} + {product.gstPercentage}% GST</span>
                                                            </div>

                                                            <div className="flex items-center bg-white border border-slate-200 rounded-full p-0.5" onClick={(e) => e.preventDefault()}>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        if (qty > (product.moq || 1)) {
                                                                            handleQuantityChange(product._id, parseInt(qty) - 1);
                                                                        }
                                                                    }}
                                                                    className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors text-slate-600"
                                                                >
                                                                    <Minus size={14} />
                                                                </button>
                                                                <span className="w-10 text-center text-sm font-bold text-slate-800">{qty}</span>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        handleQuantityChange(product._id, parseInt(qty) + 1);
                                                                    }}
                                                                    className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors text-slate-600"
                                                                >
                                                                    <Plus size={14} />
                                                                </button>
                                                            </div>

                                                            <button
                                                                onClick={(e) => { e.preventDefault(); handleAddToCart(product); }}
                                                                className="w-full py-2.5 bg-primary text-white rounded-xl text-xs font-black uppercase hover:bg-blue-600 transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-1"
                                                            >
                                                                <ShoppingCart size={14} /> Add to Cart
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <button
                                                onClick={(e) => { e.preventDefault(); toggleWishlist(product); }}
                                                className={`absolute ${viewMode === 'grid' ? 'top-6 right-6' : 'top-4 right-4'} z-10 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm hover:scale-110 transition-all`}
                                            >
                                                <Heart size={18} className={wishlist.includes(product._id) ? "fill-red-500 text-red-500" : "text-slate-400"} />
                                            </button>
                                        </div>
                                    );
                                })}
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
