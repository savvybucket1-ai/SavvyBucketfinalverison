import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

const Success = () => {
    const navigate = useNavigate();

    useEffect(() => {
        // Auto-redirect to home after 5 seconds
        const timer = setTimeout(() => {
            navigate('/');
        }, 5000);

        return () => clearTimeout(timer);
    }, [navigate]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center px-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                <div className="flex justify-center mb-6">
                    <div className="bg-green-100 rounded-full p-4">
                        <CheckCircle className="w-16 h-16 text-green-600" />
                    </div>
                </div>

                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                    Payment Successful!
                </h1>

                <p className="text-gray-600 mb-6">
                    Thank you for your order. Your payment has been processed successfully.
                </p>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-green-800">
                        You will receive an order confirmation email shortly with your order details and tracking information.
                    </p>
                </div>

                <div className="space-y-3">
                    <button
                        onClick={() => navigate('/')}
                        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                    >
                        Continue Shopping
                    </button>

                    <p className="text-sm text-gray-500">
                        Redirecting to home page in 5 seconds...
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Success;
