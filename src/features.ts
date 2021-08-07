import type { CompileTimeSettings } from './types/compile-time-settings'

// default configuration
// const COMPILE_TIME_SETTINGS: CompileTimeSettings = {
//   DISABLE_SIGNUPS: false,
//   DISABLE_ACCOUNT_MODIFICATION: false,
//   DISABLE_DEVICE_IDS: false,
//   DISABLE_TRACKING: true,
//   LOGGING: 'ANONYMIZED_ERROR',
//   DISABLE_WEBINTERFACE: false,
//   DISABLE_MFA: false,
//   DISABLE_REGISTER_TOKENS: false,
//   DISABLE_LOGOUT: false,
//   DISABLE_REFRESH_TOKENS: false,
// }

// minimal configuration with preconfigured / admin-managed users
const COMPILE_TIME_SETTINGS: CompileTimeSettings = {
  DISABLE_SIGNUPS: true,
  DISABLE_ACCOUNT_MODIFICATION: true,
  DISABLE_DEVICE_IDS: true,
  DISABLE_TRACKING: true,
  LOGGING: 'ANONYMIZED_ERROR',
  DISABLE_WEBINTERFACE: true,
  DISABLE_MFA: true,
  DISABLE_REGISTER_TOKENS: true,
  DISABLE_LOGOUT: true,
  DISABLE_REFRESH_TOKENS: false,
}

export default COMPILE_TIME_SETTINGS
