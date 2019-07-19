---
title: About Monad
date: 2019-06-11 12:32:00
tags: ["parsing", "haskell"]
---

实习很闲，趁着没事，学学haskell和写parser。对于这两者来说，非常重要的一个概念就是monad。看知乎的解释看得头疼，自己在网上扒了些资源，来这里来讨论一下monad。

本篇的主要引用来自wikibooks中的[Haskell](<https://en.wikibooks.org/wiki/Haskell>)。以及不计划设计那种很玄很玄的数学知识。

## Functor

monad可以理解为一个haskell的class，或者说是类似java或者C#的interface。而这个接口实际上和其他的几个接口息息相关。所以先介绍一下其他的几个更简单的，从`Functor`开始。

对于函数式编程，极为常用的一个函数就是`map`，也就是对一个list的每一个元素施加某一个函数，返回一个新的list。也就是

```haskell
map :: (a -> b) - > [a] -> [b]
```

同样，对于树，对于`Maybe`，我们经常需要这样类似的map操作。那么为什么不把其提为一个class呢？这样我们就不需要记忆各种不同map的名字了。根据这个简单的理由，我们有了：

```haskell
class Functor f where
	fmap :: (a -> b) -> f a -> fb
```

而实现一个`Functor`就可以直接

```haskell
instance Functor Maybe where
    fmap f Nothing  = Nothing
    fmap f (Just x) = Just (f x)
```

或者

```haskell
instance Functor [] where
	fmap = map
```

`fmap`有以下的一些性质：

```haskell
fmap id = id
fmap (g . f) = fmap g . fmap f
```

可以用`<$>`表示`fmap`。

## Applicative Functor

上述的`fmap`的缺点在哪里呢？在于调用的函数只能是`a -> b`，换句话说，只能是1个参数的。但是如果要调用超过1个函数的，就会发现，如`fmap (+) Maybe 3`的类型是`Mapbe (Int -> Int)`，也就不能直接再进行`fmap (+) Maybe 3 Maybe 4`这样的计算了。

所以我们需要一个新的函数，能够让`Maybe (a -> b)`调用`Maybe a`得到`Maybe b`，也就是：

```haskell
(<*>) :: Maybe (a -> b) -> Maybe a -> Maybe b
```

对于`Maybe`，其具体实现是：

```haskell
instance Applicative Maybe where
    pure                  = Just
    (Just f) <*> (Just x) = Just (f x)
    _        <*> _        = Nothing
```

这样`fmap (+) (Just 3) <*> Just 4`就可以返回`Just 7`了。

不过，值得注意的是，并不是所有`Applicative`类实现的`<*>`都是像`Maybe`这样简单。比如`[]`，就是：

```haskell
instance Applicative [] where
    pure x    = [x]
    fs <*> xs = [f x | f <- fs, x <- xs]
```

`<*>`以外，Applicative还实现了几个可以用`fmap`和`<*>`实现的常见操作。

```haskell
u *> v = (\_ y -> y) <$> u <*> v
```

`*>`是指希望执行一下u，但是u并不是需要的参数。所以比较像是前后依次运行指令。

## Monad

终于到了Monad的部分了。Monad实际上就是从Applicative Functor更进一步。这个接口需要实现的两个函数为：

```haskell
return :: a -> m a
(>>=)  :: m a -> (a -> m b) -> m b
```

`return`和Applicative的`pure`一样，都是把别的类型，包装在这一类型中的。所以重点就是`>>=`。

`>>=`的目的是把第一个参数里面的`a`作为第二个参数的函数。可以理解为把第一个参数拆箱，然后穿给第二个参数（它是一个函数）。

举个实际的例子：

```haskell
instance Monad Maybe where:
    return :: a -> Maybe a
    return x  = Just x

    (>>=)  :: Maybe a -> (a -> Maybe b) -> Maybe b
    m >>= g = case m of
                 Nothing -> Nothing
                 Just x  -> g x	
```

或者`[]`的：

```haskell
instance Monad []  where
    xs >>= f     = [y | x <- xs, y <- f x]
    (>>) = (*>)
    fail _       = []
```

这里`fail`是为了错误处理，和Monad没什么关系，是历史遗留问题。然后`return`就是`pure`所以没有再实现，而`>>`的意思是：

```haskell
m >> n = m >>= \_ -> n
```

也就是执行完第一个之后，扔掉返回值，再执行第二个。和Applicative的`*>`一样。

因为bind（>>=）实在是很常见，所以在haskell里面有简化写法：

```haskell
let x = foo in (x + 3)  corresponds to  foo  &  (\x -> id (x + 3))  -- v & f = f v 
```

以及

```haskell
x <- foo; return (x + 3)  corresponds to  foo >>= (\x -> return (x + 3))
```

Monad的一些性质有：

```haskell
m >>= return     =  m                        -- right unit
return x >>= f   =  f x                      -- left unit
(m >>= f) >>= g  =  m >>= (\x -> f x >>= g)  -- associativity
```

Monad也有一些延申的符号：

```haskell
(>=>) :: Monad m => (a -> m b) -> (b -> m c) -> a -> m c
f >=> g = \x -> f x >>= g
```

也就是复合函数。

就像`return`对应`pure`，`>>`对应`*>`，Monad也有自己版本的`fmap`和`<*>`：

```haskell
liftM :: (Monad m) => (a1 -> r) -> m a1 -> m r  -- fmap
ap :: Monad m => m (a -> b) -> m a -> m b  -- <*>
```

## Alternative

```haskell
class Applicative f => Alternative f where
  empty :: f a
  (<|>) :: f a -> f a -> f a
```

Alternative继承自Applicative，其中`empty`表示一个返回0的函数，`<|>`是用来combine 2 computation的。例如：

```haskell
instance Alternative Maybe where
  empty               = Nothing
  -- Note that this could have been written more compactly.
  Nothing <|> Nothing = Nothing -- 0 results + 0 results = 0 results
  Just x  <|> Nothing = Just x  -- 1 result  + 0 results = 1 result
  Nothing <|> Just x  = Just x  -- 0 results + 1 result  = 1 result
  Just x  <|> Just y  = Just x  -- 1 result  + 1 result  = 1 result:
                                -- Maybe can only hold up to one result,
                                -- so we discard the second one.

instance Alternative [] where
  empty = []
  (<|>) = (++) -- length xs + length ys = length (xs ++ ys)
```

parser经常会用`<|>`来进行并行的parse，相当于一个不行就另一个。

Alternative的性质有：

```haskell
-- empty is a neutral element
empty <|> u  =  u
u <|> empty  =  u
-- (<|>) is associative
u <|> (v <|> w)  =  (u <|> v) <|> w
```

## MonadPlus

```haskell
class Monad m => MonadPlus m where
  mzero :: m a
  mplus :: m a -> m a -> m a
```

MonadPlus和Alternative完全对应。`mzero`对应`empty`，`mplus`对应`<|>`。

而MonadPlus除了Alternative的性质意外，还有额外的性质：

```haskell
mzero >>= f  =  mzero -- left zero
m >> mzero   =  mzero -- right zero
```

Alternative或是MonadPlus的一些常用操作有：

```haskell
asum :: (Alternative f, Foldable t) => t (f a) -> f a
asum = foldr (<|>) empty
```

就是`concat`的一般版本。

MonadPlus的版本是：

```haskell
msum :: (MonadPlus m, Foldable t) => t (m a) -> m a
```

另一个常见的操作是`guard`

```haskell
guard :: Alternative m => Bool -> m ()
guard True  = pure ()
guard _ = empty
```

也就是说list comprehension中的

```haskell
pythags = [ (x, y, z) | z <- [1..], x <- [1..z], y <- [x..z], x^2 + y^2 == z^2 ]
```

实际上是：

```haskell
pythags = do
  z <- [1..]
  x <- [1..z]
  y <- [x..z]
  guard (x^2 + y^2 == z^2)
  return (x, y, z)
```

