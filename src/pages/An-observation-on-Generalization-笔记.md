---
title: An observation on Generalization 笔记
date: 2023-08-21 21:30:00
tags: ["LLM", "ML"]
---

感谢 @yili 推荐了 Ilya Sutskever 的新 talk _An observation on Generalization_，这里我贴一个原始的 youtube 链接：https://www.youtube.com/watch?v=AKMuA_TVz3A

本文主要尝试概述一下 talk 里讲了啥，以及在其中补上一些我个人觉得去理解可能需要的内容。一如既往推荐大家去看原视频。

整体来看，这个 talk 希望为无监督学习提供一些理论上的解释，他大概讲了这样的几件事：

- 监督学习是在数学上是 trivial 的；
- 无监督学习和监督学习很不一样；
- 可以尝试从 Kolmogorov compressor 的角度来解释无监督学习是在干啥；
- 如何尝试验证这一理论。

稍微展开一点，也就是：

### 监督学习是在数学上是 trivial 的

在数学上可以证明，如果训练 loss 很低，且数据量远大于模型参数量（自动度），那么测试 loss 也会很低。具体来说，上面这句话可以用下面的公式来表达：
$$
\forall\ \delta\in[0,1],\ \textbf{Pr}_{S\sim D^{|S|}}[\text{Test}_D(f)-\text{Train}_S(f)\le\sqrt{\frac{\log{|F|}+\log{1/\delta}}{|S|}}\ for\ all\ f\in\mathcal{F}] \ge 1-\delta
$$
简单解释一下这里的符号们：

- $D$ 是整个数据集的分布，$S$ 是从 $D$ 中抽出来的一个训练集；
- $\mathcal{F}$ 则是所有可选的函数的集合，$f$ 是这个集合中的一个函数。例如对于深度学习来说，$\mathcal{F}$ 是固定一个神经网络的结构，每选一套参数（注意不是超参）就任意参数值就相当于有一个 $f$，所有参数的可选值产生的函数们的集合是 $\mathcal{F}$；注意，对于现实中的神经网络，**每个参数的可选值是有限的，所以 $\mathcal{F}$ 是个有限集合**；
- $|*|$ 是指一个集合的大小；
- $\text{Train}_S(f)$ 是指训练 loss，也就是 $\frac{1}{|S|}\sum_{(X_i, Y_i)\in S}{L(f(X_i), Y_i)}$，这里 $L$ 是目标函数；
- $Test_D(f)$ 则是指 $f$ 在整个数据集下的表现，所以类似于 $\mathbb{E}(L(f(X), Y))$；

有了这套解释之后，我们会发现，如果这个命题正确的话，那么随着训练集的不断增大（$|S|$ 增大），有：
$$
\forall\ \varepsilon>0,\ \text{lim}_{|S|->\infty}\textbf{Pr}[\text{sup}_{f\in\mathcal{F}}(\text{Test}_D(f)-\text{Train}_S(f))>\varepsilon]=0
$$
这里 $\text{sup}$ 指上界。

也就是说通过最小化 $\text{Train}_S(f)$ 得到的 $f$ 也是 $\text{Test}_D(f)$ 的最优解。这使得我们只需要放心地去收集数据，以及找优化 loss 的最佳方法就好了。

那么为什么这个命题是正确的呢？证明其实挺简单的。由于 Hoeffding's inequality 有：

> 如果 $Z_1$, $Z_2$, ..., $Z_n$ 是 $n$ 个相互独立的随机变量，且满足 $\forall\ i,\ Z_i\in[a, b]$，那么：
> $$
> \forall t\ge0,\ \textbf{Pr}(\frac{1}{n}\sum_{i=1}^n{Z_i-\mathbb{E}[Z_i]}\ge t) \le\text{exp}(-\frac{2nt^2}{(b-a)^2})
> $$

而我们可以假设损失函数 $L$ 是有界的，因为如果其无界，可以通过类似 sigmoid 的单调函数将他映射到有界的范围，为图方便，可以让 $L\in[0,1]$，那么带入就有：
$$
\begin{aligned}
\textbf{Pr}_{S\sim D^{|S|}}[\text{Test}_D(f)-\text{Train}_S(f)\ge t\ for\ some\ f\in\mathcal{F}] &\le\sum_{f\in\mathcal{F}}\textbf{Pr}_{S\sim D^{|S|}}[\text{Test}_D(f)-\text{Train}_S(f)\ge t]\\
&=\sum_{f\in\mathcal{F}}\textbf{Pr}_{\sim D^{|S|}}[\frac{1}{|S|}\sum(L_i-\mathbb{E}[L])\ge t]\\
&\le |\mathcal{F}|exp(-2|S|t^2)
\end{aligned}
$$
也就是 Ilya 列的那 3 行证明。之后我们令 $\delta=|\mathcal{F}|exp(-2|S|t^2)$，就可以得到最上面的式子了（会差一个 2，不过无伤大雅）。

### 无监督学习和监督学习很不一样

因为无监督学习会在训练的时候优化某个目标函数，而在用模型的时候关心的是另外的目标。

### 可以尝试从 Kolmogorov compressor 的角度来解释无监督学习是在干啥

Kolmogorov compressor 即能将输入压缩为一个能产出这个输入的最短的一段代码的压缩器。这个最短的代码的长度就是这个输入的 Kolmogorov complexity。我们定义 $K(X)$，为 $X$ 的 Kolmogorov complexity，根据现有的理论，有：
$$
K(X,Y) = K(X) + K(Y|X)+O(\log(K(X, Y)))
$$
那么 Ilya 认为，无监督学习在做的，就是搜索出 conditional Kolmogorov compressor（能计算 $K(Y|X)$ 的那个），其中的 $X$ 为训练集，$Y$ 为测试集。对应来说，神经网络是电脑，SGD 是搜索方法。

那么在这个基础上，如何解释 next token prediction 这个目标函数呢？参考 [Compression for AGI - Jack Rae](https://www.youtube.com/watch?v=dO4TPJkeaaU) 这个 talk（虽然感觉这个 talk 和 Ilya 这个有很多 diff 吧...），我们可以通过 arithmetic encoding 来把 LLM 变成 compressor，也就是相当于 $\sum_i-\log(P(x_i|\theta))$ 就是 compressor 的压缩 cost，那么自然优化这个目标函数最有利于找到最好的 compressor。

### 如何尝试验证这一理论

由于大多数 NLP 任务都可以转化为 next token prediction，所以比较难体现无监督学习中目标任务和训练优化目标不同这个特点。所以 OpenAI 尝试在 CV 领域做验证，通过把图片的像素顺序排成序列做 next pixel prediction，并用得到的模型来 linear probe 各种传统的 CV 任务，得到了还不错的效果。这个工作叫 iGPT，相关的介绍文章请见：https://openai.com/research/image-gpt

这里有个值得一提的点，上述的这种理论并不包含压缩会带来 linear representation 这个事儿，但是 iGPT 里用了 linear probe，类似于使用了 linear representation，有点怪。然后 Ilya 的解释是，他认为这个理论没有说训练会产生 linear representation，但是可以解释为啥 finetune 是有效的，因为 finetune 相当于是去搜了一下新的分布的 compressor。不过 iGPT 这个工作发现 GPT 学到的 linear representation 确实比 BERT 要更好。（顺便感慨一下，问这个问题的小哥在现场听完 talk 马上能提出这种问题，非常佩服）

### reference

- Cunningham, P., Cord, M., Delany, S.J. (2008). Supervised Learning. In: Cord, M., Cunningham, P. (eds) Machine Learning Techniques for Multimedia. Cognitive Technologies. Springer, Berlin, Heidelberg. https://doi.org/10.1007/978-3-540-75171-7_2
