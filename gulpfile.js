var gulp = require('gulp'),
    gulpSass = require('gulp-sass')(require('sass')),
    cleanCSS = require('gulp-clean-css'),
    rename = require('gulp-rename'),
    replace = require('gulp-replace'),
    uglify = require('gulp-uglify'),
    babel = require('gulp-babel'),
    fs = require('fs'),
    gulpClean = require('gulp-clean'),
    buildvars = require('./buildvars.js');

const {src, dest, series, parallel} = gulp;

var paths = {
    styles: {
        'boostrap-ala': 'source/scss/bootstrap-ala.scss',
        'font-awesome': 'source/vendor/fontawesome/scss/fontawesome.scss',
        dest: 'build/css/',
        jqueryui: 'source/vendor/jquery/jquery-ui-autocomplete.css',
        dependencycss: ['source/css/*.css']
    },
    mustache: {
        src: ['source/html/banner.mustache', 'source/html/footer.mustache', 'source/html/head.mustache'],
        dest: 'build/'
    },
    font: {
        src: ['source/vendor/old-fonts/*.*'],
        dest: 'build/fonts/'
    },
    js: {
        src: [
            'source/js/application.js'
        ],
        dest: 'build/js/',
        jquery: 'source/vendor/jquery/jquery-3.7.1.js',
        bootstrap: 'source/vendor/bootstrap/dist/js/bootstrap.bundle.js',
        jqueryui: 'source/vendor/jquery/jquery-ui-autocomplete.js'
    }
};


function bootstrapCSS(cb) {

    const bootstrapCSSSource = paths.styles["boostrap-ala"];
    const bootstrapCSSDest = paths.styles.dest;
    //console.log('src: ' + bootstrapCSSSource);
    //console.log('dest: ' + bootstrapCSSDest);
    src(bootstrapCSSSource)
        .pipe(gulpSass({precision: 9}).on('error', gulpSass.logError))
        .pipe(cleanCSS())
        .pipe(rename('bootstrap.min.css'))
        .pipe(dest(bootstrapCSSDest));
    cb();
}

function autocompleteCSS(cb) {
    src(paths.styles.jqueryui)
        .pipe(rename('autocomplete.css'))
        .pipe(dest(paths.styles.dest))
        .pipe(cleanCSS())
        .pipe(rename('autocomplete.min.css'))
        .pipe(dest(paths.styles.dest));
    cb();
}

function fontawesome(cb) {
    src(paths.styles["font-awesome"])
        .pipe(gulpSass({precision: 9}).on('error', gulpSass.logError))
        .pipe(rename('font-awesome.css'))
        .pipe(dest(paths.styles.dest))
        .pipe(cleanCSS())
        .pipe(rename('font-awesome.min.css'))
        .pipe(dest(paths.styles.dest));
    cb();
}

function otherCSSFiles(cb) {
    src(paths.styles.dependencycss)
        .pipe(dest(paths.styles.dest))
        .pipe(cleanCSS())
        .pipe(rename({extname: '.min.css'}))
        .pipe(dest(paths.styles.dest));
    cb();
}

var css = parallel(bootstrapCSS, fontawesome, autocompleteCSS, otherCSSFiles);

function testHTMLPage() {
    var header = fs.readFileSync('source/html/banner.mustache');
    var footer = fs.readFileSync('source/html/footer.mustache');
    return src('source/html/testTemplate.html')
        .pipe(replace('HEADER_HERE', header))
        .pipe(replace('FOOTER_HERE', footer))
        .pipe(replace(/::containerClass::/g, 'container-fluid'))
        .pipe(replace(/::headerFooterServer::/g, 'https://www-test.ala.org.au/commonui-bs5-2019/'))
        .pipe(replace(/::loginStatus::/g, 'signedOut'))
        .pipe(replace(/::loginURL::/g, 'https://auth.ala.org.au/cas/login'))
        .pipe(replace(/::logoutURL::/g, 'https://auth.ala.org.au/cas/logout'))
        .pipe(replace(/::searchServer::/g, 'https://bie.ala.org.au'))
        .pipe(replace(/::searchPath::/g, '/search'))
        .pipe(replace(/==homeDomain==/g, buildvars.homeDomain))
        .pipe(replace(/==signUpURL==/g, buildvars.signUpURL))
        .pipe(replace(/==profileURL==/g, buildvars.profileURL))
        .pipe(replace(/==fathomID==/g, buildvars.fathomID))
        .pipe(rename('testPage.html'))
        .pipe(dest(paths.mustache.dest));
};

function mustache(cb) {
    src(paths.mustache.src)
        .pipe(replace(/==homeDomain==/g, buildvars.homeDomain))
        .pipe(replace(/==signUpURL==/g, buildvars.signUpURL))
        .pipe(replace(/==profileURL==/g, buildvars.profileURL))
        .pipe(replace(/==fathomID==/g, buildvars.fathomID))
        .pipe(dest(paths.mustache.dest));
    cb();
};

function font() {
    return src(paths.font.src)
        .pipe(dest(paths.font.dest));
}

function jQuery(cb) {
    src(paths.js.jquery)
        .pipe(uglify({output: {comments: '/^!/'}}))
        .pipe(rename('jquery.min.js'))
        .pipe(dest(paths.js.dest));
    cb();
}

function bootstrapJS() {
    return src(paths.js.bootstrap)
        .pipe(uglify({output: {comments: '/^!/'}}))
        .pipe(rename('bootstrap.min.js'))
        .pipe(dest(paths.js.dest));
}

function autocompleteJS() {
    return src(paths.js.jqueryui)
        .pipe(uglify({output: {comments: '/^!/'}}))
        .pipe(rename('autocomplete.min.js'))
        .pipe(dest(paths.js.dest));
}

function otherJsFiles() {
    return src(paths.js.src)
        .pipe(dest(paths.js.dest))
        .pipe(babel({presets: ['@babel/preset-env']}))
        .pipe(uglify({output: {comments: '/^!/'}}))
        .pipe(rename({extname: '.min.js'}))
        .pipe(dest(paths.js.dest));
}

var js = parallel(jQuery, bootstrapJS, autocompleteJS, otherJsFiles);

var build = parallel(css, testHTMLPage, mustache, font, js);

exports.otherCSSFiles = otherCSSFiles;
  
exports.default = build;
exports.css = css;
exports.font = font;
exports.js = js;
exports.mustache = series([testHTMLPage, mustache]);
exports.build = build;
