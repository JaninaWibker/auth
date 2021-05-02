const get_idx = (hash: Uint8Array, capacity: number) => hash.reduce((acc, curr) => (acc*256 + curr) % capacity, 0)

type HashMapSlot<K, V> = [K | undefined, V | undefined, Uint8Array | undefined]

/**
 * A hashmap implementation using linear probing
 */
class HashMap<K, V> {

  hash: (key: K) => Uint8Array
  capacity: number
  size = 0
  data: HashMapSlot<K, V>[]

  constructor(hash: (key: K) => Uint8Array, initial_capacity = 16) {
    this.hash = hash
    this.capacity = initial_capacity
    this.data = new Array(initial_capacity).fill(null).map(() => [undefined, undefined, undefined])
  }

  put(key: K, value: V, retry = false): V {
    const hash = this.hash(key)
    const starting_idx = get_idx(hash, this.capacity)

    let found = -1

    // do linear probing
    for(let i = 0; i < this.capacity; i++) {
      const idx = (starting_idx + i) % this.capacity

      if(this.data[idx][2] === undefined || this.data[idx][0] === key) {
        // found empty slot or found
        found = idx
        break
      }
    }

    if(found === -1) {
      if(retry) throw new Error('something must have gone wrong idk') // TODO: better error handling

      // no slot could be found -> resize the hashmap and then search once more
      this.resize(this.capacity * 2)
      return this.put(key, value, true)
    } else {
      // found a fitting slot -> use the slot
      this.data[found][0] = key
      this.data[found][1] = value
      this.data[found][2] = hash
      this.size++
      return value
    }
  }

  find(key: K): V | undefined {
    const hash = this.hash(key)
    const starting_idx = get_idx(hash, this.capacity)

    let found = -1

    // do linear probing
    for(let i = 0; i < this.capacity; i++) {
      const idx = (starting_idx + i) % this.capacity

      if(this.data[idx][0] === key) {
        found = idx
        break
      }
    }

    return found !== -1 ? this.data[found][1] : undefined
  }

  remove(key: K): V | undefined {
    const hash = this.hash(key)
    const starting_idx = get_idx(hash, this.capacity)

    let found = -1

    for(let i = 0; i < this.capacity; i++) {
      const idx = (starting_idx + i) % this.capacity

      if(this.data[idx][0] === key) {
        found = idx
        break
      }
    }

    if(found === -1) {
      return undefined
    } else {
      console.log('should remove now', this.data, found, key)
      const rtn = this.data[found][1]

      // remove value
      this.data[found][0] = undefined
      this.data[found][1] = undefined
      this.data[found][2] = undefined
      this.size--

      // check if should down-size (if down-sizing the invariant holds true)
      if(this.size - 1 <= this.capacity/4) {
        // down-size
        this.resize(Math.ceil(this.capacity/4))
      } else {

        // invariant currently broken; needs to be fixed
        for(let i = 1; i < this.capacity; i++) {
          const curr_idx = (found + i) % this.capacity
          const hash = this.data[curr_idx][2]

          if(hash === undefined) break

          const wanted_idx = get_idx(hash, this.capacity)

          if(curr_idx === wanted_idx) break

          // swap found with curr_idx and update found
          const swap = [...this.data[curr_idx]] as HashMapSlot<K, V>

          this.data[curr_idx][0] = this.data[found][0]
          this.data[curr_idx][1] = this.data[found][1]
          this.data[curr_idx][2] = this.data[found][2]

          this.data[found][0] = swap[0]
          this.data[found][1] = swap[1]
          this.data[found][2] = swap[2]

          found = curr_idx
        }
      }

      return rtn
    }
  }

  private resize(new_capacity: number) {

    // * up-sizing and down-sizing are both allowed
    // * down-sizing should only take place if 1/4 of the current capacity is being used
    // * up-sizing should take place if the capacity is (almost) used up

    if(this.size <= new_capacity)
      return

    // create new array
    const new_array = new Array(new_capacity).fill(null).map(() => [undefined, undefined, undefined] as HashMapSlot<K, V>)

    // move over data
    this.data.forEach(([key, value, hash]) => {
      if(hash === undefined) return

      const starting_idx = get_idx(hash, new_capacity)

      for(let i = 0; i < new_capacity; i++) {
        const idx = (starting_idx + i) % new_capacity

        if(this.data[idx][0] === undefined) {
          new_array[idx][0] = key
          new_array[idx][1] = value
          new_array[idx][2] = hash
        }
      }
    })

    // update instance variables
    this.data = new_array
    this.capacity = new_capacity
  }

  bloomfilter(resolution: number, fn?: (key: K | undefined, value: V | undefined, hash: Uint8Array | undefined) => 0 | 1): Uint8Array {

    const bloomfilter = new Uint8Array(Math.ceil(resolution / 8)).fill(0)

    const internal_fn = fn === undefined
      ? (_key: K | undefined, _value: V | undefined, hash: Uint8Array | undefined) => hash !== undefined ? 1 : 0
      : fn

    this.data.forEach(([key, value, hash], i) =>
      bloomfilter[Math.floor((i % resolution) / 8)] |= internal_fn(key, value, hash) << ((i % resolution) % 8)
    )

    return bloomfilter
  }
}

export { HashMap }
