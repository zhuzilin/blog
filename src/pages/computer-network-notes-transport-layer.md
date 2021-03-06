---
title: 计算机网络阅读笔记-- Transport Layer
date: 2019-07-15 5:23:00
tags: ["network"]
---

本文为阅读*Computer Networking: A Top-Down Approach (7th Edition)*的阅读笔记，估计会比较没有条理，只是我比较喜欢在看书的时候旁边随手记两笔。既然读的是电子书，自然笔记也得是。

在谈及TCP和UDP之前，先说一下transport layer和network layer的区别。transport layer是process之间的沟通，而network layer是host之间的。network layer就像是邮政系统，把信从一个房子发到另一个房子，而transport layer就是递给这个房子里住的指定的人。顺便一提，application layer是用来解释密文信里头的东西是啥用的。互联网的network layer是IP(Internet Protocol)。IP服务是一种best-effort delivery service，也就是其尽力去送达，但是不做保证，也就是unreliable service。TCP和UDP的最主要的工作就是拓展IP，将其从host-to-host变成process-to-process，这种工作也称为transport-layer multiplexing和demultiplexing。

我们用把transport-layer packet称为segment，也常常称作datagram。

## Multiplexing and Demultiplexing

每个host都会有一个或多个socket。transport layer会把数据送达至一个中间(intermediate) socket。每个socket都会有一个id。把数据送到正确的socket就称为demutiplexing，把不同socket的数据集合起来并包装上不同的header以传给netiwork layer发送的过程就成为mutiplexing。

## UDP

UDP(User Datagram Protocol)基本就是做一个transport protocol能做的最简单的事。除了进行multiplexing/demultiplexing和检查错误意外，UDP做任何事。事实上，如果一个应用打算使用UDP，基本上就是directly talk with IP。UDP把信息填上source和destination的端口号与其他两个东西，之后就传给IP了。注意和TCP不一样，没有握手这一说，所以UDP也被称为connectionless。

Application layer那部分提到过，DNS用的就是UDP（这也是为什么可以污染233），如果没收到回复就重发。

UDP比TCP强的理由是

- Finer application-level control over what data is sent, and when

  TCP有congestion control，需要等之前的收到了才会发现在的。

- No connection establishment

  不需要3次握手，快很多。

- No connection state

  TCP有recieve and send buffer，congestion-control parameter等等。这使得同样的服务UDP可以支持更多client。

- Small packet header overhead

  TCP的header 20 bytes，UDP的header只有8 byte

一下是一些常见的服务

![UDP or TCP](https://i.imgur.com/G1dCgFU.png)

不过虽然现在大家都这么用，因为UDP没有congestion control，streaming用UDP可能会导致其他UDP的loss rate提高以及TCP的堵塞（因为整体的网络资源一样）。

### UDP Segment Structure

![UDP segment](https://i.imgur.com/8NxZz7n.png)

application data部分顾名思义，就是存需要的东西的，比如DNS村的就是query message或者response message。除去这栏，其他的只有4个，每个2byte。port的两格就是两边的端口号，length表示整个segment的长度，因为每个UDP segment的长度可能不同的。checksum就是用来差错的。

### UDP checksum

checksum的计算方法是把整个segment的所有16bit word都加起来，再做1's complement（0变1，1变0）。然后检查的方法就是把带上checksum的所有16bits word加起来，最后会是1111111111111111才对。注意UDP无法复原错误，所以一般就是把错误的segment扔掉了，或者是把仍然传给应用，但是附带一个warning。

## TCP

### TCP connection

TCP是connection orienrated，再交换信息之前，必须先握手。这个connection是duplex的，也就是可以双向同时传。下面看一下建立连接的过程：

#### 三次握手

![handshake](https://raw.githubusercontent.com/HIT-Alibaba/interview/master/img/tcp-connection-made-three-way-handshake.png)

- client发送一个SYN为1的包，指明客户端打算连接的服务器端口，在sequence number字段里面写入初始序列号X，发送完毕之后client进入`SYN_SEND`状态

- server发回确认包(ACK)，这其中SYN和ACK均为1。服务器选择自己的ISN序列号放在sequence number里面。同时把acknowledge number设置为ISN+1。发送后，server处于`SYN_RCVD`状态。

- 客户端再次发送确认包(ACK)，SYN标志位为0，ACK为1，并在acknowledge部分写入客户的sequence number+1。在数据部分写入ISN+1。

  client发送之后会进入`ESTABLISHED`状态，服务器接收到之后也会进入`ESTABLISHED`状态。握手结束。

#### SYN攻击

向服务器发送大量随机IP的SYN包，建立很多半连接状态（第二次握手后）的连接，从而让服务器不停重发，占用未连接队列，正常SYN请求被丢弃，导致目标运行缓慢。

检测方法：如果服务器有大量半连接状态，且IP随机。

防御方法：（不能被阻止）

- 缩短超时时间(SYN timeout)
- 增加最大半连接数
- 过滤网关服务
- SYN cookies技术 ？？？

#### 四次挥手

断开连接需要4次挥手：

![wave](https://raw.githubusercontent.com/HIT-Alibaba/interview/master/img/tcp-connection-closed-four-way-handshake.png)

- 第一次，FIN=1, seq=x，客户端发送并进入`FIN_WAIT_1`状态。表示没有数据要继续发了。

- 第二次，ACK=1, ACKnum=x+1，服务器发送并进入`CLOSE_WAIT`，客户端收到后进入`FIN_WAIT_2`，表示接收到了关闭连接的请求，没有准备好关闭连接。

- 第三次，FIN=1, seq=y，服务器准备好关闭连接时，向客户端发送关闭连接请求.发送后服务器进入`LASK_ACK`状态，等待客户端最后一个ACK。

- 第四次，ACK=1, ACKnum=y+1，客户端接收到关闭请求，发送一个确认包，并进入`TIME_WAIT`状态，等待可能出现的要求重传的ACK包。

  服务器接收到之后，关闭连接，进入`CLOSED`。客户端等待过了某个固定时间，没有收到服务端`ACK`认为已经正常关闭，也进入`CLOSED`。

### TCP Segment Structure

![TCP segment](https://i.imgur.com/lX7dOWN.png)

可以看出，TCP的segment的确复杂了很多。除去UDP也有的两个port，checksum以外，我们来依次介绍：

- 32位 sequence number和32位acknowledgement number是用于实现reliable data transfer的，之后会讲到。
- 16位receive window是用于flow control的。之后我们会看到，其作用为显示receiver愿意接受的bytes数量???
- 4位的header length表示了TCP的header length。因为有option，所以长度不固定。
- flag field有6位。
  - ACK: 表述acknowledge number时valid的（segment包含一个成功接收了的segment的acknowledgement field）。
  - RST, SYN, FIN用于连接的建立和断开。
  - CWR和ECE用于explicit congestion nofitication。
  - PSH表示接受者应该理解把数据传给upper layer (应用层)
  - URG表示数据中又被发送端的application layer标记为urgent的。（实际上PSH和URG并没有被利用）

#### Sequence number and acknowledgement number

用于可靠传输的。

sequence时基于byte的序号而不是segment的序号的。如果每个segment长1000byte，那么1号的sequence number时0，2号是1000 。

acknowledge number是期待的收到的sequence number的下一byte。比如B收到了A发送的0-535, 900-100，那么会返回acknowledge number 536。

对于不是按顺序到达的segment，因为TCP RFC没有规定，所以可以

- 扔掉这些segment
- 存下来，等着中间的补齐（实际上用这种）

server和client都会孙吉选一个initial sequence number（ISN），随机是为了减少之前的还没传到的segment的影响。

### Reliable Data Transfer

#### timeout

建议用一个retransmission timer，即使又多个传输但是没有acknowledge segments。大致就是timeout就会重新传没有被确认的segment中sequence number最小的，并重启timer。

timeout时间是两倍的EstimatedRTT和DevRTT。用两倍是为了方式congestion，因为可能一倍因为阻塞发不到，那么重发会加重阻塞。

#### duplicated ACK

重发同一个acknowledge。因为中间掉了一个可能会导致多个duplicate ACK，所以一般会等收到了几个再重发(3次)。

#### Go-Back-N or Selective Repeat

两者都是一个window sliding method，这个窗口时为了方式接受方的缓存不够大，导致溢出。

- Go-Back-N: 一次被允许最多发N个未被确认的segment。重发时一次发N个。在收到这N个之前窗口不滑。
- Selective-Repeat: receive有一个buffer存放收到的但是out of order的segment。窗口随时滑。可以看这个视频<https://www.youtube.com/watch?v=Cs8tR8A9jm8>

### Flow Control

TCP会把按顺序接受的正确的segments放在receive buffer里面。但是如果app处理数据太慢，可能会导致overflow。所以TCP提供了flow control service。有一个receive buffer，这个东西如果满了就不能发送了。