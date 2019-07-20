---
title: Google Cloud 配置 ssh
date: 2019-03-09 22:10:02
tags: ["google-cloud", "cloud"]
---

如果我们需要通过本地的ssh登陆google cloud instance，主要要进行如下几步：

修改ssh配置文件/etc/ssh/sshd_config

```bash
vi /etc/ssh/sshd_config
```

然后把该文件修改为：

```
...
PermitRootLogin yes
...
# Change to no to disable tunnelled clear text passwords
PasswordAuthentication yes
...
```

然后给root用话设置密码：

```bash
passwd root
```

之后重启ssh

```bash
/etc/init.d/ssh restart
```

最后在左边的导航栏中的MetaData中的ssh里面加入本机的公钥即可。

