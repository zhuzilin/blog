---
title: Redis源码阅读 —— 对象
draft: true
---

今天来看一下对象结构的实现。这个结构主要位于`intset.h`和`intset.c`。

## 对象

```c
// server.h
#define LRU_BITS 24

typedef struct redisObject {
    unsigned type:4;
    unsigned encoding:4;
    unsigned lru:LRU_BITS; /* LRU time (relative to global lru_clock) or
                            * LFU data (least significant 8 bits frequency
                            * and most significant 16 bits access time). */
    int refcount;
    void *ptr;  // 指向底层的指针
} robj;
```

这里的`:`是用于表示其占几位用的。

redis有如下几种对象类型：

| 类型常量     | 对象的名称               |
| :----------- | :----------------------- |
| `OBJ_STRING` | 字符串对象               |
| `OBJ_LIST`   | 列表对象                 |
| `OBJ_HASH`   | 哈希对象                 |
| `OBJ_SET`    | 集合对象                 |
| `OBJ_ZSET`   | 有序集合对象             |
| `OBJ_MODULE` | object被redis module管理 |
| `OBJ_STREAM` |                          |

编码方式也有：

| 编码常量                  | 编码所对应的底层数据结构      |
| :------------------------ | :---------------------------- |
| `OBJ_ENCODING_INT`        | `long` 类型的整数             |
| `OBJ_ENCODING_EMBSTR`     | `embstr` 编码的简单动态字符串 |
| `OBJ_ENCODING_RAW`        | 简单动态字符串                |
| `OBJ_ENCODING_HT`         | 字典                          |
| `OBJ_ENCODING_ZIPMAP`     |                               |
| `OBJ_ENCODING_LINKEDLIST` | 双端链表(no longer used)      |
| `OBJ_ENCODING_ZIPLIST`    | 压缩列表                      |
| `OBJ_ENCODING_INTSET`     | 整数集合                      |
| `OBJ_ENCODING_SKIPLIST`   | 跳跃表和字典                  |
| `OBJ_ENCODING_QUICKLIST`  |                               |
| `OBJ_ENCODING_STREAM`     |                               |

对象类型对应的编码方式如下：

| 类型           | 编码                        | 对象                                                 |
| :------------- | :-------------------------- | :--------------------------------------------------- |
| `REDIS_STRING` | `REDIS_ENCODING_INT`        | 使用整数值实现的字符串对象。                         |
| `REDIS_STRING` | `REDIS_ENCODING_EMBSTR`     | 使用 `embstr` 编码的简单动态字符串实现的字符串对象。 |
| `REDIS_STRING` | `REDIS_ENCODING_RAW`        | 使用简单动态字符串实现的字符串对象。                 |
| `REDIS_LIST`   | `REDIS_ENCODING_ZIPLIST`    | 使用压缩列表实现的列表对象。                         |
| `REDIS_LIST`   | `REDIS_ENCODING_LINKEDLIST` | 使用双端链表实现的列表对象。                         |
| `REDIS_HASH`   | `REDIS_ENCODING_ZIPLIST`    | 使用压缩列表实现的哈希对象。                         |
| `REDIS_HASH`   | `REDIS_ENCODING_HT`         | 使用字典实现的哈希对象。                             |
| `REDIS_SET`    | `REDIS_ENCODING_INTSET`     | 使用整数集合实现的集合对象。                         |
| `REDIS_SET`    | `REDIS_ENCODING_HT`         | 使用字典实现的集合对象。                             |
| `REDIS_ZSET`   | `REDIS_ENCODING_ZIPLIST`    | 使用压缩列表实现的有序集合对象。                     |
| `REDIS_ZSET`   | `REDIS_ENCODING_SKIPLIST`   | 使用跳跃表和字典实现的有序集合对象。                 |

来一个一个看`object.c`中的函数

### `createObject`

```c
// server.h
extern struct redisServer server;

// server.c
struct redisServer server;

// object.c
robj *createObject(int type, void *ptr) {
    robj *o = zmalloc(sizeof(*o));
    o->type = type;
    o->encoding = OBJ_ENCODING_RAW;
    o->ptr = ptr;
    o->refcount = 1;

    /* Set the LRU to the current lruclock (minutes resolution), or
     * alternatively the LFU counter. */
    if (server.maxmemory_policy & MAXMEMORY_FLAG_LFU) {
        o->lru = (LFUGetTimeInMinutes()<<8) | LFU_INIT_VAL;
    } else {
        o->lru = LRU_CLOCK();
    }
    return o;
}
```

对于小整数等变量，经常会让其只有公共的几份，也不进行引用计数和释放了。

```c
// server.h
#define OBJ_SHARED_REFCOUNT INT_MAX

// object.c
/* 设置一个特殊的引用计数使其变为 "shared":
 * incrRefCount and decrRefCount() 会检查变量是不是共享对象，如果是就忽略这个对象
 * 这样就可以在不使用mutex的情况下在不同线程中使用一些如小整数这样的变量
 * 常见使用方法:
 * robj *myobject = makeObjectShared(createObject(...));
 */
robj *makeObjectShared(robj *o) {
    serverAssert(o->refcount == 1);
    o->refcount = OBJ_SHARED_REFCOUNT;
    return o;
}

void incrRefCount(robj *o) {
    if (o->refcount != OBJ_SHARED_REFCOUNT) o->refcount++;
}

void decrRefCount(robj *o) {
    if (o->refcount == 1) {
        switch(o->type) {
        case OBJ_STRING: freeStringObject(o); break;
        case OBJ_LIST: freeListObject(o); break;
        case OBJ_SET: freeSetObject(o); break;
        case OBJ_ZSET: freeZsetObject(o); break;
        case OBJ_HASH: freeHashObject(o); break;
        case OBJ_MODULE: freeModuleObject(o); break;
        case OBJ_STREAM: freeStreamObject(o); break;
        default: serverPanic("Unknown object type"); break;
        }
        zfree(o);
    } else {
        if (o->refcount <= 0) serverPanic("decrRefCount against refcount <= 0");
        if (o->refcount != OBJ_SHARED_REFCOUNT) o->refcount--;
    }
}
```

然后陆续是各种不同的对象的`create`。

```c
// object.c
/* 创建一个以OBJ_ENCODING_RAW为编码的字符串对象，其o->ptr指向一个sds string. */
robj *createRawStringObject(const char *ptr, size_t len) {
    return createObject(OBJ_STRING, sdsnewlen(ptr,len));
}

/* 创建一个以OBJ_ENCODING_EMBSTR为编码的字符串对象, 这里的sds string不可修改
 * 并且字符串和对象在同一内存chunk中. */
robj *createEmbeddedStringObject(const char *ptr, size_t len) {
    robj *o = zmalloc(sizeof(robj)+sizeof(struct sdshdr8)+len+1);
    struct sdshdr8 *sh = (void*)(o+1);

    o->type = OBJ_STRING;
    o->encoding = OBJ_ENCODING_EMBSTR;
    o->ptr = sh+1;
    o->refcount = 1;
    if (server.maxmemory_policy & MAXMEMORY_FLAG_LFU) {
        o->lru = (LFUGetTimeInMinutes()<<8) | LFU_INIT_VAL;
    } else {
        o->lru = LRU_CLOCK();
    }

    sh->len = len;
    sh->alloc = len;
    sh->flags = SDS_TYPE_8;
    if (ptr == SDS_NOINIT)
        sh->buf[len] = '\0';
    else if (ptr) {
        memcpy(sh->buf,ptr,len);
        sh->buf[len] = '\0';
    } else {
        memset(sh->buf,0,len+1);
    }
    return o;
}

/* 创建字符串对象，如果长度小于OBJ_ENCODING_EMBSTR_SIZE_LIMIT就用 EMBSTR
 * , 不然就用RAW。
 *
 * 目前用选44为阈值是为了让EMBSTR存储的最大字符串对象还在64byte之内 */
#define OBJ_ENCODING_EMBSTR_SIZE_LIMIT 44
robj *createStringObject(const char *ptr, size_t len) {
    if (len <= OBJ_ENCODING_EMBSTR_SIZE_LIMIT)
        return createEmbeddedStringObject(ptr,len);
    else
        return createRawStringObject(ptr,len);
}

// server.h
#define OBJ_SHARED_INTEGERS 10000
struct sharedObjectsStruct {
    robj ...
    *integers[OBJ_SHARED_INTEGERS],
    ...
};

// server.c
struct sharedObjectsStruct shared;

// object.c
/* 从一个long long创建字符串. When possible returns a
 * shared integer object, or at least an integer encoded one.
 *
 * 如果valueobj不为0，那么不能用shared，因为其被用作了Redis key space中的整数
 * (比如用INCR的时候), 我们需要对这个key的专门的LFU/LRU值 */
robj *createStringObjectFromLongLongWithOptions(long long value, int valueobj) {
    robj *o;

    if (server.maxmemory == 0 ||
        !(server.maxmemory_policy & MAXMEMORY_FLAG_NO_SHARED_INTEGERS)) {
        /* 如果maxmemory policy允许, 在valueobj为true的情况下仍可以返回shared integer */
        valueobj = 0;
    }

    if (value >= 0 && value < OBJ_SHARED_INTEGERS && valueobj == 0) {
        incrRefCount(shared.integers[value]);
        o = shared.integers[value];
    } else {
        if (value >= LONG_MIN && value <= LONG_MAX) {
            o = createObject(OBJ_STRING, NULL);
            o->encoding = OBJ_ENCODING_INT;
            o->ptr = (void*)((long)value);
        } else {
            o = createObject(OBJ_STRING,sdsfromlonglong(value));
        }
    }
    return o;
}

/* 上面那个函数的wrapper */
robj *createStringObjectFromLongLong(long long value) {
    return createStringObjectFromLongLongWithOptions(value,0);
}

/* 同上 */
robj *createStringObjectFromLongLongForValue(long long value) {
    return createStringObjectFromLongLongWithOptions(value,1);
}

/* 从long double转化. 如果humanfriendly非0，将不会用指数格式
 * 并会trim掉结尾的0, 不过这样会影响精度. 不然就会用exp format
 * and the output of snprintf() is not modified.
 *
 * The 'humanfriendly' option is used for INCRBYFLOAT and HINCRBYFLOAT. */
robj *createStringObjectFromLongDouble(long double value, int humanfriendly) {
    char buf[MAX_LONG_DOUBLE_CHARS];
    // 这个函数可以返回inf，主要就是用snprintf
    int len = ld2string(buf,sizeof(buf),value,humanfriendly);
    return createStringObject(buf,len);
}

/* 复制string对象。返回值编码一样。
 * 返回的引用计数永远为1，且对于INT，返回的永远是新对象而不是shared
 *
 * 注意这里并没有复制底层的字符串，不明白释放的时候为啥不会出问题 */
robj *dupStringObject(const robj *o) {
    robj *d;

    serverAssert(o->type == OBJ_STRING);

    switch(o->encoding) {
    case OBJ_ENCODING_RAW:
        return createRawStringObject(o->ptr,sdslen(o->ptr));
    case OBJ_ENCODING_EMBSTR:
        return createEmbeddedStringObject(o->ptr,sdslen(o->ptr));
    case OBJ_ENCODING_INT:
        d = createObject(OBJ_STRING, NULL);
        d->encoding = OBJ_ENCODING_INT;
        d->ptr = o->ptr;
        return d;
    default:
        serverPanic("Wrong encoding.");
        break;
    }
}
```

上面是和创建字符串相关的部分。剩下几个对象的创建都是很相似的：

```c
robj *createQuicklistObject(void) {
    quicklist *l = quicklistCreate();
    robj *o = createObject(OBJ_LIST,l);
    o->encoding = OBJ_ENCODING_QUICKLIST;
    return o;
}

robj *createZiplistObject(void) {
    unsigned char *zl = ziplistNew();
    robj *o = createObject(OBJ_LIST,zl);
    o->encoding = OBJ_ENCODING_ZIPLIST;
    return o;
}

robj *createSetObject(void) {
    dict *d = dictCreate(&setDictType,NULL);
    robj *o = createObject(OBJ_SET,d);
    o->encoding = OBJ_ENCODING_HT;
    return o;
}

robj *createIntsetObject(void) {
    intset *is = intsetNew();
    robj *o = createObject(OBJ_SET,is);
    o->encoding = OBJ_ENCODING_INTSET;
    return o;
}

robj *createHashObject(void) {
    unsigned char *zl = ziplistNew();
    robj *o = createObject(OBJ_HASH, zl);
    o->encoding = OBJ_ENCODING_ZIPLIST;
    return o;
}

robj *createZsetObject(void) {
    zset *zs = zmalloc(sizeof(*zs));
    robj *o;

    zs->dict = dictCreate(&zsetDictType,NULL);
    zs->zsl = zslCreate();
    o = createObject(OBJ_ZSET,zs);
    o->encoding = OBJ_ENCODING_SKIPLIST;
    return o;
}

robj *createZsetZiplistObject(void) {
    unsigned char *zl = ziplistNew();
    robj *o = createObject(OBJ_ZSET,zl);
    o->encoding = OBJ_ENCODING_ZIPLIST;
    return o;
}

robj *createStreamObject(void) {
    stream *s = streamNew();
    robj *o = createObject(OBJ_STREAM,s);
    o->encoding = OBJ_ENCODING_STREAM;
    return o;
}

robj *createModuleObject(moduleType *mt, void *value) {
    moduleValue *mv = zmalloc(sizeof(*mv));
    mv->type = mt;
    mv->value = value;
    return createObject(OBJ_MODULE,mv);
}
```

### free

释放的函数都是在`decreRefCount`里面调用的，这个函数前面提到过了。每个类型具体的释放函数很简单：

```c
void freeStringObject(robj *o) {
    // 注意只有RAW会被释放
    if (o->encoding == OBJ_ENCODING_RAW) {
        sdsfree(o->ptr);
    }
}

void freeListObject(robj *o) {
    if (o->encoding == OBJ_ENCODING_QUICKLIST) {
        quicklistRelease(o->ptr);
    } else {
        serverPanic("Unknown list encoding type");
    }
}

void freeSetObject(robj *o) {
    switch (o->encoding) {
    case OBJ_ENCODING_HT:
        dictRelease((dict*) o->ptr);
        break;
    case OBJ_ENCODING_INTSET:
        zfree(o->ptr);
        break;
    default:
        serverPanic("Unknown set encoding type");
    }
}

void freeZsetObject(robj *o) {
    zset *zs;
    switch (o->encoding) {
    case OBJ_ENCODING_SKIPLIST:
        zs = o->ptr;
        dictRelease(zs->dict);
        zslFree(zs->zsl);
        zfree(zs);
        break;
    case OBJ_ENCODING_ZIPLIST:
        zfree(o->ptr);
        break;
    default:
        serverPanic("Unknown sorted set encoding");
    }
}

void freeHashObject(robj *o) {
    switch (o->encoding) {
    case OBJ_ENCODING_HT:
        dictRelease((dict*) o->ptr);
        break;
    case OBJ_ENCODING_ZIPLIST:
        zfree(o->ptr);
        break;
    default:
        serverPanic("Unknown hash encoding type");
        break;
    }
}

void freeModuleObject(robj *o) {
    moduleValue *mv = o->ptr;
    mv->type->free(mv->value);
    zfree(mv);
}

void freeStreamObject(robj *o) {
    freeStream(o->ptr);
}
```

