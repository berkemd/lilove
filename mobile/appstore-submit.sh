#!/bin/bash
# LiLove iOS App Store Automated Submission Script
# This script automates the complete App Store submission process

set -eo pipefail # Exit on error and fail on pipeline errors

echo "🚀 LiLove iOS App Store Automation"
echo "===================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check prerequisites
check_prerequisites() {
    echo "📋 Checking prerequisites..."
    
    # Check if we're in the mobile directory
    if [ ! -f "app.json" ]; then
        echo -e "${RED}❌ Error: app.json not found. Please run this script from the mobile directory.${NC}"
        exit 1
    fi
    
    # Check for fastlane
    if ! command -v fastlane &> /dev/null; then
        echo -e "${RED}❌ Fastlane not found.${NC}"
        # Check for Ruby version manager
        if command -v rbenv &> /dev/null || command -v rvm &> /dev/null; then
            echo -e "${YELLOW}⚠️  Ruby version manager detected (rbenv/RVM). Installing fastlane gem...${NC}"
            if ! gem install fastlane; then
                echo -e "${RED}❌ Failed to install fastlane. Please check your Ruby environment.${NC}"
                exit 1
            fi
        else
            echo -e "${YELLOW}⚠️  No Ruby version manager (rbenv/RVM) detected.${NC}"
            echo -e "${YELLOW}It is NOT recommended to install gems globally with system Ruby.${NC}"
            echo -e "${YELLOW}Please install rbenv or RVM and re-run this script.${NC}"
            echo -e "${YELLOW}Alternatively, you can try running:${NC}"
            echo -e "${YELLOW}    sudo gem install fastlane${NC}"
            echo -e "${YELLOW}But this may modify your system Ruby and is not recommended.${NC}"
            exit 1
        fi
    
    # Check for eas-cli
    if ! command -v eas &> /dev/null; then
        echo -e "${RED}❌ EAS CLI not found.${NC}"
        echo -e "${YELLOW}ℹ️  You can run EAS commands using 'npx eas <command>' without installing globally.${NC}"
        # Alternatively, install locally: npm install eas-cli
        # Or install globally (requires permissions): npm install -g eas-cli
        # exit 1 # Uncomment to require EAS CLI to be available
    fi
    
    echo -e "${GREEN}✅ Prerequisites check passed${NC}"
    echo ""
}

# Check environment variables
check_env() {
    echo "🔐 Checking environment variables..."
    
    local missing_vars=()
    
    if [ -z "$ASC_KEY_ID" ]; then
        missing_vars+=("ASC_KEY_ID")
    fi
    
    if [ -z "$ASC_ISSUER_ID" ]; then
        missing_vars+=("ASC_ISSUER_ID")
    fi
    
    if [ -z "$ASC_PRIVATE_KEY" ]; then
        missing_vars+=("ASC_PRIVATE_KEY")
    fi
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Missing environment variables: ${missing_vars[*]}${NC}"
        echo ""
        echo "Please set these variables:"
        for var in "${missing_vars[@]}"; do
            echo "  export $var=\"your-value-here\""
        done
        echo ""
        echo "Or create a .env.local file with these values"
        return 1
    fi
    
    echo -e "${GREEN}✅ Environment variables configured${NC}"
    echo ""
    return 0
}

# Build the app
build_app() {
    echo "🏗️  Building iOS app with EAS..."
    
    # Clean any previous builds
    if [ -d ".expo" ]; then
        echo "Cleaning .expo directory..."
        rm -rf .expo
    fi
    
    # Run EAS build
    echo "Starting EAS build (this may take 10-20 minutes)..."
    eas build --platform ios --profile production --non-interactive
    
    echo -e "${GREEN}✅ Build completed${NC}"
    echo ""
}

# Submit to TestFlight
submit_testflight() {
    echo "📱 Submitting to TestFlight..."
    
    eas submit --platform ios --latest --non-interactive
    
    echo -e "${GREEN}✅ Submitted to TestFlight${NC}"
    echo ""
}

# Upload metadata
upload_metadata() {
    echo "📝 Uploading metadata to App Store Connect..."
    
    cd fastlane
    fastlane upload_metadata
    cd ..
    
    echo -e "${GREEN}✅ Metadata uploaded${NC}"
    echo ""
}

# Upload screenshots
upload_screenshots() {
    echo "📸 Checking for screenshots..."
    
    if [ -d "fastlane/metadata/en-US/screenshots" ] && [ -n "$(find fastlane/metadata/en-US/screenshots -type f \( -name '*.png' -o -name '*.jpg' \) 2>/dev/null)" ]; then
        echo "Uploading screenshots..."
        cd fastlane
        fastlane upload_screenshots
        cd ..
        echo -e "${GREEN}✅ Screenshots uploaded${NC}"
    else
        echo -e "${YELLOW}⚠️  No screenshots found. Please add screenshots to:${NC}"
        echo "  fastlane/metadata/en-US/screenshots/iphone65/"
        echo "  fastlane/metadata/tr/screenshots/iphone65/"
        echo ""
        echo "You can add screenshots later via App Store Connect or by running:"
        echo "  ./appstore-submit.sh --screenshots-only"
    fi
    echo ""
}

# Submit for review
submit_review() {
    local build_number="$1"
    
    echo "🎯 Submitting build #${build_number} for App Store review..."
    
    cd fastlane
    fastlane submit_review build_number:${build_number}
    cd ..
    
    echo -e "${GREEN}✅ Submitted for review${NC}"
    echo ""
}

# Show usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --build-only          Only build the app with EAS"
    echo "  --testflight-only     Only submit to TestFlight"
    echo "  --metadata-only       Only upload metadata"
    echo "  --screenshots-only    Only upload screenshots"
    echo "  --submit-review BUILD Submit build number for review"
    echo "  --full                Complete flow: build + TestFlight + metadata + submit"
    echo "  --help                Show this help message"
    echo ""
    echo "Environment Variables Required:"
    echo "  ASC_KEY_ID           App Store Connect API Key ID"
    echo "  ASC_ISSUER_ID        App Store Connect Issuer ID"
    echo "  ASC_PRIVATE_KEY      App Store Connect Private Key (base64 or path)"
    echo ""
    echo "Examples:"
    echo "  $0 --metadata-only"
    echo "  $0 --submit-review 37"
    echo "  $0 --full"
}

# Main script logic
main() {
    check_prerequisites
    
    case "${1:-}" in
        --build-only)
            build_app
            ;;
        --testflight-only)
            check_env || exit 1
            submit_testflight
            ;;
        --metadata-only)
            check_env || exit 1
            upload_metadata
            ;;
        --screenshots-only)
            check_env || exit 1
            upload_screenshots
            ;;
        --submit-review)
            if [ -z "$2" ]; then
                echo -e "${RED}❌ Error: Build number required${NC}"
                echo "Usage: $0 --submit-review <build_number>"
                exit 1
            fi
            check_env || exit 1
            submit_review "$2"
            ;;
        --full)
            check_env || exit 1
            build_app
            submit_testflight
            upload_metadata
            upload_screenshots
            echo ""
            echo -e "${BLUE}ℹ️  To submit for review, run:${NC}"
            echo "  $0 --submit-review <build_number>"
            ;;
        --help|"")
            usage
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            echo ""
            usage
            exit 1
            ;;
    esac
    
    echo ""
    echo "✨ Done!"
    echo ""
    echo "📊 Monitor your app status at:"
    echo "   https://appstoreconnect.apple.com/apps/6670815109"
}

# Run main function
main "$@"
