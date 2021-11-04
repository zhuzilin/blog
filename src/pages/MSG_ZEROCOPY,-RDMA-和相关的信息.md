---
title: MSG_ZEROCOPY, RDMA 和相关的信息
date: 2021-11-03 22:30:00
tags: ["linux", "network"]
---

在学习 [nccl-fastsocket](https://github.com/google/nccl-fastsocket) 项目的时候，了解到 17 年就并入 linux 内核的 zero copy 设置（`MSG_ZEROCOPY` 和 `SO_ZEROCOPY`）。我个人比较感兴趣的是这个功能的特点以及他和 RDMA 的比较。

部分参考链接：

- Linux Socket 0拷贝特性 https://zhuanlan.zhihu.com/p/28575308

- Linux I/O 原理和 Zero-copy 技术全面揭秘 https://zhuanlan.zhihu.com/p/296207162
- Zero-copy networking https://lwn.net/Articles/726917/
- de Bruijn W, Dumazet E. sendmsg copy avoidance with MSG_ZEROCOPY[J].
- https://kth.instructure.com/courses/12406/pages/optimizing-host-device-data-communication-i-pinned-host-memory
- https://www.kernel.org/doc/html/v4.15/networking/msg_zerocopy.html

## 使用方式

在发送的时候，需要给 socket 以及 `send` 加上对应的 flag：

```c
setsockopt(socket, SO_ZEROCOPY);
send(socket, buffer, length, MSG_ZEROCOPY);
```

这里面有一个细节，就是在 `send` 的时候，对于比较小的数据，不选择 zerocopy 会更快，所以可以单独设置。例如在 nccl-fastsocket 中：

```c++
    if (op == NCCL_SOCKET_SEND && kMinZcopySize > 0 && s >= kMinZcopySize)
      flags |= MSG_ZEROCOPY;
```

然后有一个比较大的修改是，在发送完后，需要读一下 socket 的错误队列，确保包已经发走了：

```c
recvmsg(socket, &message, MSG_ERRQUEUE);
```

这个东西在 nccl-fastsocket 里面是这么用的（简化版本）：

```c++
// 这是一个一直循环的函数
static void* persistentSocketThread(void* args_) {
  ...
  while (true) {
    // 1 个任务用 n 个 socket 发
    for (int i = 0; i < nSocksPerThread; ++i) {
      ncclSocketTaskQueue* tasks = get_task();
      if (tasks->has_active()) {  // 有要发送的任务
        do {  // 把需要发的东西都发了，这里用的是同一个 buffer，即 data
          send(fd, data + t->offset, s, flags);
        } while (...)
        ...
      }

      // poll errqueue for send completion
      if (fd_data->tx_upper > fd_data->tx_lower) {
        // ...
        while (true) {
          int ret = recvmsg(fd, &msg, MSG_ERRQUEUE);
  				if (ret < 0 && errno == EAGAIN) return break;
          // 从错误信息里面判断任务已经进行了多少了...
        }
        // ...
      }
    }
    // ...
  }
}
```

大致就是在发送完，用一个循环来判断是否发送完了。

后面的这个 `recvmsg` 的引入貌似收到个各位知乎大佬们的讨论。

## 底层原理

那么这个 zero copy 具体简化了哪部分呢？

### DMA 和 pin memory

在了解这件事之前，我们需要先知道 DMA 是啥。

在了解 DMA 之前，先得知道不用 DMA 情况下把数据传给 device 是怎么做的。有 programmed I/O 和 Interrupt-initiated I/O 两种。

- 在 programmed I/O 中，会在用户态通过 CPU 指令的方式去一点一点传送数据，在这个过程中 CPU 始终要监测是否传输完毕，不能挂起。
- 在 Interrupt-initiated I/O 中，会在设备准备好接受数据时向 CPU 触发中断。在这个过程中 CPU 不需要参与，在结束后，程序重回用户态，CPU 把 program counter 之类的东西返回来就好了。

那么 DMA 是啥呢？

> DMA is the hardware mechanism that allows peripheral components to transfer their I/O data directly to and from main memory without the need to involve the system processor. Use of this mechanism can greatly increase throughput to and from a device, because a great deal of computational overhead is eliminated.
>
> -- Linux Device Drivers

要注意区分这 3 者之间的关系。首先 interrupt 是和 polling 对应的，前者就是如果出现了事件，事件会通过某种方式（system call）告知 CPU；而 polling system 则是 CPU 一直在轮询事件是否发生/完成。对于 DMA 来说，device 是可以在不告知 CPU 的情况下访问 memory。

这 3 者的对照有一个很好的视频：https://www.youtube.com/watch?v=FzqlPDMy6Bk。

### DMA 的流程以及为什么要用 pinned memory

DMA 是如何发生的呢？以下部分主要摘取自《Linux Device Drivers》。

我们首先考虑软件像内核要数据（`read`）的情况，主要分以下 3 步：

1. 当进程调用 `read`，driver method 会分配 DMA buffer，并指示硬件将数据传给这个 buffer。在这段时间内，进程进入睡眠；
2. 硬件向 DMA buffer 写入数据，并在完成时触发中断；
3. interrupt handle 获取输入数据，并唤醒进程，此时进程就可以读数据了。

其次考虑软件发送数据的过程，这个过程一般是异步的。在这种情况下，驱动会 maintain a buffer，以等待后续的 `read`。这种情况下的传输略有不同：

1. 硬件触发中断以宣称数据到了；
2. interrupt handler 分配 buffer，并告诉硬件把数据放到哪儿；
3. the peripheral device 把数据写入 buffer，并在完成时再次触发中断；
4. The handler dispatches the new data, wakes any relevant process, and takes care of housekeeping.

这种异步处理方式常见于网卡驱动。网卡一般会有一个 circular buffer（被叫做 DMA ring buffer），These cards often expect to see a circular buffer (often called a *DMA ring buffer*) established in memory shared with the processor; each incoming packet is placed in the next available buffer in the ring, and an interrupt is signaled. The driver then passes the network packets to the rest of the kernel and places a new DMA buffer in the ring.

注意，很多 driver 在启动的时候就会分配 buffer，所以上面的分配 buffer 其实是获取之前已经分配好的 buffer。

DMA buffer 的一个主要问题在于，其往往大于 1 个 page，而由于使用的是 ISA 或者 PCI system bus 传输数据，这些总线用的是 physical address，所以 DMA buffer 必须占据连续的多个内存块。

> Pinned memory is virtual memory pages that are specially marked so that they cannot be paged out. They are allocated with special system API function calls. The important point for us is that CPU memory that serves as the source of destination of a DMA transfer must be allocated as pinned memory.

对于 CUDA 来说：

> If a source or destination of a cudaMemcpy() in the host memory is not allocated in pinned memory, it needs to be first copied to a pinned memory. This causes an extra overhead. When we allocate and use pinned memory, we can avoid this extra step and extra overhead. Therefore, cudaMemcpy()is faster if the host memory source or destination is allocated in pinned memory since no extra copy is needed.

其实 pin memory 的关键就是它的物理地址也是不能变的，这样就能让 DMA 连续传输了。这里的 page out 是说，在从 VA 映射到 PA 的时候，VA 是大于 PA 的，也就是说虚拟内存并不能总是映射到物理内存。对于一些暂时不需要的 page，会被临时写入硬盘，变成一个 page file，这个转移过程叫 page out；而从硬盘重新读回内存的这个过程叫 page in。

### RDMA

那么既然说了 DMA，RDMA 又是啥呢？

了解 RDMA 实际上是要对比 RDMA 和普通的 TCP。这个可以看这篇文章：

- Balaji P, Shah H V, Panda D K. Sockets vs rdma interface over 10-gigabit networks: An in-depth analysis of the memory traffic bottleneck[C]//In RAIT workshop. 2004, 4: 2004.

一个 TCP 的数据传输 stack 是这样的：

- 在发送端：

> On the transmission side, the message is copied into the socket buffer, divided into MTU sized segments, data integrity ensured through checksum computation (to form the TCP checksum) and passed on to the underlying IP layer. ... The IP layer extends thechecksum to include the IP header and form the IP checksum and passes on the IP datagram to the device driver. After the construction of a packet header, the device driver makes a descriptor for the packet and passes the descriptor to the NIC. The NIC performs a **DMA** operation to move the actual data indicated by the descriptor from the socket buffer to the NIC buffer. The NIC then ships the data with the link header to the physical network and raises an interrupt to inform the device driver that it has finished transmitting the segment.

- 在接收端：

> On the receiver side, the NIC receives the IP datagrams, **DMA**s them to the socket buffer and raises an interrupt informing the device driver about this. The device driver strips the packet off the link header and hands it over to the IP layer. The IP layer verifies the IP checksum and if the data integrity is maintained, hands it over to the TCP layer. The TCP layer verifies the data integrity of the message and places the data into the socket buffer. When the application calls the read() operation, the data is copied from the socket buffer to the application buffer

这里要注意的是，普通的 TCP 也是会使用 DMA 的。RDMA 减少的是 TCP/IP 两层的计算处理：

> There are two kinds of RDMA operations: RDMA Write and RDMA Read. In an RDMA write operation, the initiator directly writes data into the remote node’s user buffer. Similarly, in an RDMA Read operation, the initiator reads data from the remote node’s user buffer.

所以 RDMA 解决的不仅是从内存拷贝到 driver buffer 的问题，还不会再走 TCP stack 了，相当于是一个新的协议了。具体这个协议会不会保证顺序啥的我没太查到...

### MSG_ZEROCOPY

那么最后，这个 zero copy 是做了啥呢？它肯定还是要做 TCP 的，所以肯定效率上来说是不如 RDMA 的。

> Copying large buffers between user process and kernel can be expensive. Linux supports various interfaces that eschew copying, such as sendpage and splice. The MSG_ZEROCOPY flag extends the underlying copy avoidance mechanism to common socket send calls.
>
> Copy avoidance is not a free lunch. As implemented, with page pinning, it replaces per byte copy cost with page accounting and completion notification overhead. As a result, MSG_ZEROCOPY is generally only effective at writes over around 10 KB.
>
> Page pinning also changes system call semantics. It temporarily shares the buffer between process and network stack. Unlike with copying, the process cannot immediately overwrite the buffer after system call return without possibly modifying the data in flight. Kernel integrity is not affected, but a buggy program can possibly corrupt its own data stream.
>
> The kernel returns a notification when it is safe to modify data. Converting an existing application to MSG_ZEROCOPY is not always as trivial as just passing the flag, then.

具体实现上，从作者的 tech report 来看，它使用了已有的 `virtio`，在发送的时候会 pin 住 send buffer，其余的就看不懂了... `virtio` 好像是 KVM 用来做虚拟化的一个模块... 具体的真的看不懂了。。。kernel 太难了...

## 在学习过程中学到的知识

### ping pong buffer

在网上找了找，竟然介绍 ping pong buffer 的最好的网页是一个百科全书...

https://encyclopedia2.thefreedictionary.com/Ping-pong+buffer

Ping pong buffer 的意思就是有 2 个 buffer，在一个被读取的时候，另一个被写入。例如在显示器处理图像的这个场景下，buffer ping 开始写入被解码出来的数据，buffer pong 里面则包含上一次被写入的数据，正在被显示器读取；待这一轮做完之后，显示器开始读取 buffer ping 的数据，而解码数据被写入 pong。

在 wikipedia 中，这被称为 [Multiple buffering](https://en.wikipedia.org/wiki/Multiple_buffering)。

