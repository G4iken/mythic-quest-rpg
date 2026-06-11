import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const manifestPath = join(process.cwd(), 'android', 'app', 'src', 'main', 'AndroidManifest.xml');

if (!existsSync(manifestPath)) {
  console.log('AndroidManifest.xml not found yet. Run: npm run android:add');
  process.exit(0);
}

let xml = readFileSync(manifestPath, 'utf8');
const activityRegex = /<activity\s+([\s\S]*?android:name="\.MainActivity"[\s\S]*?)>/m;
const match = xml.match(activityRegex);

if (!match) {
  console.log('MainActivity not found in AndroidManifest.xml. Please add android:screenOrientation="landscape" manually.');
  process.exit(0);
}

let activityTag = match[0];
if (activityTag.includes('android:screenOrientation=')) {
  activityTag = activityTag.replace(/android:screenOrientation="[^"]*"/, 'android:screenOrientation="landscape"');
} else {
  activityTag = activityTag.replace(/>$/, '\n            android:screenOrientation="landscape">');
}

if (activityTag.includes('android:resizeableActivity=')) {
  activityTag = activityTag.replace(/android:resizeableActivity="[^"]*"/, 'android:resizeableActivity="false"');
} else {
  activityTag = activityTag.replace(/>$/, '\n            android:resizeableActivity="false">');
}

xml = xml.replace(match[0], activityTag);
writeFileSync(manifestPath, xml);
console.log('Android orientation set to landscape in android/app/src/main/AndroidManifest.xml');
