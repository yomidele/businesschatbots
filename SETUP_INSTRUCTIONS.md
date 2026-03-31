# Setup Instructions for Multi-Tenant Platform Features

## Overview
This document guides you through setting up the new features:
- **Landing Page Generator** - Create dynamic landing pages with embedded chatbot
- **Product Image Uploads** - Upload product images instead of using URLs
- **Payment Configuration** - Per-tenant payment settings (Paystack or manual)

## Prerequisites
- Access to Supabase Dashboard
- Git repository with latest code

## Setup Steps

### Step 1: Database Migrations

1. Open your **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Click **New query**
4. Copy the entire contents of `APPLY_MIGRATION.sql`
5. Paste it into the SQL editor
6. Click **Run**

```sql
-- This creates the following tables:
-- • landing_pages - Stores generated landing page content and metadata
-- • Updates to sites table - Adds slug, chat mode, and product display settings
-- • manual_payment_config - Payment setup for non-Paystack payments
-- • payment_confirmations - Manual payment proof uploads
```

**Expected Result:** All tables created, RLS policies applied, triggers configured

### Step 2: Supabase Storage Bucket Setup

1. Go to **Supabase Dashboard > Storage > Buckets**
2. Click **Create a new bucket**
3. Fill in the details:
   - **Name:** `product-images`
   - **Make it public:** Toggle ON (required for public image URLs)
   - **Security:** Public read, authenticated write
4. Click **Create bucket**

#### Configure CORS (Optional but Recommended)

1. Click on the `product-images` bucket
2. Go to **CORS policies** tab
3. Add this CORS configuration:
```json
[
  {
    "origin": "*",
    "methods": ["GET", "POST", "PUT", "DELETE"],
    "allowedHeaders": ["*"]
  }
]
```

### Step 3: Environment Variables

Ensure these are set in your `.env.local`:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

These should already be configured if you have existing Supabase integration.

### Step 4: Verify Installation

#### Check Database Tables
1. Go to **Supabase Dashboard > Table Editor**
2. Verify these tables exist:
   - `landing_pages` (new)
   - `manual_payment_config` (new)
   - `payment_confirmations` (updated)
   - `sites` (updated with slug, chat_mode columns)

#### Check Storage Bucket
1. Go to **Supabase Dashboard > Storage**
2. Verify `product-images` bucket exists
3. It should show as **Public**

#### Check RLS Policies
1. Go to **Database > Policies**
2. Verify policies exist for:
   - `landing_pages`: "Users can manage own landing pages"
   - `manual_payment_config`: "Users can manage own manual payment config"
   - `payment_confirmations`: Various viewing/update policies

## Feature Walkthrough

### Landing Page Generator

**Access:**
1. Go to Dashboard
2. Click "Products" in sidebar
3. Click "Landing Pages" tab (or navigate to `/dashboard/landing-pages/:siteId`)

**How to Use:**
1. Enter business name (auto-fills with site name)
2. Write business description
3. Select theme (Modern, Classic, or Minimal)
4. Choose CTA type (Buy Now, Contact Us, or Book Now)
5. Review included products (all existing products are auto-included)
6. Click "Generate Landing Page"

**Result:**
- Landing page created and stored in database
- Unique URL generated (e.g., `/store/lp_1723456789_abc123`)
- Embedded AI sales chatbot ready
- Page appears in "Your Landing Pages" section below

**Next Actions:**
- Copy URL to clipboard
- Share landing page link with customers
- Visit page to preview with embedded chatbot
- Regenerate with different theme/description

### Product Image Upload

**Access:**
1. Go to Dashboard > Products
2. Click "Add Product" button

**How to Use:**
1. Fill in product name
2. Add description (optional)
3. Enter price in Naira (₦)
4. Select category
5. **Drag and drop image** OR click to select image file
   - Automatic upload on file select
   - Shows preview while uploading
   - Max file size: 5MB
   - Supported formats: PNG, JPG, GIF, WebP, SVG
6. Once image uploads (shows ✓), click "Create Product"

**Result:**
- Product saved to database
- Image stored in Supabase Storage (`product-images/`)
- Public image URL auto-generated
- Product available for landing pages

**Benefits:**
- No need for external image hosting
- Images stored securely in Supabase
- Better performance with CDN-backed URLs
- Automatic organization by site

### Payment System

**Per-Site Configuration:**

The system checks for payment config in this order:
1. **Paystack Gateway** - If configured in `payment_configs` table
2. **Manual Bank Transfer** - If configured in `manual_payment_config` table
3. **None** - Error returned if no config exists

**Setting Up Paystack Payment:**
1. Go to Dashboard > Payments
2. Click "Payment Methods"
3. Select "Paystack"
4. Enter Paystack keys:
   - Public Key
   - Secret Key
5. Click Save

**Setting Up Manual Payment:**
1. Go to Dashboard > Payments
2. Click "Manual Bank Transfer"
3. Fill in:
   - Bank Name
   - Account Name
   - Account Number
   - Instructions for customers
4. Click Save

**AI Behavior:**
- Chat with customer about products
- AI calls backend `/api/payment-config?tenant_id=X` to get real config
- AI calls backend `/api/create-payment-link` for Paystack checkout
- Never generates fake payment details
- Always validates tenant consistency

## Testing the Features

### Test 1: Create Product with Image

```bash
# Expected outcome:
# 1. Product appears in Product list
# 2. Image URL is from Supabase Storage
# 3. Avatar shown in sidebar products widget
```

### Test 2: Generate Landing Page

```bash
# Expected outcome:
# 1. Landing page created with status "Draft" or "Published"
# 2. Unique URL generated
# 3. Page accessible at /store/{id}
# 4. Embedded chatbot div present in HTML
# 5. Product grid shows all products with images
```

### Test 3: Multi-Tenant Isolation

```bash
# Create 2 test sites (Site A and Site B)

# Test:
# 1. Create product on Site A
# 2. Login as Site B user
# 3. Verify product from Site A is NOT visible
# 4. Verify Site B's products are only the ones created there
# 5. Repeat for landing pages

# Expected: Complete isolation, no cross-tenant data leaks
```

### Test 4: Payment Configuration

```bash
# For Paystack:
# 1. Click buy button on landing page
# 2. Chat with AI about product
# 3. AI asks for email and amount
# 4. Customer confirms order
# 5. Redirects to Paystack checkout
# 6. Verify: amount in kobo (₦1000 = 100000 kobo), correct tenant key used

# For Manual Payment:
# 1. Click buy button on landing page
# 2. Chat with AI about product
# 3. AI shows bank details from manual_payment_config
# 4. Customer transfers money
# 5. Upload proof of payment
# 6. Payment pending admin review
```

## Troubleshooting

### Landing Page Generation Fails
**Issue:** "landing_pages table not found"
- **Solution:** Re-run APPLY_MIGRATION.sql in Supabase SQL Editor

### Image Upload Fails
**Issue:** "product-images bucket not found"
- **Solution:** Create the bucket per Step 2 above

**Issue:** "File too large"
- **Solution:** Resize image to be under 5MB; use tools like TinyPNG

**Issue:** "Invalid file type"
- **Solution:** Only image files (.png, .jpg, .gif, .webp, .svg) are allowed

### Landing Page Not Showing Products
**Issue:** Products not visible on generated landing pages
- **Solution:** Ensure products are created BEFORE generating landing page
- **Note:** Landing pages include products that existed at generation time

### Cross-Site Data Appearing
**Issue:** Products/pages from other sites visible
- **Solution:** Verify RLS policies were created; re-run affected policy SQL:
```sql
-- Check existing policies
SELECT tablename, policyname FROM pg_policies 
WHERE tablename = 'landing_pages';

-- If missing, add:
CREATE POLICY "Users can manage own landing pages" ON public.landing_pages
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM sites WHERE sites.id = landing_pages.site_id AND sites.user_id = auth.uid()));
```

## Advanced Configuration

### Custom Domain for Landing Pages

To use a custom domain for landing pages:

1. Add DNS CNAME record pointing to your Supabase domain
2. Update landing page generation endpoint to use custom domain
3. Modify the `url` returned from `/generate-landing-page`:
```typescript
// Instead of: /store/{id}
// Use: https://yourbrand.com/store/{id}
```

### Image Optimization

For better performance, consider:
1. Resizing images before upload
2. Using compressed formats (WebP when possible)
3. Setting cache headers in Supabase Storage

### Database Backup

Landing pages and product images are stored in Supabase, so regular automated backups occur. To manually backup:

1. **Supabase Dashboard > Backups**
2. Click "Back up now"
3. Backup includes all tables and storage

## Support & Next Steps

If you encounter issues:

1. **Check Supabase Logs:**
   - Supabase Dashboard > Logs > API errors
   - Look for 400/401/403/404 response codes

2. **Check Browser Console:**
   - Open DevTools (F12)
   - Check for JavaScript errors
   - Network tab for API calls

3. **Verify Configuration:**
   - Ensure `APPLY_MIGRATION.sql` ran successfully (no errors)
   - Confirm `product-images` bucket exists and is public
   - Test direct URL access to storage: `https://your-supabase.supabaseusercontent.com/storage/v1/object/public/product-images/`

## Summary

After completing setup, you have:

✅ **Database Infrastructure**
- Multi-tenant landing_pages table
- Product image storage
- Payment configuration tables
- RLS policies for security

✅ **Storage**
- product-images bucket for file uploads
- Automatic CDN distribution
- Configurable access settings

✅ **Frontend Features**
- Landing page generator component
- Product image upload form
- Admin dashboard integration
- Multi-tenant isolation

✅ **Backend Endpoints**
- `/functions/v1/generate-landing-page` - Create pages
- `/functions/v1/upload-product-image` - Upload images
- `/functions/v1/get-payment-config` - Fetch payment settings
- `/functions/v1/create-payment-link` - Paystack integration

You're ready to generate landing pages and accept product image uploads!

---

**Last Updated:** 2024  
**Version:** 3.0  
**Status:** Production Ready
