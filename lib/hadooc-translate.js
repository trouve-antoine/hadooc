(function(){
  
var isServerSide = require('../utils/is-server-side')

function Translate(context) {
  var conf = context.conf;

  if(!isServerSide) {
    return function(s) { return s; }
  }

  var translate = function(s) {
    translate.localize.setLocale(conf.locale || "en")
    return translate.localize.translate(s)
  }

  var localizedStrings = {
    "optional": {
      "ja": "省略可能",
    },
    "mandatory": {
      "ja": "必須",
    },
    "protected": {
      "ja": "認証必須"
    },
    "extended code": {
      "ja": "拡張ステータス"
    },
    "Table of contents": {
      "ja": "目次"
    },
    "level": {
      "ja": "レベル"
    }
  }

  translate.localize = new require('localize')(localizedStrings)
  
  return translate;
}

module.exports = Translate

})()