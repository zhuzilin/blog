---
title: Node.js events source code reading
date: 2019-01-16 16:34:36
tags: node
---

It is well-known that Node.js is an event based JavaScript  runtime environment. And today let's dig deeper into the source code and have a look at how this event mechanism is implemented.

```javascript
const EventEmitter = require('events');

class MyEmitter extends EventEmitter {}

const myEmitter = new MyEmitter();
myEmitter.on('event', () => {
  console.log('an event occurred!');
});
myEmitter.emit('event');
```

Here is demo of the core function of the events. Therefore it is reasonable that we just focus on functions shown in this demo.

The event relevant code lies in the "./lib/events.js" file. Apparently, the code exports EventEmitter function as its default export.

```javascript
function EventEmitter() {
  EventEmitter.init.call(this);
}
module.exports = EventEmitter;
```

And the initialization is also simple. It only give initial value to some properties.

```javascript
EventEmitter.init = function() {
  if (this._events === undefined ||
      this._events === Object.getPrototypeOf(this)._events) {
    this._events = Object.create(null);
    this._eventsCount = 0;
  }

  this._maxListeners = this._maxListeners || undefined;
};
```

Now comes the untrivial parts.

The on function is a wrapper of the addListener, which is a wrapper of _addListener:

```
EventEmitter.prototype.addListener = function addListener(type, listener) {
  return _addListener(this, type, listener, false);
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;
```

So our main focus would be the _addListener function:

```javascript
function _addListener(target, type, listener, prepend) {
  var m;
  var events;
  var existing;

  checkListener(listener);

  events = target._events;
  if (events === undefined) {
    events = target._events = Object.create(null);
    target._eventsCount = 0;
  } else {
    // To avoid recursion in the case that type === "newListener"! Before
    // adding it to the listeners, first emit "newListener".
    if (events.newListener !== undefined) {
      target.emit('newListener', type,
                  listener.listener ? listener.listener : listener);

      // Re-assign `events` because a newListener handler could have caused the
      // this._events to be assigned to a new object
      events = target._events;
    }
    existing = events[type];
  }

  if (existing === undefined) {
    // Optimize the case of one listener. Don't need the extra array object.
    events[type] = listener;
    ++target._eventsCount;
  } else {
    if (typeof existing === 'function') {
      // Adding the second element, need to change to array.
      existing = events[type] =
        prepend ? [listener, existing] : [existing, listener];
      // If we've already got an array, just append.
    } else if (prepend) {
      existing.unshift(listener);
    } else {
      existing.push(listener);
    }

    // Check for listener leak
    m = $getMaxListeners(target);
    if (m > 0 && existing.length > m && !existing.warned) {
      existing.warned = true;
      // No error code for this since it is a Warning
      // eslint-disable-next-line no-restricted-syntax
      const w = new Error('Possible EventEmitter memory leak detected. ' +
                          `${existing.length} ${String(type)} listeners ` +
                          'added. Use emitter.setMaxListeners() to ' +
                          'increase limit');
      w.name = 'MaxListenersExceededWarning';
      w.emitter = target;
      w.type = type;
      w.count = existing.length;
      process.emitWarning(w);
    }
  }

  return target;
}
```

The comment in the code is really clear. And for emit: 

```javascript
EventEmitter.prototype.emit = function emit(type, ...args) {
  let doError = (type === 'error');  // if we are emitting an error

  const events = this._events;
  if (events !== undefined)
    doError = (doError && events.error === undefined);
  else if (!doError)  // event is undefined but emit event other than error.
    return false;

  // If there is no 'error' event listener then throw.
  if (doError) {
    let er;
    if (args.length > 0)
      er = args[0];
    if (er instanceof Error) {
      try {
        const { kExpandStackSymbol } = require('internal/util');
        const capture = {};
        Error.captureStackTrace(capture, EventEmitter.prototype.emit);
        Object.defineProperty(er, kExpandStackSymbol, {
          value: enhanceStackTrace.bind(null, er, capture),
          configurable: true
        });
      } catch {}

      // Note: The comments on the `throw` lines are intentional, they show
      // up in Node's output if this results in an unhandled exception.
      throw er; // Unhandled 'error' event
    }
    // At least give some kind of context to the user
    const errors = lazyErrors();
    const err = new errors.ERR_UNHANDLED_ERROR(er);
    err.context = er;
    throw err; // Unhandled 'error' event
  }

  const handler = events[type];

  if (handler === undefined)
    return false;

  if (typeof handler === 'function') {
    Reflect.apply(handler, this, args);
  } else {
    const len = handler.length;
    const listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      Reflect.apply(listeners[i], this, args);
  }

  return true;
};
```

So basically, the events module is just save the event handlers in the EventEmitter and call it when emitting.