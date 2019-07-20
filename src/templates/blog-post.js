import React from "react"
import _ from "lodash";
import { graphql, Link } from "gatsby"
import Layout from "../components/layout"
import '../styles/blog-post.css'
require(`katex/dist/katex.min.css`)

export default ({ data }) => {
    const post = data.markdownRemark
    return (
        <Layout>
            <div>
                <h1>{post.frontmatter.title}</h1>
                <p className="info">date: {post.frontmatter.date.slice(0, 10)} <br/>
                   tags: {post.frontmatter.tags.map(tag => 
                            <span>
                              <Link to={`/tags/${_.kebabCase(tag)}`}>{tag}</Link>&nbsp;&nbsp;
                            </span>)}</p>
                <div dangerouslySetInnerHTML={{ __html: post.html }} />
            </div>
        </Layout>
    )
}

export const query = graphql`
  query($slug: String!) {
    markdownRemark(fields: { slug: { eq: $slug } }) {
      html
      frontmatter {
        title
        date
        tags
      }
    }
  }
`