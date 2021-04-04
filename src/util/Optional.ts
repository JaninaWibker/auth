class Optional<T> {
  value:     T   | undefined = undefined
  error:     any | undefined = undefined
  has_value                  = false

  constructor(executor: (resolve: (value: T | Optional<T>) => void, reject: (reason?: any) => void) => void) {
    executor((value_or_optional: T | Optional<T>) => {
      if(typeof value_or_optional === 'object' && 'value' in value_or_optional) {
        this.value = value_or_optional.value
      } else {
        this.value = value_or_optional
      }
      this.has_value = true
    }, (error_or_optional: any) => {
      if(typeof error_or_optional === 'object' && 'error' in error_or_optional) {
        this.error = error_or_optional.error
      } else {
        this.error = error_or_optional
      }
    })
  }

  static resolve<T>(value: T) {
    return new Optional<T>((resolve) => resolve(value))
  }

  static reject<T>(error: any) {
    return new Optional<T>((_resolve, reject) => reject(error))
  }

  then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | Optional<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | Optional<TResult2>) | undefined | null): Optional<TResult1 | TResult2> {
    if(this.error !== undefined) { // call onrejected if exists
      if(onrejected) {
        try {
          const value_or_optional = onrejected(this.error)
          if(typeof value_or_optional === 'object' && 'value' in value_or_optional) {
            return value_or_optional
          } else {
            return Optional.resolve(value_or_optional)
          }
        } catch(e) {
          return Optional.reject(e)
        }
      } else {
        throw this.error
      }
    } else if(this.has_value) {
      if(onfulfilled) {
        try {
          const value_or_optional = onfulfilled(this.value as T)
          if(typeof value_or_optional === 'object' && 'value' in value_or_optional) {
            return value_or_optional
          } else {
            return Optional.resolve(value_or_optional)
          }
        } catch(e) {
          return Optional.reject(e)
        }
      } else {
        // @ts-ignore: TODO
        return this
      }
    } else {
      console.log('when does this happen exactly?')
      // @ts-ignore: TODO
      return this
    }
  }

  observe_then<TResult1 = T>(onfulfilled?: ((value: T) => TResult1 | Optional<TResult1>) | undefined | null): Optional<T> {
    return this.then(
      value => {
        if(onfulfilled) onfulfilled(value)
        return value
      }
    )
  }

  catch<TResult = never>(onrejected?: ((reason: any) => TResult | Optional<TResult>) | undefined | null): Optional<T | TResult> {
    return this.then(undefined, onrejected)
  }

  observe_catch<TResult = never>(onrejected?: ((reason: any) => TResult | Optional<TResult>) | undefined | null): Optional<T> {
    return this.catch(error => {
      if(onrejected) onrejected(error)
      return error
    })
  }

  finally(onfinally?: (() => void) | undefined | null): Optional<T> {
    return this.then(
      value => {
        if(onfinally) onfinally()
        return value
      },
      error => {
        if(onfinally) onfinally()
        return error
      }
    )
  }
}

export default Optional
