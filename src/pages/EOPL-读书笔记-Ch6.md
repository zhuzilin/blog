---
title: EOPL 读书笔记 Ch6
date: 2021-05-06 23:30:00
tags: ["PL"]
---

继续看 EOPL。

## Ch6 Continuation-Passing Style

在 Ch5，我们通过重写解释器，把所有的函数都改为了 tail call，从而保证在任何时间，解释器的 control context 都是有限的。我们将这种情况称为 iterative control behavior。我们通过传入 continuation 为了参数来实现的这一特性，这种编程方式被称为 continuation-passing style（CPS）。

本章将搭建一套把任意程序转化为迭代性的方法，也是将程序转化为 continuation-passing style。

### 6.1 Writing Programs in Continuation-Passing Style

考虑 Ch5 最初提到的 `fact`：

```lisp
(define fact
  (lambda (n)
  	(if (zero? n) 1 (* n (fact (- n 1))))))
```

一个 CPS 的写法会是：

```lisp
(define fact
  (lambda (n)
  	(fact/k n (end-cont))))

(define fact/k
  (lambda (n cont)
    (if (zero? n)
      (apply-cont cont 1)
      (fact/k (- n 1) (fact1-cont n cont)))))
```

其中：

```lisp
(apply-cont (end-cont) val) = val

(apply-cont (fact1-cont n cont) val)
= (apply-cont cont (* n val))
```

我们可以用如下的方法定义 continuation 和 `apply-cont`：

```lisp
(define-datatype continuation continuation?
  (end-cont)
  (fact1-cont
    (n integer?)
    (cont continuation?)))

(define apply-cont
  (lambda (cont val)
    (cases continuation cont
      (end-cont () val)
      (fact1-cont (saved-n saved-cont)
      	(apply-cont saved-cont (* saved-n val))))))
```

我们也可以在这种实现上做不同的变换，例如 registerize（应该是和 5.3 里面的方法对应，我还没看...），或者 trampoline，见书中图 6.1 和图 6.2。不过本章更关心的是 procedural representation，在这种情况下，应该实现为：

```lisp
(define end-cont
  (lambda ()
  	(lambda (val) val)))

(define fact1-cont
  (lambda (n saved-cont)
    (lambda (val)
    	(apply-cont saved-cont (* n val)))))

(define apply-cont
  (lambda (cont val)
  	(cont val)))
```

根据 procedural representation，我们还可以更进一步，把原程序中的 `(apply-cont cont val)` 直接写成 `(cont val)`，这个过程称为 inline。inline 后，`fact` 变成了：

```lisp
(define fact
  (lambda (n)
  	(fact/k n (lambda (val) val))))

(define fact/k
  (lambda (n cont)
    (if (zero? n)
      (cont 1)
      (fact/k (- n 1) (lambda (val) (cont (* n val)))))))
```

我们可以这么理解 `fact/k`：

> If `n` is zero, send `1` to the continuation. Otherwise, evaluate `fact` of `n−1` in a continuation that calls the result val, and then sends to the continuation the value `(* n val)`.

我们还可以对 `fib` 进行类似的变换，这里就不记录了。一个更明显的例子如下，从：

```lisp
(lambda (x)
  (cond
    ((zero? x) 17)
    ((= x 1) (f x))
    ((= x 2) (+ 22 (f x)))
    ((= x 3) (g 22 (f x)))
    ((= x 4) (+ (f x) 33 (g y)))
    (else (h (f x) (- 44 y) (g y))))))
```

转化为：

```lisp
(lambda (x cont)
  (cond
    ((zero? x) (cont 17))
    ((= x 1) (f x cont))
    ((= x 2) (f x (lambda (v1) (cont (+ 22 v1)))))
    ((= x 3) (f x (lambda (v1) (g 22 v1 cont))))
    ((= x 4) (f x (lambda (v1)
                    (g y (lambda (v2)
                      (cont (+ v1 33 v2))))))
    (else (f x (lambda (v1)
                 (g y (lambda (v2)
                   (h v1 (- 44 y) v2 cont))))))))
```

经过归纳，我们得到了如下的方法：

- **The CPS Recipe**

To convert a program to continuation-passing style

1. Pass each procedure an extra parameter (typically `cont` or `k`).

2. Whenever the procedure returns a constant or variable, return that value to the continuation instead, as we did with `(cont 17)` above.

3. Whenever a procedure call occurs in a tail position, call the procedure with the same continuation `cont`.

4. Whenever a procedure call occurs in an operand position, evaluate the procedure call in a new continuation that gives a name to the result and continues with the computation.

有的时候，我们可以找到更好的表达方式，例如回到 `fact` 的 continuation：

```lisp
(define end-cont
  (lambda ()
  	(lambda (val) val)))

(define fact1-cont
  (lambda (n cont)
  	(lambda (val) (cont (* n val)))))

(define apply-cont
  (lambda (cont val)
  	(cont val)))
```

我们可以观察到所有的 continuation 都是在结果上乘个数，所以可以转化为：

```lisp
(define end-cont
  (lambda () 1))

(define fact1-cont
	(lambda (n cont)
  	(* cont n)))

(define apply-cont
  (lambda (cont val)
  	(* cont val)))
```

从而把 `fact` 转化为了：

```lisp
(define fact
  (lambda (n)
  	(fact/k n 1)))

(define fact/k
  (lambda (n cont)
    (if (zero? n)
      cont
      (fact/k (- n 1) (* cont n)))))
```

这和很久之前提到过的 `fact-iter` 是相同的。所以我们可以意识到，accumulator 实际上就是 continuation 的一种表示形式。很多经典优化方法实际上也是这个思路。

### 6.2 Tail Form

为了转化为 CPS，我们选择了类似于 LETREC 的语言，称为 CPS-IN，其语法如下：

```lisp
Program ::= InpExp
						a-program (exp1)
InpExp ::= Number
					 const-exp (num)
InpExp ::= -(InpExp , InpExp)
					 diff-exp (exp1 exp2)
InpExp ::= zero?(InpExp)
					 zero?-exp (exp1)
InpExp ::= if InpExp then InpExp else InpExp
					 if-exp (exp1 exp2 exp3)
InpExp ::= Identifier
					 var-exp (var)
InpExp ::= let Identifier = InpExp in InpExp
					 let-exp (var exp1 body)
InpExp ::= letrec {Identifier ({Identifier}∗(,)) = InpExp}∗ in InpExp
					 letrec-exp (p-names b-varss p-bodies letrec-body)
InpExp ::= proc ({Identifier}∗(,)) InpExp
					 proc-exp (vars body)
InpExp ::= (InpExp {InpExp}∗)
					 call-exp (rator rands)
```

对于 CPS 来说，区分 Operand position 和 Tail position 是非常重要的。下面就是 CPS-IN 语言中不同位置的意义：

```lisp
; O 表示 operand，T 表示 tail
zero?(O)
-(O, O)
if O then T else T
let Var = O in T
letrec {Var ({Var}∗(,)) = T}∗ in T
proc ({Var} ∗ (,)) T
(O O . . . O )
```

我们根据这种特点制作 CPS-OUT。CPS-OUT 的语言为 CPS-IN 的子集，但是用的是不同的语法：

```lisp
Program ::= TfExp
            a-program (exp1)
SimpleExp ::= Number
              const-exp (num)
SimpleExp ::= Identifier
              var-exp (var)
SimpleExp ::= -(SimpleExp , SimpleExp)
              cps-diff-exp (simple1 simple2)
SimpleExp ::= zero?(SimpleExp)
              cps-zero?-exp (simple1)
SimpleExp ::= proc ({Identifier}∗) TfExp
              cps-proc-exp (vars body)
TfExp ::= SimpleExp
          simple-exp->exp (simple-exp1)
TfExp ::= let Identifier = SimpleExp in TfExp
          cps-let-exp (var simple1 body)
TfExp ::= letrec {Identifier ({Identifier}∗(,)) = TfExp}∗ in TfExp
          cps-letrec-exp (p-names b-varss p-bodies body)
TfExp ::= if SimpleExp then TfExp else TfExp
          cps-if-exp (simple1 body1 body2)
TfExp ::= (SimpleExp {SimpleExp}∗)
          cps-call-exp (rator rands)
```

从上面的语法可以看出，CPS-OUT 有两种 nonterminal，`SimpleExp` 和 `TfExp`。其中 `SimpleExp` 中不包含任何函数调用，从而使 `TfExp` 中只有 tail call。

CPS-OUT 的解释器如下：

```lisp
; value-of/k : TfExp × Env × Cont → FinalAnswer
(define value-of/k
  (lambda (exp env cont)
    (cases tfexp exp
      (simple-exp->exp (simple)
        (apply-cont cont
        	(value-of-simple-exp simple env)))
      (let-exp (var rhs body)
        (let ((val (value-of-simple-exp rhs env)))
          (value-of/k body
            (extend-env (list var) (list val) env)
            cont)))
      (letrec-exp (p-names b-varss p-bodies letrec-body)
        (value-of/k letrec-body
          (extend-env-rec** p-names b-varss p-bodies env)
          cont))
      (if-exp (simple1 body1 body2)
        (if (expval->bool (value-of-simple-exp simple1 env))
          (value-of/k body1 env cont)
          (value-of/k body2 env cont)))
      (call-exp (rator rands)
        (let ((rator-proc
          			(expval->proc (value-of-simple-exp rator env)))
          		(rand-vals
                (map
                  (lambda (simple)
                  	(value-of-simple-exp simple env))
                  rands)))
          (apply-procedure/k rator-proc rand-vals cont))))))

; apply-procedure : Proc × ExpVal → ExpVal
(define apply-procedure/k
  (lambda (proc1 args cont)
    (cases proc proc1
      (procedure (vars body saved-env)
        (value-of/k body
          (extend-env* vars args saved-env)
          cont)))))
```

这其中的 `value-of-simple-exp` 是不需要函数调用就能计算的。

（不明白的一点是，CPS-OUT 不就不能对两个 `TfExp` 做 `diff` 或者 `zero?` 了吗？？？）

重要的一点是，这个函数没有引入任何新的 continuation，所以我们可以简单的把这个参数删掉。

### 6.3 Converting to Continuation-Passing Style

这一节我们将介绍该如何把 CPS-IN 中的算法转化为 CPS-OUT。

### 6.4 Modeling Computational Effects

CPS 的另一个重要应用是能显示展示 computational effect。

在 CPS 中，我们认为一个 simple expression 是没有 effect 的，原因是 simple expression 里面没有函数调用，而函数调用可能不会 terminate（自然也就是有可能引发 effect）。

本节我们重点研究 3 种 effect：printing, a store (using the explicit reference model) 以及 nonstandard control flow。

首先是 print。我们在 CPS-IN 同加入：

```lisp
InpExp ::= print (InpExp)
           print-exp (exp1)
```

然后在 CPS-OUT 中加入 `printk`：

```lisp
TfExp ::= printk (SimpleExp) ; TfExp
					cps-printk-exp (simple-exp1 body)
```

因为会有 effect，所以 `printk` 必须是 `TfExp` 而非 `SimpleExp`，并且只能出现在 tail position。