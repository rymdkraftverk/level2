# l2

Helpers for pixi games. A scheduler that counts time in updates rather than
milliseconds, a boot that mounts the app and ticks that scheduler, a registry
of display objects with ids and labels, textures from spritesheets, fitting the
stage to the window, repositories for the game's own entities, and a sound
helper on the side.

## Install

The package is consumed straight from git, so pin a commit:

```
npm install github:rymdkraftverk/level2#<commit>
```

## Boot

```ts
import * as l2 from 'l2'

const app = await l2.boot({
  mount:  document.getElementById('game'),
  width:  1280,
  height: 720,
})
l2.fitToWindow()
l2.useSpritesheets([await PIXI.Assets.load('assets/spritesheet.json')])
```

`boot` creates the pixi application, appends its canvas to `mount` and ticks
the scheduler every frame. A behavior that throws stops the ticker like any
other uncaught error, unless an `onError` option takes the error instead and
the game plays on. Use `init(app)` instead when the application already
exists.
`fitToWindow` scales the stage to the window now and on every resize, keeping
text crisp by changing font sizes rather than scale. `getTexture(name)` finds a
texture in the registered spritesheets by file name without extension.

## Schedule

```ts
l2.repeat((counter, deltaTime) => {
  sprite.rotation += 0.01 * deltaTime
}, 1, { id: 'spin' })

l2.once(() => {
  l2.removeBehavior('spin')
}, 60)
```

`repeat` runs its callback every `interval` updates, `once` runs it a single
time after `delay` updates. Both return the behavior record and accept an
`id` and `labels`.

`addBehavior` is the full form underneath:

| option | meaning |
|---|---|
| `duration` | updates until `onComplete` fires |
| `loop` | start over after completing instead of leaving |
| `onInit`, `onUpdate`, `onComplete`, `onRemove` | lifecycle callbacks, each given `{ counter, data, deltaTime }` |
| `data` | anything the callbacks want to share |
| `enabled` | a disabled behavior sits still until re-enabled |
| `removeOnComplete` | keep a completed behavior around instead of removing it |

`getBehavior`, `getAllBehaviors`, `removeBehavior` and `resetBehavior` manage
the behaviors. `getLoopDuration` reports how long the last `update` took.
Set `settings.logging = true` to hear about removed or duplicated ids.

## Display objects

```ts
const scene = new PIXI.Container()
l2.add(scene, { id: 'game' })

const hero = new PIXI.Sprite(l2.getTexture('hero'))
l2.add(hero, { parent: scene, zIndex: 10, labels: ['player'] })

l2.get('game')
l2.getByLabel('player')
l2.getId(hero)
l2.isDestroyed(hero)
l2.destroy('game')
```

`add` puts an object under a parent (the stage by default), remembers it by id
and labels, orders siblings by `zIndex`, and makes any `Text` resize with the
stage. `destroy` removes an object and forgets it along with every registered
descendant; pass `{ children: false }` to keep the children alive.
`isColliding(a, b)` compares hit areas in game coordinates, and `grid`,
`toRadians` and `getRandomInRange` are small helpers the games share.

## Entities

```ts
const players = l2.repository<Player>({
  name:  'player',
  read:  () => state.players,
  write: (updated) => { state.players = updated },
})

players.add(player)
players.find(id)
players.change(p => ({ ...p, score: 0 }))
```

A repository owns a list of things with an `id` inside the game's own state.
`all`, `count`, `has` and `find` read it, `add`, `remove` and `change` replace
it. `find` throws naming the missing id rather than handing back `undefined`,
so a lookup that should never miss fails where it happened.

## Sound

```ts
import { effect, track, playTrack, stopTrack } from 'l2/sound'

const Sound = {
  JUMP: effect({ src: 'jump.wav', volume: 0.6 }),
}

const Track = {
  MUSIC: track({ src: 'music.mp3', volume: 0.5 }),
}

Sound.JUMP()
playTrack(Track.MUSIC)
stopTrack()
```

Declare every sound once, at module level, and play it by calling it. Each
declaration loads a single player that is reused for every play, so a game that
runs for hours never grows its audio graph.

Tracks loop, and only one plays at a time: `playTrack` stops whichever was
playing before. Everything is mixed through a soft clipper, so effects landing
together cannot clip the output. It shapes only what approaches full scale and
has no gain to ride back up, so the track never ducks behind an effect.

Sound is a separate entry so games without audio never load howler.

## Develop

```
npm run qa    # test, lint, typecheck
npm run build # dist/
```
