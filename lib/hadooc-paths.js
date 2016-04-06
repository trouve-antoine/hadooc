(function(){
  
var path = require('../utils/path')
  
module.exports = (function(){
  var paths = {}
  // Defines homeFolder
  if(typeof __filename === 'undefined') {
    paths.homeFolder = "."
  } else {
    paths.homeFolder = path.join(path.dirname(__filename), "..")
  }
  // The theme folder
  paths.themes = path.join(paths.homeFolder, "themes")
  // The hljs css folder
  paths.hljsThemes = path.join(paths.homeFolder, "node_modules", "highlight.js", "styles")
  
  return paths
})()
  
})()