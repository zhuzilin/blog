import React from "react"
import { graphql } from "gatsby"
import Layout from "../components/layout"

export default ({ data }) => (
  <Layout>
    <h1>About</h1>
    <p>
      Hi! I am zhuzilin. Welcome to my blog. 
      <br/>
      Here are my thoughts on my life.
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