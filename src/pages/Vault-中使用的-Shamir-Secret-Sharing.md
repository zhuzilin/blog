---
title: Vault 中使用的 Shamir Secret Sharing
date: 2021-12-06 21:30:00
tags: ["cryptography"]
---

在网上冲浪的时候看到了 hashicrop 这个公司，并了解到了 [Vault](https://github.com/hashicorp/vault) 这个项目。这个项目主要用来存储密钥

## Shamir Secret Sharing

对于 $k-1$ 阶多项式
$$
f(x)=a_0 + a_1x + a_2x + \dots + a_{k-1}x^{k-1}
$$
当且仅当存在 $k$ 个值对 $(x_k, f(x_k))$ 的时候才可以解出 $a_0, a_1,\dots, a_{k-1}$。而如果我们把公共密钥的值设为 $a_0$，则有：
$$
f(0)=\sum_{j=0}^{k-1}y_j\prod_{m=0,m\ne}^{k-1}\frac{x_m}{x_m - x_j}.
$$
即可反解出密钥。

## Vault 实现

Vault 的 SSS 实现位于 `sharmir` 目录下，主要就 2 个文件，一个是 `shamir.go` 里面有主要的实现，另一个是 `tables.go`，里面放了两个 256 长的数组，`logTable` 和 `expTable`，分别表示 $log(x)/log(229)$ 和其逆运算。

在 `shamir.go` 里面主要有 2 个函数，`Split` 和 `Combine`。不过一个很重要的点在于，这些整数计算都是在 finite field 上的，使用的是 Galois field $GF(2^8)$。这个有限域定义的加减乘除请见：http://www.samiam.org/galois.html。这个域也是 AES 使用的。它的加法和减法操作相同，是：

```go
func add(a, b uint8) uint8 {
	return a ^ b
}
```

乘法比较复杂，用指数表和对数表可以快速计算：

```go
func mult(a, b uint8) (out uint8) {
	log_a := logTable[a]
	log_b := logTable[b]
	sum := (int(log_a) + int(log_b)) % 255

	ret := int(expTable[sum])

	// Ensure we return zero if either a or b are zero but aren't subject to
	// timing attacks
	ret = subtle.ConstantTimeSelect(subtle.ConstantTimeByteEq(a, 0), 0, ret)
	ret = subtle.ConstantTimeSelect(subtle.ConstantTimeByteEq(b, 0), 0, ret)

	return uint8(ret)
}
```

除法则是：

```go
// div divides two numbers in GF(2^8)
func div(a, b uint8) uint8 {
	if b == 0 {
		// leaks some timing information but we don't care anyways as this
		// should never happen, hence the panic
		panic("divide by zero")
	}

	log_a := logTable[a]
	log_b := logTable[b]
	diff := ((int(log_a) - int(log_b)) + 255) % 255

	ret := int(expTable[diff])

	// Ensure we return zero if a is zero but aren't subject to timing attacks
	ret = subtle.ConstantTimeSelect(subtle.ConstantTimeByteEq(a, 0), 0, ret)
	return uint8(ret)
}
```



Lagrange 在有限域上仍然会得到唯一的多项式：

https://math.stackexchange.com/questions/305550/is-lagrange-interpolation-formula-not-unique-over-a-finite-field

https://math.stackexchange.com/questions/3932316/does-lagrange-interpolation-yield-a-unique-polynomial-over-finite-fields





下面是两个函数的实现，可以看到还是很直观的。

### Split

```go
// Split takes an arbitrarily long secret and generates a `parts`
// number of shares, `threshold` of which are required to reconstruct
// the secret. The parts and threshold must be at least 2, and less
// than 256. The returned shares are each one byte longer than the secret
// as they attach a tag used to reconstruct the secret.
func Split(secret []byte, parts, threshold int) ([][]byte, error) {
	// Sanity check the input
  // 要求 2 < threshold < parts < 255, len(secret) != 0
	// ...

	// Generate random list of x coordinates
	mathrand.Seed(time.Now().UnixNano())
	xCoordinates := mathrand.Perm(255)  // 0~254 的随机排列

	// Allocate the output array, initialize the final byte
	// of the output with the offset. The representation of each
	// output is {y1, y2, .., yN, x}.
	out := make([][]byte, parts)
	for idx := range out {
		out[idx] = make([]byte, len(secret)+1)
    // 把最后一位设为上面的随机排列的 1 值。
		out[idx][len(secret)] = uint8(xCoordinates[idx]) + 1
	}

	// Construct a random polynomial for each byte of the secret.
	// Because we are using a field of size 256, we can only represent
	// a single byte as the intercept of the polynomial, so we must
	// use a new polynomial for each byte.
	for idx, val := range secret {
    // 对每一 byte 都创建一个多项式
		p, err := makePolynomial(val, uint8(threshold-1))
		if err != nil {
			return nil, fmt.Errorf("failed to generate polynomial: %w", err)
		}

		// Generate a `parts` number of (x,y) pairs
		// We cheat by encoding the x value once as the final index,
		// so that it only needs to be stored once.
		for i := 0; i < parts; i++ {
      // 这里之所以要输入 xCooridinates[i] + 1，是因为如果传入的是 0，
      // 那么就直接返回真实值了，所以咋这里改成从 [0, 254] 改成 [1, 255]。
			x := uint8(xCoordinates[i]) + 1
      // 正向计算多项式
			y := p.evaluate(x)
			out[i][idx] = y
		}
	}

	// Return the encoded secrets
	return out, nil
}
```

### Combine

```go
// Combine is used to reverse a Split and reconstruct a secret
// once a `threshold` number of parts are available.
func Combine(parts [][]byte) ([]byte, error) {
	// 一些输入上的检查
	// ...

	// Create a buffer to store the reconstructed secret
	secret := make([]byte, firstPartLen-1)

	// Buffer to store the samples
	x_samples := make([]uint8, len(parts))
	y_samples := make([]uint8, len(parts))

	// Set the x value for each sample and ensure no x_sample values are the same,
	// otherwise div() can be unhappy
  // 取最后一位存在 x_samples 里面
	checkMap := map[byte]bool{}
	for i, part := range parts {
		samp := part[firstPartLen-1]
		if exists := checkMap[samp]; exists {
			return nil, fmt.Errorf("duplicate part detected")
		}
		checkMap[samp] = true
		x_samples[i] = samp
	}

	// Reconstruct each byte
	for idx := range secret {
		// Set the y value for each sample
		for i, part := range parts {
			y_samples[i] = part[idx]
		}

		// Interpolate the polynomial and compute the value at 0
    // 用拉格朗日差值多项式反求结果
		val := interpolatePolynomial(x_samples, y_samples, 0)

		// Evaluate the 0th value to get the intercept
		secret[idx] = val
	}
	return secret, nil
}
```



