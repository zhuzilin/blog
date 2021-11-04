---
title: OSDI 2020 PipeSwitch 阅读笔记
date: 2021-11-02 21:30:00
tags: ["paper"]
---

这个项目的代码公布在了：https://github.com/netx-repo/PipeSwitch 和 https://github.com/Myrmustin/PipeSwitch_Plus

虽然不知道 plus 版本是不是进阶版，但是还是看的 plus 版的。

对于 C++ 部分，主要加入了 4 个函数：`allocateSharedCache`、`sendSharedCache`、`recvSharedCache`、`insertSharedCache` 和 `clearSharedCache`。

## C++ 代码

### allocateSharedCache

就是分配一段显存在 `PIPESWITCH_shared_ptr`，大小为 12GB。

```c++
#define SIZE_SHARED_CACHE (12 * 1024UL * 1024UL * 1024UL) // PipeSwitch

  /* PipeSwitch: allocate shared GPU memory */
  void allocateSharedCache() {
    std::lock_guard<std::recursive_mutex> lock(mutex);
    cudaError_t err = cudaMalloc(&PIPESWITCH_shared_ptr, SIZE_SHARED_CACHE);
    if (err != cudaSuccess) {
      perror("allocate_shared_cache"); 
      exit(EXIT_FAILURE); 
    }
  }
```

### sendSharedCache

获取一个跨进程的 handle，并把这个 handle 发出去。

```c++
  /* PipeSwitch: send shared GPU memory */
  void sendSharedCache() {
    std::lock_guard<std::recursive_mutex> lock(mutex);
    cudaIpcMemHandle_t shared_cache_handle;

    // Pack CUDA pointer
    cudaError_t err = cudaIpcGetMemHandle(&shared_cache_handle, PIPESWITCH_shared_ptr);
    if (err != cudaSuccess) {
      perror("pack_shared_cache"); 
      exit(EXIT_FAILURE); 
    }

    // Accept connection
    int server_fd, conn_fd, valread; 
    int opt = 1;
    struct sockaddr_in address; 
    int addrlen = sizeof(address);
    if ((server_fd = socket(AF_INET, SOCK_STREAM, 0)) == 0) { 
        perror("socket failed"); 
        exit(EXIT_FAILURE); 
    } 
    if (setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR | SO_REUSEPORT, &opt, sizeof(opt))) { 
        perror("setsockopt"); 
        exit(EXIT_FAILURE); 
    } 
    address.sin_family = AF_INET; 
    address.sin_addr.s_addr = INADDR_ANY; 
    address.sin_port = htons( PORT ); 
    if (bind(server_fd, (struct sockaddr *)&address,  sizeof(address)) < 0) { 
        perror("bind failed"); 
        exit(EXIT_FAILURE); 
    }
    if (listen(server_fd, 1) < 0) { 
        perror("listen"); 
        exit(EXIT_FAILURE); 
    } 
    if ((conn_fd = accept(server_fd, (struct sockaddr *)&address, (socklen_t*)&addrlen)) < 0) { 
        perror("accept"); 
        exit(EXIT_FAILURE); 
    }

    // Send the packed pointer
    write(conn_fd, (void*)(&shared_cache_handle), sizeof(cudaIpcMemHandle_t));

    close(conn_fd);
    close(server_fd);
  }
```

### recvSharedCache

```c++
  /* PipeSwitch: recv shared GPU memory */
  void recvSharedCache() {
    std::lock_guard<std::recursive_mutex> lock(mutex);
    cudaIpcMemHandle_t shared_cache_handle;

    // Connect
    int conn_fd = 0; 
    struct sockaddr_in serv_addr; 
    if ((conn_fd = socket(AF_INET, SOCK_STREAM, 0)) < 0) { 
        printf("\n Socket creation error \n"); 
        exit(EXIT_FAILURE); 
    }
    serv_addr.sin_family = AF_INET; 
    serv_addr.sin_port = htons(PORT); 
    if(inet_pton(AF_INET, "127.0.0.1", &serv_addr.sin_addr) <= 0) { 
        printf("\nInvalid address/ Address not supported \n"); 
        exit(EXIT_FAILURE); 
    }
    if (connect(conn_fd, (struct sockaddr *)&serv_addr, sizeof(serv_addr)) < 0) { 
        printf("\nConnection Failed \n"); 
        exit(EXIT_FAILURE); 
    }

    // Receive packed pointer
    read(conn_fd, (void*)(&shared_cache_handle), sizeof(cudaIpcMemHandle_t)); 
    
    // Extract the pointer
    cudaError_t err = cudaIpcOpenMemHandle(
      	&PIPESWITCH_shared_ptr, shared_cache_handle, cudaIpcMemLazyEnablePeerAccess);
    if (err != cudaSuccess) {
      perror("extract_shared_cache"); 
      exit(EXIT_FAILURE); 
    }

    close(conn_fd);
  }
```

### insertSharedCache

```c++
  /* PipeSwitch: insert shared GPU memory to large block pool */
    void insertSharedCache(size_t size, size_t offset) {
    std::lock_guard<std::recursive_mutex> lock(mutex);
    int device;
    C10_CUDA_CHECK(cudaGetDevice(&device));
    Block* block = new Block(
      device, 
      cuda::getCurrentCUDAStream(device), 
      size, 
      &large_blocks, 
      static_cast<char*>(PIPESWITCH_shared_ptr) + offset);
    // allocated_size += size;
    large_blocks.insert(block);

    get_stats_for_device(device).increaseCached(size);
    return;
  }
```

### clearSharedCache

```c++
  /* PipeSwitch: clear shared GPU memory */
  void clearSharedCache() {
    std::lock_guard<std::recursive_mutex> lock(mutex);

    int device;
    C10_CUDA_CHECK(cudaGetDevice(&device));
    cudaStream_t stream = cuda::getCurrentCUDAStream(device);

    std::cout << "Begin Clear" << std::endl;
    auto it = large_blocks.begin();
    while (it != large_blocks.end()) {
      Block* block = *it;
      // 这里没有 prev 没有 next 说明是没有进行切分的
      // 同时 stream 要是 PipeSwitch 里面设置的 cuda_stream_for_parameter
      if (block->stream == stream && !block->prev && !block->next) {
        std::cout << "Clear" << ", " << block->ptr << ", "
                  << block->size << ", " << block->allocated << std::endl;
        const auto& stats = get_stats_for_device(block->device);
        get_stats_for_device(block->device).decreaseCached(block->size);

        auto cur = it;
        ++it;
        large_blocks.erase(cur);
        delete block;
      }
      else {
        ++it;
      }
    }
    std::cout << "End Clear" << std::endl;
    // allocated_size = 0;
  }
```

### kSmallSize

除此之外，PipeSwitch 还把 `kSmallSize` 设置为了 1。这意味着这样几件事：

- `get_pool` 永远使用 `large_blocks`；

```c++
  BlockPool& get_pool(size_t size) {
    if (size <= kSmallSize) {
      return small_blocks;
    } else {
      return large_blocks;
    }
  }
```

在 `THCCachingAllocator` 中，有  `large_blocks` 和 `small_blocks` 两个 `BlockPool`（其实就是 `std::set`）。内部 block 的排序方式如下：

```c++
static bool BlockComparator(const Block* a, const Block* b)
{
  if (a->device != b->device) {
    return a->device < b->device;
  }
  if (a->stream != b->stream) {
    return (uintptr_t)a->stream < (uintptr_t)b->stream;
  }
  if (a->size != b->size) {
    return a->size < b->size;
  }
  return (uintptr_t)a->ptr < (uintptr_t)b->ptr;
}
```

这里比较上的一个重点在于先比较 device，再比较 stream，最后再找合适的 size。而在具体查找 block 的时候，更是只能允许选择同一个 stream 上的内存：

```c++
    auto find_free_block = [&]()->Block*{
      auto it = pool.lower_bound(&search_key);
      if (it != pool.end() && (*it)->device == device &&
          (*it)->stream == stream) {
        Block* block = *it;
        pool.erase(it);
        return block;
      }
      return nullptr;
    };
```

这个机制使得 PipeSwitch 可以在不同的 stream 里面共用同一段显存。

- 对于 `large_blocks`，只要有剩余，就会拆分；

```c++
  bool should_split(Block* block, size_t size) {
    size_t remaining = block->size - size;
    if (block->pool == &small_blocks) {
      return remaining >= kMinBlockSize;
    } else if (block->pool == &large_blocks) {
      // 对于 large blocks，如果有 remaining，就一定拆分
      return remaining > kSmallSize;
    } else {
      AT_ERROR("should_split: invalid pool");
    }
  }
```

因为由上面一点，知道所有的 block 都在 `large_blocks` 里面，所以可以说所有的 block 都会继续拆分（感觉这样会出现比较严重的 fragmentation）。

- 永远不会用 `kSmallBuffer`

```c++
  size_t get_allocation_size(size_t size) {
    if (size <= kSmallSize) {
      return kSmallBuffer;  // 2 MB
    } else if (size < kMinLargeAlloc) {
      return kLargeBuffer;  // 20 MB
    } else {
      // 2N MB
      return kRoundLarge * ((size + kRoundLarge - 1) / kRoundLarge);
    }
  }
```





## python 代码

```python
# PipeSwitch
def allocate_shared_cache():
    if _initialized:
        torch._C._cuda_allocateSharedCache()

# PipeSwitch
def send_shared_cache():
    if _initialized:
        torch._C._cuda_sendSharedCache()

# PipeSwitch
def recv_shared_cache():
    if _initialized:
        torch._C._cuda_recvSharedCache()

# PipeSwitch
def insert_shared_cache_for_parameter():
    if _initialized:
        torch._C._cuda_insertSharedCacheForParameter()

# PipeSwitch
def insert_shared_cache_for_computation():
    if _initialized:
        torch._C._cuda_insertSharedCacheForComputation()

# PipeSwitch
def clear_shared_cache():
    if _initialized:
        torch._C._cuda_clearSharedCache()
```

这里可能仅仅需要分辨的是 insert for parameter 和 insert for computation 了：

```c++
// PipeSwitch
PyObject * THCPModule_insertSharedCacheForParameter(PyObject *_unused, PyObject *noargs)
{
  HANDLE_TH_ERRORS
      c10::cuda::CUDACachingAllocator::insertSharedCache(
    			1UL * 1024UL * 1024UL * 1024UL, 0);
  END_HANDLE_TH_ERRORS
  Py_RETURN_NONE;
}

// PipeSwitch
PyObject * THCPModule_insertSharedCacheForComputation(PyObject *_unused, PyObject *noargs)
{
  HANDLE_TH_ERRORS
      c10::cuda::CUDACachingAllocator::insertSharedCache(
    			11UL * 1024UL * 1024UL * 1024UL, 1UL * 1024UL * 1024UL * 1024UL);
  END_HANDLE_TH_ERRORS
  Py_RETURN_NONE;
}
```

相当于就是前面 1G 用作参数，后面 11G 用作计算。

