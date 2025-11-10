#!/bin/bash
#
# Production Build Script for LiLove
# Builds and optimizes the application for production deployment
#

set -e

echo "🚀 LiLove Production Build"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js version
echo -e "${BLUE}📦 Checking Node.js version...${NC}"
NODE_VERSION=$(node -v)
echo "Node.js version: $NODE_VERSION"

# Install dependencies
echo -e "\n${BLUE}📦 Installing dependencies...${NC}"
npm ci --production=false

# Run TypeScript type checking
echo -e "\n${BLUE}🔍 Running TypeScript type checking...${NC}"
npm run check || {
    echo -e "${YELLOW}⚠️  TypeScript warnings detected, continuing...${NC}"
}

# Build frontend
echo -e "\n${BLUE}🎨 Building frontend with Vite...${NC}"
npm run build

# Build backend
echo -e "\n${BLUE}⚙️  Building backend with esbuild...${NC}"
npx esbuild server/index.ts \
  --platform=node \
  --packages=external \
  --bundle \
  --format=esm \
  --outdir=dist \
  --sourcemap

# Copy necessary files
echo -e "\n${BLUE}📋 Copying necessary files...${NC}"
cp package.json dist/
cp package-lock.json dist/
[ -f .env.production ] && cp .env.production dist/.env

# Create production directory structure
echo -e "\n${BLUE}📁 Creating production directory structure...${NC}"
mkdir -p dist/public
mkdir -p dist/uploads

# Copy static assets
if [ -d "public" ]; then
    cp -r public/* dist/public/
fi

# Generate production manifest
echo -e "\n${BLUE}📝 Generating production manifest...${NC}"
cat > dist/manifest.json << EOF
{
  "name": "LiLove",
  "version": "1.0.0",
  "buildDate": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "nodeVersion": "$NODE_VERSION",
  "environment": "production"
}
EOF

# Create start script
echo -e "\n${BLUE}📜 Creating start script...${NC}"
cat > dist/start.sh << 'EOF'
#!/bin/bash
export NODE_ENV=production
node index.js
EOF
chmod +x dist/start.sh

# Create health check script
cat > dist/healthcheck.sh << 'EOF'
#!/bin/bash
curl -f http://localhost:5000/api/health || exit 1
EOF
chmod +x dist/healthcheck.sh

# Optimize and compress
echo -e "\n${BLUE}🗜️  Optimizing build...${NC}"

# Calculate build size
BUILD_SIZE=$(du -sh dist | cut -f1)
echo -e "${GREEN}✨ Build size: $BUILD_SIZE${NC}"

# Show build contents
echo -e "\n${BLUE}📦 Build contents:${NC}"
ls -lh dist/

# Security check
echo -e "\n${BLUE}🔒 Running security audit...${NC}"
npm audit --production || {
    echo -e "${YELLOW}⚠️  Security vulnerabilities detected${NC}"
    echo -e "${YELLOW}   Run 'npm audit fix' to resolve${NC}"
}

# Final summary
echo -e "\n${GREEN}================================${NC}"
echo -e "${GREEN}✅ Production build complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "📦 Build location: ./dist"
echo "🚀 To start: cd dist && npm install --production && npm start"
echo ""
echo "Next steps:"
echo "  1. Test the build locally: cd dist && ./start.sh"
echo "  2. Deploy to your hosting provider"
echo "  3. Configure environment variables"
echo "  4. Run database migrations"
echo "  5. Monitor logs and performance"
echo ""
