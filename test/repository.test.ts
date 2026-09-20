import { describe, expect, it } from 'vitest'
import { repository } from '../src/repository'

type Player = {
  id:    string
  score: number
}

const create = (initial: Player[] = []) => {
  const store = { players: initial }

  return {
    store,
    players: repository<Player>({
      name:  'player',
      read:  () => store.players,
      write: (players) => {
        store.players = players
      },
    }),
  }
}

describe('repository', () => {
  it('adds to the end', () => {
    const { players } = create()
    players.add({ id: 'a', score: 0 })
    players.add({ id: 'b', score: 0 })

    expect(players.all().map(p => p.id)).toEqual(['a', 'b'])
  })

  it('counts and answers for membership', () => {
    const { players } = create([{ id: 'a', score: 0 }])

    expect(players.count()).toBe(1)
    expect(players.has('a')).toBe(true)
    expect(players.has('b')).toBe(false)
  })

  it('throws when finding an unknown id', () => {
    const { players } = create()

    expect(() => players.find('a')).toThrow('No player with id a')
  })

  it('removes by id', () => {
    const { players } = create([{ id: 'a', score: 0 }, { id: 'b', score: 0 }])
    players.remove('a')

    expect(players.all().map(p => p.id)).toEqual(['b'])
  })

  it('replaces every entity on change', () => {
    const { players } = create([{ id: 'a', score: 0 }, { id: 'b', score: 1 }])
    players.change(player => ({ ...player, score: player.score + 1 }))

    expect(players.all().map(p => p.score)).toEqual([1, 2])
  })

  it('writes through to the state it was given', () => {
    const { store, players } = create()
    players.add({ id: 'a', score: 0 })

    expect(store.players).toHaveLength(1)
  })
})
