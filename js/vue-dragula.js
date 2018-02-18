/*!
 * vue-dragula v1.3.1
 * (c) 2017 Yichang Liu
 * Released under the MIT License.
 */
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.vueDragula = factory());
}(this, (function () { 'use strict';

var babelHelpers = {};
babelHelpers.typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
  return typeof obj;
} : function (obj) {
  return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj;
};

babelHelpers.classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

babelHelpers.createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

babelHelpers;

var commonjsGlobal = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function interopDefault(ex) {
	return ex && (typeof ex === 'undefined' ? 'undefined' : babelHelpers.typeof(ex)) === 'object' && 'default' in ex ? ex['default'] : ex;
}

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var atoa = createCommonjsModule(function (module) {
  module.exports = function atoa(a, n) {
    return Array.prototype.slice.call(a, n);
  };
});

var atoa$1 = interopDefault(atoa);

var require$$1 = Object.freeze({
  default: atoa$1
});

var ticky = createCommonjsModule(function (module) {
  var si = typeof setImmediate === 'function',
      tick;
  if (si) {
    tick = function tick(fn) {
      setImmediate(fn);
    };
  } else if (typeof process !== 'undefined' && process.nextTick) {
    tick = process.nextTick;
  } else {
    tick = function tick(fn) {
      setTimeout(fn, 0);
    };
  }

  module.exports = tick;
});

var ticky$1 = interopDefault(ticky);

var require$$0$1 = Object.freeze({
  default: ticky$1
});

var debounce = createCommonjsModule(function (module) {
  'use strict';

  var ticky = interopDefault(require$$0$1);

  module.exports = function debounce(fn, args, ctx) {
    if (!fn) {
      return;
    }
    ticky(function run() {
      fn.apply(ctx || null, args || []);
    });
  };
});

var debounce$1 = interopDefault(debounce);

var require$$0 = Object.freeze({
  default: debounce$1
});

var emitter = createCommonjsModule(function (module) {
  'use strict';

  var atoa = interopDefault(require$$1);
  var debounce = interopDefault(require$$0);

  module.exports = function emitter(thing, options) {
    var opts = options || {};
    var evt = {};
    if (thing === undefined) {
      thing = {};
    }
    thing.on = function (type, fn) {
      if (!evt[type]) {
        evt[type] = [fn];
      } else {
        evt[type].push(fn);
      }
      return thing;
    };
    thing.once = function (type, fn) {
      fn._once = true; // thing.off(fn) still works!
      thing.on(type, fn);
      return thing;
    };
    thing.off = function (type, fn) {
      var c = arguments.length;
      if (c === 1) {
        delete evt[type];
      } else if (c === 0) {
        evt = {};
      } else {
        var et = evt[type];
        if (!et) {
          return thing;
        }
        et.splice(et.indexOf(fn), 1);
      }
      return thing;
    };
    thing.emit = function () {
      var args = atoa(arguments);
      return thing.emitterSnapshot(args.shift()).apply(this, args);
    };
    thing.emitterSnapshot = function (type) {
      var et = (evt[type] || []).slice(0);
      return function () {
        var args = atoa(arguments);
        var ctx = this || thing;
        if (type === 'error' && opts.throws !== false && !et.length) {
          throw args.length === 1 ? args[0] : args;
        }
        et.forEach(function emitter(listen) {
          if (opts.async) {
            debounce(listen, args, ctx);
          } else {
            listen.apply(ctx, args);
          }
          if (listen._once) {
            thing.off(type, listen);
          }
        });
        return thing;
      };
    };
    return thing;
  };
});

var emitter$1 = interopDefault(emitter);

var require$$2 = Object.freeze({
  default: emitter$1
});

var index = createCommonjsModule(function (module) {
  var NativeCustomEvent = commonjsGlobal.CustomEvent;

  function useNative() {
    try {
      var p = new NativeCustomEvent('cat', { detail: { foo: 'bar' } });
      return 'cat' === p.type && 'bar' === p.detail.foo;
    } catch (e) {}
    return false;
  }

  /**
   * Cross-browser `CustomEvent` constructor.
   *
   * https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent.CustomEvent
   *
   * @public
   */

  module.exports = useNative() ? NativeCustomEvent :

  // IE >= 9
  'function' === typeof document.createEvent ? function CustomEvent(type, params) {
    var e = document.createEvent('CustomEvent');
    if (params) {
      e.initCustomEvent(type, params.bubbles, params.cancelable, params.detail);
    } else {
      e.initCustomEvent(type, false, false, void 0);
    }
    return e;
  } :

  // IE <= 8
  function CustomEvent(type, params) {
    var e = document.createEventObject();
    e.type = type;
    if (params) {
      e.bubbles = Boolean(params.bubbles);
      e.cancelable = Boolean(params.cancelable);
      e.detail = params.detail;
    } else {
      e.bubbles = false;
      e.cancelable = false;
      e.detail = void 0;
    }
    return e;
  };
});

var index$1 = interopDefault(index);

var require$$1$2 = Object.freeze({
  default: index$1
});

var eventmap = createCommonjsModule(function (module) {
  'use strict';

  var eventmap = [];
  var eventname = '';
  var ron = /^on/;

  for (eventname in commonjsGlobal) {
    if (ron.test(eventname)) {
      eventmap.push(eventname.slice(2));
    }
  }

  module.exports = eventmap;
});

var eventmap$1 = interopDefault(eventmap);

var require$$0$2 = Object.freeze({
  default: eventmap$1
});

var crossvent = createCommonjsModule(function (module) {
  'use strict';

  var customEvent = interopDefault(require$$1$2);
  var eventmap = interopDefault(require$$0$2);
  var doc = commonjsGlobal.document;
  var addEvent = addEventEasy;
  var removeEvent = removeEventEasy;
  var hardCache = [];

  if (!commonjsGlobal.addEventListener) {
    addEvent = addEventHard;
    removeEvent = removeEventHard;
  }

  module.exports = {
    add: addEvent,
    remove: removeEvent,
    fabricate: fabricateEvent
  };

  function addEventEasy(el, type, fn, capturing) {
    return el.addEventListener(type, fn, capturing);
  }

  function addEventHard(el, type, fn) {
    return el.attachEvent('on' + type, wrap(el, type, fn));
  }

  function removeEventEasy(el, type, fn, capturing) {
    return el.removeEventListener(type, fn, capturing);
  }

  function removeEventHard(el, type, fn) {
    var listener = unwrap(el, type, fn);
    if (listener) {
      return el.detachEvent('on' + type, listener);
    }
  }

  function fabricateEvent(el, type, model) {
    var e = eventmap.indexOf(type) === -1 ? makeCustomEvent() : makeClassicEvent();
    if (el.dispatchEvent) {
      el.dispatchEvent(e);
    } else {
      el.fireEvent('on' + type, e);
    }
    function makeClassicEvent() {
      var e;
      if (doc.createEvent) {
        e = doc.createEvent('Event');
        e.initEvent(type, true, true);
      } else if (doc.createEventObject) {
        e = doc.createEventObject();
      }
      return e;
    }
    function makeCustomEvent() {
      return new customEvent(type, { detail: model });
    }
  }

  function wrapperFactory(el, type, fn) {
    return function wrapper(originalEvent) {
      var e = originalEvent || commonjsGlobal.event;
      e.target = e.target || e.srcElement;
      e.preventDefault = e.preventDefault || function preventDefault() {
        e.returnValue = false;
      };
      e.stopPropagation = e.stopPropagation || function stopPropagation() {
        e.cancelBubble = true;
      };
      e.which = e.which || e.keyCode;
      fn.call(el, e);
    };
  }

  function wrap(el, type, fn) {
    var wrapper = unwrap(el, type, fn) || wrapperFactory(el, type, fn);
    hardCache.push({
      wrapper: wrapper,
      element: el,
      type: type,
      fn: fn
    });
    return wrapper;
  }

  function unwrap(el, type, fn) {
    var i = find(el, type, fn);
    if (i) {
      var wrapper = hardCache[i].wrapper;
      hardCache.splice(i, 1); // free up a tad of memory
      return wrapper;
    }
  }

  function find(el, type, fn) {
    var i, item;
    for (i = 0; i < hardCache.length; i++) {
      item = hardCache[i];
      if (item.element === el && item.type === type && item.fn === fn) {
        return i;
      }
    }
  }
});

var crossvent$1 = interopDefault(crossvent);
var add = crossvent.add;
var remove = crossvent.remove;
var fabricate = crossvent.fabricate;

var require$$1$1 = Object.freeze({
  default: crossvent$1,
  add: add,
  remove: remove,
  fabricate: fabricate
});

var classes = createCommonjsModule(function (module) {
  'use strict';

  var cache = {};
  var start = '(?:^|\\s)';
  var end = '(?:\\s|$)';

  function lookupClass(className) {
    var cached = cache[className];
    if (cached) {
      cached.lastIndex = 0;
    } else {
      cache[className] = cached = new RegExp(start + className + end, 'g');
    }
    return cached;
  }

  function addClass(el, className) {
    var current = el.className;
    if (!current.length) {
      el.className = className;
    } else if (!lookupClass(className).test(current)) {
      el.className += ' ' + className;
    }
  }

  function rmClass(el, className) {
    el.className = el.className.replace(lookupClass(className), ' ').trim();
  }

  module.exports = {
    add: addClass,
    rm: rmClass
  };
});

var classes$1 = interopDefault(classes);
var add$1 = classes.add;
var rm = classes.rm;

var require$$0$3 = Object.freeze({
  default: classes$1,
  add: add$1,
  rm: rm
});

var dragula = createCommonjsModule(function (module) {
  'use strict';

  var emitter = interopDefault(require$$2);
  var crossvent = interopDefault(require$$1$1);
  var classes = interopDefault(require$$0$3);
  var doc = document;
  var documentElement = doc.documentElement;

  function dragula(initialContainers, options) {
    var len = arguments.length;
    if (len === 1 && Array.isArray(initialContainers) === false) {
      options = initialContainers;
      initialContainers = [];
    }
    var _mirror; // mirror image
    var _source; // source container
    var _item; // item being dragged
    var _offsetX; // reference x
    var _offsetY; // reference y
    var _moveX; // reference move x
    var _moveY; // reference move y
    var _initialSibling; // reference sibling when grabbed
    var _currentSibling; // reference sibling now
    var _copy; // item used for copying
    var _renderTimer; // timer for setTimeout renderMirrorImage
    var _lastDropTarget = null; // last container item was over
    var _grabbed; // holds mousedown context until first mousemove

    var o = options || {};
    if (o.moves === void 0) {
      o.moves = always;
    }
    if (o.accepts === void 0) {
      o.accepts = always;
    }
    if (o.invalid === void 0) {
      o.invalid = invalidTarget;
    }
    if (o.containers === void 0) {
      o.containers = initialContainers || [];
    }
    if (o.isContainer === void 0) {
      o.isContainer = never;
    }
    if (o.copy === void 0) {
      o.copy = false;
    }
    if (o.copySortSource === void 0) {
      o.copySortSource = false;
    }
    if (o.revertOnSpill === void 0) {
      o.revertOnSpill = false;
    }
    if (o.removeOnSpill === void 0) {
      o.removeOnSpill = false;
    }
    if (o.direction === void 0) {
      o.direction = 'vertical';
    }
    if (o.ignoreInputTextSelection === void 0) {
      o.ignoreInputTextSelection = true;
    }
    if (o.mirrorContainer === void 0) {
      o.mirrorContainer = doc.body;
    }

    var drake = emitter({
      containers: o.containers,
      start: manualStart,
      end: end,
      cancel: cancel,
      remove: remove,
      destroy: destroy,
      canMove: canMove,
      dragging: false
    });

    if (o.removeOnSpill === true) {
      drake.on('over', spillOver).on('out', spillOut);
    }

    events();

    return drake;

    function isContainer(el) {
      return drake.containers.indexOf(el) !== -1 || o.isContainer(el);
    }

    function events(remove) {
      var op = remove ? 'remove' : 'add';
      touchy(documentElement, op, 'mousedown', grab);
      touchy(documentElement, op, 'mouseup', release);
    }

    function eventualMovements(remove) {
      var op = remove ? 'remove' : 'add';
      touchy(documentElement, op, 'mousemove', startBecauseMouseMoved);
    }

    function movements(remove) {
      var op = remove ? 'remove' : 'add';
      crossvent[op](documentElement, 'selectstart', preventGrabbed); // IE8
      crossvent[op](documentElement, 'click', preventGrabbed);
    }

    function destroy() {
      events(true);
      release({});
    }

    function preventGrabbed(e) {
      if (_grabbed) {
        e.preventDefault();
      }
    }

    function grab(e) {
      _moveX = e.clientX;
      _moveY = e.clientY;

      var ignore = whichMouseButton(e) !== 1 || e.metaKey || e.ctrlKey;
      if (ignore) {
        return; // we only care about honest-to-god left clicks and touch events
      }
      var item = e.target;
      var context = canStart(item);
      if (!context) {
        return;
      }
      _grabbed = context;
      eventualMovements();
      if (e.type === 'mousedown') {
        if (isInput(item)) {
          // see also: https://github.com/bevacqua/dragula/issues/208
          item.focus(); // fixes https://github.com/bevacqua/dragula/issues/176
        } else {
            e.preventDefault(); // fixes https://github.com/bevacqua/dragula/issues/155
          }
      }
    }

    function startBecauseMouseMoved(e) {
      if (!_grabbed) {
        return;
      }
      if (whichMouseButton(e) === 0) {
        release({});
        return; // when text is selected on an input and then dragged, mouseup doesn't fire. this is our only hope
      }
      // truthy check fixes #239, equality fixes #207
      if (e.clientX !== void 0 && e.clientX === _moveX && e.clientY !== void 0 && e.clientY === _moveY) {
        return;
      }
      if (o.ignoreInputTextSelection) {
        var clientX = getCoord('clientX', e);
        var clientY = getCoord('clientY', e);
        var elementBehindCursor = doc.elementFromPoint(clientX, clientY);
        if (isInput(elementBehindCursor)) {
          return;
        }
      }

      var grabbed = _grabbed; // call to end() unsets _grabbed
      eventualMovements(true);
      movements();
      end();
      start(grabbed);

      var offset = getOffset(_item);
      _offsetX = getCoord('pageX', e) - offset.left;
      _offsetY = getCoord('pageY', e) - offset.top;

      classes.add(_copy || _item, 'gu-transit');
      renderMirrorImage();
      drag(e);
    }

    function canStart(item) {
      if (drake.dragging && _mirror) {
        return;
      }
      if (isContainer(item)) {
        return; // don't drag container itself
      }
      var handle = item;
      while (getParent(item) && isContainer(getParent(item)) === false) {
        if (o.invalid(item, handle)) {
          return;
        }
        item = getParent(item); // drag target should be a top element
        if (!item) {
          return;
        }
      }
      var source = getParent(item);
      if (!source) {
        return;
      }
      if (o.invalid(item, handle)) {
        return;
      }

      var movable = o.moves(item, source, handle, nextEl(item));
      if (!movable) {
        return;
      }

      return {
        item: item,
        source: source
      };
    }

    function canMove(item) {
      return !!canStart(item);
    }

    function manualStart(item) {
      var context = canStart(item);
      if (context) {
        start(context);
      }
    }

    function start(context) {
      if (isCopy(context.item, context.source)) {
        _copy = context.item.cloneNode(true);
        drake.emit('cloned', _copy, context.item, 'copy');
      }

      _source = context.source;
      _item = context.item;
      _initialSibling = _currentSibling = nextEl(context.item);

      drake.dragging = true;
      drake.emit('drag', _item, _source);
    }

    function invalidTarget() {
      return false;
    }

    function end() {
      if (!drake.dragging) {
        return;
      }
      var item = _copy || _item;
      drop(item, getParent(item));
    }

    function ungrab() {
      _grabbed = false;
      eventualMovements(true);
      movements(true);
    }

    function release(e) {
      ungrab();

      if (!drake.dragging) {
        return;
      }
      var item = _copy || _item;
      var clientX = getCoord('clientX', e);
      var clientY = getCoord('clientY', e);
      var elementBehindCursor = getElementBehindPoint(_mirror, clientX, clientY);
      var dropTarget = findDropTarget(elementBehindCursor, clientX, clientY);
      if (dropTarget && (_copy && o.copySortSource || !_copy || dropTarget !== _source)) {
        drop(item, dropTarget);
      } else if (o.removeOnSpill) {
        remove();
      } else {
        cancel();
      }
    }

    function drop(item, target) {
      var parent = getParent(item);
      if (_copy && o.copySortSource && target === _source) {
        parent.removeChild(_item);
      }
      if (isInitialPlacement(target)) {
        drake.emit('cancel', item, _source, _source);
      } else {
        drake.emit('drop', item, target, _source, _currentSibling);
      }
      cleanup();
    }

    function remove() {
      if (!drake.dragging) {
        return;
      }
      var item = _copy || _item;
      var parent = getParent(item);
      if (parent) {
        parent.removeChild(item);
      }
      drake.emit(_copy ? 'cancel' : 'remove', item, parent, _source);
      cleanup();
    }

    function cancel(revert) {
      if (!drake.dragging) {
        return;
      }
      var reverts = arguments.length > 0 ? revert : o.revertOnSpill;
      var item = _copy || _item;
      var parent = getParent(item);
      var initial = isInitialPlacement(parent);
      if (initial === false && reverts) {
        if (_copy) {
          if (parent) {
            parent.removeChild(_copy);
          }
        } else {
          _source.insertBefore(item, _initialSibling);
        }
      }
      if (initial || reverts) {
        drake.emit('cancel', item, _source, _source);
      } else {
        drake.emit('drop', item, parent, _source, _currentSibling);
      }
      cleanup();
    }

    function cleanup() {
      var item = _copy || _item;
      ungrab();
      removeMirrorImage();
      if (item) {
        classes.rm(item, 'gu-transit');
      }
      if (_renderTimer) {
        clearTimeout(_renderTimer);
      }
      drake.dragging = false;
      if (_lastDropTarget) {
        drake.emit('out', item, _lastDropTarget, _source);
      }
      drake.emit('dragend', item);
      _source = _item = _copy = _initialSibling = _currentSibling = _renderTimer = _lastDropTarget = null;
    }

    function isInitialPlacement(target, s) {
      var sibling;
      if (s !== void 0) {
        sibling = s;
      } else if (_mirror) {
        sibling = _currentSibling;
      } else {
        sibling = nextEl(_copy || _item);
      }
      return target === _source && sibling === _initialSibling;
    }

    function findDropTarget(elementBehindCursor, clientX, clientY) {
      var target = elementBehindCursor;
      while (target && !accepted()) {
        target = getParent(target);
      }
      return target;

      function accepted() {
        var droppable = isContainer(target);
        if (droppable === false) {
          return false;
        }

        var immediate = getImmediateChild(target, elementBehindCursor);
        var reference = getReference(target, immediate, clientX, clientY);
        var initial = isInitialPlacement(target, reference);
        if (initial) {
          return true; // should always be able to drop it right back where it was
        }
        return o.accepts(_item, target, _source, reference);
      }
    }

    function drag(e) {
      if (!_mirror) {
        return;
      }
      e.preventDefault();

      var clientX = getCoord('clientX', e);
      var clientY = getCoord('clientY', e);
      var x = clientX - _offsetX;
      var y = clientY - _offsetY;

      _mirror.style.left = x + 'px';
      _mirror.style.top = y + 'px';

      var item = _copy || _item;
      var elementBehindCursor = getElementBehindPoint(_mirror, clientX, clientY);
      var dropTarget = findDropTarget(elementBehindCursor, clientX, clientY);
      var changed = dropTarget !== null && dropTarget !== _lastDropTarget;
      if (changed || dropTarget === null) {
        out();
        _lastDropTarget = dropTarget;
        over();
      }
      var parent = getParent(item);
      if (dropTarget === _source && _copy && !o.copySortSource) {
        if (parent) {
          parent.removeChild(item);
        }
        return;
      }
      var reference;
      var immediate = getImmediateChild(dropTarget, elementBehindCursor);
      if (immediate !== null) {
        reference = getReference(dropTarget, immediate, clientX, clientY);
      } else if (o.revertOnSpill === true && !_copy) {
        reference = _initialSibling;
        dropTarget = _source;
      } else {
        if (_copy && parent) {
          parent.removeChild(item);
        }
        return;
      }
      if (reference === null && changed || reference !== item && reference !== nextEl(item)) {
        _currentSibling = reference;
        dropTarget.insertBefore(item, reference);
        drake.emit('shadow', item, dropTarget, _source);
      }
      function moved(type) {
        drake.emit(type, item, _lastDropTarget, _source);
      }
      function over() {
        if (changed) {
          moved('over');
        }
      }
      function out() {
        if (_lastDropTarget) {
          moved('out');
        }
      }
    }

    function spillOver(el) {
      classes.rm(el, 'gu-hide');
    }

    function spillOut(el) {
      if (drake.dragging) {
        classes.add(el, 'gu-hide');
      }
    }

    function renderMirrorImage() {
      if (_mirror) {
        return;
      }
      var rect = _item.getBoundingClientRect();
      _mirror = _item.cloneNode(true);
      _mirror.style.width = getRectWidth(rect) + 'px';
      _mirror.style.height = getRectHeight(rect) + 'px';
      classes.rm(_mirror, 'gu-transit');
      classes.add(_mirror, 'gu-mirror');
      o.mirrorContainer.appendChild(_mirror);
      touchy(documentElement, 'add', 'mousemove', drag);
      classes.add(o.mirrorContainer, 'gu-unselectable');
      drake.emit('cloned', _mirror, _item, 'mirror');
    }

    function removeMirrorImage() {
      if (_mirror) {
        classes.rm(o.mirrorContainer, 'gu-unselectable');
        touchy(documentElement, 'remove', 'mousemove', drag);
        getParent(_mirror).removeChild(_mirror);
        _mirror = null;
      }
    }

    function getImmediateChild(dropTarget, target) {
      var immediate = target;
      while (immediate !== dropTarget && getParent(immediate) !== dropTarget) {
        immediate = getParent(immediate);
      }
      if (immediate === documentElement) {
        return null;
      }
      return immediate;
    }

    function getReference(dropTarget, target, x, y) {
      var horizontal = o.direction === 'horizontal';
      var reference = target !== dropTarget ? inside() : outside();
      return reference;

      function outside() {
        // slower, but able to figure out any position
        var len = dropTarget.children.length;
        var i;
        var el;
        var rect;
        for (i = 0; i < len; i++) {
          el = dropTarget.children[i];
          rect = el.getBoundingClientRect();
          if (horizontal && rect.left + rect.width / 2 > x) {
            return el;
          }
          if (!horizontal && rect.top + rect.height / 2 > y) {
            return el;
          }
        }
        return null;
      }

      function inside() {
        // faster, but only available if dropped inside a child element
        var rect = target.getBoundingClientRect();
        if (horizontal) {
          return resolve(x > rect.left + getRectWidth(rect) / 2);
        }
        return resolve(y > rect.top + getRectHeight(rect) / 2);
      }

      function resolve(after) {
        return after ? nextEl(target) : target;
      }
    }

    function isCopy(item, container) {
      return typeof o.copy === 'boolean' ? o.copy : o.copy(item, container);
    }
  }

  function touchy(el, op, type, fn) {
    var touch = {
      mouseup: 'touchend',
      mousedown: 'touchstart',
      mousemove: 'touchmove'
    };
    var pointers = {
      mouseup: 'pointerup',
      mousedown: 'pointerdown',
      mousemove: 'pointermove'
    };
    var microsoft = {
      mouseup: 'MSPointerUp',
      mousedown: 'MSPointerDown',
      mousemove: 'MSPointerMove'
    };
    if (commonjsGlobal.navigator.pointerEnabled) {
      crossvent[op](el, pointers[type], fn);
    } else if (commonjsGlobal.navigator.msPointerEnabled) {
      crossvent[op](el, microsoft[type], fn);
    } else {
      crossvent[op](el, touch[type], fn);
      crossvent[op](el, type, fn);
    }
  }

  function whichMouseButton(e) {
    if (e.touches !== void 0) {
      return e.touches.length;
    }
    if (e.which !== void 0 && e.which !== 0) {
      return e.which;
    } // see https://github.com/bevacqua/dragula/issues/261
    if (e.buttons !== void 0) {
      return e.buttons;
    }
    var button = e.button;
    if (button !== void 0) {
      // see https://github.com/jquery/jquery/blob/99e8ff1baa7ae341e94bb89c3e84570c7c3ad9ea/src/event.js#L573-L575
      return button & 1 ? 1 : button & 2 ? 3 : button & 4 ? 2 : 0;
    }
  }

  function getOffset(el) {
    var rect = el.getBoundingClientRect();
    return {
      left: rect.left + getScroll('scrollLeft', 'pageXOffset'),
      top: rect.top + getScroll('scrollTop', 'pageYOffset')
    };
  }

  function getScroll(scrollProp, offsetProp) {
    if (typeof commonjsGlobal[offsetProp] !== 'undefined') {
      return commonjsGlobal[offsetProp];
    }
    if (documentElement.clientHeight) {
      return documentElement[scrollProp];
    }
    return doc.body[scrollProp];
  }

  function getElementBehindPoint(point, x, y) {
    var p = point || {};
    var state = p.className;
    var el;
    p.className += ' gu-hide';
    el = doc.elementFromPoint(x, y);
    p.className = state;
    return el;
  }

  function never() {
    return false;
  }
  function always() {
    return true;
  }
  function getRectWidth(rect) {
    return rect.width || rect.right - rect.left;
  }
  function getRectHeight(rect) {
    return rect.height || rect.bottom - rect.top;
  }
  function getParent(el) {
    return el.parentNode === doc ? null : el.parentNode;
  }
  function isInput(el) {
    return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || isEditable(el);
  }
  function isEditable(el) {
    if (!el) {
      return false;
    } // no parents were editable
    if (el.contentEditable === 'false') {
      return false;
    } // stop the lookup
    if (el.contentEditable === 'true') {
      return true;
    } // found a contentEditable element in the chain
    return isEditable(getParent(el)); // contentEditable is set to 'inherit'
  }

  function nextEl(el) {
    return el.nextElementSibling || manually();
    function manually() {
      var sibling = el;
      do {
        sibling = sibling.nextSibling;
      } while (sibling && sibling.nodeType !== 1);
      return sibling;
    }
  }

  function getEventHost(e) {
    // on touchend event, we have to use `e.changedTouches`
    // see http://stackoverflow.com/questions/7192563/touchend-event-properties
    // see https://github.com/bevacqua/dragula/issues/34
    if (e.targetTouches && e.targetTouches.length) {
      return e.targetTouches[0];
    }
    if (e.changedTouches && e.changedTouches.length) {
      return e.changedTouches[0];
    }
    return e;
  }

  function getCoord(coord, e) {
    var host = getEventHost(e);
    var missMap = {
      pageX: 'clientX', // IE8
      pageY: 'clientY' // IE8
    };
    if (coord in missMap && !(coord in host) && missMap[coord] in host) {
      coord = missMap[coord];
    }
    return host[coord];
  }

  module.exports = dragula;
});

var dragula$1 = interopDefault(dragula);

if (!dragula$1) {
  throw new Error('[vue-dragula] cannot locate dragula.');
}

var raf = window.requestAnimationFrame;
var waitForTransition = raf ? function (fn) {
  raf(function () {
    raf(fn);
  });
} : function (fn) {
  window.setTimeout(fn, 50);
};

var DragulaService = function () {
  function DragulaService(Vue) {
    babelHelpers.classCallCheck(this, DragulaService);

    this.bags = []; // bag store
    this.eventBus = new Vue();
    this.events = ['cancel', 'cloned', 'drag', 'dragend', 'drop', 'out', 'over', 'remove', 'shadow', 'dropModel', 'removeModel'];
  }

  babelHelpers.createClass(DragulaService, [{
    key: 'add',
    value: function add(name, drake) {
      var bag = this.find(name);
      if (bag) {
        throw new Error('Bag named: "' + name + '" already exists.');
      }
      bag = {
        name: name,
        drake: drake
      };
      this.bags.push(bag);
      if (drake.models) {
        this.handleModels(name, drake);
      }
      if (!bag.initEvents) {
        this.setupEvents(bag);
      }
      return bag;
    }
  }, {
    key: 'find',
    value: function find(name) {
      var bags = this.bags;
      for (var i = 0; i < bags.length; i++) {
        if (bags[i].name === name) {
          return bags[i];
        }
      }
    }
  }, {
    key: 'handleModels',
    value: function handleModels(name, drake) {
      var _this2 = this;

      if (drake.registered) {
        // do not register events twice
        return;
      }
      var dragElm = void 0;
      var dragIndex = void 0;
      var dropIndex = void 0;
      var sourceModel = void 0;
      drake.on('remove', function (el, container, source) {
        if (!drake.models) {
          return;
        }
        sourceModel = _this2.findModelForContainer(source, drake);
        sourceModel.splice(dragIndex, 1);
        drake.cancel(true);
        _this2.eventBus.$emit('removeModel', [name, el, source, dragIndex]);
      });
      drake.on('drag', function (el, source) {
        dragElm = el;
        dragIndex = _this2.domIndexOf(el, source);
      });
      drake.on('drop', function (dropElm, target, source) {
        if (!drake.models || !target) {
          return;
        }
        dropIndex = _this2.domIndexOf(dropElm, target);
        sourceModel = _this2.findModelForContainer(source, drake);

        if (target === source) {
          sourceModel.splice(dropIndex, 0, sourceModel.splice(dragIndex, 1)[0]);
        } else {
          var notCopy = dragElm === dropElm;
          var targetModel = _this2.findModelForContainer(target, drake);
          var dropElmModel = notCopy ? sourceModel[dragIndex] : JSON.parse(JSON.stringify(sourceModel[dragIndex]));

          if (notCopy) {
            waitForTransition(function () {
              sourceModel.splice(dragIndex, 1);
            });
          }
          targetModel.splice(dropIndex, 0, dropElmModel);
          drake.cancel(true);
        }
        _this2.eventBus.$emit('dropModel', [name, dropElm, target, source, dropIndex]);
      });
      drake.registered = true;
    }
  }, {
    key: 'destroy',
    value: function destroy(name) {
      var bag = this.find(name);
      if (!bag) {
        return;
      }
      var bagIndex = this.bags.indexOf(bag);
      this.bags.splice(bagIndex, 1);
      bag.drake.destroy();
    }
  }, {
    key: 'setOptions',
    value: function setOptions(name, options) {
      var bag = this.add(name, dragula$1(options));
      this.handleModels(name, bag.drake);
    }
  }, {
    key: 'setupEvents',
    value: function setupEvents(bag) {
      bag.initEvents = true;
      var _this = this;
      var emitter = function emitter(type) {
        function replicate() {
          var args = Array.prototype.slice.call(arguments);
          _this.eventBus.$emit(type, [bag.name].concat(args));
        }
        bag.drake.on(type, replicate);
      };
      this.events.forEach(emitter);
    }
  }, {
    key: 'domIndexOf',
    value: function domIndexOf(child, parent) {
      return Array.prototype.indexOf.call(parent.children, child);
    }
  }, {
    key: 'findModelForContainer',
    value: function findModelForContainer(container, drake) {
      return (this.findModelContainerByContainer(container, drake) || {}).model;
    }
  }, {
    key: 'findModelContainerByContainer',
    value: function findModelContainerByContainer(container, drake) {
      if (!drake.models) {
        return;
      }
      return drake.models.find(function (model) {
        return model.container === container;
      });
    }
  }]);
  return DragulaService;
}();

if (!dragula$1) {
  throw new Error('[vue-dragula] cannot locate dragula.');
}

function VueDragula (Vue) {
  var service = new DragulaService(Vue);

  var name = 'globalBag';
  var drake = void 0;

  Vue.vueDragula = {
    options: service.setOptions.bind(service),
    find: service.find.bind(service),
    eventBus: service.eventBus
  };

  Vue.directive('dragula', {
    params: ['bag'],

    bind: function bind(container, binding, vnode) {
      var bagName = vnode ? vnode.data.attrs.bag // Vue 2
      : this.params.bag; // Vue 1
      if (!vnode) {
        container = this.el; // Vue 1
      }
      if (bagName !== undefined && bagName.length !== 0) {
        name = bagName;
      }
      var bag = service.find(name);
      if (bag) {
        drake = bag.drake;
        drake.containers.push(container);
        return;
      }
      drake = dragula$1({
        containers: [container]
      });
      service.add(name, drake);

      service.handleModels(name, drake);
    },
    update: function update(container, binding, vnode, oldVnode) {
      var newValue = vnode ? binding.value // Vue 2
      : container; // Vue 1
      if (!newValue) {
        return;
      }

      var bagName = vnode ? vnode.data.attrs.bag // Vue 2
      : this.params.bag; // Vue 1
      if (bagName !== undefined && bagName.length !== 0) {
        name = bagName;
      }
      var bag = service.find(name);
      drake = bag.drake;
      if (!drake.models) {
        drake.models = [];
      }

      if (!vnode) {
        container = this.el; // Vue 1
      }
      var modelContainer = service.findModelContainerByContainer(container, drake);

      if (modelContainer) {
        modelContainer.model = newValue;
      } else {
        drake.models.push({
          model: newValue,
          container: container
        });
      }
    },
    unbind: function unbind(container, binding, vnode) {
      var unbindBagName = 'globalBag';
      var bagName = vnode ? vnode.data.attrs.bag // Vue 2
      : this.params.bag; // Vue 1
      if (!vnode) {
        container = this.el; // Vue 1
      }
      if (bagName !== undefined && bagName.length !== 0) {
        unbindBagName = bagName;
      }
      var drake = service.find(unbindBagName).drake;
      if (!drake) {
        return;
      }
      var containerIndex = drake.containers.indexOf(container);
      if (containerIndex > -1) {
        drake.containers.splice(containerIndex, 1);
      }
      if (drake.containers.length === 0) {
        service.destroy(unbindBagName);
      }
    }
  });
}

function plugin(Vue) {
  var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

  if (plugin.installed) {
    console.warn('[vue-dragula] already installed.');
  }

  VueDragula(Vue);
}

plugin.version = '1.0.0';

if (typeof define === 'function' && define.amd) {
  // eslint-disable-line
  define([], function () {
    plugin;
  }); // eslint-disable-line
} else if (window.Vue) {
    window.Vue.use(plugin);
  }

return plugin;

})));