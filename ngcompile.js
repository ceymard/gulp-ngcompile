var Stream = require('stream');
var path = require('path');
var gutil = require('gulp-util');
var _ = require('lodash');
var PluginError = gutil.PluginError;
var File = gutil.File;


module.exports = function(module_name, opt){
  if (!module_name) throw new PluginError('gulp-ngcompile',  'Missing module_name option for gulp-ngcompile');

  if (!opt) opt = {};
  if (!opt.newLine) opt.newLine = gutil.linefeed;

  var declarants = {};
  var seen = {};

  var first_file = null;
  var stream = new Stream.Transform({objectMode: true});

  function eval_declarations(file) {
    var re_module = /\.module\(('[^']*'|"[^"]*")\s*,(?:\s*\[([^\]]+)\])?/g;
    var match = null;

    while (match = re_module.exec(file.contents)) {
      var modname = match[1].slice(1, -1);
      var deps = match[2];

      declarants[modname] = declarants[modname] || {};
      declarants[modname][file.path] = true;
      file.declares[modname] = true;

      if (deps) {
        // Handle dependencies
        deps = deps.trim();
        if (deps) {
          _.each(deps.split(/\s*,\s*/), function (dep) {
            dep = dep.slice(1, -1); // remove the quotes

            file.requires[dep] = true;
          });
        }
      }
    }
  }

  var currently_handled = {};

  stream._transform = function(file, encoding, done) {
    if (file.isNull()) { return done(); } // ignore

    // we want buffers !
    if (file.isStream()) {
      this.emit('error', new PluginError('gulp-ngcompile',  'Streaming not supported'));
      return done();
    }

    if (!first_file) { first_file = file; }

    // start by clearing the file from the cache if it were there.
    var cached = seen[file.path];
    if (cached) {
      for (decl in file.declares) {
        delete declare[decl][file.path];
      }
      // we can now clean the file
      delete seen[file.path];
    }

    file.declares = {};
    file.requires = {};
    seen[file.path] = file;
    eval_declarations(file);

    // this will serve to only output this file to the stream.
    currently_handled[file.path] = true;

    build_modules();
    done()
  }

  var build_modules = _.debounce(function() {
    var dependencies = [];
    var contents = [];
    // var cant_build = false;

    function add_dependencies(module_name) {
      if (module_name === 'ng')
        // special case for angular.
        return;

      var files = declarants[module_name];

      if (!files) {
        gutil.log('no file found for module', gutil.colors.red(module_name));
        return;
      }

      for (file in files) {
        // console.log(seen[file].requires);
        dependencies.splice(0, 0, file);
        for (dep in seen[file].requires) {
          if (_.findIndex(dependencies, dep) === -1)
            add_dependencies(dep)
        }
      }
    }

    // launch the dependency calculation.
    add_dependencies(module_name);

    var rebundle = false;

    _.each(dependencies, function (dep) {
      if (currently_handled[dep]) {
        rebundle = true;
        stream.push(seen[dep]);
      }
    });

    // reset the currently handled counter
    currently_handled = {};

    if (rebundle)
      gutil.log('angular application', gutil.colors.magenta(module_name), 'rebundled');

  }, opt.debounce || 500);

  return stream;
};