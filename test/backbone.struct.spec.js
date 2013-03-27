var Backbone = require('backbone');
var Struct   = require('../backbone.struct.js').Struct;
var should   = require('should');

var Structured = Struct.extend({
  struct: {
    model:      Struct,
    collection: Backbone.Collection
  }
});

describe('Backbone.Struct', function(){

  describe('#new', function(){

    it('shoud be backward compatible', function(){
      var model = new Struct({a: 1, b: 2, 'c.a': 3, 'c.a[1]': 4});
      model.get('a').should.equal(1);
      model.get('b').should.equal(2);
      model.get('c.a').should.equal(3);
      model.get('c.a[1]').should.equal(4);
    });

    it('should create nested struct', function(){
      var model = new Structured({model: {attr: 1}, collection: [{attr: 1}, {attr: 2}]});

      model.get('model').get('attr').should.equal(1);
      model.get('collection').at(0).get('attr').should.equal(1);
      model.get('collection').at(1).get('attr').should.equal(2);
    });

  }); // #new

  describe('#set', function(){
    it('should initialize nested model', function(){
      var model = new Structured();

      model.set('model.attr', 2);
      model.get('model').get('attr').should.equal(2);
    });

    it('should throw error on unexpected index', function(){
      var model = new Structured();

      (function(){model.set('model.attr', 2);}).should.not.throw();
      (function(){model.set('model[1]'  , 2);}).should.throw();
    });

    it('should throw error on index out of bounds', function(){
      var model = new Structured({collection: [{}, {}]});

      (function(){model.set('collection[1]', {});}).should.not.throw();
      (function(){model.set('collection[2]', {});}).should.throw();
    });

    it('should update dot noted attribute', function(){
      var model = new Structured({model: {attr: 1}});

      model.set('model.attr', 2);
      model.get('model').get('attr').should.equal(2);
    });

    it('should update array indexed attribute', function(){
      var model = new Structured({collection: [{attr: 1}]});

      model.set('collection[0]', {attr: 2});
      model.get('collection').at(0).get('attr').should.equal(2);

      model.set('collection[0].attr', 3);
      model.get('collection').at(0).get('attr').should.equal(3);
    });

    it('should not create nested model instance', function(){
      var model = new Structured({model: {attr: 1}});
      var sub   = model.get('model');

      model.set({model: {attr: 2}});
      model.get('model').should.equal(sub);

      model.set({model: new Backbone.Model({attr: 3})});
      model.get('model').should.equal(sub);      
    });

    it('should update nested attributes with object', function(){
      var model = new Structured({model: {attr: 1}});
      var sub   = model.get('model');

      model.set({model: {attr: 2}});
      model.get('model').get('attr').should.equal(2);
    });

    it('should update nested attributes with model', function(){
      var model = new Structured({model: {attr: 1}});
      var sub   = model.get('model');

      model.set({model: new Backbone.Model({attr: 2})});
      model.get('model').should.equal(sub);
    });

    it('should update nested collection with array of objects', function(){
      var model = new Structured({collection: [{attr: 1}, {attr: 2}]});

      model.set({collection: [{attr: 3}, {attr: 4}]});

      model.get('collection').at(0).get('attr').should.equal(3);
      model.get('collection').at(1).get('attr').should.equal(4);
    });

    it('should update nested collection with array of models', function(){
      var model = new Structured({collection: [{attr: 1}, {attr: 2}]});

      model.set({collection: [new Backbone.Model({attr: 3}), new Backbone.Model({attr: 4})]});
      
      model.get('collection').at(0).get('attr').should.equal(3);
      model.get('collection').at(1).get('attr').should.equal(4);
    });

  }); // #set
  
  describe('#unset', function(){
    it('should unset attr by dot notated path', function(){
      var model = new Structured({model: {attr: 1}, collection: [{attr: 1}, {attr: 2}]});
      
      model.unset('model.attr');
      (model.get('model').get('attr') == null).should.be.true;

      model.unset('collection[0].attr');
      (model.get('collection').at(0).get('attr') == null).should.be.true;
    });
  }); // #unset

  describe('#clear', function(){
    it('should clear nested models', function(){
      var model = new Structured({model: {attr: 1}, collection: [{attr: 1}, {attr: 2}]});

      model.clear();
      (model.get('model') != null).should.be.true;
      (model.get('model').get('attr') == null).should.be.true;
      model.get('collection').length.should.equal(0);
    });
  }); // #clear

  describe('#get', function(){

    it('should return null on unintialized attribute', function(){
      var model = new Structured({collection: [{}]});

      (model.get('model') == null).should.be.true;
      (model.get('model.attr') == null).should.be.true;
      (model.get('collection[1]') == null).should.be.true;
      (model.get('collection[1].attr') == null).should.be.true;
    });

    it('should nested attribute value using dot notation', function(){
      var model = new Structured({model: {attr: 1}, collection: [{attr: 1}, {attr: 2}]});

      model.get('model.attr').should.equal(1);
      model.get('collection').should.be.an.instanceof(Backbone.Collection);

      model.get('collection[0]').should.be.an.instanceof(Backbone.Model);
      model.get('collection[1]').should.be.an.instanceof(Backbone.Model);

      model.get('collection[0].attr').should.equal(1);
      model.get('collection[1].attr').should.equal(2);
    });

    describe('when `autoInitialize` is true', function(){
      var _Structured = Structured.extend({
        autoInitialize: true
      });

      it('should return non null value for defined child model', function(){
        var model = new _Structured();

        (model.get('model') != null).should.be.true;
        (model.get('collection') != null).should.be.true;
      });

      it('should return null value for non defined child model', function(){
        var model = new _Structured();

        (model.get('modelA') == null).should.be.true;
        (model.get('collectionA') == null).should.be.true;
      });
    });

  }); // #get

  describe('#toJSON', function(){
    it('should return nested object', function(){
      var model = new Structured({model: {attr: 1}, collection: [{attr: 1}, {attr: 2}, {attr:3}]});
      var json  = model.toJSON();

      json.should.include({model: {attr: 1}, collection: [{attr: 1}, {attr: 2}, {attr:3}]});
    });

    describe('when nullifyEmpty is true',function(){
      var _Structured = Structured.extend({
        nullifyEmpty: true
      });

      it('should nullify empty models', function(){
        var model = new _Structured({model: {}, collection: []});
        var json = model.toJSON();

        (json.model == null).should.be.true;
        (json.collection == null).should.be.true;
      });

      it('should not nullify non empty childs', function(){
        var model = new _Structured({model: {attr: 1}, collection: []});
        var json = model.toJSON();

        (json.model != null).should.be.true;
        (json.collection == null).should.be.true;
      });

    });

    describe('when clearEmpty is true',function(){
      var _Structured = Structured.extend({
        clearEmpty: true
      });

      it('should clear empty models', function(){
        var model = new _Structured({model: {}, collection: []});
        var json = model.toJSON();

        (json.model === undefined).should.be.true;
        (json.collection === undefined).should.be.true;
      });

      it('should not clear non empty childs', function(){
        var model = new _Structured({model: {attr: 1}, collection: []});
        var json = model.toJSON();

        (json.model !== undefined).should.be.true;
        (json.collection === undefined).should.be.true;
      });
      
    });

  }); // #toJSON

  describe('#has', function(){

    it('should check attribute presence using dot notation', function(){
      var model = new Structured({model: {attr: 1}, collection: [{attr: 1}, {attr: 2}]});

      model.has('model').should.be.true;
      model.has('model.attr').should.be.true;
      model.has('model.nothing').should.be.false;

      model.has('collection').should.be.true;
      model.has('collection[0]').should.be.true;
      model.has('collection[0].attr').should.be.true;
      model.has('collection[0].nothing').should.be.false;
      model.has('collection[2]').should.be.false;
      model.has('collection[2].attr').should.be.false;
    }); 

  }); // #has

  describe('#trigger', function(){
    var model;

    beforeEach(function(){
      model = new Structured({model: {attr: 1}, collection: [{attr: 1}, {attr: 2}]});
    });

    it('should trigger change event on nested model change', function(done){
      model.on('change', function(model){done();});
      model.set('model.attr', 2);
    });

    it('should trigger dot notated change event on nested model change', function(done){
      model.on('change:model.attr', function(model){done();});
      model.set('model.attr', 2);
    });

    it('should trigger change event on nested collection change', function(done){
      model.on('change', function(model){done();});
      model.set('collection[0].attr', 2);
    });

    it('should trigger dot notated change event on nested collection change', function(done){
      model.on('change:collection.attr', function(model){done();});
      model.set('collection[0].attr', 2);
    });

  }); // #trigger

});