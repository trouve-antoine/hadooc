#! /usr/bin/env node

// configuration = {
//    separator: " "
// }
//


function httpApiDocumentationCompiler(lines, conf){
  if(lines.constructor!=Array) { throw 'Please specify an array of lines in input.' }

  if(!conf) {
    conf = {
      separator: "    "
    }
  }

  var outputLines = []

  var debug = function(s){};
  if(conf.debug) {
    debug = function(s) { console.log(s) }
  }

  // Gets marked from node.js or the browser
  var marked = marked || require('marked');
  if(!marked) { throw 'Unable to load marked.' }

  var localize = new require('localize')({
    "optional": {
      "ja": "省略可能",
    },
    "mandatory": {
      "ja": "必須",
    },
    "protected": {
      "ja": "認証必須"
    },
    "extended code": {
      "ja": "拡張ステータス"
    }
  })
  localize.setLocale(conf.locale || "en")

  function translate(s) { return localize.translate(s) }

  function includes(s,p){ return s.indexOf(p) != -1 }
  function startsWith(s,p){ return s.slice(0,p.length)==p }
  function contentAfter(s,p){ return s.slice(p.length) }

  // http://stackoverflow.com/questions/1219860/html-encoding-in-javascript-jquery
  function htmlEscape(str) {
    return String(str)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
  }

  var prefix = {};
  prefix.isMetadataMarker = function(l) { return l === "---" }
  prefix.isApiSection = function(l){ return startsWith(l,"** ") }
  prefix.isApi = function(l){ return startsWith(l, "{api}") }
  prefix.isParameter = function(l) { return /{!\$|\?\$|\$|!|\?|\-}/.test(l) }
  prefix.isEnum = function(l) { return startsWith(l, "{-:") || startsWith(l, "{=:") }
  prefix.isHttpCode = function(l){ return startsWith(l, "{http:") }
  prefix.isApiEnd = function(l) { return (l=="**") }
  prefix.isSourceCode = function(l){ return startsWith(l, "{code:") }

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
    debug("Adds API: " + api)
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
      isOptional:  includes(prefix, "?")
    }
    debug("Adds parameter: " + parameter)
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
      throw 'Bad http code in: ' + l + ' (expected to start with {http:<code>} or {http:<code>:<xcode>})'
    }
  }
  field.enum = function(l) {
    var cbraceAt = l.indexOf('} ')
    var ss = l.slice(1,cbraceAt).split(':')
    if(ss.length!==2) { throw 'Bad value code in: ' + l + ' (expected: {-:xxx} hoge)' }
    var value = ss[1]
    return {
      type: 'enum',
      value: value,
      desc: l.slice(cbraceAt+1),
      xtype: ss[0] == "-" ? "verb" : "bold",
    }
  }

  field.sourceCode = function(data) {
    return {
      type: 'sourceCode',
      sourceCode: data
    }
  }

  var pushMetadata = function(l, metadata) {
    var matches = /([a-zA-z0-1\-_]+):(.*)/g.exec(l)
    if(!matches) { throw "Unable to parse the metadata line: " + l }
    var key = matches[1].toLowerCase()
    var value = matches[2]
    metadata[key] = value
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
      lines.push('<tr><td><span class="http-status-code '+variantClassName+'">'+content.code+'</span></td><td>'+small+marked(content.desc)+'</td></tr>')
      break;
    case 'param':
      var smallTexts = []
      if(content.isMandatory) { smallTexts.push(translate("mandatory")) }
      if(content.isProtected) { smallTexts.push(translate("protected")) }
      if(content.isOptional ) { smallTexts.push(translate("optional")) }
      smallText = (smallTexts.length != 0) && ("<small>"+smallTexts.join("<br>")+"</small>")
      lines.push('<tr><td>'+content.name+'<br>'+smallText+'</td><td>'+marked(content.paramType)+'</td><td>'+marked(content.desc)+'</td></tr>')
      break;
    case 'string':
      if(content.data.trim()!='') {
        // lines.push('<p>'+marked(content.data)+'</p>')
        lines.push(marked(content.data))
      }
      break;
    case 'heading':
      lines.push(marked("#" + content.data.trim()))
      pushHeading(content)
      break;
    case 'sourceCode':
      lines.push('<pre class="code">'+htmlEscape(content.sourceCode)+'</pre>')
      break;
    case 'enum':
      lines.push('<tr><td><span class="value ' + content.xtype + '">'+content.value+'</span></td><td>'+marked(content.desc)+'</td></tr>')
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

  var headingsTreeRoot = { parent: null, children: [], level:0, heading: null }
  var pushHeading = function(heading) {
    // heading = { type: 'heading', level: nbSharp, data: l }
    var lastNode = pushHeading.lastNode
    var parent = lastNode
    while(parent.level > heading.level-1) { parent = parent.parent }
    var newNode = { parent: parent, children: [], level:heading.level, heading: heading }
    parent.children.push(newNode)
    pushHeading.lastNode = newNode
  }
  var printHeadingNode = function(node) {
    if(node.heading) {
      return "<!-- level " + node.level + " / " + node.heading.data + " -->"
    } else {
      return "<!-- Table of contents -->"
    }
  }
  pushHeading.lastNode = headingsTreeRoot
  var printHeadingTree = function(node) {
    if(node == null) { node = headingsTreeRoot }
    var lines = [ printHeadingNode(node) ]
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
      outputLines.push(marked(otherLines.join("\n")))
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
      debug("New headless section")
      currentApiSection = { contents: [] }
    }

    var isInsideApiSection = (currentApiSection.name !== undefined)

    if(prefix.isApi(l)) {
      pushApiSectionContent(field.api(l))
    } else if(prefix.isHttpCode(l)) {
      var pData = l
      for(var j=i+1; j<lines.length ;j++){
        var jl = lines[j].trim()
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
        var jl = lines[j].trim()
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
        var jl = lines[j].trim()
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
    } else if(prefix.isSourceCode(l)) {
      var pDataArray = []
      for(i=i+1; i<lines.length ;i++){
        var ll = lines[i].trim()
        if(ll==="{/code}") { break }
        else {
          var sourceCodeLine = lines[i]
          pDataArray.push(sourceCodeLine)
        }
      }
      pushApiSectionContent(field.sourceCode(pDataArray.join('\n')))
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
    } else if(insideMetadata) {
      if(prefix.isMetadataMarker(l)) { insideMetadata = false }
      else {
        pushMetadata(l, metadata)
      }
    } else if(prefix.isApiSection(l)) {
      flushOtherLines()
      pushCurrentApiSection()
      currentApiSection = { name: field.apiSectionName(l), contents: [] }
      debug("New section: " + currentApiSection)
    } else {
      debug("Line " + i + ": " + l)
      i = processHadoocLine(l, i)
    }
    //console.log(currentApiSection)
  }

  flushApiSections()

  outputLines = outputLines.concat(printHeadingTree())

  if(!outputLines || outputLines.constructor !== Array) { throw 'Outputlines is not an array !' }

  return { metadata: metadata,  outputLines: outputLines }
}

function processStdin(hadoocConf, callback){
  charset = (hadoocConf && hadoocConf.charset) || 'utf8'

  process.stdin.setEncoding(charset);

  var dataFromStdin = ""
  process.stdin.on('readable', function() {
    var chunk = process.stdin.read();
    if (chunk !== null) {
      dataFromStdin += chunk
    }
  });

  process.stdin.on('end', function() {
    var dataLines = dataFromStdin.split("\n")
    var compiled = httpApiDocumentationCompiler(dataLines, hadoocConf)
    wrapHtmlBody(compiled.metadata, compiled.outputLines, hadoocConf, callback)
  });
}

// hadooCconf: additionaly to the parameters from httpApiDocumentationCompiler, accepts the text charset string in charset (default to 'utf8')
function processFile(inputFilePath, hadoocConf, callback) {
  charset = (hadoocConf && hadoocConf.charset) || 'utf8'

  require('fs').readFile(inputFilePath, charset, function(err, data){
    if(err) { throw err.message }
    var dataLines = data.split("\n")
    var compiled = httpApiDocumentationCompiler(dataLines, hadoocConf)
    wrapHtmlBody(compiled.metadata, compiled.outputLines, hadoocConf, callback)
  })
}

function wrapHtmlBody(metadata, bodyLines, hadoocConf, callback) {
  var embeddedCssPath = hadoocConf.embeddedCssPath
  var externalCssUrl = hadoocConf.externalCssUrl

  var title = metadata.title || 'HTTP API Documentation'
  var subTitle = metadata.subtitle || metadata['sub-title']
  var date = metadata.date
  var version = metadata.version

  var htmlPrefixLines = [
    '<!doctype html>',
    '<html>',
    '<head>',
    '  <meta charset="utf-8">',
    '  <title>' + title + '</title>'
  ]

  if(externalCssUrl) {
    htmlPrefixLines.push('<link rel="stylesheet" href="' + externalCssUrl + '">')
  }

  var titleStr = title

  if(subTitle) {
    titleStr += '<br><small class="sub-title">' + subTitle + '</small>'
  }
  if(version) {
    titleStr += '<br><small class="version">v.' + version + '</small>'
  }
  if(date) {
    titleStr += '<br><small class="date">' + date + '</small>'
  }

  var linesAfterCss = [
    '</head>',
    '<body>',
    '<h1>' + titleStr + '</h1>'
  ].concat(
    bodyLines,
    [ '</body>', '</html>']
  )

  if(embeddedCssPath) {
    htmlPrefixLines.push('<style>')
    require('fs').readFile(embeddedCssPath, charset, function(err, data){
      if(err) { throw err.message }
      htmlPrefixLines.push(data)
      htmlPrefixLines.push('</style>')
      htmlPrefixLines = htmlPrefixLines.concat(linesAfterCss)
      callback.call(null, htmlPrefixLines)
    })
  } else {
    htmlPrefixLines = htmlPrefixLines.concat(linesAfterCss)
    callback.call(null, htmlPrefixLines)
  }
}

module.exports = {
  processStdin: processStdin,
  processFile: processFile
}

// processStdin( { separator: "    " } )
