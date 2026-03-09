// Geo-based pricing utility
// Detects user's country via IPInfo and returns the correct price from adminPrice object

const IPINFO_TOKEN = '31e086da492d40';

// Map IPInfo country_code to our DB price keys
const COUNTRY_MAP = {
    'IN': 'IN',
    'US': 'US',
    'GB': 'UK',  // IPInfo returns "GB" for United Kingdom
    'UK': 'UK',
    'CA': 'CA',
    'AU': 'AU',
    'AE': 'UAE', // IPInfo returns "AE" for UAE
    'UAE': 'UAE',
};

// Currency symbols per country key
const CURRENCY_SYMBOLS = {
    'IN': '₹',
    'US': '$',
    'UK': '£',
    'CA': 'C$',
    'AU': 'A$',
    'UAE': 'AED ',
};

let cachedCountry = null;

/**
 * Detect user's country code using IPInfo API.
 * Caches the result in memory + sessionStorage so it's called only once per session.
 * Returns our DB key (IN, US, UK, CA, AU, UAE). Defaults to 'IN'.
 */
export const detectCountry = async () => {
    // Return from memory cache
    if (cachedCountry) return cachedCountry;

    // Return from session storage
    const stored = sessionStorage.getItem('userCountry');
    if (stored) {
        cachedCountry = stored;
        return stored;
    }

    try {
        const res = await fetch(`https://ipinfo.io/json?token=${IPINFO_TOKEN}`);
        const data = await res.json();
        const ipCountryCode = data.country || 'US'; // Standard IPInfo field is 'country'
        const mappedKey = COUNTRY_MAP[ipCountryCode] || 'US';

        cachedCountry = mappedKey;
        sessionStorage.setItem('userCountry', mappedKey);
        return mappedKey;
    } catch (err) {
        console.error('IPInfo detection failed, defaulting to US:', err);
        cachedCountry = 'US';
        sessionStorage.setItem('userCountry', 'US');
        return 'US';
    }
};

/**
 * Get the correct price from a product's adminPrice object based on detected country.
 * Falls back to IN price if the country price is 0 or missing.
 * 
 * @param {object|number} adminPrice - Either { IN, US, UK, CA, AU, UAE } object or a legacy number
 * @param {string} countryKey - The detected country key (IN, US, UK, etc.)
 * @returns {number} The price to display
 */
export const getGeoPrice = (adminPrice, countryKey) => {
    // Legacy support: if adminPrice is a plain number, return it as-is
    if (typeof adminPrice === 'number') return adminPrice;

    if (!adminPrice || typeof adminPrice !== 'object') return 0;

    const countryPrice = Number(adminPrice[countryKey]) || 0;

    // Fallback to US price if country price is 0 or missing, else IN
    if (countryPrice === 0) {
        return Number(adminPrice['US']) || Number(adminPrice['IN']) || 0;
    }

    return countryPrice;
};

/**
 * Get currency symbol for the detected country
 * @param {string} countryKey
 * @returns {string}
 */
export const getCurrencySymbol = (countryKey) => {
    return CURRENCY_SYMBOLS[countryKey] || '$';
};

/**
 * Get the correct price for a specific quantity, including geo-aware tiered pricing.
 * If tiered pricing is used, it scales the tiered price proportionally to the current country's base price.
 * 
 * @param {object} product - Full product object from DB
 * @param {number} qty - Desired quantity
 * @param {string} countryKey - Detected country key
 * @returns {number} The final unit price for that quantity in that country
 */
export const getPriceForQuantity = (product, qty, countryKey) => {
    if (!product) return 0;

    // 1. Get base geo price (e.g. US price if in US)
    const baseGeoPrice = getGeoPrice(product.adminPrice, countryKey);

    // 2. If no tiered pricing, return base geo price
    if (!product.tieredPricing || product.tieredPricing.length === 0) {
        return baseGeoPrice;
    }

    // 3. Find the applicable tier
    const sortedTiers = [...product.tieredPricing].sort((a, b) => b.moq - a.moq);
    const applicableTier = sortedTiers.find(tier => qty >= tier.moq);

    if (!applicableTier) return baseGeoPrice;

    // 4. SCALE THE TIERED PRICE!
    // Since tiered prices are saved in the context of the Indian price, 
    // we scale them by the ratio of (Base Geo Price / Base Indian Price).
    const baseIndianPrice = getGeoPrice(product.adminPrice, 'IN');

    // Avoid division by zero
    if (baseIndianPrice <= 0) return applicableTier.price;

    const scaleFactor = baseGeoPrice / baseIndianPrice;
    return applicableTier.price * scaleFactor;
};
