if(typeof hadooc === 'undefined') {
  var hadooc = {}
}

if(typeof $ === 'undefined') {
  throw 'Unable to find jQuery'
}

hadooc.umlDiagrams = { }

hadooc.umlDiagrams.init = function(parent) {
  if(!parent) { parent = $("body") }
  parent.find(".source-code.umlDiagrams").each(function(id, e) { nomnoml.draw($(e).next()[0], e.value) })
}