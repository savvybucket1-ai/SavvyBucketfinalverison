import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCurrentUser, logout } from '../utils/auth';
import { ShoppingBag, User, Heart, MapPin, Search, ChevronDown, LogOut } from 'lucide-react';

const Navbar = () => {
    const user = getCurrentUser();
    const navigate = useNavigate();
    const [cartCount, setCartCount] = useState(0);
    const [wishlistCount, setWishlistCount] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');

    // Sidebar Categories (Same as Seller Dashboard & Category Page)
    const categories = [
        'Gifting Products', 'Electronic Gadgets', 'Bottles and Tumblers',
        'Kitchen Ware', 'Lamp & Projector', 'Ceramic Mugs',
        'Tripod and Stands', 'Toys and Games', 'Clothing',
        'Statutes and Sculptures', 'Sublimation Products', 'Product Manufacturing'
    ];

    // Calculate cart & wishlist count
    const updateCounts = () => {
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        const count = cart.reduce((acc, item) => acc + (item.quantity || 1), 0);
        setCartCount(count);

        const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
        setWishlistCount(wishlist.length);
    };

    useEffect(() => {
        updateCounts();
        window.addEventListener('cartUpdated', updateCounts);
        window.addEventListener('wishlistUpdated', updateCounts);
        window.addEventListener('storage', updateCounts);

        return () => {
            window.removeEventListener('cartUpdated', updateCounts);
            window.removeEventListener('wishlistUpdated', updateCounts);
            window.removeEventListener('storage', updateCounts);
        };
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            navigate(`/category/All Categories?search=${encodeURIComponent(searchTerm)}`);
        }
    };

    const navItems = [
        { name: 'Gifting Products', link: '/category/Gifting Products' },
        { name: 'Electronic Gadgets', link: '/category/Electronic Gadgets' },
        { name: 'Bottles and Tumblers', link: '/category/Bottles and Tumblers' },
        { name: 'Kitchen Ware', link: '/category/Kitchen Ware' },
        { name: 'Lamp & Projector', link: '/category/Lamp & Projector' },
        { name: 'Ceramic Mugs', link: '/category/Ceramic Mugs' },
        { name: 'Tripod and Stands', link: '/category/Tripod and Stands' },
        { name: 'Toys and Games', link: '/category/Toys and Games' },
        { name: 'Clothing', link: '/category/Clothing' },
    ];

    return (
        <header className="bg-white sticky top-0 z-50 shadow-sm border-b border-slate-100">
            {/* Main Header Container */}
            <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-4 flex flex-wrap lg:flex-nowrap items-center justify-between gap-4 lg:gap-12">
                {/* Logo */}
                <Link to="/" className="flex-shrink-0 order-1">
                    <img
                        src="https://deodap.com/cdn/shop/files/DeoDap_Logo_New_300x.png?v=1614332567"
                        alt="DeoDap Logo"
                        className="h-8 md:h-10 object-contain"
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.style.display = 'none';
                        }}
                    />
                    <span className="text-2xl md:text-3xl font-black italic tracking-tighter text-slate-800">
                        Savvy<span className="text-primary">Bucket</span>
                    </span>
                </Link>

                {/* Search Bar Area */}
                <form onSubmit={handleSearch} className="order-3 lg:order-2 w-full lg:w-auto flex-1 flex items-center bg-slate-100 rounded-full px-4 h-12 shadow-inner group focus-within:ring-2 focus-within:ring-primary/20 transition-all relative z-40">
                    <div className="hidden sm:flex group/cat relative items-center gap-2 px-4 border-r border-slate-300 cursor-pointer hover:text-primary transition-colors pr-6 h-full">
                        <span className="text-sm font-semibold whitespace-nowrap text-slate-700">All Categories</span>
                        <ChevronDown size={14} className="text-slate-400" />

                        {/* Dropdown Menu */}
                        <div className="absolute top-full left-0 w-56 bg-white shadow-xl rounded-xl border border-slate-100 py-2 hidden group-hover/cat:block max-h-[400px] overflow-y-auto z-50">
                            {categories.map((cat, idx) => (
                                <Link to={`/category/${cat}`} key={idx} className="block px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-primary transition-colors">
                                    {cat}
                                </Link>
                            ))}
                        </div>
                    </div>
                    <input
                        type="text"
                        placeholder="What are you looking for?"
                        className="flex-1 bg-transparent px-4 outline-none text-sm text-slate-700 placeholder:text-slate-400 w-full"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button type="submit" className="p-2 hover:bg-slate-200 rounded-full transition-colors mr-1 flex-shrink-0">
                        <Search size={20} className="text-slate-500" />
                    </button>
                </form>

                {/* Navbar Icons/Actions */}
                <div className="order-2 lg:order-3 flex items-center gap-4 md:gap-8 ml-auto lg:ml-0">
                    <div className="flex items-center gap-3 md:gap-6 lg:border-l lg:border-slate-200 lg:pl-8">
                        {user ? (
                            <Link to="/profile" className="flex flex-col items-center gap-1 text-slate-700 hover:text-primary transition group">
                                <User size={20} className="md:w-6 md:h-6 stroke-[1.5]" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 group-hover:text-primary hidden md:block">Profile</span>
                            </Link>
                        ) : (
                            <Link to="/login" className="px-4 py-2 md:px-6 md:py-2.5 bg-primary text-white text-[10px] md:text-[11px] font-black uppercase rounded-full shadow-lg shadow-blue-500/20 hover:bg-blue-600 hover:scale-105 transition-all active:scale-95 whitespace-nowrap">
                                Login
                            </Link>
                        )}

                        <Link to="/wishlist" className="p-2 hover:bg-slate-50 rounded-full transition-colors cursor-pointer relative group">
                            <Heart size={20} className="md:w-6 md:h-6 text-slate-700 stroke-[1.5]" />
                            <span className="absolute top-0 right-0 md:top-1 md:right-1 bg-primary text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full border border-white">{wishlistCount}</span>
                        </Link>

                        <Link to="/cart" className="p-2 hover:bg-slate-100 bg-slate-100 rounded-full transition-colors relative group shadow-sm">
                            <ShoppingBag size={20} className="md:w-6 md:h-6 text-slate-800 stroke-[1.5]" />
                            <span className="absolute top-0 right-0 md:top-1 md:right-1 bg-primary text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full border border-white">{cartCount}</span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Bottom Nav Row */}
            <nav className="bg-white border-t border-slate-50">
                <div className="max-w-[1440px] mx-auto px-6 overflow-x-auto no-scrollbar">
                    <ul className="flex items-center gap-8 h-12 whitespace-nowrap">
                        {navItems.map((item, idx) => (
                            <li key={idx}>
                                <Link to={item.link} className="flex items-center gap-1.5 cursor-pointer hover:text-primary transition-colors">
                                    <span className="text-sm font-semibold text-slate-700">{item.name}</span>
                                    {item.hasDropdown && <ChevronDown size={14} className="text-slate-400" />}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            </nav>
        </header>
    );
};

export default Navbar;
