(function(){

  var Backbone = this.Backbone, _ = this._;

  if (!_        && (typeof require !== 'undefined')) _        = require('underscore');
  if (!Backbone && (typeof require !== 'undefined')) Backbone = require('backbone');

  var Struct = Backbone.Struct = Backbone.Model.extend({
    // Model structure definition.
    struct: {},

    // Whether child models should be auto initialized.
    // If true getting child will always return child instance.
    autoInitialize: false,

    // Whether JSON presentation should have null value for empty child models.
    // If true empty child models will be converted to null in JSON presentation.
    nullifyEmpty: false,

    // Whether JSON presentation should not have empty child models.
    // If true empty child references will be removed from JSON presentation.
    clearEmpty: false,


    // Initialize child attribute `attr` with class `klass`.
    __initAttr__: function(attr, klass) {
      var handler;

      if (this.attributes[attr]) return this.attributes[attr];

      // Handler for child items events.
      handler = function() {
        var args, event, target;

        args = Array.prototype.slice.call(arguments);

        event  = args.shift().split(':', 2);
        target = event[1];
        event  = event[0];

        // Update event source.
        args[0] = this;
        
        // Add dot notation to event message.
        args.unshift(_.isString(target) ? event + ':' + attr + '.' + target : event + ':' + attr);

        // Trigger change event on child update
        if ((event === 'change' && !target) || event === 'add' || event === 'remove' || event === 'reset' || event === 'sort' || event === 'destroy') {
          this.trigger.call(this, 'change', this);
        }

        // Trigger modified event
        this.trigger.apply(this, args);
      }

      this.attributes[attr] = _.isFunction(klass) ? new klass() : new (eval(klass))();

      // Handling all events with handler
      this.attributes[attr].on('all', handler, this);

      return this.attributes[attr];
    },

    set: function(key, val, options) {
      var attr, attrs, klass, ref;

      if (!key) return this;

      if (typeof key === 'object') {
        attrs   = key;
        options = val;
      } else {
        (attrs = {})[key] = val;
      }

      options || (options = {});

      // Run validation.
      if (!this._validate(attrs, options)) return false;

      for (attr in attrs) {
        var val = attrs[attr];

        // Parsing attr.
        var path = Struct.attrPath(attr);

        // If attr is compound path i.e.: model[1].submodel...
        // get reference to child model and call set value on it.
        if(this.struct[path.base] && (_.isNumber(path.index) || _.isString(path.sub))) {
          
          // Get reference to child or initialize it.
          ref = this.__initAttr__(path.base, this.struct[path.base]);

          // If index present try to get reference to indexed element.
          // Will throw exception if child doesn't respond to `at` or if item `at(index)` is null.
          if (_.isNumber(path.index)) {
            if (!_.isFunction(ref.at))      throw new Error('Unexpected reference index:' + path.index);
            if(!(ref = ref.at(path.index))) throw new Error('Index out of bounds:' + path.index);
          }

          // Call set on referenced item.  
          return path.sub ? ref.set(path.sub, val, options) : ref.set(_.isFunction(val.toJSON) ? val.toJSON() : val, options);
        }

        // If attr is reference to child model.
        if ((klass = this.struct[attr])){
          ref = this.__initAttr__(attr, klass);

          // If val present and respond to toJSON
          if (val && _.isFunction(val.toJSON)) {
            val = val.toJSON();
          } 

          // If referenced child is a collection, then reset it with `val`
          if (ref.reset) {
            ref.reset(val, options);
          } else {
            val ? ref.set(val, options) : ref.clear(options);
          }
          
        } else {
          Backbone.Model.prototype.set.call(this, attr, val, options);
        }
      }

      return this;
    },

    get: function(attr) {
      var path = Struct.attrPath(attr);

      // If attr is compound path
      if(this.struct[path.base] && (_.isNumber(path.index) || _.isString(path.sub))) {
        var ref = this.get(path.base);

        // If index present and refrenced item is collection return item at(index)
        ref = ref && _.isNumber(path.index) ? (_.isFunction(ref.at) ? ref.at(path.index) : null) : ref;

        // If sub path present and referenced item is model return item get(sub)
        ref = ref && path.sub               ? (_.isFunction(ref.get) ? ref.get(path.sub) : null) : ref;

        return ref;
      }

      // Initialize child if `attr` reference child and `autoInitialize` is true.
      if(this.struct[attr] && this.autoInitialize) {
        this.__initAttr__(attr, this.struct[attr]);
      }

      return Backbone.Model.prototype.get.call(this, attr);
    },

    toJSON: function() {
      var attr, json, ref;

      json = Backbone.Model.prototype.toJSON.call(this);
  
      for (attr in this.struct) {
        ref = (ref = this.get(attr)) != null ? ref.toJSON() : null;

        // Nullify if child JSON presentation is empty and `nullifyEmpty` is true
        if (this.nullifyEmpty && _.isEmpty(ref)) {
          ref = null;
        } 

        // Clear empty if child JSON presentation is empty and `clearEmpty` is true
        if (this.clearEmpty && _.isEmpty(ref)) {
          delete json[attr];
        } else {
          json[attr] = ref;
        }
      }

      return json;
    }

  }, {
    // class methods

    // Converts string attribute path to components e.g. 'model[1].submodel.etc' ->  {base: 'model', index: 1, sub: 'submodel.etc'}
    attrPath: function(attr){
      var path = attr.split('.', 2), base = path[0], sub = path[1], matches;

      if (matches = base.match(/(.+)\[(\d+)\]$/)) {
        return {base: matches[1], index: parseInt(matches[2], 10), sub: sub};
      }

      return {base: base, sub: sub};
    }

  });
  
  if(typeof exports !== 'undefined') {
    exports.Struct = Struct;
  }

}).call(this);
