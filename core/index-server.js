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
  
function getJsDependenciesUrl(jsDependencies, conf) {
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
  
  var urlsToInclude = []
  
  if(jsDependencies["hadooc-toc"]) { urlsToInclude.push(path.join(hadoocPaths.homeFolder, "bootstraps", "toc.js")) }
  if(jsDependencies["hadooc-flowcharts"]) { urlsToInclude.push(path.join(hadoocPaths.homeFolder, "bootstraps", "flowcharts.js")) }
  if(jsDependencies["hadooc-sequence-diagrams"]) { urlsToInclude.push(path.join(hadoocPaths.homeFolder, "bootstraps", "sequence-diagrams.js")) }
  if(jsDependencies["hadooc-uml-diagrams"]) { urlsToInclude.push(path.join(hadoocPaths.homeFolder, "bootstraps", "uml-diagrams.js")) }
  
  if(urlsToInclude.length != 0) {
    scriptElements.push("<script>")
    for(var i=0; i<urlsToInclude.length; i++) {
      var url = urlsToInclude[i]
      scriptElements.push("/* bootstrap file: " + url + " */")
      scriptElements = scriptElements.concat(getFileContents(url, conf))
    }
    scriptElements.push("</script>")
  }
  
  return scriptElements
}

function wrapHtmlBody(metadata, bodyLines, context, hadoocConf, callback) {
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
    "hadooc-toc": hadoocConf.shouldPrintToc,
    "hadooc-flowcharts": hasFlowcharts,
    "hadooc-sequence-diagrams": hasSequenceDiagrams,
    "hadooc-uml-diagrams": hasUmlDiagrams
  }, hadoocConf))
  
  if(hasFlowcharts) {
    scriptLines.push('hadooc.flowcharts.init()')
  }
  
  if(hasSequenceDiagrams) {
    scriptLines.push('hadooc.sequenceDiagrams.init()')
  }
  
  if(hasUmlDiagrams) {
    scriptLines.push('hadooc.umlDiagrams.init()')
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

function processStdin(hadoocConf, callback){
  charset = hadoocConf.charset
  
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

function processFile(inputFilePath, hadoocConf, callback) {
  var charset = hadoocConf.charset
  
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