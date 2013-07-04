/**
 * @fileOverview The Entity base class.
 */

/**
 * The base Entity Class all entities extend from.
 *
 * @param {mongoose.Model} Model the model that this entity relates to.
 * @constructor
 */
var Entity = module.exports = function(Model) {
  /** @type {mongoose.Model} The mongoose model */
  this.Model = Model;
};

/**
 * Create an entity item.
 *
 * @param {Object} itemData The data to use for creating.
 * @param {Function(ts.error.Abstract=, mongoose.Document=)} done callback.
 */
Entity.prototype.create = function(itemData, done) {
  throw new Error('Not Implemented');
};

/**
 * Read one entity item.
 *
 * @param {string|Object} id the item id or an Object to query against.
 * @param {Function(ts.error.Abstract=, mongoose.Document=)} done callback.
 */
Entity.prototype.readOne = function(id, done) {
  throw new Error('Not Implemented');
};

/**
 * Read all items, do practice common sense!
 *
 * @param {Function(ts.error.Abstract=, mongoose.Document=)} done callback.
 */
Entity.prototype.readAll = function(done) {
  throw new Error('Not Implemented');
};

/**
 * Update an entity item.
 *
 * @param {string} id the item id.
 * @param {Object} itemData The data to use for creating.
 * @param {Function(ts.error.Abstract=, mongoose.Document=)} done callback.
 */
Entity.prototype.update = function(id, itemData, done) {
  throw new Error('Not Implemented');
};

/**
 * Remove an entity item.
 *
 * @param {string} id the item id.
 * @param {Function(ts.error.Abstract=, mongoose.Document=)} done callback.
 */
Entity.prototype.delete = function(id, done) {
  throw new Error('Not Implemented');
};

