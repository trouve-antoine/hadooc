(function(){
  
function Translate(context) {
  var conf = context.conf;

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

  // translate.localize = new require('localize')(localizedStrings)
  translate.localize = {
    setLocale: function(locale) {
      translate.localize.locale = locale
    },
    translate(s) {
      var ss = localizedStrings[s]
      if(!ss) { return s }
      return ss[translate.localize.locale] || s
    }
  }
  
  return translate;
}

module.exports = Translate

})()