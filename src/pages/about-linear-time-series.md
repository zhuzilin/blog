---
title: About Linear Time Series
date: 2019-03-08 21:54:00
tags: ["machine-learning"]
---

This post mainly uses material from *Analysis of Financial Time Series*.

## Stationarity

Stationarity is the foundation of time series analysis.

### Strictly stationary

If the joint distribution of $(r_{t1}, ..., r_{tk})$ is identical to that of $(r_{t1_t}, ..., r_{tk_t})$, where $k$ is an arbitrary positive integer and  $(t_1, ..., t_k)$ is a collection of k positive integers.

This is a really strong condition.

### Weak stationary

$\{r_t\}$ is weak stationary if
$$
E[r_t]=\mu, Cov(r_t, r_{t-l})=\gamma_l
$$
In application, weak stationary enables one to make inference concerning future obeservations.

We can assume that the first two moment of a weak stationary series is finite. And if $\{r_t\}$ is normally distributed, weak stationary is equivalent to strict stationary.

Also, $\gamma_l$ is called the lag-$l$ autocovariance of $r_t$. And we have
$$
\gamma_0=Var(r_t), \gamma_{-l}=\gamma_l
$$

### Correlation and autocorrelation function (ACF)

**Correlation efficient**:
$$
\rho_{x,y}=\frac{Cov(X, Y)}{\sqrt{Var(X)Var(Y)}}=\frac{E[(X-\mu_x)(Y-\mu_y)]}{\sqrt{E[(X-\mu_x)^2E[(Y-\mu_y)^2]}}
$$
And empirically, we can insert mean as the expectation in the formula.

**Autocorrelation Function (ACF)**:

Consider a weak stationary series
$$
\rho_l=\frac{Cov(r_t, r_{t-l})}{\sqrt{Var(r_t)Var(r_{t-l})}}=\frac{Cov(r_t, r_{t-l})}{Var(r_t)}=\frac{\gamma_l}{\gamma_0}
$$
Then, the empirical estimation of $\hat{\rho_1}$.
$$
\hat{\rho}_l=\frac{\sum_{t=l+1}^T(r_t-\bar{r})(r_{t-l}-\bar{r})}{\sum_{t=1}^T(r_t-\bar{r})}
$$
The $\bar{r}$ is the mean across the whole data.

This empirical estimation is called **sample autocorrelation function**. It plays an important role in linear series analysis.

## White Noise

A time series $r_t$ is called a white noise if $\{r_t\}$ is a sequence of independent and identically distributed random variables with finite mean and variance. In particular, if $r_t$ is normally distributed with mean 0 and variance $\sigma^2$, the series is called a **Gaussian white noise**.

For white noise, all ACFs are zero.

## Linear Time Series

A time series $r_t$ is said to be linear if
$$
r_t=\mu+\sum_{i=0}^\infty \psi_i a_{t-i}
$$
Where $\{a_t\}$ is a white noise sequence. And we define $\psi_0=1$

For this model, we have
$$
E[r_t]=\mu, Var(r_t)=\sigma_a^2\sum_{i=0}^\infty\psi_i^2
$$
If variance exist, we will have $\psi_i^2\rightarrow0, (i\rightarrow\infty)$

And lag-$l$ is:
$$
\begin{aligned}
\gamma_l &= Cov(r_t, r_{t-l}) = E[(\sum_{i=0}^\infty\psi_ia_{t-i})(\sum_{j=0}^\infty\psi_ja_{t-l-j})]\\
&=E[\sum_{i,j=0}^\infty\psi_i\psi_ja_{t-i}a_{t-l-j}]\\
&=\sum_{j=0}^\infty\psi_{j+l}\psi_jE[a_{t-l-j}^2]=\sigma_a^2\sum_{j=0}^\infty\psi_{j+l}\psi_j
\end{aligned}
$$
Therefore
$$
\rho_l=\frac{y_l}{y_0}=\frac{\sum_{i=0}^\infty\psi_{j+l}\psi_j}{1+\sum_{i=1}^\infty\psi_j^2}
$$
For weak stationary time series, the variance exist, and therefore we will have $\rho_l\rightarrow0, (l\rightarrow\infty)$.

## AR

Consider a monthly return $r_t$, the lag-1 will be large and therefore $r_{t-1}$ might be useful in predicting $r_t$. The simple model for this is:
$$
r_t=\phi_0+\phi_1 r_{t-1}+a_t
$$
The model is in the same form as linear regression, therefore we call is **autoregressive model** of order 1, or simply AR(1). There are also lots of similarity and difference between AR and linear regression, which we will talk about later. For now, we have
$$
E(r_t|r_{t-1})=\phi_0+\phi_1r_{t-1}, Var(r_t|r_{t-1})=\sigma_a^2
$$
This is Markov property. And there will be AR(p) which is
$$
r_t=\phi_0+\phi_1 r_{t-1}+\dots +\phi_pr_{t-p} + a_t
$$

### Properties

**AR(1)**

From stationary, we will have
$$
\mu = \phi_0+\phi_1\mu
$$
And therefore
$$
\begin{aligned}
r_t-\mu &= \phi_1(r_{t-1}-\mu)+a_t\\
(r_t-\mu)(r_{t-l}-\mu) &= \phi_1(r_{t-1}-\mu)(r_{t-l}-\mu)+a_t(r_{t-l}-\mu)\\
\end{aligned}
$$
Therefore
$$
\gamma_l = \left\{\begin{array} {l}
	\phi_1\gamma_{1}+\sigma_a^2,\ if\ l=0\\
	\phi_1\gamma_{l-1},\ otherwise\\
	\end{array}\right.
$$
And also from stationary
$$
\gamma_0=\phi_1^2\gamma_0+\sigma_a^2
$$
We could have
$$
\rho_l=\phi_1\rho_{l-1}=\phi_1^l\rho_0=\phi_1^l
$$
**AR(2)**

Use the similar method, we have
$$
\mu=\frac{\phi_0}{1-\phi_1-\phi_2}
$$
And also
$$
\gamma_l=\phi_1\gamma_{l-1}+\phi_2\gamma_{l-2}\\
\rho_l=\phi_1\rho_{l-1}+\phi_2\rho_{l-2}
$$
Therefore
$$
\rho_1=\phi_1\rho_{0}+\phi_2\rho_{-1}=\phi_1+\phi_2\rho_1
$$
And 
$$
\rho_l = \left\{\begin{array} {l}
	\frac{\phi_1}{1-\phi_2},\ if\ l=1\\
	\phi_1\rho_{l-1}+\phi_2\rho_{l-2},\ if\ l\geq2\\
	\end{array}\right.
$$
**AR(p)**
$$
\rho_l=\phi_1\rho_{l-1}+\phi_2\rho_{l-2}+\dots+\phi_p\rho_{l-p}
$$

### How to identify AR model

There are two general methods to identify the p of AR model.

- **Partial Autocorrelation Function (ACF)**

PACF of a stationary time series is a function of its ACF and is a useful tool for determining the order $p$ of an AR model.

Consider the following AR models:
$$
\begin{aligned}
r_r&=\phi_{0,1}+\phi_{1,1}r_{t-1}+e_{1t},\\
r_r&=\phi_{0,2}+\phi_{1,2}r_{t-1}+\phi_{2,2}r_{t-2}+e_{1t},\\
r_r&=\phi_{0,3}+\phi_{1,3}r_{t-1}+\phi_{2,3}r_{t-2}+\phi_{3,3}r_{t-3}+e_{1t},\\
&\vdots
\end{aligned}
$$
These models are in the form of a multi-dimension linear regression and can be estimated by the least-squares method. The estimated $\hat{\phi}_{1,1}$ is called the lag-1 sample PACF of $r_t$ and $\hat{\phi}_{2,2}$ is the lag-2 sample PACF and so on.

From the definition, the lag-p sample PACF shows the added contribution of $r_{t-p}$ to an AR(p-1) model. Therefore, for an AR(p) model, the lag-p sample PACF  should not be zero and the latter ones should be close to zero.

- **Information Criteria**

There are several information based criteria available to determine the p. All of them are likelihood based, like **Akaike information criterion(AIC)**.

### Goodness of Fit

$$
R^2=1-\frac{residual\ sum\ of\ squares}{total\ sum\ of\ squares}
$$

For a stationary AR(p) model, the measure becomes
$$
R^2=1-\frac{\sum_{t=p+1}^T\hat{a}_t^2}{\sum_{t=p+1}^T(r_t-\bar{r}_t)^2}
$$
For a given data set, it is well known that $R^2$ is a nondecreasing function of the number of parameters used. To overcome this weakness, we could use the adjusted $R^2$:
$$
R_{adj}^2=1-\frac{\hat{\sigma}_a^2}{\hat{\sigma}_r^2}
$$

## MA

Think of a special case of AR
$$
r_t+\theta_1r_{t-1}+\theta_1^2r_{t-2}+\dots=\phi_0+a_t
$$
And since
$$
r_{t-1}+\theta_1r_{t-2}+\theta_1^2r_{t-3}+\dots=\phi_0+a_{t-1}
$$
We have
$$
r_t=\phi_0(1-\theta_1)+a_t-\theta_1a_{t-1}
$$
Therefore, MA(1) is:
$$
r_t=c_0+a_t-\theta_1a_{t-1}
$$
And MA(q) is
$$
r_t=c_0+a_t-\theta_1a_{t-1}-...-\theta_qa_{t-q}
$$

### Properties

**Moving-average** models are always weakly stationary because they are finite linear combination of a white noise sequence.
$$
\mu=c_0, Var(r_t)=(1+\theta_1^2+\theta_2^2+\dots+\theta_1^2)\sigma_a^2
$$
**ACF**

For simplicity assume $c_0=0$
$$
r_{t-l}r_t=r_{t-l}a_t-\theta_1r_{t-l}a_{t-1}
$$
Therefore
$$
\gamma_l = \left\{\begin{array} {l}
	-\theta_1\sigma_a^2,\ l=1\\
	0,\ l>1\\
	\end{array}\right.
$$
And
$$
\rho_l = \left\{\begin{array} {l}
	1,\ l=0\\
	-\frac{\theta_1}{1+\theta_2^2},\ l=1\\
	0,\ l>1\\
	\end{array}\right.
$$
And for MA(q), we could have only the lag-q is not 0 but above are 0. MA(q) is only linearly related to its first 1-lagged values and hence is a "finite memory" model.

### How to identify MA model

We could just use the property of ACF to identity $q$ for MA.

## ARMA

An ARMA model combines the idea of AR and MA into a compact form so that the number of parameters used is kept small. For the  return series in finance the chance of using ARMA is low. However, it is highly relevant in volatility modeling. The simple ARMA(1, 1) is
$$
r_t-\phi_1r_{t-1}=\phi_0+a_t-\theta_1a_{t-1}
$$
to make the function meaningful, we need $\phi_1\neq\theta_1$

And the general form is
$$
r_t-\phi_1r_{t-1}-\dots-\phi_pr_{t-p}=\phi_0+a_t-\theta_1a_{t-1}-\dots-\theta_qa_{t-q}
$$

### Properties

Here we only consider the properties for ARMA(1, 1)

From stationary, we have
$$
\mu-\phi_1\mu=\phi_0\\
$$
And assume $\phi_0=0$ for simplicity, we have
$$
\begin{aligned}
Var(r_t)&=\phi_1^2Var(r_{t-1}^2)+\sigma_a^2+\theta_1^2\sigma_a^2-2\phi_1\theta_1E(r_{t-1}a_{t-1})\\
&=\phi_1^2Var(r_{t-1}^2)+(1-2\phi_1\theta_1+\theta_1^2)\sigma_a^2
\end{aligned}
$$
And for ACF,
$$
r_tr_{t-l}-\phi_1r_{t-1}r_{t-l}=a_tr_{t-l}-\theta_1a_{t-1}r_{t-l}
$$
We have
$$
\gamma_l = \left\{\begin{array} {l}
	\phi_1\gamma_0-\theta_1\sigma_a^2,\ l=1\\
	\phi_1\gamma_{l-1},\ l>1\\
	\end{array}\right.
$$
And 
$$
\rho_l = \left\{\begin{array} {l}
	\phi_1\rho_0-\frac{\theta_1\sigma_a^2}{\gamma_0},\ l=1\\
	\phi_1\rho_{l-1},\ l>1\\
	\end{array}\right.
$$
Thus, ACF of ARMA(1, 1) behaves very much like that of AR(1).

### How to identify MA model

The ACF and PACF are not informative in determining the order of an ARMA model. There is something called **extended autocorrelation function (EACF)** to specify the order of an ARMA process.

## Seasonal model

For seasonal data, there is often strong serial correlation. It is common to do **seasonal differencing** to it, which is
$$
\Delta_k x_t = (1-B^k)x_t=x_t-x_{t-k}
$$
And some time, we need to do multiple differencing, which leads to
$$
\Delta_k(\Delta_lx_t)=(1-B^k)(1-B^l)x_t
$$

## ARIMA

if 
$$
Z_t=(1-B)^dX_t\sim ARMA(p, q)
$$
then $X_t$ is ARIMA(p, d, q).

## References

1. Tsay, Ruey S. *Analysis of financial time series*. Vol. 543. John Wiley & Sons, 2005.