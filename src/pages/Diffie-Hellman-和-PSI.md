---
title: Diffie-Hellman 和 PSI
date: 2021-12-1 10:41:00
tags: ["cryptography"]
---

最近在和骞老师一起做一个密码学相关的项目，接触到 Diffie-Hellman 协议以及基于它进行的 private set intersection (PSI) 协议。在这里记录一下~

## Diffie-Hellman key exchange

1. Alice 随机生成私钥 $a$，并选择一个大质数 $p$ 以及 $g$，其中 $g$ 为 modulo $p$ 的 [primitive root](https://en.wikipedia.org/wiki/Primitive_root_modulo_n)。对于质数来说，primitive root 即满足
    $$
    g^d \equiv 1\ (mod\ p) \land d > 0 \implies d \ge n-1
    $$

2. Alice 计算 $A = g^a\ mod\ p$，并把 $p$，$g$ 和 $A$ 都发给 Bob；

3. Bob 随机生成密钥 $b$；

4. Bob 计算 $A^b\ mod\ p$ 即 $g^{ab}\ mod\ p$；

5. Bob 计算 $B = g^b\ mod\ p$ 并发给 Alice；

2. Alice 计算 $B^a\ mod\ p$ 也相当于是 $g^{ab}\ mod\ p$。

这样 Alice 和 Bob 就都有 $g^{ab}\ mod\ p$ 了，可以拿这个值作为密钥。即使 Eve 获得了 $g$、$p$ 和 $A$、$B$，他需要用 discrete logarithm problem 来反解 $a$、$b$，这是比较困难的。

## Elliptic Curves Diffie-Hellman

1. Alice 和 Bob 统一使用一个适当的椭圆曲线 $E$，以及点 $p$ 作为 generator；
2. Alice 随机生成密钥 $a$；
3. Alice 计算 $A=G\times a$；
4. Alice 把 $E$、$G$ 和 $A$ 发给 Bob；
5. Bob 随机生成密钥 $b$；
6. Bob 计算出 $B=G\times b$，同时用 $A$ 计算出 $G\times a \times b$；
7. Bob 把 $B$ 发给 Alice；
8. Alice 用 $B$ 计算出 $G\times a \times b$

这样就可以得到公共的密钥了，例如用 $G \times ab$ 的 $x$ 坐标。同样，偷听的 Eve 需要解 elliptic curve discrete logarithm problem 来反解出 $a$、$b$，这也是很难的。

## Diffie-Hellman PSI

1. Alice 随机生成密钥 $a$，并选一个大质数 $p$；
2. Alice 持续对自己的数据做哈希，直到每一个都是 primitive root；
3. 对于这些哈希结果 $g_{alice}$，Alice 计算 $g_{alice}^a\ mod\ p$，并把这些值和 $p$ 都发给 Bob；
4. Bob 选一个私钥 $b$；
5. Bob 持续对自己的数据做哈希，直到每个都是 primitive root；
6. 对于这些哈希结果，Bob 计算 $g_{bob}^b\ mod\ p$；
7. Bob 对 Alice 发过来的 $g_{alice}^a$ 计算 $g_{alice}^{ab}\ mod\ p$ ，并把 $g_{alice}^{ab}$ 和 $g_{bob}^b$ 都发给 Alice；
8. Alice 计算 $g_{bob}^{ba}\ mod\ p$，并和 $g_{alice}^{ab}$ 相对比，结合原先自己数据的顺序，得到交集。

注意，在整个过程中顺序都不能打乱，不然就只能得到交集的大小了。

## Elliptic Curves Diffie-Hellman PSI

1. Alice 和 Bob 统一使用椭圆曲线 E；
2. Alice 随机选密钥 a；
3. Alice 重复给输入做哈希直到其变为 E 的 generator，例如她可以循环做 SHA256 直到输出是 E 上点的 x 值；
4. 后面就和 DH-PSI 的 3-8 类似了。

这里要注意的一点就是什么是一个椭圆曲线的 generator。和上面的对比可以知道，generator 在 *elliptic curve modulo n* 中的地位和 $\mathbb{Z}^*_p$ 在质数 modulo 的地位是一样的，是可以通过一个 generator 得到曲线上的所有点的。这部分相关的一些定理呀啥的我都还不是很清楚，好像可以认为 NIST 提供的那些曲线上的所有点都是 generator。

## 参考资料

1. https://blog.willclark.tech/tech/2020/05/22/diffie-hellman-key-exchange.html
1. https://blog.willclark.tech/tech/2020/05/26/psi-with-diffie-hellman.html
2. https://blog.willclark.tech/tech/2020/06/12/elliptic-curves-diffie-hellman.html

