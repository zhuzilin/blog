---
title: Python multiprocessing lock vs threading lock
date: 2019-07-30 11:45:00
tags: ["python", "OS"]
---

昨天帮舍友debug的时候发现了一个有趣的问题，这里来讨论一下。

舍友写出的问题主要是要做这样一件事。他在用[gunicorn](https://gunicorn.org/)加flask做一个可视化项目。gunicorn是一个基于`fork`的WSGI server。大致的用法就和官网一样：

```bash
  $ pip install gunicorn
  $ cat myapp.py
    def app(environ, start_response):
        data = b"Hello, World!\n"
        start_response("200 OK", [
            ("Content-Type", "text/plain"),
            ("Content-Length", str(len(data)))
        ])
        return iter([data])
  $ gunicorn -w 4 myapp:app
  [2014-09-10 10:22:28 +0000] [30869] [INFO] Listening at: http://127.0.0.1:8000 (30869)
  [2014-09-10 10:22:28 +0000] [30869] [INFO] Using worker: sync
  [2014-09-10 10:22:28 +0000] [30874] [INFO] Booting worker with pid: 30874
  [2014-09-10 10:22:28 +0000] [30875] [INFO] Booting worker with pid: 30875
  [2014-09-10 10:22:28 +0000] [30876] [INFO] Booting worker with pid: 30876
  [2014-09-10 10:22:28 +0000] [30877] [INFO] Booting worker with pid: 30877
```

通过设置`-w`会设置fork的次数，也就是worker的个数，每个worker都会运行对应的而函数，例子里就是`myapp.app`。然后出现了一个需求，这些wroker需要读同一个文件，所以需要一个锁。

解决方法很简单，gunicorn有一个`--preload`，先运行脚本之后再fork，而不是默认的先fork再运行（之所以默认的是那样是为了更好的重启之类的）。所以只需要这样：

```python
# myapp.py
from multiprocessing import Lock
from time import sleep

lock = Lock()
def app(environ, start_response):
    if lock.acquire(False):
        print(getpid(), "lock")
        sleep(5)  # here is the file processing
        lock.release()
        print(getpid(), "unlock")
    else:
        print(getpid(), "cannot acquire at the moment")
    data = b"Hello, World!\n"
    start_response("200 OK", [
        ("Content-Type", "text/plain"),
        ("Content-Length", str(len(data)))
    ])
    return iter([data])
```

然后运行：

```bash
  $ gunicorn -w 4 --preload myapp:app
```

就可以了。

这里插一句，因为有的时候会晕。fork的时候是会**复制**整个page table的（注意不是复制引用）。这也是为什么赋值之前的变量会被访问到。但是之后再定义新的变量的时候，因为大家用的都是一个page table和一个物理地址的page link list，所以fork之后分配内存就不会范文到同一个地址了。

在进行如上的实验的时候，我错误的把`multiprocessing.Lock`写成了`threading.Lock`了，所以即使传入的是一个锁，仍然不能在多个进程之间加锁。所以问题就来了，这两者时间的区别是什么呢？

所以我就看了一下CPython的实现，下面是摘出来的代码。为了简洁，我们只考虑unix系统下的情况，并把所有timeout的地方都去掉了。可以理解为都是non-blocking的。

## mutiprocessing.Lock

首先是`multiprocessing.Lock`，这个东西定义在`CPython/Lib/multiprocessing/synchronize.py`。

```python
"""
synchronize.py
"""
# Base class for semaphores and mutexes; wraps `_multiprocessing.SemLock`
class SemLock(object):
    _rand = tempfile._RandomNameSequence()

    def __init__(self, kind, value, maxvalue, *, ctx):
        ...
        for i in range(100):
            try:
                sl = self._semlock = _multiprocessing.SemLock(
                    kind, value, maxvalue, self._make_name(),
                    unlink_now)
            except FileExistsError:
                pass
            else:
                break
        ...
    ...

class Lock(SemLock):
    def __init__(self, *, ctx):
        SemLock.__init__(self, SEMAPHORE, 1, 1, ctx=ctx)
```

可以看到这里的`Lock`是`SemLock`的一个派生类。那么我们来考虑一下基类中重要的`_multiprocessing.SemLock`。除去一些python, C相互交互的代码，下面是和`SemLock`相关的C代码：

```c
/*
_multiprocessing.h
*/
typedef sem_t *SEM_HANDLE;

/*
semaphore.c
*/
typedef struct {
    PyObject_HEAD
    SEM_HANDLE handle;
    unsigned long last_tid;  // thread id
    int count;
    int maxvalue;
    int kind;
    char *name;
} SemLockObject;

#define SEM_CREATE(name, val, max) sem_open(name, O_CREAT | O_EXCL, 0600, val)

static PyObject *
semlock_new(PyTypeObject *type, PyObject *args, PyObject *kwds) {
    ...
    handle = SEM_CREATE(name, value, maxvalue);
    ...
    result = newsemlockobject(type, handle, kind, maxvalue, name_copy);
    ...
    return result;
    ...
}

static PyObject *
newsemlockobject(PyTypeObject *type, SEM_HANDLE handle, int kind, int maxvalue,
                 char *name) {
    SemLockObject *self;

    self = PyObject_New(SemLockObject, type);
    if (!self)
        return NULL;
    self->handle = handle;
    self->kind = kind;
    self->count = 0;
    self->last_tid = 0;
    self->maxvalue = maxvalue;
    self->name = name;
    return (PyObject*)self;
}
```

可以看到，这里面最核心的部分实际上就是`sem_open(name, O_CREAT | O_EXCL, 0600, val)`。

## threading.Lock

然后我们来看看`threading.Lock`。

```python
"""
threading.py
"""
_allocate_lock = _thread.allocate_lock
Lock = _allocate_lock
```

这里的`Lock`直接就是一个函数。这个函数相关的代码如下：

```c
/*
_threadmodule.c
*/
typedef struct {
    PyObject_HEAD
    PyThread_type_lock lock_lock;
    PyObject *in_weakreflist;
    char locked; /* for sanity checking */
} lockobject;

// this is the _allocate_lock in the above python file
static PyObject *
thread_PyThread_allocate_lock(PyObject *self, PyObject *Py_UNUSED(ignored)) {
    return (PyObject *) newlockobject();
}

static lockobject *
newlockobject(void) {
    lockobject *self;
    self = PyObject_New(lockobject, &Locktype);
    if (self == NULL)
        return NULL;
    self->lock_lock = PyThread_allocate_lock();
    self->locked = 0;
    self->in_weakreflist = NULL;
    if (self->lock_lock == NULL) {
        Py_DECREF(self);
        PyErr_SetString(ThreadError, "can't allocate lock");
        return NULL;
    }
    return self;
}

/*
thread_pthread.h
*/
PyThread_type_lock
PyThread_allocate_lock(void) {
    sem_t *lock;
    int status, error = 0;
    ...
    lock = (sem_t *)PyMem_RawMalloc(sizeof(sem_t));
    if (lock) {
        status = sem_init(lock,0,1);
        ...
    }
    dprintf(("PyThread_allocate_lock() -> %p\n", (void *)lock));
    return (PyThread_type_lock)lock;
}
```

这里核心的就是`sem_init(lock,0,1)`。这里的第2个参数是表示不在进程之间共享。



所以对比出来了，其实能不能用多进程就是用`sem_open`和`sem_init`的区别。用虽然用`sem_init`也是可以进行进程间共享的，但是用`sem_open`也就是named semaphore更方便。[reference](<https://stackoverflow.com/questions/32205396/share-posix-semaphore-among-multiple-processes>)。

对于named semaphore和unnamed之间的区别可以看[man](<http://man7.org/linux/man-pages/man7/sem_overview.7.html>)。主要区别是named是存在virtual filesystem里的，unnamed存在shared memory中。

