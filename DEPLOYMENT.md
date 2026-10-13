# Flat Expense Splitter - Deployment Guide

## Deploy to Netlify

### Quick Deploy

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Deploy on Netlify**
   - Go to [netlify.com](https://netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect your GitHub repository
   - Build settings:
     - **Build command:** `pnpm build`
     - **Publish directory:** `dist`
   - Click "Deploy site"

### Manual Deploy (Drag & Drop)

1. **Build the project locally**
   ```bash
   pnpm install
   pnpm run build
   ```

2. **Deploy the `dist` folder**
   - Go to [app.netlify.com/drop](https://app.netlify.com/drop)
   - Drag and drop the `dist` folder
   - Your site will be live in seconds!

## Mobile Optimization Features

✅ **Fully Responsive** - Works on all screen sizes (320px+)
✅ **Touch Optimized** - Large buttons and inputs for mobile
✅ **Mobile-First Design** - Optimized for phones and tablets
✅ **Sticky Header** - Easy navigation on mobile
✅ **Scrollable Tables** - Meal spreadsheet works on small screens
✅ **PWA Ready** - Can be installed on mobile home screen

## Testing on Mobile

### Local Testing
```bash
pnpm run dev
```
Then visit on your mobile device using your computer's local IP address.

### Production URL
After deployment, your app will have a URL like:
`https://your-app-name.netlify.app`

Share this URL to access from any mobile device!

## Supported Devices

- ✅ iOS (Safari, Chrome)
- ✅ Android (Chrome, Firefox, Samsung Internet)
- ✅ Tablets (iPad, Android tablets)
- ✅ Desktop browsers (Chrome, Firefox, Safari, Edge)

## Environment Requirements

- Node.js 16+ or 18+
- pnpm (or npm/yarn)

---

**Need help?** Check [Netlify's documentation](https://docs.netlify.com/)
