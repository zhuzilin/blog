---
title: 校招面经：阿里云安全岗、编译原理
date: 2019-08-07 18:35:00
tags: ["interview"]
---

昨天开始了我校招的第一个面试，是阿里云里面一个用编译原理去检查恶意脚本的组。因为我作死在简历上放了个小的解释器的项目，所以问了我半个小时编译原理，几乎全都不会...今天来记录一下。

- gcc编译的流程

  粗的来说，分四步

  - 预处理：把include放进去(.i文件) (gcc -E hello.c)

  - 编译：生成汇编代码(.s文件) (gcc -S hello.i)

    这一步检查代码规范性，是否有语法错误。只进行翻译，不进行汇编

  - 汇编：生成目标文件(.o文件) (gcc -c hello.s)

  - 链接：生成可执行文件(gcc hello.o)

  然后细化。

  前端的主要组成是预处理器，词法分析器(lexer)，语法分析器(parser)，语义分析器(semantic analysis)，中间表示生成器(IR generator)。

  - 预处理前面写过了，就是替换宏。
  - lexer是用来生成token的，有5类，标点、关键词、标识符(identifier)，常量(literal)和注释。
  - parser的作用是生成抽象语法树(AST)
  - semantic analysis的作用是检查代码含义是否有效，比如检查类型错误。
  - IR生成器就是用来生成IR

  前后端之间是优化器

  - 优化IR

  后端主要分为3部分：

  - 指令选取(instruction selection)：从IR指令到目标机器指令集的映射
  - 寄存器分配(register allocation)：从虚拟寄存器到目标架构上真是寄存器的映射，如x86架构，只能使用16个寄存器。
  - 指令调度(instruction scheduling)：对操作重新安排。

- 前端如果要在O(n)时间内检测出多关键词。

  不知道编译原理里是不是有啥特殊的算法，我先回答的是字典树（trie tree），这个假设的是已经parse成token了。后来面试官是不能先变成token，然后后也不知道，所以就说可以用AC自动机，但是不会写...

- 常见的编译器后端优化
  https://www.zhihu.com/question/31941203/answer/55699474

  - 能在编译阶段做的不要在运行时做

    Constant Propagation & Constant Folding

    前者是把常数赋值的变量直接替换成常数，后者是把用常数计算出来的东西计算出来。

  - 对循环优化

    Loop-invariant code motion

    如果一个指令可以拿到循环之外，就拿出去。

    Loop unrolling

    把i++变成i+=4，扩充循环内部内容，从而减少判断指令。

    Software pipeline

    利用多核进行流水线，这个要补充一下15213的内容。

- IR是什么

  IR (intermediate representation)是一个介于program和source之间的表示，独立于source和target。我们经常提到的IR是指LLVM中的，大概长这个样子：

  ````c
  @.str = internal constant [14 x i8] c"hello, world\0A\00"
  
  declare i32 @printf(i8*, ...)
  
  define i32 @main(i32 %argc, i8** %argv) nounwind {
  entry:
      %tmp1 = getelementptr [14 x i8], [14 x i8]* @.str, i32 0, i32 0
      %tmp2 = call i32 (i8*, ...) @printf( i8* %tmp1 ) nounwind
      ret i32 0
  }
  ````

  非常像汇编，启用无限量的寄存器(%0, %1, ...)。有3中模式，human-readable assembly format，in-memory format for frontent以及a dense bitcode format for serializing。

- 同名static变量如何进行链接https://stackoverflow.com/a/2760565/5163915

  编译器不把static变量保存在symbol table中，他们只是被链接的module的部分内存。换句话说，static变量不会被暴露在linker下。

- 问了一下IR的无限寄存器怎么映射到x86的有限寄存器，也就是上面提到的register allocation

  如果对怎么写这个玩意儿感兴趣的话，可以看看这里<https://github.com/nael8r/How-To-Write-An-LLVM-Register-Allocator>。竟然是人家的本科毕设...

  因为我那个时候连IR是啥都模糊，这个问题就被转化为了一个有点像LRU和LFU的问题，因为我就已经晕了...所以瞎答的。

  LRU应该是用一个hash存节点。一个双向链表保存节点。

  LFU要用3个hash，第一个存key的value和frequency，第二个存每个frequency对应的双向链表。第三个存每个key对应的一个节点的位置。还需要维持一下最小频率。

总结一下，虽然啥都不会...问得我一脸懵逼接近崩溃...但是冷静下来整理了一下知识还是觉得这次面试学会了不少东西，还是挺有趣的。

## Reference

除去上面提到的链接

1. https://blog.csdn.net/simple_the_best/article/details/77170760