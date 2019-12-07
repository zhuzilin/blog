---
title: 15-418 总结
date: 2019-10-21 1:21:00
tags: ["computer-architecture", "15-418"]
draft: true
---

## Lecture 1 why parallelism

通过几个小的互动得到

1. 工作量分配不平均，会影响并行运算的速度。
2. 通信会严重影响加速

然后介绍了一下并行运算的由来。大致是由于器材的发热量是正比于时钟频率的，所以提高到一定程度之后就受限于热量，没办法提高了。所以需要写并行代码来进行提速。

也是这个时候提出了instruction level parallelism(ILP)，也就是一个处理器可以同时执行多条相互**独立**的指令。这种处理器动态查找独立指令的执行方式被称为**superscalar execution**。不过有实验表明，ILP每个时钟周期运行4个指令其加速效果最好。所以还是要写多个instruction stream的代码。

## Lecture 2 a modern multi-core processor

一个 处理器主要分为3部分，

- Fetch/Decode, 从内存加载并解码指令
- ALU(execute), execution unit，执行指令
- Execution context，存储被指令更新的部分，比如更新的寄存器

一个最普通的每个时钟执行1条指令的处理器模型如下：

![one instruction](https://i.imgur.com/Bj4Ljbd.png)

然后是lecture 1中提到的superscalar处理器，这里我们举每个时钟处理两条指令的例子：

![superscalar](https://i.imgur.com/zECQcIJ.png)

可以看到，这个时候有2个decoder和两个ALU，他们共用一个context。

在奔腾4处理器中我们就可以看到上述的模型：

![pentium 4](https://i.imgur.com/WxInFdq.png)

上图对应橙色为3个decoder，黄色为4个ALU，蓝色为一个context，然后黑色的一个reorder buffer是用来处理out of order instruction的，之后的lecture会讲到。

在前多核时代，处理器的主要结构如下：

![pre multi core](https://i.imgur.com/flyWtjQ.png)

那么进入多核时代，主要加入了如下几个思想。

首先，是加入多核。并让每个核的结构简单一些。可以使用pthread来表示这种并行。因为写pthread需要hard code线程数，所以可以用语言定义的类似于`forall`的关键词来让编译器做处理。

其次，很多时候都是运行相同的代码，输入不同的数据，所以可以共享decoder的部分。这就是SIMD (single instruction, multiple data)。可以使用AVX指令集来让代码变得可以利用SIMD。同样也可以利用语言中的`forall`来表示data-parallel expression。

对于处理条件(if/else)，是通过对不同的SIMD ALU加mask，对于在这个ALU上的数据为true的时候运行，不对的时候等待。

![SIMD if/else](https://i.imgur.com/SDFcG3i.png)

这里因为可能有一个分支特别长，且只有一个ALU运行，那么就会导致几乎一直都是只有一个ALU在运行，也就是1/8 performance。

现代处理器上的SIMD指令情况如下：

- SSE instructions: 128-bit operations: 4x32 bits or 2x64 bits (4-wide float vectors)
- AVX instructions: 256 bit operations: 8x32 bits or 4x64 bits (8-wide float vectors)

下面来看访问内存的情况。首先是一些定义：

- memory latency: 一条内存指令被执行完成需要的时间
- memory bandwitdh: 内存系统在单位时间可以给处理器提供的数据量。

- stall: 由于指令之间的相互依赖，处理器不能运行下一条指令的情况。

可以通过prefetching来减少stall (hide latency)，也可以使用**多线程**来减少stall。（这里的stall都是因为之前的内存读写指令没有完成，也就是需要等待读入数据）。这种方法实际上会略微提到latency，但是会大幅提到throughput。

