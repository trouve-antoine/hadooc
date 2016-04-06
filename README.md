# hadooc
Markdown with domain specific extensions to easily generate documentation for HTTP API. Contains the language specification as well as the compiler to HTML. Written in Javascript for Node.js.

For now it only works at server side, but it should be easy to make it work at client side too.

## Command Line Interface

The file hadooc-cli.js contains a command line interface (CLI) for hadooc compiler.
To get help execute it with parameter "--help" as below:

    ./hadooc-cli.js --help

    Usage: hadooc [options] <file>

    Options:

      -h, --help                     output usage information
      -o, --output <filename>        Output file. Use the standard output by default
      -b, --embedded-css <filename>  The path to a css file that will be embedded into the output HTML file
      -x, --external-css <url>       The URL of a CSS file linked into the output HTML file
      -c, --charset <charset>        The name of the charset used to read the input file. Default to utf8
      -s, --separator <string>       The separator to distinguish between fields. Default to "    " (4 spaces)
      -t, --theme <themename>        The name of a preset CSS to embed into the output HTML file. Themes are overriden by option -b. Default to "default"
      -l, --list-themes              Prints the list of available themes for both hadooc and the code highlight
      -g, --language <locale>        Sets the locale for generated HTML
      -m, --show−comments            Show comments in HTML
      -v, --verbose                  Prints a bunch of debug information
      -h, --highlight-code [theme]   Highlight code blocks with language. You may specify a theme name (default: sunburst).

If you have installed hadooc via npm, the CLI should be available in the path:

    hadooc --help

If not, try to execute `npm link` manually.

## In the browser

Hadooc is also available in the browser via the bundle file in `dist/hadooc.js` (generated with [browserify](http://browserify.org)).
When imported, it defines the global function `hadooc` that accepts two parameters:

- `lines`: the input hadooc lines. May be an array of strings or a string with lines separated by `\n`
- `conf`: the configuration object. If not set, default values are used. The supported members are:<a name="conf"></a>
  - `separator`: default to four spaces
  - `debug`: default to `false`
  - `shouldDisplayComments`: default to `false`
  - `shouldHighlightCode`: default to `false`
  - `locale`: only `en` and `ja` for now
  - `charset`: ignored
  - `embeddedCssPath`: ignored
  - `externalCssUrl`: ignored
  - `highlightCssPath`: ignored
  
Below is a basic example (with jQuery):
````js
  parent = $("body")
  var hmdStr = "# A title\n{http:200} OK"
  var hmd = hadooc(hmdStr, { locale: "en" })
  parent.html(hmd.outputLines.join("\n"))
````

Do not forget to add the supporting code in your HTML:
- the scripts (e.g. in the `<head>` section). For example (you can use newer of self-hosted versions of the same libraries, the one below are proved to work): 
````html
  <!-- Mandatory (for now) -->
  <script src="http://cdnjs.cloudflare.com/ajax/libs/jquery/1.11.0/jquery.min.js"></script>
  <!-- If you use flowcharts or sequence diagrams -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/raphael/2.1.4/raphael-min.js"></script>
  <!-- If you use sequence or uml diagrams -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.8.3/underscore-min.js"></script>
  <!-- If you use flowcharts -->
  <script src="http://flowchart.js.org/flowchart-latest.js"></script>
  <!-- If you use sequence diagrams -->
  <script src="https://bramp.github.io/js-sequence-diagrams/js/sequence-diagram-min.js"></script>
  <!-- If you use uml diagrams -->
  <script src="https://raw.githubusercontent.com/skanaar/nomnoml/master/dist/nomnoml.js"></script>
````
- some CSS. For example, you can use the theme css under `themes/` (for example `themes/default.css`)
- the initialization code if you use dynamic functionalities
````js
  // If you use flowcharts
  hadooc.flowcharts.init(parent)
  // If you use sequence diagrams
  hadooc.sequenceDiagrams.init(parent)
  // If you use uml diagrams
  hadooc.umlDiagrams.init(parent)
  // If you have generates a table of content (only one per page for now)
  hadooc.toc.init(parent)
````
   
For more information, please refer to the sample file `./samples/sample_browser.html`.

## Markdown extensions

The hadooc compiler uses the package [marked](https://github.com/chjj/marked) to compile markdown content.
Outside hadooc specific extension you can use regular markdown, including HTML tags.
The only difference is that the hadooc compiler will add a level to all titles when defined with a hash (#).

### Metadata

The file may start by metadata, enclosed between lines that only contain `---` (three dashes)
Metadata are of the format

    key: value

Where the key is not case sensitive. The hadooc compiler accepts the following keys
- `title`
- `subtitle` or `sub-title`
- `version`. Use free format
- `date`. Use free format
- `hadooc-conf`. Specify forced values for hadooc the hadooc configuration Overrides default values and the command line. Accepts single-line JSON; quotes around key values are not required. Supported configuration keys are the same as the [`conf` parameter of the in-browser `hadooc` function](#conf). 

Example

    ---
    title: My HTTP API documentation
    sub-title: For you baby
    version: hairy-wall (1.2 alpha)
    hadooc-conf: { locale: ja }
    ---

### Sections of API description array

API parameters are gathered within two-column arrays which are separated into sections.
Each section starts with `**` (two stars) followed by the name of the section.
A section may end in three ways:
- the start of a new section (a line that starts with two stars)
- a new markdown header (a line that starts with a hash tag)
- a line that contains only two stars

Within section one can use any markdown syntax or hadooc extension, excluding a new section itself.

Example

    # API 1.x User management API

    ## API 1.1 Login

    ** API prototype
    Explain the prototype
    ** Request parameter
    Explain the parameters

    ## API 1.2 Logout

### API Prototype

Within an API section, you can specify the prototype of your API with the command below:

    {api} VERB    URL

Where VERB is the HTTP verb. They are separated by four spaces (but that can be configured with the option `-s` of the CLI)
For example:

    {api} POST    /users/login

### Parameter list

A parameter list item can be constructed with the command below:

    {x} pname    ptype    explanation

Where fields are
- x is the type of parameter
    - *?* for optional parameters
    - *!* for mandatory parameters
    - *?$* for optional parameters which access requires some authentication
    - *!$* for mandatory parameters which access requires some authentication
    - *-* for neutral parameter
- pname is the name of parameter
- ptype is the type of parameter
- explanation. It may contain any standard markdown (no hadooc extension). It may contain newlines, but no empty lines

The separator between the last three fields is "`    `" (four spaces) by default, but can be changed in the command line and the driver.
Spaces after the separator are trimmed out.

A list ends with an empty line.

Example:

    ## API 1.1 Login

    ** URL

    {api} POST /users/login

    ** Post request parameters

    {!} username    @string    The user name
    {!} password    @string    The password. Rules are
    - should *at least* contain 8 characters
    - should *not* contain the string Justin Bieber
    {?} email       @string    The email of the user

    ** JSON response parameters

    {!$} userid     @string    The userid, only if authentication succeeded

    **

#### Enumeration

An item of a list of value with explanation can be constructed with

    {-:code value} explanation

of

    {=:bold value} explanation

The explanation may contain any standard markdown (no hadooc extension).
A list of enumeration ends with am empty line.

Example

    ** User Roles
    {-:root} the king
    - can read everything
    - can write everywhere
    {-:nobody} a peasant
    {-:other} be careful

#### HTTP Codes

A list of HTTP status codes and explanation can be built wit the syntax below:

    {http:CODE} explanation

Where
- CODE is the HTTP code (e.g. 200, 400)
- explanation is free regular markdown (no hadooc extension)

The list ends with an empty line

Example:

    ** HTTP Response Status Codes

    {http:200} Success
    {http:403} The user is logged in, but does not have enough permission
    {http:500} Unable to access the data:
    - the database is off
    - the FBI was listening to the communication
    {http:503} The janitor has tripped on the server's plug, again.

    **

#### Source code

If you only want to display some code, use marked syntax (four backquotes).
Example:

    ````javascript
    {
      "data": [ { "data1": "value1" } ],
      "dataNb": 1
    }
    ````

The code can be highlighted. To this end, the hadooc compiler internally uses [highlight.js](https://highlightjs.org).
The CLI tool makes it possible to set the highlighting theme with option `-h [theme]`.

#### Charts

Additionally, the hadooc compiler supports the generation of graphic contents from text script with the syntax:

    {code:X}
    some script
    {/code}

Where X is the name of a code module. The supported modules are

- *flowchart*: flowcharts based on [flowchart.js](http://flowchart.js.org/). This feature is still a bit experimental because flowchart.js is itself experimental. In particular, the parser is very picky (e.g. spaces at the beginning of lines): please first test your charts' source code on the website **before** using them in your hadooc files. The flowcharts are generated in JavaScript at the client side, which means that when flowcharts are used, the generated HTML will include the relevant JavaScript libraries from public CDMS. In other words, you won't be able to see the charts when you are not connected to the Internet. In future release we will do our best to pre-generate the charts (this feature of flowchart.js seems broken for now)
- *sequence*: sequence diagrams based on [js-sequence-diagrams](https://bramp.github.io/js-sequence-diagrams/).
- *uml*: a selection of UML graphs, including class diagrams, from [nomnoml](http://www.nomnoml.com/).

More are to come ! Do not hesitate to suggest your favorite library.

If an unknown value for X is given, the content between the `{code}` elements is printed as source code (this reproduces the behavior of previous versions of the hadooc compiler).

#### Comments

It is possible to add single-line comments with the syntax:

    ---- This is a comment

or

    ---- {XXX} This is a comment with tag "XXX"

Where XXX is a comment tag used as prefix of the comment, and as CSS class name of the enclosing p element when comment display is turned on.
By default comments are not included in the output. They can however be forced in with option "-m" of the CLI.

## Examples

The folder `./samples` contains two important examples of most of the features above:

- `sample1.hmd`: to be compiled at server-side
- `sample_browser.hmd`: to be opened in the browser 

## License (MIT)

Copyright (c) 2016 by Antoine Trouvé.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
