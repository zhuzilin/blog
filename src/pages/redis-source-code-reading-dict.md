---
title: Redis源码阅读 —— 字典
date: 2019-08-15 10:54:00
tags: ["redis", "C"]
---

今天来做源码阅读的第二部分。看一下字典结构的实现。这个结构主要位于`dict.h`和`dict.c`中。

## 字典

字典肯定就不能和SDS依附于`const char *`一样依附于一个C的原生类型了。所以最开始需要先定义其结构。

```c
// dict.h
/* This is our hash table structure. Every dictionary has two of this as we
 * implement incremental rehashing, for the old to the new table. */
typedef struct dictht {
    dictEntry **table;
    unsigned long size;  // hash table size， always 2^n
    unsigned long sizemask;  // always equal to size-1
    unsigned long used;  // number of contained nodes
} dictht;

typedef struct dict {
    dictType *type;
    void *privdata;
    dictht ht[2];  // hash tables
    long rehashidx; /* rehashing not in progress if rehashidx == -1 */
    unsigned long iterators; /* number of iterators currently running */
} dict;
```

可以看到，这里面有2个类型，`dictht`(hash table)和`dict`，一个`dict`中有两个`dictht`。`dictht`的逻辑是很好理解的：

![插图]()

然后哈希表中的`dictEntry`也就是其节点的数据结构是：

```c
// dict.h
typedef struct dictEntry {
    void *key;
    union {
        void *val;
        uint64_t u64;
        int64_t s64;
        double d;
    } v;
    struct dictEntry *next;
} dictEntry;
```

很好理解，就是一个单链表。

![插图]()

那么回到`dict`结构。首先有一个`dictType *type`。其类型定义为：

```c
// dict.h
typedef struct dictType {
    uint64_t (*hashFunction)(const void *key);
    void *(*keyDup)(void *privdata, const void *key);
    void *(*valDup)(void *privdata, const void *obj);
    int (*keyCompare)(void *privdata, const void *key1, const void *key2);
    void (*keyDestructor)(void *privdata, void *key);
    void (*valDestructor)(void *privdata, void *obj);
} dictType;
```

其实也就是定义了用于操作特定键值对的函数，而`privdata`也是保存了

这些函数需要的可选参数。

然后是两个`dictht ht[2]`。大多数时候都只需要1个也就是`ht[0]`，只有在需要进行rehash的时候才会是使用`ht[1]`。`rehashidx`也与其有关，如果在进行rehash，其值为`-1`。

### 哈希算法

我们接下来来看一下默认的hash function。入口应该是`dictGetHash`。

```c
// dict.h
#define dictHashKey(d, key) (d)->type->hashFunction(key)

// dict.c
uint64_t dictGetHash(dict *d, const void *key) {
    return dictHashKey(d, key);
}
```

默认的hash算法是：

```c
// dict.c
/* The default hashing function uses SipHash implementation
 * in siphash.c. */
uint64_t siphash(const uint8_t *in, const size_t inlen, const uint8_t *k);
uint64_t siphash_nocase(const uint8_t *in, const size_t inlen, const uint8_t *k);

uint64_t dictGenHashFunction(const void *key, int len) {
    return siphash(key,len,dict_hash_function_seed);
}

uint64_t dictGenCaseHashFunction(const unsigned char *buf, int len) {
    return siphash_nocase(buf,len,dict_hash_function_seed);
}
```

这个算法的实现在`siphash.c`，其特点是可以预防hash flooding attach，其论文在[这里](https://131002.net/siphash/)。

### rehash和渐进rehash

为了保证哈希表的负载因子(`ht[0].used / ht[0].size`)，当其保存的键值对太多或者太少的时候，需要对其进行相应的收缩或扩展，这也就是rehash。

步骤如下：

- 为`ht[1]`分配空间。

  如果是扩展，那么`ht[1]`的大小为第一个大于`ht[0].used*2`的$2^n$。

  如果是收缩，其大小为第一个大于`ht[0].used`的$2^n$。

- 将`ht[0]`中的所有键值对rehash到`ht[1]`上。rehash是重新计算哈希值和索引值。

- 当全部迁移完毕，删除`ht[0]`，把`ht[1]`设为`ht[0]`。

对于扩展操作，当不在进行`BGSAVE`或者`BGREWRITEAOF`的时候，负载因子大于1，则进行；进行上述两个操作的时候，负载因子大于5再进行。这里的原因没看懂，应该需要需要等看完持久化那部分才明白，不过大致理由是因为COW(写时复制)。

resize部分的代码如下：

```c
// dict.c
int dictResize(dict *d) {
    int minimal;

    if (!dict_can_resize || dictIsRehashing(d)) return DICT_ERR;
    minimal = d->ht[0].used;
    if (minimal < DICT_HT_INITIAL_SIZE)
        minimal = DICT_HT_INITIAL_SIZE;
    return dictExpand(d, minimal);
}

/* Expand or create the hash table */
int dictExpand(dict *d, unsigned long size) {
    /* 如何size比used还小，报错 */
    if (dictIsRehashing(d) || d->ht[0].used > size)
        return DICT_ERR;

    dictht n; /* the new hash table */
    unsigned long realsize = _dictNextPower(size);

    /* Rehashing to the same table size is not useful. */
    if (realsize == d->ht[0].size) return DICT_ERR;

    /* 初始化新hash table */
    n.size = realsize;
    n.sizemask = realsize-1;
    n.table = zcalloc(realsize*sizeof(dictEntry*));
    n.used = 0;

    /* 如果ht[0]为空，说明是初始化，把新ht赋给ht[0] */
    if (d->ht[0].table == NULL) {
        d->ht[0] = n;
        return DICT_OK;
    }
    /* 不然就准备给ht[1] */
    d->ht[1] = n;
    d->rehashidx = 0;
    return DICT_OK;
}
```

收缩操作的临界值是负载因子0.1。

因为字典里面存储的东西可能很多，所以会进行渐进rehash，也就是不一下子进行复制。而是在每次插入、删除、查找和更新步骤的时候，每次复制一些。具体步骤为：

- 开始rehash的时候，把`rehashidx`设置为0
- 在rehash期间，每次进行插入、删除、查找和更新步骤的时候，都会把`ht[0]`中`rehashidx`对应的所有键值对rehash到`ht[1]`，`rehashidx++`。
- 完成全部迁移之后，把`rehashidx`设置为`-1`。

下面是rehash的主要代码，内容很简单。

```c
// dict.c
/* 当没有safe iterator绑定于哈希表的时候，这个函数进行1步
 * 当在rehashing中有iterator的时候，我们不能随便搞乱2个哈希表，不然可能出出现missing or duplicated。
 *
 * 这个函数在字典的common lookup or update operations，从而让哈希表自动从ht[0]迁移到ht[1] */
static void _dictRehashStep(dict *d) {
    if (d->iterators == 0) dictRehash(d,1);
}

/* 进行N步渐进rehashing. 如果仍有尚未迁移的键返回1，反之返回0
 *
 * 这个函数会查看最多N*10个空桶，然后就返回了，所以有可能1个都没有迁移。这么做是为了不让这个函数block掉，或者说花太多时间 */
int dictRehash(dict *d, int n) {
    int empty_visits = n*10; /* Max number of empty buckets to visit. */
    if (!dictIsRehashing(d)) return 0;

    while(n-- && d->ht[0].used != 0) {
        dictEntry *de, *nextde;

        /* Note that rehashidx can't overflow as we are sure there are more
         * elements because ht[0].used != 0 */
        assert(d->ht[0].size > (unsigned long)d->rehashidx);
        while(d->ht[0].table[d->rehashidx] == NULL) {
            d->rehashidx++;
            if (--empty_visits == 0) return 1;
        }
        de = d->ht[0].table[d->rehashidx];
        /* Move all the keys in this bucket from the old to the new hash HT */
        while(de) {
            uint64_t h;

            nextde = de->next;
            /* Get the index in the new hash table */
            h = dictHashKey(d, de->key) & d->ht[1].sizemask;
            de->next = d->ht[1].table[h];
            d->ht[1].table[h] = de;
            d->ht[0].used--;
            d->ht[1].used++;
            de = nextde;
        }
        d->ht[0].table[d->rehashidx] = NULL;
        d->rehashidx++;
    }
    /* Check if we already rehashed the whole table... */
    if (d->ht[0].used == 0) {
        zfree(d->ht[0].table);
        d->ht[0] = d->ht[1];
        _dictReset(&d->ht[1]);
        d->rehashidx = -1;
        return 0;
    }

    /* More to rehash... */
    return 1;
}
```

下面就来依次看一下插入、删除、查找和更新。

### `dictAdd`

```c
// dict.c
/* Add an element to the target hash table */
int dictAdd(dict *d, void *key, void *val) {
    dictEntry *entry = dictAddRaw(d,key,NULL);

    if (!entry) return DICT_ERR;
    dictSetVal(d, entry, val);
    return DICT_OK;
}

/* Low level add or find:
 * 这个函数的作用是添加entry。不过其会返回对应的entry，让用户自己输入值。
 *
 * 这个函数也向用户开放了，主要是为了存储non-pointers。如：
 * entry = dictAddRaw(dict,mykey,NULL);
 * if (entry != NULL) dictSetSignedIntegerVal(entry,1000);
 * Return values:
 *
 * 如果已经有键key，返回NULL, and "*existing" is populated
 * with the existing entry if existing is not NULL.
 */
dictEntry *dictAddRaw(dict *d, void *key, dictEntry **existing) {
    long index;
    dictEntry *entry;
    dictht *ht;
	// rehashidc != -1 => rehash
    if (dictIsRehashing(d)) _dictRehashStep(d);

    /* Get the index of the new element, or -1 if
     * the element already exists. */
    if ((index = _dictKeyIndex(d, key, dictHashKey(d,key), existing)) == -1)
        return NULL;

    /* 分配内存，把新键值对插在最前面(LRU) */
    ht = dictIsRehashing(d) ? &d->ht[1] : &d->ht[0];
    entry = zmalloc(sizeof(*entry));
    entry->next = ht->table[index];
    ht->table[index] = entry;
    ht->used++;

    /* Set the hash entry fields. */
    dictSetKey(d, entry, key);
    return entry;
}
```

rehash的部分上面已经讨论过了。抛开rehashing，其实就3步。

首先是`_dictKeyIndex`，就是顺着链表找。

```c
// dict.c
/* Returns the index of a free slot that can be populated with
 * a hash entry for the given 'key'.
 * If the key already exists, -1 is returned
 * and the optional output parameter may be filled.
 *
 * Note that if we are in the process of rehashing the hash table, the
 * index is always returned in the context of the second (new) hash table. */
static long _dictKeyIndex(dict *d, const void *key, uint64_t hash, dictEntry **existing) {
    unsigned long idx, table;
    dictEntry *he;
    if (existing) *existing = NULL;

    /* Expand the hash table if needed */
    if (_dictExpandIfNeeded(d) == DICT_ERR)
        return -1;
    for (table = 0; table <= 1; table++) {
        idx = hash & d->ht[table].sizemask;
        /* Search if this slot does not already contain the given key */
        he = d->ht[table].table[idx];
        while(he) {
            if (key==he->key || dictCompareKeys(d, key, he->key)) {
                if (existing) *existing = he;
                return -1;
            }
            he = he->next;
        }
        if (!dictIsRehashing(d)) break;
    }
    return idx;
}
```

找到之后就是插入新键。最后就是set key。

```c
// dict.h
#define dictSetKey(d, entry, _key_) do { \
    if ((d)->type->keyDup) \
        (entry)->key = (d)->type->keyDup((d)->privdata, _key_); \
    else \
        (entry)->key = (_key_); \
} while(0)
```

不太清楚这里的`type->keyDup`是什么意思。估计是为了复制一个key，而不是用原来的。

### `dictDelete`

```c
// dict.c
int dictDelete(dict *ht, const void *key) {
    return dictGenericDelete(ht,key,0) ? DICT_OK : DICT_ERR;
}

/* Search and remove an element. This is an helper function for
 * dictDelete() and dictUnlink(), please check the top comment
 * of those functions. */
static dictEntry *dictGenericDelete(dict *d, const void *key, int nofree) {
    uint64_t h, idx;
    dictEntry *he, *prevHe;
    int table;

    if (d->ht[0].used == 0 && d->ht[1].used == 0) return NULL;

    if (dictIsRehashing(d)) _dictRehashStep(d);
    h = dictHashKey(d, key);

    for (table = 0; table <= 1; table++) {
        idx = h & d->ht[table].sizemask;
        he = d->ht[table].table[idx];
        prevHe = NULL;
        while(he) {
            if (key==he->key || dictCompareKeys(d, key, he->key)) {
                /* Unlink the element from the list */
                if (prevHe)
                    prevHe->next = he->next;
                else
                    d->ht[table].table[idx] = he->next;
                if (!nofree) {
                    dictFreeKey(d, he);
                    dictFreeVal(d, he);
                    zfree(he);
                }
                d->ht[table].used--;
                return he;
            }
            prevHe = he;
            he = he->next;
        }
        if (!dictIsRehashing(d)) break;
    }
    return NULL; /* not found */
}
```

就是个单向链表的删除。

然后还有个`dictUnlink`用来不释放空间的。其搭配于`dictFreeUnlinkedEntry`。

```c
dictEntry *dictUnlink(dict *ht, const void *key) {
    return dictGenericDelete(ht,key,1);
}

/* You need to call this function to really free the entry after a call
 * to dictUnlink(). It's safe to call this function with 'he' = NULL. */
void dictFreeUnlinkedEntry(dict *d, dictEntry *he) {
    if (he == NULL) return;
    dictFreeKey(d, he);
    dictFreeVal(d, he);
    zfree(he);
}
```

### `dictFind`

单链表查找。`dictFetchValue`是其返回值的wrapper。

更新貌似直接`dictFind` + `dictSetVal`就行了。

剩下还有一些API，我们来看一下：

### `dictCreate`、`dictRelease`、`dictEmpty`

创建，释放和清空。都是简单的内存操作。注意释放一个链表node的时候还需要分别释放其键和值。

