import * as l2 from '../src/scheduler'

const tick = (times: number) => {
  Array.from({ length: times }).forEach(() => l2.update(1))
}

afterEach(() => {
  l2.getAllBehaviors().forEach(behavior => l2.removeBehavior(behavior))
})

describe('repeat', () => {
  test('runs on every update by default', () => {
    const calls: number[] = []
    l2.repeat(counter => calls.push(counter))

    tick(3)

    expect(calls).toEqual([1, 2, 3])
  })

  test('runs on every nth update with an interval', () => {
    const calls: number[] = []
    l2.repeat(counter => calls.push(counter), 2)

    tick(5)

    expect(calls).toEqual([2, 4])
  })

  test('takes an id', () => {
    l2.repeat(() => {}, 1, { id: 'spin' })

    expect(l2.getBehavior('spin')).toBeDefined()
  })
})

describe('once', () => {
  test('runs on the next update by default, then leaves', () => {
    const calls: number[] = []
    l2.once(counter => calls.push(counter))

    tick(3)

    expect(calls).toEqual([1])
    expect(l2.getAllBehaviors()).toEqual([])
  })

  test('waits the given number of updates', () => {
    const calls: number[] = []
    l2.once(counter => calls.push(counter), 3)

    tick(2)
    expect(calls).toEqual([])

    tick(1)
    expect(calls).toEqual([3])
  })
})

describe('addBehavior', () => {
  test('calls onInit once, then onUpdate every update', () => {
    const events: string[] = []
    l2.addBehavior({
      onInit:   () => events.push('init'),
      onUpdate: ({ counter }) => events.push(`update ${counter}`),
    })

    tick(2)

    expect(events).toEqual(['init', 'update 0', 'update 1'])
  })

  test('completes after the duration and removes itself', () => {
    const events: string[] = []
    l2.addBehavior({
      duration:   2,
      onComplete: ({ counter }) => events.push(`complete ${counter}`),
      onRemove:   () => events.push('remove'),
    })

    tick(2)
    expect(events).toEqual([])

    tick(1)
    expect(events).toEqual(['complete 2', 'remove'])
    expect(l2.getAllBehaviors()).toEqual([])
  })

  test('loops when asked, completing every duration updates', () => {
    const completions: number[] = []
    l2.addBehavior({
      duration:   2,
      loop:       true,
      onComplete: ({ counter }) => completions.push(counter),
    })

    tick(7)

    expect(completions).toEqual([2, 2, 2])
    expect(l2.getAllBehaviors()).toHaveLength(1)
  })

  test('replaces a behavior that reuses an id', () => {
    const first = l2.addBehavior({ id: 'move' })
    const second = l2.addBehavior({ id: 'move' })

    expect(l2.getAllBehaviors()).toEqual([second])
    expect(first.enabled).toBe(false)
  })

  test('hands data to the callbacks', () => {
    const seen: number[] = []
    l2.addBehavior({
      data:     { speed: 4 },
      onUpdate: ({ data }) => seen.push(data.speed),
    })

    tick(1)

    expect(seen).toEqual([4])
  })

  test('skips disabled behaviors', () => {
    const calls: number[] = []
    const behavior = l2.addBehavior({
      enabled:  false,
      onUpdate: ({ counter }) => calls.push(counter),
    })

    tick(1)
    expect(calls).toEqual([])

    behavior.enabled = true
    tick(1)
    expect(calls).toEqual([0])
  })
})

describe('removeBehavior', () => {
  test('removes by id or by record', () => {
    const byId = l2.addBehavior({ id: 'a' })
    const byRecord = l2.addBehavior({ id: 'b' })

    l2.removeBehavior('a')
    l2.removeBehavior(byRecord)

    expect(l2.getAllBehaviors()).toEqual([])
    expect(byId.enabled).toBe(false)
  })

  test('stops a behavior removed mid update from running again', () => {
    const calls: string[] = []
    l2.addBehavior({
      id:       'first',
      onUpdate: () => {
        calls.push('first')
        l2.removeBehavior('second')
      },
    })
    l2.addBehavior({
      id:       'second',
      onUpdate: () => calls.push('second'),
    })

    tick(1)

    expect(calls).toEqual(['first'])
  })
})
