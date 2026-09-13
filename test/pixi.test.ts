import * as PIXI from 'pixi.js'
import * as l2 from '../src/pixi'

const stage = new PIXI.Container()

beforeEach(() => {
  l2.init({
    stage,
    renderer: { width: 800, height: 600, resize: () => {} },
    ticker:   { add: () => {} },
  } as unknown as PIXI.Application)
})

afterEach(() => {
  l2.getAll()
    .slice()
    .forEach(displayObject => l2.destroy(displayObject))
})

describe('add', () => {
  test('puts the object on the stage under an id', () => {
    const sprite = new PIXI.Container()
    l2.add(sprite, { id: 'hero', labels: ['player'] })

    expect(sprite.parent).toBe(stage)
    expect(l2.get('hero')).toBe(sprite)
    expect(l2.getId(sprite)).toBe('hero')
    expect(l2.getByLabel('player')).toEqual([sprite])
  })

  test('orders siblings by zIndex', () => {
    const parent = new PIXI.Container()
    const back = new PIXI.Container()
    const front = new PIXI.Container()
    l2.add(front, { parent, zIndex: 2 })
    l2.add(back, { parent, zIndex: 1 })

    expect(parent.children).toEqual([back, front])
  })
})

describe('destroy', () => {
  test('forgets the object and its managed children', () => {
    const scene = new PIXI.Container()
    const child = new PIXI.Container()
    l2.add(scene, { id: 'scene' })
    l2.add(child, { id: 'child', parent: scene })

    l2.destroy('scene')

    expect(l2.getAll()).toEqual([])
    expect(l2.isDestroyed(scene)).toBe(true)
    expect(l2.isDestroyed(child)).toBe(true)
  })

  test('leaves unmanaged children out of the registry either way', () => {
    const scene = new PIXI.Container()
    scene.addChild(new PIXI.Container())
    l2.add(scene)

    l2.destroy(scene, { children: false })

    expect(l2.getAll()).toEqual([])
  })
})

describe('helpers', () => {
  test('grid lays items out row by row', () => {
    const at = l2.grid({ x: 10, y: 20, marginX: 5, marginY: 7, itemsPerRow: 2 })

    expect(at(0)).toEqual({ x: 10, y: 20 })
    expect(at(3)).toEqual({ x: 15, y: 27 })
  })

  test('toRadians converts degrees', () => {
    expect(l2.toRadians(180)).toBeCloseTo(Math.PI)
  })

  test('isColliding compares hit areas in global space', () => {
    const a = new PIXI.Container()
    const b = new PIXI.Container()
    a.hitArea = new PIXI.Rectangle(0, 0, 10, 10)
    b.hitArea = new PIXI.Rectangle(0, 0, 10, 10)
    l2.add(a)
    l2.add(b)
    b.position.set(5, 5)

    expect(l2.isColliding(a, b)).toBe(true)

    b.position.set(20, 20)
    expect(l2.isColliding(a, b)).toBe(false)
  })
})
