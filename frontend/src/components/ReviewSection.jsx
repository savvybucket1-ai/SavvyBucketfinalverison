import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Star, Image as ImageIcon, Upload, X } from 'lucide-react';
import { getCurrentUser } from '../utils/auth';
import { Link } from 'react-router-dom';
import API_BASE_URL from '../config';

const ReviewSection = ({ productId }) => {
    const [reviews, setReviews] = useState([]);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(false);
    const user = getCurrentUser();

    useEffect(() => {
        fetchReviews();
    }, [productId]);

    const fetchReviews = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/reviews/${productId}`);
            setReviews(res.data);
        } catch (err) {
            console.error('Failed to fetch reviews', err);
        }
    };

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length + images.length > 5) {
            alert('Max 5 images allowed');
            return;
        }
        setImages([...images, ...files]);
    };

    const removeImage = (index) => {
        setImages(images.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) {
            alert('Please login to add a review');
            return;
        }
        setLoading(true);

        const formData = new FormData();
        formData.append('productId', productId);
        formData.append('rating', rating);
        formData.append('comment', comment);
        images.forEach(img => formData.append('images', img));

        try {
            await axios.post(`${API_BASE_URL}/api/reviews/add`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${user.token}`
                }
            });
            setComment('');
            setRating(5);
            setImages([]);
            fetchReviews();
            window.dispatchEvent(new Event('productUpdated')); // To refresh product rating in parent
        } catch (err) {
            console.error('Failed to submit review', err);
            alert('Failed to submit review');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mt-10 bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Customer Reviews ({reviews.length})</h2>

            {/* Add Review Form */}
            {user && (user.role === 'buyer' || user.role === 'admin') ? (
                <form onSubmit={handleSubmit} className="mb-8 bg-slate-50 p-6 rounded-xl border border-slate-100">
                    <h3 className="text-md font-semibold text-slate-700 mb-4">Write a Review</h3>

                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-sm text-slate-500">Rating:</span>
                        {[1, 2, 3, 4, 5].map(star => (
                            <button
                                type="button"
                                key={star}
                                onClick={() => setRating(star)}
                                className="focus:outline-none transition-transform hover:scale-110"
                            >
                                <Star
                                    size={24}
                                    className={star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'}
                                />
                            </button>
                        ))}
                    </div>

                    <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Share your thoughts about this product..."
                        className="w-full p-3 rounded-lg border border-slate-300 focus:outline-none focus:border-primary mb-4 text-sm"
                        rows="3"
                        required
                    ></textarea>

                    {/* Image Upload Preview */}
                    {images.length > 0 && (
                        <div className="flex gap-2 mb-4 overflow-x-auto">
                            {images.map((img, idx) => (
                                <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200 group">
                                    <img
                                        src={URL.createObjectURL(img)}
                                        alt="preview"
                                        className="w-full h-full object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeImage(idx)}
                                        className="absolute top-0 right-0 p-1 bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex items-center justify-between">
                        <label className="cursor-pointer flex items-center gap-2 text-sm text-slate-600 hover:text-primary transition-colors">
                            <input
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={handleImageChange}
                                className="hidden"
                            />
                            <ImageIcon size={18} />
                            <span>Add Photos</span>
                        </label>

                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-primary text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-primary/90 transition-all disabled:opacity-50"
                        >
                            {loading ? 'Submitting...' : 'Post Review'}
                        </button>
                    </div>
                </form>
            ) : !user ? (
                <div className="mb-8 p-4 bg-yellow-50 text-yellow-800 rounded-lg text-sm text-center">
                    Please <Link to="/login" className="font-bold underline">login</Link> to write a review.
                </div>
            ) : null}

            {/* Reviews List */}
            <div className="space-y-6">
                {reviews.length === 0 ? (
                    <p className="text-slate-500 text-center py-4">No reviews yet. Be the first to review!</p>
                ) : (
                    reviews.map(review => (
                        <div key={review._id} className="border-b border-slate-100 pb-6 last:border-0 last:pb-0">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                        {review.userId?.name?.charAt(0) || 'U'}
                                    </div>
                                    <span className="font-semibold text-slate-800 text-sm">{review.userId?.name || 'Anonymous user'}</span>
                                </div>
                                <span className="text-xs text-slate-400">
                                    {new Date(review.createdAt).toLocaleDateString()}
                                </span>
                            </div>

                            <div className="flex items-center gap-1 mb-2">
                                {[1, 2, 3, 4, 5].map(star => (
                                    <Star
                                        key={star}
                                        size={14}
                                        className={star <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}
                                    />
                                ))}
                            </div>

                            <p className="text-slate-600 text-sm mb-3">{review.comment}</p>

                            {review.imageUrls?.length > 0 && (
                                <div className="flex gap-2">
                                    {review.imageUrls.map((url, idx) => (
                                        <img
                                            key={idx}
                                            src={url}
                                            alt="review"
                                            className="w-20 h-20 rounded-lg object-cover border border-slate-200"
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ReviewSection;
