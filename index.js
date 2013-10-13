var ENV = process.env
,   _       = require('underscore')
,   config  = require('./config')
,   fs      = require('fs')
,   express = require('express')
,   knox    = require('knox')
,   magick  = require('imagemagick')
,   pipe    = require('multipart-pipe')

,   app = express()
,   s3 = knox.createClient(config.s3)

,   fixOpParams = {
        crop: function(params) {
            // Make sure the "+X+Y" is included, otherwise ImageMagick
            // thinks we want to make a bunch of tiles
            return (!~ params.indexOf('+')) ? params + '+0+0' : params
        }
    }


// "Fix" some config values for convenience
if (config.orig_dir[0] != '/') config.orig_dir = '/' + config.orig_dir
if (config.orig_dir[config.orig_dir.length-1] != '/') config.orig_dir += '/'


//~~ Ensure our tmp directory exists
fs.mkdir('/tmp/imajs', '777', function() {
    console.log('--- created directory ---')
})


//~~ We want to allow CORS
function allowXDM(req, res, next) {
    var aca = 'Access-Control-Allow-'
    ,   xf = function(s){ return 'X-File-'+s }

    res.header(aca + 'Origin', config.allow_origin)
    res.header(aca + 'Credentials', true)
    res.header(aca + 'Methods', 'POST, GET, PUT, OPTIONS')
    res.header(aca + 'Headers', ['Content-Type', xf('Name'), xf('Type'), xf('Size')])

    next()
}
//~~


//~~ Convenience/util functions
function _tmpfile(filename, prefix) {
    prefix = !!prefix ? (prefix + '-') : ''
    return '/tmp/imajs/' + prefix + Date.now() + '-' + filename
}

function _allowedOp(op) {
    return op.length && !!~config.allowed_ops.indexOf(op)
}

function _parseCmds(cfg) {
    var arr = cfg ? cfg.split('/') : []
    ,   commands = []

    // special case. we want the original image.
    if (! cfg) return

    for (var i=0; i<arr.length; i++) {
        var cmd = arr[i].split(':')

        // Whitelist
        if (! _allowedOp(cmd[0])) continue

        // In some cases, we need to tack on some boilerplate to the params
        if (fixOpParams.hasOwnProperty(cmd[0])) cmd[1] = fixOpParams[cmd[0]](cmd[1])

        // Prepend a '-' since these run via command line
        cmd[0] = '-' + cmd[0]
        commands = commands.concat(cmd)
    }

    return commands
}
//~~


app.configure(function() {
    app.use(express.logger())
    app.use(express.json())
    app.use(express.urlencoded())
    app.use(allowXDM)

    app.use('/upload', express.multipart({
        defer: true,
        limit: '128mb'
    }))
    app.use('/upload', pipe.s3(s3, {
        'content-type': /^image\/.*$/i,
        filename: function (fn, req) {
            return config.orig_dir + (!!req.params.prefix ? req.params.prefix + '-' : '') + fn
        }
    }))
})


app.get('/$', function(req, res) {
    fs.readFile('txt', function(err, data) {
        res.contentType('text/html')
        res.end('<pre style="text-align:center">'+data+'</pre>')
    })
})


app.options('/upload/?:prefix?/?$', function(req, res) {
    res.end()
})


app.get('/upload/?$', function(req, res) {
    res.contentType('text/html')
    res.end('<form action="/upload/" method="POST" enctype="multipart/form-data">'+
            '   <input type="file", name="img" /><br/><br/>'+
            '   <input type="submit" name="submit" />'+
            '</form>')
})


app.post('/upload/?:prefix?/?$', function(req, res) {
    res.json({status:ok, files: req.uploaded_files})
})


app.get('/img/:filename/?(/*)?', function(req, res) {

    function _serve(path) {
        res.sendfile(path, function() {
            fs.unlink(path)
        })
    }

    var commands = _parseCmds(req.params[0])
    ,   filename = req.params.filename
    ,   tmpFile = _tmpfile(filename)
    ,   destFile = _tmpfile(filename, 'transformed')

    res.setHeader('Cache-Control', 'max-age=' + config.max_age)

    s3.get(config.orig_dir + filename).on('response', function(s3res) {
        var stream = fs.createWriteStream(tmpFile)

        s3res.on('data', function(chunk) {
            stream.write(chunk)
        }).on('end', function() {
            stream.end()

            // Do we just want the original file?
            if (! commands)
                return _serve(tmpFile)

            magick.convert(_.flatten([tmpFile, commands, destFile]), function(err, meta) {
                fs.unlink(tmpFile)
                _serve(destFile)
            })
        })
    }).end()
})




// Go, Lassie, go!

var port = ENV.PORT || 3000;
app.listen(port, function(){
    console.log('Listening on ' + port)
});


