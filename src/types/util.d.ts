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

export type withId<T, ID> = T & { id: ID }
