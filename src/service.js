module.exports = Service;

var Namespace = require("./namespace");
/** @alias Namespace.prototype */
var NamespacePrototype = Namespace.prototype;
/** @alias Service.prototype */
var ServicePrototype = Namespace.extend(Service, [ "methods" ]);

var Method = require("./method"),
    util   = require("./util");

/**
 * Constructs a new service.
 * @classdesc Reflected service.
 * @extends Namespace
 * @constructor
 * @param {string} name Service name
 * @param {Object.<string,*>} [options] Service options
 * @throws {TypeError} If arguments are invalid
 */
function Service(name, options) {
    Namespace.call(this, name, options);

    /**
     * Service methods.
     * @type {Object.<string,Method>}
     */
    this.methods = {}; // exposed, marker

    /**
     * Cached methods as an array.
     * @type {?Method[]}
     * @private
     */
    this._methodsArray = null;
}

Object.defineProperties(ServicePrototype, {

    /**
     * Methods of this service as an array for iteration.
     * @name Service#methodsArray
     * @type {Method[]}
     * @readonly
     */
    methodsArray: {
        get: function() {
            return this._methodsArray || (this._methodsArray = util.toArray(this.methods));
        }
    },

    // override
    object: {
        get: function() {
            if (this._object)
                return this._object;
            this._object = Object.create(this);
            var nested = this.methodsArray, i = 0, k = nested.length, obj;
            while (i < k)
                this._object[(obj = nested[i++]).name] = obj.object;
            nested = this.nestedArray; i = 0; k = nested.length;
            while (i < k)
                this._object[(obj = nested[i++]).name] = obj.object;
            return this._object;
        }
    }

});

function clearCache(service) {
    service._methodsArray = null;
    return service;
}

/**
 * Tests if the specified JSON object describes a service.
 * @param {Object} json JSON object to test
 * @returns {boolean} `true` if the object describes a service
 */
Service.testJSON = function testJSON(json) {
    return Boolean(json && json.methods);
};

/**
 * Constructs a service from JSON.
 * @param {string} name Service name
 * @param {Object} json JSON object
 * @returns {Service} Created service
 * @throws {TypeError} If arguments are invalid
 */
Service.fromJSON = function fromJSON(name, json) {
    return new Service(name, json.options);
};

/**
 * @override
 */
ServicePrototype.get = function get(name) {
    return NamespacePrototype.get.call(this, name) || this.methods[name] || null;
};

/**
 * @override
 */
ServicePrototype.resolveAll = function resolve() {
    var methods = this.methodsArray, i = 0, k = methods.length;
    while (i < k)
        methods[i++].resolve();
    return NamespacePrototype.resolve.call(this);
};

/**
 * @override
 */
ServicePrototype.add = function add(object) {
    if (this.get(object.name))
        throw Error("duplicate name '" + object.name + '" in ' + this);
    if (object instanceof Method) {
        this.methods[object.name] = object;
        object.parent = this;
        return clearCache(this);
    }
    return NamespacePrototype.add.call(this, object);
};

/**
 * @override
 */
ServicePrototype.remove = function remove(object) {
    if (object instanceof Method) {
        if (this.methods[object.name] !== object)
            throw Error(object + " is not a member of " + this);
        delete this.methods[object.name];
        object.parent = null;
        return clearCache(this);
    }
    return NamespacePrototype.remove.call(this, object);
};
