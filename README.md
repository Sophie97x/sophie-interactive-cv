# Sophie's attic

My CV, but as a little 3D attic.

I wanted somewhere to put my work projects, things I make at home and the hardware I like tinkering with. You can look around the room, browse the shelves or scroll down for the normal CV.

There's a tiny version of me at the desk, a wandering quail and a printer that makes a little bunny. The print takes about 90 seconds, with pause and replay controls.

## Run it locally

You'll need Node.js 22.13 or newer.

```sh
npm ci
npm run dev -- --port 5190
```

Open http://localhost:5190.

## Controls

- Drag to rotate, scroll to zoom.
- Shift-drag or right-drag to move around.
- On a phone, use two fingers to move and pinch to zoom.
- Open the settings menu to jump to a shelf, pause movement or reset the view.
- Add `?view=plain` to skip the 3D room.

The CV underneath can also be printed or saved as a PDF.

## Build and check

```sh
npm run typecheck
npm run lint
npm run build
npm test
npm start
```

The static preview runs at http://127.0.0.1:5192. The finished site is in `dist/client`.

## Under the hood

React, TypeScript, Three.js, React Three Fiber and Vinext. The room models are made in code. Project details live in `content/baseline.json`; the room is in `components/room`.

No API keys, accounts or database are needed to run it.
