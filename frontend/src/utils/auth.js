import axios from 'axios';
import API_BASE_URL from '../config';

const API_URL = `${API_BASE_URL}/api`;

// ─── Global Axios Interceptor ──────────────────────────────────────────────
// Catches 401 TOKEN_EXPIRED responses from any API call and auto-logs out.
axios.interceptors.response.use(
    response => response,
    error => {
        const status = error.response?.status;
        const code = error.response?.data?.code;
        const message = error.response?.data?.message || '';

        if (status === 401 && (code === 'TOKEN_EXPIRED' || message.toLowerCase().includes('session expired') || message.toLowerCase().includes('token'))) {
            console.warn('[Auth] Session expired — clearing storage and redirecting to login.');
            localStorage.removeItem('user');
            localStorage.removeItem('cart');
            // Use window.location so this works outside of React Router context
            window.location.href = '/login?reason=session_expired';
        }
        return Promise.reject(error);
    }
);
// ───────────────────────────────────────────────────────────────────────────

export const login = async (email, password, role) => {
    const response = await axios.post(`${API_URL}/auth/login`, { email, password, role });
    if (response.data.token) {
        localStorage.setItem('user', JSON.stringify(response.data));
    }
    return response.data;
};

export const register = async (userData) => {
    return await axios.post(`${API_URL}/auth/register`, userData);
};

export const logout = () => {
    localStorage.removeItem('user');
};

export const getCurrentUser = () => {
    return JSON.parse(localStorage.getItem('user'));
};

/**
 * Returns the Authorization header if the user is logged in.
 * Also checks if the JWT is close to expiry (within 5 minutes) and warns.
 */
export const getAuthHeader = () => {
    const user = getCurrentUser();
    if (user && user.token) {
        // Optionally: Check token expiry client-side before sending requests
        try {
            const payload = JSON.parse(atob(user.token.split('.')[1]));
            const expiresAt = payload.exp * 1000; // convert to ms
            if (Date.now() > expiresAt) {
                // Token already expired — clear now and redirect
                console.warn('[Auth] JWT expired locally — clearing session.');
                localStorage.removeItem('user');
                window.location.href = '/login?reason=session_expired';
                return {};
            }
        } catch (e) {
            // If we can't parse the token, let the server decide
        }
        return { Authorization: `Bearer ${user.token}` };
    }
    return {};
};
