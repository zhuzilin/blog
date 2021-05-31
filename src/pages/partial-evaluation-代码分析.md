---
title: Partial Evaluation 代码分析
date: 2021-05-30 21:30:00
tags: ["PL"]
---

在学习 JAX 和 TVM 代码的时候经常会遇到 partial evalutation 这个名词。它的主要功能应该是在编译期对程序进行局部估值，类似于 constant folding，只不过对于函数，也会把已知的参数都 fold 起来，并转化为新的函数。例如：

```lisp
(define (add x y) (+ x y))
(add 1 a)
```

会被转化为：

```lisp
(define (add1 y) (+ 1 y))
(add1 a)
```

在学习的过程中，又看到[知乎的 Guannan Wei 大大发的关于 partial evaluation 的解释](怎样理解 Partial Evaluation？ - Guannan Wei的回答 - 知乎 https://www.zhihu.com/question/29266193/answer/140701226)。非常清晰。其中为了阐述如何对函数进行 partial evaluation，直接列出了如下的 racket 代码：

```lisp
#lang racket

(struct FDef (args body) #:transparent)
(struct None () #:transparent)

(define (lookup key env)
  (cond [(null? env) (None)]
        [(equal? key (first (first env))) (second (first env))]
        [else (lookup key (rest env))]))

(define (update key val env)
  (cond [(null? env) (list key val)]
        [(equal? key (first (first env)))
         (cons (list key val) (rest env))]
        [else (cons (first env) (update key val (rest env)))]))

(define (op? op)
  (or (symbol=? op '==) (symbol=? op '+)
      (symbol=? op '-)  (symbol=? op '*)))

(define (is-value? v) (or (number? v) (boolean? v)))

(define (aexp op l r)
  (match op
    ['+ (+ l r)]
    ['* (* l r)]
    ['- (- l r)]
    ['== (eq? l r)]))

(define (new-function-name old-name args)
  (string->symbol (string-append (symbol->string old-name)
                                 (number->string (equal-hash-code args)))))

; peval: [(symbol, FDef)] SExpr -> ([(symbol, FDef)], SExpr)
(define (peval fdefs expr)
  ; pe: SExpr [(symbol, FDef)] -> SExpr
  (define (pe expr env)
    (match expr
      [(or (? number?) (? boolean?)) expr]
      [(? symbol?)
       (define val (lookup expr env))
       (if (None? val) expr val)]
      [`(,(? op? op) ,l ,r)
       (define lv (pe l env))
       (define rv (pe r env))
       (if (and (is-value? lv) (is-value? rv))
           (aexp op lv rv)
           `(,op ,lv ,rv))]
      [`(if ,cnd ,thn ,els)
       (define cnd-v (pe cnd env))
       (if (is-value? cnd-v)
           (if cnd-v (pe thn env) (pe els env))
           `(if ,cnd ,(pe thn env) ,(pe els env)))]
      [`(,fname ,args ...)
       (define fun (lookup fname fdefs))
       (define args-v (map (λ (v) (pe v env)) args))
       (define new-env (map list (FDef-args fun) args-v))
       (define-values (statics dyns) (partition (compose is-value? second) new-env))
       (if (empty? dyns)
           (pe (FDef-body fun) statics)
           (let ([new-fname (new-function-name fname statics)])
             (when (None? (lookup new-fname fdefs))
               (set! fdefs `((,new-fname 'placeholder) ,@fdefs))
               (set! fdefs (update new-fname
                                   (FDef (map first dyns) (pe (FDef-body fun) statics))
                                   fdefs)))
             `(,new-fname ,@(map second dyns))))]))
  (reverse `(,(pe expr '()) ,fdefs)))

(module* test #f
(define add (list 'add (FDef '(x y) '(+ x y))))
; (add 1 2) 直接被解释为3
(check-equal? (second (peval (list add) '(add 1 2))) 3)
; (add 1 a) 则解释为(add467865875966180528 a)
; 同时生成了一个特化的函数 'add467865875966180528, 也就是(λ (y) (+ 1 y))
(check-equal? (peval (list add) '(add 1 a))
                (list
                 (list
                  (list 'add467865875966180528 (FDef '(y) '(+ 1 y)))
                  (list 'add (FDef '(x y) '(+ x y))))
                 '(add467865875966180528 a))))
```

在这里对这端代码的内容进行一下解读，顺便补一补 racket 语法。

这段代码实现了一个很简单的 lambda calculus 语言。除去用 `FDef` 定义函数，还可以进行表达式的 `+`, `-` 和 `*`。

Partial evaluation 则是用 `peval` 这个函数来表示的。`peval` 会传入 2 个参数，第一个参数 `fdefs` 是一个 `FDef` 的 list，表示当前环境中保存的所有函数；第二个参数则是转化到现在这一步，表达式被转换成什么样了。例如：

```lisp
(define add (list 'add (FDef '(x y) '(+ x y))))
(peval (list add) '(add 1 2))
```

这里传入的函数列表就是 `(list add)`，需要进行 peval 的表达式是 `'(add 1 2)'`。

`peval` 里面则是定义了一个内部的函数 `pe`，这个函数也有 2 个参数，第一个就是当前的表达式，第二个则是目前环境中变量的值。这里要注意，因为我们的语言没有赋值或者是 `let` 语句，所以这里的变量只可能是函数，同时也只有在 partial evaluate 函数调用的时候才会扩张 `env`。

有了 `pe`，我们就可以把 `peval` 转化为了：

```lisp
(reverse `(,(pe expr '()) ,fdefs)))
```

这里有一点需要补充，就是 `,` 在 racket 里面表示 unquote，就是这部分是进行实际计算的，而不是单纯的 symbol。后面会出现的 `,@` 则是不仅 unquote，还要展开里面的 list。

对于 `pe` 来说，如果表达式并不是 `(func args)` 这个形式的函数调用，就比较 trivial，分别估值每个部分就好，例如：

```lisp
  (define (pe expr env)
    (match expr
      [(or (? number?) (? boolean?)) expr]
      [(? symbol?)
       (define val (lookup expr env))
       (if (None? val) expr val)]
      [`(,(? op? op) ,l ,r)
       (define lv (pe l env))
       (define rv (pe r env))
       (if (and (is-value? lv) (is-value? rv))
           (aexp op lv rv)
           `(,op ,lv ,rv))]
      [`(if ,cnd ,thn ,els)
       (define cnd-v (pe cnd env))
       (if (is-value? cnd-v)
           (if cnd-v (pe thn env) (pe els env))
           `(if ,cnd ,(pe thn env) ,(pe els env)))]
      ...
```

所以我们关键来研究一下 `(func args)` 这个形式：

```lisp
  (define (pe expr env)
    (match expr
      ...
      [`(,fname ,args ...)
       (define fun (lookup fname fdefs))
       (define args-v (map (λ (v) (pe v env)) args))
       (define new-env (map list (FDef-args fun) args-v))
       (define-values (statics dyns) (partition (compose is-value? second) new-env))
       (if (empty? dyns)
           (pe (FDef-body fun) statics)
           (let ([new-fname (new-function-name fname statics)])
             (when (None? (lookup new-fname fdefs))
               (set! fdefs `((,new-fname 'placeholder) ,@fdefs))
               (set! fdefs (update new-fname
                                   (FDef (map first dyns) (pe (FDef-body fun) statics))
                                   fdefs)))
             `(,new-fname ,@(map second dyns))))]))
```

- 首先，查看 `fdefs` 里面是不是已经有 `fname` 了，把它的实际表达式称为 `fun`。

    ```lisp
    (define fun (lookup fname fdefs))
    ```

- 其次，对所有参数进行 `pe` 操作，这里参数的环境仍然是 `env`

    ```lisp
    (define args-v (map (λ (v) (pe v env)) args))
    ```

- 然后 fun 的参数和注意和 pe 后的 args 相对应，并将这个对应关系称为 `new-env`

    ```lisp
    (define new-env (map list (FDef-args fun) args-v))
    ```

- 把所有的 args 分为 static 和 dynamic 的，static 是指在编译的时候确定的，dynamic 则是不确定的

    ```lisp
    (define-values (statics dyns) (partition (compose is-value? second) new-env))
    ```

    这里的 `compose` 就是复合函数，会先执行后一个函数再执行前一个。

- 做好准备工作后，开始正式的 partial evaluation

    如果 `dyns` 是空的，也就是说所有的参数都已知，那就拿这些已知的参数去计算值就好了。这里我觉得应该是大佬写错了，应该是 `(cons statics env)` 而不是单纯的 `statics`  作为新的环境。

    如果 `dyns` 非空，那说明只能 fold 一部分参数，先用 static 参数们算出来一个新的函数名，这个新函数只需要以  `(cons statics env)` 为环境去 pe body 就好（这里我还是觉得大佬是写错了）。

    ```lisp
           (if (empty? dyns)
               (pe (FDef-body fun) statics)
               (let ([new-fname (new-function-name fname statics)])
                 (when (None? (lookup new-fname fdefs))
                   (set! fdefs `((,new-fname 'placeholder) ,@fdefs))
                   (set! fdefs (update new-fname
                                       (FDef (map first dyns) (pe (FDef-body fun) statics))
                                       fdefs)))
    ```

    

