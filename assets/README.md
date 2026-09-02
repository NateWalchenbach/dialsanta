# Hero film — "the run downstairs"

Drop the finished clip here and the site picks it up automatically:

- `hero.mp4` — H.264, 1920×1080 (16:9), 10–25 s seamless loop, **shot to play
  silently** (the "Watch the film" button replays it with sound, so a sound
  mix is welcome but the visual must work muted).
- `hero-poster.jpg` — a still from the clip (first frame works), shown while
  the video buffers.

Keep it under ~8 MB if possible (compress with
`ffmpeg -i in.mp4 -vcodec libx264 -crf 26 -preset slow -movflags +faststart hero.mp4`).
If the files are missing the site shows its animated night-scene fallback —
nothing breaks.

## The shot (brief)

Christmas morning, before sunrise. A little boy (5–7) in pajamas bursts out
of his bedroom door, races down a staircase strung with garland — warm light
and a glowing tree spilling up from the living room below — grabs a propped-up
phone, and Santa's face fills the screen mid-"Ho ho ho!". His face lights up.
Handheld, chasing him from behind, then whip to the phone screen.

## Generation prompt (Sora / Veo / Runway)

> Cinematic handheld shot, Christmas morning before dawn. A 6-year-old boy in
> red pajamas bursts from his bedroom and runs down a wooden staircase wrapped
> in pine garland and warm string lights, camera chasing behind him, soft warm
> glow rising from the living room below. He slides to a stop, grabs a phone
> propped on the coffee table by the lit Christmas tree, and a jolly Santa
> Claus appears on the screen on a video call, waving. The boy beams.
> Warm tungsten light, gentle film grain, shallow depth of field, 24 fps,
> joyful and cozy, no text.

Generate 3–5 takes; pick the one where the phone-screen moment reads clearly
at small sizes. Stock alternative: search Artgrid/Pexels for
"child running stairs christmas morning" + a separate cut-in of the call
screen (we can screen-record the real app for that shot — it looks great).

# Reaction films — the call-experience carousel

Six slots: `reactions/reaction-1.mp4` … `reactions/reaction-6.mp4`.

- **Phone-screen vertical** (the current assets are 720×1564), exactly 8 s,
  H.264/yuv420p, MP4 fast-start, and **no audio stream**.
- The deployed set uses fictional AI-generated children composited into the
  DialSanta call UI. Each caller name and caption is rendered deterministically.
- Public disclosure must remain visible next to the collection:
  “AI-generated examples of the in-app call experience. No real children are
  shown.” Do not present synthetic identities as customer testimonials.
- Keep each under ~4 MB. Missing files are safe: each phone shows its live-call
  placeholder scene until the clip exists.
- Real-family replacements are allowed only with written guardian permission
  covering the child’s face, the clip, and any attributed words.
