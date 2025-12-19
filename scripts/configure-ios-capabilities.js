#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectPath = path.join(__dirname, '..', 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');

if (!fs.existsSync(projectPath)) {
  console.log('Xcode project not found at:', projectPath);
  console.log('This is expected if iOS platform has not been added yet.');
  process.exit(0);
}

let content = fs.readFileSync(projectPath, 'utf8');

const entitlementsContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>aps-environment</key>
  <string>development</string>
  <key>com.apple.developer.associated-domains</key>
  <array>
  </array>
</dict>
</plist>`;

const entitlementsPath = path.join(__dirname, '..', 'ios', 'App', 'App', 'App.entitlements');
const entitlementsDir = path.dirname(entitlementsPath);

if (!fs.existsSync(entitlementsDir)) {
  console.log('iOS App directory not found, skipping entitlements creation');
  process.exit(0);
}

if (!fs.existsSync(entitlementsPath)) {
  fs.writeFileSync(entitlementsPath, entitlementsContent);
  console.log('Created App.entitlements file');
} else {
  console.log('App.entitlements already exists');
}

if (!content.includes('App.entitlements')) {
  console.log('Note: You may need to manually add App.entitlements to your Xcode project');
  console.log('In Xcode: Target > Signing & Capabilities > + Capability > Push Notifications');
}

console.log('iOS capabilities configuration completed!');
console.log('');
console.log('Manual steps in Xcode:');
console.log('1. Open ios/App/App.xcworkspace in Xcode');
console.log('2. Select App target > Signing & Capabilities');
console.log('3. Click + Capability and add:');
console.log('   - Push Notifications');
console.log('   - Background Modes (enable: Location updates, Background fetch, Remote notifications)');
