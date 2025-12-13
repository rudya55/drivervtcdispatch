#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const infoPlistPath = path.join(__dirname, '..', 'ios', 'App', 'App', 'Info.plist');

if (!fs.existsSync(infoPlistPath)) {
  console.log('Info.plist not found at:', infoPlistPath);
  process.exit(0);
}

let content = fs.readFileSync(infoPlistPath, 'utf8');

const locationPermissions = `
	<key>NSLocationWhenInUseUsageDescription</key>
	<string>Cette app a besoin de votre position pour vous assigner des courses a proximite</string>
	<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
	<string>Cette app suit votre position en arriere-plan pour mettre a jour votre localisation pendant les courses</string>
	<key>NSLocationAlwaysUsageDescription</key>
	<string>Cette app a besoin d'acceder a votre position en permanence pour le suivi des courses</string>`;

const cameraPermission = `
	<key>NSCameraUsageDescription</key>
	<string>Cette app a besoin d'acceder a la camera pour prendre des photos de documents et de vehicules</string>`;

const photoLibraryPermission = `
	<key>NSPhotoLibraryUsageDescription</key>
	<string>Cette app a besoin d'acceder a vos photos pour telecharger des documents et images de vehicules</string>`;

const backgroundModes = `
	<key>UIBackgroundModes</key>
	<array>
		<string>location</string>
		<string>fetch</string>
		<string>remote-notification</string>
	</array>`;

const closingDict = '</dict>';
const lastClosingDictIndex = content.lastIndexOf(closingDict);

if (lastClosingDictIndex === -1) {
  console.error('Could not find closing </dict> in Info.plist');
  process.exit(1);
}

let additions = '';

if (!content.includes('NSLocationWhenInUseUsageDescription')) {
  additions += locationPermissions;
  console.log('Added location permissions');
}

if (!content.includes('NSCameraUsageDescription')) {
  additions += cameraPermission;
  console.log('Added camera permission');
}

if (!content.includes('NSPhotoLibraryUsageDescription')) {
  additions += photoLibraryPermission;
  console.log('Added photo library permission');
}

if (!content.includes('UIBackgroundModes')) {
  additions += backgroundModes;
  console.log('Added background modes');
}

if (additions) {
  content = content.slice(0, lastClosingDictIndex) + additions + '\n' + content.slice(lastClosingDictIndex);
  fs.writeFileSync(infoPlistPath, content);
  console.log('Info.plist updated successfully!');
} else {
  console.log('Info.plist already configured, no changes needed');
}
