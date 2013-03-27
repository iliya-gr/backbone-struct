# Backbone-struct

A [Backbone.js](http://backbonejs.org) plugin for creating structured models.

## Why?

Suppose you have complex nested model.

  ```js
    var json = {
      id: 1,
      name: '...',
      address: {
        /*...*/
      },
      items: [ { name: '...'}, { name: '...'}, ...]
    };
  ```

### With Backbone.Model

  ```js
    var model = new Backbone.Model(json);
  ```
  
Changing nested model attribute won't cause model `change` event to fire.

  ```js
    model.on('change', function(){/* never reached */});
    model.get('address').something = '...';
  ```
  
Getting model attribute will return plain js object.

  ```js
    model.get('address'); // { ... }
  ```
  
### With Backbone.Struct

The struct of model can be defined.

  ```js
    var Item            = Backbone.Model.extend({/*...*/});
    var ItemsCollection = Backbone.Collection.extend({ model: Item });
    var Address         = Backbone.Struct.extend({/*...*/});
    
    var User = Backbone.Struct.extend({
      struct: {
        address: Address,
        items:   ItemsCollection
      }
    });
    
    var user = new User(json);
  ```

Getting structured attribute will return model instance.

  ```js
    var address = user.get('address');       // return Address instance
    var items   = user.get('items');         // return ItemsCollection instance
    var item    = user.get('items[0]');      // return first Item instnace
    var name    = user.get('items[0].name'); // return first item name attribute
  ```

Child model update will cause base model `change` event to fire.

  ```js
    user.on('change',                function(user){/*...*/});
    user.on('change:address',        function(user){/*...*/});
    user.on('change:address.street', function(user){/*...*/});
    
    address.set('street', '...');
  ```
  
## Usage

Download latest version. Add reference after __backbone.js__.

  ```html
    <script type="text/javascript" src="backbone.js"></script>
    <script type="text/javascript" src="backbone.struct.js"></script>
  ```

Extend your model from `Backbone.Struct` and define structure.

  ```js
    var Model = Backbone.Struct.extend({
      struct: {
        model:      Backbone.Model,
        collection: Backbone.Collection
      }
    });
  ```
