---
title: Pandas read_csv use regex as delimiter
date: 2019-02-03 14:35:00
tags: ["python", "pandas"]
---

When doing my homework, I need to read a badly formed csv into a pandas dataframe. And what I need is to use regular expression for separation. Because the documentation is not good. I have to read the source code for it.

## TL;DR

If using a regex as a delimiter, each line of the file would be treated with `re.split(pattern, line)`.

## Source Code Reading

The core of read in the `read_csv` function is the `_read` function in `pandas/pandas/io/parsers.py`.  Here is the code:

```python
def _read(filepath_or_buffer, kwds):
    ... "some check for the value in kwds" ...
    
    # Create the parser.
    parser = TextFileReader(filepath_or_buffer, **kwds)

    if chunksize or iterator:
        return parser

    try:
        data = parser.read(nrows)
    finally:
        parser.close()

    if should_close:
        try:
            filepath_or_buffer.close()
        except ValueError:
            pass

    return data
```

The core of the `_read` function is the `TextFileReader` which is also in the same file.

```python
class TextFileReader(BaseIterator):
    """
    Passed dialect overrides any of the related parser options
    """

    def __init__(self, f, engine=None, **kwds):

        self.f = f

        if engine is not None:
            engine_specified = True
        else:
            engine = 'python'
            engine_specified = False

        self._engine_specified = kwds.get('engine_specified', engine_specified)

        ... "check and correct some kwds key values" ...

        self.orig_options = kwds

        # miscellanea
        self.engine = engine
        self._engine = None
        self._currow = 0
		
        # make the option legal for the engine
        options = self._get_options_with_defaults(engine)

        self.chunksize = options.pop('chunksize', None)
        self.nrows = options.pop('nrows', None)
        self.squeeze = options.pop('squeeze', False)

        # might mutate self.engine
        # gh-16530 about file like object
        self.engine = self._check_file_or_buffer(f, engine)
        # if some features are not supported by C engine, fall back to python one. 
        self.options, self.engine = self._clean_options(options, engine)

        if 'has_index_names' in kwds:
            self.options['has_index_names'] = kwds['has_index_names']

        self._make_engine(self.engine)

    def close(self):
        self._engine.close()
        
    ... "omit the code for arguments checking" ...

    def __next__(self):
        try:
            return self.get_chunk()
        except StopIteration:
            self.close()
            raise

    def _make_engine(self, engine='c'):
        if engine == 'c':
            self._engine = CParserWrapper(self.f, **self.options)
        else:
            if engine == 'python':
                klass = PythonParser
            elif engine == 'python-fwf':
                klass = FixedWidthFieldParser
            else:
                ... "raise error" ...
            self._engine = klass(self.f, **self.options)

    ... ...

    def read(self, nrows=None):
        nrows = _validate_integer('nrows', nrows)
        ret = self._engine.read(nrows)
        ... "turn ret to dataframe" ...
        return df

    def _create_index(self, ret):
        index, columns, col_dict = ret
        return index, columns, col_dict

    def get_chunk(self, size=None):
        if size is None:
            size = self.chunksize
        if self.nrows is not None:
            if self._currow >= self.nrows:
                raise StopIteration
            size = min(size, self.nrows - self._currow)
        return self.read(nrows=size)
```

The engine used would be `CParserWrapper` for C, `PythonParser` for python and `FixedWidthFieldParser`

 for python-fwf, which adds some specialization to `PythonParser` . And this time, we will focus on `PythonParser` which has the most functionalities. I have tried my best to reduce the length of the code for `PythonParser`.

```python
class PythonParser(ParserBase):

    def __init__(self, f, **kwds):
        """
        Workhorse function for processing nested list into DataFrame
        Should be replaced by np.genfromtxt eventually?
        """
        ParserBase.__init__(self, kwds)

        self.data = None
        self.buf = []
        self.pos = 0
        self.line_pos = 0
		
        ... "similar to self.xxx = kwds['xxx']" ...
            
        self._comment_lines = []

        mode = 'r' if PY3 else 'rb'
        f, handles = _get_handle(f, mode, encoding=self.encoding,
                                 compression=self.compression,
                                 memory_map=self.memory_map)
        self.handles.extend(handles)

        # Set self.data to something that can read lines.
        if hasattr(f, 'readline'):
            self._make_reader(f)
        else:
            self.data = f

        # Get columns in two steps: infer from data, then
        # infer column indices from self.usecols if it is specified.
        self._col_indices = None
        (self.columns, self.num_original_columns,
         self.unnamed_cols) = self._infer_columns()

        # Now self.columns has the set of columns that we will process.
        # The original set is stored in self.original_columns.
        if len(self.columns) > 1:
            # we are processing a multi index column
            self.columns, self.index_names, self.col_names, _ = (
                self._extract_multi_indexer_columns(
                    self.columns, self.index_names, self.col_names
                )
            )
            # Update list of original names to include all indices.
            self.num_original_columns = len(self.columns)
        else:
            self.columns = self.columns[0]

        # get popped off for index
        self.orig_names = list(self.columns)
        
        ... "process date, decimal, thousand separator"...
        
    def _make_reader(self, f):
        sep = self.delimiter

        if sep is None or len(sep) == 1:
            if self.lineterminator:
                raise ValueError('Custom line terminators not supported in '
                                 'python parser (yet)')

            class MyDialect(csv.Dialect):
                delimiter = self.delimiter
                quotechar = self.quotechar
                escapechar = self.escapechar
                doublequote = self.doublequote
                skipinitialspace = self.skipinitialspace
                quoting = self.quoting
                lineterminator = '\n'

            dia = MyDialect

            sniff_sep = True

            if sep is not None:
                sniff_sep = False
                dia.delimiter = sep
            # attempt to sniff the delimiter
            if sniff_sep:
                line = f.readline()
                while self.skipfunc(self.pos):
                    self.pos += 1
                    line = f.readline()

                line = self._check_comments([line])[0]

                self.pos += 1
                self.line_pos += 1
                sniffed = csv.Sniffer().sniff(line)
                dia.delimiter = sniffed.delimiter
                if self.encoding is not None:
                    self.buf.extend(list(
                        UnicodeReader(StringIO(line),
                                      dialect=dia,
                                      encoding=self.encoding)))
                else:
                    self.buf.extend(list(csv.reader(StringIO(line),
                                                    dialect=dia)))

            if self.encoding is not None:
                reader = UnicodeReader(f, dialect=dia,
                                       encoding=self.encoding,
                                       strict=True)
            else:
                reader = csv.reader(f, dialect=dia,
                                    strict=True)

        else:
            def _read():
                line = f.readline()

                if compat.PY2 and self.encoding:
                    line = line.decode(self.encoding)

                pat = re.compile(sep)
                yield pat.split(line.strip())
                for line in f:
                    yield pat.split(line.strip())
            reader = _read()

        self.data = reader

    def read(self, rows=None):
        try:
            content = self._get_lines(rows)
        except StopIteration:
            if self._first_chunk:
                content = []
            else:
                raise

        # done with first read, next time raise StopIteration
        self._first_chunk = False

        ... "turn content into index, columns, data" ...

        return index, columns, data

    def _next_line(self):
        ... "move self.pos in self.data to get next needed line" ...

        self.line_pos += 1
        self.buf.append(line)
        return line

    def _next_iter_line(self, row_num):
        """
        Wrapper around iterating through `self.data` (CSV source).
        When a CSV error is raised, we check for specific
        error messages that allow us to customize the
        error message displayed to the user.
        Parameters
        ----------
        row_num : The row number of the line being parsed.
        """

        try:
            return next(self.data)
        except csv.Error as e:
            if self.warn_bad_lines or self.error_bad_lines:
                msg = str(e)

                if 'NULL byte' in msg:
                    msg = ('NULL byte detected. This byte '
                           'cannot be processed in Python\'s '
                           'native csv library at the moment, '
                           'so please pass in engine=\'c\' instead')

                if self.skipfooter > 0:
                    reason = ('Error could possibly be due to '
                              'parsing errors in the skipped footer rows '
                              '(the skipfooter keyword is only applied '
                              'after Python\'s csv library has parsed '
                              'all rows).')
                    msg += '. ' + reason
				# Alert a user about a malformed row.
                self._alert_malformed(msg, row_num)
            return None

    _implicit_index = False

    def _get_lines(self, rows=None):
        lines = self.buf
        new_rows = None

        # already fetched some number
        if rows is not None:
            # we already have the lines in the buffer
            if len(self.buf) >= rows:
                new_rows, self.buf = self.buf[:rows], self.buf[rows:]

            # need some lines
            else:
                rows -= len(self.buf)

        if new_rows is None:
            if isinstance(self.data, list):
                if self.pos > len(self.data):
                    raise StopIteration
                if rows is None:
                    new_rows = self.data[self.pos:]
                    new_pos = len(self.data)
                else:
                    new_rows = self.data[self.pos:self.pos + rows]
                    new_pos = self.pos + rows

                # Check for stop rows. n.b.: self.skiprows is a set.
                if self.skiprows:
                    new_rows = [row for i, row in enumerate(new_rows)
                                if not self.skipfunc(i + self.pos)]

                lines.extend(new_rows)
                self.pos = new_pos

            else:
                new_rows = []
                try:
                    if rows is not None:
                        for _ in range(rows):
                            new_rows.append(next(self.data))
                        lines.extend(new_rows)
                    else:
                        rows = 0

                        while True:
                            new_row = self._next_iter_line(
                                row_num=self.pos + rows + 1)
                            rows += 1

                            if new_row is not None:
                                new_rows.append(new_row)

                except StopIteration:
                    if self.skiprows:
                        new_rows = [row for i, row in enumerate(new_rows)
                                    if not self.skipfunc(i + self.pos)]
                    lines.extend(new_rows)
                    if len(lines) == 0:
                        raise
                self.pos += len(new_rows)

            self.buf = []
        else:
            lines = new_rows

        if self.skipfooter:
            lines = lines[:-self.skipfooter]

        lines = self._check_comments(lines)
        if self.skip_blank_lines:
            lines = self._remove_empty_lines(lines)
        lines = self._check_thousands(lines)
        return self._check_decimal(lines)
    
    ... ...
```

The core of this parser consists of two elements: `self.data` , as the origin file object and `self.buf` that saves the lines needed that is needed.

Mostly, we will use the `read(self, rows=None)` function, where if `rows` given, return certain number of rows, otherwise return the whole data as a list. And to read the data, `_get_lines` will be called and first use the lines already stored in the buffer and if not enough, will read line by line from `self.data`.

The regex part lies in the `_make_reader` function, where for regex delimiter, simply `pat.split` is used.

Notice, here I omit the column infer section, which is also a big part of the code but is irrelevant to what I hope to discover. The `self.buf` has tight connect with function `_infer_columns` and the reason why the design need to have a buffer lies there.