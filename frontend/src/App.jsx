import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import SellerLogin from './pages/SellerLogin';
import SellerRegister from './pages/SellerRegister';
import Footer from './components/Footer';

import SellerDashboard from './pages/SellerDashboard';

import BuyerHome from './pages/BuyerHome';
import Cart from './pages/Cart';
import Success from './pages/Success';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';
import ProductDetail from './pages/ProductDetail';
import CategoryPage from './pages/CategoryPage';
import WishlistPage from './pages/WishlistPage';
import ProfilePage from './pages/ProfilePage';
import ReelsPage from './pages/ReelsPage';
import JustArrived from './pages/JustArrived';


import MobileBottomNav from './components/MobileBottomNav';
import ShippingPolicy from './pages/ShippingPolicy';
import ReturnsRefunds from './pages/ReturnsRefunds';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsAndConditions from './pages/TermsAndConditions';

function AppContent() {
    const location = useLocation();

    // Logic to hide common UI elements on specific pages
    const isDashboardRoute = location.pathname.startsWith('/seller') || location.pathname.startsWith('/admin');
    const isAuthRoute = location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/forgot-password';
    const isReelsPage = location.pathname === '/reels';

    const shouldHideHeaderFooter = isDashboardRoute || isReelsPage || isAuthRoute;
    const shouldHideMobileNav = isDashboardRoute || isAuthRoute;

    return (
        <div className={`min-h-screen bg-slate-50 ${!isReelsPage ? 'pb-20' : ''} md:pb-0`}>
            {!shouldHideHeaderFooter && <Navbar />}
            {!shouldHideMobileNav && <MobileBottomNav />}

            <Routes>
                <Route path="/" element={<BuyerHome />} />
                <Route path="/category/:category" element={<CategoryPage />} />
                <Route path="/just-arrived" element={<JustArrived />} />
                <Route path="/wishlist" element={<WishlistPage />} />
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/success" element={<Success />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/seller/login" element={<SellerLogin />} />
                <Route path="/seller/register" element={<SellerRegister />} />

                {/* Reels Route */}
                <Route path="/reels" element={<ReelsPage />} />

                {/* Policy Routes */}
                <Route path="/shipping-policy" element={<ShippingPolicy />} />
                <Route path="/returns-refunds" element={<ReturnsRefunds />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/terms-conditions" element={<TermsAndConditions />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />

                <Route path="/profile" element={
                    <ProtectedRoute>
                        <ProfilePage />
                    </ProtectedRoute>
                } />

                <Route path="/seller/*" element={
                    <ProtectedRoute>
                        <SellerDashboard />
                    </ProtectedRoute>
                } />

                <Route path="/admin/login" element={<AdminLogin />} />

                <Route path="/admin/*" element={
                    <ProtectedRoute>
                        <AdminDashboard />
                    </ProtectedRoute>
                } />
            </Routes>

            {!shouldHideHeaderFooter && <Footer />}
        </div>
    );
}

import ScrollToTop from './components/ScrollToTop';

function App() {
    return (
        <Router>
            <ScrollToTop />
            <AppContent />
        </Router>
    );
}

export default App;
