(function(){
  
var isServerSide = require('../utils/is-server-side')
  
function Highlight(context){
  var highlight = function(language, data) {
    return highlight.hljs.highlight(language, data).value
  }

  if(isServerSide) {
    highlight.hljs = require('highlight.js');
  } else {
    highlight.hljs = window.hljs;
  }

  if(!highlight.hljs) { throw 'Unable to load highlight.js' }

  return highlight
}

module.exports = Highlight

})()