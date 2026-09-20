import { Howl, Howler } from 'howler'

export type Effect = () => void

export type Track = ReturnType<typeof track>

const master = { limited: false }

const limitMaster = () => {
  if (master.limited || !Howler.usingWebAudio || !Howler.ctx || !Howler.masterGain) {
    return
  }

  master.limited = true

  const limiter = Howler.ctx.createDynamicsCompressor()
  limiter.threshold.setValueAtTime(-6, Howler.ctx.currentTime)
  limiter.knee.setValueAtTime(0, Howler.ctx.currentTime)
  limiter.ratio.setValueAtTime(20, Howler.ctx.currentTime)
  limiter.attack.setValueAtTime(0.002, Howler.ctx.currentTime)
  limiter.release.setValueAtTime(0.2, Howler.ctx.currentTime)

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
