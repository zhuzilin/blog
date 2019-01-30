---
title: About python relative importing
date: 2018-07-05 15:06:13
tags: [python]
---

## Relative importing is painful

The relative importing has always been painful in python. For example, we are writing a web app using Flask. The file structure is like following:

```
\root
	run.py
	\views
		blueprint.py
```

To use websocket, we have chosen the flask-socketio. In the run.py and our blueprint file, we all need the socketio variable. It is natural for one to write the following code:

In run.py

```python
... ...
from flask-socketio import SocketIO
... ...
socketio = SocketIO()

def register_blueprint(app):
    ... ...
    
app = Flask(__name__)
register_blueprint(app)

socketio.init_app(app)
... ...
```

And in blueprint.py

```
from ..run import socketio

... ...
@socket.on('message'):
	... ...
```

But this would trigger: 

```bash
Error: attempted relative import beyond top-level package
```

## Decent solution

We need to move the variable socketio to \_\_ init\_\_.py. Now the file structure is:

```
\root
	run.py
	\views
		__init__.py
		blueprint.py
```

In \_\_ init\_\_.py:

```python
socketio = SocketIO()
```

In run.py

```python
from views import socketio
```

In blueprint.py

```python
from . import socketio
```

Problem solved!

