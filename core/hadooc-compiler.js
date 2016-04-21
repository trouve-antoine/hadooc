(function(){
  
var HadoocConfiguration = require('../lib/hadooc-configuration')

var Highlight = require('../lib/hadooc-highlight')

var Markdown = require('../lib/hadooc-markdown')

var debug = require('../utils/debug')

var htmlEscape = require('../utils/html-escape')

var Translate = require('../lib/hadooc-translate')

function httpApiDocumentationCompiler(lines, conf){
  if(lines.constructor==Array) {
    // OK
  } else if(lines.constructor==String) {
    lines = lines.split("\n")
  } else {
     throw 'Please specify an array or a string in input.'
  }

  if( (conf === undefined) || (conf.constructor !== HadoocConfiguration) ) {
    conf = new HadoocConfiguration(conf)
  }

  var outputLines = []
  var context = {
    nbOfSequenceDiagrams: 0,
    nbOfFlowcharts: 0,
    nbOfUmlDiagrams: 0,
    nbOfHighlightedCodes: 0,
    conf: conf
  }

  var highlight = new Highlight(context)
  var markdown = new Markdown(context)
  var translate = new Translate(context)

  context.highlight = highlight
  context.markdown = markdown

  if(conf.debug) {
    debug.print = function(s) { console.log(s) }
  }

  debug.print("Configuration is: ")
  debug.print(conf)



  function includes(s,p){ return s.indexOf(p) != -1 }
  function startsWith(s,p){ return s.slice(0,p.length)==p }
  function contentAfter(s,p){ return s.slice(p.length) }

  var prefix = {};
  prefix.isMetadataMarker = function(l) { return l === "---" }
  prefix.isApiSection = function(l){ return startsWith(l,"** ") }
  prefix.isApi = function(l){ return startsWith(l, "{api}") }
  prefix.isParameter = function(l) { return /{d?(!\$|\?\$|\$|!|\?)|\-}/.test(l) }
  prefix.isEnum = function(l) { return startsWith(l, "{-:") || startsWith(l, "{=:") }
  prefix.isHttpCode = function(l){ return startsWith(l, "{http:") }
  prefix.isApiEnd = function(l) { return (l=="**") }
  prefix.isSourceCode = function(l){ return /^\s*{code:(.*)}\s*$/g.exec(l) }
  prefix.isSingleLineComment = function(l) { return /----\s*({([\w]+)}\s+)?(.*)/g.exec(l) }

  var field = {};
  field.apiSectionName = function(l){ return contentAfter(l, "** ") }
  field.api = function(l){
    var lAfter = contentAfter(l,"{api}").trim()
    var spaceAt = lAfter.indexOf(conf.separator)
    var httpVerb = lAfter.slice(0,spaceAt)
    var url = htmlEscape(lAfter.slice(spaceAt+1))
    if(httpVerb==="") { throw 'Empty HTTP verb in ' + l }
    var api = {
      type: 'api',
      verb: httpVerb,
      url: url
    }
    debug.print("Adds API: " + api)
    return api
  }
  field.parameter = function(data) {
    var braceAt = data.indexOf('}')
    var prefix = data.slice(0,braceAt+1)
    data = data.slice(braceAt+1).trim()
    var spaceAt = data.indexOf(conf.separator)
    var paramName = data.slice(0, spaceAt).trim()
    data = data.slice(spaceAt).trim()
    spaceAt = data.indexOf(conf.separator)
    var paramType = data.slice(0, spaceAt).trim()
    data = data.slice(spaceAt).trim()
    var parameter = {
      type: 'param',
      name: paramName,
      paramType: paramType,
      desc: data,
      isMandatory: includes(prefix, "!"),
      isProtected: includes(prefix, "$"),
      isOptional:  includes(prefix, "?"),
      isDeprecated:  includes(prefix, "d")
    }
    debug.print("Adds parameter: " + parameter)
    return parameter
  }
  field.httpCode = function(l) {
    var cbraceAt = l.indexOf('} ')
    var ss = l.slice(1,cbraceAt).split(':')
    var desc = l.slice(cbraceAt+1)
    if(ss.length==2) {
      return {
        type: 'httpCode',
        code: parseInt(ss[1]),
        desc: desc
      }
    } else if(ss.length==3) {
      return {
        type: 'httpCode',
        code: parseInt(ss[1]),
        xCode: parseInt(ss[2]),
        desc: desc
      }
    } else {
      throw 'Bad http code in: ' + l + ' (expected to start with "{http:<code>}" or "{http:<code>:<xcode>}")'
    }
  }
  field.enum = function(l) {
    // var cbraceAt = l.indexOf('} ')
    // var ss = l.slice(1,cbraceAt).split(':')
    var ss = /{(.):(.+)}/g.exec(l)
    if(!ss) { throw 'Bad value code in: ' + l + ' (expected: "{-:xxx} hoge" or "{-:xxx}")' }

    return {
      type: 'enum',
      value: ss[2],
      desc: l.slice(ss[0].length),
      xtype: ss[1] == "-" ? "verb" : "bold",
    }
  }

  field.sourceCode = function(language, data) {
    return {
      type: 'sourceCode',
      language: language,
      data: data
    }
  }

  var pushMetadata = function(l, metadata) {
    var matches = /([a-zA-z0-1\-_]+):(.*)/g.exec(l)
    if(!matches) { throw "Unable to parse the metadata line: " + l }
    var key = matches[1].toLowerCase()
    var value = matches[2]
    metadata[key] = value
    if(key === 'hadooc-conf') {
      // A magic regexp from stackoverflow.com/questions/9637517/parsing-relaxed-json-without-eval
      var jsonValue = value.replace(/(['"])?([a-z0-9A-Z_]+)(['"])?:/g, '"$2": ');
      var metaConf;
      try {
        metaConf = JSON.parse(jsonValue);
      } catch(e) {
        throw 'Unable to parse hadooc-conf metadata: ' + value + ". The error was: " + e.message
      }
      for(var confKey in metaConf) {
        var confValue = metaConf[confKey]
        context.conf[confKey] = confValue
      }
    }
  }

  var printApiSectionAsArray = function(apiSection, previousSection, nextSection, pushHeading) {
    var lines = []

    var isApiSection = apiSection.name
    var hasPreviousSection = previousSection && (previousSection.name !== undefined)
    var hasNextSection = nextSection && (nextSection.name !== undefined)

    if( !hasPreviousSection && isApiSection) { lines.push('<table class="hadooc api">') }

    if(isApiSection) {
      lines = lines.concat([
        '<tr>',
        '<td>'+apiSection.name+'</td>',
        '<td>'
      ])
    }

    for(var i=0; i<apiSection.contents.length; i++) {
      var newLines = printApiSectionContentAsArray(
        apiSection.contents[i],
        apiSection.contents[i-1],
        apiSection.contents[i+1],
        pushHeading)
      if(newLines.constructor!==Array) { throw 'I should have had an array !' }
      lines = lines.concat(newLines)
    }

    if(isApiSection) {
      lines = lines.concat([
        '</td>',
        '</tr>'
      ])
    }

    if( !hasNextSection && isApiSection ) { lines.push('</table>') }

    return lines
  }

  var printApiSectionContentAsArray = function(content, previousContent, nextContent, pushHeading) {
    var previousContentType = previousContent && previousContent.type
    var nextContentType = nextContent && nextContent.type

    var lines = [ ]

    // Start tables if necessary
    if(previousContentType!=content.type){
      switch(content.type) {
      case 'httpCode':
        lines.push('<table class="hadooc http-status-codes">')
        break;
      case 'param':
        lines.push('<table class="hadooc params">')
        break;
      case 'string':
        // Nothing
        break;
      case 'heading':
        // Nothing
        break;
      case 'comment':
        // Nothing
        break;
      case 'api':
        // Nothing
        break;
      case 'enum':
        lines.push('<table class="hadooc enum">')
        break;
      case 'sourceCode':
        // Nothing
        break;
      default:
        throw('Unknown content type: ' + content.type)
      }
    }

    switch(content.type){
    case 'api':
      lines.push('<p><span class="http-verb">'+content.verb+'</span><span class="url">'+htmlEscape(content.url)+'</span></p>')
      break;
    case 'httpCode':
      var variantClassName = ''
      switch(content.code.toString()[0]){
        case '1':
        case '3':
          variantClassName = 'misc'
          break;
        case '4':
        case '5':
          variantClassName = 'error'
          break;
      }
      var small = ""
      if(content.xCode !== undefined) {
        small = "<small>" + translate("extended code") + ":"+content.xCode+"</small><br>"
      }
      lines.push('<tr><td><span class="http-status-code '+variantClassName+'">'+content.code+'</span></td><td>'+small+markdown(content.desc)+'</td></tr>')
      break;
    case 'param':
      var smallTexts = []
      if(content.isMandatory) { smallTexts.push(translate("mandatory")) }
      if(content.isProtected) { smallTexts.push(translate("protected")) }
      if(content.isOptional ) { smallTexts.push(translate("optional")) }
      if(content.isDeprecated ) { smallTexts.push(translate("deprecated")) }
      var smallText = (smallTexts.length != 0) && ("<small>"+smallTexts.join("<br>")+"</small>")
      lines.push('<tr><td>'+content.name+'<br>'+smallText+'</td><td>'+markdown(content.paramType)+'</td><td>'+markdown(content.desc)+'</td></tr>')
      break;
    case 'string':
      if(content.data.trim()!='') {
        // lines.push('<p>'+markdown(content.data)+'</p>')
        lines.push(markdown(content.data))
      }
      break;
    case 'heading':
      var heading = pushHeading(content)
      lines.push(markdown("<h" + (1+heading.level) + ' id="' + heading.id + '">' + heading.label + '</h' + (1+heading.level) + '>'))
      break;
    case 'comment':
      if(conf.shouldDisplayComments) {
        if(content.tag) {
          lines.push('<p class="comment ' + content.tag.toLowerCase() + '"><span class="comment-tag">' + content.tag + "</span> " + content.data + '</p>')
        } else {
          lines.push('<p class="comment anonymous">' + content.body + '</p>')
        }
      }
      break;
    case 'sourceCode':
      switch(content.language){
      case "flowchart":
        context.nbOfFlowcharts = context.nbOfFlowcharts + 1 || 1
        lines.push('<textarea class="source-code flowchart" style="display:none">\n' + content.data + '\n</textarea>')
        lines.push('<div class="code flowchart" id="flowchart' + context.nbOfFlowcharts + '"></div>')
        break
      case "sequence":
        context.nbOfSequenceDiagrams = context.nbOfSequenceDiagrams + 1 || 1
        lines.push('<textarea class="source-code sequenceDiagrams" style="display:none">\n' + content.data + '\n</textarea>')
        lines.push('<div class="code sequenceDiagrams" id="sequence' + context.nbOfSequenceDiagrams + '"></div>')
        break
      case "uml":
        context.nbOfUmlDiagrams = context.nbOfUmlDiagrams + 1 || 1
        lines.push('<textarea class="source-code umlDiagrams" style="display:none">\n' + content.data + '\n</textarea>')
        lines.push('<canvas class="code umlDiagrams" id="sequence' + context.nbOfUmlDiagrams + '"></canvas>')
        break
      default:
        debug.print('Unknown language in {code} element: ' + content.language + '. Use a markdown ```` element instead.')
        lines.push(markdown("````" + content.language + "\n" + content.data + "\n````"))
      }

      break;
    case 'enum':
      lines.push('<tr><td><span class="value ' + content.xtype + '">'+content.value+'</span></td><td>'+markdown(content.desc)+'</td></tr>')
      break;
    default:
      throw('Unknown content type: ' + content.type)
    }

    // Ends tables if necessary
    if(nextContentType!=content.type){
      switch(content.type) {
      case 'httpCode':
        lines.push('</table>')
        break;
      case 'param':
        lines.push('</table>')
        break;
      case 'string':
        // Nothing
        break
      case 'heading':
        // Nothing
        break
      case 'comment':
        // Nothing
        break
      case 'api':
        // Nothing
        break;
      case 'sourceCode':
        // Nothing
        break;
      case 'enum':
        lines.push('</table>')
        break;
      default:
        throw('Unknown content type: ' + content.type)
      }
    }

    return lines
  }

  var headingsTreeRoot = { parent: null, children: [], level:0, heading: null, label: null }
  var pushHeading = function(heading) {
    // heading = { type: 'heading', level: 3, data: "### hoge" }
    var lastNode = pushHeading.lastNode
    var parent = lastNode
    while(parent.level > heading.level-1) { parent = parent.parent }
    var id = "heading" + (pushHeading.nextHeadingNb++)
    var newNode = { parent: parent, children: [], level:heading.level, heading: heading, label: heading.data.substring(heading.level).trim(), id: id }
    parent.children.push(newNode)
    pushHeading.lastNode = newNode
    return newNode
  }
  var printHeadingNode = function(node) {
    if(node.heading) {
      return '<option value="' + node.id + '">' + node.heading.data + '</option>'
    } else {
      return undefined
    }
  }
  pushHeading.lastNode = headingsTreeRoot
  pushHeading.nextHeadingNb = 0
  var printHeadingTree = function(node) {
    if(node == null) { node = headingsTreeRoot; var lines = [] }
    else { var lines = [ printHeadingNode(node) ] }
    for(var i=0; i<node.children.length; i++) {
      var child = node.children[i]
      lines = lines.concat(printHeadingTree(child))
    }
    return lines
  }

  var currentApiSection, apiSections, otherLines
  var pushOtherLine = function(line) {
    if(!otherLines) {
      otherLines = [line]
    } else {
      otherLines.push(line)
    }
  }
  var flushOtherLines = function() {
    if(otherLines) {
      outputLines.push(markdown(otherLines.join("\n")))
      otherLines = undefined
    }
  }
  var flushApiSections = function(){
    pushCurrentApiSection()
    if(apiSections===undefined) { return }
    for(var i=0; i<apiSections.length; i++) {
      outputLines = outputLines.concat(printApiSectionAsArray(
        apiSections[i],
        apiSections[i-1],
        apiSections[i+1],
        pushHeading))
    }
    apiSections = undefined
  }
  var pushCurrentApiSection = function(){
    if(currentApiSection!==undefined) {
      if(apiSections===undefined) {
        apiSections = [currentApiSection]
      } else {
        apiSections.push(currentApiSection)
      }
      currentApiSection = undefined
    }
  }
  var pushApiSectionContent = function(content) {
    if(currentApiSection===undefined) { throw 'Unable to push API content: no current API section' }
    var previousContent = currentApiSection.contents[currentApiSection.contents.length-1]
    if(previousContent){
      if(content.type==='string' && previousContent.type==='string') {
        previousContent.data += '\n' + content.data
      } else {
        currentApiSection.contents.push(content)
      }
    } else {
      currentApiSection.contents.push(content)
    }
  }

  var processHadoocLine = function(l, i) {
    if(!currentApiSection) {
      debug.print("New headless section")
      currentApiSection = { contents: [] }
    }

    var isInsideApiSection = (currentApiSection.name !== undefined)
    var lm; // used for matching isXXX functions

    if(prefix.isApi(l)) {
      pushApiSectionContent(field.api(l))
    } else if(prefix.isHttpCode(l)) {
      var pData = l
      for(var j=i+1; j<lines.length ;j++){
        var jl = lines[j]
        if(jl=="") { break }
        else if(jl[0]==='{') { break } // }
        else if(jl[0]==='#') { break }
        else { pData += '\n'+jl }
      }
      i = j-1
      pushApiSectionContent(field.httpCode(pData))
    } else if(prefix.isEnum(l)) {
      var pData = l
      for(var j=i+1; j<lines.length ;j++){
        var jl = lines[j]
        if(jl=="") { break }
        else if(jl[0]==='{') { break } // }
        else if(jl[0]==='#') { break }
        else { pData += '\n'+jl }
      }
      i = j-1
      pushApiSectionContent(field.enum(pData))
    } else if(prefix.isParameter(l)) {
      var pData = l
      var wasList = false
      for(var j=i+1; j<lines.length ;j++){
        var jl = lines[j]
        if(jl=="") { break }
        else if(jl[0]=='{') { break } // }
        else if(jl[0]=='#') { break }
        else { pData += '\n' + jl }
      }
      if(wasList) { pData += '</ul>'; wasList=false }
      i = j-1
      pushApiSectionContent(field.parameter(pData))
    } else if(prefix.isApiEnd(l)) {
      flushApiSections()
      if(outputLines.constructor !== Array) { throw 'Outputlines is not an array !' }
    } else if(startsWith(l, "#") && isInsideApiSection) {
      flushApiSections()
      i--
    } else if(startsWith(l,'#') && !isInsideApiSection) {
      var nbSharp=0
      for(nbSharp=0; l[nbSharp]=='#'; nbSharp++);
      // theLine = '<h'+(nbSharp+1)+'>'+l.slice(nbSharp)+'</h'+(nbSharp+1)+'>'
      pushApiSectionContent({ type: 'heading', level: nbSharp, data: l })
    } else if(lm = prefix.isSourceCode(l)) {
      var language = lm[1]
      var pDataArray = []
      for(i=i+1; i<lines.length ;i++){
        var ll = lines[i]
        if(ll==="{/code}") { break }
        else {
          var sourceCodeLine = lines[i]
          pDataArray.push(sourceCodeLine)
        }
      }
      pushApiSectionContent(field.sourceCode(language, pDataArray.join('\n')))
    } else if(lm = prefix.isSingleLineComment(l)) {
      var commentTag = lm[2]
      var commentBody = lm[3]
      pushApiSectionContent({ type: 'comment', tag: commentTag, data: commentBody })
    } else {
      pushApiSectionContent({ type: 'string', data: lines[i] })
    }

    return i
  }

  var insideMetadata = false
  var metadata = undefined
  for(var i=0; i<lines.length; i++) {
    var l = lines[i].trim()

    if(metadata === undefined) {
      metadata = {}
      if(prefix.isMetadataMarker(l)) { insideMetadata = true }
      else { i--; }
    } else if(insideMetadata) {
      if(prefix.isMetadataMarker(l)) { insideMetadata = false }
      else {
        pushMetadata(l, metadata)
      }
    } else if(prefix.isApiSection(l)) {
      flushOtherLines()
      pushCurrentApiSection()
      currentApiSection = { name: field.apiSectionName(l), contents: [] }
      debug.print("New section: " + currentApiSection)
    } else {
      // debug.print("Line " + i + ": " + l)
      i = processHadoocLine(l, i)
    }
    //console.log(currentApiSection)
  }

  flushApiSections()

  if(conf.shouldPrintToc) {
    outputLines.push('<nav class="hadooc toc"> <select>')
    outputLines = outputLines.concat(printHeadingTree())
    outputLines.push('</select></nav>')
  }

  if(!outputLines || outputLines.constructor !== Array) { throw 'Outputlines is not an array !' }

  return { metadata: metadata,  outputLines: outputLines, context: context }
}

module.exports = httpApiDocumentationCompiler;

})()