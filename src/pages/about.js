import React from "react"
import { graphql } from "gatsby"
import Layout from "../components/layout"

export default ({ data }) => (
    <Layout>
        <h1>About {data.site.siteMetadata.title}</h1>
        <p>
            Hi! I am Zilin Zhu. Welcome to my blog. 
            I am a master student at Columbia University major in Data Science.
            Here are some thoughts about tech and my daily life.
            
            你好！我是朱子霖，欢迎访问我的博客~
            我目前是哥伦比亚大学数据科学的硕士。
            我将在博客中主要记录一些有关我感兴趣的技术的讨论以及我日常生活的一些感想。
        </p>
    </Layout>
)

export const query = graphql`
  query {
    site {
      siteMetadata {
        title
      }
    }
  }
`