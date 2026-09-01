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

# Reaction films — the families carousel

Six slots: `reactions/reaction-1.mp4` … `reactions/reaction-6.mp4`.

- **9:16 vertical** (1080×1920 or phone-shot), 8–20 s loop, plays **muted** —
  faces and reactions must carry it without sound.
- Best material: phone-shot video of the kid's face during the call, or a
  screen recording of the actual call with the kid-cam PiP visible.
- Keep each under ~4 MB
  (`ffmpeg -i in.mp4 -vf scale=720:-2 -crf 27 -preset slow -movflags +faststart out.mp4`).
- Missing files are fine — each phone shows its live-call placeholder scene
  until the clip exists.

⚠️ Before launch: the six quotes in `index.html` are PLACEHOLDER copy for
layout art-direction. Replace them with real quotes from real parents, with
written permission for both the clip and the words (the site already credits
"shared with each family's permission" — make it true). Same goes for the
"Join thousands of families" line: ship it when the numbers back it up, or
soften to "Join the families…" until then.
