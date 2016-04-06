"use strict";

(function() {

var isServerSide = require('./utils/is-server-side')

if(isServerSide) {
  module.exports = require('./core/index-server')
} else {
  window.hadooc = require('./core/hadooc-compiler')
}

}).call(this)
