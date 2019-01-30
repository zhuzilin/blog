---
title: About CORS
date: 2018-11-04 09:59:53
tags: Web
---

## Type of CORS

There are mainly two kinds for CORS. CORS for simple request and CORS for preflight request.

## Simple Request

Simple request is GET request or POST request with Content-Type in one of application/x-www-form-urlencoded, multipart/form-data, text/plain. Note that the commonly used *application*/json is not simple request. Those Content-Type are exceptions due to historical legacy.

For simple request we only need to add an "Origin: http://api.bob.com" in the request header.

> ```http
> GET /cors HTTP/1.1
> Origin: http://api.bob.com
> Host: api.alice.com
> Accept-Language: en-US
> Connection: keep-alive
> User-Agent: Mozilla/5.0...
> ```

 And add "Access-Control-Allow-Origin: http://api.bob.com" in the response.

> ```http
> Access-Control-Allow-Origin: http://api.bob.com
> Access-Control-Allow-Credentials: true
> Access-Control-Expose-Headers: FooBar
> Content-Type: text/html; charset=utf-8
> ```

Or simply use "Access-Control-Allow-Origin: *" in the response.

If hoping to add cookie to the request, we need to add "withCredentials: true" in the request and "Access-Control-Allow-Credentials: true" in the server. Note that when sending cookie, we cannot set "Access-Control-Allow-Origin" as "*", but the domain of client.

## Preflight Request

For request other than simple request, the client will add another request as preflight request. Only when the domain of client is in the allowed list of server, the client will then send the original request to the server.

The preflight request will look like this:

> ```http
> OPTIONS /cors HTTP/1.1
> Origin: http://api.bob.com
> Access-Control-Request-Method: PUT
> Access-Control-Request-Headers: X-Custom-Header
> Host: api.alice.com
> Accept-Language: en-US
> Connection: keep-alive
> User-Agent: Mozilla/5.0...
> ```

And the server will need to return status code 200 for this request. Here is an express middleware that can solve this problem nicely,

```javascript
// add header and return for OPTIONS request
app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');

    //intercepts OPTIONS method
    if ('OPTIONS' === req.method) {
        //respond with 200
        res.send(200);
    }
    else {
        //move on
        next();
    }
});
```

## References

1. http://www.ruanyifeng.com/blog/2016/04/cors.html
2. https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS