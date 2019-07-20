---
title: 我的nginx笔记
date: 2019-05-02 9:49:00
tags: ["中文", "nginx", "web"]
---

由于我已经无数次的查过ngnix相关的内容以及像反向代理这样的东西了，每次过了一两个月就忘得一干二净，所以和git一样，我自己记录一份可以直接上手的教程。使用的主要参考是nginx的[beginner's guide](<http://nginx.org/en/docs/beginners_guide.html>)。

nginx有一个master进程和多个worker进程。master进程的任务是read and evaluate configuration并maintain work进程。worker进程则负责实际的请求。nginx采用的是event-based model与操作系统相关的机制来高效地在worker进程中分配request。

配置文件`nginx.conf`默认放在`/user/local/nginx/conf`， `/etc/nginx`， `/usr/local/etc/nginx`中的一个地址下面。

安装nginx很简单，就是直接运行以下的命令就好了：

```bash
sudo apt-get install nginx
```

然后对其基本的指令就是

```bash
sudo service nginx {start|stop|restart|reload|force-reload|status|configtest|rotate|upgrade}
```

### Configuration Basics

nginx的配置文件和C有点像，支撑被称为directives，可以有单行以";"结束的，或者是由"{}"包住的块。如果一个directive里面包含其他的directive，就被称为context（如events, http, server, location）。最外面的directive被称为main context。

### Serving Static Content

web server的一个重要功能就是serving out files（如图片与static HTML），依据request的类型，文件会从不同地址被served：`/data/www`可能包含HTML，`/data/images`可能包含图片。

在`/data/www`中放一个`index.html`之后，在配置文件中加上：

```nginx
http {
    server {
        location / {
    		root /data/www;
		}
        location /images/ {
    		root /data;
		}
    }
}
```

注意一般会有好多个server，每个对应不同的端口号和server names。默认是http，也就是port 80。

然后reload就可以了。

### Setting Up a Simple Proxy Server （反向代理）

server的另一个常见用法是设定proxy server，也就是当server接收到request的时候，会传给proxied servers，把他们返回的结果返回给client。我们这里做一个很简单的例子：

```nginx
server {
    listen 8080;
    root /data/up1;

    location / {
    }
}

server {
    location / {
        proxy_pass http://localhost:8080/;
    }

    location ~ \.(gif|jpg|png)$ {
        root /data/images;
    }
}
```

上面的`~ \.(gif|jpg|png)$`表示的是正则表达式，nginx的匹配顺序是：

>When nginx selects a `location` block to serve a request it first checks[location](http://nginx.org/en/docs/http/ngx_http_core_module.html#location) directives that specify prefixes, remembering `location` with the longest prefix, and then checks regular expressions. If there is a match with a regular expression, nginx picks this `location` or, otherwise, it picks the one remembered earlier.

### Load balancing

这部分来自[Using nginx as HTTP load balancer](http://nginx.org/en/docs/http/load_balancing.html)

```nginx
http {
    upstream myapp1 {
        server srv1.example.com;
        server srv2.example.com;
        server srv3.example.com;
    }

    server {
        listen 80;

        location / {
            proxy_pass http://myapp1;
        }
    }
}
```

上游有3个，默认使用round robin。还有其他的几种方式。

