---
title: 15-418 spring 2016 assigment1
date: 2019-10-21 1:21:00
tags: ["computer-architecture", "15-418"]
---

作业叙述的链接如下为[这里](http://15418.courses.cs.cmu.edu/spring2016/article/3)

## Program 1: Parallel Fractal Generation Using Pthreads

1. 用pthread分上下块儿计算分型。因为没有critical region，所以直接算就好了，代码如下：

```c
...
static inline int mandel(float c_re, float c_im, int count) {
	...
}

//
// workerThreadStart --
//
// Thread entrypoint.
void* workerThreadStart(void* threadArgs) {
    WorkerArgs* args = static_cast<WorkerArgs*>(threadArgs);

    // TODO: Implement worker thread here.

    //printf("Hello world from thread %d\n", args->threadId);
    float x0 = args->x0;
    float y0 = args->y0;
    float x1 = args->x1;
    float y1 = args->y1;
    int width = args->width;
    int height = args->height;
    // 就是这里分一下块儿
    int startRow = height / args->numThreads * args->threadId;
    int endRow = args->threadId == args->numThreads-1 ? height : height / args->numThreads * (args->threadId+1);
    int maxIterations = args->maxIterations;

    float dx = (x1 - x0) / width;
    float dy = (y1 - y0) / height;

    for (int j = startRow; j < endRow; j++) {
        for (int i = 0; i < width; ++i) {
            float x = x0 + i * dx;
            float y = y0 + j * dy;

            int index = (j * width + i);
            args->output[index] = mandel(x, y, maxIterations);
        }
    }

    return NULL;
}

//
// MandelbrotThread --
//
// Multi-threaded implementation of mandelbrot set image generation.
// Multi-threading performed via pthreads.
void mandelbrotThread(
    ...

    // Fire up the worker threads.  Note that numThreads-1 pthreads
    // are created and the main app thread is used as a worker as
    // well.

    for (int i=1; i<numThreads; i++)
        pthread_create(&workers[i], NULL, workerThreadStart, &args[i]);

    workerThreadStart(&args[0]);

    // wait for worker threads to complete
    for (int i=1; i<numThreads; i++)
        pthread_join(workers[i], NULL);
}
```

运行后的结果为：

```bash
$ ./mandelbrot
[mandelbrot serial]:		[250.914] ms
Wrote image file mandelbrot-serial.ppm
[mandelbrot thread]:		[132.314] ms
Wrote image file mandelbrot-thread.ppm
				(1.90x speedup from 2 threads)
```

2. 分别跑一下2, 3, 4 threads的，对比一下。

上面已经跑了2 threads的了，现在跑3和4的：

```bash
$ ./mandelbrot --threads 3
[mandelbrot serial]:		[251.760] ms
Wrote image file mandelbrot-serial.ppm
[mandelbrot thread]:		[153.184] ms
Wrote image file mandelbrot-thread.ppm
				(1.64x speedup from 3 threads)
$ ./mandelbrot --threads 4
[mandelbrot serial]:		[252.981] ms
Wrote image file mandelbrot-serial.ppm
[mandelbrot thread]:		[108.022] ms
Wrote image file mandelbrot-thread.ppm
				(2.34x speedup from 4 threads)
```

神奇的是3 thread 竟然慢了。。。

3.  通过计时，可以发现：

```
// 2 threads
thread 0:		[135.134] ms
thread 1:		[137.409] ms
// 3 threads
thread 0:		[57.834] ms
thread 2:		[72.318] ms
thread 1:		[169.466] ms
// 4 threads
thread 0:		[26.868] ms
thread 3:		[42.347] ms
thread 1:		[113.853] ms
thread 2:		[139.147] ms
```

问题在于unbalanced。

4. 给出一种static balanced的方式。我就单纯的让每次的`j += args.numThreads`了。

```c
for (int j = args->threadId; j < height; j += args->numThreads) {
    ...
}
```

效果如下：

```bash
$ ./mandelbrot --threads 4
[mandelbrot serial]:		[251.784] ms
Wrote image file mandelbrot-serial.ppm
...
thread 0:		[66.449] ms
thread 3:		[66.969] ms
thread 2:		[67.767] ms
thread 1:		[69.141] ms
[mandelbrot thread]:		[68.392] ms
Wrote image file mandelbrot-thread.ppm
				(3.68x speedup from 4 threads)
```

## Program 2: Vectorizing Code Using SIMD Intrinsics

任务是写一个利用SIMD的带clamp的指数函数。用的并不是SSE或AVX指令集，而是他们自己模拟的一个指令集。代码如下：

```c
void clampedExpVector(float* values, int* exponents, float* output, int N) {
  // TODO: Implement your vectorized version of clampedExpSerial here
  __cmu418_vec_float x, result;
  __cmu418_vec_int y, count;
  __cmu418_vec_int zero_i = _cmu418_vset_int(0);
  __cmu418_vec_int one_i  = _cmu418_vset_int(1);
  __cmu418_vec_float one_f  = _cmu418_vset_float(1.f);
  __cmu418_vec_float bound = _cmu418_vset_float(9.999999f);
  __cmu418_mask maskAll, maskIf, maskElse, maskCount, maskResult;
  for (int i=0; i<N; i+=VECTOR_WIDTH) {
    // All ones
    maskAll = _cmu418_init_ones();

    // All zeros
    maskIf = _cmu418_init_ones(0);

    _cmu418_vload_float(x, values+i, maskAll);               // x = values[i]
    _cmu418_vload_int(y, exponents+i, maskAll);              // y = exponentials[i]

    _cmu418_veq_int(maskIf, y, zero_i, maskAll);             // if (y == 0) {
    _cmu418_vstore_float(output+i, one_f, maskIf);           //   output[i] = 1.f;

    maskElse = _cmu418_mask_not(maskIf);                     // } else {
    _cmu418_vmove_float(result, x, maskElse);                //   result = x;
    _cmu418_vsub_int(count, y, one_i, maskElse);             //   count = y - 1;

    _cmu418_vgt_int(maskCount, count, zero_i, maskElse);
    while (_cmu418_cntbits(maskCount)) {                     //   while (count > 0) {
      _cmu418_vmult_float(result, result, x, maskCount);     //     result *= x;
      _cmu418_vsub_int(count, count, one_i, maskCount);      //     count--; }
      _cmu418_vgt_int(maskCount, count, zero_i, maskCount);
    }
    _cmu418_vgt_float(maskResult, result, bound, maskElse);  //   if (result > 9.999999f) {
    _cmu418_vmove_float(result, bound, maskResult);          //     result = 9.999999f; }
    _cmu418_vstore_float(output+i, result, maskElse);        //   output[i] = result; }
  }
}
```

对于vector_width 2, 4, 8, 16运行结果如下：

```bash
$ ./myexp -s 10000
CLAMPED EXPONENT (required) 
Results matched with answer!
****************** Printing Vector Unit Statistics *******************
Vector Width:              2
Total Vector Instructions: 162728
Vector Utilization:        76.695160%
Utilized Vector Lanes:     249609
Total Vector Lanes:        325456
************************ Result Verification *************************
Passed!!!

$ ./myexp -s 10000
CLAMPED EXPONENT (required) 
Results matched with answer!
****************** Printing Vector Unit Statistics *******************
Vector Width:              4
Total Vector Instructions: 94576
Vector Utilization:        69.467677%
Utilized Vector Lanes:     262799
Total Vector Lanes:        378304
************************ Result Verification *************************
Passed!!!

./myexp -s 10000
CLAMPED EXPONENT (required) 
Results matched with answer!
****************** Printing Vector Unit Statistics *******************
Vector Width:              8
Total Vector Instructions: 51628
Vector Utilization:        65.733468%
Utilized Vector Lanes:     271495
Total Vector Lanes:        413024
************************ Result Verification *************************
Passed!!!

$ ./myexp -s 10000
CLAMPED EXPONENT (required) 
Results matched with answer!
****************** Printing Vector Unit Statistics *******************
Vector Width:              16
Total Vector Instructions: 26968
Vector Utilization:        63.998072%
Utilized Vector Lanes:     276144
Total Vector Lanes:        431488
************************ Result Verification *************************
Passed!!!
```

vector utilization越来越小了，应该是因为vector越多，在`count`那里做循环的平均长度就越长吧。

bonus题目很有趣，过一会补上。

## Program 3

### Part 1 A Few ISPC Basics

1. 直接make来看一下加速情况。

make的时候报了错，是linker的问题，上网查了一下，在所有和gcc相关的指令下面加了`--static`这个flag就没事了。默认的加速方法如下：

```c
export void mandelbrot_ispc(uniform float x0, uniform float y0, 
                            uniform float x1, uniform float y1,
                            uniform int width, uniform int height, 
                            uniform int maxIterations,
                            uniform int output[])
{
    float dx = (x1 - x0) / width;
    float dy = (y1 - y0) / height;

    foreach (j = 0 ... height, i = 0 ... width) {
            float x = x0 + i * dx;
            float y = y0 + j * dy;

            int index = j * width + i;
            output[index] = mandel(x, y, maxIterations);
    }
}
```

最后的加速情况如下：

```bash
$ ./mandelbrot_ispc 
[mandelbrot serial]:		[248.229] ms
Wrote image file mandelbrot-serial.ppm
[mandelbrot ispc]:		[59.659] ms
Wrote image file mandelbrot-ispc.ppm
				(4.16x speedup from ISPC)
```

这里不明白了...不是应该只能到4倍吗？为啥不止了...

### Part 2 ISPC Tasks

1. 带着`--task`运行，看看加速情况。

我这里莫名的出了segmentation fault，不知道为啥，不过加速情况如下（忽略中文Ubuntu的警报）：

```bash
$ ./mandelbrot_ispc --task
[mandelbrot serial]:		[253.527] ms
Wrote image file mandelbrot-serial.ppm
[mandelbrot ispc]:		[62.539] ms
Wrote image file mandelbrot-ispc.ppm
段错误 (核心已转储)
```

然后其加速代码为：

```c
// slightly different kernel to support tasking
task void mandelbrot_ispc_task(uniform float x0, uniform float y0, 
                               uniform float x1, uniform float y1,
                               uniform int width, uniform int height,
                               uniform int rowsPerTask,
                               uniform int maxIterations,
                               uniform int output[])
{

    // taskIndex is an ISPC built-in
    
    uniform int ystart = taskIndex * rowsPerTask;
    uniform int yend = ystart + rowsPerTask;
    
    uniform float dx = (x1 - x0) / width;
    uniform float dy = (y1 - y0) / height;
    
    foreach (j = ystart ... yend, i = 0 ... width) {
            float x = x0 + i * dx;
            float y = y0 + j * dy;
            
            int index = j * width + i;
            output[index] = mandel(x, y, maxIterations);
    }
}

export void mandelbrot_ispc_withtasks(uniform float x0, uniform float y0,
                                      uniform float x1, uniform float y1,
                                      uniform int width, uniform int height,
                                      uniform int maxIterations,
                                      uniform int output[])
{

    uniform int rowsPerTask = height / 2;

    // create 2 tasks
    launch[2] mandelbrot_ispc_task(x0, y0, x1, y1,
                                     width, height,
                                     rowsPerTask,
                                     maxIterations,
                                     output); 
}
```

2. 修改lauch里面的数字。

不知道为啥，我咋改改出来的结果都还是4倍左右，没有题目中说的13-14倍...理论上task是用来达到多核的。

3. 对比pthread和ispc task

> `ispc` provides an asynchronous function call (i.e. tasking) mechanism through the `launch` keyword. (The syntax is documented in the [Task Parallelism: "launch" and "sync" Statements](https://ispc.github.io/ispc.html#task-parallelism-launch-and-sync-statements) section.) A function called with `launch` executes asynchronously from the function that called it; it may run immediately or it may run concurrently on another processor in the system, for example. (This model is closely modeled on the model introduced by **Intel® Cilk(tm)**.)
>
> If a function launches multiple tasks, there are no guarantees about the order in which the tasks will execute. Furthermore, multiple launched tasks from a single function may execute concurrently.
>
> A function that has launched tasks may use the `sync` keyword to force synchronization with the launched functions; `sync` causes a function to wait for all of the tasks it has launched to finish before execution continues after the `sync`. (Note that `sync` only waits for the tasks launched by the current function, not tasks launched by other functions).
>
> Alternatively, when a function that has launched tasks returns, an implicit `sync` waits for all launched tasks to finish before allowing the function to return to its calling function. This feature is important since it enables parallel composition: a function can call second function without needing to be concerned if the second function has launched asynchronous tasks or not--in either case, when the second function returns, the first function can trust that all of its computation has completed.

> ISPC task is more abstract. It does not specify how each task is assigned to processors core. It tell the compiler which part can be run on parallel. Pthread is more concrete. The programmer needs to specify how tasks are mapped to threads.

感觉ispc task比较像Cilk，所以可以看第6讲pthread和Cilk的对比。

后面problem4和5都在编译的时候要么出现linker error，要不修正完有segmentation fault，就跳过去了。