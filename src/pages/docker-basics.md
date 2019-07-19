---
title: docker basics
date: 2019-07-10 11:54:00
tags: ["docker", "container"]
---

本文假设读者已经正确安装了docker。同时，下述指令运行的平台为RHEL 7（因为领英只给我配了这么台东西....）。以及基本指令来自于《第一本docker书——修订版》。

## docker常用指令

检查是否正常工作。

```bash
$ sudo docker info
```

查询系统的container列表：

```bash
$ sudo docker ps -a
```

查看所有容器的运行状态：

```bash
$ sudo docker stats
```

这个指令可以后面跟一个或多个container名字来检测这些。

## container相关

运行容器：

```bash
$ sudo docker run --name terminal -i -t ubuntu /bin/bash
$ /#
```

`--name`给container命名

`-i`保证容器中STDIN是开启的（不懂是什么意思）

`-t`为容器分配一个伪tty终端（不懂什么意思）

在推出了上面运行开启的ubuntu里的bash之后，在bash中运行`exit`会推出这个bash，同时退出这个container。

重新启动：

```bash
sudo docker start terminal
```

重新启动会按照最开始`docker run`的参数来运行，所以也会重新启动出一个交互式shell。如果需要连接这个shell，可以使用：

```bash
sudo docker attach terminal
```

来重新附着到容器的会话。

如果要使用守护进程（daemon），也就是没有交互，在后台运行的进程，那么要加入`-d`标记

```bash
sudo docker run --name daemon_hw -d ubuntu /bin/sh -c  "while true; do echo hello world; sleep 1; done"
```

检查容器的log，可以：

```bash
sudo docker logs daemon_hw
```

`logs`还有一些如`-f`之类的flag。

查看容器内部进程可以用：

```bash
sudo docker top daemon_hw
```

停止容器可以：

```bash
sudo docker stop daemon_hw
```

自动重启容器：

```bash
sudo docker run --restart=always --name daemon_always -d ubuntu /bin/sh -c  "while true; do echo hello world; sleep 1; done"
```

这样的话不管出了什么问题，都会重启。attach之后ctrl+c或者`docker stop`就不会restart了。

或者可以设置`--restart=on-failure:5`，最多重启5次。

在restarting状态下的container可以直接被删除。

```bash
sudo docker container rm daemon_always
```

## image相关

在书的第四章最开头有对image和container的结构的简介。

本地的所有image和container都在`/var/lib/docker`之下。

列出所有镜像：

```bash
sudo docker image
```

从registry获取image

```bash
sudo docker pull ubuntu:12.04
```

用`docker search`来检索镜像

```bash
sudo docker search puppet
```

### 构建image

可以先在container里面安装如说`sudo apt-get -y install apache2`。然后退出container，再

`sudo docker commit [container-id] [publish-name] `

不过更常见的是用`Dockerfile`

首先在希望publish的文件夹中创建一个`Dockerfile，下面是一个Dockerfile的例子

```dockerfile
# Version: 0.0.1
FROM ubuntu:14.04
MAINTAINER zhuzilin "zhuzilinallen@gmail.com"
RUN apt-get update && apt-get install -y nginx
RUN echo 'Hi, I am in your container' \
    >/user/share/nginx/html/index.html
EXPOSE 80
```

docker会先

- 从基础镜像(ubuntu)运行一个容器
- 执行一条指令，对容器做出修改
- 执行类似`docker commit`的指令，提交一个新的镜像层
- 基于新的镜像运行一个新容器
- 执行下一条指令
- ...

所以即使build失败了，也会生成某个镜像，可以对这个镜像进行debug来查找错误。

默认会在`/bin/sh -c`来执行`RUN`的参数，如果平台不支持shell或者不希望用shell运行，可以使用`exec`格式，如

```dockerfile
RUN ["apt-get", "install", "-y", "nginx"]
```

`EXPOSE`会指令端口。但是出于安全按原因，docker并不会在运行镜像的时候自动打开这个端口，而是需要在`docker run`中设置。

之后就可以build这个镜像了

```bash
sudo docker build .
```

docker会把中间过程中生成的image作为缓存，以便下一次build使用，如果要去掉缓存，可以加上`--no-cache`标记。

如果别的Dockerfile的顶部指令相似，就会使用缓存。

之后运行这个image

```bash
sudo docker run -d -p 80 --name nginx [image-id] nginx -g "daemon off;"
```

这里的`-p`也设置了80，然后可以通过`sudo docker ps -l`或者`sudo port nginx`来查看端口对应。

或者可以在运行的时候设置对应

```bash
sudo docker run -d -p 8080:80 --name nginx [image-id] nginx -g "daemon off;"
```

这样就把容器的80端口绑定在了宿主机的8080端口上。这时访问`localhost:8080`就可以显示出`Hi, I am in your container`了。

在`run`指令中还有一个非常使用的`-P`指令，用于把所有的容器内公开的指令随即绑定到某一个随机端口上。

### Dockerfile的其余指令

- CMD

  容器被启动时运行的指令。例如：

  ```dockerfile
  CMD ["/bin/bash", "-l"]
  ```

- ENTRYPOINT

  `docker run`命令行中指定的任何参数都会被当做参数再次传递给ENTRYPOINT指令中指定的命令。如：

  ```dockerfile
  ENTRYPOINT ["/usr/sbin/nginx"]
  ```

  甚至可以像`CMD`一样加入参数

  ```dockerfile
  ENTRYPOINT ["/usr/sbin/nginx", "-g", "daemn off;"]
  ```

  注意CMD和ENTRYPOINT的最大区别是，CMD是会被`docker run`里面的参数覆盖的，而ENTRYPOINT只会把参数附在其后面。所以也可以同时有ENTRYPOINT和CMD

  ```bash
  ENTRYPOINT ["/usr/sbin/nginx"]
  CMD ["-h"]
  ```

- WORKDIR

  用来在从镜像创建新容器的时候，在容器内部设置一个工作牡蛎，`ENTRYPOINT`和`/`或`CMD`指定的程序会在这个目录下执行。如：

  ```dockerfile
  WORKDIR /opt/webapp/db
  RUN bundle install
  WORKDIR /opt/webapp
  ENTRYPOINT ["rackup"]
  ```

  就是先把工作目录设为`/opt/webapp/db`，运行`bundle install`，再把工作目录设为`/opt/webapp`，运行ENTRYPOINT。

  注意在运行的时候可以用`docker run`的`-w`标记来覆盖工作目录。

- ENV

  设置环境变量，设置后后续任何RUN都可以用。

  ```dockerfile
  ENV RVM_PATH /home/rvm
  ```

  之后运行`RUN gem install unicorn`就会实际运行`RVM_PATH=/home/rvm gem install unicorn`。

  也可以设置多变量：

  ```dockerfile
  ENV RVM_PATH /home/rvm RVM_ARCHFLAG="-arch i386"
  ```

  在别的dockerfile指令中也可以直接使用

  ```dockerfile
  ENV TARGET_DIR /opt/app
  WORKDIR $TARGET_DIR
  ```

  在container中运行`env`可以看到我们设置的环境变量。

  也可以用`docker run`的`-e`传递环境变量。

- USER

  指定该镜像会以什么样的用户去运行。（不太明白）

- VOLUME

  像基于镜像创建的容器添加卷。一个卷是可以存在与一个或多个容器内的特定目录。用于多个容器共享资源。

- ADD

  将构建环境下的文件和目录复制到镜像中。如：

  ```dockerfile
  ADD software.lic /opt/application/software.lic
  ```

  就是把本地的`software.lic`复制到镜像中的`/opt/application/software.lic`。

  ADD也可以加入URL格式的文件。如`http://wordpress.org/latest.zip`。

  注意如果加入`gzip, bzip2, xz`等文件时，会自动解压。

- COPY

  类似ADD，不过只赋值，不会文件提取与解压。如：

  ```dockerfile
  COPY conf.d/ /etc/apache2/
  ```

- LABEL

  给镜像添加元数据，如：

  ```dockerfile
  LABEL version="1.0"
  LABEL location="New York" type="Data Center" role="Web Server"
  ```

  使用`docker inspect`的时候可以看到label对应的json。

- STOPSIGNAL

  估计用不上...

- ARG

  `docker build`的时候可以传入的参数。可以用`docker build`中的`--build-arg`指定。注意不要穿证书或密钥。

- ONBUILD

  给镜像加trigger的，等见过再说吧。



删除镜像，可以用`docker rmi`或者`docker image rm`。

### 用例

真正使用docker还是要靠动手。我创了一个叫[play-with-docker](https://github.com/zhuzilin/play-with-docker)的repo来放自己写的例子。有兴趣的朋友也可以来看看。

