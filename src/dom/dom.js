/** section: DOM, related to: Element
 *  $(id) -> Element
 *  $(id...) -> [Element]...
 *    - id (String | Element): A DOM node or a string that references a node's
 *      ID.
 *  
 *  If provided with a string, returns the element in the document with
 *  matching ID; otherwise returns the passed element.
 *  
 *  Takes in an arbitrary number of arguments. Returns one `Element` if given
 *  one argument; otherwise returns an array of `Element`s.
 *  
 *  All elements returned by the function are "extended" with `Element`
 *  instance methods.
**/

function $(element) {
  if (arguments.length > 1) {
    for (var i = 0, elements = [], length = arguments.length; i < length; i++)
      elements.push($(arguments[i]));
    return elements;
  }
  if (Object.isString(element))
    element = document.getElementById(element);
  return Element.extend(element);
}

if (Prototype.BrowserFeatures.XPath) {
  document._getElementsByXPath = function(expression, parentElement) {
    var results = [];
    var query = document.evaluate(expression, $(parentElement) || document,
      null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    for (var i = 0, length = query.snapshotLength; i < length; i++)
      results.push(Element.extend(query.snapshotItem(i)));
    return results;
  };
}

/*--------------------------------------------------------------------------*/

if (!window.Node) var Node = { };

if (!Node.ELEMENT_NODE) {
  // DOM level 2 ECMAScript Language Binding
  Object.extend(Node, {
    ELEMENT_NODE: 1,
    ATTRIBUTE_NODE: 2,
    TEXT_NODE: 3,
    CDATA_SECTION_NODE: 4,
    ENTITY_REFERENCE_NODE: 5,
    ENTITY_NODE: 6,
    PROCESSING_INSTRUCTION_NODE: 7,
    COMMENT_NODE: 8,
    DOCUMENT_NODE: 9,
    DOCUMENT_TYPE_NODE: 10,
    DOCUMENT_FRAGMENT_NODE: 11,
    NOTATION_NODE: 12
  });
}

/** section: DOM
 *  class Element
**/

/** 
 *  new Element(tagName[, attributes])
 *    - tagName (String): The name of the HTML element to create.
 *    - attributes (Object): A list of attribute/value pairs to set on the
 *      element.
 *  
 *  Creates an HTML element with `tagName` as the tag name.
**/
(function(global) {
  
  // Test for IE's extended syntax
  // see: http://msdn.microsoft.com/en-us/library/ms536389.aspx
  var CREATE_ELEMENT_EXTENDED_SYNTAX = (function(){
    var isSupported = false;
    try {
      var el = document.createElement('<a name="x">x</a>');
      isSupported = (el.name === 'x');
      el = null;
    }
    catch(e) {
      isSupported = false;;
    }
    return isSupported;
  })();
  
  var element = global.Element;
  global.Element = function(tagName, attributes) {
    attributes = attributes || { };
    tagName = tagName.toLowerCase();
    var cache = Element.cache;
    if (CREATE_ELEMENT_EXTENDED_SYNTAX && attributes.name) {
      tagName = '<' + tagName + ' name="' + attributes.name + '">';
      delete attributes.name;
      return Element.writeAttribute(document.createElement(tagName), attributes);
    }
    if (!cache[tagName]) cache[tagName] = Element.extend(document.createElement(tagName));
    return Element.writeAttribute(cache[tagName].cloneNode(false), attributes);
  };
  Object.extend(global.Element, element || { });
  if (element) global.Element.prototype = element.prototype;
})(this);

Element.cache = { };
Element.idCounter = 1;

Element.Methods = {
  /** 
   *  Element#visible(@element) -> boolean
   *  
   *  Tells whether `element` is visible (i.e., whether its inline `display`
   *  CSS property is set to `none`.
  **/
  visible: function(element) {
    return $(element).style.display != 'none';
  },
  
  /** 
   *  Element#toggle(@element) -> Element
   *  
   *  Toggles the visibility of `element`. Returns `element`.
  **/
  toggle: function(element) {
    element = $(element);
    Element[Element.visible(element) ? 'hide' : 'show'](element);
    return element;
  },
  
  
  /**
   *  Element#hide(@element) -> Element
   *  
   *  Sets `display: none` on `element`. Returns `element`.
  **/
  hide: function(element) {
    element = $(element);
    element.style.display = 'none';
    return element;
  },
  
  /**
   *  Element#show(@element) -> Element
   *  
   *  Removes `display: none` on `element`. Returns `element`.
  **/
  show: function(element) {
    element = $(element);
    element.style.display = '';
    return element;
  },

  /**
   *  Element#remove(@element) -> Element
   *  
   *  Completely removes `element` from the document and returns it.
  **/
  remove: function(element) {
    element = $(element);
    element.parentNode.removeChild(element);
    return element;
  },

  /** 
   *  Element#update(@element[, newContent]) -> Element
   *  
   *  Replaces _the content_ of `element` with the `newContent` argument and
   *  returns `element`.
   *  
   *  If `newContent` is omitted, the element's content is blanked out (i.e., 
   *  replaced with an empty string).
  **/
  update: (function(){
    
    // see: http://support.microsoft.com/kb/276228
    var SELECT_ELEMENT_INNERHTML_BUGGY = (function(){
      var el = document.createElement("select"), 
          isBuggy = true;
      el.innerHTML = "<option value=\"test\">test</option>";
      if (el.options && el.options[0]) {
        isBuggy = el.options[0].nodeName.toUpperCase() !== "OPTION";
      }
      el = null;
      return isBuggy;
    })();
    
    // see: http://msdn.microsoft.com/en-us/library/ms533897(VS.85).aspx
    var TABLE_ELEMENT_INNERHTML_BUGGY = (function(){
      try {
        var el = document.createElement("table");
        if (el && el.tBodies) {
          el.innerHTML = "<tbody><tr><td>test</td></tr></tbody>";
          var isBuggy = typeof el.tBodies[0] == "undefined";
          el = null;
          return isBuggy;
        }
      } catch (e) {
        return true;
      }
    })();
    
    var SCRIPT_ELEMENT_REJECTS_TEXTNODE_APPENDING = (function () {
      var s = document.createElement("script"), 
          isBuggy = false;
      try {
        s.appendChild(document.createTextNode(""));
        isBuggy = !s.firstChild ||
          s.firstChild && s.firstChild.nodeType !== 3;
      } catch (e) {
        isBuggy = true;
      }
      s = null;
      return isBuggy;
    })();
    
    function update(element, content) {
      element = $(element);
  
      if (content && content.toElement) 
        content = content.toElement();
        
      if (Object.isElement(content)) 
        return element.update().insert(content);
  
      content = Object.toHTML(content);
      
      var tagName = element.tagName.toUpperCase();
      
      if (tagName === 'SCRIPT' && SCRIPT_ELEMENT_REJECTS_TEXTNODE_APPENDING) {
        // scripts are not evaluated when updating SCRIPT element
        element.text = content;
        return element;
      }
  
      if (SELECT_ELEMENT_INNERHTML_BUGGY || TABLE_ELEMENT_INNERHTML_BUGGY) {
        if (tagName in Element._insertionTranslations.tags) {
          while (element.firstChild) {
            element.removeChild(element.firstChild);
          }
          Element._getContentFromAnonymousElement(tagName, content.stripScripts())
            .each(function(node) {
              element.appendChild(node);
            });
        }
        else {
          element.innerHTML = content.stripScripts();
        }
      }
      else {
        element.innerHTML = content.stripScripts();
      }
  
      content.evalScripts.bind(content).defer();
      return element;
    }
    
    return update;
  })(),
  
  /**
   *  Element#replace(@element[, newContent]) -> Element
   *  
   *  Replaces `element` _itself_ with `newContent` and returns `element`.
   *  
   *  Keep in mind that this method returns the element that has just been
   *  removed — not the element that took its place. Also note that `Element.replace`
   *  will not work with orphaned elements in certain clients
   *  (notably, those implementing `Range::createContextualFragment` method)
   *  To avoid such issues, it is recommended to invoke `Element#replace` on 
   *  elements contained within a document.
  **/
  replace: (function(){
    
    function replace(element, content) {
      element = $(element);
      if (content && content.toElement) content = content.toElement();
      else if (!Object.isElement(content)) {
        content = Object.toHTML(content);
        var range = element.ownerDocument.createRange();
        content.evalScripts.bind(content).defer();
        try {
          range.selectNode(element);
          content = range.createContextualFragment(content.stripScripts());
        }
        catch(e) {
        /* 
          Some clients (e.g. Konqueror) throw when trying to create a fragment from an incompatible markup 
          (such as range.selectNode(<TR element>) --> range.createContextualFragment('<tr><td>...</td></tr>'))
          Since determining proper "context" (i.e. parsing replacement element(s) tagName(s)) is error-prone, 
          we fall back to a workaround of replacing element with `document.documentElement`
        */
          range.selectNode(document.documentElement);
          content = range.createContextualFragment(content.stripScripts());
        }
      }
      element.parentNode.replaceChild(content, element);
      return element;
    }
    if ('outerHTML' in document.documentElement) {
      replace = function(element, content) {
        element = $(element);

        if (content && content.toElement) content = content.toElement();
        if (Object.isElement(content)) {
          element.parentNode.replaceChild(content, element);
          return element;
        }

        content = Object.toHTML(content);
        var parent = element.parentNode, tagName = parent.tagName.toUpperCase();

        if (Element._insertionTranslations.tags[tagName]) {
          var nextSibling = Element.next(element);
          var fragments = Element._getContentFromAnonymousElement(tagName, content.stripScripts());
          parent.removeChild(element);
          if (nextSibling)
            fragments.each(function(node) { parent.insertBefore(node, nextSibling); });
          else 
            fragments.each(function(node) { parent.appendChild(node); });
        }
        else element.outerHTML = content.stripScripts();

        content.evalScripts.bind(content).defer();
        return element;
      };
    }
    return replace;
  })(),
  
  /**
   *  Element#insert(@element, content) -> Element
   *  - content (String | Object): The content to insert.
   *  
   *  Inserts content at a specific point relative to `element`.
   *  
   *  The `content` argument can be a string, in which case the implied
   *  insertion point is `bottom`. Or it can be an object that specifies
   *  one or more insertion points (e.g., `{ bottom: "foo", top: "bar" }`).
   *  
   *  Accepted insertion points are `before` (as `element`'s previous sibling);
   *  `after` (as `element's` next sibling); `top` (as `element`'s first
   *  child); and `bottom` (as `element`'s last child).
  **/
  insert: function(element, insertions) {
    element = $(element);
    
    if (Object.isString(insertions) || Object.isNumber(insertions) ||
        Object.isElement(insertions) || (insertions && (insertions.toElement || insertions.toHTML)))
          insertions = {bottom:insertions};
    
    var content, insert, tagName, childNodes;
    
    for (var position in insertions) {
      content  = insertions[position];
      position = position.toLowerCase();
      insert = Element._insertionTranslations[position];

      if (content && content.toElement) content = content.toElement();
      if (Object.isElement(content)) {
        insert(element, content);
        continue;
      }
    
      content = Object.toHTML(content);
      
      tagName = ((position == 'before' || position == 'after')
        ? element.parentNode : element).tagName.toUpperCase();
      
      childNodes = Element._getContentFromAnonymousElement(tagName, content.stripScripts());
      
      if (position == 'top' || position == 'after') childNodes.reverse();
      childNodes.each(insert.curry(element));
      
      content.evalScripts.bind(content).defer();
    }
    
    return element;
  },
  
  /**
   *  Element#wrap(@element, wrapper[, attributes]) -> Element
   *  - wrapper (Element | String): An element to wrap `element` inside, or
   *    else a string representing the tag name of an element to be created.
   *  - attributes (Object): A set of attributes to apply to the wrapper
   *    element. Refer to the [[Element]] constructor for usage.
   *  
   *  Wraps an element inside another, then returns the wrapper.
  **/
  wrap: function(element, wrapper, attributes) {
    element = $(element);
    if (Object.isElement(wrapper))
      $(wrapper).writeAttribute(attributes || { });
    else if (Object.isString(wrapper)) wrapper = new Element(wrapper, attributes);
    else wrapper = new Element('div', wrapper);
    if (element.parentNode)
      element.parentNode.replaceChild(wrapper, element);
    wrapper.appendChild(element);
    return wrapper;
  },
  
  /**
   *  Element#inspect(@element) -> String
   *  
   *  Returns the debug-oriented string representation of `element`.
  **/
  inspect: function(element) {
    element = $(element);
    var result = '<' + element.tagName.toLowerCase();
    $H({'id': 'id', 'className': 'class'}).each(function(pair) {
      var property = pair.first(), attribute = pair.last();
      var value = (element[property] || '').toString();
      if (value) result += ' ' + attribute + '=' + value.inspect(true);
    });
    return result + '>';
  },
  
  /**
   *  Element#recursivelyCollect(element, property) -> [Element...]
   *  
   *  Recursively collects elements whose relationship to `element` is
   *  specified by `property`. `property` has to be a _property_ (a method
   *  won’t do!) of `element` that points to a single DOM node (e.g., 
   *  `nextSibling` or `parentNode`). 
  **/
  recursivelyCollect: function(element, property) {
    element = $(element);
    var elements = [];
    while (element = element[property])
      if (element.nodeType == 1)
        elements.push(Element.extend(element));
    return elements;
  },
  
  /**
   *  Element#ancestors(@element) -> [Element...]
   *  
   *  Collects all of `element`’s ancestors and returns them as an array of
   *  elements.
  **/
  ancestors: function(element) {
    return Element.recursivelyCollect(element, 'parentNode');
  },
  
  /**
   *  Element#descendants(@element) -> [Element...]
   *  
   *  Collects all of element’s descendants and returns them as an array of
   *  elements.
  **/
  descendants: function(element) {
    return Element.select(element, "*");
  },
  
  /**
   *  Element#firstDescendant(@element) -> Element
   *  
   *  Returns the first child that is an element.
   *  
   *  This is opposed to the `firstChild` DOM property, which will return
   *  any node, including text nodes.
  **/
  firstDescendant: function(element) {
    element = $(element).firstChild;
    while (element && element.nodeType != 1) element = element.nextSibling;
    return $(element);
  },
  
  /**
   *  Element#childElements(@element) -> [Element...]
   *  
   *  Collects all of `element`’s immediate descendants (i.e., children) and
   *  returns them as an array of elements.
  **/
  immediateDescendants: function(element) {
    var children = $(element).childNodes, 
        results = [],
        child;
    for (var i = 0; child = children[i++]; ) {
      if (child.nodeType == 1) {
        results.push(Element.extend(child));
      }
    }
    return results;
  },

  /**
   *  Element#previousSiblings(@element) -> [Element...]
   *  
   *  Collects all of `element`’s previous siblings and returns them as an
   *  array of elements.
  **/
  previousSiblings: function(element) {
    return Element.recursivelyCollect(element, 'previousSibling');
  },
  
  /**
   *  Element#nextSiblings(@element) -> [Element...]
   *  
   *  Collects all of `element`’s next siblings and returns them as an array
   *  of elements.
  **/
  nextSiblings: function(element) {
    return Element.recursivelyCollect(element, 'nextSibling');
  },
  
  /**
   *  Element#siblings(@element) -> [Element...]
   *  Collects all of element’s siblings and returns them as an array of
   *  elements.
  **/
  siblings: function(element) {
    element = $(element);
    return Element.previousSiblings(element).reverse()
      .concat(Element.nextSiblings(element));
  },
  
  /**
   *  Element#match(@element, selector) -> boolean
   *  - selector (String): A CSS selector.
   *  
   *  Checks if `element` matches the given CSS selector.
  **/
  match: function(element, selector) {
    if (Object.isString(selector))
      selector = new Selector(selector);
    return selector.match($(element));
  },
  
  /**
   *  Element#up(@element[, expression[, index = 0]]) -> Element
   *  Element#up(@element[, index = 0]) -> Element
   *  - expression (String): A CSS selector.
   *  
   *  Returns `element`’s first ancestor (or the Nth ancestor, if `index`
   *  is specified) that matches `expression`. If no `expression` is
   *  provided, all ancestors are considered. If no ancestor matches these
   *  criteria, `undefined` is returned.
  **/
  up: function(element, expression, index) {
    element = $(element);
    if (arguments.length == 1) return $(element.parentNode);
    var ancestors = Element.ancestors(element);
    return Object.isNumber(expression) ? ancestors[expression] :
      Selector.findElement(ancestors, expression, index);
  },
  
  /**
   *  Element#down(@element[, expression[, index = 0]]) -> Element
   *  Element#down(@element[, index = 0]) -> Element
   *  - expression (String): A CSS selector.
   *  
   *  Returns `element`’s first descendant (or the Nth descendant, if `index`
   *  is specified) that matches `expression`. If no `expression` is
   *  provided, all descendants are considered. If no descendant matches these
   *  criteria, `undefined` is returned.
  **/
  down: function(element, expression, index) {
    element = $(element);
    if (arguments.length == 1) return Element.firstDescendant(element);
    return Object.isNumber(expression) ? Element.descendants(element)[expression] :
      Element.select(element, expression)[index || 0];
  },

  /**
   *  Element#previous(@element[, expression[, index = 0]]) -> Element
   *  Element#previous(@element[, index = 0]) -> Element
   *  - expression (String): A CSS selector.
   *  
   *  Returns `element`’s first previous sibling (or the Nth, if `index`
   *  is specified) that matches `expression`. If no `expression` is
   *  provided, all previous siblings are considered. If none matches these
   *  criteria, `undefined` is returned.
  **/
  previous: function(element, expression, index) {
    element = $(element);
    if (arguments.length == 1) return $(Selector.handlers.previousElementSibling(element));
    var previousSiblings = Element.previousSiblings(element);
    return Object.isNumber(expression) ? previousSiblings[expression] :
      Selector.findElement(previousSiblings, expression, index);   
  },
  
  /**
   *  Element#next(@element[, expression[, index = 0]]) -> Element
   *  Element#next(@element[, index = 0]) -> Element
   *  - expression (String): A CSS selector.
   *  
   *  Returns `element`’s first following sibling (or the Nth, if `index`
   *  is specified) that matches `expression`. If no `expression` is
   *  provided, all following siblings are considered. If none matches these
   *  criteria, `undefined` is returned.
  **/
  next: function(element, expression, index) {
    element = $(element);
    if (arguments.length == 1) return $(Selector.handlers.nextElementSibling(element));
    var nextSiblings = Element.nextSiblings(element);
    return Object.isNumber(expression) ? nextSiblings[expression] :
      Selector.findElement(nextSiblings, expression, index);
  },
  
  
  /**
   *  Element#select(@element, selector...) -> [Element...]
   *  - selector (String): A CSS selector.
   *  
   *  Takes an arbitrary number of CSS selectors and returns an array of
   *  descendants of `element` that match any of them.
  **/
  select: function(element) {
    var args = Array.prototype.slice.call(arguments, 1);
    return Selector.findChildElements(element, args);
  },
  
  /**
   *  Element.adjacent(@element, selector...) -> [Element...]
   *  - selector (String): A CSS selector.
   *  
   *  Finds all siblings of the current element that match the given
   *  selector(s).
  **/
  adjacent: function(element) {
    var args = Array.prototype.slice.call(arguments, 1);
    return Selector.findChildElements(element.parentNode, args).without(element);
  },
  
  /**
   *  Element#identify(@element) -> String
   *  
   *  Returns `element`'s ID. If `element` does not have an ID, one is
   *  generated, assigned to `element`, and returned.
  **/
  identify: function(element) {
    element = $(element);
    var id = Element.readAttribute(element, 'id');
    if (id) return id;
    do { id = 'anonymous_element_' + Element.idCounter++; } while ($(id));
    Element.writeAttribute(element, 'id', id);
    return id;
  },
  
  /**
   *  Element#readAttribute(@element, attributeName) -> String | null
   *  
   *  Returns the value of `element`'s attribute with the given name.
  **/
  readAttribute: (function(){
    
    // Opera 9.25 returns `null` instead of "" for getAttribute('title')
    // when `title` attribute is empty
    var GET_ATTRIBUTE_TITLE_RETURNS_NULL = (function(){
      var el = document.createElement('div');
      el.setAttribute('title', '');
      var isBuggy = (el.getAttribute('title') === null);
      el = null;
      return isBuggy;
    })();
    
    function readAttribute(element, name) {
      element = $(element);
      
      // IE throws error when invoking getAttribute("type", 2) on an iframe
      if (name === 'type' && element.tagName.toUpperCase() == 'IFRAME') {
        return element.getAttribute('type');
      }
      if (name === 'title' && GET_ATTRIBUTE_TITLE_RETURNS_NULL) {
        return element.title;
      }
      if (Prototype.Browser.IE) {
        var t = Element._attributeTranslations.read;
        if (t.values[name]) return t.values[name](element, name);
        if (t.names[name]) name = t.names[name];
        if (name.include(':')) {
          return (!element.attributes || !element.attributes[name]) ? null : 
           element.attributes[name].value;
        }
      }
      return element.getAttribute(name);
    }
    return readAttribute;
  })(),
  
  /**
   *  Element#writeAttribute(@element, attribute[, value = true]) -> Element
   *  Element#writeAttribute(@element, attributes) -> Element
   *  
   *  Adds, changes, or removes attributes passed as either a hash or a
   *  name/value pair.
  **/
  writeAttribute: function(element, name, value) {
    element = $(element);
    var attributes = { }, t = Element._attributeTranslations.write;
    
    if (typeof name == 'object') {
      attributes = name;
    }
    else {
      attributes[name] = Object.isUndefined(value) ? true : value;
    }
    
    for (var attr in attributes) {
      name = t.names[attr] || attr;
      value = attributes[attr];
      if (t.values[attr]) {
        name = t.values[attr](element, value);
      }
      if (value === false || value === null)
        element.removeAttribute(name);
      else if (value === true)
        element.setAttribute(name, name);
      else element.setAttribute(name, value);
    }
    return element;
  },
  
  /**
   *  Element#getHeight(@element) -> Number
   *  
   *  Returns the height of `element`.
  **/
  getHeight: function(element) {
    return Element.getDimensions(element).height;
  },
  
  /**
   *  Element#getWidth(@element) -> Number
   *  
   *  Returns the width of `element`.
  **/
  getWidth: function(element) {
    return Element.getDimensions(element).width;
  },
  
  /**
   *  Element#classNames(@element) -> [String...]
   *  
   *  Returns a new instance of [[Element.ClassNames]], an [[Enumerable]]
   *  object used to read and write CSS class names of `element`.
  **/
  classNames: function(element) {
    return new Element.ClassNames(element);
  },

  /**
   *  Element#addClassName(@element, className) -> Element
   *  
   *  Adds a CSS class to `element`.
  **/
  addClassName: function(element, className) {
    if (!(element = $(element))) return;
    if (!Element.hasClassName(element, className))
      element.className += (element.className ? ' ' : '') + className;
    return element;
  },
  
  /**
   *  Element#toggleClassName(@element, className) -> Element
   *  
   *  Toggles the presence of a CSS class on `element`.
  **/
  toggleClassName: function(element, className) {
    if (!(element = $(element))) return;
    return Element[Element.hasClassName(element, className) ?
      'removeClassName' : 'addClassName'](element, className);
  },
  
  /**
   *  Element#cleanWhitespace(@element) -> Element
   *  
   *  Removes whitespace-only text node children from `element`.
  **/
  cleanWhitespace: function(element) {
    element = $(element);
    var node = element.firstChild;
    while (node) {
      var nextNode = node.nextSibling;
      if (node.nodeType == 3 && !/\S/.test(node.nodeValue))
        element.removeChild(node);
      node = nextNode;
    }
    return element;
  },
  
  /**
   *  Element#empty(@element) -> Element
   *  
   *  Tests whether `element` is empty (i.e., contains only whitespace).
  **/
  empty: function(element) {
    return $(element).innerHTML.blank();
  },
  
  /**
   *  Element#descendantOf(@element, ancestor) -> Boolean
   *  
   *  Checks if `element` is a descendant of `ancestor`.
  **/
  descendantOf: function(element, ancestor) {
    element = $(element); 
    ancestor = $(ancestor);

    if (element.compareDocumentPosition)
      return (element.compareDocumentPosition(ancestor) & 8) === 8;
      
    if (ancestor.contains)
      return ancestor.contains(element) && ancestor !== element;
    
    while (element = element.parentNode)
      if (element == ancestor) return true;
      
    return false;
  },
  
  /**
   *  Element#scrollTo(@element) -> Element
   *  
   *  Scrolls the window so that `element` appears at the top of the viewport.
  **/
  scrollTo: function(element) {
    element = $(element);
    var pos = Element.cumulativeOffset(element);
    window.scrollTo(pos[0], pos[1]);
    return element;
  },
  
  /**
   *  Element#getStyle(@element, style) -> String | null
   *  - style (String): The property name to be retrieved.
   *  
   *  Returns the given CSS property value of `element`. The property can be
   *  specified in either its CSS form (`font-size`) or its camelized form
   *  (`fontSize`).
  **/
  getStyle: (function(){
    var docEl = document.documentElement,
        view = document.defaultView;

    var FLOAT_STYLE = 'styleFloat' in docEl.style ? 'styleFloat' : 'cssFloat';
    
    var HAS_COMPUTED_STYLE = view && (typeof view.getComputedStyle !== 'undefined');
    
    var getComputed = HAS_COMPUTED_STYLE
      ? function(element, style) { var c = view.getComputedStyle(element, ''); return c ? c[style] : null; }
      // `currentStyle` is `null` on orphaned elements in IE
      : function(element, style) { return element.currentStyle ? element.currentStyle[style] : ''; };
    
    // IE
    var COMPUTED_WIDTH_HEIGHT_VALUES_ARE_ALWAYS_AUTO = getComputed(docEl, 'width') === 'auto';
    
    // The following tests are lazy-evaluated at runtime 
    // (only when `document.body` is present), then redefined 
    
    // Opera
    function COMPUTED_VALUE_FOR_HIDDEN_ELEMENTS_IS_0_PX() {
      var body = document.body;
      if (body) {
        var el = document.createElement('div');
        el.style.display = 'none';
        body.insertBefore(el, body.firstChild);
        var isBuggy = getComputed(el, 'width') === '0px';
        body.removeChild(el);
        el = null;
        return (COMPUTED_VALUE_FOR_HIDDEN_ELEMENTS_IS_0_PX = function(){
          return isBuggy;
        })();
      }
      return null;
    }
    
    // Opera
    function COMPUTED_VALUE_RETURNS_BORDER_BOX() {
      var body = document.body;
      if (body) {
        var el = document.createElement('div');
        el.style.width = '10px';
        el.style.borderLeft = '10px solid transparent';
        body.insertBefore(el, body.firstChild);
        var isBuggy = getComputed(el, 'width') === '20px';
        body.removeChild(el);
        el = null;
        return (COMPUTED_VALUE_RETURNS_BORDER_BOX = function(){
          return isBuggy;
        })();
      }
      return null;
    }
    
    var heightProperties = ['border-top-width', 'padding-top',
     'padding-bottom', 'border-bottom-width'];
     
    var widthProperties =  ['border-left-width', 'padding-left',
      'padding-right', 'border-right-width'];

    function getStyle(element, style) {
      if (!(element = $(element))) return;

      // normalize "float" style
      style = (style === 'float' || style === 'cssFloat')
        ? FLOAT_STYLE
        : style.camelize();
        
      switch(style) {
        case 'opacity':          
          return Element.getOpacity(element);
          break;
      
        case 'width':
        case 'height': 
          // Opera returns '0px' for "hidden" (i.e. non-rendered) elements; 
          // instead, we coerce it to null
          if (COMPUTED_VALUE_FOR_HIDDEN_ELEMENTS_IS_0_PX() && !Element.visible(element)) {
            return null;
          }
          // Opera returns the border-box dimensions rather than the content-box
          // dimensions, so we subtract padding and borders from the value
          if (COMPUTED_VALUE_RETURNS_BORDER_BOX()) {
            var dim = parseInt(getComputed(element, style), 10);
            if (dim !== element['offset' + style.capitalize()])
              return dim + 'px';
            var properties = (style === 'height') 
              ? heightProperties
              : widthProperties;
            var total = properties.inject(dim, function(memo, property) {
              var val = getComputed(element, property.camelize());
              return val === null ? memo : memo - parseInt(val, 10);
            });
            return total + 'px';
          }
          break;
      }

      var value = element.style[style];

      // value is not in "style" or is "auto", get computed one
      if (!value || value === 'auto') {
        value = getComputed(element, style);
      }

      // value is "auto"
      if (value === 'auto') { 
        if (COMPUTED_WIDTH_HEIGHT_VALUES_ARE_ALWAYS_AUTO) {
          if (style === 'width' || style === 'height') {
            if (Element.getStyle(element, 'display') !== 'none') {
              return element['offset' + style.capitalize()] + 'px';
            }
            // return `null` for hidden elements
            return null;
          }
        }
        // return `null` for "auto" values which can not be computed
        return null;
      }
      return value;
    }
    return getStyle;
  })(),
  
  /**
   *  Element#getOpacity(@element) -> String | null
   *  
   *  Returns the opacity of the element.
  **/
  getOpacity: (function(){
    
    var style = document.documentElement.style;
    var view = document.defaultView;
    
    var HAS_OPACITY = 'opacity' in style;
    var HAS_FILTER = typeof style.filter === 'string';
    var HAS_COMPUTED_STYLE = view && typeof view.getComputedStyle !== 'undefined';
    
    var RE_ALPHA = /alpha\(opacity=(.*)\)/;
    
    function getComputedStyle(element) {
      return view.getComputedStyle(element, '');
    }
    
    if (HAS_OPACITY && HAS_COMPUTED_STYLE) {
      return function(element) {
        if (element = $(element)) {
          var value = element.style.opacity;
          if (!value) {
            var c = getComputedStyle(element);
            value = c ? c.opacity : null;
          }
          return value ? parseFloat(value) : 1.0;
        }
      };
    }
    else if (HAS_FILTER) {
      return function(element) {
        var filterStyle = Element.getStyle(element, 'filter') || '';
        var match = filterStyle.match(RE_ALPHA);
        if (match && match[1]) {
          return parseFloat(match[1]) / 100;
        }
        return 1.0;
      };
    }
  })(),
  
  /**
   *  Element#setStyle(@element, styles) -> Element
   *  
   *  Modifies `element`’s CSS style properties.
   *  
   *  Styles are passed as an object of property-value pairs in which the
   *  properties are specified in their camelized form (e.g., `fontSize`).
  **/
  setStyle: (function(){
    
    // Konqueror (at least 4.2.2) fails to change element's 
    // overflow style if its value was set from within HTML
    var IS_OVERFLOW_STYLE_BUGGY = (function(){
      var isBuggy = false;
      var el = document.createElement('div');
      el.innerHTML = '<p style="overflow: visible;">x</p>';
      var firstChild = el.firstChild;
      if (firstChild && firstChild.style) {
        firstChild.style.overflow = 'hidden';
        isBuggy = firstChild.style.overflow !== 'hidden';
      }
      el = firstChild = null;
      return isBuggy;
    })();
    
    var reOverflow = /overflow\s*:\s*[^;]+;?/;
    
    return function(element, styles) {
      element = $(element);
      var elementStyle = element.style, match;
      if (Object.isString(styles)) {
        element.style.cssText += ';' + styles;
        return styles.include('opacity') ?
          element.setOpacity(styles.match(/opacity:\s*(\d?\.?\d*)/)[1]) : element;
      }
      for (var property in styles) {
        if (property === 'opacity') {
          element.setOpacity(styles[property]);
        }
        else if (property === 'overflow' && IS_OVERFLOW_STYLE_BUGGY) {
          // Work around Konqueror bug by setting style via {read|write}Attribute
          var styleValue = Element.readAttribute(element, 'style');
          var newValue = 'overflow: ' + styles[property] + '; ';
          Element.writeAttribute(element, 'style', 
            (reOverflow.test(styleValue) 
              ? styleValue.replace(reOverflow, newValue) 
              : newValue + styleValue));
        }
        else {
          elementStyle[(property == 'float' || property == 'cssFloat')
            ? (Object.isUndefined(elementStyle.styleFloat) ? 'cssFloat' : 'styleFloat') 
            : property] = styles[property];
        }
      }
      return element;
    }   
  })(),
  
  /**
   *  Element#setOpacity(@element, value) -> Element
   *  
   *  Sets the opacity of `element`.
  **/
  setOpacity: (function(){
    var docEl = document.documentElement;
    
    function setOpacity(element, value) {
      element = $(element);
      element.style.opacity = (value == 1 || value === '') 
        ? '' : (value < 0.00001) ? 0 : value;
      return element;
    }
    
    // Certain gecko versions has visual issues with opacity=1
    if (Prototype.Browser.Gecko && /rv:1\.8\.0/.test(navigator.userAgent)) {
      setOpacity = function(element, value) {
        element = $(element);
        element.style.opacity = (value == 1) ? 0.999999 : 
          (value === '') ? '' : (value < 0.00001) ? 0 : value;
        return element;
      };
    }
    else if (Prototype.Browser.WebKit) {
      setOpacity = function(element, value) {
        element = $(element);
        element.style.opacity = (value == 1 || value === '') ? '' :
          (value < 0.00001) ? 0 : value;

        if (value == 1)
          if(element.tagName.toUpperCase() == 'IMG' && element.width) { 
            element.width++; element.width--;
          } else try {
            var n = document.createTextNode(' ');
            element.appendChild(n);
            element.removeChild(n);
          } catch (e) { }

        return element;
      };
    }
    
    function stripAlpha(filter) {
      return filter.replace(/alpha\([^\)]*\)/gi,'');
    }
    
    function setOpacityUsingFilter(element, value) {
      element = $(element);
      
      var currentStyle = element.currentStyle;
      
      if ((currentStyle && !currentStyle.hasLayout) ||
        (!currentStyle && element.style.zoom == 'normal'))
          element.style.zoom = 1;

      var filter = Element.getStyle(element, 'filter'), style = element.style;
      if (value == 1 || value === '') {
        (filter = stripAlpha(filter)) 
          ? style.filter = filter 
          : style.removeAttribute('filter');
        return element;
      } else if (value < 0.00001) value = 0;
      style.filter = stripAlpha(filter) + 'alpha(opacity=' + (value * 100) + ')';
      return element;   
    }
    
    if ('opacity' in docEl.style) {
      return setOpacity;
    }
    else if ('filter' in docEl.style) {
      return setOpacityUsingFilter;
    }
  })(),
  
  /**
   *  Element#getDimensions(@element) -> Object
   *  
   *  Finds the computed width and height of `element` and returns them as
   *  key/value pairs of an object.
  **/
  getDimensions: function(element) {
    element = $(element);
    var display = Element.getStyle(element, 'display');
    if (display != 'none' && display != null) // Safari bug
      return {width: element.offsetWidth, height: element.offsetHeight};
    
    // All *Width and *Height properties give 0 on elements with display none,
    // so enable the element temporarily
    var els = element.style;
    var originalVisibility = els.visibility;
    var originalPosition = els.position;
    var originalDisplay = els.display;
    els.visibility = 'hidden';
    if (originalPosition != 'fixed') // Switching fixed to absolute causes issues in Safari
      els.position = 'absolute';
    els.display = 'block';
    var originalWidth = element.clientWidth;
    var originalHeight = element.clientHeight;
    els.display = originalDisplay;
    els.position = originalPosition;
    els.visibility = originalVisibility;
    return {width: originalWidth, height: originalHeight};    
  },
  
  /**
   *  Element#makePositioned(@element) -> Element
   *
   *  Allows for the easy creation of a CSS containing block by setting 
   *  `element`'s CSS `position` to `relative` if its initial position is
   *  either `static` or `undefined`.
  **/
  makePositioned: function(element) {
    element = $(element);
    var pos = Element.getStyle(element, 'position');
    if (pos == 'static' || !pos) {
      element._madePositioned = true;
      element.style.position = 'relative';
      // Opera returns the offset relative to the positioning context, when an
      // element is position relative but top and left have not been defined
      if (Prototype.Browser.Opera) {
        element.style.top = 0;
        element.style.left = 0;
      }  
    }
    return element;
  },
  
  /**
   *  Element#undoPositioned(@element) -> Element
   *  
   *  Sets `element` back to the state it was in _before_
   *  [[Element.makePositioned]] was applied to it.
  **/
  undoPositioned: function(element) {
    element = $(element);
    if (element._madePositioned) {
      element._madePositioned = undefined;
      element.style.position =
        element.style.top =
        element.style.left =
        element.style.bottom =
        element.style.right = '';   
    }
    return element;
  },

  /**
   *  Element#makeClipping(@element) -> Element
   *  
   *  Simulates the poorly-supported CSS `clip` property by setting `element`'s
   *  `overflow` value to `hidden`.
  **/
  makeClipping: function(element) {
    element = $(element);
    if (element._overflow) return element;
    element._overflow = Element.getStyle(element, 'overflow') || 'auto';
    if (element._overflow !== 'hidden') {
      Element.setStyle(element, { overflow: 'hidden' });
    }
    return element;
  },

  /**
   *  Element#undoClipping(@element) -> Element
   *  
   *  Sets `element`’s CSS `overflow` property back to the value it had
   *  _before_ [[Element.makeClipping]] was applied.
  **/
  undoClipping: function(element) {
    element = $(element);
    if (!element._overflow) return element;
    Element.setStyle(element, {
      overflow: element._overflow == 'auto' ? '' : element._overflow
    });
    element._overflow = null;
    return element;
  },

  /**
   *  Element#absolutize(@element) -> Element
   *  
   *  Turns `element` into an absolutely-positioned element _without_ changing
   *  its position in the page layout.
  **/
  absolutize: function(element) {
    element = $(element);
    if (Element.getStyle(element, 'position') == 'absolute') return element;

    var offsets = Element.positionedOffset(element);
    var top     = offsets[1];
    var left    = offsets[0];
    var width   = element.clientWidth;
    var height  = element.clientHeight;

    element._originalLeft   = left - parseFloat(element.style.left  || 0);
    element._originalTop    = top  - parseFloat(element.style.top || 0);
    element._originalWidth  = element.style.width;
    element._originalHeight = element.style.height;

    element.style.position = 'absolute';
    element.style.top    = top + 'px';
    element.style.left   = left + 'px';
    element.style.width  = width + 'px';
    element.style.height = height + 'px';
    return element;
  },

  /**
   *  Element#relativize(@element) -> Element
   *  
   *  Turns `element` into a relatively-positioned element without changing
   *  its position in the page layout.
   *  
   *  Used to undo a call to [[Element.absolutize]].
  **/
  relativize: function(element) {
    element = $(element);
    if (Element.getStyle(element, 'position') == 'relative') return element;

    element.style.position = 'relative';
    var top  = parseFloat(element.style.top  || 0) - (element._originalTop || 0);
    var left = parseFloat(element.style.left || 0) - (element._originalLeft || 0);

    element.style.top    = top + 'px';
    element.style.left   = left + 'px';
    element.style.height = element._originalHeight;
    element.style.width  = element._originalWidth;
    return element;
  },

  /**
   *  Element.cumulativeScrollOffset(@element) -> Array
   *  
   *  Calculates the cumulative scroll offset of an element in nested
   *  scrolling containers.
   *  
   *  Returns an array in the form of `[leftValue, topValue]`. Also accessible
   *  as properties: `{ left: leftValue, top: topValue }`.
  **/
  cumulativeScrollOffset: function(element) {
    var valueT = 0, valueL = 0;
    do {
      valueT += element.scrollTop  || 0;
      valueL += element.scrollLeft || 0; 
      element = element.parentNode;
    } while (element);
    return Element._returnOffset(valueL, valueT);
  },
  
  /**
   *  Element#clonePosition(@element, source[, options]) -> Element
   *  
   *  Clones the position and/or dimensions of `source` onto `element` as
   *  defined by `options`.
   *  
   *  Valid keys for `options` are: `setLeft`, `setTop`, `setWidth`, and
   *  `setHeight` (all booleans which default to `true`); and `offsetTop`
   *  and `offsetLeft` (numbers which default to `0`). Use these to control
   *  which aspects of `source`'s layout are cloned and how much to offset
   *  the resulting position of `element`.
  **/
  clonePosition: function(element, source) {
    var options = Object.extend({
      setLeft:    true,
      setTop:     true,
      setWidth:   true,
      setHeight:  true,
      offsetTop:  0,
      offsetLeft: 0
    }, arguments[2] || { });

    // find page position of source
    source = $(source);
    var p = Element.viewportOffset(source);

    // find coordinate system to use
    element = $(element);
    var delta = [0, 0];
    var parent = null;
    // delta [0,0] will do fine with position: fixed elements, 
    // position:absolute needs offsetParent deltas
    if (Element.getStyle(element, 'position') == 'absolute') {
      parent = Element.getOffsetParent(element);
      delta = Element.viewportOffset(parent);
    }

    // correct by body offsets (fixes Safari)
    if (parent == document.body) {
      delta[0] -= document.body.offsetLeft;
      delta[1] -= document.body.offsetTop; 
    }

    // set position
    if (options.setLeft)   element.style.left  = (p[0] - delta[0] + options.offsetLeft) + 'px';
    if (options.setTop)    element.style.top   = (p[1] - delta[1] + options.offsetTop) + 'px';
    if (options.setWidth)  element.style.width = source.offsetWidth + 'px';
    if (options.setHeight) element.style.height = source.offsetHeight + 'px';
    return element;
  }
};

(function(){

  // Memoize non-literal RegExp objects,
  // construction of which is relatively expensive in some clients (e.g some versions of Firefox and Opera)
  // Inspired by APE and YUI Javascript libraries
  var regexCache = { };

  function getClassNameRegex(className) {
    var _className = "(?:^|\\s+)" + className + "(?:\\s+|$)";
    return (regexCache[_className] || (regexCache[_className] = new RegExp(_className)));
  }

  Object.extend(Element.Methods, {
    /**
     *  Element#hasClassName(@element, className) -> Boolean
     *
     *  Checks whether `element` has the given CSS class name.
    **/
    hasClassName: function(element, className) {
      if (!(element = $(element))) return;
      var elementClassName = element.className;
      var re = getClassNameRegex(className)
      return (elementClassName.length > 0 &&
        (elementClassName == className || re.test(elementClassName)));
    },

    /**
     *  Element#removeClassName(@element, className) -> Element
     *
     *  Removes a CSS class from `element`.
    **/
    removeClassName: function(element, className) {
      if (!(element = $(element))) return;
      var re = getClassNameRegex(className);
      element.className = element.className.replace(re, ' ').strip();
      return element;
    }
  });
})();

Object.extend(Element.Methods, {
  /** alias of: Element.select
   *  Element#getElementsBySelector(@element, selector) -> [Element...]
  **/
  getElementsBySelector: Element.Methods.select,
  
  /** alias of: Element.immediateDescendants
   *  Element#childElements(@element) -> [Element...]
  **/
  childElements: Element.Methods.immediateDescendants
});

Element._attributeTranslations = {
  write: {
    names: {
      className: 'class',
      htmlFor:   'for'
    }, 
    values: { }
  }
};

if (Prototype.Browser.IE) {

  Element._attributeTranslations = (function(){
    
    var classProp = 'className';
    var forProp = 'for';
    
    var el = document.createElement('div');
    
    // try "className" first (IE <8)
    el.setAttribute(classProp, 'x');
    
    if (el.className !== 'x') {
      // try "class" (IE 8)
      el.setAttribute('class', 'x');
      if (el.className === 'x') {
        classProp = 'class';
      }
    }
    el = null;
    
    el = document.createElement('label');
    el.setAttribute(forProp, 'x');
    if (el.htmlFor !== 'x') {
      el.setAttribute('htmlFor', 'x');
      if (el.htmlFor === 'x') {
        forProp = 'htmlFor';
      }
    }
    el = null;
    
    return {
      read: {
        names: {
          'class':      classProp,
          'className':  classProp,
          'for':        forProp,
          'htmlFor':    forProp
        },
        values: {
          _getAttr: function(element, attribute) {
            return element.getAttribute(attribute, 2);
          },
          _getAttrNode: function(element, attribute) {
            var node = element.getAttributeNode(attribute);
            return node ? node.value : "";
          },
          _getEv: (function(){
            
            var el = document.createElement('div');
            el.onclick = Prototype.emptyFunction;
            var value = el.getAttribute('onclick');
            var f;
            
            // IE<8
            if (String(value).indexOf('{') > -1) {
              // intrinsic event attributes are serialized as `function { ... }`
              f = function(element, attribute) {
                attribute = element.getAttribute(attribute);
                if (!attribute) return null;
                attribute = attribute.toString();
                attribute = attribute.split('{')[1];
                attribute = attribute.split('}')[0];
                return attribute.strip();
              };
            }
            // IE8
            else if (value === '') {
              // only function body is serialized
              f = function(element, attribute) {
                attribute = element.getAttribute(attribute);
                if (!attribute) return null;
                return attribute.strip();
              };
            }
            el = null;
            return f;
          })(),
          _flag: function(element, attribute) {
            return $(element).hasAttribute(attribute) ? attribute : null;
          },
          style: function(element) {
            return element.style.cssText.toLowerCase();
          },
          title: function(element) {
            return element.title;
          }
        }
      }
    };
  })();
  
  Element._attributeTranslations.write = {
    names: Object.extend({
      cellpadding: 'cellPadding',
      cellspacing: 'cellSpacing'
    }, Element._attributeTranslations.read.names),
    values: {
      checked: function(element, value) {
        element.checked = !!value;
      },
      
      style: function(element, value) {
        element.style.cssText = value ? value : '';
      }
    }
  };
  
  Element._attributeTranslations.has = {};
    
  $w('colSpan rowSpan vAlign dateTime accessKey tabIndex ' +
      'encType maxLength readOnly longDesc frameBorder').each(function(attr) {
    Element._attributeTranslations.write.names[attr.toLowerCase()] = attr;
    Element._attributeTranslations.has[attr.toLowerCase()] = attr;
  });
  
  (function(v) {
    Object.extend(v, {
      href:        v._getAttr,
      src:         v._getAttr,
      type:        v._getAttr,
      action:      v._getAttrNode,
      disabled:    v._flag,
      checked:     v._flag,
      readonly:    v._flag,
      multiple:    v._flag,
      onload:      v._getEv,
      onunload:    v._getEv,
      onclick:     v._getEv,
      ondblclick:  v._getEv,
      onmousedown: v._getEv,
      onmouseup:   v._getEv,
      onmouseover: v._getEv,
      onmousemove: v._getEv,
      onmouseout:  v._getEv,
      onfocus:     v._getEv,
      onblur:      v._getEv,
      onkeypress:  v._getEv,
      onkeydown:   v._getEv,
      onkeyup:     v._getEv,
      onsubmit:    v._getEv,
      onreset:     v._getEv,
      onselect:    v._getEv,
      onchange:    v._getEv
    });
  })(Element._attributeTranslations.read.values);
  
  // We optimize Element#down for IE so that it does not call
  // Element#descendants (and therefore extend all nodes).  
  if (Prototype.BrowserFeatures.ElementExtensions) {
    (function() {
      function _descendants(element) {
        var nodes = element.getElementsByTagName('*'), results = [];
        for (var i = 0, node; node = nodes[i]; i++)
          if (node.tagName !== "!") // Filter out comment nodes.
            results.push(node);
        return results;
      }

      Element.Methods.down = function(element, expression, index) {
        element = $(element);
        if (arguments.length == 1) return element.firstDescendant();
        return Object.isNumber(expression) ? _descendants(element)[expression] :
          Element.select(element, expression)[index || 0];
      };    
    })();
  } 
}

Element._returnOffset = function(l, t) {
  var result = [l, t];
  result.left = l;
  result.top = t;
  return result;
};

Element._getContentFromAnonymousElement = function(tagName, html) {
  var div = document.createElement('div'),
      t = Element._insertionTranslations.tags[tagName];
  if (t) {
    div.innerHTML = t[0] + html + t[1];
    for (var i = t[2]; i--; ) {
      div = div.firstChild;
    }
  }
  else {
    div.innerHTML = html;
  }
  return $A(div.childNodes);
};

Element._insertionTranslations = {
  before: function(element, node) {
    element.parentNode.insertBefore(node, element);
  },
  top: function(element, node) {
    element.insertBefore(node, element.firstChild);
  },
  bottom: function(element, node) {
    element.appendChild(node);
  },
  after: function(element, node) {
    element.parentNode.insertBefore(node, element.nextSibling);
  },
  tags: {
    TABLE:  ['<table>',                '</table>',                   1],
    TBODY:  ['<table><tbody>',         '</tbody></table>',           2],
    TR:     ['<table><tbody><tr>',     '</tr></tbody></table>',      3],
    TD:     ['<table><tbody><tr><td>', '</td></tr></tbody></table>', 4],
    SELECT: ['<select>',               '</select>',                  1]
  }
};

(function() {
  var tags = Element._insertionTranslations.tags;
  Object.extend(tags, {
    THEAD: tags.TBODY,
    TFOOT: tags.TBODY,
    TH:    tags.TD
  });
})();

Element.Methods.Simulated = {
  hasAttribute: function(element, attribute) {
    attribute = Element._attributeTranslations.has[attribute] || attribute;
    var node = $(element).getAttributeNode(attribute);
    return !!(node && node.specified);
  }
};

Element.Methods.ByTag = { };

Object.extend(Element, Element.Methods);

(function(div) {
  
  if (!Prototype.BrowserFeatures.ElementExtensions && div['__proto__']) {
    window.HTMLElement = { };
    window.HTMLElement.prototype = div['__proto__'];
    Prototype.BrowserFeatures.ElementExtensions = true;
  }
  
  div = null;
  
})(document.createElement('div'));

/**
 *  Element.extend(element) -> Element
 *  
 *  Extends `element` with all of the methods contained in `Element.Methods`
 *  and `Element.Methods.Simulated`.
 *  If `element` is an `input`, `textarea`, or `select` tag, it will also be
 *  extended with the methods from `Form.Element.Methods`. If it is a `form`
 *  tag, it will also be extended with the methods from `Form.Methods`.
**/
Element.extend = (function() {
  
  function checkDeficiency(tagName) {
    if (typeof window.Element != 'undefined') {
      var proto = window.Element.prototype;
      if (proto) {
        var id = '_' + (Math.random()+'').slice(2);
        var el = document.createElement(tagName);
        proto[id] = 'x';
        var isBuggy = (el[id] !== 'x');
        delete proto[id];
        el = null;
        return isBuggy;
      }
    }
    return false;
  }
  
  function extendElementWith(element, methods) {
    for (var property in methods) {
      var value = methods[property];
      if (Object.isFunction(value) && !(property in element))
        element[property] = value.methodize();
    }
  }
  
  var HTMLOBJECTELEMENT_PROTOTYPE_BUGGY = checkDeficiency('object');
  
  if (Prototype.BrowserFeatures.SpecificElementExtensions) {
    // IE8 has a bug with `HTMLObjectElement`, `HTMLAppletElement` and `HTMLEmbedElement` objects
    // (apparently implementing them as ActiveX/COM objects)
    // not being able to "inherit" from `Element.prototype` 
    // or a more specific - `HTMLObjectElement.prototype`, `HTMLAppletElement.prototype`, `HTMLEmbedElement.prototype`
    // We only test for defficient OBJECT and assume that both - EMBED and APPLET are affected as well,
    // since creating an APPLET element in IE installations without Java triggers warning popup, which we try to avoid
    if (HTMLOBJECTELEMENT_PROTOTYPE_BUGGY) {
      return function(element) {
        if (element && typeof element._extendedByPrototype == 'undefined') {
          var t = element.tagName;
          if (t && (/^(?:object|applet|embed)$/i.test(t))) {
            extendElementWith(element, Element.Methods);
            extendElementWith(element, Element.Methods.Simulated);
            extendElementWith(element, Element.Methods.ByTag[t.toUpperCase()]);
          }
        }
        return element;
      };
    }
    return Prototype.K;
  }

  var Methods = { }, ByTag = Element.Methods.ByTag;
  
  var extend = Object.extend(function(element) {
    // need to use actual `typeof` operator 
    // to prevent errors in some environments (when accessing node expandos)
    if (!element || typeof element._extendedByPrototype != 'undefined' || 
        element.nodeType != 1 || element == window) return element;

    var methods = Object.clone(Methods),
        tagName = element.tagName.toUpperCase();
    
    // extend methods for specific tags
    if (ByTag[tagName]) Object.extend(methods, ByTag[tagName]);
    
    extendElementWith(element, methods);
    
    element._extendedByPrototype = Prototype.emptyFunction;
    return element;
    
  }, { 
    refresh: function() {
      // extend methods for all tags (Safari doesn't need this)
      if (!Prototype.BrowserFeatures.ElementExtensions) {
        Object.extend(Methods, Element.Methods);
        Object.extend(Methods, Element.Methods.Simulated);
      }
    }
  });
  
  extend.refresh();
  return extend;
})();

if (document.documentElement.hasAttribute) {
  Element.hasAttribute = function(element, attribute) {
    return element.hasAttribute(attribute);
  }
}
else {
  Element.hasAttribute = Element.Methods.Simulated.hasAttribute;
}

/**
 *  Element.addMethods(methods) -> undefined
 *  Element.addMethods(tagName, methods) -> undefined
 *  
 *  Takes a hash of methods and makes them available as methods of extended
 *  elements and of the `Element` object.
 *  
 *  The second usage form is for adding methods only to specific tag names.
 *  
**/
Element.addMethods = function(methods) {
  var F = Prototype.BrowserFeatures, T = Element.Methods.ByTag;
  
  if (!methods) {
    Object.extend(Form, Form.Methods);
    Object.extend(Form.Element, Form.Element.Methods);
    Object.extend(Element.Methods.ByTag, {
      "FORM":     Object.clone(Form.Methods),
      "INPUT":    Object.clone(Form.Element.Methods),
      "SELECT":   Object.clone(Form.Element.Methods),
      "TEXTAREA": Object.clone(Form.Element.Methods),
      "BUTTON":   Object.clone(Form.Element.Methods)
    });
  }
  
  if (arguments.length == 2) {
    var tagName = methods;
    methods = arguments[1];
  }
  
  if (!tagName) Object.extend(Element.Methods, methods || { });  
  else {
    if (Object.isArray(tagName)) tagName.each(extend);
    else extend(tagName);
  }
  
  function extend(tagName) {
    tagName = tagName.toUpperCase();
    if (!Element.Methods.ByTag[tagName])
      Element.Methods.ByTag[tagName] = { };
    Object.extend(Element.Methods.ByTag[tagName], methods);
  }

  function copy(methods, destination, onlyIfAbsent) {
    onlyIfAbsent = onlyIfAbsent || false;
    for (var property in methods) {
      var value = methods[property];
      if (!Object.isFunction(value)) continue;
      if (!onlyIfAbsent || !(property in destination))
        destination[property] = value.methodize();
    }
  }
  
  function findDOMClass(tagName) {
    var klass;
    var trans = {       
      "OPTGROUP": "OptGroup", "TEXTAREA": "TextArea", "P": "Paragraph", 
      "FIELDSET": "FieldSet", "UL": "UList", "OL": "OList", "DL": "DList",
      "DIR": "Directory", "H1": "Heading", "H2": "Heading", "H3": "Heading",
      "H4": "Heading", "H5": "Heading", "H6": "Heading", "Q": "Quote", 
      "INS": "Mod", "DEL": "Mod", "A": "Anchor", "IMG": "Image", "CAPTION": 
      "TableCaption", "COL": "TableCol", "COLGROUP": "TableCol", "THEAD": 
      "TableSection", "TFOOT": "TableSection", "TBODY": "TableSection", "TR":
      "TableRow", "TH": "TableCell", "TD": "TableCell", "FRAMESET": 
      "FrameSet", "IFRAME": "IFrame"
    };
    if (trans[tagName]) klass = 'HTML' + trans[tagName] + 'Element';
    if (window[klass]) return window[klass];
    klass = 'HTML' + tagName + 'Element';
    if (window[klass]) return window[klass];
    klass = 'HTML' + tagName.capitalize() + 'Element';
    if (window[klass]) return window[klass];
    
    var element = document.createElement(tagName);    
    var proto = element['__proto__'] || element.constructor.prototype;    
    element = null;
    return proto;
  }
  
  var elementPrototype = window.HTMLElement ? HTMLElement.prototype :
   Element.prototype;
  
  if (F.ElementExtensions) {
    copy(Element.Methods, elementPrototype);
    copy(Element.Methods.Simulated, elementPrototype, true);
  }
  
  if (F.SpecificElementExtensions) {
    for (var tag in Element.Methods.ByTag) {
      var klass = findDOMClass(tag);
      if (Object.isUndefined(klass)) continue;
      copy(T[tag], klass.prototype);
    }
  }  

  Object.extend(Element, Element.Methods);
  delete Element.ByTag;
  
  if (Element.extend.refresh) Element.extend.refresh();
  Element.cache = { };
};

/** section: DOM
 * document.viewport
 *  
 *  The `document.viewport` namespace contains methods that return information
 *  about the viewport — the rectangle that represents the portion of a web
 *  page within view. In other words, it's the browser window minus all chrome.
**/

document.viewport = {
  
  /**
   *  document.viewport.getDimensions() -> Object
   *  
   *  Returns the size of the viewport.
   *  
   *  Returns an object of the form `{ width: Number, height: Number }`.
  **/
  getDimensions: function() {
    return { width: this.getWidth(), height: this.getHeight() };
  },

  /**
   *  document.viewport.getScrollOffsets() -> Array
   *  
   *  Returns the viewport’s horizontal and vertical scroll offsets.
   *  
   *  Returns an array in the form of `[leftValue, topValue]`. Also accessible
   *  as properties: `{ left: leftValue, top: topValue }`.
  **/
  getScrollOffsets: function() {
    return Element._returnOffset(
      window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft,
      window.pageYOffset || document.documentElement.scrollTop  || document.body.scrollTop);
  }
};

(function(viewport) {
  var B = Prototype.Browser, doc = document, element, property = {};
   
  function getRootElement() {
    // Older versions of Safari.
    if (B.WebKit && !doc.evaluate)
      return document;
    
    // Older versions of Opera.
    if (B.Opera && window.parseFloat(window.opera.version()) < 9.5)
      return document.body;
    
    return document.documentElement;
  }

  function define(D) {
    if (!element) element = getRootElement();
    
    property[D] = 'client' + D;

    viewport['get' + D] = function() { return element[property[D]]; };
    return viewport['get' + D]();
  }
  
  /**
   *  document.viewport.getWidth() -> Number
   *  
   *  Returns the width of the viewport.
  **/
  viewport.getWidth  = define.curry('Width');
  
  /**
   *  document.viewport.getHeight() -> Number
   *  
   *  Returns the height of the viewport.
  **/
  viewport.getHeight = define.curry('Height');
})(document.viewport);


Element.Storage = {
  UID: 1
};

Element.addMethods({
  /**
   *  Element#getStorage(@element) -> Hash
   *  
   *  Returns the [[Hash]] object that stores custom metadata for this element.
  **/
  getStorage: function(element) {
    if (!(element = $(element))) return;
    
    var uid;
    if (element === window) {
      uid = 0;
    } else {
      if (typeof element._prototypeUID === "undefined")
        element._prototypeUID = [Element.Storage.UID++];
      uid = element._prototypeUID[0];
    }
        
    if (!Element.Storage[uid])
      Element.Storage[uid] = $H();
    
    return Element.Storage[uid];
  },
  
  /**
   *  Element#store(@element, key, value) -> Element
   *  
   *  Stores a key/value pair of custom metadata on the element.
   *  
   *  The metadata can later be retrieved with [[Element.retrieve]].
  **/
  store: function(element, key, value) {
    if (!(element = $(element))) return;
    
    if (arguments.length === 2) {
      // Assume we've been passed an object full of key/value pairs.
      Element.getStorage(element).update(key);
    } else {
      Element.getStorage(element).set(key, value);
    }
    
    return element;
  },
  
  /**
   *  Element#retrieve(@element, key[, defaultValue]) -> ?
   *  
   *  Retrieves custom metadata set on `element` with [[Element.store]].
   *  
   *  If the value is `undefined` and `defaultValue` is given, it will be
   *  stored on the element as its new value for that key, then returned.
  **/
  retrieve: function(element, key, defaultValue) {
    if (!(element = $(element))) return;
    var hash = Element.getStorage(element), value = hash.get(key);
    
    if (Object.isUndefined(value)) {
      hash.set(key, defaultValue);
      value = defaultValue;
    }
    
    return value;
  },
  
  /**
   *  Element#clone(@element, deep) -> Element
   *  - deep (Boolean): Whether to clone `element`'s descendants as well.
   *  
   *  Returns a duplicate of `element`.
   *  
   *  A wrapper around DOM Level 2 `Node#cloneNode`, `Element#clone` cleans up
   *  any expando properties defined by Prototype.
  **/
  clone: function(element, deep) {
    if (!(element = $(element))) return;
    var clone = element.cloneNode(deep);
    clone._prototypeUID = undefined;
    if (deep) {
      var descendants = Element.select(clone, '*'),
          i = descendants.length;
      while (i--) {
        descendants[i]._prototypeUID = void 0;
      }
    }
    return Element.extend(clone);
  }
});

(function(){
  
  // IE throws an "Unspecified error" when accessing `offsetParent` of an orphaned element without `parentNode`
  // It does not throw when an element is orphaned from the document, but has a `parentNode`
  var OFFSET_PARENT_THROWS_ON_ORPHANED_ELEMENT = (function(){
    var el = document.createElement('div'), 
        result = false;
    try { el.offsetParent; }
    catch(e) { result = true; }
    el = null;
    return result;
  })();
  
  function BUGGY_OFFSET_VALUES_FOR_STATIC_ELEMENTS_INSIDE_POSITIONED_ONES() {
    var body = document.body, 
        isBuggy = null;
    if (body) {
      var id = 'x' + (Math.random() + '').slice(2);
      var clearance = "margin:0;padding:0;border:0;visibility:hidden;";
      var payload = '<div style="position:absolute;top:10px;' + clearance + '">'+
        '<div style="position:relative;top:10px;' + clearance + '">'+
          '<div style="height:10px;font-size:1px;' + clearance + '"><\/div>'+
          '<div id="'+id+'">x<\/div>'+
        '<\/div>'+
      '<\/div>';
      var wrapper = document.createElement('div');
      wrapper.innerHTML = payload;
      body.insertBefore(wrapper, body.firstChild);
      var el = document.getElementById(id);
      if (el.offsetTop !== 10) {
        // buggy, set position to relative and check if it fixes it
        el.style.position = 'relative';
        if (el.offsetTop === 10) {
          isBuggy = true;
        }
      }
      else {
        isBuggy = false;
      }
      body.removeChild(wrapper);
      wrapper = null;
    }
    return (BUGGY_OFFSET_VALUES_FOR_STATIC_ELEMENTS_INSIDE_POSITIONED_ONES = function(){
      return isBuggy;
    })();
  };
  
  /**
   *  Element#cumulativeOffset(@element) -> Array
   *  
   *  Returns the offsets of `element` from the top left corner of the
   *  document.
   *  
   *  Returns an array in the form of `[leftValue, topValue]`. Also accessible
   *  as properties: `{ left: leftValue, top: topValue }`.
  **/
  function cumulativeOffset(element) {
    if (OFFSET_PARENT_THROWS_ON_ORPHANED_ELEMENT && !element.parentNode) { // IE
      return Element._returnOffset(0, 0);
    }
    var valueT = 0, valueL = 0;
    do {
      valueT += element.offsetTop  || 0;
      valueL += element.offsetLeft || 0;
      element = element.offsetParent;
    } while (element);
    return Element._returnOffset(valueL, valueT);
  }
  
  if (Prototype.Browser.WebKit) {
    // Safari returns margins on body which is incorrect if the child is absolutely
    // positioned.  For performance reasons, redefine Element#cumulativeOffset for
    // KHTML/WebKit only.
    cumulativeOffset = function(element) {
      var valueT = 0, valueL = 0;
      do {
        valueT += element.offsetTop  || 0;
        valueL += element.offsetLeft || 0;
        if (element.offsetParent == document.body)
          if (Element.getStyle(element, 'position') == 'absolute') break;
        element = element.offsetParent;
      } while (element);

      return Element._returnOffset(valueL, valueT);
    };
  }
  
  /**
   *  Element#getOffsetParent(@element) -> Element
   *  
   *  Returns `element`’s closest _positioned_ ancestor. If none is found, the
   *  `body` element is returned.
  **/
  function getOffsetParent(element) {
    if (OFFSET_PARENT_THROWS_ON_ORPHANED_ELEMENT && !element.parentNode) { // IE
      return $(document.body);
    }
    if (element.offsetParent && 
        Element.getStyle(element.offsetParent, 'position') !== 'static') {
      return $(element.offsetParent);
    }
    if (element == document.body) return $(element);

    while ((element = element.parentNode) && element != document.body)
      if (Element.getStyle(element, 'position') != 'static')
        return $(element);

    return $(document.body);
  }
  
  /**
   *  Element#positionedOffset(@element) -> Array
   *  
   *  Returns `element`’s offset relative to its closest positioned ancestor
   *  (the element that would be returned by [[Element.getOffsetParent]]).
   *  
   *  Returns an array in the form of `[leftValue, topValue]`. Also accessible
   *  as properties: `{ left: leftValue, top: topValue }`.
  **/
  function positionedOffset(element) {
    if (OFFSET_PARENT_THROWS_ON_ORPHANED_ELEMENT && !element.parentNode) { // IE
      return Element._returnOffset(0, 0);
    }
    if (BUGGY_OFFSET_VALUES_FOR_STATIC_ELEMENTS_INSIDE_POSITIONED_ONES()) {
      return fixedPositionOffset(element);
    }
    return _calculatePositionedOffset(element);
  }
  
  function _calculatePositionedOffset(element) {
    var valueT = 0, valueL = 0;
    do {
      valueT += element.offsetTop  || 0;
      valueL += element.offsetLeft || 0;
      element = element.offsetParent;
      if (element) {
        if (element.tagName.toUpperCase() == 'BODY') break;
        var p = Element.getStyle(element, 'position');
        if (p !== 'static') break;
      }
    } 
    while (element);
    return Element._returnOffset(valueL, valueT);
  }
  
  function fixedPositionOffset(element) {
    var position = Element.getStyle(element, 'position');
    if (position !== 'static') {
      return _calculatePositionedOffset(element);
    }
    // Trigger hasLayout on the offset parent so that IE6 reports
    // accurate offsetTop and offsetLeft values for position: fixed.
    var offsetParent = Element.getOffsetParent(element);
    if (offsetParent && Element.getStyle(offsetParent, 'position') === 'fixed') {
      offsetParent.style.zoom = 1;
    }
    element.style.position = 'relative';
    var value = _calculatePositionedOffset(element);
    element.style.position = position;
    return value;
  }
  
  /**
   *  Element#viewportOffset(@element) -> Array
   *  
   *  Returns the X/Y coordinates of element relative to the viewport.
   *  
   *  Returns an array in the form of `[leftValue, topValue]`. Also accessible
   *  as properties: `{ left: leftValue, top: topValue }`.
  **/
  function viewportOffset(forElement) {
    if (OFFSET_PARENT_THROWS_ON_ORPHANED_ELEMENT && !forElement.parentNode) { // IE
      return Element._returnOffset(0, 0);
    }
    var valueT = 0, valueL = 0;

    var element = forElement;
    do {
      valueT += element.offsetTop  || 0;
      valueL += element.offsetLeft || 0;

      // Safari fix
      if (element.offsetParent == document.body &&
        Element.getStyle(element, 'position') == 'absolute') break;

    } while (element = element.offsetParent);

    element = forElement;
    do {
      if (!Prototype.Browser.Opera || (element.tagName && 
          (element.tagName.toUpperCase() == 'BODY'))) {
        valueT -= element.scrollTop  || 0;
        valueL -= element.scrollLeft || 0;
      }
    } while (element = element.parentNode);

    return Element._returnOffset(valueL, valueT);
  }
  
  if (Prototype.Browser.IE) {
    viewportOffset = viewportOffset.wrap(
      function(proceed, element) {
        element = $(element);
        var position = Element.getStyle(element, 'position');
        
        if (position !== 'static') return proceed(element);
        
        // Trigger hasLayout on the offset parent so that IE6 reports
        // accurate offsetTop and offsetLeft values for position: fixed.
        var offsetParent = Element.getOffsetParent(element);
        var offsetParentPosition = Element.getStyle(offsetParent, 'position');
        
        if (offsetParent && offsetParentPosition === 'fixed') {
          offsetParent.style.zoom = 1;
        }
          
        element.style.position = 'relative';
        var value = proceed(element);
        element.style.position = position;
        return value;
      }
    );
  }
  
  Element.addMethods({
    cumulativeOffset:   cumulativeOffset,
    positionedOffset:   positionedOffset,
    viewportOffset:     viewportOffset,
    getOffsetParent:    getOffsetParent
  });
})();