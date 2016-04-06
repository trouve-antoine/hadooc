(function(){
  
function Highlight(context){
  var highlight = function(language, data) {
    return highlight.hljs.highlight(language, data).value
  }

  highlight.hljs = require('highlight.js');

  if(!highlight.hljs) { throw 'Unable to load highlight.js' }

  return highlight
}

module.exports = Highlight

})()