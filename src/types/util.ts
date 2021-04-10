import * as D from 'io-ts/Decoder'

// taken from: https://stackoverflow.com/a/49725198
export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> =
  Pick<T, Exclude<keyof T, Keys>>
  & {
      [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>
  }[Keys]

// taken from: https://stackoverflow.com/a/49725198
export type RequireOnlyOne<T, Keys extends keyof T = keyof T> =
  Pick<T, Exclude<keyof T, Keys>>
  & {
      [K in Keys]-?:
          Required<Pick<T, K>>
          & Partial<Record<Exclude<Keys, K>, undefined>>
  }[Keys]

export declare type Class<T = any> = new (...args: any[]) => T

export type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>

/**
 * Adds { id: ID } to the type.
 */
export type withId<T, ID> = T & { id: ID }

/**
 * Adds { id: ID } to the struct.
 * @note To be used with io-ts
 */
const with_id = <T, ID>(type: D.Decoder<unknown, T>, id_type: D.Decoder<unknown, ID>): D.Decoder<unknown, T & { id: ID }> => D.intersect(type)(D.struct({ id: id_type }))

export {
  with_id
}
