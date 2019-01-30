---
title: Write Blog Using Hexo
date: 2018-07-04 14:05:55
tags: hexo
---

Hexo is a fast static generator that could be used to help us build blog on github pages just like the one you are viewing. And as the first technical blog, I believe it is nice to introduce how this blog is created.

## Prepare the environment

### Install node.js and npm

The blog is created on win10 platform and before using hexo, we need to install node.js and npm. There are plenty of detail tutorial for that. Therefore, in this article, I will just skip that.

### Install Hexo

In the main page of [Hexo](https://hexo.io/), you could find the command line for hexo-cli:

```bash
npm install hexo-cli -g
```

Which means install the hexo-cli globally.

## Create the blog project

Next, we create the folder using the hexo-cli. In the case of github pages, we had better name the folder as **your-github-username.github.io**.

```bash
hexo init your-github-username.github.io
```

The hexo-cli would prepare a structured project. And now we use npm to install dependencies.

```bash
cd your-github-username
npm install
```

And  now the project is ready, using the following commands to check what we have now!

```bash
hexo g
hexo s
```

Right now, the blog is visible at [http://localhost:4000/](https://link.jianshu.com/?t=http://localhost:4000/) .

## Connect with Github

After creating the blog project locally, we need to connect our project with the github repository to use github pages service.

Just create a repository names **your-github-username.github.io** and change the deploy part of  **_config.yml** file:

```yaml
# Deployment
## Docs: https://hexo.io/docs/deployment.html
deploy:
  type: git
  repository: https://github.com/your-github-username/your-github-username.github.io.git
  branch: master
```

Run the hexo g again and use hexo to deploy.

```bash
hexo g
hexo d
```

Then you can visit **your-github-username.github.io** to check your blog!

## Change theme

The default theme of Hexo is called landscape, you may find that is a bit out-of-date, isn't it? Now, let's change the theme.

There are lots of pretty theme for your blog, I chose the material design theme (https://github.com/viosey/hexo-theme-material) . To use this theme, simply clone it in the theme/material folder in your local folder.

```bash
git clone git@github.com:viosey/hexo-theme-material.git ./theme/material
```

And change the **_config.yml** file correspondingly.

```yaml
# Extensions
## Plugins: https://hexo.io/plugins/
## Themes: https://hexo.io/themes/
theme: material
```

Once again, generate and deploy the project.

```bash
hexo g
hexo d
```

Now, you will find that the theme is changed.

## Write blog

Now, we have the skeleton for our blog. It's time to bring the flesh. The [documentation of Hexo](https://hexo.io/docs/writing.html) has provided an excellent tutorial of how to write a new post.

## Delete the default page

After writing your first blog, maybe you hope to delete the auto-generated "hello world" post. Here is the command for that

- First you need to delete the hello-world.md file in source/

- Then using the following command

  ```bash
  hexo clean
  hexo g
  hexo d
  ```

  