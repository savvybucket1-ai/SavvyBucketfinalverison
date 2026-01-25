import React, { useEffect } from 'react';

const ShippingPolicy = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="max-w-4xl mx-auto px-6 py-12">
            <h1 className="text-3xl font-black mb-8 text-slate-800 border-b pb-4">SHIPPING POLICY – Savvy Bucket</h1>

            <div className="space-y-8 text-slate-600 leading-relaxed text-justify">
                <p className="text-lg">At Savvy Bucket, we specialize in wholesale supply with fast and reliable dispatch.</p>

                <section>
                    <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                        Order Processing
                    </h2>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>All orders placed on Savvy Bucket are processed within 1–2 business days after payment confirmation.</li>
                        <li>Orders are accepted only in prepaid mode.</li>
                        <li>Since we operate on a Minimum Order Quantity (MOQ) basis, orders below MOQ will not be processed.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-slate-800 mb-4">Shipping & Delivery Timeline</h2>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>Once dispatched, orders are delivered within 3–4 business days, depending on the delivery location.</li>
                        <li>Delivery timelines may vary due to logistics, weather conditions, or unforeseen circumstances.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-slate-800 mb-4">Shipping Coverage</h2>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>We currently ship across India.</li>
                        <li>Shipping charges (if applicable) will be clearly mentioned at checkout.</li>
                    </ul>
                </section>

                <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                    <h2 className="text-lg font-bold text-slate-800 mb-2">Important Note</h2>
                    <p>Savvy Bucket operates on a wholesale model, so bulk orders may arrive in multiple packages depending on product type and quantity.</p>
                </div>
            </div>
        </div>
    );
};

export default ShippingPolicy;
