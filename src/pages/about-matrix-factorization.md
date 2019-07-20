---
title: About Matrix Factorization
date: 2019-04-24 12:20:00
tags: ["machine-learning", "math"]
---

Matrix Factorization is a simple way to do collaborative filtering.

![matrix-factorization](https://imgur.com/tAhsuiC.png)
$$
M_{N_1\times N2}=U_{N_1\times d}V_{d\times N_2}
$$


The main idea is that $d \ll min(N_1, N_2)$  and is smaller than the rank of $M$. Actually, it is equivalent to learn a low rank matrix (with rank $d$)  that is similar to $M$.

The reason why we can learn such a low rank matrix is that:

- We assume many columns in $M$ should look similar
- $M$ is sparse and we can use the low rank matrix to fill the missing data.

## Probabilistic Matrix Factorization
Let $\Omega$ contain the pairs $(i, j)$ that $M_{ij}$ is non-zero. And $\Omega_{u_i}$ the rated objects for user $i$, $\Omega_{v_j}$ the users who rated for object $j$.

Assume
$$
\begin{aligned}
u_i\sim N(0, \lambda^{-1} I), i=1,...,N_1\\
v_j\sim N(0, \lambda^{-1} I), j=1,...,N_2
\end{aligned}
$$
And
$$
M_{ij}\sim N(u_i^T v_j, \sigma^2)
$$
Though for $M$ as rating, it does not make sense to use a normal distribution. However, this assumption works well.

And we need to maximize:
$$
p(M_o, U, V)=[\prod_{(i,j)\in \Omega}p(M_{ij}|u_i, v_j)]\times
[\prod_{i=1}^{N_1}p(u_i)][\prod_{j=1}^{N_2}p(v_j)]
$$
Where $M_o$ are the observed terms of $M$.

Notice that for general assumption, this is a problem with missing values and should use EM to solve iteratively. However, applying the gaussian assumption to this posteriori, we have:
$$
\mathcal{L}=-\sum_{(i, j)\in\Omega}\frac{1}{2\sigma^2}||M_{ij}-u_i^Tv_j||^2
-\sum_{i=1}^{N_1}\frac{\lambda}{2}||u_i||^2-\sum_{j=1}^{N_2}\frac{\lambda}{2}||v_j||^2
+constant
$$
And we apply derivation on them directly,
$$
\begin{aligned}
\nabla_{u_i}\mathcal{L}=\sum_{j\in\Omega_{u_i}}\frac{1}{\sigma^2}(M_{ij}-u_i^Tv_j)v_j-\lambda u_i=0\\
\nabla_{v_j}\mathcal{L}=\sum_{i\in\Omega_{v_j}}\frac{1}{\sigma^2}(M_{ij}-u_i^Tv_j)u_i-\lambda v_j=0
\end{aligned}
$$
Therefore
$$
\begin{aligned}
u_i=(\lambda\sigma^2I+\sum_{j\in\Omega_{u_i}}v_jv_j^T)^{-1}(\sum_{j\in\Omega_{u_i}}M_{ij}v_j)\\
v_j=(\lambda\sigma^2I+\sum_{i\in\Omega_{v_j}}u_iu_i^T)^{-1}(\sum_{i\in\Omega_{v_j}}M_{ij}u_i)\\
\end{aligned}
$$
And for this, we need a coordinate ascent algorithm to iteratively get the optimum.

## Relation with ridge regression

From the objective function, if we see from the $v_j$'s point of view, it is basically a ridge regression.

So the model is a set of $N_1+N_2$ coupled ridge regression problems.

If we remove the prior term, which makes
$$
v_j=(\sum_{i\in\Omega_{v_j}}u_iu_i^T)^{-1}(\sum_{i\in\Omega_{v_j}}M_{ij}u_i)
$$
It is the least square solution (not MAP any more). But in this case, the assure that the inversibility, each object must be rated by at least $d$ users, which is probably not the case.

## Nonnegative Matrix Factorization

Some times, we need $U$ and $V$ nonnegative. For example, let $M_{ij}$ be the number of times word $i$ appears in document $j$. We have two object function:

**Choice 1: Squared error objective**
$$
\begin{aligned}
||X-WH||^2&=\sum_i\sum_j(X_{ij}-(WH)_{ij})^2
\end{aligned}
$$

**Choice 2: Divergence objective**
$$
D(X||WH)=-\sum_i\sum_j[X_{ij}ln(WH)_{ij}-(WH)_{ij}]
$$
Notice apart from the objective function, there should be nonnegative values.

And for these problems, we will use multiplicative algorithms to minimize the objective function. The detail algorithms are in *Algorithms for non-negative matrix factorization*.

And for squared error we have:
$$
\begin{aligned}
H_{kj}\leftarrow H_{kj}\frac{(W^TX)_{kj}}{(W^TWH)_{kj}}\\
W_{ik}\leftarrow W_{ik}\frac{(XH^T)_{ik}}{(WHH^T)_{ik}}
\end{aligned}
$$
as an iterative algorithm.

Probabilistically, the squared error implies a Gaussian distribution
$$
X_{ij}\sim N(\Sigma_kW_{ij}H_{kj}, \sigma^2)
$$
It is incorrect for nonnegative value, but still, it works well.

And for divergence objective
$$
\begin{aligned}
H_{kj}\leftarrow H_{kj}\frac{\Sigma_i W_{ik}X_{ij}/(WH)_{ij}}{\Sigma_i W_{ik}}\\
W_{ik}\leftarrow W_{ik}\frac{\Sigma_j H_{kj}X_{ij}/(WH)_{ij}}{\Sigma_j H_{kj}}
\end{aligned}
$$
as an iterative algorithm.

The probabilistic interpretation is
$$
X_{ij}\sim Pois((WH)_{ij})
$$
Therefore,
$$
\begin{aligned}
ln(P(X_{ij}|W, H))&=\ln{\frac{(WH)_{ij}^{X_{ij}}}{X_{ij}!}e^{-(WH)_{ij}}}\\
&=X_{ij}\ln{(WH)_{ij}}-(WH)_{ij} + constant
\end{aligned}
$$
Hence, minimizing the divergence objective function is equivalent to maximize the probability.

