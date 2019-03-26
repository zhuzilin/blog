---
title: About EM
date: 2019-03-08 23:00:00
tags: ["machine-learning", "math"]
---

The material of this post is from ESL.

## Two-Component Mixture Model

Suppose we have a model as such:
$$
\begin{aligned}
&Y_1\sim N(\mu_1, \sigma_1^2)\\
&Y_2\sim N(\mu_2, \sigma_2^2)\\
&Y= (1-\Delta)Y_1+\Delta Y_2
\end{aligned}
$$
where 
$$
\Delta\in\{0,1\}\ with\ P(\Delta=1)=\pi 
$$
Therefore, the density function of $Y$ is
$$
f(y)=(1-\pi)\phi_{\theta_1}(y)+\pi\phi_{\theta_2}(y)
$$
Then the log-likelihood would be
$$
\mathcal{\log{L}}(\theta;Z)=\sum_{i=1}^N\log{[(1-\pi)\phi_{\theta_1}(y)+\pi\phi_{\theta_2}(y)]}
$$
It would be hard to calculate the MLE estimator. But if we have the $\Delta_i$, then the log-likelihood would be
$$
\begin{aligned}
\mathcal{\log{L}}(\theta;Z,\Delta)=&\sum_{i=1}^N[(1-\Delta_i)\log{\phi_{\theta_1}(y)}+\Delta_i\log{\phi_{\theta_2}(y)}]\\
&+\sum_{i=1}^N[(1-\Delta_i)\log{(1-\pi)}+\Delta_i\log{\pi}]
\end{aligned}
$$
And the MLE will be much easier.

However, since $\Delta_i$ is unknown, we will proceed in an iterative fashion, substituting for each $\Delta_i$ in its expected value
$$
\gamma_i(\theta)=E(\Delta_i|\theta,y_i)=Pr(\Delta_i=1|\theta,y_i)
$$
From Bayes rule
$$
\begin{aligned}
P(\Delta_i=1|y_i, \theta)&=\frac{P(\Delta_i=1,y|\theta)}{P(y|\theta)}\\
&=\frac{P(y|\Delta_i=1,\theta)P(\Delta_i=1|\theta)}{P(y|\Delta_i=0,\theta)P(\Delta_i=0|\theta)+P(y|\Delta_i=1,\theta)P(\Delta_i=1|\theta)}\\
&=\frac{\phi_{\theta_2}(y_i)\pi}{\phi_{\theta_2}(y_i)\pi+\phi_{\theta_1}(y_i)(1-\pi)}
\end{aligned}
$$


this is also called as the **responsibility** for observation $i$. We use a procedure called the EM algorithm.

1. Take initial guesses for the parameters $\hat{\mu}_1, \hat{\sigma}_1^2, \hat{\mu}_2, \hat{\sigma}_2^2, \hat{pi}$

2. **Expectation Step**: compute the responsibility
   $$
   \hat{\gamma}_i=\frac{\phi_{\theta_2}(y_i)\pi}{\phi_{\theta_2}(y_i)\pi+\phi_{\theta_1}(y_i)(1-\pi)}
   $$

3. **Maximization Step**: compute the weighted means and variance. (notice the soft assignment.)
   $$
   \begin{aligned}
   \hat{\mu}_1=\frac{\sum_{i=1}^N(1-\hat{\gamma}_i)y_i}{\sum_{i=1}^N(1-\hat{\gamma}_i)}&,\ 
   \hat{\sigma}_1^2=\frac{\sum_{i=1}^N(1-\hat{\gamma}_i)(y_i-\hat{\mu}_1)^2}{\sum_{i=1}^N(1-\hat{\gamma}_i)}\\
   \hat{\mu}_2=\frac{\sum_{i=1}^N\hat{\gamma}_iy_i}{\sum_{i=1}^N\hat{\gamma}_i}&,\ 
   \hat{\sigma}_1^2=\frac{\sum_{i=1}^N\hat{\gamma}_i(y_i-\hat{\mu}_1)^2}{\sum_{i=1}^N\hat{\gamma}_i}\\
   \end{aligned}
   $$

4. Iterate 2 and 3 until convergence.

## The EM Algorithm in General

EM algorithm is for problem like above that are  difficult to maximize the likelihood, but is easier to enlarge the sample with latent (unobserved) data. This is called **data augmentation**.

As for the general formulation of the EM algorithm. Assume the log-likelihood is $\mathcal{L}(\theta, Z)$ and the latent variable $Z^m$. Let $T=(Z, Z^m)$ For the above problem, $(Z, Z^m)=(y, \Delta)$.

The EM algorithm would be:

1. Initialize $\hat{\theta}^{(0)}$

2. **Expectation Step**: at the $j$th step, compute:
   $$
   Q(\theta',\hat{\theta}^{(j)})=E(\mathcal{L_0}(\theta'; T)|Z, \hat{\theta}^{(j)})
   $$
   as a function of the dummy argument $\theta'$.

3. **Maximization Step**: determine the new estimate $\hat{\theta}^{(j+1)}$ as the maximizer of $Q(\theta', \hat{\theta}^{(j)})$ over $\theta'$.,  that is
   $$
   \hat{\theta}^{(j+1)}=arg\max_{\theta'}Q(\theta', \hat{\theta}^{(j)})
   $$

4. Iterate steps 2 and 3 until convergence.

There are two major problem for us now to solve. First is why this algorithm is correct and second, how is this algorithm with the weird $Q$ the same as the algorithm we used in the previous section. 

From the Bayes rule, we have
$$
Pr(Z^m|Z, \theta')=\frac{Pr(Z^m,Z| \theta')}{Pr(Z| \theta')}
$$
So we have
$$
Pr(Z|\theta')=\frac{Pr(T| \theta')}{Pr(Z^m|Z, \theta')}
$$
And correspond to log-likelihood:
$$
\mathcal{\log{L}}(\theta',Z)=\mathcal{\log{L}_0}(\theta',T)-\mathcal{\log{L}_1}(\theta',Z^m|Z)
$$
And notice the two term at left are all function of $Z^m$. If we take conditional expectation, 
$$
\begin{aligned}
\mathcal{L}(\theta',Z)&=E[\mathcal{L_0}(\theta',T)|Z, \theta]-E[\mathcal{L_1}(\theta',Z^m|Z)|Z, \theta]\\
&=Q(\theta', \theta)-R(\theta', \theta)
\end{aligned}
$$
For the above problem, 
$$
\mathcal{\log{L}}(\theta',Z)=\sum_{i=1}^N\log{[(1-\pi)\phi_{\theta_1}(y)+\pi\phi_{\theta_2}(y)]}
$$
And
$$
\begin{aligned}
\mathcal{\log{L_0}}(\theta';Z,\Delta)=&\sum_{i=1}^N[(1-\Delta_i)\log{\phi_{\theta_1}(y)}+\Delta_i\log{\phi_{\theta_2}(y)}]\\
&+\sum_{i=1}^N[(1-\Delta_i)\log{(1-\pi)}+\Delta_i\log{\pi}]
\end{aligned}
$$
And
$$
\begin{aligned}
Q(\theta', \theta)&=E[\mathcal{L_0}(\theta',T)|Z, \theta]\\
&=\sum_{i=1}^N[(1-E[\Delta_i|Z, \theta])\log{\phi_{\theta_1}(y)}+E[\Delta_i|Z, \theta]\log{\phi_{\theta_2}(y)}]\\
&+\sum_{i=1}^N[(1-E[\Delta_i|Z, \theta])\log{(1-\pi)}+E[\Delta_i|Z, \theta]\log{\pi}]\\
&=\sum_{i=1}^N[(1-\hat{\gamma}_i)\log{\phi_{\theta_1}(y)}+\hat{\gamma}_i\log{\phi_{\theta_2}(y)}]+\sum_{i=1}^N[(1-\hat{\gamma}_i)\log{(1-\pi)}+\hat{\gamma}_i\log{\pi}]
\end{aligned}
$$
Therefore, the $\theta$ for the above problem is $\hat{\gamma}_i$. $\theta$ are parameter that is calculated by the parameter previous iteration ($\hat{\theta}^{(i)}$).

And the question now is why only maximizing $Q$ could end up get the maximal value for $\log{L}$.

