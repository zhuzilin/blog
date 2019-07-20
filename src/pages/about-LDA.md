---
title: About LDA
date: 2019-04-25 14:20:00
tags: ["machine-learning", "math"]
---

## Probabilistic Topic Model

- Learns distributions on words called “topics” shared by documents
- Learns a distribution on topics for each document
- Assigns every word in a document to a topic

## LDA

There are two essential ingredients to latent Dirichlet allocation (LDA)

1. A collection of distributions on words (the distribution of words on certain topic).
2. A distribution on topics for each document.

The generative process for LDA is:

1. Generate each topic, which is a distribution on words
   $$
   \beta_k\sim Dirichlet(\gamma), k=1, ...K
   $$
   notice that $\beta_k$ is a $V$ dimension vector where $V$ is the size of the vocabulary. And the 	$\gamma$ is also $V$ dimensional parameter.

2. For each document, generate a distribution on topics

$$
\theta_d\sim Dirichlet(\alpha), d=1, ..., D
$$

3. For the $n$th word in the $d$th document:

   (a) Allocate the word to a topic, $c_{dn}\sim Discrete(\theta_d)$

   (b) Generate the word from the selected topic, $x_{dn}\sim Discrete(\beta_{c_{dn}})$

In this way, we generate all documents.

Before we talk about how to inference of the parameters, we need to know the meaning of this model.

## Unigram Model

First, let's put the topic model aside, and find out the difference between the frequentist or Bayesian.

For a unigram model, we assume the vocabulary size is $V$. And a document is $d=\vec{w}=(w_1, w_2, ..., w_n)$. The frequency of words are $\vec{n}=(n_1, n_2, ..., n_V)$.

### Frequentist

For a frequentist point of view, there is only one dice with $V$ faces. And the probability of the words in the corpus is:
$$
p(\vec{n})=Mult(\vec{n}|\vec{p}, N)=\left(\begin{array}{c}
n\\
\vec{n}
\end{array}\right)
\prod_{k=1}^Vp_k^{n_k}
$$
And using MLE to maximize the probability, we have
$$
\hat{p}_i=\frac{n_i}{N}
$$

### Bayesian

The Bayesian thinks the dice has a prior. And since Dirichlet distribution is the conjugate distribution of multinomial distribution, the priori is picked as Dirichlet distribution.
$$
Dir(\vec{p}|\vec{\alpha})=\frac{1}{\Delta(\vec{\alpha})}\prod_{k=1}^Vp_k^{\alpha_k-1}
$$
And the posteriori is 
$$
p(\vec{p}|W, \vec{\alpha})=Dir(\vec{p}|\vec{n}+\vec{\alpha})=\frac{1}{\Delta(\vec{n}+\vec{\alpha})}\prod_{k=1}^Vp_k^{\vec{n}+\alpha_k-1}
$$
And we could maximize the posteriori or use the expectation. If we use the expectation,
$$
\hat{p}_i=\frac{n_i+\alpha_i}{\Sigma_{i=1}^V(n_i+\alpha_i)}
$$

## Topic Model

Now let's take the topic into account. The corpus consists of $D$ documents, $C=(d_1, d_2, ..., d_D)$.

This time, we have 2 kinds of dices. The first one has $K$ faces, corresponds to $K$ topics and the second one has $V$ faces, corresponds to $V$ words.

### Frequentist (PLSA)

For frequentist, we have $D$ dice of the first kind, one for each document, named as $\vec{\theta_1}, ..., \vec{\theta_D}$. And $K$ for the second, named as $\beta_1, ..., \beta_K$. We first roll the first kind to decide the topic and use the topic to decide the word.

In this way, for a given word $w$ in document $m$ we have:
$$
p(w|d_m)=\sum_{k=1}^Kp(w|k)p(k|d_m)=\sum_{k=1}^K\beta_{kw}\theta_{mk}
$$
And the probability of a document is:
$$
\begin{aligned}
p(\vec{w}|d_m)&=\prod_{i=1}^{n_m}\sum_{k=1}^Kp(w_i|k)p(k|d_m)\\
&=\prod_{i=1}^{n_m}\sum_{k=1}^K\beta_{kw_i}\theta_{mk}
\end{aligned}
$$
This is similar to GMM and can be solved with EM.

### Bayesian (LDA)

For Bayesian, still, there are Dirichlet priori for each dices. And the difference between LDA and PLSA would be the same as the difference between the Bayesian and frequentist in the unigram model.

Notice the property of Dirichlet distribution. When the parameter is small, it tends to generate sparse vector. Which makes the assumption that few words is relevant to a topic and a document is relevant to few topics, which is a very important factor why IDA works.

### Inference

It is common to use Gibbs sampling to solve the LDA rather than EM. We will talk about is some time later.

## Reference

1. <https://www.zhihu.com/search?type=content&q=LDA>