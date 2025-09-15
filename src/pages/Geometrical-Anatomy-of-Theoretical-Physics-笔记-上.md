---
title: Geometrical Anatomy of Theoretical Physics 笔记（上）
date: 2024-02-01
tags: ["数学"]
---

看的是 Frederic Schuller 的课：[https://www.youtube.com/playlist?list=PLPH7f_7ZlzxTi6kS4vCmv4ZKm9u8g5yic](https://www.youtube.com/playlist?list=PLPH7f_7ZlzxTi6kS4vCmv4ZKm9u8g5yic)

## Lec 4 Topological spaces - construction and purpose

**定义**：令 $M$ 为某个集合，那么 $\mathcal{O} \subseteq \mathcal{P}(M)$ 被称为 **topology on $M$**，如果：
* $\emptyset \in \mathcal{O}$ 且 $M \in \mathcal{O}$
* $U,V \in \mathcal{O} \Rightarrow U \cap V \in \mathcal{O}$
* $\mathcal{C} \subseteq \mathcal{O} \Rightarrow \cup \mathcal{C} \in \mathcal{O}$

且 $(M, \mathcal{O})$ 被称为 **topological space**。

* **Remark**：除非 $|M|=1$，那么对于 $M$ 可以选择多个不同的 topology。

* **例如**：
    * $\forall M, \mathcal{O} = \{\emptyset, M\}$ 是 topology，被称为 **chaotic topology**；
    * $\forall M, \mathcal{O} = \mathcal{P}(M)$，被称为 **discrete topology**；
    * $M = \mathbb{R}^d$，$O_{\text{standard}}^{\mathbb{R}^d}$ 通过以下步骤构造：
        1.  $\forall x \in \mathbb{R}^d, \forall r \in \mathbb{R}^+$，定义 $B_r(x) := \{y \in \mathbb{R}^d \mid ||y-x||_2 < r\}$ 为 $x$ 处半径为 $r$ 的 **open ball**（这里可以不是 2-范数）。
        2.  对于 $\forall p \in U \in \mathcal{O}_{\text{standard}}^{\mathbb{R}^d}, \exists r \in \mathbb{R}^+ \text{ s.t. } B_r(p) \subseteq U$
    * 可以证明 $\mathcal{O}_{\text{standard}}^{\mathbb{R}^d}$ 是一个 topology。

### construction of new topology from given topologies

**定义**：对于 topological space $(M, \mathcal{O})$ 来说，如果 $N \subseteq M$，那么
$$\mathcal{O}|_N := \{U \cap N \mid U \in \mathcal{O}\}$$
是 $N$ 上的 topology，被称为 **induced (subset) topology**。

**定义**：$(M, \mathcal{O})$ 为 topological space，$C \subseteq M$ 被称为 **closed**，如果 $M \setminus C$ 是 open 的。

**定义**：给定 $(A, \mathcal{O}_A), (B, \mathcal{O}_B)$，其 **product topology** $\mathcal{O}_{A \times B}$ 定义为：
$$U \in \mathcal{O}_{A \times B} \iff \forall (a,b) \in U, \exists S \in \mathcal{O}_A, \exists T \in \mathcal{O}_B \text{ s.t. } (a,b) \in S \times T \subseteq U$$

### convergence

**定义**：一个序列 $q: \mathbb{N} \to M$ 在 topological space $(M, \mathcal{O})$ 上，被称为**收敛至 $a \in M$**，如果
$$\forall U \in \mathcal{O} \text{ with } a \in U, \exists N \in \mathbb{N} \text{ s.t. } \forall n > N, q(n) \in U$$

* **例如**：
    * 对于 chaotic topology，所有序列都在任何一点收敛；
    * 对于 discrete topology，只有 almost constant sequence 收敛（即只有有限项不是常数）;
    * $(\mathbb{R}^d, \mathcal{O}_{\text{st}})$，就是我们通常的收敛定义。

### continuity

**定义**：给定 topological spaces $(M, \mathcal{O}_M), (N, \mathcal{O}_N)$，考虑映射 $\phi: M \to N$。$\phi$ 被称为 **continuous** 如果
$$\forall V \in \mathcal{O}_N, \phi^{-1}(V) \in \mathcal{O}_M$$

* **例如**：
    * $\phi: M \to N$，如果为 $M$ 选择 discrete topology ($\mathcal{O}_M = \mathcal{P}(M)$)，那么任何映射都是连续的；
    * $\phi: M \to N$，如果为 $N$ 选择 chaotic topology ($\mathcal{O}_N = \{\emptyset, N\}$)，那么任何映射都是连续的；
    * 如果两者都选 standard topology，就会回到普通的连续性定义。

**定义**：$\phi: M \to N$ 是一个双射（bijection）。如果我们为 $M, N$ 配备拓扑 $(M, \mathcal{O}_M), (N, \mathcal{O}_N)$，那么我们称 $\phi$ 为 **homeomorphism**，如果 $\phi$ 和 $\phi^{-1}$ 都是连续的。

* **Remark**：Homeomorphism 是拓扑学中的“结构保持映射”。如果两个拓扑空间之间存在同胚映射，我们称它们是同胚的，记为 $(M, \mathcal{O}_M) \cong_{\text{topo}} (N, \mathcal{O}_N)$。

## Lec 5 Topological spaces - some heavily used invariants

### separation properties

**定义**：一个 topological space $(M, \mathcal{O})$ 被称为 **`T1`**，如果对于任意两个不同的点 $p \ne q$，存在开集 $U \in \mathcal{O}$ 使得 $p \in U$ 且 $q \notin U$。

**定义**：一个 topological space $(M, \mathcal{O})$ 被称为 **`T2`** 或 **Hausdorff space**，如果对于任意两个不同的点 $p \ne q$，存在不相交的开集 $U, V \in \mathcal{O}$ 使得 $p \in U, q \in V$ 且 $U \cap V = \emptyset$。

* **例如**：
    * $(\mathbb{R}^d, \mathcal{O}_{\text{st}})$ 是 `T2`，因此也是 `T1`。
    * Zariski topology（来自代数几何）是 `T1`，但不是 `T2`。
    * Chaotic topology $\{\emptyset, M\}$ 不是 `T1`。
* **Remark**：还有 `T2 1/2`、`T3`、`T4` 等更强的分离公理。
* 可以证明，在 Hausdorff 空间中，任何收敛序列的极限是唯一的。

### compactness & paracompactness

我们常会先在紧空间（compact）的场景下证明拓扑空间的性质，然后再尝试扩展至非紧的情况。仿紧性（paracompactness）则是一个弱很多的特性，很难找到不是仿紧的拓扑空间，所以大多数后面的定理都会用仿紧作为基本假设（类似于用上面的 `T2` 做假设）。

**定义**：一个 topological space $(M, \mathcal{O})$ 被称为 **compact**，如果它的所有开覆盖（open cover）都有一个有限的子覆盖（subcover），即：
$$\mathcal{C} \subseteq \mathcal{O}, \cup \mathcal{C} = M \implies \exists \tilde{\mathcal{C}} \subseteq \mathcal{C} \text{ such that } \tilde{\mathcal{C}} \text{ is finite and } \cup \tilde{\mathcal{C}} = M$$

**定义**：集合 $N \subseteq M$ 被称为 **compact**，如果 $(N, \mathcal{O}|_N)$ 是一个紧拓扑空间。

**定理 (Heine-Borel)**：在一个度量空间 $(M, d)$（具有度量诱导的拓扑）中，任何闭合且有界的子集都是紧的。

* 这里的 **metric** 指 $d: M \times M \to \mathbb{R}_0^+$，满足：
    * $d(m, m) = 0$
    * $d(m, n) > 0$ 当 $m \ne n$ 时
    * $d(a, b) + d(b, c) \ge d(a, c)$ (三角不等式)
* 在微分几何中，"metric" 的定义有所不同。
* 度量诱导的拓扑与 $\mathbb{R}^d$ 上的标准拓扑类似，其开球由度量定义： $B_r(p) = \{q \mid d(q, p) < r\}$
* 一个有名的例子是 **French railroad metric**：所有火车都必须先经过巴黎。

* **例如**：
    * $[0,1]$ 是紧的。
    * $\mathbb{R}$ 不是紧的（可以通过构造一个没有有限子覆盖的开覆盖来证明）。

**定理**：如果 $(M, \mathcal{O}_M)$ 和 $(N, \mathcal{O}_N)$ 是紧的，那么 $(M \times N, \mathcal{O}_{M \times N})$ 也是紧的。

**定义**：一个 topological space $(M, \mathcal{O})$ 被称为 **paracompact**，如果它的所有开覆盖 $\mathcal{C}$ 都有一个局部有限（locally finite）的开加细（open refinement）$\tilde{\mathcal{C}}$。

* **Open refinement**：$\tilde{\mathcal{C}}$ 仍然是一个开覆盖，它满足 $\forall \tilde{U} \in \tilde{\mathcal{C}}, \exists U \in \mathcal{C} \text{ s.t. } \tilde{U} \subseteq U$。
* 所有子覆盖都是加细。
* **Locally finite**：$\forall p \in M$，存在一个包含 $p$ 的邻域 $V \in \mathcal{O}$，它只与 $\tilde{\mathcal{C}}$ 中有限个成员相交（即 $V \cap \tilde{U} \ne \emptyset$ 只对有限个 $\tilde{U} \in \tilde{\mathcal{C}}$ 成立）。

* **推论**：紧空间必为仿紧空间。
* **定理**：所有可度量化空间（metrizable space）都是仿紧的。
* **定理**：如果 $(M, \mathcal{O}_M)$ 是仿紧的，$(N, \mathcal{O}_N)$ 是紧的，那么 $M \times N$ 是仿紧的。
* **定理**：令 $(M, \mathcal{O})$ 是一个 Hausdorff 空间，那么它是仿紧的，当且仅当它的所有开覆盖都容许一个从属于该覆盖的单位分解（partition of unity）。

    * **单位分解** 是一个连续函数集合 $\mathcal{F}$，其中 $f: M \to [0, 1]$，且满足：
        1.  $\forall f \in \mathcal{F}, \exists U \in \mathcal{C} \text{ s.t. } \text{supp}(f) \subseteq U$。
        2.  $\forall p \in M$, 存在 $p$ 的一个开邻域 $V$，使得只有有限个 $f \in \mathcal{F}$ 在 $V$ 上不为零。
        3.  $\forall p \in M, \sum_{f \in \mathcal{F}} f(p) = 1$。
    * 这个工具在流形上定义积分时非常有用。
* **例如**：
    * 对于 $(\mathbb{R}, \mathcal{O}_{\text{st}})$，考虑开覆盖 $\mathcal{C} = \{(-\infty, a), (b, +\infty)\}$, 其中 $b < a$。我们可以构造：
    $$
    f_1(x) = \begin{cases} 1 & x \le b \\ \frac{a-x}{a-b} & b < x < a \\ 0 & x \ge a \end{cases}, \quad f_2(x) = \begin{cases} 0 & x \le b \\ \frac{x-b}{a-b} & b < x < a \\ 1 & x \ge a \end{cases}
    $$
    $\{f_1, f_2\}$ 就是从属于这个开覆盖的一个单位分解。

### connectness & path-connectness

**定义**：一个 topological space $(M, \mathcal{O})$ 被称为 **connected**，除非存在两个非空、不相交的开集 $A, B$ 使得 $M = A \cup B$。

**定理**：$[0,1]$ 是连通的。
**定理**：一个 topological space 是连通的，当且仅当 $\emptyset$ 和 $M$ 是唯二的既是开集又是闭集的集合。

**定义**：一个 topological space $(M, \mathcal{O})$ 被称为 **path-connected**，如果对于任意两点 $p, q \in M$，都存在一条连续曲线 $\gamma: [0, 1] \to M$，使得 $\gamma(0) = p, \gamma(1) = q$。

* **例如**：Topologist's sine curve $S := \{(x, \sin(\frac{1}{x})) \mid x \in (0,1]\} \cup \{(0,0)\} \subseteq \mathbb{R}^2$ 是连通的，但不是路径连通的。

**定理**：路径连通 $\Rightarrow$ 连通。

### Homotopic curves & Fundamental group

**定义**：两条起点和终点分别相同的曲线 $\gamma, \delta: [0, 1] \to M$，被称为 **homotopic**，如果存在一个连续映射 $h: [0, 1] \times [0, 1] \to M$，使得对于所有的 $\lambda \in [0,1]$，都有 $h(0, \lambda) = \gamma(\lambda)$ 和 $h(1, \lambda) = \delta(\lambda)$。

**定义**：$\gamma \sim \delta \iff \gamma, \delta$ 是 homotopic。这是一种等价关系。

**定义**：对于 topological space $(M, \mathcal{O})$ 和任意点 $p \in M$，定义 **space of loops at $p$** 为：
$$\mathcal{L}_p := \{\gamma: [0, 1] \to M \mid \gamma \text{ is continuous}, \gamma(0) = \gamma(1) = p\}$$

**定义**：路径的 **concatenation operation** $*: \mathcal{L}_p \times \mathcal{L}_p \to \mathcal{L}_p$ 定义为：
$$(\gamma * \delta)(\lambda) := \begin{cases} \gamma(2\lambda) & 0 \le \lambda \le 1/2 \\ \delta(2\lambda-1) & 1/2 \le \lambda \le 1 \end{cases}$$

**定义**：拓扑空间的 **fundamental group** $(\pi_1(M, p), \cdot)$ 定义为：
$$\pi_1(M, p) = \mathcal{L}_p / \sim_{\text{homotopy}}$$
其群运算 $\cdot$ 定义为：
$$[\gamma] \cdot [\delta] := [\gamma * \delta]$$

* **例如**：
    * $S^2$ (球面) 上所有的环路都是同伦的，所以它的基本群是平凡群 $\pi_1(S^2, p) \cong \{e\}$。
    * $C := \mathbb{R} \times S^1$ (圆柱)，其基本群同构于整数加法群 $\pi_1(C, p) \cong (\mathbb{Z}, +)$。
    * $T^2 := S^1 \times S^1$ (环面)，其基本群为 $\pi_1(T^2, p) \cong \mathbb{Z} \times \mathbb{Z}$。

## Lec 6 Topological manifolds and manifold bundles

### topological manifold

粗略地说，拓扑流形（topological manifold）是一个局部看起来像 $\mathbb{R}^d$ 的拓扑空间。

**定义**：一个 paracompact, Hausdorff 的拓扑空间 $(M, \mathcal{O})$ 被称为一个 $d$-**dimensional (topo) manifold**，如果对于任意 $p \in M$，都存在一个包含 $p$ 的开集 $U \in \mathcal{O}$，以及一个同胚映射 (homeomorphism) $x: U \to x(U) \subseteq \mathbb{R}^d$。

**定义**：给定一个 $d$ 维拓扑流形 $(M, \mathcal{O})$ 和一个子集 $N \subseteq M$，我们称 $(N, \mathcal{O}|_N)$ 为 **submanifold**，如果它本身也是一个流形。

**定义**：如果 $(M, \mathcal{O}_M)$ 和 $(N, \mathcal{O}_N)$ 分别是拓扑流形，那么 $(M \times N, \mathcal{O}_{M \times N})$ 也是一个拓扑流形，其维度为 $\dim(M) + \dim(N)$，称为 **product manifold**。

### bundles

**定义**：一个 **bundle** 是一个三元组 $(E, \pi, M)$，其中：
* $E$ 是一个拓扑流形，称为 **total space**。
* $M$ 是一个拓扑流形，称为 **base space**。
* $\pi: E \to M$ 是一个满射（surjective）连续映射，称为 **projection**。
* 对于 $p \in M$，集合 $F_p := \pi^{-1}(\{p\})$ 被称为在 $p$ 点的 **fibre**。

**定义**：一个 bundle $(E, \pi, M)$ 如果满足 $\forall p \in M$，其纤维 $\pi^{-1}(\{p\})$ 都同胚于某个固定的流形 $F$，那么它被称为 **fibre bundle**，其中 $F$ 称为 **typical fibre**。这通常记为 $F \to E \xrightarrow{\pi} M$。

**定义**：对于一个丛 $E \xrightarrow{\pi} M$，一个映射 $\sigma: M \to E$ 被称为丛的一个 **section**，如果它满足 $\pi \circ \sigma = \text{id}_M$。

* *Product manifold $\subseteq$ Fibre bundle $\subseteq$ Bundle*

**定义**：考虑两个丛 $E \xrightarrow{\pi} M$ 和 $E' \xrightarrow{\pi'} M'$，以及两个映射 $u: E \to E'$ 和 $f: M \to M'$。如果 $\pi' \circ u = f \circ \pi$，则称 $(u, f)$ 为一个 **bundlemorphism**。

**定义**：如果一个丛同构于一个乘积丛 $M \times F \xrightarrow{\text{proj}_1} M$，则称该丛是 **trivial** 的。如果一个丛局部地同构于一个乘积丛，则称它是 **locally trivial** 的。

* **例如**：圆柱是 trivial 的，而莫比乌斯带是 locally trivial 但不是 trivial 的。

### viewing manifold from atlases

**定义**：对于一个 $d$ 维拓扑流形 $(M, \mathcal{O})$，一个二元组 $(U, x)$ 被称为流形的一个 **chart**，其中 $U \in \mathcal{O}$ 是一个开集，$x: U \to x(U) \subseteq \mathbb{R}^d$ 是一个同胚映射。$x$ 的分量函数 $x^i: U \to \mathbb{R}$ 称为点 $p \in U$ 在该 chart 下的 **坐标**。

**定义**：一组覆盖了整个流形 $M$ 的 chart 的集合 $\mathcal{A} = \{(U_i, x_i)\}$ 被称为一个 **atlas**。

**定义**：两个 charts $(U, x)$ 和 $(V, y)$ 被称为 **`C^0` compatible**，如果当 $U \cap V \ne \emptyset$ 时，其转换函数 (transition map) $y \circ x^{-1}: x(U \cap V) \to y(U \cap V)$ 是连续的。

**定义**：一个 **`C^0` atlas** 是其中任意两个 chart 都 `C^0` compatible 的 atlas。

**定义**：一个 `C^0` atlas $\mathcal{A}$ 被称为 **maximal**，如果任何与 $\mathcal{A}$ 中所有 chart 都 `C^0` compatible 的 chart 都已经包含在 $\mathcal{A}$ 中了。

## Lec 7 Differentiable structures and classification

### Adding structure by refining the (maximal) topological atlas

**定义**：我们称一个 atlas 是 **`X`-atlas**，如果其中任意两个 chart 都是 `X` compatible 的。这里的 `X` compatible 指的是它们的转换函数 $y \circ x^{-1}$ 满足特定属性：
* **`C^0`**：连续。
* **`C^k`**：$k$ 次连续可微。
* **`C^\infty`**：无限次可微，也称为 **smooth**。
* **`C^\omega`**：**analytic**，即转换函数是实解析的（可以泰勒展开）。
* **complex**：转换函数是复可微的（满足柯西-黎曼方程）。

**定理 (Whitney)**：任何 maximal `C^k`-atlas ($k \ge 1$) 都包含一个 `C^\infty`-atlas，并且这个 `C^\infty`-atlas 是唯一的。因此，我们通常不区分 `C^k` ($k \ge 1$) 和 `C^\infty` 流形。

**定义**：一个 **`C^k` manifold** 是一个三元组 $(M, \mathcal{O}, \mathcal{A})$，其中 $(M, \mathcal{O})$ 是一个拓扑流形，$\mathcal{A}$ 是一个 maximal `C^k` atlas。

**定义**：令 $\phi: M \to N$ 是 `C^k` 流形之间的映射。我们称 $\phi$ 在点 $p \in M$ 是 **differentiable** 的，如果存在包含 $p$ 的 chart $(U, x)$ 和包含 $\phi(p)$ 的 chart $(V, y)$，使得局部坐标表示 $y \circ \phi \circ x^{-1}$ 是 `C^k` 的。这个定义与 chart 的选择无关。

**定义**：如果 $\phi: M \to N$ 是一个双射，且 $\phi$ 和 $\phi^{-1}$ 都是 `C^\infty` 的，那么 $\phi$ 被称为 **diffeomorphism**。这是光滑流形之间的同构。如果这样的映射存在，我们称 $M$ 和 $N$ 是 **diffeomorphic** 的，记为 $M \cong_{\text{diff}} N$。

## Lec 8 Vector Spaces and Tensors

### vector space

**定义**：一个三元组 $(K, +, \cdot)$ 是一个 **field**，如果 $(K, +)$ 和 $(K \setminus \{0\}, \cdot)$ 都是阿贝尔群，且乘法对加法满足分配律。

**定义**：一个 $K$-**vector space** 是一个三元组 $(V, \oplus, \odot)$，其中 $(V, \oplus)$ 是一个阿贝尔群，并且标量乘法 $\odot: K \times V \to V$ 满足相容性和分配律。

**定义**：$f: V \to W$ 是一个 **linear map**，如果它保持向量加法和标量乘法。一个双射的线性映射称为 **vector space isomorphism**。

**术语**：
* $\text{Hom}(V, W)$: 从 $V$ 到 $W$ 的所有线性映射构成的向量空间。
* $\text{End}(V) := \text{Hom}(V, V)$: **endomorphism**
* $\text{Aut}(V) := \{f \in \text{End}(V) \mid f \text{ is invertible}\}$: **automorphism**
* $V^* := \text{Hom}(V, K)$: **dual vector space**

**定义**：一个 **tensor of type `(p,q)`** 是一个多重线性映射
$$T: \underbrace{V^* \times \dots \times V^*}_{p \text{ copies}} \times \underbrace{V \times \dots \times V}_{q \text{ copies}} \to K$$
这类张量构成的空间记为 $\mathcal{T}^q_p(V)$。

**定义**：对于 $T \in \mathcal{T}^q_p(V)$ 和 $S \in \mathcal{T}^s_r(V)$，它们的 **tensor product** $T \otimes S \in \mathcal{T}^{q+s}_{p+r}(V)$ 定义为：
$$(T \otimes S)(\alpha_1, ..., \alpha_{p+r}, v_1, ..., v_{q+s}) := T(\alpha_1, ..., \alpha_p, v_1, ..., v_q) \cdot S(\alpha_{p+1}, ..., \alpha_{p+r}, v_{q+1}, ..., v_{q+s})$$

**定义**：向量空间 $V$ 的一个 **(Hamel) basis** $B \subseteq V$ 是一个线性无关的生成集。$V$ 的 **dimension** 是其基的大小，$\dim(V) = |B|$。

**定理**：如果 $\dim(V) < \infty$，那么 $(V^*)^* \cong V$。

**张量的分量**：
令 $\{e_1, ..., e_d\}$ 为 $V$ 的一组基，$\{\epsilon^1, ..., \epsilon^d\}$ 为 $V^*$ 中对应的对偶基，满足 $\epsilon^a(e_b) = \delta^a_b$。那么张量 $T \in \mathcal{T}^q_p(V)$ 的分量定义为：
$$T^{b_1...b_q}_{a_1...a_p} := T(\epsilon^{a_1}, ..., \epsilon^{a_p}, e_{b_1}, ..., e_{b_q}) \in K$$
张量可以用它的分量和基向量来重构：
$$T = \sum_{a_1,...,a_p,b_1,...,b_q} T^{b_1...b_q}_{a_1...a_p} \ e_{b_1} \otimes \dots \otimes e_{b_q} \otimes \epsilon^{a_1} \otimes \dots \otimes \epsilon^{a_p}$$

**基变换**：
如果我们有一组新的基 $\tilde{e}_a = \sum_{b=1}^d A^b_a e_b$ (使用爱因斯坦求和约定记为 $\tilde{e}_a = A^b_a e_b$)，其中 $A$ 是一个可逆矩阵，那么 $e_b = (A^{-1})^a_b \tilde{e}_a$。张量的分量也会相应地进行变换。