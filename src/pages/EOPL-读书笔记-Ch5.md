---
title: EOPL 读书笔记 Ch5
date: 2021-05-06 21:30:00
tags: ["PL"]
---

继续看 EOPL。

## Ch5 Continuation-Passing Interpreters

在 Ch3 我们利用 environment 这个概念探索了 binding。在本章我们会对 control context 做同样的探索。通过引入 continuation 作为 control context 的先后向，我们会写些以 continutation 为参数的解释器，从而使 control context 变为显式的。

考虑阶乘函数：

```lisp
(define fact
	(lambda (n)
		(if (zero? n) 1 (* n (fact (- n 1))))))
```

随着函数的展开，`fact` 会调用越来越大的 control context：

```lisp
  (fact 4)
= (* 4 (fact 3))
= (* 4 (* 3 (fact 2)))
= (* 4 (* 3 (* 2 (fact 1))))
= (* 4 (* 3 (* 2 (* 1 (fact 0)))))
= (* 4 (* 3 (* 2 (* 1 1))))
= (* 4 (* 3 (* 2 1)))
= (* 4 (* 3 2))
= (* 4 6)
= 24
```

而考虑下面这种写法：

```lisp
(define fact-iter
	(lambda (n)
		(fact-iter-acc n 1)))
(define fact-iter-acc
	(lambda (n a)
		(if (zero? n) a (fact-iter-acc (- n 1) (* n a)))))
```

展开后为：

```lisp
  (fact-iter 4)
= (fact-iter-acc 4 1)
= (fact-iter-acc 3 4)
= (fact-iter-acc 2 12)
= (fact-iter-acc 1 24)
= (fact-iter-acc 0 24)
= 24
```

这里每次的 control context 都一样：在这种情况，实际是没有 control context 的。当 `fact_iter-acc` 调用自己的时候，它是在 tail end 调用的。在这种情况下，调用的函数的结果会直接作为外层函数的返回值返回，而不会做其他什么操作，我们称为 tail call。也是因此，上面的推导中，每步都是 `(fact-iter-acc n a)`。

在执行 `fact` 这样的函数的时候，会在每次递归中记录额外的 control information，这部分信息会一直保留到递归函数返回。这就导致了第一个推导过程中 control context 的增长。这种过程称为 recursive control behavior。

作为对比，调用 `fact-iter-acc` 的时候，不需要记录额外的控制信息。这种情况使用的内容是有固定上限的，被称作 iterative control behavior。

造成两者的区别的核心原因是，`fact` 是在 operand 的位置被调用的，所以我们总结出了这样的一条原则：

- **It is evaluation of operands, not the calling of procedures, that makes the control context grow.**

本章主要介绍如何追踪并操作 control context。我们的核心工具会是 continuation。continuation 是 control context 的抽象，就如同 environment 是 data context 的抽象一样。我们将会通过显示传入 continuation 参数的方式写 interpreter，就想之前显式传入 environment 一样。

在 Ch6 我们会展示如何把转化解释器的一些技巧应用在任意程序上。我们称转化后的程序为 continuation passing style。

### 5.1 A Continuation-Passing Interpreter

我们会以 3.4 中的 LETREC 为基础开始我们的新解释器。我们的目标则是重写解释器，使得任何 `value-of` 都不会生成任何 control context。当 control context 增长时，我们转而扩展 continuation 参数，就像 Ch3 中在需要扩展 data context 的时候就会扩展 environment 一样。

我们知道 environment 表示的是 symbol 到 denoted value 的函数，那么 continuation 代表什么呢？continuation 表示 a procedure that takes the result of the expression and completes the computation（回想一下上面的 `fact`）。所以我们也需要引入一个 `apply-cont` 函数，其参数为 continutation `cont` 和一个值 `val`，并能返回 `cont` 指向的计算结果。

```lisp
; FinalAnswer = ExpVal
apply-cont : Cont × ExpVal → FinalAnswer
```

我们把 `apply-cont` 的返回类型称为 `FinalAnswer`，以提醒我们，它是计算的**最终**结果：程序的其他部分不能再使用它了。

首先，我们要引入 `(end-cont)`，意思是不需要再做什么计算了，它的 specification 为：

```lisp
(apply-cont (end-cont) val)
= (begin
    (eopl:printf "End of computation.~%")
    val)
```

这里的 print 让我们能查看它究竟被调用了几次。

引入了 continuation 后，`value-of-program` 也有了变化：

```lisp
;value-of-program : Program → FinalAnswer
(define value-of-program
  (lambda (pgm)
    (cases program pgm
    	(a-program (exp1)
    		(value-of/k exp1 (init-env) (end-cont))))))
```

下一步就是去完成 `value-of/k`。最初的一些表达式，都是不需要做什么大的修改的，只需要引入 `apply-cont` 就行：

```lisp
; value-of/k : Exp × Env × Cont → FinalAnswer
(define value-of/k
  (lambda (exp env cont)
    (cases expression exp
      (const-exp (num) (apply-cont cont (num-val num)))
      (var-exp (var) (apply-cont cont (apply-env env var)))
      (proc-exp (var body)
        (apply-cont cont
        	(proc-val (procedure var body env))))
      ...
    )))
```

`letrec` 也比较简单，因为它主要就是更新一下 environment，不更新 continuation：

```lisp
      (letrec-exp (p-name b-var p-body letrec-body)
        (value-of/k letrec-body
          (extend-env-rec p-name b-var p-body env)
          cont))
```

注意这里不更新 continuation 的原因是里面的 `value-of/k` 变成了尾递归。

- **Tail Calls Don’t Grow the Continuation**
    - 如果 `exp1` 被返回成了 `exp2`，那么 `exp1` 和 `exp2` 应该在相同的 continuation 中。

下一步考虑 `zero?`。因为 `zero?` 需要先计算里面的值，然后在判断它是不是 0，所以实际上是会延展 continuation 的：

```lisp
      (zero?-exp (exp1)
        (value-of/k exp1 env
        	(zero1-cont cont)))
```

并且我们希望：

```lisp
(apply-cont (zero1-cont cont) val)
= (apply-cont cont
    (bool-val
    	(zero? (expval->num val))))
```

`let` 类似 `zero?`，原先的 `let` 的代码为：

```lisp
      (let-exp (var exp1 body)
        (let ((val1 (value-of exp1 env)))
        	(value-of body
        		(extend-env var val1 env))))
```

我们需要更新一下 `cont`，变为：

```lisp
      (let-exp (var exp1 body)
      	(value-of/k exp1 env
      		(let-exp-cont var body env cont)))
```

并且保证：

```lisp
(apply-cont (let-exp-cont var body env cont) val)
= (value-of/k body (extend-env var val env) cont)
```

以此类推，我们可以做出 if expression：

```lisp
      (if-exp (exp1 exp2 exp3)
      	(value-of/k exp1 env
      		(if-test-cont exp2 exp3 env cont)))
```

且有：

```lisp
(apply-cont (if-test-cont exp2 exp3 env cont) val)
= (if (expval->bool val)
    (value-of/k exp2 env cont)
    (value-of/k exp3 env cont))
```

至此，我们已经有了 4 个 continuation builder （`end-cont`、 `zero1-cont`、`let-exp-cont`、`if-test-cont`）。

由于 continuation 只有 1 个 observer，所以我们是可以用 procedure representation 的（见图 5.2）。当然也可以用 data representation，也就是用 `define-datatype`，然后在 `apply-cont` 里面用 `case` 一个一个单独写（见图 5.3）。

Difference 要更麻烦一点，因为它会计算两个值。

```lisp
      (diff-exp (exp1 exp2)
        (value-of/k exp1 env
        	(diff1-cont exp2 env cont)))
```

所以要把 `exp2` 放进 continuation：

```lisp
; diff1-cont
(apply-cont (diff1-cont exp2 env cont) val1)
= (value-of/k exp2 env
		(diff2-cont val1 cont))

; diff2-cont
(apply-cont (diff2-cont val1 cont) val2)
= (let ((num1 (expval->num val1))
    		(num2 (expval->num val2)))
		(apply-cont cont
    	(num-val (- num1 num2))))
```

最后一个就是 `call` 了，原来是：

```lisp
      (call-exp (rator rand)
        (let ((proc1 (expval->proc (value-of rator env)))
              (val (value-of rand env)))
          (apply-procedure proc1 val)))
```

这时我们需要做 3 件事，计算 `rator` 的值，计算 `rand` 的值以及 `apply-procedure`。

和 difference 一样，我们会运行第一件，然后把剩下放进 continuation：

```lisp
      (call-exp (rator rand)
      	(value-of/k rator env
      		(rator-cont rand env cont)))
```

然后有：

```lisp
; rator-cont
(apply-cont (rator-cont rand env cont) val1)
= (value-of/k rand env
		(rand-cont val1 cont))

; rand-cont
(apply-cont (rand-cont val1 cont) val2)
= (let ((proc1 (expval->proc val1)))
    (apply-procedure/k proc1 val2 cont))
```

注意 `apply-procedure/k` 那里传的是原本的 `cont`，因为到这里之前没跑的两步都运行完了，而 `apply-procedure/k` 是尾递归。

还需要根据 continuation-passing 的风格修改一下 `apply-procedure/k`：

```lisp
; apply-procedure/k : Proc × ExpVal × Cont → FinalAnswer
(define apply-procedure/k
  (lambda (proc1 val cont)
    (cases proc proc1
      (procedure (var body saved-env)
        (value-of/k body
          (extend-env var val saved-env)
          cont)))))
```

因为是尾递归，所以不用引入新的 continuation。

### 5.2 A Trampolined Interpreter

虽然上面给了我们一个转化 ordinary procedural language 的方法，但实际上，对于多数语言，在每次调用函数的时候，不管是否需要，都会扩展 control context（也就是扩展堆栈），这使得系统的堆栈在运行过程中持续增长。

解决这个问题的一个方法叫做 trampolining。为了避免进行无尽的链式调用，我们将整个调用链拆分。拆分的方式是将解释中的一个函数改为返回一个 0 参数的函数。当这个参数被调用的时候，就会继续整体计算。例如，我们可以把 `apply-procedure/k` 改为：

```lisp
; Bounce = ExpVal ∪ (() → Bounce)
; apply-procedure/k : Proc × ExpVal × Cont → Bounce
(define apply-procedure/k
	(lambda (proc1 val cont)
		(lambda ()
			(cases procedure proc1
				(... (value-of/k ...))))))
```

因为 `apply-procedure/k` 的返回值从 `ExpVal` 转变为了 `Bounce`，所以我们还需要更新一下 `value-of-k` 和 `apply-cont` 的签名（改为返回 `Bounce`）：

```lisp
; value-of/k : Exp × Env × Cont → Bounce
(define value-of/k
  (lambda (exp env cont)
    (cases expression exp
      (... (value-of/k ...))
      (... (apply-cont ...)))))
; apply-cont : Cont × ExpVal → Bounce
(define apply-cont
  (lambda (cont val)
    (cases continuation cont
      (... val)
      (... (value-of/k ...))
      (... (apply-cont ...))
      (... (apply-procedure/k ...)))))
```

我们的程序最终肯定是需要把 `Bounce` 转化为 `ExpVal` 的，所以我们要引入 `trampoline` 函数，并更新 `value-of-program`：

```lisp
; value-of-program : Program → FinalAnswer
(define value-of-program
  (lambda (pgm)
    (cases program pgm
      (a-program (exp)
      (trampoline
      	(value-of/k exp (init-env) (end-cont)))))))

; trampoline : Bounce → FinalAnswer
(define trampoline
  (lambda (bounce)
    (if (expval? bounce)
      bounce
      (trampoline (bounce)))))
```

每个 `apply-procedure/k` 返回的 `lambda ()` 实际上记录了当前计算的一个 snapshot （相当于是把计算推迟到最后的 `trampoline` 函数里面去了）。这样做的结果就是让调用栈最多就走到 `apply-procedure/k`，等整体的栈退回来之后，再继续计算，从而限制了无尽的回调和堆栈的增长。

### 5.3 An Imperative Interpreter



- **A 0-argument tail call is the same as a jump**

### 5.4 Exceptions

为了引入 exception handling，我们加入如下两条语法：

```lisp
Expression ::= try Expression catch (Identifier) Expression
							 try-exp (exp1 var handler-exp)
Expression ::= raise Expression
							 raise-exp (exp)
```

用 conitinuation passing interpreter 实现 exception handling 是很简单的。让我们从 `try` 开始。首先肯定是要引入 `try` 相关的 continuation：

```lisp
      (try-cont
        (var identifier?)
        (handler-exp expression?)
        (env environment?)
      	(cont continuation?))
      (raise1-cont
      	(saved-cont continuation?))
```

之后这样实现 `try`：

```lisp
      (try-exp (exp1 var handler-exp)
        (value-of/k exp1 env
        	(try-cont var handler-exp env cont)))
```



```lisp
(apply-cont (try-cont var handler-exp env cont) val)
= (apply-cont cont val)
```

然后是 `raise`：

```lisp
      (raise-exp (exp1)
        (value-of/k exp1 env
        	(raise1-cont cont)))
```



```lisp
(apply-cont (raise1-cont cont) val)
= (apply-handler val cont)
```

`raise` 的目的是找到最近的 handler，并处理 error。

```lisp
; apply-handler : ExpVal × Cont → FinalAnswer
(define apply-handler
  (lambda (val cont)
    (cases continuation cont
      (try-cont (var handler-exp saved-env saved-cont)
        (value-of/k handler-exp
          (extend-env var val saved-env)
          saved-cont))
      (end-cont ()
      	(report-uncaught-exception))
      (diff1-cont (exp2 saved-env saved-cont)
      	(apply-handler val saved-cont))
      (diff2-cont (val1 saved-cont)
      	(apply-handler val saved-cont))
      ...)))
```

注意这里只有 `try` 的部分是有 handler 的，以及需要更新 environment，因为增加了一个绑定。

### 5.5 Threads

thread 相当于是有多个 computation in progress，相互之间通过 shared memory（这里不是指 OS 里的 shared memory，而只是说他们都可以往相同的内存里复制）进行共享，类似 Ch4。

这节内容挺多的，等需要的时候再详细看吧。