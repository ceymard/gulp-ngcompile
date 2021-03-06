gulp-ngcompile
==============

If you have big angularjs libraries in your src/ folder and do not use them all in your application, you most likely do not want to have them all concatenated into your output script.

This gulp plugin filters a list of javascript files to output only those that are relevant to the angular application that is to be built.

Install it with `npm install --save-dev gulp-ngcompile`

To achieve this, the plugin relies on `.module('module_name', [deps])` declaration in your .js files.

A `.module('app', [dep1, dep2])` statement indicates that the current file _declares_ `app` and _requires_ `dep1` and `dep2`.

When bundling `'app'`, gulp-ngcompile will output the files containing `app`, `dep1`, `dep2` (as well as the files containing the dependencies `dep1` and `dep2` may ask for.) You can then pass this result to `concat` for instance to assemble your application.

The assembler does *not* care about where your files are and your folder structure, only about module names.

Why not include angular.module('name') also ?
---------------------------------------------

I decided against doing it because I wanted to have the cleanest possible way of implementing things ; one file = one module.

In particular, I wanted to avoid the possibility of having modules being split up during some refactoring process and not notice that some of the files were not being included (ie, forgotten). Also, some code can refer to an angular module without necessarily adding anything to it, and therefore be irrelevant.

To split a module on several files (which I do), just create sub modules included by a bigger one, such as ;

```javascript
// bigmodule.directives.js
var mod = angular.module('bigmodule.directives', []);

mod.directive('whatever', function () { /**/ });

// bigmodule.controllers.js
var mod = angular.module('bigmodule.controllers', []);

mod.directive('whatever', function () { /**/ });

// bigmodule.js
// there, just one module.
angular.module('bigmodule', ['bigmodule.directives', 'bigmodule.controllers']);

```

Synopsis
========

`ngcompile(app_name[, options])`

Options
=======

* `options.continuous`: default `false`, pass `true` if the source of the pipeline is continuous (ie. provided by watch()).

* `options.ignore`: default `[]`, pass an array of module names that are expected to be missing and ignore the "no file found" warning.

Example
=======

```javascript
// .. other requires
var ngcompile = require('gulp-ngcompile');

gulp.task('build-angular-app', function () {
  return gulp.src('./src/**/*.js')
    .pipe(ngcompile('app')) // app is the module we wish to assemble.
    .pipe(concat('app.js'))
    .pipe(gulp.dest('./build'));
});
```

Example with bundled templates
==============================

gulp-ngcompile has a cousin, gulp-ngtemplates, that assembles templates into javascript files that use the `$templateCache` service.

To generate the .js files for the templates and assemble the application alongside the regular .js file, you may consider using the `event-stream` module to merge two different pipelines together.

```javascript
// .. other requires
var ngcompile = require('gulp-ngcompile');
var ngtemplates = require('gulp-ngtemplates');
var es = require('event-stream');

gulp.task('build-angular-app', function () {
  var scripts = gulp.src('./src/**/*.js');
  var templates = gulp.src('./src/**/*.html')
    .pipe(ngtemplates());

  return es.concat(scripts, templates)
    .pipe(ngcompile('app')) // app is the module we wish to assemble.
    .pipe(concat('app.js'))
    .pipe(gulp.dest('./build'));
});
```
