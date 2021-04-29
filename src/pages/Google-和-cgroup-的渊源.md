---
title: Google 和 cgroup 的渊源
date: 2021-04-29 22:41:00
tags: ["linux", "container"]
---

今天看王益大佬的[知乎文章](https://zhuanlan.zhihu.com/p/368676698)的时候，无意间了解到 cgroups 主要是由 google 的两名工程师 Paul Menage 和 Rohit Seth 在 2006 ~ 2008 年贡献给 Linux kernel 的... 又一次感觉到 google, fb, 微软这些公司和我们玩的不是一个游戏... 本文主要记录一下我追踪到的当年他们提出 cgroups 的一些想法。

- hacker news 中和我同样感慨的人... https://news.ycombinator.com/item?id=25010087
- cgroups 的 wiki: https://en.wikipedia.org/wiki/Cgroups
- Menage P B. Adding generic process containers to the linux kernel[C]//Proceedings of the Linux symposium. 2007, 2: 45-57.

- Rohit Seth 关于 container 最初的邮件：https://lkml.org/lkml/2006/9/19/283
- Paul Menage 关于 process container 的邮件 https://lwn.net/Articles/205575/
- Process containers 成熟后的介绍文章 https://lwn.net/Articles/236038/

那个最初的 mailing list 看得头疼... 之后有机会再来总结一下吧。目前看主要的关注点是和 cpuset 之间的关系。