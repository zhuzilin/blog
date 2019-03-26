---
title: About Matrix Calculus
date: 2019-03-10 23:00:00
tags: ["math"]
---

很长时间以来，虽然学习机器学习，但是我对最基本的矩阵求导仍然是非常模糊，在这里好好的整理一下。以下内容几乎全部来自[Matrix calculus](https://en.wikipedia.org/wiki/Matrix_calculus)的维基页面。

## Scope

从一个简单的标量函数对矩阵求导为例：
$$
\nabla f(x_1, x_2, x_3)=\frac{\partial f}{\partial x_1}\hat{x}_1+\frac{\partial f}{\partial x_2}\hat{x}_2+\frac{\partial f}{\partial x_3}\hat{x}_3
$$
也可以写成矩阵形式，那就是标量函数关于向量求导：
$$
\nabla f=\frac{\partial f}{\partial \bold{x}}=
\left[ {\begin{array}{c}
\frac{\partial f}{\partial x_1} & 
\frac{\partial f}{\partial x_2} &
\frac{\partial f}{\partial x_3}
\end{array}}\right]^T
$$
更复杂一点的例子，就是标量函数对矩阵求导，被称为gradient matrix，其包含了对于矩阵每一个元素的导数。

再举另外一个例子，有的时候我们由n个因变量，m个自变量，那么因变量向量相对于自变量向量的导数为一个$m\times n$的矩阵，其中包含了所有的组合。

对于标量，向量，矩阵这三样东西，我们可以两两组合求导，但是这其中有几样是相对比较常见的

| Types  | Scalar                                                       | Vector                                                       | Matrix                                                       |
| ------ | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| Scalar | ![\frac{\partial y}{\partial x} ](https://wikimedia.org/api/rest_v1/media/math/render/svg/0deac2b96aa5d0329450647f183f9365584c67b2) | ![\frac{\partial \mathbf{y}}{\partial x} ](https://wikimedia.org/api/rest_v1/media/math/render/svg/67d5f2cf89374e95eb31cdf816533244b4d45d1d) | ![\frac{\partial \mathbf{Y}}{\partial x} ](https://wikimedia.org/api/rest_v1/media/math/render/svg/565884c84274a792e9b5af680a30f550eaf5e3a6) |
| Vector | ![\frac{\partial y}{\partial \mathbf{x}} ](https://wikimedia.org/api/rest_v1/media/math/render/svg/01a7fae63303065a57b24c2bb67ab80468a24263) | ![\frac{\partial \mathbf{y}}{\partial \mathbf{x}} ](https://wikimedia.org/api/rest_v1/media/math/render/svg/734fea892fc38deec1d53fa88abed4ca213c0d25) |                                                              |
| Matrix | ![\frac{\partial y}{\partial \mathbf{X}} ](https://wikimedia.org/api/rest_v1/media/math/render/svg/877eb58a8159dedbc4bc47afc9749803d75d5e35) |                                                              |                                                              |

注意我们可以对矩阵函数关于向量求导，但是其会为超过2阶的张量了，所以不在这里进行讨论了。

## Derivative

这里面一一展示了上面的6种的展开模式：

### Vector-by-scalar

$$
\frac{\partial\bold{y}_{m\times1}}{\partial x}=
\left[{\begin{array}{c}
\frac{\partial y_1}{\partial x}\\
\frac{\partial y_2}{\partial x}\\
\vdots\\
\frac{\partial y_m}{\partial x}
\end{array}}\right]_{m\times1}
$$

在vector calculus种，这被成为$\bold{y}$的tangent vector。

### Scalar-by-vector

$$
\frac{\partial y}{\partial \bold{x}_{n\times1}}=
\left[{\begin{array}{c}
\frac{\partial y}{\partial x_1}\\
\frac{\partial y}{\partial x_2}\\
\vdots\\
\frac{\partial y}{\partial x_n}
\end{array}}\right]_{n\times1}
$$

### Vector-by-vector

$$
\frac{\partial \bold{y}_{m\times1}}{\partial \bold{x}_{n\times1}}=
\left[{\begin{array}{c}
\frac{\partial y_1}{\partial x_1}&\frac{\partial y_1}{\partial x_2}&\dots&\frac{\partial y_1}{\partial x_n}\\
\frac{\partial y_2}{\partial x_1}&\frac{\partial y_2}{\partial x_2}&\dots&\frac{\partial y_2}{\partial x_n}\\
\vdots&\vdots&\ddots&\vdots\\
\frac{\partial y_m}{\partial x_1}&\frac{\partial y_m}{\partial x_2}&\dots&\frac{\partial y_m}{\partial x_n}
\end{array}}\right]_{m\times n}
$$

在vector  calculus中，向量函数$\bold{y}$对向量$\bold{x}$求导被称为Jacobian matrix。（注意这里用的是numerator layout。）

### Matrix-by-scalar

$$
\frac{\partial \bold{Y}_{m\times n}}{\partial x}=
\left[{\begin{array}{c}
\frac{\partial y_{11}}{\partial x}&\frac{\partial y_{12}}{\partial x}&\dots&\frac{\partial y_{1n}}{\partial x}\\
\frac{\partial y_{21}}{\partial x}&\frac{\partial y_{22}}{\partial x}&\dots&\frac{\partial y_{2n}}{\partial x}\\
\vdots&\vdots&\ddots&\vdots\\
\frac{\partial y_{m1}}{\partial x}&\frac{\partial y_{m2}}{\partial x}&\dots&\frac{\partial y_{mn}}{\partial x_n}
\end{array}}\right]_{m\times n}
$$

### Scalar-by-matrix

$$
\frac{\partial y}{\partial \bold{X}_{m\times n}}=
\left[{\begin{array}{c}
\frac{\partial y}{\partial x_{11}}&\frac{\partial y}{\partial x_{12}}&\dots&\frac{\partial y}{\partial x_{1n}}\\
\frac{\partial y}{\partial x_{21}}&\frac{\partial y}{\partial x_{22}}&\dots&\frac{\partial y}{\partial x_{2n}}\\
\vdots&\vdots&\ddots&\vdots\\
\frac{\partial y}{\partial x_{m1}}&\frac{\partial y}{\partial x_{m2}}&\dots&\frac{\partial y}{\partial x_{mn}}
\end{array}}\right]_{m\times n}
$$

## Layout convention

对于![\frac{\partial \mathbf{y}}{\partial \mathbf{x}} ](https://wikimedia.org/api/rest_v1/media/math/render/svg/734fea892fc38deec1d53fa88abed4ca213c0d25)的结果有两种表示的方法，如果y是m维，而x是n维，那么结果可以是$m\times n$或者$n \times m$。一般有如下的几种表示方法：

1. Numerator layout, 按照$\bold{y}$和$\bold{x}^T$排列，也就是结果是$m\times n$。这常被称为Jacobian formulation
2. Denominator layout，按照$\bold{y}^T$和$\bold{x}$排列，也就是结果是$n\times m$。这常被称为Hessian formulation，是上一种的转置。
3. 第三种就是写为![\frac{\partial \mathbf{y}}{\partial \mathbf{x}'},](https://wikimedia.org/api/rest_v1/media/math/render/svg/95b8ab287c1ecadb653bf2f278fd48d2a030a63c)也就是关于x的专制求导，并符合numerator layout，用这种标记就可以统一两种layout了。

下面是对于上面两种layout对应的一些结构：

1. 对于numerator layout，$\frac{\partial\bold{y}}{\partial x}$是列向量，$\frac{\partial y}{\partial\bold{x}}$是行向量
2. 对于denominator layout，$\frac{\partial\bold{y}}{\partial x}$是行向量，$\frac{\partial y}{\partial\bold{x}}$是列向量
3. 对于第三种，会写为$\frac{\partial\bold{y}}{\partial x}$和$\frac{\partial y}{\partial\bold{x}‘}$

对于矩阵相关的求导也会有对应的方式。

## Differential Form

有的时候微分形式更好处理。

### Scalar

| Expression                                                   | Result (numerator layout)                                    |
| ------------------------------------------------------------ | ------------------------------------------------------------ |
| ![{\displaystyle d(\operatorname {tr} (\mathbf {X} ))=}](https://wikimedia.org/api/rest_v1/media/math/render/svg/9f5dc91e24553a1473e6cec689c561fcdacf589b) | ![{\displaystyle \operatorname {tr} (d\mathbf {X} )}](https://wikimedia.org/api/rest_v1/media/math/render/svg/234412411bd5861af0f17b144a7238b5cf9707e7) |
| ![d(\|\mathbf{X}\|) =](https://wikimedia.org/api/rest_v1/media/math/render/svg/967384df794437f3b37679aa8e82167b646a1773) | ![{\displaystyle \|\mathbf {X} \|\operatorname {tr} \left(\mathbf {X} ^{-1}d\mathbf {X} \right)=\operatorname {tr} (\operatorname {adj} (\mathbf {X} )d\mathbf {X} )}](https://wikimedia.org/api/rest_v1/media/math/render/svg/cfd15904de92b2329944348c6e5a70ed9589e927) |
| ![d(\ln\|\mathbf{X}\|) =](https://wikimedia.org/api/rest_v1/media/math/render/svg/b3259d0f3b205654dd6cb94d14333a2255869a95) | ![{\displaystyle \operatorname {tr} \left(\mathbf {X} ^{-1}d\mathbf {X} \right)}](https://wikimedia.org/api/rest_v1/media/math/render/svg/54c70f56b35822017d5a03d5ddff897658c56c4e) |

### Matrix

| Expression                                                   | Result (numerator layout)                                    |
| ------------------------------------------------------------ | ------------------------------------------------------------ |
| ![d(\mathbf{A}) =](https://wikimedia.org/api/rest_v1/media/math/render/svg/8a7e6e2ff84cff62eace2f5d1fee6ca89a2938ed) | ![{\displaystyle 0}](https://wikimedia.org/api/rest_v1/media/math/render/svg/2aae8864a3c1fec9585261791a809ddec1489950) |
| ![d(a\mathbf{X}) =](https://wikimedia.org/api/rest_v1/media/math/render/svg/91c101b0891c47b3f1d20d96b141125474867ae9) | ![a\,d\mathbf{X}](https://wikimedia.org/api/rest_v1/media/math/render/svg/f7c3d97e20baf0ea9790cd63e7207128846b38d4) |
| ![{\displaystyle d(\mathbf {X} +\mathbf {Y} )=}](https://wikimedia.org/api/rest_v1/media/math/render/svg/b73dba0b049337a0cef941d976498d1dabe4bc76) | ![{\displaystyle d\mathbf {X} +d\mathbf {Y} }](https://wikimedia.org/api/rest_v1/media/math/render/svg/f30ac4c458061ea58a52b5a18e676bc2a7f1e1b5) |
| ![d(\mathbf{X}\mathbf{Y}) =](https://wikimedia.org/api/rest_v1/media/math/render/svg/83613591465e8a82e10550e0e8b3e1e80b88a07e) | ![{\displaystyle (d\mathbf {X} )\mathbf {Y} +\mathbf {X} (d\mathbf {Y} )}](https://wikimedia.org/api/rest_v1/media/math/render/svg/ea9909db6929624a5a28fb860e7eadfc52a98ef7) |
| ![{\displaystyle d\left(\mathbf {X} ^{\top }\right)=}](https://wikimedia.org/api/rest_v1/media/math/render/svg/80e08fac2a1857d6eeeca6e6937a62eb969dbd77) | ![(d{\mathbf  {X}})^{\top }](https://wikimedia.org/api/rest_v1/media/math/render/svg/3f2d0c0a81802de0c8588dd215bbd3b2c2eaf675) |
| ![{\displaystyle d\left(\mathbf {X} ^{-1}\right)=}](https://wikimedia.org/api/rest_v1/media/math/render/svg/221625109e14bae9bde2f8e4642dc8b35c03f8ee) | ![{\displaystyle -\mathbf {X} ^{-1}\left(d\mathbf {X} \right)\mathbf {X} ^{-1}}](https://wikimedia.org/api/rest_v1/media/math/render/svg/c12a8f577a94f9713686bf68d414c0a87f244a85) |

### Conversion from differential to derivative form

| Canonical differential form                                  | Equivalent derivative form                                   |
| ------------------------------------------------------------ | ------------------------------------------------------------ |
| ![dy = a\,dx](https://wikimedia.org/api/rest_v1/media/math/render/svg/2ce456dc40793632c19c009d6170c74ae644f784) | ![\frac{dy}{dx} = a](https://wikimedia.org/api/rest_v1/media/math/render/svg/51e758428a1022503fdaeffc5e287c5bf7bbdc06) |
| ![dy = \mathbf{a}\,d\mathbf{x}](https://wikimedia.org/api/rest_v1/media/math/render/svg/58a74bac28be116049618063edf172dbd642401d) | ![\frac{dy}{d\mathbf{x}} = \mathbf{a}](https://wikimedia.org/api/rest_v1/media/math/render/svg/68144e957185454ff401f6e7f9f4daec4217a5bc) |
| ![{\displaystyle dy=\operatorname {tr} (\mathbf {A} \,d\mathbf {X} )}](https://wikimedia.org/api/rest_v1/media/math/render/svg/a33eead0af35733e6ac1ca42f6c899731b531eed) | ![\frac{dy}{d\mathbf{X}} = \mathbf{A}](https://wikimedia.org/api/rest_v1/media/math/render/svg/cc8d6694e983da55260de8ef14f1bf7bdb85b40f) |
| ![d\mathbf{y} = \mathbf{a}\,dx](https://wikimedia.org/api/rest_v1/media/math/render/svg/4a0ae3cf15e1267f4fdb141e1d68349927727bef) | ![\frac{d\mathbf{y}}{dx} = \mathbf{a}](https://wikimedia.org/api/rest_v1/media/math/render/svg/faa54d96218197dadd7b4f1e3471443c0b79a6d2) |
| ![d\mathbf{y} = \mathbf{A}\,d\mathbf{x}](https://wikimedia.org/api/rest_v1/media/math/render/svg/38e99d558f59946cfc8d0cb3b995a49c42fead04) | ![\frac{d\mathbf{y}}{d\mathbf{x}} = \mathbf{A}](https://wikimedia.org/api/rest_v1/media/math/render/svg/a5649f8fff55607c21a17cdb42c9c5d15b2f19b6) |
| ![d\mathbf{Y} = \mathbf{A}\,dx](https://wikimedia.org/api/rest_v1/media/math/render/svg/a371dad51f295c2fee9df1952f2bdfaa856c254e) | ![\frac{d\mathbf{Y}}{dx} = \mathbf{A}](https://wikimedia.org/api/rest_v1/media/math/render/svg/5c48de4dccee87aaf5fba393272c94b5a8065af5) |

## Some useful formula

这里在原文中有很好的一个表，在这里会摘取一些机器学习中经常会用的式子。

- $$
  \frac{\partial\bold{Ax}}{\partial \bold{x}}=\bold{A}(num)/\bold{A}^T(denom)
  $$

- $$
  \frac{\partial\bold{x^TA}}{\partial \bold{x}}=\bold{A}^T(num)/\bold{A}(denom)
  $$

- $$
  \frac{\partial(\bold{u}\cdot \bold{v})}{\partial \bold{x}}=
  \frac{\partial\bold{u}^T\bold{v}}{\partial \bold{x}}=
  \bold{u}^T\frac{\partial\bold{v}}{\partial \bold{x}}+\bold{v}^T\frac{\partial\bold{u}}{\partial \bold{x}}(num)/
  \frac{\partial\bold{v}}{\partial \bold{x}}\bold{u}+\frac{\partial\bold{u}}{\partial \bold{x}}\bold{v}(denom)
  $$

- 矩阵的迹的导数可以用其循环和转置的性质求得，如：
  $$
  \begin{aligned}
  d\ tr(AXBX^TC) &= tr(d(CAXBX^T)) \\
  &=tr(d(CAX)BX^T + CAXd(BX^T))\\
  &=tr(CAd(X)BX^T+CAXB(dX^T))\\
  &=tr(BX^TCAdX)+tr(CAXB(dX)^T)\\
  &=tr(BX^TCAdX)+tr((dXB^TX^TA^TC^T)^T)\\
  &=tr(BX^TCAdx)+tr(dXB^TX^TA^TC^T)\\
  &=tr((BX^TCA+B^TX^TA^TC^T)dX)\\
  \frac{\partial tr(AXBX^TC)}{\partial X} &= BX^TCA+B^TX^TA^TC^T
  \end{aligned}
  $$
  注意很多时候，把变量结果转化为迹就可以更好的求得结果。

- 对于行列式，我们有：
  $$
  \begin{aligned}
  \frac{\partial |X|}{\partial X} &= |X|X^{-1}\\
  \frac{\partial \log|X|}{\partial X} &= X^{-1}
  \end{aligned}
  $$
  