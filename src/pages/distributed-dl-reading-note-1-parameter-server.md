---
title: 分布式深度学习阅读笔记1： Parameter Server
date: 2019-10-27 11:00:00
draft: true
---

今天来读李沐大佬的著作。

## Scaling Distributed Machine Learning with the Parameter Server
### 1 Introduction

分布式的优化和推断已经成为了解决大规模机器学习问题的一个先决条件。当规模很大时，由于数据的增长和对应的模型的复杂度提高，没有单机能够足够迅速的解决问题。但是，实现一个高效的分布式算法并不简单。高强度的计算和大规模的数据传输需要我们对系统的仔细设计。

现实中的训练数据可能会在1TB到1PB的两级。这让我们可以创造有$10^9$到$10^12$量级参数的模型。这些模型大多会被所有work node全局分享，也就是在优化更新的时候需要经常访问公共参数。这种共享导致了如下的3个挑战：

- 访问参数需要非常大的带宽
- 很多机器学习算法是顺序的。这导致的barrier会在同步开销大或者机器延迟高的时候影响性能。
- 规模很大的时候需要考虑fault tolerance。因为learning task常常会在云环境中作业，也就意味着机器可能不可靠，任务可能会被preempted。

为了展示我们的这几个观点，我们收集了一个大型互联网公司在3个月内的所有日志，见表1。

![table 1](https://i.imgur.com/P45BD06.png)

从表中可以看出，实际工作中需要考虑fault tolerance。

#### 1.1 Contribution

parameter server框架的介绍所说，其已经在学术界和工业界被广泛应用。本篇文章介绍了一个第三代parameter server的开源实现，其针对分布式推断的系统方面。