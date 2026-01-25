
# Deployment Guide

### Backend (Render)
1. Create a new "Web Service" on Render.
2. Connect your GitHub repository.
3. Set the Root Directory to `backend`.
4. Set Build Command to `npm install`.
5. Set Start Command to `node server.js`.
6. Add Environment Variables from your `.env` file.

### Frontend (Vercel)
1. Import your repository into Vercel.
2. Select the `frontend` directory.
3. Vercel should automatically detect Vite. Set Build Command to `npm run build` and Output Directory to `dist`.
4. Add Environment Variable `VITE_API_URL` pointing to your Render backend URL.

### Database (MongoDB Atlas)
1. Create a free cluster on MongoDB Atlas.
2. Add your IP to the Whitelist.
3. Create a Database User.
4. Copy the Connection String and use it in your backend `.env`.