import * as PIXI from 'pixi.js'
import { settings, update } from './scheduler.js'

export type Point = { x: number, y: number }

export type AddOptions = {
  parent?: PIXI.Container
  zIndex?: number | null
  id?:     string
  labels?: string[]
}

export type BootOptions = Partial<PIXI.ApplicationOptions> & {
  mount:    HTMLElement
  logging?: boolean
  onError?: (error: Error) => void
}

type Meta = {
  id:     string
  labels: string[]
  zIndex: number | null
}

const displayObjects: PIXI.Container[] = []
const meta = new WeakMap<PIXI.Container, Meta>()
const resizableTexts = new Set<PIXI.Text>()
const originalFontSizes = new WeakMap<PIXI.Text, number>()

const counters = {
  displayObject: 0,
}

const registry = {
  app:          null as unknown as PIXI.Application,
  spritesheets: [] as PIXI.Spritesheet[],
  ratio:        1,
  gameWidth:    0,
  gameHeight:   0,
}

const log = (text: string) => {
  if (settings.logging) {
    console.warn(text)
  }
}

export const init = (
  app: PIXI.Application,
  options: { logging?: boolean, onError?: (error: Error) => void } = {},
) => {
  const { logging = false, onError = () => {} } = options

  app.ticker.add((ticker) => {
    try {
      update(ticker.deltaTime)
    } catch (error) {
      console.error('l2: Error running behaviors', error)
      onError(error as Error)
    }
  })

  registry.app = app
  registry.gameWidth = app.renderer.width
  registry.gameHeight = app.renderer.height
  settings.logging = logging
}

export const boot = async ({ mount, logging, onError, ...applicationOptions }: BootOptions) => {
  const app = new PIXI.Application()
  await app.init(applicationOptions)
  mount.appendChild(app.canvas)
  init(app, { logging, onError })
  return app
}

export const getApp = () => registry.app

export const useSpritesheets = (sheets: PIXI.Spritesheet[]) => {
  registry.spritesheets = sheets
}

export const getTexture = (filename: string) => {
  const texture = registry
    .spritesheets
    .map(sheet => sheet.textures[`${filename}.png`])
    .find(Boolean)

  if (!texture) {
    throw new Error(`l2: Texture "${filename}" not found.`)
  }

  return texture
}

export const getScale = () => registry.ratio

/*
  Scaling a text object makes it blurry, so resizable texts keep their scale at
  the inverse of the stage scale and change their font size instead.
*/
export const makeResizable = (text: PIXI.Text) => {
  const fontSize = Number(text.style.fontSize)

  originalFontSizes.set(text, fontSize)
  resizableTexts.add(text)
  text.style.fontSize = fontSize * registry.ratio
  text.scale.set(1 / registry.ratio)
}

export const resize = (width: number, height: number) => {
  registry.ratio = Math.min(
    width / registry.gameWidth,
    height / registry.gameHeight,
  )

  registry.app.stage.scale.set(registry.ratio)

  registry.app.renderer.resize(
    registry.gameWidth * registry.ratio,
    registry.gameHeight * registry.ratio,
  )

  resizableTexts.forEach((text) => {
    if (text.destroyed) {
      resizableTexts.delete(text)
      return
    }
    text.style.fontSize = (originalFontSizes.get(text) ?? 0) * registry.ratio
    text.scale.set(1 / registry.ratio)
  })
}

export const fitToWindow = () => {
  const fit = () => {
    resize(window.innerWidth, window.innerHeight)
  }
  fit()
  window.addEventListener('resize', fit)
}

export const getId = (displayObject: PIXI.Container) => meta.get(displayObject)?.id

export const getLabels = (displayObject: PIXI.Container) => meta.get(displayObject)?.labels ?? []

export const isDestroyed = (displayObject: PIXI.Container) => !displayObject.parent

export const updateRenderLayers = (displayObject: PIXI.Container) => {
  const zIndex = (child: PIXI.Container) => meta.get(child)?.zIndex ?? 0
  displayObject.children.sort((a, b) => zIndex(a) - zIndex(b))
}

export const add = (displayObject: PIXI.Container, options: AddOptions = {}) => {
  const {
    parent = registry.app.stage,
    zIndex = null,
    id = `do-${(counters.displayObject += 1)}`,
    labels = [],
  } = options

  parent.addChild(displayObject)
  displayObjects.push(displayObject)
  meta.set(displayObject, { id, zIndex, labels })
  displayObject.label = id

  if (displayObject instanceof PIXI.Text) {
    makeResizable(displayObject)
  }

  if (zIndex !== null) {
    updateRenderLayers(parent)
  }
}

export const get = (id: string) => displayObjects
  .find(displayObject => getId(displayObject) === id)

export const getAll = () => displayObjects

export const getByLabel = (label: string) => displayObjects
  .filter(displayObject => getLabels(displayObject).includes(label))

const forget = (displayObject: PIXI.Container) => {
  const indexToForget = displayObjects.indexOf(displayObject)
  if (indexToForget >= 0) {
    displayObjects.splice(indexToForget, 1)
  }
  meta.delete(displayObject)
  if (displayObject instanceof PIXI.Text) {
    resizableTexts.delete(displayObject)
  }
}

const getManagedDescendants = (displayObject: PIXI.Container): PIXI.Container[] => {
  const fromChildren = displayObject
    .children
    .flatMap(child => getManagedDescendants(child))

  return meta.has(displayObject) ? fromChildren.concat(displayObject) : fromChildren
}

export const destroy = (
  displayObject: PIXI.Container | string,
  options: { children?: boolean } = { children: true },
) => {
  const target = typeof displayObject === 'string'
    ? get(displayObject)
    : displayObject

  if (!target) {
    log(`l2: Tried to remove non-existent displayObject: ${displayObject}`)
    return
  }

  if (!target.parent) {
    log(`l2: ${getId(target)} has already been destroyed`)
    return
  }

  if (meta.has(target)) {
    if (options.children) {
      getManagedDescendants(target)
        .forEach(forget)
    } else {
      forget(target)
    }
  }

  target.parent.removeChild(target)
  target.destroy(options)
}

export const toRadians = (angle: number) => angle * (Math.PI / 180)

export const grid = ({ x, y, marginX, marginY, itemsPerRow }: {
  x:           number
  y:           number
  marginX:     number
  marginY:     number
  itemsPerRow: number
}) => (index: number) => ({
  x: x + ((index % itemsPerRow) * marginX),
  y: y + (Math.floor(index / itemsPerRow) * marginY),
})

export const getRandomInRange = (from: number, to: number) => Math
  .floor((Math.random() * (to - from)) + from)

export const getGlobalPosition = (displayObject: PIXI.Container): Point => {
  const global = displayObject.toGlobal(new PIXI.Point(0, 0))

  return {
    x: global.x / registry.ratio,
    y: global.y / registry.ratio,
  }
}

const getWidth = (displayObject: PIXI.Container) => {
  const hitArea = displayObject.hitArea as PIXI.Rectangle | null
  return (hitArea && hitArea.width) || displayObject.width
}

const getHeight = (displayObject: PIXI.Container) => {
  const hitArea = displayObject.hitArea as PIXI.Rectangle | null
  return (hitArea && hitArea.height) || displayObject.height
}

export const isColliding = (
  displayObject: PIXI.Container,
  otherDisplayObject: PIXI.Container,
) => {
  const { x, y } = getGlobalPosition(displayObject)
  const width = getWidth(displayObject)
  const height = getHeight(displayObject)

  const { x: otherX, y: otherY } = getGlobalPosition(otherDisplayObject)
  const otherWidth = getWidth(otherDisplayObject)
  const otherHeight = getHeight(otherDisplayObject)

  return x + width >= otherX
    && otherX + otherWidth >= x
    && y + height >= otherY
    && otherY + otherHeight >= y
}
