import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, ArrowRight, Heart, Trash2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const WishlistPage = () => {
    const [wishlistItems, setWishlistItems] = useState([]);

    useEffect(() => {
        loadWishlist();
        window.addEventListener('wishlistUpdated', loadWishlist);
        window.addEventListener('storage', loadWishlist);
        return () => {
            window.removeEventListener('wishlistUpdated', loadWishlist);
            window.removeEventListener('storage', loadWishlist);
        };
    }, []);

    const loadWishlist = () => {
        const items = JSON.parse(localStorage.getItem('wishlist') || '[]');
        setWishlistItems(items);
    };

    const removeFromWishlist = (productId) => {
        const updatedWishlist = wishlistItems.filter(item => item._id !== productId);
        localStorage.setItem('wishlist', JSON.stringify(updatedWishlist));
        setWishlistItems(updatedWishlist);
        window.dispatchEvent(new Event('wishlistUpdated'));
    };

    const addToCart = (product) => {
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        const existingItem = cart.find(item => item._id === product._id);

        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({ ...product, quantity: product.moq || 1 });
        }

        localStorage.setItem('cart', JSON.stringify(cart));
        window.dispatchEvent(new Event('cartUpdated'));
        alert('Added to cart!');
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
            <Navbar />

            <div className="max-w-[1440px] mx-auto px-6 py-12">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-red-50 rounded-full">
                        <Heart className="text-red-500 fill-current" size={24} />
                    </div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">My Wishlist</h1>
                    <span className="bg-slate-200 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">{wishlistItems.length} Items</span>
                </div>

                {wishlistItems.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {wishlistItems.map((product) => (
                            <div key={product._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg transition-all group overflow-hidden relative">
                                <button
                                    onClick={() => removeFromWishlist(product._id)}
                                    className="absolute top-3 right-3 z-10 p-2 bg-white/80 backdrop-blur-sm rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition"
                                >
                                    <Trash2 size={16} />
                                </button>

                                <div className="aspect-[4/3] bg-slate-50 p-4 flex items-center justify-center relative overflow-hidden">
                                    <img
                                        src={product.imageUrls?.[0] || 'https://via.placeholder.com/300'}
                                        alt={product.title}
                                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                                    />
                                    {!product.isAvailable && (
                                        <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                                            <span className="bg-slate-800 text-white px-3 py-1 text-xs font-bold uppercase rounded-full">Out of Stock</span>
                                        </div>
                                    )}
                                </div>

                                <div className="p-5">
                                    <div className="mb-2">
                                        <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-1">{product.category}</span>
                                        <h3 className="font-bold text-slate-800 line-clamp-1 group-hover:text-primary transition-colors">{product.title}</h3>
                                    </div>

                                    <div className="flex items-end gap-2 mb-4">
                                        <span className="text-xl font-black text-slate-800">₹{product.sellerPrice}</span>
                                        <span className="text-xs font-bold text-slate-400 mb-1">/ unit</span>
                                    </div>

                                    <button
                                        onClick={() => addToCart(product)}
                                        disabled={!product.isAvailable}
                                        className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold uppercase text-xs hover:bg-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        <ShoppingBag size={16} />
                                        Move to Cart
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Heart className="text-slate-300" size={40} />
                        </div>
                        <h2 className="text-xl font-black text-slate-800 mb-2">Your wishlist is empty</h2>
                        <p className="text-slate-500 mb-8 max-w-md mx-auto">Save items you love here to check them out later.</p>
                        <Link to="/" className="inline-flex items-center gap-2 bg-primary text-white px-8 py-3 rounded-full font-black uppercase text-xs hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20">
                            Start Shopping <ArrowRight size={16} />
                        </Link>
                    </div>
                )}
            </div>

            <Footer />
        </div>
    );
};

export default WishlistPage;
