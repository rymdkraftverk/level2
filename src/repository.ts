export type Entity = {
  id: string
}

export const repository = <T extends Entity>({ name, read, write }: {
  name:  string
  read:  () => T[]
  write: (entities: T[]) => void
}) => {
  const all = () => read()

  const count = () => read().length

  const has = (id: string) => read().some(entity => entity.id === id)

  const find = (id: string) => {
    const entity = read().find(e => e.id === id)

    if (!entity) {
      throw new Error(`No ${name} with id ${id}`)
    }

    return entity
  }

  const add = (entity: T) => {
    write(read().concat(entity))
    return read()
  }

  const remove = (id: string) => {
    write(read().filter(entity => entity.id !== id))
    return read()
  }

  const change = (update: (entity: T) => T) => {
    write(read().map(update))
    return read()
  }

  return {
    add,
    all,
    change,
    count,
    find,
    has,
    remove,
  }
}
