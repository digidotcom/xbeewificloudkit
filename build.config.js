var jquery_ui_pieces = function ( pieces, minified ) {
    return pieces.map(function (piece) {
        piece = "jquery.ui." + piece;
        path = minified ? "minified/" + piece + ".min"
                         : piece;
        return "vendor/jquery-ui/ui/" + path + ".js";
    });
};

/**
 * This file/module contains all configuration for the build process.
 */
module.exports = {
  app_name: "XBee Wi-Fi Cloud Kit",
  navbar_text: "XBee Wi-Fi Cloud Kit",
  /**
   * app_version stores the 4-tuple version number for the application.
   */
  app_version: '1.0.0.0',

  /**
   * The `build_dir` folder is where our projects are compiled during
   * development and the `compile_dir` folder is where our app resides once it's
   * completely built.
   */
  build_dir: 'build/static',
  compile_dir: 'prod/static',

  /**
   * This is a collection of file patterns that refer to our app code (the
   * stuff in `src/`). These file paths are used in the configuration of
   * build tasks. `js` is all project javascript, less tests. `ctpl` contains
   * our reusable components' (`src/common`) template HTML files, while
   * `atpl` contains the same, but for our app's code. `html` is just our
   * main HTML file, `less` is our main stylesheet, and `unit` contains our
   * app's unit tests.
   */
  app_files: {
    js: [ 'src/app/common/ie-fixes/*.js', 'src/**/*.js', '!src/**/*.spec.js',
          '!src/app/no_log_debug.js' ],
    productionjs: [ 'src/app/no_log_debug.js' ],
    jsunit: [ 'src/**/*.spec.js' ],

    coffee: [ 'src/**/*.coffee', '!src/**/*.spec.coffee' ],
    coffeeunit: [ 'src/**/*.spec.coffee' ],

    atpl: [ 'src/app/**/*.tpl.html' ],
    ctpl: [ 'src/common/**/*.tpl.html' ],

    html: [ 'src/index.html', 'src/index.html' ],
    less: ['src/less/main.less', 'src/app/widgets/**/*.less', 'src/common/**/*.less'],
    css: [ 'src/app/widgets/**/*.css', 'src/common/**/*.css' ]
  },

  /**
   * This is the same as `app_files`, except it contains patterns that
   * reference vendor code (`vendor/`) that we need to place into the build
   * process somewhere. While the `app_files` property ensures all
   * standardized files are collected for compilation, it is the user's job
   * to ensure non-standardized (i.e. vendor-related) files are handled
   * appropriately in `vendor_files.js`.
   *
   * The `vendor_files.js` property holds files to be automatically
   * concatenated and minified with our project source files.
   *
   * The `vendor_files.css` property holds any CSS files to be automatically
   * included in our app.
   */
  vendor_files: {
    js: [
      'vendor/angular/angular.js',
      'vendor/jquery/jquery.js',
      'vendor/jquery-color/jquery.color.js',
      'vendor/bootstrap/js/dropdown.js',
      'vendor/bootstrap/js/tooltip.js',
      'vendor/gridster/jquery.gridster.js',
      'vendor/angular-bootstrap/ui-bootstrap-tpls.js',
      'vendor/placeholders/angular-placeholders-0.0.1-SNAPSHOT.min.js',
      'vendor/angular-ui-router/release/angular-ui-router.js',
      'vendor/angular-ui-utils/modules/route/route.js',
      'vendor/angular-ui-utils/modules/keypress/keypress.js',
      'vendor/angular-ui-utils/modules/mask/mask.js',
      'vendor/lodash/dist/lodash.compat.js',
      'vendor/Flot/jquery.flot.js',
      'vendor/Flot/jquery.flot.time.js',
      'vendor/Flot/excanvas.min.js',
      'vendor/socket.io-client/dist/socket.io.js',
      'vendor/revalidator/lib/revalidator.js',
      'vendor/angular-cookies/angular-cookies.min.js',
      'vendor/restangular/dist/restangular.js',
      'vendor/respond/respond.min.js',
      'vendor/raphael/raphael-min.js',
      'vendor/highlight.js/build/highlight.pack.js',
      'vendor/justgauge/justgage.js',
      'vendor/toastr/toastr.js'
    ].concat(
      // Adding the jQuery UI files this way makes it easy to change the subset
      // of jQuery UI functionality desired for within the app.
      jquery_ui_pieces(['core', 'widget', 'mouse', 'position', 'progressbar',
                       'slider', 'effect', 'effect-fade'], true)
    ),
    shims: [
        'vendor/es5-shim/es5-shim.min.js',
        'vendor/es5-shim/es5-sham.min.js',
        'vendor/json3/lib/json3.min.js'
    ],
    css: [
        'vendor/jquery-ui/themes/start/jquery.ui.min.css',
        'vendor/jquery-ui/themes/base/jquery.ui.progressbar.css',
        'vendor/jquery-ui/themes/base/jquery.ui.slider.css',
        'vendor/jquery-ui/themes/start/jquery.ui.theme.css',
        'vendor/jquery-ui/themes/start/images/*',
        'vendor/jquery-ui/themes/base/images/*',
        'vendor/highlight.js/src/styles/github.css',
        'vendor/toastr/toastr.min.css'
    ]
  }
};
