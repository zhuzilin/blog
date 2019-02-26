---
title: About Linear Regression
date: 2019-02-13 18:35:00
tags: ["machine-learning"]
---

This semester, all three of my courses mentioned linear regression. And I believe it would be nice to summarize it.

For linear regression, we will use a linear model to fit $y$, which is
$$
xy_i\approx f(x_i;w) = w_0 + \sum_{j=1}^d{x_{ij}w_j}
$$
where $x\in R^d$ and $y \in R$.

## Least Square LR

### Model definition

And for the least square linear regression, as the name suggested, has a least square object:
$$
w_{LS} = arg\min_w \sum_{i=1}^n(y_i-f(x_i;w))^2\equiv arg\min_w L
$$
Till now, we believe there is a linear relationship between $x_i$ and $y_i$
$$
y_i = w_0 + \sum_{j=1}^d{x_{ij}w_j} + \epsilon_i
$$
And we want to minimize
$$
L=\sum_{i=1}^n\epsilon^2
$$
And we can use matrix to simplify the denotation (To make it simple, we would add a 1 to the first row).
$$
x_i=
  \left[ {\begin{array}{c}
   1\\
   x_{i1}\\
   x_{i2}\\
   ...\\
   x_{id}
  \end{array} } \right]_{(d+1)\times1}
$$
And the data could be represent as one matrix
$$
X = 
  \left[ {\begin{array}{c}
   1 & x_{11} & ... & x_{1d}\\
   1 & x_{21} & ... & x_{2d}\\
   \vdots & \vdots & & \vdots\\
   1 & x_{n1} & ... & x_{nd}
  \end{array} } \right]_{n\times (d+1)} = 
  \left[ {\begin{array}{c}
   1&- x_1^T-\\
   1&- x_2^T-\\
   \vdots&\vdots\\
   1&- x_n^T-
  \end{array} } \right]_{n\times (d+1)}
$$
And also for $w$
$$
w = 
  \left[ {\begin{array}{c}
   w_0 \\ w_1 \\ \vdots \\ w_d
  \end{array} } \right]_{(d+1)\times1}
$$
For now, let's assume that $d<n$.

And the vector version of LR becomes:
$$
L=\sum_{i=1}^n(y_i-x_i^T w)^2=||y-Xw||^2=(y-Xw)^T(y-Xw)
$$
And the derivative would be:
$$
\nabla_wL=2X^TXw-2X^Ty=0 \Rightarrow w_{LS}=(X^TX)^{-1}X^Ty
$$
How to calculate matrix derivation is [here](https://en.wikipedia.org/wiki/Matrix_calculus#Identities)

And the prediction is
$$
y_{new} \approx x_{new}^Tw_{LS}
$$
### Solution Existence

When $X^TX$ is a full rank matrix, which means, $X$ has at least $d+1$ linear independent row, the solution exists.

And for polynomial regression, we could just take them as extra column for $X$. More generally, we could use the kernel method:
$$
y_i \approx f(x_i, w)=\sum_{s=1}^Sg_s(x_i)w_s
$$
As long as the function is linear on $w$, the solution will always be $(X^TX)^{-1}X^Ty$.

### Geometric interpretation

The columns of $X$ define a $d + 1$-dimensional subspace in the higher dimensional $R^n$. The closest point in that subspace is the orthonormal projection of y into the column space of $X$.

### Probabilistic interpretation

Assume
$$
p(y|\mu, \sigma^2I)=N(\mu=Xw, \sigma^2I)
$$
Then the maximum likelihood (ML) estimator would be
$$
w_{ML}=arg\max_w \ln{p(y|Xw, \sigma^2I)}=arg\min_w ||y-Xw||^2
$$
Therefore, using least square is making an independent Gaussian noise assumption about error.

And also from this probabilistic assumption
$$
E[w_{ML}]=(X^TX)^{-1}X^TE[y]=(X^TX)^{-1}X^TXw=w
$$
$w_{ML}$ is unbiased. And similarly we could calculate the variance:
$$
Var[w_{ML}]=\sigma^2(X^TX)^{-1}
$$
Therefore, when $\sigma^2(X^TX)^{-1}$ is large, $w_{ML}$ may be huge. And to prevent this, we need to introduce regularization.

## Ridge Regression

For the general linear regression with regularization, the model is
$$
w_{LS} = arg\min_w ||y-Xw||^2+\lambda g(w)
$$
where $\lambda>=0$, $g(w)>=0$.

And ridge regression is one of them,
$$
w_{LS} = arg\min_w ||y-Xw||^2+\lambda ||w||^2
$$
And we could solve the answer
$$
L=||y-Xw||^2+\lambda||w||^2=(y-Xw)^T(y-Xw)+\lambda w^Tw
$$

$$
w_{RR} = (\lambda I+X^TX)^{-1}X^Ty
$$

There is a tradeoff between square error and penalty on the size of $w$.
$$
E[w_{RR}]=Zw
$$
and
$$
Var[w_{RR}]=\sigma^2Z(X^TX)^{-1}Z^T
$$
where $Z=(I+\lambda(X^TX)^{-1})^{-1}$.

RR gives us a solution that is biased, but has lower variance than LS.

### Data preprocessing

For ridge regression, we assume the following preprocessing:

1. The mean is subtracted off of y

$$
y\leftarrow y-\frac{1}{n}\sum_{i=1}^n y_i
$$

2. The dimension of $x_i$ have been standardized before constructing $X$:

$$
x_{ij}\leftarrow (x_{ij}-\bar{x}_{.j})/\hat{\sigma}_j
$$

3. We can show that there is no need for the dimension of 1's in this case.

### Probabilistic interpretation

If we set the prior distribution for $w$ as $w\sim \mathcal{N}(0, \lambda^{-1}I)$, then
$$
p(w)=(\frac{\lambda}{2\pi})^{\frac{d}{2}}e^{-\frac{\lambda}{2}w^Tw}
$$
And to maximize a posteriori (MAP) estimation:
$$
\begin{aligned}
w_{MAP}&=arg\max_w \ln{p(w|y, X)}\\
&=arg\max_w \ln{\frac{p(y|w,X)p(w)}{p(y|X)}}\\
&=arg\max_w \ln{p(y|w,X)}+\ln{p(w)}-\ln{p(y|X)}\\
&=arg\max_w -\frac{1}{2\sigma^2}(y-Xw)^T(y-Xw)-\frac{\lambda}{2}w^Tw+const.\\
&=(\lambda\sigma^2I+X^TX)^{-1}X^Ty
\end{aligned}
$$
which is $w_RR$ (we could set $\lambda\sigma^2$ as $\lambda$).

Therefore, RR maximize the posterior.

## SVD

For $n\times d$ matrix $X$ (assume $n> d$), we could do singular value decomposition to it
$$
X=USV^T
$$
where

1. $U$: $n\times d$ and orthonormal in the columns, i.e. $U^TU=I$
2. $S$: $d\times d$ non-negative diagonal matrix , i.e. $S_{ii}>=0$ and $S_{ij}=0$ for $i\neq j$
3. $V$: $d\times d$ and orthonormal, i.e. $V^TV=VV^T=I$

We have
$$
w_{LS}=(X^TX)^{-1}X^Ty=VS^{-2}V^TVSV^Ty=VS^{-1}U^Ty
$$
And
$$
w_{RR}=VS_{\lambda}^{-1}U^Ty
$$
where
$$
S_{\lambda}^{-1} =
\left[ {\begin{array}{c}
   \frac{S_{11}}{\lambda+S_{11}^2} &  & 0\\
    & \ddots & \\
   0 & & \frac{S_{dd}}{\lambda+S_{dd}^2}
  \end{array} } \right]
$$
And define the degrees of freedom as:
$$
df(\lambda)=tr[X(X^TX+\lambda I)^{-1}X^T]=\sum_{i=1}^d\frac{S_{ii}^2}{\lambda+S_{ii}^2}
$$
If $\lambda=0$, $df=d$, which is the dimension of the data and if $\lambda\rightarrow\infty$, $df=0$. Therefore we could observe how each value in $w$ changes. Here is an example from ESL

![degree of freedom](http://erinshellman.github.io/data-mining-starter-kit/images/ridge_coef.png)

## Bias-Variance for linear regression

$$
\begin{aligned}
E[(y_0-x_0^T\hat{w})^2|X, x_0] &= E[y_0^2]-2x_0^TE[y_0\hat{w}]+x_0^TE[\hat{w}\hat{w}^T]x_0 \\
&=(\sigma^2+(x_0^Tw)^2)-0+x_0^T(Var[\hat{w}]+E[\hat{w}]E[\hat{w}]^T)x_0\\
&=\sigma^2+x_0^T(w-E[\hat{w}])(w-E[\hat{w}])^T)x_0+x_0^TVar[\hat{w}]x_0\\
&=noise+square\ bias+variance
\end{aligned}
$$

## Active Learning

If we can only measure for limited extra times, for example, 5 times more, then how could we best utilize them?

We need to measure the value that we are least sure about, which is the value with the maximal variance.

  1. Form predictive distribution $p(y_0|x_0, y, X) for all unmeasured $x_0 \in D$
 2. Pick the $x_0$ for which $\sigma_0^2$ is largest and measure $y_0$
 3. Update the posterior $p(w|y; X)$ where $y\leftarrow(y; y_0)$ and $X \leftarrow (X; x_0)$
 4. Return to #1 using the updated posterior

And for LR, it is maximizing $x_0^T\Sigma x_0$.

In fact, this process is minimizing the entropy, which is
$$
H(p)=-\int p(z)\ln p(z)dz
$$
And the entropy for multivariate Gaussian is:
$$
H(N(w|\mu, \Sigma))=\frac{1}{2}\ln((2\pi e)^d|\Sigma|)
$$
And adding $x_0$ would make the variance increase by
$$
(\lambda I+\sigma^{-2}X^TX)^{-1}\equiv\Sigma \Rightarrow
(\lambda I+\sigma^{-2}(x_0x_0^TX^TX))^{-1}\equiv(\Sigma^{-1}+\sigma^{-2}x_0x_0^T)^{-1}
$$
And the change in entropy is:
$$
H_{post}=H_{prior}-\frac{d}{2}\ln(1+\sigma^{-2}x_0^T\Sigma x_0)
$$
Hence, this method is a greedy algorithm to minimize entropy.

## Undetermined Linear Equations

If there are more dimensions than observations, i.e. $d \gg n$. And now $w$ has an infinite number of solutions satisfying $y = Xw$.
$$
\left[ {\begin{array}{c}
   \\
   y\\
   \\
\end{array} } \right] = 
\left[ {\begin{array}{c}
   &&&&&&&&&&\\
   &&&&&X&&&&&\\
   &&&&&&&&&&\\
\end{array} } \right]
\left[ {\begin{array}{c}
   &&\\
   &&\\
   &&\\
   &&\\
   &w&\\
   &&\\
   &&\\
   &&\\
   &&
\end{array} } \right]
$$

### Least Norm

One possible solution is
$$
w_{ln}=X^T(XX^T)^{-1}y \Rightarrow Xw_{ln}=y
$$
We can show that $w_{ln}$ is the one with smallest $l_2$ norm.

Proof: If there is another solution $w$ , we have $X(w-w_{ln})=0$. Also,
$$
\begin{aligned}
(w-w_{ln})^Tw_{ln}&=(w-w_{ln})^TX^T(XX^T)^{-1}y\\
&=(X(w-w_{ln}))^T(XX^T)^{-1}y=0
\end{aligned}
$$
And this orthogonal relation gives us
$$
||w||^2=||w-w_{ln}+w_{ln}||^2=||w-w_{ln}||^2+||w_{ln}||^2>||w_{ln}||^2
$$

### Lagrange Multiplier

Introduce Lagrange multipliers:
$$
L(w, \eta)=w^Tw+\eta^T(Xw-y)
$$
We will maximize over $\eta$ and minimize over $w$. (So much like how to derive the dual form for linear programming!). And this would force $Xw=y$.

And the optimality gives us
$$
\nabla_wL=2w+X^T\eta=0, \nabla_\eta L=Xw-y=0
$$

1. From the first condition we have: $w=-X^T\eta/2$
2. Plug #1 into second condition to find: $\eta=-2(XX^T)^{-1}y$
3. Plug #2 back into #1 to find: $w_{ln}=X^T(XX^T)^{-1}y$

## LASSO

LS and RR are not suited for high-dimensional data, because:

- They weight all dimensions without favoring subsets of dimensions.
-  The unknown “important” dimensions are mixed in with irrelevant ones.
- They generalize poorly to new data, weights may not be interpretable.
- LS solution not unique when d > n, meaning no unique predictions.

One intuition why RR is not good for high dimensional data is that the quadratic penalty will reduce more when reducing the larger terms, and will leave all terms of $w$ small but not 0.

And to find a sparse solution (solution with many 0s), we need to use a linear penalty term. And that is why we introduce LASSO.

### Model definition

$$
w_{lasso}=arg\min_w||y-Xw||^2_2+\lambda||w||_1
$$

where $||w||_1=\sum_{i=1}^d|w_j|$.

With this penalty, the cost reduction does not depend on the magnitude of $w_j$, which helps to get a sparse solution.

![lasso degrees of freedom](https://andrewgelman.com/wp-content/uploads/2013/03/Screen-Shot-2013-03-17-at-10.43.11-PM.png)

From the above figure, we could observe that with the increasing of $\lambda$, which is the decreasing of $df(\lambda)$, the weight will goes to 0 and will stay at 0. (In some special case, they may leave 0, but it's rare).

And more generally speaking, there is $l_p$ regression, where $p=1$ is LASSO and $p=2$ is RR. And notice when $p<1$, the penalty is no longer convex and we cannot get an global optimum.

## Greedy Sparse Regression

We will use the LS to help pick the sparse solution. And the algorithm we used here is called orthogonal matching pursuits, as its name suggests, we would gradually add the $X_j$, which is the column of $X$ to our solution if $X_j$ has the smallest angle with the residue. To be more specific, there are two steps:

1. Find the least squares solution and the residual,
   $$
   w_{LS}^k=(X_{I_k}^TX_{I_k})^{-1}X_{I_k}^Ty,\ \ \ \ 
   r^{(k)}=y-X_{I_k}w_{LS}^{(k)}
   $$

2. Add the column of X to $I_k$ that correlates the most with the error,

   Pick $j$th column of $X$, (called $X_j$), where $j = arg\max_{j'} \frac{|X^T_{j'}r^{(k)}|}{||X_{j'}||_2||r^{(k)}||_2}$ 

## Least Absolute Deviation

### Model Definition

$$
w_{LAD}=arg\min_w \sum_{i=1}^n|y_i-f(x_i;w)|
$$

It is no explicit solution for LAD, but we can find one using linear programming.

### Probabilistic Interpretation

If we assume the error has a Laplace distribution, which is
$$
f(y|\mu, b)=\frac{1}{2b}e^{\frac{-|x-\mu|}{b}}
$$
Then its ML solution would be LAD.