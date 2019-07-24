---
title: Javascript Basics -- this
date: 2019-07-23 09:59:53
tags: ["js"]
---

最近开始做面试的复习，打算顺便把一些看过好多遍的js知识总结提炼一下。这次从`this`开始。本文的内容来自于[You Don't Know JS: *this* & Object Prototypes]([https://github.com/getify/You-Dont-Know-JS/tree/master/this%20%26%20object%20prototypes](https://github.com/getify/You-Dont-Know-JS/tree/master/this %26 object prototypes))。非常好的一本书，非常推荐。

`this`可以说是js中非常令人困惑的一个关键词了。首先看一个`this`的用例：

```javascript
function identify() {
	return this.name.toUpperCase();
}

function speak() {
	var greeting = "Hello, I'm " + identify.call( this );
	console.log( greeting );
}

var me = {
	name: "Kyle"
};

var you = {
	name: "Reader"
};

identify.call( me ); // KYLE
identify.call( you ); // READER

speak.call( me ); // Hello, I'm KYLE
speak.call( you ); // Hello, I'm READER
```

相较于传递参数，使用`this`似乎更加优雅。

## Confusion

在说`this`是什么之前，首先来说一下`this`不是什么：

### Itself

`this`并不指向函数自己

```javascript
function foo(num) {
	console.log( "foo: " + num );

	// keep track of how many times `foo` is called
	this.count++;
}

foo.count = 0;

var i;

for (i=0; i<10; i++) {
	if (i > 5) {
		foo( i );
	}
}
// foo: 6
// foo: 7
// foo: 8
// foo: 9

// how many times was `foo` called?
console.log( foo.count ); // 0 -- WTF?
```

如果函数要调用自己，或者给自己加（调整）某些属性，需要用命名函数，然后用函数名来控制。

```js
function foo() {
	foo.count = 4; // `foo` refers to itself
}

setTimeout( function(){
	// anonymous function (no name), cannot
	// refer to itself
}, 10 );
```

注意，有一种已被**废弃**的`arguments.callee`也可以指向函数。

如果非要使用`this`的话，上面的例子可以改为：

```js
function foo(num) {
	console.log( "foo: " + num );

	// keep track of how many times `foo` is called
	// Note: `this` IS actually `foo` now, based on
	// how `foo` is called (see below)
	this.count++;
}

foo.count = 0;

var i;

for (i=0; i<10; i++) {
	if (i > 5) {
		// using `call(..)`, we ensure the `this`
		// points at the function object (`foo`) itself
		foo.call( foo, i );
	}
}
// foo: 6
// foo: 7
// foo: 8
// foo: 9

// how many times was `foo` called?
console.log( foo.count ); // 4
```

### Its Scope

关于`this`，更容易混淆的是它指代于`this`的scope。这个说法有些棘手，因为一方面它有点道理，但是另一方面，它相当容易误导人。

需要注意的是，`this`并不指向函数的lexical scope。虽然scope的确是每个对象的特性，但是javascript代码无法访问它，所以`this`也不可能使用它。

```js
function foo() {
	var a = 2;
	this.bar();
}

function bar() {
	console.log( this.a );
}

foo(); //undefined
```

上面这段代码里面，`foo`阴差阳错得调用了`bar`，但是`bar`没法初级`foo.a`。

## Call-site and call-stack

实际上，`this`指向的是函数被调用时的调用栈（call-site）。所以我们先来理解一下call-site。简单来说，call-site就是指函数被调用的地方。但是具体识别起来，可能有点复杂。来看下面的例子。

```js
function baz() {
    // call-stack is: `baz`
    // so, our call-site is in the global scope

    console.log( "baz" );
    bar(); // <-- call-site for `bar`
}

function bar() {
    // call-stack is: `baz` -> `bar`
    // so, our call-site is in `baz`

    console.log( "bar" );
    foo(); // <-- call-site for `foo`
}

function foo() {
    // call-stack is: `baz` -> `bar` -> `foo`
    // so, our call-site is in `bar`

    console.log( "foo" );
}

baz(); // <-- call-site for `baz`
```

这个例子很清晰的描述了简单的调用栈。

## Nothing But Rules

那么简单介绍完call-site，让我们把注意力转回`this`。`this`实际上有以下4个规则。

- Default Binding
- Implicit Binding
- Explicit Binding
- `new` Binding

### Default Binding

第一个是最常见的，也就是standalone function invocation。也是其他规则不适用的时候需要使用的规则。

```js
function foo() {
	console.log( this.a );
}

var a = 2;

foo(); // 2
```

这里default binding把`foo`中的`this`绑定到了其call-site上，所以调用了global object `a`。不过需要注意的是，在`"use strict"`的时候，global object是不能参与default binding的。

```js
function foo() {
	"use strict";

	console.log( this.a );
}

var a = 2;

foo(); // TypeError: `this` is `undefined`
```

注意，上面只是个例子，在实际应用中不要混合strict和non-strict。

### Implicit Binding

第二条规则是，call-site是否有context object (owning or containing object)。

```js
function foo() {
	console.log( this.a );
}

var obj = {
	a: 2,
	foo: foo
};

obj.foo(); // 2
```

注意，无论`foo`是在定义`obj`的时候就添加了，还是之后赋值的，都**不能认为**这个函数都是被`obj` contained or owned。而是在调用函数的时候，`foo`是通过`obj`调用的，

注意，只有最后一层object reference是重要的。

```js
function foo() {
	console.log( this.a );
}

var obj2 = {
	a: 42,
	foo: foo
};

var obj1 = {
	a: 2,
	obj2: obj2
};

obj1.obj2.foo(); // 42
```

#### Implicit Lost

非常需要注意的是想如下的例子：

```js
function foo() {
	console.log( this.a );
}

var obj = {
	a: 2,
	foo: foo
};

var bar = obj.foo; // function reference/alias!

var a = "oops, global"; // `a` also property on global object

bar(); // "oops, global"
```

在这个例子中，虽然`bar`看起来像是`obj.foo`的引用，但实际上只是`foo`的又一份引用而已。所以调用`bar`会回到default binding。

更恶心的是我们使用回调函数的时候：

```js
function foo() {
	console.log( this.a );
}

function doFoo(fn) {
	// `fn` is just another reference to `foo`

	fn(); // <-- call-site!
}

var obj = {
	a: 2,
	foo: foo
};

var a = "oops, global"; // `a` also property on global object

doFoo( obj.foo ); // "oops, global"
```

注意传递参数实际上就是一次赋值，明白这个就更容易明白上面的例子了。

系统自带的函数也是一样：

```js
function foo() {
	console.log( this.a );
}

var obj = {
	a: 2,
	foo: foo
};

var a = "oops, global"; // `a` also property on global object

setTimeout( obj.foo, 100 ); // "oops, global"
```

### Explicit Binding

在implicit binding中，我们可以通过在对象中加入函数的引用，并通过这个对象来调用函数来bind这个函数。那么，如果我们需要强制某个函数来调用某个的对象呢？

所有的函数的`prototype`都有`call(...)`和`bind(...)`这两个方法。这两个函数都会以一个对象作为其第一个参数，并以这个对象作为`this`。这两种，我们称之为explicit binding。

```js
function foo() {
	console.log( this.a );
}

var obj = {
	a: 2
};

foo.call( obj ); // 2
```

注意，如果传入的对象是基本类型，会被装箱。以及`apply`和`call`是非常相似的，只是后面的参数不同。

#### Hard Binding

```js
function foo() {
	console.log( this.a );
}

var obj = {
	a: 2
};

var bar = function() {
	foo.call( obj );
};

bar(); // 2
setTimeout( bar, 100 ); // 2

// `bar` hard binds `foo`'s `this` to `obj`
// so that it cannot be overriden
bar.call( window ); // 2
```

通过上面这个trick就可以进行hard binding了。

```js
function foo(something) {
	console.log( this.a, something );
	return this.a + something;
}

// simple `bind` helper
function bind(fn, obj) {
	return function() {
		return fn.apply( obj, arguments );
	};
}

var obj = {
	a: 2
};

var bar = bind( foo, obj );

var b = bar( 3 ); // 2 3
console.log( b ); // 5
```

一个可重用的简单的helper。

因为hard binding太常用了，所以ES5中加入了`Function.prototype.bind`

```js
function foo(something) {
	console.log( this.a, something );
	return this.a + something;
}

var obj = {
	a: 2
};

var bar = foo.bind( obj );

var b = bar( 3 ); // 2 3
console.log( b ); // 5
```

### `new` Binding

最后一个规则需要我们去重新思考一下一个经常错误理解的概念。

```js
somthing = new MyClass(...);
```

javascript中的`new`和其他的class-oriented语言很不同。

首先，在js中，constructor就是一个普通的函数，任何一个函数前面用`new`来进行调用就是constructor。当一个函数被`new` invoked的时候，会自动进行这样几个事：

1. 会凭空创建一个对象233
2. 新的对象事`[[Prototype]]`-linked
3. 新创建的对象作为构造函数的`this`
4. 除非函数返回了一个别的对象，`new`-invoked函数会直接返回这个凭空创建的对象。

如：

```js
function foo(a) {
	this.a = a;
}

var bar = new foo( 2 );
console.log( bar.a ); // 2
```

我们称这种bind叫new binding。

## Everything In Order

首先，default binding是优先级最低的。

```js
function foo() {
	console.log( this.a );
}

var obj1 = {
	a: 2,
	foo: foo
};

var obj2 = {
	a: 3,
	foo: foo
};

obj1.foo(); // 2
obj2.foo(); // 3

obj1.foo.call( obj2 ); // 3
obj2.foo.call( obj1 ); // 2
```

上面例子看出explicit binding优先于implicit。

```js
function foo(something) {
	this.a = something;
}

var obj1 = {
	foo: foo
};

var obj2 = {};

obj1.foo( 2 );
console.log( obj1.a ); // 2

obj1.foo.call( obj2, 3 );
console.log( obj2.a ); // 3

var bar = new obj1.foo( 4 );
console.log( obj1.a ); // 2
console.log( bar.a ); // 4
```

这个例子看出`new` binding优先于implicit binding。

因为不能同时使用`new`和`call`/`apply`，所以不能进行`new foo.call(obj1)`，所以我们会用`bind`进行测试：

```js
function foo(something) {
	this.a = something;
}

var obj1 = {};

var bar = foo.bind( obj1 );
bar( 2 );
console.log( obj1.a ); // 2

var baz = new bar( 3 );
console.log( obj1.a ); // 2
console.log( baz.a ); // 3
```

注意，这里`bind`的表现和我们上面自己写的`bind`是**不同**的。只需要记住`new` binding可以覆盖hard binding就好。

所以我们得到的顺序是：

1. 先看函数有没有被`new` 调用，如果有`this`就是这个返回的函数。
2. 这个函数是不是被`call`或`apply`调用，或者藏于一个`bind`中，如果是，那么`this`指这个对象。
3. 这个函数是不是通过一个变量调用的，如果是那`this`就是这个context对象
4. 如果以上都不符合，就要看call-site，如果是global，需要查看是否为`"use strict"`，如果是，那么为`undefined`，不然就是`global`对象。

## Exceptions

有一些例外。

### Ignore `this`

如果向`call`/`apply`/`bind`传入的是`null`或是`undefined`，bind的效果会被忽略。

```js
function foo() {
	console.log( this.a );
}

var a = 2;

foo.call( null ); // 2
```

#### Safe `this`

可以用一个特殊的global变量来处理`this`

```js
function foo(a,b) {
	console.log( "a:" + a + ", b:" + b );
}

// our DMZ empty object
var ø = Object.create( null );

// spreading out array as parameters
foo.apply( ø, [2, 3] ); // a:2, b:3

// currying with `bind(..)`
var bar = foo.bind( ø, 2 );
bar( 3 ); // a:2, b:3
```

### Indirection

```js
function foo() {
	console.log( this.a );
}

var a = 2;
var o = { a: 3, foo: foo };
var p = { a: 4 };

o.foo(); // 3
(p.foo = o.foo)(); // 2
```

某些操作会返回的是函数的引用，所以可能会触及default binding。

### Softening Binding

这里书给提供了一种soft binding，有兴趣的可以自行查阅。

## Lexical `this`

ES6引入的箭头函数会固定绑定其被声明的位置的`this`。如：

```js
function foo() {
	// return an arrow function
	return (a) => {
		// `this` here is lexically adopted from `foo()`
		console.log( this.a );
	};
}

var obj1 = {
	a: 2
};

var obj2 = {
	a: 3
};

var bar = foo.call( obj1 );
bar.call( obj2 ); // 2, not 3!
```

很常用的一个场景是：

```js
function foo() {
	setTimeout(() => {
		// `this` here is lexically adopted from `foo()`
		console.log( this.a );
	},100);
}

var obj = {
	a: 2
};

foo.call( obj ); // 2
```

实际上，上面的例子等同于：

```js
function foo() {
	var self = this; // lexical capture of `this`
	setTimeout( function(){
		console.log( self.a );
	}, 100 );
}

var obj = {
	a: 2
};

foo.call( obj ); // 2
```

