#! /usr/bin/env node

// Command Line Interface for HADOOC

var program = require('commander')
var hadooc = require('./')
var path = require('path')
var fs = require('fs')

var homeFolder = path.dirname(__filename)

var themes = {
  defaultFolder: path.join(homeFolder, "themes"),
  highlightFolder: path.join(homeFolder, "node_modules", "highlight.js", "styles"),
  getList: function(folder) {
    folder = folder || themes.defaultFolder
    var themesList = {}
    fs.readdirSync(folder).forEach(function(filePath){
      if(path.extname(filePath) !== ".css") { return }
      var themeName = path.basename(filePath, ".css")
      themesList[themeName] = path.join(folder, filePath)
    })
    return themesList
  },
  getFilePathFromName: function(themeName, folder) {
    var themesList = themes.getList(folder);
    var themeFilePath = themesList[themeName]
    if(!themeFilePath) { throw 'Unknown theme name: ' + themeName }
    return themeFilePath
  },
  getHighlightFilePathFromName: function(themeName) {
    return themes.getFilePathFromName(themeName, themes.highlightFolder)
  }
}

function listThemesAndExit() {
  var themesList = themes.getList()
  console.log("List of hadooc themes:")
  for(var themeName in themesList) {
    console.log("  " + themeName)
  }
  var highlightThemesList = themes.getList(themes.highlightFolder)
  console.log("List of highlight.js themes:")
  for(var themeName in highlightThemesList) {
    console.log("  " + themeName)
  }
  process.exit()
}


program
  .arguments('<file>')
  .option('-o, --output <filename>', 'Output file. Use the standard output by default')
  .option('-b, --embedded-css <filename>', 'The path to a css file that will be embedded into the output HTML file')
  .option('-x, --external-css <url>', 'The URL of a CSS file linked into the output HTML file')
  .option('-c, --charset <charset>', 'The name of the charset used to read the input file. Default to utf8')
  .option('-s, --separator <string>', 'The separator to distinguish between fields. Default to "    " (4 spaces)')
  .option('-t, --theme <themename>', 'The name of a preset CSS to embed into the output HTML file. Themes are overriden by option -b. Default to "default"')
  .option('-l, --list-themes', 'Prints the list of available themes for both hadooc and the code highlight', listThemesAndExit)
  .option('-g, --language <locale>', 'Sets the locale for generated HTML')
  .option('-m, --show−comments', 'Show comments in HTML')
  .option('-v, --verbose', 'Prints a bunch of debug information')
  .option('-h, --highlight-code [theme]', 'Highlight code blocks with language. You may specify a theme name (default: sunburst).')
  .action(function(file) {
    var conf = {
      charset: program.charset || 'utf8',
      separator: program.separator || "    ",
      embeddedCssPath: program['embedded-css'],
      externalCssUrl: program['external-css'],
      locale: program.language || "en",
      debug: program.verbose,
      shouldDisplayComments: program['show−comments'],
      shouldHighlightCode: program['highlightCode'],
      highlightCssPath: program['highlightCode'] === true ? themes.getHighlightFilePathFromName('sunburst') : themes.getHighlightFilePathFromName(program['highlightCode']),
    }

    if( !conf.embeddedCssPath ) {
      var themeName = program['theme']
      if( themeName ) {
        conf.embeddedCssPath = themes.getFilePathFromName(themeName)
      } else if( !conf.externalCssUrl ) {
        conf.embeddedCssPath = themes.getFilePathFromName('default')
      }
    }

    var writeOutput = function(outputLines) {
      if(program.output) {
        require('fs').writeFile(program.output, outputLines.join("\n"), function(err) {
          if(err) { throw err.message }
        })
      } else {
        // use stdout by default
        for(var i=0; i<outputLines.length; i++) {
          process.stdout.write(outputLines[i])
        }
      }
    }

    if(file) {
      hadooc.processFile(file, conf, writeOutput)
    } else {
      hadooc.processStdin(file, writeOutput)
    }
  })
  .parse(process.argv);
