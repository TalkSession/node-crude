/**
 * @fileOverview The entities base class.
 */
var util = require('util');

var __ = require('lodash');
var EntityCrud = require('../entity');

/**
 * The base Entity Class all entities extend from.
 *
 * @param {mongoose.Model} Model the model that this entity relates to.
 * @param {Object=} optUdo Optionally define the current handling user.
 * @constructor
 * @extends {crude.Entity}
 */
var Entity = module.exports = function(Model, optUdo) {
  EntityCrud.call(this, Model, optUdo);
};
util.inherits(Entity, EntityCrud);

/**
 * Create an entity item.
 *
 * @param {Object} itemData The data to use for creating.
 * @param {Function(ts.error.Abstract=, mongoose.Document=)} done callback.
 * @override
 */
Entity.prototype._create = function(itemData, done) {
  var item = new this.Model(itemData);
  item.save(done);
};

/**
 * Read one entity item.
 *
 * @param {string|Object} id the item id or an Object to query against.
 * @param {Function(ts.error.Abstract=, mongoose.Document=)} done callback.
 * @override
 */
Entity.prototype._readOne = function(id, done) {
  var query = new Object(null);
  var queryFn = (__.isObject(id)) ? this.Model.findOne : this.Model.findById;
  queryFn(query, done);
};

/**
 * Read items based on query or if not defined, read all items. 
 * Do practice common sense!
 *
 * @param {Object=} optQuery Limit the results.
 * @param {Function(ts.error.Abstract=, mongoose.Document=)} done callback.
 * @override
 */
Entity.prototype._read = function(optQuery, done) {
  var query = {};
  if (__.isFunction(optQuery)) {
    done = optQuery;
  } else if (__.isObject(optQuery)) {
    query = optQuery;
  }

  this.Model.find(query).exec(done);
};

/**
 * Read a limited set of items.
 *
 * @param {?Object} query Narrow down the set, set to null for all.
 * @param {number} skip starting position.
 * @param {number} limit how many records to fetch.
 * @param {Function(ts.error.Abstract=, Array.<mongoose.Document>=)} done callback.
 * @override
 */
Entity.prototype._readLimit = function(query, skip, limit, done) {
  this.Model.find(query)
    .skip(skip)
    .limit(limit)
    .exec(done);
};

/**
 * Get the count of items.
 *
 * @param {?Object} query Narrow down the set, set to null for all.
 * @param {Function(ts.error.Abstract=, number=)} done callback.
 * @override
 */
Entity.prototype._count = function(query, done) {
  this.Model.count(query).exec(done);
};

/**
 * Update an entity item.
 *
 * @param {string|Object} id the item id or query for item.
 * @param {Object} itemData The data to use for creating.
 * @param {Function(ts.error.Abstract=, mongoose.Document=)} done callback.
 * @override
 */
Entity.prototype._update = function(id, itemData, done) {
  var query = (__.isObject(id)) ? this.Model.findOne : this.Model.findById;

  query(id, function(err, doc){
    if (err) { return done(err); }

    __.forOwn(itemData, function(value, key) {
      doc[key] = value;
    }, this);

    doc.save(done);

  }.bind(this));
};

