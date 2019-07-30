---
title: docker basics
date: 2019-07-29 11:54:00
tags: ["kubernetes", "container"]
---

实习过程中自告奋勇要帮着搞kubernetes，结果发现这个东西有点恶心...在这里总结一下基础知识，省的好不容易看的东西忘了~

## 基本结构

Kubernetes的基本结构

Kubernetes主要有两种resources（为啥叫资源...）：

- master: 管理cluster，比如scheduling，保持状态，进行更新，scaling
- node: 运行application。里面有一个Kubelet，用于管理node并与master通信。还有一个容器runtime用来跑容器。一个production级别的cluster至少要有3个node。

部署的时候，让master去运行application containers，master会把container schedule给某一个node，这两者之间的沟通是用的Kubernetes API。用户和cluster交互也是用的这个。

## Pod

Pod是Kubernetes的基本单元。其包含一个或多个容器，在一个pod中的容器会共享volume，network，并且pod里包含了如何运行这些container的指令啥的。pod会被绑定到一个node上到死。如果node死了，会新建一个同样状态的新pod部署到其他的cluster上。

![Node](https://d33wubrfki0l68.cloudfront.net/5cb72d407cbe2755e581b6de757e0d81760d5b86/a9df9/docs/tutorials/kubernetes-basics/public/images/module_03_nodes.svg)

## Service

因为Pod是会死的嘛（mortal），所以如果要让用户没有感觉，就需要更高的一层抽象。service就是这样的抽象。service用哪些pod一般使用LabelSelector决定的。尽管每个node有自己的IP，但这个IP只有cluster内部才能访问。而要用service来开放出IP来。

也是因为这个作用，service会有不同的种类：

- *ClusterIP*(default): 让service只能在cluster中用internal IP访问。
- *NodePort*: Exposes the Service on the same port of each selected Node in the cluster using NAT. Makes a Service accessible from outside the cluster using `<NodeIP>:<NodePort>`. Superset of ClusterIP.
- *LoadBalancer* - Creates an external load balancer in the current cloud (if supported) and assigns a fixed, external IP to the Service. Superset of NodePort.
- *ExternalName* - Exposes the Service using an arbitrary name (specified by `externalName`in the spec) by returning a CNAME record with the name. No proxy is used. This type requires v1.7 or higher of `kube-dns`.

service要用label来限制