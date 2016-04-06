if(typeof hadooc === 'undefined') {
  var hadooc = {}
}

if(typeof $ === 'undefined') {
  throw 'Unable to find jQuery'
}

hadooc.toc = { }

hadooc.toc.init = function(parent) {
  if(!parent) { parent = $("body") }
  var headings = $([])
  
  var selectElement = parent.find("nav.hadooc.toc > select")
  
  selectElement.find("option").each(function(i,e){
    var headingId = e.value
    var heading = document.getElementById(headingId)
    if(!heading) { throw 'Unable to find  the header with id: ' + headingId }
    headings.push(heading)
  })
  
  selectElement.change(function(){
    var headingId = $(this).val()
    var heading = document.getElementById(headingId)
    heading && heading.scrollIntoView()
  })
  
  $(window).on("scroll", function(){
    var lastVisitedHeading = null
    headings.each(function(i,heading){
      heading = $(heading)
      var headingPositionInWindow = heading.offset().top - $(window).scrollTop()
      var isAboveWindow = headingPositionInWindow < 0
      var isUnderWindow = headingPositionInWindow > $(window).height()/6
      if(isUnderWindow) { return false }
      lastVisitedHeading = heading
      if(isAboveWindow) { return true }
      // is visible
      return true
    })
    if(!lastVisitedHeading) { lastVisitedHeading = $(headings[0]) }
    var currentHeadingId = lastVisitedHeading.attr('id')
    selectElement.val(currentHeadingId)
  })
}
