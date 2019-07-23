---
title: Javascript Basics -- prototype
date: 2019-07-23 13:59:53
tags: ["js"]
---

最近开始做面试的复习，打算顺便把一些看过好多遍的js知识总结提炼一下。这次的内容是`prototype`。本文的内容来自于[You Don't Know JS: *this* & Object Prototypes]([https://github.com/getify/You-Dont-Know-JS/tree/master/this%20%26%20object%20prototypes](https://github.com/getify/You-Dont-Know-JS/tree/master/this %26 object prototypes))。非常好的一本书，非常推荐。

## `[[Prototype]]`

首先来看一个例子：

```js
var anotherObject = {
	a: 2
};

// create an object linked to `anotherObject`
var myObject = Object.create( anotherObject );

myObject.a; // 2
```

（后文会介绍`Object.create(..)`，现在暂时把它大会曾创建了一个和传入的对象以`[[Prototype]]`相连的对象就好）。

`myObject`和`anotherObject`以`[[Prototype]]`相连，虽然`a`不是`myObject`的特性，也通过prototype链访问`anotherObject`的`a`访问到了。

如果`anotherObject`里面也没有`a`，那么就会一直想上找，如果始终没有，会返回`undefined`。出了直接访问，用`for .. in`这样的循环，或者是`in`这样的东西都可以进行类似的检查。

```js
var anotherObject = {
	a: 2
};

// create an object linked to `anotherObject`
var myObject = Object.create( anotherObject );

for (var k in myObject) {
	console.log("found: " + k);
}
// found: a
("a" in myObject); // true
myObject.hasOwnProperty('a'); // false
```

### Object.prototype

刚刚有提到，沿着链搜索一直到头，那么哪里是prototype链的尽头呢？

所有普通的prototype链的尽头都是`Object.prototype`. 这个对象包含了很多常见的工具函数，包括`toString(), valueOf()`等等。

### Setting & Shadowing Properties

我们来考虑这个赋值：

```js
myObject.foo = "bar";
```

如果：

- `myObject`有`foo`这个属性的话，那么直接赋值

- `foo`不在`myObject`上
  - 而且不在prototype链上的任何一个对象上，那么就在myObject上直接创建一个`foo`属性。
  - 在`prototype`上找到了需要单独讨论。

如果`foo`既在`myObject`上，也在prototype链的上更高的一处，就会发生*shadow*。任何对`foo`的访问都会在`myObject.foo`截止。而shadow并不是那么简单的，我们来考虑一下3中情景，`myObject.foo = "bar"`会发生什么（`foo`不在`myObject`上）。

- 如果一个普通的accessor property `foo`在链的高处被访问到了，并且其**不是**`writable: false`，那么一个新的属性`foo`会被加到`myObject`上，形成shadow
- 如果一个普通的accessor property `foo`在链的高处被访问到了，并且其**是**`writable: false`，那么既不会给这个`foo`赋值，也不会给`myObject`添加属性，不会发生shadow。
- 如果一个 `foo`在链的高处被访问到了，且它是一个setter(书ch3)，那么会调用这个setter，不会给`myObject`添加属性，也不会重设setter，不会发生shadow。

对于第二个或者第三种情况，如果需要进行shadow，不能用`=`，而需要用`Object.defineProperty(..)`。

Shadowing可能在不知不觉中发生：

```js
var anotherObject = {
	a: 2
};

var myObject = Object.create( anotherObject );

anotherObject.a; // 2
myObject.a; // 2

anotherObject.hasOwnProperty( "a" ); // true
myObject.hasOwnProperty( "a" ); // false

myObject.a++; // oops, implicit shadowing!

anotherObject.a; // 2
myObject.a; // 3

myObject.hasOwnProperty( "a" ); // true
```

## "Class"

上面简单的提及了一下prototype链，那么问题来了，为什么需要这么一个链呢？和`this`的时候一样，要弄懂这个问题就要先弄懂prototype不是什么。

javascript实际上是没有类(class)这么个东西的。然而很多年来，js都在用一种奇怪的方式去尝试实现class。

### “Class” Functions

这种奇怪的方式寄托于函数的一个奇怪的属性：所有函数都会有一个叫`prototype`的属性。

```js
function Foo() {
	// ...
}
// all objects created by new Foo() is [[Prototype]]-linked to Foo.prototype
var a = new Foo();

Object.getPrototypeOf( a ) === Foo.prototype; // true
```

当`a`被创建的时候，`a`会得到一个internal `[[Prototype]]` link到`Foo.prototype`。

对比class-oriented language，一个类可以创建多个实体（instance）。但在js中，没有复制的过程，只有link。

[![img](https://github.com/getify/You-Dont-Know-JS/raw/master/this%20%26%20object%20prototypes/fig3.png)](https://github.com/getify/You-Dont-Know-JS/blob/master/this %26 object prototypes/fig3.png)

### "Constructors"

```js
function Foo() {
	// ...
}

Foo.prototype.constructor === Foo; // true

var a = new Foo();
a.constructor === Foo; // true (shadow)
```

实际上面的两个判断，第一个是`Foo.prototype`的默认特性，第二个是利用了shadowing。为了更好的理解，我们可以看如下的实例：

```js
function Foo() { /* .. */ }

Foo.prototype = { /* .. */ }; // create a new prototype object

var a1 = new Foo();
a1.constructor === Foo; // false!
a1.constructor === Object; // true!
```

因为`Foo.prototype`不再和`Foo`有关系了，所以`a1.constuctor`也自然不是`Foo`了。

当然，还可以加回来，虽然有点麻烦：

```js
function Foo() { /* .. */ }

Foo.prototype = { /* .. */ }; // create a new prototype object

// Need to properly "fix" the missing `.constructor`
// property on the new object serving as `Foo.prototype`.
// See Chapter 3 for `defineProperty(..)`.
Object.defineProperty( Foo.prototype, "constructor" , {
	enumerable: false,
	writable: true,
	configurable: true,
	value: Foo    // point `.constructor` at `Foo`
} );
```

### Mechanics

```js
function Foo(name) {
	this.name = name;
}

Foo.prototype.myName = function() {
	return this.name;
};

var a = new Foo( "a" );
var b = new Foo( "b" );

a.myName(); // "a"
b.myName(); // "b"
```

这里实际上是通过shadow来达到类似于class的效果的。

## "(Prototypal) Inheritance"

用上述的方式也可以进行类似继承的机制，首先来看下面的例子：

```js
function Foo(name) {
	this.name = name;
}

Foo.prototype.myName = function() {
	return this.name;
};

function Bar(name,label) {
	Foo.call( this, name );
	this.label = label;
}

// here, we make a new `Bar.prototype`
// linked to `Foo.prototype`
Bar.prototype = Object.create( Foo.prototype );

// Beware! Now `Bar.prototype.constructor` is gone,
// and might need to be manually "fixed" if you're
// in the habit of relying on such properties!

Bar.prototype.myLabel = function() {
	return this.label;
};

var a = new Bar( "a", "obj a" );

a.myName(); // "a"
a.myLabel(); // "obj a"
```

这里的关键是`Bar.prototype = Object.create( Foo.prototype )`。

注意不能用`Bar.prototype = Foo.prototype`，那样的话，`Foo`和`Bar`创造出来的东西就基本一样了（除了函数里的初始化内容）。

在浏览器中有一种非标准的`.__proto__`可以用来设置link。ES6也添加了一种方法：

```js
// pre-ES6
// throws away default existing `Bar.prototype`
Bar.prototype = Object.create( Foo.prototype );

// ES6+
// modifies existing `Bar.prototype`
Object.setPrototypeOf( Bar.prototype, Foo.prototype );
```

### Inspecting "Class" Relationships

如果要查看一个变量的构造函数，可以用`instanceof`

```js
var a = new Foo();

a instanceof Foo; // true
a instanceof Object; // true
```

如果要看两个对象是不是连着的，可以这样：

```js
// helper utility to see if `o1` is
// related to (delegates to) `o2`
function isRelatedTo(o1, o2) {
	function F(){}
	F.prototype = o2;
	return o1 instanceof F;
}

var a = {};
var b = Object.create( a );

isRelatedTo( b, a ); // true
```

或者更简单的，ES5中有：

```js
// Simply: does `b` appear anywhere in
// `c`s [[Prototype]] chain?
b.isPrototypeOf( c );
```

也可以直接获取`[[Prototype]]`

```js
Object.getPrototypeOf( a ) === Foo.prototype; // true
Object.getPrototypeOf( a ) === Object.prototype; // false
```

大多数浏览器还支持：

```js
a.__proto__ === Foo.prototype; // true
```

这个`__proto__`也是shadow导致的。

## Object Links

除了`new`这种相当间接的方法，还可以用`create`来创建链接。

#### `Object.create()` Polyfilled

到了ES5我们才有`Object.create(..)` 。这里给一个polyfilled

```js
if (!Object.create) {
	Object.create = function(o) {
		function F(){}
		F.prototype = o;
		return new F();
	};
}
```

## ES6 `class`

ES6的`class`只是披着狼皮的🐏，只是语法糖。所以实际上还是`prototype`这一套：

```js
class C {
	constructor() {
		this.num = Math.random();
	}
	rand() {
		console.log( "Random: " + this.num );
	}
}

var c1 = new C();
c1.rand(); // "Random: 0.4324299..."

C.prototype.rand = function() {
	console.log( "Random: " + Math.round( this.num * 1000 ));
};

var c2 = new C();
c2.rand(); // "Random: 867"

c1.rand(); // "Random: 432" -- oops!!!
```

> What a sad commentary on JavaScript: **dynamic is too hard, let's pretend to be (but not actually be!) static**.