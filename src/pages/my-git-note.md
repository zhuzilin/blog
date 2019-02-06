---
title: 我的git笔记
date: 2019-02-02 9:49:00
tags: ["中文", "git"]
---

使用git也很长时间了，但是使用起来往往是非常机械性的add $\rightarrow$ commit $\rightarrow$ push，遇到了稍微复杂一点的问题就变得晕头转向了。所以在这里整理一版更适合我本人理解的git笔记。内容源自[Pro Git](https://git-scm.com/book/zh/v2)。

## 基础概念

git主要有3个部分，如下图：

![git state](https://git-scm.com/book/en/v2/images/areas.png)

我们将在工作区中修改文件，最终将文件放入.git directory进行版本控制，而暂存区(staging area)作为这两者之间的缓冲，让我们可以更方便的实现一些操作。

在git中，一个文件可能有下图的几种状态：

![file state](https://git-scm.com/book/en/v2/images/lifecycle.png)

可以通过**git status**来检查文件的状态。

## 本地操作

这部分的全部操作仅仅与本地仓库操作相关，与远程仓库无关。

### 初始化

在初次运行git前，需要通过`git config`进行配置，其中配置有三个不同的等级：

1. 使用`--system`选项，更改系统上每一个用户及其仓库的通用配置，在Unix系统上更改`/etc/gitconfig`，windows上更改`mingw32\etc\gitconfig`。
2. 使用`--global`选项，更改当前用户及其仓库的配置，在Unix系统上更改`~/.gitconfig`，windows上更改`C:\User\\$USER\.gitignore`。
3. 无选项，更改当前仓库配置，`.git/config`文件。

当安装完git时，第一件事就是设置用户名称和email，这两个会被加入每一次commit中。

```bash
$ git config --global user.name zhuzilin
$ git config --global user.email zhuzilinallen@gmail.com
```

可以通过`git config --list`来列出所有的配置。

```bash
$ git config --list
user.name=zhuzilin
user.email=zhuzilinallen@gmail.com
color.status=auto
...
```

可能会出现重复的变量名，因为会将多个配置文件全部读入，后面出现的值会覆盖前面的值。

也可以通过如下方式只查询唯一的配置。

```bash
$ git config user.name
zhuzilin
```

而对于一个项目来说，初始化即为在项目目录运行

```bash
$ git init
```

### 加入新文件

从这部分开始，我们会讨论一下几个比较常用的指令，并与上方的文件状态图片相对应。

首先是把一个untracked文件变为tracked，对应于图中的第一个箭头。

例如，对于一个初始化的项目，在我们加入了一个名为readme的文件之后，运行`git status`会是这样的：

```bash
$ git status
On branch master
Your branch is up to date with 'origin/master'.

Untracked files:
  (use "git add <file>..." to include in what will be committed)

        readme

nothing added to commit but untracked files present (use "git add" to track)
```

如同提示中所说，将文件加入。就是执行`git add [file]`，如：

```bash
$ git add readme
```

**git status**会变为：

```bash
$ git status
On branch master
Your branch is up to date with 'origin/master'.

Changes to be committed:
  (use "git reset HEAD <file>..." to unstage)

        new file:   readme
```

如果想要**撤销**这一操作，使用`git reset [file]` ，如：

```bash
$ git reset readme
```

**注意**：**不推荐**使用推荐的`git reset HEAD`，因为如果之前没有进行过提交，会出现错误。而在Git 1.8.2中对于`git reset`进行了[修改](https://stackoverflow.com/a/348234/5163915)。

**注意**：`git reset`并**不危险**——它只会修改暂存区域。

**注意**：git不能加入空文件夹。详情见[这里](https://stackoverflow.com/a/115992/5163915)

### 对缓存区的文件进行修改

其次是把一个tracked文件进行修改，或者说从unmodified变成modified，对应第二个箭头。

延续前文，如果我们对readme进行修改，之后运行`git status`会出现：

```bash
$ git status
On branch master

No commits yet

Changes to be committed:
  (use "git rm --cached <file>..." to unstage)

        new file:   readme

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git checkout -- <file>..." to discard changes in working directory)

        modified:   readme
```

如果我们想**撤销**这一操作，使用`git checkout -- [file]`指令，如：

```bash
$ git checkout -- readme 
```

就会取消刚刚的修改。这是`git status`会是：

```bash
$ git status
On branch master

No commits yet

Changes to be committed:
  (use "git rm --cached <file>..." to unstage)

        new file:   readme
```

**注意**：`git checkout -- [file]` 是一个**危险**的命令，这很重要。 你**对那个文件做的任何修改都会消失** - 你只是拷贝了另一个文件来覆盖它。 除非你确实清楚不想要那个文件了，否则不要使用这个命令。

### 将修改后的文件加入缓存区

这里对应第三个箭头。

假设我们已经对readme进行了修改，也就是和上一小节第一次`git status`得到的结果相同的状态。只需要再次使用`git add`就可以把这一次的修改加入缓存区了，如：

```bash
$ git add readme
```

这时再进行`git status`会得到：

```bash
$ git status
On branch master

No commits yet

Changes to be committed:
  (use "git rm --cached <file>..." to unstage)

        new file:   readme
```

注意这个时候如果使用`git reset`会把**两次的add一起取消**，也就是会变为：

```bash
$ git reset readme
$ git status
On branch master

No commits yet

Untracked files:
  (use "git add <file>..." to include in what will be committed)

        readme

nothing added to commit but untracked files present (use "git add" to track)
```

### 把缓存区提交到.git directory

这里对应的是箭头五。

当我们需要进行提交的时候，需要使用`git commit`，如：

```bash
$ git commit -m "add readme"
[master (root-commit) fbf46c5] add readme
 1 file changed, 0 insertions(+), 0 deletions(-)
 create mode 100644 readme
```

这时的`git status`就变得非常干净了：

```bash
$ git status
On branch master
nothing to commit, working tree clean
```

可以用`git log`查看commit记录：

```bash
$ git log
commit fbf46c50db622d2847c3efd26ffd1215869b1bd8 (HEAD -> master)
Author: zhuzilin <zhuzilinallen@gmail.com>
Date:   Sat Feb 2 18:41:54 2019 -0500

    add readme
```

有的时候会发现自己在提交完之后还想要做一些小的修改，但是不想单独列为一个新的commit了，可以使用`git commit --amend`，如对readme进行了新的修改之后，运行：

```bash
$ git add readme
$ git commit --amend -m "another modification"
[master 34b304e] another modification
 Date: Sat Feb 2 18:41:54 2019 -0500
 1 file changed, 0 insertions(+), 0 deletions(-)
 create mode 100644 readme
```

这个时候commit中的log会变为：

```bash
$ git log
commit 34b304e214ddc0f5288527a46ec77d32f1151e8b (HEAD -> master)
Author: zhuzilin <zhuzilinallen@gmail.com>
Date:   Sat Feb 2 18:41:54 2019 -0500

    another modification
```

**注意**，后一次的备注会覆盖前一次的。

**撤销**commit的方式需要进行分类讨论。

如果是**已经进行了多次commit**，如：

```bash
$ git log
commit 080f8ce2189fcdc6a40efefc737a891f31036f0d (HEAD -> master)
Author: zhuzilin <zhuzilinallen@gmail.com>
Date:   Sat Feb 2 18:56:16 2019 -0500

    second commit

commit 34b304e214ddc0f5288527a46ec77d32f1151e8b
Author: zhuzilin <zhuzilinallen@gmail.com>
Date:   Sat Feb 2 18:41:54 2019 -0500

    another modification
```

可以使用指令`git reset HEAD~`，这之后`git log`会变为：

```bash
$ git log
commit 34b304e214ddc0f5288527a46ec77d32f1151e8b (HEAD -> master)
Author: zhuzilin <zhuzilinallen@gmail.com>
Date:   Sat Feb 2 18:41:54 2019 -0500

    another modification
```

而所有上一次的修改会全部退回到工作区，也就是：

```bash
$ git status
On branch master
Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git checkout -- <file>..." to discard changes in working directory)

        modified:   readme

no changes added to commit (use "git add" and/or "git commit -a")
```

而**对于首次commit**，因为不存在`HEAD~`，所以会报错（类似于`git reset HEAD`会出现的问题）。可以使用`git update-ref -d HEAD`来撤销首次commit。对于上面的例子，结果如下：

```bash
$ git update-ref -d HEAD
$ git status
On branch master

No commits yet

Changes to be committed:
  (use "git rm --cached <file>..." to unstage)

        new file:   readme

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git checkout -- <file>..." to discard changes in working directory)

        modified:   readme
```

`git update-ref -d HEAD`会把第一次提交的内容撤回到暂存区。这时如果使用`git log`，会发现已经没有commit了。

### 从.git directory删除文件

这对应着箭头四。

删除文件可以是有两种情况：

1. 从工作区删除掉文件，并希望仓库中也一并删除。
2. 只删除仓库中的文件，仍希望保留当前工作目录的文件。

对于第一种情况，可以把文件从工作区删除后，运行`git add [file]`，或者直接运行`git rm [file]`，这两者都会把删除操作加入缓存区。

```bash
$ git status
On branch master
Changes to be committed:
  (use "git reset HEAD <file>..." to unstage)

        deleted:    readme
```

对于第二种情况，可以通过`git rm --cached [file]`来进行操作，结果如下：

```bash
$ git rm --cached .\readme
rm 'readme'
$ git status
On branch master
Changes to be committed:
  (use "git reset HEAD <file>..." to unstage)

        deleted:    readme

Untracked files:
  (use "git add <file>..." to include in what will be committed)

        readme
```

注意这样之后readme就变为untracked了。

删除的**撤销**方式和前面把文件从缓存区撤销到工作区的方式相同，就不再赘述了。

### 一些其他的常见操作

这里有一些经常会用到的本地操作，特此指出。

#### 移动文件与重命名

Git 并不显式跟踪文件移动操作。 如果在 Git 中重命名了某个文件，仓库中存储的元数据并不会体现出这是一次改名操作。 不过 一些时候，Git会推断出究竟发生了什么。不过，我们可以通过显示的方法进行文件移动或重命名。

具体指令是`git move file_from file_to`或`git move file directory`，如：

```bash
$ git mv readme README
$ git status
On branch master
Changes to be committed:
  (use "git reset HEAD <file>..." to unstage)

        renamed:    readme -> README
```

可以直接把这次操作放入缓存区，并把工作区的readme重命名为README。

**注意**：在这个过程中，不能通过把文件移动到.git repository的并未track的地址中。

由于这个操作的实质就是先删除旧的文件再加入新的文件，所以**撤销**这个操作就是要把删除和加入都进行撤销就好了。

## 分支与分支管理

请查看[Pro Git第三章](https://git-scm.com/book/zh/v2/Git-%E5%88%86%E6%94%AF-%E5%88%86%E6%94%AF%E7%AE%80%E4%BB%8B)。讲的非常清楚，以我暂时的能力只能做到完全赋值这一部分，所以就附上其连接。该部分讲解了Git的分支原理与一些常用的分支管理方案以及rebase。

## 远程操作

### 初始化

远程操作的初始化无非是多了可以直接克隆远程的项目。如：

```bash
$ git clone https://github.com/libgit2/libgit2
```



## 参考文献

1. Chacon S, Straub B. Pro git[M]. Apress, 2014.