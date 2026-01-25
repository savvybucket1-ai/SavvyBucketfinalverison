import React, { useEffect } from 'react';

const TermsAndConditions = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="max-w-4xl mx-auto px-6 py-12">
            <h1 className="text-3xl font-black mb-8 text-slate-800 border-b pb-4">📜 TERMS & CONDITIONS</h1>

            <div className="space-y-8 text-slate-600 leading-relaxed text-justify">
                <p className="text-lg">By accessing and using Savvy Bucket, you agree to the following terms:</p>

                <section>
                    <h2 className="text-xl font-bold text-slate-800 mb-4">General</h2>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>Savvy Bucket is a B2B wholesale platform.</li>
                        <li>All purchases are considered business transactions, not retail sales.</li>
                        <li>Orders are accepted only in prepaid mode.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-slate-800 mb-4">Pricing & MOQ</h2>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>All prices listed are wholesale prices.</li>
                        <li>Minimum Order Quantity (MOQ) applies to all products.</li>
                        <li>Prices and availability may change without prior notice.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-slate-800 mb-4">Order Acceptance</h2>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>Savvy Bucket reserves the right to cancel or refuse any order at its discretion.</li>
                        <li>Orders once dispatched cannot be cancelled.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-slate-800 mb-4">Intellectual Property</h2>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>All website content, images, and branding belong to Savvy Bucket.</li>
                        <li>Unauthorized use is strictly prohibited.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-slate-800 mb-4">Liability</h2>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>Savvy Bucket is not responsible for delays caused by logistics partners or events beyond our control.</li>
                        <li>Liability is limited to product replacement in approved damage cases only.</li>
                    </ul>
                </section>
            </div>
        </div>
    );
};

export default TermsAndConditions;
