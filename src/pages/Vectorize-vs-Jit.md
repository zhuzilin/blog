---
title: Vectorize vs Jit
date: 2021-12-05 21:30:00
tags: ["db"]
---

在刷知乎的时候看到了对这篇论文的笔记：《Everything You Always Wanted to Know About Compiled and Vectorized Queries But Were Afraid to Ask》（[知乎链接](https://zhuanlan.zhihu.com/p/439233132)），这篇文章主要是在数据库层面对比了向量化优化和编译优化，分析了这两个优化孰优孰劣。

在看这篇文章的时候，一个很自然的问题浮现出来。为什么这两个优化是相互矛盾的呢？文中是这么说的：

> Although both models eliminate the overhead of traditional engines and are highly efficient, they are conceptually different from each other: Vectorization is based on the pull model (root-to-leaf traversal), vector-at-a-time processing, and interpretation. Datacentric code generation uses the push model (leaf-to-root traversal), tuple-at-a-time processing, and up-front compilation

也就是说，在数据库领域，一个是 pull based，另一个是 push based。

从伪代码的角度来说，vectorize 的目标是将一层循环转化成 2 层循环，其中里层的循环较为简单，方便自动进行并行处理，类似于从原本的：

```c++
for (int i = 0; i < num; i++) {
  output[i] = process(input[i]);
}
```

变为：

```c++
for (int i = 0; i < num; i += batch) {
  for (int j = i; j < min(i + batch, num); j++) {
    output[j] = process(input[j]);
	}
}
```

而编译则是把多个循环合并成同一个：

```cpp
for (int i = 0; i < num; i++) {
  tmp1[i] = process1(input[i]);
}
for (int i = 0; i < num; i++) {
  tmp2[i] = process2(tmp1[i]);
}
for (int i = 0; i < num; i++) {
  output[i] = process3(tmp2[i]);
}
```

变成：

```cpp
for (int i = 0; i < num; i++) {
  tmp1 = process1(input[i]);
  tmp2 = process2(tmp1);
  output[i] = process3(tmp2);
}
```