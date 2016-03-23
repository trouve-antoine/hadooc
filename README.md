# hadooc
Markdown with domain specific extensions to easily generate documentation for HTTP API. Contains the language specification as well as the compiler to HTML. Written in Javascript for Node.js.

## Command Line Interface

To get help:
    ./hadoo-cli --help

## Markdown extensions

The hadooc compiler uses the package [marked](https://github.com/chjj/marked) to compile markdown content.
Outside hadooc specific extension you can use regular markdown, including HTML tags.
The only difference is that the hadooc compiler will add a level to all titles when defined with a hash (#).

### Metadata

The file may start by metadata, enclosed between lines that only contain --- (three dashes)
Metadata are of the format
    key: value
Where the key is not case sensitive. The hadooc compiler accepts the following key
- title
- subtitle or sub-title
- version
- date

Example

    ---
    title: My HTTP API documentation
    sub-title: For you baby
    version: hairy-wall (1.2 alpha)
    ---

### Sections of API description array

API parameters are gathered within two-column arrays which are separated into sections.
Each section starts with ** (two stars) followed by the name of the section.
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

    {api} VERB URL
    
Where VERB is the HTTP verb. For example:

    {api} POST /users/login
    
### Parameter list

A parameter list item can be constructed with the command below:

    {x}    pname    ptype    explanation

Where fields are
- x is the type of parameter 
    - *?* for optional parameters
    - *!* for mandatory parameters
    - *?$* for optional parameters which access requires some authentication
    - *!$* for mandatory parameters which access requires some authentication
    - *-* for neutral parameter
- pname is the name of parameter
- ptype is the type of parameter
- explanation is some free markdown. It may contain newlines, but no empty lines

The separator between fields is four spaces by default, but can be changed in the command line and the driver.

Example:

    ## API 1.1 Login
    
    ** URL
    {api} POST /users/login
    ** Post request parameters
    {!}    username    @string    The user name
    {!}    password    @string    The password. Rules are
    - should *at least* contain 8 characters
    - should *not* contain the string Justin Bieber
    {?}    email    @string    The email of the user
    ** JSON response parameters
    {!$}    userid    @userId    The userid, only if authentication succeeded
    **

#### Enumeration

A list of value with explanation can be constructed with

    {-:value}    explanation
