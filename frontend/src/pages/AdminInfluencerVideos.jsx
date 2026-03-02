import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getAuthHeader } from '../utils/auth';
import { Trash2, Video, Upload, Search } from 'lucide-react';
import API_BASE_URL from '../config';

const AdminInfluencerVideos = () => {
    const [videos, setVideos] = useState([]);
    const [products, setProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState('');
    const [videoTitle, setVideoTitle] = useState('');
    const [videoFile, setVideoFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchVideos();
        fetchProducts();
    }, []);

    const fetchVideos = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/influencer-videos/list`);
            setVideos(res.data);
        } catch (err) {
            console.error('Error fetching videos:', err);
        }
    };

    const fetchProducts = async () => {
        try {
            // Fetching from buyer/list ensures we only see products that are "Live on Website" (Approved & Available)
            const res = await axios.get(`${API_BASE_URL}/api/products/buyer/list`);
            setProducts(res.data);
        } catch (err) {
            console.error('Error fetching products:', err);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!selectedProduct || !videoFile || !videoTitle) {
            alert('Please select a product and upload a video file.');
            return;
        }

        const formData = new FormData();
        formData.append('title', videoTitle);
        formData.append('productId', selectedProduct);
        formData.append('video', videoFile);

        try {
            setLoading(true);
            await axios.post(`${API_BASE_URL}/api/influencer-videos/upload`, formData, {
                headers: {
                    ...getAuthHeader(),
                    'Content-Type': 'multipart/form-data'
                }
            });
            setLoading(false);
            setVideoTitle('');
            setVideoFile(null);
            setSelectedProduct('');
            alert('Video uploaded successfully!');
            fetchVideos();
        } catch (err) {
            setLoading(false);
            console.error(err);
            alert('Failed to upload video');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this video?')) return;
        try {
            await axios.delete(`${API_BASE_URL}/api/influencer-videos/${id}`, { headers: getAuthHeader() });
            fetchVideos();
        } catch (err) {
            alert('Failed to delete video');
        }
    };

    const filteredProducts = products.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="p-8">
            <h2 className="text-2xl font-black text-slate-800 mb-8 uppercase tracking-tight flex items-center">
                <Video className="mr-3 text-red-600" /> Influencer Video Managment
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Upload Section */}
                <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="font-bold text-slate-700 mb-4">Upload New Video</h3>
                        <form onSubmit={handleUpload} className="space-y-4">
                            <div>
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Video Title</label>
                                <input
                                    type="text"
                                    value={videoTitle}
                                    onChange={(e) => setVideoTitle(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary font-bold text-slate-700"
                                    placeholder="Ex: Top School Kit Review"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Select Linked Product</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Type to search product by name..."
                                        className="w-full mb-2 px-3 py-2 text-xs border rounded-lg focus:outline-none focus:border-primary transition-colors"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                    {searchTerm && (
                                        <button
                                            onClick={() => setSearchTerm('')}
                                            className="absolute right-3 top-2 text-xs font-bold text-slate-400 hover:text-slate-600"
                                            type="button"
                                        >
                                            Clear
                                        </button>
                                    )}
                                    <select
                                        value={selectedProduct}
                                        onChange={(e) => setSelectedProduct(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary font-bold text-slate-700"
                                        size={5}
                                    >
                                        <option value="" disabled>-- Select Product --</option>
                                        {filteredProducts.map(p => (
                                            <option key={p._id} value={p._id}>{p.title} (₹{p.adminPrice})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Video File</label>
                                <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 transition cursor-pointer relative">
                                    <input
                                        type="file"
                                        accept="video/*"
                                        onChange={(e) => setVideoFile(e.target.files[0])}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                    <Upload size={32} className="mb-2" />
                                    <span className="text-xs font-bold">{videoFile ? videoFile.name : 'Click to Upload Video'}</span>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full py-3 rounded-xl font-black uppercase text-xs shadow-lg text-white transition ${loading ? 'bg-slate-400' : 'bg-primary hover:bg-blue-600 shadow-blue-500/20'}`}
                            >
                                {loading ? 'Uploading...' : 'Publish Video'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Video List Section */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="font-bold text-slate-700">Active Influencer Videos</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
                            {videos.length > 0 ? videos.map(video => (
                                <div key={video._id} className="border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition">
                                    <div className="aspect-video bg-black relative group">
                                        <video src={video.videoUrl} className="w-full h-full object-cover" controls />
                                    </div>
                                    <div className="p-4 flex justify-between items-start">
                                        <div>
                                            <h4 className="font-bold text-slate-800 text-sm line-clamp-1">{video.title}</h4>
                                            <p className="text-xs text-slate-500 mt-1">Linked: {video.productId?.title || 'Unknown Product'}</p>
                                        </div>
                                        <button
                                            onClick={() => handleDelete(video._id)}
                                            className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            )) : (
                                <div className="col-span-2 text-center py-12 text-slate-400 font-bold italic">No videos uploaded yet.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminInfluencerVideos;
