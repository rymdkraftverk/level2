# l2

A scheduler for games that count time in updates rather than milliseconds.
Register behaviors, call `update` once per frame, and each behavior runs on the
updates it asked for.

## Install

The package is consumed straight from git, so pin a commit:

```
npm install github:rymdkraftverk/level2#<commit>
```

## Use

```ts
import * as l2 from 'l2'

app.ticker.add((ticker) => {
  l2.update(ticker.deltaTime)
})

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
the registry. `getLoopDuration` reports how long the last `update` took.
Set `settings.logging = true` to hear about removed or duplicated ids.

## Develop

```
npm run qa    # test, lint, typecheck
npm run build # dist/
```
