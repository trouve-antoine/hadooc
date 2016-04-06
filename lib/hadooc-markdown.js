(function(){
  
var isServerSide = require('../utils/is-server-side')

var htmlEscape = require('../utils/html-escape')

module.exports = function Markdown(context){
  var conf = context.conf

  var markdown = function(l) {
    return markdown.marked(l, { renderer : markdown.renderer } )
  }

  if(isServerSide) {
    markdown.marked = require('marked');
  } else {
    markdown.marked = window.marked;
  }

  if(!markdown.marked) { throw 'Unable to load marked' }

  markdown.renderer = new markdown.marked.Renderer()
  markdown.renderer.code = function(data, language) {
    if(language) {
      if(conf.shouldHighlightCode) {
        data = context.highlight(language, data);
        context.nbOfHighlightedCodes ++;
      } else {
        data = htmlEscape(data)
      }
      return '<pre class="hljs code lang-' + language + '">'+data+'</pre>'
    } else {
      return '<code>' + data + '</code>'
    }
  }

  return markdown;
}

})()