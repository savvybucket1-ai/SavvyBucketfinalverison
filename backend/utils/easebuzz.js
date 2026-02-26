const crypto = require('crypto');

const key = process.env.EASEBUZZ_KEY;
const salt = process.env.EASEBUZZ_SALT;

function generateHash(data) {
    // Standard PayU/Easebuzz Request Hash
    // key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||salt
    const hashString = `${key}|${data.txnid}|${data.amount}|${data.productinfo}|${data.firstname}|${data.email}|${data.udf1 || ''}|${data.udf2 || ''}|${data.udf3 || ''}|${data.udf4 || ''}|${data.udf5 || ''}||||||${salt}`;
    return crypto.createHash('sha512').update(hashString).digest('hex');
}

function verifyPaymentHash(data) {
    // Standard PayU/Easebuzz Response Hash
    // salt|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
    const hashString = `${salt}|${data.status}||||||${data.udf5 || ''}|${data.udf4 || ''}|${data.udf3 || ''}|${data.udf2 || ''}|${data.udf1 || ''}|${data.email}|${data.firstname}|${data.productinfo}|${data.amount}|${data.txnid}|${key}`;
    const calculatedHash = crypto.createHash('sha512').update(hashString).digest('hex');
    return calculatedHash === data.hash;
}

module.exports = {
    generateHash, verifyPaymentHash, generateResponseHash: (data) => {
        const hashString = `${salt}|${data.status}||||||${data.udf5 || ''}|${data.udf4 || ''}|${data.udf3 || ''}|${data.udf2 || ''}|${data.udf1 || ''}|${data.email}|${data.firstname}|${data.productinfo}|${data.amount}|${data.txnid}|${key}`;
        return crypto.createHash('sha512').update(hashString).digest('hex');
    }
};
