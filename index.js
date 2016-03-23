#! /usr/bin/env node

// configuration = {
//    separator: " "
// }
//


function httpApiDocumentationCompiler(lines, conf){
  if(!conf) {
    conf = {
      separator: "    "
    }
  }

  var outputLines = []

  // Gets marked from node.js or the browser
  var marked = marked || require('marked');
  if(!marked) { throw 'Unable to load marked.' }

  if(lines.constructor!=Array) { throw 'Please specify an array of lines in input.' }

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
  prefix.isParameter = function(l) { return /{!\$|\?\$|!|\?|\-}/.test(l) }
  prefix.isEnum = function(l) { return startsWith(l, "{-:") }
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
    return {
      type: 'api',
      verb: httpVerb,
      url: url
    }
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
    return {
      type: 'param',
      name: paramName,
      paramType: paramType,
      desc: data,
      isMandatory: includes(prefix, "!"),
      isProtected: includes(prefix, "$"),
      isOptional:  includes(prefix, "?")
    }
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
      desc: l.slice(cbraceAt+1)
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

  var printApiSectionAsArray = function(apiSection, previousSection, nextSection) {
    var lines = []

    if(previousSection===undefined) { lines.push('<table class="api">') }

    lines = lines.concat([
      '<tr>',
      '<td>'+apiSection.name+'</td>',
      '<td>'
    ])

    for(var i=0; i<apiSection.contents.length; i++) {
      var newLines = printApiSectionContentAsArray(
        apiSection.contents[i],
        apiSection.contents[i-1],
        apiSection.contents[i+1])
      if(newLines.constructor!==Array) { throw 'I should have had an array !' }
      lines = lines.concat(newLines)
    }

    lines = lines.concat([
      '</td>',
      '</tr>'
    ])

    if(nextSection===undefined) { lines.push('</table>') }

    return lines
  }

  var printApiSectionContentAsArray = function(content, previousContent, nextContent) {
    var previousContentType = previousContent && previousContent.type
    var nextContentType = nextContent && nextContent.type

    var lines = [ ]

    // Start tables if necessary
    if(previousContentType!=content.type){
      switch(content.type) {
      case 'httpCode':
        lines.push('<table class="http-status-codes">')
        break;
      case 'param':
        lines.push('<table class="params">')
        break;
      case 'string':
        // Nothing
        break;
      case 'api':
        // Nothing
        break;
      case 'enum':
        lines.push('<table class="enum">')
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
        small = "<small>拡張ステータス:"+content.xCode+"</small><br>"
      }
      lines.push('<tr><td><span class="http-status-code '+variantClassName+'">'+content.code+'</span></td><td>'+small+marked(content.desc)+'</td></tr>')
      break;
    case 'param':
      var smallText = ""
      if(content.isMandatory) { smallText += "必須" }
      if(content.isProtected) { smallText += "認証必須" }
      if(content.isOptional ){ smallText += "省略可能" }
      smallText = smallText && ("<small>"+smallText+"</small>")
      lines.push('<tr><td>'+content.name+'<br>'+smallText+'</td><td>'+marked(content.paramType)+'</td><td>'+marked(content.desc)+'</td></tr>')
      break;
    case 'string':
      if(content.data.trim()!='') {
        lines.push('<p>'+marked(content.data)+'</p>')
      }
      break;
    case 'sourceCode':
      lines.push('<pre class="code">'+htmlEscape(content.sourceCode)+'</pre>')
      break;
    case 'enum':
      lines.push('<tr><td><span class="value">'+content.value+'</span></td><td>'+marked(content.desc)+'</td></tr>')
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
        apiSections[i+1]))
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
    } else {
      if(currentApiSection) {
        if(prefix.isApi(l)) {
          pushApiSectionContent(field.api(l))
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
        } else if(prefix.isApiEnd(l)) {
          flushApiSections()
          if(outputLines.constructor !== Array) { throw 'Outputlines is not an array !' }
        } else if(startsWith(l, "#")) {
          flushApiSections()
          i--
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
      } else {
        var theLine = lines[i]
        if(startsWith(l,'{code:')) {
          var pDataArray = []
          for(i=i+1; i<lines.length ;i++){
            var ll = lines[i].trim()
            if(ll==="{/code}") { break }
            else {
              var sourceCodeLine = lines[i]
              pDataArray.push(sourceCodeLine)
            }
          }
          theLine = '<pre class="code">' + pDataArray.join('\n') + '</pre>'
        }
        else if(l==='{/code}') { throw 'Unexpected pre element' }
        else if(startsWith(l,'#')) {
          var nbSharp=0
          for(nbSharp=0; l[nbSharp]=='#'; nbSharp++) {}
          theLine = '<h'+(nbSharp+1)+'>'+l.slice(nbSharp)+'</h'+(nbSharp+1)+'>'
        }

        pushOtherLine(theLine)
      }
    }
    //console.log(currentApiSection)
  }

  flushApiSections()

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
