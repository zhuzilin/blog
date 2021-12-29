---
title: Glassmorphism 和其 CSS 实现
date: 2021-12-28 21:30:00
tags: ["design", "web"]
---

这两天了解到苹果和微软都逐渐在从扁平化设计向一种名为 Glassmorphism 的设计模式转换。最为显著的就是在 macOS 11 Big Sur 中，有毛玻璃质感的设置栏。

![](/blog/img/glassmorphism.png)

用 CSS 可以很容易地模仿这种设计，上图的玻璃部分的 CSS 为：

```css
.glass {
  background: rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}
```

网上一些设计指导中，还提到给玻璃和边框都加上斜向 linear gradient 渐变色，不过这个可能涉及到给网页一个整体的光照，感觉很难设计得足够协调。

从我个人的理解来说，这种玻璃质感的好处，是通过一个统一的桌面背景，让整体界面能有一个很统一的观感。玻璃可以对背景做二次加工，但是对于常见的 Web 应用来说，常常是单色背景，那样的话呈现的效果就会比较普通了，例如下图。所以我粗略地认为，这种设计默认应该会保留在 native 平台上。

![](/blog/img/glassmorphism-pure-color-bg.png)
