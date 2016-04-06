if(typeof hadooc === 'undefined') {
  var hadooc = {}
}

if(typeof $ === 'undefined') {
  throw 'Unable to find jQuery'
}

hadooc.flowcharts = { }

hadooc.flowcharts.init = function(parent) {
  if(!parent) { parent = $("body") }
  
  parent.find(".source-code.flowchart").each(function(id, e) { flowchart.parse(e.value).drawSVG($(e).next().attr("id")) })
}