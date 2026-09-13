export type Behavior<Data = never> = {
  counter:   number
  data:      Data
  deltaTime: number
}

export type BehaviorOptions<Data = never> = {
  data?:             Data
  duration?:         number
  enabled?:          boolean
  id?:               string
  labels?:           string[]
  loop?:             boolean
  onComplete?:       (behavior: Behavior<Data>) => void
  onInit?:           (behavior: Behavior<Data>) => void
  onRemove?:         (behavior: Behavior<Data>) => void
  onUpdate?:         (behavior: Behavior<Data>) => void
  removeOnComplete?: boolean
}

export type BehaviorRecord = {
  counter:           number
  data:              unknown
  duration:          number
  enabled:           boolean
  finished:          boolean
  id:                string
  initHasBeenCalled: boolean
  labels:            string[]
  loop:              boolean
  onComplete:        ((behavior: Behavior) => void) | null
  onInit:            ((behavior: Behavior) => void) | null
  onRemove:          ((behavior: Behavior) => void) | null
  onUpdate:          ((behavior: Behavior) => void) | null
  removeOnComplete:  boolean
}

export type TickCallback = (counter: number, deltaTime: number) => void

export type TickOptions = {
  id?:     string
  labels?: string[]
}

export const settings = {
  logging: false,
}

const behaviors: BehaviorRecord[] = []

const counters = {
  behavior:         0,
  lastLoopDuration: 0,
}

const log = (text: string) => {
  if (settings.logging) {
    console.warn(text)
  }
}

const toBehavior = (behavior: BehaviorRecord, deltaTime: number) => ({
  counter: behavior.counter,
  data:    behavior.data,
  deltaTime,
} as Behavior)

export const getBehavior = (id: string) => behaviors.find(behavior => behavior.id === id)

export const getAllBehaviors = () => behaviors.slice()

export const removeBehavior = (behavior: { id: string } | string) => {
  const id = typeof behavior === 'string' ? behavior : behavior.id
  const behaviorObject = getBehavior(id)

  if (!behaviorObject) {
    log(`l2: Tried to remove non-existent behavior: ${id}`)
    return
  }

  const indexToRemove = behaviors.indexOf(behaviorObject)
  if (indexToRemove >= 0) {
    behaviors.splice(indexToRemove, 1)
  }

  behaviorObject.enabled = false

  if (behaviorObject.onRemove) {
    behaviorObject.onRemove(toBehavior(behaviorObject, 0))
  }
}

export const resetBehavior = (behavior: BehaviorRecord) => {
  behavior.counter = 0
  behavior.finished = false
}

export const addBehavior = <Data>(options: BehaviorOptions<Data>) => {
  const {
    id = `behavior-${(counters.behavior += 1)}`,
    labels = [],
    duration = 0,
    loop = false,
    removeOnComplete = true,
    onUpdate = null,
    onComplete = null,
    onInit = null,
    onRemove = null,
    enabled = true,
    data,
  } = options

  if (getBehavior(id)) {
    log(`l2: Behavior with id ${id} already exists`)
    removeBehavior(id)
  }

  if (!duration && onComplete) {
    log(`l2: behavior "${id}" has an onComplete callback but no duration`)
  }

  const behavior: BehaviorRecord = {
    counter:           0,
    data,
    duration:          Math.round(duration),
    enabled,
    finished:          false,
    id,
    initHasBeenCalled: false,
    labels,
    loop,
    onComplete,
    onInit,
    onRemove,
    onUpdate,
    removeOnComplete,
  }

  behaviors.push(behavior)
  return behavior
}

export const once = (callback: TickCallback, delay = 1, options: TickOptions = {}) => {
  const behavior = addBehavior({
    ...options,
    onUpdate: ({ counter, deltaTime }) => {
      const tick = counter + 1
      if (tick === delay) {
        callback(tick, deltaTime)
        removeBehavior(behavior)
      }
    },
  })
  return behavior
}

export const repeat = (callback: TickCallback, interval = 1, options: TickOptions = {}) => (
  addBehavior({
    ...options,
    onUpdate: ({ counter, deltaTime }) => {
      const tick = counter + 1
      if (tick % interval === 0) {
        callback(tick, deltaTime)
      }
    },
  })
)

export const update = (deltaTime: number) => {
  const before = performance.now()

  behaviors
    .slice()
    .forEach((behavior) => {
      if (!behavior.enabled) {
        return
      }

      if (!behavior.initHasBeenCalled) {
        if (behavior.onInit) {
          behavior.onInit(toBehavior(behavior, deltaTime))
        }
        behavior.initHasBeenCalled = true
      }

      if (behavior.onUpdate) {
        behavior.onUpdate(toBehavior(behavior, deltaTime))
      }

      if (behavior.duration > 0 && behavior.counter === behavior.duration && !behavior.finished) {
        behavior.finished = true

        if (behavior.onComplete) {
          behavior.onComplete(toBehavior(behavior, deltaTime))
        }

        if (behavior.loop) {
          resetBehavior(behavior)
        } else if (behavior.removeOnComplete && behavior.enabled) {
          removeBehavior(behavior)
        }
      }

      behavior.counter += 1
    })

  counters.lastLoopDuration = performance.now() - before
}

export const getLoopDuration = () => counters.lastLoopDuration
