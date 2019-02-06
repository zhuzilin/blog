---
title: About MLE
date: 2019-01-30 18:22:00
tags: machine-learning, math
---

It is really common to use maximum likelihood estimator (MLE) in machine learning. But do you ever think about the reason? Apart from the fact that it is prevalent and simple, here is why MLE is a very nice estimator.

## Mean Square Error

Before discussing whether MLE is a good estimator, we need to come up with a criteria. And one of the most popular measure of a estimator is the mean square error (MSE). Here is the definition of MSE:
$$
MSE(\hat\theta)=E[||\hat\theta-\theta||_2^2]=tr{E[[(\hat\theta-\theta)(\hat\theta-\theta)^T]}
$$
where  $\theta$ is the parameter of the statistical model. And from some trivial derivation, we could have a useful decomposition.
$$
MSE(\hat\theta)=tr[var(\hat\theta)]+||bias(\hat\theta-\theta)||_2^2
$$
where
$$
bias(\hat\theta-\theta)=E[\hat\theta]-\theta
$$
And if bias is 0, the estimator is called unbiased.

## Maximum Likelihood Estimator

And there are also a definition for MLE. First, the likelihood function is:
$$
L(\theta; x_1, ..., x_n)=\Pi _{i=1}^nf(x_i;n)
$$
And the MLE of $\theta$ is
$$
\hat\theta^{MLE}=argmax_{\theta\in\Theta}L=argmax_{\theta\in\Theta}log{L}
$$
And for the MLE, there is a hard theorem

**Theorem**

If L is smooth and behave in a nice way (here I omitted the strict conditions), it would 

- $$
  \hat\theta^{MLE}\underrightarrow{\quad P\quad}\theta
  $$

- $$
  \sqrt{n}(\hat\theta^{MLE}-\theta)\underrightarrow{\quad D, n\rightarrow\infty\quad}N(0, I(\theta)^{-1})
  $$

where $I(theta)$ is the Fisher Information matrix.

In a word, MLE is consistent and asymptotic normal. For the prove, please visit here: [prove](https://ocw.mit.edu/courses/mathematics/18-443-statistics-for-applications-fall-2006/lecture-notes/lecture3.pdf).

And there is another theorem gives a lower bound of the variance of an estimator.

**Theorem** Cramer-Rao lower bound

Let $X_1,...,X_n$ be an i.i.d. sample of random variables with density or frequency function $f(x; \theta)$ and assume

- The support of $f(x; \theta)$ (the area where f is not 0) does not depend on $\theta$.

- $f(x; \theta)$ is differentiable with respect to $\theta$ for all x.

then for an **unbiased** estimator $T(X)$ of $\theta$, we will have
$$
var(T(X))\geq \frac{1}{nI(\theta)}
$$
As $n\rightarrow\infty$, MLE would be unbiased (because it is consistent) and therefore the asymptotic optimal estimator. In practice, we could believe that MLE is very good when the sample size is large enough.