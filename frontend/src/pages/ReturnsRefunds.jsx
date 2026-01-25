import React, { useEffect } from 'react';

const ReturnsRefunds = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="max-w-4xl mx-auto px-6 py-12">
            <h1 className="text-3xl font-black mb-8 text-slate-800 border-b pb-4">🔁 RETURN & REFUND POLICY</h1>

            <div className="space-y-8 text-slate-600 leading-relaxed text-justify">
                <p className="text-lg">At Savvy Bucket, we deal strictly in B2B wholesale transactions. Due to the nature of wholesale pricing and bulk orders, we follow a limited return policy.</p>

                <section>
                    <h2 className="text-xl font-bold text-slate-800 mb-4">Returns</h2>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>Returns are not accepted once the order is delivered.</li>
                        <li>We do not offer refunds for delivered products.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-slate-800 mb-4">Replacements (Damage Only)</h2>
                    <p className="mb-4">Replacement is applicable only in case of damaged products.</p>
                    <h3 className="font-bold text-slate-700 mb-2">To request a replacement:</h3>
                    <ul className="list-disc pl-5 space-y-2 mb-4">
                        <li>Damage must be reported within 48 hours of delivery</li>
                        <li>Clear unboxing video and images must be shared as proof</li>
                        <li>Replacement will be processed only after verification by our team.</li>
                    </ul>

                    <h3 className="font-bold text-slate-700 mb-2">Non-Eligible Cases</h3>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>Minor color variation</li>
                        <li>Design or size expectations mismatch</li>
                        <li>Damage caused after delivery</li>
                        <li>Orders placed incorrectly by the buyer</li>
                    </ul>
                </section>

                <div className="bg-yellow-50 p-6 rounded-xl border border-yellow-100">
                    <p className="font-bold text-yellow-800 flex items-center gap-2">
                        ⚠️ Wholesale buyers are advised to carefully review product details before placing an order.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ReturnsRefunds;
