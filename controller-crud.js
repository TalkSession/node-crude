/**
 * @fileOverview CRUD controller.
 */
var fs = require('fs');
var util = require('util');

var mime = require('mime');
var __ = require('lodash');
var jade = require('jade');

var Controller = require('./controller');
var tplHelpers = require('./tpl-helpers.js');

var PaginationMidd = require('./pagination.midd');

/**
 * The CRUD Controller
 *
 * @param {crude.Entity} Entity an instance of the Entity class.
 * @param {string} baseUrl The base url.
 * @param {Object=} optOpts Optionally define options.
 * @contructor
 * @extends {crude.Controller}
 */
var CrudCtrl = module.exports = function(Entity, baseUrl, optOpts){
  Controller.apply(this, arguments);

  this.Entity = Entity;
  this.baseUrl = baseUrl;
  this._schemaViews = null;
  var defaultOpts = {
    baseUrl: baseUrl,
    urlField: 'localUrl',
    nameField: 'name',
    idField: 'id',
    // A jade view
    layoutView: null,
    // The edit / create view.
    editView: null,
    // show the doc id
    showId: false,
    // show full path for netsted paths
    expandPaths: false,
    // paths to exclude when displaying
    viewExcludePaths: [],
  };
  this.opts = __.extend(defaultOpts, optOpts || {});

  // prep pagination
  var paginationMidd = new PaginationMidd();

  // define CRUD handlers
  this.create = [
    this._prepResponse.bind(this),
    this._create.bind(this),
  ];
  this.createView = [
    this._prepResponse.bind(this),
    this._createView.bind(this),
  ];
  this.readList = [
    this._prepResponse.bind(this),
    paginationMidd.paginate(Entity),
    this._readList.bind(this),
  ];
  this.readOne = [
    this._prepResponse.bind(this),
    this._readOne.bind(this),
  ];
  this.update = [
    this._prepResponse.bind(this),
    this._update.bind(this),
  ];
  this.updateView = [
    this._prepResponse.bind(this),
    this._updateView.bind(this),
  ];
  this.delete = [this._delete.bind(this)];

  // set default view template locations
  this.views = {
    add: __dirname + '/views/add.jade',
    view: __dirname + '/views/view.jade',
    list: __dirname + '/views/list.jade',
    edit: __dirname + '/views/edit.jade',
  };

  this.compiled = {};

  __.forOwn(this.views, function(tpl, key) {
    fs.readFile(tpl, function(err, data){
      if (err) {
        console.error('Error Reading file "' + tpl + '", error:', err);
        return;
      }
      this.compiled[key] = jade.compile(data, {
        filename: tpl
      });

    }.bind(this));
  }, this);
};
util.inherits(CrudCtrl, Controller);

/** @define {string} The view key in which the output will be available.  */
CrudCtrl.VIEW_OUTPUT_KEY = 'crudView';

/**
 * Mark the proto to check for proper inheritance of methods,
 * we do this so we can lax comparison by not relying 100% on "instanceof".
 *
 * @type {boolean}
 * @protected
 */
CrudCtrl.prototype._isCrude = true;

/**
 * Insert at the beginning of all routes the provided middleware.
 *
 * @param  {Function} middleware The middleware to insert.
 */
CrudCtrl.prototype.unshiftAllRoutes = function(middleware) {
  this.create.unshift(middleware);
  this.createView.unshift(middleware);
  this.readList.unshift(middleware);
  this.readList.unshift(middleware);
  this.update.unshift(middleware);
  this.updateView.unshift(middleware);
  this.delete.unshift(middleware);
};

/**
 * Insert at the end of all routes the provided middleware.
 *
 * @param  {Function} middleware The middleware to insert.
 */
CrudCtrl.prototype.pushAllRoutes = function(middleware) {
  this.create.push(middleware);
  this.createView.push(middleware);
  this.readList.push(middleware);
  this.readList.push(middleware);
  this.update.push(middleware);
  this.updateView.push(middleware);
  this.delete.push(middleware);
};

/**
 * Getter for baseUrl variable, overwrite if custom routing is required.
 *
 * @param {Object} req The request Object.
 * @return {string} The baseUrl.
 */
CrudCtrl.prototype.getBaseUrl = function(req) {
  return this.baseUrl;
};

/**
 * Prepare the response object for each request, an internal middleware.
 *
 * @param {Object} req The request Object.
 * @param {Object} res The response Object.
 * @param {Function} next callback.
 * @protected
 */
CrudCtrl.prototype._prepResponse = function(req, res, next) {
  res.locals.opts = this.opts;
  res.locals.schema = this._getSchema();
  res.locals.currentUser = req.user;
  // all template functions
  res.locals.fn = {};
  __.extend(res.locals.fn, tplHelpers);

  next();
};

/**
 * Add fields required for the views to render properly.
 *
 * Render at first runtime and serve cached afterwards.
 *
 * @return {Object} An extended mongoose schema.
 */
CrudCtrl.prototype._getSchema = function() {
  if (this._schemaViews) {
    return this._schemaViews;
  }

  var schemaViews = this._schemaViews = Object.create(this.Entity.Model.schema.paths);

  __.forIn(schemaViews, function(schemaItem, path) {
    schemaViews[path]._viewData = {
      canShow: tplHelpers.canShow(schemaItem, this.opts),
      name: tplHelpers.getName(path, this.opts),
    };
  }, this);

  return schemaViews;
};

/**
 * Handle new item creation
 *
 * @param {Object} req The request Object.
 * @param {Object} res The response Object.
 * @protected
 */
CrudCtrl.prototype._create = function(req, res) {
  this.Entity.create(req.body, this._createCallback.bind(this, req, res));
};

/**
 * Handle a new item save, this is the CrudCtrl Entity Save callback.
 *
 * @param {Object} req The request Object.
 * @param {Object} res The response Object.
 * @param {Error=} err Operation failed.
 * @param {mongoose.Document} optDoc The saved document.
 * @protected
 */
CrudCtrl.prototype._createCallback = function(req, res, err, optDoc){
  var rdrUrl = this.getBaseUrl(req) + '/add';

  if (err) {
    return this.handleError(req, res, err, rdrUrl);
  }

  if (!__.isObject(optDoc)) {
    return this.handleError(req, res, new Error('An error occured, please' +
      ' try again. #200'), rdrUrl);
  }

  if (!__.isString(optDoc[this.opts.urlField])) {
    return this.handleError(req, res, new Error('An error occured, please' +
      ' try again. #201'), rdrUrl);
  }

  this.addFlashSuccess(req, optDoc);
  res.redirect(this.getBaseUrl(req) + '/' + optDoc[this.opts.urlField]);
};

/**
 * Create an item view.
 *
 * @param {Object} req The request Object.
 * @param {Object} res The response Object.
 * @protected
 */
CrudCtrl.prototype._createView = function(req, res){
  this.checkFlashError(req, res);
  this.checkFlashSuccess(req, res);
  res.render(this.opts.editView);
};

/**
 * Handle item listing.
 *
 * @param {Object} req The request Object.
 * @param {Object} res The response Object.
 * @protected
 */
CrudCtrl.prototype._readList = function(req, res){
  // render the template and store in response locals.
  res.locals[CrudCtrl.VIEW_OUTPUT_KEY] = this.compiled.list(res.locals);

  if (!this.opts.layoutView) {
    res.send(res.locals[CrudCtrl.VIEW_OUTPUT_KEY]);
  } else {
    res.render(this.opts.layoutView);
  }
};

/**
 * Handle a single item view.
 *
 * @param {Object} req The request Object.
 * @param {Object} res The response Object.
 * @protected
 */
CrudCtrl.prototype._readOne = function(req, res){
  // attempt to fetch the record...
  var query = new Object(null);
  query[this.opts.urlField] = req.params.id;

  this.Entity.readOne(query, function(err, doc){
    if (err) {
      this.addError(res, err);
      return res.render(this.views.view);
    }

    if (!doc) {
      var error = new Error('No results');
      this.addError(res, error);
      return res.render(this.views.view);
    }

    // assign the item to the tpl vars.
    res.locals.item = doc;

    this.checkFlashSuccess(req, res);

    // render the template and store in response locals.
    res.locals[CrudCtrl.VIEW_OUTPUT_KEY] = this.compiled.view(res.locals);

    if (!this.opts.layoutView) {
      res.send(res.locals[CrudCtrl.VIEW_OUTPUT_KEY]);
    } else {
      res.render(this.opts.layoutView);
    }
  }.bind(this));
};

/**
 * Handle item update.
 *
 * @param {Object} req The request Object.
 * @param {Object} res The response Object.
 * @protected
 */
CrudCtrl.prototype._update = function(req, res) {
  if (!req.body.id) {
    return res.send('Not implemented. No "id" field passed');
  }
  if (!this.opts.editView) {
    return res.send('Not implemented. Define "editView" parameter.');
  }

  this.Entity.update(req.body.id, this.process(req.body),
    this._updateCallback.bind(this, req, res));
};


/**
 * Handle an update callback, this is the Entity save callback.
 *
 * @param {Object} req The request Object.
 * @param {Object} res The response Object.
 * @param {Error=} err Operation failed.
 * @param {mongoose.Document} doc The mongoose document.
 * @protected
 */
CrudCtrl.prototype._updateCallback = function(req, res, err, doc){

  if (err) {
    return this.handleError(req, res, err, req.header('Referer'));
  }

  var finalPath = req.url.split('/').pop();
  if (doc[this.opts.urlField] !== finalPath) {
    // log.fine('_updateCallback() :: Changed url. Old:', req.url, 'New:', doc);
    this.addFlashSuccess(req, doc);
    return res.redirect(this.getBaseUrl(req) + '/' + doc._localUrl);
  }

  this.addSuccess(res, doc);
  res.locals.item = doc;

  // render the template and store in response locals.
  res.locals[CrudCtrl.VIEW_OUTPUT_KEY] = this.compiled.view(res.locals);
  if (!this.opts.layoutView) {
    res.send(res.locals[CrudCtrl.VIEW_OUTPUT_KEY]);
  } else {
    res.render(this.opts.layoutView);
  }
};

/**
 * Show single item update view
 *
 * @param {Object} req The request Object.
 * @param {Object} res The response Object.
 * @protected
 */
CrudCtrl.prototype._updateView = function(req, res) {
  if (!this.opts.editView) {
    return res.send('Not implemented. Define "editView" parameter.');
  }

  // attempt to fetch the record...
  var query = new Object(null);
  query[this.opts.urlField] = req.params.id;
  this.Entity.readOne(query, function(err, doc){
    if (err) {
      this.addError(res, err);
      return res.render(this.opts.editView);
    }

    if (!doc) {
      var error = new Error('No results');
      this.addError(res, error);
      return res.render(this.opts.editView);
    }

    // assign the item to the tpl vars.
    res.locals.item = doc;

    this.checkFlashError(req, res);

    res.render(this.opts.editView);
  }.bind(this));
};


/**
 * Handle item deletion.
 *
 * @param {Object} req The request Object.
 * @param {Object} res The response Object.
 * @protected
 */
CrudCtrl.prototype._delete = function(req, res){
  res.send('NOT IMPLEMENTED');
};

/**
 * Process incoming POST vars, we will:
 *  * Remove all vars starting with underscore ( _ ).
 *
 *
 * This is not a validation step, just forbid "private" keys from passing.
 *
 * @param  {Object} params Hash with key / value pairs
 * @return {Object} a processed object.
 */
CrudCtrl.prototype.process = function(params) {
  var outObj = {};
  __.forOwn(params, function(value, key){
    if ('_' !== key.charAt(0)) {
      outObj[key] = value;
    }
  });

  return outObj;
};

/**
 * Handle an error properly depending on request Content-Type
 * 
 * @param {Object} req The request Object.
 * @param {Object} res The response Object.
 * @param {Error=} err Operation failed.
 * @param {string} redirectUrl Define a redirect url.
 */
CrudCtrl.prototype.handleError = function(req, res, err, redirectUrl) {
  switch(mime.extension(req.header('Accept'))) {
  case 'json':
    res.statusCode = 400;
    res.contentType('json');
    res.write(JSON.stringify(err));
    res.end();
    break;
  default:
    this.addFlashError(req, err);
    res.redirect(redirectUrl);
    break;
  }
};
