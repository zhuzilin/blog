---
title: Flask Basics
date: 2018-07-05 11:25:26
tags:
---

During my internship at Face++, I participated in upgrading a tool platform for our group to package training data and test models. In this platform, we used flask as backend and here are some basics about this light weight framework.

## Start the server

It is very easy to start a web app in flask:

 ```python
from flask import Flask

app = Flask(__name__)

if __name__ == '__main__':
    app.run('127.0.0.1', port=5000, debug=True, threaded=True)
 ```

Just run the above script, the server is started. But right now, our server have no idea what kind of request it need to response, therefore we need to add route. 

## Add blueprint

As a practical project, we could not add all our route in one python script, or I would be hard to maintain. Because of that, we used the blueprint function in flask. The following are the cases that blueprints are intended for.

>- Factor an application into a set of blueprints. This is ideal for larger applications; a project could instantiate an application object, initialize several extensions, and register a collection of blueprints.
>- Register a blueprint on an application at a URL prefix and/or subdomain. Parameters in the URL prefix/subdomain become common view arguments (with defaults) across all view functions in the blueprint.
>- Register a blueprint multiple times on an application with different URL rules.
>- Provide template filters, static files, templates, and other utilities through blueprints. A blueprint does not have to implement applications or view functions.
>- Register a blueprint on an application for any of these cases when initializing a Flask extension.

Before adding blueprint, we need to introduce the structure of our flask module. The structure was really simple:

```
\root
	run.py
	\view.py
		__init__.py
		some_blueprint.py
		...
```

Here is an example of the blueprint, the simplified version of datasets.py:

```python
from flask import Blueprint, jsonify, request, make_response

__all__ = ['datasets']
datasets = Blueprint('datasets', __name__)

@datasets.route("/api/datasets")
def get_datasets():
    usage = request.args.getlist('uses[]')
    dataset = request.args.get('dataset')
    ... ...
    return jsonify({'data': data, 'total': len(data)})


@datasets.route("/api/datasets/<dataset_name>")
def get_specific_dataset(dataset_name):
    ... ...
    return jsonify({"name": dataset_name, "data": data})

@datasets.route("/api/datasets/download", methods = ['post'])
def download_datasets():
    datasets = request.get_json()['datasets']
    ... ...
    return jsonify(download_dir)
```

Above shows some basic usage of flask route. And in run.py, we need to attach all the blueprint to the app.

```python
import os
from flask import Flask
import views

def register_blueprint(app):
    for module_name in views.__all__:
        module = import_module('views.'+module_name)
        for bp in module.__all__:
            app.register_blueprint(getattr(module, bp))


app = Flask(__name__, template_folder='dist')
register_blueprint(app)

if __name__ == '__main__':
    app.run('127.0.0.1', port=5000, debug=True, threaded=True)
```

And the backbone of a RESTful backend was finished. Easy, right?