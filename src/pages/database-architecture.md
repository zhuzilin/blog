---
title: 数据库基本架构
date: 2019-04-17 9:55:00
tags: ["database"]
---

![database-architecture](//i.imgur.com/8PMtWPo.png)

这次我们来整理一下数据库的基本架构，内容来自*Database Management Systems 3rd Edition*.

从最简略的角度，DBMS接受SQL，在数据库中运行他们，并返回结果。

当用户进行一次查询的时候，SQL先被**parse**，然后将parse的结果传给**query optimizer**。query optimizer会利用数据存储信息来生成一个高效的execution plan。execution plan是一个evaluation的蓝图，由**relational operators**组成的树表示。

实现relational operator（也就是把上述的蓝图转化为普通代码）的代码位于**file and access methods layer**之上。file and access methods layer支持file的抽象概念。对于DBMS来说，文件就是a collection of pages或a collection of records。注意page也是collection of records，只不过是有固定大小。也是在这一层中支持了heap files或是files of unordered pages，以及index。除了追踪fil中的page，这一层还负责管理page中的信息。

files and access methods位于**buffer manager**之上，其主要用于把page从disk读到memory中以进行更快的读写。

最下面一层是**Disk Space Management**，用于管理硬盘空间以及把数据存储到硬盘上。注意DBMS一般不直接操作存储设备，而是通过OS的file system。所以在DBMS中的一个大文件可能实际上是OS中的多个小文件。

DBMS还支持并行与crash recovery。由**transaction manager**来确保正确的锁的protocol以及schedule transactions。由**lock manager**来追踪锁的request以及给database object配发锁。**recovery manager**用于记录log并在crash之后恢复系统。