import { Howl } from 'howler'

export const sound = ({ src, volume, loop }: {
  src:     string
  volume?: number
  loop?:   boolean
}) => {
  const howl = new Howl({ src: [src], volume, loop })
  howl.play()
  return howl
}
