# Notification Sounds

This directory contains notification sound files for the driver app.

## Current Sounds

### Original Sounds (Production Ready)
- `default.mp3` - Default notification sound
- `bell.mp3` - Bell sound
- `chime.mp3` - Chime sound
- `alert.mp3` - Alert sound
- `gentle.mp3` - Gentle notification sound

### New Sounds (Placeholders - Need Replacement)
The following sounds are currently **placeholders** (copies of default.mp3). They should be replaced with appropriate sound files:

- `ding.mp3` - Short ding sound
- `cash.mp3` - Cash register or money sound 💰
- `success.mp3` - Success/completion sound
- `horn.mp3` - Car horn sound 🚗
- `whistle.mp3` - Whistle sound
- `doorbell.mp3` - Doorbell ring sound
- `arcade.mp3` - Arcade/game sound 🎮
- `pop.mp3` - Pop/bubble sound
- `radar.mp3` - Radar ping sound
- `taxi.mp3` - Taxi dispatch sound 🚕

## Requirements for Sound Files

- **Format**: MP3
- **Duration**: 1-3 seconds maximum
- **Quality**: Web-optimized (keep file size reasonable, under 500KB)
- **License**: Must be royalty-free or created for this project
- **Volume**: Normalized to consistent levels across all sounds

## Where to Find Royalty-Free Sounds

1. **Freesound.org** - https://freesound.org/ (Creative Commons licensed sounds)
2. **Zapsplat** - https://www.zapsplat.com/ (Free sound effects)
3. **Mixkit** - https://mixkit.co/free-sound-effects/ (Free sound effects)
4. **BBC Sound Effects** - https://sound-effects.bbcrewind.co.uk/ (Free for personal/educational use)
5. **Pixabay Audio** - https://pixabay.com/sound-effects/ (Free sound effects)

## Replacing Placeholder Sounds

1. Download or create appropriate sound files
2. Convert to MP3 format if needed (use ffmpeg or online converter)
3. Optimize file size (keep under 500KB)
4. Replace the placeholder files in this directory
5. Copy the new files to `android/app/src/main/res/raw/` for Android native notifications

### Example with ffmpeg:
```bash
# Convert and optimize a sound file
ffmpeg -i input.wav -codec:a libmp3lame -b:a 128k -ar 44100 output.mp3

# Trim to 2 seconds
ffmpeg -i input.mp3 -t 2 -codec:a libmp3lame -b:a 128k output.mp3
```

## Android Native Notifications

All sound files must also be copied to:
```
android/app/src/main/res/raw/
```

This ensures the sounds work with native Android push notifications.

## Testing Sounds

Sounds can be previewed in the app:
1. Go to Settings > Notifications
2. Click the speaker icon (🔊) next to each sound
3. Select the sound you want as default

## Notes

- The `cash` and `taxi` sounds are expected to be popular with VTC drivers
- Sounds should be attention-grabbing but not annoying
- Consider cultural appropriateness of sounds for target audience
