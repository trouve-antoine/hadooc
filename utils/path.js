(function(){
 
 module.exports = (function(){
  if(typeof require === 'undefined') {
    return { join: function(){ return makeArray(arguments).join("/") } }
  } else {
    return require('path')
  }
})()
  
})()