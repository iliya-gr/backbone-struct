(function(){

  var Backbone = this.Backbone, _ = this._;

  if (!_        && (typeof require !== 'undefined')) _        = require('underscore');
  if (!Backbone && (typeof require !== 'undefined')) Backbone = require('backbone');

  var Struct = Backbone.Struct = Backbone.Model.extend({
    struct: {},

    // Initialize attribute.
    __initAttr__: function(attr, klass) {
      var handler;

      if (this.attributes[attr]) return this.attributes[attr];

      // Handler for nested model or collection events.
      handler = function() {
        var args, event, target;

        args = Array.prototype.slice.call(arguments);

        event  = args.shift().split(':', 2);
        target = event[1];
        event  = event[0];

        // Update event source.
        args[0] = this;
        
        // Update event, add dot notation.
        args.unshift(_.isString(target) ? event + ':' + attr + '.' + target : event + ':' + attr);

        // Trigger change event on sub models update
        if ((event === 'change' && !target) || event === 'add' || event === 'remove' || event === 'reset' || event === 'sort' || event === 'destroy') {
          this.trigger.call(this, 'change', this);
        }

        // Trigger event
        this.trigger.apply(this, args);
      }

      this.attributes[attr] = _.isFunction(klass) ? new klass() : new (eval(klass))();

      // Handling all events with handler
      this.attributes[attr].on('all', handler, this);

      return this.attributes[attr];
    },

    has: function(attr) {
      var result = this.get(attr);
      return !(result === null || _.isUndefined(result));
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

        // Parsing attr
        var path = Struct.attrPath(attr);

        // If attr is compound path i.e.: model[1].submodel...
        // get reference to child model and call set value on it.
        if(this.struct[path.base] && (_.isNumber(path.index) || _.isString(path.sub))) {
          
          // Get reference to child or initialize it.
          ref = this.__initAttr__(path.base, this.struct[path.base]);

          // If index present try to get reference to indexed element.
          // Will throw exception if child doesn't support at function or if item at(index) is null.
          if (_.isNumber(path.index)) {
            if (!_.isFunction(ref.at))      throw new Error('Unexpected reference index:' + path.index);
            if(!(ref = ref.at(path.index))) throw new Error('Index out of bounds:' + path.index);
          }

          // Call set on referenced item.  
          return path.sub ? ref.set(path.sub, val, options) : ref.set(_.isFunction(val.toJSON) ? val.toJSON() : val, options);
        }

        klass = this.struct[attr];

        // If attr is reference to child model.
        if (_.isString(klass) || _.isFunction(klass)){
          ref = this.__initAttr__(attr, klass);

          // If val present and respond to toJSON
          if (val && _.isFunction(val.toJSON)) {
            val = val.toJSON();
          } 

          // If refrenced child is a collection, 
          // then reset it else set and on null val clear
          if (ref.reset) {
            ref.reset(val, options);
          } else {
            val ? ref.set(val, options) : ref.clear(options);
          }
          
        } else {
          // Call original set
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

      // Call original get
      return Backbone.Model.prototype.get.call(this, attr);
    },

    toJSON: function() {
      var attr, json, ref;

      json = Backbone.Model.prototype.toJSON.call(this);
  
      for (attr in this.struct) {
        json[attr] = ((ref = this.attributes[attr]) != null ? ref.toJSON() : null) || {};
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
