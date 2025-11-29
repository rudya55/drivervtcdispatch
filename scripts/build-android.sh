#!/bin/bash
# ==========================================
# Driver VTC Dispatch - Android Build Script
# ==========================================
#
# This script builds the Android APK locally.
# For production builds, use GitHub Actions instead.
#
# Prerequisites:
# - Node.js 18+ installed
# - Java JDK 17 installed
# - Android SDK installed (ANDROID_HOME set)
# - Keystore configured (for release builds)
#
# Usage:
#   ./scripts/build-android.sh          # Build both debug and release
#   ./scripts/build-android.sh debug    # Build debug only
#   ./scripts/build-android.sh release  # Build release only
#
# ==========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BUILD_TYPE="${1:-both}"

echo -e "${BLUE}🚀 Building Driver VTC Dispatch Android App${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ npm: $(npm --version)${NC}"

if ! command -v java &> /dev/null; then
    echo -e "${RED}❌ Java is not installed. Please install JDK 17${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Java: $(java --version 2>&1 | head -n 1)${NC}"

if [ -z "$ANDROID_HOME" ] && [ -z "$ANDROID_SDK_ROOT" ]; then
    echo -e "${YELLOW}⚠️ ANDROID_HOME or ANDROID_SDK_ROOT not set. Checking default locations...${NC}"
    if [ -d "$HOME/Android/Sdk" ]; then
        export ANDROID_HOME="$HOME/Android/Sdk"
    elif [ -d "$HOME/Library/Android/sdk" ]; then
        export ANDROID_HOME="$HOME/Library/Android/sdk"
    else
        echo -e "${RED}❌ Android SDK not found. Please set ANDROID_HOME${NC}"
        exit 1
    fi
fi
echo -e "${GREEN}✅ Android SDK: ${ANDROID_HOME:-$ANDROID_SDK_ROOT}${NC}"

echo ""

# Navigate to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# Install dependencies
echo -e "${YELLOW}📦 Installing npm dependencies...${NC}"
npm install --legacy-peer-deps
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Build web app
echo -e "${YELLOW}🔨 Building web application...${NC}"
npm run build
echo -e "${GREEN}✅ Web build complete${NC}"
echo ""

# Sync with Capacitor
echo -e "${YELLOW}🔄 Syncing with Capacitor...${NC}"
npx cap sync android
echo -e "${GREEN}✅ Capacitor sync complete${NC}"
echo ""

# Navigate to android directory
cd android

# Make gradlew executable
chmod +x ./gradlew

# Set SDK location
if [ -n "$ANDROID_HOME" ]; then
    echo "sdk.dir=$ANDROID_HOME" > local.properties
elif [ -n "$ANDROID_SDK_ROOT" ]; then
    echo "sdk.dir=$ANDROID_SDK_ROOT" > local.properties
fi

# Build APKs
# Note: key.properties is expected in android/ directory (current working directory)
# This matches the Gradle configuration: rootProject.file("key.properties")
if [ "$BUILD_TYPE" = "debug" ] || [ "$BUILD_TYPE" = "both" ]; then
    echo -e "${YELLOW}🏗️ Building debug APK...${NC}"
    ./gradlew assembleDebug --no-daemon
    echo -e "${GREEN}✅ Debug APK built${NC}"
    
    if [ -f "app/build/outputs/apk/debug/app-debug.apk" ]; then
        DEBUG_SIZE=$(du -h app/build/outputs/apk/debug/app-debug.apk | cut -f1)
        echo -e "${GREEN}📱 Debug APK: app/build/outputs/apk/debug/app-debug.apk (${DEBUG_SIZE})${NC}"
    fi
    echo ""
fi

if [ "$BUILD_TYPE" = "release" ] || [ "$BUILD_TYPE" = "both" ]; then
    echo -e "${YELLOW}🏗️ Building release APK...${NC}"
    
    # Check for keystore
    if [ -f "key.properties" ]; then
        echo -e "${GREEN}✅ Keystore configuration found${NC}"
        ./gradlew assembleRelease --no-daemon
        
        if [ -f "app/build/outputs/apk/release/app-release.apk" ]; then
            RELEASE_SIZE=$(du -h app/build/outputs/apk/release/app-release.apk | cut -f1)
            echo -e "${GREEN}📱 Release APK: app/build/outputs/apk/release/app-release.apk (${RELEASE_SIZE})${NC}"
        fi
        
        echo ""
        echo -e "${YELLOW}🏗️ Building release AAB (App Bundle)...${NC}"
        ./gradlew bundleRelease --no-daemon
        
        if [ -f "app/build/outputs/bundle/release/app-release.aab" ]; then
            AAB_SIZE=$(du -h app/build/outputs/bundle/release/app-release.aab | cut -f1)
            echo -e "${GREEN}📱 Release AAB: app/build/outputs/bundle/release/app-release.aab (${AAB_SIZE})${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️ key.properties not found - building unsigned release${NC}"
        echo -e "${YELLOW}   To build a signed release, create android/key.properties${NC}"
        echo -e "${YELLOW}   See android/key.properties.example for format${NC}"
        ./gradlew assembleRelease --no-daemon || echo -e "${YELLOW}⚠️ Release build completed with debug signing${NC}"
        
        if [ -f "app/build/outputs/apk/release/app-release.apk" ]; then
            RELEASE_SIZE=$(du -h app/build/outputs/apk/release/app-release.apk | cut -f1)
            echo -e "${YELLOW}📱 Release APK (debug signed): app/build/outputs/apk/release/app-release.apk (${RELEASE_SIZE})${NC}"
        fi
    fi
    echo ""
fi

# Summary
echo -e "${BLUE}============================================${NC}"
echo -e "${GREEN}✅ Build complete!${NC}"
echo ""
echo -e "${BLUE}📁 APK Locations:${NC}"

if [ "$BUILD_TYPE" = "debug" ] || [ "$BUILD_TYPE" = "both" ]; then
    echo -e "   Debug:   android/app/build/outputs/apk/debug/app-debug.apk"
fi

if [ "$BUILD_TYPE" = "release" ] || [ "$BUILD_TYPE" = "both" ]; then
    echo -e "   Release: android/app/build/outputs/apk/release/app-release.apk"
    if [ -f "key.properties" ]; then
        echo -e "   Bundle:  android/app/build/outputs/bundle/release/app-release.aab"
    fi
fi

echo ""
echo -e "${BLUE}📱 To install on a device:${NC}"
echo -e "   adb install android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
