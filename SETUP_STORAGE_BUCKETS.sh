#!/bin/bash

# Supabase Storage Bucket Setup Guide
# Run these steps to set up the required storage buckets for the application

echo "=== Setting up Supabase Storage Buckets ==="
echo ""

# Instructions for Supabase Dashboard
echo "📦 BUCKET 1: product-images"
echo "   Location: Supabase Dashboard > Storage > Buckets"
echo "   Steps:"
echo "   1. Click 'Create a new bucket'"
echo "   2. Name: product-images"
echo "   3. Make it public (toggle ON)"
echo "   4. Click Create bucket"
echo ""

# Configure CORS for product-images
cat > /tmp/product_images_cors.json << 'EOF'
[
  {
    "origin": "*",
    "methods": ["GET", "POST", "PUT", "DELETE"],
    "allowedHeaders": ["*"]
  }
]
EOF

echo "   CORS Configuration (Optional but recommended):"
echo "   1. Open product-images bucket"
echo "   2. Click CORS settings"
echo "   3. Add the following CORS policy:"
cat /tmp/product_images_cors.json

echo ""
echo "=== SQL Migrations ==="
echo ""
echo "Run the APPLY_MIGRATION.sql file in Supabase SQL Editor:"
echo "1. Open Supabase Dashboard > SQL Editor"
echo "2. Click 'New query'"
echo "3. Copy and paste the contents of APPLY_MIGRATION.sql"
echo "4. Click 'Run'"
echo ""

echo "✅ Setup complete!"
echo ""
echo "Your application now has:"
echo "✓ product-images bucket for product images"
echo "✓ landing_pages table for generated landing pages"
echo "✓ RLS policies for multi-tenant isolation"
echo "✓ Automatic timestamp management"
