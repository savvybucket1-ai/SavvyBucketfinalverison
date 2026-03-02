import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ChevronLeft, ChevronRight, Star, Truck, Minus, Plus, ShieldCheck, Lock, BadgePercent, ChevronDown } from 'lucide-react';
import { getCurrentUser } from '../utils/auth';
import ReviewSection from '../components/ReviewSection';
import API_BASE_URL from '../config';

const ProductDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState(0);
    const [multiplier, setMultiplier] = useState(1); // Multiplier for quantity (1, 2, 3, 4...)
    const [activeTab, setActiveTab] = useState('description');
    const [selectedOptions, setSelectedOptions] = useState({});

    const [selectedMoq, setSelectedMoq] = useState(1); // Selected MOQ from dropdown
    const [showQtyDropdown, setShowQtyDropdown] = useState(false);
    const user = getCurrentUser();

    useEffect(() => {
        const COMMON_COLORS = ['blue', 'green', 'red', 'yellow', 'black', 'white', 'orange', 'purple', 'pink', 'grey', 'gray', 'brown', 'gold', 'silver', 'beige', 'maroon', 'navy', 'teal', 'cream', 'mustard', 'olive', 'coral', 'lavender'];

        axios.get(`${API_BASE_URL}/api/products/${id}`)
            .then(res => {
                // Normalize Data: Merge split color variations (e.g. Name="Blue", Name="Green") into one "Color" variation
                const productData = res.data;
                if (productData.variations?.length > 1) {
                    const colorVars = productData.variations.filter(v => COMMON_COLORS.includes(v.name.toLowerCase()));
                    const otherVars = productData.variations.filter(v => !COMMON_COLORS.includes(v.name.toLowerCase()));

                    if (colorVars.length > 1) {
                        const mergedColorVar = {
                            name: 'Color',
                            values: colorVars.map(v => v.name)
                        };
                        // Place Color first, then others
                        productData.variations = [mergedColorVar, ...otherVars];
                    }
                }

                setProduct(productData);
                const initialMoq = productData.moq || 1;
                setSelectedMoq(initialMoq);
                setMultiplier(1);

                // Initialize default variations
                if (productData.variations?.length > 0) {
                    const defaults = {};
                    productData.variations.forEach(v => {
                        if (v.values?.length > 0) defaults[v.name] = v.values[0];
                    });
                    setSelectedOptions(defaults);
                }

                // Fetch Related Products (Same Category)
                if (productData.category) {
                    axios.get(`${API_BASE_URL}/api/products/buyer/list?category=${encodeURIComponent(productData.category)}`)
                        .then(relRes => {
                            // Filter current product and take top 4
                            const related = relRes.data
                                .filter(p => p._id !== productData._id)
                                .slice(0, 4);
                            setRelatedProducts(related);
                        })
                        .catch(err => console.error("Error fetching related products:", err));
                }

                setLoading(false);
            })
            .catch(err => {
                console.error('Error fetching product:', err);
                setLoading(false);
            });
    }, [id]);

    const [relatedProducts, setRelatedProducts] = useState([]);

    // Computed actual quantity = MOQ × multiplier
    const quantity = selectedMoq * multiplier;



    const getPriceForQuantity = (qty) => {
        if (!product) return 0;
        let price = product.adminPrice;
        if (product.tieredPricing && product.tieredPricing.length > 0) {
            // Sort tiers by MOQ descending to find the best price
            const sortedTiers = [...product.tieredPricing].sort((a, b) => b.moq - a.moq);
            const applicableTier = sortedTiers.find(tier => qty >= tier.moq);
            if (applicableTier) {
                price = applicableTier.price;
            }
        }
        return price;
    };

    const currentUnitPrice = getPriceForQuantity(quantity);
    const totalPriceWithGST = Math.round(currentUnitPrice * (1 + (product?.gstPercentage || 0) / 100));
    const totalOrderValue = totalPriceWithGST * quantity;

    const availableQuantities = product ? [
        product.moq,
        ...(product.tieredPricing || []).map(t => t.moq)
    ].filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b) : [];



    const handleAddToCart = () => {
        const existingCart = JSON.parse(localStorage.getItem('cart') || '[]');
        // Check for same product AND same variation
        const existingItemIndex = existingCart.findIndex(item =>
            item._id === product._id &&
            JSON.stringify(item.selectedVariation || {}) === JSON.stringify(selectedOptions || {})
        );

        if (existingItemIndex > -1) {
            existingCart[existingItemIndex].quantity += quantity;
        } else {
            existingCart.push({
                ...product,
                quantity,
                selectedVariation: selectedOptions,
                cartItemId: Date.now() + Math.random().toString(36).substr(2, 9)
            });
        }

        localStorage.setItem('cart', JSON.stringify(existingCart));

        // Dispatch event to update cart count in Navbar
        window.dispatchEvent(new Event('cartUpdated'));

        alert(`Added ${quantity} x ${product.title} to cart!`);
    };

    // ...

    const handleBuyNow = () => {
        const existingCart = JSON.parse(localStorage.getItem('cart') || '[]');
        const existingItemIndex = existingCart.findIndex(item =>
            item._id === product._id &&
            JSON.stringify(item.selectedVariation || {}) === JSON.stringify(selectedOptions || {})
        );

        if (existingItemIndex > -1) {
            existingCart[existingItemIndex].quantity += quantity;
        } else {
            existingCart.push({
                ...product,
                quantity,
                selectedVariation: selectedOptions,
                cartItemId: Date.now() + Math.random().toString(36).substr(2, 9)
            });
        }

        localStorage.setItem('cart', JSON.stringify(existingCart));
        window.dispatchEvent(new Event('cartUpdated'));
        navigate('/cart');
    };


    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
                <h1 className="text-2xl font-bold text-slate-800 mb-4">Product not found</h1>
                <Link to="/" className="text-primary hover:underline">← Back to Home</Link>
            </div>
        );
    }




    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-[1440px] mx-auto px-6 py-6">
                {/* Breadcrumb */}
                <div className="flex flex-wrap items-center gap-2 text-sm mb-6">
                    <Link to="/" className="text-slate-500 hover:text-primary flex items-center gap-1">
                        <ChevronLeft size={16} />
                        Home
                    </Link>
                    <span className="text-slate-300">/</span>
                    <span className="text-slate-500">{product.category}</span>
                    <span className="text-slate-300">/</span>
                    <span className="text-slate-800 font-semibold">{product.title}</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    {/* Image Gallery */}
                    <div className="flex flex-col-reverse md:flex-row gap-4">
                        {/* Thumbnails */}
                        <div className="flex md:flex-col gap-3 overflow-x-auto md:overflow-visible no-scrollbar">
                            {product.imageUrls?.map((img, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedImage(idx)}
                                    className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${selectedImage === idx
                                        ? 'border-primary shadow-lg shadow-primary/20'
                                        : 'border-slate-200 hover:border-slate-300'
                                        }`}
                                >
                                    <img src={img} alt={`${product.title} ${idx + 1}`} className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>

                        {/* Main Image */}
                        <div className="flex-1 bg-white rounded-3xl overflow-hidden relative group aspect-square md:aspect-auto md:h-[500px]">
                            <img
                                src={product.imageUrls?.[selectedImage] || 'https://via.placeholder.com/500'}
                                alt={product.title}
                                className="w-full h-full object-contain p-6"
                            />
                            {product.imageUrls?.length > 1 && (
                                <>
                                    <button
                                        onClick={() => setSelectedImage(prev => prev > 0 ? prev - 1 : product.imageUrls.length - 1)}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <ChevronLeft size={20} />
                                    </button>
                                    <button
                                        onClick={() => setSelectedImage(prev => prev < product.imageUrls.length - 1 ? prev + 1 : 0)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <ChevronRight size={20} />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Product Details */}
                    <div className="flex flex-col">
                        {/* Title & Rating */}
                        <h1 className="text-3xl font-bold text-slate-800 mb-3">{product.title}</h1>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map(star => (
                                    <Star
                                        key={star}
                                        size={16}
                                        className={star <= (product.rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'}
                                    />
                                ))}
                            </div>
                            <span className="text-sm text-slate-500">({product.reviewsCount || 0} Reviews)</span>

                        </div>

                        {/* Variations Selections */}
                        {product.variations?.length > 0 && (
                            <div className="space-y-4 mb-6">
                                {product.variations.map((v, idx) => (
                                    <div key={idx}>
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">{v.name}</span>
                                        <div className="flex flex-wrap gap-2">
                                            {v.values.map((val, vIdx) => (
                                                <button
                                                    key={vIdx}
                                                    onClick={() => setSelectedOptions(prev => ({ ...prev, [v.name]: val }))}
                                                    className={`px-4 py-2 rounded-lg text-sm font-bold border-2 transition-all ${selectedOptions[v.name] === val
                                                        ? 'border-primary bg-primary/5 text-primary'
                                                        : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                                                        }`}
                                                >
                                                    {val}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Price */}
                        {/* Price */}
                        <div className="flex flex-col mb-6">
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-black text-slate-800">₹{totalPriceWithGST.toLocaleString()}</span>
                                <span className="text-sm font-bold text-slate-500">(Incl. of all taxes)</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-lg font-bold text-slate-600">₹{currentUnitPrice.toLocaleString()}</span>
                                <span className="text-sm font-medium text-slate-400">+ {product.gstPercentage}% GST</span>
                            </div>
                            {quantity > 1 && (
                                <div className="mt-1 text-primary font-bold text-sm">
                                    Total Value: ₹{totalOrderValue.toLocaleString()}
                                </div>
                            )}
                        </div>

                        {/* Quantity Selector with MOQ Dropdown */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 relative">
                            <div className="flex flex-wrap items-center gap-3">
                                {/* MOQ Dropdown - Shows actual quantity (12, 24, 36...) */}
                                <div className="bg-slate-100 px-4 h-12 rounded-xl flex items-center justify-center">
                                    <span className="text-xl font-black text-slate-800">{quantity}</span>
                                </div>

                                {/* Multiplier Counter (+/- buttons showing 1, 2, 3, 4...) */}
                                <div className="flex items-center h-12 bg-primary/5 rounded-xl border-2 border-primary/20 overflow-hidden">
                                    <button
                                        onClick={() => {
                                            if (multiplier > 1) {
                                                setMultiplier(multiplier - 1);
                                            }
                                        }}
                                        disabled={multiplier <= 1}
                                        className="w-10 h-full flex items-center justify-center text-primary hover:bg-primary/10 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                                    >
                                        <Minus size={16} />
                                    </button>
                                    <span className="min-w-[40px] px-2 text-center font-black text-primary">
                                        {multiplier}
                                    </span>
                                    <button
                                        onClick={() => {
                                            setMultiplier(multiplier + 1);
                                        }}
                                        className="w-10 h-full flex items-center justify-center text-primary hover:bg-primary/10 transition-colors"
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>

                                {/* MOQ Dropdown Selector */}
                                <div className="relative">
                                    <button
                                        onClick={() => setShowQtyDropdown(!showQtyDropdown)}
                                        className="min-w-[80px] h-12 px-3 bg-white border-2 border-slate-200 rounded-xl flex items-center justify-between gap-2 hover:border-primary transition-colors cursor-pointer"
                                    >
                                        <span className="text-sm font-bold text-slate-600">MOQ</span>
                                        <span className="text-lg font-bold text-slate-800">{selectedMoq}</span>
                                        <ChevronDown className={`w-4 h-4 transition-transform ${showQtyDropdown ? 'rotate-180' : ''}`} />
                                    </button>

                                    {showQtyDropdown && (
                                        <div className="absolute bottom-full left-0 mb-2 w-full bg-white border-2 border-slate-100 rounded-xl shadow-xl z-50 overflow-hidden">
                                            {availableQuantities.map((qty) => (
                                                <button
                                                    key={qty}
                                                    onClick={() => {
                                                        setSelectedMoq(qty);
                                                        setMultiplier(1); // Reset multiplier when MOQ changes
                                                        setShowQtyDropdown(false);
                                                    }}
                                                    className={`w-full px-4 py-3 text-left font-bold text-sm hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 ${selectedMoq === qty ? 'bg-primary/5 text-primary' : 'text-slate-700'
                                                        }`}
                                                >
                                                    {qty}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <span className="text-sm font-medium text-slate-500">
                                MOQ: {product.moq} | Total: <span className="font-bold text-primary">{quantity} units</span>
                            </span>
                        </div>

                        {/* Tiered Pricing / Volume Discounts */}


                        {/* Category */}
                        <div className="text-sm text-slate-500 mb-6">
                            Category: <span className="font-semibold text-slate-800">{product.category}</span>
                        </div>

                        {/* Tabs */}
                        <div className="border-b border-slate-200 mb-4">
                            <div className="flex gap-8">
                                <button
                                    onClick={() => setActiveTab('description')}
                                    className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'description'
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    Description
                                </button>
                                <button
                                    onClick={() => setActiveTab('specifications')}
                                    className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'specifications'
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    Specifications
                                </button>
                            </div>
                        </div>

                        {/* Tab Content */}
                        <div className="text-slate-600 text-sm leading-relaxed mb-6">
                            {activeTab === 'description' ? (
                                <p>{product.description}</p>
                            ) : (
                                <div className="space-y-3 mt-4">
                                    {(() => {
                                        // Helper to get specs based on quantity tier
                                        const getSpecsForQuantity = (qty) => {
                                            let w = product.weight;
                                            let d = product.dimensions;

                                            if (product.tieredPricing && product.tieredPricing.length > 0) {
                                                const sortedTiers = [...product.tieredPricing].sort((a, b) => b.moq - a.moq);
                                                const peer = sortedTiers.find(tier => qty >= tier.moq);
                                                if (peer) {
                                                    if (peer.weight) w = peer.weight;
                                                    if (peer.length || peer.breadth || peer.height) {
                                                        d = {
                                                            length: peer.length || d?.length,
                                                            breadth: peer.breadth || d?.breadth,
                                                            height: peer.height || d?.height
                                                        };
                                                    }
                                                }
                                            }
                                            return { weight: w, dimensions: d };
                                        };

                                        const currentSpecs = getSpecsForQuantity(quantity);

                                        return (
                                            <>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                                                    <div>
                                                        <p className="text-slate-500 font-medium text-xs uppercase tracking-wider mb-1">HSN Code</p>
                                                        <p className="font-bold text-slate-800">{product.hsnCode || 'N/A'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-slate-500 font-medium text-xs uppercase tracking-wider mb-1">GST Rate</p>
                                                        <p className="font-bold text-slate-800">{product.gstPercentage}%</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-slate-500 font-medium text-xs uppercase tracking-wider mb-1">Stock Status</p>
                                                        <p className="font-bold text-slate-800">{product.stock > 0 ? `${product.stock} units` : 'Out of Stock'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-slate-500 font-medium text-xs uppercase tracking-wider mb-1">Category</p>
                                                        <p className="font-bold text-slate-800">{product.category}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-slate-500 font-medium text-xs uppercase tracking-wider mb-1">
                                                            {product.tieredPricing && product.tieredPricing.length > 0 ? `Box Weight (for ${selectedMoq} units)` : 'Unit Weight'}
                                                        </p>
                                                        <p className="font-bold text-slate-800">{currentSpecs.weight ? `${currentSpecs.weight} kg` : 'N/A'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-slate-500 font-medium text-xs uppercase tracking-wider mb-1">
                                                            {product.tieredPricing && product.tieredPricing.length > 0 ? `Box Dims (for ${selectedMoq} units)` : 'Dimensions (L x B x H)'}
                                                        </p>
                                                        <p className="font-bold text-slate-800">
                                                            {currentSpecs.dimensions && (currentSpecs.dimensions.length || currentSpecs.dimensions.breadth || currentSpecs.dimensions.height)
                                                                ? `${currentSpecs.dimensions.length || 0} x ${currentSpecs.dimensions.breadth || 0} x ${currentSpecs.dimensions.height || 0} cm`
                                                                : 'N/A'
                                                            }
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Dynamic Calculations based on MOQ */}
                                                <div className="bg-slate-50 rounded-xl p-4 mt-4 border border-slate-100">
                                                    <h4 className="text-sm font-black text-slate-700 mb-2 border-b border-slate-200 pb-2">ORDER SPECIFICATIONS (For {quantity} units)</h4>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        <div>
                                                            <p className="text-slate-500 text-xs font-semibold">Total Weight</p>
                                                            <p className="text-primary font-black text-lg">
                                                                {currentSpecs.weight ? `${(parseFloat(currentSpecs.weight) * multiplier).toFixed(2)} kg` : '-'}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-slate-500 text-xs font-semibold">Approx. Volume</p>
                                                            <p className="text-slate-800 font-bold">
                                                                {currentSpecs.dimensions && currentSpecs.dimensions.length && currentSpecs.dimensions.breadth && currentSpecs.dimensions.height
                                                                    ? `${((currentSpecs.dimensions.length * currentSpecs.dimensions.breadth * currentSpecs.dimensions.height * multiplier) / 1000).toFixed(2)} L` // Volume for 'multiplier' boxes
                                                                    : '-'
                                                                }
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 mt-2 italic">*Calculated based on standard product dimensions. Actual shipping dimensions may vary due to packaging.</p>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>



                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 mb-4">
                            <button
                                onClick={handleAddToCart}
                                className="flex-1 py-4 border-2 border-primary text-primary font-bold rounded-xl hover:bg-primary/5 transition-colors uppercase text-sm"
                            >
                                Add to Cart
                            </button>
                            <button
                                onClick={handleBuyNow}
                                className="flex-1 py-4 bg-primary text-white font-bold rounded-xl hover:bg-blue-600 transition-colors uppercase shadow-lg shadow-primary/20 text-sm"
                            >
                                Buy Now
                            </button>
                        </div>

                        {/* Trust Badges */}
                        <div className="flex items-center justify-center gap-6 text-xs text-slate-500">
                            <div className="flex items-center gap-1">
                                <Lock size={14} />
                                <span>Secure Payment</span>
                            </div>
                            <span className="text-slate-300">|</span>
                            <div className="flex items-center gap-1">
                                <ShieldCheck size={14} />
                                <span>Buyer Protection</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Related Products Section */}
                {relatedProducts.length > 0 && (
                    <div className="mb-12 border-t border-slate-200 pt-10">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Related Products</h2>
                            <Link to={`/`} className="text-primary text-sm font-bold hover:underline flex items-center gap-1">
                                View All <ChevronRight size={14} />
                            </Link>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {relatedProducts.map(relProduct => (
                                <Link onClick={() => window.scrollTo(0, 0)} to={`/product/${relProduct._id}`} key={relProduct._id} className="group bg-white rounded-xl border border-slate-100 p-3 hover:shadow-xl transition-all hover:-translate-y-1 block">
                                    <div className="relative aspect-square rounded-lg overflow-hidden bg-slate-50 mb-3">
                                        <img
                                            src={relProduct.imageUrls?.[0] || 'https://via.placeholder.com/300'}
                                            alt={relProduct.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{relProduct.category}</div>
                                        <h3 className="font-bold text-slate-800 line-clamp-1 group-hover:text-primary transition-colors text-sm">{relProduct.title}</h3>
                                        <div className="flex items-center gap-1 text-xs text-yellow-500">
                                            <Star size={12} fill="currentColor" />
                                            <span className="font-bold text-slate-700">{relProduct.rating || 0}</span>
                                            <span className="text-slate-400">({relProduct.reviewsCount || 0})</span>
                                        </div>
                                        <div className="flex items-baseline gap-2 pt-1">
                                            <span className="font-black text-slate-800">₹{relProduct.adminPrice}</span>
                                            {relProduct.sellerPrice > relProduct.adminPrice && (
                                                <span className="text-xs text-slate-400 line-through">₹{relProduct.sellerPrice}</span>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Reviews Section */}
                <ReviewSection productId={id} />

            </div>
        </div>
    );
};

export default ProductDetail;
