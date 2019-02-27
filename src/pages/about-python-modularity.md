---
title: About Python modularity
date: 2019-02-10 03:49:00
tags: ["python"]
---

This post is full of quote right now. Maybe sometime I will add some of my own understanding. But at the moment, the words in the reference has already good enough.

## module

From the document, the definition of module in python is

> A module is a file containing Python definitions and statements. The file name is the module name with the suffix `.py` appended.

The use of modules saves the authors of different modules from having to worry about each other’s global variable names.

### \_\_name\_\_

> Within a module, the module’s name (as a string) is available as the value of the global variable`__name__`

Therefore, any `.py` file is a module.  And any module can be imported by the `import` statement with its `__name__`.

Then what is `if __name__ == "__main__":`? 

> `'__main__'` is the name of the scope in which top-level code executes. A module’s __name__ is set equal to `'__main__'` when read from standard input, a script, or from an interactive prompt.

```bash
$ python
>>> __name__
'__main__'
```

Notice that if a module is run by `python -m`, the name would also be set as ` '__main__'`. But there is a solution for the renaming case: [PEP 366](https://www.python.org/dev/peps/pep-0366/) introduced the `__package__` attribute.

> The major proposed change is the introduction of a new module level attribute, `__package__`. When it is present, relative imports will be based on this attribute rather than the module `__name__` attribute.

Therefore, we could use the following code to solve the problem:

```python
if __name__ == "__main__" and __package__ is None:
    __package__ = "expected.package.name"
```

### Relative importing

If the module is not renamed as `__main__`, we could use the relative importing to refer the packages according to the relative path.

### Symbol table

> Each module has its own private symbol table, which is used as the global symbol table by all functions defined in the module. Thus, the author of a module can use global variables in the module without worrying about accidental clashes with a user’s global variables.

> The imported module names are placed in the importing module’s global symbol table

### .pyc

> Python checks the modification date of the source against the compiled version to see if it’s out of date and needs to be recompiled. This is a completely automatic process. Also, the compiled modules are platform-independent, so the same library can be shared among systems with different architectures.
>
> Python does not check the cache in two circumstances. First, it always recompiles and does not store the result for the module that’s loaded directly from the command line. Second, it does not check the cache if there is no source module. To support a non-source (compiled only) distribution, the compiled module must be in the source directory, and there must not be a source module.



## package

Also from the document, a package is:

> Packages are a way of structuring Python’s module namespace by using “dotted module names”. For example, the module name `A.B` designates a submodule named `B` in a package named `A`.

It is possible and convenient that we could have the same module name in different package.

> You can think of packages as the directories on a file system and modules as files within directories, but don’t take this analogy too literally since packages and modules need not originate from the file system.

In fact, package is a special kind of module:

> It’s important to keep in mind that all packages are modules, but not all modules are packages. Or put another way, packages are just a special kind of module. Specifically, any module that contains a `__path__` attribute is considered a package.

There are two kinds of packages: regular packages and namespace packages, here we will only talk about the regular ones.

### \_\_init\_\_.py

> A regular package is typically implemented as a directory containing an `__init__.py` file. When a regular package is imported, this `__init__.py` file is implicitly executed, and the objects it defines are bound to names in the package’s namespace. The `__init__.py` file can contain the same Python code that any other module can contain, and Python will add some additional attributes to the module when it is imported.

### \_\_main\_\_.py

Many may have heard of `__init__.py` but I believe few have heard of `__main__.py`. This file would be run as the entrance of a directory. 

> For a package, the same effect can be achieved by including a `__main__.py` module, the contents of which will be executed when the module is run with `-m`.

For example, if the file directory is (to show the directory, use [tree](https://docs.microsoft.com/en-us/windows-server/administration/windows-commands/tree))

```bash
hello
    hello.py
    __main__.py
```

With the code:

```python
# __main__.py
print("This is __main__")

# hello.py
print("hello world")
```

And we run python on the 

```bash
$ python hello/
This is __main__
```

If we delete the `__main__.py` and run again, the result would be

```bash
$ python hello/
XXX: can't find '__main__' module in 'hello'
```

## Import

> Note that relative imports are based on the name of the current module. Since the name of the main module is always `"__main__"`, modules intended for use as the main module of a Python application must always use absolute imports.

## Reference

1. https://docs.python.org/3/tutorial/modules.html
2. https://docs.python.org/3/reference/import.html
3. https://docs.python.org/3/library/\_\_main\_\_.html