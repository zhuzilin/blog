---
title: mutual exclusion 和面包店算法
date: 2021-10-28 12:30:00
tags: ["distributed", "lamport"]

---

最近计划学习一下 Leslie Lamport 老先生的经典论文~ 在 Lamport 对自己[生涯论文的回顾](https://lamport.azurewebsites.net/pubs/pubs.html#bakery)中，对自己提出的面包房算法做出了非常高的评价：

> ... I have invented many concurrent algorithms. I feel that I did not invent the bakery algorithm, I discovered it. ... For a couple of years after my discovery of the bakery algorithm, everything I learned about concurrency came from studying it.

所以就从面包店算法开始吧。

这个算法主要是解决了 Dijkstra 提出的 mutual exlusion 问题，也叫 Dijkstra's concurrent programming problem。这个问题有如下几个要求：

1. 任何时间，最多只能有一台机器进入 critical section；
2. 每台机器最终都会进入 critical section；
3. 每台电脑都能停在 noncritical section；
4. 不能对机器的速度做任何假设。

注，本文中进程和机器混用，都表示一个独立的线程程序。

而在 Lamport 提出面包房算法的时候，其实已经珠玉在前，Dijkstra 和 Knuth 两位大佬对这个问题都进行了研究。所以在理解面包房算法的意义之前，我们先跟着这篇文章的 5 篇引用，来学习一下前人已经给出的方法。

## 前人的方法

### Dijkstra 的方法

论文：Solution of a Problem in Concurrent Programming Control

Dijkstra 在本文中定义了 mutual exclusion 这个问题，并给出了自己的一个解法。

定义 boolean array `b`, `c` 长为 `N` 以及整数 `k`。初始时两个 array 中的值均设为 true。

```pascal
    begin integer j;
LO: b[i] := false;
L1: if k /= i then
L2:     c[i] := true;
L3:     if b[k] then  (* 说明 k 已经结束访问 critial section 了 *)
            k := i;
        goto Ll
    else  (* 只有 i == k 的那个进程可以继续运行下去 *)
L4:     c[i] := false;
        for j := 1 step 1 until N do
            (* 并且需要只有它一个 c[i] 是 false *)
            if j /= i and not c[j] then
                goto L1
    end if;
    critical section;
    c[i] := true; b[i] := true;
    remainder of the cycle in which stopping is allowed;
    goto LO
```
这里需要明白一下 `b` 和 `c` 都是做什么的。

首先考虑到 `b` 只有在还没进入这个循环，以及刚退出 critical section（后文称 cs）的时候才是 `true`，所以在 `L3` 中，如果发现 `k` 进程刚刚结束访问，就可以继续让一个新的进程来作为 `k`，进入 cs 了。因此 `b` 的任务是选择下一个进入 cs 的进程。

那么如果只有 `b`，这个算法能不能生效呢？如果把 `c` 相关的部分删掉，会得到如下的版本：

```pascal
    begin integer j;
LO: b[i] := false;
L1: if k /= i then
L3:     if b[k] then
A:          (* 假设某个进程卡在这里 *)
            k := i;
        goto L1
    end if;
    critical section;
    b[i] := true;
    remainder of the cycle in which stopping is allowed;
    goto LO;
```

这个版本的问题在于，可能会有有多个进程进入 cs。假设有两个进程 u，v  同时进入 A，其中我们假设 v 突然卡在这里了，而在 u 继续运行到了 critical section（cs）的时候 v 又恢复了，这会使得 u 还没退出 cs 的时候 v 也能顺利进入，从而就违背了 mutual exclusion 的假设了。

 `c` 就可以解决这个问题。在这个时候，如果 u 已经进入 cs 了，而 v 刚刚进入 L4，那么 L4 中的循环会判断出已经有人在 cs 了，从而让 v 回到 L1 去。换句话说，如果两个进程先后进入 L4（我们还是把他们称作 u, v，这里 u 先完成 `c[u] := false`），那么 v 在进入 L4 的循环中一定会发现 `c[u] == false`，从而返回 L1。

那么有没有可能 u, v 都进入了 L4 循环，并都发现了对方的 `c[i] == false`，都返回 L1，从而导致没有进程走到 cs 呢？要考虑到只有在一个进程刚刚离开 cs，把 `b[i]` 设为 `true` 的时候才会出现多个进程进入 L3，在没有进程进入 cs 的时候，一定只会有一个固定的 k，所以那个进程 k 一定会进入 cs。

下面记录一下原文中的证明：

1. 因为进入 cs 的方式必须是进入 L4 而并没有返回 L1，所以只能有一个进程满足其 `c[i]` 为 `true`，其余为 `false`，这证明最多只有 1 个进程进入 cs。

2. 当没有进程在 cs 时，如果 k 进程没有进入循环，也就是 `b[k] == true`，那么一个或多个进程会进入 L3，并设置 `k := i`。当他们都设置完之后，`b[k]` 变为 `false` 了，也就没有新的（除去已经进入 L3 的进程们）进程可以进入 L3 了。

    假设之后没有任何进程能进入 cs，则这些进程都会在 L1 ~ L4 循环，而因为除了 k 之外，其他的进程均满足 `k /= i`，所以最后会使得除了最后确定的那个 `k` 进程意外的其他进程的 `c[i]` 为 `true`。那么 `k` 进程就可以顺利通过 L4 的循环，从而进入 cs 了。这与假设矛盾，所以一定会有进程进入 cs。

### Knuth 的方法

论文题目：Additional Comments on a Problem in Concurrent Programming Control

在介绍 Knuth 的方法之前，先要介绍一下 1966 年 Harris Hyman 在一封短信中提到的对于上述 Dijkstra 解法的两机优化（论文名：Comments on a problem in concurrent programming control）：

```pascal
CO: b[i] := false;
C1: if k /= i then
C2:     if not b[k] then
            goto C2;
        else
            (* 1 号机卡在这里 *)
            k := i;
            goto C1;
        end if;
    else
        critical section;
        b[i] := true;
        (* 0 号机卡在这里 *)
        remainder of program;
        goto CO;
    end if;
```

看着是不是有点眼熟，这个方法和上面提到的去掉 `c` 的方案非常相似。也会出现同样的错误，也就是可能会使 2 台机器（2 个进程）同时进入 cs。这里我们依然假设 2 台机器为 0 号机和 1 号机，并且假设 k 为 0，那么可能会出现这样的情况：0 号机刚退出 cs 并设置 `b[i] := true` 的时候就卡住了，这样 1 号机就可以进入 C2 的 else 分支，但是不巧，1 号机在进入 C2 的 else 分支，而还没设置 `k := 1` 的时候卡住了，并且 0 号机又恢复了。这时 `k` 仍然是 0，所以 0 号机可以进入 cs，然后 1 号机在 0 号机进入 cs 的时候恢复，就会设置 `k := 1`，从而也能进入 cs，这样 0 号机和 1 号机就在 cs 处相遇了，于是发生了第三次冲击（大雾）。

Knuth 的论文中首先先点名了 Hyman 论文的问题的问题（并吐槽了一下原文中的 12 行 ALGOL 有 15 个语法错误...）。Knuth 大大给出的反例和我们上面提到的是相似的，初始时 `b[0] = b[1] = true`，且 `k = 0`。那么首先 1 号机进入 C2 并卡住，然后 0 号机进入 cs，之后 1 号机仍然能进入 cs。

对于 Dijkstra 的解法，Knuth 提出了 starvation 的问题，也就是有可能会出现某一个进程一直都进不到 cs 中。举一个 2 机的例子，如果 1 号机绕一圈 L1 循环的时间和 0 号机 L0 循环一次的时间一样，那就有可能每次 1 号机运行到 L3 的判断的时候 `b[0] == false`，从而 `k` 一直都是 0，1 号机一直都进不了 cs。

为了 starvation，Knuth 老爷子提出了如下的算法：

定义 `integer array control[1:N], integer k`，都初始化为 0：

```pascal
    begin integer j;
L0: control[i] := 1;
L1: for j := k step -1 until 1, N step -1 until 1 do
        if j = i then
            goto L2;
        if control[j] /= 0 then
            goto L1
L2: control[i] := 2;
    for j := N step -1 until 1 do
        if j /= i and control[j] = 2 then
        		goto L0;
L3: k := i;
    critical section;
    k := if i = 1 then N else i - 1;
L4: control[i] := 0;
L5: remainder of cycle in which stopping is allowed;
    goto L0
```

注意，这里的数组下标是从 1 开始的。

从算法中我们可以看到，`k` 只有在 cs 前后才会进行赋值，应该是要通过 `k` 来预防 starvation。L2 的部分和 Dijkstra 方法中的 `c` 作用相同，也就是防止有 2 个进程同时通过 L2 进入 cs。所以我们的核心就是去考虑 L1 部分干了啥。

```pascal
       begin integer j;             begin integer j;
 1 L1: b[i] := false;           L0: control[i] := 1;
 2     if k /= i then           L1: for j := k step -1 until 1, N step -1 until 1 do
 3         c[i] := true;                if j = i then
 4         if b[k] then                     goto L2;  (* 这里可以理解为 break *)
 5             k := i;                  if control[j] /= 0 then
 6         goto L1                          goto L1
```

对于 Dijkstra 的方法来说，下一个谁进入 cs 是通过进程之前争抢的方式实现的，也就是说，所有的进程那台机器比较快，能抢到 `k := i`，那么下一次就有可能让他来运行。而 Knuth 的方法则是在每次一个机器进入 cs 之后，在下一个循环中，把这台机器的起跑线往后拉，先看看别的机器能不能跑了。所以 L1 的部分的意义在于只要有更靠前的机器进来，那他就可以进入候选。

原文的证明：

1. 和类似于 Dijkstra 的方法，L2 结构保证不会同时有 2 个进程进入 cs。

2. 如果一直都没有进程进入 cs，那么 `k` 会是固定值，那么 `k`, `k-1`, `k-2`, ..., `1`, `N`, `N-1`, ..., `k+1` 这个循环中会有一个机器进入 cs 的。

3. 最后要多证明的是，不存在某一台机器被 block 了。这个证明稍微有点 nontrivial。利用反证法，假设有一台机器 `i0` 会被 block，也就是其只有有限次访问 cs。因为整个集群不会被 block，所以可以找到机器 `j0`，它会无限次访问 cs。我们假设 `j0` 是满足无限次访问的机器中，在 `i0` 前面离 `i0` 最近的。在 `i0` 的前面更近指 2 离 3 比 1 离 3 近，N 离 1 比 2 离 1 近。观察到每次 `j0` 从 L0 跑到 L5 的时候，`i0` 一直被卡在 L1 或者 L2 的集群中，所以 `control[i0] /= 0`。那么机器 `j0` 能够通过 L1，说明 L1 的循环是先走到 `j0` 再走到 `i0` 的，也就是说每次的 `k` 满足 `j < k < i`。由于 k 的选值是有限的，这也就意味着有机器 `k0`，满足 `j < (if k0 = 1 then N else k0 - 1) < i`，且无数次访问 cs。而这时 `k0` 将是一个离 `i0` 更近的机器，矛盾，证毕。

    Knuth 还提出某台处于 L1的机器最多可能需要等待 $2^{N-1} - 1$ 次才能才能进入 cs，这个的证明在文中并没有指出，后面我们会提到别人对这点的改进。

给出证明之后，Knuth 再次吐槽了一下 Hyman 的论文，说免得有人再提出个 2 机的简化方案了，我自己写一个：

> **Lest** someone write another letter just to give the special case of this algorithm when there are two computers, here is the program for computer `i` in the simple case when computer `j` is the only other computer present:

两机的简化方案如下：

```pascal
    begin
L0: control[i] := 1;
L1: if k = i then goto L2;
    if control[j] /= 0 then goto L1;
L2: control[i] := 2;
    if control[j] = 2 then goto L0;
L3: k := i;
    critical section;
    k := j;
L4: control[i] := 0;
L5: remainder;
    goto L0
```

其实就是 L1 的循环简化为了直接的判断（这里如果不是 `k = i` 就只能是另一台机器了，也就不用在搞循环了）和在更新 `k` 的时候直接改成另一台机器。（值得注意的是，这个方法和 Dijkstra 在更早提出的 [Dekker's algorithm](https://en.wikipedia.org/wiki/Dekker%27s_algorithm) 很像，不过当时 Dijkstra 只是用荷兰语写在了一个技术文档里，所以 Knuth 估计是不知道的...）

另外呢，当集群很大的时候，上述算法的效率比较低。Knuth 大大提出，如果我们给 Dijkstra 问题稍微改改，**假设读或写是一个原子操作**，就能有一个很高效的方法了：

对于接下来的算法，假设我们有共享存储 `Q[1:N]` 以及整数 `T`，针对这个存储我们再定义 3 个辅助函数：

```pascal
procedure add_to_queue(i)
    Q[T] := i;
		T := i;

procedure head_of_queue(i)
		head_of_queue := (i == Q[0]);

procedure remove(i)
    (* T 记录的是下一个元素，如果 T = i，说明 i 后面还没有 add_to_queue 的元素 *)
		if T = i then Q[O] := T := 0
		(* 把 Q[0] 赋为下一个 add_to_queue 的元素 *)
		else Q[O] := Q[i];
```

算法如下：

```pascal
    begin
L0: add_to_queue(i);
L1: if not head_of_queue (i) then
        goto L1;
L3: critical section;
L4: remove(i);
L5: remainder;
    goto L0
```

分析一下这个算法，每次只允许 head 进程，也就是 `Q[0]` 对应的进程进入 cs，在 `remove` 中，会换成下一个允许进入 cs 的进程。这里注意，因为写入是原子操作，所以两个先后的 `add_to_queue` 可能会有 2 种情况，一种是前者结束了，再调用后者，这样的后者就在链表中被设为前者的后继，另一种是前者仅仅运行完 `Q[T] := i;` 就进入后者的调用了，这样会直接覆盖掉前者的这次调用。

为什么这个方法需要读写是原子操作呢？是因为两个进程可能同时会去写入 `Q[T]`，如果不是原子操作的话，可能会导致污染。而前面的方法都是用一个数组，其中每个元素虽然可以读数组中所有的元素，但是只能写入自己的那个。

Knuth 表示最后的这个算法要比前面的都更公平（fair），也可以针对不同的优先级进行调整。

### de Brujin 的优化

论文题目：Additional Comments on a Problem in Concurrent Programming Control，和 Knuth 那篇文章一样

de Brujin 提出，Knuth 的算法指出的 $2^{N-1}$ 还听不直观的...不过通过一个小的改变，就可以把这个值降低到 $\frac{1}{2}N(N-1)$，即从：

```pascal
L3: k := i;
    critical section;
    k := if i = 1 then N else i - 1;
```

改为：

```pascal
L3: critical section;
    if control[k] = 0 or k = i then
        k := if k = 1 then N else k - 1;
```

并且把 k 的初始值从 0 改为 1 到 `N` 中的一个数。这里的证明感觉有点脱离并行算法的核心内容了，所以就先略过了，有兴趣的朋友可以去研究一下~

### Eisenberg 和 McGuire 的解法

论文题目：Further Comments on Dijkstra's Concurrent Programming Control Problem

在这篇文章中，作者进一步改进了 Knuth 的算法，从而把单机等待的上限刷到了 N-1，和前面的例子一样，对于这种数学证明我不是很感兴趣，对这方面有需求的朋友可以去研究一下论文中的算法和证明。

### Dijkstra 的 semaphore 解法

论文题目：The structure of the “THE”-multiprogramming system

在这篇论文的 Appendix 中指出了用 semaphore 解决 mutex exlusion 的方法。

一个 semaphore 只有 2 个操作，`P` 和 `V`。
- `P` 会把 semaphore 里面的值 -1。如果减少后的值非负，那么进程就可以继续执行；如果减少后的值为负数，那么进程会被挂起，直到后续的 `V` 操作。
-  `V` 操作则把 semaphore 里存储的值 +1，如果结果是正数，那么 `V` 操作就结束了；反之，如果结果非负，那么会让之前因这个 semphore 挂起的一个进程继续运行。

根据这个特点，有一个非常简单的解决 mutual exclusion 问题的方法：

```pascal
    begin semaphore mutex; mutex := 1;
L1: P(mutex);
    critical section;
    V(mutex);
    remainder of cycle;
    goto L1
```

semaphore 自动使两个进程不能同时进入 cs 了。

## 面包店算法

论文题目：A New Solution of Dijkstra's Concurrent Programming Problem

兜兜转转，终于到了我们本篇文章的主题，Lamport 老先生提出的面包店算法（bakery algorithm）。Lamport 在论文一开头就指出，前任的这些算法有一个共同的问题，他们都是针对一个多处理器的分时系统做的，而不是一个真的多机器的集群，都没有考虑机器挂掉（fail）的情况。一台机器挂掉了，会导致整个系统都卡主了。的确，比如说最开始的 Dijkstra 的方法，如果一个机器在进入 `b[i] := true` 前挂掉了，那其他的系统肯定就会卡在 L1 的循环了...

除了能够适应这个问题之外，面包店算法的另一个重点在于，当同时对一块儿内存进行读和写的时候，只需要写入的值是正确的，读到的值可以是任意值（可以既不是写之前的，也不是写之后的）（这一点我还没太理解....）。

并且和之前的算法不同的是，面包店算法保证了先到先得，也就是如果一个机器先执行了部分准备用的步骤（非循环），它就会先进入 cs。

对于机器挂掉的情况，我们假设如果一个机器挂掉了，它会立刻转到 noncritical section 去，并且可以允许在一段时间内读这台机器上的内存返回的是任意值，之后读取会返回 0。

考虑 `N` 台机器，我们需要预先准备 2 个数组：

```pascal
integer array choosing[1:N], number[1:N]
```

两个数组，均初始化为 0。其中 `choosing[i]` 和 `number[i]` 在机器 `i` 的内存中，其他机器可以读取这两个值但是不能写入。具体算法如下，注意对 `maximum` 的输入顺序没有要求：

```pascal
 1     begin integer j;
 2 L1: choosing[i] := 1;
 3     number[i] := 1 + maximum(number[l],..., number[N]);
 4     choosing[i] := 0;
 5     for j = 1 step 1 until N do
 6         begin
 7 L2:         if choosing[j] /= 0 then goto L2;
 8 L3:         if number[j] /= 0 and (number[j], j) < (number[i],i) then
 9                 goto L3;
10     	  end;
11     critical section;
12     number[i] := O;
13     noncritical section;
14     goto L1;
```

可以预见的是，L2 和 L3 的两个循环在这个算法中扮演着关键的角色。我们来一个一个研究一下。

L2 的主要功能是等，等待所有进入了 L1 的机器都能走过 `number[i]` 的赋值。机器挂掉了，那它的 `choosing[j]` 最后也会变成 0。

L3 的 `number[j] /= 0` 是为了排除挂掉或者刚刚走过 cs 的机器的。而后面的 `(number[j], j) < (number[i],i)` 则保证了先到先得，因为后来的 `i` 它的 `number[i]` 应该大于等于先来的 `number[j] + 1`，所以如果这里的判断为真，说明 `j` 比 `i` 先到，所以应该让他先进入 cs。同时如果有一个 `j` 在 cs 中，它的 `(number[j], j)` 肯定小于在循环中的机器，从而防止了其他机器进入 cs。

面包房算法为什么可以保证至多有 1 个机器可以进入 cs 呢？我们只需要证明如果有一个机器 `j` 在 cs 中，那其他的进程都有  `(number[j], j) < (number[i],i)`。这其实是很显然的，毕竟 `j` 肯定是比其他机器更早进入 L1 的 `number` 赋值环节的，并且因为它现在还没退出 cs，说明在后面进入 L3 的 `i` 计算 `number` 的时候，`number[j]` 还没有清零，即  `number[j] + 1 <= number[i]`。

那么为什么集群不会 block 呢？因为如果集群 block，也就是所有机器都会卡在 L3，那一定会有一个最小的 `(number[i], i)` 突出重围，进入 cs。

原文证明如下：

需要证明 3 个 assertion：

- *Assertion 1*：如果 `i` 和 `j` 都在程序的 5 ~ 11 行，并且 `i` 比 `k` 先运行完 `choosing[i] := 1`，那么 `number[i] < number[k]`。

    如上面论述的，这点显然，就不在赘述了。

- *Assertion 2*：如果 `i` 处于 cs，`k` 在 5 ~ 11 行，且 `k /= i`，那么 `(number[i], i) < (number[k], k)`。

    设 $t_L$ 为机器 `i` 在最后一次 L2 中读取 `choosing[k]` 的时间，$t_L3$ 为最后一次开始 L3 的时间，那么有 $t_L2 < t_L3$。

    设 $t_e$ 为当机器 k 运行完 `choosing[i] := 1` 的时间，$t_w$ 为运行完行 3 （设定 `number[k]`）的时间，$t_c$ 为运行行 4 的时间，所以有 $t_e < t_w < t_c$。因为在 $t_L2$ 的时候，`choosing[k]` 已经为 0 了，所以我们有以下两种情况：
    a) $t_L2 < t_e$，即机器 k 在 $t_L2$ 时还没有进入 L1；

    b) $t_c < t_L2$，即机器 k 在 $t_L2$ 时已经运行完行 4。注意这一点不能确定 `k` 是在 ` i` 后面的。

    - 对于 a) 情况，因为 `k` 比 `i` 晚运行 `choosing[i] := 1`，*Assertion 1* 告诉我们 `number[i] < number[k]`；

    - 对于 b) 情况，我们有 $t_w < t_c < t_L2 < t_L3$。因为 $t_w < t_L3$，所以在 `i` 最后一次执行 L3 的时候，`number[k]` 就已经是现在这个值了。因为机器 `i` 成功进入了 cs，于是有 `(number[i], i) < (number[k], k)`；

    因此证明了 *Assertion 2*。

- *Assertion 3*：假设只有有限次的机器 failure，那么如果当前没有机器在 cs，而且有一个在 5 ~ 11 行的机器，并且这个机器没有挂掉，那么最终（eventually）会有进程进入 cs。
  
  利用反证法，如果没有进程最终进入 cs，那么一段时间后，所有活着的机器都会处在 5 ~ 11 行。因为这些机器的 `number` 都不会被更新了，所以 `(number[i], i)` 最小的机器会跳出 L3 的循环并进入 cs，矛盾。从而证明了 *Assertion 3*。

这 3 个 assertion 意味着什么呢？*Assertion 2* 表明最多有 1 个机器处在 cs。*Assertion 1* 和 *Assertion 2* 表明了先到先得的原则。*Assertion 3* 表明整个系统只会被 halt 在 cs 处的机器死锁住。

注意，如果 5~11 行总是有一个机器，那么 `number` 的最大值会一直增长，没有上界。

### TLA

TLA 项目中也提供了面包店算法的 TLA(Pluscal) 代码：https://github.com/tlaplus/Examples/blob/master/specifications/Bakery-Boulangerie/Bakery.tla

在如下的邮件列表汇总，可以看到该如何在 TLA Toolbox 里面运行 `Bakery.tla`:
https://discuss.tlapl.us/msg03440.html

> TLC can only verify finite instances of specifications, and in particular all quantifier bounds have to be finite sets. The statements following labels e3 and exit contain quantification over Nat (or infinite subsets of Nat), which TLC cannot evaluate. Moreover, the introductory comments explicitly state that this specification of the Bakery algorithm is "more elegant and easy to prove, but less efficient to model check".
>
> You can override Nat by a finite set such as `0 .. 10' in Additional Spec Options -> Definition Override in the TLC pane, but you should be aware that the Bakery algorithm is intrinsically infinite-state, even for a finite set of participants. In particular, overriding Nat may introduce deadlocks in the algorithm because no number larger than the current maximum can be chosen.

这方面的内容，等我学会 TLA 再来分析吧~

## 总结

这一系列上世纪六七十年代的论文让我感到震撼。每篇论文都不长，短的可能不到一页，长的三四页，但是几乎每篇都在提出重要的概念。3 位图灵奖获得者依次展现了科学家的伟大之处：提出重要问题，设定重要概念，给出关键结论。

## 参考文献

1. Lamport, L. 1974. A new solution of Dijkstra's concurrent programming problem. *Commun. ACM* 17, 8 (Aug. 1974), 453–455.
2. Dijkstra, E.W. Solution of a problem in concurrent programming control. *Comm. ACM 8*, 9 (Sept. 1965), 569.
3. Hyman, H. 1966. Comments on a problem in concurrent programming control. Commun. ACM 9, 1 (Jan. 1966), 45.
4. Knuth, D.E. Additional comments on a problem in concurrent programming control. *Comm. ACM 9*, 5 (May 1966), 321--322.
5. deBruijn, N.G. Additional comments on a problem in concurrent programming control. *Comm. ACM 10*, 3 (Mar. 1967), 137--138.
6. Eisenberg, M.A., and McGuire, M.R. Further comments on Dijkstra's concurrent programming control problem. *Comm. ACM 15*, 11 (Nov. 1972), 999.
7. Dijstra, E.W. The structure of THE multiprogramming system. *Comm. ACM 11*, 5 (May 1968), 341--346.