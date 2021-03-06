/* Based on Alex Arnell's inheritance implementation. */

/** section: Language
 * Class
 *  
 *  Manages Prototype's class-based OOP system.
 *  
 *  Refer to Prototype's web site for a [tutorial on classes and
 *  inheritance](http://prototypejs.org/learn/class-inheritance).
**/
var Class = (function() {

  // some versions of JScript fail to enumerate over properties
  // names of which correspond to properties further up the prototype
  // chain that have {DontEnum} flag set
  var IS_DONTENUM_BUGGY = (function(){
    for (var p in { toString: 1 }) {
      // check actual property name, so that it works with augmented Object.prototype
      if (p === 'toString') return false;
    }
    return true;
  })();

  /**
   *  Class.create([superclass][, methods...]) -> Class
   *  - superclass (Class): The optional superclass to inherit methods from.
   *  - methods (Object): An object whose properties will be "mixed-in" to the
   *      new class. Any number of mixins can be added; later mixins take
   *      precedence.
   *
   *  Creates a class.
   *
   *  Class.create returns a function that, when called, will fire its own
   *  `initialize` method.
   *
   *  `Class.create` accepts two kinds of arguments. If the first argument is
   *  a `Class`, it's treated as the new class's superclass, and all its
   *  methods are inherited. Otherwise, any arguments passed are treated as
   *  objects, and their methods are copied over as instance methods of the new
   *  class. Later arguments take precedence over earlier arguments.
   *
   *  If a subclass overrides an instance method declared in a superclass, the
   *  subclass's method can still access the original method. To do so, declare
   *  the subclass's method as normal, but insert `$super` as the first
   *  argument. This makes `$super` available as a method for use within the
   *  function.
   *
   *  To extend a class after it has been defined, use [[Class#addMethods]].
  **/
  function subclass() {}
  function create() {
    var parent = null, properties = $A(arguments);
    if (Object.isFunction(properties[0]))
      parent = properties.shift();
      
    function klass() {
      this.initialize.apply(this, arguments);
    }
    
    Object.extend(klass, Class.Methods);
    klass.superclass = parent;
    klass.subclasses = [];
    
    if (parent) {
      subclass.prototype = parent.prototype;
      klass.prototype = new subclass();
      parent.subclasses.push(klass);
    }
    
    for (var i = 0, length = properties.length; i < length; i++)
      klass.addMethods(properties[i]);
      
    if (!klass.prototype.initialize)
      klass.prototype.initialize = Prototype.emptyFunction;
      
    klass.prototype.constructor = klass;
    return klass;      
  }
  
  /**
   *  Class#addMethods(methods) -> Class
   *  - methods (Object): The methods to add to the class.
   *
   *  Adds methods to an existing class.
   *
   *  `Class#addMethods` is a method available on classes that have been
   *  defined with `Class.create`. It can be used to add new instance methods
   *  to that class, or overwrite existing methods, after the class has been
   *  defined.
   *
   *  New methods propagate down the inheritance chain. If the class has
   *  subclasses, those subclasses will receive the new methods — even in the
   *  context of `$super` calls. The new methods also propagate to instances of
   *  the class and of all its subclasses, even those that have already been
   *  instantiated.
  **/
  function addMethods(source) {
    var ancestor   = this.superclass && this.superclass.prototype;
    var properties = Object.keys(source);
    
    // IE6 doesn't enumerate `toString` and `valueOf` (among other Object.prototype -owned) properties,
    // Force copy if they're not coming from Object.prototype.
    // do not copy other Object.prototype.* for performance reasons
    if (IS_DONTENUM_BUGGY) {
      if (source.toString != Object.prototype.toString)
        properties.push("toString");
      if (source.valueOf != Object.prototype.valueOf)
        properties.push("valueOf");
    }
                                                                 
    for (var i = 0, length = properties.length; i < length; i++) {
      var property = properties[i], value = source[property];
      if (ancestor && Object.isFunction(value) &&
          value.argumentNames()[0] == "$super") {
        var method = value;
        value = (function(m) {
          return function() {
            return arguments.length 
              ? ancestor[m].apply(this, arguments)
              : ancestor[m].call(this);
          };
        })(property).wrap(method);

        value.valueOf = method.valueOf.bind(method);
        value.toString = method.toString.bind(method);
      }
      this.prototype[property] = value;
    }
    
    return this;    
  }
  
  return {
    create: create,
    Methods: {
      addMethods: addMethods
    }
  };
})();