const express = require('express');

const app = express();

const ApiController = require('./controller');
const auth = require('../../src/js/authentication');

app.set( 'views', __dirname + '/views' );

app.use((req, res, next) => {
  req.controller = new ApiController();
  next();
});

app.get('/search/:term', auth.isLoggedIn, (req, res) => {
  req.controller.getSearch(req, res);
});

app.get( '/identify/:term', auth.isLoggedIn, (req, res) => {
  req.controller.getIdentify(req, res);
});

app.get('/user/:barcode', auth.isLoggedIn, (req, res) => {
  req.controller.getUser(req, res);
});

app.get('/item/:barcode', auth.isLoggedIn, (req, res) => {
  req.controller.getItem(req, res);
});

app.post('/audit/:item', auth.isLoggedIn, (req, res) => {
  req.controller.postAudit(req, res);
});

app.post('/return/:item', auth.isLoggedIn, (req, res) => {
  req.controller.postReturn(req, res);
});

app.post('/broken/:item', auth.isLoggedIn, (req, res) => {
  req.controller.postBroken(req, res);
});

app.post( '/lost/:item', auth.isLoggedIn, (req, res) => {
  req.controller.postLost(req, res);
});

app.post( '/issue/:item/:user', auth.isLoggedIn, (req, res) => {
  req.controller.postIssue(req, res);
});

app.post( '/label/:item', auth.isLoggedIn, (req, res) => {
  req.controller.postLabel(req, res);
});

app.post( '/new-user', auth.isLoggedIn, (req, res) => {
  req.controller.postNewUser(req, res);
});

app.get('/history', auth.isLoggedIn, (req, res) => {
  req.controller.getHistory(req, res);
});

module.exports = function( config ) { return app; };
