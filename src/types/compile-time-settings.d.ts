export type CompileTimeSettings = {
  /**
   * disable / allow account creation
   * @default false
   */
  DISABLE_SIGNUPS: boolean,
  /**
   * disable / allow modifying accounts (name, passwords)
   * @default false
   */
  DISABLE_ACCOUNT_MODIFICATION: boolean,
  /**
   * disable / allow device ids
   * @default false
   *
   * device ids are used to identify devices and link them to (potentially multiple) users.
   * this can be seen as a security feature as you can see from which devices you have logged in before
   * but can also be seen as a privacy violation, therefore it can be enabled and disabled.
   *
   * device ids are uuid's which the client can send voluntarily, it isn't required except when trying to use
   * refresh-tokens on 2fa enabled accounts.
   * if no device id is sent the login will fail because:
   * - the refresh token was generated automatically and it would be suspicious if it were to leave the device
   *   it was generated on
   * - the devices can only be told apart if device ids are used
   */
  DISABLE_DEVICE_IDS: boolean,
  /**
   * disable / allow recording of ip addresses, useragents and geoip lookup
   * @default true
   */
  DISABLE_TRACKING: boolean,
  /**
   * configure logging
   * @default 'ANONYMIZED_ERROR'
   *
   * select how much information should be logged (to stdout)
   * - DEV: log all the things, this can include keys, passwords and much more
   * - FULL: log all accesses and state changes but omit sensitive information like passwords or keys
   * - ANONYMIZED: log only relevant accesses and anonymize ip addresses and user information as much as possible
   * - ERROR: only log errors but potentially include user information
   * - ANONYMIZED_ERROR: only log errors and make sure that no user information is ever logged
   */
  LOGGING: 'DEV' | 'FULL' | 'ANONYMIZED' | 'ERROR' | 'ANONYMIZED_ERROR',
  /**
   * disable / allow web interface
   * @default false
   *
   * the webinterface allows seeing logged in devices and modifying account details
   *
   * this settings disables the web interface as a whole, if some other settings affect the capabilities of the
   * web interface it will just display error messages upon trying to access / change the affected things
   */
  DISABLE_WEBINTERFACE: boolean,
  /**
   * disable / allow multifactor authentication
   * @default false
   */
  DISABLE_MFA: boolean,
  /**
   * disable / allow register tokens
   * @default false
   *
   * register tokens are tokens that admins can generate which can be entered at sign-up which directly grant
   * certain permissions
   */
  DISABLE_REGISTER_TOKENS: boolean,
  /**
   * disable / allow logout
   * @default false
   *
   * this setting allows disabling logouts, this means that the jwt system would be fully stateless, which
   * may be the wanted behaviour
   *
   * this simplifies a lot of logic but has the effect that a tokens validity can only be taken away by letting
   * it expire
   */
  DISABLE_LOGOUT: boolean,
  /**
   * disable / allow refresh tokens
   * @default false
   *
   * refresh tokens are tokens which can be used to re-authenticate a user. they are generated (if requested) at login
   * using username and password (and mfa potentially) and can be used afterwards when trying to get a valid JWT instead
   * of the previously mentioned information.
   *
   * the useful thing with refresh tokens is, that a client doesn't need to store username and password information to
   * automatically renew a JWT
   */
  DISABLE_REFRESH_TOKENS: boolean
}
