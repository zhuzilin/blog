---
title: Fourier Inversion Theorem 证明
date: 2023-10-08 21:30:00
tags: ["数学", "物理"]
---

在看 The Principles of Quantum Mechanics 的时候，发现定义 $\delta$ 函数用了 Fourier Inversion Theorem，感觉这个定理挺不直观的，所以看一下它是怎么证明的。这里我选用的是 Big Rudin 第 9 章的定义。

## 相关的实分析/复分析定义与定理

**定理 1.34 Lebesgue's Dominated Convergence Theorem** ：假设 $\{f_n\}$ 是 $X$ 上一个 complex measurable function，且满足对于任意 $x\in X$ 都有：
$$
f(x)=\lim_{n\rightarrow\infty}f_n{x}
$$
如果存在 $g\in L^1(\mu)$ 满足：
$$
|f_n(x)|\le g(x)\quad (n=1,2,3,...; x\in X)
$$
那么 $f\in L^1(\mu)$ 且：
$$
\lim_{n\rightarrow\infty}\int_X|f_n-f|d\mu=0\\
\lim_{n\rightarrow\infty}\int_Xf_nd\mu=\int_Xfd\mu
$$
（即求极限和积分可以换）

**定理 3.12**：令 $S$ 为 $X$ 上 the class of all complex, measurable, simple functions，满足：
$$
\mu(\{x:s(x)\ne0\})<\infty
$$
如果 $1\le p<\infty$，那么 $S$ 在 $L^p(\mu)$ 上 dense。

**定理 8.8 Fubini Theorem**：令 $(X,\mathcal{I},\mu)$ 和 $(Y,\mathcal{J}, \lambda)$ 为 $\sigma$-finite measure space，且 $f$ 是 $(X\times Y)$ 上 $(\mathcal{I}\times\mathcal{J})$-measurable function，

1. 如果 $0\le f\le \infty$，且：
   $$
   \varphi(x)=\int_Yf_xd\lambda,\quad\psi(y)=\int_Xf_yd\mu\quad(x\in X,y\in Y)
   $$
   那么 $\varphi$ 是 $\mathcal{I}$ -measurable，$\psi$ 是 $\mathcal{J}$-measurable，且：
   $$
   \int_X\varphi d\mu=\int_{X\times Y}fd(\mu\times \lambda)=\int_Y\psi d\lambda
   $$

2. 如果 $f$ 是 complex 的，且：
   $$
   \varphi^*(x)=\int_Y|f|_xd\lambda\quad\text{且}\quad\int_X\varphi^*d\mu<\infty
   $$
   那么 $f\in L^1(\mu\times\lambda)$。

注意第二个式子可以写为：
$$
\int_Xd\mu(x)\int_Yf(x,y)d\lambda(y)=\int_Yd\lambda(y)\int_Xf(x,y)d\mu(x)
$$
（即积分顺序可以换）

## Fourier Transforms

**定义 9.1**：
$$
\int_{-\infty}^{\infty}f(x)dm(x)=\frac{1}{\sqrt{2\pi}}\int_{-\infty}^{\infty}f(x)dx
$$
其中 $dx$ 对应 ordinary Lebesgue measure。以及：
$$
\begin{aligned}
||f||_p=\left\{\int_{-\infty}^{\infty}|f(x)|^pdm(x)\right\}^{1/p}\quad(1\le p < \infty)\\
(f*g)(x)=\int_{-\infty}^{\infty}f(x-y)g(y)dm(y)\quad(x\in R^1)\\
\hat{f}(t)=\int_{-\infty}^{\infty}f(x)e^{-ixt}dm(x)\quad(t\in R^1)
\end{aligned}
$$
以及我们会用 $L^p$ 表示 $L^p(R^1)$，用 $C^0$ 表示 the space of all continuous functions on $R^1$ which vanish at infinity。

如果 $f\in L^1$，且最后的积分对于任意实数 $t$ 都有定义，则 $\hat{f}$ 被称为 $f$ 的 **Fourier transform**。注意 Fourier transform 也只这个映射关系。

**定理**：假设 $f\in L^1$，$\alpha, \lambda$ 为实数，那么：

1. 如果 $g(x)=f(x)e^{i\alpha x}$，那么 $\hat{g}(t)=\hat{f}(t-\alpha)$；
2. 如果 $g(x)=f(x-\alpha)$，那么 $\hat{g}(t)=\hat{f}(t)e^{-i\alpha t}$；
3. 如果 $g\in L^1$ 且 $h=f*g$，那么 $\hat{h}(t)=\hat{f}(t)\hat{g}(t)$

所以 Fourier transform 把乘法转为了平移，把卷积转为了乘法。

4. 如果 $g(x)=\overline{f(-x)}$，那么 $\hat(g)(t)=\overline{\hat{f}(t)}$；
5. 如果 $g(x)=-ixf(x)$ 且 $g\in L^1$，那么 $\hat{f}$ 可微且 $\hat{f'}(t)=\hat{g}(t)$。

- 这里除了 5 之外都是可以直接套上面的定义证明的（3 要用 Fubini Theorem），5 则是要使用 Lebesgue's Dominated Convergence Theorem（交换积分和求极限），即：
  $$
  \begin{aligned}
  \hat{f'}(t)&=\lim_{s\rightarrow t}\frac{\hat{f}(s)-\hat{f}(t)}{s - t}=\lim_{s\rightarrow t}\int_{-\infty}^{\infty}f(x)e^{-ixt}\frac{e^{-ix(s-t)}-1}{s-t}dm(x)\\
  &=\int_{-\infty}^{\infty}f(x)e^{-ixt}\lim_{s\rightarrow t}\frac{e^{-ix(s-t)}-1}{s-t}dm(x)\\
  &=\int_{-\infty}^{\infty}-ixf(x)e^{-ixt}dm(x)=\hat{g}(t)
  \end{aligned}
  $$



**辅助函数 9.7**：为了证明 inversion theorem，我们需要一个 positive function，其有 positive Fourier transform 并且 Fourier transform 的积分很好算。为了一些我目前看不懂的原因，我们选了：
$$
H(t)=e^{-|t|}
$$
并定义：
$$
h_\lambda(x)=\int_{-\infty}^{\infty}H(\lambda t)e^{itx}dm(t)\quad(\lambda>0)
$$
我们可以比较容易算出：
$$
h_\lambda(x)=\sqrt{\frac{2}{\pi}}\frac{\lambda}{\lambda^2+x}\\
\int_{-\infty}^{\infty}h_\lambda(x)dm(x)=1
$$
另外，要注意到 $0<H(t)\le1$，以及当 $\lambda\rightarrow1$ 时，$H(\lambda t)\rightarrow 1$。

**命题 9.8**：如果 $f\in L^1$，那么：
$$
(f*h_\lambda)(x)=\int_{-\infty}^{\infty}H(\lambda t)\hat{f}(t)e^{ixt}dm(t)
$$

- 简单用一下 Fubini's theorem
  $$
  \begin{aligned}
  (f*h_\lambda)(x)&=\int_{-\infty}^{\infty}f(x-y)dm(y)\int_{-\infty}^{\infty}H(\lambda t)e^{ity}dm(t)\\
  &=\int_{-\infty}^{\infty}H(\lambda t)dm(t)\int_{-\infty}^{\infty}f(x-y)e^{ity}dm(y)\\
  &=\int_{-\infty}^{\infty}H(\lambda t)dm(t)\int_{-\infty}^{\infty}f(y)e^{it(x-y)}dm(y)\\
  &=\int_{-\infty}^{\infty}H(\lambda t)\hat{f}(t)e^{ixt}dm(t)
  \end{aligned}
  $$
  （这里第三行那里总感觉少了个负号...）

**定理 9.10**：如果 $1\le p<\infty$ 且 $f\in L^p$，那么：
$$
\lim_{\lambda\rightarrow0}||f*h_\lambda-f||_p=0
$$
我们比较在意 $p=1$ 或 $p=2$ 的情况，不过一般情况也比较好证。

- 由 9.7 中的结论（积分为 1），有：
  $$
  (f*h_\lambda)(x) - f(x)=\int_{-\infty}^{\infty}[f(x-y)-f(x)]h_\lambda(y)dm(y)
  $$
  而定理 3.3 给出：
  $$
  |(f*h_\lambda)(x) - f(x)|^p\le\int_{-\infty}^{\infty}|f(x-y)-f(x)|^ph_\lambda(y)dm(y)
  $$
  两边关于 x 积分，并用 Fubini's theorem 换一下积分顺序，就有：
  $$
  ||(f*h_\lambda)(x) - f(x)||^p_p\le\int_{-\infty}^{\infty}||f(x-y)-f(x)||^p_ph_\lambda(y)dm(y)
  $$
  取 $g_y=||f_y-f||_p^p$，则由定理 9.5 得到 $g$ 

**定理 9.11 The Inversion Theorem**：如果 $f\in L^1$ 且 $\hat{f}\in L^1$，并且：
$$
g(x)=\int_{-\infty}^{\infty}\hat{f}(t)e^{ixt}dm(t)
$$
则 $g\in C_0$ 且 $f(x)=g(x)$。

这里我们根据定义简单展开一下，其实是说：
$$
f(y)=\frac{1}{2\pi}\int_{-\infty}^{\infty}\int_{-\infty}^{\infty}f(x)e^{-ixt}dx\ e^{iyt}dt
$$
还有：
$$
\begin{aligned}
f(0)&=\frac{1}{2\pi}\int_{-\infty}^{\infty}f(x)dx\int_{-\infty}^{\infty}e^{-ixt}dt
\end{aligned}
$$

- 由上面的命题 9.8，有，
  $$
  (f*h_\lambda)(x)=\int_{-\infty}^\infty H(\lambda t)\hat{f}(t)e^{ixt}dm(t)
  $$
  由 dominated convergence theorem，右侧收敛为 $g(x)$。而由定理 9.10，我们可以选一个序列 $\{\lambda_n\}$，满足 $\lambda_n\rightarrow0$，有
  $$
  \lim_{n\rightarrow\infty}(f*h_{\lambda_n})(x)=f(x)
  $$
  所以 $g(x)=f(x)$。