var Stream = require('stream');
var path = require('path');
var gutil = require('gulp-util');
var _ = require('lodash');
var PluginError = gutil.PluginError;
var File = gutil.File;


module.exports = function(module_name, opt){
  if (!module_name) throw new PluginError('gulp-ngcompile',  'Missing module_name option for gulp-ngcompile');

  if (!opt) opt = _.merge({continuous: false}, opt);

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
  var done_array = [];

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

    // console.log('hello ' + file.path);
    if (opt.continuous) {
      build_modules();
    }
    done();
    // done_array.push(done);
  }

  // For non-continuous mode.
  stream._flush = function flush(callback) {
    if (!opt.continuous)
      build_modules(callback);
    // callback();
  };

  var build_modules = function build_modules (callback) {
    var dependencies = [];
    var contents = [];
    // var cant_build = false;
    var seen_deps = {};

    function add_dependencies(module_name) {
      if (module_name === 'ng')
        // special case for angular.
        return;
      seen_deps[module_name] = true;

      var files = declarants[module_name];

      if (!files) {
        gutil.log('no file found for module', gutil.colors.red(module_name));
        return;
      }

      for (file in files) {
        if (dependencies.indexOf(file) === -1)
          dependencies.splice(0, 0, file);

        for (dep in seen[file].requires) {
          if (!seen_deps[dep]) {
            add_dependencies(dep);
          }
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

    // for non-continuous mode, flush the pipe.
    if (callback)
      callback();
  };

  if (opt.continuous)
    // debounce to avoid rebuilding n times if n files change in a row.
    build_modules = _.debounce(build_modules, 100);

  return stream;
};