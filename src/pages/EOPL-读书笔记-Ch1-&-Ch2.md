---
title: EOPL 读书笔记 Ch1 & Ch2
date: 2021-05-05 22:41:00
tags: ["PL"]
---

最近开始研究 TVM 的 Relay，发现该补的还是要补.... 因为之前偷懒跳过了 EOPL 的 ch6，所以不理解 CPS，也就理解不了 Relay 的 interpreter 在干啥。所以这两天打算重读一下 eopl，顺便记一下笔记。这次的目标暂定为读到第六章吧，最好也能把之前没做的习题也补上~

## Racket 使用教程

在 repl 里运行 Racket 的方法：

```bash
> (exit)
```

在 repl 里加载racket 的方法：

```bash
> (load "hello.rkt")
```

## Ch1 Inductive Sets of Data

### 1.1 Recursively Specified Data

#### 1.1.1 Inductive Specification

这一节介绍了中间画横线表示 hypothesis 至 conclusion 的因果关系，被称为 rule of inference。这种表示方式貌似也是 PL 中比较常见的方法。

#### 1.1.2 Defining Sets Using Grammars

这里就开始用语法表示集合了，是不是和 Lean prover 在做的东西有点像？

List 的语法：

```
List-of-Int ::= ()
List-of-Int ::= (Int . List-of-Int)
```

- nonterminal symbols: 被定义的名字。例如上面的 List-of-Int。本书会用大写开头表示 nonerminals，并用小写开头的名字表示其成员，例如 `e in Expression`。在 BNF 中，一般用尖括号包住，表示为 `<expression>`。
- terminal symbols: 那些外部的符号，或者关键词，例如 `.`， `(`，`)`，`lambda`。
- Productions: 规则被称为 productions。每条规则的左边为 nonterminal，右边为 terminal 和 nonterminal 混合。

常见的语法写法：

```bash
List-of-Int ::= ()
            ::= (Int . List-of-Int)

List-of-Int ::= () | (Int . List-of-Int)

# `*` 名叫 Kleene star，表示任意个
List-if-Int ::= ({Int}*)
```

**lambda calculus** 的语法为：

```
LcExp ::= Identifier
      ::= (lambda (Identifier) LcExp)
      ::= (LcExp LcExp)
```

这个语言的函数都只有一个参数。这里第二行的 `Identifier` 被称为 bound variable。

在定义二叉搜索树的时候，如果仅用下面的方法进行定义：

```
Binary-search-tree ::= () | (Int Binary-search-tree Binary-search-tree)
```

是没有办法保证树内部的序的（左树小于右树），这种限制被称为 context-sensitive constraints 或者 invariant。

在编程语言中也有很多 context-sensitive constraints，例如 variable 必须先定义再使用。可以用形式化的手段来保证这种 constraint，不过这已经超过本章的范畴了。而在实践中，我们往往会使用 context-free grammar。在 ch7 中，我们会介绍一些针对这种 constraint 的方法。

### 1.2 Deriving Recursive Programs

- **The Smaller-Subproblem Principle**: 如果我们可以把问题规约至一个更小的子问题，那么我们可以用解该问题的程序去求解这个子问题。

子问题的解可能可以用来解原问题。

这一节里面都是些如何用递归的方法去写一些 list 相关的函数。可以去看看的是 1.2.4 的 `occur-free`。

写起来的一个感觉就是，因为其实都通过展开变量定义来做递归，所以 ADT 可能的确是写起来更方便。

### 1.3 Auxiliary Procedures and Context Arguments

用辅助函数进行 generalize 来帮助实现。辅助函数帮助的方法就是把 context 作为参数传进来。

## Ch2 Data Abstraction

### 2.1 Specifying Data via Interface

ADT，也就是 abstract data type，是指将 interface 和 implementation 区分开的数据类型。

例如自然数，就可以用以下的几个 interface 代表：`zero`, `is-zero?`, `successor`, `predecessor`。

因为实现和接口分离，所以我们可以有多种表示自然数的方式：

- Unary representation

```lisp
(define zero (lambda () ’()))
(define is-zero? (lambda (n) (null? n)))
(define successor (lambda (n) (cons #t n)))
(define predecessor (lambda (n) (cdr n)))
```

- Scheme number representation

```lisp
(define zero (lambda () 0))
(define is-zero? (lambda (n) (zero? n)))
(define successor (lambda (n) (+ n 1)))
(define predecessor (lambda (n) (- n 1)))
```

- Bignum representation

也就是用一个 list 来表示某一个进制的值，例如如果是 16 进制，那么 `33 = (1 2)`，`258 = (2 0 1)`

如果一个类型的内部表达方式是被隐藏的，就被称为 opaque，反之，被称为 transparent。

### 2.2 Representation Strategies for Data Types

本节中，我们将通过数据类型 `environments` 介绍一些表示 ADT 的方法。

`environment` 用于记录编程语言实现中，变量和其值的对应关系。

只要能相互区分（compare for equality），变量用啥表示都行，这里我们选择用 Scheme symbol 表示。

#### 2.2.1 The Enviroment Interface

我们设计的 interface 有  3 个函数：

- `(empty-env)`：表示空环境
- `(apply-env f var)`：返回 `f(var)`，这里 `f` 是个环境。
- `(extend-env var v f)`：返回的新环境里，`var` 的值改为 `v`。

我们可以把这 3 个函数分为 constructor 和 observer，`empty-env` 和 `extent-env` 是 constructor， `apply-env` 是 observer。

#### 2.2.2 Data Structure Representation

从上面的接口，我们有：

```
Env-exp ::= (empty-env)
        ::= (extend-env Identifier Scheme-value Env-exp)
```

- **The Interpreter Recipe**

    1. Look at a piece of data.

    2. Decide what kind of data it represents.

    3. Extract the components of the datum and do the right thing with them.

这一节提出了一种完全拿 list 的方式表示，就是包括 `extend-env` 和 `empty-env` 都做成 symbol 放在 list 里面。

#### 2.2.3 Procedural Representation

由于 environment 只有一个 observer。所以可以用函数来表示 environment。其中 `empty-env` 就表示的是一个传入任何参数都会报错的；`extend-env` 则是用闭包的方式保存添加的值；`apply-env` 则就是以变量名为参数，调用 env。

这种表示方法被称为 `procedural representation`，其中的数据是 action under `apply-env`。

这种只有一个 observer 的数据类型还挺常见的，我们总结了如下的提取 interface 并使用 procedural representation 的方法：

1. 找出会返回该类型的值的 lambda 表达式，并给每个这种 lambda 表达式对应上一个 constructor。constructor 的参数应该是该 lambda 表达式的 free variable。把源代码中对这个 lambda 表达式的调用都换成这个构造函数。
2. 定一个一个类似 `apply-env` 的 `apply-` 函数。把所有会使用该类型值的地方都换成调用这个 `apply-` 函数。

这样修改后，client code 就变为 representation independent。

如果实现所用的语言用不了 higher-order procedure （把函数作为函数的参数），那么可以把得到的 interface 再用 data structure representation 和 interpreter recipe 实现一下。这被称为 defunctionalization。

### 2.3 Interfaces for Recursive Data Types

在 ch1，我们定义了 lambda calculus expression：

```
LcExp ::= Identifier
      ::= (lambda (Identifier) LcExp)
      ::= (LcExp LcExp)
```

并写了 `occurs-free?` 这样的函数。但是当时的写法不太好懂，因为当时的写法是和 representation 强绑定的。我们可以通过引入 interface 的方式来解决这个问题。我们提出了如下的接口：

```bash
# constructors:
var-exp : Var → Lc-exp
lambda-exp : Var×Lc-exp → Lc-exp
app-exp : Lc-exp×Lc-exp → Lc-exp
# predicates:
var-exp? : Lc-exp → Bool
lambda-exp? : Lc-exp → Bool
app-exp? : Lc-exp → Bool
# extractors:
var-exp->var : Lc-exp → Var
lambda-exp->bound-var : Lc-exp → Var
lambda-exp->body : Lc-exp → Lc-exp
app-exp->rator : Lc-exp → Lc-exp
app-exp->rand : Lc-exp → Lc-exp
```

有了这些之后，`occurs-free?` 变成了：

```lisp
; occurs-free? : Sym × LcExp → Bool
(define occurs-free?
  (lambda (search-var exp)
    (cond
      ((var-exp? exp) (eqv? search-var (var-exp->var exp)))
      ((lambda-exp? exp)
        (and
          (not (eqv? search-var (lambda-exp->bound-var exp)))
          (occurs-free? search-var (lambda-exp->body exp))))
      (else
        (or
          (occurs-free? search-var (app-exp->rator exp))
          (occurs-free? search-var (app-exp->rand exp))))
    )
  )
)
```

我们可以写出一个制作 recursive data type 的 recipe：

- **Designing an interface for a recursive data type**

1. Include one constructor for each kind of data in the data type.

2. Include one predicate for each kind of data in the data type.

3. Include one extractor for each piece of data passed to a constructor of the data type.

### 2.4 A Tool for Defining Recursive Data Type

这一节介绍该如何自动创建 interface。

```lisp
(define-datatype lc-exp lc-exp?
  (var-exp
  	(var identifier?))
  (lambda-exp
  	(bound-var identifier?)
  	(body lc-exp?))
  (app-exp
  	(rator lc-exp?)
  	(rand lc-exp?))
)
```

使用方法如下：

```lisp
(define occurs-free?
  (lambda (search-var exp)
    (cases lc-exp exp
      (var-exp (var) (eqv? var search-var))
      (lambda-exp (bound-var body)
        (and
          (not (eqv? search-var bound-var))
          (occurs-free? search-var body)))
      (app-exp (rator rand)
        (or
          (occurs-free? search-var rator)
          (occurs-free? search-var rand))))))
```

换个例子来说，如果是 `s-list` （symbol list）：

```
S-list ::= ({S-exp}∗)
S-exp ::= Symbol | S-list
```

其定义方法是：

```lisp
(define-datatype s-list s-list?
  (empty-s-list)
  (non-empty-s-list
    (first s-exp?)
    (rest s-list?)))

(define-datatype s-exp s-exp?
  (symbol-s-exp
  	(sym symbol?))
  (s-list-s-exp
    (slst s-list?)))
```

或者也可以是：

```lisp
(define-datatype s-list s-list?
	(an-s-list
		(sexps (list-of s-exp?))))

(define list-of
  (lambda (pred)
    (lambda (val)
      (or (null? val)
          (and (pair? val)
            (pred (car val))
            ((list-of pred) (cdr val)))))))
```

也就是通过一个辅助函数 `list-of`，构造了 `(list-of s-exp?)` 这个新的 predicate，从而创建了任意长的字符串。

`define-datatype` 是 DSL 的一个例子，这里解决的任务是如何定义 recursive data type。

### 2.5 Abstract Synntax and Its Representation

当语法指定了 inductive data type 的 representation 的时候，这种 representation 被称为 concrete syntax，或者 external representation。之前 lambda calculus 的定义就是一种 concrete syntax，因为其引入了 `lambda` 这个字符串。

我们需要把这种 external representation 转化为 internal 的才可以处理数据。`define-datatype` 这种语法利于实现 internal representation，或者称为 abstract syntax。在 abstract syntax 中，不需要存储 terminal，因为他们不包含信息。

为了用 abstract syntax 来表示 concrete syntax，我们需要给 concrete syntax 的每条 production（规则）以及每个 production 中的 nonterminal 的每次 occurence 命名。转化后的结果如下：

```lisp
Lc-exp ::= Identifier
           var-exp (var)
       ::= (lambda (Identifier) Lc-exp)
           lambda-exp (bound-var body)
       ::= (Lc-exp Lc-exp)
           app-exp (rator rand)
```

在本书中，我们会经常用到这种同时展示 concrete 和 abstract syntax 的表达方式。

concrete syntax 主要是为人服务的，而 abstract syntax 则是为计算机服务的。我们要考虑如何在这两者之间相互转换 。这个转化过程称为 parsing。

下面这段代码就是从 concrete syntax 转为 abstract syntax 的 parser

```lisp
; parse-expression : SchemeVal → LcExp
(define parse-expression
  (lambda (datum)
    (cond
      ((symbol? datum) (var-exp datum))
      ((pair? datum)
        (if (eqv? (car datum) ’lambda)
          (lambda-exp
          	(car (cadr datum))
          	(parse-expression (caddr datum)))
          (app-exp
            (parse-expression (car datum))
            (parse-expression (cadr datum)))))
      (else (report-invalid-concrete-syntax datum)))))
```

反向转化，也就是 unparse，如下：

```lisp
; unparse-lc-exp : LcExp → SchemeVal
(define unparse-lc-exp
  (lambda (exp)
    (cases lc-exp exp
    	(var-exp (var) var)
    	(lambda-exp (bound-var body)
        (list ’lambda (list bound-var)
        (unparse-lc-exp body)))
      (app-exp (rator rand)
        (list
        	(unparse-lc-exp rator) (unparse-lc-exp rand))))))
```

