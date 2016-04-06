if(typeof hadooc === 'undefined') {
  var hadooc = {}
}

if(typeof $ === 'undefined') {
  throw 'Unable to find jQuery'
}

hadooc.sequenceDiagrams = { }

hadooc.sequenceDiagrams.init = function(parent) {
  if(!parent) { parent = $("body") }
  
  parent.find(".source-code.sequenceDiagrams").each(function(id, e) { Diagram.parse(e.value).drawSVG($(e).next().attr("id"), { theme:"simple" } ) } )
}