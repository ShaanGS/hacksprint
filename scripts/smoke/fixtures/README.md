# Smoke test fixtures

`order-ta.webm` is a 3.6 second Tamil order: "ரெண்டு மேகி, ஒரு பட்டர், அரை கிலோ சர்க்கரை கொடுங்க" ("two Maggi, one butter, half a kilo of sugar, please"). It is synthetic speech from macOS's Tamil voice, encoded as webm/opus, the format Chrome's MediaRecorder sends. To regenerate it:

```bash
say -v Vani -o order-ta.aiff "ரெண்டு மேகி, ஒரு பட்டர், அரை கிலோ சர்க்கரை கொடுங்க."
ffmpeg -i order-ta.aiff -ac 1 -ar 16000 -c:a libopus -b:a 24k order-ta.webm
```

A real phone recording is a better test of accents and background noise; use one for the scripted calls in milestone 6.
