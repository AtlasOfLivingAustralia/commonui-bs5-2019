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


function bootstrapCSS() {
    const bootstrapCSSSource = paths.styles["boostrap-ala"];
    const bootstrapCSSDest = paths.styles.dest;
    // Write unminified first (separate src so both outputs are always fresh)
    src(bootstrapCSSSource)
        .pipe(gulpSass({precision: 9}).on('error', gulpSass.logError))
        .pipe(rename('bootstrap.css'))
        .pipe(dest(bootstrapCSSDest));
    return src(bootstrapCSSSource)
        .pipe(gulpSass({precision: 9}).on('error', gulpSass.logError))
        .pipe(cleanCSS())
        .pipe(rename('bootstrap.min.css'))
        .pipe(dest(bootstrapCSSDest));
}

function autocompleteCSS() {
    return src(paths.styles.jqueryui)
        .pipe(rename('autocomplete.css'))
        .pipe(dest(paths.styles.dest))
        .pipe(cleanCSS())
        .pipe(rename('autocomplete.min.css'))
        .pipe(dest(paths.styles.dest));
}

function fontawesome() {
    return src(paths.styles["font-awesome"])
        .pipe(gulpSass({precision: 9}).on('error', gulpSass.logError))
        .pipe(rename('font-awesome.css'))
        .pipe(dest(paths.styles.dest))
        .pipe(cleanCSS())
        .pipe(rename('font-awesome.min.css'))
        .pipe(dest(paths.styles.dest));
}

function otherCSSFiles() {
    return src(paths.styles.dependencycss)
        .pipe(dest(paths.styles.dest))
        .pipe(cleanCSS())
        .pipe(rename({extname: '.min.css'}))
        .pipe(dest(paths.styles.dest));
}

var css = parallel(bootstrapCSS, fontawesome, autocompleteCSS, otherCSSFiles);

function applyMustache(content, vars) {
    Object.keys(vars).forEach(function(key) {
        content = content.split('{{' + key + '}}').join(vars[key] != null ? String(vars[key]) : '');
    });
    content = content.split('==homeDomain==').join(buildvars.homeDomain);
    content = content.split('==signUpURL==').join(buildvars.signUpURL);
    content = content.split('==profileURL==').join(buildvars.profileURL);
    content = content.split('==fathomID==').join(buildvars.fathomID);
    return content;
}

// Shared test values
var TEST_HEADER_FOOTER_SERVER = 'https://www-test.ala.org.au/commonui-bs5-2019/';
var TEST_SEARCH_SERVER        = 'https://bie.ala.org.au';
var TEST_SEARCH_PATH          = '/search';
var TEST_LOGIN_URL            = 'https://auth-test.ala.org.au/cas/login?service=https%3A%2F%2Ftest.ala.org.au%2F';
var TEST_LOGOUT_URL           = 'https://auth-test.ala.org.au/cas/logout';
var TEST_PROFILE_URL          = buildvars.profileURL;

// The four rendering combinations
var VARIANTS = [
    { name: 'container-signedOut',   containerClass: 'container',       loginStatus: 'signedOut', loggedIn: false, loggedOut: true  },
    { name: 'container-signedIn',    containerClass: 'container',       loginStatus: 'signedIn',  loggedIn: true,  loggedOut: false },
    { name: 'fluid-signedOut',       containerClass: 'container-fluid', loginStatus: 'signedOut', loggedIn: false, loggedOut: true  },
    { name: 'fluid-signedIn',        containerClass: 'container-fluid', loginStatus: 'signedIn',  loggedIn: true,  loggedOut: false },
];

function buildMustacheVars(variant) {
    return {
        headerFooterServer : TEST_HEADER_FOOTER_SERVER,
        centralServer      : buildvars.homeDomain,
        searchServer       : TEST_SEARCH_SERVER,
        searchPath         : TEST_SEARCH_PATH,
        containerClass     : variant.containerClass,
        loginURL           : TEST_LOGIN_URL,
        logoutURL          : TEST_LOGOUT_URL,
        myProfileURL       : TEST_PROFILE_URL,
        editAccountLink    : TEST_PROFILE_URL,
        loginStatus        : variant.loginStatus,
        loggedIn           : variant.loggedIn,
        loggedOut          : variant.loggedOut,
        fathomID           : buildvars.fathomID
    };
}

/**
 * Render standalone banner-*.html and footer-*.html files for each variant.
 */
function testHTMLVariants(cb) {
    var bannerTemplate = fs.readFileSync('source/html/banner.mustache', 'utf8');
    var footerTemplate = fs.readFileSync('source/html/footer.mustache', 'utf8');

    VARIANTS.forEach(function(variant) {
        var vars = buildMustacheVars(variant);
        fs.writeFileSync(
            'build/banner-' + variant.name + '.html',
            applyMustache(bannerTemplate, vars)
        );
        fs.writeFileSync(
            'build/footer-' + variant.name + '.html',
            applyMustache(footerTemplate, vars)
        );
    });
    cb();
}

function testHTMLPage() {
    var bannerTemplate = fs.readFileSync('source/html/banner.mustache', 'utf8');
    var footerTemplate = fs.readFileSync('source/html/footer.mustache', 'utf8');

    // Render all 4 banner+footer combinations
    var renderedVariants = VARIANTS.map(function(variant) {
        var vars = buildMustacheVars(variant);
        return {
            name:   variant.name,
            banner: applyMustache(bannerTemplate, vars),
            footer: applyMustache(footerTemplate, vars)
        };
    });

    return src('source/html/testTemplate.html')
        .pipe(replace('VARIANT_CONTAINER_SIGNEDOUT_HEADER', renderedVariants[0].banner))
        .pipe(replace('VARIANT_CONTAINER_SIGNEDIN_HEADER',  renderedVariants[1].banner))
        .pipe(replace('VARIANT_FLUID_SIGNEDOUT_HEADER',     renderedVariants[2].banner))
        .pipe(replace('VARIANT_FLUID_SIGNEDIN_HEADER',      renderedVariants[3].banner))
        .pipe(replace('VARIANT_CONTAINER_SIGNEDOUT_FOOTER', renderedVariants[0].footer))
        .pipe(replace('VARIANT_CONTAINER_SIGNEDIN_FOOTER',  renderedVariants[1].footer))
        .pipe(replace('VARIANT_FLUID_SIGNEDOUT_FOOTER',     renderedVariants[2].footer))
        .pipe(replace('VARIANT_FLUID_SIGNEDIN_FOOTER',      renderedVariants[3].footer))
        .pipe(replace(/==homeDomain==/g, buildvars.homeDomain))
        .pipe(replace(/==signUpURL==/g,  buildvars.signUpURL))
        .pipe(replace(/==profileURL==/g, buildvars.profileURL))
        .pipe(replace(/==fathomID==/g,   buildvars.fathomID))
        .pipe(rename('testPage.html'))
        .pipe(dest(paths.mustache.dest));
};

function mustache() {
    return src(paths.mustache.src)
        .pipe(replace(/==homeDomain==/g, buildvars.homeDomain))
        .pipe(replace(/==signUpURL==/g, buildvars.signUpURL))
        .pipe(replace(/==profileURL==/g, buildvars.profileURL))
        .pipe(replace(/==fathomID==/g, buildvars.fathomID))
        .pipe(dest(paths.mustache.dest));
};

function font() {
    return src(paths.font.src)
        .pipe(dest(paths.font.dest));
}

function jQuery() {
    return src(paths.js.jquery)
        .pipe(uglify({output: {comments: '/^!/'}}))
        .pipe(rename('jquery.min.js'))
        .pipe(dest(paths.js.dest));
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

var build = parallel(css, series(testHTMLVariants, testHTMLPage), mustache, font, js);

exports.otherCSSFiles = otherCSSFiles;

exports.default = build;
exports.css = css;
exports.font = font;
exports.js = js;
exports.mustache = series([testHTMLVariants, testHTMLPage, mustache]);
exports.build = build;
