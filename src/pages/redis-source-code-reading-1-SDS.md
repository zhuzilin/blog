---
title: redis源码阅读1 —— SDS
date: 2019-08-14 10:54:00
tags: ["redis", "C"]
---

今天开始开一个大坑，开始读redis的源码。因为网上大家都说redis的代码非常漂亮~然后读的过程和顺序会按照《Redis 设计与实现》（[试读链接](<http://redisbook.com/>)）。现在的版本号是5.0.5，希望我能顺利把它读完，也希望读完的那天不要已经跳个大版本，升到6了之类的。

按刚刚提到的那本书的顺序，我们先来看一下redis里面基本的数据结构。最最基本的也就是SDS (simple dynamic string)了，大致就是把C的字符串包了一下。

## SDS

对应的头文件非常好找，就是`sds.h`和`sds.c`。

```c
typedef char *sds;
```

sds就是一个`char *`。

然后我们看一下non-static function，也就是会暴露给linker用的那部分：

```c
// sds.h
sds sdsnewlen(const void *init, size_t initlen);
sds sdsnew(const char *init);
sds sdsempty(void);
sds sdsdup(const sds s);
void sdsfree(sds s);
sds sdsgrowzero(sds s, size_t len);
sds sdscatlen(sds s, const void *t, size_t len);
sds sdscat(sds s, const char *t);
sds sdscatsds(sds s, const sds t);
sds sdscpylen(sds s, const char *t, size_t len);
sds sdscpy(sds s, const char *t);

sds sdscatvprintf(sds s, const char *fmt, va_list ap);
#ifdef __GNUC__
sds sdscatprintf(sds s, const char *fmt, ...)
    __attribute__((format(printf, 2, 3)));
#else
sds sdscatprintf(sds s, const char *fmt, ...);
#endif

sds sdscatfmt(sds s, char const *fmt, ...);
sds sdstrim(sds s, const char *cset);
void sdsrange(sds s, ssize_t start, ssize_t end);
void sdsupdatelen(sds s);
void sdsclear(sds s);
int sdscmp(const sds s1, const sds s2);
sds *sdssplitlen(const char *s, ssize_t len, const char *sep, int seplen, int *count);
void sdsfreesplitres(sds *tokens, int count);
void sdstolower(sds s);
void sdstoupper(sds s);
sds sdsfromlonglong(long long value);
sds sdscatrepr(sds s, const char *p, size_t len);
sds *sdssplitargs(const char *line, int *argc);
sds sdsmapchars(sds s, const char *from, const char *to, size_t setlen);
sds sdsjoin(char **argv, int argc, char *sep);
sds sdsjoinsds(sds *argv, int argc, const char *sep, size_t seplen);

/* Low level functions exposed to the user API */
sds sdsMakeRoomFor(sds s, size_t addlen);
void sdsIncrLen(sds s, ssize_t incr);
sds sdsRemoveFreeSpace(sds s);
size_t sdsAllocSize(sds s);
void *sdsAllocPtr(sds s);

/* Export the allocator used by SDS to the program using SDS.
 * Sometimes the program SDS is linked to, may use a different set of
 * allocators, but may want to allocate or free things that SDS will
 * respectively free or allocate. */
void *sds_malloc(size_t size);
void *sds_realloc(void *ptr, size_t size);
void sds_free(void *ptr);

#ifdef REDIS_TEST
int sdsTest(int argc, char *argv[]);
#endif
```

那下面，沉下心，一个一个来看吧。

### `sdsnewlen`

```c
// sds.c
/* 用'init'指针中对应的内容和'initlen'的长度来创建一个新的sds string
 * 如果'init'是NULL，那么string会被初始化为zero bytes.
 * 如果使用了SDS_NOINIT, 将不会初始化buffer;
 *
 * string最后总会以'\0'结尾(all the sds strings are, always)。所以如果你创建了：
 *
 * mystring = sdsnewlen("abc",3);
 *
 * 你仍然可以printf()。 不过注意，sds是binary safe的所以中间也可能包含\0。 */
sds sdsnewlen(const void *init, size_t initlen) {
    void *sh;
    sds s;
    char type = sdsReqType(initlen);
    /* Empty strings are usually created in order to append. Use type 8
     * since type 5 is not good at this. */
    if (type == SDS_TYPE_5 && initlen == 0) type = SDS_TYPE_8;
    int hdrlen = sdsHdrSize(type);
    unsigned char *fp; /* flags pointer. */

    sh = s_malloc(hdrlen+initlen+1);
    if (init==SDS_NOINIT)
        init = NULL;
    else if (!init)
        memset(sh, 0, hdrlen+initlen+1);
    if (sh == NULL) return NULL;
    s = (char*)sh+hdrlen;
    fp = ((unsigned char*)s)-1;
    switch(type) {
        case SDS_TYPE_5: {
            *fp = type | (initlen << SDS_TYPE_BITS);
            break;
        }
        case SDS_TYPE_8: {
            SDS_HDR_VAR(8,s);
            sh->len = initlen;
            sh->alloc = initlen;
            *fp = type;
            break;
        }
        case SDS_TYPE_16: {
            SDS_HDR_VAR(16,s);
            sh->len = initlen;
            sh->alloc = initlen;
            *fp = type;
            break;
        }
        case SDS_TYPE_32: {
            SDS_HDR_VAR(32,s);
            sh->len = initlen;
            sh->alloc = initlen;
            *fp = type;
            break;
        }
        case SDS_TYPE_64: {
            SDS_HDR_VAR(64,s);
            sh->len = initlen;
            sh->alloc = initlen;
            *fp = type;
            break;
        }
    }
    if (initlen && init)
        memcpy(s, init, initlen);
    s[initlen] = '\0';
    return s;
}
```

进入函数，我们发现sds有一个很重要的特性就是type。所以需要先看一下`sdsReqType(initlen)`这个函数。

```c
// sds.c
static inline char sdsReqType(size_t string_size) {
    if (string_size < 1<<5)  // 32
        return SDS_TYPE_5;
    if (string_size < 1<<8)  // 256
        return SDS_TYPE_8;
    if (string_size < 1<<16)  // 65536
        return SDS_TYPE_16;
#if (LONG_MAX == LLONG_MAX)  // 32位返回32或64，64位都返回32
    if (string_size < 1ll<<32)
        return SDS_TYPE_32;
    return SDS_TYPE_64;
#else
    return SDS_TYPE_32;
#endif
}
```

这个type指的就是string size的不同大小，因为存的是char，所以也就是字符串的大小。

确定了字符串的类型之后，就会用`sdsHdrSize`来表示字符串的header。

```c
// sds.c
static inline int sdsHdrSize(char type) {
    switch(type&SDS_TYPE_MASK) {
        case SDS_TYPE_5:
            return sizeof(struct sdshdr5);
        case SDS_TYPE_8:
            return sizeof(struct sdshdr8);
        case SDS_TYPE_16:
            return sizeof(struct sdshdr16);
        case SDS_TYPE_32:
            return sizeof(struct sdshdr32);
        case SDS_TYPE_64:
            return sizeof(struct sdshdr64);
    }
    return 0;
}
```

而这几种字符串的header struct在这里：

```c
// sds.h
/* 注意: sdshdr5从未被使用过, 我们会直接访问flags
 * 这里只是用来记录一下 type 5 SDS strings的layout. */
struct __attribute__ ((__packed__)) sdshdr5 {
    unsigned char flags; /* 3 lsb of type, and 5 msb of string length */
    char buf[];
};
struct __attribute__ ((__packed__)) sdshdr8 {
    uint8_t len; /* used */
    uint8_t alloc; /* excluding the header and null terminator */
    unsigned char flags; /* 3 lsb of type, 5 unused bits */
    char buf[];
};
struct __attribute__ ((__packed__)) sdshdr16 {
    uint16_t len; /* used */
    uint16_t alloc; /* excluding the header and null terminator */
    unsigned char flags; /* 3 lsb of type, 5 unused bits */
    char buf[];
};
struct __attribute__ ((__packed__)) sdshdr32 {
    uint32_t len; /* used */
    uint32_t alloc; /* excluding the header and null terminator */
    unsigned char flags; /* 3 lsb of type, 5 unused bits */
    char buf[];
};
struct __attribute__ ((__packed__)) sdshdr64 {
    uint64_t len; /* used */
    uint64_t alloc; /* excluding the header and null terminator */
    unsigned char flags; /* 3 lsb of type, 5 unused bits */
    char buf[];
};
```

这里不同的类型的最大区别是他们的长度的数字类型不同然后type5是不记录还有多少空余的。我们来看一下c的特性`__attribute__ ((__packed__))`。

> The keyword `__attribute__` allows you to specify special attributes of `struct` and `union` types when you define such types. This keyword is followed by an attribute specification inside double parentheses.
>
> ...
>
> `packed`
>
> This attribute, attached to an `enum`, `struct`, or `union` type definition, specified that the minimum required memory be used to represent the type.
>
> [gcc doc](<https://gcc.gnu.org/onlinedocs/gcc/Attribute-Syntax.html>)

也就是让struct中的内容紧密排布。

然后就是分配内存了，使用了一个叫`s_malloc`的函数

```c
// sdsalloc.c
#define s_malloc zmalloc

// zmalloc.c
#define PREFIX_SIZE (sizeof(size_t))

void *zmalloc(size_t size) {
    void *ptr = malloc(size+PREFIX_SIZE);

    if (!ptr) zmalloc_oom_handler(size);  // OOM 错误处理

    *((size_t*)ptr) = size;
    update_zmalloc_stat_alloc(size+PREFIX_SIZE);
    return (char*)ptr+PREFIX_SIZE;
}
```

这里面有`HAVE_MALLOC_SIZE`是用来跨平台的，所以默认是进`#else`，我们就暂且关注`else`，所以为了篇幅，把`HAVE_MALLOC_SIZE`的部分删去了。

注意在`malloc`里面，加了个`size_t`，用来记录这个指针的大小。返回的时候，返回不带`size`的指针。然后唯一需要关注的就是`update_zmalloc_stat_alloc`这个函数了。

```c
// zmalloc.c
static size_t used_memory = 0;
pthread_mutex_t used_memory_mutex = PTHREAD_MUTEX_INITIALIZER;  // 为了兼容性，所以这么写

#define update_zmalloc_stat_alloc(__n) do { \
    size_t _n = (__n); \
    if (_n&(sizeof(long)-1)) _n += sizeof(long)-(_n&(sizeof(long)-1)); \
    atomicIncr(used_memory,__n); \
} while(0)

// atomicvar.h
#define atomicIncr(var,count) do { \
    pthread_mutex_lock(&var ## _mutex); \  // ##是为了找一个变量名位var_mutex的锁
    var += (count); \
    pthread_mutex_unlock(&var ## _mutex); \
} while(0)
```

这里的`do {...} while(0)`也是挺灵性的哈...是为了能够把`update_zmalloc_stat_alloc`当成个函数用，见[这里](<https://stackoverflow.com/questions/257418/do-while-0-what-is-it-good-for>)。这个宏的意义大致就是补全成`long`的整数倍，也就是4 bytes的整数倍。

说完`zmalloc`或者说`s_malloc`，`sdsnewlen`剩下的事情就是对header进行一下初始化，不过有趣的是为啥`((unsigned char *)s)-1`是`flags`呀，不应该是`buf`吗？注意返回的是`buf`。

### `sdsnew`、`sdsempty`、`sdsdup`

```c
/* Create an empty (zero length) sds string. Even in this case the string
 * always has an implicit null term. */
sds sdsempty(void) {
    return sdsnewlen("",0);
}

/* Create a new sds string starting from a null terminated C string. */
sds sdsnew(const char *init) {
    size_t initlen = (init == NULL) ? 0 : strlen(init);
    return sdsnewlen(init, initlen);
}

/* Duplicate an sds string. */
sds sdsdup(const sds s) {
    return sdsnewlen(s, sdslen(s));
}
```

没啥可说的，包了一下`sdsnewlen`

### `sdsfree`

```c
// sds.c
/* Free an sds string. No operation is performed if 's' is NULL. */
void sdsfree(sds s) {
    if (s == NULL) return;
    s_free((char*)s-sdsHdrSize(s[-1]));
}

// sdsakkic,h
#define s_free zfree

// zmalloc.c
#define update_zmalloc_stat_free(__n) do { \
    size_t _n = (__n); \
    if (_n&(sizeof(long)-1)) _n += sizeof(long)-(_n&(sizeof(long)-1)); \
    atomicDecr(used_memory,__n); \
} while(0)

void zfree(void *ptr) {
    if (ptr == NULL) return;

    realptr = (char*)ptr-PREFIX_SIZE;
    oldsize = *((size_t*)realptr);
    update_zmalloc_stat_free(oldsize+PREFIX_SIZE);
    free(realptr);
}
```

这个函数是释放，和`sdsnewlen`一样，也要跑回`zmalloc.c`看`zfree`。就是反向操作一下，没啥特别的。

### `sdsgrowzero`、`sdsMakeRoomFor`

```c
// sds.c
/* 让sds增长为指定长度。 不在原长范围内的byte会被设置为0
 *
 * 如果指定长度小于现在的长度，直接返回 */
sds sdsgrowzero(sds s, size_t len) {
    size_t curlen = sdslen(s);  // 查看header中的len

    if (len <= curlen) return s;
    s = sdsMakeRoomFor(s,len-curlen);
    if (s == NULL) return NULL;

    /* 保证添加的部分没有垃圾 */
    memset(s+curlen,0,(len-curlen+1)); /* also set trailing \0 byte */
    sdssetlen(s, len);
    return s;
}
```

首先是读取原长，其实就是直接从header里面读出来。然后关键是如何增加空间

```c
/* 在sds string后扩充free space，从而让caller能放心overwrite原字符串尾的额外addlen
 * 这么多bytes，以及1个'\0'
 *
 * 注意: 这个函数不改变sdslen()返回的*length* of the sds string */
sds sdsMakeRoomFor(sds s, size_t addlen) {
    void *sh, *newsh;
    size_t avail = sdsavail(s);  // 就是alloc - len
    size_t len, newlen;
    char type, oldtype = s[-1] & SDS_TYPE_MASK;
    int hdrlen;

    /* 如果还有足够的空间直接返回. */
    if (avail >= addlen) return s;

    len = sdslen(s);
    sh = (char*)s-sdsHdrSize(oldtype);
    newlen = (len+addlen);
    if (newlen < SDS_MAX_PREALLOC)  // 临界点是1M
        newlen *= 2;
    else
        newlen += SDS_MAX_PREALLOC;

    type = sdsReqType(newlen);

    /* 不要用type 5: type5不记录剩余空间，
     * 会导致每次append都要用sdsMakeRoomFor() */
    if (type == SDS_TYPE_5) type = SDS_TYPE_8;

    hdrlen = sdsHdrSize(type);
    if (oldtype==type) {
        newsh = s_realloc(sh, hdrlen+newlen+1);
        if (newsh == NULL) return NULL;
        s = (char*)newsh+hdrlen;
    } else {
        /* 因为header大小改了, 需要向前移动string, 所以不能用realloc */
        newsh = s_malloc(hdrlen+newlen+1);
        if (newsh == NULL) return NULL;
        memcpy((char*)newsh+hdrlen, s, len+1);
        s_free(sh);
        s = (char*)newsh+hdrlen;
        s[-1] = type;
        sdssetlen(s, len);
    }
    sdssetalloc(s, newlen);
    return s;
}
```

大致就是如果就字符串长度小于1M，就翻倍长度，不然就加1M。然后检查是否导致type变化了，如果没变就调用`s_realloc`，反之就`s_free`+`s_malloc`。

来看一下`s_realloc`的部分

```c
// sdsalloc.h
#define s_realloc zrealloc

// zmalloc.c
void *zrealloc(void *ptr, size_t size) {
    size_t oldsize;
    void *newptr;

    if (size == 0 && ptr != NULL) {
        zfree(ptr);
        return NULL;
    }
    if (ptr == NULL) return zmalloc(size);
    realptr = (char*)ptr-PREFIX_SIZE;
    oldsize = *((size_t*)realptr);
    newptr = realloc(realptr,size+PREFIX_SIZE);
    if (!newptr) zmalloc_oom_handler(size);

    *((size_t*)newptr) = size;
    update_zmalloc_stat_free(oldsize+PREFIX_SIZE);
    update_zmalloc_stat_alloc(size+PREFIX_SIZE);
    return (char*)newptr+PREFIX_SIZE;
}
```

和`zmalloc`基本一样，处理了一下`size`，然后调用`realloc`，`realloc`在需要保持之前的数据的时候比`malloc`+`memcpy`+`free`要快。

然后type改变的情况就需要重新搞一个。然后注意需要`sdssetlen`来设置一下现在的字符串长度。

最后在外面都需要用`sdssetalloc`来设置一下header里头的`alloc`大小。

### `sdscatlen`

```c
/* 在s后面append长度为'len'的数据't'.
 *
 * 调用后原来的字符串也会改变了 */
sds sdscatlen(sds s, const void *t, size_t len) {
    size_t curlen = sdslen(s);

    s = sdsMakeRoomFor(s,len);
    if (s == NULL) return NULL;
    memcpy(s+curlen, t, len);
    sdssetlen(s, curlen+len);
    s[curlen+len] = '\0';
    return s;
}
```

就是`memcpy`注意还要把最后的1位设置为`'\0'`。

### `sdscat`、`sdscatsds`

```c
sds sdscat(sds s, const char *t) {
    return sdscatlen(s, t, strlen(t));
}

sds sdscatsds(sds s, const sds t) {
    return sdscatlen(s, t, sdslen(t));
}
```

就是包了一下`sdscatlen`

### `sdscpylen`、`sdscpy`

```c
/* Destructively修改's'来装长为'len'的‘t'。 */
sds sdscpylen(sds s, const char *t, size_t len) {
    if (sdsalloc(s) < len) {
        s = sdsMakeRoomFor(s,len-sdslen(s));
        if (s == NULL) return NULL;
    }
    memcpy(s, t, len);
    s[len] = '\0';
    sdssetlen(s, len);
    return s;
}

sds sdscpy(sds s, const char *t) {
    return sdscpylen(s, t, strlen(t));
}
```

没啥可说的，和`stdcatlen`差不多。

### `sdscatvprintf`、`sdscatprintf`

```c
/* Like sdscatprintf() but gets va_list instead of being variadic. */
sds sdscatvprintf(sds s, const char *fmt, va_list ap) {
    va_list cpy;
    char staticbuf[1024], *buf = staticbuf, *t;
    size_t buflen = strlen(fmt)*2;

    /* 试着用static buffer来加速，如果不行就回到heap allocation */
    if (buflen > sizeof(staticbuf)) {
        buf = s_malloc(buflen);
        if (buf == NULL) return NULL;
    } else {
        buflen = sizeof(staticbuf);
    }

    /* 试着把fmt放进去，如果不够大，就把buf增大1倍 */
    while(1) {
        buf[buflen-2] = '\0';
        va_copy(cpy,ap);
        vsnprintf(buf, buflen, fmt, cpy);
        va_end(cpy);
        if (buf[buflen-2] != '\0') {
            if (buf != staticbuf) s_free(buf);
            buflen *= 2;
            buf = s_malloc(buflen);
            if (buf == NULL) return NULL;
            continue;
        }
        break;
    }

    /* Finally concat the obtained string to the SDS string and return it. */
    t = sdscat(s, buf);
    if (buf != staticbuf) s_free(buf);
    return t;
}

/* 在's'后面append一个printf-alike format specifier.
 *
 * Example:
 * s = sdsnew("Sum is: ");
 * s = sdscatprintf(s,"%d+%d = %d",a,b,a+b).
 *
 * 如果需要直接创建一个那么只需要：
 * s = sdscatprintf(sdsempty(), "... your format ...", args);
 */
sds sdscatprintf(sds s, const char *fmt, ...) {
    va_list ap;
    char *t;
    va_start(ap, fmt);
    t = sdscatvprintf(s,fmt,ap);
    va_end(ap);
    return t;
}
```

大致就是用`vsnprintf`，然后又一个`buf`用来存字符串。不知道为啥要检查`buf[buflen-2]`而不是看返回值。

### `sdscatfmt`

```c
/* 比sdscatprintf快很多，但是只实现了一部分功能，包括
 *
 * %s - C String
 * %S - SDS string
 * %i - signed int
 * %I - 64 bit signed integer (long long, int64_t)
 * %u - unsigned int
 * %U - 64 bit unsigned integer (unsigned long long, uint64_t)
 * %% - Verbatim "%" character.
 */
sds sdscatfmt(sds s, char const *fmt, ...) {
    size_t initlen = sdslen(s);
    const char *f = fmt;
    long i;
    va_list ap;

    va_start(ap,fmt);
    f = fmt;    /* Next format specifier byte to process. */
    i = initlen; /* Position of the next byte to write to dest str. */
    while(*f) {
        char next, *str;
        size_t l;
        long long num;
        unsigned long long unum;

        /* Make sure there is always space for at least 1 char. */
        if (sdsavail(s)==0) {
            s = sdsMakeRoomFor(s,1);
        }

        switch(*f) {
        case '%':
            next = *(f+1);
            f++;
            switch(next) {
            case 's':
            case 'S':
                str = va_arg(ap,char*);
                l = (next == 's') ? strlen(str) : sdslen(str);
                if (sdsavail(s) < l) {
                    s = sdsMakeRoomFor(s,l);
                }
                memcpy(s+i,str,l);
                sdsinclen(s,l);
                i += l;
                break;
            case 'i':
            case 'I':
                if (next == 'i')
                    num = va_arg(ap,int);
                else
                    num = va_arg(ap,long long);
                {
                    char buf[SDS_LLSTR_SIZE];
                    l = sdsll2str(buf,num);
                    if (sdsavail(s) < l) {
                        s = sdsMakeRoomFor(s,l);
                    }
                    memcpy(s+i,buf,l);
                    sdsinclen(s,l);
                    i += l;
                }
                break;
            case 'u':
            case 'U':
                if (next == 'u')
                    unum = va_arg(ap,unsigned int);
                else
                    unum = va_arg(ap,unsigned long long);
                {
                    char buf[SDS_LLSTR_SIZE];
                    l = sdsull2str(buf,unum);
                    if (sdsavail(s) < l) {
                        s = sdsMakeRoomFor(s,l);
                    }
                    memcpy(s+i,buf,l);
                    sdsinclen(s,l);
                    i += l;
                }
                break;
            default: /* Handle %% and generally %<unknown>. */
                s[i++] = next;
                sdsinclen(s,1);
                break;
            }
            break;
        default:
            s[i++] = *f;
            sdsinclen(s,1);
            break;
        }
        f++;
    }
    va_end(ap);

    /* Add null-term */
    s[i] = '\0';
    return s;
}
```

### `sdstrim`

```c
/* 移除字符串两端在'cset'中出现的字符们
 * Example:
 *
 * s = sdsnew("AA...AA.a.aa.aHelloWorld     :::");
 * s = sdstrim(s,"Aa. :");
 * printf("%s\n", s);
 *
 * Output will be just "HelloWorld".
 */
sds sdstrim(sds s, const char *cset) {
    char *start, *end, *sp, *ep;
    size_t len;

    sp = start = s;
    ep = end = s+sdslen(s)-1;
    while(sp <= end && strchr(cset, *sp)) sp++;
    while(ep > sp && strchr(cset, *ep)) ep--;
    len = (sp > ep) ? 0 : ((ep-sp)+1);
    if (s != sp) memmove(s, sp, len);
    s[len] = '\0';
    sdssetlen(s,len);
    return s;
}
```

其实就是用了`memmove`和`strchr`。

### `sdsrange`

把string截为从start到end (inclusive, inplace)

Example:

```c
s = sdsnew("Hello World");
sdsrange(s,1,-1); //=> "ello World"
```

没啥可说的，`memmove`

### `sdsupdatelen`、`sdsclear`

`sdsupdatelen`：更新长度，如果出现了手动修改`s[2]='\0'`就需要更新长度

`sdsclear`：清空为长度为0

### `sdscmp`

比较，用`memcmp`。

### `sdssplitlen`、`sdsfreesplitres`

```c
/* 用'sep'中拆分's'. 返回sds的数组， *count会被设为返回值大小
 *
 * 如果OOM, zero length string, zero length separator, NULL is returned.
 *
 * Note that 'sep' is able to split a string using
 * a multi-character separator. For example
 * sdssplit("foo_-_bar","_-_"); will return two
 * elements "foo" and "bar".
 *
 * 这个函数是binary-safe。sdssplit()是对于text的
 */
sds *sdssplitlen(const char *s, ssize_t len, const char *sep, int seplen, int *count) {
    int elements = 0, slots = 5;
    long start = 0, j;
    sds *tokens;

    if (seplen < 1 || len < 0) return NULL;

    tokens = s_malloc(sizeof(sds)*slots);
    if (tokens == NULL) return NULL;

    if (len == 0) {
        *count = 0;
        return tokens;
    }
    for (j = 0; j < (len-(seplen-1)); j++) {
        /* make sure there is room for the next element and the final one */
        if (slots < elements+2) {
            sds *newtokens;

            slots *= 2;
            newtokens = s_realloc(tokens,sizeof(sds)*slots);
            if (newtokens == NULL) goto cleanup;
            tokens = newtokens;
        }
        /* search the separator */
        if ((seplen == 1 && *(s+j) == sep[0]) || (memcmp(s+j,sep,seplen) == 0)) {
            tokens[elements] = sdsnewlen(s+start,j-start);
            if (tokens[elements] == NULL) goto cleanup;
            elements++;
            start = j+seplen;
            j = j+seplen-1; /* skip the separator */
        }
    }
    /* Add the final element. We are sure there is room in the tokens array. */
    tokens[elements] = sdsnewlen(s+start,len-start);
    if (tokens[elements] == NULL) goto cleanup;
    elements++;
    *count = elements;
    return tokens;

cleanup:
    {
        int i;
        for (i = 0; i < elements; i++) sdsfree(tokens[i]);
        s_free(tokens);
        *count = 0;
        return NULL;
    }
}
```

用`memcmp`进行string的比较。最开始分配和字符串长度一样的`tokens`作为缓存，这样就可以躲开C里面没有vector这个问题了。

`sdsfreesplitres`：逐个释放。

### `sdstolower`、`sdstoupper`

顾名思义。

### `sdsfromlonglong`

存long long比`%lld`快很多，是指就是除10，模10的遍历。

### `sdscatrepr`

在s后面append一个escape code，如加入`\n`等价于`\"\\n\"`

### `sdssplitargs`

把line分成arguments的样子，应该是REPL用的。

### `sdsmapchars`

把在`from`里面的字符串映射到对应的`to`

### `sdsjoin`，`sdsjoinsds`

顾名思义。