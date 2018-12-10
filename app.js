require('dotenv').config();

var __home = __dirname;
var __static = __home + '/static';
var __src = __home + '/src';
var __apps = __home + '/apps';
var __views = __src + '/views';
var __js = __src + '/js';

console.log();
console.log( "Checkout" );
console.log( "========" );
console.log();
console.log( "Starting..." );
console.log();

var db = require( __js + '/database' )( process.env.APP_PG );

var express = require( 'express' ),
	app = express(),
	server = require( 'http' ).Server( app );

var flash = require( 'express-flash' ),
	body = require( 'body-parser' );

var app_loader = require( __js + '/app-loader' );

// Use helmet
app.use( helmet() );

// Handle authentication
require( __js + '/authentication' ).auth( app );

// Setup static route
app.use( express.static( __static ) );

// Handle sessions
require( __js + '/sessions' )( app );

// Include support for notifications
app.use( flash() );
app.use( require( __js + '/quickflash' ) );

// Enable form body decoding
app.use( body.json() );
app.use( body.urlencoded( { extended: true } ) );

// Use PUG to render pages
app.set( 'views', __views );
app.set( 'view engine', 'pug' );
app.set( 'view cache', false );

// Load apps
app_loader( app );

// Start server
var listener = server.listen( process.env.APP_PORT ,process.env.APP_HOST, function () {
	console.log( "Server started on: " + listener.address().address + ':' + listener.address().port );
	console.log();
} );
