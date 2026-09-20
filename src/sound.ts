import { Howl, Howler } from 'howler'

export type Effect = () => void

export type Track = ReturnType<typeof track>

const master = { limited: false }

const KNEE = 0.8

const CURVE_POINTS = 8192

const softClipCurve = () => Float32Array.from(
  { length: CURVE_POINTS },
  (_unused, index) => {
    const x = ((index * 2) / (CURVE_POINTS - 1)) - 1
    const magnitude = Math.abs(x)

    if (magnitude <= KNEE) {
      return x
    }

    const headroom = 1 - KNEE
    return Math.sign(x) * (KNEE + (headroom * Math.tanh((magnitude - KNEE) / headroom)))
  },
)

const limitMaster = () => {
  if (master.limited || !Howler.usingWebAudio || !Howler.ctx || !Howler.masterGain) {
    return
  }

  master.limited = true

  const limiter = Howler.ctx.createWaveShaper()
  limiter.curve = softClipCurve()
  limiter.oversample = '4x'

  Howler.masterGain.disconnect()
  Howler.masterGain.connect(limiter)
  limiter.connect(Howler.ctx.destination)
}

const load = ({ src, volume, loop }: {
  src:    string
  volume: number
  loop?:  boolean
}) => {
  const howl = new Howl({
    src: [src], volume, loop, preload: true,
  })
  limitMaster()
  return howl
}

export const effect = (options: { src: string, volume: number }): Effect => {
  const howl = load(options)
  return () => {
    howl.play()
  }
}

export const track = (options: { src: string, volume: number }) => (
  load({ ...options, loop: true })
)

const current: { track?: Track } = {}

export const playTrack = (next: Track) => {
  if (current.track === next) {
    return
  }

  current.track?.stop()
  next.play()
  current.track = next
}

export const stopTrack = () => {
  current.track?.stop()
  current.track = undefined
}
