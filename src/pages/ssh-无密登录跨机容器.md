---
title: ssh 无密登录跨机容器
date: 2021-12-10 21:30:00
tags: ["shell"]
---

这两天在裸机上面跑测试的时候，需要让两台机器里面的镜像直接 ssh 无密通信，调了挺久的环境，在这里记录一下。

大概分为如下几步：

1. 制作镜像

    在制作镜像的时候，要在镜像里面做 ssh keygen，并把生成的公钥放在 `authorized_keys` 里面，这样就可以让任意的两个基于这个镜像的容器都能无密访问。

2. 配置 `ssh_config` 和 `sshd_config`

    修改 `/etc/ssh/sshd_config`，修改默认的端口，以及监听 `0.0.0.0`。例如改成：

    ```
      Port 36007
	  ListenAddress 0.0.0.0
    ```

    之后修改 `/etc/ssh/ssh_config`，把端口改成和 `sshd_config` 一样：
    
    ```
    Port 36007
    ```
    
2. 启动 `sshd`

    在镜像里面不能用 `systemctl`，所以直接运行 `/usr/sbin/sshd`。

经过上述步骤，容器之间就应该能相关链接了。如果不能的话，可能是母机的防火墙（iptables）配置的有问题。可以用 `iptables-save` 和 `iptables-restore` 进行修复。

我这里一个能 work 的防火墙如下：

```
# Generated by iptables-save v1.4.21 on Tue Dec 14 19:07:00 2021
*nat
:PREROUTING ACCEPT [1677:100660]
:INPUT ACCEPT [1677:100660]
:OUTPUT ACCEPT [9586:575136]
:POSTROUTING ACCEPT [9586:575136]
:DOCKER - [0:0]
-A PREROUTING -m addrtype --dst-type LOCAL -j DOCKER
-A OUTPUT ! -d 127.0.0.0/8 -m addrtype --dst-type LOCAL -j DOCKER
-A POSTROUTING -s 172.17.0.0/16 ! -o docker0 -j MASQUERADE
-A DOCKER -i docker0 -j RETURN
COMMIT
# Completed on Tue Dec 14 19:07:00 2021
# Generated by iptables-save v1.4.21 on Tue Dec 14 19:07:00 2021
*filter
:INPUT ACCEPT [2237093:1399949331]
:FORWARD DROP [0:0]
:OUTPUT ACCEPT [2483658:360111834]
:DOCKER - [0:0]
:DOCKER-ISOLATION-STAGE-1 - [0:0]
:DOCKER-ISOLATION-STAGE-2 - [0:0]
:DOCKER-USER - [0:0]
-A INPUT -i eth0 -p tcp -j DROP
-A INPUT -i eth0 -p udp -j DROP
-A INPUT -i bond0 -p tcp -j DROP
-A INPUT -i bond0 -p udp -j DROP
-A FORWARD -j DOCKER-USER
-A FORWARD -j DOCKER-ISOLATION-STAGE-1
-A FORWARD -o docker0 -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
-A FORWARD -o docker0 -j DOCKER
-A FORWARD -i docker0 ! -o docker0 -j ACCEPT
-A FORWARD -i docker0 -o docker0 -j ACCEPT
-A DOCKER-ISOLATION-STAGE-1 -i docker0 ! -o docker0 -j DOCKER-ISOLATION-STAGE-2
-A DOCKER-ISOLATION-STAGE-1 -j RETURN
-A DOCKER-ISOLATION-STAGE-2 -o docker0 -j DROP
-A DOCKER-ISOLATION-STAGE-2 -j RETURN
-A DOCKER-USER -j RETURN
COMMIT
# Completed on Tue Dec 14 19:07:00 2021
```

目前还不能看得懂...暂时记录在这里吧...

