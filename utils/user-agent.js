/*!
 * express-useragent.js v1.0.12 (https://github.com/biggora/express-useragent/)
 * Copyright 2011-2018 Alexey Gordeyev
 * Licensed under MIT (https://github.com/biggora/express-useragent/blob/master/README.md#license)
 */
const userAgent = function () {
  /* eslint-disable */
  const BOTS = [
    '\\+https:\\/\\/developers.google.com\\/\\+\\/web\\/snippet\\/',
    'ad\\smonitoring',
    'adsbot',
    'apex',
    'applebot',
    'archive.org_bot',
    'baiduspider',
    'bingbot',
    'cloudflare',
    'cloudinary',
    'crawler',
    'curl',
    'insomnia',
    'discordbot',
    'duckduckbot',
    'embedly',
    'exabot',
    'facebookexternalhit',
    'facebot',
    'flipboard',
    'google',
    'googlebot',
    'gsa-crawler',
    'gurujibot',
    'guzzlehttp',
    'heritrix',
    'ia_archiver',
    'insights',
    'linkedinbot',
    'ltx71',
    'mediapartners',
    'msnbot',
    'odklbot',
    'phantom\\.js',
    'phantomjs',
    'pingdom',
    'pinterest',
    'python',
    'rtlnieuws',
    'skypeuripreview',
    'slackbot',
    'slurp',
    'spbot',
    'telegrambot',
    'test\\scertificate',
    'testing',
    'tiabot',
    'tumblr ',
    'twitterbot',
    'vkshare',
    'web\\sscraper',
    'wget',
    'yandexbot',
    'apex',
    'applebot',
    'duckduckbot',
    'facebot',
    'flipboard',
    'gsa-crawler',
    'ia_archiver',
    'pinterest',
    'skypeuripreview',
    'odklbot',
    'archive.org_bot',
    'ltx71',
    'guzzlehttp',
    'vkshare',
    'discordbot',
    'whatsapp',
    'orangebot',
    'smtbot',
    'qwantify',
    'mj12bot',
    'ahrefsbot',
    'ltx71',
    'seznambot',
    'panscient\.com'
  ];
  const IS_BOT_REGEXP = new RegExp('^.*(' + BOTS.join('|') + ').*$');


  const UserAgent = function () {
    this.version = '1.0.12';
    this._Versions = {
      Edge: /(?:edge|edga|edgios)\/([\d\w\.\-]+)/i,
      Firefox: /(?:firefox|fxios)\/([\d\w\.\-]+)/i,
      IE: /msie\s([\d\.]+[\d])|trident\/\d+\.\d+;.*[rv:]+(\d+\.\d)/i,
      Chrome: /(?:chrome|crios)\/([\d\w\.\-]+)/i,
      Chromium: /chromium\/([\d\w\.\-]+)/i,
      Safari: /version\/([\d\w\.\-]+)/i,
      Opera: /version\/([\d\w\.\-]+)|OPR\/([\d\w\.\-]+)/i,
      SeaMonkey: /seamonkey\/([\d\w\.\-]+)/i,
      PhantomJS: /phantomjs\/([\d\w\.\-]+)/i,
      UC: /ucbrowser\/([\d\w\.]+)/i,
      Facebook: /FBAV\/([\d\w\.]+)/i,
      WebKit: /applewebkit\/([\d\w\.]+)/i
    };
    this._Browsers = {
      Edge: /edge|edga|edgios/i,
      SeaMonkey: /seamonkey/i,
      Chromium: /chromium/i,
      Chrome: /chrome|crios/i,
      Safari: /safari/i,
      IE: /msie|trident/i,
      Opera: /opera|OPR\//i,
      Firefox: /firefox|fxios/i,
      PhantomJS: /phantomjs/i,
      UC: /UCBrowser/i,
      Facebook: /FBA[NV]/
    };
    this._OS = {
      Windows10: /windows nt 10\.0/i,
      Windows81: /windows nt 6\.3/i,
      Windows8: /windows nt 6\.2/i,
      Windows7: /windows nt 6\.1/i,
      UnknownWindows: /windows nt 6\.\d+/i,
      WindowsVista: /windows nt 6\.0/i,
      WindowsXP: /windows nt 5\.1/i,
      OSXLion: /os x 10[._]7/i,
      OSXMountainLion: /os x 10[._]8/i,
      OSXMavericks: /os x 10[._]9/i,
      OSXYosemite: /os x 10[._]10/i,
      OSXElCapitan: /os x 10[._]11/i,
      MacOSSierra: /os x 10[._]12/i,
      MacOSHighSierra: /os x 10[._]13/i,
      MacOSMojave: /os x 10[._]14/i,
      Mac: /os x/i,
      Linux: /linux/i,
      Linux64: /linux x86\_64/i,
      ChromeOS: /cros/i,
      iPad: /\(iPad.*os (\d+)[._](\d+)/i,
      iPhone: /\(iPhone.*os (\d+)[._](\d+)/i,
      iOS: /ios/i,
      Insomnia: /insomnia/i,
      Curl: /curl\/(\d+)\.(\d+)\.(\d+)/i,
      Electron: /Electron\/(\d+)\.(\d+)\.(\d+)/i,
    };
    this._Platform = {
      Windows: /windows nt/i,
      Mac: /macintosh/i,
      Linux: /linux/i,
      iPad: /ipad/i,
      iPod: /ipod/i,
      iPhone: /iphone/i,
      Android: /android/i,
      Samsung: /samsung/i,
      Curl: /curl/i,
      Insomnia: /insomnia/i,
      Electron: /Electron/i,
      iOS: /^ios\-/i
    };
    /* eslint-enable */

    this.DefaultAgent = {
      isAuthoritative: true,
      isMobile: false,
      isTablet: false,
      isiPad: false,
      isiPod: false,
      isiPhone: false,
      isAndroid: false,
      isOpera: false,
      isIE: false,
      isEdge: false,
      isSafari: false,
      isFirefox: false,
      isWebkit: false,
      isChrome: false,
      isSeaMonkey: false,
      isPhantomJS: false,
      isDesktop: false,
      isWindows: false,
      isLinux: false,
      isLinux64: false,
      isMac: false,
      isChromeOS: false,
      isSamsung: false,
      isRaspberry: false,
      isBot: false,
      isCurl: false,
      isInsomnia: false,
      isAndroidTablet: false,
      isUC: false,
      isFacebook: false,
      isElectron: false,
      browser: 'unknown',
      version: 'unknown',
      os: 'unknown',
      platform: 'unknown',
      geoIp: {},
      source: ''
    };

    this.Agent = {};

    this.getBrowser = function (string) {
      switch (true) {
        case this._Browsers.Edge.test(string):
          this.Agent.isEdge = true;
          return 'Edge';
        case this._Browsers.PhantomJS.test(string):
          this.Agent.isPhantomJS = true;
          return 'PhantomJS';
        case this._Browsers.SeaMonkey.test(string):
          this.Agent.isSeaMonkey = true;
          return 'SeaMonkey';
        case this._Browsers.Opera.test(string):
          this.Agent.isOpera = true;
          return 'Opera';
        case this._Browsers.Chromium.test(string):
          this.Agent.isChrome = true;
          return 'Chromium';
        case this._Browsers.Facebook.test(string):
          this.Agent.isFacebook = true;
          return 'Facebook';
        case this._Browsers.Chrome.test(string):
          this.Agent.isChrome = true;
          return 'Chrome';
        case this._Browsers.IE.test(string):
          this.Agent.isIE = true;
          return 'IE';
        case this._Browsers.Firefox.test(string):
          this.Agent.isFirefox = true;
          return 'Firefox';
        case this._Browsers.Safari.test(string):
          this.Agent.isSafari = true;
          return 'Safari';
        case this._Browsers.UC.test(string):
          this.Agent.isUC = true;
          return 'UCBrowser';
        default:
          // If the UA does not start with Mozilla guess the user agent.
          // eslint-disable-next-line no-useless-escape
          if(string.indexOf('Mozilla') !== 0 && /^([\d\w\-\.]+)\/[\d\w\.\-]+/i.test(string)) {
            this.Agent.isAuthoritative = false;
            return RegExp.$1;
          }
          return 'unknown';
      }
    };

    this.getBrowserVersion = function (string) {
      let regex;
      switch (this.Agent.browser) {
        case 'Edge':
          if(this._Versions.Edge.test(string)) {
            return RegExp.$1;
          }
          break;
        case 'PhantomJS':
          if(this._Versions.PhantomJS.test(string)) {
            return RegExp.$1;
          }
          break;
        case 'Chrome':
          if(this._Versions.Chrome.test(string)) {
            return RegExp.$1;
          }
          break;
        case 'Chromium':
          if(this._Versions.Chromium.test(string)) {
            return RegExp.$1;
          }
          break;
        case 'Safari':
          if(this._Versions.Safari.test(string)) {
            return RegExp.$1;
          }
          break;
        case 'Opera':
          if(this._Versions.Opera.test(string)) {
            return RegExp.$1 ? RegExp.$1 : RegExp.$2;
          }
          break;
        case 'Firefox':
          if(this._Versions.Firefox.test(string)) {
            return RegExp.$1;
          }
          break;
        case 'IE':
          if(this._Versions.IE.test(string)) {
            return RegExp.$2 ? RegExp.$2 : RegExp.$1;
          }
          break;
        case 'SeaMonkey':
          if(this._Versions.SeaMonkey.test(string)) {
            return RegExp.$1;
          }
          break;
        case 'UCBrowser':
          if(this._Versions.UC.test(string)) {
            return RegExp.$1;
          }
          break;
        case 'Facebook':
          if(this._Versions.Facebook.test(string)) {
            return RegExp.$1;
          }
          break;
        default:
          if(this.Agent.browser !== 'unknown') {
            regex = new RegExp(this.Agent.browser + '[\\/ ]([\\d\\w\\.\\-]+)', 'i');
            if(regex.test(string)) {
              return RegExp.$1;
            }
          } else {
            this.testWebkit();
            if(this.Agent.isWebkit && this._Versions.WebKit.test(string)) {
              return RegExp.$1;
            }
            return 'unknown';
          }
      }
    };

    this.getOS = function (string) {
      switch (true) {
        case this._OS.WindowsVista.test(string):
          this.Agent.isWindows = true;
          return 'Windows Vista';
        case this._OS.Windows7.test(string):
          this.Agent.isWindows = true;
          return 'Windows 7';
        case this._OS.Windows8.test(string):
          this.Agent.isWindows = true;
          return 'Windows 8';
        case this._OS.Windows81.test(string):
          this.Agent.isWindows = true;
          return 'Windows 8.1';
        case this._OS.Windows10.test(string):
          this.Agent.isWindows = true;
          return 'Windows 10.0';
        case this._OS.WindowsXP.test(string):
          this.Agent.isWindows = true;
          return 'Windows XP';
        case this._OS.Linux64.test(string):
          this.Agent.isLinux = true;
          this.Agent.isLinux64 = true;
          return 'Linux 64';
        case this._OS.Linux.test(string):
          this.Agent.isLinux = true;
          return 'Linux';
        case this._OS.ChromeOS.test(string):
          this.Agent.isChromeOS = true;
          return 'Chrome OS';
        case this._OS.OSXLion.test(string):
          this.Agent.isMac = true;
          return 'OS X Lion';
        case this._OS.OSXMountainLion.test(string):
          this.Agent.isMac = true;
          return 'OS X Mountain Lion';
        case this._OS.OSXMavericks.test(string):
          this.Agent.isMac = true;
          return 'OS X Mavericks';
        case this._OS.OSXYosemite.test(string):
          this.Agent.isMac = true;
          return 'OS X Yosemite';
        case this._OS.OSXElCapitan.test(string):
          this.Agent.isMac = true;
          return 'OS X El Capitan';
        case this._OS.MacOSSierra.test(string):
          this.Agent.isMac = true;
          return 'macOS Sierra';
        case this._OS.MacOSHighSierra.test(string):
          this.Agent.isMac = true;
          return 'macOS High Sierra';
        case this._OS.MacOSMojave.test(string):
          this.Agent.isMac = true;
          return 'macOS Mojave';
        case this._OS.Mac.test(string):
          this.Agent.isMac = true;
          return 'OS X';
        case this._OS.iPad.test(string):
          this.Agent.isiPad = true;
          return string.match(this._OS.iPad)[0].replace('_', '.');
        case this._OS.iPhone.test(string):
          this.Agent.isiPhone = true;
          return string.match(this._OS.iPhone)[0].replace('_', '.');
        case this._OS.Curl.test(string):
          this.Agent.isCurl = true;
          return 'Curl';
        case this._OS.Insomnia.test(string):
          this.Agent.isInsomnia = true;
          return 'Insomnia';
        case this._OS.iOS.test(string):
          this.Agent.isiPhone = true;
          return 'iOS';
        case this._OS.Electron.test(string):
          this.Agent.isElectron = true;
          return 'Electron';
        default:
          return 'unknown';
      }
    };

    this.getPlatform = function (string) {
      switch (true) {
        case this._Platform.Windows.test(string):
          return 'Microsoft Windows';
        case this._Platform.Mac.test(string):
          return 'Apple Mac';
        case this._Platform.Curl.test(string):
          return 'Curl';
        case this._Platform.Insomnia.test(string):
          return 'Insomnia';
        case this._Platform.Electron.test(string):
          this.Agent.isElectron = true;
          return 'Electron';
        case this._Platform.Android.test(string):
          this.Agent.isAndroid = true;
          return 'Android';
        case this._Platform.Linux.test(string):
          return 'Linux';
        case this._Platform.iPad.test(string):
          this.Agent.isiPad = true;
          return 'iPad';
        case this._Platform.iPod.test(string):
          this.Agent.isiPod = true;
          return 'iPod';
        case this._Platform.iPhone.test(string):
          this.Agent.isiPhone = true;
          return 'iPhone';
        case this._Platform.Samsung.test(string):
          this.Agent.isiSamsung = true;
          return 'Samsung';
        case this._Platform.iOS.test(string):
          return 'Apple iOS';
        default:
          return 'unknown';
      }
    };

    this.reset = function reset() {
      let ua = this;
      for(let key in ua.DefaultAgent) {
        ua.Agent[key] = ua.DefaultAgent[key];
      }
      return ua;
    };

    this.testMobile = function testMobile() {
      const ua = this;
      switch (true) {
        case ua.Agent.isWindows:
        case ua.Agent.isLinux:
        case ua.Agent.isMac:
        case ua.Agent.isChromeOS:
          ua.Agent.isDesktop = true;
          break;
        case ua.Agent.isAndroid:
        case ua.Agent.isSamsung:
          ua.Agent.isMobile = true;
          break;
        default:
      }
      switch (true) {
        case ua.Agent.isiPad:
        case ua.Agent.isiPod:
        case ua.Agent.isiPhone:
        case ua.Agent.isAndroid:
          ua.Agent.isMobile = true;
          ua.Agent.isDesktop = false;
          break;
        default:
      }
      // eslint-disable-next-line no-useless-escape
      if(/mobile|^ios\-/i.test(ua.Agent.source)) {
        ua.Agent.isMobile = true;
        ua.Agent.isDesktop = false;
      }
    };

    this.testTablet = function testTablet() {
      const ua = this;
      if(ua.Agent.isiPad || ua.Agent.isAndroidTablet) ua.Agent.isTablet = true
      if(/tablet/i.test(ua.Agent.source)) {
        ua.Agent.isTablet = true;
      }
    };

    this.testNginxGeoIP = function testNginxGeoIP(headers) {
      const ua = this;
      Object.keys(headers).forEach(function (key) {
        if(/^GEOIP/i.test(key)) {
          ua.Agent.geoIp[key] = headers[key];
        }
      });
    };

    this.testBot = function testBot() {
      const ua = this;
      const isBot = IS_BOT_REGEXP.exec(ua.Agent.source.toLowerCase());
      if(isBot) {
        ua.Agent.isBot = isBot[1];
      } else if(!ua.Agent.isAuthoritative) {
        // Test unauthoritative parse for `bot` in UA to flag for bot
        ua.Agent.isBot = /bot/i.test(ua.Agent.source);
      }
    };

    this.testAndroidTablet = function testAndroidTablet() {
      const ua = this;
      if(ua.Agent.isAndroid && !/mobile/i.test(ua.Agent.source)) {
        ua.Agent.isAndroidTablet = true;
      }
    };

    this.testWebkit = function testWebkit() {
      const ua = this;
      if(ua.Agent.browser === 'unknown' && /applewebkit/i.test(ua.Agent.source)) {
        ua.Agent.browser = 'Apple WebKit';
        ua.Agent.isWebkit = true;
      }
    };

    this.parse = function parse(source) {
      const ua = new UserAgent();
      ua.Agent.source = source.replace(/^\s*/, '').replace(/\s*$/, '');
      ua.Agent.os = ua.getOS(ua.Agent.source);
      ua.Agent.platform = ua.getPlatform(ua.Agent.source);
      ua.Agent.browser = ua.getBrowser(ua.Agent.source);
      ua.Agent.version = ua.getBrowserVersion(ua.Agent.source);
      ua.testBot();
      ua.testMobile();
      ua.testAndroidTablet();
      ua.testTablet();
      ua.testWebkit();
      return ua.Agent;
    };

    this.Agent = this.DefaultAgent;
    return this;
  };
  return new UserAgent();
}

module.exports = userAgent