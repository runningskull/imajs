# imajs 

      _                       _     
     (_)                     (_)    
      _   _ __ ___    __ _    _   ___ 
     | | | '_ ` _ \  / _` |  | | / __|
     | | | | | | | |  (_| |  | | \__ \
     |_| |_| |_| |_| \__,_|  | | |___/
                        _____/ |    
                        \______/     
     

pronounced "images"

## What Do It Do?
`imajs` is a simple server that connects to S3 and serves images w/ various transformations (crop, scale, etc...) applied on-demand. Resulting paths are CDN-friendly.

like this: `http://imajs.mysite.com/img/toocool.jpg/crop:119x67/resize:200/`

It also provides a URL for posting uploads (dumps them in S3 - see "uploads" below), and a very simple upload form (though you'd do better submitting images via ajax)

It's fully functional, but there's still a lot left it could (should?) do.

Do not use `imajs` to serve images directly. _It is meant to be used behind a CDN._


## What Do It _Not_ Do?
* Require you to pre-define any format/size variations
* Serve plain images (anywhere near) as fast as a static file server
* Timestamp/rename your files _(it **can** use subfolders. see the "upload" section below)_
* Cache anything
* Save transformed images back to S3

Do not use `imajs` to serve images directly. _It is meant to be used behind a CDN._


## OK. But why?
`imajs` makes it easy to enable a user to resize/crop their image after uploading it, without having to store the edited version(s) of the image alongside the original. 

It's also useful for prototyping, or other situations where you don't know what size/crop/[...] you'll need ahead of time. Or, any time you would rather request a transformation at runtime.

`imajs` URL's are CDN-friendly, and by default they get cached for 1 year _(see "config" below to change it)_ meaning it effectively only needs to generate each variation once ever.


## Go. Make It Do.
`git clone git@github.com:runningskull/imajs.git`

`cp config_local.sample.js config_local.js` - edit in your own AWS credentials

Then run `npm install` and 
`node app.js`


Then hit <a href="http://localhost:3000/">localhost:3000</a>


## Uploading
Just post your form to `/upload`. Make sure the image field's name is `img`.

The uploaded file will be stored in your designated S3 bucket and folder _(see "config" section below)_.

<h3>Subfolders</h3>
You can store a file in a subfolder by POST'ing it to `/upload/my_prefix/`. 

For instance, if you post `toocool.png` to `/upload/way/`, the file will be stored in S3 at `<orig_dir>/way/toocool.png` _(see "config" below for more on `orig_dir`)_

This helps avoid filename conflicts. For instance, you could upload each user's files to `/upload/<username>/` to keep everyone's files separate. You could even use `/upload/<username>/<timestamp>/` to make a conflict even less likely.


## Downloading
Downloading is straightforward. It works by hitting the `/img/` URL like this:

`http://imajs.mysite.com/img/[<command>:<parameters>]/[...]/[...]/`

Commands and parameters map to [ImageMagick command line options](http://www.imagemagick.org/script/command-line-options.php). Parameters map directly to [ImageMagick "geometry"](http://www.imagemagick.org/script/command-line-processing.php#geometry). Commands are executed in order.

Allowed [commands](http://www.imagemagick.org/script/command-line-options.php) are whitelisted. By default, the only ones allowed are `crop` and `resize` but allowing more is as simple as adding them to a list _(see "config" section below)_

<h3>One Exception</h3>
Commands and their params are passed directly into ImageMagick, with one exception. If you exclude `x` and `y` from a `crop` command (like `/crop:200x200/`), `imajs` will append `+0+0` to keep ImageMagick from breaking the image into tiles (meaning the crop will start at the top left of the image)


## Config
Edit your config by copying `config_local_sample.js` to `config_local.js` and editing that file. Here are the available config options:

* `allowed_ops` - an array containing the allowed ImageMagick commands 
    * Default: `['crop', 'resize']`
* `max_age` - how long the CDN should cache your images. Sent in the `Cache-Control` header of the response
    * Default: `31556926` (one year)
* `orig_dir` - the top level folder `imajs` knows about in your S3 bucket. Everything is stored inside this folder (see "subfolders" above for more)
    * Default: `'orig'`



## TODO:
`imajs` is fully functional, but not battle-hardened. Here's what's left to do (and there's probably more):

* extrapolate storage to enable backends besides S3
* expose more config options
* set maximum file upload size (& expose to config)
* general cleanup and whatnot



## KTHX
`imajs` is built from entirely FOSS components. Namely these:
    
* [Node.js](http://nodejs.org/)
* [Express](http://expressjs.com/)
* [ImageMagick](http://www.imagemagick.org/script/index.php) (via [node-imagemagick](https://github.com/rsms/node-imagemagick))
* [Knox](https://github.com/LearnBoost/knox)

Many thanks for the hard work of the superfly folks that make them.




