var prefix = 'items';

var	express = require( 'express' ),
	app = express(),
	Items = require( __dirname + '/../models/items' ),
	Groups = require( __dirname + '/../models/groups' ),
	Departments = require( __dirname + '/../models/departments' ),
	ObjectId = require( 'mongoose' ).Schema.Types.ObjectId;

// Handle redirect
app.use( function( req, res, next ) {
	res.locals.currentModule = 'items';
	if ( ! req.session.user ) {
		req.session.requested = req.originalUrl;
		req.add_flash( 'danger', 'Please login' );
		res.redirect( '/login' );
	} else {
		next();
	}
} );

// Index
app.get( '/', function ( req, res ) {
	Departments.find( function( err, departments ) {
		var filter = {};
		if ( req.query.department ) filter.department = req.query.department;
		Items.find( filter ).populate( 'group' ).populate( 'department' ).sort( 'name' ).sort( 'barcode' ).exec( function( err, items ) {
			if ( req.session.user.isStaff ) {
				res.render( prefix + '/items', { items: items, departments: departments, selectedDepartment: req.query.department } );
			} else {
				res.render( prefix + '/items-minimal', { items: items, departments: departments, selectedDepartment: req.query.department } );
			}
		} );
	} );
} );

// Audit
app.get( '/audit', function ( req, res ) {
	res.locals.currentModule = 'audit';
	res.render( prefix + '/audit' );
} );

// Audit item
app.post( '/audit', function( req, res ) {
	var val = /([A-Z]{2,4})  ?([0-9]{2})/.exec( req.body.barcode.toUpperCase() );
	if ( val ) {
		barcode = val[1] + ' ' + val[2];
		Items.update( { barcode: barcode.toUpperCase() }, {
			$push: {
				transactions: {
					date: new Date(),
					user: req.session.user.id,
					status: 'audited'
				}
			}
		} ).then ( function ( status ) {
			if ( status.n == 1 ) {
				req.add_flash( 'success', 'Item audited' );
			} else {
				req.add_flash( 'danger', 'Item not found' );
			}
			res.redirect( req.body.modal ? req.body.modal : '/' + prefix + '/' + req.params.id );
		}, function ( err ) {
			req.add_flash( 'danger', 'Unknown item' );
			res.redirect( '/items/audit' );
		} );
	} else {
		req.add_flash( 'danger', 'Item barcode format invalid' );
		res.redirect( '/items/audit' );
	}
} )

// Generate items
app.get( '/generate', function ( req, res ) {
	Departments.find( function( err, departments ) {
		Groups.find( function( err, groups ) {
			if ( departments.length > 0 ) {
				req.add_flash( 'warning', 'Generating items cannot be undone, and can cause intense server load and result in generating large numbers of items that have invalid information' )
				res.render( prefix + '/generate', { departments: departments, groups: groups } );
			} else {
				req.add_flash( 'warning', 'Create at least one department before creating items' )
				res.redirect( '/' + prefix );
			}
		} );
	} );
} )

app.post( '/generate', function( req, res ) {
	var start = parseInt( req.body.start );
	var end = parseInt( req.body.end );

	if ( req.body.name == '' ) {
		req.add_flash( 'danger', 'The items require a name' );
		res.redirect( '/' + prefix + '/generate' );
		return;
	} else if ( req.body.prefix == '' ) {
		req.add_flash( 'danger', 'The items require a barcode prefix' );
		res.redirect( '/' + prefix + '/generate' );
		return;
	} else if ( req.body.prefix.trim().match( /^[A-Z]{3,4}$/i ) == null ) {
		req.add_flash( 'danger', 'The barcode prefix must contain 3 or 4 letters only.' );
		res.redirect( '/' + prefix + '/generate' );
		return;
	} else if ( start == '' || start < 1 ) {
		req.add_flash( 'danger', 'The item numbering must start at or above 1' );
		res.redirect( '/' + prefix + '/generate' );
		return;
	} else if ( end == '' || end < 2 ) {
		req.add_flash( 'danger', 'The item numbering must start at or above 2' );
		res.redirect( '/' + prefix + '/generate' );
		return;
	} else if ( end - start > 25 && ! req.body.largeBatch ) {
		req.add_flash( 'danger', "You can't generate more than 25 items at a time without confirming you want to do this" );
		res.redirect( '/' + prefix + '/generate' );
		return;
	} else if ( req.body.department == '' ) {
		req.add_flash( 'danger', 'The items must be assigned to a department' );
		res.redirect( '/' + prefix + '/generate' );
		return;
	}

	var items = [];

	for ( var i = start; i <= end; i++ ) {
		var item = {
			_id: require('mongoose').Types.ObjectId(),
			name: req.body.name.trim(),
			barcode: req.body.prefix.trim().toUpperCase(),
			value: req.body.value,
			department: req.body.department,
			group: req.body.group,
			notes: req.body.notes
		}
		var index = i.toString();
		if ( i < 10 ) index = '0' + index;
		if ( req.body.suffix ) item.name += " #" + index;
		if ( req.body.autoAudit ) {
			item.transactions = [ {
				date: new Date(),
				user: req.session.user.id,
				status: 'audited'
			} ];
		}
		item.barcode += ' ' + index;
		items.push( item );
	}

	Items.collection.insert( items, function( err, status ) {
		if ( ! err ) {
			req.add_flash( 'success', status.result.n + ' items created' );
			res.redirect( '/' + prefix );
		} else {
			if ( err.code == 11000 ) {
				req.add_flash( 'danger', 'One or more barcodes generated by this range were not unique' );
				res.redirect( '/' + prefix + '/generate' );
			}
		}
	} );
} )

// Create item
app.get( '/create', function ( req, res ) {
	Departments.find( function( err, departments ) {
		Groups.find( function( err, groups ) {
			if ( departments.length > 0 ) {
				res.render( prefix + '/create', { departments: departments, groups: groups } );
			} else {
				req.add_flash( 'warning', 'Create at least one department before creating items' )
				res.redirect( '/' + prefix );
			}
		} );
	} );
} )

app.post( '/create', function( req, res ) {
	var item = {
		_id: require('mongoose').Types.ObjectId(),
		name: req.body.name,
		barcode: req.body.barcode.toUpperCase(),
		value: req.body.value,
		department: req.body.department,
		group: req.body.group,
		notes: req.body.notes
	}

	if ( item.name == '' ) {
		req.add_flash( 'danger', 'The item requires a name' );
		res.redirect( '/' + prefix + '/create' );
		return;
	} else if ( item.barcode == '' ) {
		req.add_flash( 'danger', 'The item requires a unique barcode' );
		res.redirect( '/' + prefix + '/create' );
		return;
	} else if ( item.department == '' ) {
		req.add_flash( 'danger', 'The item must be assigned to a department' );
		res.redirect( '/' + prefix + '/create' );
		return;
	}

	new Items( item ).save( function ( err ) {
		if ( ! err ) {
			req.add_flash( 'success', 'Item created' );
			res.redirect( '/' + prefix );
		} else {
			if ( err.code == 11000 ) {
				req.add_flash( 'danger', 'Barcode is not unique' );
				res.redirect( '/' + prefix + '/create' );
			}
		}
	} );
} )

// List an item
app.get( '/:id', function( req, res ) {
	Items.findById( req.params.id ).populate( 'transactions.user' ).populate( 'department' ).exec( function( err, item ) {
		if ( item == undefined ) {
			req.add_flash( 'danger', 'Item not found' );
			res.redirect( '/' + prefix );
		} else {
			res.render( prefix + '/item', { item: item } );
		}
	} );
} )

// Edit item form
app.get( '/:id/edit', function( req, res ) {
	Items.findById( req.params.id ).exec( function( err, item ) {
		if ( item == undefined ) {
			req.add_flash( 'danger', 'Item not found' );
			res.redirect( '/' + prefix );
		} else {
			Groups.find( function( err, groups ) {
				Departments.find( function( err, departments ) {
					res.render( prefix + '/edit', { item: item, groups: groups, departments: departments } );
				} );
			} );
		}
	} );
} )

// Edit item handler
app.post( '/:id/edit', function( req, res ) {
	Items.update( { _id: req.params.id }, {
		$set: {
			name: req.body.name,
			barcode: req.body.barcode,
			group: req.body.group,
			department: req.body.department,
			value: req.body.value,
			notes: req.body.notes
		}
	} ).then( function ( status ) {
		if ( status.nModified == 1 && status.n == 1 ) {
			req.add_flash( 'success', 'Item updated' );
		} else if ( status.nModified == 0 && status.n == 1 ) {
			req.add_flash( 'warning', 'Item was not changed' );
		} else {
			req.add_flash( 'danger', 'There was an error updating the item' );
		}
		res.redirect( '/' + prefix + '/' + req.params.id );
	}, function ( status ) {
		req.add_flash( 'danger', 'There was an error updating the item' );
		res.redirect( '/' + prefix + '/' + req.params.id );
	} );
} )

module.exports = app;
module.exports.path = '/' + prefix;