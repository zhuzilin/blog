---
title: 计算机网络阅读笔记
date: 2019-07-15 5:23:00
tags: ["network"]
---

本文为阅读*Computer Networking: A Top-Down Approach (7th Edition)*的阅读笔记，估计会比较没有条理，只是我比较喜欢在看书的时候旁边随手记两笔。既然读的是电子书，自然笔记也得是。

## HTTP

Web page consists of objects. An object is simply a file.

HTTP用TCP作为传输层。client会先去和server发起一个TCP连接，当链接完成的时候，就会

persistent connnection: use the same TCP connection

non-persistent: use separate TCP connection

### HTTP non persistent

HTTP既可以persistent又可以non-persistent，默认是persistent。

输入网址`http://www.someSchool.edu/someDepartment/home.index`后

1. HTTP client会向server `http://www.someSchool.edu/`的80端口发起一个TCP连接。
2. HTTP client通过socket向server发送HTTP request。request中包含`/someDepartment/home.index`。
3. server通过socket处理request，并从其RAM或者disk中获取`/someDepartment/home.index`，把这个object包在HTTP response message中，并通过socket发回client。
4. HTTP server告诉TCP关闭TCP connection（但是TCP实际上会在确认client收到结果的时候断掉链接。）
5. HTTP client收到response，TCP中断。client会从repsonse message中提取出index.html。在html文件中发现了多个图片，然后重复1-5来获取图片。

现代浏览器可以有一定程度上的并行，大多数浏览器可以同时并行5到10个TCP。

### HTTP persistent

如果使用non-persistent的链接，那么每次都需要一个新的链接，TCP的buffer需要重新被分配，TCP variables需要被保存。当请求数量很多时，这会给server很大的负担。而且每个object都需要2个RTT（round trip time）（一个是用来initiate TCP，另一个用来request与response），所以non-persistent会有更大的延迟。

HTTP 1.1有了persistent connections。server会在send a response之后保持TCP链接。之后同一个client和server的request和response都会用同一个TCP，直到一定时间没有用，会超时断掉。

HTTP 2基于HTTP 1.1允许multiple requests and replies to be interleaved in the same connection以及一个prioritizing HTTP message requests and replies within this connection.

### HTTP Message Format

request message的例子

```http
GET /somedir/page.html HTTP/1.1
Host: www.someschool.edu
Connection: close
User-agent: Mozilla/5.0
Accept-language: fr
```

用ASCII写的。the last line is followed by an additional carriage return and line feed.

第一行叫request line，包含method，url和HTTP version。

后面几行叫header line。首先是Host，

> You might think that this header line is unnecessary, as there is already a TCP connection in place to the host. But, as we’ll see in Section 2.2.5, the information provided by the host header line is required by Web proxy caches

Connection: close表示不需要persistent connections

User-agent指browser的类型，这一行的好处是server可以选择给不同的agent不同的response

Accept-language: 语言，比如user可能更喜欢object的法语版本。

![http request](https://imgur.com/41ij8Hz.png)

对于GET的参数，就是会出现在url中（如`www.somesite.com/animalsearch?monkeys&bananas`）。

response message的例子

```http
HTTP/1.1 200 OK
Connection: close
Date: Tue, 18 Aug 2015 15:44:04 GMT
Server: Apache/2.2.3 (CentOS)
Last-Modified: Tue, 18 Aug 2015 15:11:03 GMT
Content-Length: 6821
Content-Type: text/html

(data data data data data ...)
```

仍然是3部分，status line, header lines, entity body。

status line: http版本与status code

header: Connection告诉client，server即将关闭连接，last-modified指Object被上次修改的时间。

![http request](https://imgur.com/rcDmqzq.png)

常见的status code：

- 200 OK: 成功
- 301 Moved Permanently: requested object has been permanently moved; the new URL in Location (in header)
- 400 Bad Request: the request could not be understood by the server
- 404 Not Found: the request document does not exist on this server
- 505 HTTP Version Not Supported: the requested HTTP protocal version is not supported by the server.

### Cookies

HTTP server is stateless，因为stateless能允许高并发。为了计入一些状态，如authentication，HTTP从cookies。

cookies主要有4个组成部分：

(1) a cookie header line in the HTTP response message; 

(2) a cookie header line in the HTTP request message; 

(3) a cookie file kept on the user’s end system and managed by the user’s browser; 

(4) a back-end database at the Web site.

第一次访问网站的时候，网站会在db中创建一条信息，并返回一个unique identification number。response中就会加一个`Set-cookie:`，如：

```
Set-cookie: 1678
```

brower收到cookie之后，会在一个special cookie file中加一行，记录了hostname和identification number。之后的每次访问，browser都会查看这个file，并把identification number加在request header中，如：

```
Cookie: 1678
```

db用这个数字来找到用户信息。用户信息可能不是其用户名之类的，而是一些用户行为。如amazon用cookie记录购物车。如果用户注册过，可以把db中的entry和用户名啥的联系起来。

不过cookie有invasion of privacy的问题。

### Web Caching

web caching也被称为Proxy server，is a network entity that satisfies HTTP requests on the behalf of an origin Web server. Web cache有自己的硬盘可以保存最近的数份request objects。其主要过程是

1. browser和web cache建立一个TCP
2. web cache检查request中提到的object是不是已经本地存储了，如果是就返回，不然就和origin server建立TCP，origin server把object返回给web cache。
3. web cache收到object之后，本地保存一份，并发送一份给browser。（注意用的是最开始的链接）

Typically a Web cache is purchased and installed by an ISP (Internet Service Provider). 

有两个使用web caching的原因

- can substantially reduce the response time
- can substantially reduce traffic on an institution's access link to the Internet.

#### Conditional GET

HTTP有一个机制来让cache取人object是up to date的，这个就是conditional GET。

conditional GET是指web cache像web serer发送的时候会加上一行

```http
GET /fruit/kiwi.gif HTTP/1.1
Host: www.exotiquecuisine.com
If-modified-since: Wed, 9 Sep 2015 09:23:24
```

然后如果没有改变，web server会返回

```http
HTTP/1.1 304 Not Modified
Date: Sat, 10 Oct 2015 15:39:29
Server: Apache/1.3.0 (Unix)

(empty entity body)
```

cache就可以返回原来的那份。

## SMTP (Simple Mail Transfer Protocol)

为了讲解SMTP的基本操作，我们来看一下如果Alice要给Bob发一封邮件，会过几个步骤。

1. Alice用其user agent给Bob的email address发邮件
2. Alice的user agent把message发给其mail server的message queue中。
3. client side of SMTP，跑在Alice的mail server上，看到message queue中的信息，像另一个SMTP server开启一个TCP链接。
4. 完成SMTP handshaking之后，client把Alice的信息发给server。
5. Bob的mail server收到信息，把信息放在mailbox中
6. Bob查看user agent的时候会读到mail server中的mail box

SMTP是port 25。然后handshake的方式是：

1. the SMTP client indicates the email address of the sender and the e-mail address of the recipient.
2. the SMTP client send message.
3. The client then repeats this process over the same TCP connection if it has other messages to send to the server; otherwise, it instructs TCP to close the connection.

```
S: 220 hamburger.edu
C: HELO crepes.fr
S: 250 Hello crepes.fr, pleased to meet you
C: MAIL FROM: <alice@crepes.fr>
S: 250 alice@crepes.fr ... Sender ok
C: RCPT TO: <bob@hamburger.edu>
S: 250 bob@hamburger.edu ... Recipient ok
C: DATA
S: 354 Enter mail, end with ”.” on a line by itself
C: Do you like ketchup?
C: How about pickles?
C: .
S: 250 Message accepted for delivery
C: QUIT
S: 221 hamburger.edu closing connection
```

注意上面的C和S后面是真是的传输内容。C是client，S是server。这个例子是`crepes.fr`发给`hamburger.edu`。

client有5个指令：`HELO`(hello), `MAIL FROM`,`RCPT TO`, `DATA`和`QUIT`。这些指令的名字自己就可以解释了。可以通过

```bash
telnet serverName 25
```

并按上述顺序输入client指令来模拟发送邮件。

### SMTP与HTTP的对比

1. HTTP是pull protocol，也就是web server load information，client需要的时候pull。

   SMTP是push protocol，sending mail server pushes the file to receiving mail server。

2. SMTP只能用7 bit ASCII。

### Mail Message Format

这个是user agent发给mail server的还是什么别的

```
From: alice@crepes.fr
To: bob@hamburger.edu
Subject: Searching for the meaning of life.

(data data data)
```

### Mail Access Protocols

Bob 怎么从mail server中读取mail呢？注意Bob不能用SMTP来获取，因为SMTP是push而不是pull。常见的协议有Post Office Protocol—Version 3 (POP3)和Internet Mail Access Protocol (IMAP)。

#### POP3

POP3很简单。先在mail server的110端口创建TCP连接。当TCP连接创建，POP3有3个阶段：authorization, transaction and update。

1. authorization: the user agent sends a username and password (in clear) to authenticate the user
2. transaction: agent retrieves messages and mark messages for deletion, remove deletion marks and obtain mail statistics.
3. update: after client has issued the quit command, ending the POP3 session. At this point, the mail server deletes the messages that were marked for deletion.

mail server会返回`+OK`或`-ERR`作为回应。

authorization phase: 

```
telnet mailServer 110
+OK POP3 server ready
user bob
+OK
pass hungry
+OK user successfully logged on
```

transaction phase:

```
C: list
S: 1 498
S: 2 912
S: .
C: retr 1
S: (blah blah ...
S: .................
S: ..........blah)
S: .
C: dele 1
C: retr 2
S: (blah blah ...
S: .................
S: ..........blah)
S: .
C: dele 2
C: quit
S: +OK POP3 server signing off
```

有`list`, `retr`, `dele`和`quit`这样的指令。

#### IMAP

如果用户需要在server里创建一个文件夹存放email，那么POP3就不行了。IMAP就可以实现这样的功能。IMAP比POP3要复杂很多。

> An IMAP server will associate each message with a folder; when a message first arrives at the server, it is associated with the recipient’s INBOX folder. The recipient can then move the message into a new, user-created folder, read the message, delete the message, and so on.
>
> The IMAP protocol provides commands to allow users to create folders and move messages from one folder to another

Another important feature of IMAP is that it has commands that permit a user agent to obtain components of messages. 可以只获取header。

#### Web-Based E-mail

我们现在用的gmail啥的都是直接用HTTP来retrieve的。不过中间还是SMTP。

## DNS (Domain Name System)

用于把hostname转化为IP address。具体步骤如下：

1. the same user machine runs the client side of the DNS application
2. brower从URL中提取出hostname，比如`www.someschool.edu`并把hostname传给DNS的client side。
3. DNS client给DNS server发送一个包含hostname的query。
4. DNS最终会收到一个回复，包含了IP
5. browser收到IP地址之后，就可以用IP address来和server确立TCP连接了。

虽然DNS会导致延迟，但是幸运的是，需要的IP往往就在很近的DNS server上，所以就相对减少了平均延迟。

DNS还提供其他的重要的服务：

- Host aliasing: 一个有着复杂hostname的host可以又多了alias。
- Mail server alias：邮箱的地址最好能比较好记，所以DNS可以由mail applicatioin出发以获得canonical hostname fo ra supplied alias hostname as well as the IP address of the host.
- Load distribution：perform load distribution among replicated servers.

如果只有一个DNS server的话，会出现如下的问题：

- A single point of failure: 如果DNS crashes，整个internet crash
- Traffic volume
- Distant centralized database: qurries可能需要横渡重洋

- Maintenance: 会updated frequently to account for every new host

![DNS](https://imgur.com/ELPiv7g.png)

- root DNS servers: 世界上有400个root name server。中国只有不到10个。
- top-level domain (TLD) servers: 为每个top-level domains，如com, org, net, edu, gov，或者是country TLD, uk, cn, fr, ca.

- authoritative DNS server: Every organization with publicly accessible hosts (such as Web servers
  and mail servers) on the Internet must provide publicly accessible DNS records that map the names
  of those hosts to IP addresses.

还有一种重要的DNS server，是local DNS server。它不属于hierarchy of servers，然而是DNS的核心部分。每个ISP都有一个local DNS server，这里之后咋用的懒得记了...

![local DNS server](https://imgur.com/BdHzFAG.png)

#### DNS caching

当一个DNS server收到一个DNS reply的时候，它会把这个mapping cache到本地存储中。

### DNS Records and Messages

一个DNS的resource record是这样的：

```
(Name, Value, Type, TTL)
```

其中TTL表四resource的存储时间，决定什么时候应该从cache中移除。在接下来的讨论中，先不考虑这个。

- `type=A`, `Name`就是hostname, `Value`是IP address。所以一个type A record提供了标准的hostname-to-IP address mapping。

  `(relay1.bar.foo.com, 145.37.93.126, A)`是一个type A record。

- `type=NS`, `Name`是domain，如`foo.com`，`Value`是hostname of an authoritative DNS server that knows how to obtain the IP addresses for hosts in the domain。

  `(foo.com, dns.foo.com, NS)`是一个type NS record。

- If `type=MX` , then Value is the canonical name of a mail server that has an alias hostname Name .
  As an example, `(foo.com, mail.bar.foo.com, MX) `is an MX record.

#### DNS Messages

