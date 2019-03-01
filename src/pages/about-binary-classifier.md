---
title: About Binary Classifier
date: 2019-02-25 18:35:00
tags: ["machine-learning"]
---

There is a summary of many rudimental binary classifier. And for more complex ones like SVM, there will be a post in the future.

## Bayes Classifier

For any classifier $f: \mathcal{X}\rightarrow \mathcal{Y}$, its prediction error is:
$$
P(f(X) \neq Y)=\mathbb{E}[1\!\!1(f(X) \neq Y)]
=\mathbb{E}[\mathbb{E}[1\!\!1(f(X) \neq Y)|X]]
$$
And for each $x\in \mathcal{X}$,
$$
\mathbb{E}[1\!\!1(f(X)\neq Y)|X=x]
=\sum_{y\in \mathcal{Y}}P(Y=y|X=x)1\!\!1(f(x)\neq y)
$$
For this fixed $x$, to minimize the above value, we just need to maximize the only term that is not in the sum, which is
$$
P(Y=y|X=x)1\!\!1(f(x)= y)
$$
Therefore, the optimal classifier would be:
$$
f(x)=arg\max_{y\in\mathcal{Y}}P(Y=y|X=x)
$$
The classifier with the above property for all $x\in\mathcal{X}$ is called the Bayes classifier. In other words, the Bayes classifier will always predict the $y$ with the highest probability. And it has the smallest prediction error among all classifier.

And from the Bayes rule, we have
$$
f(x)=arg\max_{y\in\mathcal{Y}}\frac{P(Y=y, X=x)}{P(X=x)}
=arg\max_{y\in\mathcal{Y}}P(Y=y)\times P(X=x|Y=y)
$$
Notice, since we have fix $x$, $P(X=x)$ is a constant value. And we can interpret the new formula as the product of **class prior** and **data likelihood|class**. In practice, we don't know any of them, so we approximate them.

Aside: If $X$ is a continuous variable, replace $P$ with $p$.

For example, we could give the following assumption:

- **Class prior**: $P(Y=y)=\pi_y$

- **Class conditional density**
  $$
  p_y(x)=N(x|\mu_y, \sigma_y^2), for y\in\{0, 1\}
  $$

- **Bayes classifier**: 
  $$
  \begin{aligned}
  f(x)&=arg\max_{y\in\{0, 1\}}p(X=x|Y=y)P(Y=y)\\
  &=
  \left\{{\begin{array}{c}
  1 & if 
  \frac{\pi_1}{\sigma_1}exp[-\frac{(x-\mu_1)^2}{2\sigma_1^2}]>
  \frac{\pi_0}{\sigma_0}exp[-\frac{(x-\mu_0)^2}{2\sigma_0^2}]\\
  0 & otherwise
  \end{array}}\right.
  \end{aligned}
  $$
  

![gaussian bayes](https://www.researchgate.net/profile/Yune_Lee/publication/255695722/figure/fig1/AS:297967207632900@1448052327024/Illustration-of-how-a-Gaussian-Naive-Bayes-GNB-classifier-works-For-each-data-point.png)

This type of classifier is called a **generative model**. Because we are modeling $x$ and $y$ together in a distribution, instead of plug $x$ into a distribution on $y$.

### Plug-in classifier

We can also approximate the distribution purely on the data. This method is called **Plug-in classifiers**.

Still for the above gaussian model, we could estimate the parameter in the distribution as 

- **Class priors**: 
  $$
  \hat{\pi}_y=\frac{1}{n}\sum_{i=1}^n1\!\!1(y_i=y)
  $$

- **Class conditional density**:
  $$
  \begin{aligned}
  \hat{\mu}_y&=\frac{1}{n_y}\sum_{i=1}^n1\!\!1(y_i=y)x_i\\
  \hat{\Sigma}_y&=\frac{1}{n_y}\sum_{i=1}^n1\!\!1(y_i=y)(x_i-\hat{\mu}_y)(x_i-\hat{\mu}_y)^T
  \end{aligned}
  $$

### Naive Bayes

Naïve Bayes is a Bayes classifier that has the following assumption
$$
p(X=x|Y=y)=\Pi_{j=1}^d p_j(x[j]|Y=y)
$$
which is assuming the dimensions of $X$ as conditional independent given $y$.

And then we could use the plug-in method to estimate the distribution. 

## Linear Classifier

Back to the Bayes classifier. For the binary classification, $y=1$ if
$$
\begin{aligned}
p(x|y=1)P(y=1)&>p(x|y=0)P(y=0)\\
&\Updownarrow\\
\ln{\frac{p(x|y=1)P(y=1)}{p(x|y=0)P(y=0)}}&>0
\end{aligned}
$$
And if we assume
$$
p(x|y)=N(x|\mu_y, \Sigma)
$$
which is they have the same covariance matrix
$$
\begin{aligned}
\ln{\frac{p(x|y=1)P(y=1)}{p(x|y=0)P(y=0)}}=&\ln\frac{\pi_1}{\pi_0}-\frac{1}{2}(\mu_1+\mu_0)^T\Sigma^{-1}(\mu_1-\mu_0)\\
&+x^T\Sigma^{-1}(\mu_1-\mu_0)
\end{aligned}
$$
This is called "linear discriminant analysis". And in this way, we turn this Bayes classifier into a linear one
$$
f(x)=sign(x^Tw)
$$
For assumption
$$
p(x|y)=N(x|\mu_y, \Sigma_y)
$$
we have
$$
\begin{aligned}
\ln{\frac{p(x|y=1)P(y=1)}{p(x|y=0)P(y=0)}}=&something\ not\ involving\ x\\
&+x^T(\Sigma^{-1}_1\mu_1-\Sigma^{-1}_0\mu_0)\\
&+x^T(\Sigma^{-1}_1/2-\Sigma^{-1}_0/2)x\\
\end{aligned}
$$
This means that when having different covariant matrix, we could have a polynomial regression.

In LDA above, $w$ and $w_0$ are fixed, which may be too restrictive and we may do better with other values. How could we get a more general classifier?

### Least Square

The first thought is use least square.

![least square linear classifier](https://i.stack.imgur.com/HwN5w.png)

The problem is that this method is very sensitive to outlier and therefore performs badly.

### The Perceptron Algorithm

If we just think of the value of wrongly classified data points, we could avoid the outlier problem in the least square method. So in perceptron, the loss function is
$$
\mathcal{L}=-\sum_{i=1}^n(y_ix_i^Tw)1\!\!1\{y_i\neq sign(x_i^Tw)\}
$$
And we will use gradient descent to solve this problem.

But the problem of perceptron is it can only deal with data that is linear separable.

### Logistic Regression

We could directly plug in the linear representation for the log odds:
$$
\ln{\frac{p(y=+1|x)}{p(y=-1|x)}}=x^Tw
$$
And we would have
$$
p(y=+1|x)=\sigma(w)=\frac{e^{x^Tw}}{1+e^{x^Tw}}
$$
Notice, this is a discriminative classifier, because only the conditional distribution is formed.

The loss function would be the likelihood, which is
$$
\begin{aligned}
L&=\Pi_{i=1}^np(y_i|x_i, w)\\
&=\Pi_{i=1}^n\sigma_i(w)^{1\!\!1(y_i=+1)}(1-\sigma_i(w))^{1\!\!1(y_i=-1)}
\end{aligned}
$$
Also, we could use the gradient descent to minimize likelihood to get an ideal $w$. Notice that when updating $w$, we would weight each data point by the degree of correctness, which makes logistic regression outlier invulnerable.

The problem for logistic regression is:

- If data is linear separable, then $||w_{ML}||_2\rightarrow\infty$. In other words, the gradient descent will not converge. This is because go to infinity could drives $\sigma_i(y_i w)\rightarrow1$ for all $(x_i, y_i)$ and maximize the likelihood.
- For nearly separable data, it may get a few very wrong in order to be more confident about the rest, which is overfitting.

And the solution would be add a regularization term to the loss function. And from the probabilistic point of view, it is maximizing the posterior distribution (MAP) while assuming the prior has a normal distribution.
$$
\begin{aligned}
w_{MAP}&=arg\max_w\ln p(w|y, x)\\
&=arg\max_w\ln p(y|w,x)+\ln p(w)\\
&=arg\max_w\sum_{i=1}^n\ln\sigma_i(y_iw)-\lambda w^Tw
\end{aligned}
$$
And as in the linear regression case, we would use $\lambda w^Tw$ as the penalty term.

### Bayesian logistic regression and Laplace approximation

From the prior we just used ($w\sim N(0, \lambda^-1I)$), we have
$$
p(w|x, y)=\frac{p(w)\Pi_{i=1}^n\sigma_i(y_iw)}{\int p(w)\Pi_{i=1}^n\sigma_i(y_iw)dw}
$$
which we cannot calculate directly.

Our strategy is to approximate $p(w|x, y)$ with an normal distribution and we need a method for setting $\mu$ and $\Sigma$.

We would use the Laplace approximation to estimate it.
$$
\begin{aligned}
p(w|x,y)&=\frac{p(y,w|x)}{p(y|x)}=\frac{p(y,w|x)}{\int p(y,w|x)dw}\\
&=\frac{e^{\ln p(y,w|x)}}{\int e^{\ln p(y,w|x)}dw}
\end{aligned}
$$
Let's define $f(w)=\ln p(y,w|x)$. If we use the Taylor expansion, we could have
$$
f(w)\approx f(z)+(w-z)^T\nabla f(z)+\frac{1}{2}(w-z)^T(\nabla^2f(z))(w-z)
$$
where $z = w_{MAP}$. And since $w_{MAP}$ would leads to $\nabla f(z)=0$, we have
$$
p(w|x,y)=\frac
{e^{-\frac{1}{2}(w-w_{MAP})^T(-\nabla^2f(w_{MAP}))(w-w_{MAP})}}
{\int e^{-\frac{1}{2}(w-w_{MAP})^T(-\nabla^2f(w_{MAP}))(w-w_{MAP})}dw}
$$
which makes
$$
\begin{aligned}
\mu&=w_{MAP}\\
\Sigma&=(-\nabla^2\ln p(y, w_{MAP}|x))^{-1}
\end{aligned}
$$
And what  we have is that the posterior distribution would be approximately a gaussian distribution.