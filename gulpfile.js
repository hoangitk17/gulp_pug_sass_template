const { src, dest, watch, series, parallel } = require("gulp");
// Load environtment variables
require("dotenv").config();
// Plugin to use with pug template
const pug = require("gulp-pug");
// Plugin to convert sass -> css
const sass = require("gulp-sass")(require("sass"));
const postcss = require("gulp-postcss"),
  // Add prefix for css ex: -moz-, ...
  autoprefixer = require("autoprefixer"),
  // Minify css ex: remove space, ...
  cssnano = require("cssnano"),
  babel = require("gulp-babel"),
  minify = require("gulp-minify"),
  concat = require("gulp-concat");

// Create server on local environtment
const browserSync = require("browser-sync").create();

// Create path config for project
const paths = {
  styles: {
    watch: ["src/scss/**/*.scss"],
    src: ["src/scss/pages/*.scss"],
    dest: "dist/css",
  },
  scripts: {
    src: ["src/js/pages/*.js"],
    dest: "dist/js",
  },
  pugs: {
    src: ["src/pages/*.pug"],
    dest: "dist",
  },
};

/**
 *
 * Convert pug -> html
 */
function doPugs() {
  return src(paths.pugs.src)
    .pipe(pug({ pretty: true }))
    .pipe(dest(paths.pugs.dest))
    .pipe(browserSync.stream());
}

/**
 *
 * Convert scss -> css
 */

function doStyles(done) {
  return series(style, (done) => {
    done();
  })(done);
}

function style() {
  return src(paths.styles.src)
    .pipe(sass())
    .on("error", sass.logError)
    .pipe(postcss([autoprefixer(), cssnano()]))
    .pipe(dest(paths.styles.dest))
    .pipe(browserSync.stream());
}

/* SCRIPTS */
const SCRIPT_PATH_CONFIG = {
  babelPath: { dest: "dist/js/babel/" },
  concat: {
    src: [],
    dest: "dist/js/concat/",
    outputFileName: "global-concat.js",
  },
  minify: {
    src: ["dist/js/babel/*.js", "dist/js/concat/*.js"],
  },
  clean: {
    src: [
      "dist/js/babel",
      "dist/js/concat",
      "dist/js/min/*.js",
      "!dist/js/min/*.min.js",
    ],
  },
};
function doScripts(done) {
  return series(
    preprocessJs,
    concatJs,
    minifyJs,
    // deleteArtifactJs,
    reload
  )(done);
}

function preprocessJs() {
  return src(paths.scripts.src)
    .pipe(
      babel({
        presets: ["@babel/env"],
        // plugins: ["@babel/plugin-proposal-class-properties"]
      })
    )
    .pipe(dest(SCRIPT_PATH_CONFIG.babelPath.dest));
}

function concatJs(done) {
  if (SCRIPT_PATH_CONFIG.concat.src.length === 0) {
    done();
    return;
  }
  return src(SCRIPT_PATH_CONFIG.concat.src)
    .pipe(concat(SCRIPT_PATH_CONFIG.concat.outputFileName))
    .pipe(dest(SCRIPT_PATH_CONFIG.concat.dest));
}

function minifyJs() {
  return src(SCRIPT_PATH_CONFIG.minify.src)
    .pipe(
      minify({
        ext: {
          src: ".js",
          min: ".min.js",
        },
      })
    )
    .pipe(dest(paths.scripts.dest));
}

function deleteArtifactJs() {
  // return del(SCRIPT_PATH_CONFIG.clean.src);
}
/* END SCRIPTS */

function reload(done) {
  browserSync.reload();
  done();
}

/* GENERIC THINGS */
function cacheBust(src, destPath) {
  const cbString = new Date().getTime();
  return src(src)
    .pipe(
      replace(/cache_bust=\d+/g, function () {
        return "cache_bust=" + cbString;
      })
    )
    .pipe(dest(destPath));
}

/**
 * Run on development environtment
 */
function serve() {
  browserSync.init({
    server: "./dist",
  });
  parallel(doStyles, doScripts, doPugs)
  watch(paths.styles.watch,{ ignoreInitial: false }, doStyles);
  watch(paths.pugs.src, { ignoreInitial: false }, { events: "change" }, doPugs);
  watch(paths.scripts.src,{ ignoreInitial: false }, doScripts);
}

exports.watch = serve ;
