import React, { useEffect } from 'react';

const PrivacyPolicy = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="max-w-4xl mx-auto px-6 py-12">
            <h1 className="text-3xl font-black mb-8 text-slate-800 border-b pb-4">🔒 PRIVACY POLICY</h1>

            <div className="space-y-8 text-slate-600 leading-relaxed text-justify">
                <p className="text-lg">Your privacy is important to us. At Savvy Bucket, we collect and use customer information solely to provide a smooth and secure shopping experience.</p>

                <section>
                    <h2 className="text-xl font-bold text-slate-800 mb-4">Information We Collect</h2>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>Name, contact number, email address</li>
                        <li>Shipping and billing address</li>
                        <li>Payment details (securely processed via trusted payment gateways)</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-slate-800 mb-4">How We Use Your Information</h2>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>To process and ship orders</li>
                        <li>To communicate order updates</li>
                        <li>To improve our services and customer experience</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-slate-800 mb-4">Data Protection</h2>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>We do not sell, trade, or share your personal information with third parties.</li>
                        <li>All data is handled securely and used only for business purposes.</li>
                        <li>By using our website, you consent to our privacy practices.</li>
                    </ul>
                </section>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
