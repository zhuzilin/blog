---
title: How is a Python program run?
date: 2019-02-09 20:49:00
tags: ["python"]
---

When running a python program, we would normally use command line or an IDE, but how is the python program actually got run? Or in other words, how would python be different from C?

## Some basic

First, let us be clear that the statement "Python is a interpreted language" is confusing. Since

> The terms *interpreted language* and *compiled language* are not well defined because, in theory, any programming language can be either interpreted or compiled. In modern programming language implementation, it is increasingly popular for a platform to provide both options.
>
> [source](https://en.wikipedia.org/wiki/Interpreted_language)

Therefore, what I will focusing on is the popular implementation for Python, mainly CPython. What will CPython do is basically:

> CPython reads python source code, and compiles it into python byte code, which is stored in the `.pyc` file. It then executes that code using a bytecode interpreter. This design separates the parsing of python from the execution, allowing both parts of the interpreter to be simpler.
>
> [source](https://stackoverflow.com/a/6830193/5163915)

So before doing the compilation, the Python interpreter would check if there is suitable `.pyc` file to pass it. And the bytecode interpreter in CPython would basically read the byte code line by line and execute it in the mean time. 

>  There is basically (very basically) a giant switch statement inside the CPython interpreter that says "if the current opcode is so and so, do this and that".
>
> Other implementations, like Pypy, have JIT compilation, i.e. they translate Python to machine codes on the fly.
>
> [source](https://stackoverflow.com/questions/19916729/how-exactly-is-python-bytecode-run-in-cpython)

And if you remember the compiling stage for C.

![img](http://www.echojb.com/img/2017/02/13/993848-20170206141338916-1690576837.png)

1. **Preprocessing**: insert the corresponding code into `#incude` , replace the macros (`#define`) and select text with `#if`, `#ifdef`, `#ifndef` .
2. **Compiling**: turn the code into assembly program. Notice each file was compiled separately, which means the compiler could only use the information in the specific file (some time just the specific function) to optimize the code.
3. **Assembling**: turn the assembly program into machine language. Those files are called relocatable object files.
4. **Linking**: link different files from the last step and using the symbol table in the object file that is made by the assembler to generate a fully linked executable object file. 

Apparently, there is huge difference between CPython procedure and that of C. And one of the major difference is the linking process. Code from different files could never be linked until been compiled into binary in Python and from the [document]() and in next post, I would talk about the modularity of Python and how the linking is achieved.

## Memory management

In C, when calling a function what the machine actually do is allocating a piece of memory in stack, called frame and when the function returns, the frame will be freed and some register would help the program back to where it should be before the calling.

Things would be different in Python. We could see that from the generator. In each time we called a generator, it could save a internal state even if the function is returned. This could not be achieved if the memory is used the same way as C. 

In fact, because everything in Python is a object and  from the [documentation](https://docs.python.org/3.7/c-api/memory.html):

>Memory management in Python involves a private heap containing all Python objects and data structures. The management of this private heap is ensured internally by the *Python memory manager*. The Python memory manager has different components which deal with various dynamic storage management aspects, like sharing, segmentation, preallocation or caching.

Everything is saved in heap in CPython and that is why the internal state is saved. So when we talk about the call stack in Python, it has nothing to do with the underlying C stack. The frame in Python are just some other objects.

## Reference

1. https://en.wikipedia.org/wiki/Interpreted_language
2. https://stackoverflow.com/a/6830193/5163915
3. https://stackoverflow.com/questions/19916729/how-exactly-is-python-bytecode-run-in-cpython
4. Bryant, Randal E., O'Hallaron David Richard, and O'Hallaron David Richard. *Computer systems: a programmer's perspective*. Vol. 2. Upper Saddle River: Prentice Hall, 2003.