---
title: TVM 的 PL 基础知识——A-normal form
draft: true
---

当前 TVM 版本 0.8.0。

TVM 的 Relay Interpreter 使用的是 A-normal form：

```c++
// NOTE: the current interpreter assumes A-normal form.
// which is better for execution.
//
// It will run duplicated computations when taking program that
// contains DAG in dataflow-form.
//
// Conversion to ANF is recommended before running the interpretation.
```

wikipedia 对 A-normal form 的解释是这样的：

> In [computer science](https://en.wikipedia.org/wiki/Computer_science), **A-normal form** (abbreviated **ANF**) is an [intermediate representation](https://en.wikipedia.org/wiki/Intermediate_language) of [programs](https://en.wikipedia.org/wiki/Program_(computer_science)) in [functional compilers](https://en.wikipedia.org/w/index.php?title=Functional_compiler&action=edit&redlink=1) introduced by Sabry and [Felleisen](https://en.wikipedia.org/wiki/Matthias_Felleisen) in 1992[[1\]](https://en.wikipedia.org/wiki/A-normal_form#cite_note-1) as a simpler alternative to [continuation-passing style](https://en.wikipedia.org/wiki/Continuation-passing_style) (CPS). Some of the advantages of using CPS as an intermediate representation are that optimizations are easier to perform on programs in CPS than in the source language, and that it is also easier for compilers to generate [machine code](https://en.wikipedia.org/wiki/Machine_code) for programs in CPS. Flanagan et al.[[2\]](https://en.wikipedia.org/wiki/A-normal_form#cite_note-2) showed how compilers could use ANF to achieve those same benefits with one source-level transformation; in contrast, for realistic compilers the CPS transformation typically involves additional phases, for example, to simplify CPS terms.

也就是说，ANF 是对 CPS 的一种简化。

## BNF 是什么

不过在具体介绍 ANF 是什么之前，我们需要介绍一下另一个概念，BNF (Backus-Naur form)。BNF 是用来表示上下文无关文法的语言。也就是：

```
 <symbol> ::= __expression__
```

## ANF 是什么

ANF 有这样的两点限制：



首先先列出 ANF 的 BNF：

```
EXP ::= VAL 
      | let VAR = VAL in EXP
      | let VAR = VAL VAL in EXP

VAL ::= VAR
      | λ VAR . EXP
```



