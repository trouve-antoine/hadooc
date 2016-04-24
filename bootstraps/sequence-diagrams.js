if(typeof hadooc === 'undefined') {
  var hadooc = {}
}

if(typeof $ === 'undefined') {
  throw 'Unable to find jQuery'
}

hadooc.sequenceDiagrams = { }

hadooc.sequenceDiagrams.init = function(parent) {
  if(!parent) { parent = $("body") }
  
  parent.find(".source-code.sequenceDiagrams").each(function(id, e) {
    var targetId = $(e).next().attr("id")
    console.log("Print a sequence diagram to #" + targetId)
    Diagram.parse(e.value).drawSVG(targetId, { theme:"simple" } )
  })
}
