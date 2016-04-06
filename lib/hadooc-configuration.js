(function(){
  
var path = require('../utils/path')
var hadoocPaths = require('../lib/hadooc-paths')
  
var baseObject = function(conf) {
  if(conf) {
    for(var key in conf) {
      var value = conf[key]
      this[key] = value
    }
  }
}

function addValueDefault(key, value) {
  Object.defineProperty(baseObject.prototype, key, {
    value: value,
    writable: true,
    configurable: false,
    enumerable: true
  })  
}

function addGetSetDefault(key, getter, setter) {
  Object.defineProperty(baseObject.prototype, key, {
    configurable: false,
    enumerable: true,
    get: getter,
    set: setter
  })
}

// default values

addValueDefault('charset', 'utf8')
addValueDefault('separator', '    ')
addValueDefault('embeddedHadoocTheme', 'default')
addValueDefault('externalCssUrl', undefined)
addValueDefault('locale', 'en')
addValueDefault('debug', false)
addValueDefault('shouldDisplayComments', false)
addValueDefault('shouldHighlightCode', false)
addValueDefault('highlightTheme', 'sunburst')
addValueDefault('shouldPrintToc', false)

addGetSetDefault('highlightCssPath',
  function() {
    if(this._highlightCssPath) { return this._highlightCssPath; }
    else {
      return this.highlightTheme && path.join(hadoocPaths.hljsThemes, this.highlightTheme + ".css")
    }
  },
  function(value) {
    this._highlightCssPath = value
  })
  
addGetSetDefault('embeddedCssPath',
  function() {
    if(this._embeddedCssPath) { return this._embeddedCssPath; }
    else {
      return this.embeddedHadoocTheme && path.join(hadoocPaths.themes, this.embeddedHadoocTheme + ".css")
    }
  },
  function(value) {
    this._embeddedCssPath = value
  })

module.exports = baseObject

})()