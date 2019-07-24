---
title: Install .NET Core on RHEL7
date: 2019-06-13 11:24:00
tags: ["dotnet", "RHEL"]
---

因为工作需要把一个项目从.NET Framework移到.NET Core，而公司给配的工作站是redhat，所以在这里记录一下安装的过程。

首先是下载，默认的`yum`下载出现了subscribe相关的问题，不知道该怎么解决，所以就采用了下载binary的方式。从[这里](https://dotnet.microsoft.com/download/dotnet-core/2.2)找了RHEL6的binary，并按照对应的指令运行：

```bash
mkdir -p $HOME/dotnet && tar zxf dotnet-sdk-2.2.300-rhel.6-x64.tar.gz -C $HOME/dotnet
export DOTNET_ROOT=$HOME/dotnet
export PATH=$PATH:$HOME/dotnet
```

注意后面的两行是单次使用bash的时候用的，需要每次打开terminal都能直接工作，需要把这两行附在`~/.bashrc`结尾。

完成了以上的步骤之后在terminal里面就可以运行`dotnet`检查是否成功了。但是如果需要运行`dotnet new`这样实质性的东西还有一些依赖库需要装，不然会出现Globalization相关的问题。具体步骤在[这里](https://github.com/dotnet/core/blob/master/Documentation/build-and-install-rhel6-prerequisites.md)有挺清楚的描述。主要就是安装CURL和ICU这两个库。

然后就可以跟着.NET Core的get start跑一下hello world了！
