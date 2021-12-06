---
title: The Internals of PostgresSQL 读书笔记 Ch3
date: 2021-05-30 21:30:00
tags: ["PL", "db"]
---

这一张是介绍 query processing 的，也是我一直非常感兴趣的一个内容。

## 3.1 Overview

![figure 3.1. Query Prcessing](http://www.interdb.jp/pg/img/fig-3-01.png)

PostgresSQL 的 query 处理模块包含 5 个子系统：

- Parser
- Analyzer: 对 pase tree 进行语义分析，并生成 query tree
- Rewriter: 利用 rule system 中保存的 rule 对 query tree 进行变形
- Planner: 基于 query tree 生成可以高效执行 query 的 plan tree
- Executor: 依照 query tree 执行 query；plan tree 会指定执行过程中访问 table 和 index 的顺序与方式

### 3.1.1 Parser

让我们从一个例子说起：

```sql
SELECT id, data FROM tbl_a WHERE id < 300 ORDER BY data;
```

这样的语句的根节点是 `SelectStmt`，它的 parse tree 如下：

![Fig. 3.2. An example of a parse tree.](http://www.interdb.jp/pg/img/fig-3-02.png)

注意 Parser 只负责检查语法，不会查出 table 名并不存在这样的问题。这样的语义问题会被留给 analyzer

### 3.1.2 Analyzer

Query tree 的根节点是一个名叫 `Query` 的结构体，这个结构体里面保存了 metadata，例如 query 的类型（`SELECT`, `INSERT` 之类的）。除了类型还有一些别的叶节点，拿上面的 select 语句的举例：

![Fig. 3.3. An example of a query tree.](http://www.interdb.jp/pg/img/fig-3-03.png)

简单介绍一下这里的每个节点的作用：

- `targetList` 表示结果的所有列。如果输入的 query 使用的是 `*`，analyzer 会显式替换成所有的列。
- `rtable` (range table) 表示的是 query 中使用的 relations。在这个例子中，这里存储了 `tbl_a` 这个表的一些信息。
- `jointree` 存储了 `FROM` 和 `WHERE` 语句
- `sortClause` 则是 `SortGroupClause` 的 list

### 3.1.3 Rewriter

Rewriter 实现了 [rule system](https://www.postgresql.org/docs/current/rules.html)。rule system 本身很有趣，但是这一章我们将不会介绍 rewriter 和 rule system 以避免这章变得过长。

