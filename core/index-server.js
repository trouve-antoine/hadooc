(function(){
  
var debug = function(s){};

var isServerSide = require('../utils/is-server-side')

var path = require('../utils/path')

var hadoocPaths = require('../lib/hadooc-paths')

var HadoocConfiguration = require('../lib/hadooc-configuration')

var httpApiDocumentationCompiler = require('../core/hadooc-compiler')

var getFileContents = function(path, conf) {
  var charset = conf.charset
  debug("Read file: " + path + ' with encoding ' + charset)
  var lines = require('fs').readFileSync(path, charset).split("\n")
  // debug("Read file: " + path + ' with encoding ' + charset + " (#lines = " + lines.length + ")")
  return lines
}
  
var getJsDependenciesUrl = function(jsDependencies, conf) {
  var urls = []
  
  if(jsDependencies.raphael) { urls.push("https://cdnjs.cloudflare.com/ajax/libs/raphael/2.1.4/raphael-min.js") }
  if(jsDependencies.jquery) { urls.push("http://cdnjs.cloudflare.com/ajax/libs/jquery/1.11.0/jquery.min.js") }
  if(jsDependencies.underscoreJs) { urls.push("https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.8.3/underscore-min.js") }
  if(jsDependencies.lodash) { urls.push("https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.8.2/lodash.min.js") }
  
  if(jsDependencies.flowchartJs) { urls.push("http://flowchart.js.org/flowchart-latest.js") }
  if(jsDependencies.jsSequenceDiagrams) { urls.push("https://bramp.github.io/js-sequence-diagrams/js/sequence-diagram-min.js") }
  if(jsDependencies.nomnoml) { urls.push("https://raw.githubusercontent.com/skanaar/nomnoml/master/dist/nomnoml.js") }
  
  
  var scriptElements = [];
  for(var i=0; i<urls.length; i++) {
    scriptElements.push('<script src="' + urls[i] + '"></script>')
  }
  
  if(jsDependencies["hadooc-toc"]) {
    var tocFilePath = path.join(hadoocPaths.homeFolder, "bootstraps", "toc.js") 
    scriptElements.push("<script>")
    scriptElements.push("/* Toc bootstrap */")
    scriptElements = scriptElements.concat(getFileContents(tocFilePath, conf))
    scriptElements.push("</script>")
  }
  
  return scriptElements
}

var wrapHtmlBody = function(metadata, bodyLines, context, hadoocConf, callback) {
  var embeddedCssPath = hadoocConf.embeddedCssPath
  var externalCssUrl = hadoocConf.externalCssUrl

  var title = metadata.title || 'HTTP API Documentation'
  var subTitle = metadata.subtitle || metadata['sub-title']
  var date = metadata.date
  var version = metadata.version

  var scriptLines = []

  var htmlLines = [
    '<!doctype html>',
    '<html>',
    '<head>',
    '  <meta charset="utf-8">',
    '  <title>' + title + '</title>'
  ]
  
  var hasFlowcharts = context.nbOfFlowcharts > 0;
  var hasSequenceDiagrams = context.nbOfSequenceDiagrams > 0;
  var hasUmlDiagrams = context.nbOfUmlDiagrams > 0;
  
  htmlLines = htmlLines.concat(getJsDependenciesUrl({
    flowchartJs: hasFlowcharts,
    jsSequenceDiagrams: hasSequenceDiagrams,
    raphael: hasFlowcharts || hasSequenceDiagrams,
    jquery: true,
    underscoreJs: hasSequenceDiagrams || hasUmlDiagrams,
    nomnoml: hasUmlDiagrams,
    //lodash: hasUmlDiagrams || hasSequenceDiagrams,
    "hadooc-toc": hadoocConf.shouldPrintToc
  }, hadoocConf))
  
  if(hasFlowcharts) {
    scriptLines.push('$(".source-code.flowchart").each(function(id, e) { flowchart.parse(e.value).drawSVG($(e).next().attr("id")) })')
  }
  
  if(hasSequenceDiagrams) {
    scriptLines.push('$(".source-code.sequenceDiagrams").each(function(id, e) { Diagram.parse(e.value).drawSVG($(e).next().attr("id"), { theme:"simple" } ) } )')
  }
  
  if(hasUmlDiagrams) {
    scriptLines.push('$(".source-code.umlDiagrams").each(function(id, e) { nomnoml.draw($(e).next()[0], e.value) })')
  }
  
  if(hadoocConf.shouldPrintToc) {
    scriptLines.push("hadooc.toc.init()")
  }

  var hasAStyleSection = context.nbOfHighlightedCodes || embeddedCssPath

  if(hasAStyleSection) {
    htmlLines.push('<style>')
  }

  if(embeddedCssPath) {
    htmlLines.push("/******** Embedded CSS */")
    htmlLines = htmlLines.concat(getFileContents(embeddedCssPath, hadoocConf))
  }

  if(context.nbOfHighlightedCodes > 0) {
    htmlLines.push("/******** CSS for code highlight */")
    htmlLines = htmlLines.concat(getFileContents(hadoocConf.highlightCssPath, hadoocConf))
  }

  if(hasAStyleSection) {
    htmlLines.push('</style>')
  }

  if(externalCssUrl) {
    htmlLines.push('<link rel="stylesheet" href="' + externalCssUrl + '">')
  }

  htmlLines.push("</head>")
  htmlLines.push("<body>")

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

  htmlLines.push('<h1>' + titleStr + '</h1>')

  htmlLines = htmlLines.concat(bodyLines)

  if(scriptLines.length != 0) {
    htmlLines.push('<script>')
    htmlLines.push('$( function(){')
    htmlLines = htmlLines.concat(scriptLines)
    htmlLines.push('})')
    htmlLines.push('</script>')
  }

  htmlLines.push("</body>")
  htmlLines.push("</html>")

  callback.call(null, htmlLines)
}

var processStdin = function(hadoocConf, callback){
  charset = (hadoocConf && hadoocConf.charset) || 'utf8'
  
  hadoocConf = new HadoocConfiguration(hadoocConf)

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
    wrapHtmlBody(compiled.metadata, compiled.outputLines, compiled.context, hadoocConf, callback)
  });
}

// hadooCconf: additionaly to the parameters from httpApiDocumentationCompiler, accepts the text charset string in charset (default to 'utf8')
var processFile = function(inputFilePath, hadoocConf, callback) {
  var charset = (hadoocConf && hadoocConf.charset) || 'utf8'
  
  hadoocConf = new HadoocConfiguration(hadoocConf)

  require('fs').readFile(inputFilePath, charset, function(err, data){
    if(err) { throw err.message }
    var dataLines = data.split("\n")
    var compiled = httpApiDocumentationCompiler(dataLines, hadoocConf)
    wrapHtmlBody(compiled.metadata, compiled.outputLines, compiled.context, hadoocConf, callback)
  })
}

module.exports = {
  hadooc: httpApiDocumentationCompiler,
  processStdin: processStdin,
  processFile: processFile
}
  
})()