---
title: Connect Android to PC with Termux
date: 2018-12-29 11:02:14
tags: ssh
---

## Termux

Here is the introduction of termux from its official website:

> Termux is an Android terminal emulator and Linux environment app that works directly with no rooting or setup required. A minimal base system is installed automatically - additional packages are available using the APT package manager.

It is thrilling that we could use our phone as a free server without making any damage. But it is painful to type with such small screen and no control or arrow keys. ([link for some special keys](https://wiki.termux.com/wiki/Touch_Keyboard)) Therefore, it would be better that we could use our PC  to the phone. Since we are using linux, it is natural to use ssh.

## Some steps

First, at the phone side, we need to install openssh and enable ssh connection. 

```shell
apt install openssh
sshd
```

Then, we need to send the private key from the PC to the phone. I did not connect them with sshd successfully, therefore use wechat to send the key and past it to the .ssh/authorized_keys in the phone.

And after figure out the ip and username of the phone:

```shell
ifconfig
whoami
```

We could connect with ssh from the PC using:

```shell
ssh username@ip -p 8022
```

