var _ = require('underscore')
,   local = require('./config_local')

module.exports = _.extend({

     allowed_ops:   ['crop', 'resize']
    ,max_age:       31556926                // <- one year
    ,orig_dir:      'orig'

}, local)


