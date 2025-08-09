# Vercel Deployment Guide

## Prerequisites
- GitHub account
- Vercel account (sign up at https://vercel.com)
- MongoDB Atlas account (for cloud database)

## Step 1: Prepare Your Repository

1. **Initialize Git repository** (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **Create a GitHub repository** and push your code:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/methods-grill-backend.git
   git branch -M main
   git push -u origin main
   ```

## Step 2: Set Up Environment Variables

Your backend requires these environment variables:

### Required Variables:
- `MONGODB_URI` - Your MongoDB connection string
- `JWT_SECRET` - A secure secret for JWT tokens
- `NODE_ENV` - Set to "production"
- `FRONTEND_URL` - Your frontend URL (for CORS)

### Example Values:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/methods-grill?retryWrites=true&w=majority
JWT_SECRET=your-super-secure-jwt-secret-key-at-least-32-characters-long
NODE_ENV=production
FRONTEND_URL=https://your-frontend-domain.vercel.app
```

## Step 3: Deploy to Vercel

### Option 1: Using Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Click "New Project"**
3. **Import your GitHub repository**
4. **Configure the project**:
   - Framework Preset: Other
   - Root Directory: ./
   - Build Command: `npm run build`
   - Output Directory: Leave empty
   - Install Command: `npm install`

5. **Add Environment Variables**:
   - Go to "Environment Variables" section
   - Add all the required variables listed above
   - Make sure to add them for all environments (Production, Preview, Development)

6. **Deploy**: Click "Deploy"

### Option 2: Using Vercel CLI

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel
   ```

4. **Set Environment Variables**:
   ```bash
   vercel env add MONGODB_URI
   vercel env add JWT_SECRET
   vercel env add NODE_ENV
   vercel env add FRONTEND_URL
   ```

## Step 4: Test Your Deployment

After deployment, test your API endpoints:

1. **Health Check**:
   ```
   GET https://your-app-name.vercel.app/health
   ```

2. **API Endpoints**:
   ```
   GET https://your-app-name.vercel.app/api/v1/menu
   POST https://your-app-name.vercel.app/api/v1/auth/register
   POST https://your-app-name.vercel.app/api/v1/auth/login
   ```

## Step 5: Configure Custom Domain (Optional)

1. Go to your project settings in Vercel
2. Navigate to "Domains"
3. Add your custom domain
4. Update DNS settings as instructed

## Troubleshooting

### Common Issues:

1. **Database Connection Timeout**:
   - Ensure your MongoDB Atlas cluster allows connections from anywhere (0.0.0.0/0)
   - Check if your MONGODB_URI is correct

2. **Environment Variables Not Working**:
   - Redeploy after adding environment variables
   - Check variable names match exactly

3. **CORS Issues**:
   - Update FRONTEND_URL environment variable
   - Ensure your frontend domain is correct

4. **Function Timeout**:
   - Vercel has a 10-second timeout for Hobby plan
   - Optimize database queries
   - Consider upgrading to Pro plan for 60-second timeout

### Monitoring and Logs:

- Check function logs in Vercel dashboard
- Monitor performance and errors
- Set up alerts for critical issues

## Important Notes:

1. **Serverless Functions**: Vercel runs your app as serverless functions, so database connections are cached
2. **Cold Starts**: First request might be slower due to cold starts
3. **File System**: Vercel functions have read-only file system except for `/tmp`
4. **Memory Limits**: 1024MB for Hobby plan, 3008MB for Pro plan

## Security Checklist:

- [ ] Strong JWT_SECRET (at least 32 characters)
- [ ] MongoDB Atlas IP whitelist configured
- [ ] CORS properly configured with specific origins
- [ ] Environment variables set correctly
- [ ] No sensitive data in code repository
- [ ] Rate limiting enabled (already configured)

## Support:

If you encounter issues:
1. Check Vercel function logs
2. Review MongoDB Atlas connection logs
3. Test API endpoints with tools like Postman
4. Check environment variables in Vercel dashboard

Your API will be available at: `https://your-project-name.vercel.app`

