const auth = require('./authentication')
const Options = require('./options')()

var gitRev = require('git-rev')
var git = ''

gitRev.short(str => {
	git = str
})

function templateLocals(req, res, next) {
	res.locals.git = git
	if (process.env.NODE_ENV == "development") res.locals.dev = true
	if (req.session.kioskMode > 0) res.locals.kioskMode = true
	res.locals.loggedInUser = req.user
	res.locals.currentUserCan = function(perm) {
		return auth.userCan(req.user,perm)
	}
	res.locals.Options = {}
	res.locals.Options.get = Options.getText
	res.locals.moment = require('moment')
	next()
}

module.exports = function(apps) {
	return templateLocals
}
