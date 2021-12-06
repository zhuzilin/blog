---
title: Trace JIT vs Method JIT
date: 2021-11-10 22:43:00
tags: ["compiler"]
---

这两天在看各个 python 版本的优化的时候（主要是 FB 给 instagram 写的 [cinder](https://github.com/facebookincubator/cinder)）看到了 Method JIT 这个名词，发现好像主流的 JIT 主要分为 method JIT 和 trace JIT 两种。搜了一下，在一个日本人的 phd thesis 中看到了介绍，在这里总结一下~

论文名：Study on method-based and trace-based just-in-time compilation for scripting languages

作者：Masahiro Ide

只看了 Ch2...

## Method based JIT

> A method-based JIT uses a single method as compilation unit. Using profile data, the compilers identified hot functions and then compiled and optimized using standard compilation techniques on the control flow graph of the method. The compiler typically has to traverse the program until a fixed-point is reached slowing down compilation speed. Since AOT compilers include traditional compilers employ a method as compilation unit, the same optimization techniques used for AOT compiler can be used in methodbased JIT compiler (if these optimizations run quickly). A method-based JIT compiler uses a profiling data such as the number of times a function is invoked.

Method based 的好处在于可以复用 AOT，并且可以很方便 bytecode 与编译后的 binary 之间切换。

## Trace based JIT

> A trace-based JIT compiler uses a trace as compilation unit. A trace is a liner sequence of instructions that has a single entry point and one or more exit points. A trace-based JIT compiler is not bounded by the method boundary, and it often includes part of several functions. And if there are multiple frequently executed paths in the program, these paths may cover by multiple traces. ... The generated traces are often contained some replication of code. However, these replicated code increase the opportunities for optimization within each trace. Following section describes the detail of trace-based JIT compiler.

注意，Trace based JIT 里面是不考虑控制流的。

> A trace is straight-line codes with no control flow join points except that the last instruction might loop back to the beginning.
>
> If the original code contains conditional branch, a trace contains a guard. A guard is a runtime check instruction to check that the program state is indeed as expected.
>
> When the guard fails, the execution leaves the current trace and fall back to the interpreter or invokes another trace.